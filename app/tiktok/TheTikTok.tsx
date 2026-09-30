'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { BaiViet } from '@/lib/db'
import { taoChuThichTikTok } from '@/lib/chuThich'
import { boDanhDauTikTok, dangTikTok } from '../actions'

const gio = (s: string) =>
  new Date(s).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })

const TEN_CHE_DO: Record<string, string> = {
  PUBLIC_TO_EVERYONE: 'Mọi người',
  MUTUAL_FOLLOW_FRIENDS: 'Bạn bè',
  FOLLOWER_OF_CREATOR: 'Người theo dõi',
  SELF_ONLY: 'Chỉ mình tôi',
}

// `taiKhoan`: null khi chưa kết nối TikTok → chỉ xem trước, không đăng được
export default function TheTikTok({
  bai,
  taiKhoan,
}: {
  bai: BaiViet
  taiKhoan: { cheDo: string[]; khoaBinhLuan: boolean } | null
}) {
  // Không chọn sẵn "Ai có thể xem": TikTok yêu cầu người đăng tự chọn
  const [cheDo, setCheDo] = useState('')
  const [choBinhLuan, setChoBinhLuan] = useState(true)
  const [dangLam, startTransition] = useTransition()
  const [thongBao, setThongBao] = useState<{ loai: 'ok' | 'loi'; chu: string } | null>(
    bai.tiktok_loi && !bai.tiktok_publish_id ? { loai: 'loi', chu: bai.tiktok_loi } : null,
  )

  const daDang = !!bai.tiktok_publish_id
  const moTa = taoChuThichTikTok(bai)
  const urlAnh = `/anh/${bai.id}?v=${encodeURIComponent(`${bai.tieu_de_anh}|${bai.chu_de}|${bai.mau_anh}`)}`

  const chay = (viec: () => Promise<{ ok: boolean; loi?: string }>, xong: string) =>
    startTransition(async () => {
      setThongBao(null)
      const kq = await viec()
      setThongBao(kq.ok ? { loai: 'ok', chu: xong } : { loai: 'loi', chu: kq.loi ?? 'Có lỗi' })
    })

  return (
    <article className="grid gap-5 rounded-2xl bg-white p-4 shadow-sm sm:p-5 md:grid-cols-[260px_1fr]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={urlAnh} alt={bai.tieu_de_anh} className="aspect-square w-full rounded-xl bg-slate-200" />

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{bai.nguon_ten} · soạn {gio(bai.tao_luc)}</span>
          <span className={`rounded-full px-2 py-0.5 font-semibold ${bai.fb_post_id ? 'bg-blue-50 text-blue-700' : 'bg-slate-100'}`}>
            {bai.fb_post_id ? 'Đã lên Facebook' : 'Chưa lên Facebook'}
          </span>
          {daDang && (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 font-semibold text-white">
              Đăng TikTok {gio(bai.tiktok_dang_luc!)}
            </span>
          )}
        </div>

        <h2 className="text-lg font-bold leading-snug">{bai.tieu_de_anh}</h2>

        {/* Xem trước mô tả đúng như sẽ hiện trên TikTok */}
        <div>
          <div className="label">Mô tả trên TikTok</div>
          <div className="max-h-44 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-relaxed">
            {moTa}
          </div>
          {!daDang && (
            <p className="mt-1 text-xs text-slate-400">
              Muốn sửa chữ hoặc hashtag: sửa ở{' '}
              <Link href={bai.trang_thai === 'nhap' ? '/' : '/?tt=da_dang'} className="text-blue-600 hover:underline">
                trang Facebook
              </Link>{' '}
              (bài chờ duyệt).
            </p>
          )}
        </div>

        {!daDang && taiKhoan && (
          <div className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={`che-do-${bai.id}`}>Ai có thể xem</label>
              <select
                id={`che-do-${bai.id}`}
                className="input"
                value={cheDo}
                onChange={(e) => setCheDo(e.target.value)}
                disabled={dangLam}
              >
                <option value="" disabled>Chọn…</option>
                {taiKhoan.cheDo.map((c) => (
                  <option key={c} value={c}>{TEN_CHE_DO[c] ?? c}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end gap-1 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={choBinhLuan && !taiKhoan.khoaBinhLuan}
                  disabled={taiKhoan.khoaBinhLuan || dangLam}
                  onChange={(e) => setChoBinhLuan(e.target.checked)}
                />
                Cho phép bình luận
              </label>
              <span className="text-xs text-slate-500">🎵 TikTok tự thêm nhạc phù hợp</span>
            </div>
          </div>
        )}

        {thongBao && (
          <p className={`rounded-lg p-2 text-sm ${thongBao.loai === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {thongBao.chu}
          </p>
        )}

        {!daDang && taiKhoan && (
          <div className="space-y-2">
            <button
              disabled={dangLam || !cheDo}
              onClick={() =>
                chay(() => dangTikTok(bai.id, { privacy: cheDo, tatBinhLuan: !choBinhLuan }), 'Đã gửi lên TikTok')
              }
              className="btn bg-slate-900 text-white hover:bg-black"
            >
              {dangLam ? 'Đang đăng… (khoảng 15 giây)' : 'Đăng lên TikTok'}
            </button>
            <p className="text-xs text-slate-400">
              Khi bấm Đăng, bạn đồng ý với{' '}
              <a
                href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Xác nhận sử dụng âm nhạc
              </a>{' '}
              của TikTok. Bài có thể mất vài phút mới hiện trên hồ sơ.
            </p>
          </div>
        )}

        {daDang && (
          <button
            disabled={dangLam}
            onClick={() => {
              if (confirm('Bạn đã xóa bài này trên TikTok và muốn đăng lại?'))
                chay(() => boDanhDauTikTok(bai.id), 'Đã chuyển về "Chưa đăng TikTok"')
            }}
            className="btn text-slate-600 hover:bg-slate-100"
          >
            Đã xóa trên TikTok? Đánh dấu chưa đăng
          </button>
        )}
      </div>
    </article>
  )
}
