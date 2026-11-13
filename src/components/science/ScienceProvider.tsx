// src/components/science/ScienceProvider.tsx
// Real ephemeris context — computes solar & Earth windows for every site
// via the science web worker + scienceClient.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import sites from '@/data/sites.json';
import { WINDOW_HOURS } from '@/lib/scenarioAnalysis.js';
import { requestScenarios } from '@/lib/scienceClient.js';

export interface SiteScenario {
  site: { id: string; name: string; lat: number; lon: number };
  power: {
    hours: number;
    exactHours: number;
    avgAlt: number;
    maxAlt: number;
    avgEfficiency: number;
    longestOutageHours: number;
    intervals: Array<{ start: number; end: number }>;
    blocked: Array<{ start: number; end: number }>;
    nextSet: number | null;
  };
  comm: {
    hours: number;
    exactHours: number;
    avgAlt: number;
    maxAlt: number;
    availabilityPercent: number;
    longestOutageHours: number;
    intervals: Array<{ start: number; end: number }>;
    blocked: Array<{ start: number; end: number }>;
    nextSet: number | null;
  };
  path: Array<{
    time: string | number;
    sunMargin: number;
    sun: { alt: number; az: number };
    earth: { alt: number; az: number };
  }>;
  hours: number;
  stepMinutes: number;
  mode: string;
  solarProfile?: { bins: Array<{ az: number; horizon: number }> };
  earthProfile?: { bins: Array<{ az: number; horizon: number }> };
}

interface ScienceState {
  results: SiteScenario[];
  loading: boolean;
  error: string | null;
  key?: string;
}

interface ScienceSettings {
  mode: 'reference' | 'terrain';
  solarHeight: number;
  antennaHeight: number;
  panelTilt: number;
  panelAzimuth: number;
}

interface ScienceContextValue extends ScienceState {
  date: string;
  hours: number;
  timeWindow: string;
  settings: ScienceSettings;
  setSettings: React.Dispatch<React.SetStateAction<ScienceSettings>>;
  byId: Record<string, SiteScenario>;
}

const Context = createContext<ScienceContextValue | null>(null);

export function ScienceProvider({
  children,
  date,
  timeWindow,
}: {
  children: ReactNode;
  date: string;
  timeWindow: string;
}) {
  const [settings, setSettings] = useState<ScienceSettings>({
    mode: 'reference',
    solarHeight: 2,
    antennaHeight: 2,
    panelTilt: 0,
    panelAzimuth: 0,
  });
  const [state, setState] = useState<ScienceState>({ results: [], loading: true, error: null });

  const hours: number = (WINDOW_HOURS as Record<string, number>)[timeWindow] ?? 24;
  const key = JSON.stringify({ date, hours, settings });

  useEffect(() => {
    let alive = true;
    const spec = JSON.parse(key);
    requestScenarios(
      (sites as Array<{ id: string; name: string; lat: number; lon: number }>).map((site) => ({
        site,
        date: spec.date,
        hours: spec.hours,
        ...spec.settings,
      }))
    )
      .then((results: SiteScenario[]) => {
        if (alive) setState({ results, loading: false, error: null, key });
      })
      .catch((err: Error) => {
        if (alive) setState({ results: [], loading: false, error: err.message, key });
      });
    return () => { alive = false; };
  }, [key]);

  const current = state.key === key ? state : { results: [], loading: true, error: null };
  const value: ScienceContextValue = {
    ...current,
    date,
    hours,
    timeWindow,
    settings,
    setSettings,
    byId: Object.fromEntries((current.results ?? []).map((r) => [r.site.id, r])),
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useScience(): ScienceContextValue {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useScience must be used inside <ScienceProvider>');
  return ctx;
}

