import type { Metadata } from 'next'
import Image from 'next/image'
import { Dancing_Script } from 'next/font/google'
import type { ReactNode } from 'react'
import { ANH_MAC_DINH, diaChiAnhCV } from '@/lib/anhCV'
import { DIEN_THOAI, DU_AN, EMAIL, KINH_NGHIEM } from './duLieu'
import FormLienHe from './FormLienHe'
import HienDan from './HienDan'

const viTay = Dancing_Script({ subsets: ['vietnamese'], weight: ['600', '700'] })

export const metadata: Metadata = {
  title: 'Nông Bảo Trọng – CV cá nhân',
  description: 'Trợ lý Giám đốc · gần 2 năm vận hành cụm 12 kho SPX Express · Ứng tuyển Trợ lý tại Buôn Ma Thuột.',
  robots: { index: false, follow: false },
  metadataBase: new URL(process.env.SITE_URL ?? 'https://ai-tin-cong-nghe-wpy7.vercel.app'),
}

const NGAY_SINH = '03/04/2001'
const DIA_CHI = 'TP. Buôn Ma Thuột, Đắk Lắk'

const MENU = [
  ['Trang chủ', '#trang-chu'],
  ['Giới thiệu', '#gioi-thieu'],
  ['Kinh nghiệm', '#kinh-nghiem'],
  ['Học vấn', '#hoc-van'],
  ['Kỹ năng', '#ky-nang'],
  ['Mục tiêu', '#muc-tieu'],
  ['Liên hệ', '#lien-he'],
]

const KY_NANG_MUC: [string, number][] = [
  ['Đối soát, báo cáo số liệu', 90],
  ['Excel / Google Sheets', 90],
  ['Điều phối, theo dõi tiến độ', 85],
  ['Giao tiếp, chăm sóc khách hàng', 85],
  ['Soạn hợp đồng, văn bản', 80],
  ['Vận hành Fanpage, TikTok', 80],
]

const LOGO: Record<string, string> = { 'Công ty TNHH Trái Cây 001': '001', 'SPX Express': 'SPX', 'Giao Hàng Tiết Kiệm': 'GHTK', 'Thaco Trường Hải': 'THACO' }
const logoCua = (noi: string) => Object.entries(LOGO).find(([k]) => noi.startsWith(k))?.[1] ?? noi.slice(0, 3)

const HANH_TRINH = [
  { nam: '2022', viec: 'Tốt nghiệp Cao đẳng Công nghệ Ô tô' },
  { nam: '2023', viec: 'QC – Thaco Trường Hải' },
  { nam: '2024', viec: 'Vận hành – GHTK, rồi SPX Express (cụm 12 kho)' },
  { nam: '2026', viec: 'Trợ lý Giám đốc – Công ty TNHH Trái Cây 001' },
  { nam: 'Tiếp theo', viec: 'Trợ lý chuyên nghiệp, gắn bó lâu dài tại Buôn Ma Thuột', moi: true },
]

// Biểu tượng nét mảnh (kiểu Lucide), vẽ bằng SVG để không phải cài thêm thư viện
const BT = {
  lich: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  ghim: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  dt: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  thu: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  nguoi: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  cap: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" /></>,
  mu: <><path d="m2 9 10-5 10 5-10 5z" /><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v6" /></>,
  bia: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>,
  sao: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />,
  bieuDo: <><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 6-6" /></>,
  tim: <path d="M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20z" />,
  duLich: <><path d="M2 16 22 8M6 12l-2-4 3-1 4 3M13 9l3-6 3 1-2 7" /><path d="M3 21h18" /></>,
  theThao: <><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8" /></>,
  mayTinh: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
  nhac: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
  tai: <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />,
  guiThu: <path d="m22 2-9.5 9.5M22 2l-7 20-3.5-8.5L3 10z" />,
  dung: <path d="m5 12 5 5L20 7" />,
  ngoac: <path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6" />,
}

function Icon({ ten, className = 'h-5 w-5' }: { ten: keyof typeof BT; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {BT[ten]}
    </svg>
  )
}

function The({ id, icon, tieuDe, children, tre = 0 }: { id?: string; icon: keyof typeof BT; tieuDe: string; children: ReactNode; tre?: number }) {
  return (
    <HienDan tre={tre}>
      <section id={id} className="scroll-mt-24 rounded-2xl bg-white p-6 shadow-[0_2px_20px_-6px_rgba(15,27,61,0.15)] ring-1 ring-slate-200/70">
        <h2 className="mb-5 flex items-center gap-3 text-lg font-extrabold uppercase tracking-wide text-[#0f1b3d]">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-blue-600">
            <Icon ten={icon} className="h-[18px] w-[18px]" />
          </span>
          {tieuDe}
        </h2>
        {children}
      </section>
    </HienDan>
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
    <div id="trang-chu" className="min-h-screen scroll-smooth bg-slate-100 text-slate-700">
      {/* Thanh điều hướng */}
      <header className="sticky top-0 z-30 bg-[#0b1631]/95 text-white backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <a href="#trang-chu" className="flex shrink-0 items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-blue-400 text-sm font-black text-blue-300">TB</span>
            <span className="leading-tight">
              <span className="block font-extrabold">Nông Bảo Trọng</span>
              <span className="block text-[11px] font-semibold tracking-[0.2em] text-blue-300">CV CÁ NHÂN</span>
            </span>
          </a>
          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {MENU.map(([ten, href], i) => (
              <a
                key={href}
                href={href}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-white/10 hover:text-white ${i === 0 ? 'text-white' : 'text-white/70'}`}
              >
                {ten}
              </a>
            ))}
          </nav>
          <a
            href="/cv/ban-in"
            className="ml-auto flex shrink-0 items-center gap-2 rounded-lg border border-blue-400 px-3.5 py-2 text-sm font-bold text-blue-200 transition hover:bg-blue-500 hover:text-white lg:ml-2"
          >
            <Icon ten="tai" className="h-4 w-4" /> Tải CV PDF
          </a>
        </div>
        {/* Điện thoại: menu cuộn ngang */}
        <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-1.5 lg:hidden">
          {MENU.map(([ten, href]) => (
            <a key={href} href={href} className="shrink-0 rounded-md px-3 py-1.5 text-[13px] font-semibold text-white/75 hover:text-white">
              {ten}
            </a>
          ))}
        </nav>
      </header>

      {/* Phần mở đầu */}
      <section className="relative overflow-hidden bg-[#0b1631] text-white">
        <Image src="/cv/nen.jpg" alt="" fill priority sizes="100vw" className="object-cover object-right opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1631] via-[#0b1631]/85 to-[#0b1631]/10" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0b1631]/70 to-transparent" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 pb-14 pt-10 sm:px-6 md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr_220px] lg:pb-16 lg:pt-12">
          <HienDan className="mx-auto w-full max-w-[300px] md:max-w-none">
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
            <p className="text-lg font-semibold text-blue-300">Xin chào, tôi là</p>
            <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-6xl">
              NÔNG BẢO <span className="text-blue-400">TRỌNG</span>
            </h1>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold text-amber-300 ring-1 ring-white/15 sm:text-base">
              Trợ lý Giám đốc · Vận hành & Báo cáo số liệu
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
            </div>
          </HienDan>

          <HienDan tre={240} className="hidden self-start pt-6 lg:block">
            <p className={`${viTay.className} text-right text-3xl leading-snug text-amber-200 drop-shadow`}>
              “Kỹ năng hôm nay
              <br />
              là giá trị ngày mai”
            </p>
          </HienDan>
        </div>
      </section>

      {/* Lưới thông tin 3 cột */}
      <main className="relative mx-auto -mt-6 grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-3">
        {/* Cột 1 */}
        <div className="space-y-6">
          <The id="gioi-thieu" icon="nguoi" tieuDe="Thông tin cá nhân">
            <ul className="space-y-3.5 text-sm">
              {[...thongTin, ['cap', 'Vị trí ứng tuyển', 'Trợ lý – Buôn Ma Thuột'] as const].map(([icon, nhan, giaTri]) => (
                <li key={nhan} className="flex items-start gap-3">
                  <Icon ten={icon} className="mt-0.5 h-[18px] w-[18px] shrink-0 text-blue-600" />
                  <span className="w-24 shrink-0 text-slate-500">{nhan}</span>
                  <span className="min-w-0 break-words font-semibold text-slate-800">{giaTri}</span>
                </li>
              ))}
            </ul>
          </The>

          <The id="ky-nang" icon="sao" tieuDe="Kỹ năng" tre={80}>
            <ul className="space-y-4">
              {KY_NANG_MUC.map(([ten, pt]) => (
                <li key={ten}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-semibold text-slate-800">{ten}</span>
                    <span className="font-bold text-blue-600">{pt}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400" style={{ width: `${pt}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </The>

          <The icon="tim" tieuDe="Sở thích" tre={160}>
            <ul className="grid grid-cols-4 gap-2 text-center text-xs font-semibold text-slate-600">
              {(
                [
                  ['duLich', 'Du lịch'],
                  ['theThao', 'Thể thao'],
                  ['mayTinh', 'Công nghệ'],
                  ['nhac', 'Âm nhạc'],
                ] as const
              ).map(([icon, ten]) => (
                <li key={ten} className="flex flex-col items-center gap-2">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                    <Icon ten={icon} className="h-6 w-6" />
                  </span>
                  {ten}
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-center text-sm italic text-slate-600">
              “Luôn cố gắng mỗi ngày để trở thành phiên bản tốt hơn của chính mình.”
            </p>
          </The>
        </div>

        {/* Cột 2 */}
        <div className="space-y-6">
          <The id="kinh-nghiem" icon="cap" tieuDe="Kinh nghiệm làm việc" tre={60}>
            <ol className="space-y-5">
              {KINH_NGHIEM.map((k) => (
                <li key={k.chucDanh + k.noi} className="flex gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#0f1b3d] text-[11px] font-black tracking-tight text-amber-300">
                    {logoCua(k.noi)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <h3 className="font-extrabold text-[#0f1b3d]">{k.noi.split(' · ')[0]}</h3>
                      <span className="text-xs font-bold text-blue-600">{k.thoiGian}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">{k.chucDanh}</p>
                    <ul className="mt-1.5 space-y-1 text-sm leading-relaxed">
                      {k.viec.map((v) => (
                        <li key={v} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                          {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          </The>

          <The id="hoc-van" icon="mu" tieuDe="Học vấn" tre={140}>
            <div className="flex gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Icon ten="mu" className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-extrabold text-[#0f1b3d]">Trường Cao đẳng Phương Đông, Đà Nẵng</h3>
                <p className="text-sm font-semibold text-slate-500">Cao đẳng Công nghệ Ô tô · Tốt nghiệp 2022</p>
              </div>
            </div>
          </The>

          <The id="muc-tieu" icon="bia" tieuDe="Mục tiêu nghề nghiệp" tre={220}>
            <ul className="space-y-2.5 text-sm">
              {[
                ['Ngắn hạn', 'Nắm nhanh quy trình công ty, hỗ trợ Giám đốc theo dõi tiến độ, báo cáo và giấy tờ chính xác, đúng hạn.'],
                ['Trung hạn', 'Học thêm quay dựng video (CapCut) và ghi sổ thu – chi để hỗ trợ được nhiều việc hơn.'],
                ['Dài hạn', 'Trở thành trợ lý đáng tin cậy, gắn bó lâu dài và cùng công ty phát triển tại Buôn Ma Thuột.'],
              ].map(([moc, noiDung]) => (
                <li key={moc} className="flex gap-3">
                  <Icon ten="dung" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>
                    <b className="text-slate-800">{moc}:</b> {noiDung}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl border-l-4 border-blue-500 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
              Sẵn sàng làm T2 – sáng T7, 8h–17h tại Buôn Ma Thuột và tăng ca khi công việc cần.
            </p>
          </The>
        </div>

        {/* Cột 3 */}
        <div className="space-y-6">
          <The icon="bieuDo" tieuDe="Quá trình & mục tiêu" tre={120}>
            <ol className="relative space-y-5 border-l-2 border-dashed border-blue-200 pl-6">
              {HANH_TRINH.map((m) => (
                <li key={m.nam} className="relative">
                  <span
                    className={`absolute -left-[33px] top-0.5 h-4 w-4 rounded-full border-4 ${
                      m.moi ? 'border-amber-300 bg-amber-500' : 'border-blue-100 bg-blue-600'
                    }`}
                  />
                  <p className={`text-sm font-black ${m.moi ? 'text-amber-600' : 'text-blue-600'}`}>{m.nam}</p>
                  <p className="text-sm font-semibold text-slate-700">{m.viec}</p>
                </li>
              ))}
            </ol>
          </The>

          <The icon="sao" tieuDe="Dự án nổi bật" tre={200}>
            <ul className="space-y-3.5">
              {DU_AN.map((d) => (
                <li key={d.ten} className="flex gap-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
                    <Icon ten="dung" className="h-3 w-3" />
                  </span>
                  <span>
                    {d.link ? (
                      <a href={d.link} target="_blank" rel="noreferrer" className="font-bold text-[#0f1b3d] underline decoration-blue-400 underline-offset-2 hover:text-blue-600">
                        {d.ten}
                      </a>
                    ) : (
                      <b className="text-[#0f1b3d]">{d.ten}</b>
                    )}
                    <span className="block text-slate-600">{d.moTa}</span>
                  </span>
                </li>
              ))}
            </ul>
          </The>

          <HienDan tre={280}>
            <figure className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1b3d] to-[#1e3a8a] p-6 text-white shadow-lg">
              <Icon ten="ngoac" className="h-10 w-10 text-blue-300/60" />
              <blockquote className="mt-2 text-lg font-semibold leading-relaxed">
                Mỗi trải nghiệm là một bài học, mỗi thử thách là một cơ hội để phát triển.
              </blockquote>
              <figcaption className={`${viTay.className} mt-4 text-right text-3xl text-amber-300`}>Nông Bảo Trọng</figcaption>
            </figure>
          </HienDan>
        </div>
      </main>

      {/* Liên hệ */}
      <section id="lien-he" className="scroll-mt-20 bg-[#0b1631] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <HienDan>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">Liên hệ</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">Rất mong được trao đổi cùng anh/chị</h2>
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
    </div>
  )
}
