# TASK 05 — UI Components (GeneratorForm)

## Prasyarat
Task 04 selesai (schema & types sudah tersedia).

## Konteks
Implementasi visual untuk semua field baru di `GeneratorForm.tsx`. Task ini
**murni UI** — komponen cukup baca/tulis ke field di store sesuai shape dari
Task 04. Belum perlu generation logic-nya benar; submit form dengan field baru
boleh sementara no-op terhadap hasil generate, itu urusan Task 06.

## Non-Goals
- JANGAN implementasi logic `VariationStrategyEngine`/`MetaPromptBuilder` (task 06).
- JANGAN implementasi slider History + gating (task 07) — itu task terpisah meski sama-sama UI, karena depend ke revisi `generationService.ts`.
- JANGAN implementasi Random Idea button (task 08).
- JANGAN implementasi Master Prompt editor (task 09) — itu di halaman Settings, bukan di sini.

---

## 1. Select Biasa
**Language**, **Aspect Ratio**: searchable combobox (Radix `Popover` + `cmdk`,
per aturan global "ganti select panjang dengan search" dari brief awal).
**Variation Level**: segmented control 1-5 atau slider — opsinya cuma 5, gak
perlu search.

## 2. Dual-Mode Select (Mood, Color Palette, Art Style, Background, Human Model)

Pakai spec `§6.9 Dual-Mode Select` yang ditambahkan ke `DESIGN.md` di Task 04.

- Dua segmented button: "User Defined" / "System Defined" di header tiap field.
- Mode "User Defined" → tampilkan combobox single-select dengan opsi dari
  Task 04 (`MOOD_OPTIONS`, dst), default terpilih "None"/"No people".
- Mode "System Defined" → sembunyikan combobox, tampilkan teks
  `text-muted`: *"System will vary this automatically based on Variation Level."*
- Tooltip (§6.8 `DESIGN.md`) di label tiap field, jelaskan beda User Defined
  vs System Defined secara singkat.
- Semua state mode + value tersimpan langsung ke field store yang sesuai
  (`mood`, `colorPalette`, dst) dengan shape `DualModeField` dari Task 04.

## 3. Switch-Gate Textarea (Custom Instructions, Base Prompt/Reference)

Pakai `Switch` (§6.7 `DESIGN.md`). Saat off, textarea **tidak dirender**
(bukan cuma disabled/hidden via CSS) — biar form tetap compact sesuai brief
awal. Saat di-toggle on, textarea muncul kosong (kalau sebelumnya pernah diisi
lalu di-off-kan lalu on-kan lagi dalam satu sesi, boleh restore isi
sebelumnya — tapi tidak wajib, simpan-kosongkan ulang juga acceptable).

## 4. Perubahan Field Existing

- Label dropdown "Niche Category" → ganti jadi **"Category"** saja. Tidak ada
  perubahan field/key di schema, ini cuma rename label tampilan.
- Hapus field Mood lama (free text input) dari form sepenuhnya — sudah
  digantikan dual-mode Mood di atas.
- Toggle **"Diverse Representation"**: render `disabled` + tooltip
  *"Not applicable when Human Model is set to No People"* saat
  `humanModel.mode === 'user' && humanModel.value === 'no_people'`. Aktif
  kembali otomatis begitu `humanModel` berubah ke value lain atau mode
  `system`.

## Definition of Done
- [ ] Semua field baru render dan tersimpan dengan benar ke store (cek lewat
      React DevTools/console, bukan cuma visual).
- [ ] Dual-mode field berhasil switch antara dua mode tanpa kehilangan value
      yang sudah dipilih user sebelumnya saat mode di-switch bolak-balik.
- [ ] Switch-gate textarea benar-benar unmount saat off (cek React DevTools).
- [ ] Diverse Representation disabled-state bekerja sesuai kondisi di atas,
      teruji di kedua arah (nyala → mati, mati → nyala).
- [ ] Tampilan diuji di light & dark mode (`DESIGN.md` §3 rule 5), dan
      navigasi keyboard penuh ke semua kontrol baru (tab order logis, focus
      ring kelihatan sesuai §5.2).
- [ ] Tidak ada error TypeScript baru, `npm run lint` lulus.