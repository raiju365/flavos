import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import outline from './footer-signature-shapes.json';
import { createSignatureStickers, applySignatureStickerUVs } from './footer-signature-stickers';

export function initFooterSignature3D() {
  const host = document.querySelector('.footer-signature');
  const footer = host?.closest('.signature-footer');
  if (!host || !footer) return () => {};
  let disposed = false, renderer, observer, sizing, environment, geometry, materials, stickers;
  let frame = 0, visible = false, last = 0, time = 0;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = new THREE.Vector2();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  camera.position.set(0, 0, 20);
  const model = new THREE.Group(); scene.add(model);
  const key = new THREE.SpotLight('#ffffff', 45, 0, .8, 1, 2);
  const rim = new THREE.SpotLight('#d9e2ff', 25, 0, .9, 1, 2);
  const spot = new THREE.SpotLight('#fff5e5', 35, 0, .68, 1, 2);
  scene.add(spot, spot.target);
  scene.add(key, key.target, rim, rim.target, new THREE.HemisphereLight('#f8f7f3', '#20235b', .16));
  const fill = new THREE.DirectionalLight('#ffffff', .22);
  fill.position.set(-2, 4, 6); scene.add(fill);
  const pose = () => {
    const targetX = -.24 + pointer.y * .65;
    const targetY = pointer.x * .72;
    const amount = motion.matches ? 1 : .085;
    model.rotation.x += (targetX - model.rotation.x) * amount;
    model.rotation.y += (targetY - model.rotation.y) * amount;
    key.position.set(-2 + Math.sin(time * .55) * 4, 4.5, 6.5);
    rim.position.set(6, 1 + Math.sin(time * .2), 6);
    spot.position.set(-3 + Math.sin(time * .55) * 4, 3.5, 6);
    spot.target.position.set(Math.sin(time * .55 + .4) * 3, 0, 0);
    key.lookAt(0, 0, 0); rim.lookAt(0, 0, 0);
    // Broad studio reflections sweep over the solid mark, never deforming it.
    scene.environmentRotation.y = Math.sin(time * .55) * .6;
    scene.environmentRotation.z = -.22 + Math.sin(time * .19) * .08;
    renderer.render(scene, camera);
    host.dataset.rotation = `${model.rotation.x.toFixed(3)},${model.rotation.y.toFixed(3)}`;
    host.dataset.light = key.position.toArray().map(v => v.toFixed(3)).join(',');
  };
  const tick = now => {
    frame = 0;
    if (disposed || !visible || document.hidden || motion.matches) { last = 0; return; }
    time += last ? Math.min((now - last) / 1000, .05) : 0;
    last = now; pose(); frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    if (disposed || !renderer) return;
    if (motion.matches) { pointer.set(0, 0); pose(); }
    if (visible && !document.hidden && !motion.matches) frame = requestAnimationFrame(tick);
  };
  const move = event => {
    if (motion.matches || event.pointerType === 'touch') return;
    const r = footer.getBoundingClientRect();
    pointer.set(THREE.MathUtils.clamp((event.clientX-r.left)/r.width*2-1,-1,1),THREE.MathUtils.clamp((event.clientY-r.top)/r.height*2-1,-1,1));
  };
  const leave = () => pointer.set(0, 0);
  const resize = () => {
    if (disposed || !renderer) return;
    const width = Math.max(1, host.clientWidth * 1.4);
    const height = Math.max(1, host.clientHeight * 2.2);
    renderer.setSize(width, height, false);
    const halfHeight = 7.2 * height / width;
    camera.aspect = width / height;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfHeight / camera.position.z));
    camera.updateProjectionMatrix(); pose();
  };
  const destroy = () => {
    disposed = true; cancelAnimationFrame(frame);
    observer?.disconnect(); sizing?.disconnect();
    footer.removeEventListener('pointermove', move); footer.removeEventListener('pointerleave', leave);
    motion.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync);
    geometry?.dispose(); materials?.forEach(m => m.dispose()); environment?.dispose();
    stickers?.dispose(); delete host.dataset.stickersLoaded;
    renderer?.dispose(); renderer?.domElement.remove(); host.classList.remove('has-signature-3d');
    footer.classList.remove('signature-in-view');
  };
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .85;
    renderer.domElement.className = 'footer-signature-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.append(renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(renderer);
    // Round studio lamps produce broad circular reflections with a soft edge.
    const studio = new THREE.Scene();
    studio.background = new THREE.Color('#030408');
    const lampCanvas = document.createElement('canvas');
    lampCanvas.width = lampCanvas.height = 128;
    const lampContext = lampCanvas.getContext('2d');
    const feather = lampContext.createRadialGradient(64, 64, 30, 64, 64, 64);
    feather.addColorStop(0, 'rgba(255,255,255,1)');
    feather.addColorStop(.65, 'rgba(255,255,255,.8)');
    feather.addColorStop(1, 'rgba(255,255,255,0)');
    lampContext.fillStyle = feather; lampContext.fillRect(0, 0, 128, 128);
    const lampTexture = new THREE.CanvasTexture(lampCanvas);
    lampTexture.colorSpace = THREE.SRGBColorSpace;
    const panels = [];
    for (const [radius, x, y, z, strength] of [
      [3.8, -4, 3, 8, 4.2],
      [2.8, 7, 1, 4, 3.2],
      [3.5, 0, 8, 4, 3.6],
    ]) {
      const panel = new THREE.Mesh(new THREE.CircleGeometry(radius, 64),
        new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(strength, strength, strength), map: lampTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      panel.position.set(x, y, z); panel.lookAt(0, 0, 0);
      studio.add(panel); panels.push(panel);
    }
    environment = pmrem.fromScene(studio, .025); scene.environment = environment.texture;
    panels.forEach(panel => { panel.geometry.dispose(); panel.material.dispose(); });
    lampTexture.dispose();
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
    const depth = .48;
    geometry = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelSegments: 8, steps: 1, bevelSize: .018, bevelThickness: .04, curveSegments: 4 });
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
    applySignatureStickerUVs(geometry, outline.width / outline.height, depth, .018, .04);
    materials = [
      new THREE.MeshPhysicalMaterial({ color: '#242733', metalness: .08, roughness: .1, ior: 1.65, clearcoat: 1, clearcoatRoughness: .045, envMapIntensity: 1.15 }),
      new THREE.MeshPhysicalMaterial({ color: '#171a23', metalness: .05, roughness: .12, ior: 1.65, clearcoat: 1, clearcoatRoughness: .065, envMapIntensity: 1 }),
    ];
    stickers = createSignatureStickers(outline.width / outline.height, count => {
      if (disposed) return;
      host.dataset.stickersLoaded = String(count);
      pose();
    });
    stickers.texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    // Object-space fragments remain attached to the surface as it tilts. The
    // mesh itself clips the effect, so nothing bleeds onto the background.
    const applyStickerSurface = shader => {
      shader.uniforms.signatureStickers = { value: stickers.texture };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 signatureStickerUV;\nattribute vec3 signatureStickerEdge;\nvarying vec3 stickerSurfaceUV;\nvarying vec3 stickerEdgeUV;\nvarying vec3 signaturePosition;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          signaturePosition = position;
          stickerSurfaceUV = signatureStickerUV;
          stickerEdgeUV = signatureStickerEdge;
        `);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 signaturePosition;
          varying vec3 stickerSurfaceUV;
          varying vec3 stickerEdgeUV;
          uniform sampler2D signatureStickers;
          float stoneHash(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
          float stoneNoise(vec3 p) {
            vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(mix(stoneHash(i),stoneHash(i+vec3(1,0,0)),f.x),
              mix(stoneHash(i+vec3(0,1,0)),stoneHash(i+vec3(1,1,0)),f.x),f.y),
              mix(mix(stoneHash(i+vec3(0,0,1)),stoneHash(i+vec3(1,0,1)),f.x),
              mix(stoneHash(i+vec3(0,1,1)),stoneHash(i+vec3(1,1,1)),f.x),f.y),f.z);
          }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec4 stickerInk = texture2D(signatureStickers, stickerSurfaceUV.xy);
          stickerInk.a *= stickerSurfaceUV.z;
          // A wall can only carry ink that actually crosses its own front
          // edge. Nearby strokes must not pick up another stroke's sticker.
          float attachedEdge = texture2D(signatureStickers, stickerEdgeUV.xy).a;
          stickerInk.a *= mix(1.0, attachedEdge, stickerEdgeUV.z);
          float mineral = stoneNoise(signaturePosition * 17.0);
          float cloud = stoneNoise(signaturePosition * 2.6);
          float vein = pow(1.0-abs(sin(signaturePosition.x*3.0 + signaturePosition.y*5.0 + cloud*7.0)), 16.0);
          vec3 stoneColor = mix(vec3(.018,.022,.029),vec3(.065,.073,.087),cloud);
          stoneColor += mineral * .025 + vein * .055;
          diffuseColor.rgb = stoneColor;
          diffuseColor.rgb = mix(diffuseColor.rgb, stickerInk.rgb, stickerInk.a);
        `)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = mix(.075 + mineral * .045, .52, stickerInk.a);
        `)
        .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
          metalnessFactor *= 1.0 - stickerInk.a;
        `)
        .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
          material.clearcoat *= mix(1.0, .16, stickerInk.a);
          material.clearcoatRoughness = mix(material.clearcoatRoughness, .42, stickerInk.a);
        `)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          vec3 qx = dFdx(-vViewPosition), qy = dFdy(-vViewPosition);
          vec3 rx = cross(qy, normal), ry = cross(normal, qx);
          float det = dot(qx, rx);
          float relief = (mineral * .0007 + vein * .0004) * (1.0-stickerInk.a);
          vec3 slope = sign(det) * (dFdx(relief)*rx + dFdy(relief)*ry);
          normal = normalize(abs(det)*normal-slope);
        `)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += stickerInk.rgb * stickerInk.a * .22;
        `);
    };
    materials.forEach(material => {
      material.onBeforeCompile = applyStickerSurface;
      material.customProgramCacheKey = () => 'signature-folded-stickers-v8';
    });
    model.add(new THREE.Mesh(geometry, materials));
    model.rotation.x = -.18;
    resize(); host.classList.add('has-signature-3d');
    footer.addEventListener('pointermove', move, { passive: true }); footer.addEventListener('pointerleave', leave);
    motion.addEventListener('change', sync); document.addEventListener('visibilitychange', sync);
    sizing = new ResizeObserver(resize); sizing.observe(host);
    observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      footer.classList.toggle('signature-in-view', entry.intersectionRatio >= .5);
      sync();
    }, { threshold: [0, .5] }); observer.observe(footer);
  } catch (error) {
    destroy(); console.warn('Footer 3D unavailable; using signature image.', error);
  }
  return destroy;
}
