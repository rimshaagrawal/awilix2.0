import React from 'react';
import { BarChart3, ArrowUpRight, X } from 'lucide-react';
import type { Scenario } from '@/types';
import { sites, getSite } from '@/data/sites';
import { getSummary, SITE_COLORS } from '@/lib/scenarioCalculations';
import { SectionTitle } from '@/components/common/SectionTitle';
import { MiniBars } from '@/components/common/MiniBars';
import { AnimatedContent } from '@/components/reactbits/AnimatedContent';

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
    { label: 'Solar visibility', key: 'sunlight', color: '#eac18b' },
    { label: 'Earth visibility', key: 'earth', color: '#5ec4be' },
    { label: 'Power opportunity', key: 'power', color: '#9aaeff' },
    { label: 'Comm window', key: 'comm', color: '#4cc38a' },
  ];

  return (
    <AnimatedContent distance={45} direction="vertical">
      <div className="view-stack">
        <SectionTitle
          eyebrow=""
          title="Trade-offs, made legible"
          animateTitle={true}
          description="Compare the current mission window without collapsing the science into a single unexplained score."
        />

      <div className="compare-chips">
        {sites.map((site, index) => {
          const isSelected = compareIds.includes(site.id);
          return (
            <button
              key={site.id}
              className={isSelected ? 'chip-active' : ''}
              onClick={() => onToggleCompare(site.id)}
            >
              <i style={{ background: SITE_COLORS[index % SITE_COLORS.length] }} />
              {site.shortName}
              {isSelected && <X size={13} />}
            </button>
          );
        })}
      </div>

      {comparisonSites.length === 0 ? (
        <div className="empty-panel">
          <BarChart3 size={24} />
          <h3>Select at least one candidate</h3>
          <p>Choose sites above to build a comparison.</p>
        </div>
      ) : (
        <>
          <div className="panel comparison-chart">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Normalized comparison · {scenario.windowHours}h</span>
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
                      const value = summary[row.key];
                      return (
                        <div
                          className="compare-bar-wrap"
                          key={site.id}
                          title={`${site.shortName}: ${value}%`}
                        >
                          <div
                            className="compare-bar"
                            style={{
                              height: `${Math.max(4, value)}%`,
                              background: row.color,
                            }}
                          >
                            <span>{value}</span>
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

          <div className="panel compare-table">
            <div className="panel-heading">
              <div>
                <h2>Candidate parameter breakdown</h2>
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
                    <th>Record</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonSites.map((site) => {
                    const summary = getSummary(site, scenario);
                    const siteColorIndex = sites.findIndex((item) => item.id === site.id);
                    const siteColor = SITE_COLORS[siteColorIndex % SITE_COLORS.length];

                    return (
                      <tr key={site.id}>
                        <td>
                          <button
                            className="table-site"
                            onClick={() => onOpenSite(site.id)}
                          >
                            <i style={{ background: siteColor }} />
                            {site.shortName}
                          </button>
                        </td>
                        <td>
                          <MiniBars value={summary.sunlight} color="#eac18b" />
                        </td>
                        <td>
                          <MiniBars value={summary.earth} color="#5ec4be" />
                        </td>
                        <td className="font-mono">
                          {site.elevationReliefM.toLocaleString()} m
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
    </AnimatedContent>
  );
};

export default CompareView;
