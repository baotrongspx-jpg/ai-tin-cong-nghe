import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'

// Thanh bên + thanh trên nằm ở app/KhungQuanLy.tsx (dùng chung qua app/(quan-ly)/layout.tsx).
// File này giữ các mảnh dùng trong từng trang: tiêu đề, thanh lọc, hộp trống, cảnh báo.

// Tiêu đề từng trang: ô biểu tượng, tên, mô tả ngắn, thêm nội dung bên phải (vd. bộ lọc, tài khoản TikTok)
export function TieuDeTrang({
  ten,
  moTa,
  phai,
  Icon,
  mauIcon = 'from-blue-500 to-indigo-600 shadow-blue-600/30',
}: {
  ten: string
  moTa: string
  phai?: ReactNode
  Icon?: ComponentType<{ className?: string }>
  mauIcon?: string
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        {Icon && (
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${mauIcon}`}>
            <Icon className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight">{ten}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{moTa}</p>
        </div>
      </div>
      {phai}
    </div>
  )
}

// Thanh chọn trạng thái có đếm số, dạng viên thuốc
export function ThanhLoc({
  ds,
  dangXem,
  mauBat,
}: {
  ds: { ma: string; ten: string; href: string; so?: number; Icon?: ComponentType<{ className?: string }> }[]
  dangXem: string
  mauBat: string
}) {
  return (
    <nav className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label="Lọc bài">
      {ds.map((t) => {
        const bat = t.ma === dangXem
        return (
          <Link
            key={t.ma}
            href={t.href}
            aria-current={bat ? 'page' : undefined}
            className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
              bat ? `${mauBat} ring-transparent shadow-md` : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.Icon && <t.Icon className="h-4 w-4" />}
            {t.ten}
            {t.so !== undefined && (
              <span className={`rounded-full px-2 py-0.5 text-xs ${bat ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                {t.so}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

// Hộp báo khi không có bài
export function Trong({ bieuTuong, tieuDe, goiY }: { bieuTuong: string; tieuDe: string; goiY: string }) {
  return (
    <div className="the flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-3 text-5xl">{bieuTuong}</div>
      <p className="text-base font-bold">{tieuDe}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{goiY}</p>
    </div>
  )
}

// Dòng cảnh báo cấu hình / lỗi
export function CanhBao({ loai = 'vang', children }: { loai?: 'vang' | 'do'; children: ReactNode }) {
  return (
    <p
      className={`mb-4 rounded-xl p-3 text-sm ring-1 ${
        loai === 'vang' ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-red-50 text-red-700 ring-red-200'
      }`}
    >
      {children}
    </p>
  )
}
