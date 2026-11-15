import React, { useEffect, useRef, useState } from 'react';

interface CustomCursorProps {
  color?: string;
  ringColor?: string;
  dotSize?: number;
  ringSize?: number;
  hoverScale?: number;
  hidden?: boolean;
}

/**
 * CustomCursor — React Bits Inspired Ring-and-Dot Cursor Component
 * Features a seamless outer tracking ring (rendered as a translucent moon disc
 * using the bundled LROC texture) and a pinpoint center dot.
 * Positions are stored in persistent refs so the ring never resets or flies in
 * abruptly from the screen edge when hovering over interactive cards.
 * Automatically disabled on mobile/touch devices (pointer: coarse) and reduced motion.
 */
export const CustomCursor: React.FC<CustomCursorProps> = ({
  color = '#f0a970',
  ringColor = 'rgba(145, 198, 212, 0.45)',
  dotSize = 6,
  ringSize = 32,
  hoverScale = 1.5,
  hidden = false,
}) => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Persistent coordinates across all renders and state updates
  const mousePos = useRef({ x: -200, y: -200 });
  const ringPos = useRef({ x: -200, y: -200 });
  const isHoveringRef = useRef(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hidden) {
      setVisible(false);
    } else {
      setVisible(true);
    }
  }, [hidden]);

  useEffect(() => {
    // Check for touch / mobile device or reduced motion
    const touchQuery = window.matchMedia('(pointer: coarse)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (touchQuery.matches || motionQuery.matches) {
      setIsTouchDevice(true);
      return;
    }

    let animId: number;

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;

      // On the very first mouse movement, snap ring directly to cursor
      // to eliminate any abrupt fly-in from the screen side
      if (!hasInitialized.current) {
        ringPos.current.x = e.clientX;
        ringPos.current.y = e.clientY;
        hasInitialized.current = true;
        setVisible(true);
      }

      // Check if hovering over an interactive element
      const target = e.target as HTMLElement | null;
      if (target) {
        const isInteractive = Boolean(
          target.closest(
            'button, a, input, select, textarea, [role="button"], .clickable, .site-card, .nav-item, .icon-button, .large-globe-panel, .shortlist-row'
          )
        );
        isHoveringRef.current = isInteractive;
      }
    };

    const onMouseLeave = () => {
      setVisible(false);
    };

    const onMouseEnter = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
      if (!hasInitialized.current) {
        ringPos.current.x = e.clientX;
        ringPos.current.y = e.clientY;
        hasInitialized.current = true;
      }
      setVisible(true);
    };

    // Continuous smooth lerp loop
    const render = () => {
      const ease = 0.2;
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * ease;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * ease;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0)`;
      }

      if (ringRef.current) {
        const scale = isHoveringRef.current ? hoverScale : 1;
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) scale(${scale})`;
        ringRef.current.style.opacity = isHoveringRef.current ? '0.95' : '0.7';
        ringRef.current.style.boxShadow = isHoveringRef.current
          ? '0 0 18px rgba(240, 169, 112, 0.45), inset -7px -7px 14px rgba(0,0,0,0.55), inset 4px 4px 10px rgba(255,255,255,0.15)'
          : '0 0 10px rgba(0,0,0,0.5), inset -7px -7px 14px rgba(0,0,0,0.6), inset 4px 4px 10px rgba(255,255,255,0.12)';
      }

      animId = requestAnimationFrame(render);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);
    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      cancelAnimationFrame(animId);
    };
  }, [ringColor, hoverScale]);

  if (isTouchDevice) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 99999,
        opacity: hidden || !visible ? 0 : 1,
        visibility: hidden ? 'hidden' : 'visible',
        transition: 'opacity 0.2s ease',
      }}
    >
      <style>{`@keyframes awilixMoonDrift { from { background-position: 0% 45%; } to { background-position: 100% 45%; } }`}</style>

      {/* Outer fluid moon disc (translucent lunar surface) */}
      <div
        ref={ringRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: ringSize,
          height: ringSize,
          marginTop: -ringSize / 2,
          marginLeft: -ringSize / 2,
          borderRadius: '50%',
          backgroundImage: 'url(/textures/lroc_color_2k.jpg)',
          backgroundSize: '300% 300%',
          backgroundPosition: 'center 38%',
          backgroundRepeat: 'no-repeat',
          opacity: 0.7,
          border: '1px solid rgba(238, 240, 245, 0.18)',
          // Soft limb fades the edges so the disc feels like a translucent moon
          WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,0.95) 55%, rgba(0,0,0,0.6) 78%, transparent 100%)',
          maskImage: 'radial-gradient(circle, rgba(0,0,0,0.95) 55%, rgba(0,0,0,0.6) 78%, transparent 100%)',
          boxShadow: '0 0 10px rgba(0,0,0,0.5), inset -7px -7px 14px rgba(0,0,0,0.6), inset 4px 4px 10px rgba(255,255,255,0.12)',
          transition: 'opacity 0.15s ease, box-shadow 0.15s ease',
          willChange: 'transform',
          animation: 'awilixMoonDrift 48s linear infinite alternate',
        }}
      />

      {/* Center pinpoint dot */}
      <div
        ref={dotRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: dotSize,
          height: dotSize,
          marginTop: -dotSize / 2,
          marginLeft: -dotSize / 2,
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}`,
          willChange: 'transform',
        }}
      />
    </div>
  );
};

export default CustomCursor;
