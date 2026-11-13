import React, { useState, useEffect } from 'react';
import { Menu, ChevronDown, Clock3, Bell } from 'lucide-react';
import type { View } from '@/types';
import { NAVIGATION_ITEMS } from '@/lib/scenarioCalculations';

interface TopbarProps {
  activeView: View;
  onToggleSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ activeView, onToggleSidebar }) => {
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${hours}:${minutes}:${seconds}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentLabel = NAVIGATION_ITEMS.find((item) => item.id === activeView)?.label ?? 'Mission';

  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onToggleSidebar} aria-label="Toggle navigation menu">
        <Menu size={20} />
      </button>

      <div className="breadcrumb">
        <span>AWILIX</span>
        <ChevronDown size={13} />
        <b>{currentLabel}</b>
      </div>

      <div className="topbar-actions">
        <div className="utc-clock">
          <Clock3 size={14} />
          <span>UTC</span>
          <strong>{utcTime || '14:32:07'}</strong>
        </div>

        <button className="icon-button" aria-label="Notifications">
          <Bell size={17} />
          <i />
        </button>

        <div className="operator">
          <div className="operator-avatar">RC</div>
          <div>
            <strong>R. Calder</strong>
            <span>Flight dynamics</span>
          </div>
          <ChevronDown size={14} />
        </div>
      </div>
    </header>
  );
};

export default Topbar;

