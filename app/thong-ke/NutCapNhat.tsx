'use client'

import { useTransition } from 'react'
import { capNhatSoLieuNgay } from '../actions'
import { thongBao } from '../ThongBao'
import { IconLai, Xoay } from '../BieuTuong'

export default function NutCapNhat() {
  const [dangChay, startTransition] = useTransition()
  return (
    <button
      disabled={dangChay}
      onClick={() =>
        startTransition(async () => {
          const kq = await capNhatSoLieuNgay()
          if (!kq.ok) return thongBao('loi', kq.loi ?? 'Có lỗi')
          thongBao('ok', `Đã cập nhật số liệu ${kq.soBai} bài` + (kq.loi ? ` (một số bài lỗi: ${kq.loi})` : ''))
        })
      }
      className="btn btn-phu"
    >
      {dangChay ? <Xoay /> : <IconLai />}
      {dangChay ? 'Đang lấy số liệu…' : 'Cập nhật số liệu'}
    </button>
  )
}
