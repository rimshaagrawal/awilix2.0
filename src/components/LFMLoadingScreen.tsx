// src/components/LFMLoadingScreen.tsx
// Reusable loading screen: spinner + indeterminate progress bar + fun-fact roulette.
// Self-contained: React + Tailwind only. No external deps.

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const MOON_FACTS = [
  'The Moon has no atmosphere, so shadows are pitch black.',
  "Shackleton Crater's floor has never seen sunlight in 2 billion years.",
  'The NASA-IBM Lunar Foundation Model was trained on 2 million image tiles.',
  'Ice at the lunar poles could provide water, oxygen, and rocket fuel.',
  'The Moon is slowly drifting away from Earth at 3.8 cm per year.',
  'LRO has been orbiting the Moon since 2009 — 17 years of data.',
  'The temperature in permanently shadowed regions drops below -240°C.',
  'Apollo 11 landed in the Sea of Tranquility on July 20, 1969.',
  "The Moon's south pole has regions that are in permanent shadow.",
  'Earth is visible from the Moon\'s south pole about 50% of the time.',
];

const FACT_ROTATION_MS = 4000;

interface LFMLoadingScreenProps {
  message?: string;
  subtext?: string;
  onCancel?: () => void;
}

export function LFMLoadingScreen({
  message = 'Loading…',
  subtext = '',
  onCancel,
}: LFMLoadingScreenProps) {
  const [factIndex, setFactIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setFactIndex((i) => (i + 1) % MOON_FACTS.length);
        setVisible(true);
      }, 220);
    }, FACT_ROTATION_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0b1015]/90 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <style>{`
        @keyframes lfm-spin { to { transform: rotate(360deg); } }
        @keyframes lfm-indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @keyframes lfm-fact-fade {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="w-full max-w-md mx-4 bento-plate p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div
            className="w-12 h-12 rounded-full border-2 border-[rgba(255,171,94,0.2)] border-t-[#ffab5e]"
            style={{ animation: 'lfm-spin 0.9s linear infinite' }}
            aria-hidden="true"
          />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[var(--ink)]">{message}</h2>
          {subtext ? (
            <p className="text-sm text-[var(--ink-mute)]">{subtext}</p>
          ) : null}
        </div>

        <div className="w-full h-1.5 rounded-full bg-[rgba(238,241,247,0.08)] overflow-hidden">
          <div
            className="h-full w-1/3 rounded-full bg-[#ffab5e]"
            style={{ animation: 'lfm-indeterminate 1.4s ease-in-out infinite' }}
            aria-hidden="true"
          />
        </div>

        <div className="min-h-[3.5rem] flex items-center justify-center">
          <p
            key={factIndex}
            className="text-sm text-[var(--ink-soft)] leading-relaxed italic"
            style={{ animation: 'lfm-fact-fade 0.3s ease-out' }}
          >
            {visible ? MOON_FACTS[factIndex] : '\u00A0'}
          </p>
        </div>

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-button text-xs inline-flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default LFMLoadingScreen;