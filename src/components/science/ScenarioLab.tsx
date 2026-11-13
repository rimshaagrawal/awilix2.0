// src/components/science/ScenarioLab.tsx
// Landing Date & Delay Explorer — compares two mission plans side-by-side.
// Uses real ephemeris via scienceClient; built with recharts.

import { useEffect, useState, useRef } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import sites from '@/data/sites.json';
import { useScience } from './ScienceProvider';
import { requestScenarios } from '@/lib/scienceClient.js';
import { ScenarioDiagnostics } from './ScenarioDiagnostics';
import { Sparkles, Calendar, Clock, Sun, Radio } from 'lucide-react';
import gsap from 'gsap';
import type { SiteScenario } from './ScienceProvider';

export interface ScenarioPin {
  siteId: string;
  date: string;
}

const shift = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00Z`) + days * 86400000).toISOString().slice(0, 10);

export function ScenarioLab({
  pins,
  setPins,
}: {
  pins: ScenarioPin[];
  setPins: React.Dispatch<React.SetStateAction<ScenarioPin[]>>;
}) {
  const { date, hours, settings } = useScience();
  const [state, setState] = useState<{ results: SiteScenario[]; loading: boolean; error: string | null; key?: string }>({
    results: [],
    loading: true,
    error: null,
  });
  const deltasRef = useRef<HTMLDivElement>(null);

  const key = JSON.stringify({ pins, hours, settings });

  useEffect(() => {
    let alive = true;
    const spec = JSON.parse(key) as { pins: ScenarioPin[]; hours: number; settings: Record<string, unknown> };
    const timer = setTimeout(() => {
      requestScenarios(
        spec.pins.map((pin) => ({
          site: (sites as Array<{ id: string; name: string; lat: number; lon: number }>).find((s) => s.id === pin.siteId),
          date: pin.date,
          hours: spec.hours,
          ...spec.settings,
        }))
      )
        .then((results: SiteScenario[]) => {
          if (alive) {
            setState({ results, loading: false, error: null, key });
            if (deltasRef.current) {
              gsap.fromTo(
                deltasRef.current.children,
                { opacity: 0, y: 12 },
                { opacity: 1, y: 0, stagger: 0.08, duration: 0.4, ease: 'power2.out' }
              );
            }
          }
        })
        .catch((e: Error) => {
          if (alive) setState({ results: [], loading: false, error: e.message, key });
        });
    }, 180);
    return () => { alive = false; clearTimeout(timer); };
  }, [key]);

  const update = (i: number, patch: Partial<ScenarioPin>) =>
    setPins((prev) => prev.map((p, j) => (i === j ? { ...p, ...patch } : p)));

  const current = state.key === key ? state : { results: [], loading: true, error: null };
  const [a, b] = current.results as [SiteScenario | undefined, SiteScenario | undefined];
  const delay = Math.round((Date.parse(pins[1].date) - Date.parse(pins[0].date)) / 86400000);

  const findValue = (scenario: SiteScenario, elapsed: number): number | null => {
    const path = scenario.path;
    const start = +path[0].time;
    const target = start + elapsed * 3600000;
    let i = 1;
    while (i < path.length && +path[i].time < target) i++;
    const p = path[Math.max(0, i - 1)];
    const q = path[Math.min(i, path.length - 1)];
    const t = +q.time === +p.time ? 0 : (target - +p.time) / (+q.time - +p.time);
    return Number.isFinite(p.sunMargin) && Number.isFinite(q.sunMargin)
      ? p.sunMargin + (q.sunMargin - p.sunMargin) * t
      : null;
  };

  const chart =
    a && b
      ? Array.from({ length: Math.ceil(hours / (a.stepMinutes / 60)) + 1 }, (_, i) => {
          const elapsed = Math.min(hours, (i * a.stepMinutes) / 60);
          return { elapsed, A: findValue(a, elapsed), B: findValue(b, elapsed) };
        })
      : [];

  const sunDelta = a && b ? (b.power.exactHours - a.power.exactHours).toFixed(1) : '0';
  const commDelta = a && b ? (b.comm.exactHours - a.comm.exactHours).toFixed(1) : '0';
  const outageDelta = a && b ? (b.power.longestOutageHours - a.power.longestOutageHours).toFixed(1) : '0';

  return (
    <section
      className="scenario-lab bento-plate p-5 space-y-4"
      data-guide="scenario-lab"
      aria-label="Compare Landing Dates & Delays"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--line-soft)] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--coral)]" />
            <h2 className="text-base sm:text-lg font-bold font-sans text-[var(--ink)]">
              Landing Date & Delay Explorer
            </h2>
          </div>
          <p className="text-xs text-[var(--ink-mute)] mt-0.5">
            Test what happens if a mission launches on a different day or lands at another site.
          </p>
        </div>
        <span className="text-[10px] font-mono text-[var(--ink-faint)] bg-[var(--paper-dark)] px-2.5 py-1 rounded-md border border-[var(--line-soft)] self-start sm:self-auto">
          {hours}h analysis · {settings.mode === 'terrain' ? '3D Ridge Terrain' : 'Geometric Line-of-Sight'}
        </span>
      </div>

      {/* Two Comparison Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pins.map((pin, i) => (
          <div key={i} className="p-4 rounded-xl bg-[var(--paper-dark)] border border-[var(--line-soft)] space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${i === 0 ? 'text-[var(--coral)]' : 'text-[var(--mustard)]'}`}>
                Plan {i === 0 ? 'A (Baseline)' : 'B (Alternate / Delay)'}
              </span>
              <button
                type="button"
                className="text-[10px] text-[var(--ink-mute)] hover:text-[var(--coral)] underline cursor-pointer"
                onClick={() => update(i, { date })}
              >
                Use current date ({date})
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col gap-1 text-[var(--ink-mute)]">
                <span>Landing Region</span>
                <select
                  value={pin.siteId}
                  onChange={(e) => update(i, { siteId: e.target.value })}
                  className="bg-[var(--bone)] border border-[var(--line)] rounded-lg p-2 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--coral)]"
                >
                  {(sites as Array<{ id: string; name: string }>).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[var(--ink-mute)]">
                <span>Touchdown Date (UTC)</span>
                <input
                  type="date"
                  required
                  value={pin.date}
                  onChange={(e) => {
                    if (e.target.value && /^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) {
                      update(i, { date: e.target.value });
                    }
                  }}
                  className="bg-[var(--bone)] border border-[var(--line)] rounded-lg p-2 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--coral)] font-mono"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Delay Slider */}
      <div className="p-4 rounded-xl bg-[rgba(238,241,247,0.02)] border border-[var(--line-soft)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs text-[var(--ink)] font-semibold flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[var(--coral)]" />
            <span>Launch Delay for Plan B:</span>
            <span className="font-mono text-[var(--coral)] font-bold text-sm">
              {delay > 0 ? `+${delay} days` : delay === 0 ? 'Same Day (0 days)' : `${delay} days earlier`}
            </span>
          </label>
          <div className="flex items-center gap-2">
            {[3, 7].map((d) => (
              <button
                key={d}
                type="button"
                className="text-xs px-2.5 py-1 rounded bg-[var(--bone)] border border-[var(--line)] text-[var(--ink-soft)] transition-colors cursor-pointer hover:border-[var(--coral)]"
                onClick={() => update(1, { siteId: pins[0].siteId, date: shift(pins[0].date, d) })}
              >
                +{d} Days
              </button>
            ))}
            <button
              type="button"
              className="text-xs px-2.5 py-1 rounded bg-[var(--bone)] border border-[var(--line)] text-[var(--ink-soft)] cursor-pointer hover:border-[var(--coral)]"
              onClick={() => update(1, { date: pins[0].date })}
            >
              Reset
            </button>
          </div>
        </div>
        <input
          aria-label="Adjust landing delay in days"
          type="range"
          min="-14"
          max="14"
          value={Math.max(-14, Math.min(14, Number.isFinite(delay) ? delay : 0))}
          onChange={(e) => update(1, { date: shift(pins[0].date, Number(e.target.value)) })}
          className="w-full accent-[var(--coral)] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-mono text-[var(--ink-faint)]">
          <span>-14 days earlier</span>
          <span>Same day (0)</span>
          <span>+14 days later</span>
        </div>
      </div>

      {current.loading && (
        <div className="p-3 text-center text-xs text-[var(--coral)] font-mono animate-pulse">
          Computing solar and Earth visibility for both plans…
        </div>
      )}
      {current.error && (
        <div className="p-3 text-xs rounded-lg bg-[rgba(239,68,68,0.1)] text-red-400 border border-[rgba(239,68,68,0.3)]">
          {current.error}
        </div>
      )}

      {/* Delta Results */}
      {a && b && (
        <div className="space-y-4 pt-1">
          <div ref={deltasRef} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Sunlight Difference (B vs A)', icon: Sun, color: 'coral', delta: sunDelta, unitA: `${a.power.exactHours.toFixed(1)}h`, unitB: `${b.power.exactHours.toFixed(1)}h`, suffix: 'sunlight' },
              { label: 'Earth Contact Difference', icon: Radio, color: 'mustard', delta: commDelta, unitA: `${a.comm.exactHours.toFixed(1)}h`, unitB: `${b.comm.exactHours.toFixed(1)}h`, suffix: 'contact' },
              { label: 'Longest Shadow Period Change', icon: Clock, color: 'ink-mute', delta: outageDelta, unitA: `${a.power.longestOutageHours.toFixed(1)}h`, unitB: `${b.power.longestOutageHours.toFixed(1)}h`, suffix: 'darkness' },
            ].map(({ label, icon: Icon, color, delta, unitA, unitB, suffix }) => (
              <div key={label} className="p-3.5 rounded-xl bg-[var(--paper-dark)] border border-[var(--line-soft)] flex flex-col justify-between">
                <span className="text-[11px] text-[var(--ink-mute)] flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 text-[var(--${color})]`} />
                  {label}
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-2xl font-bold font-mono ${Number(delta) >= 0 ? `text-[var(--${color})]` : 'text-red-400'}`}>
                    {Number(delta) >= 0 ? `+${delta}h` : `${delta}h`}
                  </span>
                  <span className="text-[10px] text-[var(--ink-mute)]">
                    {Number(delta) >= 0 ? `more ${suffix}` : `less ${suffix}`}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[var(--ink-faint)] mt-1">
                  Plan A: {unitA} · Plan B: {unitB}
                </div>
              </div>
            ))}
          </div>

          {/* Sun angle chart */}
          <div className="p-4 rounded-xl bg-[var(--paper-dark)] border border-[var(--line-soft)] space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[var(--ink)]">Sun Angle Above the Horizon (°)</h3>
              <span className="text-[10px] text-[var(--ink-faint)]">
                Above 0° = visible · Below 0° = behind crater ridge
              </span>
            </div>
            <div className="h-56 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart}>
                  <CartesianGrid stroke="rgba(238,241,247,0.08)" strokeDasharray="3 3" />
                  <XAxis dataKey="elapsed" type="number" domain={[0, hours]} unit="h" stroke="#93a1ab" fontSize={10} />
                  <YAxis unit="°" stroke="#93a1ab" fontSize={10} domain={[(min: number) => Math.min(0, Math.floor(min)), (max: number) => Math.max(0, Math.ceil(max))]} />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Horizon (0°)', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }} />
                  <Tooltip formatter={(v: number, name: string) => [`${Number(v).toFixed(2)}°`, name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line name="Plan A · Sun Height" dataKey="A" stroke="#eac18b" strokeWidth={2} dot={false} />
                  <Line name="Plan B · Sun Height" dataKey="B" stroke="#91c6d4" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Diagnostics accordions */}
          {[{ label: pins[0], scenario: a, color: 'coral' }, { label: pins[1], scenario: b, color: 'mustard' }].map(({ label, scenario: sc, color }, i) => (
            <details key={i} className="text-xs text-[var(--ink-mute)]">
              <summary className={`cursor-pointer text-[var(--${color})] hover:underline font-semibold`}>
                Inspect Timeline Intervals for Plan {i === 0 ? 'A' : 'B'} (
                {(sites as Array<{ id: string; name: string }>).find((s) => s.id === label.siteId)?.name})
              </summary>
              <ScenarioDiagnostics scenario={sc} />
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

