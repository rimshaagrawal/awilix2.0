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
 * Provides a fluid outer ring and inner dot with hover-scaling on interactive elements.
 * Automatically disables on mobile / touch devices (pointer: coarse) and respects prefers-reduced-motion.
 */
export const CustomCursor: React.FC<CustomCursorProps> = ({
  color = '#f0a970',
  ringColor = 'rgba(145, 198, 212, 0.45)',
  dotSize = 6,
  ringSize = 32,
  hoverScale = 1.6,
}) => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Check for touch / mobile device or reduced motion
    const touchQuery = window.matchMedia('(pointer: coarse)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (touchQuery.matches || motionQuery.matches) {
      setIsTouchDevice(true);
      return;
    }

    const mouse = { x: -100, y: -100 };
    const ring = { x: -100, y: -100 };
    let animId: number;

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      if (!visible) setVisible(true);

      // Check if hovering over an interactive element
      const target = e.target as HTMLElement | null;
      if (target) {
        const isInteractive = Boolean(
          target.closest('button, a, input, select, textarea, [role="button"], .clickable, .site-card, .nav-item, .icon-button, .large-globe-panel')
        );
        setIsHovering(isInteractive);
      }
    };

    const onMouseLeave = () => {
      setVisible(false);
    };

    const onMouseEnter = () => {
      setVisible(true);
    };

    // Smooth lerp loop for the lagging ring
    const render = () => {
      const ease = 0.18;
      ring.x += (mouse.x - ring.x) * ease;
      ring.y += (mouse.y - ring.y) * ease;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
      }

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) scale(${isHovering ? hoverScale : 1})`;
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
  }, [visible, isHovering, hoverScale]);

  if (isTouchDevice) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 99999,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s ease',
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
          border: `1.5px solid ${isHovering ? '#f0a970' : ringColor}`,
          backgroundColor: isHovering ? 'rgba(240, 169, 112, 0.08)' : 'transparent',
          boxShadow: isHovering ? '0 0 14px rgba(240, 169, 112, 0.45)' : 'none',
          transition: 'border-color 0.2s, background-color 0.2s, box-shadow 0.2s',
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
          backgroundColor: isHovering ? '#f0a970' : color,
          boxShadow: `0 0 6px ${color}`,
          willChange: 'transform',
        }}
      />
    </div>
  );
};

export default CustomCursor;

