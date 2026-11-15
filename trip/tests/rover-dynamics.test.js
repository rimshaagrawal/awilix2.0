import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRoverDynamics} from '../src/rover-dynamics.js';
import {createRover} from '../src/rover.js';

const stopped=new THREE.Vector3();
function settle(dynamics,floor,heading=0,position=new THREE.Vector3(),seconds=3,hz=60){
  for(let i=0;i<seconds*hz;i++)dynamics.update(1/hz,position,heading,stopped,true,0,floor);
  return dynamics.state;
}

test('chassis tilts uphill in both axes and tracks slopes after a heading change',()=>{
  const floor=(x,z)=>x*.3-z*.2;
  const d=createRoverDynamics();const s=settle(d,floor);
  assert(s.pitch>.15&&s.pitch<.25);assert(s.roll>.25&&s.roll<.35);
  settle(d,floor,Math.PI/2);
  assert(s.pitch<-.25&&s.pitch>-.35);assert(s.roll>.15&&s.roll<.25);
});

test('independent suspension articulates over a single wheel bump',()=>{
  const d=createRoverDynamics();
  settle(d,()=>0);
  const floor=(x,z)=>x>.3&&z<-.2?.22:0;
  // Suspension travels toward the bump instead of snapping in one frame.
  for(let i=0;i<12;i++)d.update(1/60,new THREE.Vector3(),0,stopped,true,0,floor);
  const wheels=d.state.wheels;
  assert(wheels[2].offset>wheels[0].offset+.2);
  assert(wheels.every(w=>Math.abs(w.offset)<=.5));
  settle(d,floor);
  assert(d.state.pitch>.05&&d.state.roll>.05);
});

test('wheel contacts remain on tilted ground and airborne tires stop emitting dust',()=>{
  const rover=createRover(),floor=(x,z)=>x*.25-z*.18;
  for(let i=0;i<180;i++)rover.update(1/60,new THREE.Vector3(0,.1,0),stopped,0,true,floor);
  rover.root.updateMatrixWorld(true);
  const contact=new THREE.Vector3();
  for(let i=0;i<4;i++){
    assert(rover.getWheelContact(i,contact));
    assert(Math.abs(contact.y-floor(contact.x,contact.z))<.005);
  }
  rover.update(1/60,new THREE.Vector3(0,4,0),new THREE.Vector3(0,-4,0),0,false,floor);
  assert(!rover.getWheelContact(0,contact));
  assert(rover.dynamics.pitch>.05,'takeoff retains chassis tilt');
});

test('a hard landing compresses suspension then settles without endless bouncing',()=>{
  const d=createRoverDynamics();const p=new THREE.Vector3();
  settle(d,()=>0);
  for(let i=0;i<30;i++)d.update(1/60,new THREE.Vector3(0,2,0),0,new THREE.Vector3(0,-9,0),false,0,()=>0);
  d.update(1/60,p,0,stopped,true,0,()=>0);
  assert(d.state.heave<-.01);
  settle(d,()=>0);
  assert(Math.abs(d.state.heave)<.001);assert(Math.abs(d.state.heaveVelocity)<.001);
});

test('fixed-step suspension gives consistent bump response at 30, 60 and 120 FPS',()=>{
  function drive(hz){
    const d=createRoverDynamics(),v=new THREE.Vector3(0,0,-4);
    for(let i=0;i<2*hz;i++){
      const t=(i+1)/hz,p=new THREE.Vector3(0,0,-4*t);
      d.update(1/hz,p,0,v,true,0,(x,z)=>.1*Math.sin(z*2)+.06*Math.cos(x*3));
    }
    return d.state;
  }
  const baseline=drive(120);
  for(const hz of [30,60]){
    const s=drive(hz);
    assert(Math.abs(s.pitch-baseline.pitch)<.04);
    assert(Math.abs(s.heave-baseline.heave)<.04);
  }
});

test('tilted deck clears ridges and dynamics reset clears stored momentum',()=>{
  const d=createRoverDynamics(),floor=(x,z)=>Math.abs(x)<.2&&Math.abs(z)<.3?.38:0;
  settle(d,()=>0);
  d.update(1/60,new THREE.Vector3(),0,stopped,true,0,floor);
  assert(d.state.heave+.67>=.38/.6);
  d.state.rollVelocity=2;d.reset();
  assert.equal(d.state.rollVelocity,0);assert.equal(d.state.heave,0);
  assert(d.state.wheels.every(w=>!w.contact));
});


test('wheel travel stays bounded across sharp rock edges and contact flicker',()=>{
  const d=createRoverDynamics();settle(d,()=>0);
  const p=new THREE.Vector3(),fall=new THREE.Vector3(0,-2,0);
  const floor=(x,z)=>x>.5&&z<0?.34:0;
  for(let i=0;i<480;i++){
    const previous=d.state.wheels.map(w=>w.offset);
    p.x=Math.sin(i*.05)*.08;
    const grounded=i%7!==0;
    d.update(1/60,p,0,grounded?stopped:fall,grounded,0,floor);
    for(let j=0;j<4;j++){
      assert(Number.isFinite(d.state.wheels[j].offset));
      assert(Math.abs(d.state.wheels[j].offset-previous[j])<=.050001);
      assert(Math.abs(d.state.wheels[j].velocity)<=3);
    }
    assert(Math.abs(d.state.pitch)<=.78&&Math.abs(d.state.roll)<=.78);
  }
});

test('stationary suspension settles on a discontinuous rock edge',()=>{
  const d=createRoverDynamics(),p=new THREE.Vector3();
  const floor=(x,z)=>x>.52&&z<0?.32:0;
  settle(d,floor,0,p,6);
  const previous=d.state.wheels.map(w=>w.offset);
  settle(d,floor,0,p,2);
  for(let i=0;i<4;i++)assert(Math.abs(d.state.wheels[i].offset-previous[i])<.002);
  assert(Math.abs(d.state.rollVelocity)<.002);
});

test('brief loss of contact does not inject repeated landing impulses',()=>{
  const d=createRoverDynamics(),p=new THREE.Vector3();settle(d,()=>0);
  for(let i=0;i<120;i++){
    const grounded=i%2===0;
    d.update(1/60,p,0,new THREE.Vector3(0,grounded?0:-6,0),grounded,0,()=>0);
  }
  assert(Math.abs(d.state.heave)<.001);
  assert(Math.abs(d.state.heaveVelocity)<.001);
});
