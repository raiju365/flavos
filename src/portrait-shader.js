// The transition vocabulary is informed by Codrops' SDF, displacement and
// click-origin shader studies. Each state deliberately changes image structure,
// not merely cursor behaviour or a colour preset.
export function createPortraitShader(card, source, reduced) {
  const canvas = document.createElement('canvas');
  canvas.className = 'portrait-shader';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    powerPreference: 'high-performance'
  });
  if (!gl) return null;

  const vertex = `precision highp float;
  attribute vec2 position;
  varying vec2 uv;
  uniform float particlePass,time,hover,toMode,fromMode,progress,aspect;
  uniform vec2 pointer,resolution;

  float hash(vec2 p){
    vec3 h=fract(vec3(p.xyx)*.1031);
    h+=dot(h,h.yzx+33.33);
    return fract((h.x+h.y)*h.z);
  }

  void main(){
    uv=position*.5+.5;
    vec2 p=uv;
    if(particlePass>.5){
      float seed=hash(uv*173.0);
      float phase=seed*62.83;
      float t=time*(.32+seed*.58);
      vec2 drift=vec2(sin(t+phase)+sin(t*1.73+phase*.7),cos(t*.83+phase)+sin(t*1.31+phase*.3))*.006;
      vec2 d=(uv-pointer)*vec2(aspect,1.0);
      float force=exp(-dot(d,d)*54.0)*hover;
      drift+=normalize(d+vec2(.0001))*.065*force/vec2(aspect,1.0);
      p+=drift;
      gl_PointSize=mix(1.15,2.35,seed)*(resolution.x/530.0);
    }
    gl_Position=vec4(p*2.0-1.0,0.0,1.0);
  }`;

  const fragment = `precision highp float;
  varying vec2 uv;
  uniform sampler2D photo;
  uniform sampler2D backdrop;
  uniform float fromMode,toMode,progress,aspect,time,hover,particlePass;
  uniform vec2 origin,pointer,resolution;
  uniform float photoAspect;

  float hash(vec2 p){
    vec3 h=fract(vec3(p.xyx)*.1031);
    h+=dot(h,h.yzx+33.33);
    return fract((h.x+h.y)*h.z);
  }
  float valueNoise(vec2 p){
    vec2 i=floor(p),f=fract(p);
    f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);
  }
  float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}

  vec3 scene(vec2 p){
    p=clamp(p,.001,.999);
    vec2 imageUV=p;
    if(aspect>photoAspect) imageUV.y=(p.y-.5)*(photoAspect/aspect)+.5;
    else imageUV.x=(p.x-.5)*(aspect/photoAspect)+.5;
    imageUV=clamp(imageUV,.001,.999);
    vec4 person=texture2D(photo,imageUV);
    return mix(texture2D(backdrop,p).rgb,person.rgb,person.a);
  }

  vec2 pointerField(vec2 p,float strength){
    vec2 d=(p-pointer)*vec2(aspect,1.0);
    float influence=exp(-dot(d,d)*27.0)*hover;
    return normalize(d+vec2(.0001))*influence*strength/vec2(aspect,1.0);
  }

  vec3 treatment(vec2 p,float mode){
    vec2 q=(p-.5)*vec2(aspect,1.0);
    float grain=hash(floor(p*resolution*.72)+floor(time*18.0));

    // 01 / ARCHIVE GRAIN — restrained photographic print and moving film grain.
    if(mode<.5){
      vec3 col=scene(p+pointerField(p,.012));
      float grey=luma(col);
      col=mix(col,vec3(grey),.13);
      col*=mix(.965,1.035,grain);
      col*=1.0-dot(q,q)*.12;
      return mix(col,vec3(.88,.82,.70)*grey,.055);
    }

    // 02 / INK TIDE — fluid UV currents and a warm/cold pigment separation.
    if(mode<1.5){
      float n=valueNoise(p*4.2+vec2(time*.11,-time*.08));
      vec2 curl=vec2(sin((p.y+n)*13.0+time*.7),cos((p.x-n)*11.0-time*.55))*.018;
      vec3 col=scene(p+curl+pointerField(p,-.055));
      float tone=luma(col);
      vec3 shadow=vec3(.025,.035,.09);
      vec3 paper=vec3(.92,.48,.23);
      vec3 ink=mix(shadow,paper,smoothstep(.12,.88,tone+n*.12));
      return mix(col,ink,.72);
    }

    // 03 / PRISMATIC LENS — genuine per-channel refraction around the pointer.
    if(mode<2.5){
      vec2 d=(p-pointer)*vec2(aspect,1.0);
      float lens=exp(-dot(d,d)*10.0)*(0.55+hover*.45);
      vec2 ray=normalize(d+vec2(.0001))/vec2(aspect,1.0);
      float shift=.006+.022*lens;
      float r=scene(p+ray*shift).r;
      float g=scene(p-ray*shift*.18).g;
      float b=scene(p-ray*shift).b;
      vec3 col=vec3(r,g,b);
      float caustic=pow(max(0.0,sin(length(d)*33.0-time*1.6)),10.0)*lens;
      return col+vec3(.30,.44,.82)*caustic;
    }

    // 04 / KINETIC RELIEF — luminance becomes engraved topography and light.
    if(mode<3.5){
      vec2 px=1.5/resolution;
      vec3 base=scene(p+pointerField(p,.025));
      float c=luma(base);
      float gx=luma(scene(p+vec2(px.x,0.0)))-luma(scene(p-vec2(px.x,0.0)));
      float gy=luma(scene(p+vec2(0.0,px.y)))-luma(scene(p-vec2(0.0,px.y)));
      float ridge=abs(sin(c*42.0+valueNoise(p*7.0)*3.2));
      vec3 metal=mix(vec3(.035,.055,.075),vec3(.80,.64,.40),c);
      metal+=vec3(.62,.78,1.0)*max(0.0,gx-gy)*4.2;
      metal*=.78+.22*smoothstep(.18,.82,ridge);
      return mix(base,metal,.78);
    }

    // 05 / RASTER BLOOM — a living risograph screen, not a colour overlay.
    if(mode<4.5){
      vec3 base=scene(p+pointerField(p,-.018));
      float tone=luma(base);
      float cellSize=mix(5.5,8.0,.5+.5*sin(time*.35));
      vec2 cell=fract(p*resolution/cellSize)-.5;
      float dotShape=1.0-smoothstep(.08,.48,length(cell));
      float ink=step(1.0-tone*.88,dotShape);
      vec3 paper=vec3(.92,.885,.78);
      vec3 navy=vec3(.035,.055,.15);
      vec3 coral=vec3(.92,.24,.13);
      vec3 print=mix(paper,navy,ink);
      print=mix(print,coral,ink*smoothstep(.56,.93,base.r-base.b*.22));
      return mix(print,base,.13);
    }

    // 06 / CHROMATIC DUST — the only particle state in the collection.
    vec3 base=scene(p+pointerField(p,-.075));
    float tone=luma(base);
    return mix(vec3(.012,.016,.027),base*vec3(.72,.82,1.12),.22+.15*tone);
  }

  float transitionMask(vec2 p,float mode,float t){
    vec2 q=(p-origin)*vec2(aspect,1.0);
    float mask=0.0;
    if(mode<.5){
      float radius=mix(-.08,1.55,t);
      mask=1.0-smoothstep(radius-.055,radius+.055,length(q));
    }else if(mode<1.5){
      float ink=valueNoise(p*5.0+vec2(t*1.8,-t*.7));
      float field=length(q)+ink*.22-mix(-.12,1.72,t);
      mask=1.0-smoothstep(-.075,.075,field);
    }else if(mode<2.5){
      float field=p.x*.72+p.y*.28+.055*sin(p.y*18.0+t*8.0)-mix(-.18,1.18,t);
      mask=1.0-smoothstep(-.045,.045,field);
    }else if(mode<3.5){
      float bands=p.y+.07*sin(p.x*21.0)+.025*sin(p.x*61.0)-mix(-.16,1.18,t);
      mask=1.0-smoothstep(-.035,.035,bands);
    }else if(mode<4.5){
      vec2 tile=floor(p*vec2(14.0,20.0));
      float order=hash(tile)+length((tile+.5)/vec2(14.0,20.0)-origin)*.24;
      mask=smoothstep(order-.07,order+.07,t*1.28);
    }else{
      float dissolve=valueNoise(p*10.0)+hash(floor(p*resolution/5.0))*.28;
      mask=smoothstep(dissolve-.11,dissolve+.11,t*1.27);
    }
    if(t<=0.0)return 0.0;
    if(t>=1.0)return 1.0;
    return mask;
  }

  void main(){
    float mask=transitionMask(uv,toMode,progress);
    float pulse=sin(progress*3.14159265);

    if(particlePass>.5){
      vec2 dotPos=gl_PointCoord-.5;
      float shape=1.0-smoothstep(.22,.5,length(dotPos));
      vec3 sampled=scene(uv);
      float tone=luma(sampled);
      vec3 dust=mix(vec3(.98,.28,.13),vec3(.35,.62,1.0),tone);
      float opacity=mix(step(4.5,fromMode),step(4.5,toMode),mask);
      gl_FragColor=vec4(dust,shape*opacity*.84);
      return;
    }

    vec2 warp=vec2(0.0);
    if(toMode<1.5)warp=normalize((uv-origin)+vec2(.0001))*.026*pulse;
    else if(toMode<2.5)warp=vec2(.045,-.008)*pulse;
    else if(toMode<3.5)warp=vec2(sin(uv.y*30.0),0.0)*.018*pulse;
    else if(toMode<4.5)warp=(fract(uv*vec2(14.0,20.0))-.5)*.018*pulse;
    else warp=vec2(valueNoise(uv*12.0)-.5,valueNoise(uv.yx*11.0)-.5)*.035*pulse;

    vec3 previous=treatment(uv-warp,fromMode);
    vec3 next=treatment(uv+warp,toMode);
    vec3 color=mix(previous,next,mask);
    color+=vec3(.9,.72,.45)*pulse*(1.0-abs(mask-.5)*2.0)*.035;
    gl_FragColor=vec4(color,1.0);
  }`;

  function compile(type, text) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, text);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Portrait shader compilation failed: ${info}`);
    }
    return shader;
  }

  let program;
  let vs;
  let fs;
  try {
    vs = compile(gl.VERTEX_SHADER, vertex);
    fs = compile(gl.FRAGMENT_SHADER, fragment);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Portrait shader link failed: ${gl.getProgramInfoLog(program)}`);
    }
  } catch (error) {
    console.warn(error);
    return null;
  }

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const uniformNames = ['fromMode','toMode','progress','aspect','origin','time','hover','pointer','resolution','particlePass'];
  const uniforms = Object.fromEntries(uniformNames.map(name => [name, gl.getUniformLocation(program, name)]));

  const particleBuffer = gl.createBuffer();
  const particleCount = 46000;
  const points = new Float32Array(particleCount * 2);
  let seed = 1741;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let index = 0; index < points.length; index += 1) points[index] = random() * 2 - 1;
  gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);

  const textures = [0, 1].map(unit => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  });
  gl.uniform1i(gl.getUniformLocation(program, 'photo'), 0);
  gl.uniform1i(gl.getUniformLocation(program, 'backdrop'), 1);

  let ready = false;
  let disposed = false;
  let visible = true;
  let frame = 0;
  let start = 0;
  let from = 0;
  let to = 0;
  let pending = null;
  let dirty = true;
  let px = .5;
  let py = .5;
  let tx = .5;
  let ty = .5;
  let ox = .5;
  let oy = .5;
  let hover = 0;
  let hoverTarget = 0;

  const move = event => {
    const bounds = card.getBoundingClientRect();
    tx = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    ty = 1 - Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    if (event.type === 'pointerdown') {
      ox = tx;
      oy = ty;
    }
    hoverTarget = 1;
    wake();
  };
  const leave = () => {
    hoverTarget = 0;
    wake();
  };
  card.addEventListener('pointermove', move);
  card.addEventListener('pointerdown', move);
  card.addEventListener('pointerleave', leave);
  card.addEventListener('pointercancel', leave);

  const background = card.querySelector('.portrait-canvas-bg');
  const fallback = new Image();
  fallback.src = '/fotosebelahabout/frames/frame_001.webp';

  function upload(unit, image) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }

  function wake() {
    if (ready && !disposed && visible && !document.hidden && !frame) frame = requestAnimationFrame(draw);
  }

  function draw(time) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    const rawProgress = start ? Math.min(1, (time - start) / 1120) : 1;
    const easedProgress = rawProgress * rawProgress * (3 - 2 * rawProgress);

    if (dirty) {
      upload(1, background?.dataset.frameReady === 'true' ? background : fallback);
      dirty = false;
    }

    gl.uniform1f(uniforms.fromMode, from);
    gl.uniform1f(uniforms.toMode, to);
    gl.uniform1f(uniforms.time, reduced.matches ? 0 : time * .001);
    px += (tx - px) * .085;
    py += (ty - py) * .085;
    hover += (hoverTarget - hover) * .065;
    gl.uniform2f(uniforms.pointer, px, py);
    gl.uniform2f(uniforms.origin, ox, oy);
    gl.uniform1f(uniforms.hover, reduced.matches ? 0 : hover);
    gl.uniform1f(uniforms.progress, reduced.matches ? 1 : easedProgress);

    gl.uniform1f(uniforms.particlePass, 0);
    gl.disable(gl.BLEND);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (from > 4.5 || to > 4.5) {
      gl.uniform1f(uniforms.particlePass, 1);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, particleCount);
    }

    if (rawProgress < 1 && !reduced.matches) {
      wake();
    } else {
      start = 0;
      from = to;
      if (pending !== null) {
        const next = pending;
        pending = null;
        select(next);
      }
    }
    if (!reduced.matches) wake();
  }

  function select(index) {
    if (start && !reduced.matches) {
      pending = index;
      return;
    }
    from = to;
    to = index;
    start = reduced.matches ? 0 : performance.now();
    wake();
  }

  function resize() {
    // Layout dimensions exclude the perspective/scroll transform.
    const bounds = { width: card.clientWidth, height: card.clientHeight };
    const dpr = Math.min(devicePixelRatio, 1.5);
    canvas.width = Math.max(1, Math.round(bounds.width * dpr));
    canvas.height = Math.max(1, Math.round(bounds.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.aspect, bounds.width / bounds.height || .658);
    wake();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(card);
  const intersection = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    wake();
  });
  intersection.observe(card);
  const refresh = () => {
    dirty = true;
    wake();
  };
  const visibility = () => wake();
  background?.addEventListener('portrait:frame', refresh);
  document.addEventListener('visibilitychange', visibility);
  reduced.addEventListener('change', visibility);

  Promise.all([source.decode(), fallback.decode()]).then(() => {
    if (disposed) return;
    upload(0, source);
    gl.uniform1f(gl.getUniformLocation(program, 'photoAspect'), source.naturalWidth / source.naturalHeight);
    ready = true;
    card.querySelector('.portrait-object').append(canvas);
    card.classList.add('has-portrait-shader');
    resize();
  }).catch(() => {});

  const lost = event => {
    event.preventDefault();
    ready = false;
    card.classList.remove('has-portrait-shader');
  };
  canvas.addEventListener('webglcontextlost', lost);

  return {
    select,
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerdown', move);
      card.removeEventListener('pointerleave', leave);
      card.removeEventListener('pointercancel', leave);
      background?.removeEventListener('portrait:frame', refresh);
      document.removeEventListener('visibilitychange', visibility);
      reduced.removeEventListener('change', visibility);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.remove();
      card.classList.remove('has-portrait-shader');
      textures.forEach(texture => gl.deleteTexture(texture));
      gl.deleteBuffer(buffer);
      gl.deleteBuffer(particleBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    }
  };
}
