import type { Metadata } from 'next'
import Link from 'next/link'
import { Oswald } from 'next/font/google'
import { layTienDo, MaDuAn } from '@/lib/tienDo'
import { TONG_HOP_TRONG, type TongHop } from './kieu'
import BangTienDo from './BangTienDo'
import '../doi-video.css'

const tieuDe = Oswald({ subsets: ['latin', 'vietnamese'], weight: ['500', '600', '700'] })

export const metadata: Metadata = {
  title: 'Tiến Độ Đội Làm Video',
  description: 'Đội agent làm video quảng cáo đang làm tới đâu, tự cập nhật 5 giây một lần.',
  robots: { index: false, follow: false },
}

export default async function TienDo({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
  const tham = (await searchParams).duAn
  const duAn = MaDuAn.safeParse(tham)
  let duLieu: TongHop = TONG_HOP_TRONG
  let loiTai = false
  try {
    duLieu = await layTienDo(duAn.success ? duAn.data : undefined)
  } catch {
    loiTai = true
  }

  return (
    <div className="dv">
      <div className="dv-trong">
        <header className="dv-dau">
          <p className="dv-nhan-nho">
            <Link href="/doi-video" className="dv-td-lien-ket">← Về trang đội video</Link>
          </p>
          <h1 className={tieuDe.className}>Tiến độ đội làm video</h1>
          <p className="dv-mo-ta">Các agent tự báo khi nhận việc, nộp bài, bị trả về hay bị kẹt. Trang tự cập nhật khoảng 5 giây một lần.</p>
        </header>
        <BangTienDo dauVao={duLieu} loiBanDau={loiTai} lopTieuDe={tieuDe.className} />
      </div>
    </div>
  )
}
