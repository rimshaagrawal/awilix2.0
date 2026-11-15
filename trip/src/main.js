import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';
import './hud.css';
import { hudFrame, observeHudFrames } from './hud-frame.js';
import { createSurface } from './surface.js';
import { createOrbiters } from './orbiters.js';
import { createWaypointPin } from './waypoint-model.js';
import { WAYPOINT_REGIONS, lunarNormal } from './regions.js';
import { layoutWaypoints } from './waypoint-layout.js';

const assetUrl = path => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

// The simulation is embedded by the Awilix app. Escape returns from a surface
// scene as before, then asks the host page to close the full-screen view.
const embedded = window.parent !== window;
const notifyHost = type => {
  if (embedded) window.parent.postMessage({ type }, window.location.origin);
};

const host = document.querySelector('#viewport');
let seed = 721;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };


try {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setClearColor(0x000000,1);
  scene.background = new THREE.Color(0x000000);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  // Lens falloff covers the image while later HUD layers remain crisp.
  const vignette = document.createElement('div');
  vignette.className = 'lens-vignette';
  vignette.setAttribute('aria-hidden', 'true');
  host.appendChild(vignette);
  const camera = new THREE.PerspectiveCamera(36,1,.1,100);
  const controls = new OrbitControls(camera,renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = 2.1; controls.maxDistance = 7;
  controls.autoRotate = true; controls.autoRotateSpeed = .32;
  const moon = new THREE.Group(); scene.add(moon);
  const loader = new THREE.TextureLoader();
  const texture = loader.load(assetUrl('textures/moon-color.jpg'));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const elevation = loader.load(assetUrl('textures/moon-height.png'));
  elevation.anisotropy = texture.anisotropy;
  for (const map of [texture, elevation]) map.wrapS = THREE.RepeatWrapping;
  // NASA LROC albedo and LOLA elevation: separate color from actual relief.
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1,256,160),new THREE.MeshStandardMaterial({
    map:texture,bumpMap:elevation,bumpScale:.018,
    displacementMap:elevation,displacementScale:.006,displacementBias:-.003,
    color:0x77797f,roughness:1,metalness:0
  }));
  // Present the familiar near side initially, while retaining free orbit controls.
  globe.rotation.y = -1.0;
  moon.add(globe);
  scene.add(new THREE.AmbientLight(0xc5d1e0,.025));
  const sun = new THREE.DirectionalLight(0xfff7ed,2.6); scene.add(sun);
  sun.position.set(5,2.3,1);

  const ice = new THREE.Group(); moon.add(ice);
  const patchMaterial = new THREE.MeshBasicMaterial({color:0x7ce5e5,transparent:true,opacity:.68,side:THREE.DoubleSide,depthWrite:false});
  for(const pole of [-1,1]){
    // Scattered symbolic patches within 18 degrees of each pole, not measured deposits.
    for(let i=0;i<95;i++){
      const theta=random()*Math.PI*2, angle=.015+Math.sqrt(random())*.29;
      const normal=new THREE.Vector3(Math.sin(angle)*Math.cos(theta),pole*Math.cos(angle),Math.sin(angle)*Math.sin(theta));
      const size=.003+Math.pow(random(),2)*.018;
      const patch=new THREE.Mesh(new THREE.CircleGeometry(size,6),patchMaterial);
      patch.position.copy(normal).multiplyScalar(1.004);patch.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);patch.rotateZ(random()*Math.PI);ice.add(patch);
    }
  }
  // Screen-sized stars stay legible when zooming; a soft disc avoids square points.
  const starCanvas=document.createElement('canvas');starCanvas.width=32;starCanvas.height=32;
  const starContext=starCanvas.getContext('2d');
  const glow=starContext.createRadialGradient(16,16,0,16,16,16);
  glow.addColorStop(0,'#fff');glow.addColorStop(.22,'rgba(255,255,255,.95)');
  glow.addColorStop(.5,'rgba(255,255,255,.25)');glow.addColorStop(1,'rgba(255,255,255,0)');
  starContext.fillStyle=glow;starContext.fillRect(0,0,32,32);
  const starSprite=new THREE.CanvasTexture(starCanvas);
  for(const [count,size,opacity] of [[2400,2,.8],[450,3,.9],[70,4,1]]){
    const positions=[],colors=[];
    for(let i=0;i<count;i++){
      const y=random()*2-1,azimuth=random()*Math.PI*2,radius=Math.sqrt(1-y*y);
      positions.push(35*radius*Math.cos(azimuth),35*y,35*radius*Math.sin(azimuth));
      const tint=new THREE.Color().setHSL(.08+random()*.55,.05+random()*.18,.72+random()*.28);
      colors.push(tint.r,tint.g,tint.b);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    scene.add(new THREE.Points(geometry,new THREE.PointsMaterial({
      map:starSprite,size,sizeAttenuation:false,vertexColors:true,transparent:true,
      opacity,depthWrite:false,toneMapped:false
    })));
  }

  const orbiters = createOrbiters(scene);
  const surface = createSurface(renderer.domElement);
  let onSurface = false;
  let descent = null;
  const orbitPosition=new THREE.Vector3();
  const orbitQuaternion=new THREE.Quaternion();
  let orbitFov=36;
  const veil=document.createElement('div');veil.className='descent-veil';host.appendChild(veil);
  const hud = document.createElement('div');
  hud.className='surface-hud';hud.hidden=true;
  hud.innerHTML=`<button id="back" class="hud-panel" aria-label="Return to Moon">${hudFrame()}<span>← Moon</span></button>
    <button id="rover-sound" class="hud-panel" type="button" aria-label="Mute rover sound" aria-pressed="false">${hudFrame()}<span>Sound on</span></button>
    <output id="rover-physics-status" class="hud-panel" role="status" hidden>${hudFrame()}<span></span></output>
    <div class="flight-pad">${[['KeyW','Forward','↑'],['KeyA','Left','←'],['KeyS','Backward','↓'],['KeyD','Right','→'],['Space','Hold for rover boosters','Boosters']].map(([key,label,text])=>`<button class="hud-panel" data-key="${key}" aria-label="${label}">${hudFrame()}<span>${text}</span></button>`).join('')}</div>`;
  host.appendChild(hud);
  const regionLabel=document.createElement('div');regionLabel.className='region-label hud-panel';
  regionLabel.innerHTML=`${hudFrame()}<span class="hud-caption">SURFACE SECTOR</span><span class="region-name"></span>`;hud.appendChild(regionLabel);
  const waypointLayer=document.createElement('div');waypointLayer.className='waypoints';host.appendChild(waypointLayer);
  const waypoints=WAYPOINT_REGIONS.map((region,index)=>{
    const normal=lunarNormal(region.latitude,region.longitude);
    const pin=createWaypointPin(region.centralCrater?0x94e2df:0xf0c68a);
    pin.root.position.copy(normal).multiplyScalar(.999);
    pin.root.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
    globe.add(pin.root);
    const button=document.createElement('button');button.className='waypoint';button.hidden=true;
    if(region.centralCrater)button.classList.add('waypoint-polar');
    const latitude=`${Math.abs(region.latitude).toFixed(5)}° ${region.latitude<0?'S':'N'}`;
    const longitude=`${Math.abs(region.longitude).toFixed(5)}° ${region.longitude<0?'W':'E'}`;
    button.setAttribute('aria-label',`Explore ${region.name}, ${latitude}, ${longitude}`);
    button.dataset.region=region.id;
    const tooltipId=`waypoint-${region.id}`;button.setAttribute('aria-describedby',tooltipId);
    button.innerHTML=`<span class="waypoint-badge" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><span class="waypoint-tooltip hud-panel" id="${tooltipId}" role="tooltip">${hudFrame()}<span class="waypoint-content"><span class="hud-caption">${region.centralCrater?'POLAR SURVEY':'LANDING SITE'}</span><strong>${region.name}</strong><small>${latitude} · ${longitude}</small>${region.approximate?'<span class="waypoint-note">Approximate feature location</span>':''}<img class="waypoint-photo" src="${assetUrl(region.image)}" alt="${region.imageAlt}" width="260" height="146" decoding="async"><span class="waypoint-credit">${region.imageCaption}</span><span class="waypoint-action">Explore sector <span aria-hidden="true">↗</span></span></span></span>`;
    const leader=document.createElement('span');leader.className='waypoint-leader';leader.hidden=true;
    leader.setAttribute('aria-hidden','true');waypointLayer.appendChild(leader);
    waypointLayer.appendChild(button);
    button.addEventListener('click',event=>enterRegion(region,event));
    for(const event of ['pointerenter','focus'])button.addEventListener(event,()=>controls.autoRotate=false);
    for(const event of ['pointerleave','blur'])button.addEventListener(event,()=>{
      controls.autoRotate=!waypointLayer.querySelector('.waypoint:hover, .waypoint:focus-visible, .waypoint-hovered');
    });
    return {button,pin,leader};
  });
  const pinRaycaster=new THREE.Raycaster(),pinPointer=new THREE.Vector2();
  function hoverPin(selected){
    for(const waypoint of waypoints)waypoint.button.classList.toggle('waypoint-hovered',waypoint===selected);
    controls.autoRotate=!waypointLayer.querySelector('.waypoint:hover, .waypoint:focus-visible, .waypoint-hovered');
  }
  renderer.domElement.addEventListener('pointermove',event=>{
    if(onSurface||descent||event.buttons){hoverPin(null);return;}
    const bounds=renderer.domElement.getBoundingClientRect();
    pinPointer.set((event.clientX-bounds.left)/bounds.width*2-1,1-(event.clientY-bounds.top)/bounds.height*2);
    pinRaycaster.setFromCamera(pinPointer,camera);
    const selectable=waypoints.filter(waypoint=>!waypoint.button.hidden);
    const hit=pinRaycaster.intersectObjects(selectable.map(waypoint=>waypoint.pin.root),true)[0];
    hoverPin(hit?selectable.find(waypoint=>waypoint.pin.root===hit.object.parent):null);
  });
  renderer.domElement.addEventListener('pointerleave',()=>hoverPin(null));
  const waypointWorld=new THREE.Vector3(),waypointScreen=new THREE.Vector3(),waypointDirection=new THREE.Vector3(),occlusionPoint=new THREE.Vector3();
  const waypointRay=new THREE.Ray(),moonOccluder=new THREE.Sphere(new THREE.Vector3(),1.003);
  const reducedWaypointMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  function updateWaypoints(dt){
    const projected=[];
    for(const waypoint of waypoints){
      const {button,pin,leader}=waypoint;
      const scale=button.matches(':hover, :focus-visible, .waypoint-hovered')?1.16:1;
      pin.root.scale.setScalar(THREE.MathUtils.lerp(pin.root.scale.x,scale,reducedWaypointMotion.matches?1:1-Math.exp(-dt*14)));
      pin.head.getWorldPosition(waypointWorld);
      waypointScreen.copy(waypointWorld).project(camera);
      waypointDirection.copy(waypointWorld).sub(camera.position);
      const distance=waypointDirection.length();
      waypointRay.set(camera.position,waypointDirection.normalize());
      const intersection=waypointRay.intersectSphere(moonOccluder,occlusionPoint);
      const occluded=intersection&&camera.position.distanceTo(occlusionPoint)<distance-.025;
      const visible=!onSurface&&!descent&&!occluded&&Math.abs(waypointScreen.x)<.95&&Math.abs(waypointScreen.y)<.95&&waypointScreen.z<1;
      button.hidden=!visible;
      leader.hidden=!visible;
      if(visible){
        projected.push({waypoint,x:(waypointScreen.x+1)*.5*host.clientWidth,y:(1-waypointScreen.y)*.5*host.clientHeight});
      }
    }
    for(const {waypoint,x,y,targetX,targetY} of layoutWaypoints(projected,host.clientWidth,host.clientHeight)){
      const {button,leader}=waypoint;
      button.style.left=`${targetX}px`;button.style.top=`${targetY}px`;
      leader.style.left=`${x}px`;leader.style.top=`${y}px`;
      leader.style.width=`${Math.hypot(targetX-x,targetY-y)}px`;
      leader.style.transform=`rotate(${Math.atan2(targetY-y,targetX-x)}rad)`;
      const card=button.querySelector('.waypoint-tooltip');
      const cardWidth=card.offsetWidth;
      const shift=Math.max(16+cardWidth/2-targetX,Math.min(0,host.clientWidth-16-cardWidth/2-targetX));
      button.style.setProperty('--tooltip-shift',`${shift}px`);
      const cardHeight=card.offsetHeight;
      let cardTop=targetY-cardHeight-24;
      if(cardTop<16)cardTop=targetY+24;
      cardTop=Math.max(16,Math.min(host.clientHeight-cardHeight-16,cardTop));
      button.style.setProperty('--tooltip-top',`${cardTop-targetY+14}px`);
    }
  }
  const coordinates=document.createElement('output');
  coordinates.className='rover-coordinates hud-panel';
  coordinates.innerHTML=`${hudFrame()}<span class="hud-caption"><i class="telemetry-dot" aria-hidden="true"></i>ROVER TELEMETRY</span><span class="coordinate-values"></span>`;
  const coordinateValues=coordinates.querySelector('.coordinate-values');
  coordinates.title='Map coordinates in scene units: X = world X, Y = world Z';
  coordinates.setAttribute('aria-label','Rover map coordinates');
  hud.appendChild(coordinates);
  const physicsStatus=hud.querySelector('#rover-physics-status'),physicsStatusText=physicsStatus.querySelector('span');
  observeHudFrames(host);
  function updateCoordinates(){
    const {x,y}=surface.getMapPosition();
    coordinateValues.textContent=`X: ${x.toFixed(2)}  Y: ${y.toFixed(2)}`;
    const {boundaryDistance}=surface.getPhysicsStatus();
    const notice=boundaryDistance<8?'Survey boundary · turn back to explore':'';
    if(physicsStatusText.textContent!==notice)physicsStatusText.textContent=notice;
    physicsStatus.hidden=!notice;
  }
  updateCoordinates();
  function leave(){
    if(onSurface||descent){camera.position.copy(orbitPosition);camera.quaternion.copy(orbitQuaternion);camera.fov=orbitFov;camera.updateProjectionMatrix();}
    descent=null;veil.style.opacity=0;onSurface=false;waypointLayer.hidden=false;controls.autoRotate=true;surface.setActive(false);controls.enabled=true;hud.hidden=true;host.style.cursor='grab';
  }
  hud.querySelector('#back').addEventListener('click',leave);
  hud.querySelector('#rover-sound').addEventListener('click',event=>{
    const muted=surface.toggleSound(),button=event.currentTarget;
    button.setAttribute('aria-pressed',String(muted));
    button.setAttribute('aria-label',muted?'Unmute rover sound':'Mute rover sound');
    button.querySelector('span').textContent=muted?'Sound off':'Sound on';
  });
  window.addEventListener('keydown',e=>{
    if(e.code!=='Escape')return;
    if(onSurface||descent){leave();return;}
    notifyHost('awilix:trip-exit');
  });
  for(const button of hud.querySelectorAll('[data-key]')){
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);surface.setKey(button.dataset.key,true);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>surface.setKey(button.dataset.key,false));
  }
  function enterRegion(region,event){
    if(onSurface||descent)return;
    hoverPin(null);
    orbitPosition.copy(camera.position);orbitQuaternion.copy(camera.quaternion);orbitFov=camera.fov;
    controls.enabled=false;surface.setActive(false);surface.setRegion(region);hud.hidden=true;waypointLayer.hidden=true;controls.autoRotate=true;host.style.cursor='default';
    regionLabel.querySelector('.region-name').textContent=region.name;
    const normal=lunarNormal(region.latitude,region.longitude).applyQuaternion(globe.quaternion);
    descent={time:0,pole:region.pole,normal,reduced:window.matchMedia('(prefers-reduced-motion: reduce)').matches};
    surface.dive(0,region.pole);
    if(event?.pointerType!=='touch')surface.beginCapture();
  }
  renderer.domElement.addEventListener('pointerdown',e=>{
    if(onSurface&&!descent)surface.down(e);
  });
  camera.position.set(2.6,1.35,4.1);
  function resize(){
    const w=host.clientWidth,h=host.clientHeight;
    renderer.setSize(w,h);
    camera.aspect=w/h;
    camera.fov=w<h?55:36;
    if(onSurface||descent)orbitFov=camera.fov;
    camera.updateProjectionMatrix();
    surface.resize(w,h);
  }
  new ResizeObserver(resize).observe(host);resize();
  const clock = new THREE.Clock();
  const poleTarget=new THREE.Vector3(),orbitLook=new THREE.Matrix4(),diveQuaternion=new THREE.Quaternion();
  renderer.setAnimationLoop(()=>{
    const dt=Math.min(clock.getDelta(),.05);
    orbiters.update(dt);
    if(onSurface||descent)surface.animate(dt);
    if(descent){
      descent.time+=dt;
      if(descent.reduced){
        // Respect reduced motion with a short fade and no camera spin.
        const t=Math.min(descent.time/.45,1);
        veil.style.opacity=Math.sin(Math.PI*t);
        if(t>=.5){onSurface=true;surface.dive(1,descent.pole);}
        if(onSurface)surface.render(renderer);else renderer.render(scene,camera);
        if(t===1){descent=null;surface.setActive(true);hud.hidden=false;host.style.cursor='grab';veil.style.opacity=0;}
      }else if(descent.time<1.35){
        const t=descent.time/1.35,ease=t*t*(3-2*t);
        // Approach the selected lunar location before entering the shared surface scene.
        poleTarget.copy(descent.normal).multiplyScalar(1.17).add(new THREE.Vector3(.10,0,.12));
        camera.position.lerpVectors(orbitPosition,poleTarget,ease);
        orbitLook.lookAt(camera.position,descent.normal.clone().multiplyScalar(.95),new THREE.Vector3(0,0,descent.pole*-1));
        diveQuaternion.setFromRotationMatrix(orbitLook);
        camera.quaternion.slerpQuaternions(orbitQuaternion,diveQuaternion,ease);
        camera.rotateZ(Math.sin(t*Math.PI/2)*1.15*descent.pole);
        camera.fov=THREE.MathUtils.lerp(orbitFov,78,ease);camera.updateProjectionMatrix();
        veil.style.opacity=THREE.MathUtils.smoothstep(t,.78,1);
        renderer.render(scene,camera);
      }else{
        onSurface=true;
        const t=Math.min((descent.time-1.35)/3.1,1);
        surface.dive(t,descent.pole);
        veil.style.opacity=1-THREE.MathUtils.smoothstep(t,0,.16);
        surface.render(renderer);
        if(t===1){descent=null;surface.setActive(true);hud.hidden=false;host.style.cursor='grab';veil.style.opacity=0;}
      }
    }else if(onSurface){surface.update(dt);updateCoordinates();surface.render(renderer);}
    else{controls.update(dt);updateWaypoints(dt);renderer.render(scene,camera);}
  });
  notifyHost('awilix:trip-ready');
} catch(error) {
  const el=document.querySelector('#error');el.hidden=false;el.textContent='The 3D view could not start. Please enable WebGL or hardware acceleration, then reload this page.';console.error(error);
  notifyHost('awilix:trip-error');
}
