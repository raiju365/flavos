import { initPaperFlip } from './paper-flip';
import { initSignatureAnimation } from './signature-anim';

export function initFooterInteractions() {
  const card = document.querySelector('.footer-contact-card');
  if (card && !card.dataset.initialized) {
    card.dataset.initialized = 'true';
    initSignatureAnimation(card);
    initPaperFlip(card);
  }
  const copy = document.getElementById('footer-copy-btn');
  const label = document.getElementById('footer-copy-text');
  if (!copy || !label) return;
  let reset;
  copy.addEventListener('click', async () => {
    clearTimeout(reset);
    try {
      await navigator.clipboard.writeText(copy.dataset.email);
      label.textContent = 'Email copied';
    } catch {
      label.textContent = 'Use the email link to get in touch';
    }
    reset = setTimeout(() => { label.textContent = 'Copy email'; }, 3000);
  });
}
