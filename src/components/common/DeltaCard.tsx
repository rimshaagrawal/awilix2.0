import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DeltaCardProps {
  label: string;
  reference: number;
  custom: number;
  icon: LucideIcon;
  unit?: '%' | 'h';
  higherIsBetter?: boolean;
}

export const DeltaCard: React.FC<DeltaCardProps> = ({
  label,
  reference,
  custom,
  icon: Icon,
  unit = '%',
  higherIsBetter = true,
}) => {
  const delta = Number.isFinite(custom) && Number.isFinite(reference) ? custom - reference : null;
  const improved = delta == null ? false : higherIsBetter ? delta >= 0 : delta <= 0;
  const deltaLabel = unit === '%' ? 'pp' : 'h';
  const format = (value: number) => Number.isFinite(value) ? value.toFixed(1) : '—';
  return (
    <div className="delta-card">
      <div className="delta-card-head">
        <span>{label}</span>
        <Icon size={14} />
      </div>
      <div className="delta-values">
        <strong>{format(custom)}{unit}</strong>
        <span className={improved ? 'delta-positive' : 'delta-negative'}>
          {delta == null ? null : delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {delta == null ? 'unknown' : `${format(Math.abs(delta))} ${deltaLabel}`}
        </span>
      </div>
      {unit === '%' && <div className="delta-track">
        <i style={{ width: `${Math.max(0, Math.min(100, reference))}%` }} />
        <b style={{ width: `${Math.max(0, Math.min(100, custom))}%` }} />
      </div>}
      <small>
        reference {format(reference)}{unit} · custom {format(custom)}{unit}
      </small>
    </div>
  );
};

export default DeltaCard;

