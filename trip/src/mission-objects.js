import * as THREE from 'three';
import { SOUTH_POLAR_SITES, SOUTH_POLE } from './regions.js';
import { siteScanContent } from './site-scan-content.js';
import scanImages from '../../public/images/missions/sources.json' with {type:'json'};

// These are educational exhibits, not surveyed positions or abandoned hardware.
export const MISSION_OBJECTS=[
  {siteId:'shackleton-rim',site:'Shackleton Crater Rim',name:'LOLA laser altimeter',mission:'Lunar Reconnaissance Orbiter',kind:'altimeter',date:'Launched June 18, 2009',
    description:'LOLA measures the travel time of laser pulses to map lunar elevations. LRO used these measurements to reveal the shape and slopes of Shackleton crater, including its sunlit rim and deeply shadowed interior.',
    connection:'Orbital measurements of Shackleton; this instrument operated aboard LRO, above the surface.',source:'https://svs.gsfc.nasa.gov/4716',sourceLabel:'NASA · Visualizing Shackleton crater'},
  {siteId:'malapert-a',site:'Malapert A',name:'Odysseus lander',mission:'Intuitive Machines · IM-1',kind:'odysseus',date:'Landed February 22, 2024',
    description:'The Nova-C lander Odysseus delivered NASA science and technology payloads near Malapert A under the Commercial Lunar Payload Services initiative. Its payloads included navigation technology, radio observations, and cameras for studying the landing plume.',
    connection:'Landed near Malapert A. This upright model is a simplified exhibit, not the final pose or exact touchdown point.',source:'https://www.nasa.gov/centers-and-facilities/marshall/the-marshall-star-for-february-28-2024/',sourceLabel:'NASA · Odysseus landing'},
  {siteId:'mons-mouton',site:'Mons Mouton',name:'Athena lander',mission:'Intuitive Machines · IM-2',kind:'athena',date:'Landed March 6, 2025',
    description:'Athena reached Mons Mouton carrying NASA’s PRIME-1 experiment: the TRIDENT drill and MSolo mass spectrometer, designed to investigate subsurface material and volatiles. The lander came to rest on its side inside a crater; the mission returned some data before ending.',
    connection:'A real landing on Mons Mouton. This upright exhibit illustrates the spacecraft and drill, not its final resting pose.',source:'https://www.nasa.gov/news-release/nasa-receives-some-data-before-intuitive-machines-ends-lunar-mission/',sourceLabel:'NASA · IM-2 mission results'},
  {siteId:'nobile-rim',site:'Nobile Crater Rim',name:'LROC mapping cameras',mission:'Lunar Reconnaissance Orbiter',kind:'camera',date:'Launched June 18, 2009',
    description:'LRO’s Narrow Angle Cameras take detailed orbital photographs of the lunar surface. Images assembled into the Nobile Rim 1 and Mons Mouton mosaic reveal craters, boulders, and the shape of terrain that future explorers must navigate.',
    connection:'Orbital imaging of Nobile Rim 1. These twin camera barrels represent instruments carried on LRO, not cameras left on the ground.',source:'https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_ROI_MTMOUTONLO1',sourceLabel:'LROC · Nobile Rim 1 mosaic'},
  {siteId:'connecting-ridge',site:'Shackleton Connecting Ridge',name:'LRO mapping orbiter',mission:'Lunar Reconnaissance Orbiter',kind:'orbiter',date:'Launched June 18, 2009',
    description:'LRO photographed the ridge connecting Shackleton and de Gerlache craters. Stereo images reveal its narrow spine, boulders, and small impact craters, helping scientists study possible routes across this rugged south-polar landscape.',
    connection:'Mapped from lunar orbit. This spacecraft is displayed on a stand; LRO did not land on the ridge.',source:'https://lroc.im-ldi.com/images/1247',sourceLabel:'LROC · Traversing the connecting ridge'},
  {siteId:'south-pole',site:'Polar South',name:'LRO polar survey orbiter',mission:'Lunar Reconnaissance Orbiter',kind:'orbiter',date:'Launched June 18, 2009',
    description:'LRO maps polar elevations, illumination, temperatures, and surface features from orbit, helping place water-ice observations in their geological context.',
    connection:'A regional orbital survey exhibit. LRO did not land at the south pole; the discoveries at Cabeus and other polar shadows occurred away from this exact marker.',source:'https://science.nasa.gov/mission/lro/',sourceLabel:'NASA · Lunar Reconnaissance Orbiter'},
].map(spec=>({...spec,image:scanImages[spec.siteId]??scanImages['connecting-ridge']}));

function seededRandom(key){
  let seed=2166136261;
  for(const char of key)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
export function terrainGrade(sample,x,z){
  const d=.65;
  return Math.hypot((sample(x+d,z)-sample(x-d,z))/(2*d),(sample(x,z+d)-sample(x,z-d))/(2*d));
}
// Inspect the complete support area, scan parking spot, and intervening ground.
export function inspectMissionPlacement(sample,x,z,yaw){
  let maxGrade=0,min=Infinity,max=-Infinity;
  const points=[];
  for(let dx=-4.5;dx<=4.5;dx+=1.5)for(let dz=-4.5;dz<=4.5;dz+=1.5){
    if(Math.hypot(dx,dz)<=4.6)points.push([x+dx,z+dz]);
  }
  const sx=Math.sin(yaw),sz=Math.cos(yaw);
  for(let d=5;d<=11;d+=1.5)for(const across of [-1.5,0,1.5])points.push([x+sx*d+sz*across,z+sz*d-sx*across]);
  for(const [px,pz] of points){const h=sample(px,pz);min=Math.min(min,h);max=Math.max(max,h);maxGrade=Math.max(maxGrade,terrainGrade(sample,px,pz));}
  return {maxGrade,min,max};
}
export function findMissionPlacement(siteId,sample,rocks=[]){
  const random=seededRandom(siteId),candidates=[];
  for(const searchRadius of [24,32]){
  for(let i=0;i<850;i++){
    const radius=searchRadius*Math.sqrt(random()),angle=random()*Math.PI*2;
    const x=-24+Math.cos(angle)*radius,z=68+Math.sin(angle)*radius;
    if(Math.hypot(x,z-61)<8 || Math.hypot(x-16,z-74)<10)continue;
    const yaw=Math.atan2(-x,61-z);
    const info=inspectMissionPlacement(sample,x,z,yaw);
    if(info.maxGrade>Math.tan(12*Math.PI/180))continue;
    // Keep existing rocks outside both the exhibit and rover scan approach.
    const sx=x+Math.sin(yaw)*10.4,sz=z+Math.cos(yaw)*10.4;
    if(rocks.some(box=>box.distanceToPoint(new THREE.Vector3(x,Math.max(box.min.y,Math.min(box.max.y,sample(x,z))),z))<5 ||
      (sx>box.min.x-2&&sx<box.max.x+2&&sz>box.min.z-2&&sz<box.max.z+2)))continue;
    candidates.push({x,z,yaw,...info});
  }
  if(candidates.length)break;
  }
  if(!candidates.length)throw new Error(`No gentle mission exhibit location near (-24, 68) for ${siteId}`);
  return candidates[Math.floor(random()*candidates.length)];
}

export function missionScanContent(spec,placement,baseUrl='/'){
  const site=[...SOUTH_POLAR_SITES,SOUTH_POLE].find(site=>site.id===spec.siteId),image=spec.image;
  const asset=path=>`${baseUrl.endsWith('/')?baseUrl:baseUrl+'/'}${path.replace(/^\//,'')}`;
  return `<section class="mission-scan-content"><div class="mission-meta">${spec.site} · SITE SURVEY</div>
    <h2>${spec.site}</h2><div class="mission-tag">LUNAR SOUTH POLE · SITE SCAN</div>
    <figure class="site-scan-photo"><a class="scan-image-link" href="${asset(site.image)}" target="_blank" rel="noopener noreferrer" aria-label="Open larger image: ${spec.site}"><img src="${asset(site.image)}" alt="${site.imageAlt}" width="720" height="720" decoding="async"></a><figcaption>${site.imageCaption}</figcaption></figure>
    ${siteScanContent(site)}
    <details class="mission-exhibit-details"><summary>Mission exhibit · ${spec.name}</summary>
    <div class="mission-tag">${spec.mission}</div>
    <div class="mission-scan-photos" aria-label="Mission picture">
      <figure><a class="scan-image-link" href="${asset(image.src)}" target="_blank" rel="noopener noreferrer" aria-label="Open larger image: ${image.caption}"><img src="${asset(image.src)}" alt="${image.alt}" width="${image.width}" height="${image.height}" decoding="async"></a><figcaption>${image.caption}<br><a href="${image.source}" target="_blank" rel="noopener noreferrer">${image.credit}</a></figcaption></figure>
    </div>
    <dl class="mission-facts"><div><dt>MISSION DATE</dt><dd>${spec.date}</dd></div><div><dt>MAP POSITION</dt><dd>X ${placement.x.toFixed(1)} · Y ${placement.z.toFixed(1)}</dd></div></dl>
    <p>${spec.description}</p><p class="mission-connection">${spec.connection}</p>
    <div class="mission-sources">Illustrative 3D replica · scale and placement are artistic.<br><a href="${spec.source}" target="_blank" rel="noopener noreferrer">${spec.sourceLabel} ↗</a></div></details></section>`;
}

export function createMissionObject(spec){
  const root=new THREE.Group();root.name=`Mission exhibit · ${spec.name}`;root.visible=false;
  const craft=new THREE.Group();root.add(craft);
  const metal=new THREE.MeshStandardMaterial({color:0xc6d4df,metalness:.8,roughness:.28});
  const white=new THREE.MeshStandardMaterial({color:0xe3e8e5,metalness:.25,roughness:.42});
  const gold=new THREE.MeshStandardMaterial({color:0xd3a65a,metalness:.78,roughness:.38});
  const dark=new THREE.MeshStandardMaterial({color:0x14202d,metalness:.55,roughness:.4});
  const solar=new THREE.MeshStandardMaterial({color:0x123c8b,metalness:.6,roughness:.3,emissive:0x07172c,emissiveIntensity:.45});
  const glow=new THREE.MeshStandardMaterial({color:0x7bedff,emissive:0x36c9ff,emissiveIntensity:2.4});
  function add(geometry,material,x,y,z,parent=craft){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  const box=(w,h,d,m,x=0,y=0,z=0,p=craft)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,p);
  const cylinder=(r1,r2,h,m,x=0,y=0,z=0,p=craft)=>add(new THREE.CylinderGeometry(r1,r2,h,20),m,x,y,z,p);
  function strut(a,b,r=.045,material=metal,parent=craft){
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);
    const mesh=cylinder(r,r,delta.length(),material,0,0,0,parent);mesh.position.copy(from.add(to).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;
  }
  function panel(x,y,z,w,h,parent=craft){
    box(w+.1,h+.1,.10,metal,x,y,z,parent);
    box(w,h,.12,solar,x,y,z+.015,parent);
    for(let i=1;i<6;i++)box(w,.018,.014,metal,x,y-h/2+h*i/6,z+.08,parent);
    for(let i=1;i<4;i++)box(.018,h,.014,metal,x-w/2+w*i/4,y,z+.08,parent);
  }
  function dish(x,y,z,size=.65){
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.x=.55;craft.add(g);
    const profile=Array.from({length:15},(_,i)=>{const r=i/14*size;return new THREE.Vector2(r,r*r*.5);});
    const mat=white.clone();mat.side=THREE.DoubleSide;
    add(new THREE.LatheGeometry(profile,28),mat,0,0,0,g);
    strut([0,0,0],[0,.6,0],.025,metal,g);cylinder(.08,.08,.09,gold,0,.6,0,g);
  }
  // Low display platform with emissive rim and four ground-reaching supports.
  cylinder(4.3,4.5,.22,dark,0,0,0,root);
  const ring=add(new THREE.TorusGeometry(4.28,.045,8,80),glow,0,.13,0,root);ring.rotation.x=Math.PI/2;
  const supports=[];
  for(const x of [-2.8,2.8])for(const z of [-2.8,2.8])supports.push(cylinder(.12,.17,1,metal,x,-.5,z,root));
  craft.position.y=.18;
  if(spec.kind==='odysseus'||spec.kind==='athena'){
    cylinder(.82,1.05,2.3,white,0,2.45,0);
    cylinder(.91,.91,.18,gold,0,3.6,0);
    cylinder(.65,.4,.65,gold,0,1,0);
    cylinder(.3,.48,.48,dark,0,.65,0);
    for(let i=0;i<6;i++){
      const angle=i*Math.PI/3,dx=Math.sin(angle),dz=Math.cos(angle);
      strut([dx*.8,2.2,dz*.8],[dx*2.25,.18,dz*2.25],.065);
      strut([dx*.8,1.1,dz*.8],[dx*2.25,.18,dz*2.25],.045,gold);
      cylinder(.3,.34,.12,metal,dx*2.25,.16,dz*2.25);
      const face=new THREE.Group();face.rotation.y=angle;craft.add(face);panel(0,2.55,.95,.65,1.1,face);
    }
    dish(0,3.75,0,.42);strut([-.5,3.5,0],[-.5,4.7,0],.025);
    for(const x of [-.55,.55])box(.25,.38,.4,gold,x,1.85,.9);
    if(spec.kind==='athena'){
      box(.42,1.25,.5,gold,1.08,2.1,0);strut([1.15,.55,0],[1.15,3.3,0],.07);
      for(let i=0;i<13;i++){const coil=add(new THREE.TorusGeometry(.115,.025,5,12),metal,1.15,.7+i*.11,0);coil.rotation.x=Math.PI/2;}
    }
  }else if(spec.kind==='orbiter'){
    cylinder(.14,.23,1.8,metal,0,.9,0);box(1.5,1.8,1.3,gold,0,2.75,0);
    box(1.65,.14,1.4,white,0,3.7,0);
    for(const x of [-.8,.8])cylinder(.22,.22,.85,white,x,2.65,0);
    strut([.5,3,0],[3.1,3,0]);panel(2.45,3,0,2.8,1.7);
    dish(-.9,4.05,0,.8);strut([-.55,3.5,-.4],[-.55,5.1,-.4],.025);
    for(const x of [-.45,.45])cylinder(.17,.21,.6,dark,x,1.7,.5);
  }else if(spec.kind==='camera'){
    box(3,.35,1.4,metal,0,1.9,0);
    for(const x of [-1,1]){
      strut([x,0,0],[x,1.8,0],.09);const camera=new THREE.Group();camera.position.set(x,2.45,0);camera.rotation.x=Math.PI/2-.2;craft.add(camera);
      cylinder(.45,.38,2.4,white,0,0,0,camera);cylinder(.53,.53,.35,dark,0,1.3,0,camera);
      cylinder(.37,.37,.04,solar,0,1.49,0,camera);box(.55,.4,.8,gold,.45,-.7,0,camera);
      for(let j=0;j<5;j++)cylinder(.48,.48,.04,metal,0,-.7+j*.14,0,camera);
    }
    box(.9,.6,.7,gold,0,1.45,0);
  }else{
    strut([0,0,0],[0,2.2,0],.18);box(2.5,.7,1.8,gold,0,2.35,0);
    cylinder(.68,.68,.8,white,0,3.05,0);cylinder(.75,.75,.2,dark,0,3.5,0);
    cylinder(.58,.58,.04,solar,0,3.61,0);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;cylinder(.16,.16,.22,glow,Math.sin(a)*.33,3.66,Math.cos(a)*.33);}
    for(const x of [-1,1])box(.35,1.1,1.3,white,x,3,0);
    for(let i=0;i<7;i++)box(2.4,.06,1.9,metal,0,2.06+i*.09,0);
  }
  // Beacon and real local illumination keep the model legible in lunar shadow.
  strut([-3.3,.1,0],[-3.3,3.3,0],.045,metal,root);
  const beacon=add(new THREE.SphereGeometry(.12,12,8),glow,-3.3,3.35,0,root);
  const key=new THREE.PointLight(0xc9eaff,95,20,2);key.position.set(1,6,4);root.add(key);
  const fill=new THREE.PointLight(0xffc47a,50,14,2);fill.position.set(-4,3,-2);root.add(fill);
  const scanPanel=new THREE.Group();scanPanel.position.set(0,2.8,1.4);root.add(scanPanel);
  const colliders=[];
  return {root,scanPanel,width:8.4,height:5.8,colliders,place(placement,sample){
    root.position.set(placement.x,0,placement.z);root.rotation.y=placement.yaw;
    let top=-Infinity;
    for(let x=-4.5;x<=4.5;x+=.75)for(let z=-4.5;z<=4.5;z+=.75){
      if(Math.hypot(x,z)<=4.5)top=Math.max(top,sample(placement.x+x,placement.z+z));
    }
    root.position.y=top+.18;
    root.updateWorldMatrix(true,true);
    for(const support of supports){
      const foot=support.getWorldPosition(new THREE.Vector3());const ground=sample(foot.x,foot.z);
      const length=Math.max(.1,root.position.y-ground);support.scale.y=length;support.position.y=-length/2;
    }
    root.updateWorldMatrix(true,true);
    // Platform collision encloses the complete exhibit, including solar wings.
    colliders.length=0;
    colliders.push(new THREE.Box3(new THREE.Vector3(-4.5,-(placement.max-placement.min)-.5,-4.5),new THREE.Vector3(4.5,5.4,4.5)).applyMatrix4(root.matrixWorld));
  },update(time){beacon.scale.setScalar(1+.15*Math.sin(time*2.5));}};
}
