import 'server-only'
import { GIONG, GIONG_DU_PHONG } from './dsGiong'

// Giọng chính: VieNeu-TTS chạy trên Hugging Face Spaces (thư mục hf-space/), miễn phí, không giới hạn lượt.
// VIENEU_URL: link Space (https://<tên>-<space>.hf.space), VIENEU_KHOA: khóa đặt ở mục Secrets của Space.
export const coVieNeu = () => !!process.env.VIENEU_URL?.trim()

// Đọc từng câu, trả WAV 48 kHz và thời lượng (giây) mỗi câu để canh phụ đề. Space ngủ (lâu không dùng) thì
// lần gọi đầu phải chờ nó khởi động: thử lại vài lần trong khoảng 2 phút.
export async function docBangVieNeu(cau: string[]): Promise<{ wav: Buffer; doDai: number[] }> {
  const url = process.env.VIENEU_URL!.trim().replace(/\/+$/, '')
  const hetGio = Date.now() + 120_000
  for (;;) {
    const res = await fetch(`${url}/doc`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.VIENEU_KHOA?.trim() ?? ''}` },
      body: JSON.stringify({ cau, giong: GIONG }),
      signal: AbortSignal.timeout(240_000),
      cache: 'no-store',
    }).catch((e: Error) => e)
    if (res instanceof Response && res.ok) {
      const doDai = (res.headers.get('x-do-dai') ?? '').split(',').map(Number)
      if (doDai.length !== cau.length || doDai.some((x) => !(x > 0))) throw new Error('VieNeu trả thời lượng không khớp số câu')
      return { wav: Buffer.from(await res.arrayBuffer()), doDai }
    }
    const dangKhoiDong = !(res instanceof Response) || res.status === 503 || res.status === 502 || res.status === 404
    if (!dangKhoiDong || Date.now() > hetGio)
      throw new Error(`VieNeu lỗi: ${res instanceof Response ? `${res.status} ${(await res.text()).slice(0, 200)}` : res.message}`)
    await new Promise((r) => setTimeout(r, 10_000))
  }
}

// Giọng dự phòng: Gemini TTS (dùng chung GEMINI_API_KEY). Trả về WAV 24 kHz, mono, 16-bit.
const MODEL = () => process.env.GEMINI_TTS_MODEL?.trim() || 'gemini-3.8-flash-lite-tts'

// Tìm chuỗi base64 âm thanh trong kết quả (cấu trúc trả về có thể khác nhau giữa các phiên bản API)
function timAmThanh(x: unknown): string | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const mime = String(o.mime_type ?? o.mimeType ?? '')
  if (typeof o.data === 'string' && o.data.length > 100 && (!mime || mime.startsWith('audio'))) return o.data
  for (const v of Object.values(o)) {
    const kq = Array.isArray(v) ? v.map(timAmThanh).find(Boolean) : timAmThanh(v)
    if (kq) return kq
  }
  return null
}

// PCM 16-bit thô → WAV
function bocWav(pcm: Buffer) {
  const h = Buffer.alloc(44)
  h.write('RIFF', 0)
  h.writeUInt32LE(36 + pcm.length, 4)
  h.write('WAVEfmt ', 8)
  h.writeUInt32LE(16, 16)
  h.writeUInt16LE(1, 20)
  h.writeUInt16LE(1, 22)
  h.writeUInt32LE(24000, 24)
  h.writeUInt32LE(48000, 28)
  h.writeUInt16LE(2, 32)
  h.writeUInt16LE(16, 34)
  h.write('data', 36)
  h.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([h, pcm])
}

// Gói miễn phí giới hạn 3 lần đọc mỗi phút và 10 lần mỗi ngày. Chạm giới hạn theo phút (429) thì chờ theo lời Gemini báo
// (tối đa 60 giây) rồi thử lại một lần; hết lượt trong ngày thì báo lỗi dễ hiểu.
export async function docThanhGiong(chu: string, thuLai = true): Promise<Buffer> {
  const khoa = process.env.GEMINI_API_KEY?.trim()
  if (!khoa) throw new Error('Chưa cài GEMINI_API_KEY nên không lồng tiếng được')
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': khoa },
    body: JSON.stringify({
      model: MODEL(),
      input: [{ type: 'user_input', content: [{ type: 'text', text: chu }] }],
      response_format: { type: 'audio' },
      generation_config: { speech_config: [{ voice: GIONG_DU_PHONG }] },
    }),
    signal: AbortSignal.timeout(90_000),
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  const loi = String(json.error?.message ?? '')
  if (res.status === 429 && /per day/i.test(loi))
    throw new Error('Gemini đã hết lượt đọc hôm nay (gói miễn phí 10 lần/ngày). Thử lại ngày mai hoặc nâng gói Gemini.')
  if (res.status === 429 && thuLai) {
    // "retry in 39s" thì chờ rồi thử lại; dạng "17h48m47s" (chờ lâu) thì báo lỗi luôn
    const giay = Number(loi.match(/retry in ([\d.]+)s\b/i)?.[1] ?? Infinity)
    if (giay <= 60) {
      await new Promise((r) => setTimeout(r, (giay + 1) * 1000))
      return docThanhGiong(chu, false)
    }
  }
  if (!res.ok) throw new Error(`Giọng đọc Gemini lỗi: ${json.error?.message ?? res.status}`)
  const b64 = timAmThanh(json)
  if (!b64) throw new Error('Giọng đọc Gemini không trả âm thanh')
  const du = Buffer.from(b64, 'base64')
  return du.subarray(0, 4).toString() === 'RIFF' ? du : bocWav(du)
}
