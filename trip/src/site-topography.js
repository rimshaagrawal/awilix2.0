// Photo-interpreted landforms in local scene units, deliberately compressed to
// the playable area. Photometric shadows, labels and mosaic gaps are NOT heights.
// Image references: public/images/sites/sources.json. Seeded detail fills areas
// that cannot be recovered from a single orbital/oblique view.
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const bell=t=>Math.exp(-t*t);
function hash(x,z,seed){
  let n=Math.imul(x,374761393)^Math.imul(z,668265263)^Math.imul(seed,1442695041);
  n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;
}
function noise(x,z,seed){
  const ix=Math.floor(x),iz=Math.floor(z),u=smooth(0,1,x-ix),v=smooth(0,1,z-iz);
  return mix(mix(hash(ix,iz,seed),hash(ix+1,iz,seed),u),mix(hash(ix,iz+1,seed),hash(ix+1,iz+1,seed),u),v)*2-1;
}
function relief(x,z,seed,amplitude=1){
  return amplitude*(noise(x/57,z/57,seed)*.62+noise(x/24,z/24,seed+1)*.25+noise(x/9,z/9,seed+2)*.1+noise(x/3.8,z/3.8,seed+3)*.03);
}
// A smooth excavated bowl, finite ejecta apron and raised, irregular rim.
// Every term fades continuously to zero, including its slope, at the apron edge.
function crater(x,z,c){
  const dx=x-c.x,dz=(z-c.z)/(c.aspect??1),angle=Math.atan2(dz,dx);
  const warp=1+(c.irregularity??.035)*(Math.sin(angle*3+c.phase)+.45*Math.sin(angle*7-c.phase));
  const d=Math.hypot(dx,dz)/(c.radius*warp);
  if(d>=1.65)return 0;
  const bowl=-c.depth*(1-smooth(.05,1,d));
  const rim=c.rim*bell((d-1)/.14);
  const apron=c.rim*.18*bell((d-1.15)/.3);
  return (bowl+rim+apron)*(1-smooth(1.35,1.65,d));
}
const c=(x,z,radius,depth,rim,extra={})=>({x,z,radius,depth,rim,phase:.7,...extra});

export const SITE_TERRAIN_PROFILES={
  'shackleton-rim':{
    seed:71,roughness:1.6,
    // A close view of a rim segment: crater interior is upper-right in the photo.
    craters:[c(-67,-122,13,6,1.7),c(-17,-28,8,3.8,1),c(-76,47,10,4.5,1.3),c(62,94,15,6.3,1.9),c(16,66,8,3.8,1),c(-89,101,5,2.2,.65)],
    base(x,z){
      const crest=.72*z-10+6*Math.sin(z/65),cross=(x-crest)/1.23;
      const inward=smooth(3,72,cross);
      const ridge=16*bell(cross/17)*(1+.12*Math.sin(z/22)+.06*Math.sin(z/8));
      // Shallow gullies run down the inner wall; their relief fades at both ends.
      const gullies=1.3*Math.sin((z+.18*x)/6)*bell((cross-33)/27)*Math.sin(Math.PI*inward);
      return 3+ridge-43*inward+gullies+1.6*Math.sin(z/83)*(1-inward);
    },
  },
  'malapert-a':{
    seed:183,roughness:2.5,
    // Degraded, overlapping broad basin plus the sharper foreground impacts.
    craters:[c(18,-18,83,16,4.2,{irregularity:.075,aspect:.91}),c(-104,83,23,11,3.5),c(-100,159,25,13,4),c(111,92,22,10.7,3.3),c(-128,-131,17,7.8,2.6),c(119,-127,13,6,2),c(-66,-83,10,4.5,1.5),c(103,-9,12,5.4,1.8),c(17,116,9,4.1,1.3)],
    base(x,z){
      return 4+3.2*Math.sin((x+.5*z)/104)+2.1*Math.cos((z-.2*x)/73)
        +5*bell((x+.35*z+65)/37)*bell((z+35)/135);
    },
  },
  'mons-mouton':{
    seed:307,roughness:1.6,
    craters:[c(-64,1,17,6.5,1.7),c(50,-49,25,9,2.6),c(87,23,11,5,1.5),c(-20,55,10,4.5,1.3),c(-106,99,25,11,3.4),c(109,103,30,13,3.7),c(-137,-62,16,7,2.1)],
    base(x,z){
      const angle=Math.atan2(z+22,x),r=Math.hypot(x,(z+22)*1.17);
      const edge=110+7*Math.sin(angle*3)+3*Math.cos(angle*5);
      const summit=1-smooth(edge-22,edge+25,r);
      const apron=1-smooth(edge+18,edge+78,r);
      // Broad, gently rolling summit; rounded scarps descend to a lower apron.
      return -13+33*summit+5*apron+.9*Math.sin(x/56)*Math.cos(z/48)*summit;
    },
  },
  'nobile-rim':{
    seed:419,roughness:2.1,
    craters:[c(-98,-103,17,7.5,2),c(-39,-73,19,8.2,2.3),c(28,-101,16,7,2),c(-53,17,22,10,2.8),c(15,25,9,4.7,1.4),c(1,78,16,7,2.1),c(-127,100,12,5.5,1.6)],
    base(x,z){
      // The mosaic shows a pitted upland on the left and a broad rim scarp right.
      const bend=31+.16*z+12*Math.sin(z/76),cross=x-bend;
      const upper=1-smooth(-20,7,cross),lower=1-smooth(25,67,cross);
      const rim=5*bell((cross+8)/16)*(1+.15*Math.sin(z/21));
      const flutes=1.7*Math.sin((z+.3*x)/9)*bell((cross-35)/25);
      return -28+22*upper+19*lower+rim+flutes+2.3*Math.sin(z/90)*upper;
    },
  },
  'connecting-ridge':{
    seed:523,roughness:1.4,
    craters:[c(22,-113,11,5.3,1.7),c(-22,100,10,4.4,1.3),c(37,35,6,2.8,.8),c(-39,-44,6,2.7,.8),c(58,131,13,5.8,1.7)],
    base(x,z){
      const center=8+16*Math.sin(z/95),cross=x-center;
      const width=40+15*smooth(-35,120,z)+9*bell((z+95)/55);
      const crest=1-smooth(width*.46,width+28,Math.abs(cross));
      const saddle=1-.3*bell((z+7)/24);
      const lobes=4.5*bell((z+105)/56)+3*bell((z-110)/75);
      const flank=2*Math.sin((z+.2*x)/11)*bell((Math.abs(cross)-width)/20);
      // Two rounded lobes joined by a lower, narrow traversable saddle.
      return -24+crest*(43*saddle+lobes)+flank;
    },
  },
};

export function createSiteHeight(siteId){
  const profile=SITE_TERRAIN_PROFILES[siteId];
  if(!profile)return null;
  // Stratified, seeded infill rather than identical radial crater rings at every site.
  const small=[];
  for(let iz=0;iz<15;iz++)for(let ix=0;ix<15;ix++){
    const x=-210+(ix+.15+.7*hash(ix,iz,profile.seed))*28;
    const z=-210+(iz+.15+.7*hash(ix,iz,profile.seed+1))*28;
    const radius=1.8+hash(ix,iz,profile.seed+2)*4.6;
    if(Math.hypot(x,z-61)<8||Math.hypot(x-16,z-74)<8)continue;
    small.push(c(x,z,radius,radius*.28,radius*.1,{phase:hash(ix,iz,profile.seed+3)*6.28}));
  }
  // Spatial bins avoid testing every crater at every one of the 263k vertices.
  const bins=new Map(),binSize=32;
  for(const crater of [...profile.craters,...small]){
    const reach=crater.radius*1.65*Math.max(1,crater.aspect??1)*1.12;
    for(let iz=Math.floor((crater.z-reach)/binSize);iz<=Math.floor((crater.z+reach)/binSize);iz++)
      for(let ix=Math.floor((crater.x-reach)/binSize);ix<=Math.floor((crater.x+reach)/binSize);ix++){
        const key=`${ix},${iz}`;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(crater);
      }
  }
  return (x,z)=>{
    let h=profile.base(x,z)+relief(x,z,profile.seed,profile.roughness);
    for(const feature of bins.get(`${Math.floor(x/binSize)},${Math.floor(z/binSize)}`)??[])h+=crater(x,z,feature);
    return h;
  };
}
