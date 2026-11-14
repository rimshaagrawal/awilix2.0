import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

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

/**
 * Circular spatial navigation wheel (AWILIX / React Bits-inspired).
 * - Options arranged around a ring; center shows active selection.
 * - Rotate via drag, scroll, or arrow keys; active option is emphasized.
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
    safeOptions.findIndex((opt) => opt.id === selectedId)
  );
  const [isOpen, setIsOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const targetRotationRef = useRef(0);
  const animRef = useRef<number | null>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; startRot: number }>({
    active: false,
    startX: 0,
    startY: 0,
    startRot: 0,
  });
  const rootRef = useRef<HTMLDivElement>(null);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stepAngle = safeOptions.length > 0 ? 360 / safeOptions.length : 360;
  // Place selected item at the "top" (negative Y) of the circle
  const desiredRotationForIndex = useCallback(
    (idx: number) => -idx * stepAngle,
    [stepAngle]
  );

  useEffect(() => {
    const r = desiredRotationForIndex(selectedIndex);
    targetRotationRef.current = r;
    if (prefersReducedMotion) {
      rotationRef.current = r;
      setRotation(r);
      return;
    }
    const tick = () => {
      const cur = rotationRef.current;
      let diff = targetRotationRef.current - cur;
      // Normalize to shortest path
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      if (Math.abs(diff) < 0.35) {
        rotationRef.current = targetRotationRef.current;
        setRotation(targetRotationRef.current);
        animRef.current = null;
        return;
      }
      rotationRef.current = cur + diff * 0.18;
      setRotation(rotationRef.current);
      animRef.current = requestAnimationFrame(tick);
    };
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [selectedIndex, desiredRotationForIndex, prefersReducedMotion]);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isOpen]);

  const commitIndex = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(safeOptions.length - 1, idx));
      const item = safeOptions[clamped];
      if (item) onChange(item.id);
    },
    [safeOptions, onChange]
  );

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
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      commitIndex((selectedIndex + 1) % safeOptions.length);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      commitIndex((selectedIndex - 1 + safeOptions.length) % safeOptions.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!isOpen || disabled || safeOptions.length < 2) return;
    e.preventDefault();
    const dir = e.deltaY > 0 ? 1 : -1;
    commitIndex(selectedIndex + dir);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isOpen || disabled) return;
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, startRot: rotationRef.current };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active || disabled) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    // Horizontal drag feels natural for rotation
    const delta = dx * 0.55 - dy * 0.15;
    const next = dragRef.current.startRot + delta;
    rotationRef.current = next;
    targetRotationRef.current = next;
    setRotation(next);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    // Snap to nearest
    if (safeOptions.length > 0) {
      const norm = ((-rotationRef.current % 360) + 360) % 360;
      const nearest = Math.round(norm / stepAngle) % safeOptions.length;
      commitIndex(nearest);
    }
  };

  const selectedItem = safeOptions[selectedIndex];
  const isLeft = align === 'left';
  const radius = 92;

  const wheelItems = useMemo(() => {
    return safeOptions.map((opt, idx) => {
      const angle = (idx * stepAngle * Math.PI) / 180;
      const x = Math.sin(angle) * radius;
      const y = -Math.cos(angle) * radius;
      const isActive = idx === selectedIndex;
      return { opt, idx, x, y, isActive, angleDeg: idx * stepAngle };
    });
  }, [safeOptions, stepAngle, selectedIndex]);

  return (
    <div
      ref={rootRef}
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
            color: 'var(--text-muted, #7a8296)',
            textAlign: isLeft ? 'left' : 'right',
          }}
        >
          {label}
        </span>
      )}

      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label || 'Select site'}
        disabled={disabled}
        onClick={() => setIsOpen((p) => !p)}
        className="clickable group flex items-center gap-2.5 transition-all duration-200 outline-none"
        style={{
          height: 40,
          padding: isLeft ? '0 12px 0 10px' : '0 10px 0 12px',
          flexDirection: isLeft ? 'row' : 'row-reverse',
          background: isOpen ? 'rgba(14, 23, 38, 0.98)' : 'rgba(11, 16, 26, 0.9)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: isOpen ? '1px solid rgba(56, 189, 248, 0.55)' : '1px solid rgba(238, 240, 245, 0.14)',
          borderLeft: isLeft ? '3px solid rgba(56, 189, 248, 0.85)' : undefined,
          borderRight: !isLeft ? '3px solid rgba(56, 189, 248, 0.85)' : undefined,
          borderRadius: 10,
          boxShadow: isOpen
            ? '0 0 0 1px rgba(56,189,248,0.15), 0 8px 28px rgba(0,0,0,0.45)'
            : '0 2px 10px rgba(0,0,0,0.35)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          minWidth: 200,
        }}
      >
        <span
          className="relative flex items-center justify-center shrink-0"
          style={{ width: 12, height: 12 }}
        >
          <span
            className="absolute rounded-full"
            style={{
              width: 8,
              height: 8,
              background: '#38bdf8',
              boxShadow: '0 0 10px rgba(56,189,248,0.9)',
            }}
          />
        </span>
        <span
          className="flex flex-col min-w-0 flex-1"
          style={{
            alignItems: isLeft ? 'flex-start' : 'flex-end',
            textAlign: isLeft ? 'left' : 'right',
          }}
        >
          <span className="text-[13px] font-semibold tracking-wide truncate w-full" style={{ color: '#eef0f5' }}>
            {selectedItem?.label ?? 'Select site'}
          </span>
          {selectedItem?.sublabel && (
            <span className="text-[10px] font-mono truncate w-full" style={{ color: '#8fa3ad' }}>
              {selectedItem.sublabel}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform duration-200"
          style={{
            color: isOpen ? '#38bdf8' : '#9aa6b2',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {isOpen && safeOptions.length > 0 && (
        <div
          role="listbox"
          aria-label={label || 'Select site'}
          className="absolute z-[80]"
          style={{
            top: 'calc(100% + 10px)',
            left: isLeft ? 0 : 'auto',
            right: !isLeft ? 0 : 'auto',
            width: 300,
            padding: 14,
            background: 'rgba(8, 13, 22, 0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderLeft: isLeft ? '3px solid rgba(56,189,248,0.85)' : '1px solid rgba(56,189,248,0.3)',
            borderRight: !isLeft ? '3px solid rgba(56,189,248,0.85)' : '1px solid rgba(56,189,248,0.3)',
            borderRadius: 14,
            boxShadow: '0 24px 56px rgba(0,0,0,0.65), 0 0 40px rgba(56,189,248,0.08)',
          }}
          onWheel={onWheel}
        >
          <div
            className="flex items-center justify-between mb-3 pb-2"
            style={{
              borderBottom: '1px solid rgba(238,240,245,0.08)',
              flexDirection: isLeft ? 'row' : 'row-reverse',
            }}
          >
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: '#7dd3fc' }}>
              Site navigation
            </span>
            <span className="text-[9px] font-mono" style={{ color: '#64748b' }}>
              Drag · Scroll · Arrows
            </span>
          </div>

          <div
            className="relative mx-auto touch-none cursor-grab active:cursor-grabbing"
            style={{
              width: 272,
              height: 272,
              userSelect: 'none',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* Ring guide */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: 18,
                border: '1px dashed rgba(56,189,248,0.25)',
                boxShadow: 'inset 0 0 30px rgba(56,189,248,0.04)',
              }}
            />
            {/* Center hub */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex flex-col items-center justify-center text-center px-3"
              style={{
                width: 118,
                height: 118,
                background: 'radial-gradient(circle at 40% 30%, rgba(56,189,248,0.18), rgba(8,13,22,0.95) 70%)',
                border: '1px solid rgba(56,189,248,0.45)',
                boxShadow: '0 0 24px rgba(56,189,248,0.12)',
              }}
            >
              <span className="text-[9px] font-mono tracking-widest uppercase mb-1" style={{ color: '#7dd3fc' }}>
                Selected
              </span>
              <span className="text-[12px] font-semibold leading-snug line-clamp-3" style={{ color: '#eef0f5' }}>
                {selectedItem?.label}
              </span>
            </div>

            {/* Rotating items layer */}
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                width: 0,
                height: 0,
                transform: `rotate(${rotation}deg)`,
                transition: prefersReducedMotion ? 'none' : 'transform 0.05s linear',
              }}
            >
              {wheelItems.map(({ opt, idx, x, y, isActive }) => (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className="clickable absolute flex items-center justify-center rounded-full outline-none transition-shadow duration-150"
                  style={{
                    width: isActive ? 52 : 44,
                    height: isActive ? 52 : 44,
                    left: x,
                    top: y,
                    transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
                    background: isActive
                      ? 'linear-gradient(145deg, rgba(56,189,248,0.35), rgba(14,23,38,0.95))'
                      : 'rgba(15, 23, 42, 0.85)',
                    border: isActive ? '2px solid rgba(56,189,248,0.95)' : '1px solid rgba(148,163,184,0.25)',
                    boxShadow: isActive
                      ? '0 0 20px rgba(56,189,248,0.35), inset 0 1px 0 rgba(255,255,255,0.08)'
                      : '0 4px 12px rgba(0,0,0,0.4)',
                    color: isActive ? '#e0f2fe' : '#cbd5e1',
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 500,
                  }}
                  title={opt.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    commitIndex(idx);
                  }}
                >
                  <span className="px-1 leading-tight text-center line-clamp-2">{opt.label.length > 10 ? `${opt.label.slice(0, 9)}…` : opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 pt-2" style={{ borderTop: '1px solid rgba(238,240,245,0.08)' }}>
            <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>
              {safeOptions.length} sites
            </span>
            <button
              type="button"
              className="clickable text-[10px] font-semibold px-2.5 py-1 rounded-md"
              style={{
                color: '#7dd3fc',
                background: 'rgba(56,189,248,0.1)',
                border: '1px solid rgba(56,189,248,0.35)',
              }}
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
