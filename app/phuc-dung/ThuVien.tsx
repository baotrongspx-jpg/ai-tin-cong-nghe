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

// laGoc: người dùng chọn thẳng thư mục của một video làm "thư mục lưu"
// dangDo: mã hóa dừng giữa chừng (chưa có danh_sach.js hoặc có nhưng chua_xong)
type MucVideo = { ten: string; h: FileSystemDirectoryHandle; video: string; giay: number; soDoan: number; mb: number; laGoc?: boolean; dangDo?: boolean }

async function docMuc(thu: FileSystemDirectoryHandle): Promise<MucVideo> {
  const t = await thu
    .getFileHandle('danh_sach.js')
    .then((h) => h.getFile())
    .then((f) => f.text(), () => '')
  if (!t) {
    // Chưa có mục lục → làm dở: đếm các tệp doan_XXX.js đã ghi
    let soDoan = 0
    let byte = 0
    for await (const h of (thu as unknown as { values(): AsyncIterable<FileSystemHandle> }).values())
      if (h.kind === 'file' && /^doan_\d+\.m?js$/.test(h.name)) {
        soDoan++
        byte += (await (h as FileSystemFileHandle).getFile()).size
      }
    if (!soDoan) throw new Error('không phải thư mục code JS')
    return { ten: thu.name, h: thu, video: thu.name, giay: soDoan * 8, soDoan, mb: byte / 1_048_576, dangDo: true }
  }
  const info = JSON.parse(t.slice(t.indexOf('(') + 1, t.lastIndexOf(')')))
  return {
    dangDo: !!info.chua_xong,
    ten: thu.name,
    h: thu,
    video: info.video,
    giay: info.duration_sec,
    soDoan: info.segments.length,
    mb: info.segments.reduce((s: number, x: { size_mb: number }) => s + (x.size_mb || 0), 0),
  }
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

async function quet(goc: FileSystemDirectoryHandle): Promise<MucVideo[]> {
  // Chọn nhầm thư mục của chính một video → vẫn hiện video đó
  const chinhNo = await docMuc(goc).catch(() => null)
  if (chinhNo) return [{ ...chinhNo, laGoc: true }]
  const ds: MucVideo[] = []
  const muc = (goc as unknown as { values(): AsyncIterable<FileSystemHandle> }).values()
  for await (const h of muc) {
    if (h.kind !== 'directory') continue
    try {
      ds.push(await docMuc(h as FileSystemDirectoryHandle))
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
      if (m.laGoc) {
        // Không có thư mục cha để xóa giùm → tự xóa chính nó (Chrome/Edge có hàm remove)
        const tuXoa = (m.h as unknown as { remove?: (o: { recursive: boolean }) => Promise<void> }).remove
        if (!tuXoa) throw new Error('trình duyệt này không tự xóa được. Bấm "Đổi thư mục lưu", chọn thư mục cha (VIDEO_JS) rồi xóa.')
        await tuXoa.call(m.h, { recursive: true })
      } else {
        await thuMuc.removeEntry(m.ten, { recursive: true })
      }
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
      ) : ds[0]?.laGoc ? (
        <div>
          <p className="mb-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
            Bạn đang chọn thẳng thư mục của 1 video. Nên bấm <b>Đổi thư mục lưu</b> và chọn thư mục cha (vd <b>VIDEO_JS</b>) để thấy
            mọi video và lưu video mới vào đó.
          </p>
          <DongVideo m={ds[0]} tenDang={tenDang} dangXoa={dangXoa} onPhucDung={onPhucDung} onXoa={xoa} />
        </div>
      ) : !ds.length ? (
        <p className="text-sm text-slate-500">Thư mục {thuMuc.name} chưa có video nào.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {ds.map((m) => (
            <li key={m.ten}>
              <DongVideo m={m} tenDang={tenDang} dangXoa={dangXoa} onPhucDung={onPhucDung} onXoa={xoa} />
            </li>
          ))}
        </ul>
      )}
      {loi && <p className="mt-2 text-sm font-medium text-red-600">{loi}</p>}
    </div>
  )
}

function DongVideo({ m, tenDang, dangXoa, onPhucDung, onXoa }: {
  m: MucVideo
  tenDang: string | null
  dangXoa: string
  onPhucDung: (h: FileSystemDirectoryHandle) => void
  onXoa: (m: MucVideo) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800" title={m.video}>
          {m.video}
          {m.ten === tenDang && <span className="chip ml-2 bg-violet-100 text-violet-800">🎬 Đang phục dựng</span>}
          {m.dangDo && <span className="chip ml-2 bg-amber-100 text-amber-800">⏸ Mã hóa dở</span>}
        </p>
        <p className="text-xs text-slate-500">
          {m.dangDo ? `đã làm tới ${mmss(m.giay)}` : mmss(m.giay)} · {m.soDoan} tệp .js · {m.mb >= 1024 ? `${(m.mb / 1024).toFixed(1)} GB` : `${m.mb.toFixed(0)} MB`}
          {m.dangDo && ' · chọn lại đúng video ở phần dưới rồi bấm Bắt đầu để làm tiếp'}
        </p>
      </div>
      {!m.dangDo && <button className="btn btn-phu btn-sm" onClick={() => onPhucDung(m.h)}>② Phục dựng video này</button>}
      <button className="btn btn-sm bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100" disabled={!!dangXoa} onClick={() => onXoa(m)}>
        {dangXoa === m.ten ? 'Đang xóa…' : '🗑 Xóa'}
      </button>
    </div>
  )
}
