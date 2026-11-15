import * as THREE from 'three';

// Map Y is world Z; the pole marks the requested Apollo map coordinates.
export const FLAG_POSITION={x:2,z:13};

export function createAmericanFlag(){
  const root=new THREE.Group();root.name='Apollo American flag';
  const steel=new THREE.MeshStandardMaterial({color:0xd5d8dc,metalness:.85,roughness:.27});
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.032,3.4,16),steel);
  pole.position.y=1.65;root.add(pole);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),steel);
  cap.position.y=3.36;root.add(cap);

  const canvas=document.createElement('canvas');canvas.width=1520;canvas.height=800;
  const ctx=canvas.getContext('2d');
  for(let row=0;row<13;row++){
    ctx.fillStyle=row%2===0?'#b22234':'#ffffff';
    ctx.fillRect(0,row*800/13,1520,800/13+1);
  }
  const cantonWidth=1520*.4,cantonHeight=800*7/13;
  ctx.fillStyle='#3c3b6e';ctx.fillRect(0,0,cantonWidth,cantonHeight);
  ctx.fillStyle='#ffffff';
  for(let row=0;row<9;row++)for(let col=0;col<(row%2===0?6:5);col++){
    const x=(col*2+(row%2===0?1:2))*cantonWidth/12;
    const y=(row+1)*cantonHeight/10,r=800*.0308;
    ctx.beginPath();
    for(let point=0;point<10;point++){
      const angle=-Math.PI/2+point*Math.PI/5,radius=point%2===0?r:r*.382;
      const px=x+Math.cos(angle)*radius,py=y+Math.sin(angle)*radius;
      if(point===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();ctx.fill();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  const width=1.9,height=1;
  const geometry=new THREE.PlaneGeometry(width,height,96,48);
  const positions=geometry.attributes.position;
  const rest=new Float32Array(positions.count*3);
  // Fixed creases, held unfurled by a top crossbar as on the Apollo flag.
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i)+width/2,y=positions.getY(i),u=x/width;
    const depth=Math.sin(u*Math.PI*7+y*4)*.055*u+Math.sin(u*19-y*13)*.018*u;
    positions.setXYZ(i,x,y+2.82-.035*u*(.5-y),depth);
    rest.set([positions.getX(i),positions.getY(i),depth],i*3);
  }
  geometry.computeVertexNormals();
  const fabric=new THREE.MeshPhysicalMaterial({map:texture,side:THREE.DoubleSide,roughness:.92,
    sheen:.25,sheenColor:0xffffff,sheenRoughness:.85});
  // Thin fabric passes a little sunlight through its unlit side. Keep the
  // texture in that contribution so white stripes and the canton stay distinct.
  fabric.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
      #if NUM_DIR_LIGHTS > 0
        float clothBacklight=max(0.,dot(-normal,directionalLights[0].direction));
        reflectedLight.directDiffuse+=diffuseColor.rgb*directionalLights[0].color*clothBacklight*.18/3.14159265;
      #endif
    `);
  };
  fabric.customProgramCacheKey=()=>'apollo-thin-fabric-v1';
  const cloth=new THREE.Mesh(geometry,fabric);
  // A zero-thickness, folded sheet otherwise shadows itself at the resolution
  // of the terrain shadow map, producing dark bands as its vertices move.
  cloth.userData.receiveShadow=false;
  cloth.name='Unfurled stars and stripes';cloth.castShadow=true;root.add(cloth);
  const crossbar=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,width,12),steel);
  crossbar.rotation.z=Math.PI/2;crossbar.position.set(width/2,3.33,0);root.add(crossbar);
  // Present the starred front toward the approach from the rover station.
  root.rotation.y=-.18;
  const scanPanel=new THREE.Group();scanPanel.position.set(width/2,2.82,0);root.add(scanPanel);
  const localColliders=[new THREE.Box3(new THREE.Vector3(-.045,-.05,-.045),new THREE.Vector3(.045,3.41,.045))];
  // Separate elevated strips preserve empty space below the fabric and keep
  // the rotated sheet's collision close to the cloth, including its flutter.
  for(let strip=0;strip<12;strip++)localColliders.push(new THREE.Box3(
    new THREE.Vector3(strip*width/12,2.28,-.14),
    new THREE.Vector3((strip+1)*width/12,3.35,.14)));
  const colliders=localColliders.map(()=>new THREE.Box3());
  let time=0;
  return {root,scanPanel,width,height,colliders,updateColliders(){
    root.updateWorldMatrix(true,false);
    localColliders.forEach((box,i)=>colliders[i].copy(box).applyMatrix4(root.matrixWorld));
  },update(dt){
    time+=dt;
    for(let i=0;i<positions.count;i++){
      const x=rest[i*3],y=rest[i*3+1],u=x/width;
      // Keep the hoist and top support fixed while the free cloth gently ripples.
      const free=u*THREE.MathUtils.clamp((3.32-y)/height,0,1);
      positions.setZ(i,rest[i*3+2]+free*(Math.sin(u*10-time*1.8+y*5)*.045+Math.sin(u*17-time*1.1)*.015));
    }
    positions.needsUpdate=true;geometry.computeVertexNormals();
  }};
}
