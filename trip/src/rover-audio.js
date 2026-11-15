const ASSETS=[
  {name:'drive',file:'rover-drive.wav',loop:true},
  {name:'tracks',file:'rover-tracks.wav',loop:true},
  {name:'jet',file:'rover-jet.wav',loop:true},
  {name:'scan',file:'rover-scan.wav',loop:true},
  {name:'complete',file:'rover-scan-complete.wav',loop:false}
];

// Locally bundled recordings share the rover's mute and focus controls.
// AudioContext is created/resumed in a user gesture to satisfy autoplay rules.
export function createRoverAudio({baseUrl='/',createContext=()=>{
  const Context=globalThis.AudioContext??globalThis.webkitAudioContext;
  return Context?new Context():null;
},fetchAudio=globalThis.fetch}={}){
  let context=null,layers=[],active=false,focused=true,muted=false,disposed=false;
  let speed=0,grounded=false,thrust=0,scanning=false,scanProgress=0,completionBuffer=null;
  const loads=new Map(),cues=new Set();
  const audible=()=>active&&focused&&!muted&&!disposed;

  function mix(){
    if(!context||disposed)return;
    const moving=audible()&&grounded;
    const rolling=moving?Math.min(1,Math.max(0,(speed-.08)/.82)):0;
    const pace=Math.min(speed/7,1);
    for(const {name,source,gain} of layers){
      let volume=0,rate=1;
      if(name==='drive'){volume=rolling*(.13+.14*pace);rate=.78+.58*pace;}
      if(name==='tracks'){volume=rolling*(.20+.30*pace);rate=.65+.90*pace;}
      if(name==='jet'){volume=audible()&&thrust>.02?thrust*.55:0;rate=.80+.40*thrust;}
      if(name==='scan'){volume=audible()&&scanning?.32:0;rate=.88+.25*scanProgress;}
      gain.gain.setTargetAtTime(volume,context.currentTime,volume>0?.09:.035);
      source.playbackRate.setTargetAtTime(rate,context.currentTime,.12);
    }
  }

  async function load({name,file,loop}){
    const response=await fetchAudio(`${baseUrl}audio/${file}`);
    if(!response.ok)throw new Error(`Rover audio unavailable: ${response.status}`);
    const buffer=await context.decodeAudioData(await response.arrayBuffer());
    if(disposed)return;
    if(loop){
      const source=context.createBufferSource(),gain=context.createGain();
      source.buffer=buffer;source.loop=true;gain.gain.value=0;
      source.connect(gain);gain.connect(context.destination);
      source.start();
      layers.push({name,source,gain});
    }else completionBuffer=buffer;
    mix();
  }

  async function unlock(){
    if(disposed||muted)return;
    try{
      context??=createContext();
      if(!context)return;
      // Resume synchronously within the input handler, before waiting for files.
      const resumed=context.state==='running'?Promise.resolve():context.resume();
      // Load independently so one missing effect cannot silence the others.
      for(const asset of ASSETS)if(!loads.has(asset.name)){
        loads.set(asset.name,load(asset).catch(error=>{loads.delete(asset.name);throw error;}));
      }
      await Promise.allSettled([resumed,...loads.values()]);
    }catch{
      // A later driving gesture retries blocked playback or failed downloads.
    }
  }

  function stopCues(){
    for(const {source,gain} of cues){
      gain.gain.setTargetAtTime(0,context.currentTime,.01);
      source.stop(context.currentTime+.06);
    }
  }
  function cancelScan(){scanning=false;scanProgress=0;stopCues();mix();}
  function stopMotion(){speed=0;grounded=false;thrust=0;}

  return {
    unlock,
    get muted(){return muted;},
    setMuted(value){muted=value;if(value)stopCues();mix();if(!value)void unlock();},
    setActive(value){active=value;if(!value){stopMotion();cancelScan();}mix();},
    setFocused(value){focused=value;if(!value){stopMotion();stopCues();}mix();},
    update(velocity,onGround,power=0){speed=Math.hypot(velocity.x,velocity.z);grounded=onGround;thrust=Math.max(0,Math.min(1,power));mix();},
    stop(){stopMotion();mix();},
    prepareScan(){cancelScan();void unlock();},
    scanProgress(progress){scanning=true;scanProgress=Math.max(0,Math.min(1,progress));mix();},
    finishScan(){
      const wasScanning=scanning;
      scanning=false;mix();
      // Never queue a completion cue for a late download or a hidden tab.
      if(!wasScanning||!audible()||!completionBuffer||context.state!=='running')return;
      const source=context.createBufferSource(),gain=context.createGain();
      source.buffer=completionBuffer;gain.gain.value=.42;
      source.connect(gain);gain.connect(context.destination);
      const cue={source,gain};cues.add(cue);
      source.onended=()=>{source.disconnect();gain.disconnect();cues.delete(cue);};
      source.start();
    },
    cancelScan,
    dispose(){
      if(disposed)return;
      disposed=true;
      for(const {source,gain} of layers){source.stop();source.disconnect();gain.disconnect();}
      for(const {source,gain} of cues){source.stop();source.disconnect();gain.disconnect();}
      cues.clear();
      layers=[];
      void context?.close().catch(()=>{});
    }
  };
}
