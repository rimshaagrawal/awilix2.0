import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

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

const ITEM_H = 40;
const VISIBLE = 5;
const WHEEL_H = ITEM_H * VISIBLE;

/**
 * Curved/cylindrical vertical option wheel (AWILIX). Non-slop, restrained palette.
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
  const safeOptions = options.length > 0 ? options : [];
  const selectedIndex = Math.max(
    0,
    safeOptions.findIndex((o) => o.id === selectedId)
  );
  const [isOpen, setIsOpen] = useState(false);
  const [offset, setOffset] = useState(selectedIndex);
  const offsetRef = useRef(selectedIndex);
  const targetRef = useRef(selectedIndex);
  const animRef = useRef<number | null>(null);
  const dragRef = useRef({ active: false, y: 0, off: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    targetRef.current = selectedIndex;
    offsetRef.current = selectedIndex;
    setOffset(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isOpen]);

  const lerpTo = useCallback(() => {
    if (prefersReducedMotion) {
      offsetRef.current = targetRef.current;
      setOffset(targetRef.current);
      animRef.current = null;
      return;
    }
    const step = () => {
      const d = targetRef.current - offsetRef.current;
      if (Math.abs(d) < 0.01) {
        offsetRef.current = targetRef.current;
        setOffset(targetRef.current);
        animRef.current = null;
        return;
      }
      offsetRef.current += d * 0.16;
      setOffset(offsetRef.current);
      animRef.current = requestAnimationFrame(step);
    };
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(step);
  }, [prefersReducedMotion]);

  const snapTo = useCallback(() => {
    const n = Math.round(targetRef.current);
    const clamped = Math.max(0, Math.min(safeOptions.length - 1, n));
    targetRef.current = clamped;
    lerpTo();
  }, [safeOptions.length, lerpTo]);

  const commit = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(safeOptions.length - 1, idx));
      const item = safeOptions[clamped];
      if (item) onChange(item.id);
    },
    [safeOptions, onChange]
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!isOpen || !el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetRef.current = Math.max(0, Math.min(safeOptions.length - 1, targetRef.current + e.deltaY * 0.0025));
      setOffset(targetRef.current);
      lerpTo();
      window.clearTimeout((el as any)._snapT);
      (el as any)._snapT = window.setTimeout(snapTo, 120);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.clearTimeout((el as any)._snapT);
    };
  }, [isOpen, safeOptions.length, lerpTo, snapTo]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isOpen || disabled) return;
    dragRef.current = { active: true, y: e.clientY, off: targetRef.current };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dy = dragRef.current.y - e.clientY;
    const next = Math.max(0, Math.min(safeOptions.length - 1, dragRef.current.off + dy / (ITEM_H * 0.85)));
    targetRef.current = next;
    setOffset(next);
    lerpTo();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    snapTo();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const n = Math.min(safeOptions.length - 1, Math.round(targetRef.current) + 1);
      targetRef.current = n;
      lerpTo();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const n = Math.max(0, Math.round(targetRef.current) - 1);
      targetRef.current = n;
      lerpTo();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      commit(Math.round(targetRef.current));
      setIsOpen(false);
    }
  };

  const isLeft = align === 'left';
  const selectedItem = safeOptions[selectedIndex];

  return (
    <div
      ref={rootRef}
      className={`option-wheel-root relative select-none ${className}`}
      style={{ display: 'inline-block', fontFamily: "'Manrope', sans-serif", ...style }}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <span
          className="block text-[11px] font-medium tracking-wider uppercase mb-1.5"
          style={{ color: '#6b7280', textAlign: isLeft ? 'left' : 'right' }}
        >
          {label}
        </span>
      )}

      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setIsOpen((p) => !p)}
        className="clickable flex items-center gap-2.5 transition-all duration-200 outline-none"
        style={{
          height: 40,
          padding: isLeft ? '0 12px 0 10px' : '0 10px 0 12px',
          flexDirection: isLeft ? 'row' : 'row-reverse',
          background: isOpen ? '#ffffff' : 'linear-gradient(180deg, #fafbfc 0%, #f3f5f7 100%)',
          border: isOpen ? '1px solid #9ca3af' : '1px solid #d1d5db',
          borderLeft: isLeft ? '3px solid #4b5563' : undefined,
          borderRight: !isLeft ? '3px solid #4b5563' : undefined,
          borderRadius: 8,
          boxShadow: isOpen ? '0 4px 14px rgba(0,0,0,0.08)' : '0 1px 2px rgba(0,0,0,0.04)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          minWidth: 220,
        }}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#4b5563' }} />
        <span className="flex flex-col min-w-0 flex-1" style={{ alignItems: isLeft ? 'flex-start' : 'flex-end', textAlign: isLeft ? 'left' : 'right' }}>
          <span className="text-[13px] font-semibold tracking-wide truncate w-full" style={{ color: '#1f2937' }}>
            {selectedItem?.label ?? 'Select option'}
          </span>
          {selectedItem?.sublabel && (
            <span className="text-[10px] font-mono truncate w-full" style={{ color: '#6b7280' }}>
              {selectedItem.sublabel}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform duration-200"
          style={{ color: '#6b7280', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {isOpen && safeOptions.length > 0 && (
        <div
          role="listbox"
          className="absolute z-[80]"
          style={{
            top: 'calc(100% + 8px)',
            left: isLeft ? 0 : 'auto',
            right: !isLeft ? 0 : 'auto',
            width: 300,
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderLeft: isLeft ? '3px solid #4b5563' : '1px solid #e5e7eb',
            borderRight: !isLeft ? '3px solid #4b5563' : '1px solid #e5e7eb',
            borderRadius: 10,
            boxShadow: '0 12px 40px rgba(0,0,0,0.10)',
            overflow: 'hidden',
          }}
        >
          <div
            className="flex items-center justify-between px-3.5 py-2.5"
            style={{ borderBottom: '1px solid #f0f1f3', background: '#fafbfc' }}
          >
            <span className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: '#4b5563' }}>
              Select site
            </span>
            <span className="text-[9px] font-mono" style={{ color: '#9ca3af' }}>
              Scroll · drag
            </span>
          </div>

          <div
            ref={viewportRef}
            className="relative overflow-hidden touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              height: WHEEL_H,
              perspective: prefersReducedMotion ? 'none' : 900,
              perspectiveOrigin: '50% 50%',
              userSelect: 'none',
            }}
          >
            <div
              className="absolute left-2 right-2 rounded-md pointer-events-none"
              style={{
                top: (WHEEL_H - ITEM_H) / 2,
                height: ITEM_H,
                border: '1px solid #d1d5db',
                background: 'rgba(243,244,246,0.7)',
                zIndex: 2,
              }}
            />
            <div
              className="absolute inset-x-0 top-0 pointer-events-none z-10"
              style={{ height: 36, background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0))' }}
            />
            <div
              className="absolute inset-x-0 bottom-0 pointer-events-none z-10"
              style={{ height: 36, background: 'linear-gradient(0deg, #ffffff 0%, rgba(255,255,255,0))' }}
            />

            <div className="absolute inset-0" style={{ transformStyle: prefersReducedMotion ? 'flat' : 'preserve-3d' }}>
              {safeOptions.map((opt, idx) => {
                const d = idx - offset;
                const abs = Math.abs(d);
                const angle = Math.max(-55, Math.min(55, d * 18));
                const ty = d * ITEM_H + (WHEEL_H - ITEM_H) / 2;
                const tz = prefersReducedMotion ? 0 : -abs * 22;
                const scale = Math.max(0.86, 1 - abs * 0.04);
                const opacity = Math.max(0.35, 1 - abs * 0.22);
                const blur = prefersReducedMotion ? 0 : Math.min(2.5, abs * 0.8);
                const isSel = idx === selectedIndex;
                const isFocus = abs < 0.5;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    className="absolute left-2 right-2 flex items-center rounded-md outline-none transition-colors"
                    style={{
                      height: ITEM_H,
                      padding: isLeft ? '0 12px 0 10px' : '0 10px 0 12px',
                      flexDirection: isLeft ? 'row' : 'row-reverse',
                      transform: prefersReducedMotion
                        ? `translateY(${ty}px)`
                        : `translate3d(0, ${ty}px, ${tz}px) rotateX(${-angle}deg) scale(${scale})`,
                      transformOrigin: '50% 50%',
                      opacity,
                      filter: blur > 0 ? `blur(${blur}px)` : undefined,
                      zIndex: isFocus ? 5 : Math.max(0, 4 - Math.floor(abs)),
                      background: isFocus ? 'rgba(249,250,251,0.9)' : 'transparent',
                      color: isFocus ? '#111827' : '#4b5563',
                      fontWeight: isFocus ? 600 : 500,
                    }}
                    onClick={() => {
                      commit(idx);
                      setIsOpen(false);
                    }}
                  >
                    <span className="flex-1 truncate text-left" style={{ textAlign: isLeft ? 'left' : 'right' }}>
                      {opt.label}
                    </span>
                    {isSel && <Check size={14} style={{ color: '#374151', marginLeft: isLeft ? 6 : 0, marginRight: isLeft ? 0 : 6, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between px-3.5 py-2.5" style={{ borderTop: '1px solid #f0f1f3', background: '#fafbfc' }}>
            <span className="text-[10px] font-mono" style={{ color: '#6b7280' }}>
              {safeOptions.length} options
            </span>
            <button
              type="button"
              className="clickable text-[11px] font-medium px-2.5 py-1 rounded-md"
              style={{ color: '#374151', background: '#e5e7eb' }}
              onClick={() => setIsOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptionWheel;
