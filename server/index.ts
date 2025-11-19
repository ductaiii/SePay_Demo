import express, { Request, Response } from 'express'
import cors from 'cors'
import pool from './config/db'
import dotenv from 'dotenv'

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
    RETURNING order_code, amount
  `

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const code = generateOrderCode()
    const result = await pool.query(insertQ, [code, amount, 'PENDING'])
    if (result.rows.length > 0) {
      const row = result.rows[0]
      return {
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
