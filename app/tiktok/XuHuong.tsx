'use client'

import { useTransition } from 'react'
import { timLaiXuHuong } from '../actions'

const gio = (s: string) =>
  new Date(s).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })

// Dải hashtag xu hướng trên trang TikTok. `luc` null nghĩa là đang dùng bộ dự phòng.
export default function XuHuong({ ds, luc, soThem }: { ds: string[]; luc: string | null; soThem: number }) {
  const [dangTim, startTransition] = useTransition()

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">🔥 Hashtag xu hướng công nghệ trên TikTok</h2>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {luc ? `Tìm lúc ${gio(luc)}` : 'Chưa tìm được, đang dùng bộ mặc định'}
          <button
            disabled={dangTim}
            onClick={() => startTransition(async () => void (await timLaiXuHuong()))}
            className="btn bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            {dangTim ? 'Đang tìm…' : 'Tìm lại'}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ds.map((h) => (
          <span key={h} className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-semibold text-pink-700">
            #{h}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Mỗi bài tự thêm {soThem} hashtag đầu danh sách (bỏ cái trùng với hashtag của bài). Gemini tìm trên
        Google mỗi ngày một lần, chỉ là ước lượng vì TikTok không công bố danh sách chính thức.
      </p>
    </section>
  )
}
