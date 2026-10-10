'use client'

import { useRef, useState } from 'react'
import type { NenTuLam as Nen } from '@/lib/nenTuLam'
import { thongBao } from '@/app/ThongBao'
import { Xoay } from '@/app/BieuTuong'
import { layNenTuLam, xinLinkTaiNen, xoaNenTuLam } from './actions'

const YEU_CAU = [
  ['Khổ ngang 16:9', 'tối thiểu 1920×1080, đẹp nhất 2560×1440. Tệp .jpg, .png hoặc .webp, dưới 20 MB.'],
  ['Chỉ có khung cảnh', 'KHÔNG có người, nhân vật hay con vật lớn — Mèo Mun, Robot Bit và các nhân vật sẽ đứng phía trước ảnh.'],
  ['Không chữ, không logo', 'không hình mờ (watermark), không biển hiệu chữ to.'],
  ['Nhìn ngang tầm mắt', 'như đang đứng trong cảnh nhìn thẳng vào; mặt sàn / mặt đất chiếm khoảng 1/4 phía dưới ảnh.'],
  ['Giữa ảnh thoáng', 'không có đồ vật lớn chắn ở giữa, vì nhân vật đứng ở giữa và hai bên.'],
  ['Nội dung chính ở dải giữa', 'mép trên và mép dưới có thể bị cắt bớt; phần dưới cùng sẽ mờ dần vào sàn sân khấu.'],
  ['Đồng bộ', 'mọi bối cảnh cùng một kiểu (cùng là ảnh thật, hoặc cùng một kiểu vẽ), ánh sáng vừa phải, không quá tối.'],
  ['Bản quyền', 'ảnh tự chụp, tự tạo bằng AI, hoặc ảnh miễn phí bản quyền (Unsplash, Pexels) để YouTube không đánh bản quyền.'],
]

// Video YouTube: chủ trang tải lên mỗi bối cảnh một ảnh nền; máy nhà dùng ảnh này thay tranh Pixabay / cảnh vẽ bằng code
export default function NenTuLam({ dau }: { dau: Nen[] }) {
  const [ds, setDs] = useState(dau)
  const [mo, setMo] = useState(false)
  const [dang, setDang] = useState<string | null>(null)
  const chon = useRef<HTMLInputElement>(null)
  const dangChon = useRef<string>('')
  const co = ds.filter((x) => x.tep).length

  const lamMoi = async () => {
    const kq = await layNenTuLam()
    if (kq.ok) setDs(kq.ds)
  }

  const taiLen = async (f: File | undefined) => {
    const b = dangChon.current
    if (!f || !b) return
    if (!/\.(jpe?g|png|webp)$/i.test(f.name)) return thongBao('loi', 'Chỉ nhận ảnh .jpg, .png, .webp')
    if (f.size > 20 * 1024 * 1024) return thongBao('loi', 'Ảnh quá lớn (tối đa 20 MB)')
    setDang(b)
    try {
      const kq = await xinLinkTaiNen(b, f.name)
      if (!kq.ok) throw new Error(kq.loi)
      const res = await fetch(kq.url, { method: 'PUT', body: f, headers: { 'content-type': f.type || 'image/jpeg', 'x-upsert': 'true' } })
      if (!res.ok) throw new Error(`Tải lên lỗi ${res.status}`)
      thongBao('ok', `Đã tải ảnh nền ${ds.find((x) => x.boiCanh === b)?.ten ?? ''}`)
      await lamMoi()
    } catch (e) {
      thongBao('loi', e instanceof Error ? e.message : 'Tải lên lỗi')
    } finally {
      setDang(null)
      if (chon.current) chon.current.value = ''
    }
  }

  const xoa = async (b: string) => {
    setDang(b)
    const kq = await xoaNenTuLam(b)
    if (!kq.ok) thongBao('loi', kq.loi)
    await lamMoi()
    setDang(null)
  }

  return (
    <section className="the mt-6 grid gap-4 p-5">
      <button type="button" onClick={() => setMo(!mo)} className="flex items-center justify-between gap-3 text-left">
        <span>
          <span className="font-bold">🖼 Ảnh nền tự làm</span>
          <span className="ml-2 text-sm text-slate-500">Đã có {co}/{ds.length} bối cảnh</span>
        </span>
        <span className="text-sm text-slate-500">{mo ? 'Thu gọn ▲' : 'Mở ▼'}</span>
      </button>
      {mo && (
        <>
          <p className="text-sm text-slate-600">
            Mỗi cảnh trong video có một <b>bối cảnh</b> (sân bay, văn phòng, phố…). Bối cảnh nào có ảnh của bạn thì mọi video dựng sau đó dùng ảnh này làm
            nền; bối cảnh chưa có ảnh vẫn dùng tranh Pixabay hoặc cảnh vẽ như cũ. Video đã dựng xong không tự đổi.
          </p>
          <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <h3 className="mb-2 text-sm font-bold text-amber-900">📋 Ảnh cần như thế nào</h3>
            <ul className="grid gap-1.5 text-sm text-amber-950">
              {YEU_CAU.map(([dau, sau]) => (
                <li key={dau}>
                  • <b>{dau}:</b> {sau}
                </li>
              ))}
            </ul>
          </div>
          <input ref={chon} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void taiLen(e.target.files?.[0])} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {ds.map((x) => (
              <div key={x.boiCanh} className="grid gap-2 rounded-xl p-2 ring-1 ring-slate-200">
                {x.xem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={x.xem} alt={x.ten} className="aspect-video w-full rounded-lg bg-slate-100 object-cover" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">Chưa có ảnh</div>
                )}
                <div>
                  <p className="text-sm font-semibold">{x.ten}</p>
                  <p className="text-xs text-slate-500">{x.goiY}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="btn btn-sm btn-phu flex-1"
                    disabled={!!dang}
                    onClick={() => {
                      dangChon.current = x.boiCanh
                      chon.current?.click()
                    }}
                  >
                    {dang === x.boiCanh ? <Xoay /> : x.tep ? 'Thay ảnh' : 'Tải ảnh'}
                  </button>
                  {x.tep && (
                    <button type="button" className="btn btn-sm btn-nhat" disabled={!!dang} onClick={() => void xoa(x.boiCanh)}>
                      Xoá
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
