import React, { useEffect, useRef, useState } from 'react';

interface CrosshairProps {
  containerRef?: React.RefObject<HTMLElement | null>;
  color?: string;
  thickness?: number;
  lineStyle?: 'solid' | 'dashed';
  smoothing?: number;
  clickPulse?: boolean;
  showCoordinates?: boolean;
}

/**
 * Crosshair — Official React Bits Crosshair Cursor Component
 * Specialized high-precision reticle that renders inside a designated container
 * (such as the 3D Lunar Visualization), showing coordinate tracking lines, click ripple pulses,
 * and live telemetry coordinates.
 */
export const Crosshair: React.FC<CrosshairProps> = ({
  containerRef,
  color = '#91c6d4',
  thickness = 1,
  lineStyle = 'dashed',
  smoothing = 0.25,
  clickPulse = true,
  showCoordinates = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInside, setIsInside] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    // Disable on touch devices
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const target = { x: -100, y: -100 };
    const current = { x: -100, y: -100 };
    const pulses: { x: number; y: number; radius: number; opacity: number }[] = [];

    const handleResize = () => {
      const container = containerRef?.current || canvas.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const container = containerRef?.current || canvas.parentElement;
    if (!container) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        target.x = x;
        target.y = y;
        setIsInside(true);
        setCoords({ x: Math.round(x), y: Math.round(y) });
      } else {
        setIsInside(false);
      }
    };

    const onMouseLeave = () => {
      setIsInside(false);
    };

    const onClick = (e: MouseEvent) => {
      if (!clickPulse) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      pulses.push({ x, y, radius: 4, opacity: 1 });
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('click', onClick);

    const render = () => {
      const rect = container.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      if (isInside || pulses.length > 0) {
        // Interpolate position
        current.x += (target.x - current.x) * (1 - smoothing);
        current.y += (target.y - current.y) * (1 - smoothing);

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.setLineDash(lineStyle === 'dashed' ? [4, 4] : []);
        ctx.globalAlpha = isInside ? 0.45 : 0;

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(0, current.y);
        ctx.lineTo(rect.width, current.y);
        ctx.stroke();

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(current.x, 0);
        ctx.lineTo(current.x, rect.height);
        ctx.stroke();

        ctx.restore();

        // Target center bracket
        if (isInside) {
          ctx.save();
          ctx.strokeStyle = '#f0a970';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          const s = 8;
          ctx.beginPath();
          // Corner marks
          ctx.moveTo(current.x - s, current.y - s / 2);
          ctx.lineTo(current.x - s, current.y - s);
          ctx.lineTo(current.x - s / 2, current.y - s);

          ctx.moveTo(current.x + s, current.y - s / 2);
          ctx.lineTo(current.x + s, current.y - s);
          ctx.lineTo(current.x + s / 2, current.y - s);

          ctx.moveTo(current.x - s, current.y + s / 2);
          ctx.lineTo(current.x - s, current.y + s);
          ctx.lineTo(current.x - s / 2, current.y + s);

          ctx.moveTo(current.x + s, current.y + s / 2);
          ctx.lineTo(current.x + s, current.y + s);
          ctx.lineTo(current.x + s / 2, current.y + s);
          ctx.stroke();

          // Coordinate label
          if (showCoordinates) {
            ctx.font = "9px 'DM Mono', monospace";
            ctx.fillStyle = 'rgba(145, 198, 212, 0.85)';
            ctx.fillText(
              `PX:${Math.round(current.x)} PY:${Math.round(current.y)}`,
              current.x + 12,
              current.y - 12
            );
          }
          ctx.restore();
        }

        // Click ripple pulses
        for (let i = pulses.length - 1; i >= 0; i--) {
          const p = pulses[i];
          p.radius += 2.2;
          p.opacity -= 0.035;

          if (p.opacity <= 0) {
            pulses.splice(i, 1);
          } else {
            ctx.save();
            ctx.strokeStyle = '#f0a970';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = p.opacity;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('click', onClick);
      cancelAnimationFrame(animId);
    };
  }, [containerRef, color, thickness, lineStyle, smoothing, clickPulse, showCoordinates, isInside]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 15,
      }}
    />
  );
};

export default Crosshair;

