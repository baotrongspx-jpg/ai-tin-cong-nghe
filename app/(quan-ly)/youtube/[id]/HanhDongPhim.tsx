'use client'

import { useState } from 'react'
import type { DuAnYT } from '@/lib/youtube'
import { THU_VIEN_HANH_DONG, coEmoji, doVatThieu, hanhDongCu, hanhDongThieu, yeuCauClaudeCode } from '@/lib/thuVienHanhDong'
import { thongBao } from '@/app/ThongBao'
import { Xoay } from '@/app/BieuTuong'
import { apDungHanhDongYouTube, chuanBiHanhDongYouTube } from '../actions'

// Chuẩn bị hành động nhân vật trước khi dựng: AI đọc lời thoại từng chương, mỗi câu ai làm gì; máy dựng chưa có hành động
// đó thì hiện đỏ, có nút chép yêu cầu dán vào Claude Code để xây thêm
export default function HanhDongPhim({ d, onDuAn }: { d: DuAnYT; onDuAn: (d: DuAnYT) => void }) {
  const [dang, setDang] = useState<'doc' | 'ap' | null>(null)
  const [chep, setChep] = useState(false)
  const daViet = d.phan.every((p) => p.loi)
  const pt = d.hanh_dong
  const cu = hanhDongCu(d, pt)

  const doc = async () => {
    setDang('doc')
    const kq = await chuanBiHanhDongYouTube(d.id)
    setDang(null)
    if (!kq.ok) return thongBao('loi', kq.loi)
    onDuAn(kq.duAn)
    thongBao('ok', 'AI đã đọc xong lời thoại và chuẩn bị hành động cho từng câu')
  }
  const apDung = async () => {
    setDang('ap')
    const kq = await apDungHanhDongYouTube(d.id)
    setDang(null)
    if (!kq.ok) return thongBao('loi', kq.loi)
    onDuAn(kq.duAn)
    thongBao('ok', `Đã gắn hành động cho ${kq.so} câu${kq.boQua.length ? ` (bỏ qua chương ${kq.boQua.join(', ')} vì đã dựng xong)` : ''}`)
  }

  if (!daViet) return null
  const tatCa = pt ? pt.chuong.flatMap((c) => c.cau) : []
  const canDien = tatCa.filter((x) => x.can)
  const coSan = canDien.filter((x) => THU_VIEN_HANH_DONG[x.hanh_dong])
  const thieu = pt ? hanhDongThieu(pt) : []
  const soThieu = thieu.reduce((t, g) => t + g.vi_du.length, 0)
  const yeuCau = pt ? yeuCauClaudeCode(d.tieu_de, pt) : ''
  const vatThieu = pt ? doVatThieu(pt) : []
  const vatGanDuoc = vatThieu.filter((g) => coEmoji(g.vat))
  const vatPhaiVe = vatThieu.filter((g) => !coEmoji(g.vat))
  const canClaude = soThieu > 0 || vatPhaiVe.length > 0

  return (
    <section className="the grid gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">🎬 Hành động nhân vật theo lời thoại</h2>
          <p className="mt-1 text-sm text-slate-600">
            Trước khi dựng: AI đọc lời thoại từng chương, mỗi câu nhân vật phải <b>làm</b> gì trên hình và cần <b>đạo cụ</b> gì để diễn cùng (rửa chén có cái chén, quét nhà có cái chổi, ký hợp đồng có bút và tờ hợp đồng…). Hành động / đạo cụ máy dựng chưa có sẽ hiện màu đỏ — bấm <b>Chép yêu cầu cho Claude Code</b> rồi dán vào Claude Code để xây thêm.
          </p>
        </div>
        <button type="button" className="btn btn-sm bg-violet-600 text-white hover:bg-violet-700" disabled={!!dang} onClick={() => void doc()}>
          {dang === 'doc' ? <Xoay /> : '🎬'} {pt ? (cu ? 'Kịch bản đã đổi — chuẩn bị lại' : 'Chuẩn bị lại') : 'AI đọc lời thoại & chuẩn bị hành động'}
        </button>
      </div>
      {dang === 'doc' && <p className="text-sm text-slate-500">AI đang đọc {d.phan.length} chương (khoảng 30–60 giây)…</p>}

      {pt && (
        <>
          {cu && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">Lời thoại đã sửa sau lần chuẩn bị này — bấm chuẩn bị lại để khớp.</p>}
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="text-2xl font-bold">{canDien.length}<span className="text-sm font-normal text-slate-500">/{tatCa.length} câu</span></p>
              <p className="text-xs text-slate-600">câu có việc cần diễn (không chỉ đứng nói)</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
              <p className="text-2xl font-bold text-emerald-700">{coSan.length}</p>
              <p className="text-xs text-emerald-800">máy dựng đã có hành động</p>
            </div>
            <div className={`rounded-lg p-3 ring-1 ${soThieu ? 'bg-red-50 ring-red-200' : 'bg-emerald-50 ring-emerald-200'}`}>
              <p className={`text-2xl font-bold ${soThieu ? 'text-red-700' : 'text-emerald-700'}`}>{soThieu}</p>
              <p className={`text-xs ${soThieu ? 'text-red-800' : 'text-emerald-800'}`}>{soThieu ? `câu THIẾU hành động (${thieu.length} loại cần xây thêm)` : 'không thiếu hành động nào'}</p>
            </div>
            <div className={`rounded-lg p-3 ring-1 ${vatPhaiVe.length ? 'bg-red-50 ring-red-200' : vatGanDuoc.length ? 'bg-amber-50 ring-amber-200' : 'bg-emerald-50 ring-emerald-200'}`}>
              <p className="text-2xl font-bold">{vatThieu.length}</p>
              <p className="text-xs text-slate-700">
                đạo cụ còn thiếu{vatThieu.length ? `: ${vatGanDuoc.length} gắn được ngay, ${vatPhaiVe.length} phải vẽ thêm` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700" disabled={!!dang || cu} onClick={() => void apDung()}>
              {dang === 'ap' ? <Xoay /> : '✓'} Gắn hành động & đạo cụ vào kịch bản
            </button>
            {canClaude && (
              <button
                type="button"
                className="btn btn-sm btn-nhat"
                onClick={() =>
                  navigator.clipboard.writeText(yeuCau).then(() => {
                    setChep(true)
                    setTimeout(() => setChep(false), 1500)
                  })
                }
              >
                {chep ? '✓ Đã chép' : '📋 Chép yêu cầu cho Claude Code'}
              </button>
            )}
          </div>
          <p className="-mt-2 text-xs text-slate-500">Gắn: mỗi câu nhận hành động có sẵn, đạo cụ còn thiếu có hình (emoji) thì người diễn cầm thêm ở tay còn trống. Chỉ sửa các chương chưa dựng; chương đã dựng xong giữ nguyên. Sau khi Claude Code xây xong hành động / đạo cụ mới, bấm chuẩn bị lại rồi gắn lại.</p>

          {thieu.length > 0 && (
            <div className="grid gap-2 rounded-lg bg-red-50 p-3 ring-1 ring-red-200">
              <p className="text-sm font-bold text-red-800">Hành động còn thiếu</p>
              <ul className="grid gap-2 text-sm text-red-950">
                {thieu.map((g) => (
                  <li key={g.ten}>
                    <b>{g.ten}</b> — {g.viec} {g.do_vat.size > 0 && <span>{[...g.do_vat].join(' ')}</span>} <span className="text-xs text-red-700">({g.vi_du.length} câu)</span>
                    <ul className="ml-4 text-xs text-red-800">
                      {g.vi_du.slice(0, 3).map((v) => (
                        <li key={`${v.k}-${v.i}`}>– Chương {v.k}, câu {v.i + 1}: “{v.chu}…”</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {vatThieu.length > 0 && (
            <div className="grid gap-1 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
              <p className="text-sm font-bold text-amber-900">Đạo cụ còn thiếu</p>
              <ul className="flex flex-wrap gap-1.5 text-xs">
                {vatThieu.map((g) => (
                  <li key={g.vat} className={`rounded-full px-2 py-0.5 font-semibold ${coEmoji(g.vat) ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-700'}`}>
                    {g.vat} ({g.vi_du.length}){coEmoji(g.vat) ? '' : ' — phải vẽ'}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-800">Vàng: gắn được ngay (bấm Gắn). Đỏ: chưa có hình — nằm trong yêu cầu chép cho Claude Code.</p>
            </div>
          )}

          <div className="grid gap-2">
            {pt.chuong.map((c) => (
              <details key={c.k} className="rounded-lg ring-1 ring-slate-200">
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
                  {d.loai === 'tieu_su' ? 'Chương' : 'Phần'} {c.k}: {d.phan[c.k - 1]?.tieu_de} —{' '}
                  <span className="font-normal text-slate-500">
                    {c.cau.filter((x) => x.can).length} câu cần diễn, {c.cau.filter((x) => x.hanh_dong === 'moi').length} thiếu
                  </span>
                </summary>
                <ul className="grid gap-1 px-3 pb-3 text-sm">
                  {c.cau.map((x) => {
                    const tv = THU_VIEN_HANH_DONG[x.hanh_dong]
                    return (
                      <li key={x.i} className="grid gap-0.5 border-t border-slate-100 pt-1 sm:grid-cols-[1fr_auto] sm:gap-3">
                        <span className="text-slate-700">
                          <span className="text-xs text-slate-400">{x.i + 1}.</span> {x.chu}… <span className="text-xs text-slate-500">— {x.nguoi}: {x.viec}</span>
                          {(x.do_vat_can ?? []).length > 0 && (
                            <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
                              {(x.do_vat_can ?? []).map((v) => (
                                <span key={v} className={`rounded px-1.5 text-[11px] ${(x.do_vat_thieu ?? []).includes(v) ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                  {v}
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                        <span
                          className={`h-fit justify-self-start rounded-full px-2 py-0.5 text-xs font-semibold ${
                            x.hanh_dong === 'moi' ? 'bg-red-100 text-red-700' : tv ? (tv.loai === 'ke_chuyen' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800') : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {x.hanh_dong === 'moi' ? `THIẾU: ${x.ten_moi}` : tv ? tv.ten : 'đứng nói'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </details>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
