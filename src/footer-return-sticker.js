import './footer-return-sticker.css';

const vertex = `
attribute vec2 point;
uniform vec2 resolution, origin;
uniform float size, rotation, peel, flight;
varying vec2 uv;
varying vec3 paperNormal;
void main() {
  uv=point+.5;
  vec2 direction=normalize(vec2(1.,1.));
  float line=mix(.505,-.61,peel);
  float distance=max(0.,dot(point,direction)-line);
  float radius=.13;
  float unfold=smoothstep(0.,.65,flight);
  float maxAngle=mix(2.05,.06,unfold);
  float angle=min(distance/radius,maxAngle);
  float tail=max(0.,distance-radius*maxAngle);
  float curved=radius*sin(angle)+tail*cos(angle);
  vec3 position=vec3(point+direction*(curved-distance),radius*(1.-cos(angle))+tail*sin(angle));
  paperNormal=vec3(-direction*sin(angle),cos(angle));
  float turn=rotation-.32*sin(flight*3.14159265);
  mat2 spin=mat2(cos(turn),sin(turn),-sin(turn),cos(turn));
  position.xy=spin*position.xy;
  position*=size*(1.-flight*.18);
  position.z+=size*.22*sin(flight*3.14159265);
  float focal=resolution.y*1.58;
  float perspective=focal/(focal-position.z);
  vec2 travel=vec2(-size*.18,-origin.y-size*1.6)*flight;
  vec2 screen=origin+travel+position.xy*perspective;
  vec2 clip=screen/resolution*2.-1.;
  gl_Position=vec4(clip.x,-clip.y,-position.z/(size*4.),1.);
}`;

const fragment = `
precision highp float;
uniform sampler2D artwork;
varying vec2 uv;
varying vec3 paperNormal;
void main() {
  vec4 print=texture2D(artwork,uv);
  if(print.a<.025) discard;
  float grain=fract(sin(dot(floor(uv*700.),vec2(12.9898,78.233)))*43758.5453);
  vec3 back=vec3(.965,.95,.91)-grain*.012;
  vec3 color=gl_FrontFacing?print.rgb:back;
  float light=.74+.26*abs(normalize(paperNormal).z);
  gl_FragColor=vec4(color*light,print.a);
}`;

export function createFooterReturnSticker(overlay) {
  const button=document.querySelector('.footer-return-sticker');
  const image=button?.querySelector('img');
  const canvas=document.createElement('canvas');
  canvas.className='footer-return-peel';canvas.setAttribute('aria-hidden','true');
  canvas.dataset.phase='idle';overlay.append(canvas);
  const abort=new AbortController();
  let gl,program,buffer,texture,uniforms,vertexCount=0;
  let attempted=false,disposed=false,visible=false,active=false,pose=null;
  let peel=0,flight=0;
  const capture=()=>{
    if(!button||!image?.complete||!image.naturalWidth)return null;
    const bounds=button.getBoundingClientRect();
    if(bounds.bottom<0||bounds.top>innerHeight||!bounds.width)return null;
    const matrix=new DOMMatrixReadOnly(getComputedStyle(image).transform);
    return {x:bounds.left+bounds.width/2+matrix.e,y:bounds.top+bounds.height/2+matrix.f,
      size:bounds.width*Math.hypot(matrix.a,matrix.b),rotation:Math.atan2(matrix.b,matrix.a)};
  };
  const prepare=()=>{
    if(disposed||!image?.complete||!image.naturalWidth)return false;
    if(program)return !gl.isContextLost();
    if(attempted)return false;
    attempted=true;
    try {
      gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,premultipliedAlpha:false,powerPreference:'low-power'});
      if(!gl)return false;
      const compile=(type,source)=>{
        const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
        return shader;
      };
      const shaders=[compile(gl.VERTEX_SHADER,vertex),compile(gl.FRAGMENT_SHADER,fragment)];
      program=gl.createProgram();shaders.forEach(shader=>gl.attachShader(program,shader));gl.linkProgram(program);
      shaders.forEach(shader=>gl.deleteShader(shader));
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const points=[],steps=64;
      for(let y=0;y<steps;y++)for(let x=0;x<steps;x++){
        const left=x/steps-.5,right=(x+1)/steps-.5,top=y/steps-.5,bottom=(y+1)/steps-.5;
        points.push(left,top,left,bottom,right,top,right,top,left,bottom,right,bottom);
      }
      vertexCount=points.length/2;
      buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STATIC_DRAW);
      const attribute=gl.getAttribLocation(program,'point');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
      uniforms=Object.fromEntries(['resolution','origin','size','rotation','peel','flight'].map(name=>[name,gl.getUniformLocation(program,name)]));
      texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.generateMipmap(gl.TEXTURE_2D);
      gl.uniform1i(gl.getUniformLocation(program,'artwork'),0);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      // Warm the driver and texture while the footer is entering view. The
      // first visible peel must not pay for deferred shader compilation.
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.uniform2f(uniforms.resolution,1,1);gl.uniform2f(uniforms.origin,.5,.5);
      gl.uniform1f(uniforms.size,.8);gl.uniform1f(uniforms.rotation,0);
      gl.uniform1f(uniforms.peel,.45);gl.uniform1f(uniforms.flight,0);
      gl.drawArrays(gl.TRIANGLES,0,vertexCount);gl.finish();
      canvas.dataset.renderer='webgl';
      return true;
    } catch(error) {
      console.warn('Return sticker peel unavailable:',error);
      if(program)gl?.deleteProgram(program);program=null;
      return false;
    }
  };
  const render=()=>{
    if(!active||!program||gl.isContextLost())return;
    gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
    gl.uniform2f(uniforms.resolution,innerWidth,innerHeight);gl.uniform2f(uniforms.origin,pose.x,pose.y);
    for(const [key,value]of Object.entries({size:pose.size,rotation:pose.rotation,peel,flight}))gl.uniform1f(uniforms[key],value);
    gl.drawArrays(gl.TRIANGLES,0,vertexCount);
    canvas.dataset.peel=peel.toFixed(4);canvas.dataset.flight=flight.toFixed(4);
    canvas.dataset.phase=flight>0?'flying':'peeling';
  };
  const resize=(updatePose=true)=>{
    if(!active)return;
    const next=updatePose?capture():null;if(next)pose=next;
    const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt(1800000/(innerWidth*innerHeight)));
    canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);render();
  };
  const reset=()=>{
    active=false;peel=flight=0;canvas.classList.remove('is-active');
    canvas.dataset.phase='idle';canvas.dataset.peel='0.0000';canvas.dataset.flight='0.0000';
    button?.classList.remove('is-peeled');button?.removeAttribute('aria-busy');
    if(gl&&!gl.isContextLost())gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  };
  window.addEventListener('resize',()=>resize(),{signal:abort.signal,passive:true});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();reset();},{signal:abort.signal});
  canvas.addEventListener('webglcontextrestored',()=>{
    program=buffer=texture=null;attempted=false;if(visible&&!disposed)prepare();
  },{signal:abort.signal});
  const observer=button?new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)prepare();}):null;
  if(button)observer.observe(button);
  image?.decode().then(()=>{if(visible&&!disposed)prepare();}).catch(()=>{});
  return {
    capture,
    start(sourcePose){
      if(!sourcePose||!prepare())return false;
      pose=sourcePose;peel=flight=0;active=true;resize(false);
      canvas.classList.add('is-active');button.classList.add('is-peeled');button.setAttribute('aria-busy','true');render();
      return true;
    },
    peel(value){peel=Math.max(0,Math.min(1,value));render();},
    fly(value){flight=Math.max(0,Math.min(1,value));render();},
    hide(){active=false;canvas.classList.remove('is-active');canvas.dataset.phase='departed';},
    reset,
    destroy(){
      disposed=true;reset();abort.abort();observer?.disconnect();
      if(gl){gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);}
      canvas.remove();
    },
  };
}
