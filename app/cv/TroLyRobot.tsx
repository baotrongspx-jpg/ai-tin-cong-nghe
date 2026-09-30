'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useCongTy } from './congTy'
import RobotAI from './RobotAI'

type Luot = { vai: 'nguoi' | 'robot'; noiDung: string }

const GOI_Y = ['Anh Trọng có kinh nghiệm gì?', 'Điểm mạnh nổi bật là gì?', 'Dùng thành thạo công cụ nào?', 'Khi nào có thể đi làm?']

// Robot góc phải dưới: bấm vào mở khung hỏi đáp về Trọng (AI trả lời theo CV) + lối tắt liên hệ
export default function TroLyRobot({ dienThoai, hrefIn, viTri }: { dienThoai: string; hrefIn: string; viTri: string }) {
  const congTy = useCongTy()
  const [mo, setMo] = useState(false)
  const [hien, setHien] = useState(false)
  const [lichSu, setLichSu] = useState<Luot[]>([])
  const [cauHoi, setCauHoi] = useState('')
  const [dangHoi, setDangHoi] = useState(false)
  const khung = useRef<HTMLDivElement>(null)
  const o = useRef<HTMLInputElement>(null)
  const so = dienThoai.replace(/\s/g, '')

  useEffect(() => {
    const kiemTra = () => setHien(window.scrollY > 400)
    const moRa = () => setMo(true)
    kiemTra()
    window.addEventListener('scroll', kiemTra, { passive: true })
    window.addEventListener('mo-tro-ly', moRa)
    return () => {
      window.removeEventListener('scroll', kiemTra)
      window.removeEventListener('mo-tro-ly', moRa)
    }
  }, [])

  useEffect(() => {
    if (!mo) return
    // Điện thoại: không tự bật bàn phím che mất nội dung
    if (window.matchMedia('(min-width: 640px)').matches) o.current?.focus()
    const dong = (e: KeyboardEvent) => e.key === 'Escape' && setMo(false)
    window.addEventListener('keydown', dong)
    return () => window.removeEventListener('keydown', dong)
  }, [mo])

  useEffect(() => {
    khung.current?.scrollTo({ top: khung.current.scrollHeight, behavior: 'smooth' })
  }, [lichSu, dangHoi])

  async function hoi(noiDung: string) {
    noiDung = noiDung.trim().slice(0, 600)
    if (!noiDung || dangHoi) return
    // Gửi tối đa 5 cặp hỏi – đáp gần nhất để robot hiểu câu hỏi nối tiếp
    const moi = [...lichSu, { vai: 'nguoi', noiDung } as Luot]
    setLichSu(moi)
    setCauHoi('')
    setDangHoi(true)
    let traLoi = `Mạng đang chập chờn, anh/chị gọi hoặc nhắn Zalo ${dienThoai} giúp nhé.`
    try {
      const res = await fetch('/cv/hoi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ congTy, viTri, lichSu: moi.slice(-11) }),
      })
      traLoi = ((await res.json()) as { traLoi?: string }).traLoi ?? traLoi
    } catch {}
    setLichSu([...moi, { vai: 'robot', noiDung: traLoi }])
    setDangHoi(false)
  }

  const gui = (e: FormEvent) => {
    e.preventDefault()
    hoi(cauHoi)
  }

  const loiTat: [string, string, string][] = [
    ['📞', 'Gọi', `tel:${so}`],
    ['💬', 'Zalo', `https://zalo.me/${so}`],
    ['📄', 'CV PDF', hrefIn],
    ['✉️', 'Lời nhắn', '#lien-he'],
  ]

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 transition duration-300 print:hidden sm:bottom-6 sm:right-6 ${
        hien || mo ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
      }`}
    >
      {mo && (
        <div
          role="dialog"
          aria-label="Hỏi đáp với trợ lý AI"
          className="hien-len flex max-h-[min(34rem,calc(100dvh-7rem))] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-white text-slate-700 shadow-2xl ring-1 ring-slate-200"
        >
          <div className="flex items-center gap-3 bg-gradient-to-r from-[#0b1631] to-[#1e3a8a] px-4 py-3 text-white">
            <RobotAI ma="rb-dau" className="h-10 w-10 shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="font-bold">Trợ lý AI của Trọng</p>
              <p className="flex items-center gap-1.5 text-xs text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Trả lời ngay, dựa trên CV
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 border-b border-slate-100 px-3 py-2">
            {loiTat.map(([bieuTuong, ten, href]) => (
              <a
                key={ten}
                href={href}
                onClick={() => href.startsWith('#') && setMo(false)}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noreferrer' : undefined}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-50 py-1.5 text-xs font-semibold transition hover:bg-blue-50 hover:text-blue-700"
              >
                <span aria-hidden>{bieuTuong}</span>
                {ten}
              </a>
            ))}
          </div>

          <div ref={khung} className="min-h-40 flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-3 py-3 text-sm" aria-live="polite">
            <p className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-slate-100">
              {congTy ? `Xin chào ${congTy}! ` : 'Xin chào anh/chị! '}
              Tôi có thể trả lời nhanh về kinh nghiệm, kỹ năng và thời gian làm việc của anh Trọng. Anh/chị muốn biết điều gì ạ?
            </p>
            {lichSu.map((l, i) => (
              <p
                key={i}
                className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 ${
                  l.vai === 'nguoi'
                    ? 'ml-auto rounded-tr-sm bg-blue-600 text-white'
                    : 'rounded-tl-sm bg-white shadow-sm ring-1 ring-slate-100'
                }`}
              >
                {l.noiDung}
              </p>
            ))}
            {dangHoi && (
              <p className="flex w-16 justify-center gap-1 rounded-2xl rounded-tl-sm bg-white px-3.5 py-3.5 shadow-sm ring-1 ring-slate-100" aria-label="Đang trả lời">
                {[0, 150, 300].map((tre) => (
                  <span key={tre} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${tre}ms` }} />
                ))}
              </p>
            )}
            {!lichSu.length && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {GOI_Y.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => hoi(g)}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={gui} className="flex gap-2 border-t border-slate-100 p-2.5">
            <label className="sr-only" htmlFor="cau-hoi-robot">
              Câu hỏi
            </label>
            <input
              id="cau-hoi-robot"
              ref={o}
              value={cauHoi}
              onChange={(e) => setCauHoi(e.target.value)}
              maxLength={600}
              placeholder="Nhập câu hỏi…"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-base outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 sm:text-sm"
            />
            <button
              disabled={dangHoi || !cauHoi.trim()}
              aria-label="Gửi câu hỏi"
              className="grid w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                <path d="m22 2-9.5 9.5M22 2l-7 20-3.5-8.5L3 10z" />
              </svg>
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        onClick={() => setMo(!mo)}
        aria-expanded={mo}
        aria-label={mo ? 'Đóng trợ lý' : 'Mở trợ lý AI'}
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
