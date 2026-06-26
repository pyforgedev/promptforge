# TASK 10 — Backend Logic (Prompt Formatter/Queue)

## Prasyarat
Tidak ada dari task seri sebelumnya — independen. Reuse `similarityService.ts`
yang sudah ada (jangan tulis ulang algoritma similarity).

## Konteks
Fitur baru: menu "Formatter" — user paste/upload batch prompt mentah, sistem
bersihkan jadi list rapi, simpan sebagai **satu batch aktif** (di-replace
total tiap kali Process baru dijalankan), lalu user jalanin satu-per-satu
lewat queue sambil track progress copy, dan bisa download hasil dalam
beberapa format.

Konfirmasi yang sudah dikunci:
- **Single batch aktif** — gak ada multi-batch/history, Process baru selalu
  replace yang lama total (hard delete + insert baru, bukan append).
- **Progress wajib persist** ke Dexie — survive refresh/tutup browser.
- **Format download generic**: txt, csv, json — gak ada tool eksternal
  spesifik yang harus dicocokin.

## Goal
Buat schema Dexie + service layer murni logic. **TIDAK ADA React component
di task ini sama sekali.**

## Non-Goals
- JANGAN buat komponen UI apapun (task 11).
- JANGAN wiring clipboard API atau trigger file download browser (task 12) —
  fungsi export di sini cukup return string/Blob, bukan trigger save dialog.
- JANGAN buat sidebar menu/routing (task 11).

---

## 1. Dexie Schema (Version Bump)

Ikuti konvensi nama tabel yang sudah ada (`prompt_batches`, `prompt_history`
— snake_case), bukan camelCase:

```ts
db.version(N).stores({
  // ...tabel existing tetap, JANGAN diubah...
  formatter_batch: 'id, createdAt',
  formatter_items: 'id, order, status',
});
```

**`formatter_batch`** (selalu cuma 0 atau 1 row — invariant ini dijaga oleh
service, bukan oleh schema):
| Field | Tipe |
|---|---|
| `id` | auto-increment PK |
| `sourceType` | `'paste' \| 'file'` |
| `originalFileName` | `string \| null` |
| `createdAt` | `Date` |
| `totalCount` | `number` |
| `currentIndex` | `number` (posisi terakhir di queue, default `0`) |

**`formatter_items`**:
| Field | Tipe |
|---|---|
| `id` | auto-increment PK |
| `order` | `number` (indexed, urutan tampil di queue) |
| `promptText` | `string` |
| `status` | `'pending' \| 'copied'` (indexed) |
| `copiedAt` | `Date \| null` |
| `detectedAspectRatio` | `string \| null` (hasil smart-detect, lihat §2) |

## 2. Parsing & Cleaning (`formatterService.ts`)

```ts
function parseRawText(input: string): string[]
```
- Normalize line ending (`\r\n` → `\n`).
- Split per baris, trim tiap baris, buang baris kosong.
- **Known limitation v1**: kalau satu prompt aslinya nyebar di beberapa baris
  (gak dipisah jadi satu baris penuh sama user/sumbernya), tiap baris akan
  dianggap entry terpisah. Ini bukan bug, ini scope yang disengaja — jangan
  coba "pintar" mendeteksi multi-line prompt di v1 ini.

```ts
function parseCsvPreview(fileContent: string): {
  columns: string[];
  detectedColumn: string | null;
  previewRows: string[][]; // max 5 baris pertama
}
```
- Pakai `papaparse` (`Papa.parse(fileContent, { header: true })`).
- `detectedColumn`: auto-detect kolom bernama `prompt`/`full_prompt`/`text`
  (case-insensitive). Kalau cuma ada 1 kolom total, itu otomatis jadi
  `detectedColumn` meski namanya beda. Kalau ambigu (banyak kolom, gak ada
  yang match), return `null` — frontend yang akan minta user pilih manual.

```ts
function parseCsvWithColumn(fileContent: string, column: string): string[]
```
- Re-parse, ambil isi kolom yang dipilih, lalu lewatin hasilnya ke
  `parseRawText`-style cleaning (trim, buang kosong) — treat sama seperti
  hasil paste biasa setelah kolom terpilih.

```ts
function detectDuplicates(prompts: string[]): { index: number; similarToIndex: number; score: number }[]
```
- Pairwise pakai `calculateSimilarity` dari `similarityService.ts` yang sudah
  ada — **jangan tulis ulang algoritmanya**.
- Ini cuma flag/warning, **tidak auto-remove** apapun — keputusan tetap di
  tangan user.

```ts
function detectAspectRatio(promptText: string): string | null
```
- **Smart-detect, opsional, gak wajib ketemu.** Cari pattern umum yang biasa
  ditulis user/tool lain di akhir atau di mana saja dalam prompt:
  - `--ar 1:1`, `--aspect 16:9` (gaya flag Midjourney-style)
  - `aspect ratio 1:1`, `aspect-ratio: 16:9`, `aspectratio 9:16` (natural
    language, boleh ada/gak ada spasi-strip-colon, case-insensitive)
- Regex yang disarankan (sesuaikan kalau ketemu kasus nyata yang lebih luas):
  ```ts
  /(?:--ar|--aspect|aspect[\s-]?ratio:?)\s*(\d{1,3}:\d{1,3})/i
  ```
- **Sengaja gak match bare ratio tanpa keyword** (misal cuma `(1:1)` tanpa
  ada kata "aspect"/`--ar` di depannya) — biar gak salah tangkep angka rasio
  yang sebenarnya cuma bagian dari deskripsi scene, bukan instruksi aspect
  ratio.
- Kalau gak ketemu match sama sekali: return `null` — **jangan** paksa
  tampilkan apapun di UI buat kasus ini (lihat Task 11).
- Jalankan fungsi ini per-prompt saat `createFormatterBatch` (§4), simpan
  hasilnya ke field `detectedAspectRatio` tiap item — bukan dihitung ulang
  tiap kali render di frontend.

## 3. Sanity Limit (3 Tier)

```ts
type SanityLevel = 'ok' | 'warning' | 'warning_high' | 'blocked';

function checkSanityLimit(count: number): SanityLevel {
  if (count >= 500) return 'blocked';
  if (count >= 300) return 'warning_high';
  if (count >= 100) return 'warning';
  return 'ok';
}
```

- **< 100**: `'ok'` — gak ada warning sama sekali, proses langsung.
- **100-299**: `'warning'` — tetap boleh lanjut, frontend tampilkan notice
  ringan (pola warna `brand-warning`).
- **300-499**: `'warning_high'` — masih boleh lanjut, **tapi frontend wajib
  minta konfirmasi eksplisit** sebelum lanjut Process (bukan cuma notice
  pasif) — pola warna `brand-danger` meski statusnya non-blocking.
- **≥ 500**: `'blocked'` — lempar error, Process **tidak bisa dilanjutkan
  sama sekali** sampai user mengurangi jumlah prompt. Pesan jelas: "Batch
  terlalu besar (N prompt, maksimal 500), pecah jadi beberapa file lebih
  kecil."

Evaluasi ini dijalankan terhadap **hasil akhir setelah cleaning** (bukan
jumlah baris mentah sebelum dibersihkan).

## 4. CRUD & Export

```ts
async function createFormatterBatch(
  prompts: string[],
  sourceType: 'paste' | 'file',
  originalFileName?: string
): Promise<void>
```
- **Wajib dalam satu Dexie transaction**: clear `formatter_items` →
  clear `formatter_batch` → insert batch baru → `bulkAdd` semua item dengan
  `order` berurutan dari 0, `status: 'pending'`, dan `detectedAspectRatio`
  hasil `detectAspectRatio(promptText)` per item. Atomic — kalau gagal di
  tengah, jangan tinggalkan state campuran (pola sama seperti
  `bulkDelete` di Task 01).

```ts
async function markItemCopied(itemId: number): Promise<void>
async function setCurrentIndex(index: number): Promise<void>
async function resetAllProgress(): Promise<void> // set semua status balik ke 'pending', currentIndex ke 0
async function getActiveBatch(): Promise<{ batch: FormatterBatch; items: FormatterItem[] } | null>
```

```ts
function exportBatch(
  items: FormatterItem[],
  format: 'txt' | 'csv' | 'json',
  scope: 'all' | 'remaining' | 'completed'
): string
```
- Filter dulu sesuai `scope` (`remaining` = status `pending`, `completed` =
  status `copied`).
- **`txt`**: prompt polos per baris, **tanpa metadata apapun** (gak ada index/
  status ikut) — ini yang dikonsumsi tool eksternal, harus bersih murni.
- **`csv`**: kolom `index,prompt,status`, generate pakai `Papa.unparse`
  (jangan concat string manual — rawan bug kalau prompt mengandung koma/kutip).
- **`json`**: array of `{ index, prompt, status }`.

## Definition of Done
- [ ] Unit test: `parseRawText` benar buang baris kosong & trim whitespace.
- [ ] Unit test: `parseCsvPreview` auto-detect kolom `prompt`/`full_prompt`/
      `text` dengan benar; return `null` saat ambigu dan ada >1 kolom tanpa
      match.
- [ ] Unit test: `createFormatterBatch` dipanggil dua kali berturut — hasil
      akhirnya cuma ada 1 batch + item-item dari panggilan kedua, tidak ada
      sisa data dari batch pertama (verifikasi count di kedua tabel).
- [ ] Unit test: `exportBatch` format `txt` tidak mengandung koma/index
      tambahan; format `csv` benar pakai quoting yang tepat untuk prompt yang
      mengandung koma.
- [ ] Sanity limit teruji 3 tier: 99 prompt → `'ok'`; 150 → `'warning'`;
      350 → `'warning_high'`; 500 → `'blocked'` dan `createFormatterBatch`
      benar-benar gak jalan (tidak ada data ter-insert).
- [ ] Unit test `detectAspectRatio`: match `--ar 1:1`, `aspect ratio 16:9`,
      `aspect-ratio: 9:16` (case-insensitive); return `null` untuk prompt
      tanpa pattern itu sama sekali, dan **tidak** match bare angka rasio
      tanpa keyword (misal `"a clock showing 1:1 scale"` harus tetap `null`).