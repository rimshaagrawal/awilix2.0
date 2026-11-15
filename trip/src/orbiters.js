import * as THREE from 'three';

// Small, reference-inspired spacecraft, modeled in local units and scaled as a group.
function createOrbiter() {
  const craft = new THREE.Group();
  const silver = new THREE.MeshStandardMaterial({color:0xc9d0d8,metalness:.7,roughness:.35});
  const foil = new THREE.MeshStandardMaterial({color:0xc5a56b,metalness:.65,roughness:.55});
  const blue = new THREE.MeshStandardMaterial({color:0x163c68,metalness:.35,roughness:.38,emissive:0x071221,emissiveIntensity:.3});
  const dark = new THREE.MeshStandardMaterial({color:0x292e35,metalness:.4,roughness:.5});
  const add = (geometry, material, x=0, y=0, z=0, parent=craft) => {
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  };
  add(new THREE.CylinderGeometry(.43,.43,.82,12),foil);
  for(const y of [-.45,.45]) add(new THREE.CylinderGeometry(.52,.52,.06,16),silver,0,y);
  for(const x of [-.34,.34]) add(new THREE.SphereGeometry(.19,12,8),dark,x,-.67);
  // Four framed solar wings with individual cells on both faces.
  for(let i=0;i<4;i++){
    const wing=new THREE.Group();wing.rotation.y=i*Math.PI/2;craft.add(wing);
    add(new THREE.BoxGeometry(.9,.055,.07),silver,.8,.16,0,wing);
    add(new THREE.BoxGeometry(.94,.045,.62),silver,1.2,.16,0,wing);
    for(let side of [-1,1]) for(let col=0;col<4;col++) for(let row=0;row<3;row++){
      add(new THREE.BoxGeometry(.208,.008,.177),blue,.86+col*.227,.16+side*.027,-.195+row*.195,wing);
    }
  }
  const antenna=new THREE.Group();antenna.position.set(.22,.45,0);antenna.rotation.z=-.42;craft.add(antenna);
  add(new THREE.CylinderGeometry(.025,.035,.65,8),silver,0,.3,0,antenna);
  // A shallow paraboloid, open toward +Y, with a central feed.
  const profile=[];
  for(let i=0;i<=12;i++){const r=i/12*.38;profile.push(new THREE.Vector2(r,r*r*.65));}
  const dishMaterial=silver.clone();dishMaterial.side=THREE.DoubleSide;
  add(new THREE.LatheGeometry(profile,24),dishMaterial,0,.63,0,antenna);
  add(new THREE.CylinderGeometry(.012,.012,.27,6),silver,0,.78,0,antenna);
  add(new THREE.SphereGeometry(.04,8,6),foil,0,.93,0,antenna);
  add(new THREE.CylinderGeometry(.008,.008,1.1,5),silver,-.35,-.9,.1).rotation.z=-.3;
  craft.scale.setScalar(.026);
  return craft;
}

export function createOrbiters(scene) {
  const specs=[
    {radius:1.29,inclination:.35,node:.2,phase:.25,speed:.135},
    {radius:1.47,inclination:1.22,node:2.2,phase:2.5,speed:.108},
    {radius:1.65,inclination:2.05,node:4.1,phase:4.6,speed:.088},
    {radius:1.36,inclination:.82,node:1.3,phase:3.7,speed:.124}
  ];
  const orbiters=specs.map(spec=>{
    const plane=new THREE.Group();plane.rotation.set(spec.inclination,spec.node,0);scene.add(plane);
    // Sample the same local XZ circle used by the animated pivot, so every dot
    // lies on the spacecraft trajectory and the Moon occludes the far side.
    const pathPoints=[];
    for(let i=0;i<180;i++){
      const angle=i/180*Math.PI*2;
      pathPoints.push(spec.radius*Math.cos(angle),0,spec.radius*Math.sin(angle));
    }
    const pathGeometry=new THREE.BufferGeometry();
    pathGeometry.setAttribute('position',new THREE.Float32BufferAttribute(pathPoints,3));
    const path=new THREE.Points(pathGeometry,new THREE.PointsMaterial({
      color:0x808080,size:1.3,sizeAttenuation:false,transparent:true,
      opacity:.17,depthWrite:false,toneMapped:false
    }));
    path.name='Dotted orbital trajectory';plane.add(path);
    const pivot=new THREE.Group();plane.add(pivot);
    const craft=createOrbiter();craft.position.x=spec.radius;
    // The instrument end stays pointed inward as the spacecraft follows its orbit.
    craft.rotation.z=Math.PI/2;pivot.add(craft);
    return {...spec,pivot};
  });
  let elapsed=0;
  const update=dt=>{elapsed+=dt;for(const orbiter of orbiters)orbiter.pivot.rotation.y=orbiter.phase+elapsed*orbiter.speed;};
  update(0);
  return {update};
}
