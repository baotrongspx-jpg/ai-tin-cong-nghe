'use client'

import { useEffect, useState } from 'react'

// Gõ lần lượt từng câu, xóa rồi gõ câu kế tiếp. Người bật "giảm chuyển động" chỉ thấy câu đầu.
export default function ChuChay({ cau }: { cau: string[] }) {
  const [i, setI] = useState(0)
  const [so, setSo] = useState(cau[0].length)
  const [xoa, setXoa] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const hienTai = cau[i]
    let cho = xoa ? 35 : 70
    if (!xoa && so === hienTai.length) cho = 2200
    const t = setTimeout(() => {
      if (!xoa && so === hienTai.length) setXoa(true)
      else if (xoa && so === 0) {
        setXoa(false)
        setI((i + 1) % cau.length)
      } else setSo(so + (xoa ? -1 : 1))
    }, cho)
    return () => clearTimeout(t)
  }, [cau, i, so, xoa])

  return (
    <span>
      <span className="sr-only">{cau.join(' · ')}</span>
      <span aria-hidden>
        {cau[i].slice(0, so)}
        <span className="cv-con-tro ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-amber-300" />
      </span>
    </span>
  )
}
