import React from 'react';
import { Move3d, Compass, Sun, Globe2, Radio, ArrowUpRight } from 'lucide-react';
import type { Scenario } from '@/types';
import { sites, getSite } from '@/data/sites';
import { getSummary, formatCoordinate, SITE_COLORS } from '@/lib/scenarioCalculations';
import { SectionTitle } from '@/components/common/SectionTitle';
import { MoonGlobe3D } from '@/components/globe/MoonGlobe3D';

interface GlobeViewProps {
  scenario: Scenario;
  selectedSiteId: string;
  onSelectSite: (id: string) => void;
  onOpenSite: (id: string) => void;
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
    <div className="view-stack">
      <SectionTitle
        eyebrow="Lunar globe"
        title="The south pole, in context"
        description="Interactive 3D celestial system with NASA LRO topographic geometry and ephemeris orientation. Rotate, zoom, and select candidate landing site markers."
        action={
          <div className="view-tools">
            <span>
              <Move3d size={14} />
              Interactive 3D view
            </span>
            <button className="icon-button" title="North orientation">
              <Compass size={15} />
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
            onVisitTerrain={() => onOpenSite(selectedSiteId)}
          />
        </div>

        {/* Selected Site Readout Panel */}
        <div className="panel selected-readout">
          <div className="readout-label">
            <span className="eyebrow">Selected site</span>
            <span className="site-status">
              <span />
              Tracked
            </span>
          </div>

          <h2>{site.name}</h2>
          <p>{site.targetRegion}</p>

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

          <button
            className="primary-button full-button"
            onClick={() => onOpenSite(site.id)}
          >
            Open 3D terrain analysis <ArrowUpRight size={14} />
          </button>

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
  );
};

export default GlobeView;
