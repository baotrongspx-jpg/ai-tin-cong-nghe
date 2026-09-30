import 'server-only'
import { db, type BaiViet } from './db'
import { coFacebook, goiFb } from './facebook'
import { guiTelegram, thoat } from './telegram'

// Bình luận Fanpage: đọc cần quyền pages_read_user_content, trả lời / ẩn cần pages_manage_engagement.
// TikTok không cho app bên ngoài đọc hay trả lời bình luận nên chỉ làm cho Facebook.

export type BinhLuan = {
  id: string
  noiDung: string
  nguoi: string
  luc: string
  daTraLoi: boolean // Fanpage đã trả lời bên dưới
  bai: Pick<BaiViet, 'id' | 'tieu_de_anh' | 'noi_dung' | 'fb_post_id' | 'chu_de' | 'mau_anh'>
}

export class ThieuQuyen extends Error {}

// Lỗi 10 / 200 / 190 của Facebook: token thiếu quyền hoặc hết hạn
const laLoiQuyen = (e: unknown) => [10, 200, 190].includes((e as { ma?: number }).ma ?? 0)

type CmFb = {
  id: string
  message?: string
  from?: { id: string; name: string }
  created_time: string
  comments?: { data: { from?: { id: string } }[] }
}

// Bình luận gốc (không gồm trả lời) của các bài đăng trong `ngay` ngày, mới nhất trước
export async function layBinhLuan(ngay = 7): Promise<BinhLuan[]> {
  if (!coFacebook()) return []
  const { data } = await db()
    .from('bai_viet')
    .select('id, tieu_de_anh, noi_dung, fb_post_id, chu_de, mau_anh')
    .not('fb_post_id', 'is', null)
    .gte('dang_luc', new Date(Date.now() - ngay * 86400_000).toISOString())
    .lte('dang_luc', new Date().toISOString())
    .order('dang_luc', { ascending: false })
    .limit(60)
  const dsBai = (data ?? []) as BinhLuan['bai'][]
  const trang = process.env.FB_PAGE_ID

  const kq: BinhLuan[] = []
  for (let i = 0; i < dsBai.length; i += 5) {
    await Promise.all(
      dsBai.slice(i, i + 5).map(async (bai) => {
        try {
          const { data: cm } = await goiFb<{ data: CmFb[] }>(
            `${bai.fb_post_id}/comments?filter=toplevel&order=reverse_chronological&limit=50` +
              `&fields=id,message,from{id,name},created_time,comments.limit(20){from{id}}`,
          )
          for (const c of cm) {
            if (!c.message || c.from?.id === trang) continue // bỏ bình luận của chính Fanpage
            kq.push({
              id: c.id,
              noiDung: c.message,
              nguoi: c.from?.name ?? 'Người dùng Facebook',
              luc: c.created_time,
              daTraLoi: (c.comments?.data ?? []).some((r) => r.from?.id === trang),
              bai,
            })
          }
        } catch (e) {
          if (laLoiQuyen(e)) throw new ThieuQuyen((e as Error).message)
          // bài đã bị xóa trên Facebook: bỏ qua
        }
      }),
    )
  }
  return kq.sort((a, b) => b.luc.localeCompare(a.luc))
}

export async function traLoi(commentId: string, noiDung: string) {
  try {
    await goiFb(`${commentId}/comments`, 'POST', { message: noiDung })
  } catch (e) {
    if (laLoiQuyen(e)) throw new ThieuQuyen('Token chưa có quyền pages_manage_engagement để trả lời bình luận')
    throw e
  }
}

export async function anBinhLuan(commentId: string, an = true) {
  try {
    await goiFb(commentId, 'POST', { is_hidden: String(an) })
  } catch (e) {
    if (laLoiQuyen(e)) throw new ThieuQuyen('Token chưa có quyền pages_manage_engagement để ẩn bình luận')
    throw e
  }
}

// ---------- Tự ẩn bình luận spam ----------

// Dấu hiệu spam hay gặp trên trang tin: link lạ, số điện thoại, mời vay / cờ bạc / kiếm tiền, rủ inbox
const MAU_SPAM: RegExp[] = [
  /https?:\/\/|www\.|\.(com|net|xyz|top|vip|club|link|site|online)\b|bit\.ly|t\.me\//i,
  /(\+?84|0)[\s.-]?\d{2,3}[\s.-]?\d{3}[\s.-]?\d{3,4}/,
  /\b(zalo|telegram|tele)\b.{0,15}\d{3}/i,
  /vay (tiền|vốn|nhanh|online)|giải ngân|lãi suất (thấp|0)|không thế chấp|bốc bát họ/i,
  /casino|cá cược|nhà cái|tài xỉu|lô đề|nổ hũ|game bài|slot/i,
  /kiếm tiền (online|tại nhà)|việc nhẹ lương cao|thu nhập \d+.{0,6}(triệu|tr)\/?(ngày|tuần)|tuyển (ctv|cộng tác viên)/i,
  /(ib|inbox|nhắn tin) (mình|em|e|shop|zalo)|check (ib|inbox)|kết bạn (zalo|với em)/i,
  /hack (facebook|fb|nick)|lấy lại (nick|tài khoản) bị hack|tăng (like|follow|sub)/i,
]

export const laSpam = (s: string) => MAU_SPAM.some((m) => m.test(s))

export type DaAn = { id: string; noiDung: string; nguoi: string; luc: string; baiId: string; tieuDe: string }
const KHOA_AN = 'da_an_spam'

export async function dsDaAn(): Promise<DaAn[]> {
  const { data } = await db().from('cai_dat').select('gia_tri').eq('khoa', KHOA_AN).maybeSingle()
  return (data?.gia_tri as DaAn[] | undefined) ?? []
}

async function ghiDaAn(ds: DaAn[]) {
  await db().from('cai_dat').upsert({ khoa: KHOA_AN, gia_tri: ds.slice(-300), cap_nhat_luc: new Date().toISOString() })
}

// Ẩn bình luận spam mới trong 3 ngày gần đây. Tắt bằng AN_SPAM_TU_DONG=0.
// Thiếu quyền thì lặng lẽ bỏ qua (trang Bình luận sẽ hiện hướng dẫn).
export async function anSpamTuDong() {
  if (process.env.AN_SPAM_TU_DONG === '0') return 0
  let ds: BinhLuan[]
  try {
    ds = await layBinhLuan(3)
  } catch (e) {
    if (e instanceof ThieuQuyen) return 0
    throw e
  }
  const daAn = await dsDaAn()
  const daCo = new Set(daAn.map((x) => x.id))
  const moi: DaAn[] = []
  for (const c of ds) {
    if (daCo.has(c.id) || !laSpam(c.noiDung)) continue
    try {
      await anBinhLuan(c.id)
      moi.push({ id: c.id, noiDung: c.noiDung, nguoi: c.nguoi, luc: c.luc, baiId: c.bai.id, tieuDe: c.bai.tieu_de_anh })
    } catch (e) {
      if (e instanceof ThieuQuyen) break
    }
  }
  if (!moi.length) return 0
  await ghiDaAn([...daAn, ...moi])
  await guiTelegram(
    `🧹 <b>Đã tự ẩn ${moi.length} bình luận spam</b>\n` +
      moi.slice(0, 5).map((c) => `• ${thoat(c.nguoi)}: ${thoat(c.noiDung.slice(0, 120))}`).join('\n'),
  )
  return moi.length
}

// Hiện lại một bình luận bị ẩn nhầm
export async function hienLai(commentId: string) {
  await anBinhLuan(commentId, false)
  await ghiDaAn((await dsDaAn()).filter((x) => x.id !== commentId))
}

// Ẩn tay một bình luận và ghi vào danh sách đã ẩn
export async function anTay(c: Pick<BinhLuan, 'id' | 'noiDung' | 'nguoi' | 'luc'> & { baiId: string; tieuDe: string }) {
  await anBinhLuan(c.id)
  const ds = await dsDaAn()
  if (!ds.some((x) => x.id === c.id)) await ghiDaAn([...ds, c])
}
