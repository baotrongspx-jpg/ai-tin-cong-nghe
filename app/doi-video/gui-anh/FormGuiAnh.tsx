'use client'

import { useState } from 'react'
import { guiDon, guiMotAnh } from './actions'

type Anh = { id: string; ten: string; blob: Blob; xem: string; doc: boolean }

// "Bình giữ nhiệt Inox" → "binh-giu-nhiet-inox"
function taoMa(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function moAnh(tep: File): Promise<HTMLImageElement> {
  return new Promise((xong, loi) => {
    const img = new Image()
    img.onload = () => xong(img)
    img.onerror = () => loi(new Error('không mở được ảnh'))
    img.src = URL.createObjectURL(tep)
  })
}

// Thu nhỏ trên trình duyệt: cạnh dài ≤2048px, dưới ~2.5MB, giữ nguyên tỉ lệ dọc/ngang
async function thuNho(tep: File) {
  const anh = await moAnh(tep)
  const rong = anh.naturalWidth
  const cao = anh.naturalHeight
  if (!rong || !cao) throw new Error('ảnh rỗng')
  const tiLe = Math.min(1, 2048 / Math.max(rong, cao))
  const nen = document.createElement('canvas')
  nen.width = Math.round(rong * tiLe)
  nen.height = Math.round(cao * tiLe)
  nen.getContext('2d')!.drawImage(anh, 0, 0, nen.width, nen.height)
  URL.revokeObjectURL(anh.src)
  for (const cl of [0.9, 0.8, 0.7]) {
    const b = await new Promise<Blob | null>((xong) => nen.toBlob(xong, 'image/jpeg', cl))
    if (b && (b.size < 2_500_000 || cl === 0.7)) return { blob: b, doc: cao >= rong }
  }
  throw new Error('không nén được ảnh')
}

const NOI_DANG = ['TikTok', 'Facebook Reels', 'YouTube Shorts', 'Cả ba']

export default function FormGuiAnh() {
  const [sanPham, setSanPham] = useState('')
  const [gia, setGia] = useState('')
  const [banCho, setBanCho] = useState('')
  const [diemManh, setDiemManh] = useState('')
  const [noiDang, setNoiDang] = useState('TikTok')
  const [soDoan, setSoDoan] = useState(1)
  const [ghiChu, setGhiChu] = useState('')
  const [anh, setAnh] = useState<Anh[]>([])
  const [daGui, setDaGui] = useState(0)
  const [loiChon, setLoiChon] = useState('')
  const [dangGui, setDangGui] = useState(false)
  const [tienDo, setTienDo] = useState('')
  const [ketQua, setKetQua] = useState<{ ok: boolean; chu: string } | null>(null)

  const duAn = taoMa(sanPham)

  async function chon(e: React.ChangeEvent<HTMLInputElement>) {
    const tep = Array.from(e.target.files ?? [])
    e.target.value = ''
    setLoiChon('')
    const moi: Anh[] = []
    for (const f of tep.slice(0, 10)) {
      try {
        const { blob, doc } = await thuNho(f)
        moi.push({ id: crypto.randomUUID(), ten: f.name, blob, xem: URL.createObjectURL(blob), doc })
      } catch (loi) {
        setLoiChon(
          `Không mở được "${f.name}" (${(loi as Error).message}). Ảnh iPhone: vào Cài đặt → Camera → Định dạng → chọn "Tương thích nhất".`,
        )
      }
    }
    setAnh((cu) => [...cu, ...moi].slice(0, 10))
  }

  function bo(id: string) {
    setAnh((cu) => {
      const a = cu.find((x) => x.id === id)
      if (a) URL.revokeObjectURL(a.xem)
      return cu.filter((x) => x.id !== id)
    })
  }

  async function gui() {
    if (!duAn) return setKetQua({ ok: false, chu: 'Nhập tên sản phẩm trước.' })
    if (!anh.length) return setKetQua({ ok: false, chu: 'Chọn ít nhất một ảnh sản phẩm.' })
    setDangGui(true)
    setKetQua(null)
    try {
      // Gửi tiếp từ ảnh chưa gửi, để lỗi giữa chừng không gửi trùng
      for (let i = daGui; i < anh.length; i++) {
        setTienDo(`Đang gửi ảnh ${i + 1}/${anh.length}…`)
        const form = new FormData()
        form.set('duAn', duAn)
        form.set('ten', anh[i].ten)
        form.set('anh', anh[i].blob, 'anh.jpg')
        const kq = await guiMotAnh(form)
        if (!kq.ok) throw new Error(`Ảnh ${i + 1}: ${kq.thongBao}`)
        setDaGui(i + 1)
      }
      setTienDo('Đang gửi đơn hàng…')
      const kq = await guiDon({ duAn, sanPham, gia, banCho, diemManh, noiDang, soDoan, ghiChu })
      if (!kq.ok) throw new Error(kq.thongBao)
      const so = anh.length
      anh.forEach((a) => URL.revokeObjectURL(a.xem))
      setAnh([])
      setDaGui(0)
      setKetQua({
        ok: true,
        chu: `Đã gửi ${so} ảnh và đơn hàng "${sanPham}". Mở cửa sổ đội trưởng và gõ: Có đơn mới trên web, chạy node cong-cu/tai-anh.mjs rồi làm.`,
      })
    } catch (e) {
      setKetQua({ ok: false, chu: `Chưa gửi xong: ${(e as Error).message || 'lỗi mạng'}. Bấm Gửi lại để gửi tiếp phần còn lại.` })
    } finally {
      setDangGui(false)
      setTienDo('')
    }
  }

  const coAnhNgang = anh.some((a) => !a.doc)

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="san_pham">Tên sản phẩm *</label>
        <input
          id="san_pham"
          className="input"
          value={sanPham}
          disabled={daGui > 0}
          onChange={(e) => setSanPham(e.target.value)}
          placeholder="Bình giữ nhiệt inox 500ml"
        />
        {duAn && <p className="mt-1 text-xs text-slate-500">Thư mục trên máy: du-an/<b>{duAn}</b></p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="gia">Giá bán</label>
          <input id="gia" className="input" value={gia} onChange={(e) => setGia(e.target.value)} placeholder="199.000đ" />
        </div>
        <div>
          <label className="label" htmlFor="so_doan">Số đoạn 10 giây</label>
          <select id="so_doan" className="input" value={soDoan} onChange={(e) => setSoDoan(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n} đoạn · {n * 10} giây</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="ban_cho">Bán cho ai</label>
        <input id="ban_cho" className="input" value={banCho} onChange={(e) => setBanCho(e.target.value)} placeholder="Dân văn phòng, học sinh…" />
      </div>
      <div>
        <label className="label" htmlFor="diem_manh">Điểm mạnh của sản phẩm</label>
        <textarea
          id="diem_manh"
          rows={3}
          className="input"
          value={diemManh}
          onChange={(e) => setDiemManh(e.target.value)}
          placeholder="Giữ nóng lâu, nắp chống tràn… Chỉ ghi điều có thật."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="noi_dang">Đăng lên</label>
          <select id="noi_dang" className="input" value={noiDang} onChange={(e) => setNoiDang(e.target.value)}>
            {NOI_DANG.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ghi_chu">Ghi chú thêm</label>
          <input id="ghi_chu" className="input" value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Khuyến mãi, màu…" />
        </div>
      </div>

      <div>
        <p className="label">Ảnh sản phẩm * (tối đa 10, nên chụp dọc)</p>
        <div className="grid grid-cols-3 gap-2">
          {anh.map((a, i) => (
            <figure key={a.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.xem} alt={a.ten} className="aspect-[3/4] w-full rounded-xl object-cover ring-1 ring-slate-200" />
              {i >= daGui && (
                <button
                  type="button"
                  onClick={() => bo(a.id)}
                  disabled={dangGui}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-sm text-white"
                  aria-label={`Bỏ ảnh ${a.ten}`}
                >
                  ×
                </button>
              )}
              {i < daGui && <figcaption className="mt-0.5 text-[11px] font-semibold text-emerald-600">Đã gửi</figcaption>}
              {i >= daGui && !a.doc && <figcaption className="mt-0.5 text-[11px] font-semibold text-amber-600">Ảnh ngang</figcaption>}
            </figure>
          ))}
          {anh.length < 10 && (
            <label
              htmlFor="chon_anh"
              className="grid aspect-[3/4] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-2 text-center text-sm font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600"
            >
              + Chọn ảnh
            </label>
          )}
        </div>
        <input id="chon_anh" type="file" accept="image/*" multiple onChange={chon} className="sr-only" />
        {coAnhNgang && (
          <p className="mt-1 text-xs text-amber-700">Có ảnh ngang. Gemini làm video theo khung của ảnh, nên ảnh dọc sẽ ra video dọc cho TikTok.</p>
        )}
        {loiChon && <p className="mt-1 text-sm font-medium text-red-600">{loiChon}</p>}
      </div>

      {tienDo && <p className="text-sm font-semibold text-blue-600">{tienDo}</p>}
      {ketQua && <p className={`text-sm font-semibold ${ketQua.ok ? 'text-emerald-600' : 'text-red-600'}`}>{ketQua.chu}</p>}

      <button onClick={gui} disabled={dangGui} className="btn btn-fb w-full py-2.5">
        {dangGui ? 'Đang gửi…' : daGui > 0 ? 'Gửi lại' : 'Gửi cho đội'}
      </button>
    </div>
  )
}
