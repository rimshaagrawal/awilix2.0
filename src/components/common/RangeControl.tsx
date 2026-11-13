import React from 'react';

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
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
};

export default RangeControl;

