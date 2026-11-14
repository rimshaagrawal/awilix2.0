import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Check, Crosshair } from 'lucide-react';

export interface OptionWheelItem {
  id: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

export interface OptionWheelProps {
  options: OptionWheelItem[];
  selectedId: string;
  onChange: (id: string) => void;
  align?: 'left' | 'right';
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT; // 220px

/**
 * OptionWheel — React Bits 3D Cylindrical Option Wheel Component
 *
 * Implements a vertical 3D curved wheel selector with dynamic directional alignment:
 * - align='left': visual focus, curvature anchor, and selection markers aligned to the LEFT.
 * - align='right': visual focus, curvature anchor, and selection markers aligned to the RIGHT (mirrored).
 *
 * Features:
 * - Inertial wheel and touch/pointer drag interaction
 * - Direction-aware 3D cylinder perspective with subtle yaw & depth
 * - Lunar mission-control aesthetic: dark navy glassmorphism with subtle cyan/amber accents
 * - Full compatibility with AWILIX CustomCursor (.clickable & [role="button"])
 * - Reduced motion support (prefers-reduced-motion)
 */
export const OptionWheel: React.FC<OptionWheelProps> = ({
  options,
  selectedId,
  onChange,
  align = 'left',
  label,
  className = '',
  style = {},
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((opt) => opt.id === selectedId)
  );

  const [currentIndex, setCurrentIndex] = useState(selectedIndex);
  const targetIndexRef = useRef(selectedIndex);
  const currentIndexRef = useRef(selectedIndex);
  const animFrameRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const wheelViewportRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startIndexRef = useRef(0);

  // Sync internal index with external selectedId
  useEffect(() => {
    targetIndexRef.current = selectedIndex;
    setCurrentIndex(selectedIndex);
    currentIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  // Check reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Smooth lerp loop when rotating
  const startLerp = useCallback(() => {
    if (animFrameRef.current) return;

    const tick = () => {
      const diff = targetIndexRef.current - currentIndexRef.current;
      if (Math.abs(diff) > 0.002) {
        currentIndexRef.current += diff * 0.22;
        setCurrentIndex(currentIndexRef.current);
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        currentIndexRef.current = targetIndexRef.current;
        setCurrentIndex(targetIndexRef.current);
        animFrameRef.current = null;
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  // Snap to integer index when motion finishes
  const snapToClosest = useCallback(() => {
    const clamped = Math.max(0, Math.min(options.length - 1, Math.round(targetIndexRef.current)));
    targetIndexRef.current = clamped;
    startLerp();
  }, [options.length, startLerp]);

  // Wheel event listener with passive: false to prevent background scroll
  useEffect(() => {
    const viewport = wheelViewportRef.current;
    if (!isOpen || !viewport) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * 0.012;
      const next = Math.max(0, Math.min(options.length - 1, targetIndexRef.current + delta));
      targetIndexRef.current = next;
      startLerp();

      // Debounced snap after scrolling
      if ((handleWheel as any).snapTimeout) {
        clearTimeout((handleWheel as any).snapTimeout);
      }
      (handleWheel as any).snapTimeout = setTimeout(() => {
        snapToClosest();
      }, 140);
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', handleWheel);
      if ((handleWheel as any).snapTimeout) {
        clearTimeout((handleWheel as any).snapTimeout);
      }
    };
  }, [isOpen, options.length, snapToClosest, startLerp]);

  // Pointer drag interactions
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startIndexRef.current = targetIndexRef.current;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaY = startYRef.current - e.clientY;
    const deltaIndex = deltaY / (ITEM_HEIGHT * 0.9);
    const next = Math.max(0, Math.min(options.length - 1, startIndexRef.current + deltaIndex));
    targetIndexRef.current = next;
    startLerp();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
    snapToClosest();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(options.length - 1, Math.round(targetIndexRef.current) + 1);
      targetIndexRef.current = next;
      startLerp();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(0, Math.round(targetIndexRef.current) - 1);
      targetIndexRef.current = prev;
      startLerp();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const activeIdx = Math.max(0, Math.min(options.length - 1, Math.round(targetIndexRef.current)));
      const chosen = options[activeIdx];
      if (chosen) {
        onChange(chosen.id);
        setIsOpen(false);
      }
    }
  };

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const selectedItem = options[selectedIndex] || options[0];
  const isLeft = align === 'left';

  return (
    <div
      ref={containerRef}
      className={`option-wheel-root relative select-none ${className}`}
      style={{
        display: 'inline-block',
        fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
        ...style,
      }}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <span
          className="block text-[11px] font-medium tracking-wider uppercase mb-1.5"
          style={{
            color: '#7a8296',
            textAlign: isLeft ? 'left' : 'right',
          }}
        >
          {label}
        </span>
      )}

      {/* ── Trigger Pill Button ────────────────────────────────────── */}
      <button
        type="button"
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="option-wheel-trigger clickable group flex items-center gap-2.5 transition-all duration-200 outline-none"
        style={{
          height: 38,
          padding: isLeft ? '0 12px 0 10px' : '0 10px 0 12px',
          flexDirection: isLeft ? 'row' : 'row-reverse',
          background: isOpen ? 'rgba(14, 23, 38, 0.96)' : 'rgba(11, 16, 26, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: isOpen ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid rgba(238, 240, 245, 0.12)',
          borderLeft: isLeft ? (isOpen ? '3px solid #38bdf8' : '2px solid rgba(56, 189, 248, 0.5)') : undefined,
          borderRight: !isLeft ? (isOpen ? '3px solid #38bdf8' : '2px solid rgba(56, 189, 248, 0.5)') : undefined,
          borderRadius: 8,
          boxShadow: isOpen
            ? '0 0 20px rgba(56, 189, 248, 0.18), 0 4px 12px rgba(0, 0, 0, 0.4)'
            : '0 2px 8px rgba(0, 0, 0, 0.3)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {/* Status Beacon / Target Pin */}
        <span
          className="relative flex items-center justify-center"
          style={{ width: 14, height: 14, flexShrink: 0 }}
        >
          <span
            className="absolute rounded-full"
            style={{
              width: 8,
              height: 8,
              background: '#38bdf8',
              boxShadow: '0 0 10px #38bdf8',
            }}
          />
        </span>

        {/* Selected Label & Sublabel */}
        <div
          className="flex flex-col min-w-0"
          style={{
            alignItems: isLeft ? 'flex-start' : 'flex-end',
            textAlign: isLeft ? 'left' : 'right',
          }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs font-semibold tracking-wide whitespace-nowrap"
              style={{ color: '#eef0f5' }}
            >
              {selectedItem?.label ?? 'Select option'}
            </span>
          </div>
          {selectedItem?.sublabel && (
            <span
              className="text-[10px] whitespace-nowrap font-mono"
              style={{ color: '#82929a' }}
            >
              {selectedItem.sublabel}
            </span>
          )}
        </div>

        {/* Dropdown Chevron */}
        <ChevronDown
          size={14}
          className="transition-transform duration-200"
          style={{
            color: isOpen ? '#38bdf8' : '#7a8296',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            marginLeft: isLeft ? 4 : 0,
            marginRight: isLeft ? 0 : 4,
            flexShrink: 0,
          }}
        />
      </button>

      {/* ── 3D Option Wheel Dropdown Panel ─────────────────────────── */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={label || 'Select option'}
          className="option-wheel-popover absolute z-50 transition-all"
          style={{
            top: 'calc(100% + 8px)',
            left: isLeft ? 0 : 'auto',
            right: !isLeft ? 0 : 'auto',
            width: 270,
            background: 'rgba(8, 13, 22, 0.96)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(56, 189, 248, 0.28)',
            borderLeft: isLeft ? '3px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.28)',
            borderRight: !isLeft ? '3px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.28)',
            borderRadius: 12,
            boxShadow: isLeft
              ? '0 20px 48px -8px rgba(0, 0, 0, 0.75), 0 0 24px rgba(56, 189, 248, 0.16)'
              : '0 20px 48px -8px rgba(0, 0, 0, 0.75), 0 0 24px rgba(56, 189, 248, 0.16)',
            overflow: 'hidden',
          }}
        >
          {/* Header Bar */}
          <div
            className="flex items-center justify-between px-3.5 py-2 border-b"
            style={{
              borderColor: 'rgba(238, 240, 245, 0.08)',
              background: 'rgba(15, 23, 42, 0.6)',
              flexDirection: isLeft ? 'row' : 'row-reverse',
            }}
          >
            <div
              className="flex items-center gap-1.5"
              style={{ flexDirection: isLeft ? 'row' : 'row-reverse' }}
            >
              <Crosshair size={12} style={{ color: '#38bdf8' }} />
              <span
                className="text-[10px] font-mono tracking-wider uppercase font-semibold"
                style={{ color: '#38bdf8' }}
              >
                {isLeft ? '3D TARGET SELECT' : 'TARGET ANALYSIS'}
              </span>
            </div>
            <span
              className="text-[9px] font-mono tracking-tight"
              style={{ color: '#64748b' }}
            >
              SCROLL / DRAG WHEEL
            </span>
          </div>

          {/* Wheel 3D Container Viewport */}
          <div
            ref={wheelViewportRef}
            className="relative overflow-hidden cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              height: WHEEL_HEIGHT,
              perspective: prefersReducedMotion ? 'none' : 800,
              perspectiveOrigin: isLeft ? '30% 50%' : '70% 50%',
              userSelect: 'none',
              touchAction: 'none',
            }}
          >
            {/* Center Selection Focus Lens */}
            <div
              className="absolute left-1 right-1 pointer-events-none rounded-md"
              style={{
                top: (WHEEL_HEIGHT - ITEM_HEIGHT) / 2,
                height: ITEM_HEIGHT,
                border: '1px solid rgba(56, 189, 248, 0.35)',
                borderLeft: isLeft ? '3px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.35)',
                borderRight: !isLeft ? '3px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.35)',
                background: isLeft
                  ? 'linear-gradient(90deg, rgba(56, 189, 248, 0.16) 0%, rgba(56, 189, 248, 0.03) 70%, transparent 100%)'
                  : 'linear-gradient(270deg, rgba(56, 189, 248, 0.16) 0%, rgba(56, 189, 248, 0.03) 70%, transparent 100%)',
                boxShadow: isLeft
                  ? 'inset 10px 0 16px -6px rgba(56, 189, 248, 0.28)'
                  : 'inset -10px 0 16px -6px rgba(56, 189, 248, 0.28)',
                zIndex: 2,
              }}
            />

            {/* Top & Bottom Vignette Fade Overlays */}
            <div
              className="absolute inset-x-0 top-0 pointer-events-none z-10"
              style={{
                height: 48,
                background: 'linear-gradient(180deg, rgba(8, 13, 22, 0.95) 0%, transparent 100%)',
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 pointer-events-none z-10"
              style={{
                height: 48,
                background: 'linear-gradient(0deg, rgba(8, 13, 22, 0.95) 0%, transparent 100%)',
              }}
            />

            {/* 3D Wheel Items Drum */}
            <div
              className="absolute inset-x-0 top-0 w-full h-full"
              style={{
                transformStyle: prefersReducedMotion ? 'flat' : 'preserve-3d',
              }}
            >
              {options.map((option, idx) => {
                const offset = idx - currentIndex;
                const isSelected = option.id === selectedId;
                const isFocused = Math.abs(offset) < 0.5;

                // 3D Geometry calculations
                const angleDeg = offset * 22;
                const angleRad = (angleDeg * Math.PI) / 180;
                const translateY = Math.sin(angleRad) * (WHEEL_HEIGHT * 0.44) + (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;
                const translateZ = (Math.cos(angleRad) - 1) * 60;
                const rotateX = -angleDeg;

                // Directional yaw and inward offset
                const rotateY = isLeft ? -offset * 3.5 : offset * 3.5;
                const translateX = isLeft ? -Math.abs(offset) * 4 : Math.abs(offset) * 4;

                const opacity = Math.max(0.2, 1 - Math.abs(offset) * 0.26);
                const scale = Math.max(0.78, 1 - Math.abs(offset) * 0.06);

                const transformStyle = prefersReducedMotion
                  ? `translate3d(0, ${offset * ITEM_HEIGHT + (WHEEL_HEIGHT - ITEM_HEIGHT) / 2}px, 0)`
                  : `translate3d(${translateX}px, ${translateY}px, ${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="button"
                    tabIndex={0}
                    className="option-wheel-item clickable absolute inset-x-2 flex items-center transition-colors outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      targetIndexRef.current = idx;
                      startLerp();
                      onChange(option.id);
                      setTimeout(() => setIsOpen(false), 180);
                    }}
                    style={{
                      height: ITEM_HEIGHT,
                      padding: isLeft ? '0 12px 0 10px' : '0 10px 0 12px',
                      flexDirection: isLeft ? 'row' : 'row-reverse',
                      transform: transformStyle,
                      transformOrigin: isLeft ? 'left center' : 'right center',
                      opacity,
                      zIndex: isFocused ? 5 : Math.round(10 - Math.abs(offset)),
                      willChange: 'transform, opacity',
                      borderRadius: 6,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Item Content */}
                    <div
                      className="flex-1 min-w-0 flex flex-col"
                      style={{
                        alignItems: isLeft ? 'flex-start' : 'flex-end',
                        textAlign: isLeft ? 'left' : 'right',
                      }}
                    >
                      <div
                        className="flex items-center gap-1.5"
                        style={{ flexDirection: isLeft ? 'row' : 'row-reverse' }}
                      >
                        <span
                          className={`text-xs tracking-wide transition-all ${
                            isFocused ? 'font-bold' : isSelected ? 'font-semibold' : 'font-normal'
                          }`}
                          style={{
                            color: isFocused
                              ? '#38bdf8'
                              : isSelected
                              ? '#eef0f5'
                              : '#a3a9b8',
                            textShadow: isFocused ? '0 0 12px rgba(56, 189, 248, 0.45)' : 'none',
                          }}
                        >
                          {option.label}
                        </span>
                        {isSelected && (
                          <Check
                            size={12}
                            style={{
                              color: '#38bdf8',
                              strokeWidth: 2.5,
                            }}
                          />
                        )}
                      </div>
                      {option.sublabel && (
                        <span
                          className="text-[10px] font-mono tracking-tight"
                          style={{
                            color: isFocused ? 'rgba(56, 189, 248, 0.75)' : '#64748b',
                          }}
                        >
                          {option.sublabel}
                        </span>
                      )}
                    </div>

                    {/* Numeric Index Tag */}
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        color: isFocused ? '#38bdf8' : '#475569',
                        background: isFocused ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        marginLeft: isLeft ? 8 : 0,
                        marginRight: isLeft ? 0 : 8,
                      }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Bar */}
          <div
            className="flex items-center justify-between px-3 py-2 border-t"
            style={{
              borderColor: 'rgba(238, 240, 245, 0.08)',
              background: 'rgba(10, 16, 26, 0.8)',
              flexDirection: isLeft ? 'row' : 'row-reverse',
            }}
          >
            <span
              className="text-[10px] font-mono"
              style={{ color: '#82929a' }}
            >
              {options.length} SITES AVAILABLE
            </span>
            <button
              type="button"
              role="button"
              className="clickable text-[10px] font-semibold px-2 py-0.5 rounded transition-colors"
              onClick={() => setIsOpen(false)}
              style={{
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
              }}
            >
              DONE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptionWheel;
