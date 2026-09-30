import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Ảnh xem trước khi gửi link CV qua Zalo, Facebook
export const alt = 'CV Nông Bảo Trọng – Ứng tuyển Trợ lý'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const [dam, vua] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/BeVietnamPro-Bold.ttf')),
    readFile(join(process.cwd(), 'assets/fonts/BeVietnamPro-Medium.ttf')),
  ])
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', fontFamily: 'BVP', backgroundColor: '#ffffff' }}>
        <div
          style={{
            width: 380, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#0f1b3d', borderRight: '14px solid #fbbf24',
          }}
        >
          <div
            style={{
              width: 190, height: 190, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: '#16275a', border: '8px solid #fbbf24', color: '#fcd34d', fontSize: 76, fontWeight: 700,
            }}
          >
            BT
          </div>
          <div style={{ display: 'flex', marginTop: 28, color: '#fcd34d', fontSize: 22, fontWeight: 500, letterSpacing: 6 }}>
            CURRICULUM VITAE
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 64px' }}>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 700, color: '#0f1b3d', lineHeight: 1.05 }}>NÔNG BẢO TRỌNG</div>
          <div
            style={{
              display: 'flex', marginTop: 26, padding: '10px 22px', backgroundColor: '#fffbeb', borderLeft: '8px solid #fbbf24',
              color: '#b45309', fontSize: 34, fontWeight: 700,
            }}
          >
            Ứng tuyển: Trợ lý – Buôn Ma Thuột
          </div>
          <div style={{ display: 'flex', marginTop: 34, color: '#334155', fontSize: 28, fontWeight: 500, lineHeight: 1.4 }}>
            Trợ lý Giám đốc · 2 năm vận hành cụm 12 kho SPX Express · Tự xây công cụ báo cáo, Fanpage & TikTok
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'BVP', data: dam, weight: 700, style: 'normal' },
        { name: 'BVP', data: vua, weight: 500, style: 'normal' },
      ],
    },
  )
}
