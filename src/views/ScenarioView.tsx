import React from 'react';
import {
  Settings2,
  CalendarDays,
  Clock3,
  Sun,
  Globe2,
  Zap,
  Radio,
  Info,
  ArrowUpRight,
} from 'lucide-react';
import type { Site, Scenario, View } from '@/types';
import { sites } from '@/data/sites';
import { DEFAULT_SCENARIO, getSummary } from '@/lib/scenarioCalculations';
import { SectionTitle } from '@/components/common/SectionTitle';
import { RangeControl } from '@/components/common/RangeControl';
import { DeltaCard } from '@/components/common/DeltaCard';
import { ChartPanel } from '@/components/charts/ChartPanel';

interface ScenarioViewProps {
  site: Site;
  scenario: Scenario;
  onUpdateScenario: <K extends keyof Scenario>(key: K, value: Scenario[K]) => void;
  onSelectSite: (id: string) => void;
  onNavigate: (view: View) => void;
}

export const ScenarioView: React.FC<ScenarioViewProps> = ({
  site,
  scenario,
  onUpdateScenario,
  onSelectSite,
  onNavigate,
}) => {
  const reference = getSummary(site, DEFAULT_SCENARIO);
  const custom = getSummary(site, scenario);
  const sunDelta = custom.sunlight - reference.sunlight;

  const handleReset = () => {
    onUpdateScenario('date', DEFAULT_SCENARIO.date);
    onUpdateScenario('windowHours', DEFAULT_SCENARIO.windowHours);
    onUpdateScenario('observerHeight', DEFAULT_SCENARIO.observerHeight);
    onUpdateScenario('antennaHeight', DEFAULT_SCENARIO.antennaHeight);
    onUpdateScenario('panelTilt', DEFAULT_SCENARIO.panelTilt);
    onUpdateScenario('panelAzimuth', DEFAULT_SCENARIO.panelAzimuth);
  };

  return (
    <div className="view-stack">
      <SectionTitle
        eyebrow="SCENARIO LAB / 05"
        title="Move the mission assumptions."
        description="Change observing geometry, lander height, and solar array angles to test candidate site margins in real time."
        action={
          <div className="scenario-status">
            <span className="status-dot" />
            CUSTOM SCENARIO ACTIVE
          </div>
        }
      />

      <div className="scenario-grid">
        {/* Scenario Controls Panel */}
        <div className="panel scenario-controls">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">SCENARIO INPUTS</span>
              <h2>Mission assumptions</h2>
            </div>
            <Settings2 size={17} />
          </div>

          <label className="control-label">
            ACTIVE SITE
            <select value={site.id} onChange={(e) => onSelectSite(e.target.value)}>
              {sites.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.shortName}
                </option>
              ))}
            </select>
          </label>

          <label className="control-label">
            MISSION DATE
            <div className="input-with-icon">
              <CalendarDays size={15} />
              <input
                type="date"
                value={scenario.date}
                onChange={(e) => onUpdateScenario('date', e.target.value)}
              />
            </div>
          </label>

          <div className="control-label">
            TIME WINDOW
            <div className="segmented-control">
              {[24, 48, 168, 336].map((hours) => (
                <button
                  key={hours}
                  className={scenario.windowHours === hours ? 'active' : ''}
                  onClick={() => onUpdateScenario('windowHours', hours)}
                >
                  {hours < 168 ? `${hours}H` : `${hours / 24}D`}
                </button>
              ))}
            </div>
          </div>

          <RangeControl
            label="Observer height"
            value={scenario.observerHeight}
            min={0}
            max={20}
            step={1}
            unit=" m"
            onChange={(val) => onUpdateScenario('observerHeight', val)}
          />

          <RangeControl
            label="Antenna height"
            value={scenario.antennaHeight}
            min={0}
            max={30}
            step={1}
            unit=" m"
            onChange={(val) => onUpdateScenario('antennaHeight', val)}
          />

          <RangeControl
            label="Panel tilt"
            value={scenario.panelTilt}
            min={0}
            max={90}
            step={1}
            unit="°"
            onChange={(val) => onUpdateScenario('panelTilt', val)}
          />

          <RangeControl
            label="Panel azimuth"
            value={scenario.panelAzimuth}
            min={0}
            max={360}
            step={5}
            unit="°"
            onChange={(val) => onUpdateScenario('panelAzimuth', val)}
          />

          <button className="quiet-button full-button" onClick={handleReset}>
            Reset to reference <Clock3 size={14} />
          </button>
        </div>

        {/* Scenario Results */}
        <div className="scenario-results">
          <div className="panel scenario-result-hero">
            <div>
              <span className="eyebrow">LIVE RESPONSE · {site.shortName}</span>
              <h2>Custom scenario delta</h2>
              <p>
                Compared with the AWILIX reference baseline (2m observer, 2m antenna, 8° panel tilt),
                the current telemetry parameters produce these deviations.
              </p>
            </div>
            <div className="delta-orbit">
              <div className="delta-ring">
                <strong>
                  {sunDelta > 0 ? '+' : ''}
                  {sunDelta}%
                </strong>
                <span>SUNLIGHT</span>
              </div>
              <div className="delta-node">
                <Sun size={14} />
              </div>
            </div>
          </div>

          <div className="delta-grid">
            <DeltaCard
              label="Solar visibility"
              reference={reference.sunlight}
              custom={custom.sunlight}
              icon={Sun}
            />
            <DeltaCard
              label="Earth visibility"
              reference={reference.earth}
              custom={custom.earth}
              icon={Globe2}
            />
            <DeltaCard
              label="Power opportunity"
              reference={reference.power}
              custom={custom.power}
              icon={Zap}
            />
            <DeltaCard
              label="Comm window"
              reference={reference.comm}
              custom={custom.comm}
              icon={Radio}
            />
          </div>

          <ChartPanel site={site} scenario={scenario} />

          <div className="scenario-method">
            <Info size={15} />
            <span>
              Changing solar panel azimuth and tilt adjusts power incidence relative to grazing solar elevation.
              Elevating the comm antenna directly increases Earth line-of-sight margin over nearby rim craters.
            </span>
            <button className="text-button" onClick={() => onNavigate('analysis')}>
              Open full analysis <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioView;

