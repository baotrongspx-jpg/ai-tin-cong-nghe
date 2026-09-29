'use client'

import { useState, useTransition } from 'react'
import { tongHopNgay } from './actions'

export default function NutTongHop() {
  const [dangChay, startTransition] = useTransition()
  const [thongBao, setThongBao] = useState<string | null>(null)

  const chay = () =>
    startTransition(async () => {
      setThongBao(null)
      const kq = await tongHopNgay()
      if ('loi' in kq && typeof kq.loi === 'string') setThongBao(`Lỗi: ${kq.loi}`)
      else if ('daViet' in kq)
        setThongBao(
          kq.soTin === 0
            ? 'Không có tin mới trong 24 giờ qua.'
            : `Đã soạn ${kq.daViet}/${kq.daChon} bài từ ${kq.soTin} tin mới.` +
                (kq.loi.length ? ` ${kq.loi.length} bài lỗi.` : ''),
        )
    })

  return (
    <div className="flex flex-col items-end">
      <button onClick={chay} disabled={dangChay} className="btn bg-blue-600 text-white hover:bg-blue-700">
        {dangChay ? 'AI đang đọc tin… (1–3 phút)' : '✨ Tổng hợp ngay'}
      </button>
      {thongBao && <p className="mt-1 max-w-xs text-right text-xs text-slate-600">{thongBao}</p>}
    </div>
  )
}
