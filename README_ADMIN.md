# Hướng dẫn tạo tài khoản Admin

## Cách 1: Sử dụng Script (Khuyến nghị)

Chạy script để tạo tài khoản admin mặc định:

```bash
npm run seed-admin
```

**Thông tin đăng nhập mặc định:**
- Email: `admin@cntt.edu.vn`
- Password: `admin123456`
- Role: `ADMIN`

## Cách 2: Sử dụng Register Page

1. Truy cập: `http://localhost:3000/register`
2. Điền thông tin:
   - Họ và tên: `Administrator`
   - Email: `admin@cntt.edu.vn`
   - Vai trò: Chọn **"Quản trị viên"**
   - Mật khẩu: `admin123456`
   - Xác nhận mật khẩu: `admin123456`
3. Click "Đăng ký"

## Cách 3: Sử dụng API Route

```bash
curl -X POST http://localhost:3000/api/admin/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cntt.edu.vn",
    "password": "admin123456",
    "fullName": "Administrator"
  }'
```

## Phân quyền

### ADMIN (Quản trị viên)
- ✅ Quản lý tất cả người dùng
- ✅ Quản lý danh mục và thẻ
- ✅ Xem thống kê hệ thống
- ✅ Trả lời câu hỏi
- ✅ Đóng câu hỏi
- ✅ Tạo câu hỏi

### ADVISOR (Cố vấn học tập)
- ✅ Trả lời câu hỏi
- ✅ Ghim câu trả lời
- ✅ Đóng câu hỏi
- ✅ Tạo câu hỏi
- ❌ Quản lý người dùng
- ❌ Quản lý danh mục

### STUDENT (Sinh viên)
- ✅ Tạo câu hỏi
- ✅ Xem câu hỏi và câu trả lời
- ✅ Vote câu hỏi/câu trả lời
- ✅ Bình luận
- ❌ Trả lời câu hỏi
- ❌ Quản lý hệ thống

## Sau khi tạo admin

1. Đăng nhập tại: `http://localhost:3000/login`
2. Sử dụng email và password đã tạo
3. Sau khi đăng nhập, bạn sẽ thấy link "Quản trị" trong navbar (chỉ hiện cho ADMIN)
4. Truy cập `/admin` để quản lý hệ thống

