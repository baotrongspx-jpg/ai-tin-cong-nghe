import 'server-only'
import { z } from 'zod'
import { goiJson, gopYPhanBien } from './ai'

// Hội đồng kiểm duyệt & phản biện (như hội đồng duyệt của đài truyền hình): sau mỗi khâu AI làm xong (dàn ý, nghiên
// cứu, câu chuyện, tạo hình, kịch bản từng chương, hồ sơ, phân cảnh, đóng gói), một AI khác đóng vai hội đồng chấm
// theo tiêu chí riêng của khâu đó và theo kỳ vọng của khán giả. Điểm thấp thì khâu đó làm lại MỘT lần, kèm góp ý cụ
// thể của hội đồng (ai.ts: gopYPhanBien), rồi hội đồng chấm lại. Hội đồng dùng Gemini bản nhẹ trước cho đỡ tốn lượt.

export type KhauPhanBien = 'dan_y' | 'nghien_cuu' | 'cau_chuyen' | 'tao_hinh' | 'kich_ban' | 'ho_so' | 'phan_canh' | 'dong_goi'
// Đã làm lại (lan 2): diem_dau = điểm bản đầu; giu = bản đang dùng: 'moi' (bản làm lại, diem là điểm chấm lại), 'cu' (bản làm lại
// bị chấm thấp hơn nên giữ bản đầu), 'moi_chua_cham' (dùng bản làm lại nhưng hội đồng không chấm lại được, diem là điểm bản đầu)
export type KetQuaPhanBien = { diem: number; dat: boolean; van_de: string[]; goi_y: string; lan: number; luc: string; diem_dau?: number; giu?: 'moi' | 'cu' | 'moi_chua_cham' }

export const TEN_KHAU: Record<KhauPhanBien, string> = {
  dan_y: 'Dàn ý video',
  nghien_cuu: 'Nghiên cứu tư liệu',
  cau_chuyen: 'Phát triển câu chuyện',
  tao_hinh: 'Thiết kế nhân vật chính và phụ',
  kich_ban: 'Kịch bản',
  ho_so: 'Hồ sơ hình ảnh',
  phan_canh: 'Phân cảnh',
  dong_goi: 'Đóng gói YouTube',
}

const TIEU_CHI: Record<KhauPhanBien, string> = {
  dan_y: `- The parts tell ONE clear story from start to end, each part with its own purpose and a reason to keep watching.
- Covers the source faithfully (no invented facts), most surprising point placed early, ending pays off the opening question.
- Length and number of parts fit the target duration; no padding parts.`,
  nghien_cuu: `- It is about the RIGHT person (name, era, country consistent everywhere).
- Enough concrete material for a full film: key life stages, dates, places, people around them, turning points, failures, achievements.
- Each fact correctly labelled (verified / reported / disputed); nothing obviously invented; disputed points flagged.`,
  cau_chuyen: `- A strong hook that makes a stranger want to watch; a clear big idea viewers will remember.
- Emotional curve across chapters (rise, fall, turning point, climax, payoff); each chapter distinct, no repetition.
- Open loops between chapters; faithful to the research; fits the duration; title intriguing but truthful.`,
  tao_hinh: `- Matches the real person's era, culture, gender, age stages and the group they belong to (royalty, general, scientist…).
- Signature traits recognisable at a glance; costumes historically plausible; no modern clothing in ancient times; respectful.
- When there is a supporting cast (vai_phu): every important supporting person of the story is there, each looks right for their role, age, gender and era, and they are easy to tell apart from each other and from the protagonist.`,
  kich_ban: `- Hook / opening grabs attention; every line adds something (fact, scene, emotion, question); no padding, no repetition.
- Faithful to the research: no invented events, numbers or quotes; reconstructions labelled.
- Engaging for a general Vietnamese audience: natural spoken Vietnamese with full diacritics, varied rhythm (short punchy lines and longer ones), emotional moments, the protagonist's own voice at key turns.
- Mèo Mun / Robot Bit add value (not a repetitive question-answer machine); no greetings, goodbyes or "next chapter" teasers in the middle of the film.
- Visual direction fits the era and place (period cast and backdrops for old stories, action scenes at big moments), the chapter ends on suspense inside the story.`,
  ho_so: `- Characters, places and design are consistent with the research and the era; colour / music choices support each life stage.`,
  phan_canh: `- Every scene follows the script, shots are varied and purposeful, continuity of characters and places is kept, prompts are concrete.`,
  dong_goi: `- Titles are curiosity-driven but truthful (no false clickbait), fit 100 characters, include searchable keywords.
- Thumbnail concepts are bold and readable at small size; description and tags are accurate and useful; Shorts ideas are self-contained.`,
}

const PhanBienSchema = z.object({ diem: z.number().min(0).max(10), van_de: z.array(z.string()), goi_y: z.string() })
const JSON_PHAN_BIEN = {
  type: 'object',
  properties: { diem: { type: 'number' }, van_de: { type: 'array', items: { type: 'string' } }, goi_y: { type: 'string' } },
  required: ['diem', 'van_de', 'goi_y'],
}

// Hội đồng chấm một kết quả. nguCanh: phim gì, cho ai; ketQua: nội dung cần chấm (chữ, đã rút gọn)
export async function phanBien(khau: KhauPhanBien, nguCanh: string, ketQua: string): Promise<Omit<KetQuaPhanBien, 'lan' | 'luc'> | null> {
  const kq = await goiJson({
    system: `You are the review board ("hội đồng kiểm duyệt và phản biện") of "Công Nghệ 24H", a Vietnamese YouTube channel that makes animated documentary videos for a broad Vietnamese audience (teenagers to adults) who expect: true facts, a gripping story, emotion, humour where it fits, and a professional look. You review the output of ONE production stage: ${TEN_KHAU[khau]}.
Judge it strictly but fairly against these criteria and against what that audience expects:
${TIEU_CHI[khau]}
Return: diem = a score from 0 to 10 (7 or more means good enough to publish, below 6 means it must be redone); van_de = at most 5 concrete problems you found, each one short sentence in Vietnamese with diacritics (empty list if none); goi_y = one concrete instruction in Vietnamese telling the author exactly what to change (empty string if nothing).`,
    noiDung: `<context>\n${nguCanh.slice(0, 3000)}\n</context>\n\n<output_to_review>\n${ketQua.slice(0, 24000)}\n</output_to_review>`,
    kiemTra: PhanBienSchema,
    schema: JSON_PHAN_BIEN,
    effort: 'low',
    moHinh: ['gemini-flash-lite-latest', 'gemini-flash-latest'],
  })
  if (!kq) return null
  return { diem: Math.round(kq.diem * 10) / 10, dat: kq.diem >= 7, van_de: kq.van_de.slice(0, 5), goi_y: kq.goi_y }
}

export const chuGopY = (pb: { van_de: string[]; goi_y: string }) => [...pb.van_de.map((v) => `- ${v}`), pb.goi_y && `→ ${pb.goi_y}`].filter(Boolean).join('\n')

// Chạy một khâu có hội đồng: làm → chấm → (điểm < 6 và còn thời gian) làm lại kèm góp ý → chấm lại.
// o.sua: sửa đúng chỗ hội đồng chê trên bản đầu (kịch bản: lib/suaKichBan.ts) thay vì làm lại từ đầu.
// Hội đồng không trả lời được (hết lượt…) thì giữ kết quả, không chặn quy trình.
export async function voiPhanBien<T>(
  khau: KhauPhanBien,
  nguCanh: string,
  lam: () => Promise<T | null>,
  tomTat: (kq: T) => string,
  o: { conGiay?: number; sua?: (kq: T, gopY: string) => Promise<T | null> } = {},
): Promise<{ kq: T | null; pb: KetQuaPhanBien | null }> {
  const batDau = Date.now()
  const kq = await lam()
  if (!kq) return { kq, pb: null }
  const pb = await phanBien(khau, nguCanh, tomTat(kq)).catch(() => null)
  if (!pb) return { kq, pb: null }
  const daDung = (Date.now() - batDau) / 1000
  // Chỉ làm lại khi điểm dưới 6 và còn đủ thời gian (máy chủ cho tối đa 300 giây mỗi lượt)
  if (pb.diem >= 6 || daDung > (o.conGiay ?? 110)) return { kq, pb: { ...pb, lan: 1, luc: new Date().toISOString() } }
  const gopY = chuGopY(pb)
  const kq2 = o.sua ? await o.sua(kq, gopY).catch(() => null) : await gopYPhanBien.run(gopY, lam)
  if (!kq2) return { kq, pb: { ...pb, lan: 1, luc: new Date().toISOString() } }
  const pb2 = await phanBien(khau, nguCanh, tomTat(kq2)).catch(() => null)
  // Bản làm lại chỉ được nhận nếu hội đồng không chấm thấp hơn bản đầu
  const luc = new Date().toISOString()
  if (pb2 && pb2.diem < pb.diem) return { kq, pb: { ...pb, lan: 2, luc, diem_dau: pb.diem, giu: 'cu' } }
  return { kq: kq2, pb: { ...(pb2 ?? pb), lan: 2, luc, diem_dau: pb.diem, giu: pb2 ? 'moi' : 'moi_chua_cham' } }
}
