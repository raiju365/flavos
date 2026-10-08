import './content-protection.css';

// Discourage ordinary browser copying/saving. Publicly rendered assets remain
// retrievable through browser tools; this is a UI restriction, not DRM.
export function initContentProtection() {
  const abort = new AbortController();
  const options = { capture: true, signal: abort.signal };
  const root = document.documentElement;
  const editable = target => target instanceof Element && (
    target.closest('input, textarea, select') || target.isContentEditable
  );
  const prevent = event => {
    if (event.cancelable) event.preventDefault();
  };
  root.classList.add('content-protected');

  // Capture also covers artwork/slider images inserted after startup, including
  // the native dialog's top layer. Pointer/touch scrolling is left untouched.
  document.addEventListener('contextmenu', prevent, options);
  document.addEventListener('dragstart', prevent, options);
  for (const type of ['selectstart', 'copy', 'cut']) {
    document.addEventListener(type, event => {
      if (!editable(event.target)) prevent(event);
    }, options);
  }
  document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 's' || (!editable(event.target) && ['a', 'c', 'x'].includes(key))) {
      prevent(event);
    }
  }, options);

  return () => {
    abort.abort();
    root.classList.remove('content-protected');
  };
}
