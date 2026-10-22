# Respons stiker Back to Top

Validasi 22 Oktober 2026 pada build produksi lokal, Edge headless, `http://127.0.0.1:4173/`.

Stiker sekarang memindahkan elemen `<img>` yang sudah tampil ke lapisan transisi. URL, piksel sumber, filter bayangan, dan elemen DOM tetap sama. Tidak ada salinan tekstur WebGL, shader, pencahayaan baru, atau canvas resolusi layar untuk gambar stiker ini. Efek lepas singkat dan lintasan ke atas dimulai bersamaan; perjalanan stiker juga terus berjalan selama latar menyelesaikan pergantian halaman. Setelah selesai, gambar asli dikembalikan ke tempatnya.

`results.json` dan file `*-frames.json` mencatat hasil pengujian dengan `scripts/footer-return-response-qa.mjs`:

| Kasus | Waktu handler klik | Sampel gerak naik pertama |
| --- | ---: | ---: |
| Desktop 1440×900 | 20.3 ms | 47.3 ms |
| Tablet 820×1000 | 20.6 ms | 41.8 ms |
| Mobile 390×844, DPR 2, CPU 4× | 34.9 ms | 43.0 ms |
| Mobile 320×640, DPR 2 | 20.3 ms | 40.6 ms |
| Mobile 390×844 tanpa WebGL | 24.2 ms | 33.5 ms |

Mode reduced motion 390×844 juga lolos dengan transisi singkat tanpa penerbangan. Angka di atas menggabungkan pengukuran lokal seluruh ukuran dan pengujian mobile terakhir dan bukan jaminan waktu respons HP fisik atau FPS tertentu.

Kasus beranimasi memeriksa URL/resolusi/filter yang sama, kesinambungan geometri pada handoff dengan toleransi di bawah 1 px, gambar asli selama penerbangan, pergerakan saat latar tertutup, gambar tetap terlihat saat hero membuka, serta klik berulang. Seluruh kasus memeriksa pemulihan satu gambar ke footer, cleanup overlay, scroll tidak terkunci, dan tidak ada overflow horizontal. Kasus mobile juga memeriksa aktivasi keyboard serta resize dan perubahan reduced motion saat terbang. Hasil akhir: `passed: true`, `errors: []`.

Jalankan ulang dari root proyek setelah `npm run build`, dengan preview di port 4173:

```powershell
node scripts/footer-return-response-qa.mjs
```

Pembaruan awan dan angin memakai gerak berbasis drag/inersia serta empat sprite awan WebP yang sudah ditunggu oleh loader. Lihat ../cloud-wind/README.md untuk validasi visual terbaru.
