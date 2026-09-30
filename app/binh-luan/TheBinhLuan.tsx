'use client'

import { useState, useTransition } from 'react'
import type { BinhLuan, DaAn } from '@/lib/binhLuan'
import { gio, truoc } from '@/lib/thoiGian'
import { urlAnh } from '@/lib/chuThich'
import { anBinhLuanAction, goiYTraLoiAction, traLoiAction } from '../actions'
import { thongBao } from '../ThongBao'
import { IconMo, IconSao, IconXong, Xoay } from '../BieuTuong'

type Viec = 'goi_y' | 'gui' | 'an'

// Một bình luận: đọc, nhờ AI gợi ý, sửa rồi gửi trả lời, hoặc ẩn
export default function TheBinhLuan({ c, nghiSpam }: { c: BinhLuan; nghiSpam: boolean }) {
  const [traLoi, setTraLoi] = useState('')
  const [dangLam, startTransition] = useTransition()
  const [viec, setViec] = useState<Viec | null>(null)
  // Mã bình luận dạng "<post>_<comment>": mở thẳng bình luận trên Facebook
  const urlFb = `https://www.facebook.com/${c.bai.fb_post_id}?comment_id=${c.id.split('_').pop()}`

  const chay = (ten: Viec, viecLam: () => Promise<void>) => {
    setViec(ten)
    startTransition(async () => {
      await viecLam()
      setViec(null)
    })
  }

  const goiY = () =>
    chay('goi_y', async () => {
      const kq = await goiYTraLoiAction(c.bai.id, c.noiDung)
      if (kq.ok && kq.tra_loi) setTraLoi(kq.tra_loi)
      else thongBao('loi', kq.loi ?? 'AI không gợi ý được')
    })

  const gui = () =>
    chay('gui', async () => {
      const kq = await traLoiAction(c.id, traLoi)
      thongBao(kq.ok ? 'ok' : 'loi', kq.ok ? `Đã trả lời ${c.nguoi}` : (kq.loi ?? 'Có lỗi'))
      if (kq.ok) setTraLoi('')
    })

  const an = () =>
    chay('an', async () => {
      const kq = await anBinhLuanAction(
        { id: c.id, noiDung: c.noiDung, nguoi: c.nguoi, luc: c.luc, baiId: c.bai.id, tieuDe: c.bai.tieu_de_anh },
        true,
      )
      thongBao(kq.ok ? 'ok' : 'loi', kq.ok ? 'Đã ẩn bình luận' : (kq.loi ?? 'Có lỗi'))
    })

  return (
    <article className={`the p-4 ${nghiSpam ? 'ring-2 ring-red-200' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-700 text-sm font-bold text-white">
          {c.nguoi.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 text-sm">
            <b>{c.nguoi}</b>
            <span className="text-xs text-slate-500" suppressHydrationWarning title={gio(c.luc)}>
              {truoc(c.luc)}
            </span>
            {c.daTraLoi && (
              <span className="chip bg-emerald-50 text-emerald-700">
                <IconXong className="h-3 w-3" /> Đã trả lời
              </span>
            )}
            {nghiSpam && <span className="chip bg-red-50 text-red-700">Nghi spam</span>}
            <a href={urlFb} target="_blank" rel="noreferrer" className="ml-auto text-slate-400 hover:text-blue-600" title="Mở trên Facebook">
              <IconMo className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{c.noiDung}</p>

          <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 p-1.5 text-xs text-slate-500">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlAnh(c.bai, 96)} alt="" width={28} height={28} className="h-7 w-7 rounded object-cover" loading="lazy" decoding="async" />
            <span className="line-clamp-1">Bài: {c.bai.tieu_de_anh}</span>
          </div>

          <div className="mt-3 space-y-2">
            <textarea
              className="input min-h-20 resize-y"
              placeholder="Viết câu trả lời, hoặc bấm ✨ Gợi ý để AI soạn giúp…"
              value={traLoi}
              onChange={(e) => setTraLoi(e.target.value)}
              disabled={dangLam}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={goiY} disabled={dangLam} className="btn btn-phu text-violet-700">
                {viec === 'goi_y' ? <Xoay /> : <IconSao />} {traLoi ? 'Gợi ý khác' : 'Gợi ý'}
              </button>
              <button onClick={gui} disabled={dangLam || !traLoi.trim()} className="btn btn-fb">
                {viec === 'gui' && <Xoay />} Gửi trả lời
              </button>
              <button
                onClick={() => {
                  if (confirm('Ẩn bình luận này? Người viết và bạn bè họ vẫn thấy, người khác thì không.')) an()
                }}
                disabled={dangLam}
                className="btn btn-nhat ml-auto"
              >
                {viec === 'an' && <Xoay />} Ẩn
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

// Bình luận đã ẩn (tự động hoặc bấm tay), có nút hiện lại khi ẩn nhầm
export function TheDaAn({ c }: { c: DaAn }) {
  const [dangLam, startTransition] = useTransition()
  return (
    <article className="the flex items-start gap-3 p-3.5 opacity-90">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 text-sm">
          <b>{c.nguoi}</b>
          <span className="text-xs text-slate-500" suppressHydrationWarning>
            {truoc(c.luc)}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-3 break-words text-sm text-slate-600 line-through decoration-slate-300">{c.noiDung}</p>
        <p className="mt-1 line-clamp-1 text-xs text-slate-400">Bài: {c.tieuDe}</p>
      </div>
      <button
        disabled={dangLam}
        onClick={() =>
          startTransition(async () => {
            const kq = await anBinhLuanAction(c, false)
            thongBao(kq.ok ? 'ok' : 'loi', kq.ok ? 'Đã hiện lại bình luận' : (kq.loi ?? 'Có lỗi'))
          })
        }
        className="btn btn-sm btn-phu shrink-0"
      >
        {dangLam && <Xoay className="h-3.5 w-3.5" />} Hiện lại
      </button>
    </article>
  )
}
