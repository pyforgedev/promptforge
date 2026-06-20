# Code Review: Target Generator & Platform Customization

## Summary
This audit inspects the flow and logic of the platform-specific prompt generation system. It addresses why the user is presented with choices (`both`, `dalle3`, `nano_banana`) when the pipeline generates variants for both platforms anyway, explains the pipeline mechanics, highlights correctness issues, and recommends solutions.

## Verdict
The logic is mostly clean and functional, but it contains minor redundancy and correctness bugs. The main user confusion stems from a UX/Backend disconnect: the LLM is requested to optimize for a specific platform, but the engine always constructs variations for both platforms regardless of the selection.

---

## Jawaban Pertanyaan Pengguna
> **Pertanyaan:** "kenapa ada pilihan jika ujung2nya req ke API dan menghasilkan keduanya??"
> *(Why is there a choice if in the end it requests the API and generates both?)*

Pilihan platform tersebut **tetap penting dan memengaruhi hasil akhir** karena tiga alasan utama:

1. **Optimasi Prompt LLM (System/User Prompt)**:
   Pilihan platform dikirim ke LLM melalui `MetaPromptBuilder.ts` (`input.targetPlatform`). 
   - Jika memilih `dalle3`, LLM diinstruksikan untuk menulis dengan gaya bahasa deskriptif mengalir (*natural language*) tanpa sintaksis tag khusus.
   - Jika memilih `nano_banana`, LLM diinstruksikan dengan pedoman khusus Nano Banana (misalnya batas karakter lebih pendek, struktur berbeda).
   - Jika memilih `both`, LLM diinstruksikan untuk menulis versi dasar dalam gaya natural language, lalu pemrosesan format diserahkan sepenuhnya ke platform adapter lokal.

2. **Pembentukan Negatif Prompt Kontekstual**:
   `NegativePromptGenerator.ts` menggunakan pilihan platform untuk memformat negative prompt secara berbeda:
   - DALL-E 3 tidak mendukung negative prompt bawaan, sehingga negative prompt digabungkan ke prompt utama dengan format penulisan `Avoid: ...`.
   - Nano Banana mendukung kolom negative prompt terpisah, sehingga negative prompt dikembalikan sebagai deretan tag biasa tanpa kata `Avoid:`.

3. **Penyaringan Tampilan Awal & Batasan Karakter (Platform Spec)**:
   Pilihan tersebut menentukan platform mana yang menjadi tab aktif default di UI (`PromptCard.tsx`) serta memotong panjang teks (`truncate` di `PlatformAdapter.ts`) sesuai limit platform (DALL-E 3: 4000 karakter, Nano Banana: 2000 karakter).

**Kesimpulan**: Meskipun backend database menyimpan kedua varian (`platformVariants.dalle3` dan `platformVariants.nano_banana`), pilihan pengguna di awal menentukan **bagaimana LLM menulis prompt dasar** dan **bagaimana negative prompt diposisikan dan diformat**.

---

## Alur Pipeline (Flow & Logic)
1. **GeneratorForm.tsx**: Pengguna memilih `targetPlatform` (`dalle3` | `nano_banana` | `both`).
2. **PromptComposerEngine.compose()**:
   - Menerima input form dan membuat variasi matriks.
   - Memanggil `MetaPromptBuilder.build()` untuk menyusun instruksi LLM. Platform yang dipilih disisipkan sebagai instruksi format penulisan.
   - LLM merespons dengan JSON berisi prompt dasar (`full_prompt`).
   - `generateNegativePrompt()` dijalankan menggunakan parameter target platform untuk menghasilkan teks negatif.
   - `adaptForPlatform()` dijalankan untuk menghasilkan objek `PlatformVariants` berisi versi DALL-E 3 dan Nano Banana.
   - `fullPrompt` akhir dipilih secara dinamis berdasarkan target platform:
     - Jika target `nano_banana`, gunakan versi Nano Banana.
     - Jika tidak (baik `dalle3` atau `both`), gunakan versi DALL-E 3.
3. **PromptCard.tsx**: UI menampilkan tab platform. Tab aktif default disesuaikan dengan pilihan awal pengguna.

---

## Critical Issues
*Tidak ditemukan isu kritis (critical/security blocker).*

---

## High Issues
### 1. Inconsistency in adaptForPlatform parameter passing
- **File**: `src/features/prompt-generator/engine/PromptComposerEngine.ts` (Baris 97)
- **Dampak**: Engine memanggil `adaptForPlatform(promptWithScore, validInput.targetPlatform, negativePrompt)`. Namun, pada file `PlatformAdapter.ts` (Baris 54), parameter kedua didefinisikan sebagai `_targetPlatform` (menggunakan underscore) dan **sama sekali tidak digunakan** di dalam fungsi tersebut.
- **Dampak Detail**: Fungsi `adaptForPlatform` selalu menjalankan `buildDalle3Prompt` dan `buildNanaBananaPrompt` secara membabi buta tanpa memedulikan platform target sesungguhnya. Akibatnya, pemrosesan tambahan (seperti menghapus nama brand kamera) selalu terjadi pada properti DALL-E 3 dan tidak terjadi pada Nano Banana, terlepas dari pilihan platform yang masuk.
- **Rekomendasi Perbaikan**: Evaluasi kembali apakah pemrosesan platform-specific di `PlatformAdapter.ts` perlu memedulikan `targetPlatform` atau jika memang dirancang untuk selalu menghasilkan keduanya. Jika selalu menghasilkan keduanya, hapus parameter yang tidak terpakai atau gunakan parameter tersebut untuk mengoptimalkan kinerja (misalnya tidak perlu memproses format platform yang tidak dipilih jika performa menjadi perhatian).

---

## Medium Issues
### 1. Redundant platformVariants initialization in mapLLMOutput
- **File**: `src/features/prompt-generator/engine/PromptComposerEngine.ts` (Baris 185-188)
- **Dampak**: Di dalam helper `mapLLMOutput`, properti `platformVariants` diinisialisasi secara statis dengan menduplikasi `p.full_prompt`. Namun, segera setelah itu pada baris 97-100, properti ini ditimpa kembali (*overwritten*) menggunakan hasil pemanggilan fungsi `adaptForPlatform`.
- **Dampak Detail**: Alokasi objek sementara yang tidak perlu. Kode menjadi kurang bersih dan membingungkan pembaca kode baru.
- **Rekomendasi Perbaikan**: Hapus inisialisasi `platformVariants` pada baris 185-188 di `mapLLMOutput` karena akan segera ditimpa di dalam iterasi `map` setelahnya.

---

## Suggestions
### 1. Clarify UX for 'both' option
- **File**: `src/features/prompt-generator/components/PromptCard.tsx`
- **Saran**: Jika platform yang dipilih adalah `dalle3` atau `nano_banana`, tab platform lain tetap dapat diklik di UI. Untuk memperjelas bahwa prompt tersebut sebenarnya dioptimalkan khusus untuk salah satu platform oleh LLM, tambahkan indikator visual (seperti badge "Optimized" atau tulisan bantuan) pada tab platform yang dipilih saat generate.

---

## Positive Notes
- **Modularitas Bagus**: Pemisahan logika antara pembentukan instruksi prompt (`MetaPromptBuilder`), pemformatan platform (`PlatformAdapter`), dan penyusunan negative prompt (`NegativePromptGenerator`) terstruktur dengan sangat baik.
- **Robust Parsing**: Penanganan parsing JSON dari LLM pada `PromptComposerEngine.parseResponse` sangat tangguh karena mampu mendeteksi serta membersihkan markdown block secara otomatis.
