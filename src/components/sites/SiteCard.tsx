import React from 'react';
import { Check, ArrowUpRight, Mountain, Shield } from 'lucide-react';
import type { Site, Scenario } from '@/types';
import { getSummary, formatCoordinate, SITE_COLORS } from '@/lib/scenarioCalculations';
import { GlareHover } from '@/components/reactbits/GlareHover';
import { Magnet } from '@/components/reactbits/Magnet';

interface SiteCardProps {
  site: Site;
  index: number;
  selected: boolean;
  scenario: Scenario;
  onSelect: () => void;
  onOpen: () => void;
}

export const SiteCard: React.FC<SiteCardProps> = ({
  site,
  index,
  selected,
  scenario,
  onSelect,
  onOpen,
}) => {
  const summary = getSummary(site, scenario);
  const color = SITE_COLORS[index % SITE_COLORS.length];

  return (
    <GlareHover
      glareColor="rgba(145, 198, 212, 0.22)"
      glareSize={320}
      glareOpacity={0.4}
      style={{ borderRadius: '12px', height: '100%' }}
    >
      <article
        className={`site-card ${selected ? 'site-card-selected' : ''}`}
        style={{ height: '100%', cursor: 'pointer' }}
        onClick={onSelect}
      >
        <div className="site-card-top">
          <span
            className="site-index"
            style={{ color }}
          >
            0{index + 1}
          </span>
          <button
            className={`selection-check ${selected ? 'checked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            aria-label={`${selected ? 'Remove' : 'Add'} ${site.name} ${selected ? 'from' : 'to'} comparison`}
          >
            {selected && <Check size={13} />}
          </button>
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
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
            >
              Open site analysis <ArrowUpRight size={14} />
            </button>
          </Magnet>
        </div>
      </article>
    </GlareHover>
  );
};

export default SiteCard;
