import * as THREE from 'three';
import { createRoverDynamics } from './rover-dynamics.js';
import { applyPaintFinish } from './surface-materials.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const ROVER_SCALE=.36;
export const ROVER_COLLIDER={eyeHeight:2.5*ROVER_SCALE,radius:2.3*ROVER_SCALE,stepHeight:.3};

export function createRover(){
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);root.scale.setScalar(ROVER_SCALE);root.name='Lunar expedition rover';
  const white=new THREE.MeshPhysicalMaterial({color:0xdde2dc,roughness:.36,metalness:.30,clearcoat:.48,clearcoatRoughness:.38});
  const orange=new THREE.MeshPhysicalMaterial({color:0xff9c08,roughness:.34,metalness:.38,clearcoat:.52,clearcoatRoughness:.36});
  white.userData.satinPaint=true;orange.userData.satinPaint=true;
  const gold=new THREE.MeshStandardMaterial({color:0x78828c,roughness:.32,metalness:.85});
  const dark=new THREE.MeshStandardMaterial({color:0x25303b,roughness:.43,metalness:.65});
  const rubber=new THREE.MeshStandardMaterial({color:0x222832,roughness:.92,metalness:0});
  const glass=new THREE.MeshPhysicalMaterial({color:0x183841,roughness:.17,metalness:.12,clearcoat:1,clearcoatRoughness:.16,ior:1.46});
  const lens=new THREE.MeshStandardMaterial({color:0xb5f6ff,emissive:0x63d8ed,emissiveIntensity:1.3,roughness:.2});
  const tailLight=new THREE.MeshStandardMaterial({color:0xff6241,emissive:0xff3212,emissiveIntensity:.7});
  const part=(geometry,material,x,y,z,parent=body)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
  const box=(w,h,d,material,x,y,z,r=.012,parent=body)=>part(new RoundedBoxGeometry(w,h,d,3,r),material,x,y,z,parent);
  // Profiles are drawn in the longitudinal Z / height Y plane. Front is -Z.
  // The source image's visible silhouette is built as actual armor and glazing,
  // so the same vehicle remains recognizable while orbiting or driving.
  function prism(width,profile,material){
    const vertices=[],indices=[],n=profile.length;
    for(const x of [-width/2,width/2])for(const [z,y] of profile)vertices.push(x,y,z);
    const triangles=THREE.ShapeUtils.triangulateShape(profile.map(([z,y])=>new THREE.Vector2(z,y)),[]);
    for(const [a,b,c] of triangles)indices.push(c,b,a,a+n,b+n,c+n);
    for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(i,j,j+n,i,j+n,i+n);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.setIndex(indices);const flat=geometry.toNonIndexed();flat.computeVertexNormals();
    const armorMaterial=material.clone();armorMaterial.side=THREE.DoubleSide;
    return part(flat,armorMaterial,0,0,0);
  }
  function panel(side,points,material,x=.761){
    const shape=new THREE.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(z,y):shape.moveTo(z,y));shape.closePath();
    const geometry=new THREE.ShapeGeometry(shape),attr=geometry.attributes.position;
    for(let i=0;i<attr.count;i++){const z=attr.getX(i),y=attr.getY(i);attr.setXYZ(i,side*x,y,z);}
    if(side>0){const indices=geometry.index;for(let i=0;i<indices.count;i+=3){const a=indices.getX(i);indices.setX(i,indices.getX(i+2));indices.setX(i+2,a);}}
    geometry.computeVertexNormals();return part(geometry,material,0,0,0);
  }
  function strut(a,b,r,material,parent=body){
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);
    const mesh=part(new THREE.CylinderGeometry(r,r,delta.length(),8),material,...from.clone().add(to).multiplyScalar(.5).toArray(),parent);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;
  }
  const cobalt=new THREE.MeshStandardMaterial({color:0x16499a,roughness:.48});
  const cargoBlue=new THREE.MeshStandardMaterial({color:0x326c87,roughness:.88});
  const trim=new THREE.MeshStandardMaterial({color:0x929c93,roughness:.28,metalness:.88});
  const seal=new THREE.MeshStandardMaterial({color:0x080f13,roughness:.85});
  box(1.32,.23,3.08,dark,0,.70,.08,.035);
  prism(1.40,[[-1.62,.84],[-1.78,1.12],[-.58,1.60],[1.67,1.53],[1.49,.94],[.90,.84]],dark);
  // Deep forward-projecting orange cockpit, with a bevelled lower jaw.
  prism(1.52,[[-2.12,2.08],[-1.08,2.08],[-.63,1.69],[-.91,1.16],[-1.39,1.09],[-1.95,1.45]],orange);
  prism(1.56,[[-2.14,2.11],[-1.08,2.11],[-1.03,2.065],[-2.12,2.065]],orange);
  for(const x of [-.77,.77])strut([x,2.12,-2.13],[x,2.12,-1.08],.018,trim);
  strut([-.77,2.12,-2.13],[.77,2.12,-2.13],.018,trim);
  // Windshield lies on the sloped front face, with a substantial central mullion.
  const windAngle=Math.atan2(.17,.63);
  for(const side of [-1,1]){
    const frame=box(.67,.52,.035,seal,side*.365,1.81,-2.064,.012);frame.rotation.x=windAngle;
    const pane=box(.565,.435,.039,glass,side*.365,1.815,-2.084,.008);pane.rotation.x=windAngle;
    const rim=box(.025,.51,.047,trim,side*.69,1.815,-2.077,.004);rim.rotation.x=windAngle;
  }
  const divider=box(.055,.55,.055,trim,0,1.81,-2.09,.004);divider.rotation.x=windAngle;
  box(1.42,.07,.09,dark,0,1.51,-1.99,.008);
  box(.50,.10,.075,orange,0,1.49,-2.045,.01);
  box(.31,.035,.015,trim,0,1.50,-2.087,.003);
  // The rear cabin collar is white and has the reference's small triangular glass.
  prism(1.49,[[-1.10,2.08],[-.46,2.04],[-.35,1.63],[-.72,1.47],[-.97,1.63]],white);
  for(const side of [-1,1]){
    panel(side,[[-2.055,2.035],[-1.34,2.015],[-1.76,1.635]],seal,.769);
    panel(side,[[-1.995,1.987],[-1.415,1.973],[-1.756,1.697]],trim,.775);
    panel(side,[[-1.960,1.967],[-1.448,1.951],[-1.755,1.727]],glass,.781);
    // Thick angular white stripe wrapping around the cockpit cheek.
    panel(side,[[-2.01,1.50],[-1.67,1.47],[-1.22,1.87],[-1.05,1.81],[-.94,1.62],[-1.49,1.25],[-1.78,1.30]],white,.773);
    panel(side,[[-1.91,1.477],[-1.65,1.43],[-1.20,1.814],[-1.115,1.767],[-1.058,1.639],[-1.52,1.33],[-1.75,1.36]],dark,.780);
    panel(side,[[-1.86,1.458],[-1.65,1.41],[-1.21,1.78],[-1.14,1.748],[-1.10,1.65],[-1.54,1.36],[-1.75,1.38]],trim,.786);
    panel(side,[[-1.02,1.983],[-.55,1.945],[-.72,1.671]],seal,.755);
    panel(side,[[-.962,1.938],[-.604,1.914],[-.727,1.738]],glass,.762);
    for(let i=0;i<3;i++){
      const vent=box(.028,.11,.035,dark,side*.787,1.29+i*.052,-1.19+i*.075,.003);vent.rotation.x=-.55;
      box(.032,.014,.08,trim,side*.805,1.31+i*.052,-1.20+i*.075,.002);
    }
    const handle=box(.035,.035,.145,trim,side*.793,1.84,-1.23,.005);handle.rotation.x=.8;
    // Central white equipment housing followed by orange rear storage doors.
    panel(side,[[-.42,2.015],[.48,1.96],[.51,1.54],[-.27,1.55],[-.43,1.70]],white,.766);
    panel(side,[[.47,1.96],[1.75,1.83],[1.82,1.49],[.51,1.54]],orange,.778);
    for(const [z,y] of [[.71,1.75],[1.12,1.71],[1.52,1.67]]){
      box(.022,.31,.35,dark,side*.788,y,z,.015);
      box(.027,.293,.33,orange,side*.806,y+.003,z,.012);
      box(.039,.054,.035,trim,side*.825,y+.04,z+.085,.004);
      box(.043,.020,.066,dark,side*.846,y+.045,z+.085,.003);
      for(const dz of [-.13,.13])box(.028,.018,.015,trim,side*.827,y-.112,z+dz,.002);
    }
    // Black bevel under the high storage deck is a prominent part of the silhouette.
    panel(side,[[-.30,1.52],[1.80,1.47],[1.57,1.34],[-.16,1.35]],seal,.777);
    panel(side,[[-.29,1.34],[.39,1.34],[.24,.95],[-.06,.89]],dark,.735);
    // Three separate hanging mudguards with pale armor and orange edging.
    for(const z of [-.79,.48,1.39]){
      panel(side,[[z-.22,1.35],[z-.02,1.30],[z+.20,.98],[z+.37,.94],[z+.34,.87],[z-.02,.89]],white,.91);
      panel(side,[[z-.01,.94],[z+.34,.93],[z+.32,.895],[z+.01,.914]],orange,.922);
      panel(side,[[z-.15,1.30],[z-.04,1.27],[z+.13,1.03],[z+.01,1.06]],dark,.924);
      strut([side*.78,1.31,z-.14],[side*.96,.93,z+.23],.026,trim);
    }
    panel(side,[[.22,1.37],[.43,1.39],[.43,1.18],[.27,1.08]],white,.92);
    panel(side,[[.25,1.34],[.405,1.355],[.403,1.20],[.285,1.125]],orange,.929);
    panel(side,[[.27,1.32],[.387,1.33],[.386,1.21],[.30,1.16]],seal,.936);
    for(const z of [-1.38,-.46,.46,1.38]){
      part(new THREE.CylinderGeometry(.058,.063,.27,12),dark,side*.87,.95,z);
      part(new THREE.CylinderGeometry(.027,.027,.24,10),trim,side*.87,.74,z);
      part(new THREE.CylinderGeometry(.063,.063,.047,12),tailLight,side*.87,.81,z);
      strut([side*.64,1.13,z-.12],[side*.94,.49,z+.10],.039,dark);
    }
    box(.14,.14,.075,dark,side*.59,1.47,-2.02,.012);
    box(.09,.055,.08,lens,side*.59,1.48,-2.064,.008);
    box(.14,.08,.07,tailLight,side*.62,1.55,1.80,.008);
    // ED service mark, fasteners and a recessed lock on the white cabinet.
    const sx=side*.786;
    for(const y of [1.68,1.73,1.78])box(.012,.015,.065,cobalt,sx,y,-.25,.002);
    box(.012,.115,.014,cobalt,sx,1.73,-.283,.002);
    for(const z of [-.16,-.10])box(.012,.112,.014,cobalt,sx,1.73,z,.002);
    for(const y of [1.68,1.78])box(.012,.015,.06,cobalt,sx,y,-.13,.002);
    box(.02,.12,.065,dark,sx,1.83,.26,.005);
    box(.034,.04,.032,trim,side*.802,1.86,.26,.003);
    for(let i=0;i<4;i++)box(.012,.009,.025,trim,sx,1.64+i*.025,.11,.001);
    box(.18,.08,2.72,dark,side*.65,.79,.18,.01);
    const hose=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.74,1.22,-.5),new THREE.Vector3(side*.80,.80,-.4),new THREE.Vector3(side*.79,.69,.1),new THREE.Vector3(side*.74,1.10,.4)]);
    part(new THREE.TubeGeometry(hose,18,.024,7,false),rubber,0,0,0);
  }
  box(1.47,.39,.86,white,0,1.78,.01,.018);
  box(1.48,.12,1.30,dark,0,1.48,1.10,.018);
  box(1.48,.31,.12,orange,0,1.64,1.76,.016);
  box(1.25,.10,.82,dark,0,1.07,-1.37,.015);
  for(const x of [-.43,.43]){
    strut([x,1.24,-1.67],[x,.67,-1.46],.055,trim);
    box(.22,.30,.31,dark,x,.64,-1.46,.035);
  }
  // Irregular blue tarp bundle, crossed by orange cargo tie-down straps.
  const cargo=part(new THREE.DodecahedronGeometry(.50,1),cargoBlue,0,1.89,1.06);
  cargo.scale.set(1.14,.62,1.06);cargo.rotation.set(.08,.2,.1);
  for(const x of [-.34,.34]){
    strut([x,1.66,.58],[x,2.13,.93],.014,orange);
    strut([x,2.13,.93],[x,1.83,1.56],.014,orange);
  }
  // Low roof instrument with a tilted dark display, twin optics and an antenna.
  box(.47,.06,.39,dark,0,2.10,-.70,.008);
  box(.33,.16,.26,white,0,2.19,-.70,.016);
  const monitor=box(.30,.22,.045,trim,.28,2.22,-.58,.012);monitor.rotation.x=-.3;
  const screen=box(.25,.165,.048,glass,.28,2.23,-.607,.007);screen.rotation.x=-.3;
  for(const x of [-.15,-.035]){
    const optic=part(new THREE.CylinderGeometry(.044,.044,.16,12),dark,x,2.23,-.87);optic.rotation.x=Math.PI/2;
    const front=part(new THREE.CylinderGeometry(.030,.030,.012,12),lens,x,2.23,-.957);front.rotation.x=Math.PI/2;
  }
  part(new THREE.CylinderGeometry(.055,.07,.20,10),dark,-.51,2.18,-.81);
  strut([-.51,2.27,-.81],[-.51,2.59,-.81],.006,trim);
  for(const x of [-.62,.62]){
    box(.09,.05,.10,dark,x,1.92,1.61,.005);
    box(.06,.035,.07,lens,x,1.956,1.61,.004);
  }

  const wheels=[],suspensionArms=[],wheelRadius=.43;
  const dynamics=createRoverDynamics(ROVER_SCALE,{halfWheelbase:1.38});
  function addWheel(x,z,supports){
    const wheel=new THREE.Group();wheel.position.set(x,wheelRadius,z);body.add(wheel);wheels.push(wheel);
    wheel.name=`Wheel ${x} ${z}`;wheel.userData.supports=supports;
    // A broad barrel tire with tapered shoulders, modeled as a lathed section.
    const profile=[new THREE.Vector2(.255,-.29),new THREE.Vector2(.33,-.27),
      new THREE.Vector2(.395,-.20),new THREE.Vector2(.425,-.10),new THREE.Vector2(.43,.02),
      new THREE.Vector2(.42,.13),new THREE.Vector2(.385,.23),new THREE.Vector2(.31,.29),
      new THREE.Vector2(.245,.30)];
    const tire=part(new THREE.LatheGeometry(profile,64),rubber,0,0,0,wheel);tire.rotation.z=Math.PI/2;
    tire.name='Tapered barrel tire';
    const side=Math.sign(x);
    // Recessed tire bands and orange shoulder tabs frame the broad white hubs.
    for(const axial of [-.17,-.075,.075,.17]){
      const band=part(new THREE.TorusGeometry(Math.abs(axial)>.1?.408:.426,.006,6,64),seal,axial,0,0,wheel);band.rotation.y=Math.PI/2;
    }
    for(let i=0;i<16;i++){
      const angle=i/16*Math.PI*2;
      const tab=box(.045,.050,.023,orange,side*.244,Math.cos(angle)*.367,Math.sin(angle)*.367,.004,wheel);
      tab.rotation.x=angle;
    }
    const innerCap=part(new THREE.CylinderGeometry(.26,.26,.035,40),dark,-side*.27,0,0,wheel);innerCap.rotation.z=Math.PI/2;
    const hub=part(new THREE.CylinderGeometry(.29,.33,.055,48),white,side*.282,0,0,wheel);hub.rotation.z=-side*Math.PI/2;
    const ring=part(new THREE.TorusGeometry(.319,.014,8,64),orange,side*.303,0,0,wheel);ring.rotation.y=Math.PI/2;
    const center=part(new THREE.CylinderGeometry(.205,.205,.065,40),dark,side*.306,0,0,wheel);center.rotation.z=Math.PI/2;
    const axleBar=box(.045,.075,.53,orange,side*.348,-.055,0,.012,wheel);
    axleBar.name='Orange hub brace';
    for(const z of [-.19,.19]){
      const bolt=part(new THREE.CylinderGeometry(.023,.023,.012,8),gold,side*.377,-.055,z,wheel);bolt.rotation.z=Math.PI/2;
    }
    // Hundreds of small raised dots replace the previous oversized tread bars.
    const rows=9,columns=72;
    const treadMaterial=new THREE.MeshStandardMaterial({color:0x39404b,roughness:1});
    const studs=new THREE.InstancedMesh(new THREE.SphereGeometry(.0075,5,3),treadMaterial,rows*columns);
    studs.name='Dotted tire tread';
    const dot=new THREE.Object3D();let index=0;
    for(let row=0;row<rows;row++){
      const axial=-.22+row*.055;
      // LatheGeometry is rotated onto X, so axial X corresponds to -profile Y.
      const along=-axial;
      let radius=.43;
      for(let j=1;j<profile.length;j++)if(along<=profile[j].y){
        const t=(along-profile[j-1].y)/(profile[j].y-profile[j-1].y);
        radius=THREE.MathUtils.lerp(profile[j-1].x,profile[j].x,t);break;
      }
      for(let col=0;col<columns;col++){
        const angle=(col+(row%2)*.5)/columns*Math.PI*2;
        dot.position.set(axial,Math.cos(angle)*(radius+.004),Math.sin(angle)*(radius+.004));
        dot.updateMatrix();studs.setMatrixAt(index++,dot.matrix);
      }
    }
    studs.castShadow=true;studs.receiveShadow=true;wheel.add(studs);
    const axle=part(new THREE.CylinderGeometry(.045,.045,.55,8),gold,x*.8,.5,z);axle.rotation.z=Math.PI/2;
    suspensionArms.push(axle);
  }
  // Corner contacts retain the stable solver; two intermediate axles interpolate
  // their adjacent corner travel in proportion to distance along the wheelbase.
  for(const x of [-1,1])for(const z of [-1.38,1.38])addWheel(x,z,[wheels.length]);
  for(const x of [-1,1])for(const z of [-.46,.46])addWheel(x,z,x<0?[0,1]:[2,3]);
  const jets=[];
  const flameMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{time:{value:0},power:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float time;uniform float power;varying vec2 vUv;void main(){float flicker=.8+.2*sin(vUv.y*38.-time*35.);vec3 c=mix(vec3(.04,.35,1.),vec3(.65,1.,1.),vUv.y);gl_FragColor=vec4(c*1.7,pow(vUv.y,1.2)*flicker*power*.8);}`});
  for(const x of [-.53,.53])for(const z of [-.55,.55]){
    part(new THREE.CylinderGeometry(.13,.19,.23,12),dark,x,.49,z);
    const flame=part(new THREE.ConeGeometry(.16,1,12,1,true),flameMaterial,x,0,z);flame.rotation.z=Math.PI;jets.push(flame);
  }
  const glow=new THREE.PointLight(0x28bcff,0,6,2);glow.position.y=.3;body.add(glow);
  root.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});
  const paintMaterials=new Set();
  root.traverse(object=>{if(object.isMesh&&object.material.userData?.satinPaint)paintMaterials.add(object.material);});
  for(const material of paintMaterials)applyPaintFinish(material);
  let heading=0;
  const armStart=new THREE.Vector3(),armEnd=new THREE.Vector3(),armUp=new THREE.Vector3(0,1,0);
  return {root,
    dynamics:dynamics.state,
    resetDynamics(){dynamics.reset();body.rotation.set(0,0,0);body.position.y=0;},
    getWheelContact(index,target){
      const wheel=wheels[index];
      // Tire spin does not change the suspension contact point.
      target.copy(wheel.position);target.y-=wheelRadius;body.localToWorld(target);
      return wheel.userData.supports.some(support=>dynamics.state.wheels[support].contact);
    },
    faceTowards(target,dt){
      const desired=Math.atan2(root.position.x-target.x,root.position.z-target.z);
      heading+=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading))*(1-Math.exp(-dt*7));
      root.rotation.y=heading;
      return Math.abs(Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading)));
    },
    update(dt,position,velocity,throttle,grounded,sample){
      root.position.copy(position);
      const speed=Math.hypot(velocity.x,velocity.z);
      if(speed>.15){const desired=Math.atan2(-velocity.x,-velocity.z);heading+=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading))*(1-Math.exp(-dt*7));}
      root.rotation.y=heading;
      const pose=dynamics.update(dt,position,heading,velocity,grounded,throttle,sample);
      body.rotation.set(pose.pitch,0,pose.roll);body.position.y=pose.heave;
      for(let i=0;i<wheels.length;i++){
        const supports=wheels[i].userData.supports;
        const t=(wheels[i].position.z+1.38)/2.76;
        const offset=supports.length===1?pose.wheels[supports[0]].offset:
          THREE.MathUtils.lerp(pose.wheels[supports[0]].offset,pose.wheels[supports[1]].offset,t);
        wheels[i].position.y=wheelRadius+offset;
        const arm=suspensionArms[i],x=wheels[i].position.x;
        const end=armEnd.set(x,wheels[i].position.y,wheels[i].position.z);
        const start=armStart.set(x*.55,.64,wheels[i].position.z);
        arm.position.copy(start).add(end).multiplyScalar(.5);
        const direction=end.sub(start);
        arm.scale.y=direction.length()/.55;
        arm.quaternion.setFromUnitVectors(armUp,direction.normalize());
      }
      const forwardSpeed=-velocity.x*Math.sin(heading)-velocity.z*Math.cos(heading);
      for(const wheel of wheels)wheel.rotation.x-=forwardSpeed*dt/(wheelRadius*ROVER_SCALE);
      flameMaterial.uniforms.time.value+=dt;flameMaterial.uniforms.power.value=throttle;
      for(const flame of jets){const length=.2+throttle*1.3;flame.visible=throttle>.02;flame.scale.y=length;flame.position.y=.37-length*.5;}
      glow.intensity=throttle*4;
    }
  };
}
