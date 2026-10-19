import type { Metadata } from 'next'
import { Oswald } from 'next/font/google'
import { QUY_TRINH, THANH_VIEN, TRUONG_NHOM, VIEC_CON_LAI, type TrangThai } from './duLieu'
import './doi-video.css'

const tieuDe = Oswald({ subsets: ['latin', 'vietnamese'], weight: ['500', '600', '700'] })

export const metadata: Metadata = {
  title: 'Đội Làm Video Quảng Cáo',
  description: 'Đội agent AI quay dựng video quảng cáo sản phẩm, có trưởng nhóm ra quyết định.',
  robots: { index: false, follow: false },
}

const NHAN: Record<TrangThai, string> = {
  'da-tuyen': 'Đã tuyển',
  'dang-soan': 'Đang soạn',
  'can-cai': 'Cần cài công cụ',
}

export default function DoiVideo() {
  const daTuyen = THANH_VIEN.filter((t) => t.trangThai === 'da-tuyen').length
  return (
    <div className="dv">
      <div className="dv-trong">
        <header className="dv-dau">
          <p className="dv-nhan-nho">Bảng phân vai · Đoàn làm phim AI</p>
          <h1 className={tieuDe.className}>Đội làm video quảng cáo sản phẩm</h1>
          <p className="dv-mo-ta">
            {THANH_VIEN.length} tổ chuyên môn và một trưởng nhóm ra quyết định. Mỗi tổ có trưởng tổ, thành viên và kiểm duyệt riêng. Tay nghề của
            mọi thành viên được tuyển từ các kho mã nguồn mở trên GitHub.
          </p>
          <div className="dv-so">
            <span><b>{daTuyen}</b> đã tuyển</span>
            <span><b>{THANH_VIEN.length - daTuyen}</b> chờ cài công cụ</span>
            <span><b>{THANH_VIEN.length * 3 + 1}</b> agent</span>
          </div>
        </header>

        <section className="dv-truong" aria-labelledby="truong-nhom">
          <div className="dv-den" aria-hidden />
          <div>
            <p className="dv-nhan-nho">Người quyết định</p>
            <h2 id="truong-nhom" className={tieuDe.className}>{TRUONG_NHOM.vai}</h2>
            <p>{TRUONG_NHOM.viec}</p>
            <ul>
              {TRUONG_NHOM.quyen.map((q) => <li key={q}>{q}</li>)}
            </ul>
          </div>
        </section>

        <section aria-labelledby="thanh-vien">
          <h2 id="thanh-vien" className={`dv-muc ${tieuDe.className}`}>Các tổ</h2>
          <p className="dv-giai">Trưởng tổ viết phiếu giao việc. Thành viên làm. Kiểm duyệt của tổ soát theo đúng chuyên môn. Trưởng tổ quyết định duyệt, trả về sửa, hay báo lên trưởng nhóm.</p>
          <div className="dv-luoi">
            {THANH_VIEN.map((t) => (
              <article key={t.ten} className="dv-the">
                <div className="dv-the-dau">
                  <h3>{t.vai}</h3>
                  <span className={`dv-chip dv-${t.trangThai}`}>{NHAN[t.trangThai]}</span>
                </div>
                <code>{t.ten}</code>
                <p className="dv-to">Tổ: <span>truong-{t.ten}</span> · <span>kd-{t.ten}</span></p>
                <p>{t.viec}</p>
                <p className="dv-nguon">
                  {t.linkNguon ? (
                    <a href={t.linkNguon} target="_blank" rel="noreferrer">{t.nguon}</a>
                  ) : (
                    t.nguon
                  )}
                  {t.giayPhep && <span> · {t.giayPhep}</span>}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="quy-trinh">
          <h2 id="quy-trinh" className={`dv-muc ${tieuDe.className}`}>Một video thường đi qua</h2>
          <ol className="dv-quy-trinh">
            {QUY_TRINH.map((b, i) => (
              <li key={b.buoc} className={b.quyetDinh ? 'dv-quyet' : undefined}>
                <span className={`dv-canh ${tieuDe.className}`}>Cảnh {i + 1}</span>
                <div>
                  <h3>
                    {b.buoc}
                    {b.quyetDinh && <em>Trưởng nhóm quyết</em>}
                  </h3>
                  <p className="dv-ai">{b.ai}</p>
                  <p>{b.chiTiet}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="dv-con-lai" aria-labelledby="con-lai">
          <h2 id="con-lai" className={`dv-muc ${tieuDe.className}`}>Việc còn lại</h2>
          <ul>
            {VIEC_CON_LAI.map((v) => <li key={v}>{v}</li>)}
          </ul>
        </section>
      </div>
    </div>
  )
}
