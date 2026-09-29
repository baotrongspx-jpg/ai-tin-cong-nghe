import 'server-only'
import { db, type BaiViet } from './db'
import { veAnhBai } from './anh'
import { taoChuThich } from './chuThich'
import { dangAnhLenPage } from './facebook'

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
