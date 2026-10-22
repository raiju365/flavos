import './footer-return-sticker.css';
import {sampleReturnWind} from './transition/returnWind';

export function createFooterReturnSticker(overlay) {
  const button=document.querySelector('.footer-return-sticker');
  const image=button?.querySelector('img');
  const paper=button?.querySelector('.footer-return-sticker-paper');
  // Move the already decoded image itself. A second canvas used to change
  // its sharpness/color and compile shaders on the first interaction.
  const sheet=document.createElement('div');
  sheet.className='footer-return-peel';sheet.setAttribute('aria-hidden','true');
  sheet.dataset.phase='idle';sheet.dataset.renderer='original-image';overlay.append(sheet);
  const abort=new AbortController();
  let disposed=false,active=false,pose=null,originalStyle,sourceMarker;
  let peel=0,flight=0,body;
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
  const render=()=>{
    if(!active||!pose)return;
    const smooth=(from,to,value)=>{const t=Math.max(0,Math.min(1,(value-from)/(to-from)));return t*t*(3-2*t);};
    const x=body.x*innerWidth;
    const y=body.y*innerHeight-(innerHeight*1.25+pose.size)*smooth(.83,1,flight);
    const breeze=smooth(0,.1,flight),release=Math.sin(Math.PI*peel)*(1-breeze);
    const turn=pose.rotation+body.angle*breeze;
    const scale=(1-smooth(0,.5,flight)*.22)*Math.min(1,innerHeight/pose.viewportHeight);
    const yaw=body.yaw*breeze+release*8;
    const pitch=body.pitch*breeze-release*9;
    sheet.style.transform=`translate3d(${x-pose.width/2}px, ${y-pose.height/2}px, 0) perspective(1000px) rotate(${turn}rad) rotateY(${yaw}deg) rotateX(${pitch}deg) skewX(${body.spin*1.4*breeze}deg) scale(${scale})`;
    sheet.dataset.peel=peel.toFixed(4);sheet.dataset.flight=flight.toFixed(4);
    sheet.dataset.x=x.toFixed(1);sheet.dataset.y=y.toFixed(1);
    sheet.dataset.phase=flight>0?'flying':'peeling';
    sheet.dataset.wind=body.air.toFixed(4);sheet.dataset.rotation=turn.toFixed(4);
  };
  const advance=value=>{
    const target=Math.max(0,Math.min(1,value))*pose.duration;
    // Small fixed steps keep drag and angular inertia independent of frame rate.
    while(body.time<target){
      const dt=Math.min(1/90,target-body.time);body.time+=dt;
      const progress=body.time/pose.duration,air=sampleReturnWind(body.time);
      const guide=Math.min(1,progress/.48),ease=guide*guide*(3-2*guide);
      const center=pose.x/pose.viewportWidth*(1-ease)+.52*ease;
      const airX=air.side*.20+(center-body.x)*1.8;
      const airY=-.12-air.lift*.09;
      body.vx+=(airX-body.vx)*dt*2.8;body.vy+=(airY-body.vy)*dt*3.1;
      body.x+=body.vx*dt;body.y+=body.vy*dt;
      const targetAngle=Math.atan2(body.vx,.15-body.vy)*.46+air.roll*.13;
      body.spin+=((targetAngle-body.angle)*24-body.spin*7)*dt;
      body.angle+=body.spin*dt;
      body.yaw+=(air.side*27+body.spin*11-body.yaw)*dt*4;
      body.pitch+=(air.lift*11-body.pitch)*dt*3.2;body.air=air.side;
    }
    flight=Math.max(0,Math.min(1,value));render();
  };
  const reset=()=>{
    active=false;peel=flight=0;sheet.classList.remove('is-active');
    if(sourceMarker){
      sourceMarker.replaceWith(image);sourceMarker=null;
      if(originalStyle===null)image.removeAttribute('style');else image.setAttribute('style',originalStyle);
    }
    sheet.style.cssText='';
    sheet.dataset.phase='idle';sheet.dataset.peel='0.0000';sheet.dataset.flight='0.0000';
    button?.classList.remove('is-peeled');button?.removeAttribute('aria-busy');
  };
  window.addEventListener('resize',render,{signal:abort.signal,passive:true});
  const observer=button?new IntersectionObserver(([entry])=>{
    button.classList.toggle('is-sticker-visible',entry.isIntersecting);
    if(!entry.isIntersecting)stopRub();
  },{threshold:0}):null;
  if(button)observer.observe(button);
  return {
    capture,
    start(sourcePose,{duration=4.46}={}){
      if(disposed||active||!sourcePose||!image?.complete||!image.naturalWidth)return false;
      pose={...sourcePose,viewportWidth:innerWidth,viewportHeight:innerHeight,duration};
      body={time:0,x:pose.x/innerWidth,y:pose.y/innerHeight,vx:-.025,vy:-.34,angle:0,spin:0,yaw:0,pitch:0,air:0};
      peel=flight=0;active=true;
      originalStyle=image.getAttribute('style');
      sourceMarker=document.createComment('return-sticker-home');
      image.replaceWith(sourceMarker);sheet.append(image);
      image.style.transform='none';
      sheet.style.width=`${pose.width}px`;sheet.style.height=`${pose.height}px`;
      sheet.classList.add('is-active');button.classList.add('is-peeled');button.setAttribute('aria-busy','true');
      render();stopRub();
      return true;
    },
    peel(value){peel=Math.max(0,Math.min(1,value));render();},
    fly:advance,
    hide(){active=false;sheet.classList.remove('is-active');sheet.dataset.phase='departed';},
    reset,
    destroy(){
      disposed=true;stopRub();reset();abort.abort();observer?.disconnect();button?.classList.remove('is-sticker-visible');sheet.remove();
    },
  };
}
