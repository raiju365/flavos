// Available artworks share one slot per project, including detail variants.
// Detail images retain their natural proportions; rotating thumbnails stay square.
const trialWorks = [
  {
    src: '/karya/efefesfeaf.png',
    title: 'DEAF',
    summary: 'Poster tipografi',
    description: 'Eksplorasi desain poster dengan tipografi DEAF.',
  },
  {
    src: '/karya/POSTER_KEGIATAN_FAHMI_XIIG.png',
    title: 'Poster kegiatan 01',
    summary: 'Desain poster kegiatan',
    description: 'Karya desain poster kegiatan.',
  },
  {
    src: '/karya/POSTER_KEGIATAN2_FAHMI_XIIG.jpg',
    title: 'Poster kegiatan 02',
    summary: 'Desain poster kegiatan',
    description: 'Karya desain poster kegiatan dengan komposisi berbeda.',
  },
  {
    src: '/karya/X4C5CTVY6U7.jpg',
    title: 'PANAM',
    summary: 'Desain grafis',
    description: 'Karya desain grafis PANAM.',
  },
  {
    src: '/karya/COVERalbum.png',
    title: 'Cover album',
    summary: 'Desain sampul album',
    description: 'Karya desain sampul album.',
  },
  {
    src: '/karya/posterhc.png',
    title: 'Poster HC',
    summary: 'Desain poster · Mockup',
    description: 'Desain Poster HC dan penerapannya dalam mockup.',
    images: [
      { src: '/karya/posterhc.png', alt: 'Poster HC', label: 'Poster' },
      { src: '/karya/posterhcmockup.png', alt: 'Mockup Poster HC', label: 'Mockup' },
    ],
  },
  {
    src: '/karya/557810714_17984620985893456_636461652688020480_n.jpg',
    title: 'Student DACO — 2nd Anniversary',
    summary: 'Desain poster anniversary',
    description: 'Poster perayaan anniversary ke-2 Student DACO dengan komposisi kolase dan tipografi emas.',
  },
  {
    src: '/karya/aubauob.png',
    title: 'Beware The Deep',
    summary: 'Desain poster',
    description: 'Desain poster Beware The Deep dengan visual laut dalam, komposisi kolase, dan tipografi ekspresif.',
  },
];

export const galleryWorks = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  src: null,
  title: null,
  summary: null,
  description: null,
  ...trialWorks[index],
}));
