import type { LucideIcon } from 'lucide-react';

export type View = 'overview' | 'globe' | 'sites' | 'analysis' | 'compare' | 'scenario' | 'astra' | 'terrain';

export type Scenario = {
  date: string;
  windowHours: number;
  observerHeight: number;
  antennaHeight: number;
  panelTilt: number;
  panelAzimuth: number;
};

export type Sample = {
  label: string;
  sun: number;
  earth: number;
  power: number;
  comm: number;
  sunAlt: number;
  earthAlt: number;
};

export type Message = {
  role: 'astra' | 'user';
  text: string;
};

export type Site = {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lon: number;
  mission: string;
  targetRegion: string;
  elevationReliefM: number;
  illuminationProfile: string;
  waterIcePotential: string;
  dteCommVisibility: string;
  contractor: string;
  keyScienceGoals: string[];
  sourceLabel: string;
  baseSunlight: number;
  baseEarth: number;
  // Additional scientific metadata
  namedAfter?: string;
  craterDiameterKm?: number;
  craterDepthKm?: number;
  whyNASAChose?: string;
  funFact?: string;
};

export type NavigationItem = {
  id: View;
  label: string;
  icon: LucideIcon;
};

export type SiteSummary = {
  samples: Sample[];
  sunlight: number;
  earth: number;
  power: number;
  comm: number;
  peakSunAlt: number;
  peakEarthAlt: number;
};

