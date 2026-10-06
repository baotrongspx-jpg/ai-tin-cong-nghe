'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { IconLich } from './BieuTuong'

const DS_KHOANG = [
  { ma: '', ten: 'Mọi lúc' },
  { ma: 'hom_nay', ten: 'Hôm nay' },
  { ma: '7', ten: '7 ngày qua' },
  { ma: '30', ten: '30 ngày qua' },
]

// Lọc bài theo ngày AI soạn (giữ thẻ đang xem và từ khóa tìm kiếm)
export default function ChonKhoang({ khoang }: { khoang: string }) {
  const router = useRouter()
  const duong = usePathname()
  const tham = useSearchParams()

  const doi = (ma: string) => {
    const p = new URLSearchParams(tham.toString())
    p.delete('n')
    if (ma) p.set('ngay', ma)
    else p.delete('ngay')
    router.push(p.size ? `${duong}?${p}` : duong)
  }

  return (
    <label className="relative flex items-center">
      <IconLich className="pointer-events-none absolute left-3 h-4 w-4 text-slate-500" />
      <span className="sr-only">Thời gian soạn bài</span>
      <select
        value={khoang}
        onChange={(e) => doi(e.target.value)}
        className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:bg-slate-50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      >
        {DS_KHOANG.map((k) => (
          <option key={k.ma} value={k.ma}>
            {k.ten}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  )
}
