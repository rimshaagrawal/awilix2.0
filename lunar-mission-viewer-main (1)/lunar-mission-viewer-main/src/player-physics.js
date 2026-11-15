import * as THREE from 'three';

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
  const {eyeHeight=1.7,radius=.32,stepHeight=.4}=options;
  const gravity=9.81,jetpackAcceleration=22;
  const velocity=new THREE.Vector3();
  let grounded=false,throttle=0,accumulator=0;
  const overlaps=(box,x,z)=>{
    const dx=x-THREE.MathUtils.clamp(x,box.min.x,box.max.x);
    const dz=z-THREE.MathUtils.clamp(z,box.min.z,box.max.z);
    return dx*dx+dz*dz<radius*radius;
  };
  function terrainFloor(x,z){
    return Math.max(terrain(x,z),terrain(x+radius,z),terrain(x-radius,z),terrain(x,z+radius),terrain(x,z-radius));
  }
  function step(dt,input){
    const feet=position.y-eyeHeight;
    const targetX=input.x*(input.sprint?7:4),targetZ=input.z*(input.sprint?7:4);
    // Reduced air steering preserves momentum during powered flight.
    const response=grounded?9:1.4;
    const blend=1-Math.exp(-response*dt);
    velocity.x+=(targetX-velocity.x)*blend;velocity.z+=(targetZ-velocity.z)*blend;
    // Smooth engine spool-up/down: thrust is acceleration, never an impulse.
    throttle+=((input.jetpack?1:0)-throttle)*(1-Math.exp(-(input.jetpack?7:12)*dt));
    // Fade thrust at high altitude to keep exploration inside the visible scene.
    const altitudeLimit=1-THREE.MathUtils.smoothstep(position.y,110,145);
    const altitudeBrake=Math.max(0,velocity.y)*(1-altitudeLimit)*1.5;
    velocity.y+=(jetpackAcceleration*throttle*altitudeLimit-gravity-altitudeBrake)*dt;
    velocity.y=THREE.MathUtils.clamp(velocity.y,-25,12);
    if(velocity.y>0)grounded=false;
    const oldFloor=terrainFloor(position.x,position.z);
    for(const axis of ['x','z']){
      const old=position[axis];position[axis]+=velocity[axis]*dt;
      const floor=terrainFloor(position.x,position.z);
      const gx=(terrain(position.x+.4,position.z)-terrain(position.x-.4,position.z))/.8;
      const gz=(terrain(position.x,position.z+.4)-terrain(position.x,position.z-.4))/.8;
      const uphill=floor>oldFloor+.001;
      // Prevent climbing steep crater walls or walking through raised terrain.
      if((grounded&&uphill&&Math.hypot(gx,gz)>1.1)||(floor>feet+stepHeight&&uphill)){
        position[axis]=old;velocity[axis]=0;
      }
      for(const box of rocks){
        if(feet>=box.max.y-.03 || feet+eyeHeight<box.min.y || !overlaps(box,position.x,position.z))continue;
        if(grounded&&box.max.y<=feet+stepHeight)continue;
        position[axis]=old;velocity[axis]=0;break;
      }
    }
    const radial=Math.hypot(position.x,position.z);
    if(radial>180){
      const nx=position.x/radial,nz=position.z/radial;
      position.x=nx*180;position.z=nz*180;
      const outward=Math.max(0,velocity.x*nx+velocity.z*nz);velocity.x-=nx*outward;velocity.z-=nz*outward;
    }
    let floor=terrainFloor(position.x,position.z);
    for(const box of rocks){
      if(overlaps(box,position.x,position.z)&&box.max.y<=feet+(grounded?stepHeight:.04))floor=Math.max(floor,box.max.y);
    }
    // An ascending player can hit the underside of a rock collider too.
    if(velocity.y>0){
      for(const box of rocks){
        if(overlaps(box,position.x,position.z)&&position.y<=box.min.y&&position.y+velocity.y*dt>=box.min.y){
          position.y=box.min.y-.001;velocity.y=0;break;
        }
      }
    }
    const nextFeet=position.y-eyeHeight+velocity.y*dt;
    if(velocity.y<=0 && (nextFeet<=floor || (grounded&&feet-floor<=.25))){
      position.y=floor+eyeHeight;velocity.y=0;grounded=true;
    }else{position.y+=velocity.y*dt;grounded=false;}
  }
  return {
    get grounded(){return grounded;},
    get throttle(){return throttle;},velocity,
    reset(){velocity.set(0,0,0);grounded=false;throttle=0;accumulator=0;},
    clearInput(){throttle=0;velocity.x=0;velocity.z=0;},
    update(dt,input){
      accumulator+=Math.min(dt,.1);
      // Fixed steps prevent tunneling and keep flight behavior independent of FPS.
      while(accumulator+1e-10>=1/120){step(1/120,input);accumulator=Math.max(0,accumulator-1/120);}
    }
  };
}
