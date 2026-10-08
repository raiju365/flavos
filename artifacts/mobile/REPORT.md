# Audit dan perbaikan mobile — 8 Oktober 2026

Source diuji melalui Vite lokal di http://localhost:5173/ menggunakan browser Microsoft Edge/Chromium dan emulasi viewport/touch. Perubahan berada di source, bukan edit manual hasil build.

## Perbaikan

- Navbar memiliki gutter 16 px pada ponsel, kolom simetris, dan target logo 44 × 44 px. Aturan lama yang memaksakan lebar penuh tidak lagi mengambil alih.
- About pada layar pendek memakai spacing yang lebih ringkas. Jika komposisi masih lebih tinggi daripada viewport, kata-katanya langsung terlihat sehingga bagian awal dapat dibaca sebelum digulir. Pinning mengikuti tinggi komposisi aktual.
- Ponsel landscape mulai lebar 600 px menggunakan dua paragraf di sisi portrait, dengan ukuran teks minimum 15 px. Foto mempertahankan proporsinya.
- Sensitivitas drag khusus touch dinaikkan 1.6 kali agar sapuan horizontal tidak terlalu mudah kembali ke kartu semula. Scroll vertikal tetap tersedia.
- Detail karya pada layar sempit/pendek memakai susunan vertikal yang dapat digulir. Gambar mempertahankan rasio, kontrol memiliki inset safe-area, dan Back/Close tetap terlihat setelah isi digulir.
- Footer landscape lebih ringkas: headline dalam satu baris dan tautan kontak tetap dapat dijangkau.

## Hasil pengujian

Semua 13 viewport berikut lulus Home → About → Work → Contact → Back to top, pemeriksaan teks About setelah reveal, pemuatan gambar, dan overflow:

| Viewport CSS px | Hasil |
| --- | --- |
| 280 × 568 | Lulus |
| 320 × 480 | Lulus |
| 320 × 568 | Lulus |
| 360 × 640 | Lulus |
| 390 × 844 | Lulus |
| 430 × 932 | Lulus |
| 540 × 720 | Lulus |
| 699 × 900 | Lulus |
| 700 × 900 | Lulus |
| 768 × 1024 | Lulus |
| 667 × 375 | Lulus |
| 844 × 390 | Lulus |
| 1440 × 900 | Lulus |

52 snapshot section: overflow horizontal 0 px; tidak ada gambar rusak yang ditemukan; tidak ada pageerror JavaScript. Layout tidak diwajibkan masuk seluruhnya dalam satu layar: pada viewport sangat pendek, teks tetap dapat dibaca melalui scroll.

Pengujian input touch pada 320 × 480, 390 × 844, 667 × 375, dan 844 × 390 juga lulus:

- Geser horizontal memutar gallery; drag tidak membuka detail secara tidak sengaja.
- Geser vertikal menggulir halaman.
- Tap membuka detail; rasio dan centerline gambar benar.
- Next/previous karya, swipe poster/mockup, dan panah slider bekerja.
- Back tetap terlihat setelah scroll sampai akhir detail; modal ditutup dan body scroll pulih.
- Reduced motion menampilkan teks; pergantian orientasi saat modal terbuka dan Escape tidak meninggalkan UI terkunci.
- Regresi desktop memakai konteks pointer biasa pada 1440 × 900: detail, centerline, rasio, Back, dan pembersihan gambar transisi lulus.

Jalur scroll About → Work diuji khusus pada 390 × 844 dan 320 × 480: gate absorpsi selesai, gallery muncul, ukuran portrait tetap, scroll balik mengikuti jalur yang sama, penyeberangan kedua berhasil, reduced motion dan pemulihan scroll lulus.

`node --check` untuk kedua modul JS yang berubah dan `npm run build` lulus. Build masih melaporkan referensi lama `/border icon.svg` yang tidak terselesaikan saat build; pemeriksaan ini tidak menemukan gambar rusak pada surface aktif.

## Bukti

- [Matriks portrait](final-portrait.json)
- [Matriks landscape dan desktop](final.json)
- [Interaksi touch dan regresi desktop](interactions.json)
- [Scroll organik pada 320 × 480](organic-320x480.json)
- [About portrait 390 × 844](final-portrait-390x844-reading.png)
- [About landscape 667 × 375](final-667x375-reading.png)
- [Footer landscape](final-667x375-contact.png)
- [Detail setelah digulir pada 320 × 480](detail-320x480-scrolled.png)

## Batas verifikasi

Emulasi touch memakai input browser, bukan perangkat fisik. Safari/iOS, notch fisik, perubahan toolbar browser di perangkat nyata, dan performa FPS pada ponsel belum diuji langsung. Matriks viewport memberi bukti responsivitas pada ukuran di atas, bukan jaminan seluruh perangkat dan browser yang mungkin ada. Tidak ada deployment dalam pekerjaan ini.
