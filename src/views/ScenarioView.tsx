import React, { useEffect, useMemo, useState } from 'react';
import {
  Settings2,
  CalendarDays,
  Clock3,
  Sun,
  Globe2,
  Radio,
  Info,
  ArrowUpRight,
  Database,
  AlertTriangle,
  LoaderCircle,
} from 'lucide-react';
import type { Site, Scenario, View } from '@/types';
import { sites } from '@/data/sites';
import { DEFAULT_SCENARIO } from '@/lib/scenarioCalculations';
import { requestScenarios } from '@/lib/scienceClient';
import { SectionTitle } from '@/components/common/SectionTitle';
import { Magnet } from '@/components/reactbits/Magnet';
import { RangeControl } from '@/components/common/RangeControl';
import { DeltaCard } from '@/components/common/DeltaCard';
import { ScenarioScienceChart } from '@/components/charts/ScenarioScienceChart';

interface ScenarioViewProps {
  site: Site;
  scenario: Scenario;
  onUpdateScenario: <K extends keyof Scenario>(key: K, value: Scenario[K]) => void;
  onSelectSite: (id: string) => void;
  onNavigate: (view: View) => void;
}

type HorizonMode = 'reference' | 'terrain';
type ScenarioScienceResult = {
  site: Site;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  mode: HorizonMode;
  path: any[];
  power: any;
  comm: any;
  sources: string[];
  stepMinutes: number;
  method: string;
  validation: string;
  terrainMetadata?: any;
  terrainExtent?: { widthKm: number; heightKm: number };
};

function scenarioInput(site: Site, value: Scenario, mode: HorizonMode) {
  return {
    site,
    date: value.date,
    hours: value.windowHours,
    mode,
    solarHeight: value.observerHeight,
    antennaHeight: value.antennaHeight,
    panelTilt: value.panelTilt,
    panelAzimuth: value.panelAzimuth,
  };
}

export const ScenarioView: React.FC<ScenarioViewProps> = ({
  site,
  scenario,
  onUpdateScenario,
  onSelectSite,
  onNavigate,
}) => {
  const [horizonMode, setHorizonMode] = useState<HorizonMode>('reference');
  const [results, setResults] = useState<{ custom: ScenarioScienceResult; reference: ScenarioScienceResult } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    setResults(null);
    requestScenarios([
      scenarioInput(site, scenario, horizonMode),
      scenarioInput(site, DEFAULT_SCENARIO, horizonMode),
    ]).then(({ results: pair }) => {
      if (!current) return;
      if (!Array.isArray(pair) || pair.length !== 2) throw new Error('Science worker returned an incomplete comparison.');
      setResults({ custom: pair[0], reference: pair[1] });
      setLoading(false);
    }).catch((cause: unknown) => {
      if (!current) return;
      setError(cause instanceof Error ? cause.message : 'Science analysis failed. No scenario values are available.');
      setLoading(false);
    });
    return () => { current = false; };
  }, [site, scenario.date, scenario.windowHours, scenario.observerHeight, scenario.antennaHeight, scenario.panelTilt, scenario.panelAzimuth, horizonMode]);

  const handleReset = () => {
    onUpdateScenario('date', DEFAULT_SCENARIO.date);
    onUpdateScenario('windowHours', DEFAULT_SCENARIO.windowHours);
    onUpdateScenario('observerHeight', DEFAULT_SCENARIO.observerHeight);
    onUpdateScenario('antennaHeight', DEFAULT_SCENARIO.antennaHeight);
    onUpdateScenario('panelTilt', DEFAULT_SCENARIO.panelTilt);
    onUpdateScenario('panelAzimuth', DEFAULT_SCENARIO.panelAzimuth);
    setHorizonMode('reference');
  };

  const customMetrics = useMemo(() => results ? ({
    sunlight: results.custom.power.availabilityPercent,
    earth: results.custom.comm.availabilityPercent,
    incidence: results.custom.power.avgEfficiency,
    outage: results.custom.comm.longestOutageHours,
  }) : null, [results]);
  const referenceMetrics = useMemo(() => results ? ({
    sunlight: results.reference.power.availabilityPercent,
    earth: results.reference.comm.availabilityPercent,
    incidence: results.reference.power.avgEfficiency,
    outage: results.reference.comm.longestOutageHours,
  }) : null, [results]);

  const sunDelta = customMetrics && referenceMetrics && Number.isFinite(customMetrics.sunlight) && Number.isFinite(referenceMetrics.sunlight)
    ? customMetrics.sunlight - referenceMetrics.sunlight
    : null;
  const displayDate = (date: string) => `${date} 00:00 UTC`;

  return (
    <div className="view-stack">
      <SectionTitle
        eyebrow="Scenario lab"
        title="Modify mission assumptions"
        description="Run the selected site and date through Awilix’s ephemeris and visibility calculations, then compare the result with the reference case."
        action={<div className="scenario-status"><span className="status-dot" />{loading ? 'Calculating' : error ? 'Calculation unavailable' : 'Science calculation'}</div>}
      />

      <div className="scenario-grid">
        <div className="panel scenario-controls">
          <div className="panel-heading">
            <div><span className="eyebrow">Scenario inputs</span><h2>Mission assumptions</h2></div>
            <Settings2 size={16} />
          </div>

          <label className="control-label">
            Active site
            <select value={site.id} onChange={(event) => onSelectSite(event.target.value)}>
              {sites.map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}
            </select>
          </label>

          <label className="control-label">
            Mission date
            <div className="input-with-icon">
              <CalendarDays size={14} />
              <input type="date" value={scenario.date} onChange={(event) => onUpdateScenario('date', event.target.value)} />
            </div>
            <small>Analysis starts at {displayDate(scenario.date)}.</small>
          </label>

          <div className="control-label">
            Time window
            <div className="segmented-control">
              {[24, 48, 168, 336].map((hours) => (
                <button key={hours} className={scenario.windowHours === hours ? 'active' : ''} onClick={() => onUpdateScenario('windowHours', hours)}>
                  {hours < 168 ? `${hours}h` : `${hours / 24}d`}
                </button>
              ))}
            </div>
          </div>

          <label className="control-label">
            Visibility horizon
            <select value={horizonMode} onChange={(event) => setHorizonMode(event.target.value as HorizonMode)}>
              <option value="reference">Spherical reference horizon</option>
              <option value="terrain">Local terrain crop · experimental</option>
            </select>
            <small>Terrain mode uses the bundled local crop; missing or uncovered terrain is reported as unknown.</small>
          </label>

          <RangeControl label="Solar array height" value={scenario.observerHeight} min={0} max={20} step={1} unit=" m" onChange={(value) => onUpdateScenario('observerHeight', value)} />
          <RangeControl label="Antenna height" value={scenario.antennaHeight} min={0} max={30} step={1} unit=" m" onChange={(value) => onUpdateScenario('antennaHeight', value)} />
          <RangeControl label="Panel tilt from horizontal" value={scenario.panelTilt} min={0} max={90} step={1} unit="°" onChange={(value) => onUpdateScenario('panelTilt', value)} />
          <RangeControl label="Panel normal azimuth · clockwise from north" value={scenario.panelAzimuth} min={0} max={360} step={5} unit="°" onChange={(value) => onUpdateScenario('panelAzimuth', value)} />

          <Magnet padding={35} magnetStrength={3} maxOffset={10}>
            <button className="quiet-button full-button" onClick={handleReset}>Reset to reference <Clock3 size={14} /></button>
          </Magnet>
        </div>

        <div className="scenario-results">
          <div className="panel scenario-result-hero">
            <div>
              <span className="eyebrow">{loading ? 'Running science worker' : `Calculated · ${site.shortName}`}</span>
              <h2>Custom scenario delta</h2>
              <p>
                Custom start: {displayDate(scenario.date)} for {scenario.windowHours} hours. Reference: {displayDate(DEFAULT_SCENARIO.date)} for {DEFAULT_SCENARIO.windowHours} hours at the same site. Changes in date, duration, or equipment can all contribute to the delta.
              </p>
            </div>
            <div className="delta-orbit">
              <div className="delta-ring"><strong>{sunDelta == null ? '—' : `${sunDelta > 0 ? '+' : ''}${sunDelta.toFixed(1)} pp`}</strong><span>Sun visibility</span></div>
            </div>
          </div>

          {error && <div className="panel" role="alert" style={{ padding: 16, borderColor: 'rgba(248,113,113,.5)', color: '#fecaca' }}><AlertTriangle size={16} /> {error} No synthetic fallback is shown.</div>}

          {loading && <div className="panel" role="status" style={{ padding: 24, display: 'flex', gap: 10, alignItems: 'center' }}><LoaderCircle size={18} className="spin" /> Loading ephemeris and calculating visibility intervals…</div>}

          {results && customMetrics && referenceMetrics && (
            <>
              <div className="delta-grid">
                <DeltaCard label="Sun above selected horizon" reference={referenceMetrics.sunlight} custom={customMetrics.sunlight} icon={Sun} />
                <DeltaCard label="Earth center above horizon" reference={referenceMetrics.earth} custom={customMetrics.earth} icon={Globe2} />
                <DeltaCard label="Mean panel incidence while Sun-visible" reference={referenceMetrics.incidence} custom={customMetrics.incidence} icon={Database} />
                <DeltaCard label="Longest geometric Earth outage" reference={referenceMetrics.outage} custom={customMetrics.outage} icon={Radio} unit="h" higherIsBetter={false} />
              </div>

              <ScenarioScienceChart analysis={results.custom} />

              <div className="scenario-method">
                <Info size={15} />
                <span>Open the full site analysis to see charts and terrain.</span>
                <Magnet padding={35} magnetStrength={3} maxOffset={10}><button className="text-button" onClick={() => onNavigate('analysis')}>Open full analysis <ArrowUpRight size={13} /></button></Magnet>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScenarioView;
