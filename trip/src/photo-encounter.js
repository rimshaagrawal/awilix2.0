import * as THREE from 'three';
import { clearCameraPosition } from './chase-camera.js';
import { hudFrame } from './hud-frame.js';

export function createPhotoEncounter({element,scene,camera,panel,width,height,position,rover,physics,sampleFloor,rocks,eyeHeight,clearInput,releaseMouse,promptText='Scan image',resultHtml='<h2>Aaryan Srivastava</h2><p>Lunar Creature.</p>',setupCard,getReturnView,scanAudio,reducedMotion=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false}) {
  const ui=document.createElement('div');
  ui.className='photo-encounter';ui.hidden=true;
  ui.innerHTML=`<button class="scan-prompt hud-panel" hidden>${hudFrame()}<kbd>K</kbd><span><span class="hud-caption">TARGET IN RANGE</span>${promptText}</span></button>
    <div class="scan-status hud-panel" role="status" hidden>${hudFrame()}<span class="scan-status-text"></span></div>
    <aside class="creature-card hud-panel" aria-label="Scan result" hidden>
      ${hudFrame(true)}
      <button class="close-scan" aria-label="Close info card">×</button>
      <div class="scan-eyebrow">SCAN COMPLETE</div>
      ${resultHtml}
    </aside>`;
  element.parentElement.appendChild(ui);
  const prompt=ui.querySelector('.scan-prompt'),status=ui.querySelector('.scan-status'),card=ui.querySelector('.creature-card');
  const statusText=ui.querySelector('.scan-status-text');
  const cardMedia=setupCard?.(card);
  function hideCard(){card.hidden=true;card.removeAttribute('data-closing');cardMedia?.hide();}
  const normal=new THREE.Vector3(),target=new THREE.Vector3(),rotation=new THREE.Quaternion();
  const destination=new THREE.Vector3();
  const start=new THREE.Vector3(),previous=new THREE.Vector3(),motion=new THREE.Vector3();
  const initialCamera=new THREE.Vector3(),initialLook=new THREE.Vector3(),viewPosition=new THREE.Vector3(),viewTarget=new THREE.Vector3();
  const returnStart=new THREE.Vector3(),returnEnd=new THREE.Vector3();
  const returnRotation=new THREE.Quaternion(),returnEndRotation=new THREE.Quaternion();
  let returnDuration=1.15;
  const beamGeometry=new THREE.BufferGeometry();
  beamGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(9),3));
  const beam=new THREE.Mesh(beamGeometry,new THREE.MeshBasicMaterial({color:0x009dff,transparent:true,opacity:.15,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
  beam.frustumCulled=false;beam.visible=false;scene.add(beam);
  const gridMaterial=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{progress:{value:0}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform float progress;
      void main(){
        float row=1.-vUv.y;
        vec2 cell=vUv*vec2(10.,14.);
        vec2 edge=abs(fract(cell-.5)-.5)/max(fwidth(cell),vec2(.0001));
        float grid=1.-smoothstep(.5,1.5,min(edge.x,edge.y));
        float revealed=1.-smoothstep(progress-.012,progress+.012,row);
        float line=exp(-pow((row-progress)*90.,2.));
        float halo=exp(-pow((row-progress)*18.,2.));
        gl_FragColor=vec4(vec3(.02,.48,1.)*1.8,grid*revealed*.7+line*.95+halo*.12);
      }`
  });
  const grid=new THREE.Mesh(new THREE.PlaneGeometry(width,height),gridMaterial);
  grid.position.z=.075;grid.visible=false;panel.add(grid);
  const left=new THREE.Vector3(),right=new THREE.Vector3();
  let enabled=false,phase='idle',elapsed=0,discovered=false;
  const busy=()=>phase==='approach'||phase==='align'||phase==='scan'||phase==='return';
  function closeCard(){
    if(phase!=='done'||card.hidden)return;
    scanAudio?.cancelScan();
    phase='return';elapsed=0;returnDuration=reducedMotion()?0:1.15;
    clearInput();physics.reset();cardMedia?.hide();
    card.setAttribute('data-closing','');
    returnStart.copy(camera.position);returnRotation.copy(camera.quaternion);
    const view=getReturnView?.();
    if(view){returnEnd.copy(view.position);returnEndRotation.copy(view.quaternion);}
    else{
      returnEnd.copy(position).addScaledVector(normal,7.5);returnEnd.y+=1.5;
      const look=position.clone();look.y-=.7;
      clearCameraPosition(returnEnd,sampleFloor,rocks);
      returnEndRotation.setFromRotationMatrix(new THREE.Matrix4().lookAt(returnEnd,look,camera.up));
    }
    if(returnDuration===0)card.hidden=true;
  }
  function nearby(){panel.getWorldPosition(target);return Math.hypot(position.x-target.x,position.z-target.z)<17 && Math.abs(position.y-eyeHeight-sampleFloor(position.x,position.z))<4;}
  function startScan(){
    if(!enabled||busy()||!nearby())return;
    scanAudio?.prepareScan();
    normal.set(0,0,1).applyQuaternion(panel.getWorldQuaternion(rotation));
    destination.copy(target).addScaledVector(normal,9);
    clearInput();physics.reset();
    start.copy(position);initialCamera.copy(camera.position);
    camera.getWorldDirection(initialLook);initialLook.multiplyScalar(15).add(camera.position);
    elapsed=0;phase='approach';hideCard();prompt.hidden=true;
    status.hidden=false;statusText.textContent='POSITIONING ROVER';grid.visible=false;beam.visible=false;
    gridMaterial.uniforms.progress.value=0;
  }
  prompt.addEventListener('click',startScan);
  ui.querySelector('.close-scan').addEventListener('click',closeCard);
  function groundClearance(x,z){
    let floor=Math.max(sampleFloor(x,z),sampleFloor(x+.69,z),sampleFloor(x-.69,z),sampleFloor(x,z+.69),sampleFloor(x,z-.69));
    for(const box of rocks)if(x>box.min.x-.7&&x<box.max.x+.7&&z>box.min.z-.7&&z<box.max.z+.7)floor=Math.max(floor,box.max.y);
    return floor+eyeHeight;
  }
  return {
    get busy(){return busy();},
    get presenting(){return phase==='done'&&!card.hidden;},
    resume:closeCard,
    start:startScan,
    setActive(value){
      scanAudio?.cancelScan();
      enabled=value;ui.hidden=!value;phase='idle';elapsed=0;discovered=false;
      prompt.hidden=true;status.hidden=true;hideCard();grid.visible=false;beam.visible=false;
    },
    update(dt){
      if(!enabled)return false;
      if(phase==='return'){
        elapsed+=dt;
        const progress=returnDuration===0?1:Math.min(elapsed/returnDuration,1);
        const ease=progress*progress*(3-2*progress);
        camera.position.lerpVectors(returnStart,returnEnd,ease);
        clearCameraPosition(camera.position,sampleFloor,rocks);
        camera.quaternion.slerpQuaternions(returnRotation,returnEndRotation,ease);
        if(elapsed>=.65||progress===1)card.hidden=true;
        if(progress===1){phase='idle';card.removeAttribute('data-closing');}
        // Keep the last blend frame under encounter control for a clean handoff.
        return true;
      }
      if(phase==='done'&&!card.hidden)return true;
      if(!busy()){
        const near=nearby();prompt.hidden=!near||discovered;
        if(!near){hideCard();grid.visible=false;discovered=false;}
        return false;
      }
      elapsed+=dt;previous.copy(position);
      if(phase==='approach'){
        const t=Math.min(elapsed/2,1),ease=t*t*(3-2*t);
        position.lerpVectors(start,destination,ease);
        position.y=Math.max(groundClearance(position.x,position.z),THREE.MathUtils.lerp(start.y,groundClearance(destination.x,destination.z),ease));
        motion.subVectors(position,previous).divideScalar(Math.max(dt,.001));
        const feet=position.clone();feet.y-=eyeHeight;
        rover.update(dt,feet,motion,0,true,sampleFloor);
        if(t===1){phase='align';elapsed=0;physics.reset();}
      }else if(phase==='align'){
        const feet=position.clone();feet.y-=eyeHeight;
        rover.update(dt,feet,motion.set(0,0,0),0,true,sampleFloor);
        const headingError=rover.faceTowards(target,dt);
        if(elapsed>=.35&&headingError<.015){phase='scan';elapsed=0;}
      }else if(phase==='scan'){
        grid.visible=true;beam.visible=true;
        rover.faceTowards(target,dt);
        const progress=Math.min(elapsed/3,1);gridMaterial.uniforms.progress.value=progress;
        scanAudio?.scanProgress(progress);
        statusText.textContent=`SCANNING · ${Math.round(progress*100)}%`;
        panel.updateMatrixWorld(true);
        left.set(-width/2,height*(.5-progress),.09).applyMatrix4(panel.matrixWorld);
        right.set(width/2,height*(.5-progress),.09).applyMatrix4(panel.matrixWorld);
        const vertices=beamGeometry.attributes.position;
        vertices.setXYZ(0,position.x,position.y-.35,position.z);
        vertices.setXYZ(1,left.x,left.y,left.z);vertices.setXYZ(2,right.x,right.y,right.z);vertices.needsUpdate=true;
        if(progress===1){phase='done';discovered=true;grid.visible=false;beam.visible=false;status.hidden=true;card.hidden=false;clearInput();releaseMouse();scanAudio?.finishScan();}
      }
      // A wider, raised chase angle keeps both the rover and entire photo visible.
      viewTarget.copy(target).lerp(position,.28);
      viewPosition.copy(position).addScaledVector(normal,10);viewPosition.y+=5;
      const blend=phase==='approach'?THREE.MathUtils.smoothstep(elapsed/2,0,1):1;
      camera.position.lerpVectors(initialCamera,viewPosition,blend);
      camera.lookAt(initialLook.clone().lerp(viewTarget,blend));
      return true;
    }
  };
}
