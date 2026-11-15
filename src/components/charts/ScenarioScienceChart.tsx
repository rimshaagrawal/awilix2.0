import React, { useMemo } from 'react';
import { Info } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ScenarioScienceChartProps {
  analysis: any;
}

function formatOffset(milliseconds: number) {
  const hours = milliseconds / 3_600_000;
  if (hours < 24) return `T+${hours.toFixed(hours % 1 ? 1 : 0)}h`;
  return `T+${(hours / 24).toFixed(hours % 24 ? 1 : 0)}d`;
}

export const ScenarioScienceChart: React.FC<ScenarioScienceChartProps> = ({ analysis }) => {
  const rows = useMemo(() => {
    const start = Date.parse(analysis.startTime);
    return analysis.path.map((point: any) => ({
      time: +new Date(point.time),
      label: formatOffset(+new Date(point.time) - start),
      sunVisible: Number.isFinite(point.sunMargin) ? (point.sunMargin > 0 ? 100 : 0) : null,
      earthVisible: Number.isFinite(point.earthMargin) ? (point.earthMargin > 0 ? 100 : 0) : null,
      panelIncidence: Number.isFinite(point.sunMargin) && Number.isFinite(point.powerEfficiency) ? point.powerEfficiency * 100 : null,
      sunAltitude: Number.isFinite(point.sun.alt) ? point.sun.alt : null,
      earthAltitude: Number.isFinite(point.earth.alt) ? point.earth.alt : null,
    }));
  }, [analysis]);

  const tickEvery = Math.max(1, Math.ceil(rows.length / 8));
  const dataSources = analysis.sources?.join(' · ') || 'Source unavailable';

  return (
    <div className="chart-panel">
      <div className="chart-panel-head">
        <div>
          <span className="eyebrow">Calculated time series · {analysis.hours}h</span>
          <h3>Visibility and panel geometry</h3>
        </div>
        <div className="chart-legend">
          <span><i className="legend-sun" /> Sun above horizon</span>
          <span><i className="legend-earth" /> Earth center above horizon</span>
          <span><i className="legend-power" /> Panel incidence</span>
        </div>
      </div>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="rgba(130,146,154,0.16)" vertical={false} />
            <XAxis
              dataKey="label"
              interval={tickEvery - 1}
              tick={{ fill: '#82929a', fontSize: 10 }}
              axisLine={{ stroke: '#34434b' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fill: '#82929a', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={46}
            />
            <Tooltip
              labelFormatter={(_, payload) => {
                const time = payload?.[0]?.payload?.time;
                return time ? new Date(time).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '';
              }}
              formatter={(value, name) => [value == null ? 'Unknown terrain coverage' : `${Number(value).toFixed(1)}%`, name]}
              contentStyle={{ background: '#10171f', border: '1px solid #2a3a46', borderRadius: 8 }}
            />
            <Line name="Sun above horizon" dataKey="sunVisible" type="stepAfter" stroke="#eac18b" strokeWidth={2} dot={false} connectNulls={false} />
            <Line name="Earth center above horizon" dataKey="earthVisible" type="stepAfter" stroke="#5ec4be" strokeWidth={2} dot={false} connectNulls={false} />
            <Line name="Panel incidence" dataKey="panelIncidence" type="monotone" stroke="#9aaeff" strokeWidth={2} dot={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-footnote" style={{ alignItems: 'flex-start' }}>
        <Info size={13} style={{ marginTop: 2, flex: '0 0 auto' }} />
        <span>
          Base samples every {analysis.stepMinutes} min, with horizon crossings refined to ≤1 s · {dataSources}. Visibility is geometric; panel incidence is not electrical power. Earth visibility is center-of-disk geometry, not a radio link. {analysis.method}.
        </span>
      </div>
    </div>
  );
};

export default ScenarioScienceChart;
