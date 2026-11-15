import React from 'react';
import {
  ArrowUpRight,
  Compass,
  Footprints,
  Keyboard,
  Map,
  MousePointer2,
  Orbit,
  Play,
  Rocket,
} from 'lucide-react';
import { AnimatedContent } from '@/components/reactbits/AnimatedContent';

interface TripViewProps {
  onStart: () => void;
}

const STEPS = [
  {
    icon: Orbit,
    step: '01 · Orbit',
    title: 'Start above the Moon',
    text: 'Drag the lunar globe, follow the orbiters, and read the latitude of every waypoint before you commit.',
  },
  {
    icon: Map,
    step: '02 · Descend',
    title: 'Pick a landing site',
    text: 'Choose Tranquility Base or a south-polar ridge and ride the descent into a local surface scene.',
  },
  {
    icon: Footprints,
    step: '03 · Explore',
    title: 'Drive and scan',
    text: 'Steer the rover with WASD, fire the boosters, and scan the flag, landers and science exhibits.',
  },
];

/**
 * Launch page for the standalone Lunar Polar Explorer simulation.
 * Starting the trip swaps the whole dashboard for the full-screen simulation.
 */
export const TripView: React.FC<TripViewProps> = ({ onStart }) => {
  return (
    <AnimatedContent distance={45} direction="vertical">
      <div className="view-stack">
        <section className="trip-hero panel">
          <div className="trip-copy">
            <div className="hero-kicker">
              <Rocket size={14} />
              <span>Interactive lunar experience</span>
            </div>

            <h1 className="trip-title">
              Trip to the <span>Moon</span>
            </h1>

            <p className="trip-lede">
              Leave the analysis dashboard and fly the flagship Awilix simulation. Orbit the Moon,
              descend into a real landing region, then drive across a rendered polar landscape.
            </p>

            <div className="trip-actions">
              <button className="trip-start" type="button" onClick={onStart}>
                <Play size={16} fill="currentColor" />
                Start
              </button>
              <span className="trip-esc">
                <Keyboard size={14} />
                Fullscreen · <kbd>Esc</kbd> returns to Awilix
              </span>
            </div>

            <dl className="trip-facts">
              <div>
                <dt>Sites</dt>
                <dd>8 waypoints</dd>
              </div>
              <div>
                <dt>Rover</dt>
                <dd>WASD + boosters</dd>
              </div>
              <div>
                <dt>Scans</dt>
                <dd>Apollo + exhibits</dd>
              </div>
            </dl>
          </div>

          <div className="trip-poster" aria-hidden="true">
            <span className="trip-poster-grid" />
            <span className="trip-poster-orbit trip-poster-orbit-outer" />
            <span className="trip-poster-orbit trip-poster-orbit-inner" />
            <span className="trip-poster-moon" />
            <span className="trip-poster-satellite" />
            <span className="trip-poster-caption">LUNAR POLAR EXPLORER · LIVE WEBGL</span>
          </div>
        </section>

        <div className="trip-steps">
          {STEPS.map(({ icon: Icon, step, title, text }) => (
            <article className="trip-step panel" key={step}>
              <div className="trip-step-head">
                <span className="trip-step-icon">
                  <Icon size={17} />
                </span>
                <span className="eyebrow">{step}</span>
              </div>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>

        <section className="trip-brief panel">
          <div>
            <span className="eyebrow">Before launch</span>
            <h2>Sound on, pointer ready</h2>
            <p>
              The simulation uses pointer lock for the rover camera. Press <kbd>Ctrl</kbd> to toggle
              capture, <kbd>Space</kbd> for boosters, and <kbd>K</kbd> to scan when a target is in
              range. The Moon button inside the simulation returns you to lunar orbit.
            </p>
          </div>
          <div className="trip-brief-tips">
            <span>
              <MousePointer2 size={14} /> Drag the globe to orbit
            </span>
            <span>
              <Compass size={14} /> Choose any waypoint card
            </span>
            <span>
              <ArrowUpRight size={14} /> Learn from every scan
            </span>
          </div>
        </section>
      </div>
    </AnimatedContent>
  );
};

export default TripView;
