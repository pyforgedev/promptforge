# TASK 07 — History Gating + Limit Slider (Revisi Task 02)

## Prasyarat
Task 04 selesai (field `includeHistory`/`includeHistoryCount` sudah ada di
schema). **Catatan penting:** task ini AMENDS `02-duplicate-detection.md` —
baca task itu dulu sebelum mulai, karena sebagian besar logic-nya tetap
dipakai, cuma cara dipanggilnya yang berubah.

## Konteks
`02-duplicate-detection.md` sebelumnya asumsinya fitur history-similarity ini
**selalu jalan** dengan limit dari konstanta internal
(`DUPLICATE_CHECK_HISTORY_LIMIT`). Sekarang fitur ini jadi **opt-in** lewat
toggle di form, dan limitnya user-controlled lewat slider.

## Apa yang TETAP SAMA dari Task 02
- Fungsi `getRecentRelevantHistory(category, limit)` — signature-nya tidak
  berubah.
- Algoritma `calculateSimilarity` dan threshold-nya — tidak berubah.
- Query Dexie tetap lewat `.where()`+`.limit()`, bukan load-all-then-filter —
  prinsip ini tidak berubah.

## Apa yang BERUBAH
- `DUPLICATE_CHECK_HISTORY_LIMIT` sebagai konstanta tetap **dihapus**, diganti
  parameter `includeHistoryCount` dari input form (sudah dibatasi 5-50 di
  level schema Task 04, jadi `GenerationService.ts` tidak perlu clamp lagi,
  cukup percaya ke schema).
- Di awal `GenerationService.ts`, sebelum similarity check dipanggil sama
  sekali: cek `input.includeHistory`. Kalau `false`, **skip total** — jangan
  query Dexie, jangan panggil `calculateSimilarity` sama sekali. Default form
  sekarang `false`, jadi ini akan jadi path paling umum kecuali user aktifkan
  manual.

## Non-Goals
- JANGAN ubah algoritma similarity itu sendiri.
- JANGAN sentuh `VariationStrategyEngine.ts`/`MetaPromptBuilder.ts` (task 06).

---

## 1. Slider UI (di `GeneratorForm.tsx`, dekat toggle Include History)

- Toggle utama: `Switch` (§6.7) — "Include History for Better Variations",
  default off.
- Saat on, slider muncul, range 5-50, default 20.
- **Indikator warna** di sepanjang slider track, 3 segmen:
  - 5-15 → `brand-success` (hijau, aman)
  - 16-35 → `brand-warning` (amber, moderat)
  - 36-50 → `brand-danger` (merah, token tambahan signifikan)
  - Gunakan token warna ini dari `DESIGN.md` §2.1, jangan bikin warna baru.
- **Tooltip** (§6.8) di sebelah slider: *"Includes this many recent prompts
  from the selected Category as context, so new generations avoid repeating
  them. Higher numbers use more tokens per generation."*

## Definition of Done
- [ ] `includeHistory = false` (default) → tidak ada query Dexie sama sekali
      terkait similarity check (verifikasi lewat logging sementara saat dev,
      hapus sebelum PR).
- [ ] `includeHistory = true` → `getRecentRelevantHistory` dipanggil dengan
      `limit = input.includeHistoryCount`, bukan konstanta lama.
- [ ] Slider menampilkan warna sesuai 3 segmen di atas, berubah real-time
      saat di-drag.
- [ ] Tooltip muncul on hover dan on keyboard focus.
- [ ] `npm run lint` dan `npm run build` lulus, tidak ada referensi tersisa
      ke `DUPLICATE_CHECK_HISTORY_LIMIT` di codebase.