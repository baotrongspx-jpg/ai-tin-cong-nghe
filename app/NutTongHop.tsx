'use client'

import { useTransition } from 'react'
import { tongHopNgay } from './actions'
import { thongBao } from './ThongBao'
import { IconSao, Xoay } from './BieuTuong'

export default function NutTongHop() {
  const [dangChay, startTransition] = useTransition()

  const chay = () =>
    startTransition(async () => {
      const kq = await tongHopNgay()
      if ('loi' in kq && typeof kq.loi === 'string') return thongBao('loi', `Tổng hợp lỗi: ${kq.loi}`)
      if (!('daViet' in kq)) return
      if (kq.soTin === 0) return thongBao('ok', 'Không có tin mới trong 24 giờ qua.')
      thongBao(
        kq.loi.length && !kq.daViet ? 'loi' : 'ok',
        `Đã soạn ${kq.daViet}/${kq.daChon} bài từ ${kq.soTin} tin mới.` +
          (kq.daDang || kq.daDangTikTok ? ` Đã đăng ${kq.daDang} Facebook, ${kq.daDangTikTok} TikTok.` : '') +
          (kq.loi.length ? ` ${kq.loi.length} lỗi.` : ''),
      )
    })

  return (
    <button
      onClick={chay}
      disabled={dangChay}
      title="AI đọc tin mới và soạn bài chờ duyệt"
      className="btn bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md shadow-violet-600/25 hover:brightness-110"
    >
      {dangChay ? <Xoay /> : <IconSao />}
      <span className="hidden sm:inline">{dangChay ? 'AI đang soạn… (1–3 phút)' : 'Tổng hợp ngay'}</span>
      <span className="sm:hidden">{dangChay ? 'Đang soạn…' : 'Tổng hợp'}</span>
    </button>
  )
}
