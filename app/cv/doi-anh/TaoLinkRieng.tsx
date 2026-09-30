'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { VI_TRI } from '../duLieu'

const khongDoi = () => () => {}

// Tạo link CV riêng cho từng công ty (/cv?vt=vị trí&cho=Tên công ty): đúng bản CV theo vị trí, chào đúng tên.
// Mở trang này cũng đánh dấu máy của chủ trang: xem CV trên máy này sẽ không báo Telegram.
export default function TaoLinkRieng() {
  const [ten, setTen] = useState('')
  const [viTri, setViTri] = useState(VI_TRI[0].ma)
  const [daChep, setDaChep] = useState(false)
  const goc = useSyncExternalStore(khongDoi, () => location.origin, () => '')

  useEffect(() => {
    try {
      localStorage.setItem('cv_chu_trang', '1')
    } catch {}
  }, [])

  const thamSo = [
    viTri !== VI_TRI[0].ma && `vt=${viTri}`,
    ten.trim() && `cho=${encodeURIComponent(ten.trim()).replace(/%20/g, '+')}`,
  ].filter(Boolean)
  const link = `${goc}/cv${thamSo.length ? `?${thamSo.join('&')}` : ''}`

  async function chep() {
    try {
      await navigator.clipboard.writeText(link)
      setDaChep(true)
      setTimeout(() => setDaChep(false), 2000)
    } catch {}
  }

  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <h2 className="font-extrabold text-[#0f1b3d]">Tạo link CV riêng cho công ty</h2>
      <p className="mb-3 text-sm text-slate-500">Trang CV và robot sẽ chào đúng tên công ty. Telegram cũng báo rõ công ty nào đang xem.</p>
      <label className="label" htmlFor="vi-tri">
        Bản CV theo vị trí
      </label>
      <select id="vi-tri" value={viTri} onChange={(e) => setViTri(e.target.value)} className="input mb-3">
        {VI_TRI.map((v) => (
          <option key={v.ma} value={v.ma}>
            {v.ten}
          </option>
        ))}
      </select>
      <label className="label" htmlFor="ten-cong-ty">
        Tên công ty / người nhận
      </label>
      <input
        id="ten-cong-ty"
        value={ten}
        onChange={(e) => setTen(e.target.value)}
        maxLength={60}
        placeholder="Ví dụ: Công ty Cà phê Buôn Ma Thuột"
        className="input"
      />
      <div className="mt-3 break-all rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700 ring-1 ring-slate-200">{link}</div>
      <button type="button" onClick={chep} className="btn btn-fb mt-3 w-full">
        {daChep ? '✅ Đã chép link' : 'Chép link'}
      </button>
    </div>
  )
}
