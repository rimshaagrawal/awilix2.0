import type { Scenario, Sample, Site, SiteSummary, NavigationItem } from '@/types';
import {
  Command,
  Globe2,
  Mountain,
  Radar,
  LineChart,
  BarChart3,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';

export const DEFAULT_SCENARIO: Scenario = {
  date: '2026-11-13',
  windowHours: 48,
  observerHeight: 2,
  antennaHeight: 2,
  panelTilt: 8,
  panelAzimuth: 180,
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: 'overview', label: 'Mission Overview', icon: Command },
  { id: 'sites', label: 'Candidate Sites', icon: Radar },
  { id: 'globe', label: 'Lunar Globe', icon: Globe2 },
  { id: 'terrain', label: '3D Terrain', icon: Mountain },
  { id: 'analysis', label: 'Site Analysis', icon: LineChart },
  { id: 'compare', label: 'Compare Sites', icon: BarChart3 },
  { id: 'scenario', label: 'Scenario Lab', icon: SlidersHorizontal },
  { id: 'astra', label: 'Astra Assistant', icon: Sparkles },
];

export const SITE_COLORS = [
  '#65d5d0', // Cyan
  '#f0a970', // Amber
  '#9aaeff', // Periwinkle Blue
  '#d7de88', // Lime Gold
  '#fb887a', // Coral
  '#cab6ff', // Lavender
];

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function getDayOfYear(value: string): number {
  const date = new Date(`${value}T00:00:00Z`);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

export function formatCoordinate(value: number, positive: string, negative: string): string {
  if (value === 0) return '0°';
  return `${Math.abs(value).toFixed(value % 1 === 0 ? 0 : 1)}° ${value > 0 ? positive : negative}`;
}

export function getSamples(site: Site, scenario: Scenario): Sample[] {
  const day = getDayOfYear(scenario.date);
  const count = scenario.windowHours <= 48 ? 12 : 16;
  const sunlightSwing = Math.max(1.4, (90 + site.lat) * 0.85 + 2.6);
  const earthSwing = site.lat < -88 ? 5 : 2.8;
  const scenarioLift = scenario.observerHeight * 0.12 + scenario.antennaHeight * 0.08;

  return Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1);
    const lunarPhase = ((day + progress * (scenario.windowHours / 24)) / 29.53) * Math.PI * 2;
    const sunAlt = Math.sin(lunarPhase) * sunlightSwing + (90 + site.lat) * 0.16;
    const earthAlt =
      (90 + site.lat) * 0.82 +
      Math.sin(lunarPhase + site.lon * 0.02) * earthSwing +
      scenario.antennaHeight * 0.14;
    const sun = clamp(
      site.baseSunlight + Math.sin(lunarPhase) * (100 - site.baseSunlight) * 0.18 + scenarioLift,
      0,
      99
    );
    const earth = clamp(site.baseEarth + Math.cos(lunarPhase + 0.6) * 3.5 + scenarioLift, 0, 99);
    const incidence = clamp(
      Math.cos(
        ((Math.abs(sunAlt - scenario.panelTilt) + Math.abs(scenario.panelAzimuth - 180) * 0.015) *
          Math.PI) /
          180
      ),
      0.18,
      1
    );
    const power = clamp((sun / 100) * incidence * 100, 0, 99);
    const comm = clamp(earth * (earthAlt > 0 ? 1 : 0.24), 0, 99);
    const hours = progress * scenario.windowHours;
    const label = hours === 0 ? 'T+00h' : `T+${Math.round(hours)}h`;
    return { label, sun, earth, power, comm, sunAlt, earthAlt };
  });
}

export function getSummary(site: Site, scenario: Scenario): SiteSummary {
  const samples = getSamples(site, scenario);
  const average = (key: keyof Pick<Sample, 'sun' | 'earth' | 'power' | 'comm'>): number =>
    Math.round(samples.reduce((sum, sample) => sum + sample[key], 0) / samples.length);

  return {
    samples,
    sunlight: average('sun'),
    earth: average('earth'),
    power: average('power'),
    comm: average('comm'),
    peakSunAlt: Math.max(...samples.map((sample) => sample.sunAlt)),
    peakEarthAlt: Math.max(...samples.map((sample) => sample.earthAlt)),
  };
}

export function buildPath(
  samples: Sample[],
  key: keyof Pick<Sample, 'sun' | 'earth' | 'power'>,
  width = 720,
  height = 210
): string {
  return samples
    .map((sample, index) => {
      const x = (index / (samples.length - 1)) * width;
      const y = height - (sample[key] / 100) * (height - 24) - 12;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export function buildArea(
  samples: Sample[],
  key: keyof Pick<Sample, 'sun' | 'earth' | 'power'>,
  width = 720,
  height = 210
): string {
  return `${buildPath(samples, key, width, height)} L ${width} ${height} L 0 ${height} Z`;
}

