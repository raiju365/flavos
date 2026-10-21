/** Only reload/history visits inherit the saved position of this history entry. */
export function initScrollRestoration() {
  const key = 'portfolioScrollY';
  const type = performance.getEntriesByType('navigation')[0]?.type;
  const saved = history.state?.[key];
  const snapshot = history.state?.portfolioScrollAnchor;
  const restore = document.wasDiscarded || type === 'reload' || type === 'back_forward';
  const savedTop = restore && Number.isFinite(saved) ? Math.max(0, saved) : 0;
  let ready = false, timer;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  // A newly opened URL always starts on Home, including copied section URLs.
  if (!restore && location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  const save = () => {
    clearTimeout(timer);
    if (ready) {
      const maximum=Math.max(0,document.documentElement.scrollHeight-innerHeight);
      const target=[...document.querySelectorAll('#hero, #about, #projects, #contact')]
        .reverse().find(section=>section.getBoundingClientRect().top<innerHeight*.5)?.id||'hero';
      history.replaceState({ ...history.state, [key]: window.scrollY,
        portfolioScrollAnchor:{target,bottom:Math.max(0,maximum-window.scrollY)} }, '');
    }
  };
  window.addEventListener('scroll', () => {
    if (!ready) return;
    clearTimeout(timer);
    timer = setTimeout(save, 150);
  }, { passive: true });
  window.addEventListener('pagehide', save);
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  return {
    get top() {
      const maximum=Math.max(0,document.documentElement.scrollHeight-innerHeight);
      return restore&&savedTop>0&&snapshot?.bottom<=3 ? maximum : Math.min(savedTop,maximum);
    },
    targetId:restore?snapshot?.target||'hero':'hero',
    restoring: restore,
    activate() { ready = true; save(); }
  };
}
