// Touch tablets keep the existing rhythm, including landscape iPads.
export const DESKTOP_HANDOFF_QUERY = '(min-width: 1200px) and (hover: hover) and (pointer: fine)';

export function getWorkHandoffDistances() {
  return window.matchMedia(DESKTOP_HANDOFF_QUERY).matches
    ? { descent: 6, orbitHold: 2 }
    : { descent: 4, orbitHold: 0 };
}
