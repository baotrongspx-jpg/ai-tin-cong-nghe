import { redirect } from 'next/navigation'
import { db, type BaiViet, type TrangThai } from '@/lib/db'
import { daDangNhap } from '@/lib/xacThuc'
import { coFacebook } from '@/lib/facebook'
import { coTikTok, daKetNoiTikTok } from '@/lib/tiktok'
import DauTrang, { CanhBao, ThanhLoc, TieuDeTrang, Trong } from './DauTrang'
import TheBai from './TheBai'

// Nút "Tổng hợp ngay" chạy AI trong Server Action, cần thời gian dài
export const maxDuration = 300

const THE: { ma: TrangThai; ten: string }[] = [
  { ma: 'nhap', ten: 'Chờ duyệt' },
  { ma: 'da_dang', ten: 'Đã đăng' },
  { ma: 'bo_qua', ten: 'Bỏ qua' },
  { ma: 'loi', ten: 'Lỗi' },
]

const TRONG: Record<TrangThai, { bieuTuong: string; tieuDe: string; goiY: string }> = {
  nhap: { bieuTuong: '🎉', tieuDe: 'Đã duyệt hết bài', goiY: 'Bấm "Tổng hợp ngay" trên thanh đầu trang để AI đọc tin mới và soạn thêm bài.' },
  da_dang: { bieuTuong: '📭', tieuDe: 'Chưa đăng bài nào', goiY: 'Bài đăng lên Facebook sẽ hiện ở đây.' },
  bo_qua: { bieuTuong: '🗂️', tieuDe: 'Không có bài bị bỏ qua', goiY: 'Bài bạn bấm "Bỏ qua" sẽ nằm ở đây, đưa về chờ duyệt lúc nào cũng được.' },
  loi: { bieuTuong: '✅', tieuDe: 'Không có bài lỗi', goiY: 'Bài AI không viết được sẽ hiện ở đây.' },
}

export default async function TrangChu({ searchParams }: PageProps<'/'>) {
  if (!(await daDangNhap())) redirect('/dang-nhap')

  const tt = (await searchParams).tt
  const dangXem: TrangThai = THE.some((t) => t.ma === tt) ? (tt as TrangThai) : 'nhap'

  const [{ data, error }, ...dem] = await Promise.all([
    db()
      .from('bai_viet')
      .select('*')
      .eq('trang_thai', dangXem)
      .order(dangXem === 'da_dang' ? 'dang_luc' : 'tao_luc', { ascending: false, nullsFirst: false })
      .limit(50),
    ...THE.map((t) => db().from('bai_viet').select('id', { count: 'exact', head: true }).eq('trang_thai', t.ma)),
  ])
  const dsBai = (data ?? []) as BaiViet[]
  // Đã kết nối TikTok thì hiện nút đăng cả 2 nền tảng
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
              <TheBai key={`${b.id}-${b.trang_thai}`} bai={b} tiktok={tiktok} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
