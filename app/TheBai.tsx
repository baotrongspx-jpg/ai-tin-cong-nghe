'use client'

import { useState, useTransition, type KeyboardEvent } from 'react'
import type { BaiViet } from '@/lib/db'
import { BANG_MAU } from '@/lib/bangMau'
import { taoChuThich, tachHashtag, urlAnh } from '@/lib/chuThich'
import { gio, truoc } from '@/lib/thoiGian'
import { dangBai, dangCaHai, doiMauAnh, doiTrangThai, luuBai, type NoiHen } from './actions'
import { thongBao } from './ThongBao'
import KhungHenGio from './KhungHenGio'
import ChonAnhNen from './ChonAnhNen'
import { CotPhai, LuuY, NutQuyetDinh, ThongTinBai } from './PhanDuyet'
import {
  IconBoQua,
  IconBut,
  IconChep,
  IconDongHo,
  IconFacebook,
  IconLai,
  IconLuu,
  IconMo,
  IconTai,
  IconTikTok,
  IconXongTron,
  Xoay,
} from './BieuTuong'

type Viec = 'fb' | 'ca_hai' | 'luu' | 'mau' | 'trang_thai'

const NHAN: Record<BaiViet['trang_thai'], { chu: string; mau: string }> = {
  nhap: { chu: 'Chờ duyệt', mau: 'bg-amber-400 text-amber-950' },
  da_dang: { chu: 'Đã đăng', mau: 'bg-emerald-500 text-white' },
  bo_qua: { chu: 'Bỏ qua', mau: 'bg-slate-500 text-white' },
  loi: { chu: 'Lỗi', mau: 'bg-red-500 text-white' },
}

// Tiêu đề ảnh dài hơn mức này thì chữ trên ảnh sẽ nhỏ, khó đọc
const TIEU_DE_TOI_DA = 70

// Thẻ một bài: cột ảnh | cột soạn nội dung | cột thông tin + quyết định duyệt (màn hình hẹp thì xếp xuống dưới).
// `tiktok`: đã kết nối TikTok thì hiện nút đăng cả 2 nền tảng và hẹn giờ TikTok.
// `henFb` / `henTikTok`: giờ đã hẹn đăng (nếu có). `gioVang`: giờ gợi ý khi hẹn giờ.
export default function TheBai({
  bai,
  tiktok,
  henFb,
  henTikTok,
  gioVang,
}: {
  bai: BaiViet
  tiktok: boolean
  henFb: string | null
  henTikTok: string | null
  gioVang: { gio: number[]; tuSoLieu: boolean }
}) {
  const tagGoc = bai.hashtag.map((h) => `#${h}`).join(' ')
  const [tieuDe, setTieuDe] = useState(bai.tieu_de_anh)
  const [chuDe, setChuDe] = useState(bai.chu_de)
  const [noiDung, setNoiDung] = useState(bai.noi_dung)
  const [hashtag, setHashtag] = useState(tagGoc)
  const [dangLam, startTransition] = useTransition()
  const [viec, setViec] = useState<Viec | null>(null)

  const choDang = bai.trang_thai === 'nhap' || bai.trang_thai === 'da_dang'
  const daHen = !!henFb || !!henTikTok
  const khoa = bai.trang_thai === 'da_dang'
  const daSua = tieuDe !== bai.tieu_de_anh || chuDe !== bai.chu_de || noiDung !== bai.noi_dung || hashtag !== tagGoc
  const sua = { tieu_de_anh: tieuDe, chu_de: chuDe, noi_dung: noiDung, hashtag }
  const soChu = noiDung.trim().split(/\s+/).filter(Boolean).length
  // Ảnh đổi khi tiêu đề / chủ đề / màu đã lưu thay đổi
  const anhGoc = urlAnh(bai)

  const chay = (ten: Viec, viecLam: () => Promise<{ ok: boolean; loi?: string; canhBao?: string }>, xong: string) => {
    setViec(ten)
    startTransition(async () => {
      const kq = await viecLam()
      thongBao(kq.ok && !kq.canhBao ? 'ok' : 'loi', kq.ok ? (kq.canhBao ? `${xong}. ${kq.canhBao}` : xong) : (kq.loi ?? 'Có lỗi'))
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

  const nhan = daHen ? { chu: '⏰ Đã hẹn', mau: 'bg-violet-600 text-white' } : NHAN[bai.trang_thai]

  // Nơi còn hẹn giờ được: bài chờ duyệt thì Facebook / TikTok / cả hai, bài đã lên Facebook thì chỉ TikTok
  const noiDuocHen: NoiHen[] = daHen
    ? []
    : bai.trang_thai === 'nhap'
      ? tiktok
        ? ['ca_hai', 'fb', 'tt']
        : ['fb']
      : bai.trang_thai === 'da_dang' && tiktok && !bai.tiktok_publish_id
        ? ['tt']
        : []

  return (
    <article
      onKeyDown={phim}
      className="the grid gap-5 p-4 sm:p-5 md:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_290px]"
    >
      {/* Cột 1: ảnh minh họa */}
      <div className="grid min-w-0 grid-cols-1 content-start gap-3">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlAnh(bai, 640)}
            alt={bai.tieu_de_anh}
            width={640}
            height={640}
            loading="lazy"
            decoding="async"
            className="aspect-square w-full rounded-xl bg-slate-200 object-cover shadow-sm"
          />
          {/* Góc phải ảnh không có chữ nên đặt nhãn ở đó */}
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
            {bai.fb_post_id && !henFb && (
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
                  className={`h-6 w-6 rounded-full ring-offset-2 transition hover:scale-110 ${bai.mau_anh === i ? 'ring-2 ring-slate-900' : ''}`}
                  style={{ backgroundImage: `linear-gradient(135deg, ${m.nen1}, ${m.nen2})` }}
                />
              ))}
            </div>
          </div>
        )}
        {!khoa && <ChonAnhNen baiId={bai.id} anhNen={bai.anh_nen ?? null} />}
        <a href={anhGoc} download={`anh-${bai.id.slice(0, 8)}.png`} className="btn btn-phu w-full">
          <IconTai /> Tải ảnh
        </a>
      </div>

      {/* Cột 2: nội dung */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-slate-500">
          <span className="chip bg-blue-50 text-blue-700">{bai.nguon_ten}</span>
          <span suppressHydrationWarning title={gio(bai.tao_luc)}>
            • Soạn {truoc(bai.tao_luc)}
          </span>
          {bai.dang_luc && !henFb && (
            <span suppressHydrationWarning title={gio(bai.dang_luc)}>
              · Đăng {truoc(bai.dang_luc)}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1">
            {daSua && <span className="chip bg-amber-100 text-amber-800">● Chưa lưu</span>}
            <button
              onClick={saoChep}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              title="Sao chép nội dung bài đăng"
              aria-label="Sao chép nội dung bài đăng"
            >
              <IconChep className="h-4 w-4" />
            </button>
            <a
              href={bai.nguon_link}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              title="Mở bài gốc"
              aria-label="Mở bài gốc"
            >
              <IconMo className="h-4 w-4" />
            </a>
            <span className={`chip ${nhan.mau}`}>{nhan.chu}</span>
          </span>
        </div>

        <a
          href={bai.nguon_link}
          target="_blank"
          rel="noreferrer"
          className="text-xl font-extrabold leading-snug tracking-tight text-slate-900 hover:text-blue-700"
        >
          {bai.tieu_de_goc}
        </a>

        {bai.loi && !bai.fb_post_id && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{bai.loi}</p>}

        <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
          <div>
            <label className="label" htmlFor={`tieu-de-${bai.id}`}>
              <span className="flex items-center gap-1.5">
                <IconBut className="h-3.5 w-3.5" /> Tiêu đề trên ảnh
              </span>
              <span className={tieuDe.length > TIEU_DE_TOI_DA ? 'text-red-500' : 'font-normal text-slate-400'}>
                {tieuDe.length}/{TIEU_DE_TOI_DA}
              </span>
            </label>
            <input id={`tieu-de-${bai.id}`} className="input font-semibold" value={tieuDe} onChange={(e) => setTieuDe(e.target.value)} disabled={khoa} />
          </div>
          <div>
            <label className="label" htmlFor={`chu-de-${bai.id}`}>
              Chủ đề
            </label>
            <input id={`chu-de-${bai.id}`} className="input" value={chuDe} onChange={(e) => setChuDe(e.target.value)} disabled={khoa} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor={`noi-dung-${bai.id}`}>
            <span># Nội dung bài đăng</span>
            <span className="font-normal text-slate-400">
              {soChu} chữ<span className="hidden sm:inline"> · nguồn và link tự thêm cuối bài</span>
            </span>
          </label>
          <textarea
            id={`noi-dung-${bai.id}`}
            className="input min-h-56 resize-y leading-relaxed"
            value={noiDung}
            onChange={(e) => setNoiDung(e.target.value)}
            disabled={khoa}
          />
        </div>

        <div>
          <label className="label" htmlFor={`hashtag-${bai.id}`}>
            Hashtag
          </label>
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

        {!khoa && (
          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <button onClick={luu} disabled={dangLam || !daSua} className="btn btn-phu" title="Ctrl + S">
              {viec === 'luu' ? <Xoay /> : <IconLuu />} Lưu thay đổi
            </button>
            <span className="text-xs text-slate-400">Ctrl + S để lưu nhanh · bấm Đăng cũng tự lưu</span>
          </div>
        )}
      </div>

      {/* Cột 3: thông tin + quyết định */}
      <CotPhai>
        <ThongTinBai bai={bai} />
        <section className="space-y-2.5">
          <h3 className="text-sm font-bold text-slate-800">Quyết định duyệt bài</h3>
          {choDang && !bai.fb_post_id && !daHen && (
            <NutQuyetDinh
              mau="xanhLa"
              icon={<IconXongTron className="h-5 w-5" />}
              ten="Duyệt & đăng Facebook"
              moTa="Đăng ngay lên Fanpage"
              disabled={dangLam}
              dangChay={viec === 'fb'}
              onClick={() => {
                if (confirm('Đăng bài này lên Fanpage?')) chay('fb', () => dangBai(bai.id, sua), 'Đã đăng lên Facebook')
              }}
            />
          )}
          {tiktok && choDang && !bai.fb_post_id && !bai.tiktok_publish_id && !daHen && (
            <NutQuyetDinh
              mau="caHai"
              icon={
                <span className="flex -space-x-1">
                  <IconFacebook className="h-4 w-4" />
                  <IconTikTok className="h-4 w-4" />
                </span>
              }
              ten="Đăng cả Facebook + TikTok"
              moTa="Đăng ngay lên 2 nền tảng"
              disabled={dangLam}
              dangChay={viec === 'ca_hai'}
              onClick={() => {
                if (confirm('Đăng bài này lên cả Facebook và TikTok?'))
                  chay('ca_hai', () => dangCaHai(bai.id, sua, {}), 'Đã đăng lên Facebook và TikTok')
              }}
            />
          )}
          <KhungHenGio
            baiId={bai.id}
            sua={sua}
            noiDuocHen={noiDuocHen}
            henFb={henFb}
            henTikTok={henTikTok}
            gioVang={gioVang}
            nutMo={(moKhung) => (
              <NutQuyetDinh
                mau="xanh"
                icon={<IconDongHo className="h-5 w-5" />}
                ten={noiDuocHen.length === 1 && noiDuocHen[0] === 'tt' ? 'Hẹn giờ đăng TikTok' : 'Hẹn giờ đăng'}
                moTa="Chọn thời gian đăng bài"
                disabled={dangLam}
                onClick={moKhung}
              />
            )}
          />
          {bai.fb_post_id && !henFb && (
            <NutQuyetDinh
              mau="fb"
              icon={<IconFacebook className="h-5 w-5" />}
              ten="Xem trên Facebook"
              moTa="Mở bài đã đăng trên Fanpage"
              href={`https://www.facebook.com/${bai.fb_post_id}`}
            />
          )}
          {bai.trang_thai === 'nhap' && !daHen && (
            <NutQuyetDinh
              mau="xam"
              icon={<IconBoQua className="h-5 w-5" />}
              ten="Bỏ qua"
              moTa="Không đăng bài này"
              disabled={dangLam}
              dangChay={viec === 'trang_thai'}
              onClick={() => chay('trang_thai', () => doiTrangThai(bai.id, 'bo_qua'), 'Đã chuyển sang Bỏ qua')}
            />
          )}
          {(bai.trang_thai === 'bo_qua' || bai.trang_thai === 'loi') && (
            <NutQuyetDinh
              mau="xanh"
              icon={<IconLai className="h-5 w-5" />}
              ten="Đưa về chờ duyệt"
              moTa="Duyệt lại bài này"
              disabled={dangLam}
              dangChay={viec === 'trang_thai'}
              onClick={() => chay('trang_thai', () => doiTrangThai(bai.id, 'nhap'), 'Đã đưa về Chờ duyệt')}
            />
          )}
        </section>
        <LuuY>Kiểm tra kỹ nội dung, hình ảnh và nguồn tin trước khi đăng. Bài đã đăng thì không sửa được nữa.</LuuY>
      </CotPhai>
    </article>
  )
}

export function Tags({ ds, noiBat = [] }: { ds: string[]; noiBat?: string[] }) {
  if (!ds.length) return <span className="text-xs text-slate-400">Chưa có hashtag</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {ds.map((h) => (
        <span key={h} className={`chip ${noiBat.includes(h) ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'}`}>
          #{h}
        </span>
      ))}
    </div>
  )
}
