import * as THREE from 'three';

export const ROVER_SPAWN={x:0,z:61};
const STATION_SCALE=.6;
export const STATION_RADIUS=3.8*STATION_SCALE;

// Low, beveled vehicle dock: a segmented service deck inside a painted apron.
export function createRoverStation(groundY){
  const root=new THREE.Group();root.name='Rover launch station';
  root.position.set(ROVER_SPAWN.x,groundY,ROVER_SPAWN.z);root.scale.setScalar(STATION_SCALE);
  const paint=(color,metalness=.4)=>new THREE.MeshStandardMaterial({color,metalness,roughness:.42});
  const white=paint(0xe2e8df),orange=paint(0xf48b23),dark=paint(0x21343a),steel=paint(0x64767b,.8);
  const seam=paint(0x111e24);
  const glow=new THREE.MeshStandardMaterial({color:0x9eeef2,emissive:0x64dce9,emissiveIntensity:1.5});
  function mesh(geometry,material,y,parent=root){
    const object=new THREE.Mesh(geometry,material);object.position.y=y;
    object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
  }
  function ring(inner,outer,y,material,start=0,length=Math.PI*2){
    const object=mesh(new THREE.RingGeometry(inner,outer,96,1,start,length),material,y);
    object.rotation.x=-Math.PI/2;return object;
  }
  mesh(new THREE.CylinderGeometry(3.8,3.8,.22,96),dark,-.01);
  mesh(new THREE.CylinderGeometry(3.13,3.8,.3,96,1,true),white,.25);
  mesh(new THREE.CylinderGeometry(3.13,3.13,.1,96),seam,.35);
  ring(3.73,3.79,.105,steel);
  ring(3.65,3.69,.15,glow);
  ring(2.97,3.12,.405,orange);
  ring(2.9,2.95,.408,steel);
  // Broad orange panels follow the sloping white apron, leaving white shoulders.
  for(let i=0;i<12;i++){
    const angle=i*Math.PI/6;
    mesh(new THREE.CylinderGeometry(3.29,3.69,.18,8,1,true,angle+.018,Math.PI/6-.036),i%3===0?white:orange,.25);
    const panel=mesh(new THREE.CylinderGeometry(3.135,3.795,.298,1,1,true,angle,.009),steel,.251);
    panel.name='Apron panel joint';
    ring(.82,2.86,.411,dark,angle+.015,Math.PI/6-.03);
    ring(2.69,2.74,.414,orange,angle+.035,Math.PI/6-.07);
    const bolt=mesh(new THREE.CylinderGeometry(.035,.035,.015,6),steel,.419);
    bolt.position.x=Math.cos(angle+.12)*2.82;bolt.position.z=Math.sin(angle+.12)*2.82;
    const joint=mesh(new THREE.BoxGeometry(.024,.012,2.02),orange,.414);
    joint.position.x=Math.sin(angle)*1.83;joint.position.z=Math.cos(angle)*1.83;joint.rotation.y=angle;
  }
  mesh(new THREE.CylinderGeometry(.82,.82,.025,12),dark,.409);
  ring(.79,.83,.425,orange);
  // Recessed wheel service strips and luminous guidance marks.
  for(const side of [-1,1]){
    const strip=mesh(new THREE.BoxGeometry(.35,.014,3.6),seam,.421);strip.position.x=side*.73;
    for(let i=0;i<9;i++){
      const slat=mesh(new THREE.BoxGeometry(.29,.015,.055),steel,.431);
      slat.position.set(side*.73,.431,-1.55+i*.38);
    }
    for(const z of [-2.4,2.4]){
      const marker=mesh(new THREE.BoxGeometry(.12,.018,.42),glow,.425);marker.position.x=side*.55;marker.position.z=z;
    }
    // Small angled control terminals sit outside the rover's departure lane.
    const terminal=new THREE.Group();terminal.position.set(side*3.28,.31,.2);root.add(terminal);
    const base=mesh(new THREE.BoxGeometry(.42,.14,.48),dark,.07,terminal);
    base.rotation.z=-side*.18;
    const screen=mesh(new THREE.BoxGeometry(.28,.018,.28),seam,.15,terminal);screen.rotation.z=-side*.18;
    for(let i=0;i<3;i++){
      const line=mesh(new THREE.BoxGeometry(.18,.012,.018),glow,.168,terminal);line.position.z=-.07+i*.06;line.rotation.z=-side*.18;
    }
  }
  return {
    root,
    sampleFloor(x,z){
      const r=Math.hypot(x-ROVER_SPAWN.x,z-ROVER_SPAWN.z)/STATION_SCALE;
      if(r>3.8)return null;
      return root.position.y+STATION_SCALE*(r<=3.13?.4:.1+.3*(3.8-r)/.67);
    }
  };
}
