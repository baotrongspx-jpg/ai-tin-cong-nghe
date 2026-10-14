# Tự kiểm tra video sau khi ghép (học từ OpenMontage: "post-render self-review"): một lượt ffmpeg đo
# - độ to tiếng (EBU R128, LUFS) + đỉnh thật (dBTP): lệch chuẩn YouTube -14 LUFS quá 1,5, hoặc đỉnh thật vượt -1 dBTP
#   (YouTube nén lại dễ rè) thì tự chuẩn hoá tiếng 2 lượt tuyến tính (giữ nguyên độ động, không nén phẳng; giữ nguyên hình)
# - đoạn im lặng lâu (> 3 giây, trừ màn kết), khung hình đen (> 1,5 giây)
# Trả dict ghi vào youtube/<dự án>/xong.json (trang web hiện ở mục "Video đã dựng xong").
# Chạy thử: python kiem_tra_video.py <video.mp4> [--chinh]
import re
import subprocess
import sys
from pathlib import Path

FFMPEG = Path(__file__).resolve().parent.parent / 'node_modules' / 'ffmpeg-static' / 'ffmpeg.exe'
CHUAN_LUFS = -14.0
LECH_CHO_PHEP = 1.5
DINH_TOI_DA = -1.0  # dBTP
MAN_KET = 8  # giây cuối (màn kết) được phép im lặng


def _chay(lenh, gioi_han=3600):
    kq = subprocess.run(lenh, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=gioi_han)
    if kq.returncode != 0:
        raise RuntimeError(f'ffmpeg lỗi: {(kq.stderr or "")[-400:]}')
    return kq.stderr or ''


def do_video(tep, hinh=True):
    # Một lượt giải mã: âm thanh qua silencedetect + ebur128, hình (nếu cần) qua blackdetect thu nhỏ cho nhanh
    lenh = [str(FFMPEG), '-hide_banner', '-nostats', '-i', str(tep),
            '-af', 'silencedetect=noise=-45dB:d=3,ebur128=framelog=quiet:peak=true']
    lenh += ['-vf', 'scale=320:-2,blackdetect=d=1.5:pic_th=0.98:pix_th=0.06'] if hinh else ['-vn']
    loi = _chay(lenh + ['-f', 'null', '-'])
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', loi)
    do_dai = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else None
    tom_tat = loi[loi.rfind('Summary:'):] if 'Summary:' in loi else ''
    m = re.search(r'I:\s+(-?[\d.]+) LUFS', tom_tat)
    lufs = float(m.group(1)) if m else None
    m = re.search(r'True peak:\s+Peak:\s+(-?[\d.]+|-inf) dBFS', tom_tat)
    dinh = float(m.group(1)) if m and m.group(1) != '-inf' else None
    im_lang = []
    for bd, kt in re.findall(r'silence_start: (-?[\d.]+)[\s\S]*?silence_end: ([\d.]+)', loi):
        bd, kt = max(0.0, float(bd)), float(kt)
        if do_dai is None or bd < do_dai - MAN_KET:
            im_lang.append([round(bd, 1), round(kt - bd, 1)])
    man_den = [[round(float(a), 1), round(float(d), 1)] for a, _, d in re.findall(r'black_start:([\d.]+) black_end:([\d.]+) black_duration:([\d.]+)', loi)]
    return do_dai, lufs, im_lang, man_den, dinh


def chuan_hoa_tieng(tep):
    # Lượt 1 đo, lượt 2 chỉnh tuyến tính theo số đo (linear=true): cả bài to / nhỏ đều một lượng, đỉnh giới hạn -1,5 dBTP —
    # không biến thành nén động (bản cũ 1 lượt làm tiếng phẳng lì)
    import json as _json
    loi = _chay([str(FFMPEG), '-hide_banner', '-nostats', '-i', str(tep), '-vn',
                 '-af', f'loudnorm=I={CHUAN_LUFS}:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'])
    so = _json.loads(loi[loi.rfind('{'):loi.rfind('}') + 1])
    loc = (f'loudnorm=I={CHUAN_LUFS}:TP=-2:LRA=11:measured_I={so["input_i"]}:measured_TP={so["input_tp"]}'
           f':measured_LRA={so["input_lra"]}:measured_thresh={so["input_thresh"]}:offset={so["target_offset"]}:linear=true'
           ',alimiter=limit=0.75:level=false')  # chừa ~2,5 dB cho khâu nén AAC (nén xong đỉnh nhô lên lại)
    tam = tep.with_name(tep.stem + '-chinh-am' + tep.suffix)
    try:
        _chay([str(FFMPEG), '-hide_banner', '-y', '-i', str(tep), '-map', '0:v', '-map', '0:a', '-c:v', 'copy',
               '-af', loc, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', str(tam)])
        tam.replace(tep)
    finally:
        tam.unlink(missing_ok=True)


def kiem_tra_video(tep, chinh=True):
    tep = Path(tep)
    do_dai, lufs, im_lang, man_den, dinh = do_video(tep)
    kq = {'do_dai': do_dai, 'lufs': lufs, 'lufs_goc': lufs, 'dinh': dinh, 'da_chinh_am': False, 'im_lang': im_lang, 'man_den': man_den, 'ghi_chu': []}
    if chinh and lufs is not None and (abs(lufs - CHUAN_LUFS) > LECH_CHO_PHEP or (dinh is not None and dinh > DINH_TOI_DA)):
        chuan_hoa_tieng(tep)
        _, moi, _, _, dinh_moi = do_video(tep, hinh=False)
        kq.update(lufs=moi, dinh=dinh_moi, da_chinh_am=True)
    if do_dai is None or do_dai < 5:
        kq['ghi_chu'].append('Không đọc được độ dài video hoặc video quá ngắn: nên dựng lại')
    if kq['lufs'] is None:
        kq['ghi_chu'].append('Không đo được tiếng: có thể video bị mất tiếng, mở video nghe thử')
    elif abs(kq['lufs'] - CHUAN_LUFS) > LECH_CHO_PHEP + 1:
        kq['ghi_chu'].append(f'Tiếng {"nhỏ" if kq["lufs"] < CHUAN_LUFS else "to"} hơn chuẩn YouTube, mở video nghe thử')
    if im_lang:
        kq['ghi_chu'].append(f'Có {len(im_lang)} đoạn im lặng trên 3 giây: xem lại các mốc thời gian ở trên')
    if man_den:
        kq['ghi_chu'].append(f'Có {len(man_den)} đoạn hình đen: xem lại các mốc thời gian ở trên')
    return kq


if __name__ == '__main__':
    import json
    print(json.dumps(kiem_tra_video(sys.argv[1], chinh='--chinh' in sys.argv), ensure_ascii=False, indent=1))
