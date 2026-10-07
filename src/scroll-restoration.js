/** Only reload/history visits inherit the saved position of this history entry. */
export function initScrollRestoration() {
  const key = 'portfolioScrollY';
  const type = performance.getEntriesByType('navigation')[0]?.type;
  const saved = history.state?.[key];
  const restore = type === 'reload' || type === 'back_forward';
  const top = restore && Number.isFinite(saved) ? Math.max(0, saved) : 0;
  let ready = false, timer;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  // A newly opened URL always starts on Home, including copied section URLs.
  if (!restore && location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  const save = () => {
    clearTimeout(timer);
    if (ready) history.replaceState({ ...history.state, [key]: window.scrollY }, '');
  };
  window.addEventListener('scroll', () => {
    if (!ready) return;
    clearTimeout(timer);
    timer = setTimeout(save, 150);
  }, { passive: true });
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  return {
    top,
    activate() { ready = true; save(); }
  };
}
