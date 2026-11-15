import React from 'react';
import { WakeSlider } from '@/components/reactbits/WakeSlider';

interface RangeControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

export const RangeControl: React.FC<RangeControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}) => {
  return (
    <label className="range-control">
      <span>
        {label}
        <b>
          {value}
          {unit}
        </b>
      </span>
      <WakeSlider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        ariaLabel={label}
        bars={32}
        height={40}
        restHeight={8}
        gap={4}
        fillColor="#5ec4be"
        trackColor="rgba(238, 240, 245, 0.10)"
        crestColor="#eac18b"
        showValue={false}
      />
    </label>
  );
};

export default RangeControl;
