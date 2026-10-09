---
name: minimalist-layout
description: Panduan memilih dan merancang tata letak (layout) minimalis editorial untuk portfolio Fahmi, mengadopsi prinsip komposisi Awwwards Nominees, Dribbble, 21st.dev, dan Tympanus (Codrops). Digunakan saat menentukan grid, hierarki ruang, whitespace, dan penempatan elemen agar tampilan tetap simpel, elegan, dan fungsional.
---

# Panduan Pemilihan Tata Letak Minimalis Editorial

Panduan ini mengatur cara memilih dan menyusun tata letak (layout) website portfolio agar memiliki estetika minimalis modern, berbobot editorial, dan lapang, dengan menyerap esensi dari empat sumber referensi utama.

---

## 1. Karakteristik Tata Letak per Sumber Referensi

| Sumber | Karakteristik Tata Letak yang Diadopsi | Cara Penerapan di Portfolio |
| --- | --- | --- |
| **Awwwards Nominees** | • Komposisi satu layar penuh (full viewport staging)<br>• Ruang kosong (negative space) dominan dan berani<br>• Asimetri terkontrol yang memandu mata pembaca<br>• Ritme vertikal yang bervariasi antar-bagian | Jadikan setiap section terasa seperti halaman majalah seni atau monograf. Jangan padatkan informasi; berikan margin luar yang longgar (4vw–8vw). |
| **Dribbble** | • Hierarki visual kontras tinggi (judul besar vs metadata mikro)<br>• Proporsi rasio aspek karya yang presisi<br>• Hairline separator tipis (1px semi-transparan) untuk membagi ruang tanpa beban visual<br>• Framing karya yang bersih | Gunakan proporsi frame yang tegas untuk karya/gambar. Pisahkan blok informasi dengan whitespace alami alih-alih menggunakan kotak atau kartu berlebihan. |
| **21st.dev** | • Struktur modular / bento minimalis<br>• Elemen interaktif floating yang rapi (floating badge, pill nav)<br>• Pembagian kolom fleksibel berbasis kegunaan | Terapkan untuk blok informasi sekunder, metadata proyek, atau daftar kontak agar terorganisir ringkas tanpa mengganggu aliran editorial. |
| **Tympanus (Codrops)** | • Tata letak berlapis (layered depth & aperture framing)<br>• Pinned layout dengan transisi posisi internal saat scroll<br>• Transformasi geometri yang halus (clip-path reveal, fluid grid shift) | Gunakan untuk transisi antar-fase atau hero section, di mana tata letak bertransformasi secara organik tanpa memindahkan pengguna ke layout yang membingungkan. |

---

## 2. Pola Arsitektur Tata Letak (Layout Archetypes)

Pilih salah satu dari empat pola dasar berikut sesuai dengan kebutuhan halaman atau section:

### Pola A: Asymmetric Editorial Canvas (Koleksi Karya / Galeri)
- **Struktur**: Grid 12-kolom tidak seragam. Item karya ditempatkan selang-seling dengan variasi posisi kolom (misal: item 1 di kolom 2–7, item 2 di kolom 8–12 dengan offset vertikal).
- **Karakter**: Santai, artistik, memberi jeda pada mata, tidak kaku seperti galeri e-commerce.
- **Kapan Digunakan**: Daftar proyek, galeri visual, atau sorotan portfolio.

### Pola B: Split Focus / Dual Axis (About & Narasi)
- **Struktur**: Pembagian dua zona (misal 40% teks narasi / 60% panggung visual atau sebaliknya). Salah satu sisi bisa sticky saat sisi lain bergulir.
- **Karakter**: Fokus tinggi, kejelasan membaca optimal, memadukan teks panjang dengan visual pendukung secara harmonis.
- **Kapan Digunakan**: Bagian bio/About, studi kasus mendalam, atau pengantar bab.

### Pola C: Monolithic Stage (Hero & Pause)
- **Struktur**: Satu titik vokal tunggal di tengah atau asimetris dengan margin ekstrem di semua sisi.
- **Karakter**: Kuat, tenang, menciptakan antisipasi sebelum konten berikutnya terbuka.
- **Kapan Digunakan**: Hero opening, logo transition stage, atau penutup/footer call-to-action.

### Pola D: Clean Modular Bento (Metadata & Detail Teknis)
- **Struktur**: Grid modular dengan padding konsisten, sudut halus, dan pemisahan berbasis whitespace atau border 1px halus.
- **Karakter**: Efisien, informatif, rapi, dan mudah dipindai (scannable).
- **Kapan Digunakan**: Detail spesifikasi proyek, link sosial, daftar skill/alat, atau footer info.

---

## 3. Aturan Emas Minimalis Editorial

1. **Prioritas Karya dan Teks di Atas Dekorasi**:
   - Jika sebuah border, background box, atau shadow tidak menambah kejelasan struktur, hilangkan.
   - Biarkan gambar karya dan tipografi yang menjadi pembentuk komposisi utama.
2. **Whitespace Aktif (Active Negative Space)**:
   - Ruang kosong bukan ruang kosong yang tidak terpakai, melainkan jeda bernapas yang menuntun hierarki mata.
   - Jarak antar-section minimal `12vh`–`20vh` pada desktop agar setiap bagian berdiri sebagai panggung utuh.
3. **Kontras Skala Tipografi**:
   - Pasangkan teks berukuran besar (display/headline) langsung dengan teks penjelas berukuran kecil/medium (caption/body). Hindari terlalu banyak ukuran font menengah yang membuat hierarki kabur.
4. **Disiplin Grid**:
   - Elemen boleh asimetris, tetapi baseline horizontal dan alignment vertikal harus selalu berpijak pada grid induk yang konsisten.

---

## 4. Adaptasi Responsif (Mobile & Tablet)

- **Dekonstruksi Asimetri ke Vertikal Terarah**: Pada layar `< 768px`, asimetri horizontal diubah menjadi aliran vertikal linier yang tetap mempertahankan margin longgar.
- **Ukuran Karya Proporsional**: Jangan mengecilkan gambar hingga detail hilang; biarkan karya memenuhi 85%–100% lebar viewport dengan margin samping yang rapi.
- **Penyederhanaan Modul**: Gabungkan elemen bento/split ke satu kolom bertingkat dengan hierarki visual yang jelas dari atas ke bawah.

---

## 5. Checklist Keputusan Layout

Sebelum menerapkan perubahan tata letak, uji dengan pertanyaan berikut:
- [ ] Apakah layout ini membuat karya terasa lebih bernilai dan fokus?
- [ ] Apakah ada elemen dekoratif (kartu, bayangan, aksen warna) yang bisa dibuang tanpa mengurangi fungsi?
- [ ] Apakah ritme scroll mengalir dengan tenang tanpa terasa sesak atau terputus-putus?
- [ ] Apakah tata letak tetap bekerja dengan baik pada layar ponsel sempit (360px–390px)?
