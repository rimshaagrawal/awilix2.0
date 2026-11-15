// Draw the housing in CSS-pixel coordinates. Longer edges absorb resizing;
// corners, vents and indicator dots retain their original proportions.
function framePaths(w,h){
  const right=w-2,innerRight=w-9;
  const wide=w>=220;
  const body=wide
    ?`M2 18 14 6H70L78 10H${w-88}L${w-80} 3H${w-14}L${right} 15V${h-24}L${w-16} ${h-10}H${w-99}L${w-107} ${h-3}H20L2 ${h-21}Z`
    :`M2 14 14 3H${w-14}L${right} 14V${h-20}L${w-14} ${h-3}H16L2 ${h-17}Z`;
  const inset=wide
    ?`M9 23 21 13H65L73 17H${w-85}L${w-77} 10H${w-19}L${innerRight} 20V${h-28}L${w-21} ${h-17}H${w-102}L${w-110} ${h-10}H25L9 ${h-25}Z`
    :`M9 19 20 10H${w-20}L${innerRight} 19V${h-23}L${w-19} ${h-10}H21L9 ${h-21}Z`;
  return `<path class="hud-frame-body" d="${body}"/>
    <path class="hud-frame-inset" d="${inset}"/>
    <path class="hud-frame-trace" pathLength="1" d="${body}"/>
    <path class="hud-frame-rail" d="M0 32V${h-30}L6 ${h-24}M${right} 26V${h-36}M28 3H62${wide?`M85 6H143M${w-94} ${h-3}H${w-43}`:''}"/>
    <path class="hud-frame-signal" d="M15 6H42${wide?`M${w-78} 3H${w-19}M${w-97} ${h-10}H${w-68}`:''}"/>
    ${wide?`<path class="hud-frame-vents" d="M${w-60} ${h-10}h9l-7 7h-9ZM${w-45} ${h-10}h9l-7 7h-9ZM${w-30} ${h-10}h9l-7 7h-9Z"/>`:''}
    <g class="hud-frame-nodes"><circle cx="20" cy="${h-16}" r="1.5"/><circle cx="27" cy="${h-16}" r="1.5"/><circle cx="34" cy="${h-16}" r="1.5"/></g>`;
}

export function hudFrame(tall=false){
  const h=tall?440:100;
  return `<svg class="hud-frame" viewBox="0 0 320 ${h}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${framePaths(320,h)}</svg>`;
}

export function observeHudFrames(host){
  const observer=new ResizeObserver(entries=>{
    for(const entry of entries){
      const frame=entry.target.querySelector(':scope > .hud-frame');
      const size=entry.borderBoxSize?.[0];
      const w=size?.inlineSize??entry.target.clientWidth,h=size?.blockSize??entry.target.clientHeight;
      if(!frame||w<1||h<1)continue;
      frame.setAttribute('viewBox',`0 0 ${w} ${h}`);
      frame.innerHTML=framePaths(w,h);
    }
  });
  for(const frame of host.querySelectorAll('.hud-frame'))observer.observe(frame.parentElement);
  return observer;
}
