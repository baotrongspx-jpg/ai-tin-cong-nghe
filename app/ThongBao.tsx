'use client'

import { useEffect, useState } from 'react'
import { IconBo, IconXong } from './BieuTuong'

type Muc = { id: number; loai: 'ok' | 'loi'; chu: string }

// Gọi từ bất kỳ đâu phía trình duyệt: thongBao('ok', 'Đã lưu')
export function thongBao(loai: Muc['loai'], chu: string) {
  window.dispatchEvent(new CustomEvent('thong-bao', { detail: { loai, chu } }))
}

// Khung hiện thông báo nổi ở góc dưới, tự ẩn sau vài giây (lỗi để lâu hơn)
export default function KhungThongBao() {
  const [ds, setDs] = useState<Muc[]>([])

  useEffect(() => {
    let id = 0
    const nghe = (e: Event) => {
      const { loai, chu } = (e as CustomEvent<Omit<Muc, 'id'>>).detail
      const muc = { id: ++id, loai, chu }
      setDs((cu) => [...cu.slice(-3), muc])
      setTimeout(() => setDs((cu) => cu.filter((m) => m.id !== muc.id)), loai === 'loi' ? 9000 : 3500)
    }
    window.addEventListener('thong-bao', nghe)
    return () => window.removeEventListener('thong-bao', nghe)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96">
      {ds.map((m) => (
        <div
          key={m.id}
          role="status"
          className={`hien-len pointer-events-auto flex w-full items-start gap-3 rounded-2xl p-3.5 text-sm shadow-lg ring-1 ${
            m.loai === 'ok' ? 'bg-white text-slate-800 ring-slate-200' : 'bg-red-50 text-red-800 ring-red-200'
          }`}
        >
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              m.loai === 'ok' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {m.loai === 'ok' ? <IconXong className="h-3 w-3" /> : <span className="text-xs font-bold">!</span>}
          </span>
          <span className="min-w-0 flex-1 break-words">{m.chu}</span>
          <button
            onClick={() => setDs((cu) => cu.filter((x) => x.id !== m.id))}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Đóng"
          >
            <IconBo className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
