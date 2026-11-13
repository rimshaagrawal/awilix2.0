import React from 'react';
import { Sun, Globe2, Radio } from 'lucide-react';
import type { Site, Scenario } from '@/types';
import { getSummary } from '@/lib/scenarioCalculations';

interface AstroReadoutProps {
  site: Site;
  scenario: Scenario;
}

export const AstroReadout: React.FC<AstroReadoutProps> = ({ site, scenario }) => {
  const summary = getSummary(site, scenario);

  return (
    <div className="astro-readout">
      <div className="astro-readout-head">
        <div>
          <span className="eyebrow">LOCAL SKY MODEL</span>
          <h3>Polar horizon readout</h3>
        </div>
        <span className="live-pill">
          <span />
          LIVE MODEL
        </span>
      </div>

      <div className="horizon-display">
        <div className="horizon-circle">
          <div className="horizon-cross horizontal" />
          <div className="horizon-cross vertical" />
          <div className="horizon-arc" />
          <div
            className="sky-sun"
            style={{
              transform: `rotate(${28 + Math.abs(summary.peakSunAlt) * 7}deg) translateY(-74px)`,
            }}
          >
            <Sun size={17} />
          </div>
          <div
            className="sky-earth"
            style={{
              transform: `rotate(${145 - site.lon * 0.3}deg) translateY(-58px)`,
            }}
          >
            <Globe2 size={15} />
          </div>
          <span className="horizon-label horizon-n">N</span>
          <span className="horizon-label horizon-e">E</span>
          <span className="horizon-label horizon-s">S</span>
          <span className="horizon-label horizon-w">W</span>
        </div>

        <div className="horizon-values">
          <div>
            <Sun size={14} />
            <span>Sun altitude</span>
            <strong>{summary.peakSunAlt.toFixed(1)}° max</strong>
          </div>
          <div>
            <Globe2 size={14} />
            <span>Earth altitude</span>
            <strong>{summary.peakEarthAlt.toFixed(1)}° max</strong>
          </div>
          <div>
            <Radio size={14} />
            <span>Visibility mode</span>
            <strong>Reference sphere</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AstroReadout;

