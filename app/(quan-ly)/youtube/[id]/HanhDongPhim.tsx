'use client'

import { useState } from 'react'
import type { DuAnYT } from '@/lib/youtube'
import { TEN_LOAI_HINH, THU_VIEN_HANH_DONG, canChuanBi, coEmoji, danhSachChuanBi, doVatThieu, hanhDongCu, hanhDongThieu, kichBanDien, yeuCauClaudeCode } from '@/lib/thuVienHanhDong'
import { thongBao } from '@/app/ThongBao'
import { Xoay } from '@/app/BieuTuong'
import { apDungHanhDongYouTube, chuanBiHanhDongYouTube, themDiaDiemYouTube } from '../actions'
import BocTachPhim from './BocTachPhim'

function NutChepNho({ chu, ten = 'Chép', lon = false }: { chu: string; ten?: string; lon?: boolean }) {
  const [da, setDa] = useState(false)
  return (
    <button
      type="button"
      className={lon ? 'btn btn-sm btn-nhat' : 'justify-self-start text-xs font-semibold text-violet-700 hover:underline'}
      onClick={() =>
        navigator.clipboard.writeText(chu).then(() => {
          setDa(true)
          setTimeout(() => setDa(false), 1500)
        })
      }
    >
      {da ? '✓ Đã chép' : ten}
    </button>
  )
}

// Chuẩn bị hành động nhân vật trước khi dựng: AI đọc lời thoại từng chương, mỗi câu ai làm gì; máy dựng chưa có hành động
// đó thì hiện đỏ, có nút chép yêu cầu dán vào Claude Code để xây thêm
export default function HanhDongPhim({ d, onDuAn }: { d: DuAnYT; onDuAn: (d: DuAnYT) => void }) {
  const [dang, setDang] = useState<'doc' | 'ap' | null>(null)
  const [chep, setChep] = useState(false)
  const [dangThem, setDangThem] = useState<string | null>(null)
  // Thêm địa điểm chưa có vào hồ sơ phim → tải / AI vẽ ảnh nền ở khung Ảnh nền, rồi chuẩn bị lại
  const themNoi = async (ten: string) => {
    setDangThem(ten)
    const kq = await themDiaDiemYouTube(d.id, ten)
    setDangThem(null)
    if (!kq.ok) return thongBao('loi', kq.loi)
    onDuAn(kq.duAn)
    thongBao('ok', `Đã thêm "${ten}" vào hồ sơ — tải ảnh hoặc bấm AI vẽ ở khung "Ảnh nền phim này cần", rồi bấm Chuẩn bị lại`)
  }
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
  const chuanBi = pt ? canChuanBi(pt) : []
  const soHinh = tatCa.reduce((t, x) => t + (x.hinh_can?.length ?? 0), 0)
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
      {dang === 'doc' && <p className="text-sm text-slate-500">AI đang đọc {d.phan.length} chương và viết kịch bản diễn cho từng câu (khoảng 1–2 phút)…</p>}

      {pt && (
        <>
          {cu && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">Lời thoại đã sửa sau lần chuẩn bị này — bấm chuẩn bị lại để khớp.</p>}
          <div className="grid gap-2 sm:grid-cols-5">
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
            <div className={`rounded-lg p-3 ring-1 ${chuanBi.length ? 'bg-orange-50 ring-orange-200' : 'bg-emerald-50 ring-emerald-200'}`}>
              <p className="text-2xl font-bold">{chuanBi.length}<span className="text-sm font-normal text-slate-500">/{soHinh} hình</span></p>
              <p className="text-xs text-slate-700">hình cần chuẩn bị (logo, ảnh thật, địa điểm…)</p>
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
            {tatCa.some((x) => x.chi_tiet) && (
              <NutChepNho
                chu={kichBanDien(d.tieu_de, pt, (k) => `${d.loai === 'tieu_su' ? 'Chương' : 'Phần'} ${k}: ${d.phan[k - 1]?.tieu_de ?? ''}`)}
                ten="🎭 Chép kịch bản diễn cả phim"
                lon
              />
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

          {chuanBi.length > 0 && (
            <div className="grid gap-2 rounded-lg bg-orange-50 p-3 ring-1 ring-orange-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-orange-900">Cần chuẩn bị ({chuanBi.length})</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700" disabled={!!dang || cu} onClick={() => void apDung()}>
                    {dang === 'ap' ? <Xoay /> : '✓'} Gắn (tự sửa những mục sửa được)
                  </button>
                  <NutChepNho chu={danhSachChuanBi(d.tieu_de, pt)} ten="📋 Chép danh sách cần chuẩn bị" lon />
                </div>
              </div>
              <p className="text-xs text-orange-900">
                Nút <b>Gắn</b> tự sửa: câu đang dùng sai địa điểm (chuyển sang đúng nơi có ảnh nền), đạo cụ có emoji (người diễn cầm thêm), logo, hành động máy đã có.
                Bạn phải tự làm: ảnh nền cho địa điểm chưa có ảnh (khung &quot;Ảnh nền phim này cần&quot;), nơi chưa có trong hồ sơ, đồ vật / hành động phải vẽ (chép yêu cầu cho Claude Code).
              </p>
              <ul className="grid gap-1 text-sm text-orange-950">
                {chuanBi.map((g) => (
                  <li key={g.loai + g.ten}>
                    <span className="mr-1 rounded bg-orange-100 px-1.5 text-[11px] font-semibold text-orange-800">{TEN_LOAI_HINH[g.loai]}</span>
                    <b>{g.ten}</b> — {g.ghi_chu} <span className="text-xs text-orange-700">({g.vi_du.map((v) => `ch.${v.k} câu ${v.i + 1}`).slice(0, 4).join(', ')})</span>
                    {g.loai === 'dia_diem' && g.ghi_chu.startsWith('nơi "') && d.loai === 'tieu_su' && (
                      <button type="button" className="btn btn-sm btn-nhat ml-2" disabled={!!dangThem} onClick={() => void themNoi(g.ten)}>
                        {dangThem === g.ten ? <Xoay /> : '➕'} Thêm vào hồ sơ
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-orange-800">Logo thương hiệu máy tự vẽ huy hiệu (không cần chuẩn bị). Ảnh nền địa điểm: tải ở khung &quot;Ảnh nền phim này cần&quot;. Đồ vật phải vẽ: nằm trong yêu cầu chép cho Claude Code.</p>
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

          <BocTachPhim d={d} pt={pt} />

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
                          {(x.hinh_can ?? []).length > 0 && (
                            <span className="mt-0.5 flex flex-wrap gap-1">
                              {(x.hinh_can ?? []).map((h) => (
                                <span
                                  key={h.loai + h.ten}
                                  title={h.ghi_chu}
                                  className={`rounded px-1.5 text-[11px] ${h.co ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-orange-100 text-orange-800 ring-1 ring-orange-300'}`}
                                >
                                  {h.loai === 'logo' ? (
                                    <span className="mr-0.5 inline-block rounded px-1 font-bold text-white" style={{ background: h.mau || '#334155' }}>
                                      {h.chu || h.ten.slice(0, 2)}
                                    </span>
                                  ) : (
                                    h.emoji
                                  )}{' '}
                                  {TEN_LOAI_HINH[h.loai]}: {h.ten}
                                  {!h.co && ' — cần chuẩn bị'}
                                </span>
                              ))}
                            </span>
                          )}
                          {x.chi_tiet && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-xs font-semibold text-violet-700">🎭 Kịch bản diễn</summary>
                              <div className="mt-1 grid gap-1 rounded-lg bg-violet-50 p-2 ring-1 ring-violet-100">
                                <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-800">{x.chi_tiet}</p>
                                <NutChepNho chu={x.chi_tiet} />
                              </div>
                            </details>
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
