import 'server-only'
import { randomUUID } from 'node:crypto'
import { db } from './db'
import { GIONG, GIONG_DU_PHONG } from './dsGiong'

// Giọng chính: VieNeu-TTS (giọng Hải Đăng), miễn phí, không giới hạn lượt. Hai cách chạy:
// - Mặc định: "thợ đọc giọng" trên máy nhà (may-nha/tho_doc.py) tự lấy phiếu việc trong kho Supabase, không cần mở cổng.
// - VIENEU_CHE_DO=url: gọi thẳng máy chủ hf-space/ ở VIENEU_URL (Hugging Face Spaces, ngrok...) kèm khóa VIENEU_KHOA.
// VIENEU_TAT=1: tắt hẳn VieNeu, chỉ đọc bằng giọng dự phòng.
export const coVieNeu = () => process.env.VIENEU_TAT !== '1'
const quaUrl = () => process.env.VIENEU_CHE_DO === 'url' && !!process.env.VIENEU_URL?.trim()

export const docBangVieNeu = (cau: string[]) => (quaUrl() ? docQuaUrl(cau) : docQuaMayNha(cau))

// Phiếu việc cho thợ đọc giọng ở máy nhà, cùng kho với video (lib/video.ts)
const HANG_DOI = 'hang-doi'
const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Thợ ở máy nhà cứ 20 giây báo một lần; quá 90 giây không báo coi như máy nhà đang tắt. Trả lý do khi tắt, null khi đang chạy.
export async function mayNhaTat(): Promise<string | null> {
  const { data: song } = await db().storage.from('video-tiktok').download(`${HANG_DOI}/song.json`)
  const luc = song ? Number(JSON.parse(await song.text()).luc) || 0 : 0
  if (Date.now() - luc <= 90_000) return null
  return luc
    ? `Máy nhà đang tắt hoặc máy đọc giọng không chạy (báo lần cuối ${Math.round((Date.now() - luc) / 60_000)} phút trước)`
    : 'Máy đọc giọng ở máy nhà chưa chạy lần nào (mở chay-vieneu.bat)'
}

async function docQuaMayNha(cau: string[]): Promise<{ wav: Buffer; doDai: number[] }> {
  const kho = db().storage.from('video-tiktok')
  const tat = await mayNhaTat()
  if (tat) throw new Error(tat)
  const ma = randomUUID()
  const { error } = await kho.upload(`${HANG_DOI}/viec/${ma}.json`, JSON.stringify({ cau, giong: GIONG }), { contentType: 'application/json' })
  if (error) throw new Error(`Không gửi được việc cho máy nhà: ${error.message}`)
  const xong = [`${HANG_DOI}/xong/${ma}.json`, `${HANG_DOI}/xong/${ma}.wav`]
  // Máy nhà mỗi lần đọc một bài, có thể đang bận bài khác: chờ tối đa 3 phút
  const hetGio = Date.now() + 180_000
  while (Date.now() < hetGio) {
    await nghi(1500)
    const { data: kq } = await kho.download(xong[0])
    if (!kq) continue
    const j: { doDai?: number[]; loi?: string } = JSON.parse(await kq.text())
    const { data: wav } = j.loi ? { data: null } : await kho.download(xong[1])
    await kho.remove(xong)
    if (j.loi || !wav || !j.doDai) throw new Error(`Máy đọc giọng lỗi: ${j.loi ?? 'không có âm thanh'}`)
    if (j.doDai.length !== cau.length) throw new Error('Máy đọc giọng trả thời lượng không khớp số câu')
    return { wav: Buffer.from(await wav.arrayBuffer()), doDai: j.doDai }
  }
  await kho.remove([`${HANG_DOI}/viec/${ma}.json`])
  throw new Error('Máy nhà chưa đọc xong sau 3 phút (đang bận hoặc vừa tắt)')
}

// Gọi thẳng máy chủ hf-space/: lỗi thì báo ngay lý do dễ hiểu; chỉ chờ (tối đa 1 phút) khi máy chủ còn đang khởi động (502).
async function docQuaUrl(cau: string[]): Promise<{ wav: Buffer; doDai: number[] }> {
  const url = process.env.VIENEU_URL!.trim().replace(/\/+$/, '')
  const hetGio = Date.now() + 60_000
  for (;;) {
    const res = await fetch(`${url}/doc`, {
      method: 'POST',
      // ngrok-skip-browser-warning: chạy VieNeu trên máy nhà qua ngrok (gói miễn phí) thì bỏ qua trang cảnh báo của ngrok
      headers: { 'content-type': 'application/json', 'ngrok-skip-browser-warning': '1', authorization: `Bearer ${process.env.VIENEU_KHOA?.trim() ?? ''}` },
      body: JSON.stringify({ cau, giong: GIONG }),
      signal: AbortSignal.timeout(240_000),
      cache: 'no-store',
    }).catch((e: Error) => e)
    if (res instanceof Response && res.ok) {
      const doDai = (res.headers.get('x-do-dai') ?? '').split(',').map(Number)
      if (doDai.length !== cau.length || doDai.some((x) => !(x > 0))) throw new Error('VieNeu trả thời lượng không khớp số câu')
      return { wav: Buffer.from(await res.arrayBuffer()), doDai }
    }
    if (!(res instanceof Response)) throw new Error(`Không gọi được máy đọc giọng: ${res.message}`)
    const noiDung = (await res.text()).slice(0, 2000)
    if (/ERR_NGROK_3200|is offline/i.test(noiDung))
      throw new Error('Máy đọc giọng ở nhà chưa mở được: cửa sổ ngrok đang tắt (hoặc máy nhà đang tắt)')
    if (res.status === 401) throw new Error('Máy đọc giọng từ chối: VIENEU_KHOA trên Vercel không khớp khóa trong chay-vieneu.bat')
    if (res.status !== 502 || Date.now() > hetGio)
      throw new Error(
        res.status === 502
          ? 'Máy đọc giọng VieNeu ở nhà chưa chạy (ngrok vẫn mở): mở chay-vieneu.bat'
          : `Máy đọc giọng lỗi ${res.status}: ${noiDung.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)}`,
      )
    await new Promise((r) => setTimeout(r, 5_000))
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
