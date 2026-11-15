import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAmericanFlag,FLAG_POSITION} from '../src/american-flag.js';
import {createPlayerPhysics} from '../src/player-physics.js';
import {ROVER_COLLIDER} from '../src/rover.js';
import {circleBoxContact} from '../src/collision-world.js';

function makeFlag(){
  const originalDocument=globalThis.document;
  const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){}};
  globalThis.document={createElement:()=>({getContext:()=>context})};
  try{return createAmericanFlag();}finally{globalThis.document=originalDocument;}
}

test('flag has dimensional creases and flutter with fixed supported edges',()=>{
  const originalDocument=globalThis.document;
  const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){}};
  globalThis.document={createElement:()=>({getContext:()=>context})};
  try{
    const flag=createAmericanFlag();
    assert.deepEqual(FLAG_POSITION,{x:2,z:13});
    const cloth=flag.root.getObjectByName('Unfurled stars and stripes');
    const positions=cloth.geometry.attributes.position;
    const before=positions.array.slice();
    flag.update(.5);
    let moved=0;
    for(let i=0;i<positions.count;i++){
      assert.equal(positions.getX(i),before[i*3]);
      assert.equal(positions.getY(i),before[i*3+1]);
      if(positions.getX(i)===0||positions.getY(i)>=3.32-1e-6)
        assert.ok(Math.abs(positions.getZ(i)-before[i*3+2])<1e-6);
      if(Math.abs(positions.getZ(i)-before[i*3+2])>1e-5)moved++;
    }
    assert.ok(moved>100);
    assert.equal(flag.scanPanel.parent,flag.root);
  }finally{globalThis.document=originalDocument;}
});

test('flag collision blocks the pole and raised fabric but allows driving underneath',()=>{
  const flag=makeFlag();flag.root.position.set(2,0,13);flag.updateColliders();
  const rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),flag.root.rotation.y);
  const direction=new THREE.Vector3(0,0,-1).applyQuaternion(rotation);
  function drive(x,y,flying=false){
    const position=new THREE.Vector3(x,y,3).applyMatrix4(flag.root.matrixWorld);
    const physics=createPlayerPhysics(position,()=>flying?2.4:0,flag.colliders,ROVER_COLLIDER);
    for(let i=0;i<180;i++){
      physics.update(1/60,{x:direction.x,z:direction.z});
      for(const box of flag.colliders){
        if(position.y-ROVER_COLLIDER.eyeHeight>=box.max.y||position.y<=box.min.y)continue;
        assert.equal(circleBoxContact(position.x,position.z,ROVER_COLLIDER.radius,box),null,'rover stays outside flag geometry even while sliding');
      }
    }
    return flag.root.worldToLocal(position.clone());
  }
  drive(0,ROVER_COLLIDER.eyeHeight);
  assert.ok(drive(.95,2.4+ROVER_COLLIDER.eyeHeight,true).z>.8,'fabric stops an elevated rover');
  assert.ok(drive(1.5,ROVER_COLLIDER.eyeHeight).z<-1,'space below the fabric remains open');
  flag.root.position.y=5;flag.updateColliders();
  assert.ok(flag.colliders[0].min.y>4.9,'colliders follow terrain elevation');
});
