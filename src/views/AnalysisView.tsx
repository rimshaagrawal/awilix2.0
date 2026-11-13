import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  Sun,
  Globe2,
  Zap,
  Radio,
  Database,
  Check,
  CircleHelp,
  ArrowUpRight,
  Mountain,
  Compass,
  BarChart3,
} from 'lucide-react';
import type { Site, Scenario, View } from '@/types';
import { sites } from '@/data/sites';
import { getSummary, formatCoordinate } from '@/lib/scenarioCalculations';
import { MetricCard } from '@/components/common/MetricCard';
import { ChartPanel } from '@/components/charts/ChartPanel';
import { AstroReadout } from '@/components/charts/AstroReadout';
import { SiteTerrain3D } from '@/components/terrain/SiteTerrain3D';

interface AnalysisViewProps {
  site: Site;
  scenario: Scenario;
  onSelectSite: (id: string) => void;
  onNavigate: (view: View) => void;
  initialTab?: 'charts' | 'terrain';
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  site,
  scenario,
  onSelectSite,
  onNavigate,
  initialTab = 'charts',
}) => {
  const summary = getSummary(site, scenario);
  const [activeTab, setActiveTab] = useState<'charts' | 'terrain'>(initialTab);

  // Sync when initialTab changes (e.g. "Visit 3D Terrain" button clicked)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="view-stack">
      {/* ── 1. Analysis Header with Site Switcher ────────────────── */}
      <div className="analysis-header">
        <div>
          <span className="eyebrow">SITE ANALYSIS / 03</span>
          <div className="analysis-title-row">
            <h1>{site.name}</h1>
            <span className="site-status">
              <span />
              ACTIVE TARGET
            </span>
          </div>
          <p>
            {site.targetRegion} · {site.mission}
          </p>
        </div>

        <div className="site-switcher">
          <label>ACTIVE SITE</label>
          <select value={site.id} onChange={(e) => onSelectSite(e.target.value)}>
            {sites.map((item) => (
              <option key={item.id} value={item.id}>
                {item.shortName}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </div>
      </div>

      {/* ── 2. Top 4 Telemetry Metric Cards ─────────────────────── */}
      <div className="analysis-metrics">
        <MetricCard
          label="Solar visibility"
          value={summary.sunlight}
          unit="%"
          tone="amber"
          detail={`${summary.peakSunAlt.toFixed(1)}° peak altitude`}
          icon={Sun}
        />
        <MetricCard
          label="Earth visibility"
          value={summary.earth}
          unit="%"
          tone="cyan"
          detail={`${summary.peakEarthAlt.toFixed(1)}° peak altitude`}
          icon={Globe2}
        />
        <MetricCard
          label="Power opportunity"
          value={summary.power}
          unit="%"
          tone="blue"
          detail={`tilt ${scenario.panelTilt}° · az ${scenario.panelAzimuth}°`}
          icon={Zap}
        />
        <MetricCard
          label="Comm window"
          value={summary.comm}
          unit="%"
          tone="green"
          detail={`antenna ${scenario.antennaHeight} m`}
          icon={Radio}
        />
      </div>

      {/* ── 3. Mode Toggle: Charts vs Full 3D Terrain ───────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #22303a',
          paddingBottom: 12,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`quiet-button ${activeTab === 'charts' ? 'active' : ''}`}
            onClick={() => setActiveTab('charts')}
            style={
              activeTab === 'charts'
                ? { background: '#15252a', borderColor: '#65d5d0', color: '#65d5d0' }
                : {}
            }
          >
            <BarChart3 size={14} />
            <span>Telemetry &amp; Polar Horizon Charts</span>
          </button>

          <button
            className={`quiet-button ${activeTab === 'terrain' ? 'active' : ''}`}
            onClick={() => setActiveTab('terrain')}
            style={
              activeTab === 'terrain'
                ? { background: '#15252a', borderColor: '#65d5d0', color: '#65d5d0' }
                : {}
            }
          >
            <Mountain size={14} />
            <span>3D LOLA Terrain Altimetry</span>
          </button>
        </div>

        <span className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Compass size={12} />
          <span>{activeTab === 'charts' ? 'REFERENCE SPHERE MODEL' : 'NASA LOLA 20M ELEVATION'}</span>
        </span>
      </div>

      {/* ── 4. Main Visualization Section ───────────────────────── */}
      {activeTab === 'charts' ? (
        /* Original Bolt Layout: Illumination Time Series + Polar Horizon Sky Model side-by-side */
        <div className="analysis-grid">
          <ChartPanel site={site} scenario={scenario} />
          <AstroReadout site={site} scenario={scenario} />
        </div>
      ) : (
        /* Full-Width 3D Terrain Altimetry Viewer with top & bottom HUD */
        <div style={{ width: '100%', minHeight: 580 }}>
          <SiteTerrain3D
            site={site}
            scenario={scenario}
            onBack={() => onNavigate('globe')}
            onSelectSite={onSelectSite}
          />
        </div>
      )}

      {/* ── 5. Lower Panels: Detailed Site Record & Limitations ─── */}
      <div className="analysis-lower">
        <div className="panel detail-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">SITE RECORD</span>
              <h2>What NASA &amp; LOLA Altimetry Tell Us</h2>
            </div>
            <Database size={17} />
          </div>

          <div className="detail-grid">
            <div>
              <span>COORDINATES</span>
              <strong>
                {formatCoordinate(site.lat, 'N', 'S')} / {formatCoordinate(site.lon, 'E', 'W')}
              </strong>
            </div>
            <div>
              <span>RELIEF / ELEVATION</span>
              <strong>{site.elevationReliefM.toLocaleString()} m</strong>
            </div>
            <div>
              <span>WATER-ICE POTENTIAL</span>
              <strong style={{ color: '#65d5d0' }}>{site.waterIcePotential}</strong>
            </div>
            <div>
              <span>CONTRACTOR / OWNER</span>
              <strong>{site.contractor}</strong>
            </div>
            {site.craterDiameterKm !== undefined && site.craterDiameterKm > 0 && (
              <div>
                <span>CRATER DIAMETER</span>
                <strong>{site.craterDiameterKm} km</strong>
              </div>
            )}
            {site.craterDepthKm !== undefined && site.craterDepthKm > 0 && (
              <div>
                <span>CRATER DEPTH</span>
                <strong>{site.craterDepthKm} km</strong>
              </div>
            )}
          </div>

          {site.whyNASAChose && (
            <div style={{ marginTop: 18, borderTop: '1px solid #22303a', paddingTop: 14 }}>
              <span className="eyebrow">WHY NASA CHOSE THIS REGION</span>
              <p style={{ margin: '6px 0 0', color: '#9daeb2', fontSize: 11, lineHeight: 1.6 }}>
                {site.whyNASAChose}
              </p>
            </div>
          )}

          {site.funFact && (
            <div
              style={{
                marginTop: 14,
                background: '#111b22',
                padding: '10px 14px',
                borderRadius: 6,
                border: '1px solid #23343d',
              }}
            >
              <span className="eyebrow" style={{ color: '#f0a970' }}>
                DID YOU KNOW?
              </span>
              <p style={{ margin: '4px 0 0', color: '#cad8db', fontSize: 10, lineHeight: 1.55 }}>
                {site.funFact}
              </p>
            </div>
          )}

          <div className="goal-list">
            <span className="eyebrow">KEY SCIENCE GOALS</span>
            {site.keyScienceGoals.map((goal) => (
              <span key={goal}>
                <Check size={13} />
                {goal}
              </span>
            ))}
          </div>
        </div>

        <div className="panel limitation-panel">
          <div className="limitation-icon">
            <CircleHelp size={19} />
          </div>
          <span className="eyebrow">SCIENTIFIC FIDELITY NOTICE</span>
          <h3>Local 20m Altimetry vs Far-Field Terrain</h3>
          <p>
            Calculations combine official NASA 2026 lunar ephemeris tables with 20-meter LOLA altimetry models.
            While local slopes and crater walls are mapped at meter resolution, distant horizon rims beyond the 20km tile
            boundary are modeled via the reference sphere.
          </p>
          <button className="text-button" onClick={() => onNavigate('scenario')}>
            Review scenario assumptions <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;
