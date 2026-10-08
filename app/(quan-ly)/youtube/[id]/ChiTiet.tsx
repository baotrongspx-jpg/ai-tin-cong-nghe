'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { DuAnYT, TrangThaiDuAn, TrangThaiPhan } from '@/lib/youtube'
import { thongBao } from '@/app/ThongBao'
import { IconChep, IconMo, IconXong, IconYouTube, Xoay } from '@/app/BieuTuong'
import { chayBuocPhimYouTube, chonNhacYouTube, dungVideoYouTube, layTrangThaiYouTube, luuThongTinYouTube, vietPhanYouTube, xoaVideoYouTube } from '../actions'
import HoSoPhim, { KhoiDuLieu } from './HoSoPhim'

const NGUOI: Record<string, string> = {
  nguoi_ke: '🎙 Người kể',
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
}

// Ước lượng độ dài theo số chữ (~19 ký tự mỗi giây + nghỉ giữa câu), giống lib/youtube.ts
const uocGiay = (loi: { chu: string }[] | null) => (loi ? loi.reduce((t, l) => t + l.chu.length / 19 + 0.25, 0) : 0)
const phutGiay = (giay: number) => `${Math.floor(giay / 60)}:${String(Math.round(giay % 60)).padStart(2, '0')}`

// Chỉ dẫn đạo diễn AI chọn cho từng câu (hiện thành nhãn nhỏ dưới lời thoại)
const KHUNG: Record<string, string> = { toan_canh: 'toàn cảnh', trung_canh: 'trung cảnh', can_canh: 'cận cảnh', sieu_can: 'siêu cận', goc_thap: 'góc thấp', goc_cao: 'góc cao' }
const MAY: Record<string, string> = { dung_yen: 'đứng yên', day_vao: 'đẩy vào', keo_ra: 'kéo ra', lia_sang: 'lia sang', truot_ngang: 'trượt ngang', nang_len: 'nâng lên', rung_tay: 'rung tay' }
const DEN: Record<string, string> = { am_ap: 'ấm', lanh: 'lạnh', cang_thang: 'căng thẳng', tuoi_sang: 'tươi sáng', mo_mong: 'mơ mộng', bi_an: 'bí ẩn', canh_bao: 'cảnh báo đỏ', loe_sang: 'loé sáng' }
const AM: Record<string, string> = { vut: 'vút', bum: 'bùm', ting: 'ting', bop: 'bốp', coi_bao: 'còi báo', go_phim: 'gõ phím', tim_dap: 'tim đập', tich_tac: 'tích tắc', vui: 'nhạc vui', hut_hang: 'hụt hẫng', gio: 'gió', buoc_chan: 'bước chân', vo_tay: 'vỗ tay', xe_chay: 'xe chạy', bo_xe: 'bô xe', coi_xe: 'còi xe', mua: 'mưa', sam: 'sấm', chuong_dt: 'chuông điện thoại', chuong_truong: 'chuông trường', tien: 'tiền keng', go_cua: 'gõ cửa', chup_anh: 'chụp ảnh', reo_ho: 'reo hò', bua: 'búa', phao_hoa: 'pháo hoa', may_bay: 'máy bay', nuoc: 'nước' }
type ChiDan = { khung_hinh?: string; may_quay?: string; anh_sang?: string; am_thanh?: string; lang?: boolean }
const chiDan = (l: ChiDan) =>
  [
    l.lang && '⏸ lặng',
    l.khung_hinh && `📷 ${KHUNG[l.khung_hinh] ?? l.khung_hinh}`,
    l.may_quay && `🎥 ${MAY[l.may_quay] ?? l.may_quay}`,
    l.anh_sang && DEN[l.anh_sang] && `💡 ${DEN[l.anh_sang]}`,
    l.am_thanh && AM[l.am_thanh] && `🔊 ${AM[l.am_thanh]}`,
  ].filter(Boolean).join(' · ')

const NHAN: Record<TrangThaiPhan['loai'], [string, string]> = {
  chua_viet: ['Chưa viết', 'bg-slate-100 text-slate-500'],
  chua_dung: ['Chưa dựng', 'bg-slate-100 text-slate-600'],
  cho: ['Chờ máy nhà', 'bg-amber-100 text-amber-800'],
  dang_lam: ['Đang dựng', 'bg-violet-100 text-violet-700'],
  xong: ['Đã dựng', 'bg-emerald-100 text-emerald-700'],
  loi: ['Lỗi', 'bg-red-100 text-red-700'],
}

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

export default function ChiTiet({ dau, ttDau, dsNhac }: { dau: DuAnYT; ttDau: TrangThaiDuAn; dsNhac: { ten: string; kichThuoc: number }[] }) {
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
      if (phim && !moi.phim?.cau_chuyen && !(await lam('Phát triển câu chuyện: khán giả, góc kể, big idea, cấu trúc, hook, chia chương…', () => chayBuocPhimYouTube(moi.id, 'cau_chuyen')))) return
      for (let k = 1; k <= moi.phan.length; k++) {
        if (moi.phan[k - 1].loi) continue
        if (!(await lam(`AI đang viết kịch bản ${ten} ${k}/${moi.phan.length}…`, () => vietPhanYouTube(moi.id, k), k))) return
      }
      if (!phim) return
      if (!moi.phim?.ho_so && !(await lam('Hồ sơ hình ảnh: nhân vật, bối cảnh, thiết kế, màu, nhạc…', () => chayBuocPhimYouTube(moi.id, 'ho_so')))) return
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
  // Chạy lại một giai đoạn của phim (nút "AI làm lại bước này"), rồi làm tiếp các việc còn thiếu
  const chayLaiBuoc = async (buoc: 'nghien_cuu' | 'cau_chuyen' | 'ho_so' | 'dong_goi' | 'phan_canh', k?: number) => {
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
  }

  useEffect(() => {
    if (daChay.current) return
    daChay.current = true
    const p = dau.phim
    const conThieu =
      dau.phan.some((x) => !x.loi) ||
      dau.phan.length === 0 ||
      (dau.loai === 'tieu_su' && (!p?.nghien_cuu || !p.cau_chuyen || !p.ho_so || !p.dong_goi || dau.phan.some((x) => !x.canh)))
    // Gọi sau lượt vẽ đầu (không đặt state ngay trong effect)
    if (conThieu) setTimeout(() => void chayTiep(), 0)
    // Chỉ chạy một lần khi mở trang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Đang chờ / đang dựng / đã dựng đủ mà chưa ghép xong: hỏi lại trạng thái mỗi 8 giây
  const dangCho = tt.phan.some((p) => p.loai === 'cho' || p.loai === 'dang_lam') || (!tt.xong && tt.phan.length > 0 && tt.phan.every((p) => p.loai === 'xong'))
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
    if (!confirm('Xoá video này khỏi trang? Video đã dựng trên máy nhà vẫn giữ nguyên.')) return
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
            {soXong === d.phan.length && !tt.xong && (
              <p className="flex items-center gap-2 text-sm text-violet-700">
                <Xoay /> Đang ghép các phần thành một video…
              </p>
            )}
            <p className="text-xs text-slate-400">
              Mỗi phần khoảng {Math.round(d.phut / d.phan.length)} phút video mất khoảng 10–20 phút dựng. Có thể đóng trang, máy nhà vẫn làm tiếp; video TikTok vẫn được ưu tiên làm trước.
            </p>
          </>
        )}
      </section>

      {/* Nhạc nền: máy nhà trộn dưới cả video, tự nhỏ đi khi có lời */}
      <section className="the flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
        <span className="font-bold">🎵 Nhạc nền</span>
        <select
          value={d.nhac ?? ''}
          disabled={dangLam}
          onChange={(e) => {
            const nhac = e.target.value
            setD({ ...d, nhac })
            startTransition(async () => {
              const kq = await chonNhacYouTube(d.id, nhac, d.am_luong_nhac ?? 30)
              if (!kq.ok) return thongBao('loi', kq.loi)
              await capNhatTt()
            })
          }}
          className="input w-auto"
        >
          <option value="">Tự chọn (bài đầu tiên trong thư viện)</option>
          {dsNhac.map((n, i) => (
            <option key={n.ten} value={n.ten}>
              Bài {i + 1} · {(n.kichThuoc / 1e6).toFixed(1)} MB
            </option>
          ))}
          <option value="khong">Không dùng nhạc nền</option>
        </select>
        {d.nhac !== 'khong' && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Âm lượng
            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={d.am_luong_nhac ?? 30}
              disabled={dangLam}
              onChange={(e) => setD({ ...d, am_luong_nhac: Number(e.target.value) })}
              onPointerUp={() => startTransition(async () => void (await chonNhacYouTube(d.id, d.nhac ?? '', d.am_luong_nhac ?? 30)))}
              className="accent-red-600"
            />
            {d.am_luong_nhac ?? 30}%
          </label>
        )}
        <p className="w-full text-xs text-slate-400">
          Nhạc tự nhỏ đi khi có lời nói, to lên ở chỗ chuyển cảnh và màn kết. Đổi nhạc sau khi đã dựng xong thì bấm Dựng video: máy nhà chỉ ghép lại, không dựng lại hình. Thêm bài nhạc ở trang TikTok → Nhạc nền.
        </p>
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

      {d.loai === 'tieu_su' && <HoSoPhim d={d} chay={(buoc) => void chayLaiBuoc(buoc)} dangChay={!!dangChay} />}

      {/* Các phần */}
      <section className="grid gap-3">
        <h2 className="font-bold">Kịch bản</h2>
        {d.phan.map((p, i) => {
          const k = i + 1
          const tp = tt.phan[i] ?? { loai: 'chua_viet' }
          const [nhan, mau] = NHAN[tp.loai]
          const khoa = !!dangChay || dangLam
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
                          {l.tai_hien && <span className="mr-1 rounded bg-amber-100 px-1 text-[11px] font-semibold text-amber-800">Tái hiện</span>}
                          {l.chu}
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
