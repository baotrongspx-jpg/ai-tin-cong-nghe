'use client'

import { useState, useTransition } from 'react'
import { gio } from '@/lib/thoiGian'
import { henGio, huyHen, type NoiHen, type SuaBai } from './actions'
import { thongBao } from './ThongBao'
import { IconBo, IconFacebook, IconTikTok, Xoay } from './BieuTuong'

const TEN_NOI: Record<NoiHen, string> = { ca_hai: 'Facebook + TikTok', fb: 'Chỉ Facebook', tt: 'Chỉ TikTok' }

// Định dạng cho ô datetime-local theo giờ máy người dùng: "2026-09-30T20:00"
const choO = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// Lần tới của `h` giờ: hôm nay nếu còn cách ít nhất 15 phút, không thì ngày mai
const lanToi = (h: number) => {
  const d = new Date()
  d.setHours(h, 0, 0, 0)
  if (d.getTime() - Date.now() < 15 * 60_000) d.setDate(d.getDate() + 1)
  return d
}

export default function KhungHenGio({
  baiId,
  sua,
  noiDuocHen,
  henFb,
  henTikTok,
  gioVang,
}: {
  baiId: string
  sua: SuaBai
  // Nơi còn hẹn được: bài chờ duyệt thì Facebook / TikTok / cả hai, bài đã lên Facebook thì chỉ TikTok. Rỗng: ẩn nút.
  noiDuocHen: NoiHen[]
  henFb: string | null
  henTikTok: string | null
  gioVang: { gio: number[]; tuSoLieu: boolean }
}) {
  const [mo, setMo] = useState(false)
  // Mặc định giờ vàng gần nhất
  const [luc, setLuc] = useState(() =>
    choO(new Date(Math.min(...(gioVang.gio.length ? gioVang.gio : [20]).map((h) => lanToi(h).getTime())))),
  )
  const [noi, setNoi] = useState<NoiHen>(noiDuocHen[0] ?? 'fb')
  const [toiThieu] = useState(() => choO(new Date(Date.now() + 10 * 60_000)))
  const [dangLam, startTransition] = useTransition()

  const chay = (viec: () => Promise<{ ok: boolean; loi?: string }>, xong: string) =>
    startTransition(async () => {
      const kq = await viec()
      thongBao(kq.ok ? 'ok' : 'loi', kq.ok ? xong : (kq.loi ?? 'Có lỗi'))
      if (kq.ok) setMo(false)
    })

  if (henFb || henTikTok) {
    return (
      <div className="space-y-2 rounded-xl bg-violet-50 p-3 ring-1 ring-violet-200">
        {henFb && (
          <DongHen icon={<IconFacebook className="h-4 w-4 text-blue-600" />} chu={`Facebook tự đăng lúc ${gio(henFb)}`}>
            <button
              disabled={dangLam}
              onClick={() => {
                if (confirm('Hủy hẹn giờ Facebook? Bài sẽ về lại Chờ duyệt.')) chay(() => huyHen(baiId, 'fb'), 'Đã hủy hẹn Facebook')
              }}
              className="btn btn-sm btn-nhat"
            >
              <IconBo className="h-3.5 w-3.5" /> Hủy
            </button>
          </DongHen>
        )}
        {henTikTok && (
          <DongHen icon={<IconTikTok className="h-4 w-4" />} chu={`TikTok đăng lúc ${gio(henTikTok)} (có thể trễ khoảng 10 phút)`}>
            <button
              disabled={dangLam}
              onClick={() => chay(() => huyHen(baiId, 'tt'), 'Đã hủy hẹn TikTok')}
              className="btn btn-sm btn-nhat"
            >
              <IconBo className="h-3.5 w-3.5" /> Hủy
            </button>
          </DongHen>
        )}
      </div>
    )
  }

  if (!noiDuocHen.length) return null
  if (!mo)
    return (
      <button onClick={() => setMo(true)} className="btn btn-phu self-start">
        ⏰ {noiDuocHen.length === 1 && noiDuocHen[0] === 'tt' ? 'Hẹn giờ đăng TikTok' : 'Hẹn giờ đăng'}
      </button>
    )

  return (
    <div className="hien-len space-y-3 rounded-xl bg-violet-50 p-3.5 ring-1 ring-violet-200">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-violet-900">⏰ Hẹn giờ đăng</span>
        <button onClick={() => setMo(false)} className="text-violet-400 hover:text-violet-700" aria-label="Đóng">
          <IconBo className="h-4 w-4" />
        </button>
      </div>

      <div>
        <div className="mb-1.5 text-xs font-semibold text-violet-800">
          {gioVang.tuSoLieu ? '🌟 Giờ vàng của trang (bài đăng giờ này nhiều tương tác nhất)' : '🌟 Giờ thường đông người xem'}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[...gioVang.gio].sort((a, b) => lanToi(a).getTime() - lanToi(b).getTime()).map((h) => {
            const d = lanToi(h)
            const chon = choO(d) === luc
            return (
              <button
                key={h}
                type="button"
                onClick={() => setLuc(choO(d))}
                className={`chip py-1 ring-1 ${chon ? 'bg-violet-600 text-white ring-violet-600' : 'bg-white text-violet-700 ring-violet-200 hover:bg-violet-100'}`}
              >
                {d.getDate() !== new Date().getDate() ? 'Mai ' : 'Hôm nay '}
                {h}:00
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="datetime-local"
          aria-label="Giờ đăng"
          className="input"
          value={luc}
          min={toiThieu}
          onChange={(e) => setLuc(e.target.value)}
        />
        <select aria-label="Đăng lên" className="input sm:w-auto" value={noi} onChange={(e) => setNoi(e.target.value as NoiHen)}>
          {noiDuocHen.map((n) => (
            <option key={n} value={n}>
              {TEN_NOI[n]}
            </option>
          ))}
        </select>
        <button
          disabled={dangLam || !luc}
          onClick={() => chay(() => henGio(baiId, sua, noi, new Date(luc).toISOString()), `Đã hẹn đăng lúc ${gio(new Date(luc).toISOString())}`)}
          className="btn bg-violet-600 text-white hover:bg-violet-700"
        >
          {dangLam && <Xoay />} Xác nhận
        </button>
      </div>
      <p className="text-xs text-violet-700/70">
        Facebook tự đăng đúng giờ (hẹn từ 10 phút đến 30 ngày tới). TikTok được đăng trong vòng khoảng 10 phút sau giờ hẹn.
      </p>
    </div>
  )
}

function DongHen({ icon, chu, children }: { icon: React.ReactNode; chu: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm text-violet-900">
      {icon}
      <span className="flex-1 font-medium" suppressHydrationWarning>
        ⏰ {chu}
      </span>
      {children}
    </div>
  )
}
