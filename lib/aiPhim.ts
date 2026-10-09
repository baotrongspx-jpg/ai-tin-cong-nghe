import 'server-only'
import { z } from 'zod'
import { CauSchema, DAO_CU, EMOJI_BOI_CANH, JSON_CAU, JSON_MOC, LUAT_HINH, MO_TA_NHAN_VAT_PHU, MocSchema, NGUOI_NOI, NHAN_VAT_PHU, damBaoDau, goiJson } from './ai'

// Phim tiểu sử (trang /youtube): AI làm đạo diễn phim tài liệu theo từng giai đoạn — nghiên cứu → phát triển câu
// chuyện → kịch bản (giọng kể + Mèo Mun & Robot Bit xen vào) → hồ sơ hình ảnh → phân cảnh + prompt video AI →
// đóng gói YouTube. Nguyên tắc: không bịa; chỉ coi là "đã xác minh" điều có trong nguồn (Wikipedia + tài liệu dán vào).

const PHIM_DAU = `You are the director of "Công Nghệ 24H Phim Tài Liệu", a Vietnamese YouTube channel that turns the lives of famous people into cinematic documentary films (16:9, Vietnamese). You act at once as film director, screenwriter, researcher, audience psychologist, fact checker, cinematographer, lighting director, production designer, sound designer, editor and YouTube strategist.
Mission: turn one life into a story that even people who have never heard of this person want to watch to the end — truth + story + emotion + cinematic images + sound + editing rhythm + retention. Do not ask "what should I tell about this person?" but "why should viewers care?"; not "what happened next?" but "what makes viewers want to know what happens next?". Let viewers SEE the failure, FEEL the pressure, UNDERSTAND the decisions, WITNESS the turning point, FEEL the price, and REMEMBER the story.
NEVER FABRICATE: no invented events, achievements, conversations, quotes, people, relationships, numbers or sources. Facts found in the provided sources are VERIFIED. Things you only know from memory must be marked as reported and "cần kiểm tra". Disputed claims are presented as disputed. A conversation that has no exact record may only appear as a clearly labelled dramatized reconstruction, never as the person's real words. Be fair and respectful to living people; no defamation, no speculation about private life.
Write everything for viewers in natural Vietnamese WITH full diacritics (tiếng Việt có dấu đầy đủ). Only enum codes are written without diacritics; prompts for AI image / video tools are written in English.`

const chuoi = { type: 'string' }
const mangChuoi = { type: 'array', items: chuoi }
const so = { type: 'number' }
const doiTuong = (props: Record<string, unknown>) => ({ type: 'object', properties: props, required: Object.keys(props), additionalProperties: false })
const mang = (props: Record<string, unknown>) => ({ type: 'array', items: doiTuong(props) })
const zDoi = <T extends z.ZodRawShape>(shape: T) => z.object(shape)

// ---------- 1. Nghiên cứu ----------
export const NHAN_SU_THAT = ['xac_minh', 'duoc_dua_tin', 'tranh_cai', 'dien_giai', 'chua_ro'] as const
const NghienCuuSchema = zDoi({
  ho_so: zDoi({
    ten: z.string(), linh_vuc: z.string(), quoc_gia: z.string(), thoi_dai: z.string(), con_song: z.string(), ngay_sinh: z.string(),
    noi_sinh: z.string(), gia_dinh: z.string(), hoc_van: z.string(), nghe_nghiep: z.string(), quoc_tich: z.string(),
  }),
  moc_doi: z.array(zDoi({ giai_doan: z.string(), nam: z.string(), su_kien: z.string(), nhan: z.enum(NHAN_SU_THAT) })),
  su_that: z.array(zDoi({ noi_dung: z.string(), nhan: z.enum(NHAN_SU_THAT), nguon: z.string() })),
  chu_y: z.array(z.string()),
})
export type NghienCuu = z.infer<typeof NghienCuuSchema>

export async function nghienCuuNhanVat(ten: string, ghiChu: string, nguon: string): Promise<NghienCuu | null> {
  return goiJson({
    system: `${PHIM_DAU}

STAGE 1 — RESEARCH about the person named in the user turn, using ONLY the numbered sources given there as verified material.
- ho_so: name, field, country, era, whether alive ("còn sống" / "đã mất" / "không rõ"), date and place of birth, family, education, profession, nationality. Use "không rõ" when the sources do not say.
- moc_doi: the life timeline in order, only stages that really matter for the story (childhood, family, education, early ambition, first opportunity, first failure, turning point, rise, major achievements, conflicts, crisis, peak, later life, legacy — skip what does not exist). giai_doan is a short Vietnamese stage name, nam the year or period, su_kien what happened, nhan its fact label.
- su_that: 15 to 30 key facts for the film. nhan: xac_minh (stated in the sources), duoc_dua_tin (widely reported or from your memory, needs checking), tranh_cai (disputed), dien_giai (an interpretation), chua_ro (unknown / not enough data). nguon: which source it comes from (for example "Nguồn 1 — Wikipedia tiếng Việt"), or "Trí nhớ của AI — cần kiểm tra".
- chu_y: warnings for the production team (sensitive topics, privacy of a living person, disputed claims, missing data).`,
    noiDung: `Person: ${ten}${ghiChu ? `\nNotes from the channel owner: ${ghiChu}` : ''}\n\n${nguon || '(No sources found. Everything must be marked duoc_dua_tin or chua_ro and "Trí nhớ của AI — cần kiểm tra".)'}`,
    effort: 'medium',
    kiemTra: NghienCuuSchema,
    schema: doiTuong({
      ho_so: doiTuong(Object.fromEntries(['ten', 'linh_vuc', 'quoc_gia', 'thoi_dai', 'con_song', 'ngay_sinh', 'noi_sinh', 'gia_dinh', 'hoc_van', 'nghe_nghiep', 'quoc_tich'].map((k) => [k, chuoi]))),
      moc_doi: mang({ giai_doan: chuoi, nam: chuoi, su_kien: chuoi, nhan: { type: 'string', enum: [...NHAN_SU_THAT] } }),
      su_that: mang({ noi_dung: chuoi, nhan: { type: 'string', enum: [...NHAN_SU_THAT] }, nguon: chuoi }),
      chu_y: mangChuoi,
    }),
  })
}

// ---------- 2. Phát triển câu chuyện ----------
const DIEM_GOC = ['to_mo', 'cam_xuc', 'hinh_anh', 'lien_quan', 'moi_la', 'giu_chan', 'youtube'] as const
const CauChuyenSchema = zDoi({
  khan_gia: zDoi({ chinh: z.string(), phu: z.string(), to_mo: z.string(), ly_do_click: z.string(), dieu_giu_chan: z.string(), dieu_chia_se: z.string() }),
  con_nguoi: zDoi({
    uoc_mo: z.string(), noi_so: z.string(), that_bai: z.string(), xung_dot: z.string(), hy_sinh: z.string(), co_hoi: z.string(),
    bien_doi: z.string(), cai_gia: z.string(), di_san: z.string(),
  }),
  chu_de_chung: z.string(),
  goc_ke: z.array(zDoi({ ten: z.string(), mo_ta: z.string(), diem: zDoi(Object.fromEntries(DIEM_GOC.map((k) => [k, z.number()])) as Record<(typeof DIEM_GOC)[number], z.ZodNumber>) })).min(3),
  goc_chon: z.string(),
  ly_do_chon: z.string(),
  big_idea: z.string(),
  cau_truc: z.string(),
  cung_cam_xuc: z.array(zDoi({ giai_doan: z.string(), cam_xuc: z.string(), mau_sac: z.string() })),
  hook: z.array(zDoi({ chu: z.string(), kieu: z.string() })),
  hook_chon: z.string(),
  nhip_giu_chan: z.array(z.string()),
  tieu_de: z.string(),
  chu_de: z.string(),
  the: z.array(z.string()),
  phan: z.array(zDoi({ tieu_de: z.string(), noi_dung: z.string(), nhip: z.string() })).min(1).max(10),
})
export type CauChuyen = z.infer<typeof CauChuyenSchema>

export async function phatTrienCauChuyen(o: { ten: string; ghiChu: string; nghienCuu: NghienCuu; phut: number; soPhan: number }) {
  const kq = await goiJson({
    system: `${PHIM_DAU}

STAGE 2 — STORY DEVELOPMENT for a film of about ${o.phut} minutes, based ONLY on the research in the user turn.
- khan_gia: primary audience (already interested), secondary (likes stories of success, failure, power, history), curiosity audience (does not know the person), why they click, what keeps them watching, what makes them share.
- con_nguoi: the human story — dream, fear, failure, conflict, sacrifice, opportunity, transformation, price of success, legacy ("không rõ" when the research does not show it; never invent).
- chu_de_chung: the universal human theme in one sentence.
- goc_ke: 5 to 8 story angles (rise, failure, transformation, price, mystery, conflict, legacy, human...), each scored 0-10 on to_mo (curiosity), cam_xuc (emotion), hinh_anh (visual potential), lien_quan (audience relevance), moi_la (originality), giu_chan (retention), youtube (YouTube appeal). goc_chon is the name of the strongest one and ly_do_chon why.
- big_idea: ONE sentence saying what this film is really about (the compass for the whole film).
- cau_truc: choose exactly ONE structure that fits this life from: Rise; Failure → Comeback; Transformation; Dream → Success → Price; Mystery → Discovery → Revelation; Historical Journey; Conflict → Consequence; Life → Achievement → Legacy. Write its name, then " — " and one sentence in Vietnamese saying why (never list several).
- cung_cam_xuc: the emotional arc by life phase, with the colour language of each phase (for example childhood warm natural, struggle muted darker, rise higher contrast, success rich, crisis cool desaturated, ending reflective).
- hook: 5 hooks for the first 3-10 seconds (curiosity, question, conflict, surprise, emotion), never "Xin chào các bạn" or "Hôm nay chúng ta sẽ tìm hiểu", never a list of dates; hook_chon is the strongest one copied exactly.
- nhip_giu_chan: the retention design as beats in order (hook → question → open loop → development → reveal → new question → conflict → escalation → turning point → climax → payoff → reflection), each beat as one short Vietnamese sentence about this film; something new every 30-60 seconds.
- tieu_de: a working YouTube title (at most 90 characters, truthful) built around the person's main event or twist with a question the film answers, not a generic "the story of X"; chu_de: a 1-2 word label for the corner of the video; the: 10 to 15 tags.
- phan: exactly ${o.soPhan} chapters of about ${Math.round((o.phut / o.soPhan) * 10) / 10} minutes each that follow the structure and the retention beats: tieu_de, nhip (the emotional curve of the chapter) and noi_dung (5 to 8 sentences: which facts, scenes, questions and reveals, in order). Part 1 opens with the chosen hook; the last part ends with payoff and reflection.`,
    noiDung: `Person: ${o.ten}${o.ghiChu ? `\nNotes from the channel owner: ${o.ghiChu}` : ''}\n\n<research>\n${JSON.stringify(o.nghienCuu)}\n</research>`,
    effort: 'high',
    kiemTra: CauChuyenSchema,
    schema: doiTuong({
      khan_gia: doiTuong(Object.fromEntries(['chinh', 'phu', 'to_mo', 'ly_do_click', 'dieu_giu_chan', 'dieu_chia_se'].map((k) => [k, chuoi]))),
      con_nguoi: doiTuong(Object.fromEntries(['uoc_mo', 'noi_so', 'that_bai', 'xung_dot', 'hy_sinh', 'co_hoi', 'bien_doi', 'cai_gia', 'di_san'].map((k) => [k, chuoi]))),
      chu_de_chung: chuoi,
      goc_ke: mang({ ten: chuoi, mo_ta: chuoi, diem: doiTuong(Object.fromEntries(DIEM_GOC.map((k) => [k, so]))) }),
      goc_chon: chuoi,
      ly_do_chon: chuoi,
      big_idea: chuoi,
      cau_truc: chuoi,
      cung_cam_xuc: mang({ giai_doan: chuoi, cam_xuc: chuoi, mau_sac: chuoi }),
      hook: mang({ chu: chuoi, kieu: chuoi }),
      hook_chon: chuoi,
      nhip_giu_chan: mangChuoi,
      tieu_de: chuoi,
      chu_de: chuoi,
      the: mangChuoi,
      phan: mang({ tieu_de: chuoi, noi_dung: chuoi, nhip: chuoi }),
    }),
  })
  return kq ? { ...kq, phan: kq.phan.slice(0, o.soPhan) } : null
}

// ---------- 2b. Tạo hình nhân vật chính (người được kể) cho bản hoạt hình ----------
// Một nhân vật hoạt hình cố định suốt phim (không phải chân dung thật): giới tính, màu da, rồi từng giai đoạn tuổi
// (từ chương nào) với kiểu tóc, màu tóc, trang phục, kính, râu, đồ vật đặc trưng. Máy nhà vẽ bằng khung người chung
// (may-nha/hoat-hinh/nhanVatPhu.mjs: nhanVatChinhSvg).
export const TUOI = ['tre_em', 'thanh_nien', 'trung_nien', 'gia'] as const
export const KIEU_TOC = ['ngan', 're_ngoi', 'vuot', 'dai', 'buoi', 'hoi', 'xoan'] as const
export const MAU_TOC = ['den', 'nau', 'vang', 'bac', 'do'] as const
export const KIEU_AO = [
  'vest', 'so_mi', 'ao_thun', 'ao_khoac', 'ao_len', 'ao_dai', 'quan_phuc', 'ao_ba_ba',
  'long_bao', 'giap', 'ao_the_thao', 'ao_san_khau', 'ao_blouse',
] as const
export const RAU = ['khong', 'ria', 'quai_non', 'day'] as const
// Nhóm nhân vật: quyết định màu vầng sáng + gợi ý trang phục / mũ / phụ kiện đặc trưng
export const NHOM_NHAN_VAT = ['hoang_gia', 'lich_su', 'the_thao', 'am_nhac', 'dien_anh', 'khoa_hoc', 'chinh_tri', 'doanh_nhan', 'khac'] as const
export const MU = ['khong', 'vuong_mien', 'mu_vua', 'khan_dong', 'mu_giap', 'mu_luoi_trai', 'mu_phot', 'tai_nghe', 'hoa_cai', 'non_la'] as const
export const PHU_KIEN = ['khong', 'kinh_ram', 'huy_chuong', 'khan_quang', 'day_chuyen'] as const
const MAU = z.string().regex(/^#[0-9a-fA-F]{6}$/)
const GiaiDoanHinhSchema = zDoi({
  tu_chuong: z.number().int().min(1), tuoi: z.enum(TUOI), toc: z.enum(KIEU_TOC), mau_toc: z.enum(MAU_TOC), ao: z.enum(KIEU_AO),
  mau_ao: MAU, mau_quan: MAU, kinh: z.boolean(), rau: z.enum(RAU), vat_dung: z.enum(DAO_CU), mo_ta: z.string(),
  // Bản thiết kế cũ (trước khi có nhóm) không có các trường này: máy nhà dùng mặc định
  mu: z.enum(MU).optional(), phu_kien: z.enum(PHU_KIEN).optional(), so_ao: z.number().int().min(0).max(99).optional(),
})
// Dàn nhân vật phụ của phim (người trong hồ sơ hình ảnh: gia đình, thầy, cộng sự, đối thủ…): mỗi người một hình hoạt hình
// riêng, cố định suốt phim, vẽ bằng cùng khung người với nhân vật chính; mã vai_1..vai_8 theo thứ tự trong danh sách.
// loai = kiểu nhân vật phụ chung gần nhất (lấy giọng đọc, và thay khi kịch bản viết trước chỉ ghi kiểu chung)
export const VAI_PHU = ['vai_1', 'vai_2', 'vai_3', 'vai_4', 'vai_5', 'vai_6', 'vai_7', 'vai_8'] as const
const LOAI_VAI = NHAN_VAT_PHU.filter((x) => x !== 'khong')
const VaiPhuSchema = zDoi({
  ten: z.string(), vai_tro: z.string(), loai: z.enum(LOAI_VAI as [string, ...string[]]), gioi: z.enum(['nam', 'nu']), da: z.enum(['sang', 'trung_binh', 'ngam']),
  tuoi: z.enum(TUOI), toc: z.enum(KIEU_TOC), mau_toc: z.enum(MAU_TOC), ao: z.enum(KIEU_AO), mau_ao: MAU, mau_quan: MAU, kinh: z.boolean(),
  rau: z.enum(RAU), mu: z.enum(MU), phu_kien: z.enum(PHU_KIEN), vat_dung: z.enum(DAO_CU), mo_ta: z.string(),
})
export type VaiPhu = z.infer<typeof VaiPhuSchema>
const TaoHinhSchema = zDoi({
  nhom: z.enum(NHOM_NHAN_VAT).optional(),
  gioi: z.enum(['nam', 'nu']),
  da: z.enum(['sang', 'trung_binh', 'ngam']),
  giai_doan: z.array(GiaiDoanHinhSchema).min(1).max(5),
  // Thiết kế trước khi có bước này không có trường vai_phu: nhân vật phụ dùng hình chung
  vai_phu: z.array(VaiPhuSchema).max(VAI_PHU.length).optional(),
})
export type TaoHinh = z.infer<typeof TaoHinhSchema> & { mac_dinh?: boolean }
export const TAO_HINH_MAC_DINH: TaoHinh = {
  nhom: 'khac',
  gioi: 'nam',
  da: 'sang',
  mac_dinh: true,
  giai_doan: [{ tu_chuong: 1, tuoi: 'trung_nien', toc: 're_ngoi', mau_toc: 'den', ao: 'vest', mau_ao: '#1e3a8a', mau_quan: '#1f2937', kinh: false, rau: 'khong', mu: 'khong', phu_kien: 'khong', so_ao: 0, vat_dung: 'khong', mo_ta: 'Hình mặc định (AI chưa thiết kế được)' }],
}

export async function thietKeNhanVatChinh(o: { ten: string; nghienCuu: NghienCuu; cauChuyen: CauChuyen; hoSo?: HoSoHinhAnh | null }): Promise<TaoHinh | null> {
  const enumChuoi = (ds: readonly string[]) => ({ type: 'string', enum: [...ds] })
  const chuong = o.cauChuyen.phan.map((p, i) => `${i + 1}. ${p.tieu_de}`).join(' | ')
  return goiJson({
    system: `${PHIM_DAU}

STAGE 2b — CARTOON DESIGN of the protagonist for the animated version. The person appears as a simple, friendly chibi cartoon character on stage (the same style as the channel's cat and robot mascots), recognisable by a few signature traits, never a realistic likeness or a caricature that mocks them.
- nhom: the group this person belongs to, which sets the colour of their glow and the signature look: hoang_gia (royalty: kings, queens, emperors, princes), lich_su (historical figures: generals, national heroes, scholars, revolutionaries), the_thao (sports), am_nhac (music), dien_anh (film and entertainment), khoa_hoc (scientists, inventors, geniuses), chinh_tri (politics and state leaders), doanh_nhan (business people and billionaires), khac (anyone else).
- gioi: nam / nu. da: skin tone sang (light), trung_binh (medium), ngam (dark).
- Signature looks by group (adapt to the real person, era and country; these are ideas, not obligations):
  · hoang_gia: ao long_bao (royal robe; yellow for an Asian emperor, red / purple / blue for others) with mu mu_vua (Vietnamese or East Asian emperor hat) or vuong_mien (crown); a queen may wear long_bao or ao_dai with vuong_mien and day_chuyen.
  · lich_su: a general or warrior in ao giap (armour, red cape) with mu mu_giap and vat_dung khien; a Vietnamese scholar or mandarin in long_bao (dark colours) with mu khan_dong; a modern revolutionary or soldier in quan_phuc or ao_ba_ba.
  · the_thao: ao ao_the_thao in the team or national colours, so_ao = their famous shirt number (0 if none), phu_kien huy_chuong once they have won titles, vat_dung = their sport (bong_da, huy_chuong, cup…); mu_luoi_trai for golf, baseball or tennis players.
  · am_nhac: ao ao_san_khau (sparkly stage jacket) or their famous style, mu tai_nghe or mu_phot or hoa_cai, phu_kien day_chuyen or kinh_ram, vat_dung micro / dan_guitar / not_nhac.
  · dien_anh: elegant vest or ao_san_khau, mu_phot, phu_kien kinh_ram, vat_dung bang_phim / ngoi_sao / cup.
  · khoa_hoc: ao ao_blouse (white lab coat) or their famous style, kinh if they wore glasses, vat_dung ong_nghiem / kinh_hien_vi / nguyen_tu / bong_den / kinh_vien_vong.
  · chinh_tri: vest (or the national dress they were known for), phu_kien khong (never a flag pin), vat_dung micro / tai_lieu / loa.
  · doanh_nhan: vest or their famous casual style (for example a black ao_len turtleneck), vat_dung cap_tai_lieu / dien_thoai / bieu_do / kim_cuong / the product they are known for.
  Childhood and youth stages wear simple everyday clothes (ao_thun, so_mi, ao_ba_ba) before the signature look appears.
- giai_doan: 1 to 4 life stages that the chapters actually show, in chapter order; tu_chuong = the chapter number (1..${o.cauChuyen.phan.length}) from which this look is used (the first stage has tu_chuong 1). For each: tuoi (tre_em child, thanh_nien young adult, trung_nien middle-aged, gia elderly), toc (ngan short, re_ngoi side part, vuot quiff swept up, dai long, buoi bun, hoi balding, xoan curly), mau_toc (den black, nau brown, vang blond, bac grey or white, do ginger), ao (vest suit, so_mi shirt, ao_thun t-shirt, ao_khoac jacket, ao_len sweater or turtleneck, ao_dai Vietnamese long dress, quan_phuc military uniform, ao_ba_ba Southern Vietnamese peasant shirt, long_bao royal robe, giap armour with cape, ao_the_thao sports jersey with number, ao_san_khau sparkly stage jacket, ao_blouse white lab coat), mau_ao and mau_quan as #rrggbb colours that suit the person and the era, kinh (glasses) true or false, rau (khong none, ria moustache, quai_non chin beard, day full beard), mu (headwear: khong none, vuong_mien crown, mu_vua emperor hat, khan_dong Vietnamese turban, mu_giap warrior helmet, mu_luoi_trai cap, mu_phot fedora, tai_nghe headphones, hoa_cai flower in the hair, non_la Vietnamese conical hat), phu_kien (khong none, kinh_ram sunglasses, huy_chuong medal, khan_quang scarf, day_chuyen necklace, ghim_co flag pin), so_ao (shirt number for ao_the_thao, otherwise 0), vat_dung: one signature object from the prop list that fits this stage of life (or khong), mo_ta: one short Vietnamese sentence describing this look and why.
- Base the look on documented facts (era, job, a famous personal style such as a black turtleneck or a military uniform); if unsure keep it neutral and simple.
- Visual bible: when a <visual_bible> is given, the cartoon must follow it. Each giai_doan matches the bible's nhan_vat_chinh stage of that age (hair style and colour, beard, glasses, clothing and its colours, headwear, accessories, signature object), simplified to the options above.
- vai_phu: the cartoon cast of the supporting people, one entry for EVERY person in the bible's nhan_vat_phu, in the same order (at most ${VAI_PHU.length}; an empty list when there is no bible). Same simple chibi style, designed from their bible appearance (ngoai_hinh), role, era and culture, so viewers recognise each of them every time they appear and can tell them apart from each other and from the protagonist (different hair, clothing colours or headwear). ten = their name exactly as in the bible; vai_tro = their role in a short Vietnamese phrase; loai = the generic extra closest to them (${LOAI_VAI.join(', ')}; in a story set before the 20th century only the period cast vua, hoang_hau, tuong_quan, chien_binh, nha_su, phu_nu_xua, nong_dan_xua, quan_lai, or ong_lao / ba_lao); gioi; da; tuoi = their age when they mostly appear in the story; then toc, mau_toc, ao, mau_ao, mau_quan, kinh, rau, mu, phu_kien, vat_dung with the same options as above; mo_ta = one short Vietnamese sentence describing the look.`,
    noiDung: `Person: ${o.ten}\nChapters: ${chuong}\n\n<research>\n${JSON.stringify({ ho_so: o.nghienCuu.ho_so, moc_doi: o.nghienCuu.moc_doi })}\n</research>${
      o.hoSo
        ? `\n\n<visual_bible>\n${JSON.stringify({
            nhan_vat_chinh: o.hoSo.nhan_vat_chinh.map((x) => ({ giai_doan: x.giai_doan, tuoi: x.tuoi, ngoai_hinh: x.ngoai_hinh })),
            nhan_vat_phu: o.hoSo.nhan_vat_phu.slice(0, VAI_PHU.length).map((x) => ({ ten: x.ten, vai_tro: x.vai_tro, ngoai_hinh: x.ngoai_hinh })),
            trang_phuc_thoi_dai: o.hoSo.thiet_ke.trang_phuc,
          })}\n</visual_bible>`
        : ''
    }`,
    effort: o.hoSo ? 'medium' : 'low',
    kiemTra: TaoHinhSchema,
    schema: doiTuong({
      nhom: enumChuoi(NHOM_NHAN_VAT),
      gioi: enumChuoi(['nam', 'nu']),
      da: enumChuoi(['sang', 'trung_binh', 'ngam']),
      giai_doan: {
        type: 'array',
        items: doiTuong({
          tu_chuong: { type: 'integer' }, tuoi: enumChuoi(TUOI), toc: enumChuoi(KIEU_TOC), mau_toc: enumChuoi(MAU_TOC), ao: enumChuoi(KIEU_AO),
          mau_ao: chuoi, mau_quan: chuoi, kinh: { type: 'boolean' }, rau: enumChuoi(RAU), mu: enumChuoi(MU), phu_kien: enumChuoi(PHU_KIEN),
          so_ao: { type: 'integer' }, vat_dung: enumChuoi(DAO_CU), mo_ta: chuoi,
        }),
      },
      vai_phu: {
        type: 'array',
        items: doiTuong({
          ten: chuoi, vai_tro: chuoi, loai: enumChuoi(LOAI_VAI), gioi: enumChuoi(['nam', 'nu']), da: enumChuoi(['sang', 'trung_binh', 'ngam']),
          tuoi: enumChuoi(TUOI), toc: enumChuoi(KIEU_TOC), mau_toc: enumChuoi(MAU_TOC), ao: enumChuoi(KIEU_AO), mau_ao: chuoi, mau_quan: chuoi,
          kinh: { type: 'boolean' }, rau: enumChuoi(RAU), mu: enumChuoi(MU), phu_kien: enumChuoi(PHU_KIEN), vat_dung: enumChuoi(DAO_CU), mo_ta: chuoi,
        }),
      },
    }),
  })
}

// ---------- 3. Kịch bản: giọng kể (nguoi_ke) dẫn chính, Mèo Mun & Robot Bit xen vào ----------
// nhan_vat_chinh: chính người được kể (nhân vật hoạt hình ở bước 2b) — đứng trên sân khấu khi người kể nói về họ, nói
// những câu trích dẫn có thật (hoặc tái hiện có gắn nhãn)
// vai_1..vai_8: nhân vật phụ có tên trong hồ sơ (tao_hinh.vai_phu) — nói và đứng diễn bằng hình riêng của họ
export const NGUOI_NOI_PHIM = ['nguoi_ke', 'nhan_vat_chinh', ...NGUOI_NOI, ...VAI_PHU] as const
const NHAN_VAT_PHU_PHIM = [...NHAN_VAT_PHU, 'nhan_vat_chinh', ...VAI_PHU] as const
export const CauPhimSchema = CauSchema.extend({ ai: z.enum(NGUOI_NOI_PHIM), nhan_vat_phu: z.enum(NHAN_VAT_PHU_PHIM), tai_hien: z.boolean(), the_moc: z.string(), anh: z.number().int().optional() })
export type CauPhim = z.infer<typeof CauPhimSchema>
const PhanPhimSchema = z.object({ loi: z.array(CauPhimSchema).min(6).max(80), moc: MocSchema })
export const JSON_CAU_PHIM = {
  ...JSON_CAU,
  properties: {
    ...JSON_CAU.properties,
    ai: { type: 'string', enum: [...NGUOI_NOI_PHIM] },
    nhan_vat_phu: { type: 'string', enum: [...NHAN_VAT_PHU_PHIM] },
    tai_hien: { type: 'boolean' },
    the_moc: chuoi,
    anh: { type: 'integer' },
  },
  required: [...JSON_CAU.required, 'tai_hien', 'the_moc', 'anh'],
}

export async function vietPhanPhim(o: {
  ten: string
  nghienCuu: NghienCuu
  cauChuyen: CauChuyen
  k: number
  soCau: number
  noiTiep: string[]
  anh?: { nam: string; mo_ta: string; chinh?: boolean }[] // ảnh thật từ Wikimedia Commons (lib/wiki.ts)
  hoSo?: HoSoHinhAnh | null // hồ sơ hình ảnh (bước 4): địa điểm, màu theo giai đoạn, nhân vật phụ — chỉ dẫn hình từng câu bám theo
  vaiPhu?: VaiPhu[] // dàn nhân vật phụ đã có hình riêng (vai_1..): câu họ nói / câu nhắc tới họ dùng đúng mã của họ
}): Promise<{ loi: CauPhim[]; moc: { chu: string; bieu_tuong: string } } | null> {
  const { k, cauChuyen: cc } = o
  const n = cc.phan.length
  const viTri =
    k === 1
      ? `This is chapter 1: the narrator's channel greeting, a short introduction of whose story this is and the reading of the chapter title are inserted automatically before your lines, so never greet or introduce the channel; your very first line is the narrator saying the chosen hook (adapted to be spoken). Then introduce the question that will keep viewers watching.${n === 1 ? ' It is also the last chapter: end with payoff, a short reflection and one line from Mèo Mun or Robot Bit inviting viewers to subscribe to Công Nghệ 24H.' : ' The whole film is ONE continuous video watched in one sitting; chapters are only sections of it, not episodes: never say goodbye, thanks, "hẹn gặp lại", "đón xem chương tiếp theo", "chương sau" or ask viewers to subscribe before the very end. End the chapter inside the story itself, with a suspenseful story line (a looming danger, an unanswered question, a decision about to be made) that flows straight into the next chapter.'}`
      : k === n
        ? 'This is the last chapter: continue right where the previous one stopped (no greeting, no recap), reach the climax and payoff, end with a reflective narrator line about the big idea that ties back to the opening hook, then at most 2 closing lines (Mèo Mun / Robot Bit invite viewers to like and subscribe to Công Nghệ 24H).'
        : `This is chapter ${k} of ${n}: continue right where the previous one stopped (no greeting, no goodbye, no recap of what was already told). The whole film is ONE continuous video watched in one sitting; chapters are only sections of it, not episodes: never say goodbye, thanks, "hẹn gặp lại", "đón xem chương tiếp theo", "chương sau" or ask viewers to subscribe before the very end. End the chapter inside the story itself, with a suspenseful story line (a looming danger, an unanswered question, a decision about to be made) that flows straight into the next chapter.`
  const system = `${PHIM_DAU}

STAGE 3 — SCRIPT of one chapter, for the channel's animated version: a documentary narrator tells the story over cartoon scenes, and the two mascots sometimes interject.
Speakers ("ai"): nguoi_ke = the documentary narrator (voiceover, cinematic, calm and gripping; about 40-50% of the lines, carrying the story forward); nhan_vat_chinh = ${o.ten} as the film's cartoon protagonist, who speaks about 10-15% of the lines (the audience must hear the hero at every turning point): their documented quotes from the sources (tai_hien false), or short dramatized reconstructions faithful to the facts (tai_hien true), at the key moments (a decision, a turning point, a famous sentence);meo = Mèo Mun, a curious cat who asks the question viewers would ask or reacts emotionally (about 10-15%); robot = Robot Bit, who adds a short clear explanation or context (about 10-15%); extras about 25-35% of the lines: the people of this life seen from many sides — family, mentors, partners, rivals, employees, customers, journalists, officials, critics, experts. Tell the story from several sides, like a lively documentary: bring in 3 to 5 different extras (people involved, an expert, a supporter, a critic, an ordinary person affected, a reporter…), each speaking 2 to 5 lines in their own voice and personality. Include short exchanges where two extras talk to each other (an interview by a reporter, a question and answer, a friendly argument, a family conversation) for 3 to 6 lines; at most two different extras take part in one exchange, then hosts react. Give each extra a distinct way of speaking (an old farmer speaks simply and warmly, an expert precisely, a reporter asks sharp questions, a young student is enthusiastic). Every extra line that is not a documented quote from the sources is a dramatized reconstruction (tai_hien true) and must stay faithful to the documented facts and viewpoints; never invent events, numbers or private details through them. Extras (also shown silently with nhan_vat_phu while the narrator talks about such a person — family, mentors, partners, rivals, workers, officials…): ${MO_TA_NHAN_VAT_PHU}.
Rules:
- The chapter number and title are read aloud automatically at the start of each chapter: never announce "Chương 2" or the chapter title yourself.
- Write ${o.soCau} lines for this chapter, not fewer, covering only what this chapter of the plan says, in order. Never pad, never repeat; every line adds a fact, a scene, an emotion, a question or a reveal. Something new every 30-60 seconds; plant open loops and pay them off.
- Mèo Mun and Robot Bit are NOT a question-and-answer machine. Vary what they do: a gasp or a one-word reaction ("Trời ơi!"), a light joke that eases a heavy moment, a comparison with life today, a moral question, a wrong guess that the narrator corrects, the two of them disagreeing. At most one third of Mèo Mun's lines are questions, never start two of her lines the same way, and in tragic or tense scenes let them stay silent for a long stretch so the drama can breathe.
- Rhythm like a real film: mix very short punchy lines (3 to 6 words, e.g. "Ông ấy đã thua.") with longer ones; after a big reveal use a short line, and set lang true on the line right after it. Never let more than 4 lines in a row have similar length.
- Plant at least one detail early in the chapter that pays off later (a promise, an object, a rival, a fear).
- Documentary style, not Wikipedia: scenes, human behaviour, specific details, conflict, emotion; do not read lists of dates or stuff numbers.
- Use only facts from the research (verified ones as facts; reported ones with careful wording like "theo nhiều nguồn tin"; disputed ones as disputed). Never invent events, numbers or quotes.
- Legal and sensitive cases (real people in trials, fraud, corruption, crimes, scandals): state only what courts, official indictments, police announcements or major mainstream media reported, and say where it comes from ("theo cáo trạng", "theo bản án", "theo báo chí"); call accusations accusations until a final verdict; never invent private conversations, motives, sums or victims; any line put in such a person's mouth must be a documented quote or clearly a reconstruction; keep a neutral, respectful tone without insults or mockery of the people involved, their families or ethnic origin.
- A sentence put in a real person's mouth that is not a documented quote is a dramatized reconstruction: set tai_hien true for that line (it will be shown with a "Tái hiện" tag); every other line tai_hien false. Prefer the narrator telling it instead.
- the_moc: EVERY time the story moves to a new year or a new place (in chapters that cover many years this means about every 6 to 8 lines), a short card like "1993 · Kharkov, Ukraina" (Vietnamese); otherwise an empty string.
- anh: the number of a REAL PHOTO from the <photos> list that shows exactly what this line talks about (the person at that age or event, the place, the building, the product, the artwork…), shown framed on screen like in a documentary while the line is spoken; -1 when no photo truly fits. Use photos on about 15-25% of the lines, mostly narrator lines, spread across the chapter; one photo may cover up to 3 lines in a row about the same thing; never put a photo on a line about something else just to use it, and never imply a photo shows something it does not (a statue is a statue, not the person).
- Each line at most 30 words, written to be read aloud: no emoji, hashtags or URLs. Keep the channel name exactly as "Công Nghệ 24H".
- nhan_vat_phu shows who the line is about on stage: when the narrator (or Mèo Mun / Robot Bit) talks about ${o.ten}, set nhan_vat_phu to nhan_vat_chinh so the protagonist acts the scene while it is told; when it is about another person, show the kind of person (for example doanh_nhan for a business partner, ba_lao for a grandmother) as a generic cartoon figure, never a real likeness; when an extra speaks, the same extra; when nhan_vat_chinh speaks, nhan_vat_chinh. dao_cu / bang / minh_hoa illustrate the line as usual. cam_xuc of narrator lines describes the mood of the line.
${LUAT_HINH}- moc: the hook shown in big letters for the first 2 seconds of the film: chu at most 8 Vietnamese words, truthful; bieu_tuong one emoji. (Only used for chapter 1, but always fill it.)
- Visual bible: when a <visual_bible> is given, the film's look must follow it. For each scene pick the boi_canh closest to the bible location where it happens, and write anh_nen from that location's description, era and atmosphere (in English, places only, no people); choose anh_sang from the colour language of the current life phase (warm phases am_ap / tuoi_sang, dark or crisis phases lanh / cang_thang / bi_an), thoi_tiet from the location's weather, dao_cu from its props and the era's design; when the line is about one of the bible's supporting people, pick the nhan_vat_phu that matches their role, age and gender.${
    o.vaiPhu?.length
      ? `
- Film cast: these supporting people have their own cartoon look in this film: ${o.vaiPhu.map((v, i) => `${VAI_PHU[i]} = ${v.ten} (${v.vai_tro})`).join('; ')}. When one of them speaks, ai is their code; when a line is about one of them, nhan_vat_phu is their code (never a generic extra for them, so viewers always see the same face). Generic extras only for people who are not in this cast.`
      : ''
  }`
  const keHoach = cc.phan.map((p, i) => `Chapter ${i + 1}${i + 1 === k ? ' (WRITE THIS ONE)' : ''}: ${p.tieu_de}\nEmotional curve: ${p.nhip}\n${p.noi_dung}`).join('\n\n')
  // Hồ sơ hình ảnh rút gọn (địa điểm, màu theo giai đoạn, nhân vật phụ, thiết kế thời đại) cho chỉ dẫn hình từng câu
  const hs = o.hoSo
  const kinhThanh = hs
    ? `

<visual_bible>
${JSON.stringify({
        dia_diem: hs.dia_diem.slice(0, 14).map((x) => ({ ten: x.ten, thanh_pho: x.thanh_pho, thoi_ky: x.thoi_ky, mau_sac: x.mau_sac, anh_sang: x.anh_sang, thoi_tiet: x.thoi_tiet, dao_cu: x.dao_cu, khong_khi: x.khong_khi })),
        mau_theo_giai_doan: hs.mau_theo_giai_doan,
        nhan_vat_phu: hs.nhan_vat_phu.slice(0, 12).map((x) => ({ ten: x.ten, vai_tro: x.vai_tro, ngoai_hinh: x.ngoai_hinh })),
        thiet_ke: { cong_trinh: hs.thiet_ke.cong_trinh, xe_co: hs.thiet_ke.xe_co, cong_nghe: hs.thiet_ke.cong_nghe, do_vat: hs.thiet_ke.do_vat },
      }).slice(0, 7000)}
</visual_bible>`
    : ''
  const noiDung = `Person: ${o.ten}
Big idea: ${cc.big_idea}
Structure: ${cc.cau_truc}
Chosen hook: ${cc.hook_chon}
Retention beats: ${cc.nhip_giu_chan.join(' → ')}

<research>
${JSON.stringify({ ho_so: o.nghienCuu.ho_so, moc_doi: o.nghienCuu.moc_doi, su_that: o.nghienCuu.su_that })}
</research>${kinhThanh}

<plan>
${keHoach}
</plan>

<photos>
${(o.anh ?? []).length ? (o.anh ?? []).map((a, i) => `${i}. ${a.nam ? a.nam + ' — ' : ''}${a.mo_ta}${a.chinh ? ' (main portrait)' : ''}`).join('\n') : '(no photos: set anh -1 on every line)'}
</photos>

${viTri}${o.noiTiep.length ? `\n\nThe previous chapter ended with these lines:\n${o.noiTiep.join('\n')}` : ''}

Write every Vietnamese text field in proper Vietnamese WITH full diacritics, for example "Năm 1993, ở Kharkov lạnh giá…", never "Nam 1993, o Kharkov". Only enum codes are written without diacritics.`
  let totNhat: { loi: CauPhim[]; moc: { chu: string; bieu_tuong: string } } | null = null
  let nhacThem = ''
  for (let lan = 0; lan < 3; lan++) {
    const kq = await goiJson({
      system,
      noiDung: noiDung + nhacThem,
      effort: 'high',
      kiemTra: PhanPhimSchema,
      schema: { type: 'object', properties: { loi: { type: 'array', items: JSON_CAU_PHIM }, moc: JSON_MOC }, required: ['loi', 'moc'], additionalProperties: false },
    })
    const coDau = kq && (await damBaoDau(kq))
    if (!coDau) {
      if (kq) console.error('Kịch bản phim thiếu dấu, thêm dấu không được, viết lại')
      continue
    }
    if (!totNhat || coDau.loi.length > totNhat.loi.length) totNhat = coDau
    if (coDau.loi.length >= o.soCau * 0.75) break
    nhacThem = `\n\nYour previous draft of this chapter had only ${coDau.loi.length} lines, far too short. Write it again with ${o.soCau} lines by going deeper into the scenes, details, stakes and reactions of this chapter (not by adding greetings or repeating).`
  }
  if (!totNhat) return null
  const laEmoji = (x: string) => /\p{Extended_Pictographic}/u.test(x)
  return {
    moc: { chu: totNhat.moc.chu, bieu_tuong: laEmoji(totNhat.moc.bieu_tuong) ? totNhat.moc.bieu_tuong : '🎬' },
    loi: totNhat.loi.map((l) => ({
      ...l,
      bang: { ...l.bang, bieu_tuong: laEmoji(l.bang.bieu_tuong) ? l.bang.bieu_tuong : EMOJI_BOI_CANH[l.boi_canh] },
      minh_hoa: { ...l.minh_hoa, bieu_tuong: laEmoji(l.minh_hoa.bieu_tuong) ? l.minh_hoa.bieu_tuong : l.bang.bieu_tuong },
    })),
  }
}

// ---------- 4a. Hồ sơ hình ảnh: nhân vật, bối cảnh, thiết kế, màu, nhạc ----------
const HoSoSchema = zDoi({
  nhan_vat_chinh: z.array(
    zDoi({
      ma: z.string(), giai_doan: z.string(), tuoi: z.string(),
      ngoai_hinh: zDoi({ mat: z.string(), toc: z.string(), dang_nguoi: z.string(), da: z.string(), chieu_cao: z.string(), trang_phuc: z.string(), phu_kien: z.string() }),
      tinh_cach: zDoi({ khat_vong: z.string(), noi_so: z.string(), diem_manh: z.string(), diem_yeu: z.string(), hanh_vi: z.string(), ngon_ngu_co_the: z.string() }),
      giong: zDoi({ chat_giong: z.string(), toc_do: z.string(), cam_xuc: z.string() }),
    }),
  ),
  nhan_vat_phu: z.array(zDoi({ ten: z.string(), vai_tro: z.string(), ly_do_co_mat: z.string(), ngoai_hinh: z.string() })),
  dia_diem: z.array(
    zDoi({
      ma: z.string(), ten: z.string(), quoc_gia: z.string(), thanh_pho: z.string(), thoi_ky: z.string(), kien_truc: z.string(), noi_that: z.string(),
      ngoai_that: z.string(), mau_sac: z.string(), anh_sang: z.string(), thoi_tiet: z.string(), dao_cu: z.string(), khong_khi: z.string(),
    }),
  ),
  thiet_ke: zDoi({
    cong_trinh: z.string(), noi_that: z.string(), xe_co: z.string(), cong_nghe: z.string(), trang_phuc: z.string(), bien_hieu: z.string(),
    do_vat: z.string(), giay_to: z.string(), nguoi_nen: z.string(),
  }),
  mau_theo_giai_doan: z.array(zDoi({ giai_doan: z.string(), bang_mau: z.string(), tong_mau: z.string(), ly_do: z.string() })),
  am_nhac: z.array(zDoi({ giai_doan: z.string(), phong_cach: z.string(), nhac_cu: z.string(), nhip: z.string(), cam_xuc: z.string() })),
})
export type HoSoHinhAnh = z.infer<typeof HoSoSchema>

export async function hoSoHinhAnh(o: { ten: string; nghienCuu: NghienCuu; cauChuyen: CauChuyen }) {
  const s = (ks: string[]) => doiTuong(Object.fromEntries(ks.map((k) => [k, chuoi])))
  return goiJson({
    system: `${PHIM_DAU}

STAGE 4 — VISUAL DEVELOPMENT bible for producing this film with AI image / video tools (the realistic cinematic version), consistent across all scenes and true to each time period.
- nhan_vat_chinh: one entry per age stage of the main person (ma like CHARACTER_001_YOUNG, CHARACTER_001_ADULT, CHARACTER_001_OLD), with appearance, personality and voice. Appearance must stay consistent between scenes. For a real person describe a generic look of their age, era and style (build, hairstyle, typical clothing) rather than an exact face, so AI tools do not produce a deceptive likeness.
- nhan_vat_phu: only supporting people who really matter to the story (family, mentor, partner, rival...), with their story role; no extras added just to fill the screen.
- dia_diem: every important location (ma like LOC_01), true to its period: architecture, interior, exterior, colours, lighting, weather, props, atmosphere.
- thiet_ke: production design that fits the era: buildings, furniture, vehicles, technology, clothes, signs, objects, documents, background extras.
- mau_theo_giai_doan: the colour language of each life phase and why.
- am_nhac: music direction per phase (style, instruments, tempo, emotion).
Write the descriptions in Vietnamese.`,
    noiDung: `Person: ${o.ten}\nBig idea: ${o.cauChuyen.big_idea}\nEmotional arc: ${JSON.stringify(o.cauChuyen.cung_cam_xuc)}\n\n<research>\n${JSON.stringify({ ho_so: o.nghienCuu.ho_so, moc_doi: o.nghienCuu.moc_doi })}\n</research>\n\n<chapters>\n${o.cauChuyen.phan.map((p, i) => `${i + 1}. ${p.tieu_de}: ${p.noi_dung}`).join('\n')}\n</chapters>`,
    effort: 'medium',
    kiemTra: HoSoSchema,
    schema: doiTuong({
      nhan_vat_chinh: {
        type: 'array',
        items: doiTuong({
          ma: chuoi, giai_doan: chuoi, tuoi: chuoi,
          ngoai_hinh: s(['mat', 'toc', 'dang_nguoi', 'da', 'chieu_cao', 'trang_phuc', 'phu_kien']),
          tinh_cach: s(['khat_vong', 'noi_so', 'diem_manh', 'diem_yeu', 'hanh_vi', 'ngon_ngu_co_the']),
          giong: s(['chat_giong', 'toc_do', 'cam_xuc']),
        }),
      },
      nhan_vat_phu: mang({ ten: chuoi, vai_tro: chuoi, ly_do_co_mat: chuoi, ngoai_hinh: chuoi }),
      dia_diem: mang(Object.fromEntries(['ma', 'ten', 'quoc_gia', 'thanh_pho', 'thoi_ky', 'kien_truc', 'noi_that', 'ngoai_that', 'mau_sac', 'anh_sang', 'thoi_tiet', 'dao_cu', 'khong_khi'].map((k) => [k, chuoi]))),
      thiet_ke: s(['cong_trinh', 'noi_that', 'xe_co', 'cong_nghe', 'trang_phuc', 'bien_hieu', 'do_vat', 'giay_to', 'nguoi_nen']),
      mau_theo_giai_doan: mang({ giai_doan: chuoi, bang_mau: chuoi, tong_mau: chuoi, ly_do: chuoi }),
      am_nhac: mang({ giai_doan: chuoi, phong_cach: chuoi, nhac_cu: chuoi, nhip: chuoi, cam_xuc: chuoi }),
    }),
  })
}

// ---------- 4b. Phân cảnh + danh sách shot + prompt ảnh / video AI cho một chương ----------
const CanhSchema = zDoi({
  so: z.number(), tu_cau: z.number(), den_cau: z.number(), thoi_luong: z.string(), nam: z.string(), dia_diem: z.string(), nhan_vat: z.string(),
  hanh_dong: z.string(), cam_xuc: z.string(), muc_dich: z.string(), loi_ke: z.string(), loi_thoai: z.string(), hinh_anh: z.string(),
  am_thanh: zDoi({ nhac: z.string(), am_nen: z.string(), foley: z.string(), sfx: z.string(), khoang_lang: z.string() }),
  chuyen_canh: z.string(),
  quay: zDoi({ co_canh: z.string(), goc_may: z.string(), ong_kinh: z.string(), chuyen_dong: z.string(), ly_do: z.string() }),
  anh_sang: zDoi({ chinh: z.string(), phu: z.string(), nguoc: z.string(), thuc_te: z.string(), moi_truong: z.string(), nhiet_mau: z.string(), tuong_phan: z.string(), bong: z.string(), thoi_diem: z.string() }),
  bo_cuc: zDoi({ tien_canh: z.string(), trung_canh: z.string(), hau_canh: z.string() }),
  mau: z.string(),
  dung: zDoi({ thoi_luong_shot: z.string(), diem_cat: z.string(), b_roll: z.string(), hieu_ung: z.string(), chu_tren_hinh: z.string() }),
  prompt_anh: z.string(),
  prompt_video: z.string(),
})
export type CanhPhim = z.infer<typeof CanhSchema>

export async function phanCanhChuong(o: { ten: string; hoSo: HoSoHinhAnh | null; cauChuyen: CauChuyen; k: number; loi: CauPhim[] }) {
  const s = (ks: string[]) => doiTuong(Object.fromEntries(ks.map((k) => [k, chuoi])))
  const kq = await goiJson({
    system: `${PHIM_DAU}

STAGE 5 — SCENE BREAKDOWN, SHOT LIST and AI PROMPTS for chapter ${o.k} (the realistic cinematic version made with AI video tools such as Veo, Kling or Runway; the narration is the script lines in the user turn).
Split the chapter into 4 to 10 scenes in order; together they cover every line (tu_cau / den_cau are 1-based line numbers). For each scene: thoi_luong (estimated seconds), year, location id (from the bible), characters (ids), action, emotion, purpose in the story, loi_ke (the voiceover it carries, summarised), loi_thoai (dialogue if any, with "TÁI HIỆN" when dramatized), the visual idea, sound (music, ambience, foley, sfx, deliberate silence), transition, camera (shot size, angle incl. eye level / low / high / dutch, lens 24/35/50/85mm or macro, movement with a PURPOSE, why), lighting (key, fill, back, practical, ambient, colour temperature, contrast, shadow, time of day), composition with foreground / midground / background for depth and parallax, colour grade, editing (shot length, cut point, b-roll, effect like match cut / cross dissolve / speed ramp / slow motion only when it serves the story, on-screen text).
prompt_anh: an English keyframe prompt; prompt_video: an English prompt ready for an AI video tool, containing subject, age, action, location, time period, costume, camera, lens, camera movement, composition, lighting, colour, depth, atmosphere, emotion, realism, motion and continuity notes (character / location ids). Never ask a tool to reproduce a real person's exact face: describe a generic person of that age, era and style, or use silhouettes, hands, back views, objects and places; mark reconstructions as "dramatized reconstruction".
Write everything except the two prompts in Vietnamese.`,
    noiDung: `Person: ${o.ten}\nBig idea: ${o.cauChuyen.big_idea}\nChapter ${o.k}: ${o.cauChuyen.phan[o.k - 1]?.tieu_de} — ${o.cauChuyen.phan[o.k - 1]?.nhip}\n\n<bible>\n${JSON.stringify(o.hoSo ? { nhan_vat_chinh: o.hoSo.nhan_vat_chinh.map((n) => ({ ma: n.ma, giai_doan: n.giai_doan, tuoi: n.tuoi, ngoai_hinh: n.ngoai_hinh })), dia_diem: o.hoSo.dia_diem.map((d) => ({ ma: d.ma, ten: d.ten, thoi_ky: d.thoi_ky })), mau_theo_giai_doan: o.hoSo.mau_theo_giai_doan } : {})}\n</bible>\n\n<script>\n${o.loi.map((l, i) => `${i + 1}. [${l.ai}${l.tai_hien ? ', tái hiện' : ''}] ${l.chu}`).join('\n')}\n</script>`,
    effort: 'medium',
    kiemTra: z.object({ canh: z.array(CanhSchema).min(1) }),
    schema: doiTuong({
      canh: {
        type: 'array',
        items: doiTuong({
          so: so, tu_cau: so, den_cau: so,
          ...Object.fromEntries(['thoi_luong', 'nam', 'dia_diem', 'nhan_vat', 'hanh_dong', 'cam_xuc', 'muc_dich', 'loi_ke', 'loi_thoai', 'hinh_anh'].map((k) => [k, chuoi])),
          am_thanh: s(['nhac', 'am_nen', 'foley', 'sfx', 'khoang_lang']),
          chuyen_canh: chuoi,
          quay: s(['co_canh', 'goc_may', 'ong_kinh', 'chuyen_dong', 'ly_do']),
          anh_sang: s(['chinh', 'phu', 'nguoc', 'thuc_te', 'moi_truong', 'nhiet_mau', 'tuong_phan', 'bong', 'thoi_diem']),
          bo_cuc: s(['tien_canh', 'trung_canh', 'hau_canh']),
          mau: chuoi,
          dung: s(['thoi_luong_shot', 'diem_cat', 'b_roll', 'hieu_ung', 'chu_tren_hinh']),
          prompt_anh: chuoi,
          prompt_video: chuoi,
        }),
      },
    }),
  })
  return kq?.canh ?? null
}

// ---------- 6. Đóng gói YouTube + Shorts + chấm điểm + kiểm tra chất lượng ----------
const NHOM_TIEU_DE = ['to_mo', 'cam_xuc', 'cau_chuyen', 'tim_kiem'] as const
const DongGoiSchema = zDoi({
  tieu_de: z.array(zDoi({ chu: z.string(), nhom: z.enum(NHOM_TIEU_DE), ctr: z.number(), chinh_xac: z.number(), to_mo: z.number(), tim_kiem: z.number(), cam_xuc: z.number() })),
  top5: z.array(z.string()),
  thumbnail: z.array(
    zDoi({
      chu_the: z.string(), bieu_cam: z.string(), bo_cuc: z.string(), nen: z.string(), anh_sang: z.string(), mau: z.string(), chu: z.string(),
      vi_tri_chu: z.string(), tuong_phan: z.string(), diem_to_mo: z.string(), prompt_anh: z.string(),
    }),
  ),
  mo_ta: z.string(),
  chuong: z.array(z.string()),
  tu_khoa: z.array(z.string()),
  hashtag: z.array(z.string()),
  binh_luan_ghim: z.string(),
  bai_cong_dong: z.string(),
  shorts: z.array(zDoi({ tieu_de: z.string(), hook: z.string(), than: z.string(), cao_trao: z.string(), cta: z.string(), hinh_anh: z.string(), thoi_luong: z.string(), tu_chuong: z.number() })),
  diem: zDoi({
    cau_chuyen: z.number(), hook: z.number(), cam_xuc: z.number(), to_mo: z.number(), hinh_anh: z.number(), am_thanh: z.number(), giu_chan: z.number(),
    tieu_de: z.number(), thumbnail: z.number(), chia_se: z.number(), su_that: z.number(), tong: z.number(),
  }),
  tiem_nang: z.string(),
  kiem_tra: z.array(zDoi({ muc: z.string(), dat: z.boolean(), ghi_chu: z.string() })),
})
export type DongGoi = z.infer<typeof DongGoiSchema>

export async function dongGoiYouTube(o: { ten: string; nghienCuu: NghienCuu; cauChuyen: CauChuyen; kichBan: string }) {
  return goiJson({
    system: `${PHIM_DAU}

STAGE 6 — YOUTUBE PACKAGING, SHORTS, CONTENT SCORE and QUALITY CONTROL for the finished film (script in the user turn).
- tieu_de: 20 title options in Vietnamese (5 nhom to_mo curiosity, 5 cam_xuc emotional, 5 cau_chuyen story, 5 tim_kiem search), each scored 0-10 for ctr, chinh_xac (accuracy), to_mo, tim_kiem, cam_xuc; at most 90 characters; no false clickbait; the best ones name the specific event or twist and leave a question the film answers (an open loop) instead of a generic "câu chuyện về …". top5: the best 5 titles copied exactly.
- thumbnail: 5 concepts (subject, facial expression, composition, background, lighting, colour, at most 4-5 words of text, text position, visual contrast, curiosity element) + prompt_anh in English for an AI image tool (no exact likeness of a real person: generic figure, silhouette or symbolic objects). Each concept is ONE curious situation with ONE big face readable on a phone, high contrast, and chu of 2 to 5 words (no small text, no crowd). The thumbnail must match the real content.
- mo_ta: the YouTube description in Vietnamese (hook, what viewers will discover, note that dramatized scenes are reconstructions, invite to subscribe to Công Nghệ 24H). chuong: one short chapter title per script chapter, in order. tu_khoa: 10-20 keywords; hashtag: 3-6 hashtags with #; binh_luan_ghim: a pinned comment that starts a discussion; bai_cong_dong: a community post announcing the film.
- shorts: 5 moments from the film that work as Shorts (title, hook, body, payoff, call to action, visual idea, duration, tu_chuong = chapter number).
- diem: scores 0-100 for story, hook, emotion, curiosity, visual, audio, retention, title, thumbnail, shareability, factual quality and overall. tiem_nang: a sober sentence on the CONTENT POTENTIAL (never promise it will go viral).
- kiem_tra: the final quality checklist — no invented events, no invented quotes, fact checked, accurate timeline, character continuity, location continuity, historical accuracy, strong opening, clear story, emotional progression, conflict, turning point, climax, strong ending, camera direction, lighting, sound design, AI prompts, editing plan, title, thumbnail, YouTube package, Shorts — each with dat (true/false) and a short honest note in Vietnamese.`,
    noiDung: `Person: ${o.ten}\nBig idea: ${o.cauChuyen.big_idea}\nAngle: ${o.cauChuyen.goc_chon}\n\n<research_facts>\n${JSON.stringify(o.nghienCuu.su_that)}\n</research_facts>\n\n<script>\n${o.kichBan}\n</script>`,
    effort: 'medium',
    kiemTra: DongGoiSchema,
    schema: doiTuong({
      tieu_de: mang({ chu: chuoi, nhom: { type: 'string', enum: [...NHOM_TIEU_DE] }, ctr: so, chinh_xac: so, to_mo: so, tim_kiem: so, cam_xuc: so }),
      top5: mangChuoi,
      thumbnail: mang(Object.fromEntries(['chu_the', 'bieu_cam', 'bo_cuc', 'nen', 'anh_sang', 'mau', 'chu', 'vi_tri_chu', 'tuong_phan', 'diem_to_mo', 'prompt_anh'].map((k) => [k, chuoi]))),
      mo_ta: chuoi,
      chuong: mangChuoi,
      tu_khoa: mangChuoi,
      hashtag: mangChuoi,
      binh_luan_ghim: chuoi,
      bai_cong_dong: chuoi,
      shorts: mang({ tieu_de: chuoi, hook: chuoi, than: chuoi, cao_trao: chuoi, cta: chuoi, hinh_anh: chuoi, thoi_luong: chuoi, tu_chuong: so }),
      diem: doiTuong(Object.fromEntries(['cau_chuyen', 'hook', 'cam_xuc', 'to_mo', 'hinh_anh', 'am_thanh', 'giu_chan', 'tieu_de', 'thumbnail', 'chia_se', 'su_that', 'tong'].map((k) => [k, so]))),
      tiem_nang: chuoi,
      kiem_tra: mang({ muc: chuoi, dat: { type: 'boolean' }, ghi_chu: chuoi }),
    }),
  })
}
