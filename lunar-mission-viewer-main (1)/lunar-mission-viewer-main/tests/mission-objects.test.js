import test from 'node:test';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MISSION_OBJECTS,createMissionObject,findMissionPlacement,inspectMissionPlacement,missionScanContent } from '../src/mission-objects.js';
import { createPhotoEncounter } from '../src/photo-encounter.js';
import { createRover, ROVER_COLLIDER } from '../src/rover.js';
import { SOUTH_POLAR_SITES, SOUTH_POLE } from '../src/regions.js';
import { createSurfaceHeight,updateTerrainGeometry } from '../src/surface-terrain.js';
import { createTerrainSampler } from '../src/player-physics.js';
import { ROVER_SPAWN, STATION_RADIUS, createRoverStation } from '../src/rover-station.js';

// Match the rendered triangles, station foundation, and scattered rock bounds.
function siteTerrain(id){
  const natural=createSurfaceHeight({siteId:id}),stationY=natural(ROVER_SPAWN.x,ROVER_SPAWN.z);
  const height=(x,z)=>THREE.MathUtils.lerp(stationY,natural(x,z),THREE.MathUtils.smoothstep(Math.hypot(x-ROVER_SPAWN.x,z-ROVER_SPAWN.z),STATION_RADIUS+.3,STATION_RADIUS+2));
  const geometry=new THREE.PlaneGeometry(440,440,512,512);geometry.rotateX(-Math.PI/2);updateTerrainGeometry(geometry,height);
  const terrainSample=createTerrainSampler(geometry,440,512),station=createRoverStation(stationY);
  const sample=(x,z)=>Math.max(terrainSample(x,z),station.sampleFloor(x,z)??-Infinity),rocks=[];
  for(let i=0;i<330;i++){
    const a=i*2.39996,r=37+(i*17.31)%150,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.hypot(x-ROVER_SPAWN.x,z-ROVER_SPAWN.z)<STATION_RADIUS+1.5)continue;
    const size=.15+(i%13)*.09,rock=new THREE.Mesh(new THREE.DodecahedronGeometry(1,1));
    rock.scale.set(size*1.5,size*.65,size);rock.position.set(x,height(x,z)+size*.2,z);rock.rotation.set(i,i*.3,i*.8);rock.updateMatrixWorld();
    rocks.push(new THREE.Box3().setFromObject(rock));rock.geometry.dispose();
  }
  return {sample,rocks,geometry};
}

test('all six polar sites have a scannable exhibit and source',()=>{
  assert.deepEqual(MISSION_OBJECTS.map(s=>s.siteId),[...SOUTH_POLAR_SITES,SOUTH_POLE].map(s=>s.id));
  assert.equal(new Set(MISSION_OBJECTS.map(s=>s.kind)).size,5);
  for(const spec of MISSION_OBJECTS){
    const html=missionScanContent(spec,{x:-24,z:68});
    assert.match(html,/https:\/\//);assert.ok(html.includes(spec.name));assert.ok(html.includes(spec.connection));
    assert.match(html,/Illustrative 3D replica/);assert.match(html,/X -24.0 · Y 68.0/);
    const site=[...SOUTH_POLAR_SITES,SOUTH_POLE].find(site=>site.id===spec.siteId);
    assert.ok(html.includes(`src="${site.image}"`),'card reuses the waypoint photo');
    assert.ok(existsSync(new URL(`../public${site.image}`,import.meta.url)),'site photo is bundled');
    for(const heading of ['About this site','What was found','Missions &amp; exploration'])assert.ok(html.includes(heading));
    const nestedHtml=missionScanContent(spec,{x:0,z:0},'/moon/');
    assert.ok(nestedHtml.includes(`src="/moon${site.image}"`),'site images respect nested deployments');
  }
});

for(const spec of MISSION_OBJECTS)test(`${spec.siteId}: stable gentle placement, grounded model, lighting, collision, and clear scan parking`,()=>{
  const {sample,rocks,geometry}=siteTerrain(spec.siteId);
  const p=findMissionPlacement(spec.siteId,sample,rocks);
  assert.deepEqual(p,findMissionPlacement(spec.siteId,sample,rocks));
  assert.ok(Math.hypot(p.x+24,p.z-68)<=32);
  assert.ok(p.maxGrade<=Math.tan(12*Math.PI/180));
  assert.ok(inspectMissionPlacement(sample,p.x,p.z,p.yaw).maxGrade<=Math.tan(12*Math.PI/180));
  assert.ok(Math.hypot(p.x,p.z-61)>=8,'clear of rover station');
  const object=createMissionObject(spec);object.place(p,sample);object.root.visible=true;
  assert.equal(object.root.children.filter(c=>c.isPointLight).length,2);
  const target=object.scanPanel.getWorldPosition(new THREE.Vector3());
  const normal=new THREE.Vector3(0,0,1).applyQuaternion(object.scanPanel.getWorldQuaternion(new THREE.Quaternion()));
  const parking=target.clone().addScaledVector(normal,9);parking.y=sample(parking.x,parking.z)+1.5;
  for(const box of [...object.colliders,...rocks])assert.ok(!box.clone().expandByScalar(.7).containsPoint(parking),'scan approach stays outside obstacles');
  const platformY=object.root.position.y;
  for(const support of object.root.children.filter(c=>c.isMesh&&c.geometry.type==='CylinderGeometry'&&c.position.y<-.04)){
    const center=support.getWorldPosition(new THREE.Vector3());
    assert.ok(Math.abs(center.y-support.scale.y/2-sample(center.x,center.z))<1e-6,'support rests on terrain');
  }
  assert.ok(Number.isFinite(platformY));assert.equal(object.colliders.length,1);
  // Exercise the full scan with the real rover heading/suspension code, rather
  // than a mock that immediately reports alignment.
  const originalDocument=globalThis.document,children=new Map();
  const fakeElement=()=>({hidden:false,textContent:'',setAttribute(){},removeAttribute(){},addEventListener(){},querySelector(selector){if(!children.has(selector))children.set(selector,fakeElement());return children.get(selector);}});
  globalThis.document={createElement:fakeElement};
  const rover=createRover(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();scene.add(object.root,rover.root);
  parking.y=sample(parking.x,parking.z)+ROVER_COLLIDER.eyeHeight;
  rover.update(0,parking.clone().add(new THREE.Vector3(0,-ROVER_COLLIDER.eyeHeight,0)),new THREE.Vector3(),0,true,sample);
  let scan;
  try{scan=createPhotoEncounter({element:{parentElement:{appendChild(){}}},scene,camera,panel:object.scanPanel,width:object.width,height:object.height,
    position:parking,rover,physics:{reset(){}},sampleFloor:sample,rocks:[...rocks,...object.colliders],eyeHeight:ROVER_COLLIDER.eyeHeight,
    promptText:`Scan ${spec.name}`,resultHtml:missionScanContent(spec,p),clearInput(){},releaseMouse(){}});
  }finally{globalThis.document=originalDocument;}
  scan.setActive(true);scan.update(1/60);assert.equal(children.get('.scan-prompt').hidden,false);
  scan.start();for(let i=0;i<600;i++)scan.update(1/60);
  assert.equal(scan.busy,false,'real rover finishes positioning and alignment');
  assert.equal(scan.presenting,true,'scan reveals the mission card');
  scan.setActive(false);assert.equal(scan.presenting,false,'region change cancels the card');
  object.update(1);geometry.dispose();
  console.log(`${spec.siteId}: (${p.x.toFixed(1)}, ${p.z.toFixed(1)}), max slope ${(Math.atan(p.maxGrade)*180/Math.PI).toFixed(1)}°`);
});
