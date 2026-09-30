import { redirect } from 'next/navigation'
import { db, type BaiViet, type TrangThai } from '@/lib/db'
import { daDangNhap } from '@/lib/xacThuc'
import { coFacebook } from '@/lib/facebook'
import { coTikTok, daKetNoiTikTok } from '@/lib/tiktok'
import { dsHenTikTok, gioVang } from '@/lib/henGio'
import { bayGio } from '@/lib/thoiGian'
import DauTrang, { CanhBao, ThanhLoc, TieuDeTrang, Trong } from './DauTrang'
import TheBai from './TheBai'

// Nút "Tổng hợp ngay" chạy AI trong Server Action, cần thời gian dài
export const maxDuration = 300

// "Hẹn giờ" không phải trạng thái trong bảng: bài Facebook có giờ đăng ở tương lai, hoặc bài có lịch TikTok
type Tab = TrangThai | 'hen_gio'

const THE: { ma: Tab; ten: string }[] = [
  { ma: 'nhap', ten: 'Chờ duyệt' },
  { ma: 'hen_gio', ten: '⏰ Hẹn giờ' },
  { ma: 'da_dang', ten: 'Đã đăng' },
  { ma: 'bo_qua', ten: 'Bỏ qua' },
  { ma: 'loi', ten: 'Lỗi' },
]

const TRONG: Record<Tab, { bieuTuong: string; tieuDe: string; goiY: string }> = {
  hen_gio: { bieuTuong: '⏰', tieuDe: 'Chưa hẹn giờ bài nào', goiY: 'Ở bài chờ duyệt, bấm "Hẹn giờ" để chọn giờ đăng Facebook, TikTok hoặc cả hai.' },
  nhap: { bieuTuong: '🎉', tieuDe: 'Đã duyệt hết bài', goiY: 'Bấm "Tổng hợp ngay" trên thanh đầu trang để AI đọc tin mới và soạn thêm bài.' },
  da_dang: { bieuTuong: '📭', tieuDe: 'Chưa đăng bài nào', goiY: 'Bài đăng lên Facebook sẽ hiện ở đây.' },
  bo_qua: { bieuTuong: '🗂️', tieuDe: 'Không có bài bị bỏ qua', goiY: 'Bài bạn bấm "Bỏ qua" sẽ nằm ở đây, đưa về chờ duyệt lúc nào cũng được.' },
  loi: { bieuTuong: '✅', tieuDe: 'Không có bài lỗi', goiY: 'Bài AI không viết được sẽ hiện ở đây.' },
}

export default async function TrangChu({ searchParams }: PageProps<'/'>) {
  if (!(await daDangNhap())) redirect('/dang-nhap')

  const tt = (await searchParams).tt
  const dangXem: Tab = THE.some((t) => t.ma === tt) ? (tt as Tab) : 'nhap'

  const [henTikTok, vang] = await Promise.all([dsHenTikTok(), gioVang()])
  const idHen = Object.keys(henTikTok)
  const luc = bayGio()
  const bay = `"${new Date(luc).toISOString()}"`
  // Điều kiện lọc từng thẻ; `head`: chỉ đếm
  const loc = (ma: Tab, head = false) => {
    const q = db().from('bai_viet').select(head ? 'id' : '*', { count: 'exact', head })
    if (ma === 'hen_gio') return q.or(`dang_luc.gt.${bay}${idHen.length ? `,id.in.(${idHen.join(',')})` : ''}`)
    if (ma === 'da_dang') return q.eq('trang_thai', 'da_dang').or(`dang_luc.is.null,dang_luc.lte.${bay}`)
    if (ma === 'nhap' && idHen.length) return q.eq('trang_thai', 'nhap').not('id', 'in', `(${idHen.join(',')})`)
    return q.eq('trang_thai', ma)
  }
  const thuTu =
    dangXem === 'hen_gio'
      ? { cot: 'dang_luc', tang: true }
      : dangXem === 'da_dang'
        ? { cot: 'dang_luc', tang: false }
        : { cot: 'tao_luc', tang: false }

  const [{ data, error }, ...dem] = await Promise.all([
    loc(dangXem).order(thuTu.cot, { ascending: thuTu.tang, nullsFirst: false }).limit(50),
    ...THE.map((t) => loc(t.ma, true)),
  ])
  const dsBai = (data ?? []) as unknown as BaiViet[]
  // Đã kết nối TikTok thì hiện nút đăng cả 2 nền tảng và hẹn giờ TikTok
  const tiktok = coTikTok() && (await daKetNoiTikTok())

  return (
    <>
      <DauTrang dangO="facebook" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <TieuDeTrang
          ten="Đăng Facebook"
          moTa="AI tự tổng hợp 3 lần mỗi ngày. Sửa nếu cần rồi đăng, Ctrl + S để lưu nhanh."
        />

        {!coFacebook() && (
          <CanhBao>
            Chưa cấu hình Facebook (FB_PAGE_ID, FB_PAGE_TOKEN): vẫn soạn và tải ảnh được, nhưng chưa đăng thẳng lên Fanpage được.
          </CanhBao>
        )}
        {error && <CanhBao loai="do">Lỗi đọc dữ liệu: {error.message}. Đã chạy file supabase/schema.sql chưa?</CanhBao>}

        <ThanhLoc
          dangXem={dangXem}
          mauBat="bg-blue-600 text-white"
          ds={THE.map((t, i) => ({ ...t, href: t.ma === 'nhap' ? '/' : `/?tt=${t.ma}`, so: dem[i].count ?? 0 }))}
        />

        {dsBai.length === 0 ? (
          <Trong {...TRONG[dangXem]} />
        ) : (
          <div className="space-y-5">
            {dsBai.map((b) => (
              <TheBai
                key={`${b.id}-${b.trang_thai}-${b.dang_luc}-${henTikTok[b.id]}`}
                bai={b}
                tiktok={tiktok}
                // Facebook đã nhận bài nhưng giờ đăng ở tương lai: đang chờ Facebook tự đăng
                henFb={b.fb_post_id && b.dang_luc && new Date(b.dang_luc).getTime() > luc ? b.dang_luc : null}
                henTikTok={henTikTok[b.id] ?? null}
                gioVang={vang}
              />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
