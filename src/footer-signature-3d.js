import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import outline from './footer-signature-shapes.json';

export function initFooterSignature3D() {
  const host = document.querySelector('.footer-signature');
  const footer = host?.closest('.signature-footer');
  if (!host || !footer) return () => {};
  let disposed = false, renderer, observer, sizing, environment, geometry, materials;
  let frame = 0, visible = false, last = 0, time = 0;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = new THREE.Vector2();
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-7.2, 7.2, 4, -4, .1, 100);
  camera.position.set(0, 0, 20);
  const model = new THREE.Group(); scene.add(model);
  const key = new THREE.PointLight('#fff8eb', 110, 0, 2);
  const rim = new THREE.PointLight('#bdcaff', 85, 0, 2);
  scene.add(key, rim, new THREE.HemisphereLight('#f8f7f3', '#20235b', 1.5));
  const fill = new THREE.DirectionalLight('#ffffff', 2.8);
  fill.position.set(-2, 4, 6); scene.add(fill);
  const pose = () => {
    const targetX = -.18 + pointer.y * .48;
    const targetY = pointer.x * .65;
    const amount = motion.matches ? 1 : .085;
    model.rotation.x += (targetX - model.rotation.x) * amount;
    model.rotation.y += (targetY - model.rotation.y) * amount;
    key.position.set(Math.sin(time * .65) * 5.5, Math.cos(time * .47) * 3.2, 3.8 + Math.sin(time * .33));
    rim.position.set(Math.cos(time * .39 + 2) * 6, Math.sin(time * .53 + 1) * 4, 2.5);
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
    camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix(); pose();
  };
  const destroy = () => {
    disposed = true; cancelAnimationFrame(frame);
    observer?.disconnect(); sizing?.disconnect();
    footer.removeEventListener('pointermove', move); footer.removeEventListener('pointerleave', leave);
    motion.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync);
    geometry?.dispose(); materials?.forEach(m => m.dispose()); environment?.dispose();
    renderer?.dispose(); renderer?.domElement.remove(); host.classList.remove('has-signature-3d');
  };
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
    renderer.domElement.className = 'footer-signature-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.append(renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    environment = pmrem.fromScene(room, .04); scene.environment = environment.texture;
    room.dispose(); pmrem.dispose();
    const path = (points, Type) => {
      const result = new Type();
      points.forEach(([x,y],i) => result[i ? 'lineTo' : 'moveTo']((x/outline.width-.5)*10, (.5-y/outline.height)*10*outline.height/outline.width));
      result.closePath(); return result;
    };
    const shapes = outline.shapes.map(item => {
      const shape = path(item.points, THREE.Shape);
      shape.holes = item.holes.map(hole => path(hole, THREE.Path)); return shape;
    });
    geometry = new THREE.ExtrudeGeometry(shapes, { depth: .44, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .022, bevelThickness: .035, curveSegments: 6 });
    const rawGeometry = geometry;
    geometry = toCreasedNormals(rawGeometry, Math.PI / 3);
    rawGeometry.dispose();
    geometry.translate(0, 0, -.22);
    materials = [
      new THREE.MeshPhysicalMaterial({ color: '#101321', metalness: .68, roughness: .2, clearcoat: 1, clearcoatRoughness: .13, envMapIntensity: 1.25 }),
      new THREE.MeshPhysicalMaterial({ color: '#070912', metalness: .55, roughness: .28, clearcoat: 1, envMapIntensity: .9 }),
    ];
    model.add(new THREE.Mesh(geometry, materials));
    model.rotation.x = -.18;
    resize(); host.classList.add('has-signature-3d');
    footer.addEventListener('pointermove', move, { passive: true }); footer.addEventListener('pointerleave', leave);
    motion.addEventListener('change', sync); document.addEventListener('visibilitychange', sync);
    sizing = new ResizeObserver(resize); sizing.observe(host);
    observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }); observer.observe(footer);
  } catch (error) {
    destroy(); console.warn('Footer 3D unavailable; using signature image.', error);
  }
  return destroy;
}
