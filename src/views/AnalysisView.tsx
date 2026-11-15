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
  Sparkles,
} from 'lucide-react';
import type { Site, Scenario, View } from '@/types';
import { sites } from '@/data/sites';
import { getSummary, formatCoordinate } from '@/lib/scenarioCalculations';
import { MetricCard } from '@/components/common/MetricCard';
import { ChartPanel } from '@/components/charts/ChartPanel';
import { AstroReadout } from '@/components/charts/AstroReadout';
import SiteTerrainView from '@/components/sites/SiteTerrainView';
import { LFMLoadingScreen } from '@/components/LFMLoadingScreen';
import iceData from '@/data/ice-prospectivity.json';
import { AnimatedContent } from '@/components/reactbits/AnimatedContent';
import { ScrollFloat } from '@/components/reactbits/ScrollFloat';
import { ScrollReveal } from '@/components/reactbits/ScrollReveal';
import { GlareHover } from '@/components/reactbits/GlareHover';
import { Magnet } from '@/components/reactbits/Magnet';
import { OptionWheel } from '@/components/reactbits/OptionWheel';

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
  const [lfmLoading, setLfmLoading] = useState(true);
  const [lfmAnalyzed, setLfmAnalyzed] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setLfmLoading(true);
    setLfmAnalyzed(false);
    const timer = setTimeout(() => {
      setLfmLoading(false);
      setLfmAnalyzed(true);
    }, 2200);
    return () => clearTimeout(timer);
  }, [site.id]);

  return (
    <AnimatedContent distance={40} direction="vertical">
      <div className="view-stack">
        {/* ── 1. Analysis Header with Animated Title & Subtitle ────────── */}
        <div className="analysis-header">
          <div>
            <span className="eyebrow">Site analysis · 04</span>
            <div className="analysis-title-row">
              <h1>
                <ScrollFloat key={`title-${site.id}`} distance={14} rotation={2}>
                  {site.name}
                </ScrollFloat>
              </h1>
              <span className="site-status">
                <span />
                Active target
              </span>
            </div>
            <p>
              <ScrollReveal key={`desc-${site.id}`} blurStrength={3} stagger={0.03}>
                {`${site.targetRegion} · ${site.mission}`}
              </ScrollReveal>
            </p>
          </div>

          <div className="site-switcher" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <OptionWheel
              align="right"
              label="Active site"
              selectedId={site.id}
              onChange={onSelectSite}
              options={sites.map((item) => ({ id: item.id, label: item.shortName }))}
            />
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
            borderBottom: '1px solid var(--border-subtle)',
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
                  ? { background: 'var(--text-primary)', color: '#07080d', borderColor: 'var(--text-primary)' }
                  : {}
              }
            >
              <BarChart3 size={14} />
              <span>Telemetry and polar horizon</span>
            </button>

            <button
              className={`quiet-button ${activeTab === 'terrain' ? 'active' : ''}`}
              onClick={() => setActiveTab('terrain')}
              style={
                activeTab === 'terrain'
                  ? { background: 'var(--text-primary)', color: '#07080d', borderColor: 'var(--text-primary)' }
                  : {}
              }
            >
              <Mountain size={14} />
              <span>3D LOLA terrain altimetry</span>
            </button>
          </div>

          <span className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Compass size={13} />
            <span>{activeTab === 'charts' ? 'Reference sphere model' : 'NASA LOLA 20m elevation'}</span>
          </span>
        </div>

        {/* ── 4. Main Visualization Section ───────────────────────── */}
        {activeTab === 'charts' ? (
          <div className="analysis-grid">
            <ChartPanel site={site} scenario={scenario} />
            <AstroReadout site={site} scenario={scenario} />
          </div>
        ) : (
          <div style={{ width: '100%', minHeight: 560 }}>
            <SiteTerrainView
              site={site}
              date={scenario.date}
              onBack={() => onNavigate('globe')}
            />
          </div>
        )}

        {/* ── 5. Lower Panels: Detailed Site Record & Limitations ─── */}
        {/* Ice Prospectivity (NASA-IBM LFM) */}
        <div className="panel" style={{ padding: 20, marginBottom: 16 }}>
          <div className="panel-heading" style={{ marginBottom: 12 }}>
            <div>
              <span className="eyebrow">Ice prospectivity</span>
              <h2>NASA-IBM Lunar Foundation Model</h2>
            </div>
            <Sparkles size={16} />
          </div>
          {lfmLoading ? (
            <LFMLoadingScreen message="Analyzing terrain with NASA-IBM LFM..." subtext="Running ice prospectivity inference on south-pole patch" />
          ) : (
            (() => {
              const d = (iceData as any)?.sites?.[site.id];
              if (!d) return <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>No LFM data available for this site.</p>;
              const pct = Math.round(d.aiProspectivity * 100);
              const color = d.aiProspectivity >= 0.8 ? 'var(--accent-aurora, #4ade80)' : d.aiProspectivity >= 0.4 ? 'var(--accent-solar)' : 'var(--accent-crimson, #f87171)';
              return (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    <div style={{ background: 'var(--surface-raised)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Prospectivity</div>
                      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color }}>{pct}%</div>
                    </div>
                    <div style={{ background: 'var(--surface-raised)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expert (Coyan)</div>
                      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{Math.round(d.expertProspectivity * 100)}%</div>
                    </div>
                    <div style={{ background: 'var(--surface-raised)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>PSR Coverage</div>
                      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: 'var(--accent-solar)' }}>{d.psrPercent}%</div>
                    </div>
                    <div style={{ background: 'var(--surface-raised)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Max Temp</div>
                      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{d.maxTempK} K</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Ice prospectivity reconstruction from the NASA-IBM Lunar Foundation Model. AI reconstruction of the expert model by Coyan et al. (2025).
                  </p>
                </div>
              );
            })()
          )}
        </div>

        <div className="analysis-lower">
<<<<<<< HEAD
          <div className="panel detail-panel" style={{ flex: '1 1 500px' }}>
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Site record</span>
                <h2>NASA and LOLA altimetry parameters</h2>
=======
          <GlareHover
            glareColor="rgba(145, 198, 212, 0.18)"
            glareSize={360}
            glareOpacity={0.35}
            style={{ borderRadius: '14px', flex: '1 1 500px' }}
          >
            <div className="panel detail-panel" style={{ height: '100%' }}>
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Site record</span>
                  <h2>NASA and LOLA altimetry parameters</h2>
                </div>
                <Database size={16} />
>>>>>>> parent of fac9d7f (Merge branch 'main' of https://github.com/rimshaagrawal/awilix2.0)
              </div>
              <Database size={16} />
            </div>

            <div className="detail-grid">
              <div>
                <span>Coordinates</span>
                <strong>
                  {formatCoordinate(site.lat, 'N', 'S')} · {formatCoordinate(site.lon, 'E', 'W')}
                </strong>
              </div>
              <div>
                <span>Elevation relief</span>
                <strong>{site.elevationReliefM.toLocaleString()} m</strong>
              </div>
              <div>
                <span>Water-ice potential</span>
                <strong>{site.waterIcePotential}</strong>
              </div>
              <div>
                <span>Mission partner</span>
                <strong>{site.contractor}</strong>
              </div>
              {site.craterDiameterKm !== undefined && site.craterDiameterKm > 0 && (
                <div>
                  <span>Crater diameter</span>
                  <strong>{site.craterDiameterKm} km</strong>
                </div>
              )}
              {site.craterDepthKm !== undefined && site.craterDepthKm > 0 && (
                <div>
                  <span>Crater depth</span>
                  <strong>{site.craterDepthKm} km</strong>
                </div>
              )}
            </div>

            {site.whyNASAChose && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                <span className="eyebrow">NASA site rationale</span>
                <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6 }}>
                  <ScrollReveal key={`rationale-${site.id}`} blurStrength={3} stagger={0.02}>
                    {site.whyNASAChose}
                  </ScrollReveal>
                </p>
              </div>
            )}

            {site.funFact && (
              <div
                style={{
                  marginTop: 14,
                  background: 'var(--surface-raised)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span className="eyebrow" style={{ color: 'var(--accent-solar)' }}>
                  Site observation
                </span>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.55 }}>
                  <ScrollReveal key={`fact-${site.id}`} blurStrength={3} stagger={0.02}>
                    {site.funFact}
                  </ScrollReveal>
                </p>
              </div>
            )}

            <div className="goal-list">
              <span className="eyebrow">Primary science objectives</span>
              {site.keyScienceGoals.map((goal) => (
                <span key={goal}>
                  <Check size={13} />
                  {goal}
                </span>
              ))}
            </div>
          </GlareHover>

<<<<<<< HEAD
          <div className="panel limitation-panel" style={{ flex: '1 1 300px' }}>
            <div className="limitation-icon">
              <CircleHelp size={18} />
            </div>
            <span className="eyebrow">Scientific fidelity notice</span>
            <h3>Local 20m altimetry vs far-field terrain</h3>
            <p>
              Calculations combine official NASA 2026 lunar ephemeris tables with 20-meter LOLA altimetry models.
              While local slopes and crater walls are mapped at meter resolution, distant horizon rims beyond the 20km tile
              boundary are modeled via the reference sphere.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: 12 }}>
              <Magnet padding={35} magnetStrength={3} maxOffset={10}>
                <button className="text-button" onClick={() => onNavigate('scenario')}>
                  Review scenario assumptions <ArrowUpRight size={13} />
                </button>
              </Magnet>
            </div>
          </div>
=======
          <GlareHover
            glareColor="rgba(240, 169, 112, 0.16)"
            glareSize={320}
            glareOpacity={0.3}
            style={{ borderRadius: '14px', flex: '1 1 300px' }}
          >
            <div className="panel limitation-panel" style={{ height: '100%' }}>
              <div className="limitation-icon">
                <CircleHelp size={18} />
              </div>
              <span className="eyebrow">Scientific fidelity notice</span>
              <h3>Local 20m altimetry vs far-field terrain</h3>
              <p>
                Calculations combine official NASA 2026 lunar ephemeris tables with 20-meter LOLA altimetry models.
                While local slopes and crater walls are mapped at meter resolution, distant horizon rims beyond the 20km tile
                boundary are modeled via the reference sphere.
              </p>
              <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                <Magnet padding={35} magnetStrength={3} maxOffset={10}>
                  <Magnet padding={35} magnetStrength={3} maxOffset={10}>
                    <button className="text-button" onClick={() => onNavigate('scenario')}>
                      Review scenario assumptions <ArrowUpRight size={13} />
                    </button>
                  </Magnet>
                </Magnet>
              </div>
            </div>
          </GlareHover>
>>>>>>> parent of fac9d7f (Merge branch 'main' of https://github.com/rimshaagrawal/awilix2.0)
        </div>
      </div>
    </AnimatedContent>
  );
};

export default AnalysisView;
