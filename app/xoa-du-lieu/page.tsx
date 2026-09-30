import type { Metadata } from 'next'
import TrangVanBan from '../TrangVanBan'

const TEN = process.env.TEN_TRANG ?? 'Tin Công Nghệ'

export const metadata: Metadata = { title: `Data Deletion – ${TEN}`, robots: { index: true, follow: true } }

// Trang hướng dẫn xóa dữ liệu, Facebook bắt buộc có khi xuất bản app (App settings → Basic)
export default function XoaDuLieu() {
  return (
    <TrangVanBan tieuDe="Data Deletion Instructions" capNhat="September 30, 2026">
      <p>
        {TEN} only stores access tokens for the owner&apos;s own Facebook Page and TikTok account, plus the posts it
        publishes. It does not collect personal data about other Facebook or TikTok users.
      </p>
      <h2>How to delete your data</h2>
      <ul>
        <li>
          <b>Facebook:</b> go to Facebook → Settings &amp; privacy → Settings → Business integrations (or Apps and
          websites), find &quot;Tin Cong Nghe Bot&quot; and click <b>Remove</b>. The stored Page token stops working
          immediately.
        </li>
        <li>
          <b>TikTok:</b> go to TikTok → Settings and privacy → Security → Manage app permissions, and remove the app.
        </li>
        <li>
          To have all stored tokens and data erased from our database, contact the Page &quot;{TEN}&quot; on Facebook
          with the subject &quot;Data deletion request&quot;. We delete it within 30 days and confirm by message.
        </li>
      </ul>
      <h2>Hướng dẫn xóa dữ liệu (tiếng Việt)</h2>
      <p>
        Gỡ ứng dụng &quot;Tin Cong Nghe Bot&quot; trong phần Cài đặt → Tích hợp doanh nghiệp của Facebook (hoặc Quản
        lý quyền ứng dụng của TikTok). Muốn xóa hẳn dữ liệu đã lưu, nhắn tin cho Fanpage &quot;{TEN}&quot;, chúng tôi
        xóa trong vòng 30 ngày.
      </p>
    </TrangVanBan>
  )
}
