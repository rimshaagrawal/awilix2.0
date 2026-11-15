import * as THREE from 'three';
import { circleBoxContact, SURFACE_BOUNDS_RADIUS } from './collision-world.js';
import { createVehicleSupport } from './vehicle-support.js';

// Sample the same triangles rendered by a regular PlaneGeometry, avoiding
// collision differences between the procedural height function and its mesh.
export function createTerrainSampler(geometry, size, segments) {
  const positions=geometry.attributes.position;
  const half=size/2, cell=size/segments, stride=segments+1;
  return (x,z)=>{
    const gx=THREE.MathUtils.clamp((x+half)/cell,0,segments-.000001);
    const gz=THREE.MathUtils.clamp((z+half)/cell,0,segments-.000001);
    const ix=Math.floor(gx),iz=Math.floor(gz),u=gx-ix,v=gz-iz;
    const a=positions.getY(iz*stride+ix),b=positions.getY(iz*stride+ix+1);
    const c=positions.getY((iz+1)*stride+ix),d=positions.getY((iz+1)*stride+ix+1);
    return u+v<=1 ? a+(b-a)*u+(c-a)*v : d+(c-d)*(1-u)+(b-d)*(1-v);
  };
}

export function createPlayerPhysics(position, terrain, rocks=[], options={}) {
  const {eyeHeight=1.7,radius=.32,stepHeight=.4,boundsRadius=SURFACE_BOUNDS_RADIUS,maxSlope=1.1}=options;
  const gravity=9.81,jetpackAcceleration=22,limit=boundsRadius-radius;
  const velocity=new THREE.Vector3();
  const vehicle=options.vehicle?createVehicleSupport({...options.vehicle,eyeHeight}):null;
  const supportBoxes=[];
  let grounded=false,throttle=0,accumulator=0;
  const overlaps=(box,x,z)=>circleBoxContact(x,z,radius,box)!==null;
  function terrainFloor(x,z){
    let floor=terrain(x,z);
    // The diagonal footprint matters at crater edges and the station apron.
    for(let i=0;i<8;i++)floor=Math.max(floor,terrain(x+Math.cos(i*Math.PI/4)*radius,z+Math.sin(i*Math.PI/4)*radius));
    return floor;
  }
  function resolveRocks(){
    const feet=position.y-eyeHeight;
    // Multiple passes resolve corners shared by adjacent colliders. Only the
    // normal component is removed; tangential momentum remains available.
    for(let pass=0;pass<4;pass++)for(const box of rocks){
      if(feet>=box.max.y-.001||position.y<=box.min.y+.001)continue;
      const contact=circleBoxContact(position.x,position.z,radius,box);if(!contact)continue;
      if(grounded&&box.max.y<=feet+stepHeight){
        const head=box.max.y+eyeHeight;
        if(!rocks.some(other=>other!==box&&other.min.y<head&&other.max.y>feet+eyeHeight&&overlaps(other,position.x,position.z)))continue;
      }
      position.x+=contact.x*(contact.depth+.00001);position.z+=contact.z*(contact.depth+.00001);
      const inward=Math.min(0,velocity.x*contact.x+velocity.z*contact.z);
      velocity.x-=contact.x*inward;velocity.z-=contact.z*inward;
    }
  }
  function step(dt,input){
    const feet=position.y-eyeHeight;
    let ix=input.x??0,iz=input.z??0;
    const inputLength=Math.hypot(ix,iz);if(inputLength>1){ix/=inputLength;iz/=inputLength;}
    const radial=Math.hypot(position.x,position.z),nx=radial?position.x/radial:0,nz=radial?position.z/radial:0;
    const edgeBlend=THREE.MathUtils.smoothstep(radial,limit-8,limit);
    const outwardInput=Math.max(0,ix*nx+iz*nz)*edgeBlend;
    ix-=nx*outwardInput;iz-=nz*outwardInput;
    const speed=input.sprint?7:4,response=grounded?9:(inputLength?1.4:.08);
    const blend=1-Math.exp(-response*dt);
    velocity.x+=(ix*speed-velocity.x)*blend;velocity.z+=(iz*speed-velocity.z)*blend;
    const outwardSpeed=Math.max(0,velocity.x*nx+velocity.z*nz)*(1-Math.exp(-edgeBlend*12*dt));
    velocity.x-=nx*outwardSpeed;velocity.z-=nz*outwardSpeed;
    throttle+=((input.jetpack?1:0)-throttle)*(1-Math.exp(-(input.jetpack?7:12)*dt));
    const altitudeLimit=1-THREE.MathUtils.smoothstep(position.y,110,145);
    const altitudeBrake=Math.max(0,velocity.y)*(1-altitudeLimit)*1.5;
    velocity.y=THREE.MathUtils.clamp(velocity.y+(jetpackAcceleration*throttle*altitudeLimit-gravity-altitudeBrake)*dt,-25,12);
    if(velocity.y>0)grounded=false;
    const oldX=position.x,oldZ=position.z,oldFloor=terrainFloor(oldX,oldZ);
    position.x+=velocity.x*dt;position.z+=velocity.z*dt;
    let floor=terrainFloor(position.x,position.z);
    const gx=(terrain(position.x+.25,position.z)-terrain(position.x-.25,position.z))/.5;
    const gz=(terrain(position.x,position.z+.25)-terrain(position.x,position.z-.25))/.5;
    const slope=Math.hypot(gx,gz);
    if(floor>oldFloor+.001&&((grounded&&slope>maxSlope)||floor>feet+stepHeight)){
      const normalLength=slope||1,ux=gx/normalLength,uz=gz/normalLength;
      const uphill=Math.max(0,velocity.x*ux+velocity.z*uz);
      velocity.x-=ux*uphill;velocity.z-=uz*uphill;
      position.x=oldX+velocity.x*dt;position.z=oldZ+velocity.z*dt;
      if(terrainFloor(position.x,position.z)>Math.max(oldFloor,feet+stepHeight)+.001){position.x=oldX;position.z=oldZ;}
    }
    resolveRocks();
    const distance=Math.hypot(position.x,position.z);
    if(distance>limit){
      const bx=position.x/distance,bz=position.z/distance;
      position.x=bx*limit;position.z=bz*limit;
      const outward=Math.max(0,velocity.x*bx+velocity.z*bz);velocity.x-=bx*outward;velocity.z-=bz*outward;
    }
    floor=terrainFloor(position.x,position.z);
    const nextFeet=feet+velocity.y*dt;
    // Swept feet crossing catches thin/raised platforms even during a fast fall.
    for(const box of rocks){
      if(!overlaps(box,position.x,position.z))continue;
      if((velocity.y<=0&&feet>=box.max.y-.001&&nextFeet<=box.max.y)||
         (grounded&&box.max.y<=feet+stepHeight))floor=Math.max(floor,box.max.y);
    }
    if(velocity.y>0){
      let ceiling=Infinity;
      for(const box of rocks)if(overlaps(box,position.x,position.z)&&position.y<=box.min.y+.001&&position.y+velocity.y*dt>=box.min.y)ceiling=Math.min(ceiling,box.min.y);
      if(ceiling<Infinity){position.y=ceiling-.001;velocity.y=0;grounded=false;return;}
    }
    if(vehicle){
      supportBoxes.length=0;
      for(const box of rocks)if(position.x>=box.min.x-2&&position.x<=box.max.x+2&&position.z>=box.min.z-2&&position.z<=box.max.z+2)supportBoxes.push(box);
      vehicle.step(dt,position,velocity,(x,z,reference)=>{
        let support=terrain(x,z);
        for(const box of supportBoxes)if(x>=box.min.x-.04&&x<=box.max.x+.04&&z>=box.min.z-.04&&z<=box.max.z+.04&&box.max.y<=reference+stepHeight)
          support=Math.max(support,box.max.y);
        return support;
      },input.heading,Math.hypot(input.x??0,input.z??0)>.01);
      resolveRocks();
      const radiusFromOrigin=Math.hypot(position.x,position.z);
      if(radiusFromOrigin>limit){position.x*=limit/radiusFromOrigin;position.z*=limit/radiusFromOrigin;}
      grounded=vehicle.state.grounded;return;
    }
    if(velocity.y<=0&&(nextFeet<=floor||(grounded&&feet-floor<=.25))){
      position.y=floor+eyeHeight;velocity.y=0;grounded=true;
    }else{position.y+=velocity.y*dt;grounded=false;}
  }
  function reset(){velocity.set(0,0,0);grounded=false;throttle=0;accumulator=0;vehicle?.reset();}
  return {
    get grounded(){return grounded;},get throttle(){return throttle;},
    get support(){return vehicle?.state;},
    get boundaryDistance(){return Math.max(0,limit-Math.hypot(position.x,position.z));},velocity,
    reset,
    clearInput(){throttle=0;velocity.x=0;velocity.z=0;},
    update(dt,input){
      if(!Number.isFinite(dt)||dt<=0)return;
      accumulator+=Math.min(dt,.1);
      while(accumulator+1e-10>=1/120){
        // Bound horizontal travel, even if an external impulse exceeds drive speed.
        const slices=Math.max(1,Math.ceil(Math.hypot(velocity.x,velocity.z)/120/(radius*.4)));
        for(let i=0;i<slices;i++)step(1/120/slices,input);
        accumulator=Math.max(0,accumulator-1/120);
      }
    }
  };
}
