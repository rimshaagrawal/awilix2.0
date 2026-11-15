import * as THREE from 'three';
import { createSurfaceHeight, updateTerrainGeometry } from './surface-terrain.js';
import { createRover, ROVER_COLLIDER } from './rover.js';
import { createSurfaceEffects } from './surface-effects.js';
import { createRegolithMaps } from './regolith-texture.js';
import { clearCameraPosition } from './chase-camera.js';
import { createWheelParticles } from './wheel-particles.js';
import { createRoverAudio } from './rover-audio.js';
import { SURFACE_BOUNDS_RADIUS } from './collision-world.js';
import { createMouseCapture } from './mouse-capture.js';
import { createPlayerPhysics, createTerrainSampler } from './player-physics.js';
import { createPhotoEncounter } from './photo-encounter.js';
import { createRoverStation, ROVER_SPAWN, STATION_RADIUS } from './rover-station.js';
import { createAmericanFlag, FLAG_POSITION } from './american-flag.js';
import { flagScanContent, attachFlagScanMedia } from './flag-scan-content.js';
import { MISSION_OBJECTS, createMissionObject, findMissionPlacement, missionScanContent } from './mission-objects.js';

// Soft, silver lunar relief with a subtle illustrative polar frost layer.
export function createSurface(element) {
  const mouseCapture=createMouseCapture(element);
  const roverAudio=createRoverAudio({baseUrl:import.meta.env.BASE_URL});
  let exploring=false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(65, 1, .08, 1400);
  camera.position.set(0, 26, 67);
  camera.lookAt(0, -9, 0);
  const angles = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
  const keys = new Set();
  let active = false, dragging = false, lastX = 0, lastY = 0;
  let naturalHeight=createSurfaceHeight();
  // A level foundation keeps the circular deck clear of the surrounding relief.
  let stationGroundY=naturalHeight(ROVER_SPAWN.x,ROVER_SPAWN.z);
  function height(x,z){
    const distance=Math.hypot(x-ROVER_SPAWN.x,z-ROVER_SPAWN.z);
    return THREE.MathUtils.lerp(stationGroundY,naturalHeight(x,z),THREE.MathUtils.smoothstep(distance,STATION_RADIUS+.3,STATION_RADIUS+2));
  }
  const station=createRoverStation(stationGroundY);scene.add(station.root);
  const terrainSegments=512;
  const geometry = new THREE.PlaneGeometry(440,440,terrainSegments,terrainSegments);
  geometry.rotateX(-Math.PI/2);
  updateTerrainGeometry(geometry,height);
  const regolith=createRegolithMaps();
  const ground=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({...regolith,color:0x85837f,roughness:1}));
  scene.add(ground);
  const iceGeometry=new THREE.PlaneGeometry(69,69,160,160);iceGeometry.rotateX(-Math.PI/2);
  updateTerrainGeometry(iceGeometry,height,.06);
  const iceMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:`varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 p;
  void main(){float r=length(p.xz);float warped=r+sin(p.x*.5)*.16+sin(p.z*.65)*.12; if(r>32.)discard;
  float t=smoothstep(6.,32.,r);vec3 col=mix(vec3(.12,.22,.7),vec3(.12,.72,.48),t);
  float contour=pow(.5+.5*cos(warped*5.),14.); col+=vec3(.13,.25,.28)*contour;
  float alpha=(1.-smoothstep(27.,32.,r))*.69; gl_FragColor=vec4(col,alpha);}`});
  const iceMesh=new THREE.Mesh(iceGeometry,iceMaterial);scene.add(iceMesh);
  scene.add(new THREE.AmbientLight(0x9daadc,.08));
  const sunlight=new THREE.DirectionalLight(0xfff1df,2.35);sunlight.position.set(-100,32,-45);scene.add(sunlight);
  // Distant rocky relief frames the airless lunar horizon.
  const rockGeometry=new THREE.DodecahedronGeometry(1,1);
  const rockMaterial=new THREE.MeshStandardMaterial({color:0xb6b5bb,roughness:1});
  const rockColliders=[],rocks=[];
  for(let i=0;i<330;i++){
    const a=i*2.39996,r=37+(i*17.31)%150,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.hypot(x-ROVER_SPAWN.x,z-ROVER_SPAWN.z)<STATION_RADIUS+1.5)continue;
    const rock=new THREE.Mesh(rockGeometry,rockMaterial);const size=.15+(i%13)*.09;
    rock.scale.set(size*1.5,size*.65,size);rock.position.set(x,height(x,z)+size*.2,z);rock.rotation.set(i,i*.3,i*.8);scene.add(rock);
    rocks.push(rock);rock.updateMatrixWorld();rockColliders.push(new THREE.Box3().setFromObject(rock));
  }
  const terrainSample=createTerrainSampler(geometry,440,terrainSegments);
  const iceSample=createTerrainSampler(iceGeometry,69,160);
  const sampleFloor=(x,z)=>{
    const terrain=Math.hypot(x,z)<28?Math.max(terrainSample(x,z),iceSample(x,z)):terrainSample(x,z);
    return Math.max(terrain,station.sampleFloor(x,z)??-Infinity);
  };
  const americanFlag=createAmericanFlag();
  americanFlag.root.visible=false;scene.add(americanFlag.root);
  const rover=createRover();scene.add(rover.root);
  const roverPosition=new THREE.Vector3(ROVER_SPAWN.x,sampleFloor(ROVER_SPAWN.x,ROVER_SPAWN.z)+ROVER_COLLIDER.eyeHeight,ROVER_SPAWN.z),roverFeet=new THREE.Vector3();
  const wheelParticles=createWheelParticles(scene,rover,sampleFloor);
  const physics=createPlayerPhysics(roverPosition,sampleFloor,rockColliders,{...ROVER_COLLIDER,maxSlope:.85});
  const boundaryGeometry=new THREE.BufferGeometry();
  boundaryGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(720*3),3));
  const boundary=new THREE.LineLoop(boundaryGeometry,new THREE.LineDashedMaterial({color:0x81acb7,dashSize:1.4,gapSize:1.1,transparent:true,opacity:.5}));
  boundary.name='Survey perimeter';scene.add(boundary);
  function updateBoundary(){
    const vertices=boundaryGeometry.attributes.position;
    for(let i=0;i<vertices.count;i++){
      const angle=i/vertices.count*Math.PI*2,x=Math.cos(angle)*SURFACE_BOUNDS_RADIUS,z=Math.sin(angle)*SURFACE_BOUNDS_RADIUS;
      vertices.setXYZ(i,x,sampleFloor(x,z)+.09,z);
    }
    vertices.needsUpdate=true;boundaryGeometry.computeBoundingSphere();boundary.computeLineDistances();
  }
  updateBoundary();
  const flagEncounter=createPhotoEncounter({element,scene,camera,panel:americanFlag.scanPanel,width:americanFlag.width,height:americanFlag.height,position:roverPosition,rover,physics,sampleFloor,rocks:rockColliders,eyeHeight:ROVER_COLLIDER.eyeHeight,
    promptText:'Scan flag',resultHtml:flagScanContent(import.meta.env.BASE_URL),setupCard:attachFlagScanMedia,
    getReturnView,scanAudio:roverAudio,
    clearInput(){keys.clear();dragging=false;physics.clearInput();},releaseMouse(){mouseCapture.release();}
  });
  const missionObjects=MISSION_OBJECTS.map(spec=>{
    const object=createMissionObject(spec);scene.add(object.root);
    let content;
    // Build every HUD before main.js attaches its frame ResizeObservers.
    const scan=createPhotoEncounter({
      element,scene,camera,panel:object.scanPanel,width:object.width,height:object.height,position:roverPosition,rover,physics,
      sampleFloor,rocks:rockColliders,eyeHeight:ROVER_COLLIDER.eyeHeight,promptText:`Scan site · ${spec.site}`,
      resultHtml:'<div class="mission-result"></div>',getReturnView,scanAudio:roverAudio,
      setupCard(card){content=card.querySelector('.mission-result');card.addEventListener('keydown',event=>event.stopPropagation());},
      clearInput(){keys.clear();dragging=false;physics.clearInput();},releaseMouse(){mouseCapture.release();}
    });
    return {spec,object,encounter:scan,content};
  });
  let missionTarget=null;
  // Regions without a 3D scan target leave driving and the camera untouched.
  const noEncounter={busy:false,presenting:false,setActive(){},start(){},resume(){},update(){return false;}};
  let encounter=noEncounter;
  function selectEncounter(){
    if(encounter.busy||encounter.presenting)return;
    const next=americanFlag.root.visible?flagEncounter:(missionTarget?.encounter??noEncounter);
    if(next!==encounter){encounter.setActive(false);encounter=next;encounter.setActive(active);}
  }
  const chaseTarget=new THREE.Vector3(),chaseDesired=new THREE.Vector3();
  function prepareChaseView(){
    chaseTarget.copy(roverPosition);chaseTarget.y-=.7;
    const distance=7.5,pitch=angles.x;
    chaseDesired.set(Math.sin(angles.y)*Math.cos(pitch)*distance,-Math.sin(pitch)*distance+1.3,Math.cos(angles.y)*Math.cos(pitch)*distance).add(chaseTarget);
    clearCameraPosition(chaseDesired,sampleFloor,rockColliders);
  }
  function getReturnView(){
    prepareChaseView();
    return {position:chaseDesired.clone(),quaternion:new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(chaseDesired,chaseTarget,camera.up))};
  }
  function followCamera(dt,immediate=false){
    prepareChaseView();
    if(immediate)camera.position.copy(chaseDesired);else camera.position.lerp(chaseDesired,1-Math.exp(-dt*9));
    // Keep the camera above the local surface after smoothing as well.
    clearCameraPosition(camera.position,sampleFloor,rockColliders);
    camera.lookAt(chaseTarget);
  }
  function sampleWheelSupport(x,z){
    let floor=sampleFloor(x,z);
    for(const box of rockColliders){
      if(x>=box.min.x&&x<=box.max.x&&z>=box.min.z&&z<=box.max.z&&box.max.y<=roverFeet.y+.35)
        floor=Math.max(floor,box.max.y);
    }
    return floor;
  }
  function updateRover(dt){
    roverFeet.copy(roverPosition);roverFeet.y-=ROVER_COLLIDER.eyeHeight;
    rover.update(dt,roverFeet,physics.velocity,physics.throttle,physics.grounded,sampleWheelSupport);
  }
  const effects=createSurfaceEffects(scene,camera,ground,iceMesh,rockMaterial,sunlight);
  function look(dx,dy){angles.y-=dx*.003;angles.x=THREE.MathUtils.clamp(angles.x-dy*.003,-.85,.12);}
  const down=e=>{
    if(!active||encounter.busy||encounter.presenting)return;
    void roverAudio.unlock();
    if(e.pointerType==='touch') {dragging=true;lastX=e.clientX;lastY=e.clientY;}
    else mouseCapture.begin();
  };
  const move=e=>{
    if(!active||encounter.busy||encounter.presenting)return;
    if(mouseCapture.locked())look(e.movementX,e.movementY);
    else if(dragging){look(e.clientX-lastX,e.clientY-lastY);lastX=e.clientX;lastY=e.clientY;}
  };
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',()=>dragging=false);
  element.addEventListener('contextmenu',e=>{if(exploring)e.preventDefault();});
  window.addEventListener('keydown',e=>{
    if(exploring && (e.code==='ControlLeft'||e.code==='ControlRight')){
      e.preventDefault();if(!e.repeat)mouseCapture.toggle();return;
    }
    if(!active)return;
    if(e.code==='KeyK'){e.preventDefault();if(!e.repeat)encounter.start();return;}
    if(encounter.busy)return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();void roverAudio.unlock();encounter.resume();keys.add(e.code);}
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();dragging=false;physics.clearInput();mouseCapture.release();roverAudio.setFocused(false);});
  window.addEventListener('focus',()=>roverAudio.setFocused(!document.hidden));
  document.addEventListener('visibilitychange',()=>{
    roverAudio.setFocused(!document.hidden&&document.hasFocus());
    if(document.hidden){keys.clear();dragging=false;physics.clearInput();}
  });
  document.addEventListener('pointerlockchange',()=>{keys.clear();dragging=false;physics.clearInput();});
  const direction=new THREE.Vector3(),forward=new THREE.Vector3(),right=new THREE.Vector3();
  let surfaceTime=0;
  let regionId=null;
  function setRegion(region){
    americanFlag.root.visible=region.id==='apollo-11';
    encounter.setActive(false);
    encounter=americanFlag.root.visible?flagEncounter:noEncounter;
    encounter.setActive(active);
    const nextId=region.id;
    if(nextId===regionId)return;
    physics.reset();rover.resetDynamics();keys.clear();dragging=false;wheelParticles.reset();
    regionId=nextId;
    naturalHeight=createSurfaceHeight({centralCrater:region.centralCrater,siteId:region.id});
    stationGroundY=naturalHeight(ROVER_SPAWN.x,ROVER_SPAWN.z);
    station.root.position.y=stationGroundY;
    updateTerrainGeometry(geometry,height);
    updateTerrainGeometry(iceGeometry,height,.06);
    updateBoundary();
    for(let i=0;i<rocks.length;i++){
      const rock=rocks[i];
      rock.position.y=height(rock.position.x,rock.position.z)+rock.scale.z*.2;
      rock.updateMatrixWorld();rockColliders[i].setFromObject(rock);
    }
    surfaceTime=0;
    americanFlag.root.position.set(FLAG_POSITION.x,sampleFloor(FLAG_POSITION.x,FLAG_POSITION.z),FLAG_POSITION.z);
    rockColliders.splice(rocks.length);
    for(const entry of missionObjects){entry.object.root.visible=false;entry.encounter?.setActive(false);}
    missionTarget=missionObjects.find(entry=>entry.spec.siteId===region.id)??null;
    if(missionTarget){
      const {spec,object}=missionTarget;
      const placement=findMissionPlacement(spec.siteId,sampleFloor,rockColliders);
      object.place(placement,sampleFloor);object.root.visible=true;
      rockColliders.push(...object.colliders);
      missionTarget.content.innerHTML=missionScanContent(spec,placement,import.meta.env.BASE_URL);
    }
    if(americanFlag.root.visible){americanFlag.updateColliders();rockColliders.push(...americanFlag.colliders);}
    roverPosition.set(ROVER_SPAWN.x,sampleFloor(ROVER_SPAWN.x,ROVER_SPAWN.z)+ROVER_COLLIDER.eyeHeight,ROVER_SPAWN.z);
  }
  return {scene,camera,down,setRegion,
    getPhysicsStatus(){return {boundaryDistance:physics.boundaryDistance};},
    // The map's second horizontal axis is world Z; world Y is elevation.
    getMapPosition(){return {x:roverPosition.x,y:roverPosition.z};},
    render(renderer){effects.render(renderer);},
    animate(dt){effects.tick(dt);surfaceTime+=dt;if(americanFlag.root.visible)americanFlag.update(dt);if(missionTarget)missionTarget.object.update(surfaceTime);},
    beginCapture(){exploring=true;void roverAudio.unlock();mouseCapture.begin();},
    toggleSound(){roverAudio.setMuted(!roverAudio.muted);return roverAudio.muted;},
    setActive(value){active=value;roverAudio.setActive(value);encounter.setActive(value);keys.clear();dragging=false;physics.reset();rover.resetDynamics();wheelParticles.reset();if(value){angles.x=-.12;angles.y=0;updateRover(0);followCamera(0,true);}if(!value){exploring=false;mouseCapture.end();}},
    setKey(key,value){if(!active)return;if(value&&!encounter.busy){void roverAudio.unlock();encounter.resume();keys.add(key);}else keys.delete(key);},
    dive(progress,pole){
      const t=THREE.MathUtils.clamp(progress,0,1);
      const ease=t*t*(3-2*t);
      const angle=(1-ease)*Math.PI*2.2*(pole>0?1:-1);
      const radius=THREE.MathUtils.lerp(110,ROVER_SPAWN.z,ease);
      camera.position.set(Math.sin(angle)*radius,THREE.MathUtils.lerp(155,stationGroundY+7,ease),Math.cos(angle)*radius);
      camera.position.y=Math.max(camera.position.y,sampleFloor(camera.position.x,camera.position.z)+3);
      camera.lookAt(0,height(0,0)+4,0);
      camera.rotateZ(Math.sin(t*Math.PI)*.24*(pole>0?1:-1));
      camera.fov=65+Math.sin(t*Math.PI)*12;
      camera.updateProjectionMatrix();
      roverPosition.set(ROVER_SPAWN.x,sampleFloor(ROVER_SPAWN.x,ROVER_SPAWN.z)+ROVER_COLLIDER.eyeHeight,ROVER_SPAWN.z);updateRover(0);
      // Blend the descent into the chase view without changing the rover pose.
      if(t>.8){
        const divePosition=camera.position.clone(),diveRotation=camera.quaternion.clone();
        angles.set(-.12,0,0,'YXZ');followCamera(0,true);
        const blend=THREE.MathUtils.smoothstep(t,.8,1);
        camera.position.lerpVectors(divePosition,camera.position.clone(),blend);
        camera.quaternion.slerpQuaternions(diveRotation,camera.quaternion.clone(),blend);
      }
    },
    resize(w,h){camera.aspect=w/h;camera.updateProjectionMatrix();effects.resize(w,h,Math.min(devicePixelRatio,2));wheelParticles.setPixelRatio(devicePixelRatio);},
    update(dt){
      if(!active)return;
      selectEncounter();
      if(encounter.update(dt)){
        roverAudio.stop();
        wheelParticles.update(dt,new THREE.Vector3(),false);
        // Preserve the driving orbit while the encounter controls the camera.
        return;
      }
      // Heading stays horizontal: looking up no longer makes the player fly.
      forward.set(-Math.sin(angles.y),0,-Math.cos(angles.y));
      right.set(Math.cos(angles.y),0,-Math.sin(angles.y));
      direction.set(0,0,0);
      const f=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
      const r=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
      direction.addScaledVector(forward,f).addScaledVector(right,r);
      if(direction.lengthSq()>1)direction.normalize();
      physics.update(dt,{x:direction.x,z:direction.z,sprint:keys.has('ShiftLeft')||keys.has('ShiftRight'),jetpack:keys.has('Space')});
      updateRover(dt);roverAudio.update(physics.velocity,physics.grounded,physics.throttle);wheelParticles.update(dt,physics.velocity,physics.grounded);followCamera(dt);
    }
  };
}
