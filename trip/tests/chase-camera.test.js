import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {clearCameraPosition} from '../src/chase-camera.js';

test('front and rear low views stay low despite ridges and rocks along the sightline',()=>{
  for(const side of [-1,1]){
    const camera=new THREE.Vector3(0,.6,side*7.5);
    const floor=(_x,z)=>Math.abs(z)>=3&&Math.abs(z)<=5?2:0;
    const rock=new THREE.Box3(new THREE.Vector3(-1,0,-4),new THREE.Vector3(1,3,4));
    clearCameraPosition(camera,floor,[rock]);
    assert.deepEqual(camera.toArray(),[0,.6,side*7.5]);
  }
});
test('camera rises out of local terrain without moving toward the rover',()=>{
  const camera=new THREE.Vector3(0,.6,7.5);
  clearCameraPosition(camera,()=>2,[]);
  assert.deepEqual(camera.toArray(),[0,2.45,7.5]);
});
test('camera clears a rock at its own position while preserving orbit distance',()=>{
  const rock=new THREE.Box3(new THREE.Vector3(-1,0,7),new THREE.Vector3(1,3,8));
  const camera=new THREE.Vector3(0,.6,7.5);
  clearCameraPosition(camera,()=>0,[rock]);
  assert.deepEqual(camera.toArray(),[0,3.45,7.5]);
});
test('camera can orbit below an overhead rock without being forced above it',()=>{
  const rock=new THREE.Box3(new THREE.Vector3(-1,5,7),new THREE.Vector3(1,7,8));
  const camera=new THREE.Vector3(0,.6,7.5);
  clearCameraPosition(camera,()=>0,[rock]);
  assert.deepEqual(camera.toArray(),[0,.6,7.5]);
});
