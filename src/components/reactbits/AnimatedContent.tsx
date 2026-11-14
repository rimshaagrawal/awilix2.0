import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface AnimatedContentProps {
  children: React.ReactNode;
  distance?: number;
  direction?: 'vertical' | 'horizontal';
  reverse?: boolean;
  config?: { tension?: number; friction?: number };
  initialOpacity?: number;
  animateOpacity?: boolean;
  scale?: number;
  threshold?: number;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * AnimatedContent — Official React Bits Animation Component
 * Smoothly reveals section contents as they enter the viewport using spring physics.
 * Respects prefers-reduced-motion automatically.
 */
export const AnimatedContent: React.FC<AnimatedContentProps> = ({
  children,
  distance = 60,
  direction = 'vertical',
  reverse = false,
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  threshold = 0.15,
  delay = 0,
  className = '',
  style = {},
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: threshold });

  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const sign = reverse ? -1 : 1;
  const initialOffset = distance * sign;

  const initialTransform = prefersReducedMotion
    ? { opacity: initialOpacity }
    : {
        opacity: animateOpacity ? initialOpacity : 1,
        x: direction === 'horizontal' ? initialOffset : 0,
        y: direction === 'vertical' ? initialOffset : 0,
        scale: scale !== 1 ? scale : 1,
      };

  const animateTransform = {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
  };

  return (
    <div ref={ref} className={className} style={{ width: '100%', ...style }}>
      <motion.div
        initial={initialTransform}
        animate={isInView ? animateTransform : initialTransform}
        transition={{
          duration: prefersReducedMotion ? 0.01 : 0.65,
          delay: prefersReducedMotion ? 0 : delay / 1000,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default AnimatedContent;

