import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

// Trang /phuc-dung: AI xem khung hình từng đoạn 8 giây và viết bộ nhận dạng + kịch bản từng cảnh.
// Giống lib/troLyCV.ts: có GEMINI_API_KEY → dùng Gemini (miễn phí), không có → dùng Claude.
const MODEL_CLAUDE = 'claude-opus-5-5'
const MODEL_GEMINI = (process.env.GEMINI_MODELS ?? 'gemini-flash-latest,gemini-2.5-flash,gemini-flash-lite-latest')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean)

export type AnhDoan = { ten: string; doan: number; giay: number; jpg: string }

const SYSTEM = `You help a Vietnamese video maker rebuild a video with Google Veo 3, one 8-second shot at a time.
You receive frames from the original video. Each frame is labelled like "doan_003_giua" (segment 3, middle frame) with its time.
Segments are 8 seconds long; for each segment you get its first (dau), middle (giua) and last (cuoi) frame.

Write a JSON object with exactly this shape:
{
  "nhan_dang": {
    "phong_cach": "one English sentence: overall visual style, lens look, colour grading, lighting, aspect ratio",
    "am_thanh": "one English sentence: sound design for every shot (ambient sounds; say if there is no music)",
    "nhan_vat": [ { "ma": "A", "ten": "short Vietnamese label", "mo_ta": "English description", "anh_mau": "doan_XXX_yyy" } ],
    "boi_canh": [ { "ma": "B1", "ten": "...", "mo_ta": "...", "anh_mau": "doan_XXX_yyy" } ],
    "do_vat":   [ { "ma": "X1", "ten": "...", "mo_ta": "...", "anh_mau": "doan_XXX_yyy" } ]
  },
  "canh": [
    { "ten": "short Vietnamese title", "doan_goc": [3], "boi_canh": "B1", "nhan_vat": ["A"], "do_vat": ["X1"],
      "hanh_dong": "English: starts as in the segment's first frame (dau), says what happens, ends as in its last frame (cuoi)",
      "may_quay": "English: shot size, angle and camera movement", "noi_tiep": true }
  ]
}

Rules:
- The descriptions in nhan_dang are pasted word for word into EVERY shot prompt, so make them complete and fixed:
  for people give gender, approximate age, build, hair, facial hair, every clothing item with colour; for objects and
  vehicles give type, colour, shape, distinctive parts; for places give terrain, weather, time of day, light.
- Describe people only by appearance and clothing. Never name or identify real people, never ask to copy a real face.
- Never mention brand names, logos, licence plates or written text; describe products by shape and colour instead.
- One entry in "canh" per segment you were given, in time order. "doan_goc" is that segment number.
- Each shot is generated from that segment's first frame (dau) and last frame (cuoi). Write "hanh_dong" as:
  "Starts with <who is where, doing what, as in the first frame>. <what happens>. Ends with <who is where, in what pose,
  as in the last frame>." so the motion clearly goes from the first frame to the last frame.
- "noi_tiep": true when the shot directly continues the previous one (same moment), false after a cut to a new moment/place.
- "anh_mau": the label of the frame that shows that character / place / object most clearly, or "" if none.
- Reuse the same codes across shots; only create a new character/place/object when it really is different.
- Output only the JSON object, no markdown.`

function noiDungChu(anh: AnhDoan[], ghiChu: string, ndCu: string) {
  return (
    `Frames: ${anh.map((a) => `${a.ten} (${a.giay.toFixed(1)}s)`).join(', ')}.` +
    (ndCu
      ? '\n\nThis is a CONTINUATION: earlier shots of the same video were already generated with this nhan_dang:\n' +
        ndCu +
        '\nCopy it UNCHANGED into your output nhan_dang (same codes, same wording, same anh_mau, same phong_cach and am_thanh). ' +
        'Reuse its codes whenever the same character, place or object appears. Add a new entry (with a new code) only for ' +
        'something that is not in it. Write "canh" only for the segments in these frames.'
      : '') +
    (ghiChu ? `\nNote from the video maker (Vietnamese): ${ghiChu}` : '')
  )
}

// ndCu: bộ nhận dạng (JSON) của các cảnh đã làm khi "làm tiếp" đợt sau, để AI giữ nguyên
export async function vietKichBan(anh: AnhDoan[], ghiChu: string, ndCu = ''): Promise<unknown> {
  const chu = noiDungChu(anh, ghiChu, ndCu)
  const text = process.env.GEMINI_API_KEY ? await hoiGemini(anh, chu) : await hoiClaude(anh, chu)
  if (!text) return null
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

async function hoiGemini(anh: AnhDoan[], chu: string): Promise<string | null> {
  const parts = anh.flatMap((a) => [{ text: a.ten }, { inline_data: { mime_type: 'image/jpeg', data: a.jpg } }])
  for (const model of MODEL_GEMINI) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [...parts, { text: chu }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(120_000),
    }).catch(() => null)
    if (!res) continue
    const data = (await res.json().catch(() => ({}))) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim()
    if (res.ok && text) return text
    // Quá tải / hết lượt → thử model kế tiếp
  }
  return null
}

let client: Anthropic | null = null

async function hoiClaude(anh: AnhDoan[], chu: string): Promise<string | null> {
  client ??= new Anthropic()
  const res = await client.messages.create({
    model: MODEL_CLAUDE,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          ...anh.flatMap((a) => [
            { type: 'text' as const, text: a.ten },
            { type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: a.jpg } },
          ]),
          { type: 'text' as const, text: chu },
        ],
      },
    ],
  })
  if (res.stop_reason === 'refusal') return null
  return res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim() || null
}
