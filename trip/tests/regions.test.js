import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { APOLLO_11, SOUTH_POLE, SOUTH_POLAR_SITES, WAYPOINT_REGIONS, lunarNormal } from '../src/regions.js';
import { layoutWaypoints } from '../src/waypoint-layout.js';
import { existsSync } from 'node:fs';
import { createSurfaceHeight } from '../src/surface-terrain.js';

test('waypoints use lunar map coordinates and follow the textured globe rotation',()=>{
  const normal=lunarNormal(APOLLO_11.latitude,APOLLO_11.longitude);
  assert(Math.abs(normal.length()-1)<1e-12);
  assert(normal.x>0&&normal.y>0&&normal.z<0);
  assert(lunarNormal(SOUTH_POLE.latitude,SOUTH_POLE.longitude).distanceTo(new THREE.Vector3(0,-1,0))<1e-12);
  const rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-1);
  const world=normal.clone().applyQuaternion(rotation);
  assert(world.distanceTo(normal)>.5);
  assert(world.applyQuaternion(rotation.clone().invert()).distanceTo(normal)<1e-12);
});

test('all requested sites have distinct south-polar locations and bundled hover pictures',()=>{
  assert.equal(WAYPOINT_REGIONS.length,7);
  assert(!WAYPOINT_REGIONS.some(region=>region.id==='north-pole'));
  assert.deepEqual(SOUTH_POLAR_SITES.map(site=>site.name),[
    'Shackleton Crater Rim','Malapert A','Mons Mouton','Nobile Crater Rim','Shackleton Connecting Ridge',
  ]);
  for(const region of WAYPOINT_REGIONS){
    assert(existsSync(new URL(`../public${region.image}`,import.meta.url)));
    assert(region.imageAlt&&region.imageCaption);
    if(region===APOLLO_11)continue;
    assert(region.latitude<=-80&&region.latitude>=-90);
    assert.equal(region.pole,-1);
  }
  const normals=SOUTH_POLAR_SITES.map(site=>lunarNormal(site.latitude,site.longitude));
  for(let i=0;i<normals.length;i++)for(let j=i+1;j<normals.length;j++)assert(normals[i].distanceTo(normals[j])>.001);
  assert(lunarNormal(-80.18,-3.79).z>0,'west longitude must map westward');
});

test('overlapping polar controls spread apart while preserving projected anchors',()=>{
  for(const [width,height] of [[1440,900],[360,640],[640,360]]){
    const points=Array.from({length:6},(_,i)=>({id:i,x:width/2+i,y:height-20+i}));
    const layout=layoutWaypoints(points,width,height);
    for(const point of layout){
      assert.equal(point.x,points[point.id].x);assert.equal(point.y,points[point.id].y);
      assert(point.targetX>=20&&point.targetX<=width-20);
      assert(point.targetY>=20&&point.targetY<=height-20);
      for(const other of layout)if(point!==other)assert(Math.hypot(point.targetX-other.targetX,point.targetY-other.targetY)>=44);
    }
  }
});

test('Apollo terrain removes the central bowl and rim while retaining distant relief',()=>{
  const polar=createSurfaceHeight(),apollo=createSurfaceHeight({centralCrater:false});
  assert(polar(0,0)<-12);
  assert(Math.abs(apollo(0,0))<.2);
  assert(polar(36,0)-apollo(36,0)>4);
  for(const [x,z] of [[0,61],[16,74],[100,20],[-120,-40]])assert(Math.abs(polar(x,z)-apollo(x,z))<1e-6);
  for(let x=-40;x<=40;x+=4)for(let z=-40;z<=40;z+=4)assert(Number.isFinite(apollo(x,z)));
});
