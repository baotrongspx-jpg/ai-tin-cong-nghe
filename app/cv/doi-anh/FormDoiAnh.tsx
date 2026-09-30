'use client'

import { startTransition, useActionState, useState } from 'react'
import { doiAnhCV, khoiPhucAnhCV, type KetQuaDoiAnh } from '../actions'

// Ảnh điện thoại nặng vài MB: thu nhỏ ngay trên trình duyệt (cạnh dài ≤1600px) cho vừa giới hạn gửi lên máy chủ
async function thuNho(tep: File): Promise<Blob> {
  const anh = await createImageBitmap(tep, { imageOrientation: 'from-image' })
  const tiLe = Math.min(1, 1600 / Math.max(anh.width, anh.height))
  const nen = document.createElement('canvas')
  nen.width = Math.round(anh.width * tiLe)
  nen.height = Math.round(anh.height * tiLe)
  nen.getContext('2d')!.drawImage(anh, 0, 0, nen.width, nen.height)
  return new Promise((xong, loi) => nen.toBlob((b) => (b ? xong(b) : loi(new Error('không nén được ảnh'))), 'image/jpeg', 0.9))
}

export default function FormDoiAnh({ anhHienTai, laMacDinh }: { anhHienTai: string; laMacDinh: boolean }) {
  const [kq, gui, dangGui] = useActionState(async (truoc: KetQuaDoiAnh, form: FormData) => {
    if (form.get('khoi_phuc')) return khoiPhucAnhCV()
    return doiAnhCV(truoc, form)
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
    } catch {
      setLoiChon('Trình duyệt không mở được ảnh này. Hãy chọn ảnh JPG hoặc PNG.')
    }
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
