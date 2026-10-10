'use client'

import { useEffect, useRef, useState } from 'react'
import type { DuAnYT } from '@/lib/youtube'
import { thongBao } from '@/app/ThongBao'
import { Xoay } from '@/app/BieuTuong'
import { layNenPhimYouTube, xinLinkTaiNenPhimYouTube, xoaNenPhimYouTube, xongTaiNenPhimYouTube } from '../actions'

type DiaDiem = NonNullable<NonNullable<DuAnYT['phim']>['ho_so']>['dia_diem'][number]

const YEU_CAU = [
  ['Khổ ngang 16:9', 'tối thiểu 1920×1080. Tệp .jpg, .png hoặc .webp, dưới 20 MB.'],
  ['Chỉ có khung cảnh', 'KHÔNG có người hay nhân vật — Mèo Mun, Robot Bit và các nhân vật sẽ đứng phía trước ảnh.'],
  ['Không chữ, không logo', 'không hình mờ (watermark).'],
  ['Nhìn ngang tầm mắt', 'như đứng trong cảnh nhìn thẳng vào; mặt sàn / mặt đất chiếm khoảng 1/4 phía dưới ảnh.'],
  ['Giữa ảnh thoáng', 'không có đồ vật lớn chắn ở giữa (nhân vật đứng giữa và hai bên).'],
  ['Nội dung chính ở dải giữa', 'mép trên và mép dưới có thể bị cắt bớt; phần dưới cùng mờ dần vào sàn sân khấu.'],
  ['Đồng bộ', 'mọi địa điểm cùng một kiểu ảnh (cùng ảnh thật, hoặc cùng một kiểu vẽ).'],
]

const CHI_TIET: [keyof DiaDiem, string][] = [
  ['kien_truc', 'Kiến trúc'], ['noi_that', 'Nội thất'], ['ngoai_that', 'Ngoại thất'], ['mau_sac', 'Màu sắc'],
  ['anh_sang', 'Ánh sáng'], ['thoi_tiet', 'Thời tiết'], ['dao_cu', 'Đồ vật'], ['khong_khi', 'Không khí'],
]

// Lời nhắn để tạo ảnh bằng công cụ AI (Notebook, Gemini…) cho đúng địa điểm và đúng yêu cầu ảnh nền
const loiNhan = (x: DiaDiem) =>
  [
    `Tạo ảnh nền khổ ngang 16:9 (1920×1080 trở lên), KHÔNG có người, không chữ, không logo: ${x.ten}, ${[x.thanh_pho, x.quoc_gia].filter(Boolean).join(', ')}, thời kỳ ${x.thoi_ky}.`,
    ...CHI_TIET.map(([k, ten]) => (x[k] ? `${ten}: ${x[k]}.` : '')).filter(Boolean),
    'Góc nhìn ngang tầm mắt, mặt sàn chiếm khoảng 1/4 phía dưới, giữa ảnh để trống cho nhân vật đứng.',
  ].join('\n')

// Phim tiểu sử có hồ sơ: mỗi địa điểm trong hồ sơ một ô ảnh nền. Lúc dựng, AI gắn từng cảnh vào địa điểm rồi máy nhà dùng
// ảnh của bạn làm nền cảnh đó (thay tranh Pixabay / cảnh vẽ)
export default function NenPhim({ d, onDuAn }: { d: DuAnYT; onDuAn: (d: DuAnYT) => void }) {
  const dsDiaDiem = d.phim?.ho_so?.dia_diem ?? []
  const [xem, setXem] = useState<Record<string, string>>({})
  const [dem, setDem] = useState<Record<string, number>>({})
  const [dang, setDang] = useState<string | null>(null)
  const [moChiTiet, setMoChiTiet] = useState<string | null>(null)
  const chon = useRef<HTMLInputElement>(null)
  const dangChon = useRef('')
  const nen = d.phim?.nen ?? {}
  const co = dsDiaDiem.filter((x) => nen[x.ma]).length
  const daGan = Object.keys(dem).length > 0

  const lamMoi = async () => {
    const kq = await layNenPhimYouTube(d.id)
    if (kq.ok) {
      setXem(kq.xem)
      setDem(kq.dem)
    }
  }
  useEffect(() => {
    const t = setTimeout(() => void lamMoi(), 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.id, JSON.stringify(nen)])

  const taiLen = async (f: File | undefined) => {
    const ma = dangChon.current
    if (!f || !ma) return
    if (!/\.(jpe?g|png|webp)$/i.test(f.name)) return thongBao('loi', 'Chỉ nhận ảnh .jpg, .png, .webp')
    if (f.size > 20 * 1024 * 1024) return thongBao('loi', 'Ảnh quá lớn (tối đa 20 MB)')
    setDang(ma)
    try {
      const kq = await xinLinkTaiNenPhimYouTube(d.id, ma, f.name)
      if (!kq.ok) throw new Error(kq.loi)
      const res = await fetch(kq.url, { method: 'PUT', body: f, headers: { 'content-type': f.type || 'image/jpeg', 'x-upsert': 'true' } })
      if (!res.ok) throw new Error(`Tải lên lỗi ${res.status}`)
      const xong = await xongTaiNenPhimYouTube(d.id, ma, kq.tep)
      if (!xong.ok) throw new Error(xong.loi)
      onDuAn(xong.duAn)
      thongBao('ok', `Đã tải ảnh nền: ${dsDiaDiem.find((x) => x.ma === ma)?.ten ?? ma}`)
    } catch (e) {
      thongBao('loi', e instanceof Error ? e.message : 'Tải lên lỗi')
    } finally {
      setDang(null)
      if (chon.current) chon.current.value = ''
    }
  }

  const xoa = async (ma: string) => {
    setDang(ma)
    const kq = await xoaNenPhimYouTube(d.id, ma)
    if (kq.ok) onDuAn(kq.duAn)
    else thongBao('loi', kq.loi)
    setDang(null)
  }

  const chep = async (x: DiaDiem) => {
    try {
      await navigator.clipboard.writeText(loiNhan(x))
      thongBao('ok', 'Đã chép lời nhắn tạo ảnh — dán vào công cụ AI tạo ảnh')
    } catch {
      thongBao('loi', 'Không chép được, hãy bấm "Chi tiết" rồi tự bôi đen chép')
    }
  }

  if (!dsDiaDiem.length) return null
  return (
    <section className="the grid gap-4 p-5">
      <div>
        <h2 className="font-bold">🖼 Ảnh nền phim này cần ({co}/{dsDiaDiem.length} địa điểm đã có ảnh)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Danh sách lấy từ <b>hồ sơ phim</b>: mỗi địa điểm câu chuyện diễn ra cần một ảnh nền. Bạn tải ảnh cho địa điểm nào thì khi bấm <b>Dựng video</b>, AI tự gắn
          các cảnh ở địa điểm đó và máy nhà dùng ảnh của bạn làm nền. Địa điểm chưa có ảnh vẫn dùng nền như cũ. Đổi ảnh thì bấm Dựng lại để cập nhật.
        </p>
      </div>
      <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <h3 className="mb-2 text-sm font-bold text-amber-900">📋 Ảnh nền cần như thế nào</h3>
        <ul className="grid gap-1.5 text-sm text-amber-950">
          {YEU_CAU.map(([dau, sau]) => (
            <li key={dau}>
              • <b>{dau}:</b> {sau}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-amber-800">Mẹo: bấm <b>Chép lời nhắn</b> ở mỗi địa điểm để dán vào công cụ AI tạo ảnh — lời nhắn đã có đủ mô tả và yêu cầu trên.</p>
      </div>
      <input ref={chon} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void taiLen(e.target.files?.[0])} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {dsDiaDiem.map((x) => (
          <div key={x.ma} className="grid content-start gap-2 rounded-xl p-3 ring-1 ring-slate-200">
            {xem[x.ma] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={xem[x.ma]} alt={x.ten} className="aspect-video w-full rounded-lg bg-slate-100 object-cover" />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-400">
                {nen[x.ma] ? <Xoay /> : 'Chưa có ảnh'}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold">{x.ten}</p>
              <p className="text-xs text-slate-500">
                {[x.thanh_pho, x.quoc_gia].filter(Boolean).join(', ')} · {x.thoi_ky}
                {daGan && <> · {dem[x.ma] ? `dùng cho ${dem[x.ma]} cảnh` : 'chưa cảnh nào gắn'}</>}
              </p>
            </div>
            {moChiTiet === x.ma && (
              <ul className="grid gap-1 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                {CHI_TIET.map(([k, ten]) => (x[k] ? <li key={k}><b>{ten}:</b> {x[k]}</li> : null))}
              </ul>
            )}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="btn btn-sm btn-phu"
                disabled={!!dang}
                onClick={() => {
                  dangChon.current = x.ma
                  chon.current?.click()
                }}
              >
                {dang === x.ma ? <Xoay /> : nen[x.ma] ? 'Thay ảnh' : 'Tải ảnh'}
              </button>
              <button type="button" className="btn btn-sm btn-nhat" onClick={() => void chep(x)}>Chép lời nhắn</button>
              <button type="button" className="btn btn-sm btn-nhat" onClick={() => setMoChiTiet(moChiTiet === x.ma ? null : x.ma)}>
                {moChiTiet === x.ma ? 'Ẩn chi tiết' : 'Chi tiết'}
              </button>
              {nen[x.ma] && (
                <button type="button" className="btn btn-sm btn-nhat" disabled={!!dang} onClick={() => void xoa(x.ma)}>Xoá</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
