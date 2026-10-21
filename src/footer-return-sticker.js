import './footer-return-sticker.css';
import {renderPixelRatio} from './runtime-quality';

const vertex = `
attribute vec2 point;
uniform vec2 resolution, origin, dimensions;
uniform float size, rotation, peel, flight;
varying vec2 uv;
varying vec3 paperNormal;
void main() {
  uv=point+.5;
  // Work in physical proportions: the portrait must stay tall through the
  // curl, perspective and flight. Peel the bottom upward toward the finger.
  vec2 paper=point*dimensions/size;
  vec2 direction=normalize(vec2(.12,1.));
  float line=mix(.515,-.61,peel);
  float distance=max(0.,dot(paper,direction)-line);
  float radius=.09;
  float unfold=smoothstep(0.,.16,flight);
  float maxAngle=mix(2.05,.06,unfold);
  float angle=min(distance/radius,maxAngle);
  float tail=max(0.,distance-radius*maxAngle);
  float curved=radius*sin(angle)+tail*cos(angle);
  vec3 position=vec3(paper+direction*(curved-distance),radius*(1.-cos(angle))+tail*sin(angle));
  paperNormal=vec3(-direction*sin(angle),cos(angle));
  // Small waves bend the free paper; the printed face stays legible as the
  // wind changes direction. No rigid spin or straight off-screen launch.
  float breeze=smoothstep(0.,.10,flight);
  float ripple=paper.y*7.-flight*30.;
  position.x+=sin(ripple)*.014*breeze;
  position.z+=sin(ripple+1.)*.045*breeze;
  paperNormal=normalize(paperNormal+vec3(0.,cos(ripple)*.28*breeze,0.));
  float yaw=sin(flight*23.)*.52*breeze;
  position.xz=mat2(cos(yaw),sin(yaw),-sin(yaw),cos(yaw))*position.xz;
  float pitch=sin(flight*17.)*.13*breeze;
  position.yz=mat2(cos(pitch),sin(pitch),-sin(pitch),cos(pitch))*position.yz;
  float turn=rotation+(sin(flight*19.)*.28+sin(flight*9.)*.12)*breeze;
  mat2 spin=mat2(cos(turn),sin(turn),-sin(turn),cos(turn));
  position.xy=spin*position.xy;
  position*=size*(1.-smoothstep(0.,.5,flight)*.22);
  position.z+=size*.22*sin(flight*3.14159265);
  float focal=resolution.y*1.58;
  float perspective=focal/(focal-position.z);
  vec2 screen=origin+position.xy*perspective;
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
  const paper=button?.querySelector('.footer-return-sticker-paper');
  const canvas=document.createElement('canvas');
  canvas.className='footer-return-peel';canvas.setAttribute('aria-hidden','true');
  canvas.dataset.phase='idle';overlay.append(canvas);
  const abort=new AbortController();
  let gl,program,buffer,texture,uniforms,vertexCount=0;
  let attempted=false,disposed=false,visible=false,active=false,pose=null;
  let peel=0,flight=0;
  // Friction responds to each stroke rather than lifting the whole sticker
  // on hover. The fixed link keeps the hit area stable while the print moves.
  const rubMedia=matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const rub={x:0,y:0,turn:0,pressure:0};
  const rubTarget={...rub};
  const rubProperties=['--sticker-rub-x','--sticker-rub-y','--sticker-rub-turn','--sticker-rub-pressure','--sticker-rub-mx','--sticker-rub-my','--sticker-rub-mask'];
  let rubFrame=0,rubClock=0,rubPointer=null;
  const stopRub=()=>{
    cancelAnimationFrame(rubFrame);rubFrame=0;rubClock=0;rubPointer=null;
    for(const key of Object.keys(rub))rub[key]=rubTarget[key]=0;
    rubProperties.forEach(key=>button?.style.removeProperty(key));
    button?.classList.remove('is-rubbing');
  };
  const paintRub=time=>{
    rubFrame=0;
    // Pointer events already establish visibility. IntersectionObserver can
    // lag behind a footer resize; it still stops the loop on actual exit.
    if(disposed||active||!rubMedia.matches){stopRub();return;}
    const dt=Math.min(40,rubClock?time-rubClock:16.7);rubClock=time;
    const follow=1-Math.exp(-dt/45),release=Math.exp(-dt/105);
    for(const key of Object.keys(rub)){
      rub[key]+=(rubTarget[key]-rub[key])*follow;
      rubTarget[key]*=release;
    }
    button.style.setProperty('--sticker-rub-x',`${rub.x.toFixed(3)}px`);
    button.style.setProperty('--sticker-rub-y',`${rub.y.toFixed(3)}px`);
    button.style.setProperty('--sticker-rub-turn',`${rub.turn.toFixed(3)}deg`);
    button.style.setProperty('--sticker-rub-pressure',rub.pressure.toFixed(3));
    if(Object.values(rub).some(value=>Math.abs(value)>.004)||Object.values(rubTarget).some(value=>Math.abs(value)>.004))
      rubFrame=requestAnimationFrame(paintRub);
    else {rubClock=0;button.classList.remove('is-rubbing');}
  };
  const strokeRub=event=>{
    if(event.pointerType==='touch'||active||!rubMedia.matches)return;
    const bounds=button.getBoundingClientRect();
    button.style.setProperty('--sticker-rub-mask',`url("${image.currentSrc||image.src}")`);
    const clamp=(value,max)=>Math.max(-max,Math.min(max,value));
    const dx=rubPointer?event.clientX-rubPointer.x:0,dy=rubPointer?event.clientY-rubPointer.y:0;
    rubPointer={x:event.clientX,y:event.clientY};
    rubTarget.x=clamp(dx*.55,3.2);rubTarget.y=clamp(dy*.32,2.2);
    rubTarget.turn=clamp(dx*.12+dy*.035,1.3);
    rubTarget.pressure=Math.min(1,Math.hypot(dx,dy)/15);
    button.style.setProperty('--sticker-rub-mx',`${Math.max(0,Math.min(100,(event.clientX-bounds.left)/bounds.width*100))}%`);
    button.style.setProperty('--sticker-rub-my',`${Math.max(0,Math.min(100,(event.clientY-bounds.top)/bounds.height*100))}%`);
    button.classList.add('is-rubbing');
    if(!rubFrame)rubFrame=requestAnimationFrame(paintRub);
  };
  button?.addEventListener('pointerenter',strokeRub,{signal:abort.signal,passive:true});
  button?.addEventListener('pointermove',strokeRub,{signal:abort.signal,passive:true});
  button?.addEventListener('pointerleave',()=>{
    rubPointer=null;for(const key of Object.keys(rubTarget))rubTarget[key]=0;
  },{signal:abort.signal,passive:true});
  button?.addEventListener('pointercancel',stopRub,{signal:abort.signal,passive:true});
  rubMedia.addEventListener('change',stopRub,{signal:abort.signal});
  const capture=()=>{
    if(!button||!image?.complete||!image.naturalWidth)return null;
    const bounds=button.getBoundingClientRect();
    if(bounds.bottom<0||bounds.top>innerHeight||!bounds.width)return null;
    const imageMatrix=new DOMMatrixReadOnly(getComputedStyle(image).transform);
    const paperMatrix=new DOMMatrixReadOnly(paper?getComputedStyle(paper).transform:'none');
    // Entry and resting motion pivot near the top, hover pivots at the center.
    const pivot=paper?getComputedStyle(paper).transformOrigin.split(' ').map(Number.parseFloat):[0,0];
    const shiftX=(pivot[0]||0)-image.offsetWidth/2;
    const shiftY=(pivot[1]||0)-image.offsetHeight/2;
    const matrix=new DOMMatrix().translate(shiftX,shiftY).multiply(paperMatrix)
      .translate(-shiftX,-shiftY).multiply(imageMatrix);
    const width=image.offsetWidth*Math.hypot(matrix.a,matrix.b);
    const height=image.offsetHeight*Math.hypot(matrix.c,matrix.d);
    return {x:bounds.left+bounds.width/2+matrix.e,y:bounds.top+bounds.height/2+matrix.f,
      width,height,size:height,rotation:Math.atan2(matrix.b,matrix.a)};
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
      const points=[],columns=16,rows=128;
      for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
        const left=x/columns-.5,right=(x+1)/columns-.5,top=y/rows-.5,bottom=(y+1)/rows-.5;
        points.push(left,top,left,bottom,right,top,right,top,left,bottom,right,bottom);
      }
      vertexCount=points.length/2;
      buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STATIC_DRAW);
      const attribute=gl.getAttribLocation(program,'point');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
      uniforms=Object.fromEntries(['resolution','origin','dimensions','size','rotation','peel','flight'].map(name=>[name,gl.getUniformLocation(program,name)]));
      texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      // Custom artwork can have non-power-of-two dimensions in WebGL 1.
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      gl.uniform1i(gl.getUniformLocation(program,'artwork'),0);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      // Warm the driver and texture while the footer is entering view. The
      // first visible peel must not pay for deferred shader compilation.
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.uniform2f(uniforms.resolution,1,1);gl.uniform2f(uniforms.origin,.5,.5);
      gl.uniform2f(uniforms.dimensions,.8*image.naturalWidth/image.naturalHeight,.8);
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
    const smooth=(from,to,value)=>{const t=Math.max(0,Math.min(1,(value-from)/(to-from)));return t*t*(3-2*t);};
    const gather=smooth(0,.42,flight),wind=Math.sin(Math.PI*flight);
    const x=pose.x+(innerWidth*.48-pose.x)*gather-Math.sin(flight*Math.PI*3)*wind*innerWidth*.21;
    const y=pose.y+(innerHeight*.4-pose.y)*gather-Math.sin(flight*Math.PI*4)*wind*innerHeight*.055
      -(innerHeight*.8+pose.size)*smooth(.84,1,flight);
    gl.uniform2f(uniforms.resolution,innerWidth,innerHeight);gl.uniform2f(uniforms.origin,x,y);
    gl.uniform2f(uniforms.dimensions,pose.width,pose.height);
    for(const [key,value]of Object.entries({size:pose.size,rotation:pose.rotation,peel,flight}))gl.uniform1f(uniforms[key],value);
    gl.drawArrays(gl.TRIANGLES,0,vertexCount);
    canvas.dataset.peel=peel.toFixed(4);canvas.dataset.flight=flight.toFixed(4);
    canvas.dataset.x=x.toFixed(1);canvas.dataset.y=y.toFixed(1);
    canvas.dataset.phase=flight>0?'flying':'peeling';
  };
  const resize=(updatePose=true)=>{
    if(!active)return;
    const next=updatePose?capture():null;if(next)pose=next;
    const ratio=renderPixelRatio(innerWidth,innerHeight);
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
  const observer=button?new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting;
    button.classList.toggle('is-sticker-visible',visible);
    if(!visible)stopRub();
    if(visible)prepare();
  },{threshold:0}):null;
  if(button)observer.observe(button);
  image?.addEventListener('load',()=>{if(visible&&!disposed)prepare();},{signal:abort.signal});
  return {
    capture,
    start(sourcePose){
      if(!sourcePose||!prepare())return false;
      pose=sourcePose;peel=flight=0;active=true;resize(false);
      canvas.classList.add('is-active');button.classList.add('is-peeled');button.setAttribute('aria-busy','true');render();
      stopRub();
      return true;
    },
    peel(value){peel=Math.max(0,Math.min(1,value));render();},
    fly(value){flight=Math.max(0,Math.min(1,value));render();},
    hide(){active=false;canvas.classList.remove('is-active');canvas.dataset.phase='departed';},
    reset,
    destroy(){
      disposed=true;stopRub();reset();abort.abort();observer?.disconnect();button?.classList.remove('is-sticker-visible');
      if(gl){gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);}
      canvas.remove();
    },
  };
}
