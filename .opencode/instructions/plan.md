# TASK 01 — Stability & Performance Fixes (Non-Breaking)

## Konteks
Hasil code review menemukan beberapa bug stabilitas dan inefisiensi performa di Generator & History pages (Zustand + Dexie + i18next, React 19). Task ini HANYA mencakup perbaikan bug yang sudah ada — TIDAK ada fitur baru di sini. Duplicate Detection ditangani di task terpisah (lihat `02-duplicate-detection.md`) karena scope-nya lebih besar.

## Goal
Perbaiki semua item di bawah tanpa mengubah behavior yang sudah benar, tanpa breaking existing tests/build, dan tanpa menambah fitur baru di luar yang disebutkan.

## Non-Goals (jangan dikerjakan di task ini)
- JANGAN implementasi duplicate detection / similarity check.
- JANGAN refactor besar arsitektur store di luar yang disebutkan.
- JANGAN ganti library (tetap Zustand + Dexie + i18next).

---

## 1. Missing Translation Keys (Critical)
**File:** `src/locales/en/translation.json`, `src/locales/id/translation.json`, `src/features/prompt-generator/components/GeneratorForm.tsx`, `PromptResultsDisplay.tsx`

**Lakukan:**
1. Audit semua pemanggilan `t('generator.form.*')` di seluruh `src/features/prompt-generator/**` (termasuk nested seperti `generator.form.errors.${errorCode}.title`).
2. Untuk key dinamis (`errors.${errorCode}.title`), cari semua kemungkinan `errorCode` yang dilempar dari `PromptComposerEngine.ts` / `GenerationService.ts`, lalu pastikan tiap kode punya entry lengkap (minimal `.title`, cek juga apakah ada `.description`/`.action` yang dipakai di UI).
3. Tambahkan SEMUA key yang hilang ke `en/translation.json` DAN `id/translation.json` sekaligus — jangan hanya satu bahasa.
4. Pastikan struktur nested JSON konsisten antara kedua file bahasa (key yang sama, urutan boleh beda, isi value beda bahasa).

**Definition of Done:**
- Tidak ada raw translation key (string seperti `generator.form.xxx`) yang muncul di UI saat dijalankan di kedua locale.
- Jalankan grep `t\(['"]generator\.form\.` di kode vs key yang ada di kedua JSON — hasilnya match 100%, tidak ada yang missing di kedua sisi.

---

## 2. Zustand / Dexie Persistence Race Condition (Critical)
**File:** `src/features/prompt-generator/store/promptGeneratorStore.ts` (sekitar baris 87-95)

**Masalah:** `persist` middleware pakai `createJSONStorage` dengan async `getItem`/`setItem` ke IndexedDB (`withRetry`), tapi hydration awal Zustand bersifat sync secara default → bisa terjadi render sebelum hydration selesai, menyebabkan state ke-overwrite atau hydration mismatch di React 19.

**Lakukan:**
1. Tambahkan state `_hasHydrated: boolean` (default `false`) ke store.
2. Gunakan `onRehydrateStorage` callback untuk set `_hasHydrated = true` setelah hydration selesai (baik sukses maupun gagal — tangani error case juga, jangan biarkan app stuck loading kalau hydration gagal).
3. Di komponen root yang depend ke store ini (cek `App.tsx` / layout generator), gate rendering: tampilkan skeleton/loading state sampai `_hasHydrated === true`.
4. Terapkan pola yang sama kalau ada store lain yang pakai pattern persist serupa (cek `useHistoryStore.ts` juga apakah punya isu serupa).

**Definition of Done:**
- Refresh halaman saat ada data tersimpan di IndexedDB tidak pernah menampilkan state kosong/default sebelum data asli muncul.
- Tidak ada warning hydration mismatch di console React 19.

---

## 3. Inefficient Dexie History Filtering (High)
**File:** `src/features/history/components/HistoryList.tsx` (baris 37-50), `src/features/history/store/useHistoryStore.ts`

**Lakukan:**
1. Pindahkan logic filter dari client-side (filter array di memory setelah `getHistoryItems()` load semua) ke query Dexie langsung: gunakan `.where()`, `.filter()`, `.offset()`/`.limit()` untuk pagination.
2. Implementasikan lazy-loading/pagination yang sebenarnya (infinite scroll atau "load more"), bukan load semua history sekaligus ke memory.
3. Pastikan field yang sering difilter (category, style, date, rating) punya index di schema Dexie kalau belum ada — cek `db.version(...).stores(...)` definition.

**Definition of Done:**
- `getHistoryItems()` tanpa parameter/limit tidak lagi dipanggil di code path HistoryList.
- Dengan history >1000 item (buat dummy data untuk test), list tetap responsif, tidak ada lag/freeze saat scroll atau filter.

---

## 4. Inconsistent Error Handling / State Sync in bulkDelete (Medium)
**File:** `src/features/history/store/useHistoryStore.ts`

**Lakukan:**
1. Bungkus operasi bulk delete dalam Dexie transaction (`db.transaction('rw', db.history, async () => {...})`) supaya atomic — semua sukses atau semua rollback.
2. Update state Zustand HANYA berdasarkan item yang benar-benar berhasil dihapus di DB (jangan optimistic-update penuh sebelum konfirmasi DB sukses).
3. Tangani dan expose error ke UI kalau bulk delete gagal sebagian/seluruhnya (jangan silent fail).

**Definition of Done:**
- Simulasikan error di tengah bulk delete (misal item ke-3 dari 10 gagal) → state Zustand dan IndexedDB tetap konsisten satu sama lain setelah operasi selesai.

---

## 5. Minor Performance & Style (Suggestions — kerjakan kalau waktu memungkinkan)
- `HistoryList.tsx`: pindahkan `const q = filters.search.toLowerCase()` ke luar loop filter (saat ini dipanggil per-item per-render).
- `GeneratorForm.tsx`: ganti raw `<button>` accordion dengan Radix/Shadcn `<Accordion>` atau `<Collapsible>` untuk ARIA support yang benar.
- `src/components/ui/textarea.tsx`: pertimbangkan ganti auto-resize manual (`useEffect`) dengan `react-textarea-autosize` untuk menghindari race condition dengan font loading.
- `GeneratorForm.tsx` (baris ~29): re-render penuh form tiap keystroke karena `setInput({ category: v })` membuat object reference baru — boleh dibiarkan untuk sekarang, tapi catat sebagai technical debt kalau form makin besar.

---

## Checklist Sebelum PR
- [ ] Semua translation key audit lulus (item 1)
- [ ] Hydration gate terpasang dan tidak ada flash of empty state (item 2)
- [ ] History filtering pindah ke Dexie query level + pagination (item 3)
- [ ] bulkDelete atomic via transaction (item 4)
- [ ] `npm run lint` dan `npm run build` lulus tanpa error baru
- [ ] Tidak ada perubahan behavior pada fitur yang tidak disebutkan di task ini