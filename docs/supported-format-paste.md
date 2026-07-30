# Supported Paste Formats (Input)

Fitur paste pada Formatter menerima dua format input:

## 1. Plain Line-Separated (default)

Setiap baris teks akan menjadi satu prompt. Spasi depan/belakang di-trim, baris kosong diabaikan.

Contoh input:

```
A cute chibi-style obelisk icon
Seamless looping confetti animation
A cute bamboo instrument icon
```

Hasil: 3 prompt.

---

## 2. Structured `Prompt:` Format

Jika ditemukan satu atau lebih baris yang diawali `Prompt:` (case-insensitive), maka **hanya** baris tersebut yang diekstrak. Nilai setelah `Prompt:` menjadi prompt, label lainnya diabaikan.

Berguna untuk mengekstrak prompt dari catatan campuran (metadata + prompt).

Contoh input:

```
Judul/Tema Niche: Ikon Monumen
Type: Image
Prompt: A cute chibi-style obelisk icon

Judul/Tema Niche: Animasi Confetti
Type: Video
Prompt: Seamless looping confetti animation
```

Hasil:

- `A cute chibi-style obelisk icon`
- `Seamless looping confetti animation`

> Catatan: Jika tidak ada satupun baris yang cocok dengan `Prompt:`, maka parser akan fallback ke mode **plain line-separated**.

---

## 3. Markdown Bold List Format

Jika ditemukan satu atau lebih baris dengan pola `- **Prompt:**` (markdown unordered list dengan label tebal), maka **hanya** baris tersebut yang diekstrak. Nilai setelah `- **Prompt:**` menjadi prompt.

Berguna untuk mengekstrak prompt dari dokumen atau catatan yang ditulis dalam format markdown list.

Contoh input:

```
- **Judul/Tema Niche:** Labor Day Modern Corporate Sale Banner
- **Type:** Image
- **Commercial Rationale:** Ultra-high demand for US Labor Day retail...
- **Prompt:** A sleek modern promotional hero banner with abstract curved red and navy blue geometric panels on a clean white surface. Soft studio lighting with gentle drop shadows. Clean uncluttered off-center negative space on the left two-thirds for advertising text.
```

Hasil:

- A sleek modern promotional hero banner with abstract curved red and navy blue geometric panels on a clean white surface. Soft studio lighting with gentle drop shadows. Clean uncluttered off-center negative space on the left two-thirds for advertising text.

> Catatan: Jika tidak ada satupun pola yang cocok (`Prompt:` atau `- **Prompt:**`), parser akan fallback ke mode **plain line-separated**.

---

## Upload File

Selain paste, input juga bisa dari upload file:

- **`.txt`** — diproses dengan `parseRawText` (sama seperti mode paste, mendukung kedua format di atas)
- **`.csv`** — pengguna memilih kolom yang berisi prompt, lalu nilai kolom diproses lewat `parseRawText` (jadi format `Prompt:` juga bisa digunakan di dalam sel)

---

## Detail Teknis

Parser: `parseRawText()` di `src/services/formatter/formatterService.ts`

Alur:

1. Normalisasi CRLF → LF
2. Split per baris, trim whitespace
3. Filter baris kosong
4. Jika ada baris cocok `/^prompt\s*:/i` → ekstrak nilai setelah label
5. Jika tidak → gunakan semua baris apa adanya
