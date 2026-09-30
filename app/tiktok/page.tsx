import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db, type BaiViet } from '@/lib/db'
import { daDangNhap } from '@/lib/xacThuc'
import { coTikTok, daKetNoiTikTok, layTaiKhoanTikTok, type TaiKhoanTikTok } from '@/lib/tiktok'
import { layHashtagXuHuong } from '@/lib/xuHuong'
import { SO_TAG_XU_HUONG } from '@/lib/chuThich'
import DauTrang from '../DauTrang'
import XuHuong from './XuHuong'
import TheTikTok from './TheTikTok'

// Nút "Tổng hợp ngay" ở đầu trang chạy AI trong Server Action, cần thời gian dài
export const maxDuration = 300

const THE = [
  { ma: 'chua', ten: 'Chưa đăng TikTok' },
  { ma: 'da', ten: 'Đã đăng TikTok' },
] as const

// Bài chưa lên TikTok: bài chờ duyệt hoặc đã lên Facebook (bỏ qua bài bị bỏ và bài lỗi)
const locChua = () =>
  db().from('bai_viet').select('*', { count: 'exact' }).is('tiktok_publish_id', null).in('trang_thai', ['nhap', 'da_dang'])
const locDa = () => db().from('bai_viet').select('*', { count: 'exact' }).not('tiktok_publish_id', 'is', null)

export default async function TrangTikTok({ searchParams }: PageProps<'/tiktok'>) {
  if (!(await daDangNhap())) redirect('/dang-nhap')

  const dangXem = (await searchParams).tt === 'da' ? 'da' : 'chua'
  const cauHinh = coTikTok()
  const ketNoi = cauHinh && (await daKetNoiTikTok())

  let taiKhoan: TaiKhoanTikTok | null = null
  let loiTaiKhoan: string | null = null
  if (ketNoi) {
    try {
      taiKhoan = await layTaiKhoanTikTok()
    } catch (e) {
      loiTaiKhoan = e instanceof Error ? e.message : String(e)
    }
  }

  const [ds, demChua, demDa, xuHuong] = await Promise.all([
    (dangXem === 'da'
      ? locDa().order('tiktok_dang_luc', { ascending: false })
      : locChua().order('tao_luc', { ascending: false })
    ).limit(50),
    locChua().limit(0),
    locDa().limit(0),
    layHashtagXuHuong(),
  ])
  const dsBai = (ds.data ?? []) as BaiViet[]
  const dem = { chua: demChua.count ?? 0, da: demDa.count ?? 0 }

  const oTaiKhoan = !cauHinh ? null : (
    <div className="flex items-center gap-3 rounded-xl bg-white p-2 pr-3 shadow-sm">
      {taiKhoan ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={taiKhoan.creator_avatar_url} alt="" className="h-9 w-9 rounded-full bg-slate-200" />
          <div className="text-sm leading-tight">
            <div className="font-bold">{taiKhoan.creator_nickname}</div>
            <div className="text-slate-500">@{taiKhoan.creator_username}</div>
          </div>
        </>
      ) : (
        <span className="px-2 text-sm text-slate-500">{ketNoi ? 'Không đọc được tài khoản' : 'Chưa kết nối tài khoản'}</span>
      )}
      <a href="/api/tiktok/ket-noi" className="btn bg-slate-900 py-1.5 text-white hover:bg-black">
        {ketNoi ? 'Kết nối lại' : 'Kết nối TikTok'}
      </a>
    </div>
  )

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <DauTrang
        dangO="tiktok"
        moTa="Đăng ảnh bài viết lên TikTok, TikTok tự thêm nhạc. Nội dung sửa ở trang Facebook."
        them={oTaiKhoan}
      />

      {!cauHinh && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Chưa cấu hình TikTok (TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET trên Vercel).
        </p>
      )}
      {loiTaiKhoan && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {loiTaiKhoan}. Thử bấm &quot;Kết nối lại&quot;.
        </p>
      )}
      {ketNoi && (
        <p className="mb-4 text-xs text-slate-500">
          TikTok giới hạn khoảng 6 lần đăng mỗi phút: đăng từng bài, cách nhau vài giây.
        </p>
      )}

      <nav className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-white p-1">
        {THE.map((t) => (
          <Link
            key={t.ma}
            href={t.ma === 'chua' ? '/tiktok' : '/tiktok?tt=da'}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${
              t.ma === dangXem ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.ten} <span className="opacity-70">({dem[t.ma]})</span>
          </Link>
        ))}
      </nav>

      {dsBai.length === 0 ? (
        <p className="rounded-xl bg-white p-10 text-center text-slate-500">
          {dangXem === 'chua' ? 'Bài nào cũng đã lên TikTok.' : 'Chưa đăng bài nào lên TikTok.'}
        </p>
      ) : (
        <div className="space-y-5">
          {dsBai.map((b) => (
            <TheTikTok
              key={`${b.id}-${b.tiktok_publish_id}`}
              bai={b}
              xuHuong={xuHuong.ds}
              taiKhoan={
                taiKhoan && {
                  khoaBinhLuan: taiKhoan.comment_disabled,
                }
              }
            />
          ))}
        </div>
      )}

      <div className="mt-8">
        <XuHuong ds={xuHuong.ds} luc={xuHuong.luc} soThem={SO_TAG_XU_HUONG} />
      </div>
    </main>
  )
}
