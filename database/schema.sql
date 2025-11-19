
-- Tạo bảng Orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY, -- ID tự tăng (Internal ID)
    order_code VARCHAR(10) UNIQUE NOT NULL, -- Mã Random (1000-9999) - Unique
    amount DECIMAL(15, 2) NOT NULL, -- Số tiền cần thanh toán
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL, -- PENDING | PAID | EXPIRED | CANCELLED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, -- Thời điểm tạo
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL -- Thời điểm cập nhật cuối
);

-- Tạo bảng Transactions
CREATE TABLE transactions (
    id VARCHAR(50) PRIMARY KEY, -- ID giao dịch từ SePay (Primary Key)
    order_id INT, -- Liên kết tới đơn hàng
    account_number VARCHAR(20) NOT NULL, -- Số TK nhận
    amount_in DECIMAL(15, 2) NOT NULL, -- Số tiền thực nhận
    transaction_content TEXT, -- Nội dung CK
    bank_brand_name VARCHAR(50), -- Ngân hàng
    transaction_date TIMESTAMP NOT NULL, -- Thời gian giao dịch trên sao kê
    is_processed BOOLEAN DEFAULT FALSE NOT NULL, -- True = Đã dùng để update Order
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, -- Thời gian Worker lưu vào DB
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- Index cho nhanh
CREATE INDEX idx_orders_code ON orders(order_code);
CREATE INDEX idx_transactions_order_id ON transactions(order_id);