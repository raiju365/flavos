# Validasi performa dan refresh portfolio

Diuji menggunakan Edge headless dan build produksi lokal di `http://127.0.0.1:4173/`. Pengukuran performa 21 Oktober mematikan cache browser. Profil mobile memakai viewport 390×844, DPR 2, input sentuh dan perlambatan CPU 4×. Ini simulasi desktop, bukan hasil dari HP fisik.

## Pembaruan kesiapan aset 22 Oktober 2026

Loader sekarang menunggu gambar seluruh section utama dan preview karya, font, tekstur CSS aktif, semua sepuluh varian logo pada mode animasi, persiapan aperture hero, atlas enam stiker, kompilasi shader dan persiapan footer 3D. Aset responsif hasil optimasi tetap digunakan. Mode reduced motion memakai logo statis; perangkat tanpa WebGL memakai poster yang sudah didekode. Gambar detail gallery beresolusi besar tetap disiapkan saat interaksinya dibuka, bukan seluruh arsip asli dipaksa masuk ke memori awal.

Pembaruan transisi awan juga menambahkan empat sprite WebP, total 161,142 byte, yang ikut ditunggu oleh gerbang loading. Gerak stiker dan awan terbaru diperiksa dalam `../cloud-wind/README.md`.

Canvas signature disembunyikan selama persiapan. Poster dan canvas bertukar visibility pada satu perubahan class setelah render pertama siap, sehingga tidak bertumpuk. Feedback loader berada di atas dekorasi agar tombol Try again bisa diklik jika unduhan gagal.

`readiness.json` merekam pengujian unduhan logo/tekstur yang sengaja ditahan pada desktop 1440 dan mobile 390, pemulihan posisi footer, semua gambar halaman selesai, satu canvas, serta tidak ada frame poster dan canvas tampil bersama. Pengujian juga membatalkan tekstur lalu mengklik Try again untuk memastikan scene dapat dipersiapkan ulang tanpa duplikasi.

Angka transfer awal dan durasi loader pada tabel historis di bawah **tidak mewakili gerbang loading baru**. Menunggu semua section dan persiapan 3D membutuhkan waktu awal lebih lama daripada gerbang tujuan saja, sesuai prioritas kesiapan aset terbaru.

## Hasil pengukuran historis 21 Oktober

Sumber angka: `before.json` dan `tuned.json`. Ukuran MB memakai satuan desimal. Resource awal berasal dari Resource Timing (dokumen HTML tidak termasuk); aset detail karya dan footer disiapkan sesuai kebutuhan.

| Pengukuran | Sebelum | Sesudah |
| --- | ---: | ---: |
| Resource awal desktop | 10.590 MB | 0.634 MB |
| Resource awal mobile | 10.586 MB | 0.472 MB |
| Sampai loader selesai, desktop | 23.243 s | 5.206 s |
| Sampai loader selesai, mobile CPU 4× | 30.490 s | 8.453 s |
| Rata-rata interval frame footer desktop | 36.13 ms | 20.21 ms |
| Rata-rata interval frame footer mobile CPU 4× | 37.47 ms | 16.69 ms |
| P95 interval frame footer mobile CPU 4× | 89.90 ms | 41.70 ms |

Rata-rata sampel footer mobile meningkat dari sekitar 26.7 menjadi 59.9 FPS. Masih ada frame lambat (7 dari 132 frame sampel sesudah optimasi lebih dari 33.4 ms). Ini belum membuktikan 60 FPS terkunci, performa Safari/Firefox, suhu setelah pemakaian lama, maupun hasil di HP kelas menengah tertentu.

## Aset dan runtime

- Sepuluh material logo: 37,859,398 byte asli menjadi 1,786,510 byte desktop atau 673,298 byte mobile. Urutan material dan blur saat pertukaran tetap dipakai.
- Hero, portrait, bingkai dan favicon menggunakan salinan WebP dengan dimensi yang sesuai; sumber asli tetap tersedia.
- Preview delapan karya memakai salinan 512 px. Detail tetap memakai varian 1280/1920 yang sudah ada.
- Loading awal kini menunggu gambar/font seluruh section dan persiapan 3D; lihat pembaruan kesiapan aset di atas. Navigasi Contact menggunakan scene yang sama dan sudah siap.
- Grain, canvas dan render 3D memiliki anggaran piksel sesuai perangkat. Render footer menurunkan resolusi bertahap bila frame terlalu lambat; kecepatan animasi dan fungsi interaksi tetap dipertahankan.
- Penghitungan posisi enam hotspot stiker menyelesaikan semua pembacaan layout sebelum menulis posisi, untuk menghindari layout berulang setiap frame.
- Debu memakai canvas native kecil; cursor dan viewer stiker berhenti menggambar ulang saat sudah tenang. Loop visual berhenti saat halaman tersembunyi atau area terkait tidak terlihat.
- Loader memakai hitam `#000` pada pembukaan baru dan refresh. Scroll, scrub dan dock footer diselesaikan sebelum jendela loader membuka.

## Validasi fungsi

`stability.json` mencatat desktop 1440×900, tablet 820×1000, mobile 390×844 dan 320×640, ditambah reduced motion 390×844. Jalur yang diperiksa: scroll maju/balik, navigasi Work/Contact, gambar detail dan proporsinya, next/Escape gallery, viewer stiker 3D/keyboard/close, refresh footer, warna loader, tidak ada pergeseran scroll selama pembukaan, Back to Top dan pemulihan scroll/fokus. Semua kasus selesai tanpa page error.

`asset-validation.json` memeriksa 87 aset produksi melalui HTTP, seluruh preview karya, serta kedua ukuran detail. `fallback.json` memeriksa simulasi perangkat 4 GB/4 core, gambar terlambat, WebGL tidak tersedia, poster footer, refresh dan Back to Top melalui sentuhan.

## Paket produksi

`build-assets.json` menyimpan daftar aset yang ikut build. Public sumber berukuran 140,423,697 byte; salinan public dalam paket produksi berukuran 18,439,260 byte. Bundle JS/CSS/HTML ditambahkan di luar angka public tersebut. File asli tidak dihapus dari proyek. Aset baru yang belum memiliki pengganti tetap ikut dipaketkan.

Penyaringan memakai [`build.copyPublicDir`](https://vite.dev/config/build-options#build-copypublicdir) dan plugin build lokal. Utility persiapan paket Sites memakai pemilih aset yang sama; tidak ada deployment dilakukan.

## Menjalankan ulang

```powershell
cd D:\portofolio
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Biarkan terminal server terbuka. Pada terminal kedua:

```powershell
node scripts/runtime-assets-qa.mjs
node scripts/runtime-readiness-qa.mjs
node scripts/runtime-stability-qa.mjs
node scripts/runtime-performance-qa.mjs measurement
node scripts/runtime-fallback-qa.mjs
```

Untuk membuat ulang gambar runtime: `node scripts/optimize-runtime-assets.mjs`. Utility ini menggunakan Sharp dari environment Codex, atau instalasi Sharp lokal bila tersedia. Langkah tersebut memerlukan sumber asli di proyek; build biasa cukup memakai salinan yang sudah dibuat.

Untuk pengujian HP fisik, buat build produksi lalu jalankan `npm run preview -- --host 0.0.0.0 --port 4174`. Hubungkan HP dan komputer ke Wi-Fi yang sama, lalu akses `http://IP-KOMPUTER:4174`. Periksa refresh dari footer, scroll dua arah, gallery/detail, stiker dan rotasi layar. Browser desktop tidak dapat menggantikan pengujian GPU, suhu dan baterai perangkat tersebut.
