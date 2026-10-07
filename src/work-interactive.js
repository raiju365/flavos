export function initWorkInteractive() {
  const section = document.getElementById('projects');
  const galleryOpener = document.getElementById('open-projects');
  if (!section || !galleryOpener) return;

  section.querySelectorAll('.work-item').forEach((item) => {
    const openProject = () => {
      const projectIndex = Number(item.dataset.project) || 0;
      galleryOpener.click();
      // The gallery builds its index when it opens.
      requestAnimationFrame(() => {
        document.querySelectorAll('.gallery-index-item')[projectIndex]?.click();
      });
    };

    item.addEventListener('click', openProject);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openProject();
      }
    });
  });
}
