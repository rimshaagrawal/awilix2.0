// src/components/sites/SiteDetailView.tsx
// Real-time telemetry + ephemeris chart for a single candidate landing site.

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { useScience } from '@/components/science/ScienceProvider';
import { ScenarioDiagnostics } from '@/components/science/ScenarioDiagnostics';
import { LFMLoadingScreen } from '@/components/LFMLoadingScreen';
import iceData from '@/data/ice-prospectivity.json';
import gsap from 'gsap';
import {
  Sun, Radio, Mountain, Clock, Sparkles, Award, ChevronRight, ShieldCheck,
} from 'lucide-react';
import type { Site } from '@/types';

interface SiteDetailViewProps {
  site: Site;
  timeWindow?: string;
  setTimeWindow?: (tw: string) => void;
  onVisitTerrain?: (site: Site) => void;
}

export function SiteDetailView({ site, timeWindow = '24h', setTimeWindow, onVisitTerrain }: SiteDetailViewProps) {
  const science = useScience();
  const scenario = science.byId[site.id];
  const timeRange = science.hours;
  const path = scenario?.path ?? [];
  const power = scenario?.power ?? { hours: 0, avgAlt: 0, maxAlt: 0, avgEfficiency: 0, availabilityPercent: 0 };
  const comm = scenario?.comm ?? { hours: 0, avgAlt: 0, maxAlt: 0, availabilityPercent: 0 };
  const [hoverIndex, setHoverIndex] = useState(0);
  const [lfmLoading, setLfmLoading] = useState(true);
  const [lfmAnalyzed, setLfmAnalyzed] = useState(false);

  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardsRef.current) {
      gsap.fromTo(
        cardsRef.current.children,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, stagger: 0.08, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [site.id]);

  useEffect(() => {
    setLfmLoading(true);
    setLfmAnalyzed(false);
    const timer = setTimeout(() => {
      setLfmLoading(false);
      setLfmAnalyzed(true);
    }, 2200);
    return () => clearTimeout(timer);
  }, [site.id]);

  const chartData = useMemo(() => {
    return path.map((p, idx) => {
      const dt = new Date(p.time);
      const label =
        timeRange === 24
          ? `${String(dt.getUTCHours()).padStart(2, '0')}:00`
          : `${dt.getUTCMonth() + 1}/${dt.getUTCDate()} ${String(dt.getUTCHours()).padStart(2, '0')}h`;
      return {
        idx,
        label,
        sunAlt: Number(p.sun.alt.toFixed(2)),
        earthAlt: Number(p.earth.alt.toFixed(2)),
        sunHorizon: (p as any).sunHorizon ?? null,
        earthHorizon: (p as any).earthHorizon ?? null,
        powerEfficiency: Number(((p as any).powerEfficiency ?? 0) * 100).toFixed(0),
        commActive: (p as any).commActive ?? null,
      };
    });
  }, [path, timeRange]);

  const activePoint = chartData[hoverIndex] || chartData[0] || {};

  const TIME_WINDOWS = [
    { id: '24h', label: '24h', hours: 24 },
    { id: '48h', label: '48h', hours: 48 },
    { id: '7d', label: '7d', hours: 168 },
    { id: '14d', label: '14d', hours: 336 },
    { id: 'month', label: '29.5d', hours: 708 },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="bento-plate p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="telemetry-chip sun text-xs">
              {site.lat.toFixed(2)}°S, {Math.abs(site.lon).toFixed(2)}°{site.lon < 0 ? 'W' : 'E'}
            </span>
            <span className="text-[11px] font-mono text-[var(--ink-mute)]">{(site as any).targetRegion}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold font-sans text-[var(--ink)] mt-1">{site.name}</h1>
          {(site as any).namedAfter && (
            <p className="text-xs text-[var(--ink-mute)] mt-0.5">Named after: {(site as any).namedAfter}</p>
          )}
        </div>
        {onVisitTerrain && (
          <button
            onClick={() => onVisitTerrain(site)}
            className="btn-primary text-xs cursor-pointer flex items-center gap-1.5"
          >
            <Mountain className="w-3.5 h-3.5" />
            <span>Launch 3D Terrain Altimetry</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bento-plate p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--ink-soft)] flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-[var(--coral)]" /> Sunlight ({timeWindow})
            </span>
            <span className="telemetry-chip sun text-[10px]">Solar Power</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-semibold font-mono text-[var(--coral)]">
              {scenario ? `${power.hours}h` : '…'}
            </div>
            <div className="text-[11px] font-mono text-[var(--ink-mute)] mt-1 flex justify-between">
              <span>Avg: <strong className="text-[var(--ink)]">{power.avgAlt}°</strong></span>
              <span>Peak: <strong className="text-[var(--ink)]">{power.maxAlt}°</strong></span>
            </div>
          </div>
          <div className="w-full bg-[var(--paper-dark)] h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-[var(--coral)] h-full rounded-full transition-[width] duration-300"
              style={{ width: `${Math.min(100, (power.hours / (timeRange || 24)) * 100)}%` }}
            />
          </div>
        </div>

        <div className="bento-plate p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--ink-soft)] flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-[var(--mustard)]" /> Earth Contact
            </span>
            <span className="telemetry-chip earth text-[10px]">Radio Link</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-semibold font-mono text-[var(--mustard)]">
              {scenario ? `${comm.hours}h` : '…'}
            </div>
            <div className="text-[11px] font-mono text-[var(--ink-mute)] mt-1 flex justify-between">
              <span>Avg: <strong className="text-[var(--ink)]">{comm.avgAlt}°</strong></span>
              <span>Uptime: <strong className="text-[var(--ink)]">{comm.availabilityPercent}%</strong></span>
            </div>
          </div>
          <div className="w-full bg-[var(--paper-dark)] h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-[var(--mustard)] h-full rounded-full transition-[width] duration-300"
              style={{ width: `${Math.min(100, comm.availabilityPercent)}%` }}
            />
          </div>
        </div>

        <div className="bento-plate p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--ink-soft)] flex items-center gap-1.5">
              <Mountain className="w-4 h-4 text-[var(--olive)]" /> Mountain Relief
            </span>
            <span className="text-[10px] font-mono text-[var(--ink-faint)]">NASA LOLA</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-semibold font-mono text-[var(--ink)]">
              {((site as any).elevationReliefM || 0).toLocaleString()} m
            </div>
            <div className="text-[11px] font-mono text-[var(--ink-mute)] mt-1 flex justify-between">
              <span>Ø: <strong className="text-[var(--ink)]">{(site as any).craterDiameterKm} km</strong></span>
              <span>Depth: <strong className="text-[var(--ink)]">{(site as any).craterDepthKm} km</strong></span>
            </div>
          </div>
          <div className="text-[11px] text-[var(--ink-faint)] mt-3 truncate font-mono">
            {(site as any).surfaceSlopeClass || 'Terrain relief profile'}
          </div>
        </div>

        <div className="bento-plate p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--ink-soft)] flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[var(--coral)]" /> Exploration Context
            </span>
            <span className="text-[10px] font-mono text-[var(--coral)]">South Pole</span>
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold text-[var(--ink)] truncate">
              {(site as any).mission?.split('(')[0]?.trim()}
            </div>
            <div className="text-[11px] font-mono text-[var(--ink-mute)] mt-1">
              Affiliation: <strong className="text-[var(--ink)]">{(site as any).contractor}</strong>
            </div>
          </div>
          <div className="text-[11px] text-[var(--ink-faint)] mt-3 truncate font-mono">
            {(site as any).targetRegion}
          </div>
        </div>
      </div>

      {/* Coverage diagnostics */}
      {scenario && <ScenarioDiagnostics scenario={scenario} />}

      {/* LFM Ice Prospectivity Panel */}
      <div className="bento-plate p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-3">
          <h2 className="text-base font-semibold text-[var(--ink)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--coral)]" />
            NASA-IBM Lunar Foundation Model - Ice Prospectivity
          </h2>
          <span className="telemetry-chip terrain text-[10px]">LFM</span>
        </div>
        {lfmLoading ? (
          <LFMLoadingScreen
            message="Analyzing terrain with NASA-IBM LFM..."
            subtext="Running ice prospectivity inference on south-pole patch"
          />
        ) : (
          (() => {
            const d = (iceData as any)?.sites?.[site.id];
            if (!d) return <p className="text-xs text-[var(--ink-mute)]">No LFM data available for this site.</p>;
            const pct = Math.round(d.aiProspectivity * 100);
            const color = d.aiProspectivity >= 0.8 ? 'var(--emerald)' : d.aiProspectivity >= 0.4 ? 'var(--mustard)' : 'var(--crimson)';
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[var(--paper-dark)] rounded-xl p-3 text-center">
                    <div className="text-[10px] font-mono text-[var(--ink-faint)]">AI Prospectivity</div>
                    <div className="text-2xl font-semibold font-mono mt-1" style={{ color }}>{pct}%</div>
                  </div>
                  <div className="bg-[var(--paper-dark)] rounded-xl p-3 text-center">
                    <div className="text-[10px] font-mono text-[var(--ink-faint)]">Expert (Coyan)</div>
                    <div className="text-2xl font-semibold font-mono text-[var(--ink)] mt-1">{Math.round(d.expertProspectivity * 100)}%</div>
                  </div>
                  <div className="bg-[var(--paper-dark)] rounded-xl p-3 text-center">
                    <div className="text-[10px] font-mono text-[var(--ink-faint)]">PSR Coverage</div>
                    <div className="text-2xl font-semibold font-mono text-[var(--mustard)] mt-1">{d.psrPercent}%</div>
                  </div>
                  <div className="bg-[var(--paper-dark)] rounded-xl p-3 text-center">
                    <div className="text-[10px] font-mono text-[var(--ink-faint)]">Max Temp</div>
                    <div className="text-2xl font-semibold font-mono text-[var(--ink)] mt-1">{d.maxTempK} K</div>
                  </div>
                </div>
                <div className="bg-[var(--paper-dark)] rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--ink-mute)]">Model agreement (|AI - Expert|)</span>
                    <span className="text-[var(--ink)] font-semibold">{d.disagreement.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--ink-mute)]">Slope</span>
                    <span className="text-[var(--ink)]">{d.slopeDeg} deg</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--ink-mute)]">Source patch</span>
                    <span className="text-[var(--ink-faint)] text-[10px]">{d.sourceSite}</span>
                  </div>
                </div>
                <p className="text-[10px] text-[var(--ink-faint)] leading-relaxed">
                  Ice prospectivity reconstruction from the NASA-IBM Lunar Foundation Model. AI reconstruction of the expert model by Coyan et al. (2025).
                </p>
              </div>
            );
          })()
        )}
      </div>

      {/* Ephemeris chart */}
      <div className="bento-plate p-5 space-y-4" data-guide="telemetry-chart">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--line-soft)] pb-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--ink)] flex items-center gap-2">
              <Sun className="w-4 h-4 text-[var(--coral)]" /> Sun & Earth Elevation Above Horizon
            </h2>
            <p className="text-xs text-[var(--ink-mute)] font-sans">
              Above 0° = visible above local horizon. The lunar South Pole Sun skims low along mountain ridges.
            </p>
          </div>
          <div className="flex items-center bg-[var(--paper-dark)] p-0.5 rounded-lg border border-[var(--line-soft)]">
            {TIME_WINDOWS.map((tw) => (
              <button
                key={tw.id}
                onClick={() => setTimeWindow?.(tw.id)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                  timeRange === tw.hours
                    ? 'bg-[var(--coral)] text-[#120e07] font-semibold'
                    : 'text-[var(--ink-mute)] hover:text-white'
                }`}
              >
                {tw.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[320px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              onMouseMove={(e: any) => {
                if (e?.activeTooltipIndex !== undefined) setHoverIndex(e.activeTooltipIndex);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(238,241,247,0.08)" />
              <XAxis dataKey="label" stroke="#93a1ab" fontSize={10} tickLine={false} minTickGap={30} />
              <YAxis
                stroke="#93a1ab" fontSize={10} tickLine={false}
                domain={[(min: number) => Math.min(0, Math.floor(min)), (max: number) => Math.max(0, Math.ceil(max))]}
                tickFormatter={(v) => `${v}°`}
              />
              {science.settings.mode === 'terrain' && (
                <Line dataKey="sunHorizon" name="Array Horizon" stroke="#b69765" strokeDasharray="3 3" dot={false} />
              )}
              {science.settings.mode === 'terrain' && (
                <Line dataKey="earthHorizon" name="Antenna Horizon" stroke="#6297a6" strokeDasharray="3 3" dot={false} />
              )}
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5}
                label={{ value: '0° Horizon', fill: '#ef4444', fontSize: 10, position: 'right' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111820', borderColor: 'rgba(238,241,247,0.16)', borderRadius: '10px', fontSize: '11px', color: '#eeeae1' }}
                formatter={(val: number, name: string) => [`${val}°`, ({ sunAlt: 'Sun Elevation', earthAlt: 'Earth Elevation', sunHorizon: 'Array horizon', earthHorizon: 'Antenna horizon' } as Record<string, string>)[name] ?? name]}
              />
              <Line type="monotone" dataKey="sunAlt" stroke="#eac18b" strokeWidth={2.4} dot={false} name="sunAlt" />
              <Line type="monotone" dataKey="earthAlt" stroke="#91c6d4" strokeWidth={2.4} dot={false} name="earthAlt" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Live hover strip */}
        <div className="bg-[var(--paper-dark)] border border-[var(--line-soft)] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[var(--ink-mute)]" />
            <span className="text-[var(--ink)] font-semibold">{activePoint.label || '00:00 UTC'}</span>
          </div>
          <div className="flex items-center gap-5">
            <div>
              <span className="text-[var(--ink-faint)] text-[10px] block">Sun Height:</span>
              <span className="text-[var(--coral)] font-semibold">{activePoint.sunAlt}°</span>
            </div>
            <div>
              <span className="text-[var(--ink-faint)] text-[10px] block">Earth Height:</span>
              <span className="text-[var(--mustard)] font-semibold">{activePoint.earthAlt}°</span>
            </div>
            <div>
              <span className="text-[var(--ink-faint)] text-[10px] block">Solar Angle:</span>
              <span className="text-[var(--ink)] font-semibold">{activePoint.powerEfficiency}%</span>
            </div>
            <div>
              <span className="text-[var(--ink-faint)] text-[10px] block">Earth Contact:</span>
              <span className={`font-semibold ${activePoint.commActive ? 'text-green-400' : 'text-red-400'}`}>
                {activePoint.commActive === null ? 'UNKNOWN' : activePoint.commActive ? 'ACTIVE' : 'BLOCKED'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Science insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bento-plate p-5 space-y-3">
          <h3 className="font-semibold text-[var(--ink)] text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--coral)]" /> Why Scientists Chose This Site
          </h3>
          <p className="text-xs text-[var(--ink-soft)] leading-relaxed">{(site as any).whyNASAChose}</p>
          {(site as any).funFact && (
            <div className="bg-[var(--paper-dark)] border border-[var(--line-soft)] rounded-xl p-3.5 space-y-1 mt-2">
              <span className="text-[var(--coral)] font-semibold text-xs flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" /> Fascinating Moon Fact
              </span>
              <p className="text-xs text-[var(--ink-mute)] italic leading-relaxed">"{(site as any).funFact}"</p>
            </div>
          )}
        </div>
        <div className="bento-plate p-5 space-y-3">
          <h3 className="font-semibold text-[var(--ink)] text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--mustard)]" /> Key Science Goals & Equipment
          </h3>
          <ul className="space-y-2 text-xs text-[var(--ink-soft)]">
            {((site as any).keyScienceGoals ?? [site.description]).map((goal: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-[var(--coral)] flex-shrink-0 mt-0.5" />
                <span>{goal}</span>
              </li>
            ))}
          </ul>
          <div className="pt-3 border-t border-[var(--line-soft)] flex items-center justify-between text-xs font-mono">
            <span className="text-[var(--ink-faint)]">Mission Affiliation:</span>
            <span className="text-[var(--ink)] font-semibold">{(site as any).contractor}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

