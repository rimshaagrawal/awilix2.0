import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoverAudio} from '../src/rover-audio.js';

function setup({fetchAudio}={}){
  const sources=[],gains=[],requests=[];
  let creations=0,resumes=0;
  const parameter=value=>({value,setTargetAtTime(target){this.value=target;}});
  const context={
    state:'suspended',currentTime:0,destination:{},
    async resume(){resumes++;this.state='running';},
    async close(){this.state='closed';},
    async decodeAudioData(data){return {duration:2,file:typeof data==='string'?data.split('/').pop():null};},
    createBufferSource(){
      const source={playbackRate:parameter(1),connect(gain){this.output=gain;},disconnect(){},
        start(){this.started=true;},stop(){this.stopped=true;}};
      sources.push(source);return source;
    },
    createGain(){const gain={gain:parameter(0),connect(){},disconnect(){}};gains.push(gain);return gain;}
  };
  const audio=createRoverAudio({baseUrl:'/moon/',createContext:()=>{creations++;return context;},
    fetchAudio:async url=>{requests.push(url);return fetchAudio?fetchAudio(url):{ok:true,arrayBuffer:async()=>url};}});
  return {audio,context,sources,gains,requests,get creations(){return creations;},get resumes(){return resumes;}};
}
const motion=(x,z=0)=>({x,y:0,z});
const levels=fixture=>fixture.sources.filter(source=>source.loop).map(source=>source.output.gain.value);
const layer=(fixture,name)=>fixture.sources.find(source=>source.buffer.file===`rover-${name}.wav`);
const level=(fixture,name)=>layer(fixture,name).output.gain.value;

test('audio starts only after a gesture and reuses decoded effects',async()=>{
  const f=setup();f.audio.setActive(true);f.audio.update(motion(4),true);
  assert.equal(f.creations,0);
  await f.audio.unlock();await f.audio.unlock();
  assert.equal(f.creations,1);assert.equal(f.resumes,1);
  assert.deepEqual(f.requests,['drive','tracks','jet','scan','scan-complete'].map(name=>`/moon/audio/rover-${name}.wav`));
  assert.equal(f.sources.length,4);
  assert(f.sources.every(source=>source.started&&source.loop));
  assert(levels(f).slice(0,2).every(level=>level>0));
  assert.equal(level(f,'jet'),0);assert.equal(level(f,'scan'),0);
});

test('driving gets louder and faster with speed in both directions',async()=>{
  const f=setup();await f.audio.unlock();f.audio.setActive(true);
  f.audio.update(motion(1),true);
  const quiet=levels(f).slice(0,2),slow=f.sources.slice(0,2).map(source=>source.playbackRate.value);
  f.audio.update(motion(7),true);
  const loud=levels(f).slice(0,2),fast=f.sources.slice(0,2).map(source=>source.playbackRate.value);
  assert(loud.every((level,i)=>level>quiet[i]&&level<=.5));
  assert(fast.every((rate,i)=>rate>slow[i]&&rate<2));
  f.audio.update(motion(-7),true);assert.deepEqual(levels(f).slice(0,2),loud);
  f.audio.update(motion(0,-7),true);assert.deepEqual(levels(f).slice(0,2),loud);
});

test('stationary, airborne, muted, unfocused and inactive rovers are silent',async()=>{
  const f=setup();await f.audio.unlock();f.audio.setActive(true);
  const drive=()=>f.audio.update(motion(4),true);
  const silent=()=>assert(levels(f).every(level=>level===0));
  drive();assert(levels(f).slice(0,2).every(level=>level>0));
  f.audio.update(motion(0),true);silent();
  f.audio.update(motion(4),false);silent();
  drive();f.audio.setMuted(true);drive();silent();
  f.audio.setMuted(false);drive();assert(levels(f).slice(0,2).every(level=>level>0));
  f.audio.setFocused(false);drive();silent();
  f.audio.setFocused(true);drive();f.audio.setActive(false);drive();silent();
  f.audio.setActive(true);drive();f.audio.stop();silent();
});

test('a loop finishing its download after leaving stays silent',async()=>{
  let finish;
  const pending=new Promise(resolve=>{finish=resolve;});
  const f=setup({fetchAudio:()=>pending});
  f.audio.setActive(true);f.audio.update(motion(4),true);
  const unlocked=f.audio.unlock();
  f.audio.setActive(false);
  finish({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
  await unlocked;assert(levels(f).every(level=>level===0));
});

test('failed downloads and autoplay blocks can be retried by another gesture',async()=>{
  let available=false;
  const f=setup({fetchAudio:async()=>({ok:available,status:503,arrayBuffer:async()=>new ArrayBuffer(8)})});
  f.context.resume=async()=>{if(!available)throw new Error('NotAllowedError');f.context.state='running';};
  await f.audio.unlock();assert.equal(f.sources.length,0);
  available=true;await f.audio.unlock();assert.equal(f.sources.length,4);
  assert.equal(f.context.state,'running');
});

test('jet sound follows thrust while airborne and fades with booster shutdown',async()=>{
  const f=setup();await f.audio.unlock();f.audio.setActive(true);
  f.audio.update(motion(4),false,.25);
  assert.equal(level(f,'drive'),0);assert.equal(level(f,'tracks'),0);
  const low=level(f,'jet'),slow=layer(f,'jet').playbackRate.value;
  assert(low>0);f.audio.update(motion(4),false,1);
  assert(level(f,'jet')>low);assert(layer(f,'jet').playbackRate.value>slow);
  f.audio.update(motion(4),false,.1);assert(level(f,'jet')>0);
  f.audio.update(motion(4),false,.01);assert.equal(level(f,'jet'),0);
});

test('scan sweep follows the beam, completes once, and leaves movement stopped',async()=>{
  const f=setup();await f.audio.unlock();f.audio.setActive(true);f.audio.prepareScan();
  assert.equal(level(f,'scan'),0);
  f.audio.scanProgress(.05);const initialRate=layer(f,'scan').playbackRate.value;
  assert(level(f,'scan')>0);f.audio.stop();assert(level(f,'scan')>0);
  f.audio.scanProgress(.9);assert(layer(f,'scan').playbackRate.value>initialRate);
  f.audio.finishScan();f.audio.finishScan();
  assert.equal(level(f,'scan'),0);
  const cues=f.sources.filter(source=>!source.loop);
  assert.equal(cues.length,1);assert(cues[0].started);assert.equal(cues[0].buffer.file,'rover-scan-complete.wav');
  f.audio.setMuted(true);assert(cues[0].stopped);
});

test('mute, focus loss, cancellation and leaving silence jet and scanner effects',async()=>{
  for(const action of ['mute','focus','leave','cancel']){
    const f=setup();await f.audio.unlock();f.audio.setActive(true);
    f.audio.update(motion(0),false,1);f.audio.scanProgress(.5);
    assert(level(f,'jet')>0&&level(f,'scan')>0);
    if(action==='mute')f.audio.setMuted(true);
    if(action==='focus')f.audio.setFocused(false);
    if(action==='leave')f.audio.setActive(false);
    if(action==='cancel'){f.audio.stop();f.audio.cancelScan();}
    assert(levels(f).every(value=>value===0));
    f.audio.finishScan();assert.equal(f.sources.length,4);
  }
});

test('an unavailable scan effect does not break driving audio and retries independently',async()=>{
  let available=false;
  const f=setup({fetchAudio:async url=>({ok:available||!url.endsWith('rover-scan.wav'),status:503,arrayBuffer:async()=>url})});
  await f.audio.unlock();f.audio.setActive(true);f.audio.update(motion(4),true);
  assert(level(f,'drive')>0);assert.equal(f.sources.length,3);
  available=true;await f.audio.unlock();assert.equal(f.sources.length,4);
  assert.equal(f.requests.filter(url=>url.endsWith('rover-drive.wav')).length,1);
  assert.equal(f.requests.filter(url=>url.endsWith('rover-scan.wav')).length,2);
});

test('disposal stops loops and prevents late downloads from starting sources',async()=>{
  const f=setup();await f.audio.unlock();f.audio.dispose();f.audio.dispose();
  assert(f.sources.every(source=>source.stopped));assert.equal(f.context.state,'closed');
  const late=setup();
  late.audio.dispose();await late.audio.unlock();assert.equal(late.creations,0);
  let resolveResponse;
  const response=new Promise(resolve=>{resolveResponse=resolve;});
  const pending=setup({fetchAudio:()=>response});
  const unlocked=pending.audio.unlock();pending.audio.dispose();
  resolveResponse({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
  await unlocked;assert.equal(pending.sources.length,0);
});
