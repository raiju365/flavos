import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createApertureRenderer } from './hero-aperture-renderer';
import './header-texture.css';

export function createHeroScrollEntry() {
  const hero=document.querySelector('#hero');
  const destination=hero.querySelector('.hero-destination');
  const copy=hero.querySelector('.hero-introduction');
  const source=hero.querySelector('.hero-aperture-source');
  const canvas=document.createElement('canvas');canvas.className='hero-aperture';canvas.setAttribute('aria-hidden','true');hero.append(canvas);
  const renderer=createApertureRenderer(canvas,source);
  const fallback=renderer?null:canvas.getContext('2d');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const state={entry:motion.matches?1:0,progress:0};
  const tileLayout=[[-.25,.05,.22,.28,4.5],[.18,-.21,.19,.29,5.5],[.22,.22,.25,.24,6.5]];
  const tiles=[...hero.querySelectorAll('.hero-collage img')].filter(i=>!i.src.endsWith('/paling-atas.png')).map((image,index)=>{
    const tile=image.cloneNode();tile.className='hero-depth-tile';tile.alt='';tile.setAttribute('aria-hidden','true');hero.append(tile);return {element:tile,layout:tileLayout[index]};
  });
  hero.classList.add('has-depth-entry');canvas.dataset.renderer=renderer?'webgl':'fallback';
  let width=0,height=0,size=0,trigger,tween,entered=false,prepared=false,disposed=false,frame=0,visible=true;
  const smooth=v=>{const t=gsap.utils.clamp(0,1,v);return t*t*(3-2*t);};
  const noise=document.querySelector('.tv-noise');
  function paint(time=performance.now()) {
    if(!width||!height||disposed)return;
    const p=state.progress,reduced=motion.matches||!renderer;
    // Different camera distances for the foreground, peripheral art and painting.
    // No shared scale or opacity handoff is used between these planes.
    const distance=Math.max(.006,1-smooth(p/.78)*.994);
    const travel=8*smooth(p/.9);
    const paintingScale=reduced?1:8/(16-travel);
    destination.style.transform=`scale(${paintingScale})`;destination.style.transformOrigin='50% 49%';
    for(const {element,layout:[x,y,w,h,depth]} of tiles) {
      const remaining=depth-travel,projection=depth/Math.max(.05,remaining);
      element.style.width=`${width*w}px`;element.style.height=`${height*h}px`;
      element.style.transform=`translate(-50%,-50%) translate(${width*x*projection}px,${height*y*projection}px) scale(${projection})`;
      element.style.visibility=reduced||remaining<=.1?'hidden':'visible';
    }
    if(renderer&&prepared)renderer.draw({width,height,size,distance,progress:p,entry:state.entry,reduced,time});
    if(fallback){
      fallback.clearRect(0,0,canvas.width,canvas.height);fallback.fillStyle='#fff';fallback.fillRect(0,0,width,height);
      if(source.complete&&source.naturalWidth){fallback.globalCompositeOperation='destination-out';fallback.drawImage(source,width/2-size/2,height*.49-size/2,size,size);fallback.globalCompositeOperation='source-over';}
      canvas.style.opacity=String(1-smooth(p/.7));
    }
    canvas.style.visibility=p>=.86?'hidden':'visible';
    copy.style.opacity=String(state.entry*(1-smooth(p/.15)));copy.style.visibility=p>=.15?'hidden':'visible';
    hero.dataset.entryProgress=p.toFixed(4);hero.dataset.entryPhase=p>=.9?'painting':p>.001?'entering':'white';
    hero.dataset.foregroundScale=(1/distance).toFixed(4);hero.dataset.paintingScale=paintingScale.toFixed(4);
    document.querySelector('.studio-header')?.classList.toggle('is-inside-hero',p>.48);
    // Grain stays on the aperture until the original painting fills the viewport.
    if(noise)noise.style.opacity=visible&&p<.9?String(.1*smooth((p-.65)/.25)):'';
  }
  function tick(time){frame=0;if(document.hidden||!visible||disposed)return;paint(time);if(renderer&&time<renderer.activeUntil)frame=requestAnimationFrame(tick);}
  function wake(){if(!frame&&!document.hidden&&visible)frame=requestAnimationFrame(tick);}
  function resize(){
    width=hero.clientWidth;height=hero.clientHeight;if(!width||!height)return;
    size=Math.min(width*(width<=600?.84:.54),height*(width<=600?.58:.76),width<=600?Infinity:760);
    const dpr=Math.min(devicePixelRatio,1.5,Math.sqrt(1800000/(width*height)));
    canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr));
    fallback?.setTransform(dpr,0,0,dpr,0,0);paint();
  }
  function prepare(){if(prepared||disposed||!source.complete||!source.naturalWidth)return;renderer?.prepare();prepared=true;resize();}
  function mount(){
    prepare();resize();
    trigger=ScrollTrigger.create({id:'hero-scroll-entry',trigger:hero,start:'top top',end:()=>`+=${innerHeight*(motion.matches?.7:1.8)}`,
      pin:true,anticipatePin:1,invalidateOnRefresh:true,
      onUpdate:self=>{state.progress=self.progress;paint();},onRefresh:self=>{state.progress=self.progress;resize();}
    });
  }
  function enter(){if(entered)return;entered=true;tween=gsap.to(state,{entry:1,duration:motion.matches?0:.95,ease:'power2.inOut',onUpdate:()=>paint()});}
  const abort=new AbortController(),options={signal:abort.signal};
  hero.addEventListener('pointermove',event=>{
    if(!renderer||motion.matches||!fine.matches||event.pointerType==='touch'||state.progress>=.8)return;
    const r=hero.getBoundingClientRect();renderer.pointer((event.clientX-r.left)/width,(event.clientY-r.top)/height,performance.now());wake();
  },{...options,passive:true});
  hero.addEventListener('pointerleave',()=>{renderer?.reset();wake();},options);
  const reset=()=>{renderer?.reset();cancelAnimationFrame(frame);frame=0;if(!document.hidden)paint();};
  document.addEventListener('visibilitychange',reset,options);
  window.addEventListener('pagehide',reset,options);window.addEventListener('pageshow',reset,options);
  canvas.addEventListener('aperture-restored',()=>paint(),options);source.addEventListener('load',prepare,options);
  motion.addEventListener('change',()=>{tween?.kill();state.entry=1;reset();trigger?.refresh();resize();},options);fine.addEventListener('change',reset,options);
  const observer=new ResizeObserver(resize);observer.observe(hero);
  const intersection=new IntersectionObserver(([e])=>{visible=e.isIntersecting;reset();if(!visible&&noise)noise.style.opacity='';});intersection.observe(hero);
  return {mount,enter,destroy(){
    disposed=true;tween?.kill();trigger?.kill();observer.disconnect();intersection.disconnect();abort.abort();cancelAnimationFrame(frame);renderer?.destroy();
    canvas.remove();tiles.forEach(t=>t.element.remove());hero.classList.remove('has-depth-entry');
    destination.style.removeProperty('transform');copy.style.removeProperty('opacity');copy.style.removeProperty('visibility');
    if(noise)noise.style.opacity='';document.querySelector('.studio-header')?.classList.remove('is-inside-hero');
  }};
}
