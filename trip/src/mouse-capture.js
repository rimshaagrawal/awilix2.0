// Request while handling the entry click: browsers require a user gesture.
export function createMouseCapture(element, doc = document) {
  let enabled = false, wanted = false, pending = false;
  const locked = () => doc.pointerLockElement === element;
  function release() {
    wanted = false;
    if (locked()) doc.exitPointerLock();
  }
  function capture() {
    if (!enabled || locked() || pending || !element.requestPointerLock) return;
    wanted = true;
    pending = true;
    try {
      const result = element.requestPointerLock();
      // Also supports browsers whose implementation returns void.
      if (result?.then) result.then(() => {
        pending = false;
        if (!enabled || !wanted) release();
      }).catch(() => { pending = false; wanted = false; });
    } catch {
      pending = false;
      wanted = false;
    }
  }
  doc.addEventListener('pointerlockchange', () => {
    pending = false;
    if (locked()) {
      if (!enabled || !wanted) release();
    } else wanted = false;
  });
  doc.addEventListener('pointerlockerror', () => { pending = false; wanted = false; });
  return {
    locked,
    begin() { enabled = true; capture(); },
    capture,
    release,
    toggle() { if (locked() || pending) release(); else capture(); },
    end() { enabled = false; release(); },
  };
}
