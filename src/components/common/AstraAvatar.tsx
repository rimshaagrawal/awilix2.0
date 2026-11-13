import React from 'react';

interface AstraAvatarProps {
  compact?: boolean;
  pose?: 'idle' | 'waving' | 'pointing' | 'thinking' | 'celebrating' | 'puzzled';
  size?: number;
}

export const AstraAvatar: React.FC<AstraAvatarProps> = ({
  compact = false,
  pose = 'idle',
  size,
}) => {
  const pixelSize = size ?? (compact ? 52 : 110);

  return (
    <div
      className={`astra-sprite-wrap ${compact ? 'astra-sprite-compact' : ''}`}
      style={{
        width: pixelSize,
        height: pixelSize,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <span
        className={`astra-sprite astra-sprite-${pose}`}
        style={{
          width: pixelSize,
          height: pixelSize,
          backgroundImage: "url('/mascot/astra-sprites.png')",
          backgroundSize: '300% 200%',
          backgroundRepeat: 'no-repeat',
          display: 'block',
        }}
      />
    </div>
  );
};

export default AstraAvatar;
