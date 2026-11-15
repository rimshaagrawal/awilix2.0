import React, { useEffect, useRef, useState } from 'react';
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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isOpen]);

  const selectedItem = safeOptions[selectedIndex];
  const isLeft = align === 'left';

  return (
    <div
      ref={rootRef}
      className={`option-wheel-root relative select-none ${className}`}
      style={{ display: 'inline-block', fontFamily: "'Manrope', sans-serif", ...style }}
    >
      {label && (
        <span
          className="block font-medium tracking-wider uppercase mb-1.5"
          style={{ color: '#9ca3af', textAlign: isLeft ? 'left' : 'right', fontSize: 10 }}
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
        className="clickable flex items-center gap-2 transition-all duration-200 outline-none"
        style={{
          height: 36,
          padding: isLeft ? '0 10px 0 8px' : '0 8px 0 10px',
          flexDirection: isLeft ? 'row' : 'row-reverse',
          background: isOpen ? 'rgba(12, 18, 24, 0.72)' : 'rgba(12, 18, 24, 0.55)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 6,
          boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          minWidth: 200,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: '#9ca3af' }}
        />
        <span
          className="flex flex-col min-w-0 flex-1"
          style={{ alignItems: isLeft ? 'flex-start' : 'flex-end', textAlign: isLeft ? 'left' : 'right' }}
        >
          <span
            className="font-semibold tracking-wide truncate w-full"
            style={{ color: '#e5e7eb', fontSize: 12 }}
          >
            {selectedItem?.label ?? 'Select option'}
          </span>
        </span>
        <ChevronDown
          size={14}
          className="shrink-0 transition-transform duration-300 ease-out"
          style={{ color: '#9ca3af', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {isOpen && safeOptions.length > 0 && (
        <>
          <div
            role="listbox"
            className="absolute z-[80]"
            style={{
              top: 'calc(100% + 6px)',
              left: isLeft ? 0 : 'auto',
              right: !isLeft ? 0 : 'auto',
              width: 260,
              background: 'rgba(8, 13, 22, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 6,
              boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              overflow: 'hidden',
            }}
          >
            <div
              className="flex flex-col py-1"
              style={{ animation: 'awilixGlideIn 0.18s ease-out' }}
            >
              {safeOptions.map((opt) => {
                const isSel = opt.id === selectedId;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    className="clickable w-full text-left px-3 py-1.5 outline-none transition-colors duration-150"
                    style={{
                      background: isSel ? 'rgba(255,255,255,0.08)' : 'transparent',
                      color: isSel ? '#f3f4f6' : '#d1d5db',
                      fontWeight: isSel ? 600 : 500,
                      fontSize: 12,
                    }}
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = isSel ? 'rgba(255,255,255,0.08)' : 'transparent';
                    }}
                  >
                    <span className="flex items-center gap-2" style={{ justifyContent: isLeft ? 'flex-start' : 'flex-end', flexDirection: isLeft ? 'row' : 'row-reverse' }}>
                      {isSel && <Check size={13} style={{ color: '#e5e7eb', flexShrink: 0 }} />}
                      <span className="truncate">{opt.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <style>{`@keyframes awilixGlideIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </>
      )}
    </div>
  );
};

export default OptionWheel;
