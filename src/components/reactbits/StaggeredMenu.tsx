import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export interface StaggeredMenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  onClick?: () => void;
  active?: boolean;
}

interface StaggeredMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: StaggeredMenuItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  colors?: string[]; // Layer colors for underlay panels
  position?: 'left' | 'right';
  displayItemNumbering?: boolean;
  closeOnClickAway?: boolean;
  title?: string;
}

/**
 * StaggeredMenu — Official React Bits Navigation Drawer Component
 * Features layered underlay background animations and staggered entry/exit for menu items
 * powered by GreenSock (GSAP).
 */
export const StaggeredMenu: React.FC<StaggeredMenuProps> = ({
  isOpen,
  onClose,
  items,
  activeId,
  onSelect,
  colors = ['#0b1626', '#060a14'],
  position = 'left',
  displayItemNumbering = true,
  closeOnClickAway = true,
  title = 'MISSION NAVIGATION',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const layer1Ref = useRef<HTMLDivElement>(null);
  const layer2Ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [mounted, setMounted] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!mounted) return;

    const ctx = gsap.context(() => {
      const isLeft = position === 'left';
      const xOffset = isLeft ? -100 : 100;

      if (isOpen) {
        const tl = gsap.timeline();

        // 1. Underlay Layer 1
        tl.fromTo(
          layer1Ref.current,
          { xPercent: xOffset, opacity: 0 },
          { xPercent: 0, opacity: 0.95, duration: 0.35, ease: 'power3.out' }
        );

        // 2. Underlay Layer 2 (main panel)
        tl.fromTo(
          layer2Ref.current,
          { xPercent: xOffset, opacity: 0 },
          { xPercent: 0, opacity: 1, duration: 0.4, ease: 'power3.out' },
          '-=0.25'
        );

        // 3. Staggered navigation links
        tl.fromTo(
          itemsRef.current.filter(Boolean),
          { opacity: 0, x: isLeft ? -25 : 25 },
          { opacity: 1, x: 0, duration: 0.28, stagger: 0.045, ease: 'power2.out' },
          '-=0.2'
        );
      } else {
        const tl = gsap.timeline({
          onComplete: () => setMounted(false),
        });

        tl.to(itemsRef.current.filter(Boolean), {
          opacity: 0,
          x: position === 'left' ? -15 : 15,
          duration: 0.18,
          stagger: 0.02,
          ease: 'power2.in',
        });

        tl.to(
          layer2Ref.current,
          { xPercent: position === 'left' ? -100 : 100, duration: 0.25, ease: 'power3.in' },
          '-=0.1'
        );

        tl.to(
          layer1Ref.current,
          { xPercent: position === 'left' ? -100 : 100, duration: 0.22, ease: 'power3.in' },
          '-=0.15'
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [isOpen, mounted, position]);

  // Click-away listener
  useEffect(() => {
    if (!isOpen || !closeOnClickAway) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (layer2Ref.current && !layer2Ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeOnClickAway, onClose]);

  if (!mounted) return null;

  const isLeft = position === 'left';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
    >
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(2, 4, 8, 0.65)',
          backdropFilter: 'blur(6px)',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Staggered Underlay Layer 1 */}
      <div
        ref={layer1Ref}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          [isLeft ? 'left' : 'right']: 0,
          width: '320px',
          maxWidth: '85vw',
          backgroundColor: colors[0] || '#0b1626',
          borderRight: isLeft ? '1px solid rgba(145, 198, 212, 0.15)' : undefined,
          borderLeft: !isLeft ? '1px solid rgba(145, 198, 212, 0.15)' : undefined,
          zIndex: 1,
        }}
      />

      {/* Staggered Main Content Panel (Layer 2) */}
      <div
        ref={layer2Ref}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          [isLeft ? 'left' : 'right']: 0,
          width: '300px',
          maxWidth: '80vw',
          backgroundColor: colors[1] || '#060a14',
          borderRight: isLeft ? '1px solid #23333e' : undefined,
          borderLeft: !isLeft ? '1px solid #23333e' : undefined,
          boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 2,
          padding: '24px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: "'DM Mono', monospace",
              letterSpacing: '0.12em',
              color: '#f0a970',
              fontWeight: 600,
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #283946',
              borderRadius: '6px',
              color: '#8899a6',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: "'DM Mono', monospace",
            }}
          >
            ✕ ESC
          </button>
        </div>

        {/* Navigation list */}
        <div ref={contentRef} style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
          {items.map((item, idx) => {
            const isActive = activeId ? activeId === item.id : item.active;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                ref={(el) => (itemsRef.current[idx] = el)}
                onClick={() => {
                  item.onClick?.();
                  onSelect?.(item.id);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: isActive ? 'rgba(145, 198, 212, 0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(145, 198, 212, 0.3)' : '1px solid transparent',
                  color: isActive ? '#f0ebe1' : '#8899a6',
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s, color 0.2s, transform 0.2s',
                }}
              >
                {displayItemNumbering && (
                  <span
                    style={{
                      fontSize: '10px',
                      color: isActive ? '#f0a970' : '#455a64',
                      fontWeight: 600,
                      minWidth: '18px',
                    }}
                  >
                    0{idx + 1}
                  </span>
                )}
                {Icon && <Icon size={16} className={isActive ? 'text-[#f0a970]' : ''} />}
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#f0a970',
                      boxShadow: '0 0 8px #f0a970',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div style={{ paddingTop: '16px', borderTop: '1px solid #192531', fontSize: '11px', color: '#556a79', fontFamily: "'DM Mono', monospace" }}>
          <span>AWILIX 2.0 · NASA Space Apps</span>
        </div>
      </div>
    </div>
  );
};

export default StaggeredMenu;

