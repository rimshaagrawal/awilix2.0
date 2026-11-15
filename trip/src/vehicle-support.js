import * as THREE from 'three';

// Model-space travel, shared by physics and rendering. The tires have a .43
// radius: this allows modest suspension motion rather than telescoping axles.
export const SUSPENSION_LIMITS={droop:.18,compression:.20};
export const ROVER_WHEEL_LAYOUT=[[-1,-1.38],[-1,1.38],[1,-1.38],[1,1.38],[-1,-.46],[-1,.46],[1,-.46],[1,.46]];

// Unit-mass rigid chassis with eight short-travel suspension springs. Forces
// act at tire contacts relative to the centre of mass; losing an axle therefore
// creates torque and a fall, instead of holding the vehicle at the highest ray.
export function createVehicleSupport({scale=.36,eyeHeight=.9}={}){
  const centerOfMass=new THREE.Vector3(0,1.2*scale,-.15*scale);
  const wheels=ROVER_WHEEL_LAYOUT.map(([x,z])=>new THREE.Vector3(x*scale,.43*scale,z*scale));
  const chassis=[];
  for(const x of [-.65,.65])for(const z of [-1.55,1.55])chassis.push(new THREE.Vector3(x,.67,z).multiplyScalar(scale));
  for(const x of [-.75,.75])for(const z of [-1.95,1.7])chassis.push(new THREE.Vector3(x,2.1,z).multiplyScalar(scale));
  chassis.push(new THREE.Vector3(0,.67,0).multiplyScalar(scale));
  const state={pitch:0,roll:0,heave:0,heading:0,pitchVelocity:0,rollVelocity:0,heaveVelocity:0,grounded:false,
    wheels:wheels.map(()=>({offset:0,velocity:0,contact:false}))};
  const rotation=new THREE.Quaternion(),tilt=new THREE.Quaternion(),euler=new THREE.Euler(0,0,0,'YXZ');
  const center=new THREE.Vector3(),lever=new THREE.Vector3(),localLever=new THREE.Vector3(),point=new THREE.Vector3(),up=new THREE.Vector3();
  // Box inertia about the mass centre, in world units (unit total mass).
  const inversePitchInertia=1/((3.2*scale)**2+(.8*scale)**2)*12;
  const inverseRollInertia=1/((1.8*scale)**2+(.8*scale)**2)*12;
  const tireRadius=.43*scale,droop=SUSPENSION_LIMITS.droop*scale,compression=SUSPENSION_LIMITS.compression*scale;
  const normal=new THREE.Vector3(),localNormal=new THREE.Vector3();
  let initialized=false;
  function contactNormal(sample,x,z,reference){
    const dx=(sample(x+.04,z,reference)-sample(x-.04,z,reference))/.08;
    const dz=(sample(x,z+.04,reference)-sample(x,z-.04,reference))/.08;
    normal.set(-dx,1,-dz).normalize();
    const sin=Math.sin(state.heading),cos=Math.cos(state.heading);
    localNormal.set(normal.x*cos-normal.z*sin,normal.y,normal.x*sin+normal.z*cos);
  }
  function pose(){
    tilt.setFromEuler(euler.set(state.pitch,0,state.roll,'YXZ'));
    rotation.setFromEuler(euler.set(state.pitch,state.heading,state.roll,'YXZ'));
    up.set(0,1,0).applyQuaternion(rotation);
  }
  function wheelPoint(local){
    localLever.copy(local).sub(centerOfMass).applyQuaternion(tilt);
    lever.copy(local).sub(centerOfMass).applyQuaternion(rotation);
    return point.copy(center).add(lever);
  }
  function project(local,floor,sample,velocity,margin=0){
    wheelPoint(local);
    const depth=floor+margin-point.y;if(depth<=0)return false;
    contactNormal(sample,point.x,point.z,point.y+margin+.3);
    const pitchArm=localLever.y*localNormal.z-localLever.z*localNormal.y;
    const rollArm=localLever.x*localNormal.y-localLever.y*localNormal.x;
    const effectiveMass=1+pitchArm**2*inversePitchInertia+rollArm**2*inverseRollInertia;
    const correction=Math.min(.25,depth*normal.y)/effectiveMass;
    center.addScaledVector(normal,correction);
    state.pitch+=THREE.MathUtils.clamp(pitchArm*correction*inversePitchInertia,-.08,.08);
    state.roll+=THREE.MathUtils.clamp(rollArm*correction*inverseRollInertia,-.08,.08);
    // Cancel only closing contact velocity, without turning position correction
    // into an artificial bounce or a burst of angular energy.
    const closing=velocity.dot(normal)+state.pitchVelocity*pitchArm+state.rollVelocity*rollArm;
    if(closing<0){
      const impulse=-closing/effectiveMass;
      velocity.addScaledVector(normal,impulse);
      state.pitchVelocity+=pitchArm*impulse*inversePitchInertia;
      state.rollVelocity+=rollArm*impulse*inverseRollInertia;
    }
    pose();return true;
  }
  function reset(){
    initialized=false;Object.assign(state,{pitch:0,roll:0,heave:0,heading:0,pitchVelocity:0,rollVelocity:0,heaveVelocity:0,grounded:false});
    for(const wheel of state.wheels)Object.assign(wheel,{offset:0,velocity:0,contact:false});
  }
  function step(dt,position,velocity,sample,heading=state.heading,steering=true){
    if(!initialized){state.heading=heading;initialized=true;}
    pose();
    center.copy(position);center.y-=eyeHeight;center.add(lever.copy(centerOfMass).applyQuaternion(rotation));
    const speed=Math.hypot(velocity.x,velocity.z);
    if(steering&&speed>.15){
      const desired=Math.atan2(-velocity.x,-velocity.z);
      state.heading+=Math.atan2(Math.sin(desired-state.heading),Math.cos(desired-state.heading))*(1-Math.exp(-dt*7));
    }
    pose();
    let force=0,pitchTorque=0,rollTorque=0;
    if(up.y>.25)for(const local of wheels){
      wheelPoint(local);
      const floor=sample(point.x,point.z,point.y-tireRadius);
      const gap=point.y-tireRadius-floor;
      if(gap>droop*up.y)continue;
      contactNormal(sample,point.x,point.z,point.y-tireRadius+.3);
      if(normal.y<.55)continue;
      const speedAtContact=velocity.y-state.pitchVelocity*localLever.z+state.rollVelocity*localLever.x;
      const spring=THREE.MathUtils.clamp(9.81/wheels.length-gap*75-speedAtContact*3.5,0,9.81*4/wheels.length);
      force+=spring;pitchTorque-=localLever.z*spring;rollTorque+=localLever.x*spring;
    }
    velocity.y+=force*dt;
    state.pitchVelocity=(state.pitchVelocity+pitchTorque*inversePitchInertia*dt)*Math.exp(-dt*1.4);
    state.rollVelocity=(state.rollVelocity+rollTorque*inverseRollInertia*dt)*Math.exp(-dt*1.4);
    state.pitchVelocity=THREE.MathUtils.clamp(state.pitchVelocity,-5,5);
    state.rollVelocity=THREE.MathUtils.clamp(state.rollVelocity,-5,5);
    state.pitch+=state.pitchVelocity*dt;state.roll+=state.rollVelocity*dt;center.y+=velocity.y*dt;pose();
    let bodyContact=false;
    // Hard travel stops and actual belly/roof contacts are solved about the COM,
    // so one remaining contact rotates the chassis instead of levitating it.
    for(let iteration=0;iteration<6;iteration++){
      if(up.y>.25)for(const local of wheels){
        wheelPoint(local);
        const floor=sample(point.x,point.z,point.y-tireRadius+Math.max(.04,-velocity.y*dt));
        project(local,floor,sample,velocity,tireRadius-compression*up.y);
      }
      for(const local of chassis){
        wheelPoint(local);
        const floor=sample(point.x,point.z,point.y+Math.max(.04,-velocity.y*dt));
        if(project(local,floor,sample,velocity,.012))bodyContact=true;
      }
    }
    position.copy(center).sub(lever.copy(centerOfMass).applyQuaternion(rotation));position.y+=eyeHeight;
    let contacts=0;
    for(let i=0;i<wheels.length;i++){
      wheelPoint(wheels[i]);const wheel=state.wheels[i];
      const floor=sample(point.x,point.z,point.y-tireRadius+.04),gap=point.y-tireRadius-floor;
      const target=up.y>.25?THREE.MathUtils.clamp(-gap/(up.y*scale),-SUSPENSION_LIMITS.droop,SUSPENSION_LIMITS.compression):-SUSPENSION_LIMITS.droop;
      wheel.velocity=THREE.MathUtils.clamp(wheel.velocity+((target-wheel.offset)*225-wheel.velocity*30)*dt,-3,3);
      wheel.offset=THREE.MathUtils.clamp(wheel.offset+wheel.velocity*dt,-SUSPENSION_LIMITS.droop,SUSPENSION_LIMITS.compression);
      // A tire contacting terrain cannot visually lag below its collision ray.
      if(up.y>.25&&gap+wheel.offset*up.y*scale<0){wheel.offset=target;wheel.velocity=0;}
      wheel.contact=up.y>.25&&gap<=droop*up.y+.008&&Math.abs(gap+wheel.offset*up.y*scale)<.015;
      if(wheel.contact)contacts++;
    }
    state.grounded=bodyContact||contacts>0;
    return state;
  }
  return {state,step,reset};
}
