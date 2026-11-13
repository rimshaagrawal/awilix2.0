import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DeltaCardProps {
  label: string;
  reference: number;
  custom: number;
  icon: LucideIcon;
}

export const DeltaCard: React.FC<DeltaCardProps> = ({
  label,
  reference,
  custom,
  icon: Icon,
}) => {
  const delta = custom - reference;
  return (
    <div className="delta-card">
      <div className="delta-card-head">
        <span>{label}</span>
        <Icon size={14} />
      </div>
      <div className="delta-values">
        <strong>{custom}%</strong>
        <span className={delta >= 0 ? 'delta-positive' : 'delta-negative'}>
          {delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(delta)} pts
        </span>
      </div>
      <div className="delta-track">
        <i style={{ width: `${reference}%` }} />
        <b style={{ width: `${custom}%` }} />
      </div>
      <small>
        reference {reference}% · custom {custom}%
      </small>
    </div>
  );
};

export default DeltaCard;

