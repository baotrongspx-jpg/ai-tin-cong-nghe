import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Font vẽ ảnh được đọc bằng readFile, phải đóng gói kèm khi deploy (route ảnh, lịch tự đăng, nút Đăng)
  outputFileTracingIncludes: {
    '/**': ['./assets/fonts/**'],
  },
}

export default nextConfig
