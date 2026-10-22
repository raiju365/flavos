import './cloudReturn.css';
import {runtimeQuality} from '../runtime-quality';
import {sampleReturnWind} from './returnWind';

const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));
const smooth=(low,high,value)=>{const t=clamp((value-low)/(high-low));return t*t*(3-2*t);};
const formations=[
  [.02,-.35,.86,.12,0], [.72,.05,.78,.17,2], [.30,-1.05,1.02,.28,1],
  [.95,-.68,.95,.38,3], [-.18,.48,1.10,.48,2], [.60,-1.52,1.18,.58,0],
  [1.03,.68,1.20,.68,1], [.12,-.82,1.35,.78,3], [.72,-.22,1.40,.88,0],
  [-.12,-1.75,1.55,1,2],
];

export function createCloudReturn(overlay){
  const canvas=document.createElement('canvas');canvas.className='cloud-return-canvas';canvas.setAttribute('aria-hidden','true');
  const gradeLayer=document.createElement('div');gradeLayer.className='cloud-return-grade';gradeLayer.setAttribute('aria-hidden','true');
  const coolGrade=document.createElement('i');coolGrade.className='cloud-return-grade-cool';
  const warmGrade=document.createElement('i');warmGrade.className='cloud-return-grade-warm';
  gradeLayer.append(coolGrade,warmGrade);overlay.append(canvas,gradeLayer);
  const context=canvas.getContext('2d',{alpha:true,desynchronized:true});
  let width=1,height=1,ratio=1,compact=false,sprites=[],preparation,phase='idle',progress=0,gradeIntensity=0;
  let destroyed=false,frame=0,last=0,elapsed=0,drift=0,paints=0;
  const syncOpaque=()=>{
    const opaque=phase==='cover'&&progress===1||phase==='reveal'&&progress===0;
    overlay.dataset.cloudOpaque=String(opaque);
    overlay.dataset.cloudPhase=phase;overlay.dataset.cloudProgress=progress.toFixed(4);
  };
  const paintGrade=()=>{
    const warmth=phase==='reveal'?1:smooth(.4,.9,progress);
    const strength=gradeIntensity*(phase==='idle'||overlay.dataset.cloudOpaque==='true'?0:1)*.22;
    gradeLayer.style.opacity=String(strength);
    coolGrade.style.opacity=String(1-warmth);warmGrade.style.opacity=String(warmth);
    overlay.dataset.cloudGrade=gradeIntensity.toFixed(4);overlay.dataset.cloudGradeVisible=strength.toFixed(4);
    overlay.dataset.cloudGradeWarmth=warmth.toFixed(4);
  };
  const paint=()=>{
    if(destroyed)return;
    syncOpaque();paintGrade();
    if(!context)return;
    context.setTransform(ratio,0,0,ratio,0,0);context.clearRect(0,0,width,height);
    if(phase==='idle')return;
    const revealing=phase==='reveal';
    // The white interior is a true opaque cover for the scroll swap. Cloud
    // shading remains above it, then drifts out while the hero grows beneath.
    const fog=revealing?1-smooth(0,.17,progress):smooth(.43,1,progress);
    if(fog>0){context.globalAlpha=fog;context.fillStyle='#fff';context.fillRect(0,0,width,height);}
    const envelope=revealing?.20*(1-smooth(0,.36,progress)):(.78-.58*smooth(.76,1,progress))*smooth(0,.18,elapsed);
    const camera=revealing?2.6+progress*.52:progress*2.6;
    const air=sampleReturnWind(elapsed);
    const count=compact?8:formations.length;
    for(let i=0;i<count;i++){
      const [anchorX,anchorY,span,depth,art]=formations[i];
      const sprite=sprites[art];if(!sprite)continue;
      const local=sampleReturnWind(elapsed*.7+i*.41);
      let cy=anchorY+camera*(.58+depth*.62)+elapsed*(.012+depth*.025);
      while(cy>1.85)cy-=3.7;
      const clearing=revealing?(anchorX<.5?-1:1)*smooth(0,.4,progress)*.75:0;
      const cx=anchorX+drift*(.32+depth*.58)+local.side*.04+clearing;
      const size=width*span*(1+local.lift*.025+depth*(revealing?.12:progress*.12));
      const cloudHeight=size*sprite.naturalHeight/sprite.naturalWidth;
      context.save();context.translate(cx*width,cy*height);context.rotate(local.roll*.012);
      context.globalAlpha=envelope*(.52+depth*.45);
      // The cloud texture is prepared once; runtime only composites cached
      // photographs with independent advection, billow and depth parallax.
      context.scale(1+air.side*.012,1+local.lift*.025);
      context.drawImage(sprite,-size/2,-cloudHeight/2,size,cloudHeight);context.restore();
    }
    context.globalAlpha=1;
    overlay.dataset.cloudFlowTime=elapsed.toFixed(4);overlay.dataset.cloudDrift=drift.toFixed(4);
    overlay.dataset.cloudFrame=String(++paints);overlay.dataset.cloudTravelVh=(camera*100).toFixed(2);
    overlay.dataset.cloudWind=air.side.toFixed(4);
  };
  const tick=now=>{
    frame=0;if(destroyed||phase==='idle'||document.hidden)return;
    const dt=Math.min(.05,last?(now-last)/1000:1/60);last=now;elapsed+=dt;
    drift+=sampleReturnWind(elapsed).side*dt*.075;
    paint();wake();
  };
  function wake(){if(!frame&&!destroyed&&phase!=='idle'&&!document.hidden)frame=requestAnimationFrame(tick);}
  const resize=()=>{
    if(destroyed)return;
    width=Math.max(1,innerWidth);height=Math.max(1,innerHeight);
    compact=runtimeQuality().compact;
    const budget=compact?650000:1150000;
    ratio=Math.min(devicePixelRatio||1,1.25,Math.sqrt(budget/(width*height)));
    const pw=Math.max(1,Math.round(width*ratio)),ph=Math.max(1,Math.round(height*ratio));
    if(canvas.width!==pw)canvas.width=pw;if(canvas.height!==ph)canvas.height=ph;
    if(context){context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';}
    overlay.dataset.cloudPixels=String(pw*ph);paint();
  };
  const prepare=()=>{
    if(preparation)return preparation;
    preparation=Promise.all([1,2,3,4].map(async index=>{
      const image=new Image();image.src=`/transition/clouds/cumulus-${index}.webp`;await image.decode();
      if(!image.naturalWidth)throw Error('Cloud image is empty');return image;
    })).then(images=>{
      if(destroyed)return;
      sprites=images;overlay.dataset.cloudSpritesReady='4';overlay.dataset.cloudRenderer=context?'photo-clouds-2d':'fallback';
      // Upload the small cached sprites under the loader, never at click time.
      if(context){for(const image of sprites)context.drawImage(image,0,0,1,1);context.clearRect(0,0,canvas.width,canvas.height);}
    }).catch(error=>{preparation=undefined;throw error;});
    preparation.catch(()=>{});return preparation;
  };
  const visibility=()=>{last=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();};
  window.addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',visibility);
  overlay.dataset.cloudMotion='advected-parallax';overlay.dataset.cloudReveal='drifting-dissipation';resize();
  prepare();
  return {
    prepare,
    get available(){return !!context&&sprites.length===4;},
    start(){
      if(destroyed)return;
      phase='cover';progress=gradeIntensity=elapsed=drift=last=0;paints=0;
      // A prepared, cleared canvas is already sized. Keep compositing out of
      // the click handler so the original sticker can leave immediately.
      if(width!==innerWidth||height!==innerHeight)resize();else syncOpaque();
      wake();
    },
    cover(value){phase='cover';progress=clamp(value);syncOpaque();wake();},
    reveal(value){phase='reveal';progress=clamp(value);syncOpaque();wake();},
    grade(value){gradeIntensity=clamp(value);},
    reset(){phase='idle';progress=gradeIntensity=0;cancelAnimationFrame(frame);frame=0;last=0;paint();},
    destroy(){
      destroyed=true;cancelAnimationFrame(frame);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);
      canvas.remove();gradeLayer.remove();sprites=[];
      for(const name of ['cloudOpaque','cloudPhase','cloudProgress','cloudRenderer','cloudMotion','cloudReveal','cloudGrade','cloudGradeVisible','cloudGradeWarmth','cloudSpritesReady','cloudFlowTime','cloudDrift','cloudFrame','cloudTravelVh','cloudWind','cloudPixels'])delete overlay.dataset[name];
    },
  };
}
