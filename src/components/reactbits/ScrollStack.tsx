import React, { useRef } from 'react';

interface ScrollStackProps {
  children: React.ReactNode[];
  className?: string;
  topOffset?: number; // Base offset in px from top when card sticks
  stackSpacing?: number; // Incremental spacing per stacked card
  scaleDecay?: number; // Scaling decay per stacked card
}

/**
 * ScrollStack — React Bits Card Stacking Scroll Component
 * Cards stack and lock cleanly onto one another as the user scrolls,
 * creating an layered mission dossier effect.
 */
export const ScrollStack: React.FC<ScrollStackProps> = ({
  children,
  className = '',
  topOffset = 24,
  stackSpacing = 16,
  scaleDecay = 0.02,
}) => {
  const count = React.Children.count(children);

  return (
    <div
      className={`scroll-stack-container ${className}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        width: '100%',
        paddingBottom: '40px',
      }}
    >
      {React.Children.map(children, (child, index) => {
        const stickyTop = topOffset + index * stackSpacing;

        return (
          <div
            key={index}
            className="scroll-stack-card-wrapper"
            style={{
              position: 'sticky',
              top: `${stickyTop}px`,
              zIndex: index + 1,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              marginBottom: index === count - 1 ? '0' : '8px',
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
};

export default ScrollStack;

