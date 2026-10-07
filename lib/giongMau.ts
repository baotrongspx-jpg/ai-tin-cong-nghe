import 'server-only'
import { GIONG } from './dsGiong'
import { docThanhGiong } from './giongDoc'
import { damBaoKho, wavSangMp3 } from './video'

// Giọng mẫu để nghe thử: tạo một lần (tốn 1 lượt Gemini), lưu ở kho video, lần sau lấy lại miễn phí
const CAU_MAU = 'Xin chào, đây là bản tin công nghệ của kênh Công Nghệ 24H. Hôm nay, trí tuệ nhân tạo tiếp tục tạo ra nhiều đột phá đáng chú ý.'
const TEN_TEP = `giong-mau/${GIONG}.mp3`

export async function layGiongMau() {
  const kho = await damBaoKho()
  const { data } = await kho.download(TEN_TEP)
  if (data) return Buffer.from(await data.arrayBuffer())
  const mp3 = await wavSangMp3(await docThanhGiong(CAU_MAU, false))
  await kho.upload(TEN_TEP, mp3, { contentType: 'audio/mpeg', upsert: true })
  return mp3
}
