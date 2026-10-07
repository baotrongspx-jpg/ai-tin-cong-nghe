'use client'

import { useEffect, useSyncExternalStore } from 'react'

// Dựng sẵn video lồng tiếng cho các bài chưa đăng khi mở trang TikTok, lần lượt từng bài (máy đọc giọng mỗi lần
// chỉ đọc một bài). Bấm Xem trước lúc bài đang dựng dở thì chờ bản đó xong rồi lấy, không dựng lại lần nữa.
const dangDung = new Map<string, Promise<boolean>>()
const daSan = new Set<string>()
const ngheDoi = (bao: () => void) => {
  window.addEventListener('video-san', bao)
  return () => window.removeEventListener('video-san', bao)
}

// Bài đang dựng sẵn dở thì chờ xong (true: đã có video)
export const choDungSan = (id: string) => dangDung.get(id) ?? Promise.resolve(daSan.has(id))

export const useVideoSan = (id: string) =>
  useSyncExternalStore(ngheDoi, () => daSan.has(id), () => false)

export default function DungSan({ ds }: { ds: string[] }) {
  const khoa = ds.join(',')
  useEffect(() => {
    let dung = false
    ;(async () => {
      for (const id of khoa.split(',').filter(Boolean)) {
        if (dung) return
        if (daSan.has(id) || dangDung.has(id)) continue
        const viec = fetch(`/api/video/${id}?san=1`, { cache: 'no-store' })
          .then((r) => r.ok)
          .catch(() => false)
        dangDung.set(id, viec)
        const ok = await viec
        dangDung.delete(id)
        // Máy đọc giọng không chạy (máy nhà tắt) thì thôi, khỏi thử các bài sau
        if (!ok) return
        daSan.add(id)
        window.dispatchEvent(new Event('video-san'))
      }
    })()
    return () => {
      dung = true
    }
  }, [khoa])
  return null
}
