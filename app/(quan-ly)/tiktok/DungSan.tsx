'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

// Dựng sẵn video lồng tiếng cho các bài chưa đăng khi mở trang TikTok, lần lượt từng bài (máy đọc giọng mỗi lần
// chỉ đọc một bài). Bấm Xem trước lúc bài đang dựng dở thì chờ bản đó xong rồi lấy, không dựng lại lần nữa.
const dangDung = new Map<string, Promise<boolean | null>>()
const daSan = new Set<string>()
const ngheDoi = (bao: () => void) => {
  window.addEventListener('video-san', bao)
  return () => window.removeEventListener('video-san', bao)
}

// Bài đang dựng sẵn dở thì chờ xong (true: đã có video, false: máy nhà đang dựng, null: lỗi)
export const choDungSan = (id: string) => dangDung.get(id) ?? Promise.resolve(daSan.has(id))

export const useVideoSan = (id: string) =>
  useSyncExternalStore(ngheDoi, () => daSan.has(id), () => false)

export default function DungSan({ ds }: { ds: string[] }) {
  const khoa = ds.join(',')
  const [loi, setLoi] = useState('')
  useEffect(() => {
    let dung = false
    ;(async () => {
      for (const id of khoa.split(',').filter(Boolean)) {
        if (dung) return
        if (daSan.has(id) || dangDung.has(id)) continue
        let baoLoi = ''
        // true: video đã có; false: đã nhờ máy nhà dựng (chưa xong); null: lỗi
        const viec: Promise<boolean | null> = fetch(`/api/video/${id}?san=1`, { cache: 'no-store' })
          .then(async (r) => (r.ok ? r.status === 204 : ((baoLoi = (await r.text()).slice(0, 300) || `lỗi ${r.status}`), null)))
          .catch((e: Error) => ((baoLoi = e.message), null))
        dangDung.set(id, viec)
        const ok = await viec
        dangDung.delete(id)
        // Máy đọc giọng không chạy (máy nhà tắt...) thì báo lên và thôi, khỏi thử các bài sau
        if (ok === null) {
          if (!dung) setLoi(baoLoi.startsWith('<') ? 'máy chủ trả lỗi' : baoLoi)
          return
        }
        if (!ok) continue
        daSan.add(id)
        window.dispatchEvent(new Event('video-san'))
      }
    })()
    return () => {
      dung = true
    }
  }, [khoa])
  if (!loi) return null
  return (
    <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      ⚠ Chưa dựng sẵn được video: {loi}. Bấm Xem trước ở từng bài sẽ đọc tạm bằng giọng dự phòng.
    </p>
  )
}
