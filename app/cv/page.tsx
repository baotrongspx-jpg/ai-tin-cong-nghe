import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import NutIn from './NutIn'

// Trang CV cá nhân công khai (không cần đăng nhập) để gửi link cho nhà tuyển dụng.
// Không cho Google lập chỉ mục vì có số điện thoại, email. Bấm "Lưu PDF" in ra đúng 1 trang A4.
export const metadata: Metadata = {
  title: 'CV – Nông Bảo Trọng · Ứng tuyển Trợ lý',
  description: 'Trợ lý Giám đốc, 2 năm vận hành cụm 12 kho SPX Express, tự xây công cụ báo cáo và kênh Fanpage, TikTok.',
  robots: { index: false, follow: false },
  // Link ảnh xem trước (og:image) cần tên miền đầy đủ
  metadataBase: new URL(process.env.SITE_URL ?? 'https://ai-tin-cong-nghe-wpy7.vercel.app'),
}

const DIEN_THOAI = '0856 984 948'
const EMAIL = 'baotrongspx@gmail.com'

const KINH_NGHIEM = [
  {
    chucDanh: 'Trợ lý Giám đốc (Phát triển vùng trồng & Ngoại giao)',
    noi: 'Công ty TNHH Trái Cây 001 · Krông Pắk, Đắk Lắk',
    thoiGian: '07/2026 – nay',
    viec: [
      'Theo dõi số liệu từng công đoạn tại Kho lột múi 001, tính tỷ lệ hao hụt và báo cáo định kỳ cho Giám đốc.',
      'Soạn thảo hợp đồng mua bán, vận chuyển, dịch vụ và văn bản pháp lý; làm việc với hợp tác xã, đối tác.',
      'Tự xây Durian Frozen System đối chiếu nguyên liệu đầu vào với thành phẩm, thay sổ sách thủ công.',
    ],
  },
  {
    chucDanh: 'Nhân viên Vận hành',
    noi: 'SPX Express · Cụm kho Đắk Lắk (12 kho)',
    thoiGian: '08/2024 – 06/2026',
    viec: [
      'Đối soát số liệu cuối ngày cho toàn cụm 12 kho.',
      'Phân bổ nhân lực theo khối lượng hàng, theo dõi tiến độ trong ngày, dự báo nhu cầu lao động ngày kế tiếp.',
      'Cảnh báo nhân sự dưới chỉ tiêu, báo cáo kèm đề xuất cho quản lý cụm.',
    ],
  },
  {
    chucDanh: 'Nhân viên Vận hành',
    noi: 'Giao Hàng Tiết Kiệm (GHTK)',
    thoiGian: '2024',
    viec: ['Điều phối nhân sự, xử lý sự cố phát sinh để giữ chất lượng dịch vụ cho khách hàng.'],
  },
  {
    chucDanh: 'Nhân viên Kiểm tra Chất lượng (QC)',
    noi: 'Thaco Trường Hải',
    thoiGian: '2023 – 2024',
    viec: ['Kiểm tra chất lượng xe theo quy trình và tiêu chuẩn nhà máy: cẩn thận, tư duy checklist.'],
  },
]

const DU_AN: { ten: string; link?: string; moTa: string; nhan: string }[] = [
  {
    ten: 'Fanpage & TikTok Công Nghệ 24H',
    link: 'https://www.facebook.com/102093421307437',
    moTa: 'Tự xây kênh tin công nghệ: 3 lượt bài mỗi ngày, hẹn giờ theo giờ vàng, thống kê tương tác, trả lời bình luận.',
    nhan: 'Mạng xã hội',
  },
  {
    ten: 'Daily Report Hub',
    moTa: 'Báo cáo ngày tự động; được chọn dự thi AI Innovator Awards của SPX.',
    nhan: 'Báo cáo',
  },
  {
    ten: 'SPX Command Center',
    moTa: 'Điều hành cụm 12 kho: dashboard, đối soát dữ liệu, cảnh báo nhân sự dưới chỉ tiêu.',
    nhan: 'Vận hành',
  },
  {
    ten: 'Durian Frozen System',
    moTa: 'Quản lý kho cấp đông, sản lượng, tỷ lệ thu hồi; đang dùng thực tế.',
    nhan: 'Đối soát',
  },
]

const KY_NANG = [
  'Theo dõi tiến độ, nhắc việc',
  'Báo cáo kèm đề xuất',
  'Đối soát số liệu',
  'Soạn hợp đồng, văn bản',
  'Chăm sóc khách hàng',
  'Vận hành Fanpage, TikTok',
]
const CONG_CU = ['Excel / Sheets', 'Google Workspace', 'Word', 'Apps Script', 'AI (Gemini, Claude)', 'Next.js', 'Supabase']
const SAN_SANG = [
  'T2 – sáng T7, 8h–17h tại Buôn Ma Thuột',
  'Học nhanh CapCut, quay chụp nội dung',
  'Học ghi sổ thu – chi theo quy trình công ty',
  'Tăng ca khi công việc cần',
]

export default function TrangCV() {
  return (
    <main className="min-h-screen bg-slate-200/70 px-3 py-6 print:bg-white print:p-0 sm:px-6 sm:py-10">
      {/* Nút hành động (ẩn khi in) */}
      <div className="mx-auto mb-4 flex max-w-5xl flex-wrap justify-end gap-2 print:hidden">
        <a href={`tel:${DIEN_THOAI.replace(/\s/g, '')}`} className="btn btn-phu">📞 Gọi</a>
        <a href={`https://zalo.me/${DIEN_THOAI.replace(/\s/g, '')}`} target="_blank" rel="noreferrer" className="btn btn-phu">
          💬 Zalo
        </a>
        <NutIn />
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
              {KY_NANG.map((k) => (
                <li key={k} className="flex gap-2">
                  <span className="text-amber-400">◆</span>
                  {k}
                </li>
              ))}
            </ul>
          </Muc>

          <Muc tieuDe="Công cụ">
            <div className="flex flex-wrap gap-1.5">
              {CONG_CU.map((c) => (
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
              {SAN_SANG.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="text-amber-400">◆</span>
                  {s}
                </li>
              ))}
            </ul>
          </Muc>
        </aside>

        {/* Cột phải */}
        {/* Điện thoại: phần này (tên, kinh nghiệm) lên trước cột liên hệ */}
        <div className="order-first px-6 py-8 md:order-none print:order-none print:px-7 print:py-6 sm:px-10">
          <h1 className="text-4xl font-black tracking-tight text-[#0f1b3d] print:text-3xl sm:text-5xl">NÔNG BẢO TRỌNG</h1>
          <p className="mt-3 inline-block border-l-4 border-amber-400 bg-amber-50 px-4 py-1.5 text-base font-bold text-amber-700 print:mt-2 print:py-1 print:text-sm">
            Ứng tuyển: Trợ lý – Buôn Ma Thuột
          </p>
          <p className="mt-5 text-[15px] leading-relaxed text-slate-700 print:mt-3 print:text-[11.5px] print:leading-snug">
            <b className="text-slate-900">Đang làm Trợ lý Giám đốc</b> tại Công ty TNHH Trái Cây 001, phụ trách kiểm soát sản lượng, báo
            cáo định kỳ và soạn hợp đồng với đối tác. Gần 2 năm vận hành <b className="text-slate-900">cụm 12 kho SPX Express</b>: điều phối
            nhân sự, đối soát số liệu cuối ngày, báo cáo kèm đề xuất cho quản lý.
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
            {DU_AN.map((d) => (
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
              </div>
            ))}
          </div>

          <TieuDe so="03">Phong cách làm việc</TieuDe>
          <div className="flex flex-wrap gap-2 print:gap-1.5">
            {['Cẩn thận, làm việc có số liệu', 'Chủ động báo cáo kèm đề xuất', 'Kỷ luật, tư duy quy trình', 'Giao tiếp rõ ràng với đối tác, khách hàng'].map(
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
