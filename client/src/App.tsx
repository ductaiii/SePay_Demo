import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css' // Import file CSS vừa tạo

// Interface định nghĩa kiểu dữ liệu (Giữ nguyên như bài trước)
interface OrderResponse {
  order_code: number
  amount: number
  qr_url: string
}

type OrderStatus = 'PENDING' | 'PAID' | 'EXPIRED'

const API_URL = 'http://localhost:3000/api'

function App() {
  const [step, setStep] = useState<number>(1)
  const [amount, setAmount] = useState<number>(2000) // Mặc định 2000 giống hình
  const [orderData, setOrderData] = useState<OrderResponse | null>(null)
  const [status, setStatus] = useState<OrderStatus>('PENDING')
  const [timeLeft, setTimeLeft] = useState<number>(300) // 5 phút = 300 giây

  // Hàm format tiền tệ (2000 -> 2,000 đ)
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value)
  }

  // --- STEP 1: TẠO ĐƠN ---
  const handleCreateOrder = async () => {
    if (amount < 2000) {
      alert('Vui lòng nhập số tiền tối thiểu 2000đ')
      return
    }
    try {
      const res = await axios.post<OrderResponse>(`${API_URL}/orders`, {
        amount,
      })
      setOrderData(res.data)
      setStep(2)
      setTimeLeft(300) // Reset timer
    } catch (error: unknown) {
      // Kiểm tra xem error có phải là instance của Error không
      if (error instanceof Error) {
        alert('Lỗi kết nối Server: ' + error.message)
      } else {
        alert('Lỗi không xác định')
      }
    }
  }

  // --- STEP 2: POLLING CHECK STATUS ---
  useEffect(() => {
    let interval: number | undefined
    let timerInterval: number | undefined

    if (step === 2 && status === 'PENDING' && orderData) {
      // 1. Vòng lặp gọi API check status (5s/lần)
      interval = setInterval(async () => {
        try {
          const res = await axios.get<{ status: OrderStatus }>(
            `${API_URL}/orders/${orderData.order_code}`
          )
          const currentStatus = res.data.status
          setStatus(currentStatus)

          if (currentStatus === 'PAID' || currentStatus === 'EXPIRED') {
            clearInterval(interval)
            clearInterval(timerInterval)
          }
        } catch (error) {
          console.error('Polling error', error)
        }
      }, 5000)

      // 2. Đồng hồ đếm ngược (1s/lần)
      timerInterval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) return 0
          return prev - 1
        })
      }, 1000)
    }

    // Cleanup khi component unmount hoặc đổi trạng thái
    return () => {
      clearInterval(interval)
      clearInterval(timerInterval)
    }
  }, [step, status, orderData])

  // Format giây thành mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div>
      <div className="main-container">
        {/* MÀN HÌNH 1: NHẬP TIỀN */}
        {step === 1 && (
          <div>
            <h1
              // chỉnh line-height thành 0
              style={{ lineHeight: 1.3 }}
            >
              Đặt Hàng
            </h1>
            <div className="form-group">
              <label className="form-label">Số tiền</label>
              <input
                type="number"
                className="form-control"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                // thấp nhất là 2000
                min={2000}
              />
              <div className="form-text">
                Hãy điền số tiền nhỏ (ví dụ 2000) để có thể test thanh toán
              </div>
            </div>
            <button className="btn-primary" onClick={handleCreateOrder}>
              Thanh Toán
            </button>
          </div>
        )}

        {/* MÀN HÌNH 2: THANH TOÁN & KẾT QUẢ */}
        {step === 2 && orderData && (
          <div className="payment-info">
            {/* TRẠNG THÁI PENDING: Hiển thị Layout 2 cột */}
            {status === 'PENDING' && (
              <>
                <h3 style={{ marginBottom: '20px' }}>
                  Quét mã VietQR để thanh toán
                </h3>

                <div className="payment-layout">
                  {/* CỘT TRÁI: THÔNG TIN THANH TOÁN */}
                  <div className="info-column">
                    <div className="info-row">
                      <span className="info-label">Ngân hàng:</span>
                      <span className="info-value">TPBank</span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Chủ tài khoản:</span>
                      <span className="info-value text-uppercase">
                        NGUYEN DUC TAI
                      </span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Số tài khoản:</span>
                      <span className="info-value highlight-text">
                        10367909181
                      </span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Số tiền:</span>
                      <span className="info-value amount-text">
                        {formatCurrency(orderData.amount)}
                      </span>
                    </div>

                    <div
                      className="info-row"
                      style={{
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                      }}
                    >
                      <span className="info-label">Nội dung chuyển khoản:</span>
                      <div className="highlight-box">
                        Thanh Toan Don Hang {orderData.order_code}
                      </div>
                    </div>

                    <div className="timer">
                      Đơn hàng hết hạn sau: {formatTime(timeLeft)}
                    </div>
                  </div>

                  {/* CỘT PHẢI: MÃ QR */}
                  <div className="qr-column">
                    <img
                      src={orderData.qr_url}
                      alt="QR Code"
                      className="qr-image"
                    />
                    <p className="qr-note">
                      ⏳ Hệ thống tự động kiểm tra mỗi 5 giây.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* TRẠNG THÁI PAID (Thành công) - Giữ nguyên */}
            {status === 'PAID' && (
              <div className="status-success">
                <span style={{ fontSize: '50px' }}>✅</span>
                <p>THANH TOÁN THÀNH CÔNG!</p>
                <button
                  className="btn-primary center"
                  onClick={() => window.location.reload()}
                >
                  Tạo đơn hàng mới
                </button>
              </div>
            )}

            {/* TRẠNG THÁI EXPIRED (Hết hạn) - Giữ nguyên */}
            {status === 'EXPIRED' && (
              <div className="status-failed">
                <span style={{ fontSize: '50px' }}>❌</span>
                <p>ĐƠN HÀNG ĐÃ HẾT HẠN</p>
                <p style={{ color: '#666' }}>
                  Bạn vui lòng tạo đơn hàng mới để lấy mã QR khác.
                </p>
                <button
                  className="btn-primary center"
                  onClick={() => window.location.reload()}
                >
                  Quay lại trang chủ
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
