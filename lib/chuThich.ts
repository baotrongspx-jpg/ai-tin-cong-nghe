// Ghép nội dung đăng Facebook: bài viết + hashtag + nguồn. Dùng được cả ở server lẫn trình duyệt.
export function taoChuThich(b: { noi_dung: string; hashtag: string[]; nguon_ten: string; nguon_link: string }) {
  const tag = b.hashtag.map((h) => `#${h}`).join(' ')
  return [b.noi_dung.trim(), tag, `📰 Nguồn: ${b.nguon_ten}\n${b.nguon_link}`].filter(Boolean).join('\n\n')
}

// Số hashtag xu hướng thêm vào mỗi bài TikTok (ngoài hashtag riêng của bài). Nhiều quá trông như spam.
export const SO_TAG_XU_HUONG = 3

// Hashtag riêng của bài + vài hashtag xu hướng chưa có, bỏ trùng không phân biệt hoa thường
export function ghepHashtagTikTok(hashtag: string[], xuHuong: string[] = []) {
  const co = new Set(hashtag.map((h) => h.toLowerCase()))
  const them = xuHuong.filter((h) => !co.has(h.toLowerCase())).slice(0, SO_TAG_XU_HUONG)
  return [...hashtag, ...them]
}

// Mô tả cho TikTok: nội dung, nguồn, rồi toàn bộ hashtag ở cuối.
// Bỏ link nguồn vì link trong mô tả TikTok không bấm được, chỉ giữ tên nguồn.
export function taoChuThichTikTok(
  b: { noi_dung: string; hashtag: string[]; nguon_ten: string },
  xuHuong: string[] = [],
) {
  const tag = ghepHashtagTikTok(b.hashtag, xuHuong).map((h) => `#${h}`).join(' ')
  return [b.noi_dung.trim(), `📰 Nguồn: ${b.nguon_ten}`, tag].filter(Boolean).join('\n\n')
}

export const tachHashtag = (s: string) =>
  s.split(/[\s,]+/).map((h) => h.replace(/^#/, '')).filter(Boolean).slice(0, 10)
