import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

// Fine packed regolith with angular aggregates and shallow scuffs.
// Broad craters belong to the terrain mesh, not the repeating material.
export function createRegolithData({size=2048,span=8}={}) {
  let seed=81927;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const heights=new Float32Array(size*size),cavities=new Float32Array(size*size);
  const variation=new Float32Array(size*size);
  const wrap=i=>(i%size+size)%size;
  for(const [cells,amplitude] of [[8,.012],[32,.010],[128,.005],[512,.0018]]){
    const lattice=Float32Array.from({length:cells*cells},()=>random()*2-1);
    for(let y=0;y<size;y++){
      const gy=y/size*cells,iy=Math.floor(gy),fy=gy-iy,v=fy*fy*(3-2*fy);
      for(let x=0;x<size;x++){
        const gx=x/size*cells,ix=Math.floor(gx),fx=gx-ix,u=fx*fx*(3-2*fx);
        const a=lattice[iy*cells+ix],b=lattice[iy*cells+(ix+1)%cells];
        const c=lattice[((iy+1)%cells)*cells+ix],d=lattice[((iy+1)%cells)*cells+(ix+1)%cells];
        const value=(a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v,index=y*size+x;
        heights[index]+=value*amplitude;
        variation[index]+=value*(cells===8?.09:.025);
      }
    }
  }
  // Chipped clasts and packed grains have irregular footprints, no ring rims.
  for(const [count,minRadius,maxRadius] of [[180,.045,.16],[4600,.008,.04]]){
    for(let i=0;i<count;i++){
      const cx=random()*size,cy=random()*size;
      const radius=(minRadius+(maxRadius-minRadius)*random())*size/span;
      const phase=random()*Math.PI*2,aspect=.5+random()*.65;
      const depth=(radius*span/size)*(.12+.16*random());
      const reach=Math.ceil(radius*1.25);
      const tint=(random()-.5)*.16;
      for(let y=Math.floor(cy)-reach;y<=Math.ceil(cy)+reach;y++)for(let x=Math.floor(cx)-reach;x<=Math.ceil(cx)+reach;x++){
        const dx=(x-cx)/radius,dy=(y-cy)/(radius*aspect),angle=Math.atan2(dy,dx);
        const r=Math.hypot(dx,dy)/(1+.16*Math.sin(angle*3+phase)+.09*Math.cos(angle*5-phase));
        if(r>=1)continue;
        const index=wrap(y)*size+wrap(x),grain=Math.pow(1-r,1.4);
        heights[index]+=depth*grain;
        variation[index]+=tint*grain;
        cavities[index]=Math.max(cavities[index],Math.exp(-Math.pow((r-.88)/.13,2))*.16);
      }
    }
  }
  const color=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4);
  const texel=span/size;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const index=y*size+x,offset=index*4;
    const dx=(heights[y*size+wrap(x+1)]-heights[y*size+wrap(x-1)])/(2*texel);
    const dy=(heights[wrap(y+1)*size+x]-heights[wrap(y-1)*size+x])/(2*texel);
    const inverse=1/Math.hypot(dx,dy,1);
    normal[offset]=Math.round((.5-.5*dx*inverse)*255);
    normal[offset+1]=Math.round((.5-.5*dy*inverse)*255);
    normal[offset+2]=Math.round((.5+.5*inverse)*255);normal[offset+3]=255;
    // Subtle contact occlusion, without painted black crater interiors.
    const value=Math.max(85,Math.min(220,184+variation[index]*235-cavities[index]*16));
    color[offset]=value;color[offset+1]=value*.985;color[offset+2]=value*.963;color[offset+3]=255;
  }
  return {color,normal,size,span};
}

// Encode the generated maps once, so browsers only decode assets at startup.
function png(data,size){
  const crc=buffer=>{let c=0xffffffff;for(const byte of buffer){c^=byte;for(let bit=0;bit<8;bit++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
  const chunk=(name,data)=>{const body=Buffer.concat([Buffer.from(name),data]),out=Buffer.alloc(body.length+8);out.writeUInt32BE(data.length);body.copy(out,4);out.writeUInt32BE(crc(body),body.length+4);return out;};
  const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  const rows=Buffer.alloc(size*(size*4+1));
  for(let y=0;y<size;y++){
    const start=y*(size*4+1);rows[start]=1;
    for(let x=0;x<size*4;x++)rows[start+1+x]=(data[y*size*4+x]-(x>=4?data[y*size*4+x-4]:0)+256)%256;
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const {color,normal,size}=createRegolithData();
  writeFileSync(new URL('../public/textures/regolith-color.png',import.meta.url),png(color,size));
  writeFileSync(new URL('../public/textures/regolith-normal.png',import.meta.url),png(normal,size));
}
