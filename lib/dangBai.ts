import 'server-only'
import { db, type BaiViet } from './db'
import { veAnhBai } from './anh'
import { taoChuThich } from './chuThich'
import { dangAnhLenPage } from './facebook'
import { dangAnhLenTikTok, urlWeb } from './tiktok'

// Vẽ ảnh, đăng lên Fanpage rồi đánh dấu bài đã đăng. Lỗi thì ghi vào cột `loi` và ném lỗi ra.
export async function dangLenFacebook(bai: BaiViet) {
  try {
    const anh = await (await veAnhBai(bai)).blob()
    const postId = await dangAnhLenPage(anh, taoChuThich(bai))
    await db()
      .from('bai_viet')
      .update({ trang_thai: 'da_dang', fb_post_id: postId, dang_luc: new Date().toISOString(), loi: null })
      .eq('id', bai.id)
    return postId
  } catch (e) {
    const loi = e instanceof Error ? e.message : String(e)
    await db().from('bai_viet').update({ loi }).eq('id', bai.id)
    throw new Error(loi)
  }
}

// Đăng ảnh lên TikTok. TikTok tự tải ảnh JPG từ link công khai /anh/<id>.jpg; lỗi ghi vào cột `tiktok_loi`.
export async function dangLenTikTok(bai: BaiViet) {
  try {
    // ?v= để TikTok không lấy phải ảnh cũ còn trong bộ nhớ đệm khi vừa sửa tiêu đề
    const urlAnh = `${urlWeb()}/anh/${bai.id}.jpg?v=${Date.now()}`
    const publishId = await dangAnhLenTikTok(urlAnh, bai.tieu_de_anh, taoChuThich(bai))
    const luc = new Date().toISOString()
    await db()
      .from('bai_viet')
      .update({ trang_thai: 'da_dang', tiktok_publish_id: publishId, tiktok_dang_luc: luc, tiktok_loi: null })
      .eq('id', bai.id)
    return publishId
  } catch (e) {
    const loi = e instanceof Error ? e.message : String(e)
    await db().from('bai_viet').update({ tiktok_loi: loi }).eq('id', bai.id)
    throw new Error(loi)
  }
}
