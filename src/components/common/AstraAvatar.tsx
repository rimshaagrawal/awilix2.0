import React from 'react';

interface AstraAvatarProps {
  compact?: boolean;
}

export const AstraAvatar: React.FC<AstraAvatarProps> = ({ compact = false }) => {
  return (
    <div
      className={`astra-avatar ${compact ? 'astra-avatar-compact' : ''}`}
      aria-hidden="true"
    >
      <div className="astra-aura" />
      <div className="astra-helmet">
        <div className="astra-visor">
          <i />
          <i />
        </div>
        <span className="astra-ear left" />
        <span className="astra-ear right" />
      </div>
      <div className="astra-body">
        <span className="astra-chest">A</span>
        <span className="astra-arm left" />
        <span className="astra-arm right" />
      </div>
    </div>
  );
};

export default AstraAvatar;

