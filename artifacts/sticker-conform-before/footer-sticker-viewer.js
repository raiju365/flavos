import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { createStickerGeometry } from './footer-sticker-geometry';
import { signatureStickers } from './footer-signature-stickers';
import './footer-sticker-viewer.css';

export function createSignatureStickerViewer({ host, renderer: sourceRenderer, camera: sourceCamera, model, stickers, aspect, front, getLenis, renderSource, onActiveChange }) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController(), options = { signal: events.signal };
  let hovered = null;
  const hotspots = document.createElement('div'); hotspots.className = 'footer-sticker-hotspots';
  const buttons = signatureStickers.map((sticker, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'footer-sticker-trigger';
    button.setAttribute('aria-label', `View ${sticker.name} sticker in 3D`);
    button.setAttribute('aria-haspopup', 'dialog'); button.dataset.sticker = String(index);
    button.addEventListener('click', () => open(index, button), options);
    button.addEventListener('pointerenter', () => { hovered = index; }, options);
    button.addEventListener('pointerleave', () => { if (hovered === index) hovered = null; }, options);
    hotspots.append(button); return button;
  });
  host.append(hotspots);
  const dialog = document.createElement('dialog'); dialog.className = 'sticker-viewer';
  dialog.setAttribute('aria-labelledby', 'sticker-viewer-name'); dialog.setAttribute('data-lenis-prevent', '');
  dialog.innerHTML = `<div class="sticker-viewer-blur"></div>
    <div class="sticker-viewer-top"><p class="sticker-viewer-index"></p><button class="sticker-viewer-close" type="button" autofocus>Close <span aria-hidden="true">×</span></button></div>
    <div class="sticker-viewer-bottom"><div><h2 class="sticker-viewer-name" id="sticker-viewer-name"></h2><p class="sticker-viewer-hint" id="sticker-viewer-hint">Drag to rotate · 360°</p></div><button class="sticker-viewer-reset" type="button">Reset view</button></div>`;
  document.body.append(dialog);
  const closeButton = dialog.querySelector('.sticker-viewer-close');
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, .1, 60);
  camera.position.z = 8;
  scene.add(new THREE.HemisphereLight('#ffffff', '#68728c', .4));
  const keyLight = new THREE.DirectionalLight('#ffffff', 1); keyLight.position.set(-3, 4, 6); scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight('#e8efff', .4); fillLight.position.set(3, -1, 4); scene.add(fillLight);
  const group = new THREE.Group(); scene.add(group);
  const restQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(-.07, -.15, -.025));
  const targetQuaternion = restQuaternion.clone(), turn = new THREE.Quaternion(), euler = new THREE.Euler();
  const angularVelocity = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const meshes = [], textures = [], materials = [];
  let renderer, environment, prepared = false, disposed = false, selected = null, returnFocus;
  let animation, frame = 0, last = 0, phase = 'closed', drag = null;
  let previousOverflow = '', resumeScroll = false, origin, fit = 1;
  let closingAt = 1, closingQuaternion = restQuaternion.clone();
  const transition = { progress: 0, labels: 0 };

  const sourcePose = index => {
    const sticker = signatureStickers[index];
    const canvas = sourceRenderer.domElement.getBoundingClientRect();
    const center = new THREE.Vector3((sticker.x - .5) * 10, (.5 - sticker.y) * 10 / aspect, front);
    model.updateWorldMatrix(true, false); model.localToWorld(center);
    const distance = sourceCamera.position.z - center.z;
    const pixelScale = canvas.height / (2 * distance * Math.tan(THREE.MathUtils.degToRad(sourceCamera.fov / 2)));
    center.project(sourceCamera);
    const x = canvas.left + (center.x + 1) * canvas.width / 2;
    const y = canvas.top + (1 - center.y) * canvas.height / 2;
    const stagePixels = innerHeight / (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    return {
      x, y, pixelWidth: sticker.width * 10 * pixelScale,
      position: new THREE.Vector3((x - innerWidth / 2) / stagePixels, (innerHeight / 2 - y) / stagePixels, 0),
      scale: sticker.width * 10 * pixelScale / stagePixels,
      quaternion: model.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -sticker.angle * Math.PI / 180)),
    };
  };
  function update() {
    if (disposed) return;
    const hostRect = host.getBoundingClientRect();
    buttons.forEach((button, index) => {
      const pose = sourcePose(index);
      const image = stickers.items[index]?.image;
      const ratio = image ? image.naturalHeight / image.naturalWidth : 1;
      const width = Math.max(44, Math.min(100, pose.pixelWidth));
      const height = Math.max(44, Math.min(120, pose.pixelWidth * ratio));
      button.style.width = `${width}px`; button.style.height = `${height}px`;
      button.style.transform = `translate(${pose.x - hostRect.left - width / 2}px,${pose.y - hostRect.top - height / 2}px)`;
    });
    if (selected !== null) origin = sourcePose(selected);
  }
  function measure() {
    if (!renderer) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    if (selected !== null) {
      origin = sourcePose(selected);
      const image = stickers.items[selected].image;
      const pixels = innerHeight / (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      fit = Math.min(innerWidth * (innerWidth < 600 ? .78 : .52), 620, innerHeight * .59 / (image.naturalHeight / image.naturalWidth)) / pixels;
    }
    update();
  }
  function paint(delta = 0) {
    if (!renderer || selected === null) return;
    const progress = transition.progress;
    if (phase === 'opening' || phase === 'closing') {
      group.position.copy(origin.position).multiplyScalar(1 - progress);
      // A small depth arc makes the lift read in space before it settles.
      group.position.z = Math.sin(progress * Math.PI) * .48;
      group.scale.setScalar(THREE.MathUtils.lerp(origin.scale, fit, progress));
      group.quaternion.slerpQuaternions(origin.quaternion, phase === 'closing' ? closingQuaternion : targetQuaternion, phase === 'closing' ? progress / closingAt : progress);
    } else {
      group.position.set(0, 0, 0);
      group.scale.setScalar(THREE.MathUtils.damp(group.scale.x, fit, 14, delta));
      if (!drag && !motion.matches && angularVelocity.lengthSq() > .000001) {
        euler.set(angularVelocity.y * delta, angularVelocity.x * delta, 0);
        targetQuaternion.premultiply(turn.setFromEuler(euler));
        angularVelocity.multiplyScalar(Math.exp(-delta * 5.5));
      }
      group.quaternion.slerp(targetQuaternion, motion.matches ? 1 : 1 - Math.exp(-delta * 18));
    }
    dialog.style.setProperty('--sticker-focus', String(progress));
    dialog.style.setProperty('--sticker-labels', String(transition.labels));
    renderer.render(scene, camera);
    dialog.dataset.progress = progress.toFixed(4);
    dialog.dataset.rotation = group.quaternion.toArray().map(value => value.toFixed(4)).join(',');
    dialog.dataset.scale = group.scale.x.toFixed(4);
  }
  function tick(now) {
    frame = 0;
    if (disposed || !dialog.open || document.hidden) { last = 0; return; }
    const delta = last ? Math.min((now - last) / 1000, .05) : 1 / 60;
    last = now; paint(delta); frame = requestAnimationFrame(tick);
  }
  function start() { if (!frame && dialog.open && !document.hidden) { last = 0; frame = requestAnimationFrame(tick); } }
  function setPhase(value) { phase = value; dialog.dataset.phase = value; }
  async function prepare() {
    if (prepared || disposed) return;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setClearColor(0, 0); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .8;
    renderer.domElement.className = 'sticker-viewer-canvas'; renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D sticker. Drag or use arrow keys to rotate. Press Home to reset.');
    renderer.domElement.setAttribute('aria-describedby', 'sticker-viewer-hint');
    dialog.insertBefore(renderer.domElement, dialog.querySelector('.sticker-viewer-top'));
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    environment = pmrem.fromScene(room, .025); scene.environment = environment.texture;
    room.dispose(); pmrem.dispose();
    for (const { image, index } of stickers.items.filter(Boolean)) {
      const texture = new THREE.Texture(image); texture.needsUpdate = true; texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); textures.push(texture);
      const print = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: texture, metalness: 0, roughness: .17, clearcoat: 1, clearcoatRoughness: .07, envMapIntensity: .65, alphaTest: .12 });
      print.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float stickerFront;').replace('#include <begin_vertex>', '#include <begin_vertex>\nstickerFront=step(.5,normal.z);');
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float stickerFront;').replace('#include <map_fragment>', `
          vec4 ink=texture2D(map,vMapUv);
          diffuseColor.rgb*=mix(vec3(.96,.955,.92),ink.rgb,stickerFront);
          diffuseColor.a*=mix(1.0,ink.a,stickerFront);
        `);
      };
      print.customProgramCacheKey = () => 'glossy-sticker-front-and-paper-back-v1';
      const edge = new THREE.MeshPhysicalMaterial({ color: '#e8e6dc', roughness: .23, clearcoat: .85, clearcoatRoughness: .09, envMapIntensity: .6 });
      materials.push(print, edge);
      const mesh = new THREE.Mesh(createStickerGeometry(image), [print, edge]);
      mesh.userData.stickerIndex = index; meshes[index] = mesh;
      group.add(mesh); renderer.initTexture(texture);
    }
    measure(); await renderer.compileAsync(scene, camera);
    meshes.forEach(mesh => group.remove(mesh));
    if (disposed) return;
    prepared = true;
    bindPointer();
  }
  function open(index, trigger) {
    if (!prepared || disposed || phase !== 'closed' || !meshes[index]) return;
    selected = index; returnFocus = trigger;
    setPhase('opening'); transition.progress = 0; transition.labels = 0;
    angularVelocity.set(0, 0); targetQuaternion.copy(restQuaternion);
    onActiveChange(true);
    origin = sourcePose(index);
    stickers.select(index); renderSource();
    group.add(meshes[index]);
    dialog.querySelector('.sticker-viewer-index').textContent = `Sticker / ${String(index + 1).padStart(2, '0')}`;
    dialog.querySelector('.sticker-viewer-name').textContent = signatureStickers[index].name;
    dialog.dataset.sticker = String(index);
    previousOverflow = document.body.style.overflow;
    resumeScroll = Boolean(getLenis?.() && !getLenis().isStopped);
    getLenis?.()?.stop(); document.body.style.overflow = 'hidden';
    dialog.showModal(); measure(); paint(); start();
    animation = gsap.timeline({ onComplete() { paint(); setPhase('open'); closeButton.focus({ preventScroll: true }); } });
    animation.to(transition, { progress: 1, duration: motion.matches ? 0 : .88, ease: 'power3.inOut' }, 0)
      .to(transition, { labels: 1, duration: motion.matches ? 0 : .32 }, motion.matches ? 0 : .4);
  }
  function finishClose(restoreFocus = true) {
    animation?.kill(); animation = null; cancelAnimationFrame(frame); frame = 0; last = 0;
    if (selected !== null) group.remove(meshes[selected]);
    stickers.select(null); renderSource();
    selected = null; drag = null; hovered = null; angularVelocity.set(0, 0);
    dialog.close(); delete dialog.dataset.dragging; setPhase('closed');
    document.body.style.overflow = previousOverflow;
    if (resumeScroll) getLenis?.()?.start();
    onActiveChange(false);
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }
  function close() {
    if (phase === 'closed' || phase === 'closing') return;
    animation?.kill();
    drag = null; angularVelocity.set(0, 0); delete dialog.dataset.dragging;
    // At rest, progress is one: retaining the current quaternion preserves the
    // exact front/back orientation before it folds back onto the logo.
    closingAt = Math.max(.0001, transition.progress); closingQuaternion.copy(group.quaternion);
    origin = sourcePose(selected);
    setPhase('closing');
    animation = gsap.timeline({ onComplete: () => finishClose() });
    animation.to(transition, { progress: 0, duration: motion.matches ? 0 : .72 * Math.max(.22, transition.progress), ease: 'power3.inOut' }, 0)
      .to(transition, { labels: 0, duration: motion.matches ? 0 : .18 }, 0);
  }
  function reset() { angularVelocity.set(0, 0); targetQuaternion.copy(restQuaternion); if (motion.matches) paint(); }
  function bindPointer() {
    const canvas = renderer.domElement;
    const intersects = event => {
      raycaster.setFromCamera(new THREE.Vector2(event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2), camera);
      return raycaster.intersectObject(group, true).length > 0;
    };
    canvas.addEventListener('pointerdown', event => {
      if (phase !== 'open' || !event.isPrimary || event.button > 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, time: event.timeStamp, object: intersects(event) };
      angularVelocity.set(0, 0); canvas.setPointerCapture(event.pointerId);
      if (drag.object) dialog.dataset.dragging = 'true';
    }, options);
    canvas.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId || !drag.object) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      const rate = Math.PI * 2 / Math.min(innerWidth, innerHeight);
      const dt = Math.max(.008, (event.timeStamp - drag.time) / 1000);
      euler.set(dy * rate, dx * rate, 0); targetQuaternion.premultiply(turn.setFromEuler(euler));
      angularVelocity.set(THREE.MathUtils.clamp(dx * rate / dt, -5, 5), THREE.MathUtils.clamp(dy * rate / dt, -5, 5));
      drag.x = event.clientX; drag.y = event.clientY; drag.time = event.timeStamp;
      if (motion.matches) paint();
    }, options);
    const release = event => {
      if (!drag || drag.id !== event.pointerId) return;
      const clickOutside = !drag.object && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 8;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      drag = null; delete dialog.dataset.dragging;
      if (event.type === 'pointercancel' || motion.matches) angularVelocity.set(0, 0);
      if (clickOutside && event.type !== 'pointercancel') close();
    };
    canvas.addEventListener('pointerup', release, options); canvas.addEventListener('pointercancel', release, options);
    canvas.addEventListener('lostpointercapture', () => { drag = null; delete dialog.dataset.dragging; }, options);
    canvas.addEventListener('keydown', event => {
      if (phase !== 'open') return;
      if (event.key === 'Home') { event.preventDefault(); reset(); return; }
      const step = Math.PI / 8;
      const angles = { ArrowLeft: [0, -step], ArrowRight: [0, step], ArrowUp: [-step, 0], ArrowDown: [step, 0] }[event.key];
      if (!angles) return;
      event.preventDefault(); angularVelocity.set(0, 0);
      euler.set(angles[0], angles[1], 0); targetQuaternion.premultiply(turn.setFromEuler(euler));
      if (motion.matches) paint();
    }, options);
  }
  closeButton.addEventListener('click', close, options);
  dialog.querySelector('.sticker-viewer-reset').addEventListener('click', reset, options);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); }, options);
  window.addEventListener('resize', measure, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; last = 0; } else start(); }, options);
  motion.addEventListener('change', () => { angularVelocity.set(0, 0); if (motion.matches && animation) animation.progress(1); paint(); }, options);
  return {
    get active() { return selected !== null; },
    get targeted() { return hovered !== null || (buttons.includes(document.activeElement) && document.activeElement.matches(':focus-visible')); },
    update, prepare,
    dispose() {
      if (disposed) return;
      events.abort();
      if (selected !== null) finishClose(false);
      disposed = true; animation?.kill(); cancelAnimationFrame(frame);
      meshes.forEach(mesh => mesh.geometry.dispose()); materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose());
      environment?.dispose(); renderer?.dispose(); hotspots.remove(); dialog.remove();
    },
  };
}
