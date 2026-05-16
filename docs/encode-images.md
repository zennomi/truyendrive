# Hướng dẫn mã hóa (Encode) hình ảnh

Dành cho các uploader, TruyenDrive hỗ trợ tính năng mã hóa hình ảnh để tăng cường bảo mật cho dữ liệu lưu trữ trên Google Drive hoặc yêu cầu người đọc phải nhập mật khẩu mới có thể xem được truyện.

Có 2 phương pháp để thực hiện việc này tùy thuộc vào nhu cầu của bạn:

## 1. Phương pháp đơn giản (Dành cho người dùng phổ thông)

Sử dụng công cụ mã hóa trực tuyến trên trình duyệt (Web Encoder). Phù hợp khi bạn cần xử lý số lượng ít hoặc không quen sử dụng dòng lệnh.

- **Truy cập công cụ:** [https://zennomi.github.io/truyendrive/encoder.html](https://zennomi.github.io/truyendrive/encoder.html)
- **Cách thực hiện:**
  1. Mở trang web trên bằng trình duyệt của bạn.
  2. Kéo thả hoặc chọn các hình ảnh bạn muốn mã hóa.
  3. **Tùy chọn mật khẩu:** Nhập mật khẩu nếu bạn muốn đặt mật khẩu bảo vệ. Nếu chỉ muốn chuyển đổi định dạng lưu trữ mà không cần mật khẩu, bạn có thể để trống.
  4. Nhấn nút mã hóa và tải về các file đã được xử lý (được lưu dưới dạng `.truyendrive`).
  5. Tải các file này lên Google Drive hoặc OneDrive.

![Placeholder: Giao diện web encoder](./assets/guides/web-encoder-placeholder.png)

## 2. Phương pháp dành cho nhà phát triển (Dành cho uploader chuyên nghiệp)

Sử dụng công cụ dòng lệnh (CLI) để xử lý hàng loạt hình ảnh một cách tự động và nhanh chóng. Phù hợp cho các uploader lớn, cần xử lý hàng trăm hoặc hàng nghìn file ảnh.

- **Truy cập mã nguồn và hướng dẫn CLI:** [https://github.com/zennomi/truyendrive-cli](https://github.com/zennomi/truyendrive-cli)
- **Cách thực hiện (Tóm tắt):**
  1. Yêu cầu máy tính đã cài đặt môi trường **Node.js**.
  2. Mở Terminal (hoặc Command Prompt) và chạy lệnh CLI theo hướng dẫn trên kho lưu trữ Github.
  3. Tool này hỗ trợ quét và mã hóa tự động toàn bộ hình ảnh trong một thư mục lớn chỉ với một câu lệnh.

![Placeholder: Giao diện dòng lệnh CLI](./assets/guides/cli-encoder-placeholder.png)

Để xem chi tiết các câu lệnh và tham số hỗ trợ (ví dụ như đặt mật khẩu, tùy chỉnh định dạng đầu ra, v.v.), vui lòng tham khảo trực tiếp tại trang Github của `truyendrive-cli`.
