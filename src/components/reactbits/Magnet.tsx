import React, { useState, useRef, useEffect } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

interface MagnetProps {
  children: React.ReactNode;
  padding?: number;
  magnetStrength?: number;
  spring?: { stiffness?: number; damping?: number; mass?: number };
  disabled?: boolean;
  axis?: 'both' | 'x' | 'y';
  maxOffset?: number;
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Magnet — Official React Bits Hover Effect Component
 * Magnetically pulls elements toward the cursor when within proximity range,
 * settling back with fluid spring physics.
 */
export const Magnet: React.FC<MagnetProps> = ({
  children,
  padding = 80,
  magnetStrength = 2.5,
  spring = { stiffness: 200, damping: 18, mass: 0.8 },
  disabled = false,
  axis = 'both',
  maxOffset = 25,
  scale = 1.03,
  className = '',
  style = {},
}) => {
  const [isActive, setIsActive] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isTouchOrReduced, setIsTouchOrReduced] = useState(false);

  useEffect(() => {
    if (
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setIsTouchOrReduced(true);
    }
  }, []);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, spring);
  const springY = useSpring(y, spring);

  if (isTouchOrReduced || disabled) {
    return (
      <div className={className} style={{ display: 'inline-block', ...style }}>
        {children}
      </div>
    );
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;

    const absDistanceX = Math.abs(distanceX);
    const absDistanceY = Math.abs(distanceY);

    if (
      absDistanceX < rect.width / 2 + padding &&
      absDistanceY < rect.height / 2 + padding
    ) {
      if (!isActive) setIsActive(true);

      let targetX = distanceX / magnetStrength;
      let targetY = distanceY / magnetStrength;

      if (maxOffset) {
        targetX = Math.max(-maxOffset, Math.min(maxOffset, targetX));
        targetY = Math.max(-maxOffset, Math.min(maxOffset, targetY));
      }

      if (axis === 'x' || axis === 'both') x.set(targetX);
      if (axis === 'y' || axis === 'both') y.set(targetY);
    } else {
      if (isActive) setIsActive(false);
      x.set(0);
      y.set(0);
    }
  };

  const handleMouseLeave = () => {
    if (isActive) setIsActive(false);
    x.set(0);
    y.set(0);
  };

  return (
    <div
      ref={wrapperRef}
      className={`magnet-wrapper ${className}`}
      style={{ position: 'relative', display: 'inline-block', ...style }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{
          x: springX,
          y: springY,
          scale: isActive ? scale : 1,
        }}
        transition={{ type: 'spring', ...spring }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default Magnet;

