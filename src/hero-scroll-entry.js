import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createApertureRenderer } from './hero-aperture-renderer';
import { createAperturePattern } from './hero-aperture-pattern';
import './header-texture.css';

export function createHeroScrollEntry() {
  const hero=document.querySelector('#hero');
  const destination=hero.querySelector('.hero-destination');
  const paper=hero.nextElementSibling;
  const copy=hero.querySelector('.hero-introduction');
  const pattern=createAperturePattern(),source=pattern.canvas;
  const header=document.querySelector('.studio-header');
  // Arrival is a time-based fade after the aperture clears. Scroll still owns
  // the later logo journey, never the opacity of this first appearance.
  header?.classList.add('has-hero-nav-reveal', 'is-logo-aperture-visible');
  if(header)header.inert=true;
  let sourceReady=false;
  pattern.ready.then(()=>{sourceReady=true;prepare();}).catch(()=>{if(!disposed){canvas.style.visibility='hidden';header?.classList.remove('is-logo-aperture-visible');if(header)header.inert=false;}});
  const canvas=document.createElement('canvas');canvas.className='hero-aperture';canvas.setAttribute('aria-hidden','true');hero.append(canvas);
  const renderer=createApertureRenderer(canvas,source);
  const fallback=renderer?null:canvas.getContext('2d');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const state={entry:motion.matches?1:0,progress:0};
  hero.classList.add('has-depth-entry');canvas.dataset.renderer=renderer?'webgl':'fallback';
  let width=0,height=0,size=0,trigger,tween,entered=false,prepared=false,disposed=false,frame=0,visible=true;
  let prevProgress=0, smoothVel=0, lastFrame=0, motionClock=0;
  const smooth=v=>{const t=gsap.utils.clamp(0,1,v);return t*t*(3-2*t);};
  function paint(time=performance.now()) {
    if(!width||!height||disposed)return;
    const p=state.progress,reduced=motion.matches||!renderer;
    // Different camera distances for the foreground and painting.
    // No shared scale or opacity handoff is used between these planes.
    const distance=Math.max(.006,1-smooth(p/.78)*.994);
    // One full-bleed painting from the opening through the navbar reveal.
    const paintingScale=reduced?1:1+.08*smooth(p/.9);
    destination.style.transform=`scale(${paintingScale})`;destination.style.transformOrigin='50% 49%';
    // Keep small surface marks at a distance, then settle to an intact edge
    // before magnification can turn them into long radial slits.
    const scratchIntensity = smooth((p - .15) / .2) * (1 - smooth((p - .32) / .2));
    if(renderer&&prepared)renderer.draw({width,height,size,distance,progress:p,entry:state.entry,reduced,time,motionClock,scrollVel:smoothVel,scratch:scratchIntensity});
    if(fallback){
      fallback.clearRect(0,0,canvas.width,canvas.height);fallback.fillStyle='#fff';fallback.fillRect(0,0,width,height);
      fallback.globalCompositeOperation='destination-out';fallback.drawImage(source,width/2-size/2,height*.49-size/2,size,size);fallback.globalCompositeOperation='source-over';
      canvas.style.opacity=String(1-smooth(p/.7));
    }
    canvas.style.visibility=p>=.86?'hidden':'visible';
    const awaitingPainting=visible&&p<.86;
    header?.classList.toggle('is-logo-aperture-visible',awaitingPainting);
    if(header)header.inert=awaitingPainting;
    if(copy){copy.style.opacity=String(state.entry*(1-smooth(p/.15)));copy.style.visibility=p>=.15?'hidden':'visible';}
    hero.dataset.entryProgress=p.toFixed(4);hero.dataset.entryPhase=p>=.9?'painting':p>.001?'entering':'white';
    hero.dataset.foregroundScale=(1/distance).toFixed(4);hero.dataset.paintingScale=paintingScale.toFixed(4);
    hero.dataset.motionEnergy=smoothVel.toFixed(4);hero.dataset.motionClock=motionClock.toFixed(4);
    hero.dataset.scratch=(reduced?0:scratchIntensity).toFixed(4);
    document.querySelector('.studio-header')?.classList.toggle('is-inside-hero',p>.48);
  }
  function tick(time){
    frame=0;if(document.hidden||!visible||disposed)return;
    const dt=Math.min(.05,Math.max(.001,lastFrame?(time-lastFrame)/1000:1/60));lastFrame=time;
    const demand=motion.matches?0:Math.min(1,Math.abs(state.progress-prevProgress)/dt*1.6);
    prevProgress=state.progress;
    // Frame-rate independent attack and release; phase is integrated, never reset by input.
    smoothVel+=(demand-smoothVel)*(1-Math.exp(-dt/(demand>smoothVel?.12:.58)));
    if(!motion.matches)motionClock+=dt*(.42+smoothVel*2.1);
    paint(time);
    if(renderer&&prepared&&!motion.matches&&entered&&state.progress<.86)frame=requestAnimationFrame(tick);
  }
  function wake(){if(!frame&&!document.hidden&&visible)frame=requestAnimationFrame(tick);}
  function resize(){
    width=hero.clientWidth;height=hero.clientHeight;if(!width||!height)return;
    size=1.14*Math.min(width*(width<=600?.84:.54),height*(width<=600?.58:.76),width<=600?Infinity:760);
    hero.dataset.apertureSize=size.toFixed(2);
    const dpr=Math.min(devicePixelRatio,1.5,Math.sqrt(1800000/(width*height)));
    canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr));
    fallback?.setTransform(dpr,0,0,dpr,0,0);paint();
  }
  function prepare(){if(prepared||disposed||!sourceReady)return;renderer?.prepare();prepared=true;resize();wake();}
  function mount(){
    // Let the actual paper section overlap the final viewport of the pin.
    // Its document position stays unchanged; only the painting holds longer.
    paper?.classList.add('has-hero-paper-overlap');
    prepare();resize();
    const entryDistance=()=>innerHeight*(motion.matches?.7:1.8);
    const entryProgress=self=>gsap.utils.clamp(0,1,(self.scroll()-self.start)/entryDistance());
    trigger=ScrollTrigger.create({id:'hero-scroll-entry',trigger:hero,start:'top top',end:()=>`+=${entryDistance()+hero.clientHeight}`,
      pin:true,anticipatePin:1,invalidateOnRefresh:true,
      onUpdate:self=>{
        state.progress=entryProgress(self);
        wake();
      },onRefresh:self=>{state.progress=entryProgress(self);resize();}
    });
  }
  function enter(){if(entered)return;entered=true;tween=gsap.to(state,{entry:1,duration:motion.matches?0:.95,ease:'power2.inOut',onUpdate:()=>paint()});wake();}
  const abort=new AbortController(),options={signal:abort.signal};
  hero.addEventListener('pointermove',event=>{
    if(!renderer||motion.matches||!fine.matches||event.pointerType==='touch'||state.progress>=.8)return;
    const r=hero.getBoundingClientRect();renderer.pointer((event.clientX-r.left)/width,(event.clientY-r.top)/height,performance.now());wake();
  },{...options,passive:true});
  hero.addEventListener('pointerleave',()=>{renderer?.endPointer();wake();},options);
  const reset=()=>{renderer?.reset();cancelAnimationFrame(frame);frame=0;lastFrame=0;smoothVel=0;prevProgress=state.progress;if(!document.hidden){paint();wake();}};
  document.addEventListener('visibilitychange',reset,options);
  window.addEventListener('pagehide',reset,options);window.addEventListener('pageshow',reset,options);
  canvas.addEventListener('aperture-restored',()=>{paint();wake();},options);
  motion.addEventListener('change',()=>{tween?.kill();state.entry=1;reset();trigger?.refresh();resize();},options);fine.addEventListener('change',reset,options);
  const observer=new ResizeObserver(resize);observer.observe(hero);
  const intersection=new IntersectionObserver(([e])=>{visible=e.isIntersecting;reset();});intersection.observe(hero);
  return {mount,enter,destroy(){
    disposed=true;tween?.kill();trigger?.kill();observer.disconnect();intersection.disconnect();abort.abort();cancelAnimationFrame(frame);renderer?.destroy();
    canvas.remove();hero.classList.remove('has-depth-entry');
    paper?.classList.remove('has-hero-paper-overlap');
    header?.classList.remove('is-logo-aperture-visible','has-hero-nav-reveal');
    if(header)header.inert=false;
    destination.style.removeProperty('transform');destination.style.removeProperty('transform-origin');
    copy?.style.removeProperty('opacity');copy?.style.removeProperty('visibility');
    document.querySelector('.studio-header')?.classList.remove('is-inside-hero');
  }};
}
