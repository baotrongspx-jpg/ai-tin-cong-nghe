// Đổi token Facebook ngắn hạn (1–2 giờ) thành token Fanpage không hết hạn, ghi vào .env.local.
// Cách dùng: điền FB_APP_ID, FB_APP_SECRET, FB_USER_TOKEN trong .env.local rồi chạy
//   npm run token-fb            (nhiều Fanpage thì thêm tên: npm run token-fb -- "Tên trang")
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = '.env.local'
const PB = process.env.FB_GRAPH_VERSION ?? 'v26.0'
let env = readFileSync(FILE, 'utf8')
const lay = (k) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim() ?? ''
const ghi = (k, v) => {
  env = new RegExp(`^${k}=`, 'm').test(env)
    ? env.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`)
    : `${env.trimEnd()}\n${k}=${v}\n`
}

const appId = lay('FB_APP_ID')
const appSecret = lay('FB_APP_SECRET')
const userToken = lay('FB_USER_TOKEN')
if (!appId || !appSecret || !userToken) {
  console.error('Thiếu FB_APP_ID, FB_APP_SECRET hoặc FB_USER_TOKEN trong .env.local')
  process.exit(1)
}

const goi = async (url) => {
  const data = await (await fetch(url)).json()
  if (data.error) throw new Error(data.error.message)
  return data
}

// 1. Token người dùng ngắn hạn → dài hạn (60 ngày)
const dai = await goi(
  `https://graph.facebook.com/${PB}/oauth/access_token?grant_type=fb_exchange_token` +
    `&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(userToken)}`,
)

// 2. Token Fanpage lấy từ token dài hạn thì không hết hạn
const { data: trang } = await goi(
  `https://graph.facebook.com/${PB}/me/accounts?fields=id,name,access_token,tasks&limit=100&access_token=${dai.access_token}`,
)
if (!trang?.length) {
  console.error('Không thấy Fanpage nào. Lúc tạo token nhớ chọn Fanpage và cấp quyền pages_manage_posts.')
  process.exit(1)
}

const tenMuon = process.argv[2]?.toLowerCase()
const chon = tenMuon ? trang.find((p) => p.name.toLowerCase().includes(tenMuon)) : trang.length === 1 ? trang[0] : null
if (!chon) {
  console.log('Tài khoản có nhiều Fanpage, chạy lại kèm tên trang muốn đăng:')
  trang.forEach((p) => console.log(`  npm run token-fb -- "${p.name}"`))
  process.exit(1)
}

ghi('FB_PAGE_ID', chon.id)
ghi('FB_PAGE_TOKEN', chon.access_token)
ghi('FB_USER_TOKEN', '') // không cần nữa
writeFileSync(FILE, env)
console.log(`Xong! Đã lưu token của Fanpage "${chon.name}" vào .env.local`)
if (!chon.tasks?.includes('CREATE_CONTENT')) console.log('Cảnh báo: tài khoản không có quyền đăng bài trên trang này.')
