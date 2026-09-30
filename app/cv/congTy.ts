'use client'

import { useSyncExternalStore } from 'react'

// Link riêng cho từng công ty: /cv?cho=Công ty ABC → trang và robot chào đúng tên.
// Nhớ trong phiên để bấm sang /cv/ban-in rồi quay lại vẫn giữ tên.
export function docCongTy() {
  try {
    const tuLink = new URLSearchParams(location.search).get('cho')?.replace(/[-_+]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
    if (tuLink) sessionStorage.setItem('cv_cong_ty', tuLink)
    return tuLink || sessionStorage.getItem('cv_cong_ty') || ''
  } catch {
    return ''
  }
}

// Mã vị trí của bản CV đang xem (?vt=quan-ly-kho), để báo Telegram
export function docViTri() {
  try {
    return new URLSearchParams(location.search).get('vt')?.slice(0, 40) ?? ''
  } catch {
    return ''
  }
}

const khongDoi = () => () => {}

export function useCongTy() {
  return useSyncExternalStore(khongDoi, docCongTy, () => '')
}

// Mở khung chat của robot từ bất kỳ nút nào trên trang
export const moTroLy = () => window.dispatchEvent(new Event('mo-tro-ly'))
