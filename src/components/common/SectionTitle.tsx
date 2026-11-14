import React, { type ReactNode } from 'react';
import { ScrollReveal } from '@/components/reactbits/ScrollReveal';
import { ScrollFloat } from '@/components/reactbits/ScrollFloat';

interface SectionTitleProps {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  animateTitle?: boolean;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  eyebrow,
  title,
  description,
  action,
  animateTitle = false,
}) => {
  return (
    <div className="section-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        {animateTitle ? (
          <h2>
            <ScrollFloat distance={14} rotation={3}>{title}</ScrollFloat>
          </h2>
        ) : (
          <h2>{title}</h2>
        )}
        {description && (
          <p>
            <ScrollReveal blurStrength={3} stagger={0.03}>
              {description}
            </ScrollReveal>
          </p>
        )}
      </div>
      {action}
    </div>
  );
};

export default SectionTitle;
