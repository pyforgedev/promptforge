# TASK 04 — Schema & Design Foundation

## Prasyarat
Tidak ada — ini task fondasi, dikerjakan paling pertama. Task 05-09 semua
depend ke task ini.

## Konteks
Bagian dari "Generator Input Revamp" (lihat `03-generator-input-revamp-plan.md`
untuk full context). Task ini HANYA mendefinisikan schema/types dan satu
tambahan kecil ke `DESIGN.md`. **TIDAK ADA rendering UI, TIDAK ADA logic
generation** di task ini — itu task-task berikutnya.

## Goal
Definisikan ulang `generatorInputSchema.ts` dengan semua field baru, plus
tambahkan spec komponen "dual-mode select" ke `DESIGN.md`.

## Non-Goals
- JANGAN sentuh `GeneratorForm.tsx` (task 05).
- JANGAN implementasi logic di `VariationStrategyEngine.ts`/`MetaPromptBuilder.ts` (task 06).
- JANGAN sentuh `generationService.ts` (task 07).

---

## 1. Tipe Dual-Mode Field

Field Mood, Color Palette, Art Style, Background, Human Model semua pakai
shape yang sama:

```ts
type DualModeField<T extends string> =
  | { mode: 'user'; value: T }
  | { mode: 'system' };
```

- `mode: 'user'` + `value` = "pinned" (konstan di seluruh batch) kalau value
  bukan opsi "none"/"no_people"; "excluded" (tidak diinstruksikan sama sekali)
  kalau value adalah opsi "none"/"no_people".
- `mode: 'system'` = "free", masuk pool variasi (lihat task 06).

## 2. Enum Value per Kategori (starting list — boleh ditambah nanti tanpa ubah arsitektur)

```ts
export const MOOD_OPTIONS = [
  'none', 'peaceful', 'joyful', 'energetic', 'dramatic', 'dark_moody',
  'mysterious', 'romantic', 'melancholic', 'professional_corporate',
  'playful', 'serene', 'tense_suspenseful', 'nostalgic', 'futuristic',
] as const;

export const COLOR_PALETTE_OPTIONS = [
  'none', 'warm_tones', 'cool_tones', 'monochrome_bw', 'pastel',
  'vibrant_saturated', 'earth_tones', 'high_contrast', 'muted_desaturated',
  'golden_hour_warm', 'cool_blue', 'jewel_tones',
] as const;

export const ART_STYLE_OPTIONS = [
  'none', 'photorealistic', 'cinematic_photography', 'editorial_photography',
  'minimalist', 'vintage_retro', 'modern_commercial', 'documentary_style',
  'fine_art', 'studio_product_photography', 'lifestyle_photography',
] as const;

export const BACKGROUND_OPTIONS = [
  'none', 'studio_plain_backdrop', 'urban_cityscape', 'nature_outdoor',
  'office_corporate_interior', 'home_domestic_interior', 'abstract_gradient',
  'industrial', 'blurred_bokeh', 'isolated_white_transparent',
] as const;

export const HUMAN_MODEL_OPTIONS = [
  'no_people', 'any_person', 'man', 'woman', 'child', 'group_of_people',
  'couple', 'elderly_person', 'teenager',
] as const;
```

Tiap opsi butuh label tampilan (Title Case, untuk dropdown) — buat mapping
`OPTION_LABELS: Record<string, string>` terpisah, jangan hardcode label di
tempat lain.

## 3. Field Baru Lengkap di `generatorInputSchema.ts`

```ts
language: z.enum(['en', 'id']).default(currentAppLocale），// ambil dari i18n context saat init
aspectRatio: z.enum(['random', '1:1', '4:5', '2:3', '9:16', '3:2', '4:3', '16:9']).default('random'),
variationLevel: z.number().int().min(1).max(5).default(3),
mood: dualModeSchema(MOOD_OPTIONS).default({ mode: 'user', value: 'none' }),
colorPalette: dualModeSchema(COLOR_PALETTE_OPTIONS).default({ mode: 'user', value: 'none' }),
artStyle: dualModeSchema(ART_STYLE_OPTIONS).default({ mode: 'user', value: 'none' }),
background: dualModeSchema(BACKGROUND_OPTIONS).default({ mode: 'user', value: 'none' }),
humanModel: dualModeSchema(HUMAN_MODEL_OPTIONS).default({ mode: 'user', value: 'no_people' }),
customInstructions: z.string().max(500).default(''),
includeHistory: z.boolean().default(false),
includeHistoryCount: z.number().int().min(5).max(50).default(20),
```

(Perbaiki syntax di atas sesuai konvensi Zod yang sudah ada di file — ini
representasi field & default, bukan literal final code.)

`basePromptReference` sudah ada di schema lama, tetap dipertahankan apa
adanya (default `undefined`/`''`).

## 4. Tambahan ke `DESIGN.md`

Tambah section baru (saran: `§6.9 Dual-Mode Select`) yang mendokumentasikan
pola visual dari dua segmented button ("User Defined" / "System Defined") +
combobox conditional di bawahnya — ini komponen yang belum pernah ada
spec-nya sebelumnya. Pakai gaya section yang sama dengan §6.7/§6.8 yang sudah
ada (kapan dipakai, kenapa beda dari `Switch` biasa, contoh className).

## Definition of Done
- [ ] `generatorInputSchema.ts` lulus type-check dengan semua field di atas.
- [ ] Enum value + label tersedia untuk kelima kategori dual-mode.
- [ ] `DESIGN.md` punya section baru untuk Dual-Mode Select.
- [ ] Tidak ada satu pun perubahan di file UI atau engine.