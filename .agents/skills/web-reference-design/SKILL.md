---
name: web-reference-design
description: Pilih dan terapkan referensi Awwwards Nominees, Dribbble, 21st.dev, dan Tympanus (Codrops) untuk layout, tipografi, animasi, transisi, serta interaksi website portfolio Fahmi yang simpel dan editorial. Gunakan saat mencari inspirasi atau mengubah desain dan motion; tidak diperlukan untuk perbaikan nonvisual atau dokumentasi biasa.
---

# Referensi web simpel dengan motion terarah

## Tujuan dan konteks

Buat portfolio yang sederhana, elegan, lapang, dan punya karakter melalui komposisi, tipografi, karya, serta kesinambungan animasi. Kualitas referensi diterjemahkan ke kebutuhan portfolio; banyaknya efek bukan ukuran kualitas.

Skill ini melengkapi `fahmi-portfolio` yang dirujuk di `AGENTS.md`. Ikuti instruksi terbaru pengguna dan source aktif jika berbeda dari catatan lama. Jangan mengganti tema atau seluruh halaman ketika permintaan hanya menyebut satu elemen. Jika skill dasar tidak tersedia, gunakan arahan di sini bersama source aktif dan sampaikan keterbatasannya.

Istilah pengguna “scribble” sementara ditafsirkan sebagai **Dribbble**, dan “21st” sebagai **21st.dev**. Ini asumsi, bukan nama situs yang telah dikonfirmasi. Jika pengguna memberi tautan berbeda, gunakan tautan itu.

## Sumber dan kegunaannya

| Sumber | Pelajari untuk | Batas interpretasi |
| --- | --- | --- |
| [Awwwards Nominees](https://www.awwwards.com/websites/nominees/) | Komposisi website utuh, ritme antarbagian, navigasi, choreography scroll, dan transisi | Nominasi bukan alasan otomatis memilih desain. Buka website asal dan periksa perilakunya sebelum menjadikannya bukti motion. |
| [Dribbble](https://dribbble.com/) | Eksplorasi layout, hierarki judul, whitespace, tipografi, crop gambar, dan detail visual | Shot statis tidak membuktikan responsivitas, aksesibilitas, atau cara interaksi bekerja. |
| [21st.dev](https://21st.dev/) | Ide komponen, menu, tombol, reveal, dan interaksi kecil melalui preview yang relevan | Tinjau kebutuhan dependensi dan lisensi kode sebelum mengambilnya. Adaptasikan prinsip ke stack proyek. |
| [Tympanus (Codrops)](https://tympanus.net/codrops/) | Eksplorasi teknik interaksi kreatif, eksperimen motion/transisi, efek visual, dan demonstrasi interaktif | Sebagian besar demo bersifat eksperimental atau intensif rendering. Ambil ide logika atau tekniknya secara selektif, sederhanakan agar tetap ringan, dan selaraskan dengan gaya editorial portfolio. |

Tautan sumber diperiksa pada 9 Oktober 2026. Daftar nominee dan komponen berubah; periksa kembali saat memilih contoh konkret. Tabel ini adalah panduan penggunaan sumber, bukan klaim bahwa seluruh demo sudah diuji.

## Memilih referensi untuk suatu pekerjaan

1. Identifikasi target yang diminta: layout, animasi, transisi, navigasi, atau komponen tertentu. Periksa tampilan dan implementasi aktif pada target tersebut.
2. Cari contoh relevan dengan kata seperti `minimal portfolio`, `editorial`, `typography`, `art direction`, `clean`, `scrolling`, atau `transitions`. Ambil sedikit referensi yang saling cocok; biasanya satu arah komposisi utama dan satu pendukung motion sudah cukup.
3. Buka halaman contoh yang spesifik, bukan hanya halaman katalog. Untuk motion, amati awal, pertengahan, akhir, reverse, dan respons terhadap input bila dapat diakses. Jika akses hanya berupa screenshot atau teks, nyatakan batas itu dan jangan menebak timing/behavior sebagai fakta.
4. Catat secara ringkas: URL contoh, bagian yang dipelajari, observasi nyata, prinsip yang diambil, dan adaptasi ke target portfolio. Bedakan observasi dari usulan desain.
5. Pilih berdasarkan keterbacaan, kecocokan tema, kejelasan interaksi, mobile, dan biaya rendering. Hindari menggabungkan gaya yang berbeda hanya karena masing-masing menarik.

Format catatan yang dapat disertakan dalam pekerjaan: `Referensi / elemen yang diamati / prinsip yang diadaptasi / batas bukti`. Tidak perlu membuat dokumen tambahan untuk setiap perubahan kecil. Jika pengguna telah memberi contoh yang jelas, gunakan contoh itu tanpa meminta keputusan ulang.

## Menerjemahkan layout dan visual

- Bangun hierarki melalui ukuran judul, skala karya, alignment, panjang baris, gutter, dan jarak antarbagian. Minimalis tetap boleh berani pada proporsi dan asimetri.
- Pertahankan arah editorial klasik proyek: bidang kertas, tinta, serif ekspresif, garis tipis, dan gambar dominan sesuai token aktif. Hindari tambahan neon, glow, panel dekoratif, atau efek sci-fi kecuali diminta.
- Pilih satu ide dominan untuk target perubahan. Detail pendukung menguatkan ide itu dan tidak berebut perhatian dengan karya.
- Pada mobile, susun ulang kolom dan prioritas konten. Pertahankan ukuran baca dan karya yang layak; jangan sekadar mengecilkan seluruh desktop.
- Ambil prinsip desain, bukan identitas, copy, logo, atau aset milik situs referensi. Gunakan karya dan aset lokal yang sesuai.

## Merancang animasi dan transisi

- Nyatakan fungsi gerakan: mengarahkan perhatian, menjelaskan perpindahan ruang, mempertahankan identitas karya, atau memberi umpan balik input.
- Untuk transisi utama, tentukan elemen asal, jalur perpindahan, elemen tujuan, serta bagaimana state kembali. Hindari muncul mendadak, benturan yang tidak disengaja, dan pergantian skala tanpa kesinambungan.
- Selaraskan arah, easing, dan ritme dengan motion yang sudah aktif. Tentukan timing dari jarak, konteks input, dan hasil browser; jangan menyalin angka durasi yang tidak pernah diukur.
- Pada scroll, periksa gerak maju dan balik serta kondisi pengguna berhenti di tengah. Pada klik, periksa input berulang, close/back, fokus, dan pemulihan scroll.
- Hover harus punya padanan focus atau interaksi sentuh bila memuat fungsi. Konten utama harus tetap terbaca ketika `prefers-reduced-motion` aktif.
- Pertahankan batas lokal proyek seperti foto About yang tidak dijadikan zoom transisi. Cocokkan perilaku logo/gallery dengan source terbaru, bukan snapshot historis.
- Pilih properti animasi dan jumlah elemen bergerak dengan mempertimbangkan rendering. Tambahan blur, filter, canvas, atau WebGL perlu alasan visual yang jelas dan pengukuran yang sesuai bila mengklaim peningkatan performa.

## Implementasi pada proyek

Proyek memakai Vite dan vanilla HTML/CSS/JS. Edit `index.html` dan `src/`; karya berada di `public/karya/`. Periksa import, token, controller motion, dan aset aktif sebelum memilih file perubahan.

Gunakan CSS dan library yang sudah dipakai proyek bila cocok. Komponen dari 21st.dev perlu diterjemahkan ke struktur yang ada; mengambil inspirasi komponen tidak dengan sendirinya membutuhkan migrasi ke React atau penambahan framework. Periksa lisensi jika menyalin kode.

Jaga lifecycle animasi: listener, timeline, requestAnimationFrame, proxy, focus, dan penguncian scroll harus dibersihkan saat mode ditutup atau controller dibongkar. Jangan menambah controller kedua untuk transform/state yang sudah dikelola modul lain.

## Validasi dan pelaporan

Untuk perubahan implementasi, jalankan pemeriksaan sintaks yang relevan dan build. Validasi visual melalui browser pada desktop, tablet, dan beberapa ukuran mobile sesuai target. Periksa overflow, keterbacaan, overlap, console, dan interaksi yang berubah. Untuk motion, sampel state perantara, reverse, input berulang, dan reduced motion; screenshot akhir saja tidak membuktikan kualitas transisi.

Laporkan perubahan konkret, tautan contoh yang benar-benar dipakai, prinsip adaptasinya, hasil pengujian, dan batas yang belum diperiksa. Klaim performa memerlukan pengukuran, bukan dugaan dari source. Untuk pekerjaan dokumentasi skill saja, periksa struktur dan tautannya; build serta pengujian website tidak diperlukan.
