'use client'

// Bảng nhân vật (model sheet, chủ trang 16/10/2026: "nhân vật nhìn từ nhiều góc — trước, ¾, nghiêng, sau"): mỗi giai
// đoạn tuổi một hàng — 4 góc nhìn và 4 nét mặt, vẽ bằng đúng bộ vẽ của máy dựng (may-nha/hoat-hinh/nhanVatPhu.mjs) nên
// thấy sao thì lên phim vậy. Xem trước khi dựng: sai tóc, áo, màu… thì bấm Thiết kế lại, rẻ hơn sửa sau khi đã dựng.
import { useMemo } from 'react'
import { nhanVatChinhSvg, cssGocNhin } from '@/may-nha/hoat-hinh/nhanVatPhu.mjs'
import type { TaoHinh } from '@/lib/aiPhim'

const GOC = [
  ['thang', 'Trước'],
  ['ba_tu', '¾'],
  ['nghieng', 'Nghiêng'],
  ['sau', 'Sau lưng'],
] as const
// Nét mặt: bật các lớp biểu cảm máy dựng dùng theo cảm xúc của câu
const NET = [
  ['vui', 'Vui', ['ma-hong', 'mieng-mo'], ['mieng-dong']],
  ['buon', 'Buồn', ['nuoc-mat'], []],
  ['lo', 'Lo lắng', ['mo-hoi'], []],
  ['gian', 'Tức giận', ['gian'], []],
] as const

// Bảng tư thế: dùng khớp khuỷu / gối như máy dựng (tao_video.mjs: buocChan, thuThe, ngoi_thien) — [góc, {bộ phận: độ}, hạ người]
const KHOP: Record<string, string> = {
  'tay-phai': '270px 300px', 'tay-trai': '130px 300px', 'cang-phai': '280px 372px', 'cang-trai': '120px 372px',
  'chan-trai': '174px 470px', 'chan-phai': '226px 470px', 'ong-trai': '174px 512px', 'ong-phai': '226px 512px',
}
const TU_THE: [string, string, 'thang' | 'nghieng', Record<string, number>, number][] = [
  ['buoc', 'Bước đi', 'nghieng', { 'chan-trai': 20, 'chan-phai': -20, 'ong-phai': -28, 'tay-phai': -16, 'tay-trai': 16, 'cang-phai': 28, 'cang-trai': 28 }, 0],
  ['chay', 'Chạy', 'nghieng', { 'chan-trai': 34, 'chan-phai': -34, 'ong-trai': -10, 'ong-phai': -64, 'tay-phai': -40, 'tay-trai': 40, 'cang-phai': 80, 'cang-trai': 80 }, -8],
  ['thu', 'Thế thủ', 'thang', { 'tay-phai': -25, 'cang-phai': 160, 'tay-trai': 25, 'cang-trai': -160 }, 0],
  ['ngoi', 'Ngồi xếp chân', 'thang', { 'chan-trai': 80, 'chan-phai': -80, 'ong-trai': -100, 'ong-phai': 100, 'tay-phai': 28, 'tay-trai': -28, 'cang-phai': 40, 'cang-trai': -40 }, 62],
]
const cssTuThe = (id: string, xoay: Record<string, number>) =>
  Object.entries(xoay).map(([bp, d]) => `#${id}-${bp}{transform-box:view-box;transform-origin:${KHOP[bp]};transform:rotate(${d}deg)}`).join('')

function Hinh({ svg, viewBox, id, css, nhan }: { svg: (id: string) => string; viewBox: string; id: string; css: string; nhan: string }) {
  return (
    <figure className="grid justify-items-center gap-1">
      <style>{css}</style>
      <svg viewBox={viewBox} className="h-40 w-28" dangerouslySetInnerHTML={{ __html: svg(id) }} />
      <figcaption className="text-xs font-semibold text-slate-500">{nhan}</figcaption>
    </figure>
  )
}

export default function BangNhanVat({ th }: { th: TaoHinh }) {
  const hang = useMemo(
    () =>
      [...th.giai_doan]
        .sort((a, b) => a.tu_chuong - b.tu_chuong)
        .map((gd, i) => ({ gd, v: nhanVatChinhSvg({ nhom: th.nhom ?? 'khac', gioi: th.gioi, da: th.da, ...gd, phu: true }), i })),
    [th],
  )
  return (
    <details className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <summary className="cursor-pointer text-sm font-semibold">🧍 Bảng nhân vật: 4 góc nhìn, nét mặt, tư thế</summary>
      <p className="mt-1 text-xs text-slate-600">
        Vẽ bằng đúng bộ vẽ của máy dựng. Trên phim, nhân vật quay nghiêng khi bước vào, đổi chỗ, đi bộ, chạy, rời đi; quay ¾ khi buồn hay suy nghĩ.
      </p>
      <div className="mt-2 grid gap-3">
        {hang.map(({ gd, v, i }) => (
          <div key={i} className="grid gap-1">
            <p className="text-xs font-bold text-amber-800">Từ chương {gd.tu_chuong}: {gd.mo_ta}</p>
            <div className="flex flex-wrap gap-2 rounded bg-white p-2 ring-1 ring-slate-200">
              {GOC.map(([g, nhan]) => (
                <Hinh key={g} svg={v.svg} viewBox={v.viewBox} id={`bnv${i}-${g}`} css={cssGocNhin(`bnv${i}-${g}`, g)} nhan={nhan} />
              ))}
              <span className="mx-1 w-px self-stretch bg-slate-200" />
              {NET.map(([m, nhan, bat, tat]) => {
                const id = `bnv${i}-n-${m}`
                const css = [...bat.map((b) => `#${id}-${b}{opacity:1}`), ...tat.map((b) => `#${id}-${b}{opacity:0}`)].join('')
                return <Hinh key={m} svg={v.svg} viewBox={v.viewBox} id={id} css={css} nhan={nhan} />
              })}
              <span className="mx-1 w-px self-stretch bg-slate-200" />
              {TU_THE.map(([m, nhan, goc, xoay, ha]) => {
                const id = `bnv${i}-t-${m}`
                return (
                  <Hinh
                    key={m}
                    svg={(x) => `<g transform="translate(0 ${ha})">${v.svg(x)}</g>`}
                    viewBox={v.viewBox}
                    id={id}
                    css={cssGocNhin(id, goc) + cssTuThe(id, xoay)}
                    nhan={nhan}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}
