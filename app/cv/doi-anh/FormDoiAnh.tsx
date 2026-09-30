'use client'

import { startTransition, useActionState, useState } from 'react'
import { doiAnhCV, khoiPhucAnhCV, type KetQuaDoiAnh } from '../actions'

// Mở ảnh bằng thẻ <img>: đọc được cả ảnh HEIC của iPhone trên Safari, tự xoay đúng chiều
function moAnh(tep: File): Promise<HTMLImageElement> {
  return new Promise((xong, loi) => {
    const url = URL.createObjectURL(tep)
    const img = new Image()
    img.onload = () => xong(img)
    img.onerror = () => loi(new Error('không mở được ảnh'))
    img.src = url
  })
}

// Ảnh điện thoại nặng vài MB: thu nhỏ ngay trên trình duyệt (cạnh dài ≤1200px, dưới ~800KB) rồi mới gửi lên
async function thuNho(tep: File): Promise<Blob> {
  const anh = await moAnh(tep)
  const rong = anh.naturalWidth, cao = anh.naturalHeight
  if (!rong || !cao) throw new Error('ảnh rỗng')
  const tiLe = Math.min(1, 1200 / Math.max(rong, cao))
  const nen = document.createElement('canvas')
  nen.width = Math.round(rong * tiLe)
  nen.height = Math.round(cao * tiLe)
  nen.getContext('2d')!.drawImage(anh, 0, 0, nen.width, nen.height)
  URL.revokeObjectURL(anh.src)
  for (const chatLuong of [0.88, 0.75, 0.6]) {
    const b = await new Promise<Blob | null>((xong) => nen.toBlob(xong, 'image/jpeg', chatLuong))
    if (b && (b.size < 800_000 || chatLuong === 0.6)) return b
  }
  throw new Error('không nén được ảnh')
}

export default function FormDoiAnh({ anhHienTai, laMacDinh }: { anhHienTai: string; laMacDinh: boolean }) {
  const [kq, gui, dangGui] = useActionState(async (truoc: KetQuaDoiAnh, form: FormData) => {
    // Lỗi mạng / máy chủ từ chối: hiện thành dòng báo lỗi thay vì trang trắng
    try {
      if (form.get('khoi_phuc')) return await khoiPhucAnhCV()
      return await doiAnhCV(truoc, form)
    } catch (e) {
      return { ok: false, thongBao: `Chưa lưu được (${(e as Error).message || 'lỗi mạng'}). Thử lại hoặc chọn ảnh khác.` }
    }
  }, null)
  const [xemTruoc, setXemTruoc] = useState<string | null>(null)
  const [tep, setTep] = useState<Blob | null>(null)
  const [loiChon, setLoiChon] = useState('')

  async function chon(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    setLoiChon('')
    if (!f) return
    try {
      const b = await thuNho(f)
      setTep(b)
      setXemTruoc((cu) => {
        if (cu) URL.revokeObjectURL(cu)
        return URL.createObjectURL(b)
      })
    } catch (loi) {
      setTep(null)
      setLoiChon(
        `Không mở được ảnh này (${(loi as Error).message}). Nếu là ảnh iPhone, vào Cài đặt → Camera → Định dạng → chọn "Tương thích nhất", hoặc chụp màn hình ảnh rồi chọn ảnh chụp màn hình.`,
      )
    }
    e.target.value = '' // chọn lại đúng ảnh đó vẫn chạy
  }

  function luu() {
    if (!tep) return
    const form = new FormData()
    form.set('anh', tep, 'anh.jpg')
    startTransition(() => gui(form))
  }

  function khoiPhuc() {
    if (!confirm('Quay về ảnh mặc định?')) return
    const form = new FormData()
    form.set('khoi_phuc', '1')
    startTransition(() => gui(form))
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <figure>
          <figcaption className="mb-2 text-sm font-semibold text-slate-500">Ảnh đang dùng</figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={anhHienTai} alt="Ảnh đang dùng" className="aspect-[4/5] w-full rounded-2xl object-cover object-top ring-1 ring-slate-200" />
        </figure>
        <figure>
          <figcaption className="mb-2 text-sm font-semibold text-slate-500">Ảnh mới</figcaption>
          {xemTruoc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={xemTruoc} alt="Ảnh mới" className="aspect-[4/5] w-full rounded-2xl object-cover object-top ring-2 ring-blue-500" />
          ) : (
            <label
              htmlFor="chon_anh"
              className="grid aspect-[4/5] w-full cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-center text-sm font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600"
            >
              Bấm để chọn ảnh
            </label>
          )}
        </figure>
      </div>

      <input id="chon_anh" type="file" accept="image/*" onChange={chon} className="sr-only" />
      <p className="text-xs text-slate-500">
        Ảnh sẽ được cắt khung dọc 4:5, giữ phần đầu như ô xem trước. Nên dùng ảnh chụp một mình, mặc vest, nền trơn.
      </p>
      {loiChon && <p className="text-sm font-medium text-red-600">{loiChon}</p>}
      {kq && <p className={`text-sm font-semibold ${kq.ok ? 'text-emerald-600' : 'text-red-600'}`}>{kq.thongBao}</p>}

      <div className="flex flex-wrap gap-2">
        <label htmlFor="chon_anh" className="btn btn-phu cursor-pointer">
          {xemTruoc ? 'Chọn ảnh khác' : 'Chọn ảnh'}
        </label>
        <button onClick={luu} disabled={!tep || dangGui} className="btn btn-fb">
          {dangGui ? 'Đang lưu…' : 'Lưu ảnh này'}
        </button>
        <a href="/cv" target="_blank" className="btn btn-nhat">
          Xem trang CV ↗
        </a>
        {!laMacDinh && (
          <button onClick={khoiPhuc} disabled={dangGui} className="btn btn-nhat ml-auto text-red-600">
            Về ảnh mặc định
          </button>
        )}
      </div>
    </div>
  )
}
