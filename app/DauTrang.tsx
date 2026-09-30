import Link from 'next/link'
import type { ReactNode } from 'react'
import { dangXuatAction } from './actions'
import NutTongHop from './NutTongHop'
import { IconBieuDo, IconBinhLuan, IconFacebook, IconThoat, IconTikTok } from './BieuTuong'

const KENH = [
  { ma: 'facebook', ten: 'Facebook', href: '/', Icon: IconFacebook, bat: 'bg-blue-600 text-white shadow-blue-600/30' },
  { ma: 'tiktok', ten: 'TikTok', href: '/tiktok', Icon: IconTikTok, bat: 'bg-slate-900 text-white shadow-slate-900/30' },
  { ma: 'binh_luan', ten: 'Bình luận', href: '/binh-luan', Icon: IconBinhLuan, bat: 'bg-sky-600 text-white shadow-sky-600/30' },
  { ma: 'thong_ke', ten: 'Thống kê', href: '/thong-ke', Icon: IconBieuDo, bat: 'bg-emerald-600 text-white shadow-emerald-600/30' },
] as const

type Kenh = (typeof KENH)[number]['ma']

// Thanh trên cùng, dính khi cuộn: logo, chuyển giữa các trang, tổng hợp, đăng xuất
export default function DauTrang({ dangO }: { dangO: Kenh }) {
  const chuyenKenh = (
    <nav className="flex rounded-xl bg-slate-100 p-1" aria-label="Chọn nền tảng">
      {KENH.map(({ ma, ten, href, Icon, bat }) => (
        <Link
          key={ma}
          href={href}
          aria-current={ma === dangO ? 'page' : undefined}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 sm:px-4 text-sm font-bold transition sm:flex-none ${
            ma === dangO ? `${bat} shadow-md` : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Icon className="h-4 w-4" />
          <span className="max-[420px]:sr-only">{ten}</span>
        </Link>
      ))}
    </nav>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-900 text-[11px] font-black leading-none text-white shadow-md shadow-blue-600/30">
            TIN
            <br />
            TECH
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-extrabold">Tin Công Nghệ</span>
            <span className="block text-xs text-slate-500">Bảng duyệt bài</span>
          </span>
        </Link>

        <div className="order-3 w-full sm:order-none sm:mx-auto sm:w-auto">{chuyenKenh}</div>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <NutTongHop />
          <form action={dangXuatAction}>
            <button className="btn btn-nhat px-2.5" title="Đăng xuất" aria-label="Đăng xuất">
              <IconThoat className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}

// Tiêu đề từng trang: tên, mô tả ngắn, thêm nội dung bên phải (vd. tài khoản TikTok)
export function TieuDeTrang({ ten, moTa, phai }: { ten: string; moTa: string; phai?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{ten}</h1>
        <p className="mt-1 text-sm text-slate-500">{moTa}</p>
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
  ds: { ma: string; ten: string; href: string; so?: number }[]
  dangXem: string
  mauBat: string
}) {
  return (
    <nav className="mb-5 flex gap-1.5 overflow-x-auto pb-1" aria-label="Lọc bài">
      {ds.map((t) => {
        const bat = t.ma === dangXem
        return (
          <Link
            key={t.ma}
            href={t.href}
            aria-current={bat ? 'page' : undefined}
            className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
              bat ? `${mauBat} ring-transparent shadow-sm` : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
            }`}
          >
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
