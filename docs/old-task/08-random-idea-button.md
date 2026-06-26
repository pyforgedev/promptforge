# TASK 08 — Random Idea Button

## Prasyarat
Tidak ada dari seri task ini — independen, depend cuma ke field `category`
yang sudah ada lama di schema (bukan field baru dari Task 04). Bisa dikerjakan
paralel dengan task lain kapan saja.

## Konteks
Field "Core Idea / Subject" saat ini cuma textarea polos tanpa bantuan apapun
buat user yang kehabisan ide. Tambahkan tombol kecil yang generate ide
otomatis berdasarkan Category yang sedang dipilih.

## Goal
1. Tombol kecil (ikon dice/sparkle) di sebelah label "Core Idea / Subject".
2. Saat diklik: request API **terpisah** dari batch generation utama — pakai
   model yang lebih kecil/murah kalau provider yang dipilih user punya opsi
   itu (cek `AIService`/`aiService.ts` apakah sudah ada konsep model tier;
   kalau belum ada, pakai model default yang sama tapi dengan request minimal
   — jangan re-route ke provider lain di luar yang sudah dikonfigurasi user).
3. Prompt ke LLM untuk request ini: minta satu ide niche singkat (1-2 kalimat)
   yang relevan secara komersial untuk kategori yang dipilih, format plain text
   bukan JSON (request ini lebih sederhana dari pipeline generate utama, tidak
   perlu lewat `MetaPromptBuilder`/schema JSON kompleks).
4. Hasil **replace** isi textarea "Core Idea / Subject" (bukan append).
5. Tooltip (§6.8 `DESIGN.md`) di tombol: *"Generates an idea based on your
   selected Category."*
6. Tampilkan loading state singkat di tombol (spinner/disabled) selama
   request berjalan — request ini cepat, tapi tetap perlu feedback visual,
   konsisten dengan §6.2 `DESIGN.md` (no silent waiting).

## Non-Goals
- JANGAN masukkan biaya/token request ini ke perhitungan slider History
  (Task 07) — ini benar-benar terpisah dari fitur itu.
- JANGAN ubah `GeneratorForm.tsx` di luar area tombol ini.

## Definition of Done
- [ ] Klik tombol tanpa Category terpilih → tombol disabled atau munculkan
      pesan kecil "Select a category first" (pilih salah satu, tapi harus ada
      penanganan untuk kasus ini, jangan request API dengan category kosong).
- [ ] Hasil API benar-benar replace isi textarea, tidak menumpuk teks lama.
- [ ] Loading state terlihat selama request, tombol disabled saat loading
      (cegah double-click memicu request ganda).
- [ ] Error handling: kalau request gagal, tampilkan pesan singkat (reuse
      pola error banner §6.4 `DESIGN.md`), textarea tidak ikut berubah/rusak.