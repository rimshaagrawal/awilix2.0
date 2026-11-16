import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSurfaceHeight, updateTerrainGeometry } from '../src/surface-terrain.js';
import { SITE_TERRAIN_PROFILES } from '../src/site-topography.js';
import { SOUTH_POLAR_SITES } from '../src/regions.js';
import { createTerrainSampler, createPlayerPhysics } from '../src/player-physics.js';

const height=id=>createSurfaceHeight({siteId:id});
test('each of the five pins selects distinct deterministic, continuous terrain',()=>{
  const signatures=[];
  assert.deepEqual(Object.keys(SITE_TERRAIN_PROFILES).sort(),SOUTH_POLAR_SITES.map(site=>site.id).sort());
  for(const site of SOUTH_POLAR_SITES){
    const a=height(site.id),b=height(site.id),signature=[];
    for(let z=-220;z<=220;z+=5.5)for(let x=-220;x<=220;x+=5.5){
      const h=a(x,z);assert(Number.isFinite(h));assert.equal(h,b(x,z));assert(h>-65&&h<45);
      const slope=Math.hypot((a(x+.4,z)-a(x-.4,z))/.8,(a(x,z+.4)-a(x,z-.4))/.8);
      assert(slope<3,`${site.id}: unresolved spike at ${x},${z}`);
      // No bin boundaries or finite crater aprons may create discontinuities.
      assert(Math.abs(a(x+.0001,z)-h)<.0005);
      assert(Math.abs(a(x,z+.0001)-h)<.0005);
      if(x%55===0&&z%55===0)signature.push(h.toFixed(3));
    }
    signatures.push(signature.join(','));
  }
  assert.equal(new Set(signatures).size,5);
});

test('photo landmarks survive the random infill',()=>{
  const shackleton=height('shackleton-rim');
  assert(shackleton(-10,0)>shackleton(-80,0)+8,'raised, broken rim crest');
  assert(shackleton(-80,0)>shackleton(100,0)+30,'steep drop on the interior side');
  const malapert=height('malapert-a');
  assert(malapert(18,-18)<malapert(100,-18)-10,'broad degraded central basin');
  assert(malapert(-104,83)<malapert(-81,83)-8,'sharp foreground impact');
  const mouton=height('mons-mouton');
  assert(mouton(0,-22)>mouton(165,-22)+25,'raised mesa with surrounding lowland');
  assert(Math.abs(mouton(0,-22)-mouton(20,-22))<3,'broad summit rather than a pointed mountain');
  const nobile=height('nobile-rim');
  assert(nobile(-80,0)>nobile(135,0)+35,'upland drops into the crater along a terraced scarp');
  assert(nobile(25,0)>nobile(75,0)+15,'intermediate rim terrace');
  const ridge=height('connecting-ridge');
  for(const z of [-100,0,100]){
    const x=8+16*Math.sin(z/95);
    assert(ridge(x,z)>ridge(x+130,z)+25,'raised spine with low ground on both sides');
    assert(ridge(x,z)>ridge(x-130,z)+25);
  }
  assert(ridge(8,0)<ridge(8+16*Math.sin(100/95),100)-9,'saddle between ridge lobes');
});

test('switching sites updates the existing collision mesh, normals and bounds',()=>{
  const geometry=new THREE.PlaneGeometry(440,440,128,128);geometry.rotateX(-Math.PI/2);
  const positions=geometry.attributes.position,sampler=createTerrainSampler(geometry,440,128),centers=[];
  for(const site of [...SOUTH_POLAR_SITES,...SOUTH_POLAR_SITES].reverse()){
    const h=height(site.id);updateTerrainGeometry(geometry,h);
    assert.equal(geometry.attributes.position,positions,'sampler must retain the same buffer');
    assert(Math.abs(sampler(0,0)-h(0,0))<.00001);
    for(let i=0;i<positions.count;i+=31){
      assert(geometry.boundingBox.containsPoint(new THREE.Vector3().fromBufferAttribute(positions,i)));
      const normal=new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal,i);
      assert(Math.abs(normal.length()-1)<.00001);
    }
    centers.push(sampler(0,0));
  }
  assert.equal(new Set(centers).size,5);
  geometry.dispose();
});

test('the rover can settle on the spawn terrain at all five elevations',()=>{
  const geometry=new THREE.PlaneGeometry(440,440,128,128);geometry.rotateX(-Math.PI/2);
  const sampler=createTerrainSampler(geometry,440,128);
  for(const site of SOUTH_POLAR_SITES){
    updateTerrainGeometry(geometry,height(site.id));
    const rover=new THREE.Vector3(0,sampler(0,61)+12,61);
    const physics=createPlayerPhysics(rover,sampler,[],{eyeHeight:1.5,radius:.69});
    for(let frame=0;frame<180;frame++)physics.update(1/60,{x:0,z:0});
    assert(physics.grounded,site.id);
    assert(rover.y>=sampler(0,61)+1.5-.0001);
    assert(rover.y<sampler(0,61)+2.5);
    assert.equal(physics.velocity.y,0);
  }
  geometry.dispose();
});
