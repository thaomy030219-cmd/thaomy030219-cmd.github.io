# Kho ứng dụng cá nhân — Đỗ Xuân Quyết

- [Mở website](https://thaomy030219-cmd.github.io/)
- [Chuẩn bị tải ứng dụng / tệp lên](https://thaomy030219-cmd.github.io/upload.html)
- [Nơi tải tệp tập trung — GitHub Releases](https://github.com/thaomy030219-cmd/thaomy030219-cmd.github.io/releases)
- [Xem tiến trình cập nhật](https://github.com/thaomy030219-cmd/thaomy030219-cmd.github.io/actions/workflows/catalog-pages.yml)

## Cách dùng

Mở trang chuẩn bị → chọn ứng dụng cũ hoặc thêm mới → nhập phiên bản → chọn tệp → tạo thông tin phát hành. Mở GitHub từ trang đó, sao chép tag, tiêu đề và thông tin vào các ô tương ứng, tải đúng tệp lên, chờ hoàn tất rồi bấm **Publish release**. Không chọn Pre-release. Chờ tác vụ cập nhật có dấu tích xanh.

Các lần sau không cần sửa HTML hay thay link tải. APK / EXE / MSI / EPUB / PDF / DOCX / XLSX / AAB được nhận diện tự động; ZIP / 7Z / RAR cần chọn nền tảng. Android và Windows có mã riêng. Mỗi release chứa một tệp.

Các link cũ vẫn giữ nguyên; không cần đưa lại toàn bộ ứng dụng. Từ nay tải các bản mới ở Releases của **kho này** để website tự cập nhật.

Chỉ tải tệp có quyền phân phối công khai. Không đưa khóa ký, mật khẩu hay dữ liệu riêng tư vào release.

## Hoạt động tự động

Tác vụ `catalog-pages.yml` chạy khi có commit lên main, xuất bản hoặc sửa release, hoặc khi bấm Run workflow. Nó chạy kiểm thử, đọc Releases bằng quyền chỉ đọc, gộp với 10 mục gốc, tạo catalog.json và xuất bản website. Mã ứng dụng cố định giúp tránh trùng mục. Bản nháp / Pre-release và tệp chưa tải xong không được đưa lên. Nếu thông tin sai, website đang hoạt động không bị ghi đè.
