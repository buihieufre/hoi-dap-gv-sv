# Prisma Database Setup

## Cấu hình

Prisma schema được đặt tại: `src/infrastructure/database/prisma/schema.prisma`

## Environment Variables

**QUAN TRỌNG:** Prisma 7 tự động đọc `DATABASE_URL` từ environment variables khi runtime.

Tạo file `.env` ở **root project** (cùng cấp với `package.json`) với nội dung:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/quan_ly_hoi_dap?schema=public"
```

### Format DATABASE_URL cho PostgreSQL:

```
postgresql://[user]:[password]@[host]:[port]/[database]?schema=[schema]
```

### Ví dụ:

**Local PostgreSQL:**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/quan_ly_hoi_dap?schema=public"
```

**PostgreSQL với SSL (Production):**

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public&sslmode=require"
```

**Supabase/Neon/Other Cloud Providers:**

```env
DATABASE_URL="postgresql://user:password@host.provider.com:5432/dbname?schema=public"
```

## Cách Prisma 7 đọc Connection String

1. **Schema.prisma** - Chỉ định nghĩa structure:

   ```prisma
   datasource db {
     provider = "postgresql"
   }
   ```

2. **PrismaClient** - Tự động đọc từ `process.env.DATABASE_URL`:

   ```typescript
   // Trong client.ts
   new PrismaClient(); // Tự động đọc DATABASE_URL từ process.env
   ```

3. **Runtime** - Prisma sẽ:
   - Đọc `process.env.DATABASE_URL` khi khởi tạo
   - Nếu không tìm thấy, sẽ throw error khi connect
   - Không cần truyền `url` trong constructor

## Scripts

- `npm run db:generate` - Generate Prisma Client từ schema
- `npm run db:push` - Push schema changes lên database (development)
- `npm run db:migrate` - Tạo migration (production)
- `npm run db:studio` - Mở Prisma Studio để xem/quản lý data

## Sử dụng Prisma Client

```typescript
import prisma from "@/infrastructure/database/prisma/client";

// Example
const users = await prisma.user.findMany();
```

## Troubleshooting

**Lỗi: "Can't reach database server"**

- Kiểm tra `DATABASE_URL` trong `.env` đã đúng chưa
- Kiểm tra PostgreSQL server đã chạy chưa
- Kiểm tra firewall/network

**Lỗi: "Environment variable not found: DATABASE_URL"**

- Đảm bảo file `.env` ở root project
- Đảm bảo `.env` có biến `DATABASE_URL`
- Restart dev server sau khi thêm/sửa `.env`

## Lưu ý

- Prisma Client được generate vào `node_modules/@prisma/client`
- Schema sử dụng PostgreSQL với UUID primary keys
- File `.env` không được commit vào git (đã có trong `.gitignore`)
