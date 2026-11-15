// Spread only the screen-space controls. The 3D pins retain their lunar coordinates.
export function layoutWaypoints(points,width,height){
  const remaining=new Set(points),result=[];
  while(remaining.size){
    const cluster=[remaining.values().next().value];remaining.delete(cluster[0]);
    for(let i=0;i<cluster.length;i++)for(const point of remaining){
      if(Math.hypot(point.x-cluster[i].x,point.y-cluster[i].y)<70){
        cluster.push(point);remaining.delete(point);
      }
    }
    const center=cluster.reduce((sum,p)=>({x:sum.x+p.x/cluster.length,y:sum.y+p.y/cluster.length}),{x:0,y:0});
    const radius=cluster.length>1?Math.max(48,cluster.length*11):0;
    center.x=Math.max(radius+24,Math.min(width-radius-24,center.x));
    center.y=Math.max(radius+24,Math.min(height-radius-24,center.y));
    cluster.forEach((point,i)=>{
      const angle=-Math.PI/2+i*Math.PI*2/cluster.length;
      result.push({...point,targetX:center.x+Math.cos(angle)*radius,targetY:center.y+Math.sin(angle)*radius});
    });
  }
  return result;
}
