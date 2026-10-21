export const nextPaint = () => new Promise(resolve => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
});

async function prepareImage(image) {
  // Images inside display:none/lazy sections must start before the user scrolls.
  image.loading = 'eager';
  let failure;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await image.decode();
      if (!image.naturalWidth) throw new Error(`Empty image: ${image.currentSrc || image.src}`);
      return;
    } catch (error) {
      failure = error;
      if (attempt < 2) image.src = image.currentSrc || image.src;
    }
  }
  throw failure;
}

export async function preparePageAssets(onProgress = () => {}, { destination = 'hero' } = {}) {
  const section = ['hero','about','projects','contact'].includes(destination) ? destination : 'hero';
  const images = [...new Set(document.querySelectorAll(`#hero img, .folio-nav img, #${section} img`))];
  // Only the opening/destination is a loading gate. Other sections retain
  // native lazy loading, their reserved dimensions and async decoding.
  const fonts = new Set();
  document.querySelectorAll('.loader-percent, .studio-link, #hero h1, #about .about-reading-copy, .orbit-caption-title').forEach(element => {
    const style = getComputedStyle(element);
    fonts.add(`${style.fontStyle} ${style.fontWeight} 16px ${style.fontFamily}`);
  });
  const tasks = [
    ...images.map(image => () => prepareImage(image)),
    ...[...fonts].map(font => () => document.fonts.load(font))
  ];
  let completed = 0;
  const results = await Promise.allSettled(tasks.map(async task => {
    await task();
    onProgress(++completed / tasks.length);
  }));
  const failures = results.filter(result => result.status === 'rejected');
  if (failures.length) throw new AggregateError(failures.map(result => result.reason), 'Page assets are not ready');
  await document.fonts.ready;
}
