import React from 'react';
import { MessageCircle, Bot, Check, ArrowUpRight, Cpu, Info } from 'lucide-react';
import type { Site, Scenario, SiteSummary } from '@/types';
import { AstraAvatar } from '@/components/common/AstraAvatar';
import { Magnet } from '@/components/reactbits/Magnet';

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
          <span className="eyebrow">Mission assistant</span>
          <h1>
            Telemetry guidance
            <br />
            and mission context.
          </h1>
          <p>
            Astra is context-aware by design. The assistant reads active site coordinates, scenario parameters,
            candidate comparisons, and LOLA altimetry models to explain the science on screen.
          </p>
          <Magnet padding={40} magnetStrength={3} maxOffset={10}>
            <button className="primary-button" onClick={onOpenChat}>
            Open Astra channel <MessageCircle size={15} />
          </button>
          </Magnet>
        </div>

        <div className="astra-stage">
          <AstraAvatar size={96} />
          <div className="astra-stage-label">
            <span>Astra-01</span>
            <b>Telemetry linked</b>
          </div>
        </div>
      </div>

      {/* Info Grid: Capabilities & Current Context */}
      <div className="astra-info-grid">
        <div className="panel astra-capabilities">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Capabilities</span>
              <h2>Ask about active telemetry</h2>
            </div>
            <Bot size={16} />
          </div>

          {[
            'Interpret solar illumination windows and power curves',
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
              <ArrowUpRight size={13} />
            </div>
          ))}
        </div>

        <div className="panel astra-context-card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Current context</span>
              <h2>Active telemetry inputs</h2>
            </div>
            <Cpu size={16} />
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
