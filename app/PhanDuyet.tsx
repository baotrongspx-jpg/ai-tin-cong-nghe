import type { ComponentType, ReactNode } from 'react'
import type { BaiViet } from '@/lib/db'
import { gio } from '@/lib/thoiGian'
import { IconBongDen, IconDongHo, IconLich, IconLienKet, IconNguoi, Xoay } from './BieuTuong'

// Các mảnh của cột phải trong thẻ bài: thông tin bài, nút quyết định, lưu ý. Dùng ở trang Facebook và TikTok.

const ngayVN = (s: string) =>
  new Date(s).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' })

export function CotPhai({ children }: { children: ReactNode }) {
  return (
    <aside className="flex flex-col gap-5 border-t border-slate-100 pt-5 md:col-span-2 xl:col-span-1 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
      {children}
    </aside>
  )
}

export function ThongTinBai({ bai }: { bai: BaiViet }) {
  let tenMien = bai.nguon_link
  try {
    tenMien = new URL(bai.nguon_link).hostname.replace(/^www\./, '')
  } catch {}
  return (
    <section>
      <h3 className="mb-3 text-sm font-bold text-slate-800">Thông tin bài viết</h3>
      <dl className="space-y-3 text-sm">
        <Dong Icon={IconNguoi} nhan="Nguồn tin">
          {bai.nguon_ten}
        </Dong>
        {bai.ngay_bao && (
          <Dong Icon={IconLich} nhan="Ngày đăng báo">
            <span suppressHydrationWarning>{ngayVN(bai.ngay_bao)}</span>
          </Dong>
        )}
        <Dong Icon={IconDongHo} nhan="AI soạn lúc">
          <span suppressHydrationWarning>{gio(bai.tao_luc)}</span>
        </Dong>
        <Dong Icon={IconLienKet} nhan="Link gốc">
          <a href={bai.nguon_link} target="_blank" rel="noreferrer" className="break-all text-blue-600 hover:underline">
            {tenMien}
          </a>
        </Dong>
      </dl>
    </section>
  )
}

function Dong({ Icon, nhan, children }: { Icon: ComponentType<{ className?: string }>; nhan: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-slate-500">{nhan}</dt>
        <dd className="font-semibold text-slate-800">{children}</dd>
      </div>
    </div>
  )
}

const MAU = {
  xanhLa: 'bg-emerald-600 text-white ring-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20',
  xanh: 'bg-white text-blue-700 ring-blue-200 hover:bg-blue-50',
  fb: 'bg-blue-600 text-white ring-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20',
  tt: 'bg-slate-900 text-white ring-slate-900 hover:bg-black shadow-md shadow-slate-900/20',
  yt: 'bg-white text-red-600 ring-red-200 hover:bg-red-50',
  caHai: 'bg-gradient-to-r from-blue-600 via-fuchsia-600 to-slate-900 text-white ring-transparent hover:brightness-110 shadow-md shadow-fuchsia-600/20',
  xam: 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50',
  do: 'bg-white text-red-600 ring-red-200 hover:bg-red-50',
} as const

// Nút lớn kiểu thẻ: biểu tượng, tên việc, mô tả ngắn. Có `href` thì là link.
export function NutQuyetDinh({
  mau,
  icon,
  ten,
  moTa,
  onClick,
  href,
  disabled,
  dangChay,
  title,
}: {
  mau: keyof typeof MAU
  icon: ReactNode
  ten: string
  moTa?: string
  onClick?: () => void
  href?: string
  disabled?: boolean
  dangChay?: boolean
  title?: string
}) {
  const lop = `flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left ring-1 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${MAU[mau]}`
  const noiDung = (
    <>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">{dangChay ? <Xoay className="h-5 w-5" /> : icon}</span>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-bold">{ten}</span>
        {moTa && <span className="mt-0.5 block text-xs opacity-75">{moTa}</span>}
      </span>
    </>
  )
  if (href)
    return (
      <a href={href} target="_blank" rel="noreferrer" className={lop} title={title}>
        {noiDung}
      </a>
    )
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={lop} title={title}>
      {noiDung}
    </button>
  )
}

export function LuuY({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl bg-blue-50/70 p-3 text-xs leading-relaxed text-slate-600 ring-1 ring-blue-100">
      <IconBongDen className="h-5 w-5 shrink-0 text-blue-500" />
      <div>
        <b className="block text-blue-700">Lưu ý</b>
        {children}
      </div>
    </div>
  )
}
