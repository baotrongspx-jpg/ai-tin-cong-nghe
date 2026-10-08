'use client'

import { useState } from 'react'
import type { BaiViet } from '@/lib/db'
import { IconChep, IconMo, IconTai, IconXong, IconYouTube, Xoay } from '@/app/BieuTuong'
import { NutQuyetDinh } from '@/app/PhanDuyet'

// Đăng YouTube Shorts bằng tay: dùng lại video lồng tiếng dọc 9:16 đã dựng cho TikTok (Shorts nhận video dọc dưới 3 phút),
// soạn sẵn tiêu đề + mô tả để chép, mở YouTube Studio để tải lên. Không qua API: app chưa được Google duyệt
// thì video đăng qua API bị khóa ở chế độ riêng tư.
const tieuDeShorts = (t: string) => {
  const duoi = ' #Shorts'
  const toiDa = 100 - duoi.length
  const sach = t.replace(/\s+/g, ' ').trim()
  return (sach.length > toiDa ? `${sach.slice(0, toiDa - 1).replace(/\s+\S*$/, '')}…` : sach) + duoi
}

const moTaShorts = (bai: BaiViet, tags: string[]) =>
  [bai.noi_dung.trim(), `📰 Nguồn: ${bai.nguon_ten}${bai.nguon_link ? ` — ${bai.nguon_link}` : ''}`, tags.map((h) => `#${h}`).join(' ')]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 5000)

function NutChep({ chu }: { chu: string }) {
  const [da, setDa] = useState(false)
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(chu).then(() => {
          setDa(true)
          setTimeout(() => setDa(false), 1500)
        })
      }
      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
    >
      {da ? <IconXong className="h-3.5 w-3.5 text-emerald-600" /> : <IconChep className="h-3.5 w-3.5" />}
      {da ? 'Đã chép' : 'Chép'}
    </button>
  )
}

export default function DangYouTube({
  bai,
  tags,
  video,
  urlTai,
  dangDung,
  xemTruoc,
}: {
  bai: BaiViet
  tags: string[]
  video: string | null
  urlTai: string | null
  dangDung: boolean
  xemTruoc: () => void
}) {
  const [mo, setMo] = useState(false)
  const [tieuDe, setTieuDe] = useState(() => tieuDeShorts(bai.tieu_de_anh))
  const [moTa, setMoTa] = useState(() => moTaShorts(bai, tags))

  if (!mo)
    return (
      <NutQuyetDinh
        mau="yt"
        icon={<IconYouTube className="h-5 w-5" />}
        ten="Đăng YouTube Shorts"
        moTa="Tải video lồng tiếng + tiêu đề, mô tả soạn sẵn"
        onClick={() => {
          setMo(true)
          if (!video && !dangDung) xemTruoc()
        }}
      />
    )

  return (
    <div className="grid gap-3 rounded-xl p-3 text-sm ring-1 ring-red-200">
      <div className="flex items-center gap-2 font-bold text-red-600">
        <IconYouTube className="h-5 w-5" /> Đăng YouTube Shorts
        <button type="button" onClick={() => setMo(false)} className="ml-auto text-xs font-semibold text-slate-400 hover:text-slate-700">
          Thu gọn
        </button>
      </div>

      <div className="grid gap-1">
        <span className="text-xs font-semibold text-slate-500">1. Tải video về máy</span>
        {video && urlTai ? (
          <a href={urlTai} download className="btn btn-nhat w-full">
            <IconTai className="h-4 w-4" /> Tải video (dọc 9:16)
          </a>
        ) : dangDung ? (
          <span className="flex items-center gap-2 text-xs text-slate-500">
            <Xoay /> Đang dựng video lồng tiếng, xem tiến độ ở cột ảnh bên trái…
          </span>
        ) : (
          <button type="button" onClick={xemTruoc} className="btn btn-nhat w-full">
            Dựng video lồng tiếng
          </button>
        )}
      </div>

      <label className="grid gap-1">
        <span className="flex items-center justify-between text-xs font-semibold text-slate-500">
          2. Tiêu đề ({tieuDe.length}/100) <NutChep chu={tieuDe} />
        </span>
        <input value={tieuDe} maxLength={100} onChange={(e) => setTieuDe(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5" />
      </label>

      <label className="grid gap-1">
        <span className="flex items-center justify-between text-xs font-semibold text-slate-500">
          3. Mô tả <NutChep chu={moTa} />
        </span>
        <textarea value={moTa} maxLength={5000} rows={5} onChange={(e) => setMoTa(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs leading-relaxed" />
      </label>

      <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="btn w-full bg-red-600 text-white hover:bg-red-700">
        <IconMo className="h-4 w-4" /> 4. Mở YouTube Studio
      </a>
      <p className="text-xs leading-relaxed text-slate-500">
        Trong Studio bấm <b>Tạo → Tải video lên</b>, chọn video vừa tải, dán tiêu đề và mô tả, chọn <b>Không, nội dung này không dành cho trẻ em</b>, rồi bấm <b>Xuất bản</b>.
        Nhạc nền chọn ở trang này không có trong file tải về; muốn thêm nhạc thì dùng mục Âm thanh trong Studio.
      </p>
    </div>
  )
}
