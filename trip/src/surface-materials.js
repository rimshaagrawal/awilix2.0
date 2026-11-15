import * as THREE from 'three';

// Linear HDR radiance: warm, broad sunlight, a cool sky, and low ground bounce.
// PMREM convolves this once for every material roughness, without a live cube
// capture or a second scene render on each frame.
export function createLunarEnvironment(renderer, sunDirection) {
  const width=512,height=256,data=new Float32Array(width*height*4);
  const sun=sunDirection.clone().normalize();
  for(let y=0;y<height;y++){
    const theta=(1-(y+.5)/height)*Math.PI,dy=Math.cos(theta),ring=Math.sin(theta);
    const sky=THREE.MathUtils.smoothstep(dy,0,.8);
    const horizon=Math.exp(-Math.abs(dy)*5);
    for(let x=0;x<width;x++){
      const phi=((x+.5)/width-.5)*Math.PI*2;
      const dx=ring*Math.cos(phi),dz=ring*Math.sin(phi);
      const alignment=Math.max(0,dx*sun.x+dy*sun.y+dz*sun.z);
      const glow=Math.pow(alignment,8)*.75;
      const softSun=Math.pow(alignment,100)*7;
      const offset=(y*width+x)*4;
      const base=dy>=0?
        [THREE.MathUtils.lerp(.43,.13,sky),THREE.MathUtils.lerp(.50,.21,sky),THREE.MathUtils.lerp(.66,.39,sky)]:
        [.115,.12,.17];
      data[offset]=base[0]+horizon*.16+glow+softSun;
      data[offset+1]=base[1]+horizon*.13+glow*.79+softSun*.88;
      data[offset+2]=base[2]+horizon*.10+glow*.57+softSun*.69;
      data[offset+3]=1;
    }
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);
  texture.mapping=THREE.EquirectangularReflectionMapping;
  texture.colorSpace=THREE.LinearSRGBColorSpace;texture.needsUpdate=true;
  const pmrem=new THREE.PMREMGenerator(renderer);
  const target=pmrem.fromEquirectangular(texture);
  target.texture.name='Lunar sky and broad sun reflections';
  texture.dispose();pmrem.dispose();
  return target;
}

const mineralNoise=/* glsl */`
float mineralHash(vec3 p){p=fract(p*.3183099+vec3(.13,.37,.71));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float mineralNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(mix(mineralHash(i),mineralHash(i+vec3(1,0,0)),f.x),mix(mineralHash(i+vec3(0,1,0)),mineralHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(mineralHash(i+vec3(0,0,1)),mineralHash(i+vec3(1,0,1)),f.x),mix(mineralHash(i+vec3(0,1,1)),mineralHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;

export function applyMineralFinish(material,{rock=false}={}) {
  material.roughness=1;
  material.metalness=0;
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 vMineralWorld;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvMineralWorld=(modelMatrix*vec4(position,1.)).xyz;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nvarying vec3 vMineralWorld;\n'+mineralNoise)
      .replace('#include <color_fragment>',`#include <color_fragment>
        // Broad, irregular deposits rather than repeated bright-edged dimples.
        float deposit=mineralNoise(vMineralWorld*.055);
        float drift=mineralNoise(vMineralWorld*.31+vec3(deposit*2.));
        float aggregate=mineralNoise(vMineralWorld*7.3);
        float footprint=length(fwidth(vMineralWorld));
        float aggregateFade=1.-smoothstep(.045,.22,footprint);
        float grainFade=1.-smoothstep(.008,.055,footprint);
        float powder=mineralNoise(vMineralWorld*53.);
        float dust=smoothstep(.28,.74,deposit*.65+drift*.35);
        // Neutral charcoal with small areas of muted umber, never metallic gold.
        diffuseColor.rgb*=mix(vec3(.82,.81,.79),vec3(1.08,1.00,.86),dust);
        diffuseColor.rgb*=.91+.14*drift;
        diffuseColor.rgb*=1.+(aggregate-.5)*.065*aggregateFade+(powder-.5)*.055*grainFade;
      `)
      .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        // Packed powder stays matte; exposed rock retains a little more sheen.
        roughnessFactor=clamp(${rock?'.86':'.97'}+(drift-.5)*.045,${rock?'.82':'.94'},1.);
      `)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        // Millimetric aggregate and fine powder, not centimetric ridges.
        // Fade each frequency before it becomes smaller than a screen pixel.
        float relief=${rock?'.018':'.008'}*(aggregate-.5)*aggregateFade;
        relief+=${rock?'.0008':'.0008'}*(powder-.5)*grainFade;
        ${rock?'relief+=.028*mineralNoise(vMineralWorld*1.7);':''}
        vec3 dpdx=dFdx(-vViewPosition),dpdy=dFdy(-vViewPosition);
        vec3 rx=cross(dpdy,normal),ry=cross(normal,dpdx);
        float det=dot(dpdx,rx);
        vec3 grad=sign(det)*(dFdx(relief)*rx+dFdy(relief)*ry);
        normal=normalize(abs(det)*normal-grad);
      `);
  };
  material.customProgramCacheKey=()=>`lunar-mineral-${rock?'rock':'ground'}-v3`;
}

// Install after the rover's cloned armor materials have been built: Three.js
// material.clone() intentionally does not copy onBeforeCompile callbacks.
export function applyPaintFinish(material) {
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 vPaintPosition;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvPaintPosition=position;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nvarying vec3 vPaintPosition;\n'+mineralNoise)
      .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        float finishGrain=mineralNoise(vPaintPosition*85.);
        roughnessFactor=clamp(roughnessFactor+(.5-finishGrain)*.07,.24,.8);
      `);
  };
  material.customProgramCacheKey=()=> 'rover-satin-paint-v1';
}
