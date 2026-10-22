# Gerak awan dan stiker mengikuti angin

Validasi build produksi lokal pada 22 Oktober 2026, Edge headless. Tampilan dan gerak diperiksa di desktop 1440×900 serta mobile 390×844; regresi interaksi meliputi 1440, 820, 390 dan 320 px, reduced motion, CPU mobile 4×, tanpa WebGL, dan resize/perubahan reduced motion saat penerbangan.

## Perubahan

- Awan memakai empat sprite fotografis buatan imagegen bawaan: puncak putih terang, bayangan biru keabu-abuan, serta alpha tipis di tepi. Total WebP 161,142 byte; atlas sumber 866,239 byte berada di luar public. Prompt dan sumber tersimpan di `assets/source/clouds/README.md`.
- Delapan lapisan bergerak di mobile, sepuluh di desktop, masing-masing dengan kedalaman, kecepatan lintasan, hanyutan silang, dan pengembangan bentuk lembut. Clock awan berjalan mandiri selama transisi, termasuk saat latar menunggu pergantian tujuan. Canvas dibatasi sekitar 650 ribu piksel mobile / 1.15 juta desktop dan berhenti menggambar setelah selesai.
- Stiker tetap memakai elemen gambar aslinya. Gerak tidak lagi mengikuti ayunan sinus berulang: perubahan tekanan angin mengubah kecepatan melalui drag, sementara rotasi mengikuti inersia dan redaman. Dorongan awal tetap langsung ke atas; hembusan terakhir membawanya keluar dari layar.
- Loader menunggu keempat sprite selesai didekode dan disiapkan sebelum halaman dibuka, bersama aset halaman yang sudah ditunggu sebelumnya.

## Bukti

`results.json` berisi `passed: true`, `errors: []` pada kedua ukuran. Pengujian menahan unduhan sprite untuk memastikan halaman tetap tertutup; memeriksa gerak hanyutan awan dan respons rotasi stiker, pergerakan saat latar tertutup, serta frame count yang berhenti saat idle. `../footer-return-response/results.json` menyimpan regresi identitas/ketajaman gambar, kesinambungan geometri, respons klik, dan cleanup interaksi.

`1440-flight.webm` dan `390-flight.webm` adalah rekaman browser nyata, termasuk loading dan transisi. JPG early/middle/near diekstrak dari rekaman terkompresi; kompresi rekaman tidak mewakili ketajaman gambar asli di browser. `1440-early.png` adalah screenshot langsung untuk memeriksa volume dan tepi awan; PNG lain adalah sampel diagnostik awal.

Pengujian ini memakai browser desktop dengan emulasi viewport/sentuhan dan perlambatan CPU, bukan pengukuran HP fisik atau jaminan FPS.

```powershell
npm run build
# Jalankan preview di 127.0.0.1:4173 pada terminal lain.
node scripts/cloud-wind-visual-qa.mjs
node scripts/footer-return-response-qa.mjs
```

Script visual menggunakan ffmpeg untuk mengambil frame dari rekaman; proses situs sendiri tidak memakai ffmpeg.
