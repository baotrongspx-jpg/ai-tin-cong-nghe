import type { Metadata } from 'next'
import Image from 'next/image'
import { Dancing_Script } from 'next/font/google'
import type { ReactNode } from 'react'
import { ANH_MAC_DINH, diaChiAnhCV } from '@/lib/anhCV'
import { CONG_CU, DIA_CHI, DIEN_THOAI, DU_AN, EMAIL, KINH_NGHIEM, KY_NANG, MUC_TIEU, NGAY_SINH, SAN_SANG } from './duLieu'
import ChuChay from './ChuChay'
import DemSo from './DemSo'
import FormLienHe from './FormLienHe'
import HienDan from './HienDan'
import MenuCV from './MenuCV'
import RobotAI from './RobotAI'
import { BongBongRobot, KinhGui, NutHoiRobot } from './LoiChao'
import TheoDoiXem from './TheoDoiXem'
import TroLyRobot from './TroLyRobot'
import './cv.css'

const viTay = Dancing_Script({ subsets: ['vietnamese'], weight: ['600', '700'] })

export const metadata: Metadata = {
  title: 'Nông Bảo Trọng – CV cá nhân',
  description: 'Trợ lý Giám đốc · gần 2 năm vận hành cụm 12 kho SPX Express · Ứng tuyển Trợ lý tại Buôn Ma Thuột.',
  robots: { index: false, follow: false },
  metadataBase: new URL(process.env.SITE_URL ?? 'https://ai-tin-cong-nghe-wpy7.vercel.app'),
}

const MENU = [
  ['Trang chủ', '#trang-chu'],
  ['Giới thiệu', '#gioi-thieu'],
  ['Kinh nghiệm', '#kinh-nghiem'],
  ['Dự án', '#du-an'],
  ['Kỹ năng', '#ky-nang'],
  ['Mục tiêu', '#muc-tieu'],
  ['Liên hệ', '#lien-he'],
]

const SO_LIEU: [number, string, string][] = [
  [3, '+', 'Năm đi làm thực tế'],
  [12, '', 'Kho SPX vận hành cùng lúc'],
  [4, '', 'Dự án tự xây, đang dùng'],
  [3, '', 'Bài đăng Fanpage mỗi ngày'],
]

const CHUC_DANH = ['Trợ lý Giám đốc', 'Vận hành & Báo cáo số liệu', 'Đối soát · Điều phối · Soạn văn bản']

// Ba điểm mạnh rút từ kinh nghiệm thật trong CV
const THE_MANH: [keyof typeof BT, string, string][] = [
  ['bieuDo', 'Chắc số liệu', 'Đối soát cuối ngày cho 12 kho, tính hao hụt từng công đoạn. Số nào cũng có nguồn và được đối chiếu.'],
  ['chuong', 'Chủ động nhắc việc', 'Theo dõi tiến độ trong ngày, cảnh báo sớm khi có vấn đề thay vì chờ được hỏi.'],
  ['bongDen', 'Báo cáo kèm đề xuất', 'Mỗi báo cáo đi kèm hướng xử lý cụ thể để cấp trên quyết định nhanh.'],
]

const LOGO: Record<string, string> = { 'Công ty TNHH Trái Cây 001': '001', 'SPX Express': 'SPX', 'Giao Hàng Tiết Kiệm': 'GHTK', 'Thaco Trường Hải': 'THACO' }
const logoCua = (noi: string) => Object.entries(LOGO).find(([k]) => noi.startsWith(k))?.[1] ?? noi.slice(0, 3)

// Biểu tượng nét mảnh (kiểu Lucide), vẽ bằng SVG để không phải cài thêm thư viện
const BT = {
  lich: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  ghim: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  dt: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  thu: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  cap: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" /></>,
  mu: <><path d="m2 9 10-5 10 5-10 5z" /><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v6" /></>,
  bieuDo: <><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 6-6" /></>,
  chuong: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></>,
  bongDen: <><path d="M9 18h6M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z" /></>,
  dongHo: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  tim: <path d="M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20z" />,
  congCu: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />,
  tai: <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />,
  guiThu: <path d="m22 2-9.5 9.5M22 2l-7 20-3.5-8.5L3 10z" />,
  dung: <path d="m5 12 5 5L20 7" />,
  moRa: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  ngoac: <path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6" />,
}

function Icon({ ten, className = 'h-5 w-5' }: { ten: keyof typeof BT; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {BT[ten]}
    </svg>
  )
}

// Thẻ trắng dùng chung: nổi nhẹ khi rê chuột
const THE =
  'rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,27,61,0.04),0_8px_24px_-12px_rgba(15,27,61,0.12)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-16px_rgba(30,58,138,0.28)] hover:ring-blue-200 motion-reduce:hover:translate-y-0'

// Một mục lớn của trang: số thứ tự + nhãn nhỏ + tiêu đề lớn, nền trắng / xám xen kẽ
function Muc({ id, so, nhan, tieuDe, moTa, nenXam, children }: { id: string; so: string; nhan: string; tieuDe: string; moTa?: string; nenXam?: boolean; children: ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-28 py-16 sm:py-20 ${nenXam ? 'bg-slate-50' : 'bg-white'}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <HienDan>
          <p className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
            <span className="tabular-nums text-slate-300">{so}</span>
            <span className="h-px w-8 bg-blue-600/40" />
            {nhan}
          </p>
          <h2 className="mt-3 max-w-3xl text-balance text-3xl font-black tracking-tight text-[#0f1b3d] sm:text-4xl">{tieuDe}</h2>
          {moTa && <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-500">{moTa}</p>}
        </HienDan>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  )
}

function Nhan({ children, toi }: { children: ReactNode; toi?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        toi ? 'bg-white/10 text-white/85 ring-1 ring-white/15' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
      }`}
    >
      {children}
    </span>
  )
}

export default async function TrangCV() {
  // Ảnh đổi ở /cv/doi-anh (lưu trong cơ sở dữ liệu); đổi xong trang được làm mới ngay
  const anhDaiDien = await diaChiAnhCV()
  const thongTin: [keyof typeof BT, string, string, string?][] = [
    ['lich', 'Ngày sinh', NGAY_SINH],
    ['ghim', 'Địa chỉ', DIA_CHI],
    ['dt', 'Điện thoại', DIEN_THOAI, `tel:${DIEN_THOAI.replace(/\s/g, '')}`],
    ['thu', 'Email', EMAIL, `mailto:${EMAIL}`],
  ]

  return (
    <div id="trang-chu" className="min-h-screen bg-white text-slate-700">
      <MenuCV
        menu={MENU}
        logo={
          <a href="#trang-chu" className="flex shrink-0 items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-sm font-black text-white shadow-md shadow-blue-900/50">
              TB
            </span>
            <span className="leading-tight">
              <span className="block font-extrabold">Nông Bảo Trọng</span>
              <span className="block text-[11px] font-semibold tracking-[0.2em] text-blue-300">CV CÁ NHÂN</span>
            </span>
          </a>
        }
        nut={
          <a
            href="/cv/ban-in"
            className="ml-auto flex shrink-0 items-center gap-2 rounded-lg border border-blue-400 px-3.5 py-2 text-sm font-bold text-blue-200 transition hover:bg-blue-500 hover:text-white lg:ml-2"
          >
            <Icon ten="tai" className="h-4 w-4" /> Tải CV PDF
          </a>
        }
      />

      {/* ——— Phần mở đầu ——— */}
      <section className="relative overflow-hidden bg-[#0b1631] text-white">
        <Image src="/cv/nen.jpg" alt="" fill priority sizes="100vw" className="object-cover object-right opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1631] via-[#0b1631]/90 to-[#0b1631]/20" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0b1631] to-transparent" />
        <div className="cv-luoi absolute inset-0" />
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-10 top-1/3 h-64 w-64 rounded-full bg-sky-400/15 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-24 pt-10 sm:px-6 md:grid-cols-[300px_1fr] lg:grid-cols-[320px_1fr_220px] lg:pb-28 lg:pt-14">
          <HienDan className="mx-auto w-full max-w-[280px] md:max-w-none">
            <div className="relative">
              <div className="absolute -inset-2 rounded-[28px] bg-gradient-to-br from-blue-500/60 to-amber-400/40 blur-md" />
              <Image
                src={anhDaiDien}
                unoptimized={anhDaiDien !== ANH_MAC_DINH}
                alt="Ảnh chân dung Nông Bảo Trọng"
                width={512}
                height={640}
                priority
                className="relative aspect-[4/5] w-full rounded-3xl object-cover object-top ring-2 ring-white/20"
              />
            </div>
            <p className={`${viTay.className} mt-4 text-center text-2xl leading-snug text-blue-300`}>
              Không ngừng học hỏi
              <br />
              Không ngừng phát triển
            </p>
          </HienDan>

          <HienDan tre={120}>
            <KinhGui />
            <p className="mb-4 flex w-fit items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Sẵn sàng nhận việc tại Buôn Ma Thuột
            </p>
            <p className="text-lg font-semibold text-blue-300">Xin chào, tôi là</p>
            <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-6xl">
              NÔNG BẢO{' '}
              <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">TRỌNG</span>
            </h1>
            <p className="mt-4 inline-flex min-h-[2.25rem] items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold text-amber-300 ring-1 ring-white/15 sm:text-base">
              <ChuChay cau={CHUC_DANH} />
            </p>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/80 sm:text-base">
              Đang làm Trợ lý Giám đốc tại Công ty TNHH Trái Cây 001: kiểm soát sản lượng, báo cáo định kỳ, soạn hợp đồng với đối tác.
              Gần 2 năm vận hành cụm 12 kho SPX Express. Cẩn thận với số liệu, chủ động nhắc việc, luôn đi kèm đề xuất khi báo cáo.
            </p>

            <ul className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
              {thongTin.map(([icon, nhan, giaTri, href]) => (
                <li key={nhan} className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-500/20 text-blue-300 ring-1 ring-blue-400/30">
                    <Icon ten={icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block text-xs text-white/50">{nhan}</span>
                    {href ? (
                      <a href={href} className="block break-all text-sm font-semibold hover:text-blue-300">
                        {giaTri}
                      </a>
                    ) : (
                      <span className="block text-sm font-semibold">{giaTri}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/cv/ban-in" className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold shadow-lg shadow-blue-900/40 transition hover:bg-blue-500">
                <Icon ten="tai" className="h-5 w-5" /> Tải CV PDF
              </a>
              <a href="#lien-he" className="flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 font-bold transition hover:bg-white hover:text-[#0b1631]">
                <Icon ten="guiThu" className="h-5 w-5" /> Liên hệ ngay
              </a>
              <NutHoiRobot />
            </div>
          </HienDan>

          <HienDan tre={240} className="hidden lg:block">
            <BongBongRobot />
            <RobotAI ma="rb-lon" className="mx-auto h-60 w-full drop-shadow-[0_10px_30px_rgba(56,189,248,0.35)]" />
          </HienDan>
        </div>
      </section>

      {/* ——— Dải số liệu nổi bật ——— */}
      <div className="relative z-10 mx-auto -mt-12 max-w-6xl px-4 sm:px-6">
        <HienDan>
          <ul className="grid grid-cols-2 overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_-20px_rgba(15,27,61,0.35)] ring-1 ring-slate-200/70 lg:grid-cols-4">
            {SO_LIEU.map(([so, sau, nhan], i) => (
              <li
                key={nhan}
                className={`border-slate-100 px-5 py-6 text-center sm:py-7 ${i % 2 ? 'border-l' : ''} ${i > 1 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}
              >
                <p className="bg-gradient-to-br from-blue-700 to-sky-500 bg-clip-text text-4xl font-black text-transparent sm:text-5xl">
                  <DemSo den={so} sau={sau} />
                </p>
                <p className="mt-1.5 text-xs font-semibold text-slate-500 sm:text-sm">{nhan}</p>
              </li>
            ))}
          </ul>
        </HienDan>
      </div>

      <main>
        {/* ——— 01 Giới thiệu ——— */}
        <Muc
          id="gioi-thieu"
          so="01"
          nhan="Giới thiệu"
          tieuDe="Người trợ lý giúp Giám đốc nắm việc bằng số liệu"
          moTa="Từ kiểm tra chất lượng ở nhà máy, điều hành cụm 12 kho, đến trợ lý Giám đốc: mỗi công việc đều xoay quanh số liệu chính xác và tiến độ rõ ràng."
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="grid gap-4">
              {THE_MANH.map(([icon, ten, moTa], i) => (
                <HienDan key={ten} tre={i * 90}>
                  <div className={`${THE} flex h-full items-start gap-5 p-6`}>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-md shadow-blue-600/25">
                      <Icon ten={icon} className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="text-lg font-extrabold text-[#0f1b3d]">{ten}</h3>
                      <p className="mt-1 leading-relaxed text-slate-600">{moTa}</p>
                    </div>
                  </div>
                </HienDan>
              ))}
            </div>

            <HienDan tre={200}>
              <div className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1b3d] to-[#1e3a8a] p-6 text-white">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sky-400/20 blur-2xl" />
                <h3 className="relative text-sm font-bold uppercase tracking-[0.18em] text-blue-200">Thông tin nhanh</h3>
                <dl className="relative mt-4 space-y-3.5 text-sm">
                  {(
                    [
                      ['cap', 'Ứng tuyển', 'Trợ lý Giám đốc / Trợ lý văn phòng'],
                      ['ghim', 'Nơi làm việc', 'Buôn Ma Thuột, Đắk Lắk'],
                      ['dongHo', 'Thời gian', 'T2 – sáng T7, 8h–17h, tăng ca khi cần'],
                      ['lich', 'Năm sinh', NGAY_SINH.slice(-4)],
                    ] as const
                  ).map(([icon, nhan, giaTri]) => (
                    <div key={nhan} className="flex gap-3">
                      <Icon ten={icon} className="mt-0.5 h-[18px] w-[18px] shrink-0 text-sky-300" />
                      <div>
                        <dt className="text-xs text-white/55">{nhan}</dt>
                        <dd className="font-semibold">{giaTri}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
                <div className="relative mt-5 border-t border-white/10 pt-4">
                  <p className="mb-2 flex items-center gap-2 text-xs text-white/55">
                    <Icon ten="tim" className="h-4 w-4 text-pink-300" /> Sở thích
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Du lịch', 'Thể thao', 'Công nghệ', 'Âm nhạc'].map((s) => (
                      <Nhan key={s} toi>
                        {s}
                      </Nhan>
                    ))}
                  </div>
                </div>
              </div>
            </HienDan>
          </div>
        </Muc>

        {/* ——— 02 Kinh nghiệm ——— */}
        <Muc id="kinh-nghiem" so="02" nhan="Kinh nghiệm" tieuDe="Hành trình làm việc" moTa="Hơn 3 năm đi làm, từ nhà máy, kho vận đến văn phòng Giám đốc." nenXam>
          <ol className="relative space-y-6 md:space-y-8">
            {/* Đường nối các mốc */}
            <span className="absolute bottom-4 left-[19px] top-4 w-px bg-gradient-to-b from-blue-500 via-blue-200 to-transparent md:left-[219px]" aria-hidden />
            {KINH_NGHIEM.map((k, i) => {
              const [congTy, noiLam] = k.noi.split(' · ')
              return (
                <li key={k.chucDanh + k.noi} className="relative grid gap-3 pl-10 md:grid-cols-[200px_1fr] md:gap-10 md:pl-0">
                  <HienDan className="md:pt-6 md:text-right">
                    <p className="text-sm font-black tabular-nums text-blue-600">{k.thoiGian}</p>
                    {i === 0 && (
                      <span className="mt-1.5 inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                        Công việc hiện tại
                      </span>
                    )}
                  </HienDan>
                  <span
                    className={`absolute left-[12px] top-0.5 grid h-[15px] w-[15px] place-items-center rounded-full ring-4 md:left-[212px] md:top-7 ${
                      i === 0 ? 'bg-emerald-500 ring-emerald-100' : 'bg-blue-600 ring-blue-100'
                    }`}
                    aria-hidden
                  />
                  <HienDan tre={80}>
                    <article className={`${THE} p-5 sm:p-6`}>
                      <div className="flex items-start gap-4">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#0f1b3d] text-[11px] font-black tracking-tight text-amber-300">
                          {logoCua(k.noi)}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-lg font-extrabold leading-snug text-[#0f1b3d]">{k.chucDanh}</h3>
                          <p className="text-sm font-semibold text-slate-500">
                            {congTy}
                            {noiLam && <span className="font-normal text-slate-400"> · {noiLam}</span>}
                          </p>
                        </div>
                      </div>
                      <ul className="mt-4 space-y-2 text-[15px] leading-relaxed">
                        {k.viec.map((v) => (
                          <li key={v} className="flex gap-3">
                            <Icon ten="dung" className="mt-1 h-4 w-4 shrink-0 text-blue-600" />
                            {v}
                          </li>
                        ))}
                      </ul>
                    </article>
                  </HienDan>
                </li>
              )
            })}
          </ol>
        </Muc>

        {/* ——— 03 Dự án ——— */}
        <Muc
          id="du-an"
          so="03"
          nhan="Dự án"
          tieuDe="Tự xây công cụ để làm việc nhanh hơn"
          moTa="Không chỉ dùng công cụ có sẵn: những hệ thống dưới đây do tôi tự làm và đang được dùng thật hằng ngày."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {DU_AN.map((d, i) => (
              <HienDan key={d.ten} tre={(i % 2) * 90}>
                <article className={`${THE} group relative h-full overflow-hidden p-6 sm:p-7`}>
                  <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-blue-600 via-sky-400 to-amber-400 transition-transform duration-500 group-hover:scale-x-100" />
                  <div className="flex items-center justify-between">
                    <Nhan>{d.nhan}</Nhan>
                    <span className="text-3xl font-black tabular-nums text-slate-100 transition group-hover:text-blue-100">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="mt-4 text-xl font-extrabold text-[#0f1b3d]">{d.ten}</h3>
                  <p className="mt-2 leading-relaxed text-slate-600">{d.moTa}</p>
                  {d.link && (
                    <a
                      href={d.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800"
                    >
                      Xem trang <Icon ten="moRa" className="h-4 w-4" />
                    </a>
                  )}
                </article>
              </HienDan>
            ))}
          </div>
        </Muc>

        {/* ——— 04 Kỹ năng ——— */}
        <Muc id="ky-nang" so="04" nhan="Kỹ năng" tieuDe="Làm được gì, dùng được gì" nenXam>
          <div className="grid gap-5 lg:grid-cols-3">
            <HienDan>
              <div className={`${THE} h-full p-6`}>
                <h3 className="flex items-center gap-2.5 font-extrabold text-[#0f1b3d]">
                  <Icon ten="cap" className="h-5 w-5 text-blue-600" /> Chuyên môn
                </h3>
                <ul className="mt-4 space-y-2.5 text-[15px]">
                  {KY_NANG.map((k) => (
                    <li key={k} className="flex items-center gap-3">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-600 text-white">
                        <Icon ten="dung" className="h-3 w-3" />
                      </span>
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
            </HienDan>
            <HienDan tre={90}>
              <div className={`${THE} h-full p-6`}>
                <h3 className="flex items-center gap-2.5 font-extrabold text-[#0f1b3d]">
                  <Icon ten="congCu" className="h-5 w-5 text-blue-600" /> Công cụ
                </h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {CONG_CU.map((c) => (
                    <span key={c} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </HienDan>
            <HienDan tre={180}>
              <div className={`${THE} h-full p-6`}>
                <h3 className="flex items-center gap-2.5 font-extrabold text-[#0f1b3d]">
                  <Icon ten="dongHo" className="h-5 w-5 text-blue-600" /> Sẵn sàng
                </h3>
                <ul className="mt-4 space-y-2.5 text-[15px]">
                  {SAN_SANG.map((s) => (
                    <li key={s} className="flex items-start gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </HienDan>
          </div>
        </Muc>

        {/* ——— 05 Học vấn & mục tiêu ——— */}
        <Muc id="muc-tieu" so="05" nhan="Học vấn & Mục tiêu" tieuDe="Nền tảng và hướng đi">
          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <HienDan>
              <div id="hoc-van" className={`${THE} h-full scroll-mt-28 p-6`}>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon ten="mu" className="h-6 w-6" />
                </span>
                <p className="mt-4 text-sm font-black text-blue-600">Tốt nghiệp 2022</p>
                <h3 className="mt-1 text-lg font-extrabold leading-snug text-[#0f1b3d]">Trường Cao đẳng Phương Đông, Đà Nẵng</h3>
                <p className="mt-1 text-slate-500">Cao đẳng Công nghệ Ô tô</p>
                <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
                  Nền tảng kỹ thuật giúp tôi quen làm việc theo quy trình, checklist và tiêu chuẩn chất lượng.
                </p>
              </div>
            </HienDan>
            <ol className="grid gap-4 sm:grid-cols-3">
              {MUC_TIEU.map(([moc, noiDung], i) => (
                <HienDan key={moc} tre={i * 90}>
                  <li className={`${THE} relative h-full p-6`}>
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-full text-sm font-black ${
                        i === 2 ? 'bg-amber-400 text-[#0f1b3d]' : 'bg-[#0f1b3d] text-white'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <h3 className="mt-4 font-extrabold uppercase tracking-wide text-[#0f1b3d]">{moc}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{noiDung}</p>
                  </li>
                </HienDan>
              ))}
            </ol>
          </div>
        </Muc>

        {/* ——— Câu châm ngôn ——— */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0f1b3d] via-[#15286b] to-[#1e3a8a] py-16 text-white">
          <div className="cv-luoi absolute inset-0 opacity-60" />
          <HienDan className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
            <Icon ten="ngoac" className="mx-auto h-10 w-10 text-sky-300/60" />
            <blockquote className="mt-3 text-2xl font-bold leading-relaxed sm:text-3xl">
              Mỗi trải nghiệm là một bài học, mỗi thử thách là một cơ hội để phát triển.
            </blockquote>
            <p className={`${viTay.className} mt-5 text-3xl text-amber-300`}>Nông Bảo Trọng</p>
          </HienDan>
        </section>
      </main>

      {/* ——— Liên hệ ——— */}
      <section id="lien-he" className="scroll-mt-20 bg-[#0b1631] text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
          <HienDan>
            <p className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.2em] text-blue-300">
              <span className="tabular-nums text-white/25">06</span>
              <span className="h-px w-8 bg-blue-300/40" />
              Liên hệ
            </p>
            <h2 className="mt-3 text-balance text-3xl font-black tracking-tight sm:text-4xl">Rất mong được trao đổi cùng anh/chị</h2>
            <p className="mt-4 max-w-md leading-relaxed text-white/70">
              Gọi điện, nhắn Zalo hoặc để lại lời nhắn bên cạnh, tôi sẽ phản hồi trong ngày.
            </p>
            <ul className="mt-8 space-y-4">
              {thongTin.slice(1).map(([icon, nhan, giaTri, href]) => (
                <li key={nhan} className="flex items-center gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-blue-500/20 text-blue-300 ring-1 ring-blue-400/30">
                    <Icon ten={icon} />
                  </span>
                  {href ? (
                    <a href={href} className="font-semibold hover:text-blue-300">
                      {giaTri}
                    </a>
                  ) : (
                    <span className="font-semibold">{giaTri}</span>
                  )}
                </li>
              ))}
            </ul>
          </HienDan>
          <HienDan tre={150}>
            <FormLienHe />
          </HienDan>
        </div>
        <footer className="border-t border-white/10 py-5 text-center text-sm text-white/50">© 2026 Nông Bảo Trọng · CV cá nhân</footer>
      </section>

      <TroLyRobot dienThoai={DIEN_THOAI} />
      <TheoDoiXem />
    </div>
  )
}
