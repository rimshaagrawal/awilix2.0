import React from 'react';

interface MiniBarsProps {
  value: number;
  color: string;
}

export const MiniBars: React.FC<MiniBarsProps> = ({ value, color }) => {
  return (
    <div className="mini-bars" aria-label={`${value}%`}>
      <span style={{ width: `${value}%`, background: color }} />
      <b>{value}%</b>
    </div>
  );
};

export default MiniBars;

