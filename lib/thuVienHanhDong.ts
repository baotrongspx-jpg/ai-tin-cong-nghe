// Thư viện hành động nhân vật mà máy dựng đang diễn được (may-nha/hoat-hinh/tao_video.mjs: DONG_TAC = cử chỉ, TRUYEN =
// hành động kể chuyện có đồ vật). Thêm hành động mới ở máy dựng thì thêm cả ở đây và ở DONG_TAC trong lib/ai.ts.
// Dùng được cả ở trình duyệt (trang dự án) lẫn máy chủ (AI chuẩn bị hành động).

export type LoaiHanhDong = 'cu_chi' | 'ke_chuyen'
// do_vat: đạo cụ hành động đã có sẵn (emoji + tên). Câu cần thêm đạo cụ khác thì gắn vat_them (nhân vật cầm thêm ở tay còn trống)
// tu_nam: hành động chỉ hợp từ năm đó (moonwalk ra đời năm 1983) — câu kể năm trước đó không dùng
export const THU_VIEN_HANH_DONG: Record<string, { ten: string; loai: LoaiHanhDong; mo_ta: string; do_vat?: string[]; tu_nam?: number }> = {
  chi_tay: { ten: 'Chỉ tay', loai: 'cu_chi', mo_ta: 'chỉ tay: buộc tội, đòi hỏi, chỉ đường' },
  khoanh_tay: { ten: 'Khoanh tay', loai: 'cu_chi', mo_ta: 'khoanh tay: tự tin, thách thức, từ chối' },
  cui_dau: { ten: 'Cúi đầu', loai: 'cu_chi', mo_ta: 'cúi đầu: thất vọng, xấu hổ, thua cuộc, xin lỗi' },
  dap_tay: { ten: 'Đập tay', loai: 'cu_chi', mo_ta: 'đập nắm tay xuống: tức giận, quyết định dứt khoát' },
  vo_tay: { ten: 'Vỗ tay', loai: 'cu_chi', mo_ta: 'vỗ tay: khen ngợi, chúc mừng' },
  tay_len_nguc: { ten: 'Tay lên ngực', loai: 'cu_chi', mo_ta: 'đặt tay lên ngực: lời hứa, chân thành, xúc động' },
  nhun_vai: { ten: 'Nhún vai', loai: 'cu_chi', mo_ta: 'nhún vai, xoè tay: không biết, bất lực' },
  gio_tay: { ten: 'Giơ tay', loai: 'cu_chi', mo_ta: 'giơ tay / nắm đấm: xung phong, chiến thắng, thề' },
  vay_tay: { ten: 'Vẫy tay', loai: 'cu_chi', mo_ta: 'vẫy tay: chào, tạm biệt, gọi ai đó' },
  cam_vat: { ten: 'Cầm vật lên xem', loai: 'cu_chi', mo_ta: 'nâng một vật lên xem: đọc thư, xem bản vẽ, xem sản phẩm' },
  viet: { ten: 'Viết', loai: 'cu_chi', mo_ta: 'viết / vẽ: ký tên, phác thảo, ghi chép' },
  om_dau: { ten: 'Ôm đầu', loai: 'cu_chi', mo_ta: 'hai tay ôm đầu: tuyệt vọng, hoảng loạn, thảm hoạ' },
  chong_cam: { ten: 'Chống cằm', loai: 'cu_chi', mo_ta: 'tay chống cằm: suy nghĩ, nghi ngờ, đặt câu hỏi' },
  xoe_tay: { ten: 'Xoè tay', loai: 'cu_chi', mo_ta: 'xoè hai bàn tay ra trước: giải thích, trình bày ý tưởng' },
  rua_bat: { ten: 'Rửa bát', loai: 'ke_chuyen', mo_ta: 'rửa bát, chà rửa, dọn nhà vệ sinh (đĩa 🍽️ trước người, miếng rửa 🧽 trong tay)', do_vat: ['🍽️ đĩa', '🧽 miếng rửa'] },
  xach_vali: { ten: 'Xách vali ra đi', loai: 'ke_chuyen', mo_ta: 'rời quê, di cư, chuyển nhà (xách vali 🧳, bước đi)', do_vat: ['🧳 vali'] },
  khoc: { ten: 'Khóc', loai: 'ke_chuyen', mo_ta: 'khóc: hai tay che mặt, nước mắt, vai run' },
  go_may: { ten: 'Gõ máy tính', loai: 'ke_chuyen', mo_ta: 'gõ phím, lập trình, làm việc với máy tính, thiết kế chip (laptop 💻 trước người)', do_vat: ['💻 máy tính xách tay'] },
  doc_sach: { ten: 'Đọc sách', loai: 'ke_chuyen', mo_ta: 'học bài, đọc sách, ôn thi (sách 📖 trước người, lật trang)', do_vat: ['📖 sách'] },
  bi_xo: { ten: 'Bị xô đẩy', loai: 'ke_chuyen', mo_ta: 'bị bắt nạt, xô đẩy, đánh: bật lùi lại, giơ tay đỡ, 💢', do_vat: ['💢 dấu tức giận'] },
  an_mung: { ten: 'Ăn mừng', loai: 'ke_chuyen', mo_ta: 'ăn mừng: nhảy lên, hai tay giơ cao', do_vat: ['💖 trái tim'] },
  phat_bieu: { ten: 'Phát biểu', loai: 'ke_chuyen', mo_ta: 'phát biểu, thuyết trình, ra mắt sản phẩm trên sân khấu (micro 🎤 lên miệng)', do_vat: ['🎤 micro'] },
  bat_tay: { ten: 'Bắt tay', loai: 'ke_chuyen', mo_ta: 'bắt tay: thoả thuận, hợp tác' },
  kiet_suc: { ten: 'Kiệt sức', loai: 'ke_chuyen', mo_ta: 'kiệt sức, thức trắng: gục đầu, 💤 bay lên', do_vat: ['💤 dấu ngủ'] },
  an_com: { ten: 'Ăn', loai: 'ke_chuyen', mo_ta: 'ăn cơm / mì (bát 🍜 trước người, đũa 🥢 đưa lên miệng)', do_vat: ['🍜 bát mì', '🥢 đũa'] },
  dem_tien: { ten: 'Đếm tiền', loai: 'ke_chuyen', mo_ta: 'đếm tiền, túng thiếu, tiết kiệm từng đồng (tiền 💵 trong tay)', do_vat: ['💵 tiền'] },
  lap_rap: { ten: 'Lắp ráp', loai: 'ke_chuyen', mo_ta: 'lắp ráp, sửa chữa, chế tạo nguyên mẫu (cờ lê 🔧, linh kiện 🔌)', do_vat: ['🔧 cờ lê', '🔌 linh kiện'] },
  chay: { ten: 'Chạy', loai: 'ke_chuyen', mo_ta: 'chạy, bỏ chạy, vội vã lao đi' },
  mo_cua: { ten: 'Mở cửa', loai: 'ke_chuyen', mo_ta: 'mở cửa / cánh cổng: vươn tay nắm tay nắm, cửa xoay mở, lùi nửa bước', do_vat: ['🚪 cánh cửa'] },
  be_em_be: { ten: 'Bế em bé', loai: 'ke_chuyen', mo_ta: 'bế con / em bé trước ngực, ru nhẹ', do_vat: ['👶 em bé'] },
  di_bo: { ten: 'Đi bộ', loai: 'ke_chuyen', mo_ta: 'bước vào trường / bước qua cổng / đi tới: đeo ba lô, hai tay nắm quai, bước đều', do_vat: ['🎒 ba lô'] },
  nhin_ra_ngoai: { ten: 'Nhìn ra ngoài', loai: 'ke_chuyen', mo_ta: 'nhìn ra cửa sổ, ngắm mùa thu: tay nâng chiếc lá ngang mắt, đăm chiêu', do_vat: ['🍂 chiếc lá'] },
  dong_may_tinh: { ten: 'Gập máy tính', loai: 'ke_chuyen', mo_ta: 'gập laptop thất vọng: trang web bị đóng, bỏ cuộc', do_vat: ['💻 máy tính xách tay'] },
  nhin_bao_giong: { ten: 'Nhìn bão giông', loai: 'ke_chuyen', mo_ta: 'ngước nhìn bão giông, tia chớp loé trên đầu: sóng gió, tranh cãi sắp tới', do_vat: ['⚡ tia chớp'] },
  lai_xe: { ten: 'Lái xe', loai: 'ke_chuyen', mo_ta: 'ngồi sau xe hơi, hai tay trên vô lăng, xe chạy rồi dừng', do_vat: ['🚗 xe hơi'] },
  gong_chuong: { ten: 'Gõ chuông', loai: 'ke_chuyen', mo_ta: 'gõ búa vào chuông: niêm yết, IPO, khai mạc phiên giao dịch', do_vat: ['🔔 cái chuông', '🔨 búa'] },
  trao_nhan: { ten: 'Trao nhẫn', loai: 'ke_chuyen', mo_ta: 'trao nhẫn cưới: kết hôn, cầu hôn; tim bay lên', do_vat: ['💍 nhẫn cưới', '💖 trái tim'] },
  em_be_khoc: { ten: 'Em bé khóc oà', loai: 'ke_chuyen', mo_ta: 'người mẹ ôm em bé đang khóc (bong bóng "Oa oa!"), nhún chân lắc lư dỗ, vỗ lưng bé, cuối cúi nhìn mỉm cười: em bé chào đời khóc vang', do_vat: ['👶 em bé', 'bong bóng tiếng khóc (vẽ sẵn)'] },
  dua_tap_kich_ban: { ten: 'Đưa tập kịch bản', loai: 'ke_chuyen', mo_ta: 'hai tay cầm tập kịch bản trước ngực, nhích lên đưa ra trước dâng tặng, chỉnh lại cho ngay, chờ đợi cười gượng: trình kịch bản, chào dự án', do_vat: ['📄 tập kịch bản (vẽ sẵn)'] },
  da_tren_ap_phich: { ten: 'Tung cước cạnh áp phích', loai: 'ke_chuyen', mo_ta: 'đứng cạnh áp phích phim trên giá, tay giữ mép áp phích, tung cước cao, cuối đặt tay lên áp phích cười tự hào: phim phá kỷ lục phòng vé', do_vat: ['🎬 áp phích phim (vẽ sẵn)'] },
  ra_mat_phim: { ten: 'Phim ra mắt', loai: 'ke_chuyen', mo_ta: 'hai tay giơ poster phim tự hào, hạ xuống rồi giơ tấm vé xem phim ngang tầm mắt, bước sang bên, thu vé về ngực: phim công chiếu', do_vat: ['🎞️ poster phim (vẽ sẵn)', '🎟️ vé xem phim'] },
  bieu_tuong_quoc_te: { ten: 'Thành biểu tượng quốc tế', loai: 'ke_chuyen', mo_ta: 'cầm bút chỉ trên bản đồ thế giới treo tường từ châu Á sang châu Mỹ, châu Âu, gõ nhẹ từng điểm, cuối đứng thẳng kiêu hãnh: nổi tiếng toàn cầu', do_vat: ['🌍 bản đồ thế giới (vẽ sẵn)', '🖊️ cây bút'] },
  luyen_tap_phau_thuat: { ten: 'Luyện tập, cắt tuyến mồ hôi', loai: 'ke_chuyen', mo_ta: 'tay trái nâng hạ quả tạ, tay phải cầm dao mổ từng nhát sát nách, mồ hôi rơi, cuối lau mồ hôi trán thở dốc: khổ luyện, tự phẫu thuật', do_vat: ['🏋️‍♂️ tạ (vẽ sẵn)', '🔪 dao mổ (vẽ sẵn)'] },
  lam_phim_hanh_dong: { ten: 'Làm phim hành động', loai: 'ke_chuyen', mo_ta: 'tay trái giữ máy quay phim cổ (cuộn phim quay), tay phải đập bảng clapper, nhìn sang, bước sang bên, cuối cười kiêu hãnh: làm phim, đạo diễn, tái định nghĩa phim', do_vat: ['🎞️ máy quay phim (vẽ sẵn)', '🎬 clapperboard (vẽ sẵn)'] },
  mua_con: { ten: 'Múa côn nhị khúc', loai: 'ke_chuyen', mo_ta: 'đứng tấn, vung côn nhị khúc xoay số tám, quất ra sau vai rồi thu về, cuối kẹp côn dưới nách trái, mày cau: võ thuật, cảnh đánh trong phim', do_vat: ['🥢 côn nhị khúc (vẽ sẵn)'] },
  uong_thuoc: { ten: 'Uống thuốc rồi chìm vào giấc ngủ', loai: 'ke_chuyen', mo_ta: 'ngồi ghế, đưa viên thuốc lên miệng nuốt, hạ tay, nhắm mắt ngả đầu, thở chậm dần, mặt nhợt nhạt: uống thuốc giảm đau, ngủ thiếp đi, ra đi', do_vat: ['💊 viên thuốc', '🪑 ghế (vẽ sẵn)'] },
  chup_anh: { ten: 'Đứng chụp ảnh nhóm', loai: 'ke_chuyen', mo_ta: 'hai tay giữ máy ảnh trước ngực, ưỡn ngực ngẩng đầu tạo dáng, chớp mắt cười nhẹ, đèn chớp loé: chụp ảnh nhóm, truyền thông săn ảnh', do_vat: ['📷 máy ảnh', '📸 máy ảnh (đèn chớp vẽ sẵn)'] },
  vut_roi: { ten: 'Cầm roi da vụt', loai: 'ke_chuyen', mo_ta: 'tay phải nắm đốc roi, vung qua đầu quật chéo xuống, thu về rồi quật ngang, đứng khựng ngực phập phồng trừng mắt: đòn roi, người cha nghiêm khắc', do_vat: ['🪵 cây roi da (vẽ sẵn)'] },
  choi_dan: { ten: 'Ôm cây đàn guitar', loai: 'ke_chuyen', mo_ta: 'ôm đàn guitar áp ngực, tay trái nắm cần, tay phải chạm dây, thân đung đưa, cúi nhìn đàn buồn, ngẩng nhìn xa: âm nhạc an ủi', do_vat: ['🎸 cây đàn guitar (vẽ sẵn)'] },
  phat_hanh_album: { ten: 'Phát hành album', loai: 'ke_chuyen', mo_ta: 'hai tay nâng đĩa nhạc trước ngực, bước sang bên giới thiệu, nâng cao khoe, cười tự hào: ra mắt album', do_vat: ['💿 đĩa nhạc'] },
  cam_cup: { ten: 'Cầm cúp vàng', loai: 'ke_chuyen', mo_ta: 'hai tay nâng cúp vàng trước ngực, nâng cao ngẩng đầu, xoay cúp lấp lánh, cười mãn nguyện: giải thưởng, kỷ lục', do_vat: ['🏆 cúp vàng', '✨ lấp lánh'] },
  chinh_mu: { ten: 'Chỉnh vành mũ', loai: 'ke_chuyen', mo_ta: 'tay phải cầm mũ phớt đưa lên đội, hai tay chỉnh vành, chân nhún theo nhạc, kéo vành che nửa trán: phong cách sân khấu', do_vat: ['🎩 chiếc mũ (vẽ sẵn: mũ phớt đen)'] },
  nhay_mua: { ten: 'Nhảy moonwalk', loai: 'ke_chuyen', tu_nam: 1983, mo_ta: 'hai đầu gối thay nhau gập nhón gót, người trôi lùi đều, tay đánh nhẹ, dừng lại ngẩng đầu cười tự mãn: điệu nhảy, vũ đạo', do_vat: [] },
  dung_duoi_den: { ten: 'Đứng dưới ánh đèn chớp', loai: 'ke_chuyen', mo_ta: 'sân khấu tối, đèn màu quét qua lại, mắt đảo cảnh giác, lùi nửa bước thủ thế, giơ tay che trán chắn ánh chói, đứng sững căng thẳng: hiểm hoạ trên sân khấu', do_vat: ['đèn sân khấu (vẽ sẵn)'] },
  bang_bo: { ten: 'Bác sĩ băng bó', loai: 'ke_chuyen', mo_ta: 'bệnh nhân đứng cạnh, bác sĩ cầm cuộn băng quấn quanh đầu (băng trắng hiện dần), ấn mép băng gật đầu, lùi lại thở phào lo âu: băng bó vết bỏng, chữa trị', do_vat: ['🩹 băng gạc (vẽ sẵn: cuộn băng)', 'bệnh nhân (vẽ sẵn)'] },
  nhin_guong: { ten: 'Nhìn vào gương', loai: 'ke_chuyen', mo_ta: 'hai tay ôm gương trước ngực, cúi nhìn bàng hoàng, lắc đầu, chớp mắt liên tục, hạ gương ngẩng lên rưng rưng: thấy mình thay đổi, bệnh da', do_vat: ['🪞 chiếc gương (vẽ sẵn)'] },
  in_bao: { ten: 'In và phát tờ báo', loai: 'ke_chuyen', mo_ta: 'đứng cạnh chồng báo trên bàn, tay phải tung tờ báo bay đi, tay trái cầm xấp, nhấc thêm rồi phát sang bên kia, cười đắc ý: báo lá cải, giật tít', do_vat: ['📰 tờ báo', 'chồng báo trên bàn (vẽ sẵn)'] },
  cam_but_run: { ten: 'Tay cầm bút run', loai: 'ke_chuyen', mo_ta: 'ngồi sau bàn, bút đặt trên khăn giấy, tay run, thở gấp, nhắm mắt rồi kiên định: ký hợp đồng trên khăn giấy, hồi hộp', do_vat: ['🖊️ cây bút', '📄 giấy ăn (vẽ sẵn: khăn giấy)', 'bàn làm việc (vẽ sẵn)'] },
  lao_dong_vat_va: { ten: 'Lao động vất vả', loai: 'ke_chuyen', mo_ta: 'vung búa rồi cầm chổi quét, lau mồ hôi, cười hy vọng: cha mẹ làm công nhân, lao công', do_vat: ['🔨 búa', '🧹 chổi'] },
  da_bong: { ten: 'Đá bóng', loai: 'ke_chuyen', mo_ta: 'sút bóng lăn đi, chạy theo rê bóng, cuối đặt chân lên bóng cười: trẻ con đá bóng', do_vat: ['⚽ quả bóng'] },
  ghi_ban: { ten: 'Ghi bàn', loai: 'ke_chuyen', mo_ta: 'rê bóng ngoặt qua lại, sút vào khung thành (lưới rung), bật nhảy giơ hai tay ăn mừng: ghi bàn', do_vat: ['⚽ quả bóng', 'khung thành (vẽ sẵn)'] },
  cam_hoa_don: { ten: 'Cầm hoá đơn', loai: 'ke_chuyen', mo_ta: 'ngồi sau bàn cầm xấp hoá đơn, tiền trên bàn, nhắm mắt cúi đầu, tay ôm trán: chi phí, nợ nần', do_vat: ['💵 tờ tiền', '📃 hóa đơn'] },
  tiem_thuoc: { ten: 'Tự tiêm thuốc', loai: 'ke_chuyen', mo_ta: 'ngồi ghế cầm ống tiêm tiêm vào đùi, nhắm mắt nén đau, thở phào: tiêm thuốc, điều trị', do_vat: ['💉 kim tiêm', '🪑 ghế (vẽ sẵn)'] },
  re_bong: { ten: 'Rê bóng qua người', loai: 'ke_chuyen', mo_ta: 'rê bóng sát chân vượt hình nộm, nghiêng người tăng tốc, dừng bóng dưới chân nhìn khung thành: đi bóng', do_vat: ['⚽ quả bóng', 'hình nộm (vẽ sẵn)'] },
  tap_luyen: { ten: 'Tập luyện', loai: 'ke_chuyen', mo_ta: 'đá bóng vào tường gạch bóng nảy lại, gập bụng, lau mồ hôi: tập luyện chăm chỉ', do_vat: ['⚽ quả bóng', 'tường tập (vẽ sẵn)'] },
  buoc_vao_phong: { ten: 'Bước vào phòng họp báo', loai: 'ke_chuyen', mo_ta: 'bước nặng nề tới bục micro, hít sâu, tay đặt lên bục, buồn bã: họp báo, thông báo ra đi', do_vat: ['bục họp báo (vẽ sẵn)'] },
  mac_ao_dau: { ten: 'Mặc áo đấu', loai: 'ke_chuyen', mo_ta: 'cầm áo đấu mới trước ngực, mặc lên người, thở dài, đứng lạc lõng: khoác áo câu lạc bộ mới', do_vat: ['👕 chiếc áo đấu (vẽ sẵn: áo PSG)'] },
  dung_nghe: { ten: 'Đứng nghe la ó', loai: 'ke_chuyen', mo_ta: 'đứng giữa sân vận động đêm, bong bóng BOO từ khán đài, vai gù, mắt đảo, rồi ngẩng cằm kiên cường: bị la ó', do_vat: ['sân vận động (vẽ sẵn)', 'bong bóng la ó (vẽ sẵn)'] },
  buoc_ra_san: { ten: 'Bước ra sân', loai: 'ke_chuyen', mo_ta: 'bước ra sân vận động rực đèn, ngẩng cao đầu cười tự tin: trận chung kết, sân khấu lớn', do_vat: ['sân vận động rực đèn (vẽ sẵn)'] },
  sut_bong: { ten: 'Sút luân lưu', loai: 'ke_chuyen', mo_ta: 'chạy đà ngắn, sút bóng vào lưới (lưới rung), giơ tay hét vỡ oà: loạt luân lưu, cú sút quyết định', do_vat: ['⚽ quả bóng đá', 'khung thành (vẽ sẵn)'] },
  choi_bong: { ten: 'Chơi bóng áo hồng', loai: 'ke_chuyen', mo_ta: 'mặc áo hồng số 10 rê bóng, động tác giả, dừng bóng cười: Inter Miami, chơi bóng ở Mỹ', do_vat: ['⚽ quả bóng', '👕 chiếc áo hồng Inter Miami (vẽ sẵn)'] },
  gan_bien: { ten: 'Gắn bảng tên', loai: 'ke_chuyen', mo_ta: 'cầm búa đóng đinh tấm bảng tên lên tường, kiểm tra, lùi lại ngước nhìn tự hào: công ty mang tên mới, treo biển', do_vat: ['🔨 cái búa', '🪧 tấm bảng (vẽ sẵn: bảng tên trên tường)'] },
  chup_anh_vay_co: { ten: 'Vẫy cờ chụp ảnh', loai: 'ke_chuyen', mo_ta: 'phất cờ ca-rô, đưa máy ảnh lên mắt bấm có đèn chớp, xe đua đỏ lao qua, cuối giơ cờ cao cười lớn: thắng cuộc đua, về đích', do_vat: ['📷 máy ảnh', '🏁 lá cờ', '🏎️ xe đua (vẽ sẵn)'] },
  noi_chuyen: { ten: 'Nói chuyện qua bàn', loai: 'ke_chuyen', mo_ta: 'ngồi sau bàn làm việc, nhấc tờ hợp đồng đưa tới khi nói, gật đầu, cuối đặt phẳng xuống bàn: thương lượng, đưa điều kiện', do_vat: ['📜 tờ hợp đồng', 'bàn làm việc (vẽ sẵn)', '🪑 ghế (vẽ sẵn)'] },
  ngoi_doi_dien: { ten: 'Ngồi đối diện', loai: 'ke_chuyen', mo_ta: 'ngồi sau bàn, tập hồ sơ trên bàn, tay đặt bàn, ngẩng nhìn người đối diện, ngả lưng, cuối đan tay: cuộc gặp căng thẳng', do_vat: ['🪑 cái ghế (vẽ sẵn)', '🗂️ tập tài liệu', 'bàn làm việc (vẽ sẵn)'] },
  hop_dong_tren_ban: { ten: 'Hợp đồng trên bàn', loai: 'ke_chuyen', mo_ta: 'ngồi sau bàn, kéo tờ hợp đồng lại gần đọc, thở ra, nhìn lạnh: hợp đồng trên bàn, điều khoản', do_vat: ['📜 tờ hợp đồng (vẽ sẵn: tờ giấy trên bàn)', 'bàn làm việc (vẽ sẵn)'] },
  thanh_lap_cong_ty: { ten: 'Thành lập công ty', loai: 'ke_chuyen', mo_ta: 'cầm giấy thành lập có dấu đỏ trước ngực, ký bằng bút, giơ lên tự hào: thành lập công ty, đội, hãng', do_vat: ['📜 giấy thành lập (vẽ sẵn)', '📜 giấy phép kinh doanh', '🖊️ cây bút'] },
  ban_hang: { ten: 'Bán xe', loai: 'ke_chuyen', mo_ta: 'chỉ tay giới thiệu chiếc ô tô cổ đỏ, tay kia cầm hồ sơ, bước dọc thân xe, tươi cười: bán hàng, nhân viên bán xe', do_vat: ['🚗 ô tô (vẽ sẵn: ô tô cổ)', '🗂️ tập hồ sơ'] },
  to_chuc_giai_dua: { ten: 'Tổ chức giải đua', loai: 'ke_chuyen', mo_ta: 'vẫy cờ ca-rô vòng tròn, tay chống hông, xe đua lao qua phía sau, cuối giơ cao cờ: tổ chức giải đua', do_vat: ['🏁 cờ đua xe', '🏎️ xe đua (vẽ sẵn)'] },
  dai_dien: { ten: 'Đại diện đội đua', loai: 'ke_chuyen', mo_ta: 'đứng cạnh xe đua đỏ, tay đặt lên xe, tay kia cầm văn bản cuộn, ưỡn ngực tự hào: đại diện hãng, đội đua chính thức', do_vat: ['🏎️ xe đua (vẽ sẵn)', '📜 văn bản cuộn'] },
  mo_ta_tinh_huong: { ten: 'Giằng co', loai: 'ke_chuyen', mo_ta: 'bước chậm, thân lắc qua lại giữa hai hướng, tay đan căng thẳng, ngoái nhìn lại, mặt bất an: mối quan hệ phức tạp, mâu thuẫn', do_vat: [] },
  phan_doi: { ten: 'Phản đối', loai: 'ke_chuyen', mo_ta: 'chống nạnh, trừng mắt, vung tay gạt đi, dang hai tay từ chối, thở hổn hển: phản đối, đòi độc lập', do_vat: [] },
  giai_the: { ten: 'Giải thể', loai: 'ke_chuyen', mo_ta: 'ôm tập hồ sơ buồn bã, lùi lại, buông rơi xuống sàn, tay che mặt: công ty giải thể, sáp nhập, đóng cửa', do_vat: ['🗂️ tài liệu giải thể'] },
  che_giau: { ten: 'Che giấu tham vọng', loai: 'ke_chuyen', mo_ta: 'chắp tay sau lưng đi chậm trong xưởng cơ khí, vuốt cỗ máy, cười bí hiểm: vỏ bọc, che giấu kế hoạch', do_vat: ['🏢 xưởng cơ khí (vẽ sẵn: cỗ máy)'] },
  chien_tranh_bung_no: { ten: 'Chiến tranh bùng nổ', loai: 'ke_chuyen', mo_ta: 'khói lửa bốc lên sau lưng, giật mình lùi, tay ôm ngực, hoảng sợ: chiến tranh, bom đạn, hiểm hoạ', do_vat: ['🔥 khói lửa (vẽ sẵn)'] },
  ra_doi_xe: { ten: 'Ra mắt chiếc xe', loai: 'ke_chuyen', mo_ta: 'giật tấm bạt phủ, chiếc xe đỏ hiện ra, chớp mắt ngạc nhiên, cười tự hào: chiếc xe đầu tiên ra đời, ra mắt mẫu xe', do_vat: ['🚗 ô tô (vẽ sẵn)', 'tấm bạt phủ (vẽ sẵn)'] },
  lai_xe_may: { ten: 'Lái xe máy', loai: 'ke_chuyen', mo_ta: 'ngồi lái xe máy đỏ nhìn ngang chạy từ phải sang trái, bánh quay, khói bô, nhún qua gờ, dừng giữa khung gạt chân chống: xe máy, động cơ gầm rú', do_vat: ['🏍️ chiếc xe máy (vẽ sẵn: xe máy Type D)', '🏍️ xe máy', '💨 khói bô (vẽ sẵn)'] },
  buoc_vao: { ten: 'Bước vào', loai: 'ke_chuyen', mo_ta: 'cầm tờ hợp đồng bước từ trái vào, dừng cạnh bàn xưởng, gật đầu chào, giơ hợp đồng trước ngực: người mới tới, cộng sự, gia nhập công ty', do_vat: ['📜 tờ hợp đồng', 'bàn xưởng (vẽ sẵn)'] },
  nhuong_vi_tri: { ten: 'Nhường ghế', loai: 'ke_chuyen', mo_ta: 'hai tay nắm lưng ghế chủ tịch đẩy tới từng bước, dừng hít sâu, buông tay, quay sang mỉm cười: từ chức, trao quyền, nhường vị trí cho thế hệ sau', do_vat: ['🪑 chiếc ghế (vẽ sẵn: ghế chủ tịch lưng cao)'] },
  dong_dau: { ten: 'Đóng dấu', loai: 'ke_chuyen', mo_ta: 'cầm con dấu gỗ dập xuống cuốn sổ hai lần, hiện vết dấu đỏ, cười tinh nghịch: con dấu, đóng dấu, làm dấu giả, ký sổ', do_vat: ['🖺 con dấu (vẽ sẵn)', '📒 cuốn sổ', 'vết dấu đỏ (vẽ sẵn)'] },
  chong_gay: { ten: 'Chống gậy', loai: 'ke_chuyen', mo_ta: 'già yếu lê bước chậm với gậy gỗ trong tay phải, mũi gậy chạm sàn theo từng bước, lưng gù, dừng tựa gậy thở dốc, cuối nhìn ra cửa sổ: tuổi già, sức yếu, những năm cuối đời', do_vat: ['🦯 gậy chống (vẽ sẵn: gậy gỗ tay cầm cong)', '🪟 cửa sổ khách sạn (vẽ sẵn)'] },
  ngoi_lang_le: { ten: 'Ngồi lặng lẽ', loai: 'ke_chuyen', mo_ta: 'ngồi ghế dựa cạnh giường, hai tay buông trên gối, vai rụt, đầu cúi, thở chậm, ngẩng nhẹ rồi nhìn xa xăm: cô đơn, tuổi già, phòng khách sạn', do_vat: ['🛏️ giường (vẽ sẵn)', '🪑 ghế (vẽ sẵn)'] },
  buoc_qua_suong: { ten: 'Bước qua sương', loai: 'ke_chuyen', mo_ta: 'bước đều từ trái sang phải qua màn sương trôi, tay gạt sương, cuối ngoảnh nhìn lại hoài niệm: quay về quá khứ, hồi tưởng', do_vat: ['🌫️ màn sương (vẽ sẵn)'] },
  nam_tay: { ten: 'Nắm tay động viên', loai: 'ke_chuyen', mo_ta: 'cúi bên giường bệnh có đứa trẻ nằm, nắm bàn tay nhỏ, siết nhẹ, gật đầu động viên, mỉm cười: cha mẹ bên giường bệnh, lời hứa', do_vat: ['🛏️ giường bệnh có cậu bé (vẽ sẵn)'] },
  nhin_bien: { ten: 'Nhìn bờ biển từ tàu', loai: 'ke_chuyen', mo_ta: 'đứng ở lan can tàu, gió biển, bờ biển New York và tượng Nữ thần Tự do phía xa, người tròng trành, sửa cổ áo, ngước nhìn hoài bão: tới Mỹ bằng tàu, vượt đại dương', do_vat: ['🚢 tàu thủy', 'lan can tàu (vẽ sẵn)', 'bờ biển + tượng Nữ thần Tự do (vẽ sẵn)'] },
  vo_vai: { ten: 'Vỗ vai giao việc', loai: 'ke_chuyen', mo_ta: 'bước tới người đứng cạnh (nhìn từ phía sau), vỗ vai hai cái, trao cuộn bản vẽ, nhướng mày, chống nạnh ra lệnh: sếp giao nhiệm vụ, thách thức', do_vat: ['📐 bản vẽ', '📜 cuộn bản vẽ (vẽ sẵn)', 'người nhận (vẽ sẵn, nhìn từ phía sau)'] },
  dan_lat: { ten: 'Đan lát', loai: 'ke_chuyen', mo_ta: 'ngồi ghế bành gỗ, cuộn len trên lòng, tay đưa hai kim đan qua lại, giữa chừng cầm cờ lê nhỏ lên xem, cuối ngẩng lên mỉm cười: đan len, may vá, người mẹ khéo tay chế dụng cụ', do_vat: ['🧶 cuộn chỉ / cuộn len', '🪡 kim đan (vẽ sẵn: hai cây kim đan)', '🔧 dụng cụ', 'ghế gỗ (vẽ sẵn)'] },
  dao_dat: { ten: 'Đào mương', loai: 'ke_chuyen', mo_ta: 'đứng dạng chân cầm xẻng dài, khom người cắm xẻng, hất đất sang bên (đống đất cao dần), quệt mồ hôi, cuối chống xẻng thở dốc: thợ đào mương, lao động chân tay, sa cơ', do_vat: ['⛏️ cây xẻng (vẽ sẵn)', 'đống đất (vẽ sẵn)', 'cục đất bay'] },
  cho_chim_an: { ten: 'Cho chim ăn', loai: 'ke_chuyen', mo_ta: 'khom người rắc thóc cho hai con bồ câu dưới đất, chim mổ hạt, mỉm cười hiền: cho bồ câu ăn, tuổi già cô độc, lui về đời sống riêng', do_vat: ['🕊️ chim bồ câu', '🌾 bó thóc', 'hạt thóc (vẽ sẵn)'] },
  xe_tai_lieu: { ten: 'Xé tài liệu', loai: 'ke_chuyen', mo_ta: 'hai tay cầm tờ giấy trước ngực, giận dữ giật rách đôi, mảnh vụn rơi, hất xuống sàn, cuối nắm tay buông thõng tức tối: xé hợp đồng, rút vốn, cắt tài trợ', do_vat: ['📜 giấy tờ', '📜 tài liệu (vẽ sẵn: tờ giấy xé đôi)', 'mảnh giấy vụn (vẽ sẵn)'] },
  thap_nen: { ten: 'Thắp nến', loai: 'ke_chuyen', mo_ta: 'nâng ngọn nến trước ngực, quầng sáng lung linh, hàng nến dưới đất, cúi đầu trang nghiêm rồi ngẩng nhìn thẳng: tưởng nhớ, tưởng niệm, tri ân', do_vat: ['🕯️ ngọn nến', 'hàng nến dưới đất (vẽ sẵn)', 'quầng sáng nến (vẽ sẵn)'] },
  choi_bai: { ten: 'Chơi bài', loai: 'ke_chuyen', mo_ta: 'ngồi sau bàn dạ xanh, cầm xấp bài, chồm tới căng thẳng, đánh một lá xuống bàn, thở dài: cờ bạc, sòng bạc', do_vat: ['🃏 lá bài', '🃏 bộ bài', '🪙 phỉnh / chip (vẽ trên bàn)', 'bàn bài (vẽ sẵn)'] },
  treo_bien: { ten: 'Treo biển hiệu', loai: 'ke_chuyen', mo_ta: 'ôm biển hiệu nâng lên áp vào tường, căn chỉnh, lùi lại ngắm: mở tiệm, lập cơ sở kinh doanh', do_vat: ['🪧 biển hiệu (vẽ sẵn)'] },
  can_hang: { ten: 'Cân hàng', loai: 'ke_chuyen', mo_ta: 'cân đĩa lắc lư, tay cầm bao gạo và cá khô, mời khách: buôn bán', do_vat: ['⚖️ cái cân', '🌾 bao gạo', '🐟 cá khô'] },
  cat_bang: { ten: 'Cắt băng khánh thành', loai: 'ke_chuyen', mo_ta: 'kéo cắt dải băng đỏ căng ngang, băng rơi, giơ kéo vẫy đám đông', do_vat: ['✂️ chiếc kéo', '🎀 dải băng đỏ (vẽ sẵn)'] },
  dap_xe: { ten: 'Dắt xe đạp', loai: 'ke_chuyen', mo_ta: 'dắt xe đạp đi chậm qua ngôi nhà vùng quê, dừng ngắm cảnh', do_vat: ['🚲 xe đạp', '🏡 ngôi nhà'] },
  doi_dau: { ten: 'Đối đầu trên võ đài', loai: 'ke_chuyen', mo_ta: 'đeo găng, thủ thế, tung chuỗi đấm hai tay rồi giơ tay chiến thắng: trận đấu, đối đầu', do_vat: ['🥊 găng tay', '🥊 găng tay đấm bốc', '💥 va chạm'] },
  dam_boc: { ten: 'Đấm bốc', loai: 'ke_chuyen', mo_ta: 'đeo găng tung chuỗi cú đấm thẳng, người lao theo', do_vat: ['🥊 găng tay', '🥊 găng tay đấm bốc', '💥 va chạm'] },
  dam_moc: { ten: 'Đấm móc', loai: 'ke_chuyen', mo_ta: 'cú móc hàm nhanh, người xoay theo', do_vat: ['🥊 găng tay', '💥 va chạm'] },
  ha_guc: { ten: 'Hạ gục', loai: 'ke_chuyen', mo_ta: 'cú đấm trái trời giáng hạ đối thủ, rồi đứng thở dốc', do_vat: ['🥊 găng tay', '💥 va chạm'] },
  dung_cho_dem: { ten: 'Đứng nghe đếm', loai: 'ke_chuyen', mo_ta: 'găng buông, khom người thở dốc nghe trọng tài đếm, từ từ ngẩng lên', do_vat: ['🥊 găng tay'] },
  buoc_vao_dai: { ten: 'Bước vào đài', loai: 'ke_chuyen', mo_ta: 'đẩy dây đài, cúi người lách vào võ đài, đứng chống hông', do_vat: ['🥊 găng tay', 'dây đài (vẽ sẵn)'] },
  dam_bao_cat: { ten: 'Đấm bao cát', loai: 'ke_chuyen', mo_ta: 'tập đấm bao cát treo cạnh, bao lắc theo cú đấm', do_vat: ['🥊 găng tay', 'bao cát (vẽ sẵn)', '💥 va chạm'] },
  can_tai: { ten: 'Cắn tai', loai: 'ke_chuyen', mo_ta: 'lao tới ôm siết, đầu lắc mạnh giận dữ, rồi giật lùi hoảng hốt', do_vat: ['🥊 găng tay', '💢 giận dữ'] },
  ganh_vac: { ten: 'Gánh vác', loai: 'ke_chuyen', mo_ta: 'ôm giỏ đồ nặng, khom người bước chậm, lau mồ hôi', do_vat: ['🧺 giỏ đồ'] },
  bat_giu: { ten: 'Còng tay', loai: 'ke_chuyen', mo_ta: 'cầm còng tay bước tới khoá tay: bắt giữ, bị bắt', do_vat: ['còng tay (vẽ sẵn)'] },
  kham_suc_khoe: { ten: 'Cân sức khoẻ', loai: 'ke_chuyen', mo_ta: 'cúi nhìn bàn cân cạnh người, gật đầu ngạc nhiên, chống hông', do_vat: ['cân sức khoẻ (vẽ sẵn)', '⚖️ cân'] },
  nhan_dai: { ten: 'Nhận đai vô địch', loai: 'ke_chuyen', mo_ta: 'đai vô địch quấn quanh eo, cúi nhìn, siết đai', do_vat: ['đai vô địch (vẽ sẵn)', '🏆 đai vô địch'] },
  tiec_tung: { ten: 'Tiệc tùng', loai: 'ke_chuyen', mo_ta: 'cầm ly uống, tay vẫy, lắc lư theo nhạc dưới đèn tiệc', do_vat: ['🍸 ly rượu', '🪩 đèn tiệc', '🎵 nhạc'] },
  di_may_bay: { ten: 'Đi máy bay', loai: 'ke_chuyen', mo_ta: 'máy bay bay ngang trời, người xách vali bước đi: bay ra nước ngoài', do_vat: ['✈️ máy bay', '🧳 vali'] },
  ngoi_thien: { ten: 'Ngồi thiền', loai: 'ke_chuyen', mo_ta: 'ngồi trên đệm thiền, tay đặt gối, mắt nhắm, thở chậm', do_vat: ['đệm thiền (vẽ sẵn)', '✨ hào quang'] },
  nam_noi: { ten: 'Em bé nằm nôi', loai: 'ke_chuyen', mo_ta: 'chào đời / ngày sinh: em bé nằm trong nôi bú bình sữa, nôi đung đưa, người đứng sau vịn nôi cúi nhìn; cuối câu em bé ngủ', do_vat: ['🛏️ cái nôi', '👶 em bé', '🍼 bình sữa', '💤 giấc ngủ'] },
  lat_dong_ho: { ten: 'Lật đồng hồ cát', loai: 'ke_chuyen', mo_ta: 'quay ngược thời gian: hai tay ôm đồng hồ cát lật ngược, ngẩng nhìn hoài niệm', do_vat: ['⏳ đồng hồ cát'] },
  rung_chuong: { ten: 'Lắc chuông', loai: 'ke_chuyen', mo_ta: 'lắc chuông cầm tay trước bảng chứng khoán, tay kia giơ nắm đấm: mở phiên, IPO', do_vat: ['🔔 chuông cầm tay', '📈 bảng chứng khoán'] },
  om_ap: { ten: 'Ôm chầm', loai: 'ke_chuyen', mo_ta: 'cầm bó hoa và nhẫn rồi vòng tay ôm chặt: đám cưới, đoàn tụ', do_vat: ['💐 bó hoa', '💍 nhẫn', '💖 trái tim'] },
  bam_nut: { ten: 'Bấm nút', loai: 'ke_chuyen', mo_ta: 'vươn tay ấn mạnh nút bấm, màn hình lớn bên cạnh loé lên: công bố, đổi tên, kích hoạt', do_vat: ['🖥️ màn hình lớn', '🔴 nút bấm'] },
  deo_kinh: { ten: 'Đeo kính thực tế ảo', loai: 'ke_chuyen', mo_ta: 'cầm kính VR nâng lên áp vào mắt: thực tế ảo, metaverse', do_vat: ['🥽 kính thực tế ảo'] },
}

// Kết quả AI chuẩn bị hành động cho cả phim (lưu trong dự án, không đụng tới lời thoại nên không làm phần đã dựng phải dựng lại)
export type CauHanhDong = {
  i: number // số thứ tự câu trong chương
  chu: string // đầu câu (để biết kịch bản đã đổi sau lần chuẩn bị)
  nguoi: string // ai làm
  chinh?: boolean // người làm chính là nhân vật chính của phim (AI lượt 1 đánh dấu — không đoán theo tên: cha con cùng họ)
  can: boolean // câu có nói tới một việc nhìn thấy được, cần diễn (không chỉ đứng nói)
  hanh_dong: string // mã trong THU_VIEN_HANH_DONG | 'moi' (máy chưa có) | 'khong'
  viec: string // nhân vật làm gì trên hình
  y_nghia?: string // ý nghĩa câu + khán giả cần nhìn thấy gì để hiểu đúng câu (mục tiêu hình ảnh)
  ten_moi: string // mã đặt cho hành động mới (khi hanh_dong = 'moi')
  do_vat: string // (bản cũ) đồ vật cần (emoji)
  do_vat_can?: string[] // đạo cụ câu này cần ("🧹 cái chổi")
  hinh_can?: HinhCan[] // mọi hình câu này cần có trên màn hình (logo, đồ vật, ảnh thật, nhân vật, địa điểm, số liệu) + đã có chưa
  chi_tiet?: string // kịch bản diễn chi tiết (cầm đạo cụ, tư thế, ánh mắt, chu trình động tác, bước chân, kết thúc, yêu cầu chuyển động)
  do_vat_thieu?: string[] // trong đó: hành động đã chọn chưa có sẵn → gắn thêm (có emoji) hoặc phải vẽ (không có emoji)
  duyet?: { kq: 'dat' | 'loi'; ghi_chu: string; luc: string } // chủ trang xem video rồi chấm cảnh của câu này (chưa có = chưa xác minh)
}
// Một hình câu thoại cần có trên màn hình (chủ trang 15/10/2026: "phân tích từng câu thoại, cần gì thì báo để chuẩn bị —
// câu có Facebook thì có biểu tượng Facebook")
export type HinhCan = {
  loai: 'logo' | 'do_vat' | 'anh_that' | 'nhan_vat' | 'dia_diem' | 'so_lieu'
  ten: string
  emoji: string
  mau: string // màu thương hiệu (logo)
  chu: string // chữ trên huy hiệu (logo)
  co: boolean // máy đã có / tự làm được
  ma?: string // địa điểm: mã địa điểm trong hồ sơ phim nơi này đúng là (LOC_xx)
  ghi_chu: string
}
export const TEN_LOAI_HINH: Record<HinhCan['loai'], string> = {
  logo: 'Logo', do_vat: 'Đồ vật', anh_that: 'Ảnh thật', nhan_vat: 'Nhân vật', dia_diem: 'Địa điểm', so_lieu: 'Số liệu',
}
// Những hình còn phải chuẩn bị (chưa có), gom theo loại + tên
export function canChuanBi(pt: PhanTichHanhDong) {
  const nhom = new Map<string, { loai: HinhCan['loai']; ten: string; ghi_chu: string; vi_du: { k: number; i: number; chu: string }[] }>()
  for (const c of pt.chuong)
    for (const x of c.cau)
      for (const h of x.hinh_can ?? []) {
        if (h.co) continue
        const ma = `${h.loai}|${h.ten.toLowerCase()}`
        const g = nhom.get(ma) ?? { loai: h.loai, ten: h.ten, ghi_chu: h.ghi_chu, vi_du: [] }
        g.vi_du.push({ k: c.k, i: x.i, chu: x.chu })
        nhom.set(ma, g)
      }
  return [...nhom.values()].sort((a, b) => a.loai.localeCompare(b.loai) || b.vi_du.length - a.vi_du.length)
}
export function danhSachChuanBi(tieuDe: string, pt: PhanTichHanhDong) {
  const ds = canChuanBi(pt)
  return [
    `CẦN CHUẨN BỊ CHO PHIM "${tieuDe}" (${ds.length} mục)`,
    ...(['anh_that', 'dia_diem', 'nhan_vat', 'do_vat', 'so_lieu', 'logo'] as const).flatMap((loai) => {
      const g = ds.filter((x) => x.loai === loai)
      return g.length
        ? ['', `== ${TEN_LOAI_HINH[loai]} (${g.length}) ==`, ...g.map((x) => `- ${x.ten} — ${x.ghi_chu} — ${x.vi_du.map((v) => `chương ${v.k} câu ${v.i + 1}`).slice(0, 4).join(', ')}`)]
        : []
    }),
  ].join('\n')
}

export type PhanTichHanhDong = { luc: string; chuong: { k: number; cau: CauHanhDong[] }[] }

// Kịch bản đã đổi sau lần chuẩn bị (số câu / đầu câu khác) → phải chuẩn bị lại
export function hanhDongCu(d: { phan: { loi: { chu: string }[] | null }[] }, pt: PhanTichHanhDong | undefined) {
  if (!pt) return true
  return d.phan.some((p, j) => {
    const c = pt.chuong.find((x) => x.k === j + 1)
    const loi = p.loi ?? []
    return !c || c.cau.length !== loi.length || c.cau.some((x, i) => x.chu !== loi[i]?.chu.slice(0, 60))
  })
}

// Các hành động máy dựng còn thiếu, gom theo mã mới
export function hanhDongThieu(pt: PhanTichHanhDong) {
  const nhom = new Map<string, { ten: string; viec: string; do_vat: Set<string>; vi_du: { k: number; i: number; chu: string; viec: string; chi_tiet?: string }[] }>()
  for (const c of pt.chuong)
    for (const x of c.cau) {
      if (x.hanh_dong !== 'moi') continue
      const ma = x.ten_moi || 'hanh_dong_moi'
      const g = nhom.get(ma) ?? { ten: ma, viec: x.viec, do_vat: new Set<string>(), vi_du: [] }
      for (const v of x.do_vat_can ?? Array.from(x.do_vat).filter((y) => /\p{Extended_Pictographic}/u.test(y))) g.do_vat.add(v)
      g.vi_du.push({ k: c.k, i: x.i, chu: x.chu, viec: x.viec, chi_tiet: x.chi_tiet })
      nhom.set(ma, g)
    }
  return [...nhom.values()].sort((a, b) => b.vi_du.length - a.vi_du.length)
}

// Đạo cụ còn thiếu, gom theo đạo cụ: có emoji thì gắn được ngay (nhân vật cầm thêm), không có thì phải vẽ
export const coEmoji = (x: string) => /\p{Extended_Pictographic}|\p{Regional_Indicator}{2}/u.test(x)
export function doVatThieu(pt: PhanTichHanhDong) {
  const nhom = new Map<string, { vat: string; vi_du: { k: number; i: number; chu: string; viec: string }[] }>()
  for (const c of pt.chuong)
    for (const x of c.cau)
      for (const v of x.do_vat_thieu ?? []) {
        const g = nhom.get(v) ?? { vat: v, vi_du: [] }
        g.vi_du.push({ k: c.k, i: x.i, chu: x.chu, viec: x.viec })
        nhom.set(v, g)
      }
  return [...nhom.values()].sort((a, b) => b.vi_du.length - a.vi_du.length)
}
// Emoji đầu tiên trong chuỗi đạo cụ ("🧹 cái chổi" → "🧹")
export const emojiCua = (x: string) => x.match(/\p{Regional_Indicator}{2}|\p{Extended_Pictographic}\uFE0F?(\u200D\p{Extended_Pictographic}\uFE0F?)*/u)?.[0] ?? ''
// Emoji bỏ dấu biến thể (🖊️ và 🖊 là một) để so đạo cụ có sẵn / còn thiếu
export const emojiGoc = (x: string) => emojiCua(x).replace(/️/g, '')

// Kịch bản diễn chi tiết của cả phim (từng chương, từng câu) để chép / lưu
export function kichBanDien(tieuDe: string, pt: PhanTichHanhDong, tenChuong: (k: number) => string) {
  return [
    `KỊCH BẢN DIỄN — ${tieuDe}`,
    ...pt.chuong.flatMap((c) => [
      '',
      `===== ${tenChuong(c.k)} =====`,
      ...c.cau.flatMap((x) => ['', `Câu ${x.i + 1} — ${x.nguoi}: "${x.chu}…"`, x.chi_tiet || x.viec, ...(x.do_vat_can?.length ? [`Đạo cụ: ${x.do_vat_can.join(', ')}`] : [])]),
    ]),
  ].join('\n')
}

// Lời nhắn chép vào Claude Code để xây các hành động còn thiếu
export function yeuCauClaudeCode(tieuDe: string, pt: PhanTichHanhDong) {
  const thieu = hanhDongThieu(pt)
  const veThem = doVatThieu(pt).filter((g) => !coEmoji(g.vat))
  return [
    `Xây thêm hành động nhân vật cho máy dựng phim (dự án C:\\Users\\Admin\\OneDrive\\Desktop\\ai-tin-cong-nghe), để phim "${tieuDe}" nhân vật diễn đúng từng lời thoại.`,
    '',
    'Chỗ cần sửa:',
    '- may-nha/hoat-hinh/tao_video.mjs: thêm vào TRUYEN (cách diễn bằng GSAP: tay, đầu, thân, bước đi), VAT (đồ vật emoji + chỗ cầm: phai / trai / truoc / dau) và TU_TRUYEN (từ trong lời kể để tự nhận ra).',
    '- lib/ai.ts: thêm mã vào DONG_TAC và mô tả trong luật chọn dong_tac.',
    '- lib/thuVienHanhDong.ts: thêm vào THU_VIEN_HANH_DONG (kèm do_vat: các đạo cụ hành động đó có sẵn).',
    'Mỗi hành động phải có ĐỦ ĐẠO CỤ phối hợp với người diễn (rửa chén có chén, quét nhà có chổi, ký hợp đồng có bút và tờ hợp đồng…), đặt đúng chỗ (trong tay / trước người) và chuyển động theo tay.',
    'Quy ước tay: tay phải xoay dương / tay trái xoay âm = đưa vào trước người; ngược lại = dang ra / giơ lên. Chỉ nhân vật người (phu<k>) dùng hành động kể chuyện, Mèo Mun / Robot Bit dùng cử chỉ.',
    'Dựng thử bằng hyperframes snapshot, xem ảnh chụp thấy đúng tư thế rồi mới lưu và đẩy lên. Không dựng lại phim đã xong.',
    '',
    `Các hành động còn thiếu (${thieu.length}):`,
    ...thieu.flatMap((g, n) => [
      `${n + 1}. ${g.ten} — ${g.viec}${g.do_vat.size ? ` — đạo cụ đi kèm: ${[...g.do_vat].join(', ')}` : ''} — ${g.vi_du.length} câu`,
      ...g.vi_du.slice(0, 3).map((v) => `   • Chương ${v.k}, câu ${v.i + 1}: "${v.chu}…" → ${v.viec}`),
      ...(g.vi_du.find((v) => v.chi_tiet)?.chi_tiet
        ? ['   Kịch bản diễn (làm đúng theo):', ...g.vi_du.find((v) => v.chi_tiet)!.chi_tiet!.split('\n').map((d) => `      ${d}`)]
        : []),
    ]),
    ...(veThem.length
      ? [
          '',
          `Đạo cụ còn thiếu, không có emoji nên phải vẽ (SVG) rồi cho vào VAT / ganVat (${veThem.length}):`,
          ...veThem.flatMap((g, n) => [
            `${n + 1}. ${g.vat} — ${g.vi_du.length} câu`,
            ...g.vi_du.slice(0, 2).map((v) => `   • Chương ${v.k}, câu ${v.i + 1}: "${v.chu}…" → ${v.viec}`),
          ]),
        ]
      : []),
  ].join('\n')
}
