'use client'

import { useState, useTransition, type KeyboardEvent, type ReactNode } from 'react'
import type { BaiViet } from '@/lib/db'
import { BANG_MAU } from '@/lib/bangMau'
import { taoChuThich, tachHashtag } from '@/lib/chuThich'
import { gio, truoc } from '@/lib/thoiGian'
import { dangBai, dangCaHai, doiMauAnh, doiTrangThai, luuBai } from './actions'
import { thongBao } from './ThongBao'
import { IconBo, IconChep, IconFacebook, IconLai, IconLuu, IconMo, IconNhac, IconTai, IconTikTok, Xoay } from './BieuTuong'

type Viec = 'fb' | 'ca_hai' | 'luu' | 'mau' | 'trang_thai'

const NHAN: Record<BaiViet['trang_thai'], { chu: string; mau: string }> = {
  nhap: { chu: 'Chờ duyệt', mau: 'bg-amber-400 text-amber-950' },
  da_dang: { chu: 'Đã đăng', mau: 'bg-emerald-500 text-white' },
  bo_qua: { chu: 'Bỏ qua', mau: 'bg-slate-500 text-white' },
  loi: { chu: 'Lỗi', mau: 'bg-red-500 text-white' },
}

// Tiêu đề ảnh dài hơn mức này thì chữ trên ảnh sẽ nhỏ, khó đọc
const TIEU_DE_TOI_DA = 70

// `tiktok`: đã kết nối TikTok thì hiện nút đăng cả 2 nền tảng
export default function TheBai({ bai, tiktok }: { bai: BaiViet; tiktok: boolean }) {
  const tagGoc = bai.hashtag.map((h) => `#${h}`).join(' ')
  const [tieuDe, setTieuDe] = useState(bai.tieu_de_anh)
  const [chuDe, setChuDe] = useState(bai.chu_de)
  const [noiDung, setNoiDung] = useState(bai.noi_dung)
  const [hashtag, setHashtag] = useState(tagGoc)
  const [dangLam, startTransition] = useTransition()
  const [viec, setViec] = useState<Viec | null>(null)

  const choDang = bai.trang_thai === 'nhap' || bai.trang_thai === 'da_dang'
  const khoa = bai.trang_thai === 'da_dang'
  const daSua = tieuDe !== bai.tieu_de_anh || chuDe !== bai.chu_de || noiDung !== bai.noi_dung || hashtag !== tagGoc
  const sua = { tieu_de_anh: tieuDe, chu_de: chuDe, noi_dung: noiDung, hashtag }
  const soChu = noiDung.trim().split(/\s+/).filter(Boolean).length
  // Ảnh đổi khi tiêu đề / chủ đề / màu đã lưu thay đổi
  const urlAnh = `/anh/${bai.id}?v=${encodeURIComponent(`${bai.tieu_de_anh}|${bai.chu_de}|${bai.mau_anh}`)}`

  const chay = (ten: Viec, viecLam: () => Promise<{ ok: boolean; loi?: string }>, xong: string) => {
    setViec(ten)
    startTransition(async () => {
      const kq = await viecLam()
      thongBao(kq.ok ? 'ok' : 'loi', kq.ok ? xong : (kq.loi ?? 'Có lỗi'))
      setViec(null)
    })
  }

  const luu = () => chay('luu', () => luuBai(bai.id, sua), 'Đã lưu thay đổi')

  // Ctrl + S (Cmd + S trên Mac) khi đang gõ trong thẻ này thì lưu luôn
  const phim = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      if (daSua && !khoa && !dangLam) luu()
    }
  }

  const saoChep = async () => {
    const chu = taoChuThich({ noi_dung: noiDung, hashtag: tachHashtag(hashtag), nguon_ten: bai.nguon_ten, nguon_link: bai.nguon_link })
    await navigator.clipboard.writeText(chu)
    thongBao('ok', 'Đã sao chép nội dung bài đăng')
  }

  const nhan = NHAN[bai.trang_thai]

  return (
    <article onKeyDown={phim} className="the grid gap-5 p-4 sm:p-5 md:grid-cols-[280px_1fr]">
      {/* Ảnh minh họa */}
      <div className="space-y-3">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlAnh} alt={bai.tieu_de_anh} className="aspect-square w-full rounded-xl bg-slate-200 object-cover" />
          {/* Góc phải ảnh không có chữ nên đặt nhãn ở đó */}
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
            {bai.fb_post_id && (
              <span title="Đã lên Facebook" className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow">
                <IconFacebook className="h-3.5 w-3.5" />
              </span>
            )}
            {bai.tiktok_publish_id && (
              <span title="Đã lên TikTok" className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white shadow">
                <IconTikTok className="h-3.5 w-3.5" />
              </span>
            )}
            <span className={`chip shadow ${nhan.mau}`}>{nhan.chu}</span>
          </div>
        </div>

        {!khoa && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">Màu ảnh</span>
            <div className="flex gap-1.5">
              {BANG_MAU.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={dangLam}
                  onClick={() => chay('mau', () => doiMauAnh(bai.id, i), 'Đã đổi màu ảnh')}
                  aria-label={`Màu ${i + 1}`}
                  aria-pressed={bai.mau_anh === i}
                  className={`h-7 w-7 rounded-full ring-offset-2 transition hover:scale-110 ${
                    bai.mau_anh === i ? 'ring-2 ring-slate-900' : ''
                  }`}
                  style={{ backgroundImage: `linear-gradient(135deg, ${m.nen1}, ${m.nen2})` }}
                />
              ))}
            </div>
          </div>
        )}
        <a href={urlAnh} download={`anh-${bai.id.slice(0, 8)}.png`} className="btn btn-phu w-full">
          <IconTai /> Tải ảnh
        </a>
      </div>

      {/* Nội dung */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="chip bg-slate-100 text-slate-700">{bai.nguon_ten}</span>
          <span suppressHydrationWarning title={gio(bai.tao_luc)}>
            Soạn {truoc(bai.tao_luc)}
          </span>
          {bai.dang_luc && (
            <span suppressHydrationWarning title={gio(bai.dang_luc)}>
              · Đăng {truoc(bai.dang_luc)}
            </span>
          )}
          {daSua && <span className="chip ml-auto bg-amber-100 text-amber-800">● Chưa lưu</span>}
        </div>
        <a
          href={bai.nguon_link}
          target="_blank"
          rel="noreferrer"
          className="-mt-2 flex items-start gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600"
        >
          <span className="line-clamp-2">{bai.tieu_de_goc}</span>
          <IconMo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        </a>

        {bai.loi && !bai.fb_post_id && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{bai.loi}</p>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
          <div>
            <label className="label" htmlFor={`tieu-de-${bai.id}`}>
              Tiêu đề trên ảnh
              <span className={tieuDe.length > TIEU_DE_TOI_DA ? 'text-red-500' : 'font-normal text-slate-400'}>
                {tieuDe.length}/{TIEU_DE_TOI_DA}
              </span>
            </label>
            <input id={`tieu-de-${bai.id}`} className="input font-semibold" value={tieuDe} onChange={(e) => setTieuDe(e.target.value)} disabled={khoa} />
          </div>
          <div>
            <label className="label" htmlFor={`chu-de-${bai.id}`}>Chủ đề</label>
            <input id={`chu-de-${bai.id}`} className="input" value={chuDe} onChange={(e) => setChuDe(e.target.value)} disabled={khoa} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor={`noi-dung-${bai.id}`}>
            Nội dung bài đăng
            <span className="font-normal text-slate-400">
              {soChu} chữ<span className="hidden sm:inline"> · nguồn và link tự thêm cuối bài</span>
            </span>
          </label>
          <textarea
            id={`noi-dung-${bai.id}`}
            className="input min-h-60 resize-y leading-relaxed"
            value={noiDung}
            onChange={(e) => setNoiDung(e.target.value)}
            disabled={khoa}
          />
        </div>

        <div>
          <label className="label" htmlFor={`hashtag-${bai.id}`}>Hashtag</label>
          {khoa ? (
            <Tags ds={tachHashtag(hashtag)} />
          ) : (
            <>
              <input id={`hashtag-${bai.id}`} className="input" value={hashtag} onChange={(e) => setHashtag(e.target.value)} placeholder="#CongNghe #AI" />
              <div className="mt-2">
                <Tags ds={tachHashtag(hashtag)} />
              </div>
            </>
          )}
        </div>

        {/* Thanh thao tác */}
        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {tiktok && choDang && !bai.fb_post_id && !bai.tiktok_publish_id && (
            <button
              disabled={dangLam}
              onClick={() => {
                if (confirm('Đăng bài này lên cả Facebook và TikTok?'))
                  chay('ca_hai', () => dangCaHai(bai.id, sua, {}), 'Đã đăng lên Facebook và TikTok')
              }}
              className="btn btn-ca-hai"
              title="TikTok tự thêm nhạc"
            >
              {viec === 'ca_hai' ? <Xoay /> : <><IconFacebook /><IconTikTok /></>}
              {viec === 'ca_hai' ? 'Đang đăng… (~20 giây)' : 'Đăng cả 2'}
            </button>
          )}
          {choDang && !bai.fb_post_id && (
            <button
              disabled={dangLam}
              onClick={() => {
                if (confirm('Đăng bài này lên Fanpage?')) chay('fb', () => dangBai(bai.id, sua), 'Đã đăng lên Facebook')
              }}
              className="btn btn-fb"
            >
              {viec === 'fb' ? <Xoay /> : <IconFacebook />}
              {viec === 'fb' ? 'Đang đăng…' : 'Đăng Facebook'}
            </button>
          )}
          {bai.fb_post_id && (
            <a href={`https://www.facebook.com/${bai.fb_post_id}`} target="_blank" rel="noreferrer" className="btn btn-phu text-blue-600">
              <IconFacebook /> Xem trên Facebook <IconMo className="h-3.5 w-3.5" />
            </a>
          )}
          {tiktok && choDang && !bai.fb_post_id && !bai.tiktok_publish_id && (
            <span className="hidden items-center gap-1 text-xs text-slate-400 lg:flex">
              <IconNhac className="h-3.5 w-3.5" /> TikTok tự thêm nhạc
            </span>
          )}

          <div className="ml-auto flex flex-wrap gap-1.5">
            {!khoa && (
              <NutPhu onClick={luu} disabled={dangLam || !daSua} dangChay={viec === 'luu'} icon={<IconLuu />} title="Ctrl + S">
                Lưu
              </NutPhu>
            )}
            <NutPhu onClick={saoChep} icon={<IconChep />}>Sao chép</NutPhu>
            {bai.trang_thai === 'nhap' && (
              <NutPhu
                onClick={() => chay('trang_thai', () => doiTrangThai(bai.id, 'bo_qua'), 'Đã chuyển sang Bỏ qua')}
                disabled={dangLam}
                dangChay={viec === 'trang_thai'}
                icon={<IconBo />}
              >
                Bỏ qua
              </NutPhu>
            )}
            {(bai.trang_thai === 'bo_qua' || bai.trang_thai === 'loi') && (
              <NutPhu
                onClick={() => chay('trang_thai', () => doiTrangThai(bai.id, 'nhap'), 'Đã đưa về Chờ duyệt')}
                disabled={dangLam}
                dangChay={viec === 'trang_thai'}
                icon={<IconLai />}
              >
                Đưa về chờ duyệt
              </NutPhu>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

function NutPhu({
  onClick,
  disabled,
  dangChay,
  icon,
  title,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  dangChay?: boolean
  icon: ReactNode
  title?: string
  children: ReactNode
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} className="btn btn-nhat px-3">
      {dangChay ? <Xoay /> : icon}
      {children}
    </button>
  )
}

export function Tags({ ds, noiBat = [] }: { ds: string[]; noiBat?: string[] }) {
  if (!ds.length) return <span className="text-xs text-slate-400">Chưa có hashtag</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {ds.map((h) => (
        <span
          key={h}
          className={`chip ${noiBat.includes(h) ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'}`}
        >
          #{h}
        </span>
      ))}
    </div>
  )
}
