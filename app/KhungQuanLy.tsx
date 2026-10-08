'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import type { Tab } from '@/lib/locBai'
import { dangXuatAction } from './actions'
import NutTongHop from './NutTongHop'
import {
  IconAn,
  IconBieuDo,
  IconBinhLuan,
  IconBo,
  IconBoQua,
  IconCanhBao,
  IconDongHo,
  IconHop,
  IconMenu,
  IconTep,
  IconThoat,
  IconTikTok,
  IconYouTube,
  IconTimKiem,
  IconXongTron,
} from './BieuTuong'

type Muc = { href: string; ten: string; Icon: ComponentType<{ className?: string }>; so?: number | null; bat: boolean; noiBat?: boolean }

// Thanh bên (trái) + thanh trên của các trang quản lý. Màn hình nhỏ: thanh bên thành ngăn kéo mở bằng nút ☰.
export default function KhungQuanLy({
  dem,
  chuaTikTok,
  tenTrang,
  children,
}: {
  dem: Record<Tab, number> | null
  chuaTikTok: number | null
  tenTrang: string
  children: ReactNode
}) {
  const duong = usePathname()
  const tham = useSearchParams()
  const [mo, setMo] = useState(false)
  const tt = duong === '/' ? (tham.get('tt') ?? 'nhap') : null

  const muc = (ma: Tab, ten: string, Icon: Muc['Icon'], noiBat = false): Muc => ({
    href: ma === 'nhap' ? '/' : `/?tt=${ma}`,
    ten,
    Icon,
    so: dem?.[ma],
    bat: tt === ma,
    noiBat,
  })
  const nhomDuyet: Muc[] = [
    muc('nhap', 'Chờ duyệt', IconHop, true),
    muc('hen_gio', 'Hẹn giờ', IconDongHo),
    muc('da_dang', 'Đã đăng', IconXongTron),
    muc('bo_qua', 'Bỏ qua', IconBoQua),
    muc('loi', 'Lỗi', IconCanhBao),
    muc('an', 'Không hiển thị', IconAn),
  ]
  const nhomKenh: Muc[] = [
    { href: '/tiktok', ten: 'TikTok', Icon: IconTikTok, so: chuaTikTok, bat: duong.startsWith('/tiktok') },
    { href: '/youtube', ten: 'YouTube', Icon: IconYouTube, bat: duong.startsWith('/youtube') },
    { href: '/binh-luan', ten: 'Bình luận', Icon: IconBinhLuan, bat: duong.startsWith('/binh-luan') },
    { href: '/thong-ke', ten: 'Thống kê', Icon: IconBieuDo, bat: duong.startsWith('/thong-ke') },
    { href: '/cv/doi-anh', ten: 'Trang CV', Icon: IconTep, bat: false },
  ]

  // Đổi trang thì đóng ngăn kéo (màn hình nhỏ)
  const [duongTruoc, setDuongTruoc] = useState(duong)
  if (duongTruoc !== duong) {
    setDuongTruoc(duong)
    setMo(false)
  }

  const thanhBen = (
    <div className="flex h-full flex-col bg-[#0a1a4a] bg-[radial-gradient(600px_400px_at_0%_100%,rgba(59,130,246,0.25),transparent_60%)] text-blue-100/80">
      <Link href="/" className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 text-[11px] font-black leading-none text-white shadow-lg shadow-blue-900/40">
          TIN
          <br />
          TECH
        </span>
        <span className="leading-tight">
          <span className="block font-extrabold text-white">{tenTrang}</span>
          <span className="block text-xs text-blue-200/70">Bảng duyệt bài</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label="Điều hướng">
        <NhomMuc ten="Duyệt bài Facebook" ds={nhomDuyet} />
        <NhomMuc ten="Kênh & công cụ" ds={nhomKenh} />
      </nav>

      <div className="space-y-3 p-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/40 to-indigo-600/20 p-4 ring-1 ring-white/10">
          <div className="text-2xl" aria-hidden>
            🚀
          </div>
          <p className="mt-1 text-xs leading-relaxed text-blue-100/90">AI tự tổng hợp tin 3 lần mỗi ngày. Công nghệ kết nối cuộc sống tốt hơn.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-2.5 ring-1 ring-white/10">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-xs font-bold text-white">
            QT
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold text-white">Quản trị viên</span>
            <span className="block truncate text-xs text-blue-200/60">{tenTrang}</span>
          </span>
          <form action={dangXuatAction}>
            <button className="rounded-lg p-2 text-blue-200/70 transition hover:bg-white/10 hover:text-white" title="Đăng xuất" aria-label="Đăng xuất">
              <IconThoat className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* Thanh bên cố định (màn hình lớn) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{thanhBen}</aside>

      {/* Ngăn kéo (màn hình nhỏ) */}
      {mo && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/50" onClick={() => setMo(false)} aria-label="Đóng menu" />
          <aside className="hien-len absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl">
            {thanhBen}
            <button onClick={() => setMo(false)} className="absolute right-3 top-5 text-blue-100/70 hover:text-white" aria-label="Đóng menu">
              <IconBo className="h-5 w-5" />
            </button>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
            <button onClick={() => setMo(true)} className="btn btn-nhat px-2.5 lg:hidden" aria-label="Mở menu">
              <IconMenu className="h-5 w-5" />
            </button>
            <OTimKiem />
            <div className="ml-auto flex items-center gap-3">
              <NutTongHop />
              <span className="hidden items-center gap-2.5 whitespace-nowrap border-l border-slate-200 pl-3 xl:flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-xs font-bold text-white">
                  QT
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-semibold">Quản trị viên</span>
                  <span className="block text-xs text-slate-500">Đã đăng nhập</span>
                </span>
              </span>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}

function NhomMuc({ ten, ds }: { ten: string; ds: Muc[] }) {
  return (
    <div>
      <div className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-blue-200/40">{ten}</div>
      <ul className="space-y-0.5">
        {ds.map(({ href, ten, Icon, so, bat, noiBat }) => (
          <li key={href}>
            <Link
              href={href}
              prefetch={true}
              aria-current={bat ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                bat ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/40' : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1">{ten}</span>
              {so != null && so > 0 && (
                <span
                  className={`min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-bold ${
                    bat ? 'bg-white/20 text-white' : noiBat ? 'bg-blue-500 text-white' : 'bg-white/10 text-blue-100/80'
                  }`}
                >
                  {so}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Ô tìm kiếm: tìm theo tiêu đề, nội dung, nguồn. Ở trang TikTok thì tìm trong bài TikTok, chỗ khác tìm ở trang duyệt bài.
// Ctrl + K để nhảy vào ô.
function OTimKiem() {
  const router = useRouter()
  const duong = usePathname()
  const tham = useSearchParams()
  const o = useRef<HTMLInputElement>(null)
  const goc = duong.startsWith('/tiktok') ? '/tiktok' : '/'
  const [tu, setTu] = useState(duong === goc ? (tham.get('q') ?? '') : '')

  // Chuyển trang thì ô hiện đúng từ khóa của trang mới
  const [khoaTruoc, setKhoaTruoc] = useState(`${duong}?${tham.get('q') ?? ''}`)
  if (khoaTruoc !== `${duong}?${tham.get('q') ?? ''}`) {
    setKhoaTruoc(`${duong}?${tham.get('q') ?? ''}`)
    setTu(duong === goc ? (tham.get('q') ?? '') : '')
  }

  useEffect(() => {
    const phim = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        o.current?.focus()
        o.current?.select()
      }
    }
    window.addEventListener('keydown', phim)
    return () => window.removeEventListener('keydown', phim)
  }, [])

  const tim = (chu: string) => {
    // Giữ thẻ đang xem và bộ lọc ngày; đổi từ khóa thì về trang đầu
    const p = new URLSearchParams(duong === goc ? tham.toString() : '')
    p.delete('n')
    if (chu.trim()) p.set('q', chu.trim())
    else p.delete('q')
    router.push(p.size ? `${goc}?${p}` : goc)
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        tim(tu)
      }}
      className="relative w-full max-w-md"
    >
      <IconTimKiem className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={o}
        type="search"
        value={tu}
        onChange={(e) => {
          setTu(e.target.value)
          if (!e.target.value) tim('')
        }}
        placeholder="Tìm bài viết, tiêu đề, nguồn…"
        aria-label="Tìm kiếm bài viết"
        className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-20 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-400 sm:block">
        Ctrl + K
      </kbd>
    </form>
  )
}
