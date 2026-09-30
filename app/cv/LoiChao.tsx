'use client'

import { moTroLy, useCongTy } from './congTy'

// Dòng "Kính gửi ..." ở đầu trang, chỉ hiện khi mở bằng link riêng (?cho=Tên công ty)
export function KinhGui() {
  const congTy = useCongTy()
  if (!congTy) return null
  return (
    <p className="hien-len mb-4 inline-flex max-w-full items-center gap-2 rounded-xl bg-amber-400/15 px-4 py-2 text-sm font-semibold text-amber-100 ring-1 ring-amber-300/30">
      <span aria-hidden>✉️</span>
      <span>
        Kính gửi <b className="text-amber-300">{congTy}</b>, cảm ơn anh/chị đã dành thời gian xem hồ sơ của tôi.
      </span>
    </p>
  )
}

// Bong bóng lời chào phía trên robot lớn; bấm vào để mở khung hỏi đáp
export function BongBongRobot() {
  const congTy = useCongTy()
  return (
    <button
      type="button"
      onClick={moTroLy}
      className="cv-noi relative mb-2 block w-full rounded-2xl rounded-br-sm bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-xl transition hover:bg-blue-50"
    >
      {congTy ? `Xin chào ${congTy}! 👋` : 'Xin chào! 👋'} Tôi là trợ lý AI của Trọng.
      <span className="mt-1 block text-xs font-bold text-blue-600">Hỏi tôi bất cứ điều gì về anh ấy →</span>
      <span className="absolute -bottom-2 right-10 h-4 w-4 rotate-45 bg-inherit" />
    </button>
  )
}

// Nút ở đầu trang (điện thoại không có robot lớn)
export function NutHoiRobot() {
  return (
    <button
      type="button"
      onClick={moTroLy}
      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500/20 to-blue-500/20 px-6 py-3 font-bold ring-1 ring-sky-300/50 transition hover:from-sky-500/35 hover:to-blue-500/35"
    >
      <span aria-hidden>🤖</span> Hỏi trợ lý AI
    </button>
  )
}
