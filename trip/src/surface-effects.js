import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { applyMineralFinish, createLunarEnvironment } from './surface-materials.js';

const noise = /* glsl */`
float hash(vec3 p){p=fract(p*.3183099+vec3(.13,.37,.71));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float valueNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return valueNoise(p)*.57+valueNoise(p*2.03)*.28+valueNoise(p*4.07)*.15;}
`;
const vertex = /* glsl */`
varying vec3 vWorld; varying vec3 vNormalWorld;
void main(){vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;vNormalWorld=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*world;}
`;

// Fade only the outer map perimeter into the black lunar horizon.
// Applied after lighting so the terrain and rocks fade together.
function applyRadialBoundaryFade(material) {
  const previousCompile = material.onBeforeCompile;
  material.onBeforeCompile = function(shader, renderer) {
    previousCompile.call(this, shader, renderer);
    shader.uniforms.uHorizonColor={value:new THREE.Color(0x000000)};
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vBoundaryXZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvBoundaryXZ=(modelMatrix*vec4(transformed,1.)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vBoundaryXZ; uniform vec3 uHorizonColor;')
      .replace('#include <opaque_fragment>', `
        float boundaryFog=smoothstep(185.,220.,length(vBoundaryXZ));
        outgoingLight=mix(outgoingLight,uHorizonColor,boundaryFog);
        #include <opaque_fragment>
      `);
  };
}

// Grade in linear HDR before OutputPass applies filmic tone mapping and sRGB.
const lunarGrade={
  uniforms:{tDiffuse:{value:null}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tDiffuse;varying vec2 vUv;
    void main(){
      vec4 sampleColor=texture2D(tDiffuse,vUv);
      vec3 color=sampleColor.rgb;
      float luminance=dot(color,vec3(.2126,.7152,.0722));
      // Neutral charcoal shadows with restrained warm highlights.
      // The terrain supplies the palette; this pass unifies it.
      float highlights=smoothstep(.16,1.35,luminance);
      color*=mix(vec3(.98,.99,1.025),vec3(1.055,1.025,.975),highlights);
      float shadowLift=(1.-smoothstep(.03,.4,luminance))*smoothstep(0.,.025,luminance);
      color+=vec3(.003,.003,.006)*shadowLift;
      float gradedLuminance=dot(color,vec3(.2126,.7152,.0722));
      color=mix(vec3(gradedLuminance),color,.78);
      // Restrained sensor texture; stable grain avoids flicker during driving.
      float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
      color*=1.+grain*.035;
      gl_FragColor=vec4(max(color,vec3(0.)),sampleColor.a);
    }`
};

export function createSurfaceEffects(scene,camera,ground,ice,rockMaterial,sunlight){
  const time={value:0};
  scene.background=new THREE.Color(0x000000);
  // Keep the playable crater clear; only very distant objects fade to black.
  scene.fog=new THREE.Fog(0x000000,300,1100);
  ground.material.color.set(0x85837f);
  ground.material.bumpMap=null;
  ground.material.dithering=true;
  applyMineralFinish(ground.material);
  applyMineralFinish(rockMaterial,{rock:true});
  applyRadialBoundaryFade(ground.material);
  applyRadialBoundaryFade(rockMaterial);
  rockMaterial.color.set(0x64605a);rockMaterial.emissive.set(0x000000);
  scene.add(new THREE.HemisphereLight(0xa8bbef,0x494365,.12));
  ice.material.dispose();
  // Frost shares the same lighting and shadow reception as the regolith.
  ice.material=new THREE.MeshPhysicalMaterial({color:0xb2cde6,roughness:.42,metalness:0,clearcoat:.25,clearcoatRoughness:.40,
    transparent:true,opacity:.28,depthWrite:false,polygonOffset:true,
    polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  ice.receiveShadow=true;
  ice.material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>',
      '#include <common>\nvarying vec3 vFrostPosition;').replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvFrostPosition=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying vec3 vFrostPosition;\n'+noise)
      .replace('#include <color_fragment>',`#include <color_fragment>
        float radius=length(vFrostPosition.xz);
        if(radius>32.)discard;
        float frost=fbm(vFrostPosition*.22);
        diffuseColor.rgb*=.88+frost*.2;
        diffuseColor.a*=1.-smoothstep(24.,32.,radius);
      `)
      .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=mix(.34,.65,frost);
      `);
  };


  const sky=new THREE.Mesh(new THREE.SphereGeometry(650,48,24),new THREE.ShaderMaterial({uniforms:{uTime:time},side:THREE.BackSide,depthWrite:false,fog:false,vertexShader:vertex,fragmentShader:/* glsl */`
    uniform float uTime;varying vec3 vWorld;varying vec3 vNormalWorld;
    ${noise}
    void main(){vec3 d=normalize(vWorld-cameraPosition);
      // Airless black sky with sparse, faint stars and no atmospheric glow.
      vec3 color=vec3(0.);
      vec3 cell=floor(d*650.);
      float star=step(.9985,hash(cell))*pow(max(0.,1.-length(fract(d*650.)-.5)*2.),1.6);
      color+=vec3(.65,.73,.88)*star*smoothstep(0.,.035,d.y);
      gl_FragColor=vec4(color,1.);
    }`}));
  sky.renderOrder=-10;sky.frustumCulled=false;scene.add(sky);

  // Camera-relative distance keeps Earth fixed in the sky as the rover travels.
  // It still uses the depth buffer, so crater rims naturally occlude its lower edge.
  const earthDirection=new THREE.Vector3(.22,.20,-1).normalize().multiplyScalar(510);
  const earth=new THREE.Mesh(new THREE.SphereGeometry(26,64,40),new THREE.ShaderMaterial({
    fog:false,
    vertexShader:`varying vec3 vEarthNormal;varying vec3 vEarthPosition;
      void main(){vEarthNormal=normal;vEarthPosition=position;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:/* glsl */`
      varying vec3 vEarthNormal;varying vec3 vEarthPosition;
      ${noise}
      void main(){
        vec3 n=normalize(vEarthNormal);
        vec3 p=normalize(vEarthPosition);
        float continent=fbm(p*3.8+vec3(5.2,1.7,8.4));
        float land=smoothstep(.51,.56,continent);
        vec3 ocean=mix(vec3(.012,.07,.23),vec3(.035,.28,.55),fbm(p*9.));
        vec3 soil=mix(vec3(.10,.24,.15),vec3(.44,.39,.25),fbm(p*12.));
        vec3 color=mix(ocean,soil,land);
        float polar=smoothstep(.78,.96,abs(p.y));
        color=mix(color,vec3(.8,.9,.97),polar);
        // Warped cloud belts form soft, swirling white weather systems.
        vec3 warped=p*10.+vec3(sin(p.y*12.)*.65,0.,cos(p.x*9.)*.5);
        float cloud=smoothstep(.45,.68,fbm(warped));
        color=mix(color,vec3(.94,.98,1.),cloud*.88);
        float sun=dot(n,normalize(vec3(-.65,.8,1.)));
        float day=smoothstep(-.12,.25,sun);
        color*=mix(.025,.48+.65*max(sun,0.),day);
        float limb=pow(1.-max(n.z,0.),3.);
        color+=vec3(.055,.25,.52)*limb*day*.7;
        gl_FragColor=vec4(color*1.4,1.);
      }`
  }));
  earth.name='Distant Earth';
  earth.position.copy(camera.position).add(earthDirection);
  scene.add(earth);

  // Snap the shadow center in the light camera plane, rather than world X/Z.
  sunlight.castShadow=true;
  sunlight.shadow.mapSize.set(4096,4096);
  Object.assign(sunlight.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:300});
  sunlight.shadow.camera.updateProjectionMatrix();
  sunlight.shadow.bias=-.00004;
  sunlight.shadow.normalBias=.04;
  sunlight.shadow.radius=1;
  scene.add(sunlight.target);
  scene.traverse(object=>{
    if(object.isMesh && object.material?.isMeshStandardMaterial){
      object.castShadow=!object.material.transparent;object.receiveShadow=object.userData.receiveShadow??true;object.material.dithering=true;
    }
  });
  const sunOffset=sunlight.position.clone();
  const lightAxis=sunOffset.clone().normalize();
  const lightRight=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),lightAxis).normalize();
  const lightUp=new THREE.Vector3().crossVectors(lightAxis,lightRight).normalize();
  const shadowCenter=new THREE.Vector3();
  function alignShadows(){
    const texel=130/sunlight.shadow.mapSize.x;
    shadowCenter.set(camera.position.x,0,camera.position.z);
    const x=Math.round(shadowCenter.dot(lightRight)/texel)*texel;
    const y=Math.round(shadowCenter.dot(lightUp)/texel)*texel;
    const z=shadowCenter.dot(lightAxis);
    sunlight.target.position.copy(lightRight).multiplyScalar(x)
      .addScaledVector(lightUp,y).addScaledVector(lightAxis,z);
    sunlight.position.copy(sunOffset).add(sunlight.target.position);
    sunlight.target.updateMatrixWorld();
  }
  let composer,bloom,reflectionTarget;
  return {
    tick(dt){
      time.value+=dt;sky.position.copy(camera.position);

    },
    render(renderer){
      alignShadows();
      earth.position.copy(camera.position).add(earthDirection);
      sky.position.copy(camera.position);
      if(!reflectionTarget){
        reflectionTarget=createLunarEnvironment(renderer,sunOffset);
        scene.environment=reflectionTarget.texture;
        scene.environmentIntensity=.35;
      }
      if(!composer){
        composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
        bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.32,.8,.95);
        composer.addPass(bloom);
        composer.addPass(new ShaderPass(lunarGrade));
        composer.addPass(new OutputPass());
        const size=renderer.getSize(new THREE.Vector2());this.resize(size.x,size.y,renderer.getPixelRatio());
      }
      // Share the renderer with orbit view without changing its color treatment.
      const toneMapping=renderer.toneMapping,exposure=renderer.toneMappingExposure;
      renderer.toneMapping=THREE.AgXToneMapping;
      renderer.toneMappingExposure=1.12;
      try{composer.render();}
      finally{renderer.toneMapping=toneMapping;renderer.toneMappingExposure=exposure;}
    },
    resize(w,h,pixelRatio=1){if(composer){composer.setPixelRatio(Math.min(pixelRatio,1.5));composer.setSize(w,h);}}
  };
}
