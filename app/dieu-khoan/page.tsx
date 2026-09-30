import type { Metadata } from 'next'
import TrangVanBan from '../TrangVanBan'

const TEN = process.env.TEN_TRANG ?? 'Tin Công Nghệ'

export const metadata: Metadata = { title: `Terms of Service – ${TEN}`, robots: { index: true, follow: true } }

export default function DieuKhoan() {
  return (
    <TrangVanBan tieuDe="Terms of Service" capNhat="September 30, 2026">
      <p>
        {TEN} (&quot;the Service&quot;) is a private tool operated by the owner of the {TEN} Facebook Page and TikTok
        account. It collects public technology news from RSS feeds, uses AI to write short Vietnamese summaries with a
        cover image, and publishes them to the owner&apos;s own social media accounts.
      </p>
      <h2>1. Who can use the Service</h2>
      <p>
        The Service is used only by its owner. There is no public sign-up. By connecting a TikTok or Facebook account,
        you confirm that you own the account and authorize the Service to publish content to it on your behalf.
      </p>
      <h2>2. Content</h2>
      <ul>
        <li>Each post summarizes a public news article and always credits and links to the original source.</li>
        <li>Posts may be generated with the help of AI and can be reviewed and edited before publishing.</li>
        <li>You are responsible for the content published to your accounts and for following TikTok&apos;s and Facebook&apos;s terms and community guidelines.</li>
      </ul>
      <h2>3. Third-party platforms</h2>
      <p>
        Publishing uses the official TikTok and Facebook APIs. Your use of those platforms is also governed by their
        own terms. You can revoke the Service&apos;s access at any time in your TikTok or Facebook account settings.
      </p>
      <h2>4. No warranty</h2>
      <p>
        The Service is provided &quot;as is&quot;, without warranties of any kind. News summaries are for information
        only; please refer to the original source for full details.
      </p>
      <h2>5. Changes</h2>
      <p>These terms may be updated. The date above shows the latest version.</p>
    </TrangVanBan>
  )
}
