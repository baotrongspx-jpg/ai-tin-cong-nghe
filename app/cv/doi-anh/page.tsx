import type { Metadata } from 'next'
import { ANH_MAC_DINH, diaChiAnhCV } from '@/lib/anhCV'
import { daDangNhap } from '@/lib/xacThuc'
import FormDangNhap from './FormDangNhap'
import FormDoiAnh from './FormDoiAnh'
import TaoLinkRieng from './TaoLinkRieng'

export const metadata: Metadata = { title: 'Đổi ảnh đại diện CV', robots: { index: false, follow: false } }

// Chỉ chủ trang (mật khẩu quản trị) mới đổi được ảnh
export default async function TrangDoiAnh() {
  const vao = await daDangNhap()
  const anh = vao ? await diaChiAnhCV() : ''

  return (
    <main className="flex min-h-screen items-start justify-center bg-slate-100 p-4 sm:items-center">
      <div className="the hien-len w-full max-w-md p-6 sm:p-8">
        <h1 className="text-xl font-extrabold text-[#0f1b3d]">Đổi ảnh đại diện CV</h1>
        <p className="mb-6 text-sm text-slate-500">Ảnh hiện ở đầu trang CV cá nhân (/cv).</p>
        {vao ? <FormDoiAnh anhHienTai={anh} laMacDinh={anh === ANH_MAC_DINH} /> : <FormDangNhap />}
        {vao && <TaoLinkRieng />}
      </div>
    </main>
  )
}
