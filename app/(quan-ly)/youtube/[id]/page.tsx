import { notFound, redirect } from 'next/navigation'
import { daDangNhap } from '@/lib/xacThuc'
import { mayNhaTat } from '@/lib/giongDoc'
import { docDuAn, trangThaiDuAn } from '@/lib/youtube'
import ChiTiet from './ChiTiet'

// AI viết lời thoại từng phần trong Server Action, cần thời gian dài
export const maxDuration = 300

export default async function VideoYouTube({ params }: PageProps<'/youtube/[id]'>) {
  if (!(await daDangNhap())) redirect('/dang-nhap')
  const { id } = await params
  const d = await docDuAn(id)
  if (!d) notFound()
  const tt = await trangThaiDuAn(d, await mayNhaTat().catch(() => 'Không kiểm tra được máy nhà'))
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
      <ChiTiet key={d.id} dau={d} ttDau={tt} />
    </main>
  )
}
