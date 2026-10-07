# PRD: Navbar Page Transition — "Colonnade Transition"

Website portofolio bertema klasik Yunani/Romawi (navy tua + krem, pola meander/Greek key, ikon kuil).

---

## 0. Prompt Siap Tempel (untuk AI coding tool)

> Kamu adalah senior creative developer yang terbiasa membuat website level Awwwards.
> Tugasmu: menambahkan **sistem page transition** ke website portofolio yang **sudah ada**, dipicu saat user klik tombol di navbar.
>
> Aturan kerja:
> 1. **Deteksi stack yang sudah dipakai lebih dulu** (framework, router, CSS, library animasi). Ikuti stack itu; jangan ganti framework dan jangan rewrite halaman yang sudah ada.
> 2. Ikuti PRD di bawah ini secara berurutan. Jangan mengubah isi konten, layout, atau warna halaman yang ada. Ambil warna dan font dari CSS variable / theme yang sudah ada. Desain navbar yang sudah ada (lihat Bagian 5.0) juga tidak boleh didesain ulang; hanya tambahkan interaksi dan animasi.
> 3. Semua animasi hanya boleh memakai `transform`, `opacity`, dan `clip-path` supaya tetap 60fps.
> 4. Semua angka durasi, easing, dan jumlah kolom ditaruh di **satu file config** agar mudah di-tweak.
> 5. Setelah selesai, jelaskan file apa yang dibuat/diubah dan cara mengubah config.

---

## 1. Tujuan

**Apa:** Saat user klik tombol navbar (Home, Work, About, Expertise, logo, dan CTA "Let's talk"), halaman tidak "pindah begitu saja". Ada transisi sinematik: layar tertutup oleh elemen bertema kuil, nama halaman tujuan muncul besar, konten diganti di balik penutup, lalu penutup terbuka dan konten baru masuk dengan animasi.

**Mengapa:** Transisi yang dirancang dengan baik membuat website terasa seperti satu pengalaman utuh (bukan kumpulan halaman lepas). Ini pembeda utama website ala Awwwards dibanding template biasa.

**Ukuran berhasil:**
- Transisi terasa halus, punya ritme (lambat–cepat–lambat), dan tidak pernah terasa "nge-lag".
- Tema Yunani/Romawi terasa jelas di transisi, bukan sekadar wipe hitam generik.
- Total durasi terasa mewah tetapi tidak menyebalkan: **±1.6–1.9 detik**.

---

## 2. Referensi Rasa (bukan untuk disalin)

Referensi: situs nominasi/SOTD di Awwwards, koleksi Lapa Ninja, dan komponen di 21st.dev.

Karakter yang diambil dari referensi tersebut:
- **Cover → swap → reveal**: konten diganti *saat layar tertutup*, sehingga user tidak pernah melihat "loncatan".
- **Easing tajam**: mulai pelan, cepat di tengah, pelan lagi di akhir (`expo.inOut` / `cubic-bezier(0.76, 0, 0.24, 1)`), bukan `ease` bawaan browser.
- **Stagger**: elemen tidak bergerak serentak; ada jeda kecil antar elemen sehingga terlihat "mengalir".
- **Tipografi sebagai bintang**: teks besar dengan *masked reveal* (teks naik dari balik garis potong).
- **Entrance bertingkat** di halaman baru (heading → gambar → paragraf).

Catatan: ambil *prinsipnya*, bukan meniru satu situs tertentu. Hasil akhir harus terasa milik portofolio ini.

---

## 3. Konsep Visual: "Colonnade Transition"

Layar ditutup oleh **deretan pilar kuil** yang naik dari bawah, seperti tiang-tiang yang berdiri berjajar (colonnade).

### 3.1 Elemen

| Elemen | Deskripsi | Mengapa |
|---|---|---|
| **Pilar (columns)** | Panel vertikal full-height, warna navy tua (ambil dari theme). Desktop 6 pilar, tablet 4, mobile 3. Lebar sama, tanpa celah (overlap 1px untuk cegah garis tipis). | Deretan pilar = identitas kuil, sekaligus teknik stagger yang ampuh. |
| **Capital strip** | Strip tipis krem di sisi atas tiap pilar, berisi pola **meander/Greek key** (SVG `<pattern>`, repeat horizontal). | Detail kecil inilah yang membuat tema terasa klasik, bukan sekadar kotak berwarna. |
| **Label halaman** | Nama halaman tujuan, font serif besar (pakai display font yang sudah ada), warna krem, di tengah layar. Di atasnya angka Romawi kecil (I, II, III). | Memberi konteks "kamu sedang menuju mana" dan mengisi jeda dengan hal yang menarik. |
| **Garis meander** | Garis tipis pola meander di bawah label yang "tergambar" (stroke-dashoffset) dari kiri ke kanan. | Micro-detail yang mengisi momen ketika layar tertutup penuh. |

### 3.2 Pemetaan label (sesuai navbar saat ini)

| Tombol navbar | Label transisi | Numeral |
|---|---|---|
| Home dan logo kuil (tengah) | WELCOME | — |
| Work | WORK | I |
| About | ABOUT | II |
| Expertise | EXPERTISE | III |
| Let's talk (CTA) | LET'S TALK | IV |

Catatan: label boleh diganti agar lebih puitis (mis. "SELECTED WORK", "ABOUT ME"), asal tetap pendek (maksimal 2 kata) supaya muat di layar mobile.

---

## 4. Koreografi (Timeline)

Semua waktu dalam detik dari saat klik. Gunakan **satu master timeline** (mis. `gsap.timeline`) agar urutan terkontrol dan bisa di-`kill` bila perlu.

| Waktu | Aksi | Detail | Easing |
|---|---|---|---|
| 0.00 | **Lock** | Set state `isTransitioning = true`, nonaktifkan klik navbar & scroll (`lenis.stop()` bila memakai Lenis). | — |
| 0.00–0.70 | **Cover** | Pilar `scaleY 0 → 1`, `transform-origin: bottom`, stagger 0.07s dari kiri ke kanan, durasi per pilar 0.6s. Halaman lama bersamaan bergeser `y: -40px`, `scale: 0.96`, `opacity: 1 → 0.6` (efek kedalaman). | `expo.inOut` |
| 0.35–0.95 | **Label in** | Angka Romawi dan label masuk dengan *masked line reveal* (`yPercent: 110 → 0` di dalam wrapper `overflow: hidden`). Garis meander tergambar. | `expo.out` |
| ±0.90 | **SWAP** | Ganti konten (ganti route ATAU loncat ke section, lihat Bagian 6). Scroll di-reset ke posisi tujuan **tanpa animasi**. Tunggu font & gambar kritis siap (timeout maks 1.5s). | — |
| 0.95–1.30 | **Label out** | Label naik keluar (`yPercent: 0 → -110`), garis meander memudar. | `expo.in` |
| 1.10–1.80 | **Reveal** | Pilar `scaleY 1 → 0`, `transform-origin: top` (menyusut ke atas), stagger 0.07s arah sama dengan cover. | `expo.inOut` |
| 1.30–2.10 | **Entrance halaman baru** | Lihat Bagian 7. Dimulai sedikit *sebelum* reveal selesai agar terasa menyambung. | `expo.out` |
| Akhir | **Unlock** | `isTransitioning = false`, `lenis.start()`, hapus `will-change`, bersihkan style inline. | — |

Dimana: waktu di atas adalah target awal; semuanya harus bisa diubah lewat config.

**MENGAPA konten diganti saat layar tertutup penuh:** dikarenakan pada momen itu user tidak bisa melihat halaman di belakangnya, sehingga perubahan DOM, reset scroll, dan render awal tidak terlihat sebagai glitch.

---

## 5. Interaksi Navbar

### 5.0 Struktur navbar saat ini (desain TIDAK diubah)

Susunan dari kiri ke kanan: **Home**, **Work**, **logo kuil/pilar (tengah)**, **About**, **Expertise**, dan tombol **Let's talk ↗** di ujung kanan. Teks putih tipis di atas background gelap, gaya minimal. Tombol aktif (saat ini Home) ditandai garis tipis pendek di bawah teksnya.

Dimana: PRD ini hanya menambahkan *interaksi dan animasi*. Posisi, ukuran, font, dan warna navbar dibiarkan sama.

MENGAPA: navbar yang bersih dan minimal sudah cocok dengan gaya Awwwards. Animasi berlebihan di navbar justru akan bersaing dengan transisi halaman, sehingga efek navbar dibuat halus.

### 5.1 Hover (micro-interaction)
- **Text roll** (Home, Work, About, Expertise, Let's talk): teks digandakan; saat hover, teks pertama naik keluar dan salinan kedua naik masuk (`yPercent`), durasi ±0.4s, `expo.out`.
- **Garis aktif yang "berpindah"**: pakai garis tipis pendek yang sudah ada. Pada tombol non-aktif, garis tumbuh saat hover (`scaleX 0 → 1`, origin kiri) dan menyusut ke kanan saat kursor keluar (origin kanan). Saat klik, garis di tombol lama menyusut dan garis di tombol tujuan tumbuh, sehingga terlihat seperti garis "berpindah".
- **Logo kuil**: saat hover, pilar-pilar pada ikon naik ±2px bergantian (stagger 0.05s) lalu kembali. Ini menyambung dengan tema pilar di transisi. Klik logo = kembali ke Home (label WELCOME).
- **Let's talk ↗**: saat hover, panah keluar ke kanan-atas dan salinan panah masuk dari kiri-bawah (loop singkat 0.4s).
- **Opsional (desktop saja)**: efek *magnetic*, tombol tertarik ±6px ke arah kursor. Nonaktif di touch device.

### 5.2 Saat transisi berjalan
- Navbar **tetap di atas overlay** (z-index lebih tinggi dari pilar) supaya terasa menyatu dan user masih bisa melihat menu.
- Warna teks navbar berganti ke krem selama layar tertutup, lalu kembali ke warna semula setelah reveal. (Mengapa: teks navy di atas pilar navy akan tidak terbaca.)
- Indikator tombol aktif berpindah ke tombol tujuan sejak awal klik, bukan setelah selesai (agar terasa responsif).
- Klik lain diabaikan selama `isTransitioning`.

---

## 6. Perilaku Fungsional

Website ini bisa berupa **multi-route** atau **satu halaman panjang dengan section**. PRD ini mendukung keduanya. AI tool wajib mendeteksi mana yang dipakai, lalu memilih mode yang sesuai.

### Mode A — Multi-route (halaman terpisah)
1. Intercept klik link navbar (`preventDefault`).
2. Jalankan fase Cover.
3. Saat SWAP: lakukan navigasi route (router push / ganti view). Pastikan halaman baru sudah ter-render sebelum Reveal dimulai.
4. Dukung tombol **Back/Forward** browser: transisi yang sama harus berjalan, dan URL harus benar.

### Mode B — Satu halaman panjang (section anchor)
1. Klik navbar → fase Cover.
2. Saat SWAP: **loncat instan** (tanpa smooth scroll) ke section tujuan, lalu update URL hash.
3. Reveal terbuka tepat di section tujuan.

**MENGAPA loncat instan, bukan smooth scroll:** dikarenakan smooth scroll melewati semua section di tengah dan akan terlihat seperti scroll biasa, sehingga efek "teleport dramatis" ala transisi halaman hilang.

### 6.1 Edge case yang wajib ditangani
- Klik menu ke halaman/section yang **sedang aktif** → tidak ada transisi; cukup scroll halus ke atas section itu.
- Klik cepat berulang → hanya klik pertama yang diproses.
- **Let's talk**: jika mengarah ke halaman/section kontak → transisi normal (label LET'S TALK). Jika berupa `mailto:`, WhatsApp, atau link eksternal → **tanpa transisi**, langsung dibuka.
- Transisi **tidak** diputar pada load pertama (loading screen / intro scroll yang sudah ada punya animasi sendiri).
- Jika user membuka URL langsung ke halaman tertentu → tampil normal, tanpa transisi.
- Jika halaman tujuan gagal dimuat → tutup dengan aman: Reveal tetap berjalan agar layar tidak tertahan tertutup.
- Resize saat transisi → hitung ulang jumlah pilar hanya pada transisi berikutnya, jangan mengganggu yang sedang berjalan.

### 6.2 Integrasi dengan elemen yang sudah ada
- **Elemen yang bergerak mengikuti scroll (ScrollTrigger dan sejenisnya):** setelah SWAP, panggil `refresh()` dan reset posisi, kalau tidak posisi animasi akan salah.
- **3D viewer (Three.js):** jeda render loop saat layar tertutup dan lanjutkan setelah Reveal. Bila berpindah dari halaman yang memuat viewer, lakukan `dispose()` geometry, material, dan texture. (Mengapa: WebGL yang tetap jalan di belakang overlay membebani GPU dan menyebabkan frame drop tepat di saat animasi butuh 60fps.)
- **Smooth scroll library (Lenis):** hentikan saat transisi, reset ke posisi tujuan, jalankan lagi saat selesai.

---

## 7. Animasi Masuk Halaman Baru (Entrance)

Dijalankan otomatis setiap kali Reveal berjalan. Semua elemen berikut sudah harus dalam kondisi *awal tersembunyi* sebelum Reveal dimulai, supaya tidak berkedip.

| Elemen | Animasi | Stagger |
|---|---|---|
| **Heading utama** | Dipecah per baris (SplitText / split manual), tiap baris `yPercent 100 → 0` dari balik mask `overflow: hidden` | 0.08s per baris |
| **Gambar / kartu** | `clip-path: inset(100% 0 0 0) → inset(0)` sambil gambar di dalamnya `scale 1.2 → 1` | 0.12s per item |
| **Paragraf & elemen kecil** | `opacity 0 → 1`, `y 24px → 0` | 0.05s |
| **Dekorasi meander / ikon kuil** | Muncul dengan `opacity` + sedikit `scale 0.9 → 1` | — |

Catatan: durasi per elemen 0.8–1.1s dengan `expo.out`. Jangan animasikan lebih dari ±30 elemen sekaligus.

---

## 8. Spesifikasi Teknis

### 8.1 Library (rekomendasi, sesuaikan dengan stack yang ada)
- **GSAP** (core + ScrollTrigger + SplitText bila tersedia) untuk timeline & stagger.
- **Lenis** untuk smooth scroll (jika belum ada).
- Jika project memakai React/Next.js: boleh **Framer Motion** atau GSAP dengan `useGSAP`. Untuk Next.js App Router, buat komponen `TransitionProvider` yang membungkus layout.
- Multi-route tanpa framework: boleh **Barba.js**.

### 8.2 Struktur file yang disarankan
```
/transition
  ├─ transition.config.js      // semua angka: durasi, easing, jumlah pilar, warna
  ├─ TransitionOverlay.(jsx|js) // markup pilar + label + garis meander
  ├─ transitionController.js    // master timeline, lock/unlock, swap callback
  ├─ pageEntrance.js            // animasi masuk per halaman
  └─ meanderPattern.svg         // pola Greek key (atau inline SVG)
```

### 8.3 Contoh config
```js
export const TRANSITION_CONFIG = {
  columns: { desktop: 6, tablet: 4, mobile: 3 },
  cover:   { duration: 0.6, stagger: 0.07, ease: "expo.inOut" },
  label:   { in: 0.6, out: 0.35, ease: "expo.out" },
  reveal:  { duration: 0.6, stagger: 0.07, ease: "expo.inOut" },
  swapTimeoutMs: 1500,
  reducedMotion: { fadeDuration: 0.25 },
  colors: { pillar: "var(--navy)", accent: "var(--cream)" } // ambil dari theme yang ada
};
```

### 8.4 Aturan implementasi
- Overlay dipasang **sekali** di root layout, `position: fixed; inset: 0; pointer-events: none` (kecuali saat transisi berjalan), z-index di bawah navbar.
- Pilar di-render dengan `transform: scaleY()`, **bukan** animasi `height`.
- Beri `will-change: transform` hanya selama transisi, lalu hapus.
- Semua timeline harus punya `kill()` / cleanup agar tidak bocor saat komponen unmount.

---

## 9. Performa

- Target **60fps** di laptop menengah dan HP kelas menengah.
- Hanya animasikan `transform`, `opacity`, `clip-path`. Dilarang animasi `width/height/top/left/box-shadow`.
- Pola meander memakai SVG ringan (bukan gambar raster besar).
- Pra-muat font display dan gambar hero halaman tujuan (`prefetch`/`preload`) saat user *hover* tombol navbar, sehingga SWAP tidak menunggu.
- Jika FPS turun (mis. perangkat lemah), kurangi jumlah pilar dan matikan efek kedalaman pada halaman lama.

---

## 10. Aksesibilitas

- **`prefers-reduced-motion: reduce`** → ganti seluruh koreografi dengan **crossfade 0.25s** (tanpa pilar, tanpa stagger, tanpa parallax).
- Setelah transisi, pindahkan **fokus** ke heading utama halaman baru (`tabindex="-1"` + `.focus()`) dan umumkan perubahan lewat `aria-live="polite"` ("Sekarang di halaman: Projects").
- Overlay diberi `aria-hidden="true"`.
- Navigasi keyboard (Tab + Enter) harus memicu transisi yang sama seperti klik mouse.
- Perbarui `document.title` sesuai halaman tujuan.

---

## 11. Responsif

| Breakpoint | Jumlah pilar | Catatan |
|---|---|---|
| Desktop (≥1024px) | 6 | Efek penuh, magnetic hover aktif |
| Tablet (640–1023px) | 4 | Efek penuh, tanpa magnetic |
| Mobile (<640px) | 3 | Durasi dipersingkat ±15%, ukuran label diperkecil (`clamp()`), tanpa hover effect |

Gunakan `100dvh` (bukan `100vh`) agar overlay menutup penuh di browser mobile yang address bar-nya naik-turun.

Catatan navbar di mobile: dengan 5 tombol + logo, navbar kemungkinan berubah menjadi hamburger menu. Bila begitu, **tutup menu dulu (±0.3s) baru jalankan Cover**, agar menu dan pilar tidak bertumpuk. Efek hover dinonaktifkan di mobile.

---

## 12. Acceptance Criteria (checklist QA)

- [ ] Klik Home / Work / About / Expertise / logo (dan Let's talk bila mengarah ke halaman kontak) memicu transisi Colonnade dengan urutan: cover → label → swap → reveal → entrance.
- [ ] Konten berubah **hanya saat layar tertutup penuh**; tidak ada kedipan atau loncatan yang terlihat.
- [ ] Total durasi 1.6–1.9 detik pada desktop; navbar bisa diklik lagi setelah unlock.
- [ ] Klik cepat berulang tidak merusak state atau menumpuk animasi.
- [ ] Tombol Back/Forward browser tetap memicu transisi dan URL benar (Mode A) / hash benar (Mode B).
- [ ] Transisi **tidak** muncul pada load pertama dan tidak mengganggu loading screen/intro yang sudah ada.
- [ ] Elemen yang mengikuti scroll dan 3D viewer bekerja normal setelah transisi (posisi benar, tidak ada frame drop berkepanjangan).
- [ ] `prefers-reduced-motion` menghasilkan crossfade sederhana.
- [ ] Fokus dan judul halaman terupdate; bisa dipakai lewat keyboard.
- [ ] Warna, font, dan pola meander mengikuti theme yang sudah ada (tidak ada warna hard-coded baru).
- [ ] Tidak ada console error dan tidak ada memory leak (timeline di-kill saat unmount).

---

## 13. Di Luar Cakupan (Non-Goals)

- Tidak mengubah desain, konten, atau struktur halaman yang sudah ada.
- Tidak mengganti framework atau menambah dependency berat tanpa alasan.
- Tidak membuat animasi baru untuk loading screen / intro scroll frame (sudah ada terpisah).

---

## 14. Varian Alternatif (opsional, bisa dijadikan opsi di config)

Bila ingin bereksperimen, sediakan `variant` di config. **Default: `"colonnade"`.**

1. **`colonnade`** (utama) — pilar naik dari bawah seperti dijelaskan di atas.
2. **`circle`** — lingkaran navy membesar dari **posisi klik** memakai `clip-path: circle(0 at x y) → circle(150% at x y)`; saat reveal menyusut ke arah tombol tujuan. Cocok bila ingin efek yang lebih "playful".
3. **`shutters`** — dua panel besar bergerak dari kiri dan kanan bertemu di tengah seperti pintu kuil, dengan pola meander di sisi pertemuan. Cocok bila ingin efek yang lebih dramatis dan simetris.

Catatan: Varian 2 dan 3 memakai fase yang sama (cover → label → swap → reveal → entrance); hanya visual overlay yang berbeda, sehingga logika controller tidak perlu ditulis ulang.
