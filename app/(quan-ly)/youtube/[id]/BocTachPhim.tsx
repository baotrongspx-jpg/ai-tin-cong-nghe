'use client'

import { useMemo, useState } from 'react'
import type { DuAnYT } from '@/lib/youtube'
import type { PhanTichHanhDong } from '@/lib/thuVienHanhDong'
import { bocTach, bocTachCsv, type DongBocTach } from '@/lib/bocTach'

// Bảng bóc tách từng câu thoại: mỗi câu một thẻ — cần làm gì trên hình và cần chuẩn bị gì; câu còn thiếu tô cam
function The({ x, tenChuong }: { x: DongBocTach; tenChuong: string }) {
  const thieu = x.can_chuan_bi.length > 0
  const o = (nhan: string, gt: React.ReactNode) =>
    gt ? (
      <div className="grid grid-cols-[96px_1fr] gap-2 text-xs">
        <span className="font-semibold text-slate-500">{nhan}</span>
        <span className="text-slate-800">{gt}</span>
      </div>
    ) : null
  return (
    <li className={`grid gap-1.5 rounded-lg p-3 ring-1 ${thieu ? 'bg-orange-50 ring-orange-200' : 'bg-white ring-slate-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm">
          <span className="mr-1 text-xs font-semibold text-slate-400">{tenChuong} · câu {x.i + 1}</span>
          <b>{x.ai}:</b> {x.chu}
        </p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${thieu ? 'bg-orange-200 text-orange-900' : 'bg-emerald-100 text-emerald-800'}`}>
          {thieu ? `Cần chuẩn bị ${x.can_chuan_bi.length}` : '✓ Đủ để dựng'}
        </span>
      </div>
      {o('Trên hình', x.tren_hinh)}
      {o('Hành động', <span className={x.hanh_dong.startsWith('THIẾU') ? 'font-semibold text-red-700' : ''}>{x.hanh_dong}</span>)}
      {o('Di chuyển', x.di_chuyen)}
      {o(
        'Đạo cụ',
        x.dao_cu.length
          ? x.dao_cu.map((v) => (
              <span key={v.ten} className={`mr-1 inline-block rounded px-1.5 ${v.co ? 'bg-slate-100' : v.gan_duoc ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-700'}`}>
                {v.ten}
                {v.co ? '' : v.gan_duoc ? ' · gắn được' : ' · phải vẽ'}
              </span>
            ))
          : '',
      )}
      {o(
        'Hình cần có',
        x.hinh.length
          ? x.hinh.map((h) => (
              <span key={h.ten} title={h.ghi_chu} className={`mr-1 inline-block rounded px-1.5 ${h.co ? 'bg-emerald-50 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>
                {h.ten}
                {h.co ? '' : ` · ${h.ghi_chu}`}
              </span>
            ))
          : '',
      )}
      {o('Bối cảnh', x.boi_canh ? `${x.boi_canh}${x.nen_co ? '' : ' — THIẾU ảnh nền'}` : '')}
      {o('Ánh sáng', x.anh_sang)}
      {o('Máy quay', x.may_quay)}
      {o('Nét mặt', x.cam_xuc)}
      {o('Âm thanh', x.am_thanh)}
      {thieu && o('Cần chuẩn bị', <ul className="list-disc pl-4 font-semibold text-orange-900">{x.can_chuan_bi.map((v) => <li key={v}>{v}</li>)}</ul>)}
      {x.chi_tiet && (
        <details>
          <summary className="cursor-pointer text-xs font-semibold text-violet-700">🎭 Kịch bản diễn</summary>
          <p className="mt-1 whitespace-pre-wrap rounded bg-violet-50 p-2 text-xs leading-relaxed text-slate-800">{x.chi_tiet}</p>
        </details>
      )}
    </li>
  )
}

export default function BocTachPhim({ d, pt }: { d: DuAnYT; pt: PhanTichHanhDong }) {
  const [chiThieu, setChiThieu] = useState(false)
  const ds = useMemo(() => bocTach(d, pt), [d, pt])
  const soThieu = ds.filter((x) => x.can_chuan_bi.length).length
  const tenChuong = (k: number) => `${d.loai === 'tieu_su' ? 'Chương' : 'Phần'} ${k}`
  const taiExcel = () => {
    const url = URL.createObjectURL(new Blob([bocTachCsv(ds)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `boc-tach-${d.tieu_de.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').replace(/[^\w]+/g, '-').slice(0, 50)}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  return (
    <div className="grid gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-bold">📑 Bảng bóc tách từng câu thoại</p>
          <p className="text-xs text-slate-600">
            {ds.length} câu — <b className="text-emerald-700">{ds.length - soThieu} đủ để dựng</b>, <b className="text-orange-700">{soThieu} cần chuẩn bị</b>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={chiThieu} onChange={(e) => setChiThieu(e.target.checked)} /> Chỉ câu còn thiếu
          </label>
          <button type="button" className="btn btn-sm btn-nhat" onClick={taiExcel}>
            ⬇ Tải bảng (Excel)
          </button>
        </div>
      </div>
      {pt.chuong.map((c) => {
        const dong = ds.filter((x) => x.k === c.k && (!chiThieu || x.can_chuan_bi.length))
        if (!dong.length) return null
        return (
          <details key={c.k} open={chiThieu}>
            <summary className="cursor-pointer text-sm font-semibold">
              {tenChuong(c.k)}: {d.phan[c.k - 1]?.tieu_de} —{' '}
              <span className="font-normal text-slate-500">{dong.filter((x) => x.can_chuan_bi.length).length} câu cần chuẩn bị</span>
            </summary>
            <ul className="mt-2 grid gap-2">
              {dong.map((x) => (
                <The key={`${x.k}-${x.i}`} x={x} tenChuong={tenChuong(x.k)} />
              ))}
            </ul>
          </details>
        )
      })}
    </div>
  )
}
