import React, { type ReactNode } from 'react';

interface SectionTitleProps {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  eyebrow,
  title,
  description,
  action,
}) => {
  return (
    <div className="section-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
};

export default SectionTitle;

