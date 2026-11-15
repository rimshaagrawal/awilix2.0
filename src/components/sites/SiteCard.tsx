import React from 'react';
import { ArrowUpRight, Mountain, Shield } from 'lucide-react';
import type { Site, Scenario } from '@/types';
import { getSummary, formatCoordinate, SITE_COLORS } from '@/lib/scenarioCalculations';
import { Magnet } from '@/components/reactbits/Magnet';

interface SiteCardProps {
  site: Site;
  index: number;
  scenario: Scenario;
  onOpen: () => void;
}

export const SiteCard: React.FC<SiteCardProps> = ({
  site,
  index,
  scenario,
  onOpen,
}) => {
  const summary = getSummary(site, scenario);
  const color = SITE_COLORS[index % SITE_COLORS.length];

  return (
    <article className="site-card" style={{ height: '100%' }}>
      <div className="site-card-top">
          <span
            className="site-index"
            style={{ color }}
          >
            0{index + 1}
          </span>
        </div>

        <div className="site-card-heading">
          <div>
            <h3>{site.name}</h3>
            <p>
              {formatCoordinate(site.lat, 'N', 'S')} · {formatCoordinate(site.lon, 'E', 'W')}
            </p>
          </div>
          <span className="site-status">
            <span />
            {summary.sunlight > 75 ? 'Favourable' : 'Watch'}
          </span>
        </div>

        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Mountain size={13} />
            <span>{site.elevationReliefM.toLocaleString()} m topographic relief</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={13} />
            <span>{site.targetRegion} · {site.waterIcePotential} ice potential</span>
          </div>
        </div>

        <div className="site-card-stats">
          <div>
            <span>Sunlight</span>
            <strong>{summary.sunlight}%</strong>
          </div>
          <div>
            <span>Earth link</span>
            <strong>{summary.earth}%</strong>
          </div>
          <div>
            <span>Power</span>
            <strong>{summary.power}%</strong>
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 10 }}>
          <Magnet padding={40} magnetStrength={3} maxOffset={12}>
            <button
              className="text-button"
              onClick={onOpen}
            >
              Open site analysis <ArrowUpRight size={14} />
            </button>
          </Magnet>
        </div>
      </article>
  );
};

export default SiteCard;
