// Khung xương hiện ngay khi chuyển trang, trong lúc máy chủ đọc dữ liệu
export default function KhungCho() {
  const khoi = 'animate-pulse rounded-lg bg-slate-200/80'
  return (
    <>
      <div className="sticky top-0 z-40 h-14 border-b border-slate-200/70 bg-white/80 backdrop-blur-md" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6" aria-busy="true" aria-label="Đang tải">
        <div className={`${khoi} mb-2 h-8 w-56`} />
        <div className={`${khoi} mb-6 h-4 w-80 max-w-full`} />
        <div className="mb-5 flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${khoi} h-9 w-28 rounded-full`} />
          ))}
        </div>
        <div className="space-y-5">
          {[0, 1].map((i) => (
            <div key={i} className="the grid gap-5 p-5 md:grid-cols-[280px_1fr]">
              <div className={`${khoi} aspect-square w-full rounded-xl`} />
              <div className="space-y-3">
                <div className={`${khoi} h-4 w-40`} />
                <div className={`${khoi} h-10 w-full`} />
                <div className={`${khoi} h-48 w-full`} />
                <div className={`${khoi} h-10 w-2/3`} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
