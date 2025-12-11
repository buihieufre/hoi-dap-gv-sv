# Hướng dẫn Import CSV người dùng

## Cấu hình Email (SMTP)

Trước khi sử dụng tính năng import CSV, bạn cần cấu hình SMTP trong file `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=admtlu04@gmail.com
SMTP_PASS=pkygfmkstfizhqqx
SMTP_FROM=admtlu04@gmail.com
```

### Cách lấy thông tin SMTP cho Gmail

#### Bước 1: Lấy SMTP_HOST và SMTP_PORT

Đối với Gmail, các giá trị này cố định:

- `SMTP_HOST=smtp.gmail.com` (luôn là giá trị này cho Gmail)
- `SMTP_PORT=587` (hoặc `465` nếu dùng SSL, nhưng khuyến nghị dùng `587`)

#### Bước 2: Lấy SMTP_USER

- `SMTP_USER`: Đây chính là **địa chỉ email Gmail của bạn**
- Ví dụ: `admtlu04@gmail.com`

#### Bước 3: Lấy SMTP_PASS (App Password) - HƯỚNG DẪN CHI TIẾT

**⚠️ QUAN TRỌNG**: Bạn **KHÔNG thể dùng mật khẩu Gmail thông thường**, mà phải tạo **App Password**.

##### Cách 1: Tìm App Password trực tiếp (Nếu đã bật 2-Step Verification)

1. Vào trực tiếp link này: https://myaccount.google.com/apppasswords

   - Hoặc vào https://myaccount.google.com/ → **Security** → Tìm **App passwords**

2. Nếu thấy trang App passwords:
   - Chọn **Select app** → Chọn **Mail**
   - Chọn **Select device** → Chọn **Other (Custom name)** → Nhập tên như "Q&A System"
   - Click **Generate** (Tạo)
   - Copy mật khẩu 16 ký tự hiển thị

##### Cách 2: Bật 2-Step Verification trước (Nếu chưa thấy App passwords)

**Bước A: Bật 2-Step Verification**

1. Vào https://myaccount.google.com/security
2. Tìm mục **2-Step Verification** (Xác minh 2 bước)
3. Click vào và làm theo hướng dẫn:
   - Nhập mật khẩu Gmail
   - Chọn phương thức xác thực (SMS hoặc Google Authenticator)
   - Xác nhận số điện thoại
   - Nhập mã xác thực được gửi đến
   - Bật thành công

**Bước B: Tạo App Password (Sau khi bật 2-Step Verification)**

1. Quay lại https://myaccount.google.com/apppasswords
2. Bây giờ bạn sẽ thấy trang App passwords
3. Làm theo Cách 1 ở trên

##### Cách 3: Nếu vẫn không thấy App passwords

Một số tài khoản Google Workspace hoặc tài khoản cá nhân có thể không thấy App passwords ngay. Thử các cách sau:

1. **Đảm bảo đã bật 2-Step Verification**:

   - Kiểm tra lại tại https://myaccount.google.com/security
   - Phải thấy trạng thái "On" (Bật) ở mục 2-Step Verification

2. **Truy cập trực tiếp**:

   - Vào: https://myaccount.google.com/apppasswords
   - Nếu bị chuyển hướng, làm theo hướng dẫn để bật 2-Step Verification

3. **Kiểm tra tài khoản**:

   - Một số tài khoản Google Workspace do admin quản lý có thể bị tắt App passwords
   - Liên hệ admin để bật tính năng này

4. **Dùng mật khẩu ứng dụng thay thế**:
   - Nếu không thể tạo App Password, có thể thử dùng mật khẩu Gmail thông thường với cài đặt "Less secure app access" (không khuyến nghị vì kém an toàn)
   - Hoặc sử dụng OAuth2 (phức tạp hơn)

##### Ví dụ App Password

Sau khi tạo, bạn sẽ nhận được mật khẩu dạng:

- `pkyg fmks tfiz hqqx` (có khoảng trắng - Google hiển thị)
- **Bỏ khoảng trắng khi dùng**: `pkygfmkstfizhqqx` ✅

**⚠️ QUAN TRỌNG**:

- Google hiển thị App Password với khoảng trắng để dễ đọc
- **Bạn PHẢI bỏ khoảng trắng** khi copy vào file `.env`
- Ví dụ: `pkyg fmks tfiz hqqx` → Dùng `pkygfmkstfizhqqx` trong `.env`

#### Bước 4: Lấy SMTP_FROM

- `SMTP_FROM`: Thường giống với `SMTP_USER` (email của bạn)
- Hoặc có thể đặt tên hiển thị: `"Hệ thống Q&A" <your-email@gmail.com>`
- Nếu không set, sẽ dùng `SMTP_USER` làm mặc định

### Ví dụ cấu hình hoàn chỉnh

Sau khi có đầy đủ thông tin, file `.env` của bạn sẽ trông như thế này:

```env
# SMTP Configuration for Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=nguyenvana@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM=nguyenvana@gmail.com
```

**Lưu ý quan trọng**:

- ⚠️ **KHÔNG dùng mật khẩu Gmail thông thường** cho `SMTP_PASS`
- ✅ **PHẢI dùng App Password** (mật khẩu ứng dụng)
- 🔒 App Password chỉ hiển thị **1 lần duy nhất** khi tạo, hãy lưu lại ngay
- 📧 Email phải **bật xác thực 2 bước** trước khi tạo App Password

### Cấu hình SMTP khác

#### Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=your-email@outlook.com
```

- Có thể dùng mật khẩu thông thường hoặc App Password (nếu bật 2FA)

#### Yahoo Mail

```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@yahoo.com
```

- Cần tạo App Password tương tự Gmail

#### Custom SMTP Server

- Liên hệ nhà cung cấp email của bạn để lấy thông tin SMTP
- Thường có trong phần cài đặt email client hoặc tài liệu hỗ trợ

## Định dạng file CSV

File CSV cần có các cột sau (có thể dùng tiêu đề tiếng Việt hoặc tiếng Anh):

### Các cột bắt buộc:

- **Họ và tên đầy đủ** (hoặc `fullName`, `Full Name`)
- **email** (hoặc `Email`, `EMAIL`)
- **role** (hoặc `Role`, `ROLE`, `Vai trò`)

### Cột tùy chọn:

- **mã sinh viên** (hoặc `studentId`, `Student ID`) - Khuyến nghị cho STUDENT

### Giá trị role hợp lệ:

- `STUDENT` hoặc `SINH VIÊN` hoặc `SV` → Sinh viên
- `ADVISOR` hoặc `CỐ VẤN` hoặc `CV` hoặc `GIẢNG VIÊN` → Cố vấn học tập
- `ADMIN` hoặc `QUẢN TRỊ` → Quản trị viên

## Ví dụ file CSV

```csv
Họ và tên đầy đủ,email,mã sinh viên,role
Nguyễn Văn A,nguyenvana@example.com,20210001,STUDENT
Trần Thị B,tranthib@example.com,20210002,STUDENT
Lê Văn C,levanc@example.com,ADV001,ADVISOR
Phạm Thị D,phamthid@example.com,,ADMIN
```

Hoặc với tiêu đề tiếng Anh:

```csv
fullName,email,studentId,role
Nguyễn Văn A,nguyenvana@example.com,20210001,STUDENT
Trần Thị B,tranthib@example.com,20210002,STUDENT
```

## Quy trình import

1. Admin vào trang **Quản lý người dùng**
2. Click nút **"Import CSV"**
3. Chọn file CSV đã chuẩn bị
4. Click **"Import"**
5. Hệ thống sẽ:
   - Parse file CSV
   - Tạo tài khoản cho từng user
   - Generate mật khẩu ngẫu nhiên (12 ký tự)
   - Gửi email chứa mật khẩu đến từng user
6. Xem kết quả import (số lượng thành công/thất bại và lỗi chi tiết)

## Lưu ý

- Email phải là duy nhất trong hệ thống
- Mật khẩu được generate tự động và gửi qua email
- Nếu email đã tồn tại, user đó sẽ bị bỏ qua
- Nếu gửi email thất bại, tài khoản vẫn được tạo nhưng sẽ có cảnh báo
- File CSV phải có encoding UTF-8
- Không có giới hạn số lượng users trong một lần import, nhưng quá trình sẽ mất thời gian nếu có nhiều users
