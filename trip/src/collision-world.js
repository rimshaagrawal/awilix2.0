import * as THREE from 'three';

export const SURFACE_BOUNDS_RADIUS=180;

// A circular footprint against a box gives a contact normal, so movement can
// slide along faces and round corners instead of rolling an entire axis back.
export function circleBoxContact(x,z,radius,box){
  if(x<=box.min.x-radius||x>=box.max.x+radius||z<=box.min.z-radius||z>=box.max.z+radius)return null;
  const dx=x-THREE.MathUtils.clamp(x,box.min.x,box.max.x);
  const dz=z-THREE.MathUtils.clamp(z,box.min.z,box.max.z);
  const distance=Math.hypot(dx,dz);
  if(distance>=radius)return null;
  if(distance>1e-9)return {x:dx/distance,z:dz/distance,depth:radius-distance};
  const faces=[{x:-1,z:0,depth:x-box.min.x+radius},{x:1,z:0,depth:box.max.x-x+radius},
    {x:0,z:-1,depth:z-box.min.z+radius},{x:0,z:1,depth:box.max.z-z+radius}];
  return faces.reduce((nearest,face)=>face.depth<nearest.depth?face:nearest);
}
