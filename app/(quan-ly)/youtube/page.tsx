import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { daDangNhap } from '@/lib/xacThuc'
import { dsDuAn, uocGiay } from '@/lib/youtube'
import { truoc } from '@/lib/thoiGian'
import { TieuDeTrang } from '@/app/DauTrang'
import { IconYouTube } from '@/app/BieuTuong'
import TaoVideo from './TaoVideo'

// AI viết dàn ý trong Server Action, cần thời gian dài
export const maxDuration = 300

const phutGiay = (giay: number) => `${Math.floor(giay / 60)}:${String(Math.round(giay % 60)).padStart(2, '0')}`

export default async function TrangYouTube() {
  if (!(await daDangNhap())) redirect('/dang-nhap')
  const [duAn, { data: bai }] = await Promise.all([
    dsDuAn(),
    db().from('bai_viet').select('id, tieu_de_anh, nguon_ten, tao_luc').in('trang_thai', ['nhap', 'da_dang']).order('tao_luc', { ascending: false }).limit(80),
  ])

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <TieuDeTrang
        ten="Video YouTube"
        moTa="Video hoạt hình Mèo Mun & Robot Bit khung ngang 16:9, dài tới 20 phút. AI viết kịch bản, máy nhà đọc giọng và dựng hình."
        Icon={IconYouTube}
        mauIcon="from-red-500 to-red-700 shadow-red-600/30"
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <TaoVideo bai={(bai ?? []) as { id: string; tieu_de_anh: string; nguon_ten: string; tao_luc: string }[]} />
        <section className="min-w-0">
          <h2 className="mb-3 text-sm font-bold text-slate-700">Video đã tạo</h2>
          {!duAn.length && <p className="the p-6 text-center text-sm text-slate-500">Chưa có video nào. Tạo video đầu tiên ở khung bên trái.</p>}
          <ul className="grid gap-3">
            {duAn.map((d) => {
              const daViet = d.phan.filter((p) => p.loi).length
              const giay = d.phan.reduce((t, p) => t + uocGiay(p.loi), 0)
              return (
                <li key={d.id}>
                  <Link href={`/youtube/${d.id}`} className="the block p-4 transition hover:ring-red-300">
                    {d.loai === 'tieu_su' && <span className="chip mb-1 bg-violet-100 text-violet-700">🎬 Phim tiểu sử · {d.phim?.ten}</span>}
                    <p className="line-clamp-2 font-bold leading-snug">{d.tieu_de}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                      <span suppressHydrationWarning>{truoc(d.tao_luc)}</span>
                      <span>{d.phan.length ? `${d.phan.length} ${d.loai === 'tieu_su' ? 'chương' : 'phần'}` : 'Đang chuẩn bị'}</span>
                      <span>{daViet < d.phan.length ? `AI đã viết ${daViet}/${d.phan.length} phần` : `~${phutGiay(giay)} phút`}</span>
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </main>
  )
}
