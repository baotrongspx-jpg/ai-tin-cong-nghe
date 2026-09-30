'use client'

import { useEffect, useState } from 'react'
import RobotAI from './RobotAI'

// Robot nhỏ góc phải dưới: bấm vào mở bảng lối tắt (gọi, Zalo, tải CV, nhắn lời, lên đầu trang)
export default function TroLyRobot({ dienThoai }: { dienThoai: string }) {
  const [mo, setMo] = useState(false)
  const [hien, setHien] = useState(false)
  const so = dienThoai.replace(/\s/g, '')

  useEffect(() => {
    const kiemTra = () => setHien(window.scrollY > 400)
    kiemTra()
    window.addEventListener('scroll', kiemTra, { passive: true })
    return () => window.removeEventListener('scroll', kiemTra)
  }, [])

  useEffect(() => {
    if (!mo) return
    const dong = (e: KeyboardEvent) => e.key === 'Escape' && setMo(false)
    window.addEventListener('keydown', dong)
    return () => window.removeEventListener('keydown', dong)
  }, [mo])

  const loiTat: [string, string, string][] = [
    ['📞', `Gọi ${dienThoai}`, `tel:${so}`],
    ['💬', 'Nhắn Zalo', `https://zalo.me/${so}`],
    ['📄', 'Tải CV PDF', '/cv/ban-in'],
    ['✉️', 'Để lại lời nhắn', '#lien-he'],
    ['⬆️', 'Lên đầu trang', '#trang-chu'],
  ]

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 transition duration-300 print:hidden sm:bottom-6 sm:right-6 ${
        hien || mo ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
      }`}
    >
      {mo && (
        <div className="hien-len w-64 overflow-hidden rounded-2xl bg-white text-slate-700 shadow-2xl ring-1 ring-slate-200">
          <div className="bg-gradient-to-r from-[#0b1631] to-[#1e3a8a] px-4 py-3 text-white">
            <p className="text-sm font-bold">Xin chào! 👋</p>
            <p className="text-xs text-white/75">Tôi là trợ lý của Trọng. Anh/chị cần gì ạ?</p>
          </div>
          <ul className="p-2">
            {loiTat.map(([bieuTuong, ten, href]) => (
              <li key={ten}>
                <a
                  href={href}
                  onClick={() => setMo(false)}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noreferrer' : undefined}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-blue-50 hover:text-blue-700"
                >
                  <span className="text-base">{bieuTuong}</span>
                  {ten}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        onClick={() => setMo(!mo)}
        aria-expanded={mo}
        aria-label={mo ? 'Đóng trợ lý' : 'Mở trợ lý liên hệ nhanh'}
        className="group relative grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#0b1631] to-[#1e3a8a] shadow-xl shadow-blue-900/40 ring-2 ring-sky-400/60 transition hover:scale-105"
      >
        {!mo && <span className="absolute inset-0 animate-ping rounded-full bg-sky-400/30 motion-reduce:hidden" />}
        {mo ? (
          <span className="text-2xl font-bold text-white">×</span>
        ) : (
          <RobotAI ma="rb-nho" className="relative h-12 w-12 translate-y-0.5" />
        )}
      </button>
    </div>
  )
}
