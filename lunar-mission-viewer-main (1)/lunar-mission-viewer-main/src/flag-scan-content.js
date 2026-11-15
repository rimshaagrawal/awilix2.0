import waveform from './armstrong-waveform.json' with {type:'json'};

export function flagScanContent(baseUrl='/'){
  const bars=waveform.peaks.map((peak,i)=>{
    const height=Math.max(3,peak*36);
    return `<rect x="${i*5}" y="${(44-height)/2}" width="3" height="${height}" rx="1.5"/>`;
  }).join('');
  const wave=`<svg viewBox="0 0 320 44" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>`;
  return `<section class="flag-scan-content">
    <div class="mission-meta">TRANQUILITY BASE · JULY 1969</div>
    <h2>Apollo 11</h2>
    <div class="mission-photos">
      <figure><img src="${baseUrl}images/apollo-11-flag.png" alt="Buzz Aldrin saluting the American flag on the lunar surface" width="445" height="449"><figcaption>Buzz Aldrin at the flag</figcaption></figure>
      <figure><img src="${baseUrl}images/neil-armstrong.png" alt="Neil Armstrong in his Apollo spacesuit" width="900" height="658"><figcaption>Neil Armstrong · Commander</figcaption></figure>
    </div>
    <p>On July 20, 1969, Apollo 11’s lunar module <em>Eagle</em> landed in the Sea of Tranquility. Neil Armstrong and Buzz Aldrin became the first people to walk on the Moon and planted this American flag during their moonwalk, while Michael Collins orbited above in <em>Columbia</em>. They collected lunar samples, deployed experiments, and returned safely to Earth on July 24. A horizontal support held the flag unfurled in the Moon’s airless environment.</p>
    <div class="mission-audio" aria-label="Neil Armstrong’s first words on the Moon">
      <div class="audio-label">NEIL ARMSTRONG · FIRST STEP</div>
      <audio preload="metadata" src="${baseUrl}audio/armstrong-small-step.mp3"></audio>
      <div class="audio-controls">
        <button class="audio-toggle" type="button" aria-label="Play Neil Armstrong recording" aria-pressed="false"><span aria-hidden="true">▶</span></button>
        <div class="audio-waveform">
          ${wave}<div class="wave-progress">${wave}</div>
          <input class="audio-seek" type="range" min="0" max="${waveform.duration}" step="0.01" value="0" aria-label="Seek through Neil Armstrong recording" aria-valuetext="0:00">
        </div>
      </div>
      <div class="audio-timestamp"><span class="audio-state">Original mission audio</span><span class="audio-time">0:00 / 0:13</span></div>
      <p class="audio-error" role="status" hidden></p>
      <details class="audio-transcript"><summary>Transcript</summary><p>“That’s one small step for [a] man, one giant leap for mankind.”</p></details>
    </div>
    <div class="mission-sources">NASA archive · <a href="https://www.nasa.gov/history/55-years-ago-apollo-11s-one-small-step-one-giant-leap/" target="_blank" rel="noopener noreferrer">Mission history</a> · <a href="https://www.nasa.gov/historical-sounds/" target="_blank" rel="noopener noreferrer">Audio source</a></div>
  </section>`;
}

export function attachFlagScanMedia(card){
  const audio=card.querySelector('audio'),toggle=card.querySelector('.audio-toggle');
  const seek=card.querySelector('.audio-seek'),wave=card.querySelector('.audio-waveform');
  const timestamp=card.querySelector('.audio-time'),state=card.querySelector('.audio-state'),error=card.querySelector('.audio-error');
  const format=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  const duration=()=>Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:waveform.duration;
  function sync(){
    const total=duration(),current=audio.ended?Math.ceil(total):audio.currentTime;
    timestamp.textContent=`${format(current)} / ${format(Math.ceil(total))}`;
    seek.max=total;seek.value=audio.currentTime;seek.setAttribute('aria-valuetext',format(current));
    wave.style.setProperty('--progress',`${Math.min(100,audio.currentTime/total*100)}%`);
    toggle.setAttribute('aria-label',audio.paused?'Play Neil Armstrong recording':'Pause Neil Armstrong recording');
    toggle.setAttribute('aria-pressed',String(!audio.paused));
    toggle.querySelector('span').textContent=audio.paused?'▶':'Ⅱ';
    state.textContent=audio.paused?'Original mission audio':'Playing · Neil Armstrong';
  }
  function showError(){error.hidden=false;error.textContent='Audio could not play. Please try again.';sync();}
  async function play(){try{error.hidden=true;await audio.play();}catch{showError();}}
  toggle.addEventListener('click',()=>{
    if(audio.paused){if(audio.ended)audio.currentTime=0;void play();}else audio.pause();
  });
  seek.addEventListener('input',()=>{audio.currentTime=Number(seek.value);sync();});
  seek.addEventListener('change',()=>{if(audio.paused)void play();});
  for(const name of ['loadedmetadata','durationchange','timeupdate','play','pause','ended'])audio.addEventListener(name,sync);
  audio.addEventListener('error',showError);
  // Keep playback shortcuts inside the card from also driving the rover.
  card.addEventListener('keydown',event=>event.stopPropagation());
  sync();
  return {hide(){audio.pause();}};
}
