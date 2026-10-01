import type { Metadata } from 'next'
import QRCode from 'qrcode'
import type { ReactNode } from 'react'
import NutIn from './NutIn'
import { DIEN_THOAI, duAnCua, EMAIL, KINH_NGHIEM, layViTri } from '../duLieu'

// Bản CV 1 trang A4 để in / lưu PDF (nút Tải CV trên website /cv mở trang này).
// Có ?vt=<mã vị trí> thì in bản CV theo vị trí đó (xem VI_TRI trong duLieu.ts)
export async function generateMetadata({ searchParams }: PageProps<'/cv/ban-in'>): Promise<Metadata> {
  const vt = layViTri((await searchParams).vt)
  return {
    title: `CV ${vt.ten} – Nông Bảo Trọng`,
    description: `Ứng tuyển ${vt.ungTuyen}. Gần 2 năm Quản lý Vận hành tại SPX Express, tự xây phần mềm để cấp trên quản lý cụm 12 kho.`,
    robots: { index: false, follow: false },
    // Link ảnh xem trước (og:image) cần tên miền đầy đủ
    metadataBase: new URL(process.env.SITE_URL ?? 'https://ai-tin-cong-nghe-wpy7.vercel.app'),
  }
}

export default async function TrangCV({ searchParams }: PageProps<'/cv/ban-in'>) {
  const vt = layViTri((await searchParams).vt)
  // Mã QR dẫn tới bản web của CV (có video, số liệu kho, hệ thống dùng thử) cho người cầm CV giấy
  const trangWeb = `${(process.env.SITE_URL ?? 'https://ai-tin-cong-nghe-wpy7.vercel.app').replace(/\/$/, '')}/cv`
  const qr = await QRCode.toString(trangWeb, { type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: '#0f1b3d', light: '#ffffff' } })
  return (
    <main className="min-h-screen bg-slate-200/70 px-3 py-6 print:bg-white print:p-0 sm:px-6 sm:py-10">
      {/* Nút hành động (ẩn khi in) */}
      <div className="mx-auto mb-4 flex max-w-5xl flex-wrap justify-end gap-2 print:hidden">
        <a href={`tel:${DIEN_THOAI.replace(/\s/g, '')}`} className="btn btn-phu">📞 Gọi</a>
        <a href={`https://zalo.me/${DIEN_THOAI.replace(/\s/g, '')}`} target="_blank" rel="noreferrer" className="btn btn-phu">
          💬 Zalo
        </a>
        <NutIn />
        <a href={`/cv/tai-pdf?vt=${vt.ma}`} download className="btn btn-fb">
          ⬇ Tải PDF
        </a>
      </div>

      <article className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-900/5 print:min-h-[297mm] print:max-w-none print:rounded-none print:shadow-none print:ring-0 md:grid-cols-[290px_1fr] print:grid-cols-[230px_1fr]">
        {/* Cột trái */}
        <aside className="relative bg-[#0f1b3d] px-6 py-8 text-white print:px-5 print:py-6 sm:px-7">
          <div className="absolute inset-y-0 right-0 hidden w-1.5 bg-amber-400 md:block print:block" />
          <div className="flex flex-col items-center text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 p-1 print:h-20 print:w-20">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#16275a] text-3xl font-black tracking-tight text-amber-300 print:text-2xl">
                BT
              </div>
            </div>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-300/90">Curriculum Vitae</p>
          </div>

          <Muc tieuDe="Liên hệ">
            <dl className="space-y-3 text-sm print:space-y-1.5 print:text-[11px]">
              <DongLienHe nhan="Điện thoại">
                <a href={`tel:${DIEN_THOAI.replace(/\s/g, '')}`} className="hover:text-amber-300">{DIEN_THOAI}</a>
              </DongLienHe>
              <DongLienHe nhan="Email">
                <a href={`mailto:${EMAIL}`} className="break-all hover:text-amber-300">{EMAIL}</a>
              </DongLienHe>
              <DongLienHe nhan="Nơi ở">TP. Buôn Ma Thuột, Đắk Lắk</DongLienHe>
              <DongLienHe nhan="Ngày sinh">03/04/2001</DongLienHe>
            </dl>
          </Muc>

          <Muc tieuDe="Kỹ năng">
            <ul className="space-y-1.5 text-sm print:space-y-0.5 print:text-[11px]">
              {vt.kyNang.map((k) => (
                <li key={k} className="flex gap-2">
                  <span className="text-amber-400">◆</span>
                  {k}
                </li>
              ))}
            </ul>
          </Muc>

          <Muc tieuDe="Công cụ">
            <div className="flex flex-wrap gap-1.5">
              {vt.congCu.map((c) => (
                <span key={c} className="rounded-full border border-white/25 px-2.5 py-1 text-xs print:py-0.5 print:text-[10px]">
                  {c}
                </span>
              ))}
            </div>
          </Muc>

          <Muc tieuDe="Học vấn">
            <p className="text-sm font-bold print:text-[11px]">Cao đẳng Công nghệ Ô tô</p>
            <p className="text-sm text-white/70 print:text-[11px]">Trường Cao đẳng Phương Đông, Đà Nẵng · 2022</p>
            <p className="mt-2 text-sm text-white/70 print:mt-1 print:text-[11px]">Tự học lập trình, xây công cụ quản trị vận hành</p>
          </Muc>

          <Muc tieuDe="Sẵn sàng">
            <ul className="space-y-1.5 text-sm print:space-y-0.5 print:text-[11px]">
              {vt.sanSang.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="text-amber-400">◆</span>
                  {s}
                </li>
              ))}
            </ul>
          </Muc>

          <a href={trangWeb} className="mt-8 flex items-center gap-3 rounded-xl bg-white/10 p-3 print:mt-4 print:p-2">
            <span
              className="block h-20 w-20 shrink-0 rounded-md bg-white p-1.5 print:h-16 print:w-16 print:p-1"
              dangerouslySetInnerHTML={{ __html: qr }}
              aria-label="Mã QR mở CV trực tuyến"
              role="img"
            />
            <span className="text-sm leading-snug print:text-[10.5px]">
              <b className="block text-amber-300">Quét để xem CV online</b>
              <span className="text-white/75">Video giới thiệu, số liệu kho và hệ thống dùng thử</span>
            </span>
          </a>
        </aside>

        {/* Cột phải */}
        {/* Điện thoại: phần này (tên, kinh nghiệm) lên trước cột liên hệ */}
        <div className="order-first px-6 py-8 md:order-none print:order-none print:px-7 print:py-6 sm:px-10">
          <h1 className="text-4xl font-black tracking-tight text-[#0f1b3d] print:text-3xl sm:text-5xl">NÔNG BẢO TRỌNG</h1>
          <p className="mt-3 inline-block border-l-4 border-amber-400 bg-amber-50 px-4 py-1.5 text-base font-bold text-amber-700 print:mt-2 print:py-1 print:text-sm">
            Ứng tuyển: {vt.ungTuyen}
          </p>
          <p className="mt-5 text-[15px] leading-relaxed text-slate-700 print:mt-3 print:text-[11.5px] print:leading-snug">
            {vt.tomTat.map((d, i) => (typeof d === 'string' ? d : <b key={i} className="text-slate-900">{d.dam}</b>))}
          </p>

          <TieuDe so="01">Kinh nghiệm làm việc</TieuDe>
          <ol className="relative space-y-5 border-l-2 border-slate-200 pl-6 print:space-y-2.5 print:pl-5">
            {KINH_NGHIEM.map((k) => (
              <li key={k.chucDanh + k.noi} className="relative">
                <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-amber-400 bg-white print:-left-[27px] print:h-3 print:w-3" />
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h3 className="font-extrabold text-[#0f1b3d] print:text-[12.5px]">{k.chucDanh}</h3>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 print:text-[10px]">
                    {k.thoiGian}
                  </span>
                </div>
                <p className="text-sm font-semibold text-amber-600 print:text-[11px]">{k.noi}</p>
                <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-slate-700 print:mt-0.5 print:space-y-0 print:text-[11px] print:leading-snug">
                  {k.viec.map((v) => (
                    <li key={v} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 print:mt-1.5 print:h-1 print:w-1" />
                      {v}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          <TieuDe so="02">Dự án tự xây dựng</TieuDe>
          <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-2">
            {duAnCua(vt).map((d) => (
              <div key={d.ten} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70 print:rounded-lg print:p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-extrabold text-[#0f1b3d] print:text-[12px]">
                    {d.link ? (
                      <a href={d.link} target="_blank" rel="noreferrer" className="underline decoration-amber-400 decoration-2 underline-offset-2 hover:text-amber-700">
                        {d.ten}
                      </a>
                    ) : (
                      d.ten
                    )}
                  </h3>
                  <span className="shrink-0 rounded-full bg-[#0f1b3d] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300 print:text-[8.5px]">
                    {d.nhan}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 print:mt-1 print:text-[10.5px] print:leading-snug">{d.moTa}</p>
                {d.taiKhoan && d.link && (
                  <p className="mt-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs leading-relaxed text-slate-700 ring-1 ring-slate-200 print:mt-1 print:px-2 print:py-1 print:text-[9.5px] print:leading-snug">
                    <b>Dùng thử:</b>{' '}
                    <a href={d.link} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline">
                      {d.link.replace(/^https?:\/\//, '')}
                    </a>
                    <br />
                    TK <b className="font-mono">{d.taiKhoan.ten}</b> · MK <b className="font-mono">{d.taiKhoan.matKhau}</b>
                  </p>
                )}
              </div>
            ))}
          </div>

          <TieuDe so="03">Phong cách làm việc</TieuDe>
          <div className="flex flex-wrap gap-2 print:gap-1.5">
            {vt.phongCach.map(
              (p) => (
                <span key={p} className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 ring-1 ring-amber-200 print:py-0.5 print:text-[10.5px]">
                  {p}
                </span>
              ),
            )}
          </div>

          <p className="mt-8 text-right text-sm italic text-slate-500 print:mt-4 print:text-[10.5px]">
            Tôi cam đoan những thông tin trên là đúng sự thật. <b className="not-italic text-slate-800">Nông Bảo Trọng</b>
          </p>
        </div>
      </article>
    </main>
  )
}

function Muc({ tieuDe, children }: { tieuDe: string; children: ReactNode }) {
  return (
    <section className="mt-8 print:mt-4">
      <h2 className="mb-3 flex items-center gap-3 text-sm font-extrabold uppercase tracking-[0.2em] text-amber-400 print:mb-1.5 print:text-[11px]">
        {tieuDe}
        <span className="h-0.5 flex-1 bg-amber-400/60" />
      </h2>
      {children}
    </section>
  )
}

function DongLienHe({ nhan, children }: { nhan: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-white/50">{nhan}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}

function TieuDe({ so, children }: { so: string; children: ReactNode }) {
  return (
    <h2 className="mb-4 mt-8 flex items-center gap-3 text-lg font-black uppercase tracking-wide text-[#0f1b3d] print:mb-2 print:mt-4 print:text-[13px]">
      <span className="rounded-md bg-[#0f1b3d] px-2 py-0.5 text-xs text-amber-300 print:text-[10px]">{so}</span>
      {children}
      <span className="h-px flex-1 bg-slate-200" />
    </h2>
  )
}
