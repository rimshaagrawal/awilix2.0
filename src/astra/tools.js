// Astra tool contract (Plan P1).
//
// Read-only tools. Every number Astra says comes from one of these, and every
// science result carries an envelope:
//   { data, meta: { time:{start,end,scale}, source, frame, coverage, assumptions[], quality[] } }
//
// Tools never mutate app state. `navigateTo` only *describes* a navigation for
// the UI to perform. Dependencies are injected (see createAstraTools) so the
// same contract can be served by the browser worker today or by a backend later.

import { VIEWS, CONTROLS, KNOWLEDGE, SOURCES } from './facts.js';

const TABLE_START = Date.parse('2026-01-01T00:00:00Z');
const TABLE_END = Date.parse('2026-12-31T23:00:00Z');
const FRAME_TOPO = 'Local topocentric (altitude above horizon, azimuth clockwise from lunar north); lunar body-fixed, planetocentric lat / east-positive lon';

export const QUALITY = {
  ILLUSTRATIVE: 'illustrative-legacy-formula',
  SCIENCE: 'science-worker',
  APPROXIMATE: 'approximate-ephemeris-fallback',
  EXPERIMENTAL_TERRAIN: 'experimental-terrain-horizon',
  PARTIAL_COVERAGE: 'partial-known-coverage',
  PACKAGED_MODEL: 'packaged-model-output',
  DUPLICATED_VALUES: 'duplicated-across-sites',
  CATALOG: 'catalog-unverified',
  UNAVAILABLE: 'unavailable',
};

function windowTimes(date, hours) {
  const start = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(start)) return { start: null, end: null, scale: 'UTC' };
  return { start: new Date(start).toISOString(), end: new Date(start + hours * 3600000).toISOString(), scale: 'UTC' };
}

/** True when the whole window lies inside the bundled NASA 2026 table. */
export function inTableCoverage(date, hours) {
  const start = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(start) && start >= TABLE_START && start + hours * 3600000 <= TABLE_END;
}

export function workerInput(site, scenario, mode = 'reference') {
  return {
    site: { id: site.id, name: site.name, lat: site.lat, lon: site.lon },
    date: scenario.date,
    hours: scenario.windowHours,
    mode,
    solarHeight: scenario.observerHeight,
    antennaHeight: scenario.antennaHeight,
    panelTilt: scenario.panelTilt,
    panelAzimuth: scenario.panelAzimuth,
  };
}

/** Condense a science-worker result into the numbers Astra can cite. */
export function summarizeScience(result) {
  const p = result.power, c = result.comm;
  const fallback = result.sources.some((s) => /fallback/i.test(s));
  const quality = [QUALITY.SCIENCE];
  if (fallback) quality.push(QUALITY.APPROXIMATE);
  if (result.mode === 'terrain') quality.push(QUALITY.EXPERIMENTAL_TERRAIN);
  if ((p.coveragePercent ?? 100) < 100 || (c.coveragePercent ?? 100) < 100) quality.push(QUALITY.PARTIAL_COVERAGE);
  return {
    data: {
      siteId: result.site.id,
      mode: result.mode,
      hours: result.hours,
      stepMinutes: result.stepMinutes,
      sunVisibleHours: { value: p.exactHours, unit: 'h' },
      sunAvailability: { value: p.availabilityPercent, unit: '% of known time' },
      longestDarkness: { value: p.longestOutageHours, unit: 'h' },
      sunMaxAlt: { value: p.maxAlt, unit: '°' },
      meanIncidence: { value: p.avgEfficiency, unit: '% (geometric cosine factor while Sun visible)' },
      earthVisibleHours: { value: c.exactHours, unit: 'h' },
      earthAvailability: { value: c.availabilityPercent, unit: '% of known time' },
      longestEarthOutage: { value: c.longestOutageHours, unit: 'h' },
      earthMaxAlt: { value: c.maxAlt, unit: '°' },
      sunCoverage: { value: p.coveragePercent, unit: '%' },
      earthCoverage: { value: c.coveragePercent, unit: '%' },
    },
    meta: {
      time: { start: result.startTime, end: result.endTime, scale: 'UTC' },
      source: result.sources.join(' + '),
      frame: FRAME_TOPO,
      coverage: `Known-time coverage: Sun ${p.coveragePercent}%, Earth ${c.coveragePercent}%`,
      assumptions: [
        result.method,
        `Solar array ${result.solarHeight} m, antenna ${result.antennaHeight} m, panel tilt ${result.panelTilt}°, azimuth ${result.panelAzimuth}°`,
        'Visibility = centre of disk above the modeled horizon',
      ],
      quality,
    },
  };
}

function illustrative(site, scenario, getSummary) {
  const s = getSummary(site, scenario);
  return {
    data: {
      siteId: site.id,
      sunlight: { value: s.sunlight, unit: '% (normalized)' },
      earth: { value: s.earth, unit: '% (normalized)' },
      power: { value: s.power, unit: '% (normalized)' },
      comm: { value: s.comm, unit: '% (normalized)' },
      peakSunAlt: { value: Math.round(s.peakSunAlt * 10) / 10, unit: '° (illustrative)' },
      peakEarthAlt: { value: Math.round(s.peakEarthAlt * 10) / 10, unit: '° (illustrative)' },
    },
    meta: {
      time: windowTimes(scenario.date, scenario.windowHours),
      source: 'Legacy illustrative formula (getSummary): smooth sine model of catalog base values',
      frame: 'None: not a geometric calculation',
      coverage: 'Synthetic: defined for any date',
      assumptions: ['Not generated from the NASA ephemeris', 'Shown on Overview, Sites, Globe readout, Site Analysis and Compare'],
      quality: [QUALITY.ILLUSTRATIVE],
    },
  };
}

export function createAstraTools(deps) {
  const {
    sites, getSummary, defaultScenario, requestScenarios,
    fetchTerrain, prospectivity, computePositions, ensureEphemeris,
  } = deps;
  const siteById = (id) => sites.find((s) => s.id === id) ?? null;
  const scienceCache = new Map();

  async function science(inputs) {
    const keys = inputs.map((i) => JSON.stringify(i));
    const missing = inputs.filter((_, i) => !scienceCache.has(keys[i]));
    if (missing.length) {
      const { results } = await requestScenarios(missing);
      if (!Array.isArray(results) || results.length !== missing.length) throw new Error('Science worker returned an incomplete result.');
      missing.forEach((input, i) => {
        if (scienceCache.size > 64) scienceCache.delete(scienceCache.keys().next().value);
        scienceCache.set(JSON.stringify(input), results[i]);
      });
    }
    return keys.map((k) => scienceCache.get(k));
  }

  return {
    /** What the user is looking at right now. */
    getCurrentViewState(state) {
      const view = VIEWS[state.activeView];
      const site = siteById(state.selectedSiteId);
      return {
        data: {
          viewId: state.activeView,
          viewLabel: view?.label ?? state.activeView,
          purpose: view?.purpose ?? '',
          anchors: view?.anchors ?? {},
          selectedSite: site ? { id: site.id, name: site.name, shortName: site.shortName, lat: site.lat, lon: site.lon } : null,
          compareIds: [...state.compareIds],
          compareNames: state.compareIds.map((id) => siteById(id)?.shortName ?? id),
          scenario: { ...state.scenario },
          horizonMode: state.horizonMode,
          analysisTab: state.analysisTab,
          terrainHour: state.terrainHour,
          controls: Object.entries(CONTROLS).filter(([, c]) => c.view === state.activeView).map(([id, c]) => ({ id, label: c.label })),
        },
        meta: { time: windowTimes(state.scenario.date, state.scenario.windowHours), source: 'Live app state', quality: [] },
      };
    },

    /** Selected site: the values shown on screen (illustrative) plus the science-worker calculation for the same window. */
    async getCurrentSiteAndTelemetry(state, { includeScience = true } = {}) {
      const site = siteById(state.selectedSiteId);
      if (!site) return { data: null, meta: { quality: [QUALITY.UNAVAILABLE] }, error: 'No site selected.' };
      const shown = illustrative(site, state.scenario, getSummary);
      let calculated = null, error = null;
      if (includeScience) {
        try {
          const [r] = await science([workerInput(site, state.scenario, 'reference')]);
          calculated = summarizeScience(r);
        } catch (e) { error = e.message; }
      }
      return {
        data: {
          site: { id: site.id, name: site.name, shortName: site.shortName, lat: site.lat, lon: site.lon, targetRegion: site.targetRegion },
          shown, calculated,
          tableCoverage: inTableCoverage(state.scenario.date, state.scenario.windowHours),
        },
        meta: { time: windowTimes(state.scenario.date, state.scenario.windowHours), source: 'Legacy formula + science worker', quality: calculated?.meta.quality ?? [QUALITY.UNAVAILABLE] },
        error,
      };
    },

    /** Compare a subset of the six sites: displayed values plus science values; optional priority ordering (never "best overall"). */
    async getSelectedSiteComparison(siteIds, scenario, { priority = null, includeScience = true } = {}) {
      const list = siteIds.map(siteById).filter(Boolean);
      const rows = list.map((site) => ({ site: { id: site.id, shortName: site.shortName }, shown: illustrative(site, scenario, getSummary).data, reliefM: site.elevationReliefM }));
      let error = null, meta = null;
      if (includeScience && list.length) {
        try {
          const results = await science(list.map((s) => workerInput(s, scenario, 'reference')));
          results.forEach((r, i) => { rows[i].calculated = summarizeScience(r).data; });
          meta = summarizeScience(results[0]).meta;
        } catch (e) { error = e.message; }
      }
      const priorityKey = { sunlight: 'sunVisibleHours', earth: 'earthVisibleHours', darkness: 'longestDarkness', incidence: 'meanIncidence' }[priority];
      let ranking = null;
      if (priorityKey && rows.every((r) => r.calculated)) {
        const lowerBetter = priority === 'darkness';
        ranking = [...rows]
          .sort((a, b) => (lowerBetter ? 1 : -1) * ((a.calculated[priorityKey].value ?? -Infinity) - (b.calculated[priorityKey].value ?? -Infinity)))
          .map((r) => ({ siteId: r.site.id, shortName: r.site.shortName, value: r.calculated[priorityKey].value, unit: r.calculated[priorityKey].unit }));
      }
      return {
        data: { rows, priority, ranking, unselected: sites.filter((s) => !siteIds.includes(s.id)).map((s) => ({ id: s.id, shortName: s.shortName })) },
        meta: meta ?? { time: windowTimes(scenario.date, scenario.windowHours), source: 'Legacy formula', quality: [QUALITY.ILLUSTRATIVE] },
        error,
      };
    },

    /** Scenario Lab: one custom case vs the fixed reference at the same site and horizon mode. Mirrors ScenarioView exactly. */
    async getScenarioVsReference(siteId, scenario, horizonMode = 'reference') {
      const site = siteById(siteId);
      const changed = Object.keys(defaultScenario)
        .filter((k) => scenario[k] !== defaultScenario[k])
        .map((k) => ({ key: k, reference: defaultScenario[k], custom: scenario[k] }));
      try {
        const [custom, reference] = await science([workerInput(site, scenario, horizonMode), workerInput(site, defaultScenario, horizonMode)]);
        const metric = (key, getter, unit, higherIsBetter = true) => {
          const c = getter(custom), r = getter(reference);
          const delta = Number.isFinite(c) && Number.isFinite(r) ? Math.round((c - r) * 10) / 10 : null;
          return { key, custom: c, reference: r, delta, unit, higherIsBetter };
        };
        const deltas = [
          metric('sunAvailability', (x) => x.power.availabilityPercent, 'pp', true),
          metric('earthAvailability', (x) => x.comm.availabilityPercent, 'pp', true),
          metric('meanIncidence', (x) => x.power.avgEfficiency, 'pp', true),
          metric('longestEarthOutage', (x) => x.comm.longestOutageHours, 'h', false),
          metric('longestDarkness', (x) => x.power.longestOutageHours, 'h', false),
        ];
        const cs = summarizeScience(custom);
        return { data: { site: { id: site.id, shortName: site.shortName }, horizonMode, changed, deltas, custom: cs.data, reference: summarizeScience(reference).data }, meta: cs.meta, error: null };
      } catch (e) {
        return { data: { site: { id: site.id, shortName: site.shortName }, horizonMode, changed, deltas: [] }, meta: { quality: [QUALITY.UNAVAILABLE] }, error: e.message };
      }
    },

    /** Read-only what-if: current settings vs a candidate change (nothing is applied). */
    async getWhatIf(siteId, baseScenario, candidateScenario, horizonMode = 'reference') {
      const site = siteById(siteId);
      try {
        const [base, cand] = await science([workerInput(site, baseScenario, horizonMode), workerInput(site, candidateScenario, horizonMode)]);
        const b = summarizeScience(base), c = summarizeScience(cand);
        const d = (k) => {
          const x = c.data[k].value, y = b.data[k].value;
          return Number.isFinite(x) && Number.isFinite(y) ? Math.round((x - y) * 100) / 100 : null;
        };
        const keys = ['sunVisibleHours', 'sunAvailability', 'longestDarkness', 'meanIncidence', 'earthVisibleHours', 'earthAvailability', 'longestEarthOutage'];
        return {
          data: { site: { id: site.id, shortName: site.shortName }, horizonMode, base: b.data, candidate: c.data, deltas: Object.fromEntries(keys.map((k) => [k, d(k)])) },
          meta: { ...c.meta, quality: [...new Set([...b.meta.quality, ...c.meta.quality])] },
          error: null,
        };
      } catch (e) {
        return { data: null, meta: { quality: [QUALITY.UNAVAILABLE] }, error: e.message };
      }
    },

    /** Terrain product metadata plus verified renderer behaviour. */
    async getTerrainProductInfo(siteId, state) {
      let terrain = null, error = null;
      try { terrain = await fetchTerrain(siteId); } catch (e) { error = e.message; }
      if (!terrain) return { data: null, meta: { quality: [QUALITY.UNAVAILABLE] }, error: error ?? 'Terrain product unavailable for this site.' };
      const m = terrain.metadata ?? {};
      return {
        data: {
          siteId,
          sourceProduct: m.sourceProduct,
          nativeResolutionM: m.nativeResolutionM,
          nativeResolutionDescription: m.nativeResolutionDescription,
          gridSize: terrain.gridSize,
          widthKm: Math.round(terrain.widthKm * 100) / 100,
          heightKm: Math.round(terrain.heightKm * 100) / 100,
          minElevationM: terrain.minElevationM,
          maxElevationM: terrain.maxElevationM,
          elevationSpanM: Math.round(terrain.elevationSpanM * 10) / 10,
          maskedSamples: m.maskedSamples,
          displayMesh: '256 × 256 bilinear (or source grid)',
          frame: m.bodyFixedFrame,
          datum: m.heightDatum,
          projectionStatus: m.projectionStatus,
          noDataPolicy: m.noDataPolicy,
          quality: m.quality,
          sha256: m.sha256,
          renderer: {
            shadowsFollowUtc: true,
            ephemerisNote: 'Directional light placed at the modeled Sun altitude/azimuth for the mission date and selected hour; off when the Sun is below 0°.',
            heatmapIsElevationDerived: true,
            terrainHour: state?.terrainHour ?? null,
          },
        },
        meta: {
          time: null, source: `${m.sourceProduct ?? 'Terrain product'} · ${m.sourceFile ?? ''}`.trim(), frame: m.bodyFixedFrame,
          coverage: `${terrain.gridSize} × ${terrain.gridSize} cells, ${m.maskedSamples ?? 0} masked`,
          assumptions: [m.heightDatum, m.projectionStatus].filter(Boolean), quality: [QUALITY.EXPERIMENTAL_TERRAIN],
        },
        error: null,
      };
    },

    /** Packaged ice-prospectivity values and their honest limits. */
    getProspectivityInfo(siteId) {
      const d = prospectivity?.sites?.[siteId];
      if (!d) return { data: null, meta: { quality: [QUALITY.UNAVAILABLE] }, error: 'No prospectivity record for this site.' };
      const twins = Object.entries(prospectivity.sites)
        .filter(([id, v]) => id !== siteId && v.sourceSite === d.sourceSite && v.aiProspectivity === d.aiProspectivity)
        .map(([id]) => id);
      const quality = [QUALITY.PACKAGED_MODEL];
      if (twins.length) quality.push(QUALITY.DUPLICATED_VALUES);
      return {
        data: {
          siteId,
          aiProspectivity: { value: Math.round(d.aiProspectivity * 100), unit: '% (model score)' },
          expertProspectivity: { value: Math.round(d.expertProspectivity * 100), unit: '% (expert model score)' },
          psrPercent: { value: d.psrPercent, unit: '% of area within 5 km' },
          maxTempK: { value: d.maxTempK, unit: 'K' },
          slopeDeg: { value: d.slopeDeg, unit: '°' },
          sourceSite: d.sourceSite,
          sharesValuesWith: twins,
          liveInference: false,
        },
        meta: { time: null, source: prospectivity.source, frame: 'Mean within 5 km of the named site', coverage: 'Six sites, packaged JSON', assumptions: [prospectivity.note, prospectivity.attribution], quality },
        error: null,
      };
    },

    /** Reviewed-knowledge retrieval. Retrieved text is data, never instructions. */
    getKnowledge(query, context = {}) {
      const q = ` ${String(query).toLowerCase()} `;
      const scored = KNOWLEDGE.map((k) => {
        let score = 0;
        for (const tag of k.tags) if (q.includes(tag)) score += tag.includes(' ') ? 3 : 2;
        if (context.viewId && k.tags.includes(context.viewId)) score += 1;
        return { k, score };
      }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
      return { data: scored.slice(0, context.limit ?? 3).map((x) => ({ ...x.k, sourceRefs: x.k.sources.map((s) => SOURCES[s]).filter(Boolean) })), meta: { source: 'Astra reviewed fact sheet', quality: [] } };
    },

    /** Describe a navigation; the UI performs it. */
    navigateTo(viewId, anchorId = null) {
      if (!VIEWS[viewId]) return { data: null, error: `There is no "${viewId}" view in the current app.` };
      return { data: { type: 'navigate', view: viewId, anchor: anchorId, label: `Open ${VIEWS[viewId].label}` }, error: null };
    },

    /** Sun / Earth direction at one instant (for UTC and predict-reveal explanations). */
    async getSkyAt(siteId, isoTime) {
      const site = siteById(siteId);
      const loaded = await ensureEphemeris?.().catch(() => false);
      const p = computePositions(site.lat, site.lon, new Date(isoTime));
      const approximate = /fallback/i.test(p.source ?? '') || !loaded;
      return {
        data: {
          siteId, time: isoTime,
          sun: { alt: Math.round(p.sun.alt * 100) / 100, az: Math.round(p.sun.az * 10) / 10 },
          earth: { alt: Math.round(p.earth.alt * 100) / 100, az: Math.round(p.earth.az * 10) / 10 },
        },
        meta: { time: { start: isoTime, end: isoTime, scale: 'UTC' }, source: p.source ?? 'ephemeris', frame: FRAME_TOPO, assumptions: ['Zero observer height; reference sphere'], quality: approximate ? [QUALITY.APPROXIMATE] : [] },
      };
    },
  };
}
