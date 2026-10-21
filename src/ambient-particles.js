import {getBrandBlue} from './brand-color';
import {runtimeQuality,renderPixelRatio} from './runtime-quality';

// The same sparse dust uses one small native canvas instead of an engine.
export function initAmbientParticles(){
  const host=document.getElementById('tsparticles');
  if(!host)return()=>{};
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  if(!ctx)return()=>{};
  canvas.style.cssText='display:block;width:100%;height:100%;pointer-events:none';
  host.append(canvas);
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),abort=new AbortController();
  const dust=Array.from({length:30},()=>({x:Math.random(),y:Math.random(),radius:1+Math.random()*2,speed:3+Math.random()*5}));
  let frame=0,last=0,width=1,height=1,visible=false;
  function draw(delta=0){
    ctx.clearRect(0,0,width,height);ctx.fillStyle=getBrandBlue();ctx.globalAlpha=.15;
    const count=runtimeQuality().compact?18:30;
    for(const point of dust.slice(0,count)){
      point.y=(point.y+delta*point.speed/height)%1;
      ctx.beginPath();ctx.arc(point.x*width,point.y*height,point.radius,0,Math.PI*2);ctx.fill();
    }
  }
  function tick(now){
    frame=0;if(document.hidden||!visible||motion.matches)return;
    if(now-last>=1000/24){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;draw(dt);}
    frame=requestAnimationFrame(tick);
  }
  function sync(){cancelAnimationFrame(frame);frame=0;last=0;if(!document.hidden&&visible&&!motion.matches)frame=requestAnimationFrame(tick);}
  function resize(){width=innerWidth;height=innerHeight;const ratio=renderPixelRatio(width,height);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);draw();}
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});
  const hero=document.getElementById('hero');if(hero)observer.observe(hero);
  resize();
  window.addEventListener('resize',resize,{signal:abort.signal,passive:true});
  document.addEventListener('visibilitychange',sync,{signal:abort.signal});
  motion.addEventListener('change',()=>{draw();sync();},{signal:abort.signal});
  return()=>{abort.abort();observer.disconnect();cancelAnimationFrame(frame);canvas.remove();};
}
