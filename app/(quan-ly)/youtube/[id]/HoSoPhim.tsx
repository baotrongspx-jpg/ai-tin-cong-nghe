'use client'

import type { ReactNode } from 'react'
import type { DuAnYT } from '@/lib/youtube'
import { IconChep, IconTai } from '@/app/BieuTuong'

// Hồ sơ sản xuất phim tiểu sử: hiện kết quả từng giai đoạn (nghiên cứu → câu chuyện → hồ sơ hình ảnh → đóng gói)
// và xuất toàn bộ thành tệp Markdown (kịch bản, phân cảnh, prompt…) để làm bản điện ảnh bằng công cụ video AI khác.

// Tên tiếng Việt của các trường AI trả về (khoá không có ở đây thì đổi _ thành dấu cách)
const NHAN: Record<string, string> = {
  ho_so: 'Hồ sơ', ten: 'Tên', linh_vuc: 'Lĩnh vực', quoc_gia: 'Quốc gia', thoi_dai: 'Thời đại', con_song: 'Còn sống?', ngay_sinh: 'Ngày sinh',
  noi_sinh: 'Nơi sinh', gia_dinh: 'Gia đình', hoc_van: 'Học vấn', nghe_nghiep: 'Nghề nghiệp', quoc_tich: 'Quốc tịch', moc_doi: 'Mốc đời',
  giai_doan: 'Giai đoạn', nam: 'Năm', su_kien: 'Sự kiện', nhan: 'Mức xác thực', su_that: 'Kiểm chứng sự thật', noi_dung: 'Nội dung', nguon: 'Nguồn',
  chu_y: 'Lưu ý cho đội sản xuất', khan_gia: 'Khán giả', chinh: 'Chính', phu: 'Phụ', to_mo: 'Tò mò', ly_do_click: 'Lý do bấm xem',
  dieu_giu_chan: 'Điều giữ chân', dieu_chia_se: 'Điều khiến chia sẻ', con_nguoi: 'Câu chuyện con người', uoc_mo: 'Ước mơ', noi_so: 'Nỗi sợ',
  that_bai: 'Thất bại', xung_dot: 'Xung đột', hy_sinh: 'Hy sinh', co_hoi: 'Cơ hội', bien_doi: 'Biến đổi', cai_gia: 'Cái giá', di_san: 'Di sản',
  ma: 'Mã', tuoi: 'Tuổi', ngoai_hinh: 'Ngoại hình', mat: 'Khuôn mặt', toc: 'Tóc', dang_nguoi: 'Dáng người', da: 'Da', chieu_cao: 'Chiều cao',
  trang_phuc: 'Trang phục', phu_kien: 'Phụ kiện', tinh_cach: 'Tính cách', khat_vong: 'Khát vọng', diem_manh: 'Điểm mạnh', diem_yeu: 'Điểm yếu',
  hanh_vi: 'Hành vi', ngon_ngu_co_the: 'Ngôn ngữ cơ thể', giong: 'Giọng', chat_giong: 'Chất giọng', toc_do: 'Tốc độ', cam_xuc: 'Cảm xúc',
  vai_tro: 'Vai trò', ly_do_co_mat: 'Vì sao có mặt', thanh_pho: 'Thành phố', thoi_ky: 'Thời kỳ', kien_truc: 'Kiến trúc', noi_that: 'Nội thất',
  ngoai_that: 'Ngoại thất', mau_sac: 'Màu sắc', anh_sang: 'Ánh sáng', thoi_tiet: 'Thời tiết', dao_cu: 'Đạo cụ', khong_khi: 'Không khí',
  cong_trinh: 'Công trình', xe_co: 'Xe cộ', cong_nghe: 'Công nghệ', bien_hieu: 'Biển hiệu', do_vat: 'Đồ vật', giay_to: 'Giấy tờ', nguoi_nen: 'Người nền',
  bang_mau: 'Bảng màu', tong_mau: 'Tông màu', ly_do: 'Lý do', tong: 'Tổng', diem: 'Điểm', kiem_tra: 'Kiểm tra chất lượng', cau_chuyen: 'Câu chuyện',
  giu_chan: 'Giữ chân', chia_se: 'Khả năng chia sẻ', thumbnail: 'Thumbnail', nhom: 'Nhóm', ctr: 'CTR', chinh_xac: 'Chính xác', tim_kiem: 'Tìm kiếm',
  mo_ta: 'Mô tả', tu_khoa: 'Từ khoá', hashtag: 'Hashtag', binh_luan_ghim: 'Bình luận ghim', bai_cong_dong: 'Bài cộng đồng', nhip_giu_chan: 'Nhịp giữ chân',
  cung_cam_xuc: 'Cung cảm xúc', nhan_vat_chinh: 'Nhân vật chính', nhan_vat_phu: 'Nhân vật phụ', thiet_ke: 'Thiết kế sản xuất', mau_theo_giai_doan: 'Màu theo giai đoạn',
  am_nhac: 'Âm nhạc', kieu: 'Kiểu', phong_cach: 'Phong cách', nhac_cu: 'Nhạc cụ', nhip: 'Nhịp',
  so: 'Cảnh', tu_cau: 'Từ câu', den_cau: 'Đến câu', thoi_luong: 'Thời lượng', dia_diem: 'Địa điểm', nhan_vat: 'Nhân vật', hanh_dong: 'Hành động',
  muc_dich: 'Mục đích', loi_ke: 'Lời kể', loi_thoai: 'Lời thoại', hinh_anh: 'Hình ảnh', am_thanh: 'Âm thanh', nhac: 'Nhạc', am_nen: 'Âm nền',
  foley: 'Foley', sfx: 'Hiệu ứng', khoang_lang: 'Khoảng lặng', chuyen_canh: 'Chuyển cảnh', quay: 'Máy quay', co_canh: 'Cỡ cảnh', goc_may: 'Góc máy',
  ong_kinh: 'Ống kính', chuyen_dong: 'Chuyển động', nguoc: 'Ngược sáng', thuc_te: 'Đèn trong cảnh', moi_truong: 'Môi trường', nhiet_mau: 'Nhiệt màu',
  tuong_phan: 'Tương phản', bong: 'Bóng đổ', thoi_diem: 'Thời điểm', bo_cuc: 'Bố cục', tien_canh: 'Tiền cảnh', trung_canh: 'Trung cảnh',
  hau_canh: 'Hậu cảnh', mau: 'Màu', dung: 'Dựng', thoi_luong_shot: 'Độ dài shot', diem_cat: 'Điểm cắt', b_roll: 'B-roll', hieu_ung: 'Hiệu ứng',
  chu_tren_hinh: 'Chữ trên hình', prompt_anh: 'Prompt ảnh AI', prompt_video: 'Prompt video AI', chu_the: 'Chủ thể', bieu_cam: 'Biểu cảm', nen: 'Nền',
  chu: 'Chữ', vi_tri_chu: 'Vị trí chữ', diem_to_mo: 'Điểm gây tò mò', hook: 'Hook', than: 'Thân', cao_trao: 'Cao trào', cta: 'Kêu gọi', tu_chuong: 'Từ chương',
  tieu_de: 'Tiêu đề', muc: 'Mục', dat: 'Đạt', ghi_chu: 'Ghi chú',
}
const NHAN_SU_THAT: Record<string, [string, string]> = {
  xac_minh: ['Đã xác minh', 'bg-emerald-100 text-emerald-700'],
  duoc_dua_tin: ['Được đưa tin · cần kiểm tra', 'bg-amber-100 text-amber-800'],
  tranh_cai: ['Còn tranh cãi', 'bg-red-100 text-red-700'],
  dien_giai: ['Diễn giải', 'bg-blue-100 text-blue-700'],
  chua_ro: ['Chưa rõ', 'bg-slate-100 text-slate-600'],
}
const nhanKhoa = (k: string) => NHAN[k] ?? k.replace(/_/g, ' ')

function NutChepNho({ chu }: { chu: string }) {
  return (
    <button type="button" title="Chép" onClick={() => navigator.clipboard.writeText(chu)} className="ml-1 inline-flex align-middle text-slate-400 hover:text-slate-700">
      <IconChep className="h-3.5 w-3.5" />
    </button>
  )
}

// Hiện dữ liệu lồng nhau bất kỳ: đối tượng thành danh sách nhãn: giá trị, mảng đối tượng thành các thẻ nhỏ
export function KhoiDuLieu({ v }: { v: unknown }): ReactNode {
  if (v === null || v === undefined || v === '') return <span className="text-slate-400">—</span>
  if (typeof v === 'boolean') return v ? '✅' : '❌'
  if (typeof v !== 'object') return <span className="whitespace-pre-wrap">{String(v)}</span>
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x !== 'object')) return <span>{v.join(' · ')}</span>
    return (
      <div className="grid gap-2">
        {v.map((x, i) => (
          <div key={i} className="rounded-lg bg-slate-50 p-2.5 ring-1 ring-slate-100">
            <KhoiDuLieu v={x} />
          </div>
        ))}
      </div>
    )
  }
  return (
    <dl className="grid gap-1 text-sm">
      {Object.entries(v as Record<string, unknown>).map(([k, x]) => (
        <div key={k} className="grid gap-x-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <dt className="text-xs font-semibold text-slate-500">{nhanKhoa(k)}</dt>
          <dd className="min-w-0">
            {k === 'nhan' && typeof x === 'string' && NHAN_SU_THAT[x] ? (
              <span className={`chip ${NHAN_SU_THAT[x][1]}`}>{NHAN_SU_THAT[x][0]}</span>
            ) : (
              <>
                <KhoiDuLieu v={x} />
                {k.startsWith('prompt') && typeof x === 'string' && <NutChepNho chu={x} />}
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function Muc({ tieuDe, children, mo = false }: { tieuDe: string; children: ReactNode; mo?: boolean }) {
  return (
    <details open={mo} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <summary className="cursor-pointer text-sm font-bold">{tieuDe}</summary>
      <div className="mt-3">{children}</div>
    </details>
  )
}

// Làm tròn tổng số giây trước (479,6 giây → 8:00, không phải 7:60)
const phutGiay = (giay: number) => `${Math.floor(Math.round(giay) / 60)}:${String(Math.round(giay) % 60).padStart(2, '0')}`
const uocGiay = (loi: { chu: string }[] | null) => (loi ? loi.reduce((t, l) => t + l.chu.length / 19 + 0.25, 0) : 0)

// Mốc thời gian chương (ước tính theo số chữ lời thoại) cho phần mô tả YouTube
export function chuongYouTube(d: DuAnYT) {
  let t = 0
  return d.phan.map((p, i) => {
    const dong = `${phutGiay(t)} ${d.phim?.dong_goi?.chuong[i] ?? p.tieu_de}`
    t += uocGiay(p.loi)
    return dong
  })
}

// ---------- Xuất Markdown ----------
function md(v: unknown, thut = ''): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v !== 'object') return String(v)
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x !== 'object')) return v.join(' · ')
    return '\n' + v.map((x) => `${thut}- ${md(x, thut + '  ').replace(/^\n/, '').trimStart()}`).join('\n')
  }
  return (
    '\n' +
    Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${thut}- **${nhanKhoa(k)}:** ${md(x, thut + '  ')}`)
      .join('\n')
  )
}
export function xuatMarkdown(d: DuAnYT) {
  const p = d.phim
  const ds: string[] = [`# ${d.tieu_de}`, '', `Phim tiểu sử: **${p?.ten ?? ''}** · ${d.phut} phút · 16:9 · Công Nghệ 24H`]
  const muc = (so: string, ten: string, v: unknown) => v && ds.push('', `## ${so} — ${ten}`, md(v))
  if (p?.nguon.length) ds.push('', '## Nguồn', ...p.nguon.map((n) => `- [${n.tieu_de}](${n.url})`))
  muc('01', 'Nghiên cứu', p?.nghien_cuu)
  if (p?.cau_chuyen) {
    const { phan: _phan, ...cc } = p.cau_chuyen
    void _phan
    muc('02', 'Phát triển câu chuyện', cc)
  }
  ds.push('', '## 03 — Kịch bản')
  d.phan.forEach((ph, i) => {
    ds.push('', `### Chương ${i + 1}: ${ph.tieu_de}`, `_Nhịp cảm xúc: ${ph.nhip ?? ''}_`, '')
    for (const l of ph.loi ?? []) ds.push(`- **${l.ai}**${l.tai_hien ? ' _(tái hiện)_' : ''}${l.the_moc ? ` [${l.the_moc}]` : ''}: ${l.chu}`)
  })
  muc('04', 'Hồ sơ hình ảnh (nhân vật, bối cảnh, thiết kế, màu, nhạc)', p?.ho_so)
  d.phan.forEach((ph, i) => ph.canh && muc(`05.${i + 1}`, `Phân cảnh, shot list và prompt — Chương ${i + 1}`, ph.canh))
  if (p?.dong_goi) {
    muc('06', 'Đóng gói YouTube', p.dong_goi)
    ds.push('', '### Chương (mốc thời gian ước tính)', ...chuongYouTube(d))
  }
  return ds.join('\n')
}

export default function HoSoPhim({ d, chay, dangChay }: { d: DuAnYT; chay: (buoc: 'nghien_cuu' | 'cau_chuyen' | 'ho_so' | 'dong_goi') => void; dangChay: boolean }) {
  const p = d.phim
  if (!p) return null
  const taiVe = () => {
    const url = URL.createObjectURL(new Blob([xuatMarkdown(d)], { type: 'text/markdown;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `ho-so-phim-${p.ten.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').replace(/[^\w]+/g, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }
  const nutLai = (buoc: 'nghien_cuu' | 'cau_chuyen' | 'ho_so' | 'dong_goi', xacNhan?: string) => (
    <button
      type="button"
      disabled={dangChay}
      onClick={() => (!xacNhan || confirm(xacNhan)) && chay(buoc)}
      className="btn btn-sm btn-phu"
    >
      AI làm lại bước này
    </button>
  )
  const cc = p.cau_chuyen
  const dg = p.dong_goi
  return (
    <section className="the grid gap-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">🎬 Hồ sơ sản xuất phim: {p.ten}</h2>
          <p className="text-xs text-slate-500">Dùng để làm bản điện ảnh bằng công cụ video AI (Veo, Kling, Runway…) — kèm kịch bản, phân cảnh, prompt từng cảnh.</p>
        </div>
        <button type="button" onClick={taiVe} className="btn btn-sm btn-phu">
          <IconTai className="h-3.5 w-3.5" /> Tải hồ sơ phim (.md)
        </button>
      </div>

      {p.nghien_cuu ? (
        <Muc tieuDe="01 · Nghiên cứu & kiểm chứng sự thật">
          <div className="grid gap-3">
            {p.nguon.length > 0 && (
              <p className="text-xs text-slate-500">
                Nguồn:{' '}
                {p.nguon.map((n) => (
                  <a key={n.url} href={n.url} target="_blank" rel="noreferrer" className="mr-3 text-blue-600 hover:underline">
                    {n.tieu_de}
                  </a>
                ))}
                {p.tai_lieu && '· Tài liệu bạn cung cấp'}
              </p>
            )}
            <KhoiDuLieu v={p.nghien_cuu} />
            {nutLai('nghien_cuu', 'Nghiên cứu lại? Các bước sau vẫn giữ nguyên cho tới khi bạn làm lại.')}
          </div>
        </Muc>
      ) : (
        <p className="text-sm text-slate-500">01 · Nghiên cứu: chưa có</p>
      )}

      {cc ? (
        <Muc tieuDe="02 · Câu chuyện: khán giả, góc kể, big idea, hook" mo>
          <div className="grid gap-3 text-sm">
            <p className="rounded-xl bg-violet-50 p-3 text-violet-900 ring-1 ring-violet-200">
              <b>BIG IDEA:</b> {cc.big_idea}
            </p>
            <p>
              <b>Hook mở đầu:</b> “{cc.hook_chon}”
            </p>
            <p>
              <b>Góc kể chọn:</b> {cc.goc_chon} — {cc.ly_do_chon}
            </p>
            <p>
              <b>Cấu trúc:</b> {cc.cau_truc}
            </p>
            <p>
              <b>Chủ đề con người:</b> {cc.chu_de_chung}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-slate-500">
                  <tr>
                    <th className="p-1 text-left">Góc kể</th>
                    {['Tò mò', 'Cảm xúc', 'Hình ảnh', 'Liên quan', 'Mới lạ', 'Giữ chân', 'YouTube', 'Tổng'].map((x) => (
                      <th key={x} className="p-1">
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cc.goc_ke.map((g) => {
                    const ds = Object.values(g.diem)
                    return (
                      <tr key={g.ten} className={g.ten === cc.goc_chon ? 'bg-violet-50 font-semibold' : ''}>
                        <td className="p-1" title={g.mo_ta}>
                          {g.ten}
                        </td>
                        {ds.map((x, i) => (
                          <td key={i} className="p-1 text-center">
                            {x}
                          </td>
                        ))}
                        <td className="p-1 text-center">{ds.reduce((a, b) => a + b, 0)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Muc tieuDe="Khán giả, câu chuyện con người, cung cảm xúc, các hook, nhịp giữ chân">
              <KhoiDuLieu v={{ khan_gia: cc.khan_gia, con_nguoi: cc.con_nguoi, cung_cam_xuc: cc.cung_cam_xuc, hook: cc.hook, nhip_giu_chan: cc.nhip_giu_chan }} />
            </Muc>
            {nutLai('cau_chuyen', 'Làm lại câu chuyện sẽ chia chương mới và XOÁ kịch bản các chương hiện có. Tiếp tục?')}
          </div>
        </Muc>
      ) : (
        <p className="text-sm text-slate-500">02 · Câu chuyện: chưa có</p>
      )}

      {p.ho_so ? (
        <Muc tieuDe="04 · Hồ sơ hình ảnh: nhân vật, bối cảnh, thiết kế, màu, nhạc">
          <div className="grid gap-3">
            <KhoiDuLieu v={p.ho_so} />
            {nutLai('ho_so')}
          </div>
        </Muc>
      ) : (
        <p className="text-sm text-slate-500">04 · Hồ sơ hình ảnh: chưa có</p>
      )}
      <p className="text-xs text-slate-500">05 · Phân cảnh, shot list và prompt video AI: xem trong từng chương ở mục Kịch bản bên dưới.</p>

      {dg ? (
        <Muc tieuDe={`06 · Đóng gói YouTube — điểm tổng ${dg.diem.tong}/100`} mo>
          <div className="grid gap-3 text-sm">
            <p className="text-slate-600">
              <b>Tiềm năng nội dung:</b> {dg.tiem_nang}
            </p>
            <div>
              <p className="label">Top 5 tiêu đề</p>
              <ol className="list-decimal pl-5">
                {dg.top5.map((t) => (
                  <li key={t}>
                    {t} <NutChepNho chu={t} />
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="label">Chương (mốc thời gian ước tính, dán vào mô tả)</p>
              <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs">{chuongYouTube(d).join('\n')}</pre>
              <NutChepNho chu={chuongYouTube(d).join('\n')} />
            </div>
            <Muc tieuDe="20 tiêu đề + điểm, 5 thumbnail, mô tả, từ khoá, bình luận ghim, bài cộng đồng">
              <KhoiDuLieu v={{ tieu_de: dg.tieu_de, thumbnail: dg.thumbnail, mo_ta: dg.mo_ta, tu_khoa: dg.tu_khoa, hashtag: dg.hashtag, binh_luan_ghim: dg.binh_luan_ghim, bai_cong_dong: dg.bai_cong_dong }} />
            </Muc>
            <Muc tieuDe={`Shorts (${dg.shorts.length} đoạn)`}>
              <KhoiDuLieu v={dg.shorts} />
            </Muc>
            <Muc tieuDe="Chấm điểm & kiểm tra chất lượng">
              <KhoiDuLieu v={{ diem: dg.diem, kiem_tra: dg.kiem_tra }} />
            </Muc>
            {nutLai('dong_goi')}
          </div>
        </Muc>
      ) : (
        <p className="text-sm text-slate-500">06 · Đóng gói YouTube: chưa có</p>
      )}
    </section>
  )
}
