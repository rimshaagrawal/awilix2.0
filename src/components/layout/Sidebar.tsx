import React from 'react';
import {
  Moon,
  ShieldCheck,
  Database,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import type { View } from '@/types';
import { NAVIGATION_ITEMS } from '@/lib/scenarioCalculations';

interface SidebarProps {
  activeView: View;
  sidebarOpen: boolean;
  onNavigate: (view: View) => void;
  onToggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  sidebarOpen,
  onNavigate,
  onToggleSidebar,
}) => {
  return (
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      <div className="brand">
        <div className="brand-mark">
          <Moon size={16} />
        </div>
        {sidebarOpen && (
          <div>
            <strong>Awilix</strong>
            <span>Lunar mission browser</span>
          </div>
        )}
      </div>

      <div className="sidebar-status">
        <span className="status-dot" />
        {sidebarOpen && (
          <>
            <span>Mission control</span>
            <b>Live</b>
          </>
        )}
      </div>

      <nav className="main-nav" aria-label="Primary navigation">
        {NAVIGATION_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${activeView === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
            title={!sidebarOpen ? label : undefined}
          >
            <Icon size={16} />
            <span>{label}</span>
            {activeView === id && <i />}
          </button>
        ))}
      </nav>

      {sidebarOpen && (
        <div className="sidebar-bottom">
          <div className="data-health">
            <div className="health-head">
              <span>Telemetry health</span>
              <ShieldCheck size={14} />
            </div>
            <strong>98.4%</strong>
            <div className="health-bar">
              <span />
            </div>
            <small>Precomputed ephemeris ready</small>
          </div>
          <button className="sidebar-source" onClick={() => onNavigate('overview')}>
            <Database size={14} />
            <span>Sources and methodology</span>
            <ExternalLink size={12} />
          </button>
        </div>
      )}

      <button
        className="sidebar-toggle"
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
      >
        {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
      </button>
    </aside>
  );
};

export default Sidebar;
