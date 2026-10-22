# Aset awan untuk transisi Back to Top

Dibuat dengan built-in imagegen pada 22 Oktober 2026. Sumber alpha disimpan sebagai `cumulus-atlas-v1.png`; empat sel atlas dipotong menurut alpha, diperkecil menjadi lebar isi 512 px dengan padding transparan 8 px, dan dikompres WebP quality 82 / alpha quality 90 ke `public/transition/clouds/cumulus-{1..4}.webp`.

Ukuran runtime total: 161,142 byte. Atlas sumber berada di luar public dan tidak ikut build produksi.

Untuk membuat ulang salinan runtime: `node scripts/prepare-cloud-assets.mjs` dari root proyek. Script memakai Sharp lokal atau runtime bundled Codex; build biasa cukup memakai keempat WebP yang sudah tersimpan.

Prompt final:

> Use case: photorealistic-natural. Asset type: a single transparent RGBA sprite atlas for a lightweight website cloud transition. Create one square image divided conceptually into an exact 2 by 2 grid of equal cells. In EACH cell place ONE distinct isolated natural cumulus cloud cluster, fully contained inside its cell with generous transparent padding on all sides so it can be cropped into four separate sprites without clipping. All four clouds have the same sunlight from upper left. Real photographic atmospheric water vapor, dense illuminated white tops, subtle cool blue-gray shadows in the lower folds, translucent wispy edges, intricate billowing irregular structure. Three dimensional volume from light scattering, with subtle small filaments. Each cluster is a different asymmetric wide formation (roughly 2:1 width to height), not a repeated shape. The cloud clusters must be compact enough that no part touches another cell. Actual transparent background everywhere outside each cloud, including between cells. No sky, no ground, no horizon, no text, no borders, no checkerboard baked into pixels, no frame, no diagrams, no dark background, no sun. Avoid cartoon, flat vector blobs, cotton-ball stacks, circular outlines, harsh shadows, artificial glow. This is a reusable realistic cloud sprite sheet, not a scene or a UI mockup.
