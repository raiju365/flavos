import * as THREE from 'three';

// Bloom only the signature's bright reflections. The final alpha stays clear
// around the mark, so the live footer gradient is never covered by a black box.
export function createSignatureFinish(renderer) {
  const type = renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const target = () => new THREE.WebGLRenderTarget(1, 1, { type, depthBuffer: false });
  const source = target(), horizontal = target(), vertical = target();
  source.depthBuffer = true;
  const scene = new THREE.Scene(), camera = new THREE.Camera();
  const geometry = new THREE.PlaneGeometry(2, 2);
  const vertexShader = 'varying vec2 finishUV; void main(){finishUV=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const blur = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: { inputImage: { value: null }, stepUV: { value: new THREE.Vector2() }, extract: { value: 1 } },
    vertexShader,
    fragmentShader: `varying vec2 finishUV;
      uniform sampler2D inputImage;
      uniform vec2 stepUV;
      uniform float extract;
      vec3 bright(vec2 uv){
        vec3 c=texture2D(inputImage,uv).rgb;
        float level=max(max(c.r,c.g),c.b);
        return c*mix(1.,smoothstep(.85,1.8,level),extract);
      }
      void main(){
        vec3 c=bright(finishUV)*.227027;
        c+=(bright(finishUV+stepUV*1.384615)+bright(finishUV-stepUV*1.384615))*.316216;
        c+=(bright(finishUV+stepUV*3.230769)+bright(finishUV-stepUV*3.230769))*.070270;
        gl_FragColor=vec4(c,1.);
      }`,
  });
  const composite = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    uniforms: { signatureImage: { value: source.texture }, glowImage: { value: vertical.texture } },
    vertexShader,
    fragmentShader: `varying vec2 finishUV;
      uniform sampler2D signatureImage,glowImage;
      void main(){
        vec4 base=texture2D(signatureImage,finishUV);
        vec3 glow=texture2D(glowImage,finishUV).rgb*.18;
        gl_FragColor=vec4(base.rgb+glow,base.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        float halo=max(max(gl_FragColor.r,gl_FragColor.g),gl_FragColor.b);
        gl_FragColor.a=max(base.a,halo);
      }`,
  });
  const quad = new THREE.Mesh(geometry, blur); quad.frustumCulled = false; scene.add(quad);
  const size = new THREE.Vector2();
  let bloomWidth = 1, bloomHeight = 1;
  return {
    resize() {
      renderer.getDrawingBufferSize(size);
      source.setSize(size.x, size.y);
      bloomWidth = Math.max(1, Math.round(size.x * .35));
      bloomHeight = Math.max(1, Math.round(size.y * .35));
      horizontal.setSize(bloomWidth, bloomHeight); vertical.setSize(bloomWidth, bloomHeight);
    },
    render(signatureScene, signatureCamera) {
      const previous = renderer.getRenderTarget();
      renderer.setRenderTarget(source); renderer.render(signatureScene, signatureCamera);
      quad.material = blur;
      blur.uniforms.inputImage.value = source.texture;
      blur.uniforms.extract.value = 1; blur.uniforms.stepUV.value.set(1.35 / bloomWidth, 0);
      renderer.setRenderTarget(horizontal); renderer.render(scene, camera);
      blur.uniforms.inputImage.value = horizontal.texture;
      blur.uniforms.extract.value = 0; blur.uniforms.stepUV.value.set(0, 1.35 / bloomHeight);
      renderer.setRenderTarget(vertical); renderer.render(scene, camera);
      quad.material = composite;
      renderer.setRenderTarget(previous); renderer.render(scene, camera);
    },
    dispose() { source.dispose(); horizontal.dispose(); vertical.dispose(); blur.dispose(); composite.dispose(); geometry.dispose(); },
  };
}

export function createSignatureGlints(model, outline, front) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const halo = ctx.createRadialGradient(128, 128, 0, 128, 128, 110);
  halo.addColorStop(0, '#ffffff'); halo.addColorStop(.08, 'rgba(220,241,255,.95)');
  halo.addColorStop(.3, 'rgba(113,179,255,.2)'); halo.addColorStop(1, 'rgba(113,179,255,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, 256, 256);
  for (const [angle, length, width] of [[0, 124, 6], [Math.PI / 2, 124, 6], [Math.PI / 4, 48, 2], [-Math.PI / 4, 48, 2]]) {
    ctx.save(); ctx.translate(128, 128); ctx.rotate(angle);
    const ray = ctx.createLinearGradient(-length, 0, length, 0);
    ray.addColorStop(0, 'rgba(255,255,255,0)'); ray.addColorStop(.5, '#fff'); ray.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = ray; ctx.beginPath(); ctx.moveTo(-length, 0); ctx.lineTo(0, -width); ctx.lineTo(length, 0); ctx.lineTo(0, width); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const vertices = outline.shapes.flatMap(shape => shape.points);
  const sprites = [[.16,.16],[.35,.86],[.73,.31],[.95,.75]].map(([tx, ty]) => {
    const point = vertices.reduce((best, p) => Math.hypot(p[0]/outline.width-tx,p[1]/outline.height-ty) < Math.hypot(best[0]/outline.width-tx,best[1]/outline.height-ty) ? p : best);
    const material = new THREE.SpriteMaterial({ map: texture, color: new THREE.Color().setRGB(1.5,1.8,2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, toneMapped: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.set((point[0]/outline.width-.5)*10,(.5-point[1]/outline.height)*10*outline.height/outline.width,front+.025);
    model.add(sprite); return sprite;
  });
  return {
    update(time, reaction, reduced) {
      sprites.forEach((sprite, i) => {
        const phase = ((time * .22 + i * .29) % 1 - .5) / .18;
        const pulse = !reduced && phase > 0 && phase < 1 ? Math.pow(Math.sin(phase * Math.PI), 3) : 0;
        sprite.material.opacity = pulse * (.65 + reaction * .3);
        sprite.scale.setScalar(.23 + pulse * .32);
      });
    },
    dispose() { sprites.forEach(sprite => { model.remove(sprite); sprite.material.dispose(); }); texture.dispose(); },
  };
}
