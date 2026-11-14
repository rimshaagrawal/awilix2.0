import React, { useRef, useState, useEffect } from 'react';

export interface LineSidebarItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
  onClick?: () => void;
  active?: boolean;
}

interface LineSidebarProps {
  items: LineSidebarItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  className?: string;
  collapsed?: boolean;
  proximityThreshold?: number; // Distance in px to trigger proximity effect
}

/**
 * LineSidebar — Official React Bits Navigation Component
 * Features a cursor-proximity effect that smoothly highlights and offsets items
 * as the pointer moves across the navigation stack.
 */
export const LineSidebar: React.FC<LineSidebarProps> = ({
  items,
  activeId,
  onSelect,
  className = '',
  collapsed = false,
  proximityThreshold = 120,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(media.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || collapsed) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  return (
    <div
      ref={containerRef}
      className={`line-sidebar-container ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        position: 'relative',
        width: '100%',
      }}
    >
      {items.map((item, index) => {
        const itemRef = useRef<HTMLButtonElement>(null);
        const isActive = activeId ? activeId === item.id : item.active;

        // Calculate proximity shift
        let proximityScale = 1;
        let proximityX = 0;
        let proximityGlow = 0;

        if (mousePos && itemRef.current && !prefersReducedMotion && !collapsed) {
          const itemRect = itemRef.current.getBoundingClientRect();
          const containerRect = containerRef.current?.getBoundingClientRect();
          if (containerRect) {
            const itemCenterY = itemRect.top - containerRect.top + itemRect.height / 2;
            const dist = Math.abs(mousePos.y - itemCenterY);

            if (dist < proximityThreshold) {
              const factor = Math.cos((dist / proximityThreshold) * (Math.PI / 2));
              proximityScale = 1 + factor * 0.035;
              proximityX = factor * 5;
              proximityGlow = factor * 0.4;
            }
          }
        }

        const Icon = item.icon;

        return (
          <button
            key={item.id}
            ref={itemRef}
            onClick={() => {
              item.onClick?.();
              onSelect?.(item.id);
            }}
            className={`line-sidebar-item ${isActive ? 'active' : ''}`}
            title={collapsed ? item.label : undefined}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: collapsed ? '10px' : '9px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: isActive
                ? 'rgba(145, 198, 212, 0.12)'
                : proximityGlow > 0
                ? `rgba(255, 255, 255, ${0.03 + proximityGlow * 0.05})`
                : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: isActive ? '#f0ebe1' : proximityGlow > 0 ? '#d4e2ea' : '#8899a6',
              cursor: 'pointer',
              fontFamily: "'DM Mono', monospace",
              fontSize: '12.5px',
              textAlign: 'left',
              width: '100%',
              transform: `translateX(${proximityX}px) scale(${proximityScale})`,
              transition: prefersReducedMotion
                ? 'none'
                : 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.2s, color 0.2s',
              zIndex: isActive ? 2 : 1,
            }}
          >
            {/* Active Accent Marker Line */}
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '18%',
                  bottom: '18%',
                  width: '3px',
                  backgroundColor: '#f0a970',
                  borderRadius: '0 3px 3px 0',
                  boxShadow: '0 0 10px rgba(240, 169, 112, 0.65)',
                }}
              />
            )}

            {/* Proximity Tick */}
            {!isActive && proximityGlow > 0 && !collapsed && (
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '30%',
                  bottom: '30%',
                  width: '2px',
                  backgroundColor: `rgba(145, 198, 212, ${proximityGlow})`,
                  borderRadius: '0 2px 2px 0',
                }}
              />
            )}

            {Icon && (
              <Icon
                size={16}
                className={isActive ? 'text-[#f0a970]' : ''}
              />
            )}

            {!collapsed && (
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.label}
              </span>
            )}

            {!collapsed && item.badge && (
              <span
                style={{
                  fontSize: '9px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#8899a6',
                }}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default LineSidebar;

