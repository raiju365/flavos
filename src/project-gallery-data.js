// Available artworks share one slot per project, including detail variants.
// Detail images retain their natural proportions; rotating thumbnails stay square.
const trialWorks = [
  {
    src: '/karya/efefesfeaf.png',
    title: 'Album Cover',
    summary: 'Poster tipografi',
    detail: {
      purpose: 'Membuat cover album musik hardcore yang menampilkan kesan keras, tegas, dan penuh karakter namun tetap minimalis. Bertujuan menggambarkan identitas musik yang kuat.',
      concept: 'Konsep minimalis, raw, dan edgy dengan memadukan teks besar, tekstur kasar, serta warna yang dibuat pudar agar terasa lebih gelap dan emosional. Agar cover terlihat sederhana, tetapi tetap punya kesan kuat seperti genre musik tersebut.',
      visualReason: 'Warna merah pudar, hijau kusam, dan putih dipilih untuk menciptakan suasana yang suram, keras, dan sedikit vintage. Teks besar pada kata “DEAF” dijadikan fokus utama agar identitas album langsung menonjol. Tekstur goresan dan efek noise digunakan untuk memberi kesan kasar, mentah, dan tidak rapi, sehingga cocok dengan karakter musik. Tata letaknya dibuat minimalis agar pesan visual terasa lebih tegas dan simpel.',
      tools: 'Adobe Photoshop',
    },
  },
  {
    src: '/karya/POSTER_KEGIATAN_FAHMI_XIIG.png',
    title: 'Poster Festival (Personal Project)',
    summary: 'Desain poster kegiatan',
    detail: {
      purpose: 'Membuat poster promosi Winter Fest 2025 untuk menampilkan bintang tamu, lokasi, jadwal, dan berbagai kegiatan dengan tema musim dingin.',
      concept: 'Konsep winter festival poster dengan menggabungkan suasana musim dingin, elemen es, salju, dan efek cahaya untuk menciptakan tampilan yang meriah dan penuh energi.',
      visualReason: 'Warna biru, cyan, dan putih dipilih untuk menggambarkan suasana dingin dan bersalju. Teks dengan efek es digunakan untuk memperkuat tema winter, sementara foto para pengisi acara ditempatkan di bagian tengah agar menjadi pusat perhatian. Elemen salju, tekstur es, dan efek cahaya ditambahkan untuk membuat poster lebih hidup, dengan informasi acara disusun di bagian bawah agar mudah ditemukan.',
      tools: 'Adobe Photoshop, Adobe Illustrator, Canva',
    },
  },
  {
    src: '/karya/POSTER_KEGIATAN2_FAHMI_XIIG.jpg',
    title: 'Poster Tournament (Personal Project)',
    summary: 'Desain poster kegiatan',
    detail: {
      purpose: 'Membuat poster bertema esports untuk menampilkan para pemain, informasi turnamen PEL Spring 2025, dan total hadiah dengan desain yang menarik, penuh energi, dan kompetitif.',
      concept: 'Konsep esports gaming poster dengan menggabungkan foto pemain, elemen grafis, dan efek visual yang terinspirasi dari suasana kompetisi esports profesional.',
      visualReason: 'Warna oranye, merah dipilih untuk memberikan kesan semangat dan persaingan, dan hitam memberikan kesan simpel. Foto para pemain ditempatkan di tengah sebagai fokus utama, sementara efek cahaya, percikan api, dan tekstur grunge digunakan untuk membuat desain lebih hidup. Teks tebal dipilih agar informasi turnamen dan total hadiah terlihat jelas serta mudah dibaca.',
      tools: 'Adobe Photoshop, Canva',
    },
  },
  {
    src: '/karya/X4C5CTVY6U7.jpg',
    title: 'PANAMA',
    summary: 'Desain grafis',
    detail: {
      purpose: 'Membuat desain banner dekoratif dengan visual bertema vintage. Bertujuan menghadirkan nuansa klasik dan memiliki karakter sejarah yang kuat sebagai dekorasi ruangan.',
      concept: 'Mengusung konsep vintage poster dengan ilustrasi ukiran. Memadukan tipografi dekoratif dan ornamen klasik untuk menciptakan tampilan yang historis.',
      visualReason: 'Warna hijau dan krem untuk menciptakan kesan retro. Teks "PANAMA" berukuran besar digunakan sebagai fokus utama. Ornamen pada sudut dan ilustrasi angel ditambahkan untuk menambahkan nuansa yang ada.',
      tools: 'Adobe Illustrator, Adobe Photoshop',
    },
  },
  {
    src: '/karya/COVERalbum.png',
    title: 'Album Cover',
    summary: 'Desain sampul album',
    detail: {
      purpose: 'Membuat poster bergaya Y2K dengan perpaduan warna, karakter, dan efek visual untuk menghasilkan nuansa yang modern.',
      concept: 'Konsep Y2K poster dengan mixed media collage. Memadukan efek motion blur, efek glitch, tekstur grunge untuk menciptakan visual yang menggambarkan perpindahan masa.',
      visualReason: 'Warna pink dan hitam untuk menciptakan kontras antara kesan playful Y2K dan gelap misteri. Elemen hati berpiksel memperkuat estetika Y2K, sementara efek blur dan tekstur kasar memberikan kesan memasuki portal Y2K. Tipografi serif berwarna putih dipilih sebagai judul dengan style yang simpel.',
      tools: 'Adobe Photoshop',
    },
  },
  {
    src: '/karya/posterhc.png',
    title: 'Poster Music Tour (Personal Project)',
    summary: 'Desain poster · Mockup',
    detail: {
      purpose: 'Membuat poster music tour bergaya gothic yang menampilkan identitas band serta informasi jadwal konser dengan tampilan yang klasik, gelap.',
      concept: 'Konsep gothic dan vintage metal poster dengan menggabungkan foto band, tipografi gothic, serta ornamen klasik untuk menciptakan kesan dan khas poster musik hardcore.',
      visualReason: 'Warna hitam, krem, dan abu-abu dipilih untuk memberikan kesan klasik dan gelap. Ornamen pada bingkai memberikan nuansa vintage. Foto band ditempatkan di tengah sebagai fokus utama, dengan informasi jadwal konser disusun di bagian bawah agar mudah ditemukan.',
      tools: 'Adobe Illustrator, Adobe Photoshop',
    },
    images: [
      { src: '/karya/posterhc.png', alt: 'Poster HC', label: 'Poster' },
      { src: '/karya/posterhcmockup.png', alt: 'Mockup Poster HC', label: 'Mockup' },
    ],
  },
  {
    src: '/karya/557810714_17984620985893456_636461652688020480_n.jpg',
    title: 'Poster Anniversary',
    summary: 'Desain poster anniversary',
    detail: {
      purpose: 'Membuat poster untuk merayakan ulang tahun kedua Student Dago Speed Maniac dengan menampilkan kebersamaan, perjalanan, dan berbagai momen komunitas dalam satu poster.',
      concept: 'Mengusung konsep menggabungkan berbagai foto kegiatan komunitas, tekstur kasar, serta efek visual yang memberikan kesan ramai, berani, dan penuh energi yang menggambarkan identitas komunitas tersebut.',
      visualReason: 'Warna emas, hitam dipilih untuk memberikan kesan elegan, mahal dan tetap memberikan misteri. Angka 2 berukuran besar dijadikan fokus utama sebagai simbol ulang tahun kedua. Kumpulan foto digunakan untuk menunjukkan kebersamaan komunitas, sementara elemen sayap untuk menggambarkan dengan anniv ini komunitas semakin tinggi terbang, efek cahaya ditambahkan untuk memperkuat kesan.',
      tools: 'Adobe Photoshop',
    },
  },
  {
    src: '/karya/aubauob.png',
    title: 'Beware The Deep (Personal Project)',
    summary: 'Desain poster',
    detail: {
      purpose: 'Membuat poster bertema pelatihan keselamatan di laut dalam dengan tampilan yang menegangkan dan misterius. Desain ini dibuat untuk mengeksplorasi suasana bawah laut yang gelap dan penuh bahaya.',
      concept: 'Konsep underwater horror dan cinematic poster dengan menggabungkan suasana laut dalam, penyelam, serta efek visual yang terinspirasi dari poster film thriller. Dibuat agar terlihat seperti kegiatan nyata dengan sentuhan horor.',
      visualReason: 'Warna biru gelap, hitam, dan merah dipilih untuk menggambarkan bahaya ikan hiu besar dan agresif, ikan hiu memiliki warna biru serta menyukai darah yang berwarna merah, bertujuan membangun suasana misterius dan menegangkan. Teks dengan style bertekstur digunakan untuk memberikan kesan kasar dan menyeramkan, sementara ilustrasi penyelam dan makhluk laut menjadi fokus utama. Efek cahaya, noise, dan tekstur digital ditambahkan untuk memperkuat suasana bawah laut yang gelap.',
      tools: 'Adobe Illustrator, Canva',
    },
  },
];

export const galleryWorks = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  src: null,
  title: null,
  summary: null,
  // Isi masing-masing bagian ini untuk slot karya baru.
  detail: {
    purpose: '[Isi tujuan karya dan pesan yang ingin disampaikan.]',
    concept: '[Isi ide utama dan pendekatan desain.]',
    visualReason: '[Isi alasan memilih warna, tipografi, gambar, dan komposisi.]',
    tools: '[Isi nama tools yang digunakan.]',
  },
  ...trialWorks[index],
}));

