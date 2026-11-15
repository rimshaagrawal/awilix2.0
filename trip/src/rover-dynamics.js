import * as THREE from 'three';
import { SUSPENSION_LIMITS } from './vehicle-support.js';

export const WHEEL_CONTACTS=[[-1,-.72],[-1,.72],[1,-.72],[1,.72]];

// A spring/damper chassis over four independent tire contacts. Translation and
// obstacle blocking remain with the fixed-step controller; suspension owns pose.
export function createRoverDynamics(scale=.6,{halfWheelbase=.72}={}){
  const contacts=WHEEL_CONTACTS.map(([x,z])=>[x,Math.sign(z)*halfWheelbase]);
  const state={pitch:0,roll:0,heave:0,pitchVelocity:0,rollVelocity:0,heaveVelocity:0,
    wheels:contacts.map(()=>({offset:0,velocity:0,contact:false}))};
  let accumulator=0,initialized=false,wasGrounded=false,lastVy=0,lastForward=0,lastSide=0,airTime=0;
  const heights=new Array(4),wheelPoint=new THREE.Vector3(),rotation=new THREE.Quaternion();
  function reset(){
    Object.assign(state,{pitch:0,roll:0,heave:0,pitchVelocity:0,rollVelocity:0,heaveVelocity:0});
    for(const wheel of state.wheels){wheel.offset=0;wheel.velocity=0;wheel.contact=false;}
    initialized=false;accumulator=0;wasGrounded=false;lastVy=lastForward=lastSide=airTime=0;
  }
  function update(dt,position,heading,velocity,grounded,throttle,sample){
    const sin=Math.sin(heading),cos=Math.cos(heading);
    for(let i=0;i<4;i++){
      const [x,z]=contacts[i];
      const height=sample(position.x+scale*(x*cos+z*sin),position.z+scale*(-x*sin+z*cos));
      // A wheel hanging over a cliff cannot pull the entire chassis toward its floor.
      heights[i]=THREE.MathUtils.clamp(height,position.y-.35,position.y+.35);
    }
    const front=(heights[0]+heights[2])*.5,back=(heights[1]+heights[3])*.5;
    const left=(heights[0]+heights[1])*.5,right=(heights[2]+heights[3])*.5;
    const forward=-velocity.x*sin-velocity.z*cos,side=velocity.x*cos-velocity.z*sin;
    const accel=initialized&&dt>0?THREE.MathUtils.clamp((forward-lastForward)/dt,-24,24):0;
    const sideAccel=initialized&&dt>0?THREE.MathUtils.clamp((side-lastSide)/dt,-24,24):0;
    const targetPitch=THREE.MathUtils.clamp(Math.atan2(front-back,2*halfWheelbase*scale)+accel*.004,-.65,.65);
    const targetRoll=THREE.MathUtils.clamp(Math.atan2(right-left,2*scale)-sideAccel*.005,-.65,.65);
    const targetHeave=THREE.MathUtils.clamp(((front+back)*.5-position.y)/scale,-.12,.12);
    if(!initialized){
      if(grounded){state.pitch=targetPitch;state.roll=targetRoll;state.heave=targetHeave;}
      initialized=true;
    }
    if(grounded&&!wasGrounded&&airTime>.1){
      const impact=Math.min(12,Math.max(0,-lastVy));
      state.heaveVelocity-=impact*.16;
      state.pitchVelocity+=(targetPitch-state.pitch)*impact*.35;
      state.rollVelocity+=(targetRoll-state.roll)*impact*.35;
    }
    accumulator+=Math.min(Math.max(dt,0),.1);
    while(accumulator+1e-10>=1/120){
      const h=1/120;
      if(grounded){
        state.pitchVelocity+=((targetPitch-state.pitch)*95-state.pitchVelocity*19)*h;
        state.rollVelocity+=((targetRoll-state.roll)*105-state.rollVelocity*20)*h;
        state.heaveVelocity+=((targetHeave-state.heave)*145-state.heaveVelocity*24)*h;
      }else{
        // Carry the takeoff rotation into flight; boosters gently stabilize it.
        state.pitchVelocity+=(-state.pitchVelocity*.65-state.pitch*throttle*4)*h;
        state.rollVelocity+=(-state.rollVelocity*.65-state.roll*throttle*4)*h;
        state.heaveVelocity+=(-state.heave*65-state.heaveVelocity*10)*h;
      }
      for(const key of ['pitch','roll','heave']){
        state[key]+=state[key+'Velocity']*h;
        const limit=key==='heave'?.12:.78;
        if(Math.abs(state[key])>limit){state[key]=Math.sign(state[key])*limit;state[key+'Velocity']=0;}
      }
      accumulator=Math.max(0,accumulator-h);
    }
    rotation.setFromEuler(new THREE.Euler(state.pitch,0,state.roll));
    if(grounded){
      // Keep the underside of the tilted deck above crests and sharp ridges.
      let clearance=0;
      for(const x of [-.65,0,.65])for(const z of [-halfWheelbase-.1,0,halfWheelbase+.1]){
        wheelPoint.set(x,.67,z).applyQuaternion(rotation);
        const floor=sample(position.x+scale*(wheelPoint.x*cos+wheelPoint.z*sin),
          position.z+scale*(-wheelPoint.x*sin+wheelPoint.z*cos));
        clearance=Math.max(clearance,(floor-position.y)/scale-wheelPoint.y-state.heave+.025);
      }
      if(clearance>0){state.heave=Math.min(.12,state.heave+clearance);state.heaveVelocity=Math.max(0,state.heaveVelocity);}
    }
    // Solve within the physical travel bracket. Unbounded Newton corrections can
    // jump across a rock edge repeatedly as tilted suspension changes footprint.
    const elapsed=Math.min(Math.max(dt,0),.1);
    for(let i=0;i<4;i++){
      const [x,z]=contacts[i],wheel=state.wheels[i];
      function clearance(extension){
        wheelPoint.set(x,extension,z).applyQuaternion(rotation);
        const floor=sample(position.x+scale*(wheelPoint.x*cos+wheelPoint.z*sin),
          position.z+scale*(-wheelPoint.x*sin+wheelPoint.z*cos));
        return position.y+scale*(state.heave+wheelPoint.y)-floor;
      }
      let target=-SUSPENSION_LIMITS.droop,reachable=false;
      if(grounded){
        let low=-SUSPENSION_LIMITS.droop,high=SUSPENSION_LIMITS.compression;
        const bottom=clearance(low),top=clearance(high);
        reachable=bottom<=.015&&top>=-.015;
        if(bottom>0)target=low;
        else if(top<0)target=high;
        else{
          for(let j=0;j<12;j++){
            const mid=(low+high)*.5;
            if(clearance(mid)<0)low=mid;else high=mid;
          }
          target=high;
        }
      }
      // Critically damped, bounded travel also smooths contact loss and re-entry.
      let remaining=elapsed;
      while(remaining>1e-8){
        const h=Math.min(remaining,1/120);
        wheel.velocity+=((target-wheel.offset)*225-wheel.velocity*30)*h;
        wheel.velocity=THREE.MathUtils.clamp(wheel.velocity,-3,3);
        wheel.offset=THREE.MathUtils.clamp(wheel.offset+wheel.velocity*h,-SUSPENSION_LIMITS.droop,SUSPENSION_LIMITS.compression);
        if((wheel.offset===-SUSPENSION_LIMITS.droop&&wheel.velocity<0)||(wheel.offset===SUSPENSION_LIMITS.compression&&wheel.velocity>0))wheel.velocity=0;
        remaining-=h;
      }
      wheel.contact=grounded&&reachable&&Math.abs(clearance(wheel.offset))<.06;
    }
    airTime=grounded?0:airTime+elapsed;
    wasGrounded=grounded;lastVy=velocity.y;lastForward=forward;lastSide=side;
    return state;
  }
  return {state,update,reset};
}
