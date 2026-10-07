'use client'

import { useRef, useState, useTransition } from 'react'
import { xinLinkNgheNhac, xinLinkTaiNhac, xoaNhacNen, xongTaiNhac } from '@/app/actions'
import { thongBao } from '@/app/ThongBao'
import { Xoay } from '@/app/BieuTuong'

// Nhạc nền trộn nhỏ dưới giọng đọc trong video lồng tiếng. Mỗi bài tự chọn một bản trong danh sách.
export default function NhacNen({ ds, bat }: { ds: { ten: string; kichThuoc: number }[]; bat: boolean }) {
  const chonTep = useRef<HTMLInputElement>(null)
  const [dangTai, setDangTai] = useState('')
  const [dangLam, startTransition] = useTransition()
  const [dangNghe, setDangNghe] = useState<{ ten: string; url: string } | null>(null)

  const taiLen = async (tep: FileList | null) => {
    for (const f of Array.from(tep ?? [])) {
      if (f.size > 30 * 1024 * 1024) {
        thongBao('loi', `${f.name} quá 30 MB`)
        continue
      }
      setDangTai(f.name)
      try {
        const kq = await xinLinkTaiNhac(f.name)
        if (!kq.ok || !kq.url) throw new Error(kq.loi ?? 'Không xin được link tải lên')
        const res = await fetch(kq.url, { method: 'PUT', body: f, headers: { 'content-type': f.type || 'audio/mpeg', 'x-upsert': 'true' } })
        if (!res.ok) throw new Error(`Tải lên lỗi ${res.status}`)
        thongBao('ok', `Đã thêm nhạc ${f.name}`)
      } catch (e) {
        thongBao('loi', `${f.name}: ${e instanceof Error ? e.message : 'lỗi'}`)
      }
    }
    setDangTai('')
    if (chonTep.current) chonTep.current.value = ''
    await xongTaiNhac()
  }

  const nghe = async (ten: string) => {
    if (dangNghe?.ten === ten) return setDangNghe(null)
    const kq = await xinLinkNgheNhac(ten)
    if (kq.ok && kq.url) setDangNghe({ ten, url: kq.url })
    else thongBao('loi', kq.loi ?? 'Không mở được nhạc')
  }

  return (
    <details className="the mb-5 p-4 sm:p-5" open={!ds.length}>
      <summary className="cursor-pointer select-none font-bold">
        🎵 Nhạc nền video <span className="font-normal text-slate-500">({ds.length ? `${ds.length} bản` : 'chưa có'})</span>
      </summary>
      <div className="mt-3 space-y-3 text-sm">
        <p className="text-slate-600">
          Nhạc được trộn nhỏ dưới giọng đọc, mỗi bài tự chọn một bản. Chỉ dùng nhạc <b>miễn phí bản quyền</b> (Pixabay Music, YouTube Audio
          Library...), nhạc có bản quyền sẽ bị TikTok / Facebook tắt tiếng hoặc gỡ video.
          {!bat && <b className="text-amber-700"> Đang tắt nhạc nền (NHAC_NEN=0).</b>}
        </p>
        {ds.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
            {ds.map(({ ten, kichThuoc }) => (
              <li key={ten} className="flex items-center gap-2 px-3 py-2">
                <button type="button" onClick={() => nghe(ten)} className="btn btn-nhat px-2.5 text-xs">
                  {dangNghe?.ten === ten ? '■ Dừng' : '▶ Nghe'}
                </button>
                <span className="min-w-0 flex-1 truncate">{ten}</span>
                <span className="text-xs text-slate-400">{(kichThuoc / 1024 / 1024).toFixed(1)} MB</span>
                <button
                  type="button"
                  disabled={dangLam}
                  onClick={() =>
                    confirm(`Xóa nhạc ${ten}?`) &&
                    startTransition(async () => {
                      const kq = await xoaNhacNen(ten)
                      thongBao(kq.ok ? 'ok' : 'loi', kq.ok ? `Đã xóa ${ten}` : (kq.loi ?? 'Có lỗi'))
                    })
                  }
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        )}
        {dangNghe && <audio src={dangNghe.url} autoPlay controls onEnded={() => setDangNghe(null)} className="w-full" />}
        <input ref={chonTep} type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg" multiple hidden onChange={(e) => taiLen(e.target.files)} />
        <button type="button" disabled={!!dangTai} onClick={() => chonTep.current?.click()} className="btn btn-phu">
          {dangTai ? (
            <>
              <Xoay /> Đang tải {dangTai}…
            </>
          ) : (
            '+ Thêm nhạc (mp3, m4a...)'
          )}
        </button>
      </div>
    </details>
  )
}
