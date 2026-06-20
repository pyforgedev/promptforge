# TASK 02 — Duplicate Detection Feature (Scoped Implementation)

## Konteks
README mengklaim fitur "Duplicate Detection: Prevents repetitive prompt generation by analyzing prompt history for similarity", tapi belum ada implementasi nyata. `similarityService.ts` sudah ada tapi tidak pernah dipanggil di alur generate.

Task ini DIPISAH dari `01-stability-fixes.md` karena merupakan fitur baru dengan keputusan desain sendiri, bukan sekadar bug fix. Kerjakan task 01 dulu (terutama perbaikan Dexie filtering & hydration) sebelum mulai task ini, karena fitur ini akan bergantung pada cara history di-query.

## Goal
Implementasikan duplicate detection yang benar-benar mencegah/menandai prompt yang terlalu mirip dengan history — **TANPA** mengirim seluruh history ke proses generate maupun ke similarity check. History yang dipakai untuk perbandingan WAJIB dibatasi secara ketat (jumlah + relevansi), supaya:
- Token yang terpakai saat generate tidak meledak seiring history bertambah banyak.
- Tidak ada perbandingan yang sia-sia antara prompt di niche/category yang sama sekali tidak berhubungan.

## Batasan Wajib (Hard Constraints — TIDAK BOLEH DILANGGAR)

1. **Limit jumlah history.** Definisikan konstanta `DUPLICATE_CHECK_HISTORY_LIMIT` (mulai dari nilai default masuk akal, misal 20-30, taruh di satu tempat config, bukan magic number tersebar). Proses similarity check TIDAK BOLEH membaca history lebih dari limit ini dalam satu kali generate.

2. **Filter relevansi sebelum filter jumlah.** History yang dibandingkan HARUS difilter dulu berdasarkan kesamaan context dengan request yang sedang diproses (minimal: `category`/`niche` yang sama; kalau ada dimensi lain yang relevan seperti `style` atau `aspectRatio`, evaluasi apakah perlu ikut difilter juga). Baru dari subset yang relevan itu, ambil N terbaru. Jangan ambil N terbaru dari seluruh history lalu filter category — itu bisa menghasilkan 0 hasil relevan kalau user lagi banyak generate niche lain.

3. **Query langsung dari Dexie, bukan load-all-then-filter.** Gunakan `.where('category').equals(...)` (atau kombinasi index yang sesuai) + `.reverse()` + `.limit(N)` di level query Dexie. Jangan panggil `getHistoryItems()` tanpa filter lalu filter di JS — ini balik lagi ke masalah performa yang sudah diperbaiki di task 01.

4. **Tidak ada history mentah yang masuk ke external API call dalam bentuk unbounded.** Kalau desain similarity check butuh mengirim teks history sebagai context ke API generate (bukan hanya local string-similarity), maka SET YANG SAMA (limited + filtered dari poin 1-2) itulah yang boleh dikirim — tidak ada jalur lain yang mengirim history tanpa limit.

5. **Default ke local similarity dulu, API context-based hanya kalau perlu.** Untuk implementasi awal, gunakan `calculateSimilarity` di `similarityService.ts` (local string/embedding similarity, tanpa API call tambahan) sebagai mekanisme utama. Eksplorasi "kirim history sebagai negative example ke prompt API" hanya kalau local similarity terbukti tidak cukup akurat — dan kalau itu terjadi, tetap tunduk ke constraint #1-4.

## Spesifikasi Implementasi

**File yang terlibat:** `src/features/prompt-generator/engine/PromptComposerEngine.ts`, `GenerationService.ts` (atau service layer sejenis), `src/features/history/store/useHistoryStore.ts` atau service Dexie terkait, `similarityService.ts`.

1. Tambah fungsi di history service/store: `getRecentRelevantHistory(category: string, limit: number): Promise<HistoryItem[]>` — query Dexie sesuai constraint #2-3.
2. Di `GenerationService.ts` (bukan langsung di engine, supaya engine tetap pure/testable):
   - Generate kandidat prompt seperti biasa.
   - Ambil `getRecentRelevantHistory(input.category, DUPLICATE_CHECK_HISTORY_LIMIT)`.
   - Hitung similarity kandidat vs tiap item di set tersebut pakai `calculateSimilarity`.
   - Tentukan `SIMILARITY_THRESHOLD` (taruh sebagai konstanta yang mudah di-tune, beri komentar cara kalibrasinya).
3. Tentukan behavior saat duplicate terdeteksi (pilih salah satu, implementasikan dengan jelas — **default-nya: opsi B/warn**, kecuali ada instruksi lain):
   - **Opsi A — Auto-retry:** generate ulang otomatis dengan variasi seed/parameter, maksimal N percobaan (misal 3x), baru kalau masih duplicate tetap return dengan flag.
   - **Opsi B — Warn user:** kembalikan hasil dengan flag `isDuplicate: true` + referensi item history yang mirip, biar UI yang munculkan warning dan user yang putuskan regenerate atau tetap simpan.
4. Update UI (`PromptResultsDisplay.tsx` atau komponen terkait) untuk menampilkan indikator/warning saat `isDuplicate === true`, termasuk translation key baru yang diperlukan (koordinasikan dengan task 01 soal translation keys — tambahkan ke kedua file locale).

## Definition of Done
- [ ] Generate 1 prompt di niche/category manapun, dengan total history ribuan item lintas berbagai category → query history untuk similarity check tetap hanya mengambil maksimal `DUPLICATE_CHECK_HISTORY_LIMIT` item, dan semuanya dari category yang relevan (verifikasi via logging/console saat development, lalu hapus log sebelum PR).
- [ ] Tidak ada pemanggilan `getHistoryItems()`/`toArray()` tanpa filter+limit di code path generate.
- [ ] Threshold similarity terdokumentasi (komentar di kode menjelaskan kenapa nilai tersebut dipilih, dan langkah testing yang dipakai untuk validasi — bukan asal angka).
- [ ] Behavior saat duplicate terdeteksi (auto-retry atau warning) terimplementasi sesuai pilihan yang ditentukan, dan teruji dengan kasus: (a) history kosong, (b) history relevan tapi tidak mirip, (c) history relevan dan mirip.
- [ ] `npm run lint` dan `npm run build` lulus.

## Pertanyaan yang Perlu Dikonfirmasi Sebelum/Saat Implementasi
Kalau agent menemukan ambiguitas berikut saat eksekusi, jangan asumsi sendiri — tandai di PR description untuk direview manual:
- Apakah "category" saja cukup untuk filter relevansi, atau perlu kombinasi dengan "style"/"aspectRatio"?
- Nilai default `DUPLICATE_CHECK_HISTORY_LIMIT` dan `SIMILARITY_THRESHOLD` final — perlu di-tune manual sambil lihat hasil generate asli, jangan anggap nilai awal sudah optimal.