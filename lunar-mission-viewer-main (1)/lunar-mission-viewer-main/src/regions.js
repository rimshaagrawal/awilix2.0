import * as THREE from 'three';

// NASA NSSDCA: https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html
export const APOLLO_11={id:'apollo-11',name:'Apollo 11 · Tranquility Base',latitude:.67416,longitude:23.47314,centralCrater:false,pole:1,
  image:'/images/apollo-11-flag.png',imageAlt:'Apollo 11 astronaut and American flag at Tranquility Base',imageCaption:'Tranquility Base · NASA / Apollo 11'};
export const SOUTH_POLE={id:'south-pole',name:'South polar region',latitude:-90,longitude:0,centralCrater:true,pole:-1,
  image:'/images/sites/south-pole.jpg',imageAlt:'LROC view of Shackleton rim with an arrow marking the lunar south pole',imageCaption:'South pole at Shackleton · NASA / GSFC / ASU'};
// Representative points within extended features, not surveyed landing targets.
// Shackleton rim: site 004 in https://doi.org/10.3847/PSJ/aca590
// Malapert A & Mons Mouton: IAU/USGS Gazetteer features 11081 and 16070.
// Nobile Rim 1: https://doi.org/10.3390/rs17091579 (Table 2).
// Connecting ridge: LROC DTM SHACKRDGE02 center (224.81°E = 135.19°W).
export const SOUTH_POLAR_SITES=[
  {id:'shackleton-rim',name:'Shackleton Crater Rim',latitude:-89.78,longitude:-155.73,
    imageAlt:'LROC close-up of boulders along the rim of Shackleton crater',imageCaption:'Shackleton rim · NASA / GSFC / ASU'},
  {id:'malapert-a',name:'Malapert A',latitude:-80.18,longitude:-3.79,
    imageAlt:'LROC Wide Angle Camera mosaic centered on Malapert A crater',imageCaption:'Malapert A · NASA / GSFC / ASU'},
  {id:'mons-mouton',name:'Mons Mouton',latitude:-84.6,longitude:31,
    imageAlt:'LRO data visualization of Mons Mouton with Nobile crater in the foreground',imageCaption:'LRO terrain visualization · NASA / SVS'},
  {id:'nobile-rim',name:'Nobile Crater Rim',latitude:-85.42,longitude:37.38,
    imageAlt:'LROC orbital mosaic of Nobile Rim 1 and the adjacent Mons Mouton terrain',imageCaption:'Nobile Rim 1 mosaic · NASA / GSFC / ASU'},
  {id:'connecting-ridge',name:'Shackleton Connecting Ridge',latitude:-89.5,longitude:-135.19,
    imageAlt:'Oblique LROC image of the ridge connecting Shackleton and de Gerlache craters',imageCaption:'Connecting ridge · NASA / GSFC / ASU'},
].map(site=>({...site,centralCrater:true,pole:-1,approximate:true,image:`/images/sites/${site.id}.jpg`}));
export const WAYPOINT_REGIONS=[APOLLO_11,SOUTH_POLE,...SOUTH_POLAR_SITES];
// The NASA map places longitude 0 at texture U=.5 on Three's SphereGeometry.
export function lunarNormal(latitude,longitude){
  const lat=latitude*THREE.MathUtils.DEG2RAD,lon=longitude*THREE.MathUtils.DEG2RAD;
  return new THREE.Vector3(Math.cos(lat)*Math.cos(lon),Math.sin(lat),-Math.cos(lat)*Math.sin(lon));
}
