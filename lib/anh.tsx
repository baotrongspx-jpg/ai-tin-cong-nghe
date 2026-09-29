import 'server-only'
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BANG_MAU } from './bangMau'

const fontDam = readFile(join(process.cwd(), 'assets/fonts/BeVietnamPro-Bold.ttf'))
const fontVua = readFile(join(process.cwd(), 'assets/fonts/BeVietnamPro-Medium.ttf'))

export type DuLieuAnh = {
  tieuDe: string
  chuDe: string
  nguon: string
  ngay: string // đã định dạng dd/mm/yyyy
  mau: number
}

// Vẽ ảnh cho một bài viết (dùng ở link ảnh và khi đăng Facebook)
export function veAnhBai(b: {
  tieu_de_anh: string
  chu_de: string
  nguon_ten: string
  ngay_bao: string | null
  tao_luc: string
  mau_anh: number
}) {
  const ngay = new Date(b.ngay_bao ?? b.tao_luc).toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return veAnh({ tieuDe: b.tieu_de_anh, chuDe: b.chu_de, nguon: b.nguon_ten, ngay, mau: b.mau_anh })
}

// Chữ dài thì nhỏ lại để luôn vừa khung
const coChu = (s: string) => (s.length <= 40 ? 92 : s.length <= 60 ? 80 : s.length <= 80 ? 68 : 58)

export async function veAnh(d: DuLieuAnh) {
  const m = BANG_MAU[((d.mau % BANG_MAU.length) + BANG_MAU.length) % BANG_MAU.length]
  const tenTrang = process.env.TEN_TRANG ?? 'Tin Công Nghệ'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          color: 'white',
          fontFamily: 'BVP',
          backgroundImage: `linear-gradient(135deg, ${m.nen1} 0%, ${m.nen1} 45%, ${m.nen2} 100%)`,
          position: 'relative',
        }}
      >
        {/* Vòng tròn trang trí */}
        <div
          style={{
            position: 'absolute', right: -180, top: -180, width: 620, height: 620,
            borderRadius: 9999, border: `2px solid ${m.nhan}`, opacity: 0.25, display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute', right: -60, top: -60, width: 380, height: 380,
            borderRadius: 9999, backgroundColor: m.nen2, opacity: 0.35, display: 'flex',
          }}
        />

        {/* Đầu: tên trang + chủ đề */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', width: 16, height: 56, backgroundColor: m.nhan, borderRadius: 4 }} />
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, letterSpacing: 1 }}>{tenTrang}</div>
        </div>

        {/* Giữa: tiêu đề */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {d.chuDe && (
            <div style={{ display: 'flex' }}>
              <div
                style={{
                  display: 'flex', fontSize: 34, fontWeight: 700, color: m.nen1,
                  backgroundColor: m.nhan, padding: '10px 28px', borderRadius: 999,
                  textTransform: 'uppercase',
                }}
              >
                {d.chuDe}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', fontSize: coChu(d.tieuDe), fontWeight: 700, lineHeight: 1.2 }}>
            {d.tieuDe}
          </div>
        </div>

        {/* Chân: nguồn + ngày */}
        <div
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 30, fontWeight: 500, opacity: 0.85,
            borderTop: '2px solid rgba(255,255,255,0.25)', paddingTop: 28,
          }}
        >
          <div style={{ display: 'flex' }}>Nguồn: {d.nguon}</div>
          <div style={{ display: 'flex' }}>{d.ngay}</div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [
        { name: 'BVP', data: await fontDam, weight: 700, style: 'normal' },
        { name: 'BVP', data: await fontVua, weight: 500, style: 'normal' },
      ],
      headers: { 'Cache-Control': 'public, max-age=300' },
    },
  )
}
