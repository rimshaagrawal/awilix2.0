import * as THREE from 'three';

// Local +Y points away from the lunar surface; scaling keeps the tip planted.
export function createWaypointPin(color){
  const root=new THREE.Group();
  const metal=new THREE.MeshStandardMaterial({color,metalness:.65,roughness:.28,emissive:color,emissiveIntensity:.18});
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.006,.028,12),metal);
  tip.rotation.z=Math.PI;tip.position.y=.014;root.add(tip);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.004,.006,.075,12),metal);
  stem.position.y=.065;root.add(stem);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.021,20,14),metal);
  head.position.y=.112;root.add(head);
  const collar=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,.009,16),metal);
  collar.position.y=.098;root.add(collar);
  return {root,head};
}
