# TASK 12 — Integration (Prompt Formatter/Queue)

## Prasyarat
Task 10 dan Task 11 selesai.

## Konteks
Sambungkan service layer (Task 10) ke komponen visual (Task 11), plus
implementasi browser API nyata (clipboard, file download) yang sengaja
ditunda dari dua task sebelumnya.

## Keputusan Arsitektur Penting — Baca Sebelum Mulai

**Fitur ini TIDAK PAKAI Zustand + `persist` middleware.** Gunakan
`dexie-react-hooks` (`useLiveQuery`) untuk baca data batch/items langsung
dari Dexie secara reaktif, dan panggil fungsi service Task 10 langsung untuk
tiap write.

Alasannya: di `01-stability-fixes.md` kita udah pernah kena race condition
karena Zustand `persist` dengan async storage ke IndexedDB punya hydration
phase yang gak sinkron. Fitur Formatter ini sumber kebenarannya cuma Dexie
(single batch aktif) — gak butuh layer Zustand di tengah sama sekali, jadi
kelas bug itu otomatis gak ada ruang buat muncul di sini. Jangan tambah
abstraksi yang gak perlu.

## Non-Goals
- JANGAN ubah arsitektur state management fitur lain (Generator/History tetap
  pakai Zustand seperti sekarang) — keputusan di atas khusus buat Formatter.
- JANGAN ubah logic parsing/cleaning dari Task 10.

---

## 1. Wiring Input → Process

- Hubungkan tombol Process ke `parseRawText`/`parseCsvPreview`/
  `parseCsvWithColumn` sesuai mode input yang dipilih.
- Cek batch existing (`useLiveQuery(() => getActiveBatch())`) untuk tentukan
  perlu tampilkan dialog konfirmasi replace atau tidak (`copiedCount > 0`).
- Setelah konfirmasi (atau langsung kalau gak perlu konfirmasi), panggil
  `createFormatterBatch`.

## 2. Wiring Queue

- `useLiveQuery` untuk baca `formatter_batch` + `formatter_items` — render
  otomatis reaktif tiap ada perubahan status, gak perlu manual refetch.
- Tombol **Copy**:
  1. `navigator.clipboard.writeText(promptText)` — bungkus try/catch, karena
     Clipboard API bisa gagal (permission/browser context tertentu). Tampilkan
     toast sukses/gagal (pola §6.3 `DESIGN.md` — sudah ada untuk fitur copy
     prompt di Generator, reuse pattern yang sama, jangan buat toast baru
     yang beda style).
  2. Kalau clipboard berhasil: panggil `markItemCopied(itemId)`, lalu
     `setCurrentIndex(nextIndex)` untuk auto-advance.
  3. Kalau clipboard gagal: **jangan** tandai sebagai copied — status harus
     merefleksikan apa yang benar-benar terjadi, bukan diasumsikan berhasil.
- Tombol **Prev** dan klik item di overview list: panggil `setCurrentIndex`
  langsung tanpa menyentuh status copied.
- Tombol **Reset Progress**: setelah dialog konfirmasi, panggil
  `resetAllProgress()`.

## 3. Wiring CSV Column-Picker

- Upload file `.csv` → panggil `parseCsvPreview` segera setelah file dibaca
  (pakai `FileReader`/`file.text()`).
- Kalau `detectedColumn !== null`: langsung lanjut ke clean+summary tanpa
  munculkan picker (skip step, sesuai DoD Task 11).
- Kalau `null`: render picker dari Task 11 dengan `columns`+`previewRows`,
  tunggu user pilih, baru panggil `parseCsvWithColumn`.

## 4. Wiring Download

- Tombol Download → panggil `exportBatch(items, format, scope)` dari Task 10,
  dapat string hasil.
- Trigger browser save: buat `Blob`, `URL.createObjectURL`, simulasikan klik
  `<a download>`, lalu **`URL.revokeObjectURL`** setelah selesai — jangan
  lupa cleanup, ini gampang jadi memory leak kalau user download berkali-kali
  dalam satu sesi.
- Nama file: `formatter-export-{scope}.{format}` (contoh:
  `formatter-export-remaining.txt`).

## Definition of Done
- [ ] Refresh halaman di tengah progress (misal 5 dari 20 sudah di-copy) →
      setelah reload, queue muncul lagi dengan status dan posisi
      (`currentIndex`) yang sama persis — ini test utama yang membuktikan
      keputusan arsitektur §0 di atas benar.
- [ ] Copy gagal (simulasikan clipboard API reject) → item TIDAK berubah jadi
      `copied`, toast error muncul.
- [ ] Process baru saat ada progress existing → dialog konfirmasi muncul;
      cancel di dialog → batch lama tidak berubah sama sekali.
- [ ] Download tiap kombinasi format × scope (9 kombinasi total) menghasilkan
      file dengan isi yang benar dan nama file sesuai pola di atas.
- [ ] Tidak ada object URL yang gak di-revoke (cek tidak ada memory leak
      kalau download dilakukan berkali-kali).