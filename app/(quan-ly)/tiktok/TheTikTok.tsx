'use client'

import { useEffect, useState, useSyncExternalStore, useTransition } from 'react'
import Link from 'next/link'
import type { BaiViet } from '@/lib/db'
import { ghepHashtagTikTok, urlAnh } from '@/lib/chuThich'
import { gio, truoc } from '@/lib/thoiGian'
import { DS_GIONG } from '@/lib/dsGiong'
import { dichLoiTikTok } from '@/lib/loiTikTok'
import { boDanhDauTikTok, dangCaHai, dangTikTok } from '@/app/actions'
import { thongBao } from '@/app/ThongBao'
import KhungHenGio from '@/app/KhungHenGio'
import { Tags } from '@/app/TheBai'
import { IconDongHo, IconFacebook, IconLai, IconNhac, IconTikTok, Xoay } from '@/app/BieuTuong'
import { CotPhai, LuuY, NutQuyetDinh, ThongTinBai } from '@/app/PhanDuyet'

type Viec = 'tt' | 'ca_hai' | 'bo_danh_dau'

// Giọng đọc chọn lần trước, nhớ trên trình duyệt này và dùng chung cho mọi thẻ bài
const GIONG_DAU = 'Kore'
const KHOA_GIONG = 'giong_tiktok'
let giongTam = GIONG_DAU // khi trình duyệt chặn localStorage (chế độ riêng tư) vẫn đổi giọng được
const docGiong = () => {
  try {
    const g = localStorage.getItem(KHOA_GIONG)
    return g && DS_GIONG.some(([ma]) => ma === g) ? g : giongTam
  } catch {
    return giongTam
  }
}
const ngheGiong = (bao: () => void) => {
  window.addEventListener('doi-giong', bao)
  window.addEventListener('storage', bao)
  return () => {
    window.removeEventListener('doi-giong', bao)
    window.removeEventListener('storage', bao)
  }
}
const luuGiong = (g: string) => {
  giongTam = g
  try {
    localStorage.setItem(KHOA_GIONG, g)
  } catch {}
  window.dispatchEvent(new Event('doi-giong'))
}

// Nghe thử giọng: mẫu tạo một lần cho mỗi giọng rồi lưu lại (lần đầu tốn 1 lượt Gemini, sau đó miễn phí).
// Một trình phát chung cho cả trang: bấm nghe giọng khác thì giọng đang phát tự dừng.
let trinhPhat: HTMLAudioElement | null = null
const daTai = new Map<string, string>() // giọng → link blob đã tải trong phiên này
const ngheTrinhPhat = (bao: () => void) => {
  window.addEventListener('doi-mau-giong', bao)
  return () => window.removeEventListener('doi-mau-giong', bao)
}
const dangPhat = () => (trinhPhat && !trinhPhat.paused ? trinhPhat.dataset.giong ?? null : null)
const baoDoi = () => window.dispatchEvent(new Event('doi-mau-giong'))

function NutNgheThu({ giong }: { giong: string }) {
  const phat = useSyncExternalStore(ngheTrinhPhat, dangPhat, () => null)
  const [dangTai, setDangTai] = useState(false)
  const dangNghe = phat === giong
  const bam = async () => {
    if (!trinhPhat) {
      trinhPhat = new Audio()
      for (const su of ['play', 'pause', 'ended', 'error']) trinhPhat.addEventListener(su, baoDoi)
    }
    if (dangNghe) return trinhPhat.pause()
    trinhPhat.pause()
    let link = daTai.get(giong)
    if (!link) {
      setDangTai(true)
      try {
        const res = await fetch(`/api/giong-mau/${giong}`)
        if (!res.ok) throw new Error((await res.text()) || `Lỗi ${res.status}`)
        link = URL.createObjectURL(await res.blob())
        daTai.set(giong, link)
      } catch (e) {
        thongBao('loi', `Chưa nghe thử được giọng ${giong}: ${e instanceof Error ? e.message : 'lỗi'}`)
        return
      } finally {
        setDangTai(false)
      }
    }
    trinhPhat.src = link
    trinhPhat.dataset.giong = giong
    trinhPhat.play().catch(() => thongBao('loi', 'Không phát được giọng mẫu'))
  }
  return (
    <button
      type="button"
      onClick={bam}
      disabled={dangTai}
      title={dangNghe ? 'Dừng' : `Nghe thử giọng ${giong}`}
      className="btn btn-nhat shrink-0 px-3"
    >
      {dangTai ? <Xoay /> : dangNghe ? '■' : '▶'} <span className="text-xs">{dangNghe ? 'Dừng' : 'Nghe'}</span>
    </button>
  )
}

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
  const giong = useSyncExternalStore(ngheGiong, docGiong, () => GIONG_DAU)
  const chonGiong = (g: string) => {
    luuGiong(g)
    setVideo(null) // video đang xem là giọng cũ
  }
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
      const res = await fetch(`/api/video/${bai.id}?giong=${giong}`, { cache: 'no-store' })
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

  const suaGoc = { tieu_de_anh: bai.tieu_de_anh, chu_de: bai.chu_de, noi_dung: bai.noi_dung, hashtag: bai.hashtag.join(' ') }

  return (
    <article className="the grid gap-5 p-4 sm:p-5 md:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_290px]">
      {/* Cột 1: ảnh / video xem trước + giọng đọc. min-w-0 + grid-cols-1: chữ dài trong ô chọn giọng không làm cột phình ra */}
      <div className="grid min-w-0 grid-cols-1 content-start gap-3">
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
              className="aspect-square w-full rounded-xl bg-slate-200 object-cover shadow-sm"
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
            <div className="grid min-w-0 grid-cols-1 gap-1">
              <label htmlFor={`giong-${bai.id}`} className="text-xs font-semibold text-slate-500">
                Giọng đọc
              </label>
              <div className="flex min-w-0 gap-1.5">
                <select
                  id={`giong-${bai.id}`}
                  value={giong}
                  disabled={dangDung || dangLam}
                  onChange={(e) => chonGiong(e.target.value)}
                  className="w-full min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800"
                >
                  {DS_GIONG.map(([ma, mo]) => (
                    <option key={ma} value={ma}>
                      {ma} — {mo}
                    </option>
                  ))}
                </select>
                <NutNgheThu giong={giong} />
              </div>
            </div>
            <button disabled={dangDung || dangLam} onClick={video ? () => setVideo(null) : xemTruoc} className="btn btn-phu w-full">
              {dangDung ? <Xoay /> : null}
              {dangDung ? 'Đang dựng video… (~1 phút)' : video ? 'Xem ảnh' : '▶ Xem trước video'}
            </button>
            {loiVideo && <p className="text-xs text-red-600">{loiVideo}</p>}
            {video && <p className="text-xs text-slate-400">Bấm Đăng (có lồng tiếng) sẽ dùng đúng video này. Sửa bài thì video tự dựng lại.</p>}
          </>
        )}
      </div>

      {/* Cột 2: nội dung sẽ đăng */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-slate-500">
          <span className="chip bg-blue-50 text-blue-700">{bai.nguon_ten}</span>
          <span suppressHydrationWarning title={gio(bai.tao_luc)}>
            • Soạn {truoc(bai.tao_luc)}
          </span>
          {daDang && bai.tiktok_dang_luc && (
            <span suppressHydrationWarning title={gio(bai.tiktok_dang_luc)}>
              · Lên TikTok {truoc(bai.tiktok_dang_luc)}
            </span>
          )}
          <span className={`chip ml-auto ${daDang ? 'bg-slate-900 text-white' : hen ? 'bg-violet-600 text-white' : 'bg-amber-400 text-amber-950'}`}>
            {daDang ? 'Đã đăng' : hen ? '⏰ Đã hẹn' : 'Chưa đăng'}
          </span>
        </div>

        <h2 className="text-xl font-extrabold leading-snug tracking-tight">{bai.tieu_de_anh}</h2>

        {bai.tiktok_loi && !daDang && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            <b>Lần đăng trước lỗi:</b> {dichLoiTikTok(bai.tiktok_loi)}
          </p>
        )}

        {/* Xem trước mô tả đúng thứ tự sẽ đăng: nội dung, nguồn, hashtag */}
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="mb-1.5 text-xs font-semibold text-slate-500"># Mô tả trên TikTok</div>
          <p className={`whitespace-pre-wrap text-sm leading-relaxed ${moRong ? '' : 'line-clamp-5'}`}>{bai.noi_dung.trim()}</p>
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
                trang duyệt bài
              </Link>
              .
            </p>
          )}
        </div>

        {!daDang && taiKhoan && !hen && (
          <div className="mt-auto space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
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
              {!longTieng && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <IconNhac className="h-3.5 w-3.5" /> Nhạc tự động
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
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
              {longTieng && ' Lồng tiếng: video dọc, ảnh bài + giọng AI đọc + phụ đề (tốn 1 lượt giọng Gemini). Giọng lỗi thì tự đăng dạng ảnh.'}
            </p>
          </div>
        )}
      </div>

      {/* Cột 3: thông tin + đăng */}
      <CotPhai>
        <ThongTinBai bai={bai} />
        <section className="space-y-2.5">
          <h3 className="text-sm font-bold text-slate-800">Đăng lên TikTok</h3>
          {!daDang && !taiKhoan && <p className="text-sm text-slate-500">Kết nối tài khoản TikTok (góc trên trang) để đăng.</p>}
          {!daDang && !hen && taiKhoan && (
            <>
              <NutQuyetDinh
                mau="tt"
                icon={<IconTikTok className="h-5 w-5" />}
                ten="Đăng TikTok"
                moTa={viec === 'tt' ? (longTieng ? 'Đang dựng video… (~1-2 phút)' : 'Đang đăng… (~15 giây)') : longTieng ? `Video lồng tiếng giọng ${giong}` : 'Bài ảnh, TikTok tự thêm nhạc'}
                disabled={dangLam}
                dangChay={viec === 'tt'}
                onClick={() => chay('tt', () => dangTikTok(bai.id, { tatBinhLuan: !choBinhLuan, longTieng, giong }), 'Đã gửi lên TikTok')}
              />
              {/* Bài chờ duyệt chưa lên Facebook: đăng luôn cả hai nơi */}
              {bai.trang_thai === 'nhap' && !bai.fb_post_id && (
                <NutQuyetDinh
                  mau="caHai"
                  icon={
                    <span className="flex -space-x-1">
                      <IconFacebook className="h-4 w-4" />
                      <IconTikTok className="h-4 w-4" />
                    </span>
                  }
                  ten="Đăng cả Facebook + TikTok"
                  moTa={viec === 'ca_hai' ? 'Đang đăng… (~1-2 phút)' : 'Đăng ngay lên 2 nền tảng'}
                  disabled={dangLam}
                  dangChay={viec === 'ca_hai'}
                  onClick={() => {
                    if (confirm('Đăng bài này lên cả Facebook và TikTok?'))
                      chay('ca_hai', () => dangCaHai(bai.id, suaGoc, { tatBinhLuan: !choBinhLuan, longTieng, giong }), 'Đã đăng lên Facebook và TikTok')
                  }}
                />
              )}
            </>
          )}
          {!daDang && taiKhoan && (
            <KhungHenGio
              baiId={bai.id}
              sua={suaGoc}
              noiDuocHen={hen ? [] : ['tt']}
              henFb={null}
              henTikTok={hen}
              gioVang={gioVang}
              nutMo={(moKhung) => (
                <NutQuyetDinh
                  mau="xanh"
                  icon={<IconDongHo className="h-5 w-5" />}
                  ten="Hẹn giờ đăng TikTok"
                  moTa="Chọn thời gian đăng bài"
                  disabled={dangLam}
                  onClick={moKhung}
                />
              )}
            />
          )}
          {daDang && (
            <NutQuyetDinh
              mau="xam"
              icon={<IconLai className="h-5 w-5" />}
              ten="Đã xóa trên TikTok?"
              moTa="Đánh dấu chưa đăng để đăng lại"
              disabled={dangLam}
              dangChay={viec === 'bo_danh_dau'}
              onClick={() => {
                if (confirm('Bạn đã xóa bài này trên TikTok và muốn đăng lại?'))
                  chay('bo_danh_dau', () => boDanhDauTikTok(bai.id), 'Đã chuyển về "Chưa đăng"')
              }}
            />
          )}
        </section>
        <LuuY>Nghe thử giọng và xem trước video trước khi đăng. Gói Gemini miễn phí chỉ đọc được khoảng 10 lần mỗi ngày.</LuuY>
      </CotPhai>
    </article>
  )
}
