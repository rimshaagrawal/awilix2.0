import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  tone: 'cyan' | 'amber' | 'blue' | 'green';
  detail: string;
  icon: LucideIcon;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  tone,
  detail,
  icon: Icon,
}) => {
  return (
    <div className={`metric-card metric-${tone}`}>
      <div className="metric-top">
        <span>{label}</span>
        <Icon size={15} />
      </div>
      <div className="metric-value">
        {value}
        {unit && <small>{unit}</small>}
      </div>
      <div className="metric-detail">{detail}</div>
    </div>
  );
};

export default MetricCard;

