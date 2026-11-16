import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPhotoEncounter } from '../src/photo-encounter.js';

function setup(options={}){
  const children=new Map();
  const fakeElement=()=>({hidden:false,textContent:'',attributes:new Map(),setAttribute(name,value){this.attributes.set(name,value);},removeAttribute(name){this.attributes.delete(name);},handlers:new Map(),addEventListener(name,handler){this.handlers.set(name,handler);},querySelector(selector){if(!children.has(selector))children.set(selector,fakeElement());return children.get(selector);}});
  const originalDocument=globalThis.document;
  globalThis.document={createElement:fakeElement};
  const scene=new THREE.Scene(),panel=new THREE.Group();panel.position.set(58,7,5);panel.rotation.y=Math.atan2(-58,-5);scene.add(panel);
  const position=new THREE.Vector3(0,1.5,49);
  let resets=0,releases=0,headingError=0;
  const camera=options.camera??new THREE.PerspectiveCamera();
  const encounter=createPhotoEncounter({element:{parentElement:{appendChild(){}}},scene,camera,panel,width:7,height:9,position,
    rover:{update(){},faceTowards(){return headingError;}},physics:{reset(){resets++;}},sampleFloor:()=>0,rocks:[],eyeHeight:1.5,clearInput(){},releaseMouse(){releases++;},...options});
  globalThis.document=originalDocument;
  return {encounter,position,children,scene,panel,camera,set headingError(value){headingError=value;},get resets(){return resets;},get releases(){return releases;}};
}

test('photo scan requires proximity, positions rover, scans, and reveals card in sequence',()=>{
  const s=setup();s.encounter.setActive(true);
  s.encounter.start();assert.equal(s.encounter.busy,false);
  s.position.set(51,1.5,5);s.encounter.update(.016);
  assert.equal(s.children.get('.scan-prompt').hidden,false);
  s.encounter.start();assert.equal(s.encounter.busy,true);
  assert.equal(s.children.get('.creature-card').hidden,true);
  // Repeated activation must not restart the approach.
  for(let i=0;i<120;i++){s.encounter.start();s.encounter.update(1/60);}
  assert.ok(s.position.distanceTo(new THREE.Vector3(49.033257,1.5,4.226999))<.01);
  assert.equal(s.children.get('.creature-card').hidden,true);
  for(let i=0;i<242;i++)s.encounter.update(1/60);
  assert.equal(s.encounter.busy,false);assert.equal(s.encounter.presenting,true);
  assert.equal(s.children.get('.creature-card').hidden,false);
  assert.equal(s.children.get('.scan-status').hidden,true);assert.equal(s.releases,1);
  assert.equal(s.encounter.update(.016),true);
  s.encounter.resume();assert.equal(s.encounter.update(.016),true);
  for(let i=0;i<70;i++)s.encounter.update(1/60);
  assert.equal(s.encounter.update(.016),false);
  s.position.set(0,1.5,49);s.encounter.update(.016);
  assert.equal(s.children.get('.scan-prompt').hidden,true);
});

test('closing a card blends camera position and rotation back to the driving view',()=>{
  const end=new THREE.Vector3(55,4,15),endRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.12,.5,0));
  const s=setup({getReturnView:()=>({position:end,quaternion:endRotation})});
  s.position.set(51,1.5,5);s.encounter.setActive(true);s.encounter.start();
  for(let i=0;i<400;i++)s.encounter.update(1/60);
  const start=s.camera.position.clone(),startRotation=s.camera.quaternion.clone(),roverPosition=s.position.clone();
  s.children.get('.close-scan').handlers.get('click')();
  assert.equal(s.encounter.busy,true);assert.equal(s.encounter.presenting,false);
  assert.equal(s.children.get('.creature-card').hidden,false,'card remains visible during its exit');
  s.encounter.update(0);
  assert.ok(s.camera.position.distanceTo(start)<1e-9);
  assert.ok(s.camera.quaternion.angleTo(startRotation)<1e-6);
  s.encounter.update(.575);
  assert.ok(s.camera.position.distanceTo(start.clone().lerp(end,.5))<1e-8);
  assert.ok(s.camera.quaternion.angleTo(startRotation.clone().slerp(endRotation,.5))<1e-6);
  s.encounter.resume();s.encounter.start(); // Neither action may restart the return.
  s.encounter.update(.1);assert.equal(s.children.get('.creature-card').hidden,true);
  s.encounter.update(.475);
  assert.equal(s.encounter.busy,false);assert.ok(s.camera.position.distanceTo(end)<1e-8);
  assert.ok(s.camera.quaternion.angleTo(endRotation)<1e-6);
  assert.deepEqual(s.position,roverPosition);
  assert.equal(s.encounter.update(.016),false);
});

test('return transition cancels on region change and reduced motion skips the blend',()=>{
  const end=new THREE.Vector3(50,3,15),quaternion=new THREE.Quaternion();
  for(const reduced of [false,true]){
    const s=setup({getReturnView:()=>({position:end,quaternion}),reducedMotion:()=>reduced});
    s.position.set(51,1.5,5);s.encounter.setActive(true);s.encounter.start();
    for(let i=0;i<400;i++)s.encounter.update(1/60);
    s.encounter.resume();
    if(reduced){s.encounter.update(0);assert.ok(s.camera.position.distanceTo(end)<1e-8);assert.equal(s.encounter.busy,false);}
    else{s.encounter.update(.2);assert.equal(s.encounter.busy,true);}
    s.encounter.setActive(false);
    const stopped=s.camera.position.clone();
    assert.equal(s.encounter.update(1),false);assert.deepEqual(s.camera.position,stopped);
    assert.equal(s.children.get('.creature-card').hidden,true);
  }
});

test('flag scan uses the world transform of a nested target and leaves result content empty',()=>{
  const s=setup({promptText:'Scan flag',resultHtml:''});
  const parent=new THREE.Group();parent.position.set(2,0,13);parent.rotation.y=-.18;
  s.scene.add(parent);parent.add(s.panel);s.panel.position.set(.95,2.82,0);s.panel.rotation.set(0,0,0);
  s.position.set(2,1.5,22);s.encounter.setActive(true);s.encounter.start();
  for(let i=0;i<400;i++)s.encounter.update(1/60);
  const target=s.panel.getWorldPosition(new THREE.Vector3());
  const normal=new THREE.Vector3(0,0,1).applyQuaternion(parent.quaternion);
  const expected=target.addScaledVector(normal,9);expected.y=1.5;
  assert.ok(s.position.distanceTo(expected)<.01);
  assert.equal(s.encounter.presenting,true);
  assert.equal(s.children.get('.creature-card').hidden,false);
  s.encounter.setActive(false);
  assert.equal(s.encounter.presenting,false);
});

test('grid waits for rover alignment, resets for each scan, and disappears on completion',()=>{
  const s=setup(),grid=s.panel.children.find(child=>child.isMesh),beam=s.scene.children.find(child=>child.isMesh);
  s.position.set(51,1.5,5);s.encounter.setActive(true);s.headingError=.4;s.encounter.start();
  for(let i=0;i<240;i++){
    s.encounter.update(1/60);
    assert.equal(grid.visible,false);assert.equal(beam.visible,false);
  }
  assert.equal(s.children.get('.creature-card').hidden,true);
  s.headingError=0;s.encounter.update(1/60);
  assert.equal(grid.visible,false);
  s.encounter.update(1/60);
  assert.equal(grid.visible,true);assert.equal(beam.visible,true);
  assert.ok(grid.material.uniforms.progress.value<.01);
  for(let i=0;i<181;i++)s.encounter.update(1/60);
  assert.equal(grid.visible,false);assert.equal(beam.visible,false);
  assert.equal(s.children.get('.creature-card').hidden,false);
  s.encounter.start();
  assert.equal(grid.visible,false);assert.equal(grid.material.uniforms.progress.value,0);
});

test('leaving the surface cancels a scan and clears its visuals and UI',()=>{
  const s=setup();s.position.set(51,1.5,5);s.encounter.setActive(true);s.encounter.start();
  for(let i=0;i<150;i++)s.encounter.update(1/60);
  s.encounter.setActive(false);
  assert.equal(s.encounter.busy,false);assert.equal(s.encounter.update(1),false);
  assert.equal(s.children.get('.creature-card').hidden,true);
  assert.equal(s.scene.children.find(child=>child.isMesh).visible,false);
});

test('scan audio starts with the beam, finishes once, and cancels on leaving',()=>{
  const events=[];
  const scanAudio={prepareScan(){events.push('prepare');},scanProgress(value){events.push(value);},finishScan(){events.push('complete');},cancelScan(){events.push('cancel');}};
  const s=setup({scanAudio});s.encounter.setActive(true);events.length=0;
  s.encounter.start();assert.deepEqual(events,[],'out-of-range activation stays silent');
  s.position.set(51,1.5,5);s.encounter.start();s.encounter.start();
  assert.deepEqual(events,['prepare']);
  s.headingError=.4;
  for(let i=0;i<240;i++)s.encounter.update(1/60);
  assert.deepEqual(events,['prepare'],'positioning and alignment stay silent');
  s.headingError=0;
  for(let i=0;i<200;i++)s.encounter.update(1/60);
  const progress=events.filter(value=>typeof value==='number');
  assert(progress.length>0&&progress[0]<.01&&progress.at(-1)===1);
  assert.equal(events.filter(value=>value==='complete').length,1);
  s.encounter.setActive(false);assert.equal(events.at(-1),'cancel');
  s.encounter.update(10);assert.equal(events.at(-1),'cancel');
});

test('closing the scan card, driving away, and changing region stop card media',()=>{
  let pauses=0;
  const s=setup({setupCard:()=>({hide(){pauses++;}})});
  function scan(){
    s.position.set(51,1.5,5);s.encounter.setActive(true);s.encounter.start();
    for(let i=0;i<400;i++)s.encounter.update(1/60);
    assert.equal(s.encounter.presenting,true);
  }
  scan();let before=pauses;
  s.children.get('.close-scan').handlers.get('click')();
  assert.equal(pauses,before+1);assert.equal(s.encounter.presenting,false);
  scan();before=pauses;s.encounter.resume();
  assert.equal(pauses,before+1);assert.equal(s.encounter.presenting,false);
  scan();before=pauses;s.encounter.setActive(false);
  assert.equal(pauses,before+1);assert.equal(s.encounter.presenting,false);
});
