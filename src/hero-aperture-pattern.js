// Use the actual brand mark, preserving its proportions and transparent cutouts.
export function createAperturePattern() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const image=new Image();image.src='/logo.svg';
  const ready=image.decode().then(()=>{
    const width=canvas.width*.78,height=width*image.naturalHeight/image.naturalWidth;
    canvas.getContext('2d').drawImage(image,(1024-width)/2,(1024-height)/2,width,height);
  });
  return {canvas,ready};
}
