import React from 'react';
import type { Sample } from '@/types';
import { buildPath, buildArea } from '@/lib/scenarioCalculations';

interface SparklineProps {
  samples: Sample[];
  dataKey: keyof Pick<Sample, 'sun' | 'earth' | 'power'>;
  color?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  samples,
  dataKey,
  color = '#65d5d0',
}) => {
  return (
    <svg
      className="sparkline"
      viewBox="0 0 720 210"
      role="img"
      aria-label={`${dataKey} over time`}
    >
      <path d={buildArea(samples, dataKey)} fill={`${color}18`} />
      <path
        d={buildPath(samples, dataKey)}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {samples.map((sample, index) => (
        <circle
          key={`${sample.label}-${dataKey}`}
          cx={(index / (samples.length - 1)) * 720}
          cy={210 - (sample[dataKey] / 100) * 186 - 12}
          r="3"
          fill={color}
        />
      ))}
    </svg>
  );
};

export default Sparkline;

