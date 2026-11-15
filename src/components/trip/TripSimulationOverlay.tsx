import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Loader2, X } from 'lucide-react';

interface TripSimulationOverlayProps {
  onExit: () => void;
}

const TRIP_URL = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/trip/index.html`;

/**
 * Full-viewport host for the Lunar Polar Explorer simulation.
 * The simulation runs in a same-origin iframe so its global styles, keyboard
 * handlers, pointer lock and WebGL context stay isolated from the dashboard.
 */
export const TripSimulationOverlay: React.FC<TripSimulationOverlayProps> = ({ onExit }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onExit();
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const type = (event.data as { type?: string } | null)?.type;
      if (type === 'awilix:trip-ready' || type === 'awilix:trip-error') {
        setLoading(false);
      }
      if (type === 'awilix:trip-exit') {
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('message', handleMessage);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [onExit]);

  const handleLoad = () => {
    setLoading(false);
    // Let Esc reach the simulation as soon as it appears.
    iframeRef.current?.contentWindow?.focus();
  };

  return (
    <div
      className="trip-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Trip to the Moon simulation"
    >
      <iframe
        ref={iframeRef}
        className="trip-overlay-frame"
        src={TRIP_URL}
        title="Trip to the Moon — Lunar Polar Explorer"
        allow="autoplay; fullscreen; gamepad"
        onLoad={handleLoad}
      />

      <div className="trip-overlay-chrome">
        <span className="trip-overlay-tag">
          <i className="status-dot" aria-hidden="true" />
          Trip to the Moon · live simulation
        </span>
        <button className="trip-exit" type="button" onClick={onExit}>
          <X size={15} />
          Exit
          <kbd>Esc</kbd>
        </button>
      </div>

      {loading && (
        <div className="trip-loader" role="status" aria-live="polite">
          <Loader2 size={26} className="trip-loader-spinner" />
          <strong>Preparing the lunar surface</strong>
          <span>Loading terrain, rover and mission sites…</span>
          <span className="trip-loader-hint">
            <Keyboard size={13} /> Esc returns to Awilix at any time
          </span>
        </div>
      )}
    </div>
  );
};

export default TripSimulationOverlay;
