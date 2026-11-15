import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Minus, Maximize2, Send, RotateCcw, ChevronDown, ChevronLeft, ChevronRight,
  Pause, Play, MousePointerClick, Compass, ExternalLink, Check, RefreshCw, Sparkles,
} from 'lucide-react';
import type { Scenario, View } from '@/types';
import { AstraAvatar } from '@/components/common/AstraAvatar';
import { AstraHighlight } from '@/components/assistant/AstraHighlight';
import { astra, onAstraRequest, probeAstraBackend, type AstraAction, type AstraAnswer, type AstraAppState } from '@/astra/runtime';
import { TOUR_STEPS } from '@/astra/tour.js';
import { VIEWS, CONTROLS } from '@/astra/facts.js';
import { getSite } from '@/data/sites';
import { clampOverlayPosition } from '@/lib/overlayPosition.js';

interface AstraPanelProps {
  isOpen: boolean;
  state: AstraAppState;
  onToggle: () => void;
  onOpen: () => void;
  onClose: () => void;
  onNavigate: (view: View) => void;
  onSelectSite: (id: string) => void;
  onSetCompare: (ids: string[]) => void;
  onApplyScenario: (changes: Partial<Scenario>) => void;
  onSetTerrainHour: (hour: number) => void;
}

type ChatItem =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'astra'; answer: AstraAnswer; question?: string; contextKey: string };

const BADGES: Record<string, { label: string; tone: string; title: string }> = {
  'science-worker': { label: 'Calculated', tone: 'ok', title: 'From the Awilix science worker (NASA 2026 ephemeris + horizon geometry)' },
  'illustrative-legacy-formula': { label: 'Illustrative', tone: 'warn', title: 'From the legacy illustrative formula, not the ephemeris' },
  'approximate-ephemeris-fallback': { label: 'Approximate', tone: 'bad', title: 'Outside the 2026 NASA table: analytic fallback' },
  'experimental-terrain-horizon': { label: 'Experimental terrain', tone: 'warn', title: 'Local terrain crop only; far-field terrain not modeled' },
  'partial-known-coverage': { label: 'Partial coverage', tone: 'warn', title: 'Some of the window could not be evaluated' },
  'packaged-model-output': { label: 'Packaged model', tone: 'warn', title: 'Read from a file; not live inference, not a measurement' },
  'duplicated-across-sites': { label: 'Duplicated values', tone: 'bad', title: 'Identical values copied across several sites' },
  'catalog-unverified': { label: 'Catalog claim', tone: 'warn', title: 'From the site catalog; not independently reviewed' },
  unavailable: { label: 'Unavailable', tone: 'bad', title: 'A data tool was unavailable' },
};

const ANCHOR_QUESTIONS: Record<string, string> = {
  'overview-metrics': 'Explain this chart', 'analysis-metrics': 'Explain this chart', 'analysis-chart': 'Explain this chart',
  'analysis-readout': 'Explain this chart', 'compare-chart': 'Explain this chart', 'compare-table': 'Explain this chart',
  'scenario-delta': 'Explain the scenario delta', 'scenario-chart': 'Explain this chart', 'scenario-provenance': 'What are your sources?',
  'analysis-prospectivity': 'What is the ice prospectivity score?', 'terrain-info': 'What is the terrain resolution?',
  'terrain-timeline': 'What happens when I change UTC?', 'terrain-heatmap-type': 'What does the ice heatmap show?', 'globe-canvas': 'Explain this page', 'sites-grid': 'Explain this page',
};
const CHART_VIEWS = new Set(['overview', 'analysis', 'compare', 'scenario', 'terrain']);

const uid = () => Math.random().toString(36).slice(2, 10);
const contextKeyOf = (s: AstraAppState) => JSON.stringify([s.selectedSiteId, s.compareIds, s.scenario, s.horizonMode]);

export const AstraPanel: React.FC<AstraPanelProps> = (props) => {
  const { isOpen, state, onToggle, onOpen, onClose, onNavigate, onSelectSite, onSetCompare, onApplyScenario, onSetTerrainHour } = props;
  const stateRef = useRef(state);
  stateRef.current = state;

  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [whyOpen, setWhyOpen] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<Record<string, string>>({}); // `${answerId}:${idx}` → 'applied' | 'dismissed' | choice
  const [minimized, setMinimized] = useState(false);
  const [backend, setBackend] = useState<{ enabled: boolean; model: string | null } | null>(null);
  useEffect(() => { probeAstraBackend().then(setBackend); }, []);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [tour, setTour] = useState<{ step: number; paused: boolean } | null>(null);
  const [inspect, setInspect] = useState(false);
  const [highlight, setHighlight] = useState<{ anchor: string | null; label?: string; nonce: number }>({ anchor: null, nonce: 0 });
  const panelRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const greeted = useRef(false);

  const currentKey = contextKeyOf(state);
  const viewLabel = VIEWS[state.activeView]?.label ?? state.activeView;
  const site = getSite(state.selectedSiteId);
  const latestPose = [...items].reverse().find((i) => i.role === 'astra') as Extract<ChatItem, { role: 'astra' }> | undefined;

  const flash = useCallback((anchor: string, label?: string, delay = 0) => {
    const go = () => setHighlight((h) => ({ anchor, label, nonce: h.nonce + 1 }));
    if (delay) window.setTimeout(go, delay); else go();
  }, []);

  const push = useCallback((item: ChatItem) => setItems((prev) => [...prev.slice(-60), item]), []);

  // ── run an Astra request ──────────────────────────────────────────────────
  const execute = useCallback((action: AstraAction) => {
    const s = stateRef.current;
    switch (action.type) {
      case 'navigate':
        if (action.view !== s.activeView) onNavigate(action.view);
        if (action.anchor) flash(action.anchor, CONTROLS[action.anchor]?.label, action.view !== s.activeView ? 450 : 0);
        break;
      case 'highlight': flash(action.anchor, action.label.replace(/^Show:?\s*/i, '')); break;
      case 'set-terrain-hour':
        if (action.view && action.view !== s.activeView) onNavigate(action.view);
        onSetTerrainHour(action.hour);
        flash('terrain-timeline', `${String(action.hour).padStart(2, '0')}:00 UTC`, 450);
        break;
      default: break;
    }
  }, [flash, onNavigate, onSetTerrainHour]);

  const deliver = useCallback((answer: AstraAnswer, question?: string) => {
    push({ id: uid(), role: 'astra', answer, question, contextKey: contextKeyOf(stateRef.current) });
    if (answer.autoAction) execute(answer.autoAction);
    if (answer.startTour) setTour({ step: 0, paused: false });
  }, [execute, push]);

  const run = useCallback(async (job: () => Promise<AstraAnswer>, userText?: string, question?: string) => {
    if (userText) push({ id: uid(), role: 'user', text: userText });
    setLoading(true);
    try {
      deliver(await job(), question ?? userText);
    } catch (e) {
      deliver({ id: uid(), intent: 'error', quick: `I couldn't complete that (${(e as Error).message}). Nothing in the app was changed.`, why: [], sources: [], quality: ['unavailable'], actions: [], pose: 'puzzled', predict: null, autoAction: null, startTour: false });
    } finally {
      setLoading(false);
    }
  }, [deliver, push]);

  const askQuestion = useCallback((q: string, showUser = true) => {
    const text = q.trim();
    if (!text) return;
    run(() => astra.ask(text, stateRef.current), showUser ? text : undefined, text);
  }, [run]);

  const explainControl = useCallback((id: string) => {
    run(() => astra.explainControl(id, stateRef.current), `What does “${CONTROLS[id]?.label ?? id}” do?`);
  }, [run]);

  const handleAction = useCallback((answer: AstraAnswer, action: AstraAction, idx: number) => {
    const key = `${answer.id}:${idx}`;
    switch (action.type) {
      case 'ask': askQuestion(action.question); break;
      case 'tour': setTour({ step: 0, paused: false }); break;
      case 'inspect': setInspect(true); break;
      case 'explain-control': explainControl(action.control); break;
      case 'predict': push({ id: uid(), role: 'astra', answer: astra.predict(action.id, stateRef.current), contextKey: contextKeyOf(stateRef.current) }); break;
      case 'set-compare': onSetCompare(action.siteIds); setDone((d) => ({ ...d, [key]: 'applied' })); if (stateRef.current.activeView !== 'compare') onNavigate('compare'); flash('compare-chips', 'Selection updated', 450); break;
      case 'select-site': onSelectSite(action.siteId); setDone((d) => ({ ...d, [key]: 'applied' })); break;
      case 'preview-scenario': break; // handled by the preview card
      default: execute(action);
    }
  }, [askQuestion, execute, explainControl, flash, onNavigate, onSelectSite, onSetCompare, push]);

  const applyPreview = (answer: AstraAnswer, action: Extract<AstraAction, { type: 'preview-scenario' }>, idx: number) => {
    onApplyScenario(action.changes);
    setDone((d) => ({ ...d, [`${answer.id}:${idx}`]: 'applied' }));
    if (stateRef.current.activeView !== 'scenario') onNavigate('scenario');
    flash('scenario-delta', 'Updated with your change', 500);
  };

  const choosePrediction = (answer: AstraAnswer, choice: string) => {
    if (!answer.predict) return;
    setDone((d) => ({ ...d, [answer.id]: choice }));
    const label = answer.predict.options.find((o) => o.id === choice)?.label ?? choice;
    const { id, context } = answer.predict;
    run(() => astra.reveal(id, choice, context, stateRef.current), `My prediction: ${label}`);
  };

  // ── greeting on first open ────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && !greeted.current) {
      greeted.current = true;
      askQuestion('hello', false);
    }
  }, [isOpen, askQuestion]);

  // ── requests from anywhere in the app ─────────────────────────────────────
  useEffect(() => onAstraRequest((r) => {
    onOpen();
    setMinimized(false);
    greeted.current = true;
    if (r.kind === 'ask') askQuestion(r.question);
    else if (r.kind === 'control') explainControl(r.id);
    else if (r.kind === 'page') run(() => astra.explainPage(stateRef.current), 'Explain this page');
    else if (r.kind === 'tour') setTour({ step: 0, paused: false });
    else if (r.kind === 'inspect') setInspect(true);
  }), [askQuestion, explainControl, onOpen, run]);

  // ── tour ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tour || tour.paused) return;
    const step = TOUR_STEPS[tour.step];
    if (!step) { setTour(null); return; }
    const needsNav = stateRef.current.activeView !== step.view;
    if (needsNav) onNavigate(step.view as View);
    flash(step.anchor, step.title, needsNav ? 500 : 0);
  }, [tour, flash, onNavigate]);

  // ── inspect mode: click any marked control to ask about it ────────────────
  useEffect(() => {
    if (!inspect) return;
    document.body.classList.add('astra-inspecting');
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (panelRef.current?.contains(target)) return;
      const el = target.closest<HTMLElement>('[data-astra]');
      e.preventDefault();
      e.stopPropagation();
      setInspect(false);
      if (!el) { askQuestion('Explain this page'); return; }
      const id = el.dataset.astra!;
      if (CONTROLS[id]) explainControl(id);
      else askQuestion(ANCHOR_QUESTIONS[id] ?? 'Explain this page');
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setInspect(false); };
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('astra-inspecting');
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [inspect, askQuestion, explainControl]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [items, loading]);

  // ── drag (desktop only) ───────────────────────────────────────────────────
  const onHeadPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button') || window.innerWidth < 900 || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const dx = e.clientX - rect.left, dy = e.clientY - rect.top;
    const move = (ev: PointerEvent) => setPos(clampOverlayPosition(ev.clientX - dx, ev.clientY - dy, rect.width, rect.height, window.innerWidth, window.innerHeight));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // ── context-aware prompts ─────────────────────────────────────────────────
  const prompts = useMemo(() => {
    const v = VIEWS[state.activeView];
    const list: { label: string; onClick: () => void }[] = [
      { label: 'Explain this page', onClick: () => run(() => astra.explainPage(stateRef.current), 'Explain this page') },
    ];
    if (Object.values(CONTROLS).some((c: any) => c.view === state.activeView)) list.push({ label: 'What does this control do?', onClick: () => setInspect(true) });
    if (CHART_VIEWS.has(state.activeView)) list.push({ label: 'Explain this chart', onClick: () => askQuestion('Explain this chart') });
    if (v?.tryIt) {
      const a = v.tryIt.action;
      if (a.type === 'ask') list.push({ label: v.tryIt.label, onClick: () => askQuestion(a.question) });
      if (a.type === 'predict') list.push({ label: 'Predict, then reveal', onClick: () => push({ id: uid(), role: 'astra', answer: astra.predict(a.id, stateRef.current), contextKey: contextKeyOf(stateRef.current) }) });
    }
    list.push({ label: 'Take me to…', onClick: () => setInput('Take me to ') });
    list.push({ label: 'Fun fact', onClick: () => askQuestion('Tell me a fun fact') });
    list.push({ label: 'Tour', onClick: () => setTour({ step: 0, paused: false }) });
    return list;
  }, [state.activeView, askQuestion, push, run]);

  const tourStep = tour ? TOUR_STEPS[tour.step] : null;

  return (
    <>
      <AstraHighlight anchor={highlight.anchor} label={highlight.label} nonce={highlight.nonce} />

      {inspect && (
        <div className="astra-inspect-banner" role="status">
          <MousePointerClick size={14} /> Click any control or panel to ask Astra about it
          <button onClick={() => setInspect(false)}>Cancel (Esc)</button>
        </div>
      )}

      <button className={`astra-fab ${isOpen ? 'fab-open' : ''}`} onClick={onToggle} aria-label={isOpen ? 'Hide Astra assistant' : 'Open Astra assistant'} aria-expanded={isOpen}>
        <AstraAvatar size={64} pose={latestPose?.answer.pose ?? 'idle'} />
        <div className="astra-nameplate"><i /><span>Astra</span></div>
        {!isOpen && !greeted.current && <i className="astra-notice" />}
      </button>

      {isOpen && (
        <section
          ref={panelRef}
          className={`astra-panel ${minimized ? 'astra-panel-min' : ''}`}
          role="dialog"
          aria-modal="false"
          aria-label="Astra assistant"
          style={pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined}
        >
          <div className="astra-panel-head" onPointerDown={onHeadPointerDown}>
            <div className="astra-title">
              <AstraAvatar compact pose={latestPose?.answer.pose ?? 'idle'} />
              <div>
                <strong>Astra</strong>
                <span>{backend?.enabled ? `Guide · AI chat via ${backend.model}` : 'Guide · built-in answers only'}</span>
              </div>
            </div>
            <div>
              <button className="icon-button" onClick={() => { setItems([]); setDone({}); setWhyOpen({}); setTour(null); askQuestion('hello', false); }} aria-label="Clear conversation" title="Clear conversation">
                <RotateCcw size={14} />
              </button>
              <button className="icon-button" onClick={() => setMinimized((m) => !m)} aria-label={minimized ? 'Expand Astra' : 'Minimize Astra'} title={minimized ? 'Expand' : 'Minimize'}>
                {minimized ? <Maximize2 size={14} /> : <Minus size={14} />}
              </button>
              <button className="icon-button" onClick={onClose} aria-label="Close Astra" title="Close">
                <X size={15} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              <div className="astra-context" aria-label="Context Astra is reading">
                <span><span className="status-dot" />{viewLabel}</span>
                <b>{site.shortName}</b>
                <span>·</span>
                <span>{state.scenario.date} · {state.scenario.windowHours < 168 ? `${state.scenario.windowHours}h` : `${state.scenario.windowHours / 24}d`}</span>
                {state.activeView === 'terrain' && <><span>·</span><span>{String(state.terrainHour).padStart(2, '0')}:00 UTC</span></>}
              </div>

              <div className="chat-messages" ref={listRef} aria-live="polite" aria-relevant="additions">
                {items.map((item) => item.role === 'user' ? (
                  <div key={item.id} className="chat-message user">
                    <div className="chat-avatar">You</div>
                    <div><span className="chat-role">You</span><p>{item.text}</p></div>
                  </div>
                ) : (
                  <AnswerView
                    key={item.id}
                    item={item}
                    stale={item.contextKey !== currentKey && item.answer.quality.some((q) => q === 'science-worker' || q === 'illustrative-legacy-formula')}
                    whyOpen={!!whyOpen[item.answer.id]}
                    onToggleWhy={() => setWhyOpen((w) => ({ ...w, [item.answer.id]: !w[item.answer.id] }))}
                    done={done}
                    onAction={handleAction}
                    onApplyPreview={applyPreview}
                    onDismissPreview={(a, idx) => setDone((d) => ({ ...d, [`${a.id}:${idx}`]: 'dismissed' }))}
                    onPredict={choosePrediction}
                    onRefresh={() => item.question && askQuestion(item.question, false)}
                  />
                ))}
                {loading && (
                  <div className="chat-message astra" role="status">
                    <div className="chat-avatar"><Sparkles size={13} /></div>
                    <div><span className="chat-role">Astra</span><p className="astra-thinking">Checking the app and running the calculation…</p></div>
                  </div>
                )}
              </div>

              {tourStep && tour && (
                <div className="astra-tour" role="group" aria-label={`Tour step ${tour.step + 1} of ${TOUR_STEPS.length}`}>
                  <div className="astra-tour-head">
                    <span><Compass size={12} /> Tour · {tour.step + 1}/{TOUR_STEPS.length} · {VIEWS[tourStep.view]?.label}</span>
                    <button className="text-button" onClick={() => setTour(null)}>End tour</button>
                  </div>
                  <strong>{tourStep.title}</strong>
                  <p>{tourStep.text}</p>
                  <p className="astra-tour-try"><b>Try it:</b> {tourStep.tryIt}</p>
                  <div className="astra-tour-controls">
                    <button onClick={() => setTour({ step: Math.max(0, tour.step - 1), paused: false })} disabled={tour.step === 0} aria-label="Previous stop"><ChevronLeft size={14} /> Back</button>
                    <button onClick={() => setTour({ ...tour, paused: !tour.paused })} aria-label={tour.paused ? 'Resume tour' : 'Pause tour'}>{tour.paused ? <><Play size={13} /> Resume</> : <><Pause size={13} /> Pause</>}</button>
                    <button onClick={() => run(() => astra.explainPage(stateRef.current), `Tell me more about ${VIEWS[tourStep.view]?.label}`)}>Ask about this</button>
                    {tour.step < TOUR_STEPS.length - 1
                      ? <button className="primary" onClick={() => setTour({ step: tour.step + 1, paused: false })} aria-label="Next stop">Next <ChevronRight size={14} /></button>
                      : <button className="primary" onClick={() => setTour(null)}>Finish <Check size={13} /></button>}
                  </div>
                </div>
              )}

              <div className="astra-prompts" role="toolbar" aria-label="Suggested questions">
                {prompts.map((p) => <button key={p.label} onClick={p.onClick} disabled={loading}>{p.label}</button>)}
              </div>

              <form className="chat-input" onSubmit={(e) => { e.preventDefault(); if (!loading) { askQuestion(input); setInput(''); } }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask about ${viewLabel}…`}
                  aria-label="Ask Astra a question"
                  maxLength={600}
                />
                <button type="submit" aria-label="Send message" disabled={loading || !input.trim()}><Send size={15} /></button>
              </form>
            </>
          )}
        </section>
      )}
    </>
  );
};

// ── one Astra answer ─────────────────────────────────────────────────────────
interface AnswerViewProps {
  item: Extract<ChatItem, { role: 'astra' }>;
  stale: boolean;
  whyOpen: boolean;
  onToggleWhy: () => void;
  done: Record<string, string>;
  onAction: (a: AstraAnswer, action: AstraAction, idx: number) => void;
  onApplyPreview: (a: AstraAnswer, action: Extract<AstraAction, { type: 'preview-scenario' }>, idx: number) => void;
  onDismissPreview: (a: AstraAnswer, idx: number) => void;
  onPredict: (a: AstraAnswer, choice: string) => void;
  onRefresh: () => void;
}

const AnswerView: React.FC<AnswerViewProps> = ({ item, stale, whyOpen, onToggleWhy, done, onAction, onApplyPreview, onDismissPreview, onPredict, onRefresh }) => {
  const a = item.answer;
  const badges = [...new Set(a.quality)].map((q) => BADGES[q]).filter(Boolean);
  const chosen = done[a.id];
  return (
    <div className="chat-message astra">
      <div className="chat-avatar"><Sparkles size={13} /></div>
      <div className="astra-answer">
        <span className="chat-role">
          Astra
          {badges.map((b) => <em key={b.label} className={`astra-badge astra-badge-${b.tone}`} title={b.title}>{b.label}</em>)}
        </span>
        <p>{a.quick}</p>

        {stale && item.question && (
          <button className="astra-stale" onClick={onRefresh}><RefreshCw size={11} /> Settings changed since this answer · refresh</button>
        )}

        {a.predict && (
          <div className="astra-predict" role="group" aria-label="Make a prediction">
            {a.predict.options.map((o) => (
              <button key={o.id} onClick={() => onPredict(a, o.id)} disabled={!!chosen} className={chosen === o.id ? 'chosen' : ''}>{o.label}</button>
            ))}
          </div>
        )}

        {(a.why.length > 0 || a.sources.length > 0) && (
          <button className="astra-why-toggle" onClick={onToggleWhy} aria-expanded={whyOpen}>
            <ChevronDown size={12} style={{ transform: whyOpen ? 'rotate(180deg)' : 'none' }} /> {whyOpen ? 'Hide why' : 'Show why'}
          </button>
        )}
        {whyOpen && (
          <div className="astra-why">
            {a.why.length > 0 && <ul>{a.why.map((w, i) => <li key={i}>{w}</li>)}</ul>}
            {a.sources.length > 0 && (
              <div className="astra-sources">
                <span>Sources</span>
                {a.sources.map((s) => s.href
                  ? <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">{s.label}<ExternalLink size={10} /></a>
                  : <i key={s.label}>{s.label}</i>)}
              </div>
            )}
          </div>
        )}

        {a.actions.length > 0 && (
          <div className="astra-actions">
            {a.actions.map((action, idx) => {
              const state = done[`${a.id}:${idx}`];
              if (action.type === 'preview-scenario') {
                return (
                  <div key={idx} className="astra-preview">
                    <span>Proposed change: <b>{action.summary}</b></span>
                    {state === 'applied' ? <em><Check size={12} /> Applied in Scenario Lab</em>
                      : state === 'dismissed' ? <em>Dismissed</em>
                      : <div><button className="primary" onClick={() => onApplyPreview(a, action, idx)}>Apply</button><button onClick={() => onDismissPreview(a, idx)}>Dismiss</button></div>}
                  </div>
                );
              }
              const applied = state === 'applied';
              return (
                <button key={idx} onClick={() => onAction(a, action, idx)} disabled={applied} className={action.type === 'set-compare' || action.type === 'select-site' ? 'astra-action-change' : ''}>
                  {applied ? <><Check size={11} /> Done</> : action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AstraPanel;
