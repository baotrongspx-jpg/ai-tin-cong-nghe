'use client'

import { useActionState } from 'react'
import { guiLienHe } from './actions'

const O = 'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-blue-400 focus:bg-white/10'

export default function FormLienHe() {
  const [kq, gui, dangGui] = useActionState(guiLienHe, null)

  if (kq?.ok)
    return (
      <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-2xl bg-white/5 p-8 text-center ring-1 ring-white/10">
        <div className="mb-3 text-5xl">✅</div>
        <p className="text-lg font-bold text-white">{kq.thongBao}</p>
      </div>
    )

  return (
    <form action={gui} className="space-y-3 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 sm:p-7">
      {/* Bẫy máy spam: người thật không thấy ô này */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="sr-only">Họ tên</span>
          <input name="ten" required maxLength={80} placeholder="Họ tên / Công ty *" className={O} />
        </label>
        <label className="block">
          <span className="sr-only">Số điện thoại hoặc email</span>
          <input name="lien_he" required maxLength={80} placeholder="Số điện thoại / Email *" className={O} />
        </label>
      </div>
      <label className="block">
        <span className="sr-only">Lời nhắn</span>
        <textarea name="noi_dung" rows={4} maxLength={1500} placeholder="Lời nhắn (vị trí, thời gian phỏng vấn...)" className={`${O} resize-none`} />
      </label>
      {kq && !kq.ok && <p className="text-sm font-medium text-red-300">{kq.thongBao}</p>}
      <button
        disabled={dangGui}
        className="w-full rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white transition hover:bg-blue-500 disabled:opacity-60"
      >
        {dangGui ? 'Đang gửi…' : 'Gửi lời nhắn'}
      </button>
    </form>
  )
}
