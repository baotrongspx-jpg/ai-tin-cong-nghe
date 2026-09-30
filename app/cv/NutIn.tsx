'use client'

// Mở hộp thoại in của trình duyệt: chọn "Lưu dưới dạng PDF" để có file CV 1 trang A4
export default function NutIn() {
  return (
    <button onClick={() => window.print()} className="btn btn-fb">
      ⬇ Lưu PDF
    </button>
  )
}
