import * as THREE from 'three';
import {renderPixelRatio} from './runtime-quality';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { createStickerSurface } from './footer-sticker-geometry';
import { bindStickerSurface, projectStickerAttachment, STICKER_SKIN_OFFSET } from './footer-sticker-attachment';
import { signatureStickers } from './footer-signature-stickers';
import './footer-sticker-viewer.css';

const PEEL_END = .34;
const STICKER_TIMING = { release: 1.35, travel: .75, press: 1.5 };

export function createSignatureStickerViewer({ host, renderer: sourceRenderer, camera: sourceCamera, model, stickers, aspect, front, signatureGeometry, sourceScene, sourceEnvironment, getLenis, renderSource, onActiveChange }) {
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
  dialog.setAttribute('aria-label', '3D sticker viewer'); dialog.setAttribute('data-lenis-prevent', '');
  dialog.innerHTML = `<div class="sticker-viewer-blur" aria-hidden="true"></div>
    <button class="sticker-viewer-close" type="button" aria-label="Close sticker viewer" autofocus>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    </button>`;
  document.body.append(dialog);
  const closeButton = dialog.querySelector('.sticker-viewer-close');
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, .1, 60);
  camera.position.z = 8;
  const sourceLights = sourceScene.children.filter(object => object.isLight);
  const lights = sourceLights.map(light => { const copy = light.clone(); scene.add(copy); return copy; });
  const group = new THREE.Group(); scene.add(group);
  const occlusionGeometry = signatureGeometry.clone();
  occlusionGeometry.userData.attachment = { positions: signatureGeometry.attributes.position.array, normals: signatureGeometry.attributes.normal.array };
  occlusionGeometry.setAttribute('stickerAttachedPosition', occlusionGeometry.attributes.position);
  occlusionGeometry.setAttribute('stickerAttachedNormal', occlusionGeometry.attributes.normal);
  const occlusionMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, side: THREE.DoubleSide });
  const occluder = new THREE.Mesh(occlusionGeometry, occlusionMaterial); occluder.frustumCulled = false; occluder.renderOrder = -1; scene.add(occluder);
  const restQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(-.07, -.15, -.025));
  const targetQuaternion = restQuaternion.clone(), turn = new THREE.Quaternion(), euler = new THREE.Euler();
  const angularVelocity = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const meshes = [], textures = [], materials = [];
  let renderer, environment, prepared = false, disposed = false, selected = null, returnFocus;
  let animation, frame = 0, last = 0, phase = 'closed', drag = null;
  let previousOverflow = '', resumeScroll = false, origin, fit = 1;
  let closingAt = 1, closingQuaternion = restQuaternion.clone();
  const transition = { progress: 0, controls: 0 };
  let surfaceUniforms = {
    stickerPeel: { value: 0 },
    stickerAttachmentToLocal: { value: new THREE.Matrix4() },
    stickerAttachmentNormalToLocal: { value: new THREE.Matrix3() },
  };
  const attachToLogo = mesh => {
    const geometry = mesh.geometry, attached = geometry.userData.attachment;
    const position = geometry.attributes.stickerAttachedPosition, normals = geometry.attributes.stickerAttachedNormal, normal = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      normal.fromArray(attached.normals, i * 3).normalize();
      position.setXYZ(i, attached.positions[i * 3] + normal.x * STICKER_SKIN_OFFSET, attached.positions[i * 3 + 1] + normal.y * STICKER_SKIN_OFFSET, attached.positions[i * 3 + 2] + normal.z * STICKER_SKIN_OFFSET);
      normals.setXYZ(i, normal.x, normal.y, normal.z);
    }
    position.needsUpdate = true; normals.needsUpdate = true;
    const uniforms = mesh.userData.surfaceUniforms;
    uniforms.stickerPeel.value = 0; uniforms.stickerAttachmentToLocal.value.identity(); uniforms.stickerAttachmentNormalToLocal.value.identity();
    mesh.userData.attachmentMode = 'logo'; model.add(mesh);
    host.dataset.physicalStickers = String(meshes.filter(item => item.parent === model).length);
  };

  const sourcePose = (index, measuredCanvas, worldUpdated = false) => {
    const sticker = signatureStickers[index];
    const canvas = measuredCanvas || sourceRenderer.domElement.getBoundingClientRect();
    const center = new THREE.Vector3((sticker.x - .5) * 10, (.5 - sticker.y) * 10 / aspect, front);
    if(!worldUpdated)model.updateWorldMatrix(true, false);
    center.applyMatrix4(model.matrixWorld);
    const distance = sourceCamera.position.z - center.z;
    const pixelScale = canvas.height / (2 * distance * Math.tan(THREE.MathUtils.degToRad(sourceCamera.fov / 2)));
    center.project(sourceCamera);
    const x = canvas.left + (center.x + 1) * canvas.width / 2;
    const y = canvas.top + (1 - center.y) * canvas.height / 2;
    const stageDistance = distance / sourceCamera.position.z * camera.position.z;
    const stagePixels = innerHeight / (2 * stageDistance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    return {
      x, y, pixelWidth: sticker.width * 10 * pixelScale,
      position: new THREE.Vector3((x - innerWidth / 2) / stagePixels, (innerHeight / 2 - y) / stagePixels, camera.position.z - stageDistance),
      scale: sticker.width * 10 * pixelScale / stagePixels,
      quaternion: model.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -sticker.angle * Math.PI / 180)),
    };
  };
  function update() {
    if (disposed) return;
    const hostRect = host.getBoundingClientRect();
    const canvasRect=sourceRenderer.domElement.getBoundingClientRect();
    model.updateWorldMatrix(true,false);
    // Finish all geometry/layout reads before positioning any hotspot. The
    // old interleaved loop forced six layouts per rendered signature frame.
    const poses=buttons.map((_,index)=>sourcePose(index,canvasRect,true));
    buttons.forEach((button, index) => {
      const pose = poses[index];
      const image = stickers.items[index]?.image;
      const ratio = image ? image.naturalHeight / image.naturalWidth : 1;
      const width = Math.max(44, Math.min(100, pose.pixelWidth));
      const height = Math.max(44, Math.min(120, pose.pixelWidth * ratio));
      const cssWidth=`${width}px`,cssHeight=`${height}px`;
      if(button.style.width!==cssWidth)button.style.width=cssWidth;
      if(button.style.height!==cssHeight)button.style.height=cssHeight;
      button.style.transform = `translate(${pose.x - hostRect.left - width / 2}px,${pose.y - hostRect.top - height / 2}px)`;
    });
    if (selected !== null) origin = poses[selected];
  }
  function measure() {
    if (!renderer) return;
    renderer.setPixelRatio(renderPixelRatio(innerWidth,innerHeight));
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    if (selected !== null) {
      origin = sourcePose(selected);
      const image = stickers.items[selected].image;
      const pixels = innerHeight / (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      fit = Math.min(innerWidth * (innerWidth < 600 ? .78 : .52), 620, innerHeight * .59 / (image.naturalHeight / image.naturalWidth)) / pixels;
      model.updateWorldMatrix(true, false);
      projectStickerAttachment(meshes[selected].geometry, model, sourceCamera, sourceRenderer.domElement.getBoundingClientRect(), camera);
      projectStickerAttachment(occlusionGeometry, model, sourceCamera, sourceRenderer.domElement.getBoundingClientRect(), camera);
    }
    update();
  }
  function paint(delta = 0) {
    if (!renderer || selected === null) return;
    const progress = transition.progress;
    const peel = THREE.MathUtils.smoothstep(progress, 0, PEEL_END);
    const flight = THREE.MathUtils.smoothstep(progress, PEEL_END, 1);
    surfaceUniforms.stickerPeel.value = peel;
    occluder.visible = peel < 1;
    if (phase === 'opening' || phase === 'closing') {
      group.position.copy(origin.position).add(new THREE.Vector3(0, 0, .12 * peel).applyQuaternion(origin.quaternion)).multiplyScalar(1 - flight);
      group.position.z += Math.sin(flight * Math.PI) * .4;
      group.scale.setScalar(THREE.MathUtils.lerp(origin.scale, fit, flight));
      const orientation = phase === 'closing' ? flight / Math.max(.0001, THREE.MathUtils.smoothstep(closingAt, PEEL_END, 1)) : flight;
      group.quaternion.slerpQuaternions(origin.quaternion, phase === 'closing' ? closingQuaternion : targetQuaternion, THREE.MathUtils.clamp(orientation, 0, 1));
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
    group.updateMatrixWorld(true);
    surfaceUniforms.stickerAttachmentToLocal.value.copy(group.matrixWorld).invert();
    surfaceUniforms.stickerAttachmentNormalToLocal.value.setFromMatrix4(surfaceUniforms.stickerAttachmentToLocal.value);
    scene.environmentRotation.copy(sourceScene.environmentRotation);
    sourceLights.forEach((source, index) => {
      const light = lights[index]; light.color.copy(source.color); light.intensity = source.intensity; light.position.copy(source.position);
      if (light.groundColor) light.groundColor.copy(source.groundColor);
    });
    dialog.style.setProperty('--sticker-focus', String(THREE.MathUtils.smoothstep(progress, .25, .85)));
    dialog.style.setProperty('--sticker-controls', String(transition.controls));
    renderer.render(scene, camera);
    dialog.dataset.progress = progress.toFixed(4);
    dialog.dataset.rotation = group.quaternion.toArray().map(value => value.toFixed(4)).join(',');
    dialog.dataset.scale = group.scale.x.toFixed(4);
    dialog.dataset.contact = (1 - peel).toFixed(4); dialog.dataset.flight = flight.toFixed(4);
  }
  function tick(now) {
    frame = 0;
    if (disposed || !dialog.open || document.hidden) { last = 0; return; }
    const delta = last ? Math.min((now - last) / 1000, .05) : 1 / 60;
    last = now; paint(delta);
    if(phase!=='open'||drag||angularVelocity.lengthSq()>.000001
      ||group.quaternion.angleTo(targetQuaternion)>.0001||Math.abs(group.scale.x-fit)>.00001)
      frame=requestAnimationFrame(tick);
    else last=0;
  }
  function start() { if (!frame && dialog.open && !document.hidden) { last = 0; frame = requestAnimationFrame(tick); } }
  function setPhase(value) { phase = value; dialog.dataset.phase = value; }
  async function prepare() {
    if (prepared || disposed) return;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setClearColor(0, 0); renderer.toneMapping = sourceRenderer.toneMapping; renderer.toneMappingExposure = sourceRenderer.toneMappingExposure;
    renderer.domElement.className = 'sticker-viewer-canvas'; renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D sticker. Drag or use arrow keys to rotate. Press Home to reset.');
    dialog.insertBefore(renderer.domElement, closeButton);
    // Copy the source studio's HDR pixels between contexts. The returned sheet
    // sees the same lamps and reflections as the printed ink beneath it.
    const { width: envWidth, height: envHeight } = sourceEnvironment;
    const type = sourceEnvironment.texture.type;
    const envPixels = type === THREE.HalfFloatType ? new Uint16Array(envWidth * envHeight * 4) : type === THREE.FloatType ? new Float32Array(envWidth * envHeight * 4) : new Uint8Array(envWidth * envHeight * 4);
    await sourceRenderer.readRenderTargetPixelsAsync(sourceEnvironment, 0, 0, envWidth, envHeight, envPixels);
    if (envPixels.some(value => value !== 0)) {
      const texture = new THREE.DataTexture(envPixels, envWidth, envHeight, THREE.RGBAFormat, type);
      texture.mapping = THREE.CubeUVReflectionMapping; texture.colorSpace = sourceEnvironment.texture.colorSpace;
      texture.minFilter = texture.magFilter = THREE.LinearFilter; texture.needsUpdate = true;
      scene.environment = texture; environment = { dispose() { texture.dispose(); } };
    } else {
      const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
      environment = pmrem.fromScene(room, .025); scene.environment = environment.texture; room.dispose(); pmrem.dispose();
    }
    const surfaceShader = (isPrint, ratio, uniforms) => shader => {
      Object.assign(shader.uniforms, uniforms, { stickerRatio: { value: ratio } });
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          attribute vec3 stickerAttachedPosition;
          attribute vec3 stickerAttachedNormal;
          attribute float stickerAttachedCoverage;
          uniform mat4 stickerAttachmentToLocal;
          uniform mat3 stickerAttachmentNormalToLocal;
          uniform float stickerPeel,stickerRatio;
          varying float stickerFront,stickerCoverage;
        `)
        .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
          float sheetY=clamp(position.y/stickerRatio+.5,0.0,1.0);
          float localPeel=smoothstep(sheetY*.55,.45+sheetY*.55,stickerPeel);
          vec3 contactNormal=normalize(stickerAttachmentNormalToLocal*stickerAttachedNormal);
          objectNormal=normalize(mix(contactNormal,objectNormal,localPeel));
        `)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          stickerFront=${isPrint ? 'step(.5,normal.z)' : '0.0'};
          stickerCoverage=stickerAttachedCoverage;
          transformed=mix((stickerAttachmentToLocal*vec4(stickerAttachedPosition,1.0)).xyz,transformed,localPeel);
          transformed.z+=sin(localPeel*3.14159265)*.1;
        `);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float stickerPeel;
          uniform mat3 stickerBackUv;
          varying float stickerFront,stickerCoverage;
        `)
        .replace('#include <alphatest_fragment>', `
          diffuseColor.a*=mix(clamp(stickerCoverage,0.0,1.0),1.0,smoothstep(.04,.5,stickerPeel));
          diffuseColor.a*=mix(smoothstep(.025,.16,stickerPeel),1.0,stickerFront);
          #include <alphatest_fragment>
        `);
      if (isPrint) shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        vec2 printUv=mix((stickerBackUv*vec3(vMapUv,1.0)).xy,vMapUv,stickerFront);
        vec4 ink=texture2D(map,printUv);
        diffuseColor.rgb*=ink.rgb;
      `);
    };
    for (const { image, index } of stickers.items.filter(Boolean)) {
      // Share preparation with input/scroll instead of tessellating all six
      // sheets in one blocking task. The covered destination still awaits it.
      await new Promise(resolve=>setTimeout(resolve,0));
      if(disposed)return;
      const { geometry, print: printImage, backPrintUv } = createStickerSurface(image);
      bindStickerSurface(geometry, signatureGeometry, signatureStickers[index], image, aspect);
      const texture = new THREE.CanvasTexture(printImage); texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); textures.push(texture);
      const uniforms = { stickerPeel: { value: 0 }, stickerAttachmentToLocal: { value: new THREE.Matrix4() }, stickerAttachmentNormalToLocal: { value: new THREE.Matrix3() }, stickerBackUv: { value: backPrintUv } };
      const print = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: texture, metalness: 0, roughness: .16, clearcoat: 1, clearcoatRoughness: .075, envMapIntensity: 1.08, transparent: true, alphaTest: .002 });
      print.onBeforeCompile = surfaceShader(true, image.naturalHeight / image.naturalWidth, uniforms);
      print.customProgramCacheKey = () => 'signature-conforming-duplex-print-v4';
      const edge = new THREE.MeshPhysicalMaterial({ color: '#e8e6dc', roughness: .23, clearcoat: .85, clearcoatRoughness: .09, envMapIntensity: 1.08, transparent: true, alphaTest: .002 });
      edge.onBeforeCompile = surfaceShader(false, image.naturalHeight / image.naturalWidth, uniforms);
      edge.customProgramCacheKey = () => 'signature-conforming-paper-edge-v2';
      materials.push(print, edge);
      const mesh = new THREE.Mesh(geometry, [print, edge]); mesh.frustumCulled = false;
      mesh.userData.stickerIndex = index; mesh.userData.surfaceUniforms = uniforms; meshes[index] = mesh;
      group.add(mesh); renderer.initTexture(texture);
    }
    measure(); await renderer.compileAsync(scene, camera);
    if (disposed) return;
    meshes.forEach(attachToLogo);
    stickers.select('all');
    await sourceRenderer.compileAsync(sourceScene, sourceCamera);
    if (disposed) return;
    renderSource();
    prepared = true;
    bindPointer();
  }
  function open(index, trigger) {
    if (!prepared || disposed || phase !== 'closed' || !meshes[index]) return;
    selected = index; returnFocus = trigger;
    surfaceUniforms = meshes[index].userData.surfaceUniforms;
    setPhase('opening'); transition.progress = 0; transition.controls = 0;
    angularVelocity.set(0, 0); targetQuaternion.copy(restQuaternion);
    onActiveChange(true);
    origin = sourcePose(index);
    group.add(meshes[index]);
    meshes[index].userData.attachmentMode = 'inspection';
    host.dataset.physicalStickers = String(meshes.filter(item => item.parent === model).length);
    renderSource();
    const name = signatureStickers[index].name;
    dialog.setAttribute('aria-label', `${name} sticker in 3D`);
    renderer.domElement.setAttribute('aria-label', `${name} sticker, printed on both sides. Drag or use arrow keys to rotate. Press Home to reset.`);
    dialog.dataset.sticker = String(index);
    previousOverflow = document.body.style.overflow;
    resumeScroll = Boolean(getLenis?.() && !getLenis().isStopped);
    getLenis?.()?.stop(); document.body.style.overflow = 'hidden';
    dialog.showModal(); measure(); paint(); start();
    if (motion.matches) {
      transition.progress = 1; transition.controls = 1; paint(); setPhase('open');
      closeButton.focus({ preventScroll: true }); return;
    }
    animation = gsap.timeline({ onComplete() { paint(); setPhase('open'); closeButton.focus({ preventScroll: true }); } });
    // Give the sheet time to peel visibly before it travels into inspection.
    animation.to(transition, { progress: PEEL_END, duration: STICKER_TIMING.release, ease: 'sine.inOut' })
      .to(transition, { progress: 1, duration: STICKER_TIMING.travel, ease: 'power2.inOut' })
      .to(transition, { controls: 1, duration: .32 }, STICKER_TIMING.release + STICKER_TIMING.travel * .55);
  }
  function finishClose(restoreFocus = true) {
    animation?.kill(); animation = null; cancelAnimationFrame(frame); frame = 0; last = 0;
    if (selected !== null) { transition.progress = 0; paint(); }
    if (selected !== null) attachToLogo(meshes[selected]);
    renderSource();
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
    start();
    if (motion.matches) { transition.controls = 0; finishClose(); return; }
    animation = gsap.timeline({ onComplete: () => finishClose() });
    if (transition.progress > PEEL_END) {
      const distance = (transition.progress - PEEL_END) / (1 - PEEL_END);
      animation.to(transition, { progress: PEEL_END, duration: STICKER_TIMING.travel * distance, ease: 'power2.inOut' });
    }
    // Seat the sheet slowly after arrival, including a proportional early close.
    const contact = Math.min(1, transition.progress / PEEL_END);
    animation.to(transition, { progress: 0, duration: Math.max(.18, STICKER_TIMING.press * contact), ease: 'sine.inOut' })
      .to(transition, { controls: 0, duration: .18 }, 0);
  }
  function reset() { angularVelocity.set(0, 0); targetQuaternion.copy(restQuaternion); if (motion.matches) paint(); else start(); }
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
      start();
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
      else start();
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
      else start();
    }, options);
  }
  closeButton.addEventListener('click', close, options);
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
      meshes.forEach(mesh => { mesh.removeFromParent(); mesh.geometry.dispose(); }); materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose());
      stickers.select(null); delete host.dataset.physicalStickers; renderSource();
      environment?.dispose(); renderer?.dispose(); hotspots.remove(); dialog.remove();
      occlusionGeometry.dispose(); occlusionMaterial.dispose(); lights.forEach(light => light.dispose());
    },
  };
}
