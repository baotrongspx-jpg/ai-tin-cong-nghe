// Huy hiệu thương hiệu (chủ trang 15/10/2026: "câu thoại có Facebook thì có biểu tượng Facebook"). Không chép logo gốc:
// mỗi thương hiệu là một ô bo góc màu đặc trưng + chữ / ký hiệu ngắn, đủ để người xem nhận ra ngay. Lời thoại nhắc tên
// thương hiệu (re) thì huy hiệu bật lên ở góc trên trong câu đó. Bước chuẩn bị hành động (trang dự án) gắn thêm logo cho
// thương hiệu ngoài danh sách này (l.logo: [{ ten, mau, chu }]).
// [mã, tên, màu nền, chữ trên huy hiệu, màu chữ, biểu thức nhận ra trong lời thoại (chữ thường)]
export const LOGO = [
  ['facebook', 'Facebook', '#1877F2', 'f', '#ffffff', /facebook|\bfb\b/],
  ['meta', 'Meta', '#0866FF', 'Meta', '#ffffff', /\bmeta\b/],
  ['instagram', 'Instagram', '#E1306C', 'IG', '#ffffff', /instagram/],
  ['whatsapp', 'WhatsApp', '#25D366', 'WA', '#ffffff', /whatsapp/],
  ['messenger', 'Messenger', '#0084FF', 'M', '#ffffff', /messenger/],
  ['google', 'Google', '#4285F4', 'G', '#ffffff', /google/],
  ['youtube', 'YouTube', '#FF0000', '▶', '#ffffff', /youtube/],
  ['apple', 'Apple', '#111827', 'Apple', '#ffffff', /\bapple\b|iphone|macbook|\bipad\b/],
  ['microsoft', 'Microsoft', '#0078D4', 'MS', '#ffffff', /microsoft|windows/],
  ['amazon', 'Amazon', '#FF9900', 'a', '#111827', /amazon/],
  ['nvidia', 'Nvidia', '#76B900', 'NV', '#ffffff', /nvidia/],
  ['openai', 'OpenAI', '#10A37F', 'AI', '#ffffff', /openai/],
  ['chatgpt', 'ChatGPT', '#10A37F', 'GPT', '#ffffff', /chatgpt/],
  ['tesla', 'Tesla', '#CC0000', 'T', '#ffffff', /tesla/],
  ['spacex', 'SpaceX', '#111827', 'SX', '#ffffff', /spacex/],
  ['tiktok', 'TikTok', '#000000', '♪', '#25F4EE', /tiktok/],
  ['x', 'X (Twitter)', '#000000', '𝕏', '#ffffff', /twitter|\bx\.com\b/],
  ['samsung', 'Samsung', '#1428A0', 'S', '#ffffff', /samsung/],
  ['intel', 'Intel', '#0071C5', 'intel', '#ffffff', /\bintel\b/],
  ['amd', 'AMD', '#ED1C24', 'AMD', '#ffffff', /\bamd\b/],
  ['netflix', 'Netflix', '#E50914', 'N', '#ffffff', /netflix/],
  ['sega', 'Sega', '#0060A8', 'SEGA', '#ffffff', /\bsega\b/],
  ['harvard', 'Harvard', '#A51C30', 'H', '#ffffff', /harvard/],
  ['stanford', 'Stanford', '#8C1515', 'S', '#ffffff', /stanford/],
  ['vinfast', 'VinFast', '#1464F4', 'V', '#ffffff', /vinfast/],
  ['vingroup', 'Vingroup', '#C8102E', 'V', '#ffffff', /vingroup/],
  ['viettel', 'Viettel', '#EE0033', 'V', '#ffffff', /viettel/],
  ['zalo', 'Zalo', '#0068FF', 'Zalo', '#ffffff', /\bzalo\b/],
  ['shopee', 'Shopee', '#EE4D2D', 'S', '#ffffff', /shopee/],
  ['grab', 'Grab', '#00B14F', 'G', '#ffffff', /\bgrab\b/],
  ['bitcoin', 'Bitcoin', '#F7931A', '₿', '#ffffff', /bitcoin/],
  ['linkedin', 'LinkedIn', '#0A66C2', 'in', '#ffffff', /linkedin/],
  ['snapchat', 'Snapchat', '#FFFC00', '👻', '#111827', /snapchat/],
  ['paypal', 'PayPal', '#003087', 'P', '#ffffff', /paypal/],
  ['alibaba', 'Alibaba', '#FF6A00', 'A', '#ffffff', /alibaba|taobao/],
  ['huawei', 'Huawei', '#CF0A2C', 'H', '#ffffff', /huawei/],
  ['xiaomi', 'Xiaomi', '#FF6900', 'mi', '#ffffff', /xiaomi/],
]
// Các thương hiệu lời thoại nhắc tới (theo thứ tự xuất hiện), tối đa 2
export function logoTrongCau(chu) {
  const c = String(chu ?? '').toLowerCase()
  return LOGO.map(([ma, ten, mau, kyHieu, mauChu, re]) => ({ ma, ten, mau, chu: kyHieu, mauChu, viTri: c.search(re) }))
    .filter((x) => x.viTri >= 0)
    .sort((a, b) => a.viTri - b.viTri)
    .slice(0, 2)
}
