# TASK 11 — Frontend Building (Prompt Formatter/Queue UI)

## Prasyarat
Disarankan Task 10 selesai duluan biar tipe data (`FormatterBatch`,
`FormatterItem`) sudah pasti. Tapi komponen visual di task ini boleh dibangun
pakai **mock data/dummy callbacks** kalau mau dikerjakan paralel dengan
Task 10 — task ini fokus murni ke tampilan, belum perlu Dexie/clipboard/file
download nyala beneran (itu Task 12).

## Konteks
Halaman baru "Formatter" — perlu sidebar entry baru (sejajar Home/Generator/
History/Templates/Settings yang sudah ada).

## Goal
Bangun semua komponen visual. Semua handler boleh berupa prop callback kosong
atau console.log dulu — Task 12 yang nyambungin ke logic nyata.

## Non-Goals
- JANGAN implementasi Dexie query/write nyata (task 10/12).
- JANGAN implementasi `navigator.clipboard` atau trigger file download
  browser nyata (task 12) — tombol Copy/Download cukup terima `onClick` prop.
- JANGAN tulis ulang logic parsing/cleaning (sudah di task 10).

---

## 1. Halaman & Navigasi

- Page baru `src/pages/FormatterPage.tsx`, route + sidebar item baru ("Batch
  Queue" atau "Formatter" — boleh disesuaikan).
- **Empty state** (§6.6 `DESIGN.md`) saat belum ada batch aktif: jelaskan apa
  fitur ini, tombol yang fokus ke area input.

## 2. Input Section

- Tab/toggle dua mode: **Paste** (textarea scrollable) vs **Upload File**
  (`.txt`/`.csv`).
- Saat upload `.csv` dan kolom ambigu (props `columns: string[]` &
  `detectedColumn: string | null` dari hasil preview): tampilkan dropdown
  picker kolom + preview 5 baris pertama dalam tabel kecil, sebelum tombol
  "Confirm Column" aktif.
- Tombol **Process**.

## 3. Konfirmasi Replace (Penting — Mencegah Kehilangan Progress Tanpa Sadar)

Karena batch aktif **selalu di-replace total**, kalau ada batch existing
dengan progress > 0 (`copiedCount > 0`), klik Process **harus** memunculkan
dialog konfirmasi dulu:

> "Memproses batch baru akan mengganti batch yang sedang aktif beserta
> progress-nya (X dari Y sudah di-copy). Lanjutkan?"

Pakai pola dialog dengan `overlay-glass` (§4 `DESIGN.md`). Kalau batch
existing progress-nya 0 (belum ada yang di-copy) atau belum ada batch sama
sekali, langsung proses tanpa dialog.

Setelah Process berhasil, tampilkan summary kecil: jumlah prompt bersih
dihasilkan, jumlah baris kosong dibuang, jumlah kemungkinan duplikat
terdeteksi (kalau ada) — bukan auto-hapus, cuma informasikan.

## 4. Queue View

- **Tampilan utama**: satu prompt aktif ditampilkan besar (`body-mono`, sesuai
  §6 `DESIGN.md` — prompt selalu monospace), dengan tombol **Copy** dan
  **Prev**. Klik Copy → auto-advance ke prompt berikutnya.
- **Overview list** di samping/bawah: semua prompt dalam batch, tiap baris
  ada badge status (centang hijau = copied, netral = pending — pakai
  `brand-success` per §2.1), dan **bisa diklik buat jump** langsung ke prompt
  itu di tampilan utama (gak harus urut Prev/Next terus).
- **Progress indicator**: "X dari Y di-copy" + progress bar.
- Tombol **Reset Progress** — juga butuh dialog konfirmasi (destructive
  action, sama pentingnya dengan replace di atas).

## 5. Download Section

- Picker **format**: `txt` / `csv` / `json`.
- Picker **scope**: `All` / `Remaining only` / `Completed only`.
- Tombol Download.

## Definition of Done
- [ ] Semua komponen render dengan mock data tanpa error.
- [ ] Dialog konfirmasi (replace & reset) muncul dengan kondisi yang benar
      (cek prop `copiedCount > 0` dummy di kedua skenario).
- [ ] Overview list bisa di-klik dan visually pindahin "current" indicator ke
      item yang diklik (state lokal dummy dulu, gak perlu Dexie).
- [ ] Light/dark mode teruji, keyboard nav ke semua kontrol (termasuk jump di
      overview list).
- [ ] CSV column-picker UI muncul hanya saat `detectedColumn === null` dari
      mock prop, dan langsung skip ke summary saat `detectedColumn` ada
      isinya.