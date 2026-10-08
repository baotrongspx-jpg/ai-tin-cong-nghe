'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { thongBao } from '@/app/ThongBao'
import { Xoay } from '@/app/BieuTuong'
import { taoVideoYouTube } from './actions'

const DS_PHUT = [3, 5, 10, 15, 20]
const boDau = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase()

// Khung tạo video mới: chọn bài (tuỳ chọn), viết ý tưởng / câu chuyện (tuỳ chọn), chọn độ dài → AI lên dàn ý
export default function TaoVideo({ bai }: { bai: { id: string; tieu_de_anh: string; nguon_ten: string }[] }) {
  const router = useRouter()
  const [yTuong, setYTuong] = useState('')
  const [phut, setPhut] = useState(10)
  const [chon, setChon] = useState<string[]>([])
  const [tim, setTim] = useState('')
  const [dangTao, startTransition] = useTransition()

  const loc = tim.trim() ? bai.filter((b) => boDau(`${b.tieu_de_anh} ${b.nguon_ten}`).includes(boDau(tim.trim()))) : bai
  const doi = (id: string) => setChon((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))

  const tao = () =>
    startTransition(async () => {
      const kq = await taoVideoYouTube({ baiIds: chon, yTuong, phut })
      if (!kq.ok) return thongBao('loi', kq.loi)
      router.push(`/youtube/${kq.id}`)
    })

  return (
    <section className="the grid min-w-0 content-start gap-5 p-5">
      <h2 className="text-base font-bold">Tạo video mới</h2>

      <label className="grid">
        <span className="label">Ý tưởng / câu chuyện (tuỳ chọn)</span>
        <textarea
          value={yTuong}
          onChange={(e) => setYTuong(e.target.value)}
          rows={5}
          maxLength={8000}
          disabled={dangTao}
          placeholder="Ví dụ: Kể câu chuyện Mèo Mun lần đầu bị lừa đảo qua tin nhắn giả ngân hàng, Robot Bit chỉ cách nhận ra và phòng tránh…"
          className="input"
        />
      </label>

      <div>
        <span className="label">Độ dài video (khoảng)</span>
        <div className="flex flex-wrap gap-2">
          {DS_PHUT.map((p) => (
            <button
              key={p}
              type="button"
              disabled={dangTao}
              onClick={() => setPhut(p)}
              className={`btn btn-sm ${phut === p ? 'bg-red-600 text-white hover:bg-red-700' : 'btn-phu'}`}
            >
              {p} phút
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          Chia thành {Math.min(8, Math.max(1, Math.round(phut / 3)))} phần, máy nhà dựng lần lượt từng phần rồi ghép. Dựng mất khoảng 3–4 lần độ dài video (video 20 phút khoảng 1–1,5 giờ).
        </p>
      </div>

      <div className="min-w-0">
        <span className="label">
          Dựa trên bài đã có (tuỳ chọn) {chon.length > 0 && <span className="text-red-600">Đã chọn {chon.length} bài</span>}
        </span>
        <input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm bài…" className="input mb-2" />
        <ul className="max-h-72 overflow-y-auto rounded-xl ring-1 ring-slate-200">
          {!loc.length && <li className="p-3 text-sm text-slate-400">Không có bài phù hợp</li>}
          {loc.map((b) => (
            <li key={b.id} className="border-b border-slate-100 last:border-0">
              <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm hover:bg-slate-50">
                <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-red-600" checked={chon.includes(b.id)} onChange={() => doi(b.id)} disabled={dangTao} />
                <span className="min-w-0">
                  <span className="line-clamp-2">{b.tieu_de_anh}</span>
                  <span className="text-xs text-slate-400">{b.nguon_ten}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-xs text-slate-400">Chọn nhiều bài để làm bản tin tổng hợp. Có thể vừa chọn bài vừa viết ý tưởng.</p>
      </div>

      <button type="button" onClick={tao} disabled={dangTao || (!chon.length && !yTuong.trim())} className="btn bg-red-600 py-3 text-white hover:bg-red-700">
        {dangTao ? (
          <>
            <Xoay /> AI đang lên dàn ý… (~1 phút)
          </>
        ) : (
          'AI lên dàn ý và viết kịch bản'
        )}
      </button>
    </section>
  )
}
