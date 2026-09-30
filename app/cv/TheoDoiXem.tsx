'use client'

import { useEffect } from 'react'
import { docCongTy, docViTri } from './congTy'

// Báo về Telegram khi có người mở CV và khi họ rời trang (xem bao lâu, cuộn tới đâu).
// Máy của chủ trang (đã vào /cv/doi-anh) được đánh dấu để không tự báo chính mình.
export default function TheoDoiXem() {
  useEffect(() => {
    const congTy = docCongTy()
    const viTri = docViTri()
    try {
      if (localStorage.getItem('cv_chu_trang') === '1') return
    } catch {}
    const gui = (du: Record<string, unknown>) =>
      navigator.sendBeacon?.('/cv/su-kien', JSON.stringify({ congTy, viTri, ...du })) ??
      fetch('/cv/su-kien', { method: 'POST', body: JSON.stringify({ congTy, viTri, ...du }), keepalive: true })

    // Mỗi phiên chỉ báo "mở" một lần (tải lại trang không báo lại)
    let daBao = false
    try {
      daBao = sessionStorage.getItem('cv_da_bao') === '1'
      sessionStorage.setItem('cv_da_bao', '1')
    } catch {}
    if (!daBao) gui({ loai: 'mo', nguon: document.referrer })

    const batDau = Date.now()
    let cuonXaNhat = 0
    const doCuon = () => {
      const h = document.documentElement
      const pt = ((h.scrollTop + h.clientHeight) / h.scrollHeight) * 100
      cuonXaNhat = Math.max(cuonXaNhat, Math.min(100, pt))
    }
    doCuon()
    let daRoi = false
    const roi = () => {
      if (daRoi || daBao) return
      daRoi = true
      gui({ loai: 'roi', giay: (Date.now() - batDau) / 1000, cuon: cuonXaNhat })
    }
    // Điện thoại hay đóng tab mà không có pagehide → bắt cả lúc trang bị ẩn
    const khiAn = () => document.visibilityState === 'hidden' && roi()
    window.addEventListener('scroll', doCuon, { passive: true })
    window.addEventListener('pagehide', roi)
    document.addEventListener('visibilitychange', khiAn)
    return () => {
      window.removeEventListener('scroll', doCuon)
      window.removeEventListener('pagehide', roi)
      document.removeEventListener('visibilitychange', khiAn)
    }
  }, [])

  return null
}
