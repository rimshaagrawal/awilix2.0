import React, { useEffect, useState } from 'react';

// Anchors that live on a parent element.
const ALIASES: Record<string, string> = { 'terrain-hour': 'terrain-timeline' };

interface AstraHighlightProps {
  anchor: string | null;
  label?: string;
  nonce: number; // bump to re-trigger the same anchor
  onMissing?: (anchor: string) => void;
}

/**
 * Draws a non-interactive ring around `[data-astra="<anchor>"]`.
 * Never traps focus or blocks clicks; respects reduced motion.
 */
export const AstraHighlight: React.FC<AstraHighlightProps> = ({ anchor, label, nonce, onMissing }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setRect(null);
    if (!anchor) return;
    const selector = `[data-astra="${ALIASES[anchor] ?? anchor}"]`;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let el: HTMLElement | null = null;
    let frame = 0, tries = 0, scrolled = false;
    const started = performance.now();

    const tick = () => {
      if (!el || !document.contains(el)) el = document.querySelector<HTMLElement>(selector);
      if (el) {
        if (!scrolled) { el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); scrolled = true; }
        const r = el.getBoundingClientRect();
        setRect(r.width && r.height ? r : null);
      } else if (++tries > 120) { // ~2 s for a view to render
        onMissing?.(anchor);
        return;
      }
      if (performance.now() - started < 7000) frame = requestAnimationFrame(tick);
      else setRect(null);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [anchor, nonce]);

  if (!rect) return null;
  const pad = 6;
  return (
    <div
      className="astra-highlight"
      aria-hidden="true"
      style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
    >
      {label && <span className="astra-highlight-label">{label}</span>}
    </div>
  );
};

export default AstraHighlight;
