import express, { Request, Response } from 'express'
import cors from 'cors'
import pool from './config/db'
import dotenv from 'dotenv'
import axios from 'axios'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

// --- TYPES & INTERFACES ---

// 1. Định nghĩa kiểu dữ liệu của Order trong Database
interface Order {
  id: number
  order_code: string
  amount: string | number // Postgres trả về decimal dưới dạng string, cần lưu ý
  status: 'PENDING' | 'PAID' | 'EXPIRED'
  created_at: Date
  updated_at: Date
}

// --- SePay API Types ---
interface SePayTransaction {
  id: string
  bank_brand_name: string
  account_number: string
  transaction_date: string
  amount_in: string
  transaction_content: string
  reference_number: string
  bank_account_id: string
}

interface SePayResponse {
  status: number
  messages: { success: boolean }
  transactions: SePayTransaction[]
}

// --- Worker / Polling logic ---
const SYNC_INTERVAL = 5000 // 5 seconds
const WATCHER_TIMEOUT = 5 * 60 * 1000 // 5 minutes

async function checkTransactionsOnce(
  orderCode: string,
  orderId: number,
  targetAmount: number
): Promise<boolean> {
  try {
    console.log('Worker: Checking transactions...')

    const apiUrl = process.env.SEPAY_API_URL
    const apiToken = process.env.SEPAY_API_TOKEN
    const accountNumber = process.env.SEPAY_ACCOUNT_NUMBER

    if (!apiUrl || !apiToken || !accountNumber) {
      console.error('❌ Missing Env Config for SePay')
      return false
    }

    const response = await axios.get<SePayResponse>(apiUrl, {
      headers: { Authorization: apiToken },
      params: {
        account_number: accountNumber,
        limit: 20,
      },
    })

    const transactions = response.data.transactions || []

    for (const trans of transactions) {
      // Skip if already stored
      const checkExist = await pool.query(
        'SELECT id FROM transactions WHERE id = $1',
        [trans.id]
      )
      if (checkExist.rows.length === 0) {
        await pool.query(
          `INSERT INTO transactions
            (id, account_number, amount_in, transaction_content, bank_brand_name, transaction_date)
            VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            trans.id,
            trans.account_number,
            trans.amount_in,
            trans.transaction_content,
            trans.bank_brand_name,
            trans.transaction_date,
          ]
        )
        console.log(
          `--> Saved Transaction: ${trans.id} | ${trans.amount_in} VND`
        )
      }

      // If this transaction refers to our orderCode, try to link
      const content = trans.transaction_content || ''
      if (content.includes(String(orderCode))) {
        const amountIn = parseFloat(trans.amount_in)
        if (amountIn >= targetAmount) {
          // Update order to PAID if still pending
          const orderResult = await pool.query<Order>(
            'SELECT * FROM orders WHERE id = $1',
            [orderId]
          )

          if (orderResult.rows.length > 0) {
            const order = orderResult.rows[0]
            if (order.status === 'PENDING') {
              await pool.query(
                "UPDATE orders SET status = 'PAID' WHERE id = $1",
                [orderId]
              )
              await pool.query(
                'UPDATE transactions SET order_id = $1 WHERE id = $2',
                [orderId, trans.id]
              )
              console.log(
                `✅ SUCCESS: ORDER ${order.order_code} IS PAID! & transaction ${trans.id} linked to order_id ${order.id}`
              )
              return true
            }
          }
        } else {
          console.log(
            `⚠️ WARNING: Order ${orderCode} thiếu tiền (Nhận: ${amountIn}, Cần: ${targetAmount})`
          )
        }
      }
    }

    return false
  } catch (error: any) {
    console.error('Worker Error:', error?.message || error)
    return false
  }
}

function startOrderWatcher(
  orderCode: string,
  orderId: number,
  targetAmount: number
) {
  const intervalId = setInterval(async () => {
    const paid = await checkTransactionsOnce(
      orderCode,
      orderId,
      Number(targetAmount)
    )
    if (paid) {
      clearInterval(intervalId)
      // no need to keep timeout as we'll clear it below via reference
    }
  }, SYNC_INTERVAL)

  const timeoutId = setTimeout(async () => {
    clearInterval(intervalId)
    // expire the order if still pending
    try {
      const r = await pool.query<Order>('SELECT * FROM orders WHERE id = $1', [
        orderId,
      ])
      if (r.rows.length > 0 && r.rows[0].status === 'PENDING') {
        await pool.query("UPDATE orders SET status = 'EXPIRED' WHERE id = $1", [
          orderId,
        ])
        console.log(`Order ${orderCode} expired after timeout`)
      }
    } catch (err) {
      console.error('Watcher timeout error:', err)
    }
  }, WATCHER_TIMEOUT)

  // Return a small handle in case caller wants to cancel earlier
  return {
    cancel: () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
    },
  }
}

// 2. Định nghĩa kiểu dữ liệu Body khi tạo đơn (Request Body)
interface CreateOrderRequest {
  amount: number
}

// --- UTILS ---

// Random 4 số (Trả về number)
const generateOrderCode = (): number => Math.floor(1000 + Math.random() * 9000)

// Tạo order an toàn: dùng INSERT ... ON CONFLICT DO NOTHING RETURNING
async function createUniqueOrder(amount: number, maxAttempts = 10) {
  const accountNum = process.env.SEPAY_ACCOUNT_NUMBER || ''

  const insertQ = `
    INSERT INTO orders (order_code, amount, status)
  VALUES ($1, $2, $3)
  ON CONFLICT (order_code) DO NOTHING
  RETURNING id, order_code, amount
  `

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const code = generateOrderCode()
    const result = await pool.query(insertQ, [code, amount, 'PENDING'])
    if (result.rows.length > 0) {
      const row = result.rows[0]
      return {
        id: row.id,
        order_code: row.order_code,
        amount: row.amount,
        qr_url: `https://qr.sepay.vn/img?bank=TPBank&acc=${accountNum}&template=compact&amount=${row.amount}&des=Thanh%20Toan%20Don%20Hang%20${row.order_code}`,
      }
    }

    // optional tiny backoff to reduce contention
    await new Promise((r) => setTimeout(r, 10 * attempt))
  }

  throw new Error('Failed to generate unique order code after retries')
}

// --- ROUTES ---

// 1. API Tạo đơn hàng
app.post(
  '/api/orders',
  async (req: Request<{}, {}, CreateOrderRequest>, res: Response) => {
    const { amount } = req.body

    // Validate số tiền
    if (!amount || amount < 2000) {
      return res.status(400).json({ error: 'Số tiền phải lớn hơn 2000đ' })
    }

    try {
      const orderInfo = await createUniqueOrder(amount, 10)

      // Start background watcher for this order (poll SePay every 5s for up to 5 minutes)
      try {
        // orderInfo contains id, order_code, amount
        // Start watcher but don't await it
        startOrderWatcher(
          orderInfo.order_code,
          orderInfo.id,
          Number(orderInfo.amount)
        )
      } catch (watchErr) {
        console.error('Failed to start order watcher:', watchErr)
      }

      res.json(orderInfo)
    } catch (err) {
      console.error('Lỗi tạo đơn:', err)
      res.status(500).json({ error: 'Server Error' })
    }
  }
)

// 2. API Check trạng thái (Có logic Timeout 5 phút)
app.get(
  '/api/orders/:code',
  async (req: Request<{ code: string }>, res: Response) => {
    const { code } = req.params

    try {
      // Query DB và ép kiểu kết quả về Order
      const result = await pool.query<Order>(
        'SELECT * FROM orders WHERE order_code = $1',
        [code]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' })
      }

      let order = result.rows[0]

      // Logic Timeout: Nếu đang PENDING và quá 5 phút -> Update EXPIRED
      if (order.status === 'PENDING') {
        const now = new Date()
        const created = new Date(order.created_at)

        // Tính khoảng cách thời gian (miliseconds -> minutes)
        const diffMinutes = (now.getTime() - created.getTime()) / 60000

        if (diffMinutes > 5) {
          await pool.query(
            "UPDATE orders SET status = 'EXPIRED' WHERE order_code = $1",
            [code]
          )
          order.status = 'EXPIRED'
        }
      }

      res.json({ status: order.status })
    } catch (err) {
      console.error('Lỗi check status:', err)
      res.status(500).json({ error: 'Server Error' })
    }
  }
)

// --- START SERVER ---
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
