import React from 'react';
import { Info } from 'lucide-react';
import type { Site, Scenario } from '@/types';
import { getSummary } from '@/lib/scenarioCalculations';
import { Sparkline } from '@/components/common/Sparkline';

interface ChartPanelProps {
  site: Site;
  scenario: Scenario;
}

export const ChartPanel: React.FC<ChartPanelProps> = ({ site, scenario }) => {
  const summary = getSummary(site, scenario);

  return (
    <div className="chart-panel">
      <div className="chart-panel-head">
        <div>
          <span className="eyebrow">Time series · {scenario.windowHours}h window</span>
          <h3>Illumination and link profile</h3>
        </div>
        <div className="chart-legend">
          <span>
            <i className="legend-sun" />
            Sun visibility
          </span>
          <span>
            <i className="legend-earth" />
            Earth visibility
          </span>
          <span>
            <i className="legend-power" />
            Power opportunity
          </span>
        </div>
      </div>

      <div className="chart-axis">
        <span>100%</span>
        <span>75%</span>
        <span>50%</span>
        <span>25%</span>
        <span>0%</span>
        <div className="chart-lines">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="chart-area">
          <Sparkline samples={summary.samples} dataKey="sun" color="#eac18b" />
          <Sparkline samples={summary.samples} dataKey="earth" color="#5ec4be" />
          <Sparkline samples={summary.samples} dataKey="power" color="#9aaeff" />
        </div>
      </div>

      <div className="chart-labels">
        {summary.samples.map((sample) => (
          <span key={sample.label}>{sample.label}</span>
        ))}
      </div>

      <div className="chart-footnote">
        <Info size={13} />
        <span>
          Legacy illustrative series. This chart is not generated from Scenario Lab's science-worker samples and must not be interpreted as a NASA ephemeris result.
        </span>
      </div>
    </div>
  );
};

export default ChartPanel;
