import Link from 'next/link'
import type { ReactNode } from 'react'
import { dangXuatAction } from './actions'
import NutTongHop from './NutTongHop'

const KENH = [
  { ma: 'facebook', ten: 'Facebook', href: '/', mau: 'bg-blue-600' },
  { ma: 'tiktok', ten: 'TikTok', href: '/tiktok', mau: 'bg-slate-900' },
] as const

// Đầu trang chung: chuyển giữa trang đăng Facebook và trang đăng TikTok
export default function DauTrang({ dangO, moTa, them }: { dangO: 'facebook' | 'tiktok'; moTa: string; them?: ReactNode }) {
  return (
    <header className="mb-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Duyệt bài tin công nghệ</h1>
          <p className="text-sm text-slate-500">{moTa}</p>
        </div>
        <div className="flex items-start gap-2">
          <NutTongHop />
          <form action={dangXuatAction}>
            <button className="btn bg-white text-slate-600 hover:bg-slate-50">Đăng xuất</button>
          </form>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-1 rounded-xl bg-white p-1 shadow-sm">
          {KENH.map((k) => (
            <Link
              key={k.ma}
              href={k.href}
              className={`rounded-lg px-5 py-2 text-sm font-bold ${
                k.ma === dangO ? `${k.mau} text-white` : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {k.ten}
            </Link>
          ))}
        </nav>
        {them}
      </div>
    </header>
  )
}
