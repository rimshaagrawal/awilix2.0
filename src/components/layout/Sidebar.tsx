import React, { useState } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import type { View } from '@/types';
import { NAVIGATION_ITEMS } from '@/lib/scenarioCalculations';
import { LineSidebar, type LineSidebarItem } from '@/components/reactbits/LineSidebar';
import { StaggeredMenu, type StaggeredMenuItem } from '@/components/reactbits/StaggeredMenu';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const lineItems: LineSidebarItem[] = NAVIGATION_ITEMS.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    active: activeView === item.id,
  }));

  const staggeredItems: StaggeredMenuItem[] = NAVIGATION_ITEMS.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    active: activeView === item.id,
  }));

  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        <div className="brand">
          <div className="brand-mark" style={{ overflow: 'hidden', padding: 2, background: '#0a0f1c' }}>
            <img src="/awilix-logo.png" alt="Awilix — lunar mission browser" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', borderRadius: 'inherit' }} />
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

        {/* ── React Bits Line Sidebar (Cursor-Proximity & Active Indicator) ── */}
        <nav className="main-nav" aria-label="Primary navigation" style={{ padding: '4px 0' }}>
          <LineSidebar
            items={lineItems}
            activeId={activeView}
            collapsed={!sidebarOpen}
            onSelect={(id) => onNavigate(id as View)}
          />
        </nav>

        <button
          className="sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
        >
          {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
        </button>
      </aside>

      {/* ── React Bits Staggered Menu Drawer for Mobile / Compact Navigation ── */}
      <StaggeredMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        items={staggeredItems}
        activeId={activeView}
        onSelect={(id) => onNavigate(id as View)}
        colors={['#0c192c', '#060a14']}
        position="left"
        title="LUNAR MISSION CONTROL"
      />
    </>
  );
};

export default Sidebar;
