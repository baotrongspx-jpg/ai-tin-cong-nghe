'use client'

import { useEffect, useState, type ReactNode } from 'react'

// Thanh điều hướng: mục đang xem được tô sáng + thanh tiến độ cuộn ở mép dưới
export default function MenuCV({ menu, logo, nut }: { menu: string[][]; logo: ReactNode; nut: ReactNode }) {
  const [dangXem, setDangXem] = useState(menu[0][1])
  const [tienDo, setTienDo] = useState(0)

  useEffect(() => {
    const capNhat = () => {
      const h = document.documentElement
      const cuon = h.scrollHeight - h.clientHeight
      setTienDo(cuon > 0 ? h.scrollTop / cuon : 0)
      // Mục cuối cùng có đầu mục đã qua 1/3 màn hình là mục đang xem
      let hienTai = menu[0][1]
      for (const [, href] of menu) {
        const el = document.querySelector(href)
        if (el && el.getBoundingClientRect().top < window.innerHeight / 3) hienTai = href
      }
      if (cuon > 0 && h.scrollTop >= cuon - 4) hienTai = menu[menu.length - 1][1]
      setDangXem(hienTai)
    }
    capNhat()
    window.addEventListener('scroll', capNhat, { passive: true })
    window.addEventListener('resize', capNhat)
    return () => {
      window.removeEventListener('scroll', capNhat)
      window.removeEventListener('resize', capNhat)
    }
  }, [menu])

  return (
    <header className="sticky top-0 z-30 bg-[#0b1631]/95 text-white backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        {logo}
        <nav className="ml-auto hidden items-center gap-1 xl:flex">
          {menu.map(([ten, href]) => (
            <a
              key={href}
              href={href}
              aria-current={dangXem === href ? 'location' : undefined}
              className={`relative whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-white/10 hover:text-white ${
                dangXem === href ? 'text-white' : 'text-white/65'
              }`}
            >
              {ten}
              <span
                className={`absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-transform duration-300 ${
                  dangXem === href ? 'scale-x-100' : 'scale-x-0'
                }`}
              />
            </a>
          ))}
        </nav>
        {nut}
      </div>
      {/* Điện thoại: menu cuộn ngang */}
      <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-1.5 xl:hidden">
        {menu.map(([ten, href]) => (
          <a
            key={href}
            href={href}
            className={`shrink-0 rounded-md px-3 py-1.5 text-[13px] font-semibold transition ${
              dangXem === href ? 'bg-blue-500/25 text-white' : 'text-white/70 hover:text-white'
            }`}
          >
            {ten}
          </a>
        ))}
      </nav>
      <div
        className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-gradient-to-r from-sky-400 via-blue-500 to-amber-400"
        style={{ transform: `scaleX(${tienDo})` }}
        aria-hidden
      />
    </header>
  )
}
