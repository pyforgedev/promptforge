# Plan: Generator Input Revamp (PromptForge)

## 0. Prinsip Inti — Tiga Status Setiap Dimensi Prompt

Ini yang menyatukan semua field baru (Mood, Color Palette, Art Style, Background,
Human Model) dengan Variation Level jadi satu sistem koheren, bukan fitur-fitur
yang berdiri sendiri-sendiri:

| Status | Dipilih lewat | Artinya buat batch |
|---|---|---|
| **Pinned (terkunci)** | Mode "User Defined" + pilih value spesifik | Konstan, sama persis di semua prompt dalam satu batch |
| **Excluded (dikecualikan)** | Mode "User Defined" + value "No X"/"None" | Dimensi itu sama sekali tidak diinstruksikan ke LLM — perilaku identik dengan sekarang |
| **Free (bebas divariasikan)** | Mode "System Defined" | Masuk ke pool yang dikelola `VariationStrategyEngine`, boleh beda-beda antar prompt sesuai Variation Level |

**Konsekuensi penting:** default semua field baru = User Defined + None/No People
→ **behavior default aplikasi setelah revamp ini identik dengan sekarang**, tidak
ada regresi kualitas. Semua kustomisasi ini murni opt-in.

---

## 1. Skema Input Baru

| Field | Tipe | Default | Mode |
|---|---|---|---|
| `language` | enum (`en`, `id`) | ikut locale app aktif | Select biasa |
| `aspectRatio` | enum | `random` | Select biasa (bukan dual-mode — gak ada state "kosong" buat aspect ratio) |
| `variationLevel` | number (1-5) | `3` | Slider/select biasa |
| `mood` | enum + mode | User Defined: `none` | Dual-mode, **single-select** |
| `colorPalette` | enum + mode | User Defined: `none` | Dual-mode, **single-select** |
| `artStyle` | enum + mode | User Defined: `none` | Dual-mode, **single-select** |
| `background` | enum + mode | User Defined: `none` | Dual-mode, **single-select** |
| `humanModel` | enum + mode | User Defined: `no_people` | Dual-mode, **single-select** |
| `customInstructions` | string | `""` (gate off) | Switch-gate textarea |
| `basePromptReference` | string | `""` (gate off) | Switch-gate textarea |
| `includeHistory` | boolean | **`false`** | Toggle |
| `includeHistoryCount` | number (5-50) | `20` | Slider, aktif hanya kalau `includeHistory = true` |

> Catatan single-select: dikonfirmasi untuk Mood, dan saya samakan ke 4 kategori
> lain (Color Palette, Art Style, Background, Human Model) biar konsisten dan
> `MetaPromptBuilder.ts` tidak perlu logic penggabungan multi-value yang lebih
> rumit. Kalau nanti ada kategori yang ternyata perlu multi (misal Color Palette
> mau bisa 2 warna), itu perubahan kecil dan terisolasi — gak ngubah struktur
> keseluruhan.

`aspectRatio` opsi: `Random` (default), `1:1`, `4:5`, `2:3`, `9:16`, `3:2`, `4:3`,
`16:9` — set ini dipilih karena relevan secara komersial (microstock/sosial) dan
sesuai limitasi `PlatformAdapter.ts` (DALL-E 3 & Nano Banana).

---

## 2. Pola UI — 3 Varian, Pakai yang Sudah Ada di `DESIGN.md`

### 2.1 Select biasa (Language, Aspect Ratio, Variation Level)
Searchable combobox (Radix `Popover` + `cmdk`, per catatan "global" kamu) untuk
yang opsinya panjang; Variation Level cukup segmented control 1-5 atau slider,
opsinya cuma 5 jadi gak butuh search.

### 2.2 Dual-mode select (Mood, Color Palette, Art Style, Background, Human Model)
```
┌─────────────────────────────────────────┐
│ Mood                    [User Defined ⟷ System Defined] │
│ ┌───────────────────────────────────┐   │
│ │ No mood specified            ▾    │   │  ← muncul hanya saat User Defined
│ └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```
- Mode switcher: dua segmented button kecil, bukan `Switch` toggle (§6.7) — ini
  pilihan antara dua mode setara, bukan on/off, jadi secara visual harus beda
  dari toggle biasa supaya gak rancu sama pola Switch yang udah ada.
- Saat **User Defined**: tampilkan searchable combobox, default value "No mood
  specified" / "No people" dst.
- Saat **System Defined**: combobox disembunyikan, ganti jadi teks kecil
  `text-muted`: *"System will vary this automatically based on Variation Level."*
- Tooltip kecil (§6.8) di sebelah label menjelaskan: User Defined = kamu kontrol
  nilainya dan konsisten di semua hasil; System Defined = AI yang pilih,
  boleh beda-beda tiap hasil dalam satu batch.

### 2.3 Switch-gate textarea (Custom Instructions, Base Prompt/Reference)
Pola sederhana on/off pakai `Switch` (§6.7) — kalau off, textarea gak dirender
sama sekali (bukan cuma disabled), biar form tetap compact.

---

## 3. Variation Level — Mekanisme Detail

**Pool dimensi** (urutan prioritas, paling visual-impactful duluan):

1. Lighting
2. Camera Angle / Shot Type
3. Composition
4. Background / Environment detail *(hilang dari pool kalau `background` di-pin user)*
5. Color Palette / Grading *(hilang dari pool kalau `colorPalette` di-pin user)*
6. Atmosphere / Mood nuance *(hilang dari pool kalau `mood` di-pin user)*
7. Technical (lensa, depth of field)
8. Subject Pose / Action detail

**Aturan:** jumlah dimensi yang divariasikan dihitung **proporsional dari pool
yang tersisa** (bukan angka absolut tetap), supaya "rasa" tiap level konsisten
walau user udah pin beberapa field:

```
dimensiDivariasikan = ceil(level / 5 × ukuranPoolTersisa), minimum 1
```

Contoh dengan pool penuh (8 dimensi, gak ada yang di-pin):
| Level | Dimensi yang divariasikan |
|---|---|
| 1 | Lighting, Camera Angle |
| 2 | + Composition |
| 3 (default) | + Background/Environment |
| 4 | + Color Palette, Atmosphere/Mood |
| 5 | semua 8 dimensi |

Kalau user pin `mood` dan `background` secara spesifik, pool tinggal 6 dimensi
dan rasio yang sama tetap dipakai ke 6 dimensi itu — levelnya tetap berarti
"seberapa luas variasi", bukan ngitung dari angka 8 yang sudah gak relevan.

**Dimensi yang statusnya System Defined** (bukan di-pin, bukan di-exclude) ikut
masuk pool ini dan nilai aktualnya tiap prompt diambil random dari daftar enum
yang sama dengan yang dilihat user di mode User Defined — bukan generate bebas
oleh LLM, biar kualitas tetap terjaga dan konsisten dengan opsi yang sudah
dikurasi.

---

## 4. Include History for Better Variations

- **Default: OFF.** Toggle harus eksplisit diaktifkan user — ini ngubah default
  behavior sekarang (yang otomatis selalu jalan), jadi kalau ada user existing
  yang ngandelin history context tanpa sadar, hasil generate-nya bisa berubah
  setelah update ini. Worth dicatat di release notes/changelog.
- Saat OFF: behavior sama seperti tanpa fitur ini sama sekali, gak ada query
  history, gak ada token tambahan.
- Saat ON: slider muncul, range 5-50, default 20.
- **Indikator warna pada slider:** 5-15 hijau (aman), 16-35 kuning/amber
  (moderat), 36-50 merah (token tambahan signifikan) — pakai `brand-success`,
  `brand-warning`, `brand-danger` dari §2.1 `DESIGN.md`, jangan warna baru.
- **Tooltip** di slider: *"Includes this many recent prompts from the selected
  Category as context, so new generations avoid repeating them. Higher
  numbers use more tokens per generation."*
- Slider ini **langsung jadi parameter** `limit` yang dikirim ke
  `getRecentRelevantHistory(category, limit)` dari spec duplicate-detection
  sebelumnya (lihat §6 di bawah) — bukan fitur baru yang berdiri sendiri,
  cuma expose parameter yang sebelumnya jadi konstanta internal.

---

## 5. Random Idea Button

- Tombol kecil di sebelah label "Core Idea / Subject", ikon dice/sparkle.
- Saat diklik: request API call **terpisah** (model kecil/murah, bukan model
  utama generation) dengan prompt berbasis `category` yang sedang dipilih,
  minta satu ide niche singkat yang relevan secara komersial.
- Tooltip di tombol: *"Generates an idea based on your selected Category."*
- Hasilnya replace isi textarea (bukan append), biar user gak perlu manual
  clear dulu.
- Biaya token kecil ini terpisah dari budget batch generation utama — gak masuk
  hitungan token slider History di atas.

---

## 6. Master Prompt Editor + Reset

- Ditaruh di halaman **Settings** (bukan di form Generator) — ini setting
  global yang mempengaruhi semua generate ke depan, beda kategori dari
  per-batch input.
- Mekanisme: `defaultMasterPrompt` tetap jadi konstanta di kode
  (`MetaPromptBuilder.ts`), `customMasterPrompt` (nullable) disimpan di store
  ter-persist. Kalau `customMasterPrompt` ada isinya, dipakai; kalau null,
  fallback ke default.
- Tombol **Reset to Default**: set `customMasterPrompt` ke `null` lagi —
  bukan menimpa dengan teks default (supaya gak ada drift kalau default-nya
  nanti di-update lewat code push, user yang belum pernah custom otomatis
  ikut ke-update tanpa perlu reset manual).
- Beri warning text di atas editor: *"Editing this affects every generation
  going forward. Use Reset if results get worse."*

---

## 7. Perubahan ke Field Existing

- Label dropdown "Niche Category" → **"Category"** saja (bukan rename field di
  schema — `category` dan `niche` sudah dua field terpisah di
  `generatorInputSchema.ts`, jadi ini cuma perbaikan label biar gak ambigu
  dengan field "Core Idea/Subject"). Field ini sekaligus jadi key filter untuk
  History (§4).
- Field Mood lama (free text) **dihapus**, fungsinya digantikan field Mood baru
  dual-mode di atas.
- Toggle **"Diverse Representation"** jadi conditional: disabled (dengan
  tooltip penjelasan) saat `humanModel = no_people`, karena gak relevan tanpa
  ada manusia di gambar.
- `basePromptReference` tetap optional, dipindah ke pola switch-gate (§2.3).

---

## 8. File/Subsystem yang Terdampak

| File | Perubahan |
|---|---|
| `generatorInputSchema.ts` | Tambah semua field baru di §1, termasuk shape dual-mode (`{mode: 'user'\|'system', value: string}`) |
| `GeneratorForm.tsx` | UI baru sesuai §2, termasuk gating render Diverse Representation |
| `VariationStrategyEngine.ts` | Implementasi pool dinamis + formula proporsional §3 |
| `MetaPromptBuilder.ts` | Compile instruksi dari field baru (pinned value, system-defined random pick, custom instructions, language) |
| `generationService.ts` | `includeHistory` gating — skip query history sama sekali kalau false; teruskan `includeHistoryCount` sebagai `limit` |
| `useAIConfigStore.ts` atau store baru | Simpan `customMasterPrompt` (nullable) + action reset |
| Settings page | Tambah section Master Prompt editor (§6) |
| `DESIGN.md` | Tambah pola dual-mode select (§2.2) sebagai komponen resmi — belum ada spec-nya, mirip kasus Switch/Tooltip kemarin |

---

## 9. Catatan Revisi ke Task Sebelumnya

`02-duplicate-detection.md` perlu sedikit penyesuaian:
- `DUPLICATE_CHECK_HISTORY_LIMIT` yang sebelumnya konstanta internal, sekarang
  jadi parameter dari `includeHistoryCount` di form (bounded 5-50 di level UI,
  bukan di level konstanta kode).
- Default behavior berubah dari "selalu jalan" jadi "skip total kalau
  `includeHistory = false`" — gating-nya naik satu level, di awal
  `generationService.ts` sebelum similarity check dipanggil sama sekali.

---

## 10. Urutan Eksekusi yang Disarankan

1. Schema (`generatorInputSchema.ts`) + update `DESIGN.md` (komponen dual-mode select) — fondasi yang lain bergantung ke ini.
2. UI components (`GeneratorForm.tsx`) — bisa dites visual duluan dengan data dummy sebelum engine-nya nyambung.
3. Engine logic (`VariationStrategyEngine.ts`, `MetaPromptBuilder.ts`) — bagian paling berisiko, butuh testing manual paling banyak (cocok pakai `test-writer` subagent kamu di sini).
4. History gating + slider (`generationService.ts`) — revisi kecil ke task 02.
5. Random Idea button — independen, bisa dikerjakan kapan saja.
6. Master Prompt editor di Settings — independen, paling aman dikerjakan terakhir.

Mau saya pecah ini jadi task file per-fase (format sama kayak `01-`/`02-` kemarin) biar tinggal dieksekusi agent satu-satu?