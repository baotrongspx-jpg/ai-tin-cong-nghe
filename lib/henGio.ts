import 'server-only'
import { db, type BaiViet } from './db'
import { dangLenTikTok } from './dangBai'
import { xepHang } from './soLieu'
import { guiTelegram, thoat } from './telegram'
import { nhoTam } from './nhoTam'

// TikTok không có hẹn giờ qua API: lưu { [id bài]: giờ hẹn } trong cai_dat,
// "nhịp" 10 phút một lần (/api/nhip) đăng những bài đã tới giờ.
const KHOA = 'hen_gio_tiktok'

export async function dsHenTikTok(): Promise<Record<string, string>> {
  const { data } = await db().from('cai_dat').select('gia_tri').eq('khoa', KHOA).maybeSingle()
  return (data?.gia_tri as Record<string, string> | undefined) ?? {}
}

async function ghi(ds: Record<string, string>) {
  await db().from('cai_dat').upsert({ khoa: KHOA, gia_tri: ds, cap_nhat_luc: new Date().toISOString() })
}

export async function henTikTok(id: string, luc: Date) {
  await ghi({ ...(await dsHenTikTok()), [id]: luc.toISOString() })
}

export async function huyHenTikTok(id: string) {
  const ds = await dsHenTikTok()
  delete ds[id]
  await ghi(ds)
}

// Đăng các bài TikTok đã tới giờ, tối đa 3 bài mỗi nhịp để khỏi chạm giới hạn tốc độ của TikTok.
// Lỗi thì bỏ khỏi lịch (không thử lại mãi), ghi lỗi vào bài và báo Telegram.
export async function chayHenGioTikTok() {
  const ds = await dsHenTikTok()
  const toiGio = Object.entries(ds)
    .filter(([, luc]) => new Date(luc).getTime() <= Date.now())
    .sort((a, b) => a[1].localeCompare(b[1]))
    .slice(0, 3)
  if (!toiGio.length) return { daDang: 0, loi: [] as string[] }

  const { data } = await db().from('bai_viet').select('*').in('id', toiGio.map(([id]) => id))
  const bai = new Map(((data ?? []) as BaiViet[]).map((b) => [b.id, b]))
  let daDang = 0
  const loi: string[] = []
  for (const [id] of toiGio) {
    delete ds[id]
    const b = bai.get(id)
    if (!b || b.tiktok_publish_id) continue // bài đã xóa hoặc đã đăng tay
    try {
      await dangLenTikTok(b)
      daDang++
    } catch (e) {
      loi.push(`${b.tieu_de_anh}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  await ghi(ds)
  if (loi.length) await guiTelegram(`⚠️ <b>Đăng TikTok hẹn giờ lỗi</b>\n${loi.map((l) => `• ${thoat(l.slice(0, 300))}`).join('\n')}`)
  return { daDang, loi }
}

// Giờ đăng mà bài có điểm tương tác trung bình cao nhất (giờ Việt Nam), cần ít nhất 2 bài mỗi giờ.
// Chưa đủ số liệu thì gợi ý các giờ mạng xã hội thường đông người xem.
export const gioVang = () => nhoTam('gio_vang', 10 * 60_000, tinhGioVang)

async function tinhGioVang(): Promise<{ gio: number[]; tuSoLieu: boolean }> {
  const { ds } = await xepHang(30).catch(() => ({ ds: [] }))
  const theoGio = new Map<number, number[]>()
  for (const x of ds) {
    if (!x.soLieu || !x.bai.dang_luc) continue
    const gio = Number(
      new Date(x.bai.dang_luc).toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }),
    ) % 24
    theoGio.set(gio, [...(theoGio.get(gio) ?? []), x.diem])
  }
  const xep = [...theoGio.entries()]
    .filter(([, d]) => d.length >= 2)
    .map(([gio, d]) => ({ gio, tb: d.reduce((a, b) => a + b, 0) / d.length }))
    .filter((x) => x.tb > 0)
    .sort((a, b) => b.tb - a.tb)
    .slice(0, 3)
  return xep.length ? { gio: xep.map((x) => x.gio).sort((a, b) => a - b), tuSoLieu: true } : { gio: [7, 12, 20], tuSoLieu: false }
}
