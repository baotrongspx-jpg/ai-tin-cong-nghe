'use client'

import { useEffect, useRef, useState } from 'react'

// Số đếm tăng dần từ 0 khi cuộn tới
export default function DemSo({ den, sau = '' }: { den: number; sau?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [so, setSo] = useState(den)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setSo(0)
    let khung = 0
    const quan = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      quan.disconnect()
      const batDau = performance.now()
      const chay = (t: number) => {
        const p = Math.min(1, (t - batDau) / 1400)
        setSo(Math.round(den * (1 - Math.pow(1 - p, 3))))
        if (p < 1) khung = requestAnimationFrame(chay)
      }
      khung = requestAnimationFrame(chay)
    })
    quan.observe(el)
    return () => {
      quan.disconnect()
      cancelAnimationFrame(khung)
    }
  }, [den])

  return (
    <span ref={ref} className="tabular-nums">
      {so}
      {sau}
    </span>
  )
}
