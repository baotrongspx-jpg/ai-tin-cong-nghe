// Khung xương hiện ngay khi chuyển trang, trong lúc máy chủ đọc dữ liệu (thanh bên + thanh trên đã có sẵn ở layout)
export default function KhungCho() {
  const khoi = 'animate-pulse rounded-lg bg-slate-200/80'
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6" aria-busy="true" aria-label="Đang tải">
      <div className="mb-6 flex items-center gap-4">
        <div className={`${khoi} h-12 w-12 rounded-2xl`} />
        <div>
          <div className={`${khoi} mb-2 h-7 w-56`} />
          <div className={`${khoi} h-4 w-80 max-w-full`} />
        </div>
      </div>
      <div className="mb-5 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${khoi} h-9 w-28 rounded-full`} />
        ))}
      </div>
      <div className="space-y-5">
        {[0, 1].map((i) => (
          <div key={i} className="the grid gap-5 p-5 md:grid-cols-[250px_1fr] xl:grid-cols-[250px_1fr_290px]">
            <div className={`${khoi} aspect-square w-full rounded-xl`} />
            <div className="space-y-3">
              <div className={`${khoi} h-4 w-40`} />
              <div className={`${khoi} h-7 w-3/4`} />
              <div className={`${khoi} h-10 w-full`} />
              <div className={`${khoi} h-48 w-full`} />
            </div>
            <div className="hidden space-y-3 xl:block">
              <div className={`${khoi} h-4 w-32`} />
              <div className={`${khoi} h-24 w-full`} />
              <div className={`${khoi} h-14 w-full rounded-xl`} />
              <div className={`${khoi} h-14 w-full rounded-xl`} />
              <div className={`${khoi} h-14 w-full rounded-xl`} />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
