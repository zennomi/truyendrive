# TruyenDrive

TruyenDrive là một userscript giúp biến các thư mục trên Google Drive, OneDrive (preview) thành một giao diện đọc truyện tranh chuyên nghiệp và tiện lợi.

![TruyenDrive Chapter Reader](./docs/assets/chapter-demo.jpg)

![TruyenDrive Manga Viewer](./docs/assets/comic-demo.jpg)

Thay vì phải mở từng ảnh một cách thủ công trên Google Drive, TruyenDrive sẽ tự động nhận diện các thư mục chứa ảnh hoặc các thư mục con (các chương truyện), sau đó hiển thị chúng dưới dạng một trình đọc truyện với đầy đủ các tính năng như chuyển trang, thiết lập hiển thị.

## Mục lục

- [TruyenDrive](#truyendrive)
  - [Mục lục](#mục-lục)
  - [Tính năng chính](#tính-năng-chính)
  - [Hướng dẫn cài đặt](#hướng-dẫn-cài-đặt)
  - [Cách sử dụng](#cách-sử-dụng)
    - [Người đọc](#người-đọc)
    - [Người lưu trữ truyện](#người-lưu-trữ-truyện)
  - [Hướng dẫn mã hóa hình ảnh (Dành cho Người lưu trữ truyện)](#hướng-dẫn-mã-hóa-hình-ảnh-dành-cho-người-lưu-trữ-truyện)

## Tính năng chính

- **Giao diện đọc truyện tối ưu**: Hỗ trợ đọc từ trái sang phải (LTR), phải sang trái (RTL) hoặc cuộn dọc (TTB).
- **Tự động nhận diện cấu trúc**: Phân tích cấu trúc thư mục Google Drive để phân loại thành danh sách chương hoặc danh sách trang ảnh. Hỗ trợ cả Shortcut của Google Drive.
- **Tùy chỉnh linh hoạt**: Hỗ trợ thay đổi chế độ hiển thị trang (trang đơn, trang đôi), tự động tải trước trang ảnh (preload) để tránh giật lag, và lưu lại cài đặt của người dùng.
- **Tiện lợi**: Có thanh bên (sidebar) và các nút điều hướng trực quan mang lại trải nghiệm tương tự các trang web đọc truyện lớn.
- **Lưu lại trạng thái đọc**: TruyenDrive sẽ lưu lại trạng thái đọc của người dùng (chương và trang hiện tại) trong URL, giúp người dùng có thể tiếp tục đọc từ nơi đã dừng lại khi mở lại trang.
- **Mã hóa hình ảnh**: Hỗ trợ mã hóa hình ảnh để bảo vệ quyền riêng tư. Truy cập bằng mật khẩu.
- **Đọc chế độ ẩn danh**: Có thể đọc ẩn danh thư mục Google Drive công khai mà không cần đăng nhập.

## Hướng dẫn cài đặt

Vui lòng xem chi tiết tại: [Hướng dẫn cài đặt TruyenDrive](./docs/installation.md)

## Cách sử dụng

### Người đọc

1. Truy cập vào bất kỳ thư mục Google Drive (VD: `https://drive.google.com/drive/folders/...`) chứa:

- Các trang truyện
- Hoặc chứa các thư mục con (mỗi thư mục con là một chương truyện)

2. Bấm vào nút "TruyenDrive" ở góc dưới cùng bên phải để kích hoạt giao diện đọc truyện của TruyenDrive.

![TruyenDrive Button](./docs/assets/button-demo.png)

3. Nếu thư mục vừa có chứa ảnh (trang truyện) vừa chứa thư mục con (chương truyện), một hộp thoại sẽ hiện ra để bạn chọn cách mở.

4. Trong màn hình đọc truyện, bạn có thể:
   - Click vào hai bên mép màn hình, hoặc dùng phím mũi tên trái/phải để **Chuyển trang**.
   - Click vào giữa màn hình để mở/đóng thanh công cụ.
   - Sử dụng thanh công cụ hoặc sidebar để **chuyển chương**, phóng to/thu nhỏ, hay thay đổi các cài đặt khác theo sở thích.

5. Nếu các trang truyện bị mã hóa và cần nhập mật khẩu, nhập mật khẩu tại menu hoặc bấm phím tắt [K]

![Sử dụng password](./docs/assets/password-demo.png)

> **⚠️ Lưu ý (Disclaimer):** Đây là một userscript phục vụ mục đích học tập và nghiên cứu, không liên kết chính thức với Google Drive hay OneDrive. Bạn nên cân nhắc trước khi sử dụng. Tốt nhất là nên dùng với chế độ ẩn danh (Incognito Mode) để tránh các sự cố không mong muốn với tài khoản cá nhân.

### Người lưu trữ truyện

Để trải nghiệm đọc truyện tốt nhất, bạn nên tổ chức thư mục Google Drive theo cấu trúc sau:

```
- One Piece
  - Chương 1
    - Trang 1.jpg
    - Trang 2.jpg
    - ...
  - Chương 2
    - Trang 1.jpg
    - Trang 2.jpg
    - ...
```

TruyenDrive sẽ tự động nhận diện các thư mục con và hiển thị chúng dưới dạng các chương truyện, sắp xếp từ A-Z, support tất cả các format ảnh: JPG, PNG, WEBP và thậm chí PSD.

[Ví dụ 1 link chương truyện](https://drive.google.com/drive/u/2/folders/1lzc-aJ0sEl5J_a4xCsSyLpRn5ABQjxRm?td-chap=15PTiht-fQjeKeP9RQ_ggokYna1fVoe1o&td-page=1m).

Để chia sẻ một chương truyện là thư mục con của một truyện, chia sẻ link với format sau: `https://drive.google.com/drive/folders/[manga-folder-id]?td-chap=[chapter-folder-id]&td-page=1`

Hoặc copy link trực tiếp tại giao diện đọc truyện.

## Hướng dẫn mã hóa hình ảnh (Dành cho Người lưu trữ truyện)

Vui lòng xem chi tiết tại: [Hướng dẫn mã hóa hình ảnh](./docs/encode-images.md)
