import test from 'node:test';
import assert from 'node:assert/strict';
import {createRegolithData} from '../scripts/generate-regolith.mjs';

test('regolith maps are deterministic with varied, normalized relief and seamless albedo',()=>{
  const a=createRegolithData({size:128}),b=createRegolithData({size:128});
  assert.deepEqual(a.color,b.color);assert.deepEqual(a.normal,b.normal);
  let edgeDifference=0,interiorDifference=0,tilted=0;
  const values=new Set();
  for(let y=0;y<a.size;y++)for(let x=0;x<a.size;x++){
    const i=(y*a.size+x)*4,n=Array.from(a.normal.slice(i,i+3),v=>v/255*2-1);
    assert(Math.abs(Math.hypot(...n)-1)<.015,'normal must remain a unit vector after encoding');
    if(Math.hypot(n[0],n[1])>.04)tilted++;
    values.add(a.color[i]);assert.equal(a.color[i+3],255);
    if(x===0)edgeDifference+=Math.abs(a.color[i]-a.color[i+(a.size-1)*4]);
    else interiorDifference+=Math.abs(a.color[i]-a.color[i-4]);
  }
  assert(values.size>45,'albedo needs varied deposits and cavity occlusion');
  assert(tilted>a.size*a.size*.3,'relief must survive minification');
  assert(edgeDifference/a.size<interiorDifference/(a.size*(a.size-1))*2,'tile boundary must not form a visible stripe');
});
