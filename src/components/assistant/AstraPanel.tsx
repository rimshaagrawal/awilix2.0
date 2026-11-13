import React, { useState } from 'react';
import { Minus, X, Sparkles, Send } from 'lucide-react';
import type { Site, Scenario, Message, SiteSummary } from '@/types';
import { AstraAvatar } from '@/components/common/AstraAvatar';
import { sites } from '@/data/sites';
import { getSummary } from '@/lib/scenarioCalculations';
import { answerGuideQuestion } from '@/lib/projectGuideTools';

interface AstraPanelProps {
  isOpen: boolean;
  selectedSite: Site;
  scenario: Scenario;
  summary: SiteSummary;
  comparisonSites: Site[];
  onToggle: () => void;
  onClose: () => void;
}

export const AstraPanel: React.FC<AstraPanelProps> = ({
  isOpen,
  selectedSite,
  scenario,
  summary,
  comparisonSites,
  onToggle,
  onClose,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'astra',
      text: 'Mission systems nominal. I can interpret the current site, compare candidates, or explain any chart in AWILIX.',
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleAskAstra = async (customPrompt?: string) => {
    const question = (customPrompt ?? chatInput).trim();
    if (!question || loading) return;

    setChatInput('');
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setLoading(true);

    try {
      // First try answering with the local scientific domain engine
      const guideResult = await answerGuideQuestion(question, {
        site: selectedSite,
        date: scenario.date,
        power: { exactHours: (summary.power / 100) * scenario.windowHours },
        comm: { exactHours: (summary.earth / 100) * scenario.windowHours },
        scenario,
        timeWindow: `${scenario.windowHours}h`,
      });

      if (guideResult && guideResult.text) {
        setMessages((prev) => [...prev, { role: 'astra', text: guideResult.text }]);
        setLoading(false);
        return;
      }
    } catch {
      // Fall through to rich rule-based assistant
    }

    // Contextual intelligent responses
    const lower = question.toLowerCase();
    const compareNames = comparisonSites.map((s) => s.shortName).join(' and ');
    let answer = `For ${selectedSite.shortName}, the current ${scenario.windowHours}-hour telemetry estimate indicates ${summary.sunlight}% sunlight availability, ${summary.earth}% Earth line-of-sight visibility, and ${summary.power}% power opportunity.`;

    if (lower.includes('best') || lower.includes('sunlight') || lower.includes('longest')) {
      const best = [...sites].sort(
        (a, b) => getSummary(b, scenario).sunlight - getSummary(a, scenario).sunlight
      )[0];
      const bestSummary = getSummary(best, scenario);
      answer = `${best.shortName} is currently the strongest solar candidate with ${bestSummary.sunlight}% sunlight in this ${scenario.windowHours}h window. Shackleton Ridge and Shackleton Rim benefit from high polar elevation, though micro-craters still cast grazing shadows.`;
    } else if (lower.includes('earth') || lower.includes('communication') || lower.includes('comm') || lower.includes('dte')) {
      answer = `Direct-to-Earth (DTE) communication depends on line-of-sight to NASA Deep Space Network stations. ${selectedSite.shortName} currently provides ${summary.earth}% link visibility with a peak Earth elevation of ${summary.peakEarthAlt.toFixed(1)}°. Raising the antenna by even 2 meters improves signal margin over local rims.`;
    } else if (lower.includes('power') || lower.includes('panel') || lower.includes('tilt')) {
      answer = `Solar power opportunity accounts for solar panel incidence angle. At a ${scenario.panelTilt}° tilt and ${scenario.panelAzimuth}° azimuth, ${selectedSite.shortName} achieves ${summary.power}% effective power generation during this window.`;
    } else if (lower.includes('compare')) {
      answer = `Comparing ${compareNames || 'candidate sites'}: Shackleton Ridge leads in solar continuity, Mons Mouton offers flat landing terrain for drills, and Malapert A maintains great Earth elevation for direct telemetry.`;
    } else if (lower.includes('terrain') || lower.includes('slope') || lower.includes('lola') || lower.includes('relief')) {
      answer = `${selectedSite.shortName} features ${selectedSite.elevationReliefM.toLocaleString()} meters of topographic relief. In the 3D Terrain view, you can inspect 20-meter LOLA altimetry models with real solar lighting to check rover trafficability.`;
    } else if (lower.includes('water') || lower.includes('ice') || lower.includes('psr')) {
      answer = `${selectedSite.shortName} has a water-ice rating of "${selectedSite.waterIcePotential}". Permanently shadowed regions (PSRs) remain colder than 40 Kelvin (-233°C), preserving volatile water ice deposits for future ISRU rocket propellant production.`;
    } else if (lower.includes('scenario') || lower.includes('height') || lower.includes('change')) {
      answer = `Your active scenario configuration: Observer Height = ${scenario.observerHeight}m, Antenna = ${scenario.antennaHeight}m, Tilt = ${scenario.panelTilt}°, Azimuth = ${scenario.panelAzimuth}°, Window = ${scenario.windowHours}h. Adjusting antenna height strengthens direct Earth link margins against terrain dips.`;
    }

    setMessages((prev) => [...prev, { role: 'astra', text: answer }]);
    setLoading(false);
  };

  return (
    <>
      <button
        className={`astra-fab ${isOpen ? 'fab-open' : ''}`}
        onClick={onToggle}
        aria-label="Open Astra assistant"
      >
        <AstraAvatar compact />
        <span>ASTRA</span>
        {!isOpen && <i className="astra-notice" />}
      </button>

      {isOpen && (
        <section className="astra-panel" role="region" aria-label="Astra Assistant Chat">
          <div className="astra-panel-head">
            <div className="astra-title">
              <AstraAvatar compact />
              <div>
                <strong>ASTRA</strong>
                <span>Mission support intelligence</span>
              </div>
            </div>
            <div>
              <button
                className="icon-button"
                onClick={() =>
                  setMessages([
                    {
                      role: 'astra',
                      text: 'Conversation cleared. Ask me about the selected site, scenario, or any chart.',
                    },
                  ])
                }
                aria-label="Clear conversation"
              >
                <Minus size={16} />
              </button>
              <button className="icon-button" onClick={onClose} aria-label="Close Astra">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="astra-context">
            <span>
              <span className="status-dot" />
              CONTEXT LINKED
            </span>
            <b>{selectedSite.shortName}</b>
            <span>·</span>
            <span>{scenario.windowHours}H WINDOW</span>
          </div>

          <div className="chat-messages">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
                <div className="chat-avatar">
                  {message.role === 'astra' ? <Sparkles size={13} /> : 'RC'}
                </div>
                <div>
                  <span className="chat-role">{message.role === 'astra' ? 'ASTRA' : 'YOU'}</span>
                  <p>{message.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-message astra">
                <div className="chat-avatar">
                  <Sparkles size={13} />
                </div>
                <div>
                  <span className="chat-role">ASTRA</span>
                  <p>Synthesizing telemetry data...</p>
                </div>
              </div>
            )}
          </div>

          <div className="astra-prompts">
            <button onClick={() => handleAskAstra('Which site has the best sunlight?')}>
              Best sunlight?
            </button>
            <button onClick={() => handleAskAstra('Explain Earth visibility')}>
              Earth visibility
            </button>
            <button onClick={() => handleAskAstra('Tell me about water ice')}>
              Water ice (PSR)
            </button>
            <button onClick={() => handleAskAstra('Explain the current scenario')}>
              Scenario impact
            </button>
          </div>

          <div className="chat-input">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAskAstra();
              }}
              placeholder="Ask Astra about the mission..."
              disabled={loading}
            />
            <button
              onClick={() => handleAskAstra()}
              aria-label="Send message"
              disabled={loading || !chatInput.trim()}
            >
              <Send size={16} />
            </button>
          </div>
        </section>
      )}
    </>
  );
};

export default AstraPanel;

