# Máy đọc giọng VieNeu-TTS cho trang duyệt bài (chạy trên Hugging Face Spaces, CPU miễn phí).
# POST /doc  {"cau": ["câu 1", "câu 2", ...], "giong": "Hải Đăng"}  kèm header Authorization: Bearer <KHOA>
# → WAV 48 kHz mono 16-bit, header X-Do-Dai: thời lượng (giây) từng câu, đã gồm khoảng ngắt sau câu.
import io
import os
import threading
import wave

import numpy as np
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from vieneu import Vieneu

KHOA = os.environ.get('KHOA', '')
GIONG_MAC_DINH = 'Hải Đăng'
NGAT = 0.25  # giây im lặng sau mỗi câu

app = FastAPI()
# int8 nhanh hơn ~1,4 lần nhưng cần CPU có VNNI (Intel đời 12 trở lên...), máy cũ hơn đặt DO_CHINH_XAC=fp32
may = Vieneu(precision=os.environ.get('DO_CHINH_XAC', 'int8'))
khoa_may = threading.Lock()  # mỗi lần chỉ đọc một bài, đỡ tràn RAM
DS_GIONG = {ten for _, ten in may.list_preset_voices()}
# Làm nóng: lần đọc đầu tiên sau khi bật chậm gấp đôi, đọc thử một câu ngay lúc khởi động
may.infer('Xin chào.', voice=GIONG_MAC_DINH)


class YeuCau(BaseModel):
    cau: list[str]
    giong: str | None = None


@app.get('/')
def song():
    return {'ok': True, 'giong': sorted(DS_GIONG)}


@app.post('/doc')
def doc(yc: YeuCau, authorization: str = Header('')):
    if not KHOA or authorization != f'Bearer {KHOA}':
        raise HTTPException(401, 'Sai khóa')
    cau = [c.strip() for c in yc.cau if c.strip()]
    if not cau or sum(map(len, cau)) > 5000:
        raise HTTPException(400, 'Cần 1–5000 ký tự')
    giong = yc.giong if yc.giong in DS_GIONG else GIONG_MAC_DINH
    with khoa_may:
        doan = may.infer_batch(cau, voice=giong)
    sr = may.sample_rate
    lang = np.zeros(int(sr * NGAT), dtype=np.float32)
    phan, do_dai = [], []
    for a in doan:
        a = np.asarray(a, dtype=np.float32).reshape(-1)
        phan += [a, lang]
        do_dai.append(f'{(len(a) + len(lang)) / sr:.3f}')
    pcm = (np.clip(np.concatenate(phan), -1, 1) * 32767).astype('<i2').tobytes()
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm)
    return Response(buf.getvalue(), media_type='audio/wav', headers={'X-Do-Dai': ','.join(do_dai)})
