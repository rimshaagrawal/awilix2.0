import React from 'react';
import { Move3d, Compass, Sun, Globe2, Radio, ArrowUpRight } from 'lucide-react';
import type { Scenario } from '@/types';
import { sites, getSite } from '@/data/sites';
import { getSummary, formatCoordinate, SITE_COLORS } from '@/lib/scenarioCalculations';
import { SectionTitle } from '@/components/common/SectionTitle';
import { MoonGlobe3D } from '@/components/globe/MoonGlobe3D';
import { AnimatedContent } from '@/components/reactbits/AnimatedContent';

interface GlobeViewProps {
  scenario: Scenario;
  selectedSiteId: string;
  onSelectSite: (id: string) => void;
  onOpenSite?: (id: string) => void;
}

export const GlobeView: React.FC<GlobeViewProps> = ({
  scenario,
  selectedSiteId,
  onSelectSite,
  onOpenSite,
}) => {
  const site = getSite(selectedSiteId);
  const summary = getSummary(site, scenario);

  return (
    <AnimatedContent distance={45} direction="vertical">
      <div className="view-stack">
        <SectionTitle
          eyebrow=""
          title="The south pole, in context"
          animateTitle={true}
          description="Authentic 3D Celestial System with NASA 3D LRO topographic geometry. Rotate, zoom, and select candidate landing site markers."
          action={
            <div className="view-tools">
              <span>
                <Move3d size={14} />
                Interactive 3D View
              </span>
              <button className="icon-button" title="North orientation">
                <Compass size={16} />
              </button>
            </div>
          }
        />

        <div className="globe-layout">
          {/* Large 3D Moon Globe Panel */}
          <div className="panel large-globe-panel">
            <MoonGlobe3D
              selectedSiteId={selectedSiteId}
              onSelectSite={onSelectSite}
              initialVectorMode="all"
            />
          </div>

          {/* Selected Site Readout Panel */}
          <div className="panel selected-readout">
              <div className="readout-label">
                <span className="site-status">
                  <span />
                  Tracked
                </span>
              </div>

              <h2>{site.name}</h2>
              <p>{site.targetRegion}</p>

              {onOpenSite && (
                <div style={{ marginTop: 10, marginBottom: 4 }}>
                  <button
                    className="text-button"
                    onClick={() => onOpenSite(selectedSiteId)}
                  >
                    Learn more <ArrowUpRight size={14} />
                  </button>
                </div>
              )}

              <div className="coordinate-block">
                <div>
                  <span>Latitude</span>
                  <strong>{formatCoordinate(site.lat, 'N', 'S')}</strong>
                </div>
                <div>
                  <span>Longitude</span>
                  <strong>{formatCoordinate(site.lon, 'E', 'W')}</strong>
                </div>
              </div>

              <div className="readout-metrics">
                <div>
                  <Sun size={15} />
                  <span>Sunlight</span>
                  <strong>{summary.sunlight}%</strong>
                </div>
                <div>
                  <Globe2 size={15} />
                  <span>Earth link</span>
                  <strong>{summary.earth}%</strong>
                </div>
                <div>
                  <Radio size={15} />
                  <span>Comms</span>
                  <strong>{summary.comm}%</strong>
                </div>
              </div>

              <div className="globe-legend">
                <span className="eyebrow">Candidate markers</span>
                {sites.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectSite(item.id)}
                    className={item.id === selectedSiteId ? 'legend-active' : ''}
                  >
                    <i style={{ background: SITE_COLORS[index % SITE_COLORS.length] }} />
                    {item.shortName}
                    <b>{String(index + 1).padStart(2, '0')}</b>
                  </button>
                ))}
              </div>
            </div>
        </div>
      </div>
    </AnimatedContent>
  );
};

export default GlobeView;
