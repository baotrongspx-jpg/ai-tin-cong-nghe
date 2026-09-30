import { redirect } from 'next/navigation'
import { daDangNhap } from '@/lib/xacThuc'
import { coFacebook } from '@/lib/facebook'
import { dsDaAn, layBinhLuan, laSpam, ThieuQuyen, type BinhLuan } from '@/lib/binhLuan'
import DauTrang, { CanhBao, ThanhLoc, TieuDeTrang, Trong } from '../DauTrang'
import TheBinhLuan, { TheDaAn } from './TheBinhLuan'

// Nút "Tổng hợp ngay" ở đầu trang chạy AI trong Server Action, cần thời gian dài
export const maxDuration = 300

const THE = [
  { ma: 'chua', ten: 'Chưa trả lời' },
  { ma: 'tat_ca', ten: 'Tất cả' },
  { ma: 'da_an', ten: '🧹 Đã ẩn' },
] as const

export default async function TrangBinhLuan({ searchParams }: PageProps<'/binh-luan'>) {
  if (!(await daDangNhap())) redirect('/dang-nhap')
  const tt = (await searchParams).tt
  const dangXem = THE.find((t) => t.ma === tt)?.ma ?? 'chua'

  let ds: BinhLuan[] = []
  let thieuQuyen: string | null = null
  try {
    ds = await layBinhLuan(7)
  } catch (e) {
    if (e instanceof ThieuQuyen) thieuQuyen = e.message
    else throw e
  }
  const daAn = await dsDaAn()
  const idAn = new Set(daAn.map((x) => x.id))
  const hien = ds.filter((c) => !idAn.has(c.id))
  const chuaTraLoi = hien.filter((c) => !c.daTraLoi)
  const dsXem = dangXem === 'chua' ? chuaTraLoi : hien

  return (
    <>
      <DauTrang dangO="binh_luan" />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <TieuDeTrang
          ten="Bình luận Facebook"
          moTa="Bình luận 7 ngày gần đây của các bài trên Fanpage. AI gợi ý câu trả lời, bình luận spam được tự ẩn mỗi giờ."
        />

        {!coFacebook() && <CanhBao>Chưa cấu hình Facebook (FB_PAGE_ID, FB_PAGE_TOKEN).</CanhBao>}
        {thieuQuyen && (
          <CanhBao>
            <b>Chưa đọc được bình luận:</b> token Facebook cần thêm quyền <code>pages_read_user_content</code> (đọc) và{' '}
            <code>pages_manage_engagement</code> (trả lời, ẩn). Vào Graph API Explorer → thêm 2 quyền này (giữ các quyền cũ) →
            Generate Access Token → <code>npm run token-fb</code>, rồi thay <code>FB_PAGE_TOKEN</code> trên Vercel và Redeploy.
            <span className="mt-1.5 block text-xs opacity-75">Facebook báo: {thieuQuyen}</span>
          </CanhBao>
        )}

        <ThanhLoc
          dangXem={dangXem}
          mauBat="bg-sky-600 text-white"
          ds={[
            { ma: 'chua', ten: 'Chưa trả lời', href: '/binh-luan', so: chuaTraLoi.length },
            { ma: 'tat_ca', ten: 'Tất cả', href: '/binh-luan?tt=tat_ca', so: hien.length },
            { ma: 'da_an', ten: '🧹 Đã ẩn', href: '/binh-luan?tt=da_an', so: daAn.length },
          ]}
        />

        {dangXem === 'da_an' ? (
          daAn.length === 0 ? (
            <Trong bieuTuong="🧹" tieuDe="Chưa ẩn bình luận nào" goiY="Bình luận có link lạ, số điện thoại, mời vay, cờ bạc… sẽ được tự ẩn và hiện ở đây." />
          ) : (
            <div className="space-y-2.5">
              {[...daAn].reverse().map((c) => (
                <TheDaAn key={c.id} c={c} />
              ))}
            </div>
          )
        ) : dsXem.length === 0 ? (
          <Trong
            bieuTuong={thieuQuyen ? '🔒' : '💬'}
            tieuDe={thieuQuyen ? 'Cần cấp thêm quyền' : dangXem === 'chua' ? 'Đã trả lời hết bình luận' : 'Chưa có bình luận nào'}
            goiY={thieuQuyen ? 'Làm theo hướng dẫn ở khung vàng phía trên.' : 'Bình luận mới trên Fanpage sẽ hiện ở đây.'}
          />
        ) : (
          <div className="space-y-3">
            {dsXem.map((c) => (
              <TheBinhLuan key={c.id} c={c} nghiSpam={laSpam(c.noiDung)} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
