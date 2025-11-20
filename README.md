
# Demo Thanh Toán SePay , Thông Báo Qua Telegram
**Giao Diện Trang Chủ**

[![anh1.png](https://i.postimg.cc/9FvT98rx/anh1.png)](https://postimg.cc/7fnf8N17)

**Giao Diện Trang Thanh Toán**

[![anh3-1.png](https://i.postimg.cc/3RBV409h/anh3-1.png)](https://postimg.cc/R6WX2Fjp)

**Tiến Hành Thanh Toán Bằng Việc Quét Mã VietQR**

[![bill.jpg](https://i.postimg.cc/KYNhLWvV/bill.jpg)](https://postimg.cc/XZpP6Q5c)


**Thông Báo Qua Telegram**

[![anh4.png](https://i.postimg.cc/0QWZ1Ycz/anh4.png)](https://postimg.cc/TLbnrD8x)


## Tài liệu tham khảo

- **Tạo QR Code Online chuẩn VietQR:**  [qr.sepay.vn](https://qr.sepay.vn/)
- **Tạo API Token:**  [docs.sepay.vn/tao-api-token.html](https://docs.sepay.vn/tao-api-token.html)
- **Hướng dẫn lập trình cổng thanh toán miễn phí:**  [sepay.vn/lap-trinh-cong-thanh-toan.html](https://sepay.vn/lap-trinh-cong-thanh-toan.html)


## Công Nghệ Sử Dụng

- **Frontend (FE):** ReactJS – Giao diện đơn giản, trực quan, dễ sử dụng.
- **Backend (BE):** Node.js & Express.js – Xử lý logic, kết nối SePay API, thao tác với database.
- **Database:** PostgreSQL – Lưu trữ thông tin đơn hàng và giao dịch.


## Cấu trúc thư mục dự án

```text
sepay-payment-app/
├── database/                   # Chứa câu lệnh SQL
│   └── schema.sql
├── server/                     # Backend (Node.js + Express)
│   ├── .env                    # Biến môi trường (Token, DB Config)
│   ├── config/
│   │   └── db.js               # Kết nối PostgreSQL
│   ├── controllers/
│   │   └── orderController.js  # Logic xử lý đơn hàng
│   ├── worker.js               # Worker chạy ngầm (Sync SePay)
│   ├── index.js                # Entry point của API Server
│   └── package.json
└── client/                     # Frontend (ReactJS - Vite)
    ├── src/
    │   ├── components/
    │   │   ├── Home.jsx
    │   │   └── Payment.jsx
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

## Hướng dẫn khởi tạo dự án & cài đặt package

### Backend (BE)

Chạy lệnh sau trong thư mục `server` để cài đặt các package cần thiết:

```bash
npm install express pg cors dotenv axios
```

### Frontend (FE)

Khởi tạo dự án React + TypeScript với Vite:

```bash
npm create vite@latest .
```

Chọn các tuỳ chọn:
- **Framework:** React
- **Variant:** TypeScript

## Ý Tưởng Website

1. **Trang chủ (Home):**
     - Phía trên: Tiêu đề, mô tả ngắn về dịch vụ.
     - Phía dưới: Ô nhập số tiền (chỉ nhận số > 2000 VND, không âm).
     - Nút "Đặt Hàng" để tạo đơn.

2. **Giao diện thanh toán:**
     - Hiển thị QR Code VietQR (tạo qua API SePay).
     - Thông tin số tài khoản, ngân hàng, nội dung chuyển khoản: `Thanh Toán Đơn Hàng XXX`
     - Vòng tròn chờ thanh toán (timeout 5 phút).

3. **Kiểm tra trạng thái thanh toán:**
     - Backend gọi API SePay lấy danh sách giao dịch:
         `https://my.sepay.vn/userapi/transactions/list?account_number=SO_TAI_KHOAN&limit=20`
     - Token API lấy từ SePay.
     - Cứ mỗi 5 giây, backend gọi lại API, lưu các giao dịch mới vào bảng `transactions`.
     - So sánh các giao dịch mới với nội dung chuyển khoản, lọc ra mã đơn hàng (XXX).
     - Nếu tìm thấy giao dịch hợp lệ (đúng số tiền, đúng nội dung), cập nhật trạng thái đơn hàng thành "PAID" và trả về FE.

## Hướng Dẫn Tích Hợp

### 1. Tạo QR Code VietQR

- Sử dụng API:
    `https://qr.sepay.vn/img?acc=SO_TAI_KHOAN&bank=NGAN_HANG&amount=SO_TIEN&des=NOI_DUNG&template=TEMPLATE&download=DOWNLOAD`
    - `SO_TAI_KHOAN`: Số tài khoản ngân hàng.
    - `NGAN_HANG`: Mã ngân hàng (xem [danh sách](https://qr.sepay.vn/banks.json)).
    - `SO_TIEN`: Số tiền cần chuyển.
    - `NOI_DUNG`: Nội dung chuyển khoản (ví dụ: Thanh Toán Đơn Hàng 456).
    - `TEMPLATE`: Kiểu QR (để trống, `compact`, `qronly`).
    - `DOWNLOAD`: `true` để tải về.

- Ví dụ QR:
    `https://qr.sepay.vn/img?bank=TPBank&acc=10367909181&template=compact&amount=2000&des=Thanh%20Toan%20Don%20Hang%20456`

### 2. Tạo API Token

- Đăng nhập SePay, tạo API Token tại: [docs.sepay.vn/tao-api-token.html](https://docs.sepay.vn/tao-api-token.html)
- Sử dụng token này để xác thực khi gọi API lấy giao dịch.

### 3. Lấy danh sách giao dịch từ SePay

- API lấy giao dịch:
    `https://my.sepay.vn/userapi/transactions/list?account_number=10367909181&limit=20`
    - `account_number`: Số tài khoản nhận tiền.
    - `limit`: Số lượng giao dịch lấy về.

- Kết quả trả về:
    ```json
    {
            "status": 200,
            "error": null,
            "messages": { "success": true },
            "transactions": [
                    {
                            "id": "31311033",
                            "bank_brand_name": "TPBank",
                            "account_number": "10367909181",
                            "transaction_date": "2025-11-19 13:26:39",
                            "amount_in": "2000.00",
                            "transaction_content": "Thanh Toan Don Hang 456",
                            ...
                    }
            ]
    }
    ```

### 4. Lưu giao dịch vào Database

- Tạo bảng `transactions` trong PostgreSQL với các trường: `id`, `bank_brand_name`, `account_number`, `transaction_date`, `amount_in`, `transaction_content`, `bank_account_id`, ...
- Khi có giao dịch mới, lưu vào bảng.
- So sánh nội dung chuyển khoản (`transaction_content`) để lấy mã đơn hàng (XXX).
- Nếu mã đơn hàng hợp lệ, cập nhật trạng thái đơn hàng thành "PAID".

### 5. Kiểm tra trạng thái đơn hàng

- FE gọi API backend để kiểm tra trạng thái đơn hàng (polling mỗi 5 giây).
- Nếu đơn hàng đã "PAID", hiển thị thông báo thành công.
- Nếu hết thời gian (5 phút), chuyển trạng thái "EXPIRED", hiển thị thông báo hết hạn.

## Lưu Ý Triển Khai

- Đảm bảo kiểm tra dữ liệu đầu vào ở cả FE và BE.
- Sử dụng prepared statement khi thao tác với database để tránh SQL Injection.
- Bảo mật API Token, không để lộ ra ngoài.
- Xử lý timeout, trạng thái đơn hàng chính xác theo luồng nghiệp vụ.

---

## Sequence Diagram Cập Nhật

### 1. Thiết kế Cơ sở dữ liệu (Database Schema)
```mermaid
erDiagram
    ORDERS {
        int id PK "ID tự tăng (Internal ID)"
        string order_code UK "Mã Random (1000-9999) - Unique"
        decimal amount "Số tiền cần thanh toán"
        string status "PENDING | PAID | EXPIRED | CANCELLED"
        timestamp created_at "Thời điểm tạo (Dùng để tính 5 phút timeout)"
        timestamp updated_at "Thời điểm cập nhật cuối"
    }

    TRANSACTIONS {
        string id PK "ID giao dịch từ SePay (Primary Key)"
        string order_id FK "ID đơn hàng tương ứng (Nếu có)"
        string account_number "Số TK nhận"
        decimal amount_in "Số tiền thực nhận"
        string transaction_content "Nội dung CK (Ví dụ: Thanh Toan Don Hang 1234)"
        string bank_brand_name "Ngân hàng"
        timestamp transaction_date "Thời gian giao dịch trên sao kê"
        boolean is_processed "True = Đã dùng để update Order"
        timestamp created_at "Thời gian Worker lưu vào DB"
    }

    ORDERS ||--o{ TRANSACTIONS : "1 Order có thể khớp 1 hoặc nhiều GD"
```
### 2. Flowchart & Sequence Diagrams

####  Sơ đồ 1: Luồng Chính (Tạo đơn & Người dùng chờ phản hồi)

Sơ đồ này tập trung vào trải nghiệm người dùng và việc Frontend giao tiếp với Backend.

Flowchart :
```mermaid
flowchart TD
    Start((Bắt đầu)) --> Input[Khách nhập số tiền]
    Input --> CallCreate[FE: Gọi API Create Order]

    subgraph Backend_Create_Order [Backend: Xử lý tạo đơn]
        GenCode[Random Code: 1000 - 9999] --> DBInsert[(INSERT Order: PENDING, Created_at)]
    end

    CallCreate --> GenCode
    DBInsert --> ReturnInfo[Trả về: Mã đơn, QR Link]

    ReturnInfo --> ShowQR[FE: Hiển thị QR & Spinner]

    %% Vòng lặp Polling
    ShowQR --> Wait5s{Chờ 5 giây}
    Wait5s --> CallCheck[FE: Gọi API Check Status]

    subgraph Backend_Check_Status [Backend: Kiểm tra trạng thái]
        GetDB[(SELECT Order)] --> CheckStatus{Trạng thái hiện tại?}

        CheckStatus -- PAID --> ResPaid[Trả về: PAID]
        CheckStatus -- EXPIRED --> ResExpired[Trả về: EXPIRED]

        CheckStatus -- PENDING --> CheckTime{Check Time:\nNow - Created_at > 5 phút?}

        CheckTime -- Đúng (Quá giờ) --> DBExpire[(UPDATE Order: EXPIRED)]
        DBExpire --> ResNewExpired[Trả về: EXPIRED]

        CheckTime -- Sai (Còn hạn) --> ResPending[Trả về: PENDING]
    end

    CallCheck --> GetDB

    %% Xử lý kết quả tại FE
    ResPaid --> UI_Success[FE: Hiện 'Thanh Toán Thành Công'] --> End((Kết thúc))

    ResExpired --> UI_Fail[FE: Hiện 'Giao Dịch Thất Bại/Hết Giờ'] --> End
    ResNewExpired --> UI_Fail

    ResPending --> Wait5s
```

Sequence Diagram
```mermaid
sequenceDiagram
    autonumber
    actor User as Khách Hàng (FE)
    participant BE as Backend API
    participant DB as PostgreSQL

    Note over User, BE: GIAI ĐOẠN 1: TẠO ĐƠN HÀNG
    User->>User: Nhập số tiền (amount)
    User->>BE: POST /api/orders {amount}

    rect rgb(240, 248, 255)
    Note right of BE: Xử lý Logic Random
    BE->>BE: orderCode := Random(1000, 9999)
    BE->>DB: INSERT INTO orders (code=orderCode, status='PENDING', created_at=NOW()...)
    DB-->>BE: Success
    end

    BE-->>User: Return { orderCode, qr_link, timeout_at }

    Note over User, BE: GIAI ĐOẠN 2: KHÁCH QUÉT MÃ & CHỜ KẾT QUẢ
    User->>User: Hiển thị QR kèm nội dung "Thanh Toan Don Hang [orderCode]"

    loop Mỗi 5 giây (Polling từ FE)
        User->>BE: GET /api/orders/{orderCode}/status
        BE->>DB: SELECT status, created_at FROM orders WHERE code={orderCode}
        DB-->>BE: {status, created_at}

        BE->>BE: Check Timeout: (NOW - created_at) > 5 mins?

        alt Vừa mới thanh toán xong (PAID)
            BE-->>User: {status: "PAID"}
            User->>User: Thông báo: "Thanh toán thành công!"
            Note over User: Dừng Polling
        else Hết thời gian 5 phút (EXPIRED)
            BE->>DB: UPDATE orders SET status='EXPIRED' WHERE code={orderCode}
            BE-->>User: {status: "EXPIRED"}
            User->>User: Thông báo: "Hết hạn, vui lòng tạo lại mã"
            Note over User: Dừng Polling
        else Vẫn đang chờ (PENDING)
            BE-->>User: {status: "PENDING"}
            User->>User: Tiếp tục chờ...
        end
    end
```

#### Sơ đồ 2: Luồng Worker (Hệ thống chạy ngầm đồng bộ)

Flowchart :
```mermaid
flowchart TD
    Start((Start Timer 5s)) --> CallSePay[Gọi API SePay: Transaction List]

    CallSePay --> CheckAPI{API Thành công?}
    CheckAPI -- No --> LogErr[Log Lỗi] --> EndLoop((Đợi lượt sau))

    CheckAPI -- Yes --> FilterID[Lọc các Transaction ID\nchưa có trong DB]

    FilterID --> HasNew{Có giao dịch mới?}
    HasNew -- No --> EndLoop

    HasNew -- Yes --> LoopStart[Lặp qua từng Giao dịch mới]

    subgraph Process_Transaction [Xử lý từng giao dịch]
        LoopStart --> SaveDB[(INSERT vào bảng Transactions)]
        SaveDB --> Regex[Regex Content:\nTìm số 4 chữ số 'XXXX']

        Regex --> FoundCode{Tìm thấy mã?}
        FoundCode -- No --> LogSkip[Bỏ qua: Không tìm thấy mã] --> NextItem

        FoundCode -- Yes (VD: 4567) --> FindOrder[(SELECT Order WHERE\nCode=4567 AND Status=PENDING)]

        FindOrder --> OrderExist{Có đơn hàng khớp?}
        OrderExist -- No --> LogSkip2[Bỏ qua: Không có đơn chờ] --> NextItem

        OrderExist -- Yes --> CheckMoney{Tiền vào >= Tiền đơn?}

        CheckMoney -- No --> LogWarn[Log Warning: Chuyển thiếu tiền] --> NextItem

        CheckMoney -- Yes --> UpdatePaid[(UPDATE Order: PAID)] --> NextItem
    end

    NextItem{Còn item?} -- Yes --> LoopStart
    NextItem -- No --> EndLoop
```
```mermaid
sequenceDiagram
    autonumber
    participant Worker as BE Worker (Cronjob)
    participant SePay as SePay API
    participant DB as PostgreSQL

    Note over Worker: Chạy vô tận (Infinite Loop)
    loop Mỗi 5 giây
        Note right of Worker: B1. Lấy dữ liệu từ ngân hàng
        Worker->>SePay: GET /userapi/transactions/list
        SePay-->>Worker: Trả về List Transaction mới nhất

        Note right of Worker: B2. Lọc và lưu giao dịch mới
        Worker->>BE: Lọc ra các Transaction ID chưa có trong DB

        opt Có giao dịch mới (New Transactions)
            Worker->>DB: INSERT INTO transactions (...)

            loop Duyệt từng giao dịch mới
                Worker->>Worker: Regex lấy 'Code' từ nội dung "Thanh Toan Don Hang [Code]"

                opt Tìm thấy Code hợp lệ (Ví dụ: 6789)
                    Worker->>DB: SELECT * FROM orders WHERE code='6789' AND status='PENDING'
                    DB-->>Worker: Tìm thấy Order

                    Worker->>Worker: So sánh tiền (Transaction Amount >= Order Amount)

                    alt Khớp lệnh thành công
                        Worker->>DB: UPDATE orders SET status='PAID' WHERE code='6789'
                    else Sai lệch (Thiếu tiền/Sai nội dung)
                        Worker->>Worker: Log cảnh báo (Admin check tay)
                    end
                end
            end
        end
    end
```
