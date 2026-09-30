import { after } from 'next/server'
import { z } from 'zod'
import { guiTelegram, thoat } from '@/lib/telegram'
import { hoiTroLy } from '@/lib/troLyCV'
import { DIEN_THOAI } from '../duLieu'

// Robot trên trang CV: nhận câu hỏi (kèm vài lượt trước), trả lời, rồi báo câu hỏi về Telegram cho chủ trang.
const YeuCau = z.object({
  congTy: z.string().max(80).default(''),
  lichSu: z
    .array(z.object({ vai: z.enum(['nguoi', 'robot']), noiDung: z.string().trim().min(1).max(600) }))
    .min(1)
    .max(12)
    // Lượt đầu và lượt cuối phải là câu hỏi, các lượt xen kẽ người – robot
    .refine((ds) => ds.every((l, i) => l.vai === (i % 2 ? 'robot' : 'nguoi')) && ds.length % 2 === 1),
})

// Chặn hỏi dồn: mỗi địa chỉ IP tối đa 20 câu / 10 phút (nhớ trong máy chủ, chỉ để chống phá)
const luotHoi = new Map<string, number[]>()
function quaNhieu(ip: string) {
  const bayGio = Date.now()
  const ds = (luotHoi.get(ip) ?? []).filter((t) => bayGio - t < 600_000)
  ds.push(bayGio)
  luotHoi.set(ip, ds)
  return ds.length > 20
}

export async function POST(req: Request) {
  const duLieu = YeuCau.safeParse(await req.json().catch(() => null))
  if (!duLieu.success) return Response.json({ traLoi: 'Câu hỏi chưa hợp lệ, anh/chị thử lại giúp nhé.' }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'khong-ro'
  if (quaNhieu(ip))
    return Response.json({ traLoi: `Anh/chị hỏi hơi nhanh rồi ạ. Để trao đổi kỹ hơn, anh/chị gọi hoặc nhắn Zalo ${DIEN_THOAI} giúp nhé.` })

  const { lichSu, congTy } = duLieu.data
  const traLoi = await hoiTroLy(lichSu, congTy).catch(() => null)
  const cauHoi = lichSu[lichSu.length - 1].noiDung

  after(() =>
    guiTelegram(
      `🤖 <b>Nhà tuyển dụng hỏi robot</b>${congTy ? ` (${thoat(congTy)})` : ''}\n` +
        `<b>Hỏi:</b> ${thoat(cauHoi)}\n<b>Robot đáp:</b> ${thoat(traLoi ?? '(không trả lời được)')}`,
    ),
  )

  return Response.json({
    traLoi: traLoi ?? `Xin lỗi, tôi chưa trả lời được câu này. Anh/chị gọi hoặc nhắn Zalo ${DIEN_THOAI} để anh Trọng trả lời trực tiếp nhé.`,
  })
}
