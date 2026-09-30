'use client'

import { useState } from 'react'

// Bảng số liệu kho MẪU (dữ liệu minh họa, không phải số thật của công ty nào):
// cho nhà tuyển dụng thấy cách tôi theo dõi nhập – xuất – tồn và hao hụt hằng ngày.
const NGUONG = 3 // % hao hụt tối đa cho phép mỗi ngày
const TON_DAU = 2000 // kg tồn đầu kỳ

// [ngày, kg nhập, kg xuất, % hao hụt trên lượng nhập]
const NGAY: [string, number, number, number][] = [
  ['17/9', 1320, 1150, 2.1], ['18/9', 1280, 1210, 2.4], ['19/9', 1450, 1300, 1.9], ['20/9', 1190, 1260, 2.6],
  ['21/9', 1380, 1240, 3.4], ['22/9', 1260, 1190, 2.2], ['23/9', 1410, 1330, 2.0], ['24/9', 1350, 1280, 2.8],
  ['25/9', 1300, 1220, 2.3], ['26/9', 1470, 1350, 1.8], ['27/9', 1240, 1300, 2.5], ['28/9', 1330, 1180, 3.2],
  ['29/9', 1390, 1320, 2.1], ['30/9', 1420, 1370, 1.9],
]

// [mã lô, kg trái nhập, kg múi thành phẩm, % hao hụt]
const LO: [string, number, number, number][] = [
  ['LO-2609-01', 2450, 882, 2.2],
  ['LO-2709-02', 1980, 693, 2.6],
  ['LO-2809-03', 2210, 751, 3.3],
  ['LO-2909-04', 2380, 869, 2.1],
  ['LO-3009-05', 2120, 784, 1.9],
]

const so = (n: number) => Math.round(n).toLocaleString('vi-VN')

export default function BangKhoMau() {
  const [chon, setChon] = useState<number | null>(null)

  const tongNhap = NGAY.reduce((t, [, n]) => t + n, 0)
  const tongXuat = NGAY.reduce((t, [, , x]) => t + x, 0)
  const tongHao = NGAY.reduce((t, [, n, , p]) => t + (n * p) / 100, 0)
  const tonCuoi = TON_DAU + tongNhap - tongXuat - tongHao
  const vuot = NGAY.filter(([, , , p]) => p > NGUONG).length

  // Kích thước biểu đồ (đơn vị SVG); cột % hao hụt theo ngày, đường ngưỡng nét đứt
  const W = 640, H = 220, T = 16, B = 28, L = 34, R = 8
  const MAX = 4
  const y = (p: number) => T + (H - T - B) * (1 - p / MAX)
  const cot = (W - L - R) / NGAY.length
  const rong = Math.min(26, cot - 8)

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200/80 shadow-[0_8px_24px_-12px_rgba(15,27,61,0.12)] sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
          <span aria-hidden>ⓘ</span> Dữ liệu mẫu, chỉ để minh họa cách theo dõi
        </p>
        <p className="text-sm text-slate-500">Kho cấp đông · 14 ngày gần nhất</p>
      </div>

      {/* Chỉ số tổng */}
      <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(
          [
            ['Nhập kho', `${so(tongNhap)} kg`, `Tồn đầu kỳ ${so(TON_DAU)} kg`],
            ['Xuất kho', `${so(tongXuat)} kg`, `${so(tongXuat / NGAY.length)} kg / ngày`],
            ['Hao hụt', `${so(tongHao)} kg`, `${((tongHao / tongNhap) * 100).toFixed(1).replace('.', ',')}% lượng nhập`],
            ['Tồn cuối kỳ', `${so(tonCuoi)} kg`, 'Đầu kỳ + nhập − xuất − hao hụt'],
          ] as const
        ).map(([nhan, giaTri, phu]) => (
          <div key={nhan} className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
            <dt className="text-xs font-semibold text-slate-500">{nhan}</dt>
            <dd className="mt-0.5 text-xl font-black tabular-nums text-[#0f1b3d] sm:text-2xl">{giaTri}</dd>
            <dd className="text-xs text-slate-500">{phu}</dd>
          </div>
        ))}
      </dl>

      {/* Biểu đồ hao hụt theo ngày */}
      <figure className="mt-6">
        <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-extrabold text-[#0f1b3d]">Tỷ lệ hao hụt theo ngày (%)</span>
          <span className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-0 w-5 border-t-2 border-dashed border-slate-400" /> Ngưỡng {NGUONG}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#d03b3b]" /> ⚠ Vượt ngưỡng ({vuot} ngày)
            </span>
          </span>
        </figcaption>

        {/* Điện thoại: giữ biểu đồ đủ rộng để đọc được chữ, vuốt ngang để xem hết */}
        <div className="-mx-5 mt-3 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div className="relative min-w-[560px]">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Tỷ lệ hao hụt 14 ngày, ${vuot} ngày vượt ngưỡng ${NGUONG}%`}>
            {[0, 1, 2, 3, 4].map((p) => (
              <g key={p}>
                <line x1={L} x2={W - R} y1={y(p)} y2={y(p)} stroke="#e2e8f0" strokeWidth={1} />
                <text x={L - 8} y={y(p) + 4} textAnchor="end" className="fill-slate-400 text-[11px] tabular-nums">
                  {p}
                </text>
              </g>
            ))}
            {NGAY.map(([ngay, , , p], i) => {
              const x = L + i * cot + (cot - rong) / 2
              const qua = p > NGUONG
              return (
                <g key={ngay}>
                  {/* Cột: bo tròn đầu trên, đáy phẳng trên trục */}
                  <path
                    d={`M${x},${y(0)} V${y(p) + 4} Q${x},${y(p)} ${x + 4},${y(p)} H${x + rong - 4} Q${x + rong},${y(p)} ${x + rong},${y(p) + 4} V${y(0)} Z`}
                    fill={qua ? '#d03b3b' : '#2563eb'}
                    opacity={chon === null || chon === i ? 1 : 0.45}
                    className="transition-opacity"
                  />
                  {qua && (
                    <text x={x + rong / 2} y={y(p) - 6} textAnchor="middle" className="fill-slate-700 text-[11px] font-bold">
                      ⚠ {p.toString().replace('.', ',')}
                    </text>
                  )}
                  {(i % 2 === 0 || i === NGAY.length - 1) && (
                    <text x={x + rong / 2} y={H - 8} textAnchor="middle" className="fill-slate-400 text-[10.5px]">
                      {ngay}
                    </text>
                  )}
                  {/* Vùng rê chuột rộng hơn cột */}
                  <rect
                    x={L + i * cot}
                    y={T}
                    width={cot}
                    height={H - T - B}
                    fill="transparent"
                    onMouseEnter={() => setChon(i)}
                    onMouseLeave={() => setChon(null)}
                    onClick={() => setChon(chon === i ? null : i)}
                  />
                </g>
              )
            })}
            <line x1={L} x2={W - R} y1={y(NGUONG)} y2={y(NGUONG)} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 4" pointerEvents="none" />
            <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="#cbd5e1" strokeWidth={1} />
          </svg>

          {chon !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 w-44 -translate-x-1/2 rounded-xl bg-[#0f1b3d] px-3 py-2 text-xs text-white shadow-xl"
              style={{ left: `${((L + chon * cot + cot / 2) / W) * 100}%` }}
            >
              <p className="font-bold">Ngày {NGAY[chon][0]}</p>
              <p className="mt-0.5 text-white/80">Nhập {so(NGAY[chon][1])} kg · Xuất {so(NGAY[chon][2])} kg</p>
              <p className="text-white/80">
                Hao hụt {so((NGAY[chon][1] * NGAY[chon][3]) / 100)} kg ({NGAY[chon][3].toString().replace('.', ',')}%)
                {NGAY[chon][3] > NGUONG && <b className="text-red-300"> · ⚠ vượt ngưỡng</b>}
              </p>
            </div>
          )}
        </div>
        </div>
        <p className="mt-1 text-xs text-slate-400 sm:hidden">Vuốt ngang để xem hết 14 ngày →</p>

        <details className="mt-2 text-sm">
          <summary className="cursor-pointer font-semibold text-blue-600">Xem dạng bảng theo ngày</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="text-slate-500">
                <tr>
                  {['Ngày', 'Nhập (kg)', 'Xuất (kg)', 'Hao hụt (%)'].map((c) => (
                    <th key={c} className="py-1.5 pr-4 font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NGAY.map(([ngay, n, x, p]) => (
                  <tr key={ngay} className="border-t border-slate-100">
                    <td className="py-1.5 pr-4">{ngay}</td>
                    <td className="pr-4">{so(n)}</td>
                    <td className="pr-4">{so(x)}</td>
                    <td className={p > NGUONG ? 'font-bold text-[#b42318]' : ''}>
                      {p.toString().replace('.', ',')}
                      {p > NGUONG && ' ⚠'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </figure>

      {/* Bảng theo lô */}
      <div className="mt-6">
        <p className="font-extrabold text-[#0f1b3d]">Theo dõi từng lô: nhập trái → múi thành phẩm</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm tabular-nums">
            <thead>
              <tr className="text-xs text-slate-500">
                {['Mã lô', 'Trái nhập (kg)', 'Thành phẩm (kg)', 'Thu hồi', 'Hao hụt', 'Trạng thái'].map((c, i) => (
                  <th key={c} className={`border-b border-slate-200 py-2 pr-3 font-semibold ${i === 1 || i === 2 ? 'hidden sm:table-cell' : ''}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LO.map(([ma, nhap, tp, hao]) => {
                const qua = hao > NGUONG
                return (
                  <tr key={ma} className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2.5 pr-3 font-mono text-xs font-semibold text-slate-700">{ma.replace('LO-', '')}</td>
                    <td className="hidden pr-3 sm:table-cell">{so(nhap)}</td>
                    <td className="hidden pr-3 sm:table-cell">{so(tp)}</td>
                    <td className="pr-3">{((tp / nhap) * 100).toFixed(1).replace('.', ',')}%</td>
                    <td className="pr-3">{hao.toString().replace('.', ',')}%</td>
                    <td>
                      {qua ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-[#b42318] ring-1 ring-red-200">
                          ⚠ Vượt ngưỡng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                          ✓ Đạt
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 rounded-xl border-l-4 border-blue-500 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <b>Cách tôi xử lý:</b> ngày hoặc lô nào vượt ngưỡng {NGUONG}% được đánh dấu ngay, tôi truy lại công đoạn gây hao hụt và báo cáo cấp trên kèm
          đề xuất trong ngày.
        </p>
      </div>
    </div>
  )
}
