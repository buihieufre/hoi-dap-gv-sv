# Scripts

## Tạo tài khoản Admin

Có 2 cách để tạo tài khoản admin:

### Cách 1: Sử dụng Script (Khuyến nghị)

```bash
# Set environment variables (optional)
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="admin123"
export ADMIN_NAME="Administrator"

# Run script
npm run create-admin
```

Hoặc set trong `.env`:
```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Administrator
```

### Cách 2: Sử dụng API Route

```bash
curl -X POST http://localhost:3000/api/admin/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "fullName": "Administrator"
  }'
```

### Cách 3: Sử dụng Register Page

1. Truy cập `/register`
2. Chọn role "Quản trị viên"
3. Điền thông tin và đăng ký

## Lưu ý

- Email phải unique
- Password tối thiểu 6 ký tự
- Sau khi tạo, có thể đăng nhập ngay với email và password đã tạo

