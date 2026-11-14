import React, { useState } from 'react';
import { Layers, LayoutGrid } from 'lucide-react';
import type { Scenario } from '@/types';
import { sites } from '@/data/sites';
import { SectionTitle } from '@/components/common/SectionTitle';
import { SiteCard } from '@/components/sites/SiteCard';
import { AnimatedContent } from '@/components/reactbits/AnimatedContent';
import { ScrollStack } from '@/components/reactbits/ScrollStack';

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
  onSelectSite,
  onOpenSite,
}) => {
  const [layoutMode, setLayoutMode] = useState<'stack' | 'grid'>('grid');

  return (
    <AnimatedContent distance={50} direction="vertical">
      <div className="view-stack">
        <SectionTitle
          eyebrow="Candidate sites / 03"
          title="Candidate landing sites"
          animateTitle={true}
          description="Shortlisted south-pole sites from the NASA and LOLA catalog. Telemetry updates with the active mission window."
          action={
            <div className="site-toolbar">
              {/* View Layout Toggle: Grid vs React Bits Scroll Stack */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '2px',
                }}
              >
                <button
                  className="icon-button"
                  onClick={() => setLayoutMode('grid')}
                  title="Grid Layout"
                  style={{
                    background: layoutMode === 'grid' ? 'var(--surface-raised)' : 'transparent',
                    border: 'none',
                    color: layoutMode === 'grid' ? '#f0ebe1' : '#687a86',
                    padding: '4px 8px',
                    borderRadius: '6px',
                  }}
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => setLayoutMode('stack')}
                  title="Stack Layout"
                  style={{
                    background: layoutMode === 'stack' ? 'var(--surface-raised)' : 'transparent',
                    border: 'none',
                    color: layoutMode === 'stack' ? '#f0a970' : '#687a86',
                    padding: '4px 8px',
                    borderRadius: '6px',
                  }}
                >
                  <Layers size={14} />
                </button>
              </div>
            </div>
          }
        />

        {layoutMode === 'stack' ? (
          <ScrollStack topOffset={30} stackSpacing={18} scaleDecay={0.015}>
            {sites.map((site, index) => (
              <div key={site.id} style={{ maxWidth: '780px', margin: '0 auto', width: '100%' }}>
                <SiteCard
                  site={site}
                  index={index}
                  scenario={scenario}
                  onOpen={() => {
                    onSelectSite(site.id);
                    onOpenSite(site.id);
                  }}
                />
              </div>
            ))}
          </ScrollStack>
        ) : (
          <div className="site-grid">
            {sites.map((site, index) => (
              <SiteCard
                key={site.id}
                site={site}
                index={index}
                scenario={scenario}
                onOpen={() => {
                  onSelectSite(site.id);
                  onOpenSite(site.id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </AnimatedContent>
  );
};

export default SitesView;
