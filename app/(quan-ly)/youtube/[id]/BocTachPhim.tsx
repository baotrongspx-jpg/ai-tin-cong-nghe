'use client'

import { useMemo, useState } from 'react'
import type { DuAnYT } from '@/lib/youtube'
import type { PhanTichHanhDong } from '@/lib/thuVienHanhDong'
import { bocTach, bocTachCsv, type DongBocTach } from '@/lib/bocTach'
import { thongBao } from '@/app/ThongBao'
import { duyetCanhYouTube } from '../actions'

// Bảng bóc tách từng câu thoại: mỗi câu một thẻ — cần làm gì trên hình và cần chuẩn bị gì; câu còn thiếu tô cam
// Chủ trang xem video rồi chấm cảnh: Đạt / Lỗi (ghi lỗi gì) — chưa chấm thì là "chưa xác minh", không tính là xong
function ChamCanh({ x, cham }: { x: DongBocTach; cham: (kq: 'dat' | 'loi' | '', ghiChu: string) => Promise<void> }) {
  const [ghi, setGhi] = useState(x.kiem_duyet.ghi_chu)
  const [mo, setMo] = useState(false)
  const [dang, setDang] = useState(false)
  const lam = async (kq: 'dat' | 'loi' | '', g = '') => {
    setDang(true)
    await cham(kq, g)
    setDang(false)
    setMo(false)
  }
  return (
    <div className="grid gap-1.5 rounded bg-slate-50 p-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-500">Kiểm duyệt:</span>
        <span className={`rounded-full px-2 py-0.5 font-bold ${x.kiem_duyet.kq === 'dat' ? 'bg-emerald-100 text-emerald-800' : x.kiem_duyet.kq === 'loi' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>
          {x.kiem_duyet.kq === 'dat' ? '✓ Đạt' : x.kiem_duyet.kq === 'loi' ? `✗ Lỗi${x.kiem_duyet.ghi_chu ? `: ${x.kiem_duyet.ghi_chu}` : ''}` : 'Chưa xác minh'}
        </span>
        <button type="button" disabled={dang} className="btn btn-sm btn-phu" onClick={() => lam('dat')}>✓ Đạt</button>
        <button type="button" disabled={dang} className="btn btn-sm btn-phu" onClick={() => setMo(!mo)}>✗ Có lỗi</button>
        {x.kiem_duyet.kq !== 'chua' && (
          <button type="button" disabled={dang} className="text-slate-500 underline" onClick={() => lam('')}>bỏ chấm</button>
        )}
      </div>
      {mo && (
        <div className="flex flex-wrap gap-2">
          <input value={ghi} onChange={(e) => setGhi(e.target.value)} placeholder="Lỗi gì? vd: không thấy cầm bài, sai bối cảnh, chữ đè mặt…" className="min-w-0 flex-1 rounded border px-2 py-1" />
          <button type="button" disabled={dang || !ghi.trim()} className="btn btn-sm btn-tt" onClick={() => lam('loi', ghi)}>Lưu lỗi</button>
        </div>
      )}
    </div>
  )
}

function The({ x, tenChuong, cham }: { x: DongBocTach; tenChuong: string; cham: (kq: 'dat' | 'loi' | '', ghiChu: string) => Promise<void> }) {
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
          <span className="mr-1 text-xs font-semibold text-slate-400" title={`${tenChuong} · câu ${x.i + 1}`}>
            {x.id_cau} · {x.id_canh} · ~{x.thoi_luong}s
          </span>
          <b>{x.ai}:</b> {x.chu}
        </p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${thieu ? 'bg-orange-200 text-orange-900' : 'bg-emerald-100 text-emerald-800'}`}>
          {thieu ? `Cần chuẩn bị ${x.can_chuan_bi.length}` : '✓ Đủ để dựng'}
        </span>
      </div>
      {o('Ý nghĩa', x.y_nghia && <span className="italic">{x.y_nghia}</span>)}
      {o('Trên hình', x.tren_hinh)}
      {o('Hành động', <span className={x.hanh_dong.startsWith('THIẾU') ? 'font-semibold text-red-700' : ''}>{x.hanh_dong}</span>)}
      {o('Di chuyển', x.di_chuyen)}
      {o('Đầu cảnh', x.dau_canh)}
      {o('Cuối cảnh', x.cuoi_canh)}
      {o('Chuyển tiếp', x.chuyen_tiep)}
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
      <details>
        <summary className="cursor-pointer text-xs font-semibold text-sky-700">☑ Tiêu chí kiểm tra ({x.tieu_chi.length})</summary>
        <ul className="mt-1 list-disc pl-5 text-xs text-slate-700">{x.tieu_chi.map((v) => <li key={v}>{v}</li>)}</ul>
      </details>
      <ChamCanh key={`${x.kiem_duyet.kq}-${x.kiem_duyet.ghi_chu}`} x={x} cham={cham} />
    </li>
  )
}

export default function BocTachPhim({ d, pt, onDuAn }: { d: DuAnYT; pt: PhanTichHanhDong; onDuAn: (d: DuAnYT) => void }) {
  const [loc, setLoc] = useState<'tat_ca' | 'thieu' | 'chua' | 'loi'>('tat_ca')
  const ds = useMemo(() => bocTach(d, pt), [d, pt])
  const soThieu = ds.filter((x) => x.can_chuan_bi.length).length
  const soDat = ds.filter((x) => x.kiem_duyet.kq === 'dat').length
  const soLoi = ds.filter((x) => x.kiem_duyet.kq === 'loi').length
  const hop = (x: DongBocTach) => (loc === 'thieu' ? x.can_chuan_bi.length > 0 : loc === 'chua' ? x.kiem_duyet.kq === 'chua' : loc === 'loi' ? x.kiem_duyet.kq === 'loi' : true)
  const cham = (x: DongBocTach) => async (kq: 'dat' | 'loi' | '', ghiChu: string) => {
    const r = await duyetCanhYouTube(d.id, x.k, x.i, kq, ghiChu)
    if (!r.ok) return thongBao('loi', r.loi)
    onDuAn(r.duAn)
  }
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
          <p className="text-xs text-slate-600">
            Kiểm duyệt sau khi xem video: <b className="text-emerald-700">{soDat} đạt</b>, <b className="text-red-700">{soLoi} lỗi</b>, <b>{ds.length - soDat - soLoi} chưa xác minh</b>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={loc} onChange={(e) => setLoc(e.target.value as typeof loc)} className="rounded border px-2 py-1 text-xs">
            <option value="tat_ca">Tất cả câu</option>
            <option value="thieu">Câu cần chuẩn bị</option>
            <option value="chua">Câu chưa xác minh</option>
            <option value="loi">Câu có lỗi</option>
          </select>
          <button type="button" className="btn btn-sm btn-nhat" onClick={taiExcel}>
            ⬇ Tải bảng (Excel)
          </button>
        </div>
      </div>
      {pt.chuong.map((c) => {
        const dong = ds.filter((x) => x.k === c.k && hop(x))
        if (!dong.length) return null
        return (
          <details key={c.k} open={loc !== 'tat_ca'}>
            <summary className="cursor-pointer text-sm font-semibold">
              {tenChuong(c.k)}: {d.phan[c.k - 1]?.tieu_de} —{' '}
              <span className="font-normal text-slate-500">{dong.filter((x) => x.can_chuan_bi.length).length} câu cần chuẩn bị</span>
            </summary>
            <ul className="mt-2 grid gap-2">
              {dong.map((x) => (
                <The key={`${x.k}-${x.i}`} x={x} tenChuong={tenChuong(x.k)} cham={cham(x)} />
              ))}
            </ul>
          </details>
        )
      })}
    </div>
  )
}
