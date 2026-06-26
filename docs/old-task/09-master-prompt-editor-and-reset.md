# TASK 09 — Master Prompt Editor + Reset (Settings)

## Prasyarat
Tidak ada dari seri task ini — independen. Disarankan dikerjakan terakhir
karena risikonya kalau salah cukup tinggi (langsung memengaruhi kualitas
semua generate ke depan) dan paling jarang dipakai harian, jadi gak menghambat
fitur lain kalau ditunda.

## Konteks
Power-user feature: biarkan user melihat dan mengedit template instruksi inti
yang dikirim ke LLM (saat ini hardcoded di `MetaPromptBuilder.ts`), dengan
kemampuan reset ke default kapan saja.

## Goal
1. Section baru di halaman **Settings** (bukan di Generator page) — beri nama
   misal "Advanced — Master Prompt".
2. Textarea besar menampilkan prompt yang sedang aktif (custom kalau ada,
   default kalau belum pernah di-custom).
3. Simpan override di store ter-persist (Zustand + Dexie, ikuti pola hydration
   yang sudah benar dari `01-stability-fixes.md` — pastikan field baru ini
   ikut ke-hydrate dengan benar, jangan bikin race condition baru).
4. **Tombol "Reset to Default"**: set field override kembali ke `null`/
   `undefined` — **bukan** menimpa dengan teks default yang di-copy. Ini
   penting: kalau default prompt-nya nanti diperbarui lewat code push, user
   yang belum pernah custom otomatis ikut ke versi baru tanpa perlu reset
   manual. Hanya user yang PERNAH custom yang perlu klik Reset untuk balik.
5. Warning text statis di atas textarea: *"Editing this affects every
   generation going forward. Use Reset if results get worse."*
6. `MetaPromptBuilder.ts` baca dari override store kalau ada isinya, fallback
   ke konstanta default kalau `null`.

## Non-Goals
- JANGAN ubah isi default master prompt itu sendiri (di luar scope — ini
  cuma soal infrastruktur edit/reset-nya, bukan menulis ulang konten prompt).
- JANGAN sentuh field generator lain di halaman Generator.

## Definition of Done
- [ ] Override tersimpan dan ter-hydrate dengan benar setelah refresh halaman
      (test sama seperti pola hydration di Task 01 — tidak ada flash of
      default-then-custom).
- [ ] Reset benar-benar mengembalikan ke `null`, bukan copy teks default
      (verifikasi lewat inspect store state, bukan cuma visual textarea).
- [ ] Generate hasil benar-benar pakai custom prompt saat ada override (test
      dengan override yang signature-nya jelas beda, cek prompt yang
      benar-benar terkirim ke LLM API, bukan cuma asumsi).
- [ ] Warning text selalu tampil, tidak bisa di-dismiss permanen.