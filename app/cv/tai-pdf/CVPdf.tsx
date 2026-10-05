import { Document, Font, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { DIA_CHI, DIEN_THOAI, duAnCua, EMAIL, KINH_NGHIEM, NGAY_SINH, type HoSoViTri } from '../duLieu'

// File CV PDF 1 trang A4 dựng thẳng trên máy chủ (nút "Tải CV PDF"), bố cục giống trang /cv/ban-in.
const FONT = join(process.cwd(), 'assets/fonts')
Font.register({
  family: 'BeVietnamPro',
  fonts: [
    { src: join(FONT, 'BeVietnamPro-Medium.ttf'), fontWeight: 500 },
    { src: join(FONT, 'BeVietnamPro-Bold.ttf'), fontWeight: 700 },
  ],
})
// Tiếng Việt không ngắt từ bằng gạch nối
Font.registerHyphenationCallback((tu) => [tu])

const XANH = '#0f1b3d'
const VANG = '#fbbf24'
const XAM = '#475569'

const s = StyleSheet.create({
  trang: { flexDirection: 'row', fontFamily: 'BeVietnamPro', fontWeight: 500, fontSize: 8.6, color: '#1e293b', lineHeight: 1.4 },
  trai: { fontSize: 8.2, lineHeight: 1.32, width: 178, backgroundColor: XANH, color: 'white', paddingVertical: 18, paddingHorizontal: 16, borderRightWidth: 4, borderRightColor: VANG },
  anh: { width: 70, height: 88, borderRadius: 10, objectFit: 'cover', alignSelf: 'center', borderWidth: 2, borderColor: VANG },
  mucTrai: { marginTop: 9 },
  khungQr: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff14', borderRadius: 8, padding: 5, textDecoration: 'none' },
  qr: { width: 46, height: 46, backgroundColor: 'white', borderRadius: 4, padding: 3 },
  tieuDeTrai: { fontSize: 8, fontWeight: 700, color: VANG, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4, paddingBottom: 2.5, borderBottomWidth: 1, borderBottomColor: '#fbbf2466' },
  nhanNho: { fontSize: 6.6, color: '#ffffff88', textTransform: 'uppercase', letterSpacing: 0.8 },
  dong: { flexDirection: 'row', marginBottom: 1.5 },
  cham: { width: 3.5, height: 3.5, backgroundColor: VANG, marginTop: 4, marginRight: 5 },
  the: { fontSize: 7.2, borderWidth: 0.8, borderColor: '#ffffff44', borderRadius: 8, paddingVertical: 1.5, paddingHorizontal: 5, marginRight: 3, marginBottom: 3 },
  phai: { flex: 1, paddingTop: 18, paddingBottom: 16, paddingHorizontal: 22 },
  ten: { fontSize: 24, fontWeight: 700, color: XANH, letterSpacing: -0.3, lineHeight: 1.5 },
  ungTuyen: { marginTop: 2, alignSelf: 'flex-start', backgroundColor: '#fffbeb', borderLeftWidth: 3, borderLeftColor: VANG, paddingVertical: 3, paddingHorizontal: 8, fontSize: 9.5, fontWeight: 700, color: '#b45309' },
  tomTat: { marginTop: 7, fontSize: 8.6, color: '#334155', lineHeight: 1.45 },
  tieuDe: { flexDirection: 'row', alignItems: 'center', marginTop: 9, marginBottom: 5 },
  so: { backgroundColor: XANH, color: VANG, fontSize: 7, fontWeight: 700, paddingVertical: 1.5, paddingHorizontal: 4, borderRadius: 3, marginRight: 6 },
  chuTieuDe: { fontSize: 10.5, fontWeight: 700, color: XANH, textTransform: 'uppercase', letterSpacing: 0.6 },
  gach: { flex: 1, height: 0.8, backgroundColor: '#e2e8f0', marginLeft: 6 },
  viec: { marginBottom: 6, paddingLeft: 9, borderLeftWidth: 1.2, borderLeftColor: '#e2e8f0' },
  hangDau: { flexDirection: 'row', justifyContent: 'space-between' },
  chucDanh: { fontSize: 9.5, fontWeight: 700, color: XANH, flex: 1, paddingRight: 6 },
  thoiGian: { alignSelf: 'flex-start', fontSize: 7.4, fontWeight: 700, color: '#047857', backgroundColor: '#ecfdf5', borderRadius: 6, paddingVertical: 1, paddingHorizontal: 5 },
  noi: { fontSize: 8, fontWeight: 700, color: '#d97706', marginBottom: 1.5 },
  gachDau: { flexDirection: 'row', marginTop: 1 },
  chamXanh: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#10b981', marginTop: 4.2, marginRight: 5 },
  luoi: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  duAn: { width: '49%', backgroundColor: '#f8fafc', borderWidth: 0.8, borderColor: '#e2e8f0', borderRadius: 6, padding: 6, marginBottom: 5 },
  tenDuAn: { fontSize: 8.8, fontWeight: 700, color: XANH },
  nhanDuAn: { alignSelf: 'flex-start', fontSize: 6, fontWeight: 700, color: VANG, backgroundColor: XANH, borderRadius: 5, paddingVertical: 1, paddingHorizontal: 4, textTransform: 'uppercase' },
  moTa: { fontSize: 7.8, color: XAM, marginTop: 2 },
  dungThu: { fontSize: 7.2, marginTop: 3, backgroundColor: 'white', borderWidth: 0.8, borderColor: '#e2e8f0', borderRadius: 4, padding: 3 },
  phongCach: { fontSize: 7.8, fontWeight: 700, color: '#92400e', backgroundColor: '#fffbeb', borderWidth: 0.8, borderColor: '#fde68a', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7, marginRight: 4, marginBottom: 4 },
  camDoan: { marginTop: 5, fontSize: 7.6, color: '#64748b', textAlign: 'right' },
})

function MucTrai({ tieuDe, children }: { tieuDe: string; children: ReactNode }) {
  return (
    <View style={s.mucTrai}>
      <Text style={s.tieuDeTrai}>{tieuDe}</Text>
      {children}
    </View>
  )
}

function TieuDe({ so, children }: { so: string; children: string }) {
  return (
    <View style={s.tieuDe}>
      <Text style={s.so}>{so}</Text>
      <Text style={s.chuTieuDe}>{children}</Text>
      <View style={s.gach} />
    </View>
  )
}

export default function CVPdf({ vt, anh, qr, trangWeb }: { vt: HoSoViTri; anh: Buffer | null; qr: Buffer; trangWeb: string }) {
  const so = DIEN_THOAI.replace(/\s/g, '')
  return (
    <Document title={`CV ${vt.ten} – Nông Bảo Trọng`} author="Nông Bảo Trọng" language="vi">
      <Page size="A4" style={s.trang}>
        {/* Cột trái */}
        <View style={s.trai}>
          {/* Ảnh trong file PDF không có thuộc tính alt */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {anh && <Image src={{ data: anh, format: 'jpg' }} style={s.anh} />}

          <MucTrai tieuDe="Liên hệ">
            {(
              [
                ['Điện thoại / Zalo', DIEN_THOAI, `tel:${so}`],
                ['Email', EMAIL, `mailto:${EMAIL}`],
                ['Nơi ở', DIA_CHI],
                ['Ngày sinh', NGAY_SINH],
                ['CV trực tuyến', trangWeb.replace(/^https?:\/\//, '').replace(/\?.*$/, ''), trangWeb],
              ] as [string, string, string?][]
            ).map(([nhan, giaTri, href]) => (
              <View key={nhan} style={{ marginBottom: 2 }}>
                <Text style={s.nhanNho}>{nhan}</Text>
                {href ? (
                  <Link src={href} style={{ color: 'white', textDecoration: 'none', fontSize: 8.2 }}>
                    {giaTri}
                  </Link>
                ) : (
                  <Text style={{ fontSize: 8.2 }}>{giaTri}</Text>
                )}
              </View>
            ))}
          </MucTrai>

          <MucTrai tieuDe="Kỹ năng">
            {vt.kyNang.map((k) => (
              <View key={k} style={s.dong}>
                <View style={s.cham} />
                <Text style={{ flex: 1 }}>{k}</Text>
              </View>
            ))}
          </MucTrai>

          <MucTrai tieuDe="Công cụ">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {vt.congCu.map((c) => (
                <Text key={c} style={s.the}>
                  {c}
                </Text>
              ))}
            </View>
          </MucTrai>

          <MucTrai tieuDe="Sẵn sàng">
            {vt.sanSang.map((k) => (
              <View key={k} style={s.dong}>
                <View style={s.cham} />
                <Text style={{ flex: 1 }}>{k}</Text>
              </View>
            ))}
          </MucTrai>

          {/* Mã QR ở đáy cột trái: người cầm CV giấy quét để mở bản web (video, số liệu kho, hệ thống dùng thử) */}
          <Link src={trangWeb} style={s.khungQr}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={{ data: qr, format: 'png' }} style={s.qr} />
            <View style={{ flex: 1, marginLeft: 7 }}>
              <Text style={{ fontSize: 7.8, fontWeight: 700, color: VANG }}>Quét để xem CV online</Text>
              <Text style={{ fontSize: 6.8, color: '#ffffffcc', marginTop: 1.5 }}>{vt.bangKho ? 'Video giới thiệu, số liệu kho và hệ thống dùng thử' : 'Video giới thiệu, dự án và hệ thống dùng thử'}</Text>
            </View>
          </Link>
        </View>

        {/* Cột phải */}
        <View style={s.phai}>
          <Text style={s.ten}>NÔNG BẢO TRỌNG</Text>
          <Text style={s.ungTuyen}>Ứng tuyển: {vt.ungTuyen}</Text>
          <Text style={s.tomTat}>
            {vt.tomTat.map((d, i) =>
              typeof d === 'string' ? (
                d
              ) : (
                <Text key={i} style={{ fontWeight: 700, color: XANH }}>
                  {d.dam}
                </Text>
              ),
            )}
          </Text>

          <TieuDe so="01">Kinh nghiệm làm việc</TieuDe>
          {KINH_NGHIEM.map((k) => (
            <View key={k.chucDanh + k.noi} style={s.viec} wrap={false}>
              <View style={s.hangDau}>
                <Text style={s.chucDanh}>{k.chucDanh}</Text>
                <Text style={s.thoiGian}>{k.thoiGian}</Text>
              </View>
              <Text style={s.noi}>{k.noi}</Text>
              {k.viec.map((v) => (
                <View key={v} style={s.gachDau}>
                  <View style={s.chamXanh} />
                  <Text style={{ flex: 1, color: '#334155' }}>{v}</Text>
                </View>
              ))}
            </View>
          ))}

          <TieuDe so="02">Dự án tự xây dựng</TieuDe>
          <View style={s.luoi}>
            {duAnCua(vt).map((d) => (
              <View key={d.ten} style={s.duAn} wrap={false}>
                <View style={s.hangDau}>
                  {d.link ? (
                    <Link src={d.link} style={[s.tenDuAn, { flex: 1, textDecoration: 'none' }]}>
                      {d.ten}
                    </Link>
                  ) : (
                    <Text style={[s.tenDuAn, { flex: 1 }]}>{d.ten}</Text>
                  )}
                  <Text style={s.nhanDuAn}>{d.nhan}</Text>
                </View>
                <Text style={s.moTa}>{d.moTa}</Text>
                {d.taiKhoan && d.link && (
                  <View style={s.dungThu}>
                    <Link src={d.link} style={{ color: '#1d4ed8' }}>
                      {d.link.replace(/^https?:\/\//, '')}
                    </Link>
                    <Text>
                      TK <Text style={{ fontWeight: 700 }}>{d.taiKhoan.ten}</Text> · MK{' '}
                      <Text style={{ fontWeight: 700 }}>{d.taiKhoan.matKhau}</Text>
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <TieuDe so="03">Học vấn</TieuDe>
          <View style={s.hangDau}>
            <Text style={{ fontWeight: 700, color: XANH, fontSize: 9 }}>Cao đẳng Công nghệ Ô tô · Trường Cao đẳng Phương Đông, Đà Nẵng</Text>
            <Text style={s.thoiGian}>2022</Text>
          </View>

          <TieuDe so="04">Phong cách làm việc</TieuDe>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {vt.phongCach.map((p) => (
              <Text key={p} style={s.phongCach}>
                {p}
              </Text>
            ))}
          </View>

          <Text style={s.camDoan}>
            Tôi cam đoan những thông tin trên là đúng sự thật. <Text style={{ fontWeight: 700, color: '#1e293b' }}>Nông Bảo Trọng</Text>
          </Text>
        </View>
      </Page>
    </Document>
  )
}
