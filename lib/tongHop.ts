import 'server-only'
import { db, type BaiViet } from './db'
import { layTinMoi } from './nguonTin'
import { docNoiDungBai } from './docBai'
import { chonTin, vietBai } from './ai'
import { coFacebook } from './facebook'
import { coTikTok } from './tiktok'
import { dangLenFacebook, dangLenTikTok } from './dangBai'
import { xepHang } from './soLieu'
import { chonAnhTuDong, thieuCot } from './anhNen'

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
      const them = (dong: object) => db().from('bai_viet').insert(dong).select('*').single<BaiViet>()
      let { data: moi, error } = await them(
        bai ? { ...chung, ...bai } : { ...chung, trang_thai: 'loi', loi: 'AI không viết được bài này' },
      )
      // Bảng chưa có cột tu_khoa_anh (chưa chạy SQL ảnh nền): lưu bài không kèm từ khóa
      if (bai && thieuCot(error)) {
        const conLai: Partial<typeof bai> = { ...bai }
        delete conLai.tu_khoa_anh
        ;({ data: moi, error } = await them({ ...chung, ...conLai }))
      }
      if (error || !moi) throw error ?? new Error('Không lưu được bài')
      if (!bai) continue
      // Tìm ảnh nền trước khi đăng để ảnh bài có nền ảnh chụp
      const anhNen = await chonAnhTuDong(moi)
      if (anhNen) moi = { ...moi, anh_nen: anhNen }
      daViet++
      // Facebook và TikTok đăng độc lập: bên này lỗi không chặn bên kia
      if (dangFb) {
        // Đã chạy lâu thì đăng ảnh cho nhanh, kẻo dựng video lồng tiếng làm quá 300 giây (TikTok dùng lại video này)
        await dangLenFacebook(moi, undefined, Date.now() - batDau > 150_000 ? false : undefined).then(
          ({ canhBao }) => {
            daDang++
            if (canhBao) loi.push(`${t.tieuDe} (Facebook): ${canhBao}`)
          },
          (e: Error) => loi.push(`${t.tieuDe} (Facebook): ${e.message}`),
        )
      }
      if (dangTikTok) {
        // Đã chạy lâu thì đăng dạng ảnh cho nhanh, kẻo dựng video lồng tiếng làm quá 300 giây
        await dangLenTikTok(moi, Date.now() - batDau > 150_000 ? { longTieng: false } : {}).then(
          ({ canhBao }) => {
            daDangTikTok++
            if (canhBao) loi.push(`${t.tieuDe} (TikTok): ${canhBao}`)
          },
          (e: Error) => loi.push(`${t.tieuDe} (TikTok): ${e.message}`),
        )
      }
    } catch (e) {
      loi.push(`${t.tieuDe}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { soTin: tin.length, daChon: chon.length, daViet, daDang, daDangTikTok, loi }
}
