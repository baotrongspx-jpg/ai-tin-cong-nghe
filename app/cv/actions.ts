'use server'

import { guiTelegram, thoat } from '@/lib/telegram'

export type KetQuaLienHe = { ok: boolean; thongBao: string } | null

// Form "Liên hệ" trên website CV: gửi lời nhắn của nhà tuyển dụng về Telegram của chủ trang.
// Ô "website" ẩn với người thật; máy spam hay điền vào → bỏ qua (vẫn báo thành công để nó không thử lại).
export async function guiLienHe(_: KetQuaLienHe, form: FormData): Promise<KetQuaLienHe> {
  const lay = (k: string, toiDa: number) => String(form.get(k) ?? '').trim().slice(0, toiDa)
  if (lay('website', 100)) return { ok: true, thongBao: 'Đã gửi, cảm ơn anh/chị!' }

  const ten = lay('ten', 80)
  const lienHe = lay('lien_he', 80)
  const noiDung = lay('noi_dung', 1500)
  if (!ten || !lienHe) return { ok: false, thongBao: 'Vui lòng điền tên và số điện thoại / email.' }

  const daGui = await guiTelegram(
    `📩 <b>Liên hệ mới từ trang CV</b>\n` +
      `<b>Tên:</b> ${thoat(ten)}\n<b>Liên hệ:</b> ${thoat(lienHe)}\n` +
      (noiDung ? `<b>Lời nhắn:</b>\n${thoat(noiDung)}` : ''),
  )
  return daGui
    ? { ok: true, thongBao: 'Đã gửi! Tôi sẽ liên hệ lại sớm nhất.' }
    : { ok: false, thongBao: 'Chưa gửi được, anh/chị vui lòng gọi hoặc nhắn Zalo giúp tôi.' }
}
