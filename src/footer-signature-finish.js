import * as THREE from 'three';

// A restrained optical bloom on the hottest reflections. The final alpha stays clear
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
        return c*mix(1.,smoothstep(1.5,3.5,level),extract);
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
        vec3 glow=texture2D(glowImage,finishUV).rgb*.045;
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
      bloomWidth = Math.max(1, Math.round(size.x * .5));
      bloomHeight = Math.max(1, Math.round(size.y * .5));
      horizontal.setSize(bloomWidth, bloomHeight); vertical.setSize(bloomWidth, bloomHeight);
    },
    render(signatureScene, signatureCamera) {
      const previous = renderer.getRenderTarget();
      renderer.setRenderTarget(source); renderer.render(signatureScene, signatureCamera);
      quad.material = blur;
      blur.uniforms.inputImage.value = source.texture;
      blur.uniforms.extract.value = 1; blur.uniforms.stepUV.value.set(.6 / bloomWidth, 0);
      renderer.setRenderTarget(horizontal); renderer.render(scene, camera);
      blur.uniforms.inputImage.value = horizontal.texture;
      blur.uniforms.extract.value = 0; blur.uniforms.stepUV.value.set(0, .6 / bloomHeight);
      renderer.setRenderTarget(vertical); renderer.render(scene, camera);
      quad.material = composite;
      renderer.setRenderTarget(previous); renderer.render(scene, camera);
    },
    dispose() { source.dispose(); horizontal.dispose(); vertical.dispose(); blur.dispose(); composite.dispose(); geometry.dispose(); },
  };
}

export function createSignatureGlints(scene) {
  // Small studio lights produce actual specular highlights on the bevel,
  // walls and vinyl. The surface normal controls their appearance and size;
  // no star sprites or timed opacity pulses sit above the material.
  const lights = [new THREE.DirectionalLight('#ffffff', 1.5), new THREE.DirectionalLight('#e9f0ff', .75)];
  lights.forEach(light => scene.add(light));
  return {
    update(time, reaction, reduced) {
      const clock = reduced ? 0 : time;
      lights[0].position.set(-3 + Math.sin(clock * .19) * .8, 4, 6);
      lights[1].position.set(4, -3 + Math.sin(clock * .16) * .7, 3);
      lights[0].intensity = 1.5 + reaction * .15;
      lights[1].intensity = .75 + reaction * .08;
    },
    dispose() { lights.forEach(light => { scene.remove(light); light.dispose(); }); },
  };
}
