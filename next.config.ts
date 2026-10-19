import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Font vẽ ảnh chia sẻ CV được đọc bằng readFile, phải đóng gói kèm khi deploy
  outputFileTracingIncludes: {
    '/**': ['./assets/fonts/**'],
  },
  experimental: {
    // Tải ảnh đại diện CV lên (/cv/doi-anh): ảnh đã được thu nhỏ trên trình duyệt, để dư cho ảnh điện thoại
    serverActions: { bodySizeLimit: '4mb' },
  },
}

export default nextConfig
