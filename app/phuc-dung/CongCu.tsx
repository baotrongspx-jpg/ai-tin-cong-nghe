'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { type Canh, chuanHoa, type DuAn, DU_AN_TRONG, ghepCauLenh, type Muc, type NhanDang } from './ghep'

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

function docLuu(): DuAn {
  try {
    const luu = localStorage.getItem(KHOA_LUU)
    if (luu) return chuanHoa(JSON.parse(luu))
  } catch {}
  return DU_AN_TRONG
}

// Dự án lưu trong localStorage của trình duyệt → chỉ vẽ trang công cụ ở phía trình duyệt
export default function CongCu() {
  const trenTrinhDuyet = useSyncExternalStore(() => () => {}, () => true, () => false)
  return trenTrinhDuyet ? <TrangCongCu /> : <p className="text-sm text-slate-500">Đang mở công cụ…</p>
}

function TrangCongCu() {
  const [tep, setTep] = useState<File | null>(null)
  const [thoiLuong, setThoiLuong] = useState(0)
  const [tuGiay, setTuGiay] = useState(0)
  const [soDoan, setSoDoan] = useState(8)
  const [khung, setKhung] = useState<Khung[]>([])
  const [tienDo, setTienDo] = useState('')
  const [duAn, setDuAn] = useState<DuAn>(docLuu)

  useEffect(() => {
    try {
      localStorage.setItem(KHOA_LUU, JSON.stringify(duAn))
    } catch {}
  }, [duAn])

  const anhTheoTen = useMemo(() => Object.fromEntries(khung.map((k) => [k.ten, k.url])), [khung])

  async function chonVideo(f: File | undefined) {
    if (!f) return
    setTep(f)
    setKhung([])
    setTienDo('Đang đọc video…')
    try {
      const v = await moVideo(f)
      setThoiLuong(v.duration)
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

      <QuyTrinh />

      {/* Bước 1 */}
      <section className="the p-5">
        <TieuDe so={1} ten="Chọn video gốc và cắt khung hình" />
        <input
          type="file"
          accept="video/*"
          onChange={(e) => chonVideo(e.target.files?.[0])}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white"
        />
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
            <button onClick={catKhung} disabled={!!tienDo} className="btn btn-fb">Cắt khung hình</button>
          </div>
        )}
        {tienDo && <p className="mt-3 text-sm font-medium text-blue-700">{tienDo}</p>}
        {khung.length > 0 && <LuoiKhung khung={khung} />}
      </section>

      {/* Bước 2 */}
      <section className="the p-5">
        <TieuDe so={2} ten="Bộ nhận dạng và kịch bản từng cảnh" />
        <VietBangAI khung={khung} onXong={setDuAn} />
        <NhapXuatJson duAn={duAn} onNhap={setDuAn} />
        <SuaNhanDang nd={duAn.nhan_dang} anh={anhTheoTen} tenAnh={khung.map((k) => k.ten)}
          onDoi={(nhan_dang) => setDuAn({ ...duAn, nhan_dang })} />
        <SuaCanh ds={duAn.canh} nd={duAn.nhan_dang} onDoi={(canh) => setDuAn({ ...duAn, canh })} />
      </section>

      {/* Bước 3 */}
      <section className="the p-5">
        <TieuDe so={3} ten="Câu lệnh dán vào Veo 3" />
        <DanhSachCauLenh duAn={duAn} anh={anhTheoTen} />
      </section>

      {/* Bước 4 */}
      <section className="the p-5">
        <TieuDe so={4} ten="Lấy khung cuối để nối cảnh" />
        <KhungCuoi />
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
    ['Chọn video gốc', 'Chọn khúc muốn làm, bấm "Cắt khung hình". Trang lấy ảnh đầu, giữa và cuối của từng đoạn 8 giây.'],
    ['Viết bộ nhận dạng', 'Bấm "AI xem và viết". AI mô tả CỐ ĐỊNH nhân vật, đồ vật, bối cảnh và viết hành động từng cảnh. Bạn sửa lại nếu cần.'],
    ['Dán vào Veo 3', 'Làm lần lượt từ cảnh 1: chép câu lệnh, dán vào Flow/Gemini (Veo 3), đính kèm ảnh mẫu ghi trong cảnh.'],
    ['Nối cảnh', 'Làm xong cảnh nào thì tải video đó về, đưa vào bước 4 lấy khung cuối, dùng làm ảnh bắt đầu cho cảnh kế tiếp.'],
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
        Vì sao các cảnh giống nhau: mô tả nhân vật/bối cảnh được chép <b>nguyên văn</b> vào mọi câu lệnh, cùng ảnh mẫu,
        và ảnh bắt đầu của cảnh sau là khung cuối của cảnh trước. Người thật chỉ được mô tả qua trang phục, không sao chép khuôn mặt.
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

function VietBangAI({ khung, onXong }: { khung: Khung[]; onXong: (d: DuAn) => void }) {
  const [ghiChu, setGhiChu] = useState('')
  const [dang, setDang] = useState('')
  const [loi, setLoi] = useState('')

  async function viet() {
    setLoi('')
    setDang('Đang thu nhỏ ảnh…')
    try {
      const anh = await Promise.all(
        khung.map(async (k) => ({ ten: k.ten, doan: k.doan, giay: k.giay, jpg: await thuNho(k.url, 384) })),
      )
      setDang('AI đang xem video và viết (khoảng 20–60 giây)…')
      const res = await fetch('/phuc-dung/viet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anh, ghiChu }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.duAn) throw new Error(data.loi ?? 'AI chưa viết được, thử lại.')
      onXong(data.duAn)
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
      <button onClick={viet} disabled={!khung.length || !!dang} className="btn btn-ca-hai mt-3">
        {dang || 'AI xem và viết'}
      </button>
      {!khung.length && <p className="mt-2 text-xs text-slate-500">Cắt khung hình ở bước 1 trước.</p>}
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
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DanhSachCauLenh({ duAn, anh }: { duAn: DuAn; anh: Record<string, string> }) {
  const ds = useMemo(() => ghepCauLenh(duAn), [duAn])
  const [daChep, setDaChep] = useState(-1)
  if (!ds.length) return <p className="text-sm text-slate-500">Chưa có cảnh nào. Làm bước 2 trước.</p>
  return (
    <div className="space-y-4">
      {ds.map((c) => (
        <div key={c.so} className="rounded-xl ring-1 ring-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-blue-700">Cảnh {c.so}</b>
            <span className="text-sm font-semibold">{c.canh.ten}</span>
            <button className="btn btn-fb btn-sm ml-auto"
              onClick={() => navigator.clipboard.writeText(c.vanBan).then(() => setDaChep(c.so))}>
              {daChep === c.so ? '✓ Đã chép' : 'Chép câu lệnh'}
            </button>
          </div>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            <li>
              <b>Ảnh bắt đầu:</b>{' '}
              {c.canh.noi_tiep && c.so > 1 ? `khung cuối của cảnh ${c.so - 1} (lấy ở bước 4)` : 'không cần'}
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <b>Ảnh mẫu đính kèm:</b>
              {c.anhMau.length ? c.anhMau.map((m) =>
                anh[m.anh] ? (
                  <button key={m.ma} className="btn btn-phu btn-sm" onClick={() => taiVe(anh[m.anh], `${m.ma}_${m.anh}.jpg`)}>
                    ⬇ {m.ma} {m.ten}
                  </button>
                ) : (
                  <span key={m.ma}>{m.ma} ({m.anh}, cắt lại khung ở bước 1 để tải)</span>
                ),
              ) : 'không'}
            </li>
          </ul>
          {c.loi.map((l) => <p key={l} className="mt-1 text-xs font-medium text-red-600">{l}</p>)}
          <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{c.vanBan}</pre>
        </div>
      ))}
    </div>
  )
}

function KhungCuoi() {
  const [anh, setAnh] = useState<{ url: string; ten: string } | null>(null)
  const [tb, setTb] = useState('')
  const vao = useRef<HTMLInputElement>(null)

  async function lay(f: File | undefined) {
    if (!f) return
    setTb('Đang lấy khung cuối…')
    try {
      const v = await moVideo(f)
      await tua(v, v.duration - 0.05)
      const ten = f.name.replace(/\.[^.]+$/, '') + '_khung_cuoi.png'
      setAnh({ url: chup(v, 4096, 'image/png'), ten })
      URL.revokeObjectURL(v.src)
      setTb('')
    } catch (e) {
      setTb((e as Error).message)
    }
    if (vao.current) vao.current.value = ''
  }

  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">
        Chọn video Veo 3 vừa làm xong (cảnh trước). Tải ảnh khung cuối về, rồi dùng làm <b>ảnh bắt đầu</b> (Frames to Video) cho cảnh kế tiếp.
      </p>
      <input ref={vao} type="file" accept="video/*" onChange={(e) => lay(e.target.files?.[0])}
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:font-semibold file:text-white" />
      {tb && <p className="mt-2 text-sm text-blue-700">{tb}</p>}
      {anh && (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={anh.url} alt="Khung cuối" className="max-h-72 rounded-lg" />
          <button className="btn btn-fb mt-2" onClick={() => taiVe(anh.url, anh.ten)}>⬇ Tải {anh.ten}</button>
        </div>
      )}
    </div>
  )
}
