'use client'

// Mở hộp thoại in của trình duyệt để in CV ra giấy (tải file PDF dùng nút "Tải PDF" bên cạnh)
export default function NutIn() {
  return (
    <button onClick={() => window.print()} className="btn btn-phu">
      🖨 In
    </button>
  )
}
