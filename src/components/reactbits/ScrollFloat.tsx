import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface ScrollFloatProps {
  children: string;
  className?: string;
  scrollStart?: string;
  scrollEnd?: string;
  distance?: number;
  rotation?: number;
  stagger?: number;
}

/**
 * ScrollFloat — Official React Bits Text Animation Component
 * Glides individual letters and words into position with floating parallax physics on scroll.
 */
export const ScrollFloat: React.FC<ScrollFloatProps> = ({
  children,
  className = '',
  scrollStart = 'top 90%',
  scrollEnd = 'bottom 50%',
  distance = 30,
  rotation = 6,
  stagger = 0.02,
}) => {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const words = children.split(' ');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const chars = el.querySelectorAll('.scroll-float-char');

    const ctx = gsap.context(() => {
      gsap.fromTo(
        chars,
        {
          y: distance,
          rotate: rotation,
          opacity: 0,
        },
        {
          y: 0,
          rotate: 0,
          opacity: 1,
          stagger,
          duration: 0.8,
          ease: 'back.out(1.5)',
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
  }, [children, distance, rotation, stagger, scrollStart, scrollEnd]);

  return (
    <span ref={containerRef} className={`scroll-float-container ${className}`} style={{ display: 'inline-block' }}>
      {words.map((word, wordIdx) => (
        <span key={wordIdx} style={{ display: 'inline-block', whiteSpace: 'nowrap', marginRight: '0.3em' }}>
          {word.split('').map((char, charIdx) => (
            <span
              key={charIdx}
              className="scroll-float-char"
              style={{
                display: 'inline-block',
                willChange: 'transform, opacity',
              }}
            >
              {char}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
};

export default ScrollFloat;

