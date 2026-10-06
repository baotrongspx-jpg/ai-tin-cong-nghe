'use client'

import { useTransition } from 'react'
import { gio } from '@/lib/thoiGian'
import { timLaiXuHuong } from '@/app/actions'
import { thongBao } from '@/app/ThongBao'
import { IconLai, Xoay } from '@/app/BieuTuong'

// Khung hashtag xu hướng cuối trang TikTok. `luc` null nghĩa là đang dùng bộ dự phòng.
export default function XuHuong({ ds, luc, soThem }: { ds: string[]; luc: string | null; soThem: number }) {
  const [dangTim, startTransition] = useTransition()

  const timLai = () =>
    startTransition(async () => {
      await timLaiXuHuong()
      thongBao('ok', 'Đã tìm lại hashtag xu hướng')
    })

  return (
    <section className="the overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-pink-50 to-violet-50 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-extrabold">🔥 Hashtag xu hướng công nghệ trên TikTok</h2>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span suppressHydrationWarning>{luc ? `Tìm lúc ${gio(luc)}` : 'Chưa tìm được, đang dùng bộ mặc định'}</span>
          <button disabled={dangTim} onClick={timLai} className="btn btn-sm btn-phu">
            {dangTim ? <Xoay className="h-3.5 w-3.5" /> : <IconLai className="h-3.5 w-3.5" />}
            {dangTim ? 'Đang tìm…' : 'Tìm lại'}
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-1.5">
          {ds.map((h) => (
            <span key={h} className="chip bg-pink-50 text-pink-700">#{h}</span>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Mỗi bài tự thêm {soThem} hashtag đầu danh sách (bỏ cái trùng với hashtag của bài). Gemini tìm trên Google mỗi
          ngày một lần, chỉ là ước lượng vì TikTok không công bố danh sách chính thức.
        </p>
      </div>
    </section>
  )
}
