import type { Metadata } from 'next'
import Link from 'next/link'
import { daDangNhap } from '@/lib/xacThuc'
import FormDangNhap from './FormDangNhap'
import FormGuiAnh from './FormGuiAnh'

export const metadata: Metadata = { title: 'Gửi Ảnh Cho Đội', robots: { index: false, follow: false } }

// Chủ gửi ảnh sản phẩm và đơn hàng cho đội video. Chỉ người có mật khẩu quản trị mới gửi được.
export default async function TrangGuiAnh() {
  const vao = await daDangNhap()
  return (
    <main className="flex min-h-screen items-start justify-center bg-slate-100 p-4 sm:items-center">
      <div className="the hien-len w-full max-w-lg p-6 sm:p-8">
        <h1 className="text-xl font-extrabold text-[#0f1b3d]">Gửi ảnh sản phẩm cho đội</h1>
        <p className="mb-6 text-sm text-slate-500">
          Đội sẽ viết bộ câu lệnh để bạn tạo từng đoạn 10 giây trên Gemini.{' '}
          <Link href="/doi-video/tien-do" className="font-semibold text-blue-600 underline">
            Xem tiến độ
          </Link>
        </p>
        {vao ? <FormGuiAnh /> : <FormDangNhap />}
      </div>
    </main>
  )
}
