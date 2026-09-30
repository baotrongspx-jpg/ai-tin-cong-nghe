import type { Metadata } from 'next'
import TrangVanBan from '../TrangVanBan'

const TEN = process.env.TEN_TRANG ?? 'Tin Công Nghệ'

export const metadata: Metadata = { title: `Privacy Policy – ${TEN}`, robots: { index: true, follow: true } }

export default function BaoMat() {
  return (
    <TrangVanBan tieuDe="Privacy Policy" capNhat="September 30, 2026">
      <p>
        This policy explains what data {TEN} (&quot;the Service&quot;) handles. The Service is a private publishing tool
        used only by its owner to post technology news summaries to the owner&apos;s own TikTok and Facebook accounts.
      </p>
      <h2>1. Data we collect</h2>
      <ul>
        <li>
          <b>TikTok:</b> when the owner connects a TikTok account, we receive an access token, a refresh token and the
          account&apos;s open ID (scopes <code>user.info.basic</code> and <code>video.publish</code>). We also read the
          account&apos;s allowed privacy options before posting.
        </li>
        <li><b>Facebook:</b> a Page access token for the owner&apos;s Facebook Page.</li>
        <li><b>Content:</b> public news headlines and links from RSS feeds, and the posts generated from them.</li>
      </ul>
      <p>We do not collect data about TikTok or Facebook viewers, followers or any other users.</p>
      <h2>2. How we use it</h2>
      <p>
        Tokens are used only to publish posts that the owner created or approved to the owner&apos;s own accounts. We
        do not sell, share or use this data for advertising.
      </p>
      <h2>3. Storage and security</h2>
      <p>
        Data is stored in a private database accessible only by the Service&apos;s server. Tokens are never shown in
        the browser or shared with third parties, except the platform they belong to.
      </p>
      <h2>4. Your choices</h2>
      <p>
        You can disconnect the Service at any time by revoking its access in your TikTok or Facebook account
        settings. Stored tokens then stop working and are deleted on request.
      </p>
      <h2>5. Changes</h2>
      <p>This policy may be updated. The date above shows the latest version.</p>
    </TrangVanBan>
  )
}
