import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWheelParticles} from '../src/wheel-particles.js';

test('wheel particles emit only during grounded movement, remain bounded, and expire',()=>{
 const scene=new THREE.Scene(),root=new THREE.Group();root.add(new THREE.Group());scene.add(root);
 const particles=createWheelParticles(scene,{root},()=>0),moving=new THREE.Vector3(4,0,0);
 for(let i=0;i<60;i++)particles.update(1/60,moving,false);
 assert.equal(particles.activeCount,0);
 for(let i=0;i<60;i++)particles.update(1/60,new THREE.Vector3(),true);
 assert.equal(particles.activeCount,0);
 for(let i=0;i<300;i++)particles.update(1/60,moving,true);
 assert(particles.activeCount>0&&particles.activeCount<=240);
 for(let i=0;i<120;i++)particles.update(1/60,moving,false);
 assert.equal(particles.activeCount,0);
 particles.update(.05,moving,true);assert(particles.activeCount>0);
 particles.reset();assert.equal(particles.activeCount,0);
});
