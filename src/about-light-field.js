import * as THREE from 'three';

/** A restrained warm glint and sparse depth-aware dust on the existing paper. */
export function createLightField(host) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 30);
  camera.position.z = 6;
  const uniforms = { uProgress: { value: 0 }, uAspect: { value: 1 } };
  const sheenGeometry = new THREE.PlaneGeometry(2, 2);
  const sheenMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms,
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.99,1.);}`,
    fragmentShader: `uniform float uProgress;uniform float uAspect;varying vec2 vUv;
      void main(){float front=-.15+uProgress*1.3;float d=(vUv.x-front)*uAspect;
      float veil=exp(-d*d*350.)*.12;float core=exp(-d*d*24000.)*.22;
      float envelope=sin(clamp(uProgress,0.,1.)*3.14159265);
      gl_FragColor=vec4(vec3(1.,.89,.69),(veil+core)*envelope);}`
  });
  scene.add(new THREE.Mesh(sheenGeometry, sheenMaterial));
  let seed = 42;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const count = 100, positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) positions.set([random(), random(), random()], i * 3);
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dustMaterial = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: `uniform float uProgress;uniform float uAspect;varying float vAlpha;
      void main(){float age=fract(position.x+uProgress*.8);float front=(-.15+uProgress*1.3)*2.-1.;
      vec3 p=vec3((front-age*.11)*2.2*uAspect,(position.y-.5)*4.5,(position.z-.5)*1.3);
      p.y+=sin(age*3.14+position.z*6.)*.05;vec4 mv=modelViewMatrix*vec4(p,1.);
      gl_Position=projectionMatrix*mv;gl_PointSize=1.+position.z*1.5;
      vAlpha=sin(uProgress*3.14159)*sin(age*3.14159)*.24;}`,
    fragmentShader: `varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(.42,.32,.23,exp(-d*d*18.)*vAlpha);}`
  });
  scene.add(new THREE.Points(dustGeometry, dustMaterial));
  let progress = 0;
  const render = p => { progress = p; if (document.hidden) return; uniforms.uProgress.value = p; renderer.render(scene, camera); };
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height;
    uniforms.uAspect.value = camera.aspect; camera.updateProjectionMatrix(); render(progress);
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  return { render, dispose() {
    observer.disconnect(); sheenGeometry.dispose(); sheenMaterial.dispose();
    dustGeometry.dispose(); dustMaterial.dispose(); renderer.dispose(); renderer.domElement.remove();
  } };
}
