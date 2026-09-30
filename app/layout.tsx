import type { Metadata } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import './globals.css'
import KhungThongBao from './ThongBao'

const font = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  title: 'Duyệt bài tin công nghệ',
  description: 'AI tổng hợp tin công nghệ, soạn bài và ảnh để đăng Facebook',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" className={`${font.className} h-full antialiased`}>
      <body className="min-h-full text-slate-900">
        {children}
        <KhungThongBao />
      </body>
    </html>
  )
}
