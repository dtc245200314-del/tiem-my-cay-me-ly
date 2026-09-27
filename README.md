# Tiệm Mỳ Cay Mê Ly

Game quản lý quán mỳ cay chạy hoàn toàn trong trình duyệt, không cần cài đặt.

## Chơi

Mở `index.html`, hoặc chạy một web server tĩnh trong thư mục này:

```bash
python -m http.server 8765
```

Sau đó truy cập `http://127.0.0.1:8765`.

Vòng chơi gồm:

1. Nhập nguyên liệu và theo dõi hạn dùng.
2. Mở quán, đọc đơn khách.
3. Lấy tô, thêm mỳ, nước dùng, nhân, topping và đúng số cấp cay.
4. Giao món trước khi khách hết kiên nhẫn.
5. Dùng lợi nhuận để mua nâng cấp và mở nguyên liệu mới qua từng ngày.

Tiến độ được lưu tự động bằng `localStorage`. Game responsive cho desktop và điện thoại, dùng HTML/CSS/JavaScript thuần và chạy offline.

