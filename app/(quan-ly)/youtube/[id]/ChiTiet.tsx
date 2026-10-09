'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { DuAnYT, KiemTraVideo, PhanYT, TrangThaiDuAn, TrangThaiPhan, TrangThaiShort } from '@/lib/youtube'
import { thongBao } from '@/app/ThongBao'
import { locLoiChao } from '@/lib/kiemDinh'
import { IconChep, IconMo, IconXong, IconYouTube, Xoay } from '@/app/BieuTuong'
import { bienTapYouTube, chayBuocPhimYouTube, layShortsYouTube, luuPhatAmYouTube, taoShortsYouTube, dungVideoYouTube, kiemDinhYouTube, layTrangThaiYouTube, luuThongTinYouTube, suaPhanYouTube, vietPhanYouTube, veAnhBiaYouTube, chonAnhBiaYouTube, xoaVideoYouTube } from '../actions'
import HoSoPhim, { KhoiDuLieu } from './HoSoPhim'

const NGUOI: Record<string, string> = {
  nguoi_ke: '🎙 Người kể',
  nhan_vat_chinh: '⭐ Nhân vật chính',
  meo: '🐱 Mèo Mun',
  robot: '🤖 Robot Bit',
  nguoi_phu_nu: '👩 Người phụ nữ',
  canh_sat: '👮 Cảnh sát',
  hacker: '🕵️ Hacker',
  doanh_nhan: '👔 Doanh nhân',
  nha_khoa_hoc: '🔬 Nhà khoa học',
  nguoi_dung: '🙂 Người dùng',
  ong_lao: '👴 Ông lão',
  ba_lao: '👵 Bà lão',
  hoc_sinh: '🧑‍🎓 Học sinh',
  cong_nhan: '👷 Công nhân',
  nong_dan: '🧑‍🌾 Nông dân',
  bac_si: '🧑‍⚕️ Bác sĩ',
  giao_vien: '🧑‍🏫 Giáo viên',
  ky_su: '🛠️ Kỹ sư',
  bo_doi: '🪖 Quân nhân',
  phong_vien: '🎤 Phóng viên',
  chinh_khach: '🏛️ Lãnh đạo',
  van_dong_vien: '🏅 Vận động viên',
  nghe_si: '🎵 Nghệ sĩ',
  dau_bep: '🧑‍🍳 Đầu bếp',
  nu_doanh_nhan: '👩‍💼 Nữ doanh nhân',
  nguoi_nuoc_ngoai: '🌍 Người nước ngoài',
  vua: '👑 Nhà vua',
  hoang_hau: '👸 Hoàng hậu',
  tuong_quan: '⚔️ Tướng quân',
  chien_binh: '🛡️ Chiến binh',
  nha_su: '🙏 Nhà sư',
  phu_nu_xua: '👩 Phụ nữ xưa',
  nong_dan_xua: '🌾 Nông dân xưa',
  quan_lai: '📜 Quan lại',
}

// Ước lượng độ dài theo số chữ (~19 ký tự mỗi giây + nghỉ giữa câu), giống lib/youtube.ts
const uocGiay = (loi: { chu: string }[] | null) => (loi ? loi.reduce((t, l) => t + l.chu.length / 19 + 0.25, 0) : 0)
// Làm tròn tổng số giây trước (479,6 giây → 8:00, không phải 7:60)
const phutGiay = (giay: number) => `${Math.floor(Math.round(giay) / 60)}:${String(Math.round(giay) % 60).padStart(2, '0')}`

// Chỉ dẫn đạo diễn AI chọn cho từng câu (hiện thành nhãn nhỏ dưới lời thoại)
const KHUNG: Record<string, string> = { toan_canh: 'toàn cảnh', trung_canh: 'trung cảnh', can_canh: 'cận cảnh', sieu_can: 'siêu cận', goc_thap: 'góc thấp', goc_cao: 'góc cao' }
const MAY: Record<string, string> = { dung_yen: 'đứng yên', day_vao: 'đẩy vào', keo_ra: 'kéo ra', lia_sang: 'lia sang', truot_ngang: 'trượt ngang', nang_len: 'nâng lên', rung_tay: 'rung tay' }
const DEN: Record<string, string> = { am_ap: 'ấm', lanh: 'lạnh', cang_thang: 'căng thẳng', tuoi_sang: 'tươi sáng', mo_mong: 'mơ mộng', bi_an: 'bí ẩn', canh_bao: 'cảnh báo đỏ', loe_sang: 'loé sáng' }
const AM: Record<string, string> = { vut: 'vút', bum: 'bùm', ting: 'ting', bop: 'bốp', coi_bao: 'còi báo', go_phim: 'gõ phím', tim_dap: 'tim đập', tich_tac: 'tích tắc', vui: 'nhạc vui', hut_hang: 'hụt hẫng', gio: 'gió', buoc_chan: 'bước chân', vo_tay: 'vỗ tay', xe_chay: 'xe chạy', bo_xe: 'bô xe', coi_xe: 'còi xe', mua: 'mưa', sam: 'sấm', chuong_dt: 'chuông điện thoại', chuong_truong: 'chuông trường', tien: 'tiền keng', go_cua: 'gõ cửa', chup_anh: 'chụp ảnh', reo_ho: 'reo hò', bua: 'búa', phao_hoa: 'pháo hoa', may_bay: 'máy bay', nuoc: 'nước' }
type ChiDan = { khung_hinh?: string; may_quay?: string; anh_sang?: string; am_thanh?: string; lang?: boolean; thoi_tiet?: string }
const THOI_TIET: Record<string, string> = { tuyet: '🌨 tuyết rơi', mua: '🌧 mưa', suong: '🌫 sương mù' }
const chiDan = (l: ChiDan) =>
  [
    l.lang && '⏸ lặng',
    l.khung_hinh && `📷 ${KHUNG[l.khung_hinh] ?? l.khung_hinh}`,
    l.may_quay && `🎥 ${MAY[l.may_quay] ?? l.may_quay}`,
    l.anh_sang && DEN[l.anh_sang] && `💡 ${DEN[l.anh_sang]}`,
    l.am_thanh && AM[l.am_thanh] && `🔊 ${AM[l.am_thanh]}`,
    l.thoi_tiet && THOI_TIET[l.thoi_tiet],
  ].filter(Boolean).join(' · ')

const NHOM: Record<string, string> = {
  hoang_gia: '👑 Hoàng gia',
  lich_su: '⚔️ Nhân vật lịch sử',
  the_thao: '⚽ Thể thao',
  am_nhac: '🎤 Âm nhạc',
  dien_anh: '🎬 Điện ảnh – giải trí',
  khoa_hoc: '🔬 Nhà khoa học – thiên tài',
  chinh_tri: '🏛️ Chính trị – lãnh đạo',
  doanh_nhan: '💼 Doanh nhân – tỷ phú',
  khac: '⭐ Nhân vật',
}

const NHAN: Record<TrangThaiPhan['loai'], [string, string]> = {
  chua_viet: ['Chưa viết', 'bg-slate-100 text-slate-500'],
  chua_dung: ['Chưa dựng', 'bg-slate-100 text-slate-600'],
  cho: ['Chờ máy nhà', 'bg-amber-100 text-amber-800'],
  dang_lam: ['Đang dựng', 'bg-violet-100 text-violet-700'],
  xong: ['Đã dựng', 'bg-emerald-100 text-emerald-700'],
  loi: ['Lỗi', 'bg-red-100 text-red-700'],
}

// Ghi nguồn ảnh Wikimedia Commons cho mô tả YouTube (giấy phép CC BY / CC BY-SA bắt buộc ghi tác giả + giấy phép)
const ghiNguonAnh = (ds: { tac_gia: string; giay_phep: string; nguon: string; ten_tep: string }[]) =>
  ['Nguồn ảnh (Wikimedia Commons):', ...ds.map((a) => `- ${a.ten_tep.replace(/\.[a-z]+$/i, '').replace(/_/g, ' ')}: ${a.tac_gia}, ${a.giay_phep} — ${a.nguon}`)].join('\n')

// Mốc chương YouTube: "0:00 Tên chương 1", "m:ss Tên chương k" (bỏ tiền tố "Phần 1:" AI hay đặt)
const mocChuong = (d: DuAnYT, moc: number[]) =>
  d.phan
    .map((p, i) => {
      const g = Math.floor(moc[i] ?? 0)
      const h = Math.floor(g / 3600)
      const m = Math.floor((g % 3600) / 60)
      const s = String(g % 60).padStart(2, '0')
      const ten = p.tieu_de.replace(/^\s*(phần|chương|tập)\s*\d+\s*[:.\-–—]\s*/i, '').trim()
      return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${s} ${d.loai === 'tieu_su' ? 'Chương' : 'Phần'} ${i + 1}: ${ten}`
    })
    .join('\n')

function NutChep({ chu, ten = 'Chép' }: { chu: string; ten?: string }) {
  const [da, setDa] = useState(false)
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(chu).then(() => {
          setDa(true)
          setTimeout(() => setDa(false), 1500)
        })
      }
      className="btn btn-sm btn-nhat"
    >
      {da ? <IconXong className="h-3.5 w-3.5 text-emerald-600" /> : <IconChep className="h-3.5 w-3.5" />}
      {da ? 'Đã chép' : ten}
    </button>
  )
}

// Hội đồng kiểm duyệt & phản biện (lib/phanBien.ts): điểm, đạt / chưa, vấn đề, góp ý, đã làm lại mấy lần
const TEN_KHAU: Record<string, string> = {
  dan_y: 'Dàn ý video',
  nghien_cuu: 'Nghiên cứu tư liệu',
  cau_chuyen: 'Phát triển câu chuyện',
  tao_hinh: 'Thiết kế nhân vật chính',
  ho_so: 'Hồ sơ hình ảnh',
  dong_goi: 'Đóng gói YouTube',
}
type PB = NonNullable<PhanYT['phan_bien']>
function PhanBien({ pb, ten }: { pb: PB; ten?: string }) {
  const mau = pb.dat ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : pb.diem >= 6 ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-red-50 text-red-700 ring-red-200'
  return (
    <details className={`rounded-xl p-3 ring-1 ${mau}`}>
      <summary className="cursor-pointer text-sm font-semibold">
        ⚖️ {ten ? `${ten}: ` : 'Hội đồng phản biện: '}
        {pb.diem}/10 · {pb.dat ? 'Đạt ✓' : 'Chưa đạt'}
        {pb.lan > 1 && !pb.giu && ' · đã làm lại theo góp ý'}
        {pb.giu === 'moi' && ` · đã viết lại theo góp ý (bản đầu ${pb.diem_dau}/10)`}
        {pb.giu === 'cu' && ' · bản viết lại bị chấm thấp hơn nên giữ bản đầu'}
        {pb.giu === 'moi_chua_cham' && ' · đã viết lại theo góp ý, chưa chấm lại được (hết lượt AI)'}
      </summary>
      {pb.lan > 1 && !pb.dat && ten === 'Hội đồng chấm kịch bản' && (
        <p className="mt-2 text-xs">Hệ thống chỉ tự viết lại một lần. Muốn cải thiện thêm, bấm «AI sửa theo góp ý» bên dưới: chỉ sửa đúng những câu bị chê (tốn lượt AI).</p>
      )}
      {pb.van_de.length > 0 && (
        <ul className="mt-2 grid gap-1 text-sm">
          {pb.van_de.map((v, i) => (
            <li key={i}>• {v}</li>
          ))}
        </ul>
      )}
      {pb.goi_y && <p className="mt-2 text-sm">→ {pb.goi_y}</p>}
    </details>
  )
}

// Biên tập viên kiểm định (lib/kiemDinh.ts): điểm + ghi chú nên xem lại + những gì đã tự sửa
function KiemDinh({ kd }: { kd: NonNullable<PhanYT['kiem_dinh']> }) {
  const mau = kd.diem >= 85 ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : kd.diem >= 65 ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-red-50 text-red-700 ring-red-200'
  return (
    <details className={`rounded-xl p-3 ring-1 ${mau}`}>
      <summary className="cursor-pointer text-sm font-semibold">
        🧐 Biên tập viên chấm {kd.diem}/100{kd.ghi_chu.length ? ` · ${kd.ghi_chu.length} điều nên xem lại` : ' · kịch bản ổn'}
        {kd.da_sua.length > 0 && ` · đã tự sửa ${kd.da_sua.length} kiểu lỗi`}
      </summary>
      <ul className="mt-2 grid gap-1 text-sm">
        {kd.ghi_chu.map((g, i) => (
          <li key={i}>{g.muc === 'loi' ? '❌' : '⚠️'} {g.chu}</li>
        ))}
        {kd.da_sua.map((x, i) => (
          <li key={`s${i}`} className="text-slate-600">
            ✅ {x}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs opacity-75">Phần tự sửa chỉ đổi hình ảnh / nhịp (đạo cụ, khung hình, máy quay, âm thanh) và tách câu quá dài; không đổi nội dung lời thoại.</p>
    </details>
  )
}

// Máy nhà tự kiểm tra video sau khi ghép: độ dài, độ to tiếng (chuẩn YouTube -14 LUFS), đoạn im lặng, khung hình đen
function KiemTra({ kt }: { kt: KiemTraVideo }) {
  const tot = kt.ghi_chu.length === 0
  return (
    <div className={`rounded-xl p-3 text-sm ring-1 ${tot ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200'}`}>
      <p className="font-semibold">{tot ? '✅ Máy nhà đã tự kiểm tra: video đạt' : '⚠️ Máy nhà đã tự kiểm tra: có điều nên xem lại'}</p>
      <ul className="mt-1 grid gap-0.5">
        {kt.do_dai != null && <li>Độ dài: {phutGiay(kt.do_dai)} phút</li>}
        {kt.lufs != null && (
          <li>
            Độ to tiếng: {kt.lufs.toFixed(1)} LUFS (chuẩn YouTube −14)
            {kt.da_chinh_am && kt.lufs_goc != null && ` · đã tự chỉnh từ ${kt.lufs_goc.toFixed(1)}`}
          </li>
        )}
        <li>Đoạn im lặng lâu: {kt.im_lang.length ? kt.im_lang.map(([t, d]) => `${phutGiay(t)} (${d.toFixed(1)} giây)`).join(', ') : 'không có'}</li>
        <li>Khung hình đen: {kt.man_den.length ? kt.man_den.map(([t, d]) => `${phutGiay(t)} (${d.toFixed(1)} giây)`).join(', ') : 'không có'}</li>
        {kt.ghi_chu.map((g, i) => (
          <li key={i} className="font-semibold">
            → {g}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ChiTiet({ dau, ttDau }: { dau: DuAnYT; ttDau: TrangThaiDuAn }) {
  const router = useRouter()
  const [d, setD] = useState(dau)
  const [tt, setTt] = useState(ttDau)
  const [dangViet, setDangViet] = useState<number | null>(null) // phần AI đang viết
  const [dangChay, setDangChay] = useState<string | null>(null) // việc AI đang làm (hiện thành dòng trạng thái)
  const [loiViet, setLoiViet] = useState('')
  const [dangLam, startTransition] = useTransition()
  const [tieuDe, setTieuDe] = useState(dau.tieu_de)
  const [moTa, setMoTa] = useState(dau.mo_ta)
  const [the, setThe] = useState(dau.the.join(', '))
  const daChay = useRef(false)

  const capNhatTt = async () => {
    const kq = await layTrangThaiYouTube(d.id)
    if (kq.ok) setTt(kq.tt)
  }

  const [loiBienTap, setLoiBienTap] = useState('')
  // Shorts: trạng thái dựng 3 đoạn (hỏi lại mỗi 10 giây khi còn đang chờ / đang dựng)
  const [shorts, setShorts] = useState<TrangThaiShort[]>([])
  const capNhatShorts = async () => {
    const kq = await layShortsYouTube(d.id)
    if (kq.ok) setShorts(kq.ds)
  }
  const coShorts = !!d.shorts
  const choShorts = shorts.some((x) => x.trang_thai === 'cho' || x.trang_thai === 'dang_lam')
  useEffect(() => {
    if (!coShorts) return
    // Hỏi ngay sau lượt vẽ (không đặt state trong thân effect), rồi mỗi 10 giây khi còn đang chờ / đang dựng
    const dau = setTimeout(() => void capNhatShorts(), 0)
    const t = choShorts || !shorts.length ? setInterval(() => document.visibilityState === 'visible' && void capNhatShorts(), 10000) : undefined
    return () => {
      clearTimeout(dau)
      if (t) clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coShorts, choShorts])

  // Vòng biên tập cả phim (AI máy nhà): gửi phiếu / hỏi kết quả. Đang chờ thì hỏi lại mỗi 8 giây (effect bên dưới)
  const bienTap = async (batDauLai = false) => {
    setLoiBienTap('')
    const kq = await bienTapYouTube(d.id, batDauLai)
    if (!kq.ok) return setLoiBienTap(kq.loi)
    setD(kq.tt.duAn)
    if (kq.tt.trang_thai === 'loi') setLoiBienTap(kq.tt.loi ?? 'Có lỗi')
    if (kq.tt.trang_thai === 'xong') {
      thongBao('ok', `Biên tập xong: sửa ${kq.tt.duAn.bien_tap?.chi_tiet.length ?? 0} chỗ`)
      await capNhatTt()
    }
  }
  const choBienTap = !!d.ai_cho?.bien_tap
  useEffect(() => {
    if (!choBienTap) return
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void bienTap()
    }, 8000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choBienTap])

  // AI làm lần lượt mọi việc còn thiếu (mỗi việc một lượt gọi máy chủ để không quá thời gian):
  // video thường: viết lời từng phần; phim tiểu sử: nghiên cứu → câu chuyện → kịch bản từng chương → hồ sơ hình ảnh →
  // phân cảnh từng chương → đóng gói YouTube. chiPhan: chỉ viết lại một phần.
  type KetQua = { ok: true; duAn: DuAnYT } | { ok: false; loi: string }
  const chayTiep = async (chiPhan?: number) => {
    setLoiViet('')
    let moi = d
    const lam = async (moTaViec: string, viec: () => Promise<KetQua>, k?: number) => {
      setDangChay(moTaViec)
      setDangViet(k ?? null)
      const kq = await viec()
      if (!kq.ok) {
        setLoiViet(kq.loi)
        return false
      }
      if (kq.duAn.tieu_de !== moi.tieu_de) setTieuDe(kq.duAn.tieu_de)
      if (kq.duAn.mo_ta !== moi.mo_ta) setMoTa(kq.duAn.mo_ta)
      if (kq.duAn.the.join(', ') !== moi.the.join(', ')) setThe(kq.duAn.the.join(', '))
      moi = kq.duAn
      setD(moi)
      return true
    }
    try {
      const phim = moi.loai === 'tieu_su'
      const ten = phim ? 'chương' : 'phần'
      if (chiPhan) {
        await lam(`AI đang viết lại ${ten} ${chiPhan}…`, () => vietPhanYouTube(moi.id, chiPhan), chiPhan)
        return
      }
      if (phim && !moi.phim?.nghien_cuu && !(await lam('Nghiên cứu nhân vật: đọc Wikipedia + tài liệu, kiểm chứng từng sự thật…', () => chayBuocPhimYouTube(moi.id, 'nghien_cuu')))) return
      if (phim && moi.phim?.anh === undefined && !(await lam('Lấy ảnh thật trong bài Wikipedia (Wikimedia Commons)…', () => chayBuocPhimYouTube(moi.id, 'lay_anh')))) return
      if (phim && !moi.phim?.cau_chuyen && !(await lam('Phát triển câu chuyện: khán giả, góc kể, big idea, cấu trúc, hook, chia chương…', () => chayBuocPhimYouTube(moi.id, 'cau_chuyen')))) return
      if (phim && !moi.phim?.tao_hinh?.nhom && !(await lam('Thiết kế nhân vật chính: tuổi từng giai đoạn, tóc, trang phục, đồ vật đặc trưng…', () => chayBuocPhimYouTube(moi.id, 'tao_hinh')))) return
      // Hồ sơ hình ảnh trước khi viết chương: chỉ dẫn hình từng câu (bối cảnh, ánh sáng, đạo cụ, nhân vật phụ) bám theo hồ sơ
      if (phim && !moi.phim?.ho_so && !(await lam('Hồ sơ hình ảnh: nhân vật, bối cảnh, thiết kế, màu, nhạc…', () => chayBuocPhimYouTube(moi.id, 'ho_so')))) return
      for (let k = 1; k <= moi.phan.length; k++) {
        if (moi.phan[k - 1].loi) continue
        if (!(await lam(`AI đang viết kịch bản ${ten} ${k}/${moi.phan.length}…`, () => vietPhanYouTube(moi.id, k), k))) return
      }
      // Viết đủ các chương mà chưa biên tập cả phim: tự gửi máy nhà biên tập (không tốn lượt Gemini)
      if (moi.phan.every((x) => x.loi) && !moi.bien_tap && !moi.ai_cho?.bien_tap) {
        const kq = await bienTapYouTube(moi.id)
        if (kq.ok) {
          moi = kq.tt.duAn
          setD(moi)
        }
      }
      if (!phim) return
      for (let k = 1; k <= moi.phan.length; k++) {
        if (moi.phan[k - 1].canh) continue
        if (!(await lam(`Phân cảnh, shot list và prompt video AI chương ${k}/${moi.phan.length}…`, () => chayBuocPhimYouTube(moi.id, 'phan_canh', k), k))) return
      }
      if (!moi.phim?.dong_goi && !(await lam('Đóng gói YouTube: 20 tiêu đề, thumbnail, mô tả, Shorts, chấm điểm…', () => chayBuocPhimYouTube(moi.id, 'dong_goi')))) return
    } finally {
      setDangChay(null)
      setDangViet(null)
      await capNhatTt()
    }
  }
  // AI sửa đúng những câu hội đồng chê trong phần k (giữ nguyên các câu khác), hội đồng chấm lại
  const suaTheoGopY = async (k: number) => {
    setLoiViet('')
    setDangChay(`AI đang sửa phần ${k} theo góp ý của hội đồng…`)
    setDangViet(k)
    const kq = await suaPhanYouTube(d.id, k)
    setDangChay(null)
    setDangViet(null)
    if (!kq.ok) return setLoiViet(kq.loi)
    setD(kq.duAn)
    if (kq.giu === 'cu') thongBao('loi', `AI sửa ${kq.soCho} chỗ nhưng hội đồng chấm thấp hơn (${kq.diem}/10) nên giữ bản cũ`)
    else thongBao('ok', `AI đã sửa ${kq.soCho} chỗ${kq.diem !== null ? `, hội đồng chấm lại ${kq.diem}/10` : ''} — phần này cần dựng lại`)
    await capNhatTt()
  }
  // Chạy lại một giai đoạn của phim (nút "AI làm lại bước này"), rồi làm tiếp các việc còn thiếu
  const chayLaiBuoc = async (buoc: 'nghien_cuu' | 'lay_anh' | 'cau_chuyen' | 'tao_hinh' | 'ho_so' | 'dong_goi' | 'phan_canh', k?: number) => {
    setLoiViet('')
    setDangChay(buoc === 'phan_canh' ? `Phân cảnh lại chương ${k}…` : 'AI đang làm lại bước này…')
    setDangViet(k ?? null)
    const kq = await chayBuocPhimYouTube(d.id, buoc, k)
    setDangChay(null)
    setDangViet(null)
    if (!kq.ok) return setLoiViet(kq.loi)
    setD(kq.duAn)
    setTieuDe(kq.duAn.tieu_de)
    setMoTa(kq.duAn.mo_ta)
    setThe(kq.duAn.the.join(', '))
    if (buoc === 'cau_chuyen') thongBao('ok', 'Đã chia chương mới — bấm "Chạy tiếp" để AI viết kịch bản')
    if (buoc === 'lay_anh') {
      thongBao('ok', `Đã lấy ${kq.duAn.phim?.anh?.length ?? 0} ảnh — bấm Dựng video để dựng lại`)
      await capNhatTt()
    }
    if (buoc === 'tao_hinh') {
      thongBao(kq.duAn.phim?.tao_hinh?.mac_dinh ? 'loi' : 'ok', kq.duAn.phim?.tao_hinh?.mac_dinh ? 'AI chưa thiết kế được, tạm dùng hình mặc định' : 'Đã thiết kế lại nhân vật chính — bấm Dựng video để dựng lại')
      await capNhatTt()
    }
  }

  useEffect(() => {
    if (daChay.current) return
    daChay.current = true
    const p = dau.phim
    const conThieu =
      dau.phan.some((x) => !x.loi) ||
      dau.phan.length === 0 ||
      (dau.loai === 'tieu_su' && (!p?.nghien_cuu || p.anh === undefined || !p.cau_chuyen || !p.tao_hinh?.nhom || !p.ho_so || !p.dong_goi || dau.phan.some((x) => !x.canh)))
    // Gọi sau lượt vẽ đầu (không đặt state ngay trong effect)
    if (conThieu) setTimeout(() => void chayTiep(), 0)
    // Chỉ chạy một lần khi mở trang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Đang chờ / đang dựng / đã dựng đủ mà chưa ghép xong / đang vẽ ảnh bìa: hỏi lại trạng thái mỗi 8 giây
  const dangCho = !!tt.ve_bia || tt.phan.some((p) => p.loai === 'cho' || p.loai === 'dang_lam') || (!tt.xong && tt.phan.length > 0 && tt.phan.every((p) => p.loai === 'xong'))
  useEffect(() => {
    if (!dangCho) return
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void capNhatTt()
    }, 8000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dangCho])

  const daVietDu = d.phan.length > 0 && d.phan.every((p) => p.loi)
  const soXong = tt.phan.filter((p) => p.loai === 'xong').length
  const tongGiay = d.phan.reduce((t, p) => t + uocGiay(p.loi), 0)
  const coViecDung = tt.phan.some((p) => p.loai === 'chua_dung' || p.loai === 'loi')
  // Mọi phần đã dựng mà chưa có video ghép (vd lần ghép trước lỗi): bấm Dựng để máy nhà ghép lại
  const choGhep = !tt.xong && tt.phan.length > 0 && tt.phan.every((p) => p.loai === 'xong')

  const dung = (chiPhan?: number) =>
    startTransition(async () => {
      const kq = await dungVideoYouTube(d.id, chiPhan)
      if (!kq.ok) return thongBao('loi', kq.loi)
      thongBao('ok', kq.so ? `Đã gửi ${kq.so} phần cho máy nhà dựng` : 'Không có phần nào cần dựng')
      await capNhatTt()
    })

  const luuThongTin = () =>
    startTransition(async () => {
      const ds = the.split(',').map((x) => x.trim()).filter(Boolean)
      const kq = await luuThongTinYouTube(d.id, { tieu_de: tieuDe, mo_ta: moTa, the: ds })
      if (!kq.ok) return thongBao('loi', kq.loi)
      setD({ ...d, tieu_de: tieuDe, mo_ta: moTa, the: ds })
      thongBao('ok', 'Đã lưu tiêu đề, mô tả, thẻ')
    })

  const xoa = () => {
    if (!confirm('Xoá video này? Xoá khỏi trang và xoá luôn file video trên máy nhà (Desktop\Video-YouTube). Không khôi phục được.')) return
    startTransition(async () => {
      const kq = await xoaVideoYouTube(d.id)
      if (!kq.ok) return thongBao('loi', kq.loi)
      router.push('/youtube')
    })
  }

  const doiThongTin = tieuDe !== d.tieu_de || moTa !== d.mo_ta || the !== d.the.join(', ')

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/youtube" className="text-sm font-semibold text-slate-500 hover:text-slate-800">
            ← Video YouTube
          </Link>
          {d.loai === 'tieu_su' && <p className="mt-1 text-xs font-bold uppercase tracking-wide text-violet-600">🎬 Phim tiểu sử · {d.phim?.ten}</p>}
          <h1 className="mt-1 text-2xl font-extrabold leading-snug tracking-tight">{d.tieu_de}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {d.phan.length} {d.loai === 'tieu_su' ? 'chương' : 'phần'} · {daVietDu ? `dài khoảng ${phutGiay(tongGiay)} phút` : `dự kiến ${d.phut} phút`} · khung ngang 16:9
          </p>
        </div>
        <button type="button" onClick={xoa} disabled={dangLam} className="btn btn-sm btn-nhat text-red-600">
          Xoá video
        </button>
      </div>

      {dangChay && (
        <p className="flex items-center gap-2 rounded-xl bg-violet-50 p-3 text-sm text-violet-700 ring-1 ring-violet-200">
          <Xoay /> {dangChay} (giữ trang này mở)
        </p>
      )}
      {loiViet && !dangChay && (
        <p className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          {loiViet}
          <button type="button" onClick={() => chayTiep()} className="btn btn-sm btn-phu">
            Chạy tiếp
          </button>
        </p>
      )}

      {tt.mayNha && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">⚠ {tt.mayNha}. Mở máy nhà và chạy chay-vieneu.bat thì mới dựng được video.</p>}

      {/* Dựng video + tiến độ chung */}
      <section className="the grid gap-3 p-5">
        {tt.xong ? (
          <div className="grid gap-2">
            <p className="flex items-center gap-2 text-base font-bold text-emerald-700">
              <IconXong className="h-5 w-5" /> Video đã dựng xong
            </p>
            <p className="text-sm text-slate-600">Video nằm trên máy nhà, tại:</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 break-all rounded-lg bg-slate-100 px-3 py-2 text-sm">{tt.xong.tep}</code>
              <NutChep chu={tt.xong.tep} ten="Chép đường dẫn" />
            </div>
            <p className="text-xs text-slate-500">Mở thư mục Desktop → Video-YouTube trên máy nhà để thấy video. Sửa lời thoại một phần thì chỉ phần đó dựng lại.</p>
            {tt.xong.moc_chuong && tt.xong.moc_chuong.length >= 3 && (
              <label className="grid">
                <span className="label">
                  Mốc chương (dán vào đầu mô tả YouTube để hiện chương trên thanh thời gian) <NutChep chu={mocChuong(d, tt.xong.moc_chuong)} />
                </span>
                <textarea readOnly rows={Math.min(8, d.phan.length)} value={mocChuong(d, tt.xong.moc_chuong)} className="input text-xs" />
              </label>
            )}
            {tt.xong.phu_de && (
              <a href={tt.xong.phu_de} className="btn btn-sm btn-phu justify-self-start">
                Tải phụ đề (.srt)
              </a>
            )}
            {tt.xong.phu_de && <p className="text-xs text-slate-500">YouTube Studio → Phụ đề → Thêm → Tải tệp lên → Có thời gian → chọn phu-de.srt (cũng nằm cạnh video trên máy nhà).</p>}
            {tt.xong.kiem_tra && <KiemTra kt={tt.xong.kiem_tra} />}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold">Dựng video</p>
                <p className="text-sm text-slate-500">
                  {!daVietDu ? 'Chờ AI viết xong lời thoại các phần' : soXong ? `Đã dựng ${soXong}/${d.phan.length} phần` : 'Máy nhà đọc giọng và dựng hình lần lượt từng phần, rồi ghép thành một video'}
                </p>
              </div>
              <button type="button" onClick={() => dung()} disabled={dangLam || !daVietDu || !!dangChay || !(coViecDung || choGhep)} className="btn bg-red-600 px-5 py-2.5 text-white hover:bg-red-700">
                {dangLam ? <Xoay /> : <IconYouTube className="h-4 w-4" />}
                {!coViecDung && !choGhep && tt.phan.some((p) => p.loai === 'cho' || p.loai === 'dang_lam') ? 'Đang dựng…' : soXong || tt.phan.some((p) => p.loai === 'cho' || p.loai === 'dang_lam') ? 'Dựng các phần còn lại' : 'Dựng video'}
              </button>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-700"
                style={{
                  width: `${Math.round(
                    ((soXong + tt.phan.reduce((t, p) => t + (p.loai === 'dang_lam' ? p.phanTram / 100 : 0), 0)) / Math.max(1, d.phan.length)) * 100,
                  )}%`,
                }}
              />
            </div>
            {daVietDu && <MayNhaDangLam tt={tt} soPhan={d.phan.length} />}
            {soXong === d.phan.length && !tt.xong && !tt.ketGhep && (
              <p className="flex items-center gap-2 text-sm text-violet-700">
                <Xoay /> Đang ghép các phần thành một video…
              </p>
            )}
            {tt.ketGhep && (
              <p className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
                ⚠ Đủ {d.phan.length} phần nhưng máy nhà chưa ghép được video.
                <button type="button" disabled={dangLam} onClick={() => dung()} className="btn btn-sm btn-phu">
                  Ghép lại
                </button>
              </p>
            )}
            <p className="text-xs text-slate-400">
              Mỗi phần khoảng {Math.round(d.phut / d.phan.length)} phút video mất khoảng 10–20 phút dựng. Có thể đóng trang, máy nhà vẫn làm tiếp; video TikTok vẫn được ưu tiên làm trước.
            </p>
          </>
        )}
      </section>

      {/* Shorts: 3 đoạn gay cấn nhất dựng lại khung dọc 9:16 */}
      {daVietDu && <AnhBia d={d} tt={tt} khoa={dangLam} setD={setD} capNhatTt={capNhatTt} />}
      {daVietDu && (
        <section className="the grid gap-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold">✂ Shorts (khung dọc 9:16)</span>
            <button
              type="button"
              disabled={dangLam || choShorts}
              onClick={() =>
                (!d.shorts || confirm('Tạo lại 3 Shorts? Máy nhà sẽ dựng lại từ đầu.')) &&
                startTransition(async () => {
                  const kq = await taoShortsYouTube(d.id)
                  if (!kq.ok) return thongBao('loi', kq.loi)
                  setD(kq.duAn)
                  thongBao('ok', 'Đã gửi máy nhà dựng 3 Shorts')
                  await capNhatShorts()
                })
              }
              className="btn btn-sm btn-phu"
            >
              {d.shorts ? 'Tạo lại Shorts' : 'Tạo 3 Shorts'}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Máy tự chọn 3 đoạn gay cấn nhất (25–55 giây: cảm xúc mạnh, cảnh hành động, con số, lời nhân vật chính), dựng lại khung dọc có chữ móc câu ở đầu và lời mời xem bản đầy đủ ở cuối. Shorts là cách kéo người xem mới mạnh nhất. Mỗi Shorts mất khoảng 10–15 phút dựng.
          </p>
          {d.shorts && (
            <ul className="grid gap-1.5 text-sm">
              {d.shorts.doan.map((x) => {
                const s = shorts.find((y) => y.so === x.so)
                return (
                  <li key={x.so} className="flex flex-wrap items-center gap-2">
                    <span className="chip bg-slate-100 text-slate-700">Shorts {x.so}</span>
                    <span className="min-w-0 flex-1">
                      “{x.tieu_de}” · {d.loai === 'tieu_su' ? 'chương' : 'phần'} {x.phan}, câu {x.tu}–{x.den}
                    </span>
                    {!s || s.trang_thai === 'cho' ? (
                      <span className="chip bg-amber-100 text-amber-800">Chờ máy nhà</span>
                    ) : s.trang_thai === 'dang_lam' ? (
                      <span className="chip bg-violet-100 text-violet-700">Đang dựng {s.phan_tram ?? 0}%</span>
                    ) : s.trang_thai === 'xong' ? (
                      <span className="flex items-center gap-1">
                        <span className="chip bg-emerald-100 text-emerald-700">Xong</span>
                        <NutChep chu={s.tep ?? ''} ten="Chép đường dẫn" />
                      </span>
                    ) : (
                      <span className="chip bg-red-100 text-red-700" title={s.loi}>
                        Lỗi
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {/* Cách đọc tên riêng: chỉ đổi chữ đưa vào giọng đọc */}
      <section className="the grid gap-2 p-4">
        <span className="font-bold">🗣 Cách đọc tên riêng</span>
        <textarea
          rows={3}
          defaultValue={d.phat_am ?? ''}
          placeholder={'Mỗi dòng một tên, ví dụ:\nGenghis Khan = Ghen-ghít Khan\nKharkov = Khác-cốp'}
          onBlur={(e) => {
            const v = e.target.value
            if (v === (d.phat_am ?? '')) return
            setD({ ...d, phat_am: v })
            startTransition(async () => {
              const kq = await luuPhatAmYouTube(d.id, v)
              if (!kq.ok) return thongBao('loi', kq.loi)
              thongBao('ok', 'Đã lưu cách đọc — các phần có tên này sẽ dựng lại')
              await capNhatTt()
            })
          }}
          className="input text-sm"
        />
        <p className="text-xs text-slate-400">Giọng đọc hay đọc sai tên nước ngoài: ghi cách đọc theo kiểu Việt. Phụ đề vẫn hiện tên gốc. Lưu xong bấm Dựng video.</p>
      </section>

      {/* Tiêu đề, mô tả, thẻ để đăng YouTube */}
      <section className="the grid gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Thông tin đăng YouTube</h2>
          <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="btn btn-sm bg-red-600 text-white hover:bg-red-700">
            <IconMo className="h-3.5 w-3.5" /> Mở YouTube Studio
          </a>
        </div>
        <label className="grid">
          <span className="label">
            Tiêu đề ({tieuDe.length}/100) <NutChep chu={tieuDe} />
          </span>
          <input value={tieuDe} maxLength={100} onChange={(e) => setTieuDe(e.target.value)} className="input" />
        </label>
        <label className="grid">
          <span className="label">
            Mô tả <NutChep chu={moTa} />
          </span>
          <textarea value={moTa} rows={4} maxLength={5000} onChange={(e) => setMoTa(e.target.value)} className="input" />
        </label>
        <label className="grid">
          <span className="label">
            Thẻ (cách nhau dấu phẩy) <NutChep chu={the} />
          </span>
          <input value={the} onChange={(e) => setThe(e.target.value)} className="input" />
        </label>
        {doiThongTin && (
          <button type="button" onClick={luuThongTin} disabled={dangLam} className="btn btn-phu justify-self-start">
            Lưu thay đổi
          </button>
        )}
        <p className="text-xs text-slate-400">
          Trong YouTube Studio bấm Tạo → Tải video lên, chọn video trong thư mục Video-YouTube, dán tiêu đề, mô tả, thẻ (mục Hiện thêm), chọn &quot;Không, nội dung này không dành cho trẻ em&quot; rồi Xuất bản.
        </p>
      </section>

      {d.loai === 'tieu_su' && d.phim?.tao_hinh && (
        <section className="the grid gap-2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">
              ⭐ Nhân vật chính trên sân khấu: {d.phim.ten}
              {d.phim.tao_hinh.nhom && <span className="chip ml-2 bg-violet-100 text-violet-700">{NHOM[d.phim.tao_hinh.nhom] ?? d.phim.tao_hinh.nhom}</span>}
            </h2>
            <button
              type="button"
              disabled={!!dangChay || dangLam}
              onClick={() => confirm('AI thiết kế lại nhân vật chính? Các chương sẽ phải dựng lại.') && void chayLaiBuoc('tao_hinh')}
              className="btn btn-sm btn-phu"
            >
              Thiết kế lại
            </button>
          </div>
          <p className="text-sm text-slate-600">
            Nhân vật hoạt hình (không phải chân dung thật), có vầng sáng vàng dưới chân. Tự đứng trên sân khấu mỗi khi người kể nói mà chưa có ai, khi lời thoại nhắc tới họ, và tự nói những câu trích dẫn của họ ({d.phim.tao_hinh.gioi === 'nu' ? 'giọng Mỹ Duyên' : 'giọng Thiện Minh'}).
          </p>
          {d.phim.tao_hinh.mac_dinh && <p className="text-sm text-amber-700">⚠ AI chưa thiết kế được, đang dùng hình mặc định. Bấm Thiết kế lại sau ít phút.</p>}
          <ul className="grid gap-1.5 text-sm">
            {d.phim.tao_hinh.giai_doan.map((g, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <span className="chip bg-amber-100 text-amber-800">Từ chương {g.tu_chuong}</span>
                <span className="h-4 w-4 rounded-full ring-1 ring-slate-300" style={{ background: g.mau_ao }} title="Màu áo" />
                <span className="h-4 w-4 rounded-full ring-1 ring-slate-300" style={{ background: g.mau_quan }} title="Màu quần" />
                <span>{g.mo_ta}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.loai === 'tieu_su' && d.phim?.anh && (
        <section className="the grid gap-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">🖼 Ảnh thật từ Wikipedia ({d.phim.anh.length})</h2>
            <button type="button" disabled={!!dangChay || dangLam} onClick={() => void chayLaiBuoc('lay_anh')} className="btn btn-sm btn-phu">
              Lấy lại ảnh
            </button>
          </div>
          {d.phim.anh.length === 0 ? (
            <p className="text-sm text-slate-500">Bài Wikipedia không có ảnh dùng được (chỉ lấy ảnh giấy phép tự do trên Wikimedia Commons). Phim vẫn dựng bằng hoạt hình.</p>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Chỉ lấy ảnh trên Wikimedia Commons (giấy phép tự do hoặc phạm vi công cộng). AI ghép ảnh vào đúng câu kể nói về nội dung trong ảnh; video hiện khung ảnh kèm dòng ghi nguồn.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {d.phim.anh.map((a, i) => (
                  <a key={a.url} href={a.nguon} target="_blank" rel="noreferrer" className="group grid gap-1 text-xs text-slate-500" title={a.mo_ta}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.mo_ta} loading="lazy" className="aspect-[4/3] w-full rounded-lg bg-slate-100 object-cover ring-1 ring-slate-200 group-hover:ring-red-400" />
                    <span className="line-clamp-2">
                      {i}. {a.chinh && '⭐ '}
                      {a.mo_ta}
                    </span>
                    <span className="truncate text-[11px] text-slate-400">
                      {a.tac_gia} · {a.giay_phep}
                    </span>
                  </a>
                ))}
              </div>
              <label className="grid">
                <span className="label">
                  Ghi nguồn ảnh (dán vào cuối mô tả YouTube) <NutChep chu={ghiNguonAnh(d.phim.anh)} />
                </span>
                <textarea readOnly rows={3} value={ghiNguonAnh(d.phim.anh)} className="input text-xs" />
              </label>
            </>
          )}
        </section>
      )}

      {d.phan_bien && Object.keys(d.phan_bien).length > 0 && (
        <section className="the grid gap-2 p-5">
          <h2 className="font-bold">⚖️ Hội đồng kiểm duyệt & phản biện</h2>
          <p className="text-xs text-slate-500">
            Sau mỗi khâu AI làm xong, một hội đồng AI khác chấm theo tiêu chí riêng của khâu đó và theo kỳ vọng khán giả. Dưới 6 điểm thì khâu đó tự làm lại một lần theo góp ý. Điểm từng chương nằm trong phần Kịch bản.
          </p>
          <div className="grid gap-2">
            {Object.entries(TEN_KHAU).map(([k, ten]) => {
              const pb = d.phan_bien?.[k as keyof typeof d.phan_bien]
              return pb ? <PhanBien key={k} pb={pb} ten={ten} /> : null
            })}
          </div>
        </section>
      )}

      {d.loai === 'tieu_su' && <HoSoPhim d={d} chay={(buoc) => void chayLaiBuoc(buoc)} dangChay={!!dangChay} />}

      {/* Các phần */}
      <section className="grid gap-3">
        {d.phan.length > 0 && d.phan.every((p) => p.loi) && (
          <div className="the grid gap-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">🎬 Biên tập cả phim</p>
              <button
                type="button"
                disabled={choBienTap || !!dangChay || dangLam}
                onClick={() => (!d.bien_tap || confirm('Biên tập lại cả phim? Các chương được sửa sẽ phải dựng lại.')) && void bienTap(!!d.bien_tap)}
                className="btn btn-sm btn-phu"
              >
                {choBienTap ? <Xoay /> : null}
                {choBienTap ? 'Máy nhà đang đọc kịch bản…' : d.bien_tap ? 'Biên tập lại' : 'Biên tập cả phim'}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Như biên tập viên thật: đọc trọn mọi chương một lượt, viết lại câu lặp ý / câu hỏi rập khuôn của Mèo Mun / câu nhạt, bỏ câu thừa — không thêm sự kiện mới. Gemini làm trước (1 lượt, xong ngay); Gemini hết lượt thì AI trên máy nhà làm (miễn phí, khoảng 10 phút, có thể đóng trang). Biên tập trước khi bấm Dựng video.
            </p>
            {loiBienTap && <p className="text-sm text-red-600">{loiBienTap}</p>}
            {d.bien_tap && (
              <details className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  Đã sửa {d.bien_tap.chi_tiet.length} chỗ{d.bien_tap.nguon ? (d.bien_tap.nguon === 'gemini' ? ' (Gemini)' : ' (AI máy nhà)') : ''} · {d.bien_tap.nhan_xet}
                </summary>
                <ul className="mt-2 grid gap-2 text-sm">
                  {d.bien_tap.chi_tiet.map((c, i) => (
                    <li key={i} className="grid gap-0.5">
                      <span className="text-xs font-semibold text-slate-500">
                        Chương {c.chuong}, câu {c.cau} · {c.kieu === 'xoa' ? 'bỏ' : 'viết lại'} — {c.ly_do}
                      </span>
                      <span className="text-slate-400 line-through">{c.truoc}</span>
                      {c.sau && <span className="text-emerald-700">{c.sau}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        <h2 className="font-bold">Kịch bản</h2>
        {d.phan.map((p, i) => {
          const k = i + 1
          const tp = tt.phan[i] ?? { loai: 'chua_viet' }
          const [nhan, mau] = NHAN[tp.loai]
          const khoa = !!dangChay || dangLam
          // Câu chào / hẹn chương sau giữa phim: máy nhà bỏ khi dựng cho phim liền mạch (chương cuối giữ 2 câu chào kết)
          const boChao = new Set(p.loi ? locLoiChao(p.loi, k === d.phan.length).bo : [])
          return (
            <article key={k} className="the grid gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-extrabold text-red-600">{d.loai === 'tieu_su' ? 'Chương' : 'Phần'} {k}</span>
                <h3 className="min-w-0 flex-1 font-bold">{p.tieu_de}</h3>
                <span className={`chip ${mau}`}>
                  {tp.loai === 'dang_lam' ? `${nhan} ${tp.phanTram}%` : dangViet === k ? 'AI đang làm…' : nhan}
                </span>
              </div>
              {p.nhip && <p className="text-xs font-semibold text-violet-700">Nhịp cảm xúc: {p.nhip}</p>}
              <p className="text-sm text-slate-600">{p.noi_dung}</p>
              {tp.loai === 'dang_lam' && <p className="text-xs text-violet-700">{tp.buoc}</p>}
              {tp.loai === 'loi' && <p className="text-xs text-red-600">Lỗi: {tp.loi}</p>}
              {p.phan_bien && <PhanBien pb={p.phan_bien} ten="Hội đồng chấm kịch bản" />}
              {p.kiem_dinh && <KiemDinh kd={p.kiem_dinh} />}
              {p.phan_bien_canh && <PhanBien pb={p.phan_bien_canh} ten="Hội đồng chấm phân cảnh" />}
              {p.loi && (
                <details className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-600">
                    Xem lời thoại ({p.loi.length} câu, ~{phutGiay(uocGiay(p.loi))} phút)
                  </summary>
                  <ol className="mt-2 grid gap-1.5 text-sm">
                    {p.loi.map((l, j) => (
                      <li key={j} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-2">
                        <span className="truncate text-xs font-semibold leading-5 text-slate-500">{NGUOI[l.ai] ?? l.ai}</span>
                        <span>
                          {l.the_moc && <span className="mr-1 rounded bg-slate-200 px-1 text-[11px] font-semibold text-slate-700">📍 {l.the_moc}</span>}
                          {typeof l.anh === 'number' && l.anh >= 0 && d.phim?.anh?.[l.anh] && (
                            <span className="mr-1 rounded bg-sky-100 px-1 text-[11px] font-semibold text-sky-800">🖼 Ảnh {l.anh}</span>
                          )}
                          {l.tai_hien && <span className="mr-1 rounded bg-amber-100 px-1 text-[11px] font-semibold text-amber-800">Tái hiện</span>}
                          {boChao.has(j) && <span className="mr-1 rounded bg-slate-200 px-1 text-[11px] font-semibold text-slate-600">✂ Bỏ khi dựng</span>}
                          <span className={boChao.has(j) ? 'text-slate-400 line-through' : ''}>{l.chu}</span>
                          {chiDan(l) && <span className="block text-[11px] text-slate-400">{chiDan(l)}</span>}
                        </span>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              {p.canh && (
                <details className="rounded-xl bg-violet-50/60 p-3 ring-1 ring-violet-100">
                  <summary className="cursor-pointer text-sm font-semibold text-violet-800">Phân cảnh, shot list và prompt video AI ({p.canh.length} cảnh)</summary>
                  <div className="mt-2 grid gap-2">
                    <KhoiDuLieu v={p.canh} />
                  </div>
                </details>
              )}
              <div className="flex flex-wrap gap-2">
                {d.loai === 'tieu_su' && p.loi && (
                  <button type="button" disabled={khoa} onClick={() => void chayLaiBuoc('phan_canh', k)} className="btn btn-sm btn-phu">
                    {p.canh ? 'AI phân cảnh lại' : 'AI phân cảnh chương này'}
                  </button>
                )}
                {p.loi && (
                  <button
                    type="button"
                    disabled={khoa || tp.loai === 'cho' || tp.loai === 'dang_lam'}
                    onClick={() => confirm(`AI viết lại lời thoại phần ${k}? Phần này sẽ phải dựng lại.`) && chayTiep(k)}
                    className="btn btn-sm btn-phu"
                  >
                    AI viết lại phần này
                  </button>
                )}
                {p.loi && p.phan_bien && (p.phan_bien.van_de.length > 0 || !!p.phan_bien.goi_y) && (
                  <button
                    type="button"
                    disabled={khoa || tp.loai === 'cho' || tp.loai === 'dang_lam'}
                    onClick={() => confirm(`AI chỉ sửa những câu hội đồng chê trong phần ${k}, giữ nguyên các câu khác? Phần này sẽ phải dựng lại.`) && void suaTheoGopY(k)}
                    className="btn btn-sm btn-phu"
                  >
                    ✍️ AI sửa theo góp ý
                  </button>
                )}
                {p.loi && !p.kiem_dinh && (
                  <button
                    type="button"
                    disabled={khoa || tp.loai === 'cho' || tp.loai === 'dang_lam'}
                    onClick={() =>
                      startTransition(async () => {
                        const kq = await kiemDinhYouTube(d.id, k)
                        if (!kq.ok) return thongBao('loi', kq.loi)
                        setD(kq.duAn)
                        thongBao('ok', `Biên tập viên chấm ${kq.duAn.phan[k - 1].kiem_dinh?.diem ?? '?'}/100`)
                        await capNhatTt()
                      })
                    }
                    className="btn btn-sm btn-phu"
                  >
                    🧐 Biên tập viên kiểm định
                  </button>
                )}
                {tp.loai === 'loi' && (
                  <button type="button" disabled={khoa} onClick={() => dung(k)} className="btn btn-sm btn-phu">
                    Dựng lại phần này
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}

// Ảnh bìa (thumbnail): gợi ý chữ của AI, ô tự đặt chữ (2-5 từ), nút vẽ (máy nhà vẽ 4-5 kiểu ~10 giây), chọn kiểu làm ảnh
// chính (lưu lại, tải về đúng ảnh đó)
function AnhBia({ d, tt, khoa, setD, capNhatTt }: { d: DuAnYT; tt: TrangThaiDuAn; khoa: boolean; setD: (d: DuAnYT) => void; capNhatTt: () => Promise<void> }) {
  const goiY = [...(d.anh_bia_goi_y ?? []).map((g) => g.chu), ...(d.phim?.dong_goi?.thumbnail ?? []).map((t) => t.chu)].map((x) => x.trim()).filter(Boolean).slice(0, 6)
  const [chu, setChu] = useState(d.anh_bia_chu ?? goiY[0] ?? '')
  const [dangGui, setDangGui] = useState(false)
  const [loi, setLoi] = useState('')
  const ds = tt.anh_bia ?? []
  const chon = Math.min(d.anh_bia_chon ?? 0, Math.max(0, ds.length - 1))
  const soTu = chu.trim().split(/\s+/).filter(Boolean).length
  const ve = async () => {
    setLoi('')
    setDangGui(true)
    const kq = await veAnhBiaYouTube(d.id, chu)
    setDangGui(false)
    if (!kq.ok) return setLoi(kq.loi)
    setD(kq.duAn)
    await capNhatTt()
  }
  const chonKieu = async (k: number) => {
    const kq = await chonAnhBiaYouTube(d.id, k)
    if (!kq.ok) return setLoi(kq.loi)
    setD(kq.duAn)
  }
  return (
    <section className="the grid gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold">🖼 Ảnh bìa (thumbnail)</span>
        {tt.ve_bia && <span className="chip bg-violet-100 text-violet-800">Máy nhà đang vẽ…</span>}
      </div>
      <p className="text-xs text-slate-500">
        Ảnh bìa tốt: MỘT tình huống gây tò mò, nhân vật to rõ mặt, chữ 2-5 từ đọc được trên điện thoại. Bấm một gợi ý hoặc tự gõ, rồi bấm Vẽ ảnh bìa.
      </p>
      {goiY.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {goiY.map((g) => (
            <button key={g} type="button" onClick={() => setChu(g)} className={`chip ${g === chu ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {g}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input value={chu} onChange={(e) => setChu(e.target.value)} maxLength={60} placeholder="Chữ trên ảnh bìa, 2-5 từ" className="input min-w-0 flex-1" />
        <button type="button" onClick={() => void ve()} disabled={khoa || dangGui || tt.ve_bia || !chu.trim()} className="btn btn-phu">
          🎨 {ds.length ? 'Vẽ lại ảnh bìa' : 'Vẽ ảnh bìa'}
        </button>
      </div>
      {soTu > 5 && <p className="text-xs text-amber-700">Chữ dài {soTu} từ: ảnh bìa chỉ lấy 5 từ đầu. Nên rút gọn còn 2-5 từ.</p>}
      {loi && <p className="text-xs text-red-600">Lỗi: {loi}</p>}
      {ds.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {ds.map((a, i) => (
            <div key={i} className={`grid gap-1 rounded-xl p-1 ${i === chon ? 'ring-4 ring-red-500' : ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.xem} alt={`Ảnh bìa kiểu ${i + 1}`} className="w-full rounded-lg ring-1 ring-slate-200" />
              <div className="flex flex-wrap items-center gap-2">
                {i === chon ? (
                  <span className="chip bg-red-600 text-white">⭐ Ảnh bìa chính</span>
                ) : (
                  <button type="button" onClick={() => void chonKieu(i)} className="btn btn-sm btn-phu">
                    Chọn ảnh này
                  </button>
                )}
                <a href={a.tai} className="btn btn-sm btn-nhat">
                  Tải về
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
      {ds.length > 0 && (
        <p className="text-xs text-slate-500">
          Ảnh cũng nằm cạnh video trên máy nhà (anh-bia.png, anh-bia-2.png…). YouTube Studio → Chi tiết → Hình thu nhỏ: tải ảnh chính lên, hoặc chọn <b>Thử nghiệm và so sánh</b> để
          tải lên 3 ảnh cho YouTube tự chọn ảnh được bấm nhiều nhất.
        </p>
      )}
    </section>
  )
}

// Lỗi máy nhà → lời dễ hiểu + cách xử lý
function giaiThichLoi(loi: string) {
  if (/Disk capture|free at|ENOSPC|No space/i.test(loi)) return 'Ổ C hết chỗ trống khi dựng hình. Giải phóng ổ C hoặc khởi động lại máy nhà (bản mới để tệp tạm ở ổ D), rồi bấm Dựng lại phần này.'
  if (/chạy quá \d+ giây/.test(loi)) return 'Dựng hình quá lâu nên máy nhà dừng lại. Bấm Dựng lại phần này; nếu lặp lại, khởi động lại máy tính.'
  if (/429|Too Many Requests/i.test(loi)) return 'Pixabay đang tạm chặn. Bấm Dựng lại phần này (cảnh sẽ dùng nền vẽ).'
  return null
}

// Máy nhà đang làm gì: bước hiện tại của video này, hay đang bận việc khác; lâu không báo tiến độ → cảnh báo có thể kẹt;
// phần nào lỗi → hiện lỗi + cách xử lý (khỏi chờ vô vọng)
function MayNhaDangLam({ tt, soPhan }: { tt: TrangThaiDuAn; soPhan: number }) {
  const [bayGio, setBayGio] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setBayGio(Date.now()), 5000)
    return () => clearInterval(t)
  }, [])
  const ml = tt.mayNhaLam
  const coCho = tt.phan.some((p) => p.loai === 'cho')
  const loi = tt.phan.map((p, i) => (p.loai === 'loi' ? { k: i + 1, loi: p.loi } : null)).filter((x): x is { k: number; loi: string } => !!x)
  const truoc = (luc: number) => {
    const g = Math.max(0, Math.round((bayGio - luc) / 1000))
    return g < 60 ? `${g} giây trước` : `${Math.floor(g / 60)} phút trước`
  }
  return (
    <div className="grid gap-2">
      {ml && (
        <p className={`rounded-xl p-3 text-sm ring-1 ${ml.cuaVideo ? 'bg-violet-50 text-violet-800 ring-violet-200' : 'bg-slate-50 text-slate-700 ring-slate-200'}`}>
          🖥 <b>Máy nhà đang làm:</b>{' '}
          {ml.cuaVideo ? (ml.phan ? `Phần ${ml.phan}/${soPhan} — ` : '') : `việc khác (${ml.mo_ta}${ml.tieu_de ? ` «${ml.tieu_de}»` : ''}) — `}
          {ml.buoc}
          {ml.phanTram != null && ml.phanTram > 0 ? ` (${ml.phanTram}%)` : ''} · <span className="text-xs opacity-70">cập nhật {truoc(ml.luc)}</span>
          {!ml.cuaVideo && coCho && <span className="block text-xs">Video này đang xếp hàng, máy nhà làm xong việc kia sẽ làm tiếp.</span>}
        </p>
      )}
      {ml && bayGio - ml.luc > 4 * 60_000 && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
          ⚠ Máy nhà chưa báo tiến độ {Math.floor((bayGio - ml.luc) / 60_000)} phút, có thể đang kẹt. Đóng cửa sổ đen <b>chay-vieneu-gpu.bat</b> rồi bấm đúp mở lại: máy nhà tự làm tiếp việc dang dở.
        </p>
      )}
      {tt.mayNhaCu ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
          ⚠ Máy nhà đang chạy <b>bản cũ</b> (chưa khởi động lại sau lần cập nhật) nên không báo được đang làm gì và dễ bị kẹt. Đóng cửa sổ đen <b>chay-vieneu-gpu.bat</b> rồi
          bấm đúp mở lại tệp đó trong thư mục VieNeu-TTS: máy nhà tự làm tiếp việc dang dở.
        </p>
      ) : (
        !ml && coCho && !tt.mayNha && <p className="text-sm text-slate-500">🖥 Đang chờ máy nhà nhận việc…</p>
      )}
      {loi.map((x) => (
        <p key={x.k} className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          ❌ <b>Phần {x.k} lỗi.</b> {giaiThichLoi(x.loi) ?? 'Bấm Dựng lại phần này ở thẻ phần bên dưới.'}
          <span className="mt-1 block break-all text-xs opacity-70">Chi tiết: {x.loi}</span>
        </p>
      ))}
    </div>
  )
}
