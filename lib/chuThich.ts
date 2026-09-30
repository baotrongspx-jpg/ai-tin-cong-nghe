// Ghép nội dung đăng Facebook: bài viết + hashtag + nguồn. Dùng được cả ở server lẫn trình duyệt.
export function taoChuThich(b: { noi_dung: string; hashtag: string[]; nguon_ten: string; nguon_link: string }) {
  const tag = b.hashtag.map((h) => `#${h}`).join(' ')
  return [b.noi_dung.trim(), tag, `📰 Nguồn: ${b.nguon_ten}\n${b.nguon_link}`].filter(Boolean).join('\n\n')
}

// Mô tả cho TikTok: TikTok chỉ hiện vài dòng đầu, nên đưa hashtag lên ngay sau đoạn mở đầu.
// Bỏ link nguồn vì link trong mô tả TikTok không bấm được, chỉ giữ tên nguồn.
export function taoChuThichTikTok(b: { noi_dung: string; hashtag: string[]; nguon_ten: string }) {
  const [moDau, ...conLai] = b.noi_dung.trim().split(/\n\s*\n/)
  const tag = b.hashtag.map((h) => `#${h}`).join(' ')
  return [moDau, tag, ...conLai, `📰 Nguồn: ${b.nguon_ten}`].filter(Boolean).join('\n\n')
}

export const tachHashtag = (s: string) =>
  s.split(/[\s,]+/).map((h) => h.replace(/^#/, '')).filter(Boolean).slice(0, 10)
