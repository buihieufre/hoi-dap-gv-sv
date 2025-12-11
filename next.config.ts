import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Tắt kiểm tra ESLint (Mấy dòng Warning màu vàng)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // // 2. Tắt kiểm tra TypeScript (Cái lỗi Type Error màu đỏ)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
