import * as THREE from 'three';
import { ROVER_SPAWN } from './rover-station.js';
import { createSiteHeight } from './site-topography.js';

// Named sites have photo-interpreted relief; generic polar and Apollo terrain
// retain their existing shapes.
export function createSurfaceHeight({centralCrater=true,siteId}={}) {
  const siteHeight=createSiteHeight(siteId);
  if(siteHeight)return siteHeight;
  const minor = Array.from({length:110},(_,i)=>{
    const a=i*2.39996, r=52+Math.sqrt((i+.5)/110)*147;
    return {x:Math.cos(a)*r,z:Math.sin(a)*r,r:2.4+((i*7)%13)*.65};
  });
  // Smaller bowl craters carry the lunar texture into the drivable foreground.
  for(let i=0;i<80;i++){
    const a=i*2.39996+.7,r=9+Math.sqrt((i+.5)/80)*90;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.hypot(x-ROVER_SPAWN.x,z-ROVER_SPAWN.z)>6 && Math.hypot(x-16,z-74)>8)
      minor.push({x,z,r:2+((i*11)%9)*.38});
  }
  function naturalHeight(x,z) {
    const r=Math.hypot(x,z), a=Math.atan2(z,x);
    const edge=36+Math.sin(a*5)*.8+Math.sin(a*11)*.35;
    const floor=-13+Math.pow(Math.min(r/edge,1),3)*3;
    const outside=1.25*Math.sin(x*.043)*Math.cos(z*.055);
    const blend=THREE.MathUtils.smoothstep(r,edge-10,edge+2);
    let h=centralCrater ? THREE.MathUtils.lerp(floor,outside,blend)+5.7*Math.exp(-Math.pow((r-edge)/4.8,2)) : outside;
    // Keep displacement broad enough to resolve smoothly on the terrain mesh.
    // Fine regolith grain belongs in the material, not alternating vertex heights.
    h+=(Math.sin(x*.21+Math.cos(z*.17))*Math.cos(z*.19)*.12+Math.sin(x*.33)*Math.cos(z*.41)*.16)*(r<23?.2:1);
    for(const c of minor){const d=Math.hypot(x-c.x,z-c.z)/c.r; if(d<1.5)h+=-c.r*.29*Math.exp(-d*d*2.8)+c.r*.12*Math.exp(-Math.pow((d-1)*3.6,2));}
    return h;
  }
  return naturalHeight;
}

// Collision samplers retain this position attribute, so update it in place.
export function updateTerrainGeometry(geometry,height,offset=0){
  const vertices=geometry.attributes.position;
  for(let i=0;i<vertices.count;i++)vertices.setY(i,height(vertices.getX(i),vertices.getZ(i))+offset);
  vertices.needsUpdate=true;
  geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.computeBoundingBox();
}
