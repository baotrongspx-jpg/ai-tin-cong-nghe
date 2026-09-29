import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Font vẽ ảnh được đọc bằng readFile, phải đóng gói kèm route ảnh khi deploy
  outputFileTracingIncludes: {
    '/anh/[id]': ['./assets/fonts/**'],
  },
}

export default nextConfig
