// Keep low orbit views available: protect the camera itself without lifting
// the entire sightline over every ridge or rock between it and the rover.
export function clearCameraPosition(position, sampleFloor, rocks, clearance=.45) {
  position.y=Math.max(position.y,sampleFloor(position.x,position.z)+clearance);
  // Repeat if clearing one rock puts the camera inside another stacked rock.
  let changed;
  do{
    changed=false;
    for(const box of rocks){
      if(position.x<box.min.x-clearance||position.x>box.max.x+clearance||
         position.z<box.min.z-clearance||position.z>box.max.z+clearance)continue;
      if(position.y>=box.min.y-clearance&&position.y<box.max.y+clearance){
        position.y=box.max.y+clearance;
        changed=true;
      }
    }
  }while(changed);
  return position;
}
