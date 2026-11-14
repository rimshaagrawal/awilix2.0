import React, { useRef, useState } from 'react';

interface GlareHoverProps {
  children: React.ReactNode;
  glareColor?: string;
  glareSize?: number;
  glareOpacity?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * GlareHover — Official React Bits Hover Effect Component
 * Sweeps a specular light sheen across the element following the pointer's movement,
 * creating an authentic lunar glass / visor reflection effect.
 */
export const GlareHover: React.FC<GlareHoverProps> = ({
  children,
  glareColor = 'rgba(145, 215, 235, 0.28)',
  glareSize = 280,
  glareOpacity = 0.45,
  className = '',
  style = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [glarePos, setGlarePos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setGlarePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setGlarePos(null);
  };

  return (
    <div
      ref={containerRef}
      className={`glare-hover-container ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'inherit',
        ...style,
      }}
    >
      {children}

      {/* Glare sheen overlay */}
      {glarePos && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${glareSize}px`,
            height: `${glareSize}px`,
            borderRadius: '50%',
            transform: `translate3d(${glarePos.x - glareSize / 2}px, ${glarePos.y - glareSize / 2}px, 0)`,
            background: `radial-gradient(circle, ${glareColor} 0%, rgba(255, 255, 255, 0) 70%)`,
            opacity: glareOpacity,
            pointerEvents: 'none',
            zIndex: 10,
            mixBlendMode: 'screen',
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
    </div>
  );
};

export default GlareHover;

