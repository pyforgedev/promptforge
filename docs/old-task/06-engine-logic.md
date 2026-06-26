# TASK 06 — Engine Logic (Variation Level & Prompt Compilation)

## Prasyarat
Task 04 selesai (wajib). Task 05 disarankan selesai duluan supaya bisa
ditest end-to-end, tapi secara teknis task ini bisa dikerjakan/ditest dengan
membuat object input manual (tidak strictly blocked oleh Task 05).

## Konteks
Bagian paling berisiko di seluruh revamp ini — di sinilah "Pinned / Excluded /
Free" jadi nyata secara behavior, dan Variation Level benar-benar mengatur
keluaran. Cocok dikerjakan dengan bantuan `test-writer` subagent karena logic
ini gampang salah diam-diam (hasil tetap "terlihat masuk akal" walau levelnya
sebenarnya gak ngaruh).

## Non-Goals
- JANGAN sentuh `GeneratorForm.tsx` (sudah task 05).
- JANGAN sentuh history gating di `generationService.ts` (task 07).
- JANGAN ubah `AdobeStockScorer.ts`/`NegativePromptGenerator.ts` kecuali kalau
  memang perlu baca field baru (cek dulu apakah benar-benar perlu sebelum ubah).

---

## 1. Status Tiap Dimensi (Tentukan di Awal Pipeline)

Sebelum compose prompt, untuk tiap field dual-mode (`mood`, `colorPalette`,
`artStyle`, `background`), tentukan statusnya:

```ts
type DimensionStatus = 'pinned' | 'excluded' | 'free';

function resolveStatus(field: DualModeField<string>): DimensionStatus {
  if (field.mode === 'system') return 'free';
  if (field.value === 'none' || field.value === 'no_people') return 'excluded';
  return 'pinned';
}
```

- **pinned** → value konstan dipakai di SEMUA variant dalam batch, tidak masuk
  pool variasi.
- **excluded** → dimensi ini sama sekali tidak disebut di instruksi LLM.
- **free** → masuk pool, lihat §2.

## 2. Pool Dimensi & Formula Proporsional (`VariationStrategyEngine.ts`)

Pool dimensi lengkap, urutan prioritas (paling visual-impactful duluan):

```
1. Lighting
2. Camera Angle / Shot Type
3. Composition
4. Background / Environment   ← drop dari pool kalau `background` statusnya pinned/excluded
5. Color Palette / Grading    ← drop dari pool kalau `colorPalette` statusnya pinned/excluded
6. Atmosphere / Mood nuance   ← drop dari pool kalau `mood` statusnya pinned/excluded
7. Technical (lensa, DOF)
8. Subject Pose / Action detail
```

`artStyle` pinned/excluded memengaruhi instruksi style overall (lihat §3),
bukan bagian dari pool numerik ini karena style itu sifatnya menyeluruh, bukan
satu segmen variasi tunggal — jangan masukkan ke pool di atas.

**Formula jumlah dimensi yang divariasikan:**

```ts
const numToVary = Math.max(1, Math.ceil((level / 5) * availablePool.length));
const dimensionsToVary = availablePool.slice(0, numToVary); // sudah urut prioritas
```

`availablePool` = pool di atas dikurangi dimensi yang statusnya pinned/excluded
(Lighting, Camera Angle, Composition, Technical, Subject Pose selalu ada di
pool karena tidak punya field dual-mode sendiri — selalu "free").

Untuk tiap prompt variant dalam batch, dimensi-dimensi di `dimensionsToVary`
boleh berbeda nilai antar variant; dimensi di luar itu (sisa pool yang gak
kena variasi level ini) tetap dibuat konsisten/mirip di semua variant — bukan
berarti dihilangkan instruksinya, cuma gak dipaksa beda-beda.

## 3. Kompilasi Instruksi (`MetaPromptBuilder.ts`)

- **Pinned**: instruksikan eksplisit dan tegaskan konsisten, contoh pola teks:
  `"Mood: Peaceful — maintain this mood consistently across all variants."`
- **Excluded**: tidak ditulis sama sekali di prompt instruction (jangan tulis
  "no mood specified" — beneran skip baris itu).
- **Free dan masuk `dimensionsToVary`**: instruksikan untuk divariasikan,
  ambil nilai random dari enum option Task 04 yang relevan per variant —
  bukan dibebaskan ke LLM tanpa batasan, contoh:
  `"Mood: vary across variants — this variant: Dramatic."` (nilai "Dramatic"
  dipilih random dari `MOOD_OPTIONS` per variant, bukan generate bebas oleh LLM).
- **Free tapi TIDAK masuk `dimensionsToVary`** (pool tersisa di luar kuota
  level): boleh dibiarkan default/tidak ditekankan, tidak perlu instruksi
  eksplisit.
- **Custom Instructions**: kalau ada isi, append sebagai instruksi tambahan di
  akhir system/user prompt, jangan dicampur ke tengah instruksi terstruktur
  lainnya — taruh di section terpisah biar LLM treat sebagai catatan tambahan
  user, bukan bagian dari schema variasi.
- **Language**: instruksikan LLM merespons dalam bahasa yang dipilih untuk
  field deskriptif yang user-facing (kalau ada), tapi field teknis/structural
  JSON key tetap dalam Bahasa Inggris seperti sekarang — jangan terjemahkan
  key JSON-nya.

## Definition of Done
- [ ] Unit test (lihat batch test-writer kamu): pool 8 dimensi penuh (gak ada
      yang di-pin), level 1 → cuma 2 dimensi tervariasi; level 5 → 8 dimensi.
- [ ] Unit test: dengan 2 dimensi di-pin (pool jadi 6), level 3 menghasilkan
      jumlah dimensi proporsional dari 6, bukan dari 8.
- [ ] Unit test: dimensi `excluded` benar-benar tidak muncul string-nya di
      output `MetaPromptBuilder` (assert tidak ada substring terkait).
- [ ] Unit test: dimensi `pinned` muncul identik di semua variant dalam satu
      batch hasil generate (mock LLM response kalau perlu).
- [ ] Custom Instructions muncul di section terpisah, tidak tercampur ke
      instruksi structural lain.