// Các giọng đọc Gemini TTS (đọc được tiếng Việt). Dùng được cả server lẫn trình duyệt.
export const DS_GIONG = [
  ['Kore', 'Nữ · rõ ràng, chắc chắn'],
  ['Leda', 'Nữ · trẻ trung'],
  ['Aoede', 'Nữ · nhẹ nhàng'],
  ['Zephyr', 'Nữ · tươi sáng'],
  ['Despina', 'Nữ · mượt mà'],
  ['Sulafat', 'Nữ · ấm áp'],
  ['Achernar', 'Nữ · dịu dàng'],
  ['Charon', 'Nam · trầm, kiểu đọc bản tin'],
  ['Puck', 'Nam · vui vẻ'],
  ['Fenrir', 'Nam · sôi nổi'],
  ['Orus', 'Nam · chắc chắn'],
  ['Iapetus', 'Nam · rõ ràng'],
  ['Algieba', 'Nam · mượt mà'],
  ['Sadaltager', 'Nam · hiểu biết, điềm tĩnh'],
] as const

export const giongHopLe = (g: string | null | undefined): g is string => !!g && DS_GIONG.some(([ma]) => ma === g)
