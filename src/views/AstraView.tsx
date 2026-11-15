import React from 'react';
import { MessageCircle, Bot, Check, ArrowUpRight, Cpu, Info, Compass, MousePointerClick } from 'lucide-react';
import { requestAstra } from '@/astra/runtime';
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
    <div className="view-stack astra-page" data-astra="astra-page">
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
            Astra reads the page you are on, your selected site, comparison and scenario, then explains the numbers
            using Awilix's own calculations. Every answer starts short, with an optional “Show why” and its sources.
            Astra always says which numbers come from the full calculation and which are illustrative.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="primary-button" onClick={onOpenChat}>
              Open Astra <MessageCircle size={15} />
            </button>
            <button className="quiet-button" onClick={() => requestAstra({ kind: 'tour' })}>
              Guided tour <Compass size={14} />
            </button>
            <button className="quiet-button" onClick={() => requestAstra({ kind: 'inspect' })}>
              What does this control do? <MousePointerClick size={14} />
            </button>
          </div>
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
              <h2>What Astra can do</h2>
            </div>
            <Bot size={16} />
          </div>

          {[
            ['Explain any page, control, chart or number', 'Explain this page'],
            ['Compare the selected sites for a priority you choose (never a single “best”)', 'Compare the selected sites by modeled sunlight'],
            ['Explain Scenario Lab: your one custom case vs. the reference', 'Explain the scenario delta'],
            ['Run read-only what-ifs (“What if landing slips 5 days?”) and let you apply them', 'What if landing is delayed by 5 days?'],
            ['Explain UTC, shadows and terrain resolution honestly', 'What happens when I change UTC?'],
            ['Say what the ice data does and does not show', 'What is the ice prospectivity score?'],
          ].map(([item, question]) => (
            <div className="capability" key={item} role="button" tabIndex={0} onClick={() => requestAstra({ kind: 'ask', question })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); requestAstra({ kind: 'ask', question }); } }} style={{ cursor: 'pointer' }}>
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
              <strong>{summary.sunlight}% (illustrative)</strong>
            </div>
            <div>
              <span>Earth DTE link</span>
              <strong>{summary.earth}% (illustrative)</strong>
            </div>
            <div>
              <span>Topographic relief</span>
              <strong>{selectedSite.elevationReliefM.toLocaleString()} m</strong>
            </div>
            <div>
              <span>Water-ice potential</span>
              <strong>{selectedSite.waterIcePotential.split('·')[0]} (catalog claim)</strong>
            </div>
          </div>

          <div className="context-note">
            <Info size={14} />
            Astra runs in your browser using Awilix's calculations and a reviewed fact sheet. Nothing is sent to a cloud model, and any number it cannot trace to a calculation is removed.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AstraView;
