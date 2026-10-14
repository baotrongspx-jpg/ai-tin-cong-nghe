// Bộ hình miệng nhép theo âm (Rhubarb Lip Sync, github.com/DanielSWolf/rhubarb-lip-sync, MIT). Rhubarb nghe giọng đọc
// rồi cho từng mốc thời gian một hình miệng: A (mím: m/b/p), B (hé răng: phần lớn phụ âm), C (mở vừa: e/a ngắn),
// D (há to: a), E (tròn vừa: o/ơ), F (chu môi: u/ô/w), G (răng trên chạm môi dưới: ph/v), H (lưỡi chạm răng: l),
// X (nghỉ). A và X dùng nhóm <id>-mieng-dong sẵn có (miệng khép); các hình còn lại vẽ ở đây thành nhóm <id>-mieng-<chữ>
// (ẩn sẵn), tự co giãn theo vị trí / bề ngang / màu miệng của từng nhân vật.
export const HINH_MIENG = ['B', 'C', 'D', 'E', 'F', 'G', 'H']

const f = (x) => Math.round(x * 10) / 10

// o: { cx, cy (giữa miệng khi há), w (nửa bề ngang miệng há), vien (màu viền môi), net (độ dày viền),
//      kieu: 'nguoi' (miệng người / thú) | 'den' (miệng đèn LED của robot), mau (màu đèn), toi (màu đèn tối) }
export function boMieng(id, o) {
  const { cx, cy, w } = o
  const toi = '#7f1d1d', luoi = '#fb7185', rang = '#ffffff'
  const vien = `stroke="${o.vien}" stroke-width="${o.net ?? 5}" stroke-linejoin="round"`
  // Hình thấu kính (môi hé): rộng 2·a, cao trên h1, dưới h2
  const thau = (a, h1, h2, dy = 0) => `M${f(cx - a)} ${f(cy + dy)} Q${f(cx)} ${f(cy + dy - h1 * 2)} ${f(cx + a)} ${f(cy + dy)} Q${f(cx)} ${f(cy + dy + h2 * 2)} ${f(cx - a)} ${f(cy + dy)} Z`
  const elip = (rx, ry, mau, dy = 0, them = '') => `<ellipse cx="${f(cx)}" cy="${f(cy + dy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${mau}" ${them}/>`
  // Hàng răng trên trong miệng há: dải trắng sát mép trên, cắt theo khung miệng
  const rangTren = (rx, ry, cao) => `<clipPath id="${id}-cm-${rx}"><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}"/></clipPath><rect x="${f(cx - rx)}" y="${f(cy - ry)}" width="${f(rx * 2)}" height="${f(cao)}" fill="${rang}" clip-path="url(#${id}-cm-${rx})"/>`
  const nhom = (chu, noi) => `<g id="${id}-mieng-${chu}" opacity="0">${noi}</g>`

  if (o.kieu === 'den') {
    // Robot: miệng là màn đèn, mỗi âm một khuôn sáng khác nhau (vẫn đọc ra được hình miệng)
    const den = (rw, rh, bo = 0.5) => `<rect x="${f(cx - rw)}" y="${f(cy - rh)}" width="${f(rw * 2)}" height="${f(rh * 2)}" rx="${f(Math.min(rw, rh) * bo * 2)}" fill="${o.mau}"/>`
    const trong = (rw, rh, bo = 0.5, dy = 0) => `<rect x="${f(cx - rw)}" y="${f(cy + dy - rh)}" width="${f(rw * 2)}" height="${f(rh * 2)}" rx="${f(Math.min(rw, rh) * bo * 2)}" fill="${o.toi}"/>`
    return [
      nhom('B', den(w * 0.9, w * 0.2) + `<path d="M${f(cx - w * 0.6)} ${f(cy)} H${f(cx + w * 0.6)}" stroke="${o.toi}" stroke-width="${f(w * 0.08)}" stroke-dasharray="${f(w * 0.14)} ${f(w * 0.1)}"/>`),
      nhom('C', den(w * 0.95, w * 0.42) + trong(w * 0.65, w * 0.2)),
      nhom('D', den(w, w * 0.62) + trong(w * 0.72, w * 0.38)),
      nhom('E', den(w * 0.62, w * 0.5) + trong(w * 0.36, w * 0.26)),
      nhom('F', `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(w * 0.34)}" fill="${o.mau}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(w * 0.16)}" fill="${o.toi}"/>`),
      nhom('G', den(w * 0.9, w * 0.24) + `<rect x="${f(cx - w * 0.6)}" y="${f(cy - w * 0.24)}" width="${f(w * 1.2)}" height="${f(w * 0.14)}" fill="${o.toi}"/>`),
      nhom('H', den(w * 0.82, w * 0.42) + trong(w * 0.5, w * 0.14, 0.5, -w * 0.14)),
    ].join('')
  }

  return [
    // B: hé môi, thấy răng
    nhom('B', `<path d="${thau(w * 0.78, w * 0.16, w * 0.22)}" fill="${toi}" ${vien}/><path d="M${f(cx - w * 0.56)} ${f(cy - w * 0.04)} Q${f(cx)} ${f(cy - w * 0.26)} ${f(cx + w * 0.56)} ${f(cy - w * 0.04)} Z" fill="${rang}"/>`),
    // C: mở vừa, răng trên + lưỡi
    nhom('C', elip(w * 0.82, w * 0.5, toi, 0, vien) + rangTren(w * 0.82, w * 0.5, w * 0.22) + elip(w * 0.42, w * 0.18, luoi, w * 0.3)),
    // D: há to
    nhom('D', elip(w * 0.95, w * 0.88, toi, w * 0.08, vien) + `<g transform="translate(0 ${f(w * 0.08)})">${rangTren(w * 0.95, w * 0.88, w * 0.26)}</g>` + elip(w * 0.55, w * 0.26, luoi, w * 0.62)),
    // E: tròn vừa (o, ơ)
    nhom('E', elip(w * 0.56, w * 0.62, toi, 0, vien) + elip(w * 0.3, w * 0.14, luoi, w * 0.4)),
    // F: chu môi (u, ô)
    nhom('F', elip(w * 0.3, w * 0.34, toi, 0, `stroke="${o.vien}" stroke-width="${f((o.net ?? 5) * 1.6)}"`)),
    // G: răng trên đặt lên môi dưới (ph, v)
    nhom('G', `<path d="${thau(w * 0.72, w * 0.1, w * 0.2)}" fill="${toi}" ${vien}/><rect x="${f(cx - w * 0.5)}" y="${f(cy - w * 0.14)}" width="${f(w)}" height="${f(w * 0.22)}" rx="${f(w * 0.05)}" fill="${rang}"/>`),
    // H: mở vừa, đầu lưỡi chạm răng trên (l)
    nhom('H', elip(w * 0.72, w * 0.46, toi, 0, vien) + rangTren(w * 0.72, w * 0.46, w * 0.18) + elip(w * 0.3, w * 0.2, luoi, -w * 0.12)),
  ].join('')
}
