import React, { useEffect, useRef, useState } from 'react';

interface CustomCursorProps {
  color?: string;
  ringColor?: string;
  dotSize?: number;
  ringSize?: number;
  hoverScale?: number;
}

/**
 * CustomCursor — React Bits Inspired Ring-and-Dot Cursor Component
 * Features a seamless outer tracking ring and pinpoint center dot.
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
        ringRef.current.style.borderColor = isHoveringRef.current ? '#f0a970' : ringColor;
        ringRef.current.style.backgroundColor = isHoveringRef.current ? 'rgba(240, 169, 112, 0.08)' : 'transparent';
        ringRef.current.style.boxShadow = isHoveringRef.current ? '0 0 14px rgba(240, 169, 112, 0.45)' : 'none';
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
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* Outer fluid ring */}
      <div
        ref={ringRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: ringSize,
          height: ringSize,
          marginTop: -ringSize / 2,
          marginLeft: -ringSize / 2,
          borderRadius: '50%',
          border: `1.5px solid ${ringColor}`,
          backgroundColor: 'transparent',
          transition: 'border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease',
          willChange: 'transform',
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
