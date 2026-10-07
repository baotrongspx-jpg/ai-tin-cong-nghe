import 'server-only'
import { GIONG, GIONG_DU_PHONG } from './dsGiong'
import { coVieNeu, docBangVieNeu, docThanhGiong } from './giongDoc'
import { damBaoKho, wavSangMp3 } from './video'

// Giọng mẫu để nghe thử: tạo một lần, lưu ở kho video, lần sau lấy lại luôn
const CAU_MAU = ['Xin chào, đây là bản tin công nghệ của kênh Công Nghệ 24H.', 'Hôm nay, trí tuệ nhân tạo tiếp tục tạo ra nhiều đột phá đáng chú ý.']
// Tên tệp không dấu (kho không nhận chữ có dấu)
const tenTep = (giong: string) => `giong-mau/${giong.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').replace(/\s+/g, '-')}.mp3`

export async function layGiongMau() {
  const vieNeu = coVieNeu()
  const ten = tenTep(vieNeu ? GIONG : GIONG_DU_PHONG)
  const kho = await damBaoKho()
  const { data } = await kho.download(ten)
  if (data) return Buffer.from(await data.arrayBuffer())
  const wav = vieNeu ? (await docBangVieNeu(CAU_MAU)).wav : await docThanhGiong(CAU_MAU.join(' '), false)
  const mp3 = await wavSangMp3(wav)
  await kho.upload(ten, mp3, { contentType: 'audio/mpeg', upsert: true })
  return mp3
}
