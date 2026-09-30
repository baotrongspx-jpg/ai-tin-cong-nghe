'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

// Nội dung hiện dần (mờ → rõ, trượt lên) khi cuộn tới. Người bật "giảm chuyển động" thì hiện ngay.
export default function HienDan({ children, tre = 0, className = '' }: { children: ReactNode; tre?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [hien, setHien] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const quan = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setHien(true)
          quan.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    quan.observe(el)
    return () => quan.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${tre}ms` }}
      className={`transition duration-700 ease-out motion-reduce:transition-none ${
        hien ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100'
      } ${className}`}
    >
      {children}
    </div>
  )
}
