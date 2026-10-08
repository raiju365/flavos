import './header-texture.css';

// A small difference-blended trail modulates the painting, not its position.
export function initHeroMouseTexture() {
  const hero = document.querySelector('#hero');
  const image = hero?.querySelector('.hero-bg-base');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  if (!image || motion.matches || !pointer.matches) return () => {};
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-bg-img hero-grain-surface';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return () => {};
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const trail = document.createElement('canvas');
  trail.width = trail.height = 256;
  const ctx = trail.getContext('2d');
  const program = gl.createProgram();
  const shaders = [];
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    shaders.push(shader);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program, shader);
  };
  try {
    compile(gl.VERTEX_SHADER, 'attribute vec2 p; varying vec2 uv; void main(){uv=(p+1.0)*0.5;gl_Position=vec4(p,0.,1.);}');
    compile(gl.FRAGMENT_SHADER, `precision mediump float;
      varying vec2 uv; uniform sampler2D picture; uniform sampler2D trail;
      uniform vec2 fit; uniform vec2 resolution; uniform float time;
      float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){
        float influence=texture2D(trail,uv).r;
        float grain=noise(floor(uv*resolution)+floor(time*24.0));
        vec2 cell=floor(uv*resolution/3.0);
        vec2 shift=vec2(noise(cell)-.5,noise(cell+19.0)-.5);
        vec2 sampleUV=uv*fit+(1.0-fit)*vec2(.5,.8)+shift*influence*.014;
        vec3 color=texture2D(picture,sampleUV).rgb;
        color+=(grain-.5)*influence*.38;
        gl_FragColor=vec4(color,1.);
      }`);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  } catch {
    shaders.forEach(shader => gl.deleteShader(shader)); gl.deleteProgram(program);
    return () => {};
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  let source = image;
  const textures = [0,1].map(unit => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0+unit); gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    return texture;
  });
  gl.uniform1i(gl.getUniformLocation(program,'picture'),0);
  gl.uniform1i(gl.getUniformLocation(program,'trail'),1);
  const uniforms = Object.fromEntries(['fit','resolution','time'].map(key=>[key,gl.getUniformLocation(program,key)]));
  let ready=false, disposed=false, visible=true, frame=0, last=0, until=0, pending=null;
  const enabled = () => ready&&!disposed&&visible&&!document.hidden&&!motion.matches&&pointer.matches;
  function clearTrail() {
    ctx.globalCompositeOperation='source-over'; ctx.fillStyle='#000';ctx.fillRect(0,0,256,256);
  }
  function render(now=0) {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,textures[1]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,trail);
    gl.uniform1f(uniforms.time,now/1000);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  function tick(now) {
    frame=0;
    if(!enabled()) return;
    const dt=Math.min(100,now-last||16);last=now;
    ctx.globalCompositeOperation='source-over';
    ctx.fillStyle=`rgba(0,0,0,${1-Math.exp(-dt/155)})`;ctx.fillRect(0,0,256,256);
    if(pending){
      const {x,y}=pending;pending=null;
      const radius=24;
      const brush=ctx.createRadialGradient(x,y,0,x,y,radius);
      brush.addColorStop(0,'rgba(255,255,255,.65)');brush.addColorStop(.4,'rgba(255,255,255,.3)');brush.addColorStop(1,'rgba(255,255,255,0)');
      ctx.globalCompositeOperation='difference';ctx.fillStyle=brush;
      ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
    }
    if(now>=until){clearTrail();canvas.dataset.textureState='idle';}
    else {frame=requestAnimationFrame(tick);canvas.dataset.textureState='active';}
    render(now);
  }
  function resize() {
    if(!ready||disposed)return;
    const width=image.clientWidth,height=image.clientHeight;
    const scale=Math.min(1.25,devicePixelRatio,Math.sqrt(1800000/(width*height)));
    canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    gl.viewport(0,0,canvas.width,canvas.height);
    const ratio=width/height,sourceRatio=(source.naturalWidth||source.width)/(source.naturalHeight||source.height);
    gl.uniform2f(uniforms.fit,Math.min(1,ratio/sourceRatio),Math.min(1,sourceRatio/ratio));
    gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
    render();
  }
  function reset() {
    cancelAnimationFrame(frame);frame=0;pending=null;clearTrail();
    canvas.dataset.textureState='idle';
    hero.classList.toggle('has-mouse-texture',enabled());
    if(ready&&!disposed)render();
  }
  image.after(canvas);
  clearTrail();
  const collage = [...hero.querySelectorAll('.hero-collage img')];
  Promise.all([image.decode(), ...collage.map(tile=>tile.decode())]).then(()=>{
    if(disposed)return;
    if(collage.length){
      source=document.createElement('canvas');source.width=1200;source.height=984;
      const paint=source.getContext('2d');
      collage.forEach((tile,index)=>{
        const w=600,h=492,scale=Math.max(w/tile.naturalWidth,h/tile.naturalHeight);
        const sw=w/scale,sh=h/scale;
        paint.drawImage(tile,(tile.naturalWidth-sw)/2,(tile.naturalHeight-sh)/2,sw,sh,(index%2)*w,Math.floor(index/2)*h,w,h);
      });
    }
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textures[0]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    ready=true;resize();reset();
  }).catch(()=>{canvas.style.display='none';});
  hero.addEventListener('pointermove',event=>{
    if(!enabled()||event.pointerType==='touch'||document.documentElement.classList.contains('is-colonnade-transitioning'))return;
    const rect=canvas.getBoundingClientRect();
    pending={x:(event.clientX-rect.left)/rect.width*256,y:(event.clientY-rect.top)/rect.height*256};
    until=performance.now()+650;
    if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}
  },{...options,passive:true});
  document.addEventListener('visibilitychange',reset,options);
  motion.addEventListener('change',reset,options);pointer.addEventListener('change',reset,options);
  window.addEventListener('pagehide',reset,options);
  window.addEventListener('pageshow',reset,options);
  canvas.addEventListener('webglcontextlost',()=>{ready=false;reset();},options);
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;reset();});observer.observe(hero);
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(image);
  return ()=>{
    disposed=true;cancelAnimationFrame(frame);abort.abort();observer.disconnect();resizeObserver.disconnect();
    hero.classList.remove('has-mouse-texture');canvas.remove();
    textures.forEach(texture=>gl.deleteTexture(texture));shaders.forEach(shader=>gl.deleteShader(shader));
    gl.deleteBuffer(buffer);gl.deleteProgram(program);
  };
}
