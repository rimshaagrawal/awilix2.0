import React from 'react';
import { MessageCircle, Sparkles, Check, ArrowUpRight, Cpu, Info } from 'lucide-react';
import type { Site, Scenario, SiteSummary } from '@/types';
import { AstraAvatar } from '@/components/common/AstraAvatar';

interface AstraViewProps {
  selectedSite: Site;
  summary: SiteSummary;
  scenario: Scenario;
  onOpenChat: () => void;
}

export const AstraView: React.FC<AstraViewProps> = ({
  selectedSite,
  summary,
  scenario,
  onOpenChat,
}) => {
  return (
    <div className="view-stack astra-page">
      {/* Astra Hero Stage */}
      <div className="astra-hero">
        <div>
          <span className="eyebrow">ASTRA / 06</span>
          <h1>
            Your mission
            <br />
            <em>co-pilot.</em>
          </h1>
          <p>
            Astra is context-aware by design. She reads the active AWILIX site, scenario assumptions,
            comparison matrices, and LOLA altimetry charts so explanations stay anchored to the mission
            in front of you.
          </p>
          <button className="primary-button" onClick={onOpenChat}>
            Open Astra channel <MessageCircle size={16} />
          </button>
        </div>

        <div className="astra-stage">
          <div className="astra-stage-grid" />
          <AstraAvatar />
          <div className="astra-stage-label">
            <span>ASTRA-01</span>
            <b>CONTEXT AWARE</b>
          </div>
        </div>
      </div>

      {/* Info Grid: Capabilities & Current Context */}
      <div className="astra-info-grid">
        <div className="panel astra-capabilities">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">CAPABILITIES</span>
              <h2>Ask about what you can see.</h2>
            </div>
            <Sparkles size={17} />
          </div>

          {[
            'Interpret solar illumination windows & power curves',
            'Explain Direct-to-Earth (DTE) comm visibility and libration wobbles',
            'Compare candidate landing zones side-by-side',
            'Translate 20m LOLA terrain slopes and water-ice cold traps into plain English',
            'Assess impact of lander height, antenna elevation, and array tilt',
          ].map((item) => (
            <div className="capability" key={item}>
              <span>
                <Check size={13} />
              </span>
              {item}
              <ArrowUpRight size={14} />
            </div>
          ))}
        </div>

        <div className="panel astra-context-card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">CURRENT CONTEXT</span>
              <h2>What Astra can read</h2>
            </div>
            <Cpu size={17} />
          </div>

          <div className="context-list">
            <div>
              <span>Active target</span>
              <strong>{selectedSite.name}</strong>
            </div>
            <div>
              <span>Mission window</span>
              <strong>
                {scenario.date} · {scenario.windowHours}h
              </strong>
            </div>
            <div>
              <span>Sunlight availability</span>
              <strong>{summary.sunlight}% reference estimate</strong>
            </div>
            <div>
              <span>Earth DTE link</span>
              <strong>{summary.earth}% line-of-sight</strong>
            </div>
            <div>
              <span>Topographic relief</span>
              <strong>{selectedSite.elevationReliefM.toLocaleString()} m</strong>
            </div>
            <div>
              <span>Water-ice potential</span>
              <strong>{selectedSite.waterIcePotential.split('·')[0]}</strong>
            </div>
          </div>

          <div className="context-note">
            <Info size={14} />
            Astra answers locally from the current session telemetry context. No fabricated mission values.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AstraView;

