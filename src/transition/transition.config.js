export const TRANSITION_CONFIG = {
  cover: { duration: .94 },
  label: { start: .96, duration: .24, outAt: 1.48, outDuration: .18 },
  reveal: { start: 1.67, duration: 1.08 },
  dust: {
    desktopCount: 175000, mobileCount: 56000, minCell: 2.65, maxDpr: 1.5,
    color: [37 / 255, 37 / 255, 88 / 255],
  },
  hover: { duration: .4, cssEase: 'cubic-bezier(.16, 1, .3, 1)' },
  sameSection: { duration: .7 },
  completionGuardMs: 6500,
  reducedMotion: { fadeDuration: .24 },
  colors: { surface: '#252558', caption: '#f2f0e8' },
  labels: {
    hero: ['Home', '', 'Home'], about: ['About', '', 'About'],
    projects: ['Work', '', 'Work'],
    contact: ['Talk', '', 'Contact'],
  },
};
