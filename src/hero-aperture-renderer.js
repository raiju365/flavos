// A distance field gives the opening a continuous edge at every camera distance.
// The field is generated from a fresh procedural outline for each visit.
function distanceField(image) {
  const n = 1024, raster = document.createElement('canvas');
  raster.width = raster.height = n;
  const ctx = raster.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, n, n);
  const pixels = ctx.getImageData(0, 0, n, n);
  const inside = new Float32Array(n * n), outside = new Float32Array(n * n);
  for (let i = 0; i < inside.length; i++) {
    const ink = pixels.data[i * 4 + 3] > 127;
    inside[i] = ink ? 0 : n; outside[i] = ink ? n : 0;
  }
  function sweep(a) {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (x) a[i] = Math.min(a[i], a[i - 1] + 1);
      if (y) a[i] = Math.min(a[i], a[i - n] + 1);
      if (x && y) a[i] = Math.min(a[i], a[i - n - 1] + Math.SQRT2);
      if (x < n - 1 && y) a[i] = Math.min(a[i], a[i - n + 1] + Math.SQRT2);
    }
    for (let y = n - 1; y >= 0; y--) for (let x = n - 1; x >= 0; x--) {
      const i = y * n + x;
      if (x < n - 1) a[i] = Math.min(a[i], a[i + 1] + 1);
      if (y < n - 1) a[i] = Math.min(a[i], a[i + n] + 1);
      if (x < n - 1 && y < n - 1) a[i] = Math.min(a[i], a[i + n + 1] + Math.SQRT2);
      if (x && y < n - 1) a[i] = Math.min(a[i], a[i + n - 1] + Math.SQRT2);
    }
  }
  sweep(inside); sweep(outside);
  for (let i = 0; i < inside.length; i++) {
    const v = Math.max(0, Math.min(65535, Math.round(32767.5 + (inside[i] - outside[i]) / n * 262140)));
    pixels.data.set([v >> 8, v & 255, 0, 255], i * 4);
  }
  ctx.putImageData(pixels, 0, 0);
  return raster;
}

const fragment = `precision highp float;
varying vec2 uv;
uniform sampler2D field, previousField;
uniform vec2 resolution, pointerPosition, pointerFlow;
uniform float pointerStrength;
uniform float size, distance, progress, entry, clock, reduced;
uniform float scrollVel, scratch, motionClock, shapeMix;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
}
float sdf(vec2 p) {
  if(p.x<0. || p.x>1. || p.y<0. || p.y>1.) return .125;
  vec2 encoded=mix(texture2D(previousField,p).rg,texture2D(field,p).rg,shapeMix);
  return (dot(encoded,vec2(256.,1.))/257.-.5)*.25;
}
void main() {
  vec2 screen=vec2(uv.x,1.-uv.y);
  vec2 center=vec2(.5,.49);
  vec2 q=(screen-center)*resolution/size*distance;
  float r2=dot(q,q);
  q /= 1.+progress*2.2*exp(-1.8*r2);
  // Enter through the solid central crossbar rather than the logo's white counter.
  vec2 anchor=mix(vec2(.5),vec2(.5,.465),smoothstep(0.,.55,progress));
  vec2 material=q+anchor;
  // Pull the opening along uneven radial fibres as the camera approaches.
  // The deformation stays continuous in both scroll directions.
  float pull=smoothstep(.035,.52,progress)*(1.-smoothstep(.64,.8,progress))*(1.-reduced);
  float theta=atan(q.y,q.x);
  float tension=.55+.28*sin(theta*5.+motionClock*.22)+.17*sin(theta*9.-motionClock*.13);
  material=anchor+q/(1.+pull*tension*(.6+scrollVel*.45));
  // Directional elastic displacement: a stroke carries the contour with it,
  // with a soft wake behind the pointer and a quiet lens at the leading edge.
  // Pixel-space limits keep the response consistent across viewport sizes.
  vec2 pointerDelta=(screen-pointerPosition)*resolution;
  vec2 flow=pointerFlow*resolution;
  float speed=length(flow);
  vec2 direction=flow/max(speed,1.);
  float energy=min(speed/1100.,1.);
  float reach=min(180.,resolution.x*.3);
  float along=dot(pointerDelta,direction);
  vec2 wakeDelta=pointerDelta+direction*reach*.24*energy;
  float wake=exp(-dot(wakeDelta,wakeDelta)/(reach*reach*.58));
  float influence=exp(-dot(pointerDelta,pointerDelta)/(reach*reach*.36));
  float response=pointerStrength*(1.-reduced)*(1.-smoothstep(.48,.7,progress));
  float fold=cos(along/reach*3.2)*.18+.82;
  vec2 displacement=pointerDelta*influence*.19-direction*(48.*energy)*wake*fold;
  vec2 shift=displacement/size*distance/(1.+progress*2.2)*response;

  // --- Organic jelly wobble driven by scroll velocity ---
  // Layered noise at different scales with clock-driven phase offsets.
  // Each layer has its own rhythm so the combined motion looks alive
  // but never mechanical.  scrollVel amplifies the displacement.
  float wobbleAmt = (1. - reduced)*(1.-smoothstep(.62,.8,progress));
  float phase1 = motionClock * 1.1;
  float phase2 = motionClock * 0.7;
  float phase3 = motionClock * 1.8;
  // low-freq sway (large organic pull)
  float w1x = noise(material * 3.5 + vec2(phase1, phase2 * 0.6)) - .5;
  float w1y = noise(material * 3.5 + vec2(phase2, phase1 * 0.8)) - .5;
  // mid-freq jiggle (smaller, faster ripple)
  float w2x = noise(material * 9.0 + vec2(phase3, phase1 * 1.3)) - .5;
  float w2y = noise(material * 9.0 + vec2(phase1 * 1.2, phase3)) - .5;
  // high-freq tremble (tiny nervous energy)
  float w3x = noise(material * 22. + vec2(phase2 * 2.1, phase3 * 0.9)) - .5;
  float w3y = noise(material * 22. + vec2(phase3 * 1.4, phase2 * 1.7)) - .5;
  // Combine with decreasing amplitude per octave
  vec2 wobble = vec2(w1x * .72 + w2x * (.16+.24*scrollVel) + w3x * .07*scrollVel,
                     w1y * .72 + w2y * (.16+.24*scrollVel) + w3y * .07*scrollVel);
  // Slow breathing remains at rest; scrolling adds smaller, quicker folds.
  vec2 elastic=vec2(sin(material.y*12.+phase1*1.7),cos(material.x*11.-phase2*1.9));
  shift += (wobble+elastic*.16)*wobbleAmt*(.012+.045*scrollVel);

  // Preserve one continuous contour without directional cuts or fibres.
  vec2 surface=material+shift;
  float d=sdf(surface);

  float dotField=length((screen-center)*resolution/resolution.y)-.009;
  d=mix(dotField,d,smoothstep(0.,1.,entry));
  float edgeWidth=.009+.003*progress;
  float alpha=smoothstep(-edgeWidth,edgeWidth*.6,d);
  float shoulder=(1.-smoothstep(.0,.032,abs(d)))*(1.-alpha);
  float edge=shoulder*.12;
  alpha=clamp(alpha+edge,0.,1.);
  // Clear the thin crossbar's residual edge sheen continuously before handoff.
  alpha*=1.-smoothstep(.7,.86,progress);
  if(reduced>.5) alpha*=1.-smoothstep(.05,.7,progress);
  gl_FragColor=vec4(vec3(1.),alpha);
}`;

export function createApertureRenderer(canvas, source) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return null;
  let program, buffer, shaders=[], textures=[], uniforms, field, previousField, patternTime=-5000, patternDuration=4000, lost=false, disposed=false;
  let activeUntil=0, pointerTarget=null, pointerPosition={x:.5,y:.5}, pointerStrength=0, pointerFrame=0;
  let pointerSample=null, flowTarget={x:0,y:0}, pointerFlow={x:0,y:0};
  function setup() {
    program=gl.createProgram(); shaders=[];
    for(const [type,code] of [[gl.VERTEX_SHADER,'attribute vec2 p; varying vec2 uv; void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}'],[gl.FRAGMENT_SHADER,fragment]]) {
      const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,code);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program,shader);
    }
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const attr=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
    uniforms=Object.fromEntries(['resolution','pointerPosition','pointerFlow','pointerStrength','size','distance','progress','entry','clock','reduced','scrollVel','scratch','motionClock','shapeMix'].map(n=>[n,gl.getUniformLocation(program,n)]));
    textures=[field,previousField].map((image,unit)=>{
      const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);
      for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
      for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      gl.uniform1i(gl.getUniformLocation(program,['field','previousField'][unit]),unit);return tex;
    });
  }
  function release() { textures.forEach(t=>gl.deleteTexture(t));shaders.forEach(s=>gl.deleteShader(s));gl.deleteProgram(program);gl.deleteBuffer(buffer); }
  function updatePointer(time,reduced) {
    const dt=Math.max(0,Math.min(64,pointerFrame?time-pointerFrame:16));pointerFrame=time;
    const target=pointerTarget&&time<activeUntil&&!reduced?1:0;
    pointerStrength+=(target-pointerStrength)*(1-Math.exp(-dt/(target?85:210)));
    if(pointerStrength<.001&&!target){pointerStrength=0;pointerTarget=null;}
    if(pointerTarget){
      const follow=1-Math.exp(-dt/65);
      pointerPosition.x+=(pointerTarget.x-pointerPosition.x)*follow;
      pointerPosition.y+=(pointerTarget.y-pointerPosition.y)*follow;
    }
    // Time-based decay avoids differences between 60 Hz and high-refresh mice.
    if(!pointerSample||time-pointerSample.time>45||reduced){
      const decay=Math.exp(-dt/180);
      flowTarget.x*=decay;flowTarget.y*=decay;
    }
    const momentum=1-Math.exp(-dt/90);
    pointerFlow.x+=(flowTarget.x-pointerFlow.x)*momentum;
    pointerFlow.y+=(flowTarget.y-pointerFlow.y)*momentum;
    gl.uniform2f(uniforms.pointerPosition,pointerPosition.x,pointerPosition.y);
    gl.uniform2f(uniforms.pointerFlow,pointerFlow.x,pointerFlow.y);
    gl.uniform1f(uniforms.pointerStrength,pointerStrength);
    canvas.dataset.pointerStrength=pointerStrength.toFixed(4);
    canvas.dataset.pointerMomentum=Math.hypot(pointerFlow.x,pointerFlow.y).toFixed(4);
  }
  const onLost=e=>{e.preventDefault();lost=true;canvas.style.visibility='hidden';};
  const onRestore=()=>{if(disposed||!field)return;setup();lost=false;canvas.dispatchEvent(new Event('aperture-restored'));};
  canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestore);
  return {
    prepare() { if(field||disposed)return;field=distanceField(source);previousField=field;setup(); },
    setPattern(source,time,reduced,duration=4000) {
      if(!field||disposed)return;
      previousField=field;field=distanceField(source);patternDuration=duration;patternTime=reduced?time-duration:time;
      if(lost)return;
      for(const [unit,image] of [[0,field],[1,previousField]]){
        gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,textures[unit]);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      }
    },
    pointer(x,y,time) {
      if(!pointerTarget)pointerPosition={x,y};
      if(pointerSample&&time-pointerSample.time<120){
        const seconds=Math.max(8,time-pointerSample.time)/1000;
        const vx=(x-pointerSample.x)/seconds,vy=(y-pointerSample.y)/seconds;
        const limit=Math.min(1,2/Math.max(.001,Math.hypot(vx,vy)));
        flowTarget={x:vx*limit,y:vy*limit};
      }else{flowTarget={x:0,y:0};}
      pointerSample={x,y,time};
      pointerTarget={x,y};activeUntil=time+180;
    },
    endPointer() {activeUntil=0;pointerSample=null;flowTarget={x:0,y:0};},
    reset() {pointerTarget=null;pointerStrength=0;activeUntil=0;pointerFrame=0;pointerSample=null;flowTarget={x:0,y:0};pointerFlow={x:0,y:0};},
    draw({width,height,size,distance,progress,entry,reduced,time,motionClock=0,scrollVel=0,scratch=0}) {
      if(!field||lost||disposed)return;
      gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(program);updatePointer(time,reduced);
      gl.uniform2f(uniforms.resolution,width,height);
      const blend=reduced?1:Math.max(0,Math.min(1,(time-patternTime)/patternDuration));
      gl.uniform1f(uniforms.shapeMix,blend*blend*(3-2*blend));
      canvas.dataset.shapeBlend=blend.toFixed(4);
      for(const [key,value] of Object.entries({size,distance,progress,entry,clock:reduced?0:time/1000,reduced:+reduced,scrollVel,scratch,motionClock}))gl.uniform1f(uniforms[key],value);
      gl.drawArrays(gl.TRIANGLES,0,6);
      canvas.dataset.trailState=pointerStrength>0?'active':'idle';
      canvas.dataset.pointerEffect='elastic-flow';
    },
    get activeUntil(){return activeUntil;},
    destroy(){disposed=true;canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestore);release();}
  };
}



