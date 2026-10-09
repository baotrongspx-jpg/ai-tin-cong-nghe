import 'server-only'
import { z } from 'zod'
import { CauYTSchema, JSON_CAU_YT, LUAT_HINH, goiJson } from './ai'
import { CauPhimSchema, JSON_CAU_PHIM } from './aiPhim'

// Sửa kịch bản theo góp ý của hội đồng (lib/phanBien.ts) như một biên tập viên: chỉ sửa / xoá / chèn đúng những câu có
// vấn đề, giữ nguyên mọi câu khác (lời và chỉ dẫn hình ảnh) thay vì viết lại cả phần. Trả lời thoại mới + số chỗ đã đổi,
// hoặc null nếu AI không trả lời được hay không đổi gì.
export async function suaKichBan<C extends Record<string, unknown>>(o: {
  loi: C[]
  gopY: string
  nguCanh: string
  phim: boolean
}): Promise<{ loi: C[]; soCho: number } | null> {
  const cau = o.phim ? CauPhimSchema : CauYTSchema
  const jsonCau = o.phim ? JSON_CAU_PHIM : JSON_CAU_YT
  const SuaSchema = z.object({
    sua: z.array(z.object({ i: z.number().int(), cau })),
    xoa: z.array(z.number().int()),
    them: z.array(z.object({ sau: z.number().int(), cau })),
  })
  const mang = (items: unknown) => ({ type: 'array', items })
  const vat = (props: Record<string, unknown>) => ({ type: 'object', properties: props, required: Object.keys(props), additionalProperties: false })
  const kq = await goiJson({
    system: `You are the script editor of "Công Nghệ 24H", a Vietnamese YouTube channel making animated videos. The review board found problems in one part of a script. Fix exactly those problems with the SMALLEST set of changes: rewrite only the lines that cause a problem, delete a line only when it is padding or repeats another, and insert a new line only when something the board asks for is missing. Every line you do not list stays exactly as it is, so never return unchanged lines. Keep the story order, the facts (never invent events, numbers or quotes), the speakers' personalities and proper Vietnamese with full diacritics. A rewritten or new line is a complete line object with all fields; keep the visual fields of a rewritten line unless the problem is about them. Rules for the fields:
${LUAT_HINH}
Return: sua = lines to rewrite (i = index of the line, cau = the new line); xoa = indexes of lines to delete; them = new lines to insert (sau = index of the line they go after, -1 for the very start, cau = the new line). Indexes always refer to the ORIGINAL numbering.`,
    noiDung: `<context>\n${o.nguCanh.slice(0, 3000)}\n</context>\n\n<script>\n${o.loi.map((l, i) => `${i}. ${JSON.stringify(l)}`).join('\n')}\n</script>\n\n<review_board_feedback>\n${o.gopY}\n</review_board_feedback>`,
    kiemTra: SuaSchema,
    schema: vat({ sua: mang(vat({ i: { type: 'integer' }, cau: jsonCau })), xoa: mang({ type: 'integer' }), them: mang(vat({ sau: { type: 'integer' }, cau: jsonCau })) }),
    effort: 'medium',
  })
  if (!kq) return null
  const n = o.loi.length
  const sua = new Map(kq.sua.filter((s) => s.i >= 0 && s.i < n).map((s) => [s.i, s.cau]))
  const xoa = new Set(kq.xoa.filter((i) => i >= 0 && i < n && !sua.has(i)))
  const them = kq.them.filter((t) => t.sau >= -1 && t.sau < n)
  const sau = (i: number) => them.filter((t) => t.sau === i).map((t) => t.cau as unknown as C)
  const loi: C[] = [...sau(-1)]
  o.loi.forEach((l, i) => {
    // Câu sửa giữ các trường riêng của câu cũ mà AI không trả (ảnh Wikipedia đã gắn, đánh dấu tên chương…)
    if (!xoa.has(i)) loi.push(sua.has(i) ? ({ ...l, ...sua.get(i) } as C) : l)
    loi.push(...sau(i))
  })
  const soCho = sua.size + xoa.size + them.length
  return soCho && loi.length >= 4 ? { loi, soCho } : null
}
