'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { thongBao } from '@/app/ThongBao'
import { IconXoa, Xoay } from '@/app/BieuTuong'
import { xoaVideoYouTube } from './actions'

// Nút xoá trên thẻ video ở danh sách: xoá khỏi trang và nhờ máy nhà xoá luôn thư mục video trên máy
export default function NutXoa({ id, ten }: { id: string; ten: string }) {
  const router = useRouter()
  const [dangXoa, startTransition] = useTransition()
  return (
    <button
      type="button"
      title="Xoá video"
      disabled={dangXoa}
      onClick={() => {
        if (!confirm(`Xoá "${ten}"?\n\nXoá khỏi trang và xoá luôn file video trên máy nhà (Desktop\\Video-YouTube). Không khôi phục được.`)) return
        startTransition(async () => {
          const kq = await xoaVideoYouTube(id)
          if (!kq.ok) return thongBao('loi', kq.loi)
          thongBao('ok', 'Đã xoá video')
          router.refresh()
        })
      }}
      className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      {dangXoa ? <Xoay /> : <IconXoa className="h-4 w-4" />}
    </button>
  )
}
