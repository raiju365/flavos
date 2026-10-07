import { TRANSITION_CONFIG as config } from './transition.config';
import { createDustField } from './dustField';
import './transition.css';

export function createOverlay() {
  const overlay = document.createElement('div');
  // Retain the controller lifecycle selector used by navigation consumers.
  overlay.className = 'colonnade-overlay dust-transition';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.setProperty('--dust-color', config.colors.surface);
  overlay.style.setProperty('--dust-caption', config.colors.caption);
  overlay.innerHTML = '<canvas class="dust-transition-canvas"></canvas><div class="dust-transition-caption"><span class="colonnade-label"></span></div>';
  const status = document.createElement('div');
  status.className = 'sr-only';
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  document.body.append(overlay, status);
  const dust = createDustField(overlay.querySelector('canvas'), config.dust);
  return { overlay, status, dust };
}
