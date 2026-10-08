// A distance field gives the opening a continuous edge at every camera distance.
// The field is generated from our local silhouette, not from a remote texture.
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
uniform sampler2D field, trail;
uniform vec2 resolution;
uniform float size, distance, progress, entry, clock, reduced;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
}
float sdf(vec2 p) {
  if(p.x<0. || p.x>1. || p.y<0. || p.y>1.) return .125;
  return (dot(texture2D(field,p).rg,vec2(256.,1.))/257.-.5)*.25;
}
void main() {
  vec2 screen=vec2(uv.x,1.-uv.y);
  vec2 center=vec2(.5,.49);
  // Project a foreground plane approaching the camera; the background uses
  // its own projection and therefore cannot grow at the same rate as this edge.
  vec2 q=(screen-center)*resolution/size*distance;
  float r2=dot(q,q);
  // A monotonic lens map stretches the rim without folding distant pixels
  // back into the silhouette (which would produce duplicate holes).
  q /= 1.+progress*2.2*exp(-1.8*r2);
  vec2 material=q+.5;
  float touch=texture2D(trail,screen).r*(1.-reduced)*pow(1.-progress,3.);
  float fibres=noise(material*vec2(1150.,31.));
  float grit=noise(material*830.);
  vec2 shift=vec2(fibres-.5,grit-.5)*touch*.06;
  // Fine erosion is attached to the material, not an overlay on the white page.
  float d=sdf(material+shift);
  d+=(noise(material*410.)-.5)*.0008*(1.-reduced);
  float dotField=length((screen-center)*resolution/resolution.y)-.009;
  d=mix(dotField,d,smoothstep(0.,1.,entry));
  float edgeWidth=.009 + .003*progress;
  float alpha=smoothstep(-edgeWidth,edgeWidth*.6,d);
  // A broad inner shoulder makes a smoky material rim with etched radial fibres.
  float shoulder=(1.-smoothstep(.0,.032,abs(d)))*(1.-alpha);
  vec2 radial=material-vec2(.5,.5);
  float angle=atan(radial.y,radial.x);
  float striation=noise(vec2(angle*160.,length(radial)*20.));
  float grain=hash(floor(screen*resolution)+floor(clock*18.));
  float edge=shoulder*(.12+.035*striation+.024*(grain-.5));
  alpha=clamp(alpha+edge+touch*.16*(grit-.5)*(1.-alpha),0.,1.);
  // The white material passes the camera geometrically. No painting crossfade.
  if(reduced>.5) alpha*=1.-smoothstep(.05,.7,progress);
  gl_FragColor=vec4(vec3(1.),alpha);
}`;

export function createApertureRenderer(canvas, source) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return null;
  let program, buffer, shaders=[], textures=[], uniforms, field, lost=false, disposed=false;
  const trail = document.createElement('canvas'); trail.width=trail.height=256;
  const ctx=trail.getContext('2d');
  let lastTime=0, activeUntil=0, pending=[], lastPoint=null;
  function clearTrail() { ctx.globalCompositeOperation='source-over'; ctx.fillStyle='#000';ctx.fillRect(0,0,256,256); }
  clearTrail();
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
    uniforms=Object.fromEntries(['resolution','size','distance','progress','entry','clock','reduced'].map(n=>[n,gl.getUniformLocation(program,n)]));
    textures=[field,trail].map((image,unit)=>{
      const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);
      for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
      for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      gl.uniform1i(gl.getUniformLocation(program,unit?'trail':'field'),unit);return tex;
    });
  }
  function release() { textures.forEach(t=>gl.deleteTexture(t));shaders.forEach(s=>gl.deleteShader(s));gl.deleteProgram(program);gl.deleteBuffer(buffer); }
  function updateTrail(time) {
    const dt=Math.min(100,time-lastTime||16);lastTime=time;
    ctx.globalCompositeOperation='source-over';ctx.fillStyle=`rgba(0,0,0,${1-Math.exp(-dt/155)})`;ctx.fillRect(0,0,256,256);
    for(const point of pending) {
      const brush=ctx.createRadialGradient(point.x,point.y,0,point.x,point.y,24);
      brush.addColorStop(0,'rgba(255,255,255,.75)');brush.addColorStop(1,'rgba(255,255,255,0)');
      ctx.globalCompositeOperation='difference';ctx.fillStyle=brush;ctx.fillRect(point.x-24,point.y-24,48,48);
    }
    pending=[];
    if(time>activeUntil)clearTrail();
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,textures[1]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,trail);
  }
  const onLost=e=>{e.preventDefault();lost=true;canvas.style.visibility='hidden';};
  const onRestore=()=>{if(disposed||!field)return;setup();lost=false;canvas.dispatchEvent(new Event('aperture-restored'));};
  canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestore);
  return {
    prepare() { if(field||disposed)return;field=distanceField(source);setup(); },
    pointer(x,y,time) {
      const point={x:x*256,y:y*256};
      if(lastPoint){const steps=Math.min(12,Math.ceil(Math.hypot(point.x-lastPoint.x,point.y-lastPoint.y)/4));for(let i=1;i<steps;i++)pending.push({x:lastPoint.x+(point.x-lastPoint.x)*i/steps,y:lastPoint.y+(point.y-lastPoint.y)*i/steps});}
      pending.push(point);lastPoint=point;activeUntil=time+700;
    },
    reset() {pending=[];lastPoint=null;activeUntil=0;clearTrail();},
    draw({width,height,size,distance,progress,entry,reduced,time}) {
      if(!field||lost||disposed)return;
      gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(program);updateTrail(time);
      gl.uniform2f(uniforms.resolution,width,height);
      for(const [key,value] of Object.entries({size,distance,progress,entry,clock:time/1000,reduced:+reduced}))gl.uniform1f(uniforms[key],value);
      gl.drawArrays(gl.TRIANGLES,0,6);
      canvas.dataset.trailState=time<activeUntil?'active':'idle';
    },
    get activeUntil(){return activeUntil;},
    destroy(){disposed=true;canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestore);release();}
  };
}
