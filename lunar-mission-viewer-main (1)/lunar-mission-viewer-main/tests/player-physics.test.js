import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPlayerPhysics,createTerrainSampler} from '../src/player-physics.js';
const idle={x:0,z:0,sprint:false};
function simulate(player,seconds,input=idle,fps=60){for(let i=0;i<seconds*fps;i++)player.update(1/fps,input);}

test('falls under gravity, lands, and stays above the ground',()=>{
 const p=new THREE.Vector3(0,7,0),player=createPlayerPhysics(p,()=>0);
 simulate(player,1);assert(p.y<2.2&&p.y>1.7);assert(!player.grounded);assert(Math.abs(player.velocity.y+9.81)<.001);
 simulate(player,4);assert.equal(p.y,1.7);assert(player.grounded);assert.equal(player.velocity.y,0);
});
test('jetpack spools up, accelerates while held, and coasts after release',()=>{
 const p=new THREE.Vector3(0,1.7,0),player=createPlayerPhysics(p,()=>0);
 const thrust={...idle,jetpack:true};simulate(player,.1);
 player.update(1/120,thrust);assert(player.throttle>0&&player.throttle<.1);assert(player.velocity.y<.1);
 simulate(player,1,thrust);const first=player.velocity.y;assert(first>3);assert(p.y>2.5);
 simulate(player,1,thrust);assert(player.velocity.y>first);
 const speed=player.velocity.y,altitude=p.y;simulate(player,.5);
 assert(p.y>altitude);assert(player.velocity.y<speed);assert(player.velocity.y>0);
 simulate(player,20);assert.equal(p.y,1.7);assert(player.grounded);
});
test('jetpack can brake a fall and relight while airborne',()=>{
 const p=new THREE.Vector3(0,30,0),player=createPlayerPhysics(p,()=>0);
 simulate(player,1);assert(player.velocity.y<0);
 simulate(player,1.5,{...idle,jetpack:true});assert(player.velocity.y>0);assert(!player.grounded);
});
test('jetpack speed is limited and the upper flight boundary remains bounded',()=>{
 const p=new THREE.Vector3(0,1.7,0),player=createPlayerPhysics(p,()=>0);
 for(let i=0;i<2400;i++){player.update(1/60,{...idle,jetpack:true});assert(player.velocity.y<=12);assert(p.y<160);}
});
test('ascending flight cannot pass through the underside of a rock',()=>{
 const box=new THREE.Box3(new THREE.Vector3(-2,5,-2),new THREE.Vector3(2,7,2));
 const p=new THREE.Vector3(0,1.7,0),player=createPlayerPhysics(p,()=>0,[box]);
 simulate(player,3,{...idle,jetpack:true});assert(p.y<5);assert(p.y>4.9);
});
test('rock collisions block movement, while the player can land on top',()=>{
 const box=new THREE.Box3(new THREE.Vector3(2,0,-2),new THREE.Vector3(4,2,2));
 const p=new THREE.Vector3(0,1.7,0),player=createPlayerPhysics(p,()=>0,[box]);
 simulate(player,2,{x:1,z:0});assert(p.x<1.7);assert(p.x>1.5);
 p.set(3,7,0);player.reset();simulate(player,4);assert.equal(p.y,3.7);assert(player.grounded);
});
test('walks over low steps but cannot scale a steep crater wall',()=>{
 const p=new THREE.Vector3(0,1.7,0),player=createPlayerPhysics(p,x=>Math.max(0,x-2)*3);
 simulate(player,2,{x:1,z:0});assert(p.x<2.1);
 const q=new THREE.Vector3(0,1.7,0),step=new THREE.Box3(new THREE.Vector3(1,0,-1),new THREE.Vector3(2,.25,1));
 const walker=createPlayerPhysics(q,()=>0,[step]);simulate(walker,.5,{x:1,z:0});assert(q.x>1);assert.equal(q.y,1.95);
});
test('powered flight is stable at different frame rates',()=>{
 const result=fps=>{const p=new THREE.Vector3(0,1.7,0),player=createPlayerPhysics(p,()=>0);simulate(player,.2);simulate(player,2,{...idle,jetpack:true},fps);return p.y;};
 assert(Math.abs(result(30)-result(144))<.03);
});
test('samples the rendered terrain triangles rather than an approximate height',()=>{
 const g=new THREE.PlaneGeometry(2,2,1,1);g.rotateX(-Math.PI/2);
 const p=g.attributes.position;p.setY(0,0);p.setY(1,0);p.setY(2,0);p.setY(3,4);
 const sample=createTerrainSampler(g,2,1);
 assert.equal(sample(-.5,-.5),0);assert.equal(sample(.5,.5),2);
});
test('circular perimeter stops outward velocity',()=>{
 const p=new THREE.Vector3(179,1.7,0),player=createPlayerPhysics(p,()=>0);
 simulate(player,3,{x:1,z:0,sprint:true});assert(Math.hypot(p.x,p.z)<=180.00001);assert.equal(player.velocity.x,0);
});

test('Earth-like gravity ends upward coasting promptly after releasing thrust',()=>{
 const p=new THREE.Vector3(0,50,0),player=createPlayerPhysics(p,()=>0);
 player.velocity.y=8;
 simulate(player,1);assert(player.velocity.y<0);assert(p.y<54);
 simulate(player,4);assert(player.grounded);assert.equal(p.y,1.7);
});
