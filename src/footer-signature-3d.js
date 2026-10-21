import * as THREE from 'three';
import {runtimeQuality,renderPixelRatio} from './runtime-quality';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import outline from './footer-signature-shapes.json';
import { createSignatureStickers, applySignatureStickerUVs } from './footer-signature-stickers';
import { createSignatureFinish, createSignatureGlints } from './footer-signature-finish';
import { createSignatureStickerViewer } from './footer-sticker-viewer';

export function initFooterSignature3D({ getLenis } = {}) {
  const host = document.querySelector('.footer-signature');
  const footer = host?.closest('.signature-footer');
  if (!host || !footer) return () => {};
  let disposed = false, renderer, observer, sizing, environment, geometry, materials, stickers, finish, glints, viewer;
  let frame = 0, visible = false, last = 0, time = 0;
  let renderScale=1,framePressure=0,adaptedAt=0;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = new THREE.Vector2();
  const follow = new THREE.Vector2();
  const velocity = new THREE.Vector2();
  const lightFollow = new THREE.Vector2();
  const lampDirection = new THREE.Vector3(-2.5, 4.5, 8).normalize();
  const lightPose = new THREE.Euler();
  const lightNormal = new THREE.Vector3();
  const lightReflection = new THREE.Vector3();
  const lightOrientation = new THREE.Quaternion();
  const lightDrift = new THREE.Quaternion();
  const lightDriftPose = new THREE.Euler();
  const chromeClock = { value: 0 };
  let bank = 0, reaction = 0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  camera.position.set(0, 0, 20);
  const model = new THREE.Group(); scene.add(model);
  // Soft fill keeps printed ink readable beneath its reflective laminate.
  scene.add(new THREE.HemisphereLight('#ffffff', '#30323b', .5));
  const pose = (delta = 0) => {
    if (motion.matches) {
      follow.set(0, 0); velocity.set(0, 0); lightFollow.set(0, 0);
      bank = reaction = 0;
    } else if (delta > 0 && !viewer?.targeted) {
      // Integrate in small time-based steps: a quick reversal carries momentum
      // through the turn, with a restrained overshoot before settling.
      const steps = Math.ceil(delta * 120);
      const step = delta / steps;
      for (let i = 0; i < steps; i++) {
        velocity.x += ((pointer.x - follow.x) * 80 - velocity.x * 13) * step;
        velocity.y += ((pointer.y - follow.y) * 80 - velocity.y * 13) * step;
        follow.addScaledVector(velocity, step);
      }
      const energy = Math.min(1, velocity.length() * .23);
      reaction = THREE.MathUtils.damp(reaction, energy, energy > reaction ? 9 : 3.8, delta);
      const roll = THREE.MathUtils.clamp(-velocity.x * .035 + velocity.y * .012, -.1, .1);
      bank = THREE.MathUtils.damp(bank, roll, 7, delta);
      lightFollow.lerp(follow, 1 - Math.exp(-delta * 2.4));
    }
    const ambient = motion.matches ? 0 : 1;
    if (!viewer?.targeted && !viewer?.active) {
      model.rotation.set(
        -.24 + follow.y * .58 + Math.sin(time * .61) * .014 * ambient,
        follow.x * .68 + Math.sin(time * .43) * .022 * ambient,
        bank,
      );
      model.position.set(follow.x * .14, -follow.y * .1 + Math.sin(time * .72) * .022 * ambient, reaction * .42);
    }
    // Reflection ribbons trail the solid mark; the surface flows without
    // moving the silhouette or warping the printed stickers.
    lightPose.set(-.24 + lightFollow.y * .58, lightFollow.x * .68, bank * .4);
    lightNormal.set(0, 0, 1).applyEuler(lightPose);
    lightReflection.set(0, 0, -1).reflect(lightNormal);
    lightOrientation.setFromUnitVectors(lampDirection, lightReflection);
    lightDriftPose.set(.025 * Math.sin(time * .19) * ambient, .13 * Math.sin(time * .32) * ambient, 0);
    lightDrift.setFromEuler(lightDriftPose);
    scene.environmentRotation.setFromQuaternion(lightDrift.multiply(lightOrientation));
    materials?.forEach(material => {
      material.envMapIntensity = 1.08 + reaction * .1;
      material.clearcoatRoughness = .065 - reaction * .01;
    });
    chromeClock.value = motion.matches ? 0 : time;
    glints?.update(time, reaction, motion.matches);
    if (finish) finish.render(scene, camera); else renderer.render(scene, camera);
    host.dataset.rotation = `${model.rotation.x.toFixed(3)},${model.rotation.y.toFixed(3)}`;
    host.dataset.light = scene.environmentRotation.toArray().slice(0, 3).map(v => v.toFixed(3)).join(',');
    host.dataset.motion = `${bank.toFixed(4)},${model.position.z.toFixed(4)},${reaction.toFixed(4)}`;
    viewer?.update();
  };
  const tick = now => {
    frame = 0;
    if (disposed || !visible || document.hidden || motion.matches || viewer?.active) { last = 0; return; }
    const delta = last ? Math.min((now - last) / 1000, .05) : 1 / 60;
    time += delta;
    last = now; pose(delta);
    framePressure=delta>1/48?framePressure+1:Math.max(0,framePressure-1);
    if(framePressure>30&&renderScale>.72&&now-adaptedAt>1500){
      renderScale=Math.max(.72,renderScale*.85);framePressure=0;adaptedAt=now;resize();
    }
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    if (disposed || !renderer) return;
    if (viewer?.active) return;
    if (motion.matches) { pointer.set(0, 0); pose(); }
    if (!visible || document.hidden) {
      pointer.set(0, 0); velocity.set(0, 0);
    }
    if (visible && !document.hidden && !motion.matches) frame = requestAnimationFrame(tick);
  };
  const move = event => {
    if (motion.matches || viewer?.active || viewer?.targeted || event.pointerType === 'touch') return;
    const r = footer.getBoundingClientRect();
    pointer.set(THREE.MathUtils.clamp((event.clientX-r.left)/r.width*2-1,-1,1),THREE.MathUtils.clamp((event.clientY-r.top)/r.height*2-1,-1,1));
  };
  const leave = () => { if (!viewer?.active) pointer.set(0, 0); };
  const resize = () => {
    if (disposed || !renderer) return;
    const width = Math.max(1, host.clientWidth * 1.4);
    const height = Math.max(1, host.clientHeight * 2.2);
    renderer.setPixelRatio(renderPixelRatio(width,height)*renderScale);
    host.dataset.renderScale=renderScale.toFixed(2);
    renderer.setSize(width, height, false);
    host.dataset.renderPixels=String(renderer.domElement.width*renderer.domElement.height);
    finish?.resize();
    const halfHeight = 7.2 * height / width;
    camera.aspect = width / height;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfHeight / camera.position.z));
    camera.updateProjectionMatrix(); pose();
  };
  const destroy = () => {
    disposed = true; cancelAnimationFrame(frame);
    viewer?.dispose();
    observer?.disconnect(); sizing?.disconnect();
    footer.removeEventListener('pointermove', move); footer.removeEventListener('pointerleave', leave);
    motion.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync);
    geometry?.dispose(); materials?.forEach(m => m.dispose()); environment?.dispose();
    finish?.dispose(); glints?.dispose();
    stickers?.dispose(); delete host.dataset.stickersLoaded;
    delete host.dataset.signatureReady;
    renderer?.dispose(); renderer?.domElement.remove(); host.classList.remove('has-signature-3d');
    footer.classList.remove('signature-in-view');
  };
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(runtimeQuality().pixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .85;
    renderer.domElement.className = 'footer-signature-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.append(renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(renderer);
    // The same studio surrounds every face. Reflections continue over the
    // bevel and walls instead of leaving an unlit, differently colored extrusion.
    const studio = new THREE.Scene();
    const roomCanvas = document.createElement('canvas');
    roomCanvas.width = 512; roomCanvas.height = 256;
    const roomContext = roomCanvas.getContext('2d');
    const roomImage = roomContext.createImageData(roomCanvas.width, roomCanvas.height);
    // Continuous soft studio strips surround the full 360 degrees, including
    // ceiling and floor. The walls get the same flowing silver/dark pattern.
    for (let y = 0; y < roomCanvas.height; y++) {
      const latitude = y / (roomCanvas.height - 1) * Math.PI;
      for (let x = 0; x < roomCanvas.width; x++) {
        const longitude = x / roomCanvas.width * Math.PI * 2;
        const strip = Math.pow(.5 + .5 * Math.cos(longitude * 5 + Math.sin(latitude * 2) * .7), 14);
        const bounce = Math.pow(.5 + .5 * Math.cos(latitude * 6 - .4), 18);
        const level = .24 + strip * .46 * Math.sin(latitude) + bounce * .2;
        const pixel = (y * roomCanvas.width + x) * 4;
        roomImage.data[pixel] = Math.round(level * 245);
        roomImage.data[pixel + 1] = Math.round(level * 250);
        roomImage.data[pixel + 2] = Math.round(level * 255);
        roomImage.data[pixel + 3] = 255;
      }
    }
    roomContext.putImageData(roomImage, 0, 0);
    const roomTexture = new THREE.CanvasTexture(roomCanvas);
    roomTexture.colorSpace = THREE.SRGBColorSpace;
    roomTexture.mapping = THREE.EquirectangularReflectionMapping;
    studio.background = roomTexture;
    const lampCanvas = document.createElement('canvas');
    lampCanvas.width = lampCanvas.height = 128;
    const lampContext = lampCanvas.getContext('2d');
    const feather = lampContext.createRadialGradient(64, 64, 12, 64, 64, 64);
    feather.addColorStop(0, 'rgba(255,255,255,1)');
    feather.addColorStop(.58, 'rgba(255,255,255,.9)');
    feather.addColorStop(.88, 'rgba(255,255,255,.12)');
    feather.addColorStop(1, 'rgba(255,255,255,0)');
    lampContext.fillStyle = feather; lampContext.fillRect(0, 0, 128, 128);
    const lampTexture = new THREE.CanvasTexture(lampCanvas);
    lampTexture.colorSpace = THREE.SRGBColorSpace;
    const panels = [
      [2.6,.32,1.1,-2.5,4.5,8,3.6,3.7,3.9],
      [3.1,.24,1.2,7,1,4,2.5,2.7,3.0],
      [3.1,1.1,.22,-5,7,1,2.8,2.9,3.1],
      [3.6,1.2,.2,0,-6,3,2.2,2.4,2.7],
      [3.3,.28,1.1,-8,-1,-3,2.8,2.9,3.1],
      [3.4,1.2,.24,1,7,-5,2.6,2.7,2.9],
      [3.1,.3,1.2,8,0,-5,2.5,2.7,3.0],
      [3.2,1.1,.24,-1,-7,-5,2.3,2.5,2.8],
    ].map(([radius,sx,sy,x,y,z,r,g,b]) => {
      const panel = new THREE.Mesh(new THREE.CircleGeometry(radius, 96),
        new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(r,g,b), map: lampTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      panel.scale.set(sx,sy,1); panel.position.set(x,y,z); panel.lookAt(0,0,0); studio.add(panel); return panel;
    });
    environment = pmrem.fromScene(studio, .025); scene.environment = environment.texture;
    panels.forEach(panel => { panel.geometry.dispose(); panel.material.dispose(); });
    lampTexture.dispose(); roomTexture.dispose();
    pmrem.dispose();
    const path = (points, Type) => {
      const result = new Type();
      // Round the raster trace locally without changing the signature's proportions.
      const vertices = points.map(([x, y]) => new THREE.Vector2((x/outline.width-.5)*10, (.5-y/outline.height)*10*outline.height/outline.width));
      const start = vertices.at(-1).clone().lerp(vertices[0], .5);
      result.moveTo(start.x, start.y);
      vertices.forEach((point, i) => {
        const end = point.clone().lerp(vertices[(i + 1) % vertices.length], .5);
        result.quadraticCurveTo(point.x, point.y, end.x, end.y);
      });
      result.closePath(); return result;
    };
    const shapes = outline.shapes.map(item => {
      const shape = path(item.points, THREE.Shape);
      shape.holes = item.holes.map(hole => path(hole, THREE.Path)); return shape;
    });
    const depth = .5, bevelSize = .035, bevelThickness = .065;
    const quality=runtimeQuality();
    geometry = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelSegments: quality.bevelSegments, steps: 1, bevelSize, bevelThickness, curveSegments: quality.curveSegments });
    // The utility hashes positions to .01 units: scale temporarily so adjacent
    // bevel rings are not collapsed into the same smoothing bucket.
    geometry.scale(100, 100, 100);
    geometry = toCreasedNormals(geometry, Math.PI / 3);
    geometry.scale(.01, .01, .01);
    const normals = geometry.attributes.normal;
    const positions = geometry.attributes.position;
    // Keep every cap triangle planar. Interpolated bevel normals across the
    // large triangulated face otherwise create false dents and diagonal patches.
    for (const group of geometry.groups) {
      if (group.materialIndex !== 0) continue;
      for (let i = group.start; i < group.start + group.count; i++) {
        normals.setXYZ(i, 0, 0, positions.getZ(i) > depth / 2 ? 1 : -1);
      }
    }
    normals.needsUpdate = true;
    geometry.translate(0, 0, -depth / 2);
    applySignatureStickerUVs(geometry, outline.width / outline.height, depth, bevelSize, bevelThickness);
    const chrome = new THREE.MeshPhysicalMaterial({ color: '#b8c2cf', metalness: 1, roughness: .13, ior: 1.5, clearcoat: 1, clearcoatRoughness: .065, envMapIntensity: 1.08 });
    materials = [chrome];
    // A single material also makes the caps, bevels and all four walls share
    // their surface pattern, clock and gloss response.
    geometry.groups.forEach(group => { group.materialIndex = 0; });
    stickers = createSignatureStickers(outline.width / outline.height, count => {
      if (disposed) return;
      host.dataset.stickersLoaded = String(count);
      pose();
    });
    stickers.texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    // Preparation is awaited by the loader after the hidden page has a size.
    // Keep early failures handled until that gate can report/retry them.
    stickers.ready.catch(() => {});
    // One object-space finish wraps the complete solid. Printed vinyl receives
    // its own dielectric color underneath the same glossy surface lighting.
    const applyStickerSurface = shader => {
      shader.uniforms.signatureStickers = { value: stickers.texture };
      shader.uniforms.chromeClock = chromeClock;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 signatureStickerUV;\nattribute vec3 signatureStickerEdge;\nvarying vec3 stickerSurfaceUV;\nvarying vec3 stickerEdgeUV;\nvarying vec3 chromePosition;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          stickerSurfaceUV = signatureStickerUV;
          stickerEdgeUV = signatureStickerEdge;
          chromePosition = position;
        `);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 stickerSurfaceUV;
          varying vec3 stickerEdgeUV;
          varying vec3 chromePosition;
          uniform float chromeClock;
          uniform sampler2D signatureStickers;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec4 stickerInk = texture2D(signatureStickers, stickerSurfaceUV.xy);
          stickerInk.a *= stickerSurfaceUV.z;
          // A wall can only carry ink that actually crosses its own front
          // edge. Nearby strokes must not pick up another stroke's sticker.
          float attachedEdge = texture2D(signatureStickers, stickerEdgeUV.xy).a;
          stickerInk.a *= mix(1.0, attachedEdge, stickerEdgeUV.z);
          diffuseColor.rgb = mix(diffuseColor.rgb, stickerInk.rgb, stickerInk.a);
        `)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          float brushPhase = dot(chromePosition,vec3(7.0,120.0,83.0)) + sin(chromePosition.x*19.0)*2.0;
          float etch = sin(brushPhase)*(1.0-smoothstep(1.0,3.0,fwidth(brushPhase)));
          roughnessFactor = mix(roughnessFactor + etch*.004, .16, stickerInk.a);
        `)
        .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
          metalnessFactor *= 1.0 - stickerInk.a;
        `)
        .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
          material.clearcoat = mix(material.clearcoat, 1.0, stickerInk.a);
          material.clearcoatRoughness = mix(material.clearcoatRoughness, .075, stickerInk.a);
        `)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          float flow = sin(dot(chromePosition,vec3(3.4,1.7,3.1)) + sin(dot(chromePosition,vec3(.7,2.1,4.3))) + chromeClock*.24)*.006;
          flow += sin(dot(chromePosition,vec3(7.1,-4.2,5.3))-chromeClock*.17)*.0008;
          flow *= mix(1.0, .45, stickerInk.a);
          vec3 dx = dFdx(-vViewPosition), dy = dFdy(-vViewPosition);
          vec3 rx = cross(dy,normal), ry = cross(normal,dx);
          float det = dot(dx,rx);
          normal = normalize(abs(det)*normal-sign(det)*(dFdx(flow)*rx+dFdy(flow)*ry));
        `)
        .replace('#include <clearcoat_normal_fragment_maps>', `#include <clearcoat_normal_fragment_maps>
          clearcoatNormal = normal;
        `)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += stickerInk.rgb * stickerInk.a * .018;
        `);
    };
    materials.forEach(material => {
      material.onBeforeCompile = applyStickerSurface;
      material.customProgramCacheKey = () => 'signature-wrapped-gloss-v11';
    });
    model.add(new THREE.Mesh(geometry, materials));
    glints = createSignatureGlints(scene);
    finish = createSignatureFinish(renderer);
    viewer = createSignatureStickerViewer({
      host, renderer, camera, model, stickers, aspect: outline.width / outline.height,
      signatureGeometry: geometry, sourceScene: scene, sourceEnvironment: environment,
      front: depth / 2 + bevelThickness, getLenis,
      renderSource: () => { if (!disposed) pose(); },
      onActiveChange: active => {
        cancelAnimationFrame(frame); frame = 0; last = 0;
        if (!active && !disposed) sync();
      },
    });
    model.rotation.x = -.18;
    resize();
    footer.addEventListener('pointermove', move, { passive: true }); footer.addEventListener('pointerleave', leave);
    motion.addEventListener('change', sync); document.addEventListener('visibilitychange', sync);
    sizing = new ResizeObserver(resize); sizing.observe(host);
    observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      footer.classList.toggle('signature-in-view', entry.intersectionRatio >= .5);
      sync();
    }, { threshold: [0, .5] }); observer.observe(footer);
  } catch (error) {
    destroy();
    host.dataset.signatureReady = 'poster';
    console.warn('Footer WebGL unavailable; using its rendered 3D poster.', error);
  }
  destroy.prepare = async () => {
    if (disposed || !renderer) return;
    const loaded = await stickers.ready;
    if (disposed) return;
    if (loaded !== stickers.expectedCount) throw new Error('Footer 3D stickers are not ready');
    // Main content now has its real responsive dimensions under the loader.
    // Upload the finished atlas and render at that size before replacing the poster.
    renderer.initTexture(stickers.texture);
    await renderer.compileAsync(scene, camera);
    if (disposed) return;
    try { await viewer.prepare(); }
    catch (error) {
      viewer.dispose(); viewer = undefined;
      console.warn('Sticker inspection unavailable; the signature remains visible.', error);
    }
    if (disposed) return;
    resize();
    if (renderer.getContext().isContextLost()) throw new Error('Footer 3D context was lost during preparation');
    host.classList.add('has-signature-3d');
    host.dataset.signatureReady = 'true';
  };
  return destroy;
}
