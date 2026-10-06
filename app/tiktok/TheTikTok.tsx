'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import type { BaiViet } from '@/lib/db'
import { ghepHashtagTikTok, urlAnh } from '@/lib/chuThich'
import { gio, truoc } from '@/lib/thoiGian'
import { dichLoiTikTok } from '@/lib/loiTikTok'
import { boDanhDauTikTok, dangCaHai, dangTikTok } from '../actions'
import { thongBao } from '../ThongBao'
import KhungHenGio from '../KhungHenGio'
import { Tags } from '../TheBai'
import { IconFacebook, IconLai, IconNhac, IconTikTok, Xoay } from '../BieuTuong'

type Viec = 'tt' | 'ca_hai' | 'bo_danh_dau'

// `taiKhoan`: null khi chưa kết nối TikTok → chỉ xem trước, không đăng được
export default function TheTikTok({
  bai,
  xuHuong,
  hen,
  gioVang,
  taiKhoan,
}: {
  bai: BaiViet
  xuHuong: string[]
  hen: string | null // giờ đã hẹn đăng TikTok
  gioVang: { gio: number[]; tuSoLieu: boolean }
  taiKhoan: { khoaBinhLuan: boolean } | null
}) {
  const [choBinhLuan, setChoBinhLuan] = useState(true)
  const [longTieng, setLongTieng] = useState(true)
  const [moRong, setMoRong] = useState(false)
  // Xem trước video lồng tiếng: link blob của video, đang dựng, lỗi
  const [video, setVideo] = useState<string | null>(null)
  const [dangDung, setDangDung] = useState(false)
  const [loiVideo, setLoiVideo] = useState('')
  useEffect(() => () => void (video && URL.revokeObjectURL(video)), [video])

  const xemTruoc = async () => {
    setDangDung(true)
    setLoiVideo('')
    try {
      const res = await fetch(`/api/video/${bai.id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error((await res.text()) || `Lỗi ${res.status}`)
      setVideo(URL.createObjectURL(await res.blob()))
    } catch (e) {
      setLoiVideo(e instanceof Error ? e.message : 'Dựng video lỗi')
    } finally {
      setDangDung(false)
    }
  }
  const [dangLam, startTransition] = useTransition()
  const [viec, setViec] = useState<Viec | null>(null)

  const daDang = !!bai.tiktok_publish_id
  const tags = ghepHashtagTikTok(bai.hashtag, xuHuong)
  const tagXuHuong = tags.slice(bai.hashtag.length)

  const chay = (ten: Viec, viecLam: () => Promise<{ ok: boolean; loi?: string; canhBao?: string }>, xong: string) => {
    setViec(ten)
    startTransition(async () => {
      const kq = await viecLam()
      thongBao(kq.ok && !kq.canhBao ? 'ok' : 'loi', kq.ok ? (kq.canhBao ? `${xong}. ${kq.canhBao}` : xong) : (kq.loi ?? 'Có lỗi'))
      setViec(null)
    })
  }

  return (
    <article className="the grid gap-5 p-4 sm:p-5 md:grid-cols-[240px_1fr]">
      <div className="grid gap-2 self-start">
      <div className="relative">
        {video ? (
          <video src={video} controls autoPlay playsInline className="aspect-[9/16] w-full rounded-xl bg-black" />
        ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={urlAnh(bai, 480)}
          alt={bai.tieu_de_anh}
          width={480}
          height={480}
          loading="lazy"
          decoding="async"
          className="aspect-square w-full rounded-xl bg-slate-200 object-cover"
        />
        )}
        {/* Góc phải ảnh không có chữ nên đặt nhãn ở đó */}
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
          {bai.fb_post_id && (
            <span title="Đã lên Facebook" className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow">
              <IconFacebook className="h-3.5 w-3.5" />
            </span>
          )}
          <span className={`chip shadow ${daDang ? 'bg-slate-900 text-white' : 'bg-white/90 text-slate-700'}`}>
            <IconTikTok className="h-3 w-3" /> {daDang ? 'Đã đăng' : 'Chưa đăng'}
          </span>
        </div>
      </div>
      {!daDang && (
        <>
          <button disabled={dangDung || dangLam} onClick={video ? () => setVideo(null) : xemTruoc} className="btn btn-nhat justify-center">
            {dangDung ? <Xoay /> : null}
            {dangDung ? 'Đang dựng video… (~1 phút)' : video ? 'Xem ảnh' : '▶ Xem trước video lồng tiếng'}
          </button>
          {loiVideo && <p className="text-xs text-red-600">{loiVideo}</p>}
          {video && <p className="text-xs text-slate-400">Bấm Đăng (có lồng tiếng) sẽ dùng đúng video này. Sửa bài thì video tự dựng lại.</p>}
        </>
      )}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="chip bg-slate-100 text-slate-700">{bai.nguon_ten}</span>
          <span suppressHydrationWarning title={gio(bai.tao_luc)}>
            Soạn {truoc(bai.tao_luc)}
          </span>
          {daDang && bai.tiktok_dang_luc && (
            <span suppressHydrationWarning title={gio(bai.tiktok_dang_luc)}>
              · Lên TikTok {truoc(bai.tiktok_dang_luc)}
            </span>
          )}
        </div>

        <h2 className="text-lg font-extrabold leading-snug">{bai.tieu_de_anh}</h2>


        {bai.tiktok_loi && !daDang && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200"><b>Lần đăng trước lỗi:</b> {dichLoiTikTok(bai.tiktok_loi)}</p>
        )}

        {/* Xem trước mô tả đúng thứ tự sẽ đăng: nội dung, nguồn, hashtag */}
        <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
          <div className="mb-1.5 text-xs font-semibold text-slate-500">Mô tả trên TikTok</div>
          <p className={`whitespace-pre-wrap text-sm leading-relaxed ${moRong ? '' : 'line-clamp-4'}`}>{bai.noi_dung.trim()}</p>
          <button onClick={() => setMoRong(!moRong)} className="mt-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
            {moRong ? 'Thu gọn' : 'Xem thêm'}
          </button>
          <p className="mt-2 text-sm text-slate-600">📰 Nguồn: {bai.nguon_ten}</p>
          <div className="mt-2.5">
            <Tags ds={tags} noiBat={tagXuHuong} />
          </div>
          {!daDang && (
            <p className="mt-2.5 text-xs text-slate-400">
              <span className="text-pink-600">Hồng</span> là hashtag xu hướng tự thêm. Sửa chữ hoặc hashtag ở{' '}
              <Link href={bai.trang_thai === 'nhap' ? '/' : '/?tt=da_dang'} className="font-semibold text-blue-600 hover:underline">
                trang Facebook
              </Link>
              .
            </p>
          )}
        </div>

        {!daDang && taiKhoan && (
          <KhungHenGio
            baiId={bai.id}
            sua={{ tieu_de_anh: bai.tieu_de_anh, chu_de: bai.chu_de, noi_dung: bai.noi_dung, hashtag: bai.hashtag.join(' ') }}
            noiDuocHen={hen ? [] : ['tt']}
            henFb={null}
            henTikTok={hen}
            gioVang={gioVang}
          />
        )}

        {/* Thanh thao tác */}
        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {!daDang && !hen && taiKhoan && (
            <>
              <button
                disabled={dangLam}
                onClick={() => chay('tt', () => dangTikTok(bai.id, { tatBinhLuan: !choBinhLuan, longTieng }), 'Đã gửi lên TikTok')}
                className="btn btn-tt"
              >
                {viec === 'tt' ? <Xoay /> : <IconTikTok />}
                {viec === 'tt' ? (longTieng ? 'Đang dựng video… (~1-2 phút)' : 'Đang đăng… (~15 giây)') : 'Đăng TikTok'}
              </button>
              {/* Bài chờ duyệt chưa lên Facebook: đăng luôn cả hai nơi */}
              {bai.trang_thai === 'nhap' && !bai.fb_post_id && (
                <button
                  disabled={dangLam}
                  onClick={() => {
                    if (confirm('Đăng bài này lên cả Facebook và TikTok?'))
                      chay(
                        'ca_hai',
                        () =>
                          dangCaHai(
                            bai.id,
                            { tieu_de_anh: bai.tieu_de_anh, chu_de: bai.chu_de, noi_dung: bai.noi_dung, hashtag: bai.hashtag.join(' ') },
                            { tatBinhLuan: !choBinhLuan, longTieng },
                          ),
                        'Đã đăng lên Facebook và TikTok',
                      )
                  }}
                  className="btn btn-ca-hai"
                >
                  {viec === 'ca_hai' ? <Xoay /> : <><IconFacebook /><IconTikTok /></>}
                  {viec === 'ca_hai' ? (longTieng ? 'Đang đăng… (~1-2 phút)' : 'Đang đăng… (~20 giây)') : 'Đăng cả 2'}
                </button>
              )}
              <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-slate-900"
                    checked={choBinhLuan && !taiKhoan.khoaBinhLuan}
                    disabled={taiKhoan.khoaBinhLuan || dangLam}
                    onChange={(e) => setChoBinhLuan(e.target.checked)}
                  />
                  Cho bình luận
                </label>
                <label className="flex cursor-pointer items-center gap-2" title="Đăng dạng video: giọng AI đọc tiêu đề và nội dung bài, có phụ đề">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-slate-900"
                    checked={longTieng}
                    disabled={dangLam}
                    onChange={(e) => setLongTieng(e.target.checked)}
                  />
                  Lồng tiếng AI đọc bài
                </label>
                {!longTieng && (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <IconNhac className="h-3.5 w-3.5" /> Nhạc tự động
                  </span>
                )}
              </div>
              <p className="w-full text-xs text-slate-400">
                Khi bấm Đăng, bạn đồng ý với{' '}
                <a
                  href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-slate-600"
                >
                  Xác nhận sử dụng âm nhạc
                </a>{' '}
                của TikTok. Bài có thể mất vài phút mới hiện trên hồ sơ.
                {longTieng && ' Lồng tiếng: đăng dạng video dọc, ảnh bài + giọng AI đọc + phụ đề (tốn 1 lượt giọng Gemini). Giọng lỗi thì tự đăng dạng ảnh.'}
              </p>
            </>
          )}

          {!daDang && !taiKhoan && <p className="text-sm text-slate-500">Kết nối tài khoản TikTok (góc trên) để đăng.</p>}

          {daDang && (
            <button
              disabled={dangLam}
              onClick={() => {
                if (confirm('Bạn đã xóa bài này trên TikTok và muốn đăng lại?'))
                  chay('bo_danh_dau', () => boDanhDauTikTok(bai.id), 'Đã chuyển về "Chưa đăng"')
              }}
              className="btn btn-nhat"
            >
              {viec === 'bo_danh_dau' ? <Xoay /> : <IconLai />}
              Đã xóa trên TikTok? Đánh dấu chưa đăng
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
