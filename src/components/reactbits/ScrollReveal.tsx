import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface ScrollRevealProps {
  children: string;
  className?: string;
  blurStrength?: number;
  stagger?: number;
  duration?: number;
  scrollStart?: string;
  scrollEnd?: string;
}

/**
 * ScrollReveal — Official React Bits Text Animation Component
 * Reveals words dynamically with unblur and opacity transitions linked to scroll position.
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  blurStrength = 4,
  stagger = 0.05,
  duration = 0.6,
  scrollStart = 'top 85%',
  scrollEnd = 'bottom 60%',
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const words = children.split(' ');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const wordSpans = el.querySelectorAll('.scroll-reveal-word');

    const ctx = gsap.context(() => {
      gsap.fromTo(
        wordSpans,
        {
          opacity: 0.15,
          filter: `blur(${blurStrength}px)`,
          y: 4,
        },
        {
          opacity: 1,
          filter: 'blur(0px)',
          y: 0,
          stagger,
          duration,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: scrollStart,
            end: scrollEnd,
            toggleActions: 'play none none none',
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [children, blurStrength, stagger, duration, scrollStart, scrollEnd]);

  return (
    <span ref={containerRef} className={`scroll-reveal-container ${className}`} style={{ display: 'inline' }}>
      {words.map((word, i) => (
        <span
          key={i}
          className="scroll-reveal-word"
          style={{
            display: 'inline-block',
            marginRight: '0.28em',
            willChange: 'opacity, filter, transform',
          }}
        >
          {word}
        </span>
      ))}
    </span>
  );
};

export default ScrollReveal;

