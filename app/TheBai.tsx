'use client'

import { useState, useTransition } from 'react'
import type { BaiViet } from '@/lib/db'
import { BANG_MAU } from '@/lib/bangMau'
import { taoChuThich, tachHashtag } from '@/lib/chuThich'
import { dangBai, dangTikTok, doiMauAnh, doiTrangThai, luuBai } from './actions'

const gio = (s: string) =>
  new Date(s).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })

// `tiktok`: đã cấu hình và kết nối TikTok thì mới hiện nút đăng TikTok
export default function TheBai({ bai, tiktok }: { bai: BaiViet; tiktok: boolean }) {
  const [tieuDe, setTieuDe] = useState(bai.tieu_de_anh)
  const [chuDe, setChuDe] = useState(bai.chu_de)
  const [noiDung, setNoiDung] = useState(bai.noi_dung)
  const [hashtag, setHashtag] = useState(bai.hashtag.map((h) => `#${h}`).join(' '))
  const [dangLam, startTransition] = useTransition()
  const [thongBao, setThongBao] = useState<{ loai: 'ok' | 'loi'; chu: string } | null>(
    bai.loi && !bai.fb_post_id
      ? { loai: 'loi', chu: bai.loi }
      : bai.tiktok_loi && !bai.tiktok_publish_id
        ? { loai: 'loi', chu: `TikTok: ${bai.tiktok_loi}` }
        : null,
  )
  const choDang = bai.trang_thai === 'nhap' || bai.trang_thai === 'da_dang'

  const khoa = bai.trang_thai === 'da_dang'
  const daSua =
    tieuDe !== bai.tieu_de_anh || chuDe !== bai.chu_de || noiDung !== bai.noi_dung ||
    hashtag !== bai.hashtag.map((h) => `#${h}`).join(' ')
  const sua = { tieu_de_anh: tieuDe, chu_de: chuDe, noi_dung: noiDung, hashtag }
  // Ảnh đổi khi tiêu đề / chủ đề / màu đã lưu thay đổi
  const urlAnh = `/anh/${bai.id}?v=${encodeURIComponent(`${bai.tieu_de_anh}|${bai.chu_de}|${bai.mau_anh}`)}`

  const chay = (viec: () => Promise<{ ok: boolean; loi?: string }>, xong: string) =>
    startTransition(async () => {
      setThongBao(null)
      const kq = await viec()
      setThongBao(kq.ok ? { loai: 'ok', chu: xong } : { loai: 'loi', chu: kq.loi ?? 'Có lỗi' })
    })

  const saoChep = async () => {
    const chu = taoChuThich({ noi_dung: noiDung, hashtag: tachHashtag(hashtag), nguon_ten: bai.nguon_ten, nguon_link: bai.nguon_link })
    await navigator.clipboard.writeText(chu)
    setThongBao({ loai: 'ok', chu: 'Đã sao chép nội dung bài đăng' })
  }

  return (
    <article className="grid gap-5 rounded-2xl bg-white p-4 shadow-sm sm:p-5 md:grid-cols-[300px_1fr]">
      {/* Ảnh minh họa */}
      <div className="space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urlAnh} alt={bai.tieu_de_anh} className="aspect-square w-full rounded-xl bg-slate-200" />
        {!khoa && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Màu ảnh:</span>
            {BANG_MAU.map((m, i) => (
              <button
                key={i}
                type="button"
                disabled={dangLam}
                onClick={() => chay(() => doiMauAnh(bai.id, i), 'Đã đổi màu ảnh')}
                aria-label={`Màu ${i + 1}`}
                className={`h-6 w-6 rounded-full ring-offset-2 ${bai.mau_anh === i ? 'ring-2 ring-slate-900' : ''}`}
                style={{ backgroundImage: `linear-gradient(135deg, ${m.nen1}, ${m.nen2})` }}
              />
            ))}
          </div>
        )}
        <a href={urlAnh} download={`anh-${bai.id.slice(0, 8)}.png`} className="btn w-full bg-slate-100 text-slate-700 hover:bg-slate-200">
          ⬇ Tải ảnh
        </a>
      </div>

      {/* Nội dung */}
      <div className="min-w-0 space-y-3">
        <div className="text-xs text-slate-500">
          <a href={bai.nguon_link} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:underline">
            {bai.nguon_ten}: {bai.tieu_de_goc}
          </a>
          <div className="mt-0.5">
            Soạn lúc {gio(bai.tao_luc)}
            {bai.dang_luc && <> · Đăng Facebook lúc {gio(bai.dang_luc)}</>}
            {bai.tiktok_dang_luc && <> · Đăng TikTok lúc {gio(bai.tiktok_dang_luc)}</>}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <div>
            <label className="label">Tiêu đề trên ảnh</label>
            <input className="input" value={tieuDe} onChange={(e) => setTieuDe(e.target.value)} disabled={khoa} />
          </div>
          <div>
            <label className="label">Chủ đề</label>
            <input className="input" value={chuDe} onChange={(e) => setChuDe(e.target.value)} disabled={khoa} />
          </div>
        </div>
        <div>
          <label className="label">Nội dung bài đăng</label>
          <textarea
            className="input min-h-56 leading-relaxed"
            value={noiDung}
            onChange={(e) => setNoiDung(e.target.value)}
            disabled={khoa}
          />
          <p className="mt-1 text-xs text-slate-400">{noiDung.trim().split(/\s+/).filter(Boolean).length} chữ · nguồn và link được thêm tự động cuối bài</p>
        </div>
        <div>
          <label className="label">Hashtag</label>
          <input className="input" value={hashtag} onChange={(e) => setHashtag(e.target.value)} disabled={khoa} />
        </div>

        {thongBao && (
          <p className={`rounded-lg p-2 text-sm ${thongBao.loai === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {thongBao.chu}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {choDang && !bai.fb_post_id && (
            <button
              disabled={dangLam}
              onClick={() => {
                if (confirm('Đăng bài này lên Fanpage?')) chay(() => dangBai(bai.id, sua), 'Đã đăng lên Facebook')
              }}
              className="btn bg-blue-600 text-white hover:bg-blue-700"
            >
              {dangLam ? 'Đang xử lý…' : 'Đăng lên Facebook'}
            </button>
          )}
          {tiktok && choDang && !bai.tiktok_publish_id && (
            <button
              disabled={dangLam}
              onClick={() => {
                if (confirm('Đăng ảnh bài này lên TikTok?')) chay(() => dangTikTok(bai.id, sua), 'Đã gửi lên TikTok')
              }}
              className="btn bg-slate-900 text-white hover:bg-black"
            >
              {dangLam ? 'Đang xử lý…' : 'Đăng lên TikTok'}
            </button>
          )}
          {!khoa && (
            <button
              disabled={dangLam || !daSua}
              onClick={() => chay(() => luuBai(bai.id, sua), 'Đã lưu')}
              className="btn bg-slate-800 text-white hover:bg-slate-700"
            >
              Lưu thay đổi
            </button>
          )}
          <button onClick={saoChep} className="btn bg-slate-100 text-slate-700 hover:bg-slate-200">
            Sao chép nội dung
          </button>
          {bai.trang_thai === 'nhap' && (
            <button
              disabled={dangLam}
              onClick={() => chay(() => doiTrangThai(bai.id, 'bo_qua'), 'Đã bỏ qua')}
              className="btn text-slate-500 hover:bg-slate-100"
            >
              Bỏ qua
            </button>
          )}
          {(bai.trang_thai === 'bo_qua' || bai.trang_thai === 'loi') && (
            <button
              disabled={dangLam}
              onClick={() => chay(() => doiTrangThai(bai.id, 'nhap'), 'Đã đưa về chờ duyệt')}
              className="btn text-slate-600 hover:bg-slate-100"
            >
              Đưa về chờ duyệt
            </button>
          )}
          {bai.fb_post_id && (
            <a
              href={`https://www.facebook.com/${bai.fb_post_id}`}
              target="_blank"
              rel="noreferrer"
              className="btn text-blue-600 hover:bg-blue-50"
            >
              Xem trên Facebook ↗
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
