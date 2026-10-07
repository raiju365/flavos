# PRD: Frame-Scroll Intro Transition

**Status:** Draft
**Terkait:** Website Portofolio Pribadi (tema klasik Yunani/Romawi)
**Tujuan dokumen:** Spesifikasi lengkap agar bisa langsung digenerate oleh AI coding tool (agentic), tanpa ambiguitas.

---

## 1. Ringkasan

Setelah Loading Screen selesai, user **tidak langsung** masuk ke halaman utama (Welcome/Hero). User terlebih dahulu masuk ke **Frame Sequence Section**: sebuah section full-viewport yang menampilkan rangkaian foto (frame) dari folder `public/perframe`. User wajib scroll perlahan melewati seluruh frame (dari frame pertama sampai frame terakhir). Begitu frame terakhir tercapai, layar bertransisi ke **full white**, lalu barulah halaman utama muncul.

Efeknya mirip "scroll-scrubbing video" ala situs produk Apple, tapi sumbernya image sequence statis, bukan video file.

---

## 2. Tujuan (Goals)

- Menciptakan kesan masuk yang sinematik dan disengaja (intentional), bukan transisi generik fade/slide biasa.
- Memberi kontrol penuh ke user atas kecepatan "playback" — user yang menentukan seberapa cepat frame berganti, lewat kecepatan scroll mereka sendiri.
- Menjadi gerbang satu arah (one-way gate) sebelum konten utama, tanpa terasa seperti macet atau dipaksa.

**Non-goals:** redesign Loading Screen itu sendiri, transisi antar-section di halaman utama (dibahas di PRD lain), audio/sound effect.

---

## 3. User Flow

```
[Loading Screen selesai]
        ↓
[Frame Sequence Section — frame index 0]
        ↓  (user scroll ke bawah, perlahan)
[Frame index bertambah linear mengikuti posisi scroll]
        ↓
[Frame index mencapai N-1 (frame terakhir) + user scroll lanjut]
        ↓
[Transisi: fade to FULL WHITE — scroll di-cut total & momentum diserap]
        ↓  (hold sejenak di putih polos)
[Fade-in ke Halaman Utama — posisi terkunci di scrollTop 0]
        ↓  (cooldown buffer / jeda penahanan scroll ±600–800ms)
[Scroll diaktifkan kembali, user bebas scroll normal]
```

Catatan penting: setelah user berhasil "lulus" dari section ini, section ini **tidak muncul lagi** saat user scroll balik ke atas — ini adalah gerbang satu arah, bukan bagian yang bisa direplay lewat scroll biasa.

---

## 4. Functional Requirements

### FR-1 — Handoff dari Loading Screen
- Saat Loading Screen selesai, viewport otomatis berada di posisi paling atas Frame Sequence Section, menampilkan frame pertama (index 0).
- Tidak boleh ada flash konten kosong/putih/broken image di antara loading screen dan frame pertama.

### FR-2 — Frame Sequence Section (fitur inti)
- Section ini full-viewport (`100vw` x `100vh`), satu-satunya konten adalah `<canvas>` (atau `<img>`) yang menampilkan frame sesuai progress scroll.
- Section punya "virtual scroll height" jauh lebih besar dari 100vh, proporsional terhadap jumlah frame (misal: `totalFrame × pixelPerFrame`), supaya kecepatan scroll-ke-frame terasa konsisten (tidak terlalu cepat/lambat).
- Perhitungan: `progress = scrollTopDalamSection / totalScrollHeightSection` (clamp 0–1), lalu `frameIndex = floor(progress × (totalFrame - 1))`.
- Canvas hanya di-redraw ketika `frameIndex` berubah (bukan setiap event scroll) — pakai `requestAnimationFrame`, untuk mencegah jank.
- User bisa scroll naik-turun bebas **di dalam** rentang frame (mundur untuk lihat ulang frame sebelumnya diperbolehkan), tapi untuk **lanjut ke halaman utama**, wajib mencapai frame terakhir dulu.

### FR-3 — Preloading & Performa
- Semua frame di-preload sebelum Frame Sequence Section ditampilkan ke user (idealnya di-trigger bersamaan dengan Loading Screen berjalan, supaya saat loading selesai, frame sudah siap).
- Jika preload penuh terlalu lambat: preload beberapa frame pertama dulu (misal 20 frame awal) agar section bisa langsung dipakai, sisanya lanjut di background.
- Format gambar: WebP (fallback JPG bila perlu), dikompres, resolusi disesuaikan kebutuhan display (tidak perlu lebih besar dari lebar viewport terbesar yang ditarget).
- Jika sebuah frame belum selesai di-load saat index-nya diminta: tampilkan frame terakhir yang valid ter-load (jangan tampilkan gambar broken/blank).

### FR-4 — Transisi ke Full White & Isolasi Scroll (Anti-Scroll Bleed)
- Trigger: `frameIndex === totalFrame - 1` **dan** user tetap scroll ke bawah melebihi batas tersebut.
- Efek: elemen putih solid fade-in menutupi frame terakhir, durasi 400–600ms, easing `ease-in-out`.
- **Isolasi Scroll (Hard Clamp):** Scroll scrubbing intro di-clamp strictly maksimal hanya sampai transisi layar putih. Input/momentum scroll dari user saat memutar wheel/trackpad di section gambar gerak TIDAK boleh diteruskan (bleed-through/chaining) ke Halaman Utama.
- Selama transisi ini berlangsung, scroll dikunci total (`overflow: hidden`, Lenis stopped, event wheel/touch dicegah via `preventDefault()`).

### FR-5 — Masuk ke Halaman Utama & Scroll Cooldown Buffer
- Setelah full white tampil dan hold sejenak (±200–300ms), Halaman Utama (Welcome/Hero, dst.) fade-in dari putih.
- **Pendaratan Paling Atas (Strict Top Anchor):** Saat Halaman Utama full tampil, posisi scroll WAJIB dijamin berada di paling atas (`scrollTop: 0`). Tidak boleh ada lonjakan atau scroll otomatis ke bawah akibat sisa momentum scroll user.
- **Cooldown Buffer (Jeda Aktivasi Scroll):** Setelah Halaman Utama tampil 100% penuh, scroll **TIDAK langsung aktif secara instan**. Terapkan jeda buffer penahan (cooldown) sekitar ±600–800ms di mana scroll tetap terkunci dan semua input wheel/touch diserap/ditelan (discarded).
- Setelah jeda buffer selesai, barulah scroll dibuka kembali sepenuhnya (`overflow` normal & Lenis aktif), sehingga pergerakan scroll pertama di halaman utama murni berasal dari input baru yang disengaja oleh user.
- Frame Sequence Section dilepas dari alur scroll (unmount atau `display: none`), tidak bisa diakses lagi lewat scroll ke atas.

### FR-6 — Reduced Motion / Aksesibilitas
- Jika `prefers-reduced-motion: reduce` aktif: skip seluruh mekanisme scroll-scrubbing. Tampilkan singkat (atau langsung lompat), lalu fade langsung ke Halaman Utama tanpa memaksa user scroll panjang.
- Sediakan tombol kecil "Lewati Intro" yang selalu terlihat (misal pojok kanan bawah), agar user yang tidak berminat scroll panjang tetap punya jalan keluar cepat.

### FR-7 — Perilaku per Sesi
- Intro ini disarankan hanya tampil **sekali per sesi browser** (pakai `sessionStorage` flag). Reload halaman dalam sesi yang sama akan langsung ke Halaman Utama, tidak mengulang intro.
- *(Ini asumsi rekomendasi — lihat bagian 7 untuk konfirmasi.)*

---

## 5. Spesifikasi Teknis

- **Sumber aset:** `/public/perframe/` — asumsi penamaan sequential dengan zero-padding, misal `frame_0001.webp` … `frame_0120.webp`. **Perlu dikonfirmasi** pola nama file yang sebenarnya dipakai.
- **Komponen:** `<FrameScrollIntro />` merender `<canvas>` full-bleed (`object-fit: cover` behavior via `drawImage` dengan perhitungan aspect ratio manual).
- **State machine** (harus exclusive, tidak boleh overlap listener — ini sumber utama bug "macet"):
  `LOADING → FRAME_SCRUB → TRANSITION_WHITE → MAIN_PAGE_COOLDOWN → MAIN_PAGE_ACTIVE`
- **Virtual scroll container:** tinggi = `totalFrame × FRAME_SCROLL_DISTANCE` px. Nilai awal disarankan `FRAME_SCROLL_DISTANCE = 8–15px` per frame — sesuaikan setelah uji coba agar durasi total scroll tidak terlalu panjang/pendek.
- **Scroll Isolation & Cooldown Mechanism:** State machine transisi mengunci semua input scroll event (`wheel`, `touchmove`, `keydown` spasi/panah) mulai dari trigger Full White, melewati proses reveal Halaman Utama, hingga jeda cooldown buffer (600–800ms) selesai. Lenis `velocity` dan internal scroll target di-reset ke 0 sebelum `lenis.start()` dipanggil.
- **Resize handling:** saat window di-resize, canvas menyesuaikan ukuran baru lalu re-draw `frameIndex` yang sedang aktif (bukan reset ke frame 0).

---

## 6. Edge Cases (wajib ditangani)

| Kasus | Penanganan |
|---|---|
| Scroll sangat cepat (flick trackpad/wheel besar) | `frameIndex` di-clamp ke rentang `0..totalFrame-1`, tidak pernah `undefined`/`NaN` |
| Momentum scroll terbawa ke Halaman Utama (Scroll Chaining / Bleed) | Scroll di-cut total saat layar putih, `scrollTop` di-reset ke 0, dan aktifkan **cooldown buffer (600–800ms)** setelah Halaman Utama tampil penuh sebelum scroll diaktifkan kembali. Semua sisa event diserap (`preventDefault`). |
| User terus memutar scroll wheel tanpa henti saat transisi | Event wheel selama transisi dan masa cooldown ditelan tanpa memindahkan posisi viewport, memastikan user tetap mendarat di Hero section paling atas. |
| Resize saat di tengah sequence | Re-render frame index saat ini di ukuran canvas baru, bukan reset |
| Koneksi lambat, frame belum ter-load | Tahan di frame valid terakhir; jangan render gambar rusak/kosong |
| Touch device (swipe/momentum scroll) | Diuji khusus di iOS Safari — momentum scroll rawan membuat progress "melompat" |
| Back button / pindah route saat masih di sequence | Pastikan scroll-lock ter-release, tidak ada state nyangkut |
| Frame terakhir "nyangkut" tertindih saat transisi white | Pastikan urutan z-index & fade sudah benar diuji, tidak ada flicker di transisi |

---

## 7. Acceptance Criteria

- [ ] Setelah Loading Screen selesai, user langsung berada di frame index 0, tanpa flash konten kosong.
- [ ] Scroll ke bawah menggerakkan frame secara 1:1 halus mengikuti posisi scroll (target 60fps di desktop modern, tanpa jank terlihat).
- [ ] User tidak bisa mencapai Halaman Utama sebelum frame terakhir tercapai.
- [ ] Transisi ke full white mulus — tanpa flicker, tanpa frame terakhir "nyangkut" tertindih layar putih.
- [ ] User maksimal hanya bisa scroll sampai transisi layar putih; sisa scroll tidak "bocor" ke halaman utama.
- [ ] Dari full white, Halaman Utama fade-in tanpa jeda kosong yang janggal.
- [ ] Saat Halaman Utama tampil penuh, tampilan **tidak otomatis bergeser/scroll ke bawah** mengikuti sisa input scroll intro.
- [ ] Halaman Utama selalu mendarat presisi di posisi paling atas (`scrollTop = 0`).
- [ ] Terdapat jeda buffer (cooldown ±600–800ms) setelah Halaman Utama full sebelum scroll aktif kembali.
- [ ] Resize window di tengah sequence tidak merusak posisi/frame yang tampil.
- [ ] `prefers-reduced-motion` menghasilkan pengalaman singkat tanpa scroll-jacking paksa, dan tombol "Lewati Intro" selalu berfungsi.
- [ ] Tidak ada console error terkait index frame di luar batas atau gambar gagal load tanpa fallback.
- [ ] Reload dalam sesi yang sama tidak mengulang intro (sesuai FR-7).

---

## 8. Di Luar Ruang Lingkup

- Desain ulang konten/visual Loading Screen itu sendiri.
- Transisi antar-section di Halaman Utama (About/Projects/Tools) — dibahas terpisah.
- Audio/sound effect selama frame-scrubbing.

---

## 9. Asumsi & Pertanyaan Terbuka (perlu dikonfirmasi sebelum implementasi)

1. Pola penamaan file di `public/perframe` — berapa jumlah total frame dan format ekstensinya?
2. Apakah intro tampil sekali per sesi browser, atau setiap kali halaman di-reload?
3. Resolusi/aspect ratio asli foto — mempengaruhi ukuran canvas & strategi preload.
4. Stack animasi yang dipakai di project (vanilla JS, GSAP, Framer Motion, dll.) — mempengaruhi detail implementasi FR-2 dan FR-4.
