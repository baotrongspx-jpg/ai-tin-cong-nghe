import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db, type BaiViet, type TrangThai } from '@/lib/db'
import { daDangNhap } from '@/lib/xacThuc'
import { coFacebook } from '@/lib/facebook'
import { dangXuatAction } from './actions'
import NutTongHop from './NutTongHop'
import TheBai from './TheBai'

// Nút "Tổng hợp ngay" chạy AI trong Server Action, cần thời gian dài
export const maxDuration = 300

const THE: { ma: TrangThai; ten: string }[] = [
  { ma: 'nhap', ten: 'Chờ duyệt' },
  { ma: 'da_dang', ten: 'Đã đăng' },
  { ma: 'bo_qua', ten: 'Bỏ qua' },
  { ma: 'loi', ten: 'Lỗi' },
]

export default async function TrangChu({ searchParams }: PageProps<'/'>) {
  if (!(await daDangNhap())) redirect('/dang-nhap')

  const tt = (await searchParams).tt
  const dangXem: TrangThai = THE.some((t) => t.ma === tt) ? (tt as TrangThai) : 'nhap'

  const [{ data, error }, ...dem] = await Promise.all([
    db().from('bai_viet').select('*').eq('trang_thai', dangXem).order('tao_luc', { ascending: false }).limit(50),
    ...THE.map((t) => db().from('bai_viet').select('id', { count: 'exact', head: true }).eq('trang_thai', t.ma)),
  ])
  const dsBai = (data ?? []) as BaiViet[]

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Duyệt bài tin công nghệ</h1>
          <p className="text-sm text-slate-500">
            AI tự tổng hợp mỗi sáng. Sửa nếu cần, rồi bấm Đăng lên Facebook.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <NutTongHop />
          <form action={dangXuatAction}>
            <button className="btn bg-white text-slate-600 hover:bg-slate-50">Đăng xuất</button>
          </form>
        </div>
      </header>

      {!coFacebook() && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Chưa cấu hình Facebook (FB_PAGE_ID, FB_PAGE_TOKEN): vẫn soạn và tải ảnh được, nhưng chưa đăng thẳng lên Fanpage được.
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Lỗi đọc dữ liệu: {error.message}. Đã chạy file supabase/schema.sql chưa?
        </p>
      )}

      <nav className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-white p-1">
        {THE.map((t, i) => (
          <Link
            key={t.ma}
            href={t.ma === 'nhap' ? '/' : `/?tt=${t.ma}`}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${
              t.ma === dangXem ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.ten} <span className="opacity-70">({dem[i].count ?? 0})</span>
          </Link>
        ))}
      </nav>

      {dsBai.length === 0 ? (
        <p className="rounded-xl bg-white p-10 text-center text-slate-500">
          {dangXem === 'nhap' ? 'Chưa có bài chờ duyệt. Bấm "Tổng hợp ngay" để AI soạn bài.' : 'Không có bài nào.'}
        </p>
      ) : (
        <div className="space-y-5">
          {dsBai.map((b) => (
            <TheBai key={`${b.id}-${b.trang_thai}`} bai={b} />
          ))}
        </div>
      )}
    </main>
  )
}
