'use client'

// Dải màu cả phim (color script, chủ trang 16/10/2026): mỗi câu một ô màu theo ánh sáng máy dựng sẽ phủ (khớp ANH_SANG
// trong may-nha/hoat-hinh/tao_video.mjs), rộng theo độ dài câu, vạch ngăn giữa các cảnh, dải mảnh bên dưới là cảm xúc.
// Nhìn một lượt thấy nhịp màu / cảm xúc cả phim, và máy tự chỉ ra chỗ đáng xem lại: chương một màu suốt, màu nhảy
// đột ngột giữa cùng một cảnh, màu ngược cảm xúc của câu.
import { useMemo } from 'react'
import type { DuAnYT } from '@/lib/youtube'
import { TEN_DEN, TEN_CAM_XUC } from '@/lib/bocTach'
import { anhSangMuot, SANG, TOI } from '@/may-nha/hoat-hinh/anhSang.mjs'

const MAU_DEN: Record<string, string> = {
  binh_thuong: '#94a3b8', am_ap: '#fb923c', lanh: '#3b82f6', cang_thang: '#1e1b4b', tuoi_sang: '#fde047',
  mo_mong: '#c084fc', bi_an: '#4c1d95', canh_bao: '#dc2626', loe_sang: '#f8fafc',
}
const MAU_CAM: Record<string, string> = {
  to_mo: '#38bdf8', giai_thich: '#94a3b8', khang_dinh: '#2563eb', vui: '#facc15', buon: '#475569',
  bat_ngo: '#f472b6', lo_lang: '#a855f7', tuc_gian: '#ef4444', suy_nghi: '#14b8a6',
}
const NGUOC: Record<string, Set<string>> = { buon: SANG, vui: TOI, tuc_gian: new Set(['tuoi_sang', 'mo_mong']) }

export default function DaiMauPhim({ d }: { d: DuAnYT }) {
  const chuong = useMemo(
    () =>
      d.phan.map((p, j) => {
        const loi = p.loi ?? []
        const noi = (i: number) => `${loi[i]?.dia_diem ?? ''}|${loi[i]?.boi_canh ?? ''}`
        // Màu thật sự lên phim: máy dựng làm mượt theo cảnh (anhSang.mjs) — câu bị kéo về tông cảnh có dấu chấm
        const muot: string[] = anhSangMuot(loi)
        const o = loi.map((l, i) => ({
          i,
          den: MAU_DEN[muot[i]] ? muot[i] : 'binh_thuong',
          sua: muot[i] !== (MAU_DEN[l.anh_sang ?? ''] ? l.anh_sang : 'binh_thuong'),
          cam: l.cam_xuc ?? '',
          giay: Math.max(2, l.chu.length / 14),
          canhMoi: i > 0 && noi(i) !== noi(i - 1),
          chu: l.chu,
        }))
        const canhBao: string[] = []
        const dem = new Map<string, number>()
        for (const x of o) dem.set(x.den, (dem.get(x.den) ?? 0) + 1)
        const nhieuNhat = [...dem.entries()].sort((a, b) => b[1] - a[1])[0]
        if (o.length >= 6 && nhieuNhat && nhieuNhat[1] / o.length > 0.85)
          canhBao.push(`Gần như cả chương một màu (${TEN_DEN[nhieuNhat[0]] ?? nhieuNhat[0]}) — nhịp hình dễ đều đều`)
        for (const x of o.slice(1)) {
          const t = o[x.i - 1]
          if (!x.canhMoi && ((SANG.has(t.den) && TOI.has(x.den)) || (TOI.has(t.den) && SANG.has(x.den))))
            canhBao.push(`Câu ${x.i + 1}: màu nhảy từ ${TEN_DEN[t.den]} sang ${TEN_DEN[x.den]} giữa cùng một cảnh`)
        }
        for (const x of o) if (NGUOC[x.cam]?.has(x.den)) canhBao.push(`Câu ${x.i + 1}: ánh sáng ${TEN_DEN[x.den]} ngược cảm xúc ${TEN_CAM_XUC[x.cam] ?? x.cam}`)
        return { k: j + 1, tieu_de: p.tieu_de, o, canhBao, co: !!p.loi }
      }),
    [d],
  )
  if (!chuong.some((c) => c.co)) return null
  const tongCanhBao = chuong.reduce((s, c) => s + c.canhBao.length, 0)
  const tenChuong = d.loai === 'tieu_su' ? 'Chương' : 'Phần'
  return (
    <details className="the p-5">
      <summary className="cursor-pointer font-bold">
        🎨 Dải màu cả phim (color script){' '}
        <span className={`text-sm font-normal ${tongCanhBao ? 'text-amber-700' : 'text-emerald-700'}`}>
          — {tongCanhBao ? `${tongCanhBao} chỗ nên xem lại` : 'màu và cảm xúc liền mạch'}
        </span>
      </summary>
      <p className="mt-1 text-xs text-slate-600">
        Mỗi ô là một câu, màu là ánh sáng máy dựng sẽ phủ lên cảnh, rộng theo độ dài câu; vạch trắng là chỗ đổi cảnh; dải mảnh bên dưới là cảm xúc. Máy tự giữ một tông chủ đạo cho mỗi cảnh — ô có chấm trắng là câu AI chọn màu nhảy sáng ↔ tối, máy đã kéo về tông của cảnh. Rê chuột lên ô để xem câu.
      </p>
      <div className="mt-3 grid gap-3">
        {chuong.map((c) =>
          !c.co ? null : (
            <div key={c.k} className="grid gap-1">
              <p className="text-xs font-semibold text-slate-700">
                {tenChuong} {c.k}: {c.tieu_de}
              </p>
              <div className="flex h-10 overflow-hidden rounded ring-1 ring-slate-300">
                {c.o.map((x) => (
                  <div
                    key={x.i}
                    title={`Câu ${x.i + 1} — ${TEN_DEN[x.den] ?? x.den}${x.sua ? ' (máy đã kéo về tông của cảnh)' : ''}, ${TEN_CAM_XUC[x.cam] ?? x.cam}\n${x.chu}`}
                    className={`flex flex-col ${x.canhMoi ? 'border-l-2 border-white' : ''}`}
                    style={{ flexGrow: x.giay, flexBasis: 0 }}
                  >
                    <div className="flex flex-1 items-center justify-center" style={{ background: MAU_DEN[x.den] }}>
                      {x.sua && <span className="h-1.5 w-1.5 rounded-full bg-white ring-1 ring-slate-500" />}
                    </div>
                    <div className="h-2" style={{ background: MAU_CAM[x.cam] ?? '#e2e8f0' }} />
                  </div>
                ))}
              </div>
              {c.canhBao.length > 0 && (
                <ul className="list-disc pl-5 text-xs text-amber-800">
                  {c.canhBao.slice(0, 6).map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                  {c.canhBao.length > 6 && <li>… và {c.canhBao.length - 6} chỗ khác</li>}
                </ul>
              )}
            </div>
          ),
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
        {Object.entries(MAU_DEN).map(([k, m]) => (
          <span key={k} className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm ring-1 ring-slate-300" style={{ background: m }} />
            {TEN_DEN[k]}
          </span>
        ))}
      </div>
    </details>
  )
}
