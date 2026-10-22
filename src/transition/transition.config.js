import { getBrandBlue, getBrandBlueChannels } from '../brand-color';

export const TRANSITION_CONFIG = {
  cover: { duration: .94 },
  label: { start: .96, duration: .24, outAt: 1.48, outDuration: .18 },
  reveal: { start: 1.67, duration: 1.08 },
  dust: {
    desktopCount: 175000, mobileCount: 56000, minCell: 2.65, maxDpr: 1.5,
    color: getBrandBlueChannels(),
  },
  hover: { duration: .4, cssEase: 'cubic-bezier(.16, 1, .3, 1)' },
  sameSection: { duration: .7 },
  completionGuardMs: 6500,
  cloudReturn: {
    peel: .24,
    anticipation: .24, lift: .56, flight: .8, arrival: .56,
    whiteBreath: .18, growthIn: .48, growthTravel: 1.04, growthSettle: .48, settle: .12,
  },
  reducedMotion: { fadeDuration: .24 },
  colors: { surface: getBrandBlue(), caption: '#f2efe6' },
  labels: {
    hero: ['Home', '', 'Home'], about: ['About', '', 'About'],
    projects: ['Work', '', 'Work'],
    contact: ['Talk', '', 'Contact'],
  },
};
