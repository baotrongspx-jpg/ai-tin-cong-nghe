'use client'

import { useState, useTransition } from 'react'
import { datAnhNenAction, timAnhNenAction } from './actions'
import { thongBao } from './ThongBao'
import { IconBo, IconLai, IconXong, Xoay } from './BieuTuong'

type Anh = { id: number; xemTruoc: string; tacGia: string }

// Chọn ảnh nền Pixabay cho ảnh bài: xem gợi ý theo từ khóa AI, tìm từ khóa khác, hoặc bỏ ảnh (nền màu)
export default function ChonAnhNen({ baiId, anhNen }: { baiId: string; anhNen: number | null }) {
  const [mo, setMo] = useState(false)
  const [tuKhoa, setTuKhoa] = useState('')
  const [ds, setDs] = useState<Anh[] | null>(null)
  const [dangTim, startTim] = useTransition()
  const [dangChon, setDangChon] = useState<number | null>(null)

  const tim = (tk?: string) =>
    startTim(async () => {
      const kq = await timAnhNenAction(baiId, tk)
      if (!kq.ok) return thongBao('loi', kq.loi ?? 'Không tìm được ảnh')
      setTuKhoa(kq.tuKhoa ?? '')
      setDs(kq.ds ?? [])
    })

  const chon = async (id: number) => {
    setDangChon(id)
    const kq = await datAnhNenAction(baiId, id)
    setDangChon(null)
    thongBao(kq.ok ? 'ok' : 'loi', kq.ok ? (id ? 'Đã đổi ảnh nền' : 'Đã chuyển về nền màu') : (kq.loi ?? 'Có lỗi'))
  }

  if (!mo)
    return (
      <button
        onClick={() => {
          setMo(true)
          if (!ds) tim()
        }}
        className="btn btn-phu w-full"
      >
        🖼️ {anhNen ? 'Đổi ảnh nền' : 'Chọn ảnh nền'}
      </button>
    )

  return (
    <div className="hien-len space-y-2.5 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-600">🖼️ Ảnh nền miễn phí (Pixabay)</span>
        <button onClick={() => setMo(false)} className="text-slate-400 hover:text-slate-700" aria-label="Đóng">
          <IconBo className="h-4 w-4" />
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          tim(tuKhoa)
        }}
        className="flex gap-1.5"
      >
        <input
          className="input py-1.5"
          value={tuKhoa}
          onChange={(e) => setTuKhoa(e.target.value)}
          placeholder="Từ khóa tiếng Anh, vd: smartphone"
          aria-label="Từ khóa tìm ảnh"
        />
        <button disabled={dangTim} className="btn btn-sm btn-phu shrink-0" title="Tìm">
          {dangTim ? <Xoay className="h-3.5 w-3.5" /> : <IconLai className="h-3.5 w-3.5" />}
        </button>
      </form>

      <div className="grid grid-cols-3 gap-1.5">
        {/* Bỏ ảnh: quay về nền màu */}
        <button
          onClick={() => chon(0)}
          disabled={dangChon !== null}
          className={`relative flex aspect-square items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-blue-800 text-center text-[11px] font-bold text-white ${
            !anhNen ? 'ring-2 ring-blue-500 ring-offset-1' : ''
          }`}
        >
          {dangChon === 0 ? <Xoay /> : 'Nền màu'}
        </button>
        {dangTim && !ds
          ? Array.from({ length: 5 }, (_, i) => <div key={i} className="aspect-square animate-pulse rounded-lg bg-slate-200" />)
          : ds?.map((a) => (
              <button
                key={a.id}
                onClick={() => chon(a.id)}
                disabled={dangChon !== null}
                title={`Ảnh của ${a.tacGia} trên Pixabay`}
                className={`relative aspect-square overflow-hidden rounded-lg bg-slate-200 ${
                  anhNen === a.id ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:opacity-80'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.xemTruoc} alt="" loading="lazy" className="h-full w-full object-cover" />
                {(dangChon === a.id || anhNen === a.id) && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                    {dangChon === a.id ? <Xoay /> : <IconXong className="h-5 w-5" />}
                  </span>
                )}
              </button>
            ))}
      </div>
      {dangTim && !ds && !tuKhoa && (
        <p className="text-xs text-slate-500">AI đang gợi ý từ khóa theo nội dung bài… (lần đầu có thể mất 10–15 giây)</p>
      )}
      {ds && !ds.length && <p className="text-xs text-slate-500">Không có ảnh hợp, thử từ khóa khác (tiếng Anh).</p>}
      <p className="text-[11px] text-slate-400">Ảnh Pixabay miễn phí, dùng thương mại được. Đổi ảnh xong, ảnh bài tự cập nhật.</p>
    </div>
  )
}
