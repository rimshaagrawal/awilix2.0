import * as THREE from 'three';

// Fixed-size pools keep long drives from allocating more meshes or particles.
export function createWheelParticles(scene,rover,sampleFloor){
  const capacity=240,gravelCount=160;
  const particles=Array.from({length:capacity},()=>({position:new THREE.Vector3(),velocity:new THREE.Vector3(),life:0,total:1,size:0,spin:0}));
  const gravel=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0x9da5af,roughness:.95,metalness:.05}),gravelCount);
  gravel.instanceMatrix.setUsage(THREE.DynamicDrawUsage);gravel.frustumCulled=false;
  scene.add(gravel);
  const dustCount=capacity-gravelCount,positions=new Float32Array(dustCount*3),opacity=new Float32Array(dustCount),sizes=new Float32Array(dustCount);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('opacity',new THREE.BufferAttribute(opacity,1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('size',new THREE.BufferAttribute(sizes,1).setUsage(THREE.DynamicDrawUsage));
  const dust=new THREE.Points(geometry,new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{pixelRatio:{value:1}},vertexShader:`
    attribute float opacity;attribute float size;uniform float pixelRatio;varying float alpha;
    void main(){alpha=opacity*(1.-smoothstep(135.,210.,length(position.xz)));vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(size*400.*pixelRatio/max(.1,-p.z),1.,24.);gl_Position=projectionMatrix*p;}`,
    fragmentShader:`varying float alpha;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(.55,.62,.7,alpha*(1.-smoothstep(.05,.5,r)));}`}));
  dust.frustumCulled=false;scene.add(dust);
  const dummy=new THREE.Object3D(),emitter=new THREE.Vector3();
  const contacts=[[-1,0,-.72],[1,0,-.72],[-1,0,.72],[1,0,.72]];
  let gravelCursor=0,dustCursor=0,wheel=0,emission=0;
  function spawn(velocity,speed,isDust){
    const indexWheel=wheel++%4;
    if(rover.getWheelContact){if(!rover.getWheelContact(indexWheel,emitter))return;}
    else{emitter.set(...contacts[indexWheel]);rover.root.children[0].localToWorld(emitter);}
    const floor=sampleFloor(emitter.x,emitter.z);
    // A wheel hanging off a rim should not kick up material from empty space.
    if(emitter.y-floor>.55)return;
    const index=isDust?gravelCount+(dustCursor++%dustCount):gravelCursor++%gravelCount;
    const p=particles[index];p.position.copy(emitter);p.position.y=Math.max(floor+.035,emitter.y+.02);
    p.velocity.set(-velocity.x*(.2+Math.random()*.25)+(Math.random()-.5)*1.6,.8+Math.random()*1.2+speed*.12,-velocity.z*(.2+Math.random()*.25)+(Math.random()-.5)*1.6);
    p.life=p.total=.65+Math.random()*.65;p.size=isDust?.055+Math.random()*.07:.018+Math.random()*.026;p.spin=Math.random()*6;
  }
  function updateBuffers(){
    for(let i=0;i<capacity;i++){
      const p=particles[i],fade=Math.min(1,p.life/.25);
      if(i<gravelCount){
        dummy.position.copy(p.position);dummy.rotation.set(p.spin,p.spin*.7,p.spin*.3);
        const boundary=1-THREE.MathUtils.smoothstep(Math.hypot(p.position.x,p.position.z),135,210);
        dummy.scale.setScalar(p.life>0?p.size*fade*boundary:0);dummy.updateMatrix();gravel.setMatrixAt(i,dummy.matrix);
      }else{
        const j=i-gravelCount;p.position.toArray(positions,j*3);opacity[j]=p.life>0?fade*.55:0;sizes[j]=p.size;
      }
    }
    gravel.instanceMatrix.needsUpdate=true;for(const a of Object.values(geometry.attributes))a.needsUpdate=true;
  }
  updateBuffers();
  return {
    get activeCount(){return particles.filter(p=>p.life>0).length;},
    reset(){emission=0;for(const p of particles)p.life=0;updateBuffers();},
    update(dt,velocity,grounded){
      const speed=Math.hypot(velocity.x,velocity.z);
      if(grounded&&speed>.35){
        rover.root.updateMatrixWorld(true);
        emission+=Math.min(180,speed*24)*dt;
        while(emission>=1){emission--;spawn(velocity,speed,false);if(wheel%2===0)spawn(velocity,speed,true);}
      }else emission=0;
      for(let i=0;i<capacity;i++){
        const p=particles[i];if(p.life<=0)continue;
        p.life-=dt;p.velocity.y-=9.81*dt;p.position.addScaledVector(p.velocity,dt);p.spin+=dt*4;
        const floor=sampleFloor(p.position.x,p.position.z)+p.size;
        if(p.position.y<floor){p.position.y=floor;if(p.velocity.y<-.5){p.velocity.y*=-.22;p.velocity.x*=.55;p.velocity.z*=.55;}else p.velocity.set(0,0,0);}
      }
      updateBuffers();
    },
    setPixelRatio(value){dust.material.uniforms.pixelRatio.value=Math.min(value,2);}
  };
}
