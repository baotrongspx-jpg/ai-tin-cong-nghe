'use client'

import { useEffect, useRef, useState } from 'react'
import type { DuAnYT, LoaiPdf, TrangThaiPdf } from '@/lib/youtube'
import { thongBao } from '@/app/ThongBao'
import { Xoay } from '@/app/BieuTuong'
import { dungVideoYouTube, ganAnhPdfYouTube, layAnhPdfYouTube, tachPdfYouTube, xinLinkTaiPdfYouTube } from '../actions'

const TEN_PDF: Record<LoaiPdf, { tieuDe: string; goiY: string }> = {
  nhan_vat: { tieuDe: '🧑 PDF nhân vật', goiY: 'Hồ sơ nhân vật: mỗi nhân vật một bảng thiết kế kèm tên, độ tuổi, mốc thời gian' },
  canh: { tieuDe: '🏞 PDF cảnh', goiY: 'Ảnh cảnh khung ngang kèm chữ: chương mấy, cảnh mấy, mô tả' },
}
const cho = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Phim tiểu sử: chủ trang nạp 2 tệp PDF (nhân vật + cảnh, ảnh nằm trong PDF) rồi bấm "Nhà máy sản xuất": máy nhà tách ảnh →
// AI gắn ảnh vào kịch bản (nhân vật theo giai đoạn chương, cảnh theo từng đoạn) → gửi máy nhà dựng cả phim
export default function AnhPdf({ d, onDuAn, khoa }: { d: DuAnYT; onDuAn: (d: DuAnYT) => void; khoa: boolean }) {
  const [tt, setTt] = useState<TrangThaiPdf | null>(null)
  const [dangTai, setDangTai] = useState<LoaiPdf | null>(null)
  const [buoc, setBuoc] = useState('')
  const chon = { nhan_vat: useRef<HTMLInputElement>(null), canh: useRef<HTMLInputElement>(null) }
  const xongKichBan = d.phan.length > 0 && d.phan.every((p) => p.loi)

  const lay = async () => {
    const kq = await layAnhPdfYouTube(d.id)
    if (kq.ok) setTt(kq.tt)
    return kq.ok ? kq.tt : null
  }
  useEffect(() => {
    // Gọi sau lượt vẽ đầu (không đặt state ngay trong effect)
    const t = setTimeout(() => void lay(), 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.id])

  const taiLen = async (loai: LoaiPdf, f: File | undefined) => {
    if (!f) return
    if (!/\.pdf$/i.test(f.name)) return thongBao('loi', 'Chỉ nhận tệp .pdf')
    if (f.size > 200 * 1024 * 1024) return thongBao('loi', 'Tệp PDF quá lớn (tối đa 200 MB)')
    setDangTai(loai)
    try {
      const kq = await xinLinkTaiPdfYouTube(d.id, loai)
      if (!kq.ok) throw new Error(kq.loi)
      const res = await fetch(kq.url, { method: 'PUT', body: f, headers: { 'content-type': 'application/pdf', 'x-upsert': 'true' } })
      if (!res.ok) throw new Error(`Tải lên lỗi ${res.status}`)
      thongBao('ok', `Đã nạp ${TEN_PDF[loai].tieuDe.slice(3)}: ${f.name}`)
      await lay()
    } catch (e) {
      thongBao('loi', e instanceof Error ? e.message : 'Tải lên lỗi')
    } finally {
      setDangTai(null)
      if (chon[loai].current) chon[loai].current.value = ''
    }
  }

  const sanXuat = async () => {
    try {
      setBuoc('Gửi máy nhà tách ảnh trong PDF…')
      const g = await tachPdfYouTube(d.id)
      if (!g.ok) throw new Error(g.loi)
      // Đợi máy nhà tách xong (bảng ảnh mới xuất hiện), tối đa 15 phút
      let bang: TrangThaiPdf['bang'] = null
      for (let lan = 0; lan < 180 && !bang; lan++) {
        await cho(5000)
        setBuoc(`Máy nhà đang tách ảnh trong PDF… (${Math.round((lan + 1) * 5)} giây)`)
        bang = (await lay())?.bang ?? null
      }
      if (!bang) throw new Error('Máy nhà chưa tách xong sau 15 phút: kiểm tra máy nhà còn chạy không rồi bấm lại')
      if (bang.loi) thongBao('loi', bang.loi)
      setBuoc(`AI đang gắn ${bang.nhan_vat.length} ảnh nhân vật và ${bang.canh.length} ảnh cảnh vào kịch bản…`)
      const gan = await ganAnhPdfYouTube(d.id)
      if (!gan.ok) throw new Error(gan.loi)
      onDuAn(gan.duAn)
      setBuoc('Gửi máy nhà dựng phim…')
      const dung = await dungVideoYouTube(d.id)
      if (!dung.ok) throw new Error(dung.loi)
      thongBao('ok', `Đã gắn ảnh và gửi máy nhà dựng ${dung.so} phần — xem tiến độ ở mục dựng video bên dưới`)
    } catch (e) {
      thongBao('loi', e instanceof Error ? e.message : 'Có lỗi')
    } finally {
      setBuoc('')
      await lay()
    }
  }

  const bang = tt?.bang
  const nhan = d.phim?.anh_pdf?.luc === bang?.luc ? (d.phim?.anh_pdf?.nhan ?? {}) : {}
  const coPdf = !!tt && (tt.co.nhan_vat || tt.co.canh)
  return (
    <section className="the grid gap-3 p-5">
      <h2 className="font-bold">🏭 Ảnh tự làm từ PDF — Nhà máy sản xuất</h2>
      <p className="text-sm text-slate-600">
        Nạp 2 tệp PDF bạn làm (ảnh nằm trong PDF). Bấm <b>Nhà máy sản xuất</b>: máy nhà tách ảnh, AI đọc chữ cạnh từng ảnh để biết đó là ai / cảnh nào,
        gắn vào đúng đoạn kịch bản rồi tự dựng phim. Nạp lại PDF mới rồi bấm lại là thay ảnh.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['nhan_vat', 'canh'] as const).map((loai) => (
          <div key={loai} className="grid gap-2 rounded-xl p-3 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{TEN_PDF[loai].tieuDe}</span>
              {tt?.co[loai] ? <span className="chip bg-emerald-100 text-emerald-700">Đã nạp</span> : <span className="chip bg-slate-100 text-slate-500">Chưa nạp</span>}
            </div>
            <p className="text-xs text-slate-500">{TEN_PDF[loai].goiY}</p>
            <input ref={chon[loai]} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => void taiLen(loai, e.target.files?.[0])} />
            <button type="button" className="btn btn-sm btn-phu" disabled={!!dangTai || !!buoc} onClick={() => chon[loai].current?.click()}>
              {dangTai === loai ? <><Xoay /> Đang tải lên…</> : tt?.co[loai] ? 'Nạp lại PDF' : 'Chọn tệp PDF'}
            </button>
          </div>
        ))}
      </div>
      {!xongKichBan && tt?.co.canh && <p className="text-sm text-amber-700">Kịch bản các chương chưa viết xong: chờ AI viết xong rồi mới gắn được ảnh cảnh.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-fb" disabled={!coPdf || !!buoc || khoa || tt?.dangTach || (!!tt?.co.canh && !xongKichBan)} onClick={() => void sanXuat()}>
          🏭 Nhà máy sản xuất
        </button>
        {buoc && <span className="flex items-center gap-2 text-sm text-slate-600"><Xoay /> {buoc}</span>}
        {!buoc && tt?.dangTach && <span className="text-sm text-slate-500">Đang chờ máy nhà tách ảnh…</span>}
      </div>
      {bang && (bang.nhan_vat.length > 0 || bang.canh.length > 0) && (
        <div className="grid gap-3">
          {(['nhan_vat', 'canh'] as const).map((loai) =>
            bang[loai].length ? (
              <div key={loai} className="grid gap-2">
                <h3 className="text-sm font-semibold">{loai === 'nhan_vat' ? `Nhân vật tách được (${bang.nhan_vat.length})` : `Cảnh tách được (${bang.canh.length})`}</h3>
                <div className={`grid gap-2 ${loai === 'nhan_vat' ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4'}`}>
                  {bang[loai].map((x) => (
                    <figure key={x.tep} className="grid gap-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={bang.xem[x.tep]} alt={x.chu.slice(0, 60)} className={`w-full rounded-lg bg-slate-800 object-contain ${loai === 'nhan_vat' ? 'aspect-[2/3]' : 'aspect-video'}`} />
                      <figcaption className={`text-xs ${nhan[x.tep] === 'Không dùng' ? 'text-slate-400' : 'text-slate-700'}`}>{nhan[x.tep] ?? 'Chưa gắn'}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}
    </section>
  )
}
