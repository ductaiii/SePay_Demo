import axios from 'axios'
import pool from './config/db' // Import từ file db.ts đã sửa ở bước trước
import dotenv from 'dotenv'

dotenv.config()

const SYNC_INTERVAL = 5000 // 5 giây

// 1. Định nghĩa Interface cho dữ liệu từ SePay API trả về
interface SePayTransaction {
  id: string
  bank_brand_name: string
  account_number: string
  transaction_date: string
  amount_in: string // API trả về chuỗi số (VD: "2000.00")
  transaction_content: string
  reference_number: string
  bank_account_id: string
}

interface SePayResponse {
  status: number
  messages: { success: boolean }
  transactions: SePayTransaction[]
}

// 2. Định nghĩa Interface cho Order trong DB
interface Order {
  id: number
  order_code: string
  amount: string
  status: string
}

async function syncTransactions() {
  try {
    console.log('Worker: Checking transactions...')

    const apiUrl = process.env.SEPAY_API_URL
    const apiToken = process.env.SEPAY_API_TOKEN
    const accountNumber = process.env.SEPAY_ACCOUNT_NUMBER

    if (!apiUrl || !apiToken || !accountNumber) {
      console.error('❌ Missing Env Config for SePay')
      return
    }

    // 1. Gọi API SePay
    // Sử dụng Generic <SePayResponse> để axios biết kiểu dữ liệu trả về
    const response = await axios.get<SePayResponse>(apiUrl, {
      headers: { Authorization: apiToken },
      params: {
        account_number: accountNumber,
        limit: 20,
      },
    })

    const transactions = response.data.transactions

    for (const trans of transactions) {
      // 2. Check xem giao dịch đã lưu DB chưa
      const checkExist = await pool.query(
        'SELECT id FROM transactions WHERE id = $1',
        [trans.id]
      )

      if (checkExist.rows.length === 0) {
        // Lưu transaction mới
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

        // 3. Regex tìm mã đơn hàng (XXX)
        // Pattern: Tìm chuỗi "Don Hang " theo sau là 4 chữ số
        const content = trans.transaction_content // VD: "Thanh Toan Don Hang 4567"
        const match = content.match(/Don Hang (\d{4})/i)

        if (match) {
          const orderCode = match[1] // Lấy được mã 4567
          const amountIn = parseFloat(trans.amount_in)

          // 4. Tìm đơn hàng tương ứng đang PENDING
          const orderResult = await pool.query<Order>(
            "SELECT * FROM orders WHERE order_code = $1 AND status = 'PENDING'",
            [orderCode]
          )

          if (orderResult.rows.length > 0) {
            const order = orderResult.rows[0]
            const orderAmount = parseFloat(order.amount)

            // So sánh tiền (cho phép sai số nhỏ hoặc phải >=)
            if (amountIn >= orderAmount) {
              // Cập nhật trạng thái đơn hàng
              await pool.query(
                "UPDATE orders SET status = 'PAID' WHERE order_code = $1",
                [orderCode]
              )
              // Cập nhật order_id cho transaction vừa lưu
              await pool.query(
                'UPDATE transactions SET order_id = $1 WHERE id = $2',
                [order.id, trans.id]
              )
              console.log(
                `✅ SUCCESS: ORDER ${orderCode} IS PAID! & transaction ${trans.id} linked to order_id ${order.id}`
              )
            } else {
              console.log(
                `⚠️ WARNING: Order ${orderCode} thiếu tiền (Nhận: ${amountIn}, Cần: ${orderAmount})`
              )
            }
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Worker Error:', error.message)
  }
}

// Chạy vòng lặp
setInterval(syncTransactions, SYNC_INTERVAL)
console.log('🚀 Worker started (TypeScript)...')
