import type { ReactNode } from 'react'

// Khung chung cho các trang văn bản công khai (điều khoản, bảo mật), không cần đăng nhập
export default function TrangVanBan({ tieuDe, capNhat, children }: { tieuDe: string; capNhat: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <article className="space-y-4 rounded-2xl bg-white p-6 leading-relaxed shadow-sm sm:p-10 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-6">
        <h1 className="text-2xl font-bold">{tieuDe}</h1>
        <p className="text-sm text-slate-500">Last updated: {capNhat}</p>
        {children}
      </article>
    </main>
  )
}
