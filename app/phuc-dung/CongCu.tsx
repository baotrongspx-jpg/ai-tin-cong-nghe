'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { docAnh, luuAnh } from './khoAnh'
import MaHoaJs from './MaHoaJs'
import ThuVien, { coQuyen } from './ThuVien'
import { type Canh, chuanHoa, type DuAn, DU_AN_TRONG, ghepCauLenh, type Muc, type NhanDang, noiDot, themCanhTrong } from './ghep'

const DO_DAI = 8 // giây mỗi đoạn, đúng độ dài một lần tạo của Veo 3
const TOI_DA_DOAN = 30
const KHOA_LUU = 'phuc-dung-v1'

type Khung = { ten: string; doan: number; giay: number; url: string }

// ——— Xử lý video ngay trên trình duyệt ———

function moVideo(tep: File): Promise<HTMLVideoElement> {
  return new Promise((ok, loi) => {
    const v = document.createElement('video')
    v.muted = true
    v.preload = 'auto'
    v.playsInline = true
    v.onloadeddata = () => ok(v)
    v.onerror = () => loi(new Error('Trình duyệt không đọc được video này (thử tệp .mp4).'))
    v.src = URL.createObjectURL(tep)
  })
}

function tua(v: HTMLVideoElement, giay: number) {
  return new Promise<void>((ok) => {
    const xong = () => {
      v.removeEventListener('seeked', xong)
      clearTimeout(hen)
      ok()
    }
    const hen = setTimeout(xong, 4000)
    v.addEventListener('seeked', xong)
    v.currentTime = Math.max(0, Math.min(giay, v.duration - 0.05))
  })
}

function chup(v: HTMLVideoElement, rong: number, kieu = 'image/jpeg', chatLuong = 0.9) {
  const c = document.createElement('canvas')
  c.width = Math.min(rong, v.videoWidth)
  c.height = Math.round((v.videoHeight * c.width) / v.videoWidth)
  c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
  return c.toDataURL(kieu, chatLuong)
}

function thuNho(url: string, rong: number): Promise<string> {
  return new Promise((ok) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = Math.min(rong, img.width)
      c.height = Math.round((img.height * c.width) / img.width)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      ok(c.toDataURL('image/jpeg', 0.7).split(',')[1])
    }
    img.src = url
  })
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const tenKhung = (doan: number, loai: string) => `doan_${String(doan).padStart(3, '0')}_${loai}`

function taiVe(url: string, ten: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = ten
  a.click()
}

// ——— Trang ———

// Kịch bản lưu riêng theo từng video; bản lưu kiểu cũ (chưa theo video) được chuyển sang video mở đầu tiên
function docLuu(ten: string | null): DuAn {
  try {
    const luu = (ten && localStorage.getItem(`${KHOA_LUU}:${ten}`)) || localStorage.getItem(KHOA_LUU)
    if (luu) return chuanHoa(JSON.parse(luu))
  } catch {}
  return DU_AN_TRONG
}

// ——— Đọc code JS đã mã hóa ở thẻ ① (hoặc bằng VIDEO_JS_TOOL trên máy) ———

type DoanInfo = { file: string; segment: number; start_sec: number; end_sec: number }
type ThongTinJs = { video: string; duration_sec: number; segments: DoanInfo[] }
export type NguonJs = { ten: string; doc: (tep: string) => Promise<string> }

const docJs = <T,>(text: string): T => JSON.parse(text.slice(text.indexOf('(') + 1, text.lastIndexOf(')')))

export function nguonTuThuMuc(h: FileSystemDirectoryHandle): NguonJs {
  return { ten: h.name, doc: async (t) => (await (await h.getFileHandle(t)).getFile()).text() }
}

function nguonTuDanhSachTep(ds: FileList): NguonJs | null {
  const tep = [...ds]
  const muc = tep.find((f) => f.name === 'danh_sach.js')
  if (!muc) return null
  // Chọn cả thư mục: đường dẫn dạng "ten_video/doan_001.js"
  const goc = muc.webkitRelativePath.slice(0, -'danh_sach.js'.length)
  const theoTen = new Map(tep.filter((f) => f.webkitRelativePath.startsWith(goc)).map((f) => [f.name, f]))
  return {
    ten: goc.replace(/\/$/, '').split('/').pop() || 'video',
    doc: async (t) => {
      const f = theoTen.get(t)
      if (!f) throw new Error(`Thiếu tệp ${t} trong thư mục`)
      return f.text()
    },
  }
}

type DangPhucDung = { ten: string; video: string }
type NguonDoc = { n: NguonJs; info: ThongTinJs }

async function docNguon(n: NguonJs): Promise<NguonDoc> {
  return { n, info: docJs<ThongTinJs>(await n.doc('danh_sach.js')) }
}

// Dự án lưu trong localStorage của trình duyệt → chỉ vẽ trang công cụ ở phía trình duyệt
export default function CongCu() {
  const trenTrinhDuyet = useSyncExternalStore(() => () => {}, () => true, () => false)
  const [the, setThe] = useState<'ma-hoa' | 'phuc-dung'>('ma-hoa')
  // Thư mục lưu code (vd E:\VIDEO_JS) và video đang phục dựng: nhớ trong IndexedDB
  const [thuMuc, setThuMuc] = useState<FileSystemDirectoryHandle | null>(null)
  const [dang, setDang] = useState<DangPhucDung | null>(null)
  const [nguon, setNguon] = useState<NguonDoc | null>(null)
  const [daNap, setDaNap] = useState(false)
  const [lamMoi, setLamMoi] = useState(0)
  const [phien, setPhien] = useState(0)

  useEffect(() => {
    Promise.all([docAnh<FileSystemDirectoryHandle>('thu_muc_goc'), docAnh<DangPhucDung | null>('dang_phuc_dung')]).then(async ([h, d]) => {
      if (h) setThuMuc(h)
      if (d) setDang(d)
      setDaNap(true)
      // Đã được phép từ trước → mở lại luôn code của video đang phục dựng
      if (h && d && (await coQuyen(h, false).catch(() => false)))
        docNguon(nguonTuThuMuc(await h.getDirectoryHandle(d.ten)))
          .then(setNguon)
          .catch(() => {})
    })
  }, [])

  async function dungNguon(n: NguonJs, chuyenThe = true) {
    try {
      const x = await docNguon(n)
      const d = { ten: n.ten, video: x.info.video }
      setNguon(x)
      setDang(d)
      luuAnh('dang_phuc_dung', d)
      if (chuyenThe) setThe('phuc-dung')
    } catch (e) {
      alert(`Không đọc được danh_sach.js trong thư mục "${n.ten}": ${(e as Error).message}`)
    }
  }

  async function moLaiDang() {
    if (!thuMuc || !dang) return
    try {
      if (await coQuyen(thuMuc, true)) dungNguon(nguonTuThuMuc(await thuMuc.getDirectoryHandle(dang.ten)), false)
    } catch {
      alert(`Không tìm thấy thư mục "${dang.ten}" trong ${thuMuc.name} (có thể đã bị xóa).`)
    }
  }

  function doiThuMuc(h: FileSystemDirectoryHandle) {
    setThuMuc(h)
    luuAnh('thu_muc_goc', h)
  }

  async function daXoa(ten: string) {
    try {
      localStorage.removeItem(`${KHOA_LUU}:${ten}`)
    } catch {}
    await luuAnh(`khung:${ten}`, [])
    if (dang?.ten === ten) {
      setDang(null)
      setNguon(null)
      await luuAnh('dang_phuc_dung', null)
      setPhien((p) => p + 1)
    }
  }

  if (!trenTrinhDuyet) return <p className="text-sm text-slate-500">Đang mở công cụ…</p>
  const nut = (k: typeof the, ten: string) => (
    <button onClick={() => setThe(k)} className={`btn ${the === k ? 'btn-fb' : 'btn-phu'}`}>{ten}</button>
  )
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2">
        {nut('ma-hoa', '① Chuyển video thành code JS')}
        {nut('phuc-dung', '② Phục dựng bằng Veo 3')}
        {dang && (
          <span className="chip max-w-full truncate bg-violet-100 text-violet-800" title={dang.video}>🎬 Đang phục dựng: {dang.video}</span>
        )}
      </nav>
      {/* Giữ cả hai thẻ trong trang để đổi thẻ không làm mất việc đang chạy */}
      <div hidden={the !== 'ma-hoa'} className="space-y-4">
        <header>
          <h1 className="text-2xl font-extrabold text-[#0f1b3d]">Chuyển video thành code JS</h1>
          <p className="mt-1 text-sm text-slate-500">Video chỉ xử lý trên máy bạn, tệp .js ghi thẳng vào thư mục bạn chọn.</p>
        </header>
        <section className="the p-5">
          <ThuVien thuMuc={thuMuc} onDoiThuMuc={doiThuMuc} tenDang={dang?.ten ?? null} lamMoi={lamMoi}
            onPhucDung={(h) => dungNguon(nguonTuThuMuc(h))} onDaXoa={daXoa} />
        </section>
        <section className="the p-5">
          <h2 className="mb-3 text-lg font-bold text-[#0f1b3d]">Chuyển video mới thành code</h2>
          <MaHoaJs thuMuc={thuMuc} onDoiThuMuc={doiThuMuc} onDaGhi={() => setLamMoi((x) => x + 1)}
            onXong={(h) => dungNguon(nguonTuThuMuc(h))} />
        </section>
      </div>
      <div hidden={the !== 'phuc-dung'}>
        {daNap && (
          <TrangCongCu key={`${phien}:${dang?.ten ?? ''}`} dang={dang} nguon={nguon}
            onMoLai={thuMuc && dang && !nguon ? moLaiDang : undefined} onChonNguon={(n) => dungNguon(n, false)} />
        )}
      </div>
    </div>
  )
}

function TrangCongCu({ dang, nguon, onMoLai, onChonNguon }: {
  dang: DangPhucDung | null
  nguon: NguonDoc | null
  onMoLai?: () => void
  onChonNguon: (n: NguonJs) => void
}) {
  const tenVideo = dang?.ten ?? null
  const [tep, setTep] = useState<File | null>(null)
  const [thoiLuongVideo, setThoiLuongVideo] = useState(0)
  const dungCode = !!nguon && !tep
  const thoiLuong = dungCode ? nguon!.info.duration_sec : thoiLuongVideo
  const [tuGiay, setTuGiay] = useState(0)
  const [soDoan, setSoDoan] = useState(8)
  const [duAn, setDuAn] = useState<DuAn>(() => docLuu(tenVideo))
  const [khung, setKhung] = useState<Khung[]>([])
  // Ảnh khung hình lưu trong IndexedDB theo từng video → tải lại trang vẫn còn ảnh
  const khoaKhung = tenVideo ? `khung:${tenVideo}` : 'khung'
  const [daNapAnh, setDaNapAnh] = useState(false)
  useEffect(() => {
    Promise.all([docAnh<Khung[]>(khoaKhung), docAnh<Khung[]>('khung')]).then(([rieng, cu]) => {
      const ds = rieng?.length ? rieng : cu // ảnh lưu kiểu cũ (chưa theo video) → chuyển sang video này
      if (ds?.length) {
        setKhung((hien) => (hien.length ? hien : ds))
        setDuAn((d) => themCanhTrong(d, ds.map((k) => k.doan)))
      }
      setDaNapAnh(true)
    })
  }, [khoaKhung])
  useEffect(() => {
    if (!daNapAnh) return
    luuAnh(khoaKhung, khung)
    if (khoaKhung !== 'khung') luuAnh('khung', [])
  }, [khung, daNapAnh, khoaKhung])
  const [tienDo, setTienDo] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(tenVideo ? `${KHOA_LUU}:${tenVideo}` : KHOA_LUU, JSON.stringify(duAn))
      if (tenVideo) localStorage.removeItem(KHOA_LUU)
    } catch {}
  }, [duAn, tenVideo])

  const anhTheoTen = useMemo(() => Object.fromEntries(khung.map((k) => [k.ten, k.url])), [khung])

  async function moBangQuyen(e: React.MouseEvent) {
    if (!window.showDirectoryPicker) return // để input chọn thư mục kiểu cũ tự mở
    e.preventDefault()
    try {
      const h = await window.showDirectoryPicker({ mode: 'read', id: 'video-js' })
      await h.getFileHandle('danh_sach.js').catch(() => {
        throw new Error('Thư mục này không có danh_sach.js. Hãy chọn thư mục mang tên video do bước ① tạo ra.')
      })
      setTienDo('')
      onChonNguon(nguonTuThuMuc(h))
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setTienDo((e as Error).message)
    }
  }

  function moThuMucJs(ds: FileList | null) {
    if (!ds?.length) return
    const n = nguonTuDanhSachTep(ds)
    if (!n) return setTienDo('Thư mục này không có danh_sach.js. Hãy chọn thư mục do bước ① tạo ra.')
    setTienDo('')
    onChonNguon(n)
  }

  async function layKhungTuJs() {
    if (!nguon) return
    const { n: ng, info } = nguon
    const dauTien = Math.floor(tuGiay / DO_DAI)
    const chon = info.segments.slice(dauTien, dauTien + soDoan)
    // Giữ ảnh các đoạn đã lấy trước đó (ảnh mẫu của bộ nhận dạng nằm ở đó), chỉ thay ảnh các đoạn lấy lại
    const ds: Khung[] = khung.filter((k) => !chon.some((s) => s.segment === k.doan))
    for (const [i, s] of chon.entries()) {
      setTienDo(`Đang đọc ${s.file} (${i + 1}/${chon.length})…`)
      const d = docJs<{ fps: number; frames: string[] }>(await ng.doc(s.file))
      const giua = Math.floor(d.frames.length / 2)
      for (const [loai, k] of [['dau', 0], ['giua', giua], ['cuoi', d.frames.length - 1]] as const) {
        ds.push({ ten: tenKhung(s.segment, loai), doan: s.segment, giay: s.start_sec + k / d.fps, url: `data:image/jpeg;base64,${d.frames[k]}` })
      }
      setKhung([...ds].sort((a, b) => a.doan - b.doan || a.giay - b.giay))
    }
    setDuAn((d) => themCanhTrong(d, chon.map((s) => s.segment)))
    setTienDo('')
  }

  async function chonVideo(f: File | undefined) {
    if (!f) return
    setTep(f)
    setKhung([])
    setTienDo('Đang đọc video…')
    try {
      const v = await moVideo(f)
      setThoiLuongVideo(v.duration)
      setTuGiay(0)
      setSoDoan(Math.min(TOI_DA_DOAN, Math.ceil(v.duration / DO_DAI)))
      URL.revokeObjectURL(v.src)
      setTienDo('')
    } catch (e) {
      setTienDo((e as Error).message)
    }
  }

  async function catKhung() {
    if (!tep) return
    const v = await moVideo(tep)
    const ds: Khung[] = []
    const dauTien = Math.floor(tuGiay / DO_DAI)
    const cuoiCung = Math.min(dauTien + soDoan, Math.ceil(v.duration / DO_DAI))
    for (let i = dauTien; i < cuoiCung; i++) {
      const bd = i * DO_DAI
      const kt = Math.min((i + 1) * DO_DAI, v.duration) - 0.05
      for (const [loai, giay] of [['dau', bd + 0.05], ['giua', (bd + kt) / 2], ['cuoi', kt]] as const) {
        await tua(v, giay)
        ds.push({ ten: tenKhung(i + 1, loai), doan: i + 1, giay, url: chup(v, 1280) })
      }
      setTienDo(`Đã cắt ${i - dauTien + 1}/${cuoiCung - dauTien} đoạn…`)
      setKhung([...ds])
    }
    URL.revokeObjectURL(v.src)
    setDuAn((d) => themCanhTrong(d, ds.map((k) => k.doan)))
    setTienDo('')
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-[#0f1b3d]">Phục dựng video bằng Veo 3</h1>
        <p className="mt-1 text-sm text-slate-500">
          Mỗi cảnh 8 giây, nhân vật và bối cảnh giữ y hệt nhau giữa các cảnh. Video chỉ xử lý trên máy bạn, không tải lên mạng.
        </p>
      </header>

      {/* Video đang phục dựng */}
      {dang ? (
        <div className="the flex flex-wrap items-center gap-3 p-4 ring-2 ring-violet-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {khung[0] && <img src={khung[0].url} alt="" className="h-16 rounded-md" />}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-violet-700">🎬 Đang phục dựng</p>
            <p className="truncate font-bold text-slate-800" title={dang.video}>{dang.video}</p>
            <p className="text-xs text-slate-500">
              {nguon ? `${mmss(nguon.info.duration_sec)} · ${nguon.info.segments.length} tệp .js · thư mục ${dang.ten}` : `thư mục ${dang.ten}`}
              {duAn.canh.length > 0 && ` · ${duAn.canh.length} cảnh đã viết`}
            </p>
          </div>
          {onMoLai && <button className="btn btn-fb btn-sm" onClick={onMoLai}>Mở lại code của video này</button>}
        </div>
      ) : (
        <p className="the p-4 text-sm text-slate-600">
          Chưa chọn video. Ở thẻ <b>①</b>, bấm <b>② Phục dựng video này</b> cạnh video muốn làm, hoặc mở thư mục code JS ở bước 1.
        </p>
      )}

      <QuyTrinh />

      {/* Bước 1 */}
      <section className="the p-5">
        <TieuDe so={1} ten="Lấy khung hình từ code JS" />
        {dungCode ? (
          <p className="mb-3 rounded-xl bg-green-50 p-3 text-sm text-green-800">
            Đang dùng code JS: <b>{nguon!.n.ten}</b> ({nguon!.info.segments.length} tệp .js)
          </p>
        ) : (
          <p className="mb-3 text-sm text-slate-600">
            Chọn video ở thẻ <b>①</b> (nút &quot;Phục dựng video này&quot;), hoặc mở thẳng một thư mục code JS ở dưới.
          </p>
        )}
        {/* Chrome/Edge: hỏi quyền "xem tệp" (không có chữ "tải lên" gây hiểu nhầm); trình duyệt khác: chọn thư mục kiểu cũ */}
        <label className="btn btn-phu cursor-pointer" onClick={moBangQuyen}>
          📂 Mở thư mục code JS khác
          <input type="file" className="hidden" multiple
            ref={(el) => el?.setAttribute('webkitdirectory', '')}
            onChange={(e) => moThuMucJs(e.target.files)} />
        </label>
        <details className="mt-3 text-sm text-slate-600">
          <summary className="cursor-pointer">Chưa mã hóa? Lấy khung hình thẳng từ video gốc</summary>
          <input type="file" accept="video/*" onChange={(e) => chonVideo(e.target.files?.[0])}
            className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:font-semibold file:text-white" />
        </details>
        {thoiLuong > 0 && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <p className="w-full text-sm text-slate-600">
              Video dài <b>{mmss(thoiLuong)}</b> = {Math.ceil(thoiLuong / DO_DAI)} đoạn 8 giây. Mỗi lần làm tối đa {TOI_DA_DOAN} đoạn (4 phút).
            </p>
            <label className="text-sm">
              <span className="label">Bắt đầu từ giây</span>
              <input type="number" min={0} max={Math.floor(thoiLuong)} step={8} value={tuGiay}
                onChange={(e) => setTuGiay(Math.max(0, Number(e.target.value)))} className="input w-32" />
            </label>
            <label className="text-sm">
              <span className="label">Số đoạn 8 giây</span>
              <input type="number" min={1} max={TOI_DA_DOAN} value={soDoan}
                onChange={(e) => setSoDoan(Math.min(TOI_DA_DOAN, Math.max(1, Number(e.target.value))))} className="input w-32" />
            </label>
            <button onClick={dungCode ? layKhungTuJs : catKhung} disabled={!!tienDo} className="btn btn-fb">Lấy khung hình</button>
          </div>
        )}
        {dungCode && khung.length > 0 && (() => {
          const cuoi = Math.max(...khung.map((k) => k.doan))
          const tong = nguon!.info.segments.length
          const conLai = tong - cuoi
          return conLai > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
              <span>Đã lấy tới đoạn {cuoi}/{tong} ({mmss(cuoi * DO_DAI)}). Còn {conLai} đoạn.</span>
              <button className="btn btn-fb btn-sm" disabled={!!tienDo} onClick={() => {
                setTuGiay(cuoi * DO_DAI)
                setSoDoan(Math.min(TOI_DA_DOAN, conLai))
              }}>
                Làm tiếp {Math.min(TOI_DA_DOAN, conLai)} đoạn sau
              </button>
              <span className="text-xs text-blue-700">(bấm rồi bấm &quot;Lấy khung hình&quot;; ảnh cũ vẫn giữ)</span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-green-700">✓ Đã lấy hết {tong} đoạn của video.</p>
          )
        })()}
        {tienDo && <p className="mt-3 text-sm font-medium text-blue-700">{tienDo}</p>}
        {khung.length > 0 && <LuoiKhung khung={khung} />}
      </section>

      {/* Bước 2 */}
      <section className="the p-5">
        <TieuDe so={2} ten="Bộ nhận dạng và kịch bản từng cảnh" />
        <VietBangAI khung={khung} duAn={duAn} onXong={setDuAn} />
        <NhapXuatJson duAn={duAn} onNhap={setDuAn} />
        <SuaNhanDang nd={duAn.nhan_dang} anh={anhTheoTen} tenAnh={khung.map((k) => k.ten)}
          onDoi={(nhan_dang) => setDuAn({ ...duAn, nhan_dang })} />
        <SuaCanh ds={duAn.canh} nd={duAn.nhan_dang} onDoi={(canh) => setDuAn({ ...duAn, canh })} />
      </section>

      {/* Bước 3 */}
      <section className="the p-5">
        <TieuDe so={3} ten="Làm từng cảnh trên Veo 3" />
        <DanhSachCauLenh duAn={duAn} anh={anhTheoTen} />
      </section>
    </div>
  )
}

function TieuDe({ so, ten }: { so: number; ten: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1b3d]">
      <span className="grid size-7 place-items-center rounded-full bg-blue-600 text-sm text-white">{so}</span>
      {ten}
    </h2>
  )
}

function QuyTrinh() {
  const buoc = [
    ['Mã hóa video thành code JS', 'Ở thẻ ①. Xong bấm "Dùng code này để phục dựng", trang chuyển sang đây.'],
    ['Lấy khung hình từ code', 'Chọn khúc muốn làm, bấm "Lấy khung hình". Trang đọc ảnh đầu, giữa và cuối của từng tệp doan_XXX.js.'],
    ['Viết bộ nhận dạng', 'Bấm "AI xem và viết". AI mô tả CỐ ĐỊNH nhân vật, đồ vật, bối cảnh và viết hành động từng cảnh. Bạn sửa lại nếu cần.'],
    ['Làm từng cảnh', 'Ở bước 3, mỗi cảnh có sẵn ảnh đầu và ảnh cuối lấy từ video gốc. Trong Flow chọn Frames to Video, đặt 2 ảnh vào First frame / Last frame, dán câu lệnh.'],
    ['Ghép', 'Ghép tất cả cảnh theo thứ tự trong CapCut, thêm nhạc, chữ.'],
  ]
  return (
    <details open className="the p-5">
      <summary className="cursor-pointer text-base font-bold text-[#0f1b3d]">Quy trình bạn sẽ làm</summary>
      <ol className="mt-3 space-y-2 text-sm text-slate-700">
        {buoc.map(([t, m], i) => (
          <li key={t} className="flex gap-2">
            <span className="font-bold text-blue-700">{i + 1}.</span>
            <span><b>{t}:</b> {m}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        Vì sao các cảnh giống nhau: mô tả nhân vật/bối cảnh được chép <b>nguyên văn</b> vào mọi câu lệnh, và mỗi cảnh
        dùng ảnh đầu + ảnh cuối lấy từ video gốc: ảnh cuối cảnh này và ảnh đầu cảnh sau là 2 khung liền nhau nên các cảnh nối khớp.
      </p>
    </details>
  )
}

function LuoiKhung({ khung }: { khung: Khung[] }) {
  const doan = [...new Set(khung.map((k) => k.doan))]
  return (
    <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
      {doan.map((d) => (
        <div key={d} className="grid grid-cols-[3.5rem_1fr_1fr_1fr] items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Đoạn {d}</span>
          {khung.filter((k) => k.doan === d).map((k) => (
            <button key={k.ten} onClick={() => taiVe(k.url, `${k.ten}.jpg`)} title="Bấm để tải ảnh" className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={k.url} alt={k.ten} className="aspect-video w-full rounded-lg object-cover" />
              <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[10px] text-white">
                {k.ten.split('_')[2]} {mmss(k.giay)}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

function VietBangAI({ khung, duAn, onXong }: { khung: Khung[]; duAn: DuAn; onXong: (d: DuAn) => void }) {
  const [ghiChu, setGhiChu] = useState('')
  const [dang, setDang] = useState('')
  const [loi, setLoi] = useState('')
  const nd = duAn.nhan_dang
  const coNhanDang = nd.nhan_vat.length + nd.boi_canh.length + nd.do_vat.length > 0
  // Cảnh "đã viết" = có hành động; cảnh tạo sẵn (chưa có chữ) vẫn được gửi cho AI
  const daViet = new Set(duAn.canh.filter((c) => c.hanh_dong.trim() && c.khung_cuoi?.trim()).flatMap((c) => c.doan_goc))
  // Đã có bộ nhận dạng + cảnh đã viết → mặc định làm tiếp: giữ nguyên bộ nhận dạng, chỉ viết đoạn chưa có chữ
  const coKichBan = coNhanDang && daViet.size > 0
  const [lamTiep, setLamTiep] = useState(true)
  const noi = coKichBan && lamTiep
  const guiDi = noi ? khung.filter((k) => !daViet.has(k.doan)) : khung
  const soDoanGui = new Set(guiDi.map((k) => k.doan)).size

  async function viet() {
    setLoi('')
    // Chia mỗi đợt 6 đoạn (18 ảnh) cho AI kịp viết trong giới hạn thời gian; đợt sau giữ nguyên bộ nhận dạng của đợt trước
    const doanGui = [...new Set(guiDi.map((k) => k.doan))].sort((a, b) => a - b).slice(0, TOI_DA_DOAN)
    const dot: number[][] = []
    for (let i = 0; i < doanGui.length; i += 6) dot.push(doanGui.slice(i, i + 6))
    let hien: DuAn = noi ? duAn : { nhan_dang: DU_AN_TRONG.nhan_dang, canh: duAn.canh }
    try {
      for (const [i, cac] of dot.entries()) {
        setDang(`AI đang viết đoạn ${cac[0]}–${cac.at(-1)} (đợt ${i + 1}/${dot.length}, mỗi đợt khoảng 30–60 giây)…`)
        const anh = await Promise.all(
          guiDi.filter((k) => cac.includes(k.doan)).map(async (k) => ({ ten: k.ten, doan: k.doan, giay: k.giay, jpg: await thuNho(k.url, 384) })),
        )
        const hd = hien.nhan_dang
        const coNd = hd.nhan_vat.length + hd.boi_canh.length + hd.do_vat.length > 0
        const res = await fetch('/phuc-dung/viet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anh, ghiChu, nhanDang: coNd ? hd : undefined }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.duAn)
          throw new Error(
            `Đợt ${i + 1} (đoạn ${cac[0]}–${cac.at(-1)}): ${data.loi ?? `máy chủ báo lỗi ${res.status}`}. Các đợt trước đã lưu, bấm lại để viết tiếp.`,
          )
        hien = noiDot(hien, data.duAn)
        onXong(hien) // lưu ngay sau mỗi đợt, đợt sau lỗi cũng không mất
      }
    } catch (e) {
      setLoi((e as Error).message)
    }
    setDang('')
  }

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <label className="label">Ghi chú cho AI (không bắt buộc)</label>
      <textarea value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} rows={2} className="input"
        placeholder="Ví dụ: đổi xe thành màu đỏ, nhân vật chính là cô gái tóc dài…" />
      {coKichBan && (
        <div className="mt-3 space-y-1 text-sm">
          <label className="flex items-start gap-2">
            <input type="radio" className="mt-1" checked={lamTiep} onChange={() => setLamTiep(true)} />
            <span>
              <b>Làm tiếp</b> (nên chọn): giữ nguyên bộ nhận dạng và {daViet.size} cảnh đã viết, AI chỉ viết cho
              các đoạn chưa có chữ ({soDoanGui || 0} đoạn).
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" className="mt-1" checked={!lamTiep} onChange={() => setLamTiep(false)} />
            <span>Viết lại từ đầu: AI viết lại cả bộ nhận dạng và toàn bộ cảnh (các cảnh cũ bị thay).</span>
          </label>
        </div>
      )}
      <button onClick={viet} disabled={!guiDi.length || !!dang} className="btn btn-ca-hai mt-3">
        {dang || (noi ? `AI viết thêm ${Math.min(soDoanGui, TOI_DA_DOAN)} cảnh` : 'AI xem và viết')}
      </button>
      {!khung.length && <p className="mt-2 text-xs text-slate-500">Lấy khung hình ở bước 1 trước.</p>}
      {khung.length > 0 && noi && !guiDi.length && (
        <p className="mt-2 text-xs text-amber-700">Các đoạn đã lấy đều có cảnh rồi. Ở bước 1 bấm &quot;Làm tiếp&quot; để lấy khung hình các đoạn sau.</p>
      )}
      {loi && <p className="mt-2 text-sm font-medium text-red-600">{loi}</p>}
    </div>
  )
}

function NhapXuatJson({ duAn, onNhap }: { duAn: DuAn; onNhap: (d: DuAn) => void }) {
  const [mo, setMo] = useState(false)
  const [chu, setChu] = useState('')
  const [tb, setTb] = useState('')
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <button className="btn btn-phu btn-sm" onClick={() => setMo(!mo)}>Dán JSON (do Claude viết)</button>
      <button className="btn btn-phu btn-sm"
        onClick={() => navigator.clipboard.writeText(JSON.stringify(duAn, null, 2)).then(() => setTb('Đã chép JSON'))}>
        Chép JSON
      </button>
      <button className="btn btn-nhat btn-sm" onClick={() => confirm('Xóa hết bộ nhận dạng và các cảnh?') && onNhap(DU_AN_TRONG)}>
        Làm lại từ đầu
      </button>
      {tb && <span className="text-xs text-green-700">{tb}</span>}
      {mo && (
        <div className="w-full">
          <textarea value={chu} onChange={(e) => setChu(e.target.value)} rows={6} className="input font-mono text-xs"
            placeholder='{ "nhan_dang": {...}, "canh": [...] }' />
          <button className="btn btn-fb btn-sm mt-2" onClick={() => {
            try {
              onNhap(chuanHoa(JSON.parse(chu)))
              setMo(false)
              setTb('Đã nhập')
            } catch {
              setTb('JSON chưa đúng')
            }
          }}>Nhập</button>
        </div>
      )}
    </div>
  )
}

function SuaNhanDang({ nd, anh, tenAnh, onDoi }: {
  nd: NhanDang; anh: Record<string, string>; tenAnh: string[]; onDoi: (nd: NhanDang) => void
}) {
  const nhom = [
    ['nhan_vat', 'Nhân vật', 'A'],
    ['do_vat', 'Đồ vật / xe', 'X'],
    ['boi_canh', 'Bối cảnh', 'B'],
  ] as const
  return (
    <div className="mt-5 space-y-4">
      <h3 className="font-bold text-slate-800">Bộ nhận dạng (chép nguyên văn vào mọi cảnh)</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="label">Phong cách hình ảnh</span>
          <textarea rows={3} className="input" value={nd.phong_cach} onChange={(e) => onDoi({ ...nd, phong_cach: e.target.value })} />
        </label>
        <label>
          <span className="label">Âm thanh</span>
          <textarea rows={3} className="input" value={nd.am_thanh} onChange={(e) => onDoi({ ...nd, am_thanh: e.target.value })} />
        </label>
      </div>
      {nhom.map(([khoa, ten, tienTo]) => {
        const ds = nd[khoa]
        const doi = (moi: Muc[]) => onDoi({ ...nd, [khoa]: moi })
        return (
          <div key={khoa}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">{ten}</span>
              <button className="btn btn-phu btn-sm"
                onClick={() => doi([...ds, { ma: `${tienTo}${ds.length + 1}`, ten: '', mo_ta: '', anh_mau: '' }])}>+ Thêm</button>
            </div>
            <div className="space-y-2">
              {ds.map((m, i) => {
                const sua = (x: Partial<Muc>) => doi(ds.map((y, j) => (j === i ? { ...y, ...x } : y)))
                return (
                  <div key={i} className="grid gap-2 rounded-xl ring-1 ring-slate-200 p-3 sm:grid-cols-[5rem_10rem_1fr_9rem]">
                    <input className="input" value={m.ma} onChange={(e) => sua({ ma: e.target.value.trim() })} placeholder="Mã" />
                    <input className="input" value={m.ten} onChange={(e) => sua({ ten: e.target.value })} placeholder="Tên gọi" />
                    <textarea rows={2} className="input" value={m.mo_ta} onChange={(e) => sua({ mo_ta: e.target.value })}
                      placeholder="Mô tả cố định (tiếng Anh)" />
                    <div className="flex items-start gap-1">
                      <select className="input text-xs" value={m.anh_mau} onChange={(e) => sua({ anh_mau: e.target.value })}>
                        <option value="">Ảnh mẫu…</option>
                        {[...new Set([m.anh_mau, ...tenAnh])].filter(Boolean).map((t) => <option key={t}>{t}</option>)}
                      </select>
                      <button className="btn btn-nhat btn-sm" title="Xóa" onClick={() => doi(ds.filter((_, j) => j !== i))}>✕</button>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {anh[m.anh_mau] && <img src={anh[m.anh_mau]} alt="" className="h-16 w-auto rounded-md sm:col-start-4" />}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SuaCanh({ ds, nd, onDoi }: { ds: Canh[]; nd: NhanDang; onDoi: (c: Canh[]) => void }) {
  const moi: Canh = { ten: '', doan_goc: [], boi_canh: nd.boi_canh[0]?.ma ?? '', nhan_vat: [], do_vat: [], hanh_dong: '', may_quay: '', noi_tiep: true }
  const bat = (dsMa: string[], ma: string) => (dsMa.includes(ma) ? dsMa.filter((x) => x !== ma) : [...dsMa, ma])
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-bold text-slate-800">Các cảnh ({ds.length})</h3>
        <button className="btn btn-phu btn-sm" onClick={() => onDoi([...ds, moi])}>+ Thêm cảnh</button>
      </div>
      <div className="space-y-3">
        {ds.map((c, i) => {
          const sua = (x: Partial<Canh>) => onDoi(ds.map((y, j) => (j === i ? { ...y, ...x } : y)))
          return (
            <div key={i} className="rounded-xl ring-1 ring-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-sm text-blue-700">Cảnh {i + 1}</b>
                <input className="input max-w-xs" value={c.ten} onChange={(e) => sua({ ten: e.target.value })} placeholder="Tên cảnh" />
                <span className="text-xs text-slate-500">đoạn gốc {c.doan_goc.join(', ') || '–'}</span>
                <label className="ml-auto flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={c.noi_tiep} onChange={(e) => sua({ noi_tiep: e.target.checked })} />
                  Nối tiếp cảnh trước
                </label>
                <button className="btn btn-nhat btn-sm" onClick={() => onDoi(ds.filter((_, j) => j !== i))}>✕</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <select className="input w-auto text-xs" value={c.boi_canh} onChange={(e) => sua({ boi_canh: e.target.value })}>
                  <option value="">(không bối cảnh)</option>
                  {nd.boi_canh.map((b) => <option key={b.ma} value={b.ma}>{b.ma} {b.ten}</option>)}
                </select>
                {[...nd.nhan_vat.map((m) => ['nhan_vat', m] as const), ...nd.do_vat.map((m) => ['do_vat', m] as const)].map(([k, m]) => (
                  <label key={k + m.ma} className="flex items-center gap-1">
                    <input type="checkbox" checked={c[k].includes(m.ma)} onChange={() => sua({ [k]: bat(c[k], m.ma) })} />
                    {m.ma} {m.ten}
                  </label>
                ))}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <textarea rows={2} className="input" value={c.hanh_dong} onChange={(e) => sua({ hanh_dong: e.target.value })}
                  placeholder="Hành động trong 8 giây (tiếng Anh)" />
                <textarea rows={2} className="input" value={c.may_quay} onChange={(e) => sua({ may_quay: e.target.value })}
                  placeholder="Góc máy (tiếng Anh)" />
                <textarea rows={2} className="input" value={c.khung_dau ?? ''} onChange={(e) => sua({ khung_dau: e.target.value })}
                  placeholder="Ảnh đầu cho thấy gì (tiếng Anh)" />
                <textarea rows={2} className="input" value={c.khung_cuoi ?? ''} onChange={(e) => sua({ khung_cuoi: e.target.value })}
                  placeholder="Ảnh cuối cho thấy gì (tiếng Anh)" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const so2 = (n: number) => String(n).padStart(2, '0')

// Mỗi cảnh: ảnh đầu + ảnh cuối lấy từ đoạn gốc → Flow "Frames to Video" (First frame + Last frame).
// Ảnh cuối cảnh này và ảnh đầu cảnh sau là 2 khung liền nhau của video gốc nên các cảnh nối khớp.
function DanhSachCauLenh({ duAn, anh }: { duAn: DuAn; anh: Record<string, string> }) {
  const ds = useMemo(() => ghepCauLenh(duAn), [duAn])
  const [daChep, setDaChep] = useState(-1)
  if (!ds.length) return <p className="text-sm text-slate-500">Chưa có cảnh nào. Làm bước 2 trước.</p>

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Mỗi cảnh: trong Flow chọn <b>Frames to Video</b>, đặt <b>ảnh đầu</b> vào ô First frame, <b>ảnh cuối</b> vào ô Last frame,
        rồi dán câu lệnh. Thêm ảnh nào trước cũng được, miễn đúng ô.
      </p>
      {ds.map((c) => {
        const doanDau = c.canh.doan_goc[0]
        const doanCuoi = c.canh.doan_goc.at(-1)
        const hai = [
          { nhan: 'Ảnh đầu', o: 'ô First frame', url: doanDau ? anh[tenKhung(doanDau, 'dau')] : undefined, ten: `canh_${so2(c.so)}_1_anh_dau.jpg` },
          { nhan: 'Ảnh cuối', o: 'ô Last frame', url: doanCuoi ? anh[tenKhung(doanCuoi, 'cuoi')] : undefined, ten: `canh_${so2(c.so)}_2_anh_cuoi.jpg` },
        ]
        const coDu = hai.every((h) => h.url)

        return (
          <div key={c.so} className="rounded-xl ring-1 ring-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-blue-700">Cảnh {c.so}</b>
              <span className="text-sm font-semibold">{c.canh.ten}</span>
              <span className="text-xs text-slate-500">đoạn gốc {c.canh.doan_goc.join(', ') || '–'}</span>
              <span className="chip ml-auto bg-violet-100 text-violet-800">Flow: Frames to Video</span>
            </div>

            <div className="mt-3 rounded-lg bg-slate-50 p-3">
              <p className="mb-2 text-sm font-semibold text-slate-700">① Ảnh đưa vào Flow</p>
              {c.canh.co_cat_canh && (
                <p className="mb-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                  ✂ Đoạn gốc này có <b>cắt cảnh giữa chừng</b>: ảnh đầu và ảnh cuối khác góc máy. Câu lệnh đã dặn Veo cắt thẳng sang
                  cảnh sau, nhưng Veo hay làm méo hình. Nếu ra không đẹp: chỉ đưa <b>ảnh đầu</b> (bỏ trống ô Last frame) rồi tạo lại.
                </p>
              )}
              {coDu ? (
                <>
                  <div className="flex flex-wrap gap-3">
                    {hai.map((h) => (
                      <button key={h.nhan} className="text-left" title="Bấm để tải ảnh này" onClick={() => taiVe(h.url!, h.ten)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={h.url} alt={h.nhan} className="h-28 rounded-md" />
                        <span className="mt-1 block text-xs text-slate-600">⬇ <b>{h.nhan}</b> → {h.o}</span>
                      </button>
                    ))}
                  </div>
                  <button className="btn btn-fb btn-sm mt-2"
                    onClick={() => hai.forEach((h, k) => setTimeout(() => taiVe(h.url!, h.ten), k * 400))}>
                    ⬇ Tải cả 2 ảnh cảnh {c.so}
                  </button>
                </>
              ) : (
                <p className="text-xs text-amber-700">
                  Chưa có ảnh của đoạn gốc {c.canh.doan_goc.join(', ') || '(chưa ghi đoạn gốc)'}: bấm &quot;Lấy khung hình&quot; ở bước 1, chọn
                  đúng khúc có các đoạn này.
                </p>
              )}
            </div>

            <div className="mt-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-700">② Câu lệnh</p>
                <button className="btn btn-fb btn-sm ml-auto"
                  onClick={() => navigator.clipboard.writeText(c.vanBan).then(() => setDaChep(c.so))}>
                  {daChep === c.so ? '✓ Đã chép' : 'Chép câu lệnh'}
                </button>
              </div>
              {c.loi.map((l) => <p key={l} className="mt-1 text-xs font-medium text-red-600">{l}</p>)}
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{c.vanBan}</pre>
            </div>
          </div>
        )
      })}
    </div>
  )
}
