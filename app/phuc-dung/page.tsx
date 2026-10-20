import type { Metadata } from 'next'
import { daDangNhap } from '@/lib/xacThuc'
import CongCu from './CongCu'
import FormDangNhap from './FormDangNhap'

export const metadata: Metadata = { title: 'Phục dựng video – Veo 3', robots: { index: false, follow: false } }

// Video được xử lý ngay trên trình duyệt (không tải lên máy chủ); chỉ ảnh thu nhỏ được gửi cho AI khi bấm "AI viết".
export default async function TrangPhucDung() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">{(await daDangNhap()) ? <CongCu /> : <FormDangNhap />}</main>
  )
}
