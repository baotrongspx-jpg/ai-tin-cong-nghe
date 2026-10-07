import 'server-only'
import { db, type BaiViet } from './db'
import { veAnhBai } from './anh'
import { taoChuThich, taoChuThichTikTok } from './chuThich'
import { dangAnhLenPage, dangVideoLenPage } from './facebook'
import { batLongTieng, dangAnhLenTikTok, dangVideoLenTikTok, urlWeb, type TuyChonDang } from './tiktok'
import { taoVideoBai } from './video'
import { layHashtagXuHuong } from './xuHuong'

// Đăng lên Fanpage rồi đánh dấu bài đã đăng. Lỗi thì ghi vào cột `loi` và ném lỗi ra.
// `video` (mặc định bật, tắt bằng FB_VIDEO=0): đăng video lồng tiếng (dùng chung video với TikTok, dựng một lần);
// dựng video lỗi thì đăng ảnh như cũ, lý do nằm ở `canhBao`.
// `henLuc`: Facebook tự đăng vào giờ đó; `dang_luc` ghi giờ hẹn (ở tương lai nghĩa là đang chờ đăng).
export async function dangLenFacebook(bai: BaiViet, henLuc?: Date, video = process.env.FB_VIDEO !== '0', choHoatHinh?: number) {
  try {
    let postId: string | null = null
    let canhBao: string | undefined
    if (video) {
      const v = await taoVideoBai(bai, { choHoatHinh }).catch((e: Error) => void (canhBao = `Dựng video lỗi, Facebook đã đăng dạng ảnh: ${e.message}`))
      if (v) postId = await dangVideoLenPage(v, taoChuThich(bai), henLuc)
    }
    postId ??= await dangAnhLenPage(await (await veAnhBai(bai)).blob(), taoChuThich(bai), henLuc)
    await db()
      .from('bai_viet')
      .update({ trang_thai: 'da_dang', fb_post_id: postId, dang_luc: (henLuc ?? new Date()).toISOString(), loi: null })
      .eq('id', bai.id)
    return { postId, canhBao }
  } catch (e) {
    const loi = e instanceof Error ? e.message : String(e)
    await db().from('bai_viet').update({ loi }).eq('id', bai.id)
    throw new Error(loi)
  }
}

// Mô tả video TikTok tối đa 2200 ký tự: bài dài thì cắt bớt nội dung, giữ nguồn và hashtag ở cuối
function moTaVideo(bai: BaiViet, xuHuong: string[]) {
  const moTa = taoChuThichTikTok(bai, xuHuong)
  const du = moTa.length - 2200
  return du <= 0 ? moTa : taoChuThichTikTok({ ...bai, noi_dung: `${bai.noi_dung.trim().slice(0, -(du + 1)).trimEnd()}…` }, xuHuong)
}

// Đăng lên TikTok, lỗi ghi vào cột `tiktok_loi`.
// Lồng tiếng (mặc định): dựng video giọng AI đọc bài rồi tải lên. Dựng video lỗi (hết lượt giọng Gemini...) thì đăng ảnh như cũ,
// lý do nằm ở `canhBao`. Đăng ảnh: TikTok tự tải ảnh JPG từ link công khai /anh/<id>.jpg.
export async function dangLenTikTok(bai: BaiViet, tuyChon: TuyChonDang = {}) {
  try {
    const { ds: xuHuong } = await layHashtagXuHuong()
    let publishId: string | null = null
    let canhBao: string | undefined
    if (batLongTieng(tuyChon)) {
      const video = await taoVideoBai(bai, { choHoatHinh: tuyChon.choHoatHinh }).catch((e: Error) => void (canhBao = `Lồng tiếng lỗi, đã đăng dạng ảnh: ${e.message}`))
      if (video) publishId = await dangVideoLenTikTok(video, moTaVideo(bai, xuHuong), tuyChon)
    }
    // ?v= để TikTok không lấy phải ảnh cũ còn trong bộ nhớ đệm khi vừa sửa tiêu đề
    publishId ??= await dangAnhLenTikTok(`${urlWeb()}/anh/${bai.id}.jpg?v=${Date.now()}`, bai.tieu_de_anh, taoChuThichTikTok(bai, xuHuong), tuyChon)
    const luc = new Date().toISOString()
    await db()
      .from('bai_viet')
      .update({ tiktok_publish_id: publishId, tiktok_dang_luc: luc, tiktok_loi: null })
      .eq('id', bai.id)
    return { publishId, canhBao }
  } catch (e) {
    const loi = e instanceof Error ? e.message : String(e)
    await db().from('bai_viet').update({ tiktok_loi: loi }).eq('id', bai.id)
    throw new Error(loi)
  }
}
