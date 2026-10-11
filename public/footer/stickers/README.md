# Stiker untuk signature 3D

Simpan stiker buatanmu di folder ini:

`D:\portofolio\public\footer\stickers`

- Gunakan PNG atau WebP dengan background transparan.
- Satu gambar untuk satu stiker; jangan digabung menjadi satu lembar.
- Resolusi sekitar 512-1024 px pada sisi terpanjang sudah cukup untuk kebanyakan stiker.
- Potong ruang transparan berlebih di sekitar desain agar penempatannya mudah.
- Gunakan nama yang mudah dikenali, misalnya `bintang.png` atau `karakter.webp`.

Enam stiker pertama sudah terpasang di signature 3D. File asli tetap di folder
ini, sementara versi WebP ringan untuk website ada di subfolder `web`.

Posisi, skala, dan rotasi setiap stiker diatur di
`src/footer-signature-stickers.js`. Bagian utama gambar ditempatkan pada muka
signature; sisanya membungkus bevel dan dinding samping mengikuti panjang
permukaan. Atlas memiliki ruang tambahan di luar batas signature agar bagian
stiker yang terlipat tidak hilang. Sisi hanya menerima stiker yang menyentuh
tepi mukanya sendiri, supaya potongan gambar tidak muncul di goresan tetangga.

Material stiker lebih redup daripada lapisan glossy batu agar gambar tetap
terbaca saat terkena pantulan lampu. Detail kecil tetap mengikuti ukuran logo:
tulisan mikro pada aset tidak akan terbaca penuh pada layar mobile.

File baru belum otomatis tampil: tambahkan penempatannya lalu jalankan
`node scripts/prepare-footer-stickers.mjs` untuk menyiapkan versi web.

Tidak perlu mengganti file signature atau mengedit folder `dist`.
