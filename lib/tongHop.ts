import 'server-only'
import { db, type BaiViet } from './db'
import { layTinMoi } from './nguonTin'
import { docNoiDungBai } from './docBai'
import { chonTin, vietBai } from './ai'
import { coFacebook } from './facebook'
import { coTikTok } from './tiktok'
import { dangLenFacebook, dangLenTikTok } from './dangBai'
import { xepHang } from './soLieu'

export type KetQuaTongHop = {
  soTin: number; daChon: number; daViet: number; daDang: number; daDangTikTok: number; loi: string[]
}

// Toàn bộ quy trình: đọc RSS → bỏ bài đã soạn → AI chọn tin → đọc bài gốc → AI viết → lưu nháp.
// `tuDongDang`: viết xong đăng thẳng lên Fanpage và TikTok (nơi nào đã cấu hình), không chờ duyệt.
export async function tongHopTin(
  tuDongDang = false,
  soBai = Number(process.env.SO_BAI_MOI_LAN ?? 3),
): Promise<KetQuaTongHop> {
  const dangFb = tuDongDang && coFacebook()
  const dangTikTok = tuDongDang && coTikTok() && process.env.TIKTOK_TU_DONG_DANG !== '0'
  let daDang = 0
  let daDangTikTok = 0
  const loi: string[] = []
  const batDau = Date.now()
  const tatCa = await layTinMoi(24)

  // Bỏ tin đã từng soạn (link đã có trong bảng)
  const links = tatCa.map((t) => t.link)
  const { data: daCo, error } = await db().from('bai_viet').select('nguon_link').in('nguon_link', links)
  if (error) throw new Error(`Lỗi đọc Supabase: ${error.message}`)
  const setDaCo = new Set((daCo ?? []).map((r) => r.nguon_link))
  const tin = tatCa.filter((t) => !setDaCo.has(t.link))

  if (tin.length === 0) return { soTin: 0, daChon: 0, daViet: 0, daDang, daDangTikTok, loi }

  // Tiêu đề tin đã soạn 3 ngày qua → tránh chọn lại cùng sự kiện từ báo khác
  const { data: ganDay } = await db()
    .from('bai_viet')
    .select('tieu_de_goc')
    .gte('tao_luc', new Date(Date.now() - 3 * 86400_000).toISOString())
    .neq('trang_thai', 'loi')
    .limit(100)

  // Điểm tương tác 30 ngày qua: 8 bài cao nhất và 4 bài thấp nhất. Chưa có bài nào có điểm thì bỏ qua.
  const hang = await xepHang(30).catch(() => null)
  const coDiem = (hang?.ds ?? []).filter((x) => x.soLieu)
  const hieuQua = coDiem.some((x) => x.diem > 0)
    ? [...coDiem.slice(0, 8), ...coDiem.slice(8).slice(-4)].map((x) => ({ tieuDe: x.bai.tieu_de_anh, diem: x.diem }))
    : []

  const chon = await chonTin(tin, soBai, (ganDay ?? []).map((r) => r.tieu_de_goc), hieuQua)
  let daViet = 0

  // Viết lần lượt từng bài: gói miễn phí của Gemini giới hạn số lần gọi mỗi phút
  for (const [thuTu, so] of chon.entries()) {
    const t = tin[so]
    // Vercel cắt hàm sau 300 giây → gần hết giờ thì để bài còn lại cho lần chạy sau
    if (Date.now() - batDau > 200_000) {
      loi.push(`Hết giờ, để lần sau: ${t.tieuDe}`)
      continue
    }
    try {
      const noiDung = await docNoiDungBai(t.link)
      // Trang chặn đọc → dùng tóm tắt RSS
      const nguonViet = noiDung.length >= 400 ? noiDung : t.tomTat
      const bai = await vietBai(t, nguonViet)
      const chung = {
        nguon_ten: t.nguon,
        nguon_link: t.link,
        tieu_de_goc: t.tieuDe,
        ngay_bao: t.ngay?.toISOString() ?? null,
        mau_anh: (Date.now() + thuTu) % 5,
      }
      const { data: moi, error } = await db()
        .from('bai_viet')
        .insert(bai ? { ...chung, ...bai } : { ...chung, trang_thai: 'loi', loi: 'AI không viết được bài này' })
        .select('*')
        .single<BaiViet>()
      if (error) throw error
      if (!bai) continue
      daViet++
      // Facebook và TikTok đăng độc lập: bên này lỗi không chặn bên kia
      if (dangFb) {
        await dangLenFacebook(moi).then(
          () => daDang++,
          (e: Error) => loi.push(`${t.tieuDe} (Facebook): ${e.message}`),
        )
      }
      if (dangTikTok) {
        await dangLenTikTok(moi).then(
          () => daDangTikTok++,
          (e: Error) => loi.push(`${t.tieuDe} (TikTok): ${e.message}`),
        )
      }
    } catch (e) {
      loi.push(`${t.tieuDe}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { soTin: tin.length, daChon: chon.length, daViet, daDang, daDangTikTok, loi }
}
