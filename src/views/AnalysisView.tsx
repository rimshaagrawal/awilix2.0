import React, { useState } from 'react';
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
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  site,
  scenario,
  onSelectSite,
  onNavigate,
}) => {
  const summary = getSummary(site, scenario);
  const [visualMode, setVisualMode] = useState<'3d-terrain' | 'sky-model'>('3d-terrain');

  return (
    <div className="view-stack">
      {/* Analysis Header */}
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

      {/* 4 Metrics */}
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

      {/* Visual Mode Selector Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #22303a', paddingBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`quiet-button ${visualMode === '3d-terrain' ? 'active' : ''}`}
            onClick={() => setVisualMode('3d-terrain')}
            style={visualMode === '3d-terrain' ? { background: '#15252a', borderColor: '#65d5d0', color: '#65d5d0' } : {}}
          >
            <Mountain size={14} />
            <span>3D LOLA Terrain Altimetry</span>
          </button>
          <button
            className={`quiet-button ${visualMode === 'sky-model' ? 'active' : ''}`}
            onClick={() => setVisualMode('sky-model')}
            style={visualMode === 'sky-model' ? { background: '#15252a', borderColor: '#65d5d0', color: '#65d5d0' } : {}}
          >
            <Compass size={14} />
            <span>Polar Horizon Sky Model</span>
          </button>
        </div>
        <span className="eyebrow">HIGH RESOLUTION TELEMETRY</span>
      </div>

      {/* Main Visuals & Chart Grid */}
      {visualMode === '3d-terrain' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(290px, 0.65fr)', gap: 12 }}>
          <SiteTerrain3D site={site} scenario={scenario} />
          <ChartPanel site={site} scenario={scenario} />
        </div>
      ) : (
        <div className="analysis-grid">
          <ChartPanel site={site} scenario={scenario} />
          <AstroReadout site={site} scenario={scenario} />
        </div>
      )}

      {/* Lower Panels: Detailed Catalog Record & Limitation Notice */}
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
            <div style={{ marginTop: 14, background: '#111b22', padding: '10px 14px', borderRadius: 6, border: '1px solid #23343d' }}>
              <span className="eyebrow" style={{ color: '#f0a970' }}>DID YOU KNOW?</span>
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

