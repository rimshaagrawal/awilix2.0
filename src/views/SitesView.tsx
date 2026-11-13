import React, { useState } from 'react';
import { Search, SlidersHorizontal, Info, ArrowUpRight } from 'lucide-react';
import type { Scenario } from '@/types';
import { sites } from '@/data/sites';
import { SectionTitle } from '@/components/common/SectionTitle';
import { SiteCard } from '@/components/sites/SiteCard';

interface SitesViewProps {
  scenario: Scenario;
  selectedSiteId: string;
  compareIds: string[];
  onSelectSite: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onOpenSite: (id: string) => void;
}

export const SitesView: React.FC<SitesViewProps> = ({
  scenario,
  selectedSiteId,
  compareIds,
  onSelectSite,
  onToggleCompare,
  onOpenSite,
}) => {
  const [query, setQuery] = useState('');

  const visibleSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(query.toLowerCase()) ||
      site.targetRegion.toLowerCase().includes(query.toLowerCase()) ||
      site.mission.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="view-stack">
      <SectionTitle
        eyebrow="CANDIDATE SITES / 02"
        title="Six places worth watching."
        description="The shortlist is drawn from the AWILIX south-pole catalog. Values update with the current mission window."
        action={
          <div className="site-toolbar">
            <div className="search-input">
              <Search size={15} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sites or regions..."
              />
            </div>
            <button className="quiet-button">
              <SlidersHorizontal size={14} /> Sort: sunlight
            </button>
          </div>
        }
      />

      <div className="sites-note">
        <span>
          <Info size={15} />
          <strong>{compareIds.length} sites</strong> selected for comparison
        </span>
        <button
          className="text-button"
          onClick={() => onToggleCompare(selectedSiteId)}
        >
          {compareIds.includes(selectedSiteId) ? 'Remove selected' : 'Add selected'}{' '}
          <ArrowUpRight size={13} />
        </button>
      </div>

      <div className="site-grid">
        {visibleSites.map((site) => {
          const index = sites.findIndex((item) => item.id === site.id);
          const isSelected = compareIds.includes(site.id);

          return (
            <SiteCard
              key={site.id}
              site={site}
              index={index}
              selected={isSelected}
              scenario={scenario}
              onSelect={() => onToggleCompare(site.id)}
              onOpen={() => {
                onSelectSite(site.id);
                onOpenSite(site.id);
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default SitesView;

