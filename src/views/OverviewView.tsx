import React from 'react';
import {
  CalendarDays,
  Clock3,
  Database,
  ArrowUpRight,
  LineChart,
  Sun,
  Globe2,
  Zap,
  Activity,
  Orbit,
} from 'lucide-react';
import type { Scenario, View } from '@/types';
import { sites } from '@/data/sites';
import { getSummary, formatCoordinate, SITE_COLORS } from '@/lib/scenarioCalculations';
import { MetricCard } from '@/components/common/MetricCard';
import { MoonGlobe3D } from '@/components/globe/MoonGlobe3D';
import { AnimatedContent } from '@/components/reactbits/AnimatedContent';
import { Magnet } from '@/components/reactbits/Magnet';

interface OverviewViewProps {
  scenario: Scenario;
  selectedSiteId: string;
  onSelectSite: (id: string) => void;
  onOpenSite: (id: string) => void;
  onNavigate: (view: View) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  scenario,
  selectedSiteId,
  onSelectSite,
  onOpenSite,
  onNavigate,
}) => {
  const summaries = sites.map((site) => ({ site, summary: getSummary(site, scenario) }));
  const averageSun = Math.round(
    summaries.reduce((sum, item) => sum + item.summary.sunlight, 0) / summaries.length
  );
  const averageEarth = Math.round(
    summaries.reduce((sum, item) => sum + item.summary.earth, 0) / summaries.length
  );
  const averagePower = Math.round(
    summaries.reduce((sum, item) => sum + item.summary.power, 0) / summaries.length
  );

  return (
    <AnimatedContent distance={45} direction="vertical">
      <div className="view-stack">
        {/* Mission Hero Banner with 3D Globe */}
        <div className="mission-hero">
            <div className="hero-copy">
              <div className="hero-kicker">
                <Orbit size={13} style={{ color: 'var(--accent-teal)' }} />
                <span>Lunar south pole · Mission window 04</span>
              </div>
              <h1 className="hero-heading">
                <span className="hero-title-main">Lunar landing site</span>
                <span className="hero-title-sub">Ephemeris and terrain</span>
              </h1>
              <p>
                Awilix computes time-dependent solar illumination, direct Earth visibility, and 20-meter LOLA altimetry for six candidate south-pole sites.
              </p>
              <div className="hero-actions">
                <Magnet padding={40} magnetStrength={3} maxOffset={10}>
                  <button className="primary-button" onClick={() => onNavigate('globe')}>
                    Explore 3D globe <ArrowUpRight size={15} />
                  </button>
                </Magnet>
                <Magnet padding={40} magnetStrength={3} maxOffset={10}>
                  <button className="quiet-button" onClick={() => onOpenSite(selectedSiteId)}>
                    Open site analysis <LineChart size={14} />
                  </button>
                </Magnet>
              </div>
              <div className="hero-meta">
                <span>
                  <CalendarDays size={14} />
                  {scenario.date}
                </span>
                <span>
                  <Clock3 size={14} />
                  {scenario.windowHours}h window
                </span>
                <span>
                  <Database size={14} />
                  NASA LOLA telemetry
                </span>
              </div>
            </div>

            <div className="hero-visual">
              <MoonGlobe3D
                selectedSiteId={selectedSiteId}
                onSelectSite={onSelectSite}
                compact
              />
              <div className="hero-visual-label">
                <span>Polar view / 90°S</span>
                <b>6</b>
                <small>candidate sites</small>
              </div>
            </div>
          </div>

        {/* 4 Top Metric Cards */}
        <div className="metrics-grid">
          <MetricCard
            label="Solar availability"
            value={averageSun}
            unit="%"
            tone="amber"
            detail="six-site mean · current window"
            icon={Sun}
          />
          <MetricCard
            label="Earth visibility"
            value={averageEarth}
            unit="%"
            tone="cyan"
            detail="direct-to-Earth opportunity"
            icon={Globe2}
          />
          <MetricCard
            label="Power opportunity"
            value={averagePower}
            unit="%"
            tone="blue"
            detail="panel incidence included"
            icon={Zap}
          />
          <MetricCard
            label="Ephemeris status"
            value="Ready"
            tone="green"
            detail="NASA 2026 reference tables"
            icon={Activity}
          />
        </div>

        {/* Overview Grid: Shortlist & Readiness */}
        <div className="overview-grid">
          <div className="panel site-overview-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Candidate landing sites</span>
                <h2>South pole shortlist</h2>
              </div>
              <button className="text-button" onClick={() => onNavigate('sites')}>
                View all sites <ArrowUpRight size={14} />
              </button>
            </div>

            <div className="shortlist-list">
              {summaries.map(({ site, summary }, index) => {
                const color = SITE_COLORS[index % SITE_COLORS.length];
                return (
                  <button
                    className="shortlist-row"
                    key={site.id}
                    onClick={() => onOpenSite(site.id)}
                  >
                    <span className="row-number">
                      0{index + 1}
                    </span>
                    <span className="row-name">
                      <strong>{site.shortName}</strong>
                      <small>
                        {formatCoordinate(site.lat, 'N', 'S')} ·{' '}
                        {formatCoordinate(site.lon, 'E', 'W')}
                      </small>
                    </span>
                    <span className="row-bar">
                      <i style={{ width: `${summary.sunlight}%`, background: color }} />
                    </span>
                    <span className="row-value">{summary.sunlight}%</span>
                    <ArrowUpRight size={14} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AnimatedContent>
  );
};

export default OverviewView;
