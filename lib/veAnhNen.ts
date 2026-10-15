import 'server-only'

// AI vẽ ảnh nền cho từng địa điểm của phim (Gemini tạo ảnh, khổ 16:9). Khoá GEMINI_API_KEY phải bật trả phí trên Google AI
// Studio: gói miễn phí không có hạn mức tạo ảnh (trả lỗi 429). Khoảng 0,04 USD (~1.000 đồng) một ảnh.
const MODEL_ANH = process.env.GEMINI_MODEL_ANH ?? 'gemini-2.5-flash-image'

// Phong cách chung cho mọi địa điểm của một phim: cùng kiểu vẽ, chừa chỗ cho nhân vật hoạt hình đứng
export const PHONG_CACH_NEN =
  'Background art for an animated documentary film: clean painterly 2D cartoon illustration, rich detail, cinematic lighting, the same art style for every location of the film. ' +
  'NO people, NO characters, NO animals in the foreground, NO text, letters, signs with writing, logos or watermarks. ' +
  'Eye-level view as if standing in the scene, the floor or ground covers about the lower quarter of the image, the centre left open for cartoon characters to stand. Wide 16:9.'

export async function veAnhGemini(moTa: string): Promise<{ du_lieu: Buffer; mime: string }> {
  const khoa = process.env.GEMINI_API_KEY
  if (!khoa) throw new Error('Chưa có GEMINI_API_KEY trên Vercel')
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ANH}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': khoa },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${PHONG_CACH_NEN}\n\nLocation:\n${moTa}` }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } },
    }),
    signal: AbortSignal.timeout(90_000),
  })
  const j = (await res.json().catch(() => ({}))) as {
    error?: { message?: string }
    candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[]
  }
  if (res.status === 429)
    throw new Error('Khoá Gemini chưa được tạo ảnh (gói miễn phí không có hạn mức tạo ảnh). Bật trả phí trong Google AI Studio → Billing, rồi bấm lại.')
  if (!res.ok) throw new Error(`Gemini lỗi ${res.status}: ${(j.error?.message ?? '').slice(0, 160)}`)
  const anh = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData
  if (!anh) throw new Error('Gemini không trả ảnh (có thể bị bộ lọc an toàn chặn) — sửa mô tả địa điểm hoặc tự tải ảnh lên')
  return { du_lieu: Buffer.from(anh.data, 'base64'), mime: anh.mimeType }
}
