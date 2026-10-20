// Lưu ảnh khung hình và khung cuối trong IndexedDB của trình duyệt, để tải lại trang không mất ảnh
// (localStorage chỉ chứa được ~5MB, không đủ cho ảnh).

const TEN_DB = 'phuc-dung'
const KHO = 'anh'

function moDb(): Promise<IDBDatabase> {
  return new Promise((ok, loi) => {
    const r = indexedDB.open(TEN_DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(KHO)
    r.onsuccess = () => ok(r.result)
    r.onerror = () => loi(r.error)
  })
}

async function giaoDich<T>(kieu: IDBTransactionMode, lam: (kho: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await moDb()
  return new Promise((ok, loi) => {
    const gd = db.transaction(KHO, kieu)
    const r = lam(gd.objectStore(KHO))
    gd.oncomplete = () => {
      db.close()
      ok(r ? r.result : undefined)
    }
    gd.onerror = () => {
      db.close()
      loi(gd.error)
    }
  })
}

export const docAnh = <T>(khoa: string) => giaoDich<T>('readonly', (k) => k.get(khoa) as IDBRequest<T>).catch(() => undefined)
export const luuAnh = (khoa: string, giaTri: unknown) => giaoDich('readwrite', (k) => void k.put(giaTri, khoa)).catch(() => undefined)
