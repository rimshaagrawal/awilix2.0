import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRover,ROVER_COLLIDER} from '../src/rover.js';
import {createPlayerPhysics} from '../src/player-physics.js';

test('rover model has four animated boosters that follow throttle',()=>{
 const rover=createRover();const position=new THREE.Vector3(0,2,0),velocity=new THREE.Vector3();
 rover.update(1/60,position,velocity,0,false,()=>0);
 const flames=[];let light;
 rover.root.traverse(o=>{if(o.isMesh&&o.material.isShaderMaterial)flames.push(o);if(o.isPointLight)light=o;});
 assert.equal(flames.length,4);assert(flames.every(f=>!f.visible));assert.equal(light.intensity,0);
 rover.update(1/60,position,velocity,.8,false,()=>0);
 assert(flames.every(f=>f.visible&&f.position.y<.37));assert.equal(light.intensity,3.2);
 assert.deepEqual(rover.root.position.toArray(),position.toArray());
});
test('rover collision dimensions keep the wider chassis out of rocks',()=>{
 const p=new THREE.Vector3(0,ROVER_COLLIDER.eyeHeight,0);
 const box=new THREE.Box3(new THREE.Vector3(3,0,-3),new THREE.Vector3(4,3,3));
 const player=createPlayerPhysics(p,()=>0,[box],ROVER_COLLIDER);
 for(let i=0;i<180;i++)player.update(1/60,{x:1,z:0});
 assert.equal(p.y,ROVER_COLLIDER.eyeHeight);assert(p.x<=box.min.x-ROVER_COLLIDER.radius+.01&&p.x>box.min.x-ROVER_COLLIDER.radius-.12);assert(player.grounded);
});
