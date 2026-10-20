'use client'

import { useEffect, useState } from 'react'

// Danh sách video đã chuyển thành code JS trong "thư mục lưu" (vd E:\VIDEO_JS): phục dựng hoặc xóa hẳn khỏi máy.

type Quyen = { queryPermission(o: { mode: 'readwrite' }): Promise<PermissionState>; requestPermission(o: { mode: 'readwrite' }): Promise<PermissionState> }

// xin = true chỉ được gọi trong lúc người dùng bấm nút (trình duyệt bắt buộc)
export async function coQuyen(h: FileSystemDirectoryHandle, xin: boolean) {
  const q = h as unknown as Quyen
  if ((await q.queryPermission({ mode: 'readwrite' })) === 'granted') return true
  return xin ? (await q.requestPermission({ mode: 'readwrite' })) === 'granted' : false
}

type MucVideo = { ten: string; h: FileSystemDirectoryHandle; video: string; giay: number; soDoan: number; mb: number }

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

async function quet(goc: FileSystemDirectoryHandle): Promise<MucVideo[]> {
  const ds: MucVideo[] = []
  const muc = (goc as unknown as { values(): AsyncIterable<FileSystemHandle> }).values()
  for await (const h of muc) {
    if (h.kind !== 'directory') continue
    try {
      const thu = h as FileSystemDirectoryHandle
      const t = await (await (await thu.getFileHandle('danh_sach.js')).getFile()).text()
      const info = JSON.parse(t.slice(t.indexOf('(') + 1, t.lastIndexOf(')')))
      ds.push({
        ten: thu.name,
        h: thu,
        video: info.video,
        giay: info.duration_sec,
        soDoan: info.segments.length,
        mb: info.segments.reduce((s: number, x: { size_mb: number }) => s + (x.size_mb || 0), 0),
      })
    } catch {
      // thư mục không phải code JS của video → bỏ qua
    }
  }
  return ds.sort((a, b) => a.ten.localeCompare(b.ten))
}

export default function ThuVien({ thuMuc, onDoiThuMuc, tenDang, lamMoi, onPhucDung, onDaXoa }: {
  thuMuc: FileSystemDirectoryHandle | null
  onDoiThuMuc: (h: FileSystemDirectoryHandle) => void
  tenDang: string | null
  lamMoi: number
  onPhucDung: (h: FileSystemDirectoryHandle) => void
  onDaXoa: (ten: string) => void
}) {
  const [ds, setDs] = useState<MucVideo[] | null>(null)
  const [canQuyen, setCanQuyen] = useState(false)
  const [dangXoa, setDangXoa] = useState('')
  const [loi, setLoi] = useState('')

  useEffect(() => {
    if (!thuMuc) return
    let huy = false
    coQuyen(thuMuc, false).then(async (ok) => {
      if (huy) return
      setCanQuyen(!ok)
      if (ok) setDs(await quet(thuMuc))
    })
    return () => {
      huy = true
    }
  }, [thuMuc, lamMoi])

  async function chonThuMuc() {
    try {
      const h = await window.showDirectoryPicker!({ mode: 'readwrite', id: 'video-js' })
      onDoiThuMuc(h)
    } catch {}
  }

  async function moLai() {
    if (thuMuc && (await coQuyen(thuMuc, true))) {
      setCanQuyen(false)
      setDs(await quet(thuMuc))
    }
  }

  async function xoa(m: MucVideo) {
    const laDang = m.ten === tenDang
    if (
      !confirm(
        `Xóa video "${m.video}"?\n\nToàn bộ ${m.soDoan} tệp code JS (khoảng ${m.mb.toFixed(0)} MB) trong thư mục "${m.ten}" sẽ bị xóa khỏi máy, không khôi phục được.` +
          (laDang ? '\n\nĐây là video đang phục dựng: ảnh khung hình và kịch bản các cảnh của nó cũng bị xóa.' : ''),
      )
    )
      return
    setLoi('')
    setDangXoa(m.ten)
    try {
      if (!thuMuc || !(await coQuyen(thuMuc, true))) throw new Error('Chưa được phép sửa thư mục lưu.')
      await thuMuc.removeEntry(m.ten, { recursive: true })
      onDaXoa(m.ten)
      setDs((cu) => cu?.filter((x) => x.ten !== m.ten) ?? null)
    } catch (e) {
      setLoi(`Không xóa được: ${(e as Error).message}`)
    }
    setDangXoa('')
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-[#0f1b3d]">Video đã chuyển thành code</h2>
        {thuMuc && <span className="chip bg-slate-100 text-slate-600">📁 {thuMuc.name}</span>}
        <button className="btn btn-phu btn-sm ml-auto" onClick={chonThuMuc}>{thuMuc ? 'Đổi thư mục lưu' : 'Chọn thư mục lưu'}</button>
      </div>

      {!thuMuc ? (
        <p className="text-sm text-slate-500">
          Chưa chọn thư mục lưu. Bấm <b>Chọn thư mục lưu</b> (vd thư mục VIDEO_JS ở ổ E) để xem và quản lý các video đã chuyển thành code.
        </p>
      ) : canQuyen ? (
        <button className="btn btn-fb btn-sm" onClick={moLai}>Mở danh sách video (cho phép trang xem thư mục {thuMuc.name})</button>
      ) : !ds ? (
        <p className="text-sm text-slate-500">Đang đọc thư mục…</p>
      ) : !ds.length ? (
        <p className="text-sm text-slate-500">Thư mục {thuMuc.name} chưa có video nào.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {ds.map((m) => (
            <li key={m.ten} className="flex flex-wrap items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800" title={m.video}>
                  {m.video}
                  {m.ten === tenDang && <span className="chip ml-2 bg-violet-100 text-violet-800">🎬 Đang phục dựng</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {mmss(m.giay)} · {m.soDoan} tệp .js · {m.mb >= 1024 ? `${(m.mb / 1024).toFixed(1)} GB` : `${m.mb.toFixed(0)} MB`}
                </p>
              </div>
              <button className="btn btn-phu btn-sm" onClick={() => onPhucDung(m.h)}>② Phục dựng video này</button>
              <button className="btn btn-sm bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100" disabled={!!dangXoa}
                onClick={() => xoa(m)}>
                {dangXoa === m.ten ? 'Đang xóa…' : '🗑 Xóa'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {loi && <p className="mt-2 text-sm font-medium text-red-600">{loi}</p>}
    </div>
  )
}
