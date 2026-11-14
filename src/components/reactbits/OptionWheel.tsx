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

const ITEM_HEIGHT = 40;
const VISIBLE_COUNT = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT; // 200px
const CONTAINER_WIDTH = 310;

/**
 * OptionWheel — Refined Scientific 3D Cylindrical Option Wheel Component
 *
 * Designed with a light, cloudy, atmospheric aesthetic matching the AWILIX
 * scientific lunar bento plate system:
 * - Soft, misty, light-white translucent background with natural soft depth
 * - Gentle 3D cylindrical drum perspective without diagonal shearing or skew
 * - High-contrast readable typography for all positions
 * - Centered selection lens with restrained cyan/teal accents
 * - Full compatibility with AWILIX CustomCursor (.clickable & [role="button"])
 * - Inertia-damped wheel scrolling, pointer dragging, click selection, and keyboard navigation
 * - Respects prefers-reduced-motion
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
      const delta = e.deltaY * 0.011;
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
    const deltaIndex = deltaY / (ITEM_HEIGHT * 0.85);
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
            color: '#64748b',
            textAlign: isLeft ? 'left' : 'right',
          }}
        >
          {label}
        </span>
      )}

      {/* ── Trigger Pill Button (Light Cloudy Translucent Surface) ──── */}
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
          background: isOpen
            ? 'rgba(255, 255, 255, 0.98)'
            : 'linear-gradient(135deg, rgba(250, 252, 255, 0.94) 0%, rgba(243, 246, 251, 0.92) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: isOpen ? '1px solid rgba(94, 196, 190, 0.75)' : '1px solid rgba(203, 213, 225, 0.8)',
          borderLeft: isLeft ? (isOpen ? '3px solid #0f766e' : '2px solid #5ec4be') : undefined,
          borderRight: !isLeft ? (isOpen ? '3px solid #0f766e' : '2px solid #5ec4be') : undefined,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
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
            className="rounded-full"
            style={{
              width: 7,
              height: 7,
              background: '#0f766e',
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
              style={{ color: '#0f172a' }}
            >
              {selectedItem?.label ?? 'Select option'}
            </span>
          </div>
          {selectedItem?.sublabel && (
            <span
              className="text-[10px] whitespace-nowrap font-mono"
              style={{ color: '#64748b' }}
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
            color: isOpen ? '#0f766e' : '#64748b',
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
            width: CONTAINER_WIDTH,
            background: 'linear-gradient(155deg, rgba(250, 252, 255, 0.96) 0%, rgba(242, 246, 252, 0.94) 50%, rgba(247, 250, 254, 0.97) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(203, 213, 225, 0.85)',
            borderLeft: isLeft ? '3px solid #0f766e' : '1px solid rgba(203, 213, 225, 0.85)',
            borderRight: !isLeft ? '3px solid #0f766e' : '1px solid rgba(203, 213, 225, 0.85)',
            borderRadius: 10,
            boxShadow: '0 14px 34px -4px rgba(15, 23, 42, 0.16), 0 3px 10px rgba(15, 23, 42, 0.06)',
            overflow: 'hidden',
          }}
        >
          {/* Header Bar */}
          <div
            className="flex items-center justify-between px-3.5 py-2 border-b"
            style={{
              borderColor: 'rgba(226, 232, 240, 0.9)',
              background: 'rgba(241, 245, 249, 0.85)',
              flexDirection: isLeft ? 'row' : 'row-reverse',
            }}
          >
            <div
              className="flex items-center gap-1.5"
              style={{ flexDirection: isLeft ? 'row' : 'row-reverse' }}
            >
              <Crosshair size={12} style={{ color: '#0f766e' }} />
              <span
                className="text-[10px] font-mono tracking-wider uppercase font-semibold"
                style={{ color: '#334155' }}
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
              perspective: prefersReducedMotion ? 'none' : 1200,
              perspectiveOrigin: '50% 50%',
              userSelect: 'none',
              touchAction: 'none',
            }}
          >
            {/* Center Selection Focus Lens (Selected Area) */}
            <div
              className="absolute pointer-events-none rounded-md"
              style={{
                top: (WHEEL_HEIGHT - ITEM_HEIGHT) / 2,
                height: ITEM_HEIGHT,
                left: 4,
                right: 4,
                border: '1px solid rgba(94, 196, 190, 0.45)',
                borderLeft: isLeft ? '3px solid #0f766e' : '1px solid rgba(94, 196, 190, 0.45)',
                borderRight: !isLeft ? '3px solid #0f766e' : '1px solid rgba(94, 196, 190, 0.45)',
                background: isLeft
                  ? 'linear-gradient(90deg, rgba(94, 196, 190, 0.14) 0%, rgba(240, 246, 252, 0.6) 80%, transparent 100%)'
                  : 'linear-gradient(270deg, rgba(94, 196, 190, 0.14) 0%, rgba(240, 246, 252, 0.6) 80%, transparent 100%)',
                boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.8), 0 1px 3px rgba(15, 23, 42, 0.05)',
                zIndex: 2,
              }}
            />

            {/* Top & Bottom Soft Misty Vignette Fades */}
            <div
              className="absolute inset-x-0 top-0 pointer-events-none z-10"
              style={{
                height: 30,
                background: 'linear-gradient(180deg, rgba(247, 250, 254, 0.95) 0%, rgba(247, 250, 254, 0) 100%)',
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 pointer-events-none z-10"
              style={{
                height: 30,
                background: 'linear-gradient(0deg, rgba(247, 250, 254, 0.95) 0%, rgba(247, 250, 254, 0) 100%)',
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

                // Gentle 3D Cylindrical Geometry (Natural, no extreme tilt or skew)
                const angleDeg = offset * 11;
                const angleRad = (angleDeg * Math.PI) / 180;
                const translateY = Math.sin(angleRad) * (WHEEL_HEIGHT * 0.46) + (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;
                const translateZ = (Math.cos(angleRad) - 1) * 32;
                const rotateX = -angleDeg;

                // Subtle directional curvature without diagonal skew
                const translateX = isLeft ? -Math.abs(offset) * 2 : Math.abs(offset) * 2;

                // Clear visual hierarchy: selected = 1.0, adjacent = 0.85, distant = 0.65
                const opacity = isFocused
                  ? 1.0
                  : Math.max(0.62, 1 - Math.abs(offset) * 0.16);
                const scale = 1 - Math.min(Math.abs(offset) * 0.02, 0.06);

                const transformStyle = prefersReducedMotion
                  ? `translate3d(0, ${offset * ITEM_HEIGHT + (WHEEL_HEIGHT - ITEM_HEIGHT) / 2}px, 0)`
                  : `translate3d(${translateX}px, ${translateY}px, ${translateZ}px) rotateX(${rotateX}deg) scale(${scale})`;

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
                      transformOrigin: '50% 50%',
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
                          className={`text-xs tracking-wide whitespace-nowrap transition-colors ${
                            isFocused ? 'font-bold' : isSelected ? 'font-semibold' : 'font-medium'
                          }`}
                          style={{
                            color: isFocused
                              ? '#0f172a'
                              : isSelected
                              ? '#1e293b'
                              : '#334155',
                          }}
                        >
                          {option.label}
                        </span>
                        {isSelected && (
                          <Check
                            size={13}
                            style={{
                              color: '#0f766e',
                              strokeWidth: 2.5,
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>
                      {option.sublabel && (
                        <span
                          className="text-[10px] font-mono tracking-tight whitespace-nowrap"
                          style={{
                            color: isFocused ? '#0f766e' : '#64748b',
                            fontWeight: isFocused ? 500 : 400,
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
                        color: isFocused ? '#0f766e' : '#64748b',
                        background: isFocused ? 'rgba(15, 118, 110, 0.1)' : 'rgba(15, 23, 42, 0.05)',
                        border: isFocused ? '1px solid rgba(15, 118, 110, 0.2)' : '1px solid rgba(15, 23, 42, 0.06)',
                        marginLeft: isLeft ? 8 : 0,
                        marginRight: isLeft ? 0 : 8,
                        flexShrink: 0,
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
            className="flex items-center justify-between px-3.5 py-2 border-t"
            style={{
              borderColor: 'rgba(226, 232, 240, 0.9)',
              background: 'rgba(241, 245, 249, 0.85)',
              flexDirection: isLeft ? 'row' : 'row-reverse',
            }}
          >
            <span
              className="text-[9.5px] font-mono font-medium"
              style={{ color: '#64748b' }}
            >
              {options.length} SITES AVAILABLE
            </span>
            <button
              type="button"
              role="button"
              className="clickable text-[10px] font-semibold px-2.5 py-0.5 rounded transition-colors"
              onClick={() => setIsOpen(false)}
              style={{
                color: '#0f172a',
                background: 'rgba(15, 23, 42, 0.06)',
                border: '1px solid rgba(15, 23, 42, 0.14)',
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
