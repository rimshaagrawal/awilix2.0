import React from 'react';
import { BarChart3, ArrowUpRight, Plus, X } from 'lucide-react';
import type { Scenario } from '@/types';
import { sites, getSite } from '@/data/sites';
import { getSummary, SITE_COLORS } from '@/lib/scenarioCalculations';
import { SectionTitle } from '@/components/common/SectionTitle';
import { MiniBars } from '@/components/common/MiniBars';

interface CompareViewProps {
  scenario: Scenario;
  compareIds: string[];
  onToggleCompare: (id: string) => void;
  onOpenSite: (id: string) => void;
}

export const CompareView: React.FC<CompareViewProps> = ({
  scenario,
  compareIds,
  onToggleCompare,
  onOpenSite,
}) => {
  const comparisonSites = compareIds.map(getSite);

  const rows: { label: string; key: 'sunlight' | 'earth' | 'power' | 'comm'; color: string }[] = [
    { label: 'Solar visibility', key: 'sunlight', color: '#f0a970' },
    { label: 'Earth visibility', key: 'earth', color: '#65d5d0' },
    { label: 'Power opportunity', key: 'power', color: '#9aaeff' },
    { label: 'Comm window', key: 'comm', color: '#9dde9b' },
  ];

  return (
    <div className="view-stack">
      <SectionTitle
        eyebrow="COMPARE SITES / 04"
        title="Trade-offs, made legible."
        description="Compare the current mission window without collapsing the science into a single unexplained score."
        action={
          <button
            className="primary-button"
            onClick={() => {
              const nextSite = sites.find((s) => !compareIds.includes(s.id));
              if (nextSite) onToggleCompare(nextSite.id);
            }}
          >
            <Plus size={15} /> Add site
          </button>
        }
      />

      {/* Compare Site Selection Chips */}
      <div className="compare-chips">
        {sites.map((site, index) => {
          const isSelected = compareIds.includes(site.id);
          const color = SITE_COLORS[index % SITE_COLORS.length];
          return (
            <button
              key={site.id}
              className={isSelected ? 'chip-active' : ''}
              onClick={() => onToggleCompare(site.id)}
            >
              <i style={{ background: color }} />
              {site.shortName}
              {isSelected && <X size={13} />}
            </button>
          );
        })}
      </div>

      {comparisonSites.length === 0 ? (
        <div className="empty-panel">
          <BarChart3 size={25} />
          <h3>Select at least one candidate</h3>
          <p>Choose sites above to build a side-by-side comparison matrix.</p>
        </div>
      ) : (
        <>
          {/* Comparison Bars Panel */}
          <div className="panel comparison-chart">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">NORMALIZED COMPARISON · {scenario.windowHours}H</span>
                <h2>Mission opportunity profile</h2>
              </div>
              <span className="chart-unit">0–100% normalized</span>
            </div>

            <div className="compare-bars">
              {rows.map((row) => (
                <div className="compare-row" key={row.key}>
                  <div className="compare-row-label">
                    <span>{row.label}</span>
                    <small>reference estimate</small>
                  </div>
                  <div className="compare-row-bars">
                    {comparisonSites.map((site) => {
                      const summary = getSummary(site, scenario);
                      const val = summary[row.key];
                      return (
                        <div
                          className="compare-bar-wrap"
                          key={site.id}
                          title={`${site.shortName}: ${val}%`}
                        >
                          <div
                            className="compare-bar"
                            style={{ height: `${val}%`, background: row.color }}
                          >
                            <span>{val}</span>
                          </div>
                          <small>{site.shortName}</small>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="panel compare-table">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">SITE BREAKDOWN</span>
                <h2>Keep the context attached</h2>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Sunlight</th>
                    <th>Earth link</th>
                    <th>Relief</th>
                    <th>Water Ice</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonSites.map((site) => {
                    const summary = getSummary(site, scenario);
                    const index = sites.findIndex((s) => s.id === site.id);
                    const color = SITE_COLORS[index % SITE_COLORS.length];

                    return (
                      <tr key={site.id}>
                        <td>
                          <button
                            className="table-site"
                            onClick={() => onOpenSite(site.id)}
                          >
                            <i style={{ background: color }} />
                            <strong>{site.shortName}</strong>
                          </button>
                        </td>
                        <td>
                          <MiniBars value={summary.sunlight} color="#f0a970" />
                        </td>
                        <td>
                          <MiniBars value={summary.earth} color="#65d5d0" />
                        </td>
                        <td>{site.elevationReliefM.toLocaleString()} m</td>
                        <td>
                          <span style={{ fontSize: 9, color: '#65d5d0' }}>
                            {site.waterIcePotential.split('·')[0]}
                          </span>
                        </td>
                        <td>
                          <button
                            className="text-button"
                            onClick={() => onOpenSite(site.id)}
                          >
                            Analyze <ArrowUpRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CompareView;

