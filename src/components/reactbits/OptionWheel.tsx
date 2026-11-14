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
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          minWidth: 220,
        }}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: '#6b7280', boxShadow: '0 0 8px rgba(107,114,128,0.55)' }}
        />
        <span
          className="flex flex-col min-w-0 flex-1"
          style={{ alignItems: isLeft ? 'flex-start' : 'flex-end', textAlign: isLeft ? 'left' : 'right' }}
        >
          <span
            className="text-[13px] font-semibold tracking-wide truncate w-full"
            style={{ color: '#1f2937', textShadow: '0 0 10px rgba(255,255,255,0.7)' }}
          >
            {selectedItem?.label ?? 'Select option'}
          </span>
        </span>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform duration-300 ease-out"
          style={{ color: '#6b7280', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
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
              width: 280,
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              overflow: 'visible',
            }}
          >
            <div
              className="flex flex-col gap-0.5 py-1"
              style={{ animation: 'awilixGlideIn 0.22s ease-out' }}
            >
              {safeOptions.map((opt) => {
                const isSel = opt.id === selectedId;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    className="clickable w-full text-left px-3 py-2 rounded-md outline-none transition-all duration-150"
                    style={{
                      background: isSel ? 'rgba(255,255,255,0.55)' : 'transparent',
                      color: isSel ? '#111827' : '#374151',
                      fontWeight: isSel ? 600 : 500,
                      textShadow: isSel ? '0 0 10px rgba(107,114,128,0.5)' : 'none',
                    }}
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.45)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = isSel ? 'rgba(255,255,255,0.55)' : 'transparent';
                    }}
                  >
                    <span className="flex items-center gap-2" style={{ justifyContent: isLeft ? 'flex-start' : 'flex-end', flexDirection: isLeft ? 'row' : 'row-reverse' }}>
                      {isSel && <Check size={14} style={{ color: '#4b5563', flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(107,114,128,0.5))' }} />}
                      <span className="truncate">{opt.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <style>{`@keyframes awilixGlideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </>
      )}
    </div>
  );
};

export default OptionWheel;
