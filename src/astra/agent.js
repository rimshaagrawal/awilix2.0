// Astra agent: router → tools → composer → validator (Plan §5).
//
// Answers use progressive detail:
//   quick   – one or two plain sentences (class 10–12 level)
//   why[]   – "Show why": inputs, method, evidence, limits
//   actions – optional next steps (navigate, highlight, preview a change, predict…)
// State-changing actions are never executed by the agent. The UI shows them as
// buttons, except navigation the user explicitly asked for (autoAction).

import { VIEWS, CONTROLS, SOURCES, STATIC_FACTS } from './facts.js';
import { routeIntent } from './router.js';
import { QUALITY } from './tools.js';
import { collectEvidence, validateAnswer, validateText } from './validator.js';
import { TOUR_STEPS } from './tour.js';

// ── formatting ─────────────────────────────────────────────────────────────
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
const f1 = (n) => (fin(n) ? n.toFixed(1) : 'unknown');
const f2 = (n) => (fin(n) ? n.toFixed(2) : 'unknown');
const sgn = (n, d = 1) => (fin(n) ? `${n > 0 ? '+' : ''}${n.toFixed(d)}` : 'unknown');
const coord = (s) => `${Math.abs(s.lat).toFixed(1)}°${s.lat < 0 ? 'S' : 'N'}, ${Math.abs(s.lon).toFixed(1)}°${s.lon < 0 ? 'W' : 'E'}`;
const windowText = (sc) => (sc.windowHours < 168 ? `${sc.windowHours} h` : `${sc.windowHours / 24}-day`);
const list = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);
const wrap180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

const PARAM = {
  date: { label: 'Mission date', unit: '', control: 'scenario-date' },
  windowHours: { label: 'Time window', unit: ' h', control: 'scenario-window' },
  observerHeight: { label: 'Solar array height', unit: ' m', control: 'scenario-array-height' },
  antennaHeight: { label: 'Antenna height', unit: ' m', control: 'scenario-antenna-height' },
  panelTilt: { label: 'Panel tilt', unit: '°', control: 'scenario-tilt' },
  panelAzimuth: { label: 'Panel azimuth', unit: '°', control: 'scenario-azimuth' },
};
const DELTA_LABEL = {
  sunAvailability: 'Sun above selected horizon',
  earthAvailability: 'Earth centre above horizon',
  meanIncidence: 'Mean panel incidence while Sun-visible',
  longestEarthOutage: 'Longest geometric Earth outage',
  longestDarkness: 'Longest darkness',
};
const QUALITY_NOTE = {
  [QUALITY.ILLUSTRATIVE]: 'On-screen percentages on this page come from the legacy illustrative formula, not the NASA ephemeris.',
  [QUALITY.APPROXIMATE]: 'Part of this window lies outside the bundled 2026 NASA table, so an approximate analytic fallback was used. Treat those values as approximate.',
  [QUALITY.EXPERIMENTAL_TERRAIN]: 'Terrain horizon mode is experimental: only the local crop is modeled and far-field ridges are ignored.',
  [QUALITY.PARTIAL_COVERAGE]: 'Some of the window could not be evaluated (unknown horizon). Those times are excluded, not counted as outages.',
  [QUALITY.PACKAGED_MODEL]: 'These are packaged model outputs read from a file: not live inference, and not measurements.',
  [QUALITY.DUPLICATED_VALUES]: 'Several sites carry identical values copied from the same training patch, so they do not tell those sites apart.',
};
const BOUNDARY_POWER = 'Sunlit hours and panel incidence are geometry, not electrical watts.';
const BOUNDARY_LINK = 'Earth visibility is geometric line of sight, not proof of a working radio link.';

function sourcesFor(...metas) {
  const out = new Map();
  const add = (s) => s && out.set(s.label, s);
  for (const m of metas) {
    const q = m?.quality ?? [];
    if (q.includes(QUALITY.SCIENCE)) { add(SOURCES.worker); add(SOURCES.svs); }
    if (q.includes(QUALITY.ILLUSTRATIVE)) add(SOURCES.legacy);
    if (q.includes(QUALITY.EXPERIMENTAL_TERRAIN)) { add(SOURCES.terrainManifest); add(SOURCES.lola); }
    if (q.includes(QUALITY.PACKAGED_MODEL)) add(SOURCES.lfm);
    for (const s of m?.sourceRefs ?? []) add(s);
  }
  return [...out.values()];
}
const qualityNotes = (...metas) => [...new Set(metas.flatMap((m) => m?.quality ?? []))].map((q) => QUALITY_NOTE[q]).filter(Boolean);

function make(intent, quick, extra = {}) {
  return {
    id: `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    intent, quick,
    why: extra.why ?? [],
    sources: extra.sources ?? [],
    quality: extra.quality ?? [],
    actions: extra.actions ?? [],
    pose: extra.pose ?? 'pointing',
    predict: extra.predict ?? null,
    autoAction: extra.autoAction ?? null,
    startTour: extra.startTour ?? false,
  };
}

const nav = (view, anchor = null, label) => ({ type: 'navigate', view, anchor, label: label ?? `Open ${VIEWS[view].label}` });
const hl = (anchor, label) => ({ type: 'highlight', anchor, label });
const ask = (question, label) => ({ type: 'ask', question, label: label ?? question });

// ── agent ──────────────────────────────────────────────────────────────────
export function createAstraAgent({ tools, phraser = null }) {
  let factCursor = 0;

  // Each handler receives (routed, state, use) where use(r) records a tool result as evidence.
  const handlers = {
    greeting(r, state) {
      const v = VIEWS[state.activeView];
      return make('greeting', `Hi! I'm Astra, your guide to Awilix. You're on ${v?.label ?? 'a page'}. I can explain this page, any control or number, or give you the tour.`, {
        pose: 'waving',
        actions: [ask('Explain this page'), { type: 'tour', label: 'Start the tour' }, { type: 'inspect', label: 'What does this control do?' }],
      });
    },

    tour() {
      return make('tour', `Let's go! The tour has ${TOUR_STEPS.length} short stops. You can pause, go back, skip, or ask me a question at any stop.`, { startTour: true, pose: 'waving' });
    },

    navigation(r, state) {
      const view = r.entities.view;
      const target = tools.navigateTo(view);
      if (target.error) return make('navigation', target.error, { pose: 'puzzled' });
      if (view === state.activeView) return make('navigation', `You're already on ${VIEWS[view].label}.`, { actions: [ask('Explain this page')] });
      return make('navigation', `Opening ${VIEWS[view].label}. ${VIEWS[view].purpose} Your selected site and settings stay as they are.`, {
        autoAction: target.data,
        actions: [ask(`Explain ${VIEWS[view].label}`, 'Explain it')],
      });
    },

    async screen(r, state, use) {
      const view = r.entities.view && r.entities.view !== state.activeView && /\bexplain\b/.test(r.text) ? r.entities.view : state.activeView;
      return explainView(view, state, use);
    },

    control(r, state) {
      const id = r.entities.control;
      if (!id) {
        const here = Object.entries(CONTROLS).filter(([, c]) => c.view === state.activeView);
        if (!here.length) return make('control', `${VIEWS[state.activeView]?.label ?? 'This page'} has no adjustable controls I track. Try the 3D Terrain or Scenario Lab pages.`, { actions: [nav('scenario'), nav('terrain')] });
        return make('control', 'Which control? Pick one below, or press “Point at a control” and then click it.', {
          actions: [{ type: 'inspect', label: 'Point at a control' }, ...here.slice(0, 5).map(([cid, c]) => ({ type: 'explain-control', control: cid, label: c.label }))],
        });
      }
      return explainControl(id, state);
    },

    async chart(r, state, use) {
      return explainChart(r.entities.view ?? state.activeView, state, use);
    },

    async comparison(r, state, use) {
      const ids = r.entities.sites.length >= 2 ? r.entities.sites : state.compareIds;
      if (!ids.length) return make('comparison', 'No sites are selected in Compare Sites yet. Add some and I can explain the trade-offs.', { actions: [{ type: 'set-compare', siteIds: ['shackleton-ridge', 'mons-mouton', 'malapert-a'], label: 'Select three sites' }, nav('compare')] });
      const wantsAdd = /\badd (the )?(other|remaining|rest|all)\b/.test(r.text);
      const res = use(await tools.getSelectedSiteComparison(ids, state.scenario, { priority: r.entities.priority }));
      const names = res.data.rows.map((x) => x.site.shortName);
      const addAction = res.data.unselected.length
        ? { type: 'set-compare', siteIds: [...state.compareIds, ...res.data.unselected.map((s) => s.id)].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6), label: `Add the other ${res.data.unselected.length} site${res.data.unselected.length > 1 ? 's' : ''}` }
        : null;
      if (wantsAdd) {
        if (!addAction) return make('comparison', 'All six sites are already selected in Compare Sites.');
        return make('comparison', `Currently comparing ${list(names)}. Press the button to add ${list(res.data.unselected.map((s) => s.shortName))}. I won't change your selection without asking.`, { actions: [addAction, nav('compare')] });
      }
      const why = [];
      if (res.error) why.push(`Science calculation unavailable: ${res.error}. Only on-screen illustrative values are available.`);
      const shownLine = res.data.rows.map((x) => `${x.site.shortName} ${x.shown.sunlight.value}% sun / ${x.shown.earth.value}% Earth`).join('; ');
      why.push(`On-screen bars (illustrative formula): ${shownLine}.`);
      let quick;
      const askedBest = /\b(best|optimal|ideal|winner)\b/.test(r.text);
      if (res.data.ranking) {
        const pr = res.data.priority;
        const label = { sunlight: 'modeled Sun-visible hours', earth: 'geometric Earth-visible hours', darkness: 'shortest longest-darkness', incidence: 'mean panel incidence' }[pr];
        const unit = pr === 'incidence' ? '%' : ' h';
        quick = `Ranked by ${label} for ${state.scenario.date} + ${windowText(state.scenario)} (science worker, reference horizon): ${res.data.ranking.map((x) => `${x.shortName} ${f1(x.value)}${unit}`).join(', ')}. That ordering holds for this priority only, not overall.`;
      } else if (res.data.rows.every((x) => x.calculated)) {
        const top = (k) => [...res.data.rows].sort((a, b) => (b.calculated[k].value ?? -1) - (a.calculated[k].value ?? -1))[0];
        const sun = top('sunVisibleHours'), earth = top('earthVisibleHours');
        quick = `Comparing ${list(names)} for ${state.scenario.date} + ${windowText(state.scenario)}: ${sun.site.shortName} has the most modeled sunlight (${f1(sun.calculated.sunVisibleHours.value)} h) and ${earth.site.shortName} the most geometric Earth visibility (${f1(earth.calculated.earthVisibleHours.value)} h). Which matters more depends on your mission priority.`;
        if (askedBest) quick = `There's no universal best site. It depends on what you prioritise. ${quick}`;
      } else {
        quick = `Comparing ${list(names)} using the on-screen illustrative values (the science calculation was unavailable). There's no single best site; it depends on your priority.`;
      }
      if (res.data.rows.every((x) => x.calculated)) {
        why.push(`Science worker, per site: ${res.data.rows.map((x) => `${x.site.shortName}: Sun ${f1(x.calculated.sunVisibleHours.value)} h, longest darkness ${f1(x.calculated.longestDarkness.value)} h, Earth ${f1(x.calculated.earthVisibleHours.value)} h`).join('; ')}.`);
      }
      why.push(...qualityNotes(res.meta), BOUNDARY_POWER, BOUNDARY_LINK);
      const actions = [];
      if (!res.data.ranking) actions.push(ask('Compare the selected sites by modeled sunlight', 'Rank by sunlight'), ask('Compare the selected sites by Earth visibility', 'Rank by Earth visibility'), ask('Compare the selected sites by shortest darkness', 'Rank by darkness'));
      if (addAction) actions.push(addAction);
      if (state.activeView !== 'compare') actions.push(nav('compare'));
      return make('comparison', quick, { why, sources: sourcesFor(res.meta, { quality: [QUALITY.ILLUSTRATIVE] }), quality: res.meta.quality, actions });
    },

    async 'scenario-change'(r, state, use) {
      const { candidate, notes, changed } = buildCandidate(state.scenario, r.entities.changes);
      if (!changed.length) return make('scenario-change', 'I could not tell which setting to change. Try “What if the antenna were 12 m?” or “What if landing slips 5 days?”.', { pose: 'puzzled', actions: [ask('What if landing is delayed by 7 days?'), ask('What if the antenna were 12 m?')] });
      const site = state.selectedSiteId;
      const res = use(await tools.getWhatIf(site, state.scenario, candidate, state.horizonMode));
      if (res.error) return make('scenario-change', `I couldn't calculate that: ${res.error}`, { pose: 'puzzled', quality: [QUALITY.UNAVAILABLE] });
      const d = res.data.deltas, b = res.data.base, c = res.data.candidate;
      const changeText = changed.map((k) => `${PARAM[k].label.toLowerCase()} ${state.scenario[k]}${PARAM[k].unit} → ${candidate[k]}${PARAM[k].unit}`).join(', ');
      const focus = changed.includes('antennaHeight') && changed.length === 1
        ? `Earth-centre visibility would go from ${f2(b.earthVisibleHours.value)} h to ${f2(c.earthVisibleHours.value)} h (${sgn(d.earthVisibleHours, 2)} h)`
        : `Sun-visible time would go from ${f2(b.sunVisibleHours.value)} h to ${f2(c.sunVisibleHours.value)} h (${sgn(d.sunVisibleHours, 2)} h) and Earth-visible time from ${f2(b.earthVisibleHours.value)} h to ${f2(c.earthVisibleHours.value)} h (${sgn(d.earthVisibleHours, 2)} h)`;
      const quick = `What-if for ${res.data.site.shortName} (${changeText}): ${focus}. Nothing has been changed yet.`;
      const why = [
        ...notes,
        `Longest darkness: ${f2(b.longestDarkness.value)} h → ${f2(c.longestDarkness.value)} h. Longest Earth outage: ${f2(b.longestEarthOutage.value)} h → ${f2(c.longestEarthOutage.value)} h. Mean panel incidence: ${f1(b.meanIncidence.value)}% → ${f1(c.meanIncidence.value)}%.`,
        `Both runs use the science worker, the ${state.horizonMode === 'terrain' ? 'experimental local terrain' : 'spherical reference'} horizon and the same site. This compares your current settings with the candidate; Scenario Lab's cards compare against the fixed reference.`,
        ...changed.map((k) => CONTROLS[PARAM[k].control]?.why).filter(Boolean),
        ...qualityNotes(res.meta),
        changed.includes('antennaHeight') ? BOUNDARY_LINK : BOUNDARY_POWER,
      ];
      const apply = { type: 'preview-scenario', changes: Object.fromEntries(changed.map((k) => [k, candidate[k]])), label: 'Apply in Scenario Lab', summary: changeText };
      return make('scenario-change', quick, { why, sources: sourcesFor(res.meta), quality: res.meta.quality, actions: [apply] });
    },

    async 'scenario-explain'(r, state, use) {
      return explainScenario(state, use);
    },

    async telemetry(r, state, use) {
      const siteId = r.entities.sites[0] ?? state.selectedSiteId;
      const res = use(await tools.getCurrentSiteAndTelemetry({ ...state, selectedSiteId: siteId }));
      if (!res.data) return make('telemetry', res.error ?? 'No site selected.', { pose: 'puzzled' });
      const { site, shown, calculated } = res.data;
      const why = [`On-screen cards for ${site.shortName} (illustrative formula): sunlight ${shown.data.sunlight.value}%, Earth ${shown.data.earth.value}%, power ${shown.data.power.value}%, comm ${shown.data.comm.value}%. These are normalized scores, not hours.`];
      if (!calculated) {
        return make('telemetry', `I couldn't run the science calculation for ${site.shortName} (${res.error ?? 'unknown error'}). The on-screen percentages are illustrative only.`, { why, quality: [QUALITY.UNAVAILABLE, QUALITY.ILLUSTRATIVE], sources: [SOURCES.legacy], pose: 'puzzled' });
      }
      const c = calculated.data;
      const powerQ = /\b(power|watts?|energy|panel|electric)/.test(r.text), linkQ = /\b(link|radio|comm|dsn|antenna)/.test(r.text);
      const quick = `Calculated for ${site.shortName}, ${state.scenario.date} 00:00 UTC + ${windowText(state.scenario)} (reference horizon): the Sun is above the horizon ${f1(c.sunVisibleHours.value)} h (${f1(c.sunAvailability.value)}% of known time) and Earth's centre ${f1(c.earthVisibleHours.value)} h. Longest darkness: ${f1(c.longestDarkness.value)} h.`;
      why.push(
        `Science worker detail: Sun max altitude ${f1(c.sunMaxAlt.value)}°, mean panel incidence ${f1(c.meanIncidence.value)}%, Earth max altitude ${f1(c.earthMaxAlt.value)}°, longest Earth outage ${f1(c.longestEarthOutage.value)} h. Sampling every ${c.stepMinutes} min, with crossings refined to about 1 s.`,
        calculated.meta.coverage + '.',
        ...qualityNotes(calculated.meta),
      );
      if (powerQ) why.unshift(BOUNDARY_POWER); else why.push(BOUNDARY_POWER);
      if (linkQ) why.unshift(BOUNDARY_LINK); else why.push(BOUNDARY_LINK);
      return make('telemetry', quick, { why, sources: sourcesFor(calculated.meta, { quality: [QUALITY.ILLUSTRATIVE] }), quality: calculated.meta.quality, actions: [nav('scenario', 'scenario-provenance', 'See it in Scenario Lab'), ask('Tell me a fun fact about this site', 'Fun fact')] });
    },

    async utc(r, state, use) {
      const hour = r.entities.hour ?? state.terrainHour ?? 12;
      const iso = `${state.scenario.date}T${String(hour).padStart(2, '0')}:00:00Z`;
      const sky = use(await tools.getSkyAt(state.selectedSiteId, iso));
      const site = tools.getCurrentViewState(state).data.selectedSite;
      const s = sky.data.sun, e = sky.data.earth;
      const quick = `Changing UTC moves the modeled Sun and Earth in the sky; the terrain heights stay fixed. At ${String(hour).padStart(2, '0')}:00 UTC on ${state.scenario.date}, the Sun at ${site.shortName} is at ${f1(s.alt)}° altitude, azimuth ${f1(s.az)}°${s.alt < 0 ? ' (below the reference horizon)' : ''}.`;
      const why = [
        `Earth at the same instant: altitude ${f1(e.alt)}°, azimuth ${f1(e.az)}°. Each direction is compared against the selected horizon to decide visibility.`,
        'The 3D Terrain renderer moves its directional light to this Sun direction and recomputes the shadow map, so shadows update when you change the hour. When the Sun is below 0°, direct light is switched off.',
        'Near the pole the Sun stays low and circles the horizon over the ~29.5-day lunar day, so a few hours mostly rotates shadows instead of shortening them.',
        'Shadow-map shadows only include terrain inside the crop. They are a visual aid, not a horizon or illumination calculation.',
        ...qualityNotes(sky.meta),
      ];
      return make('utc', quick, {
        why, sources: [SOURCES.code, SOURCES.svs], quality: sky.meta.quality,
        actions: [{ type: 'predict', id: 'terrain-utc', label: 'Predict, then reveal' }, ...(state.activeView !== 'terrain' ? [nav('terrain', 'terrain-timeline')] : [hl('terrain-timeline', 'Show the UTC slider')])],
      });
    },

    async terrain(r, state, use) {
      const siteId = r.entities.sites[0] ?? state.selectedSiteId;
      if (/\b(heat ?map|overlay|thermal)\b/.test(r.text) || (/\bice\b/.test(r.text) && /\b(overlay|colou?r|blue|map)\b/.test(r.text))) return explainControl('terrain-heatmap', state);
      if (/\bexaggerat/.test(r.text)) return explainControl('terrain-exaggeration', state);
      if (/\bshadow/.test(r.text)) return handlers.utc(r, state, use);
      const res = use(await tools.getTerrainProductInfo(siteId, state));
      if (!res.data) return make('terrain', `Terrain data isn't available right now: ${res.error}`, { pose: 'puzzled', quality: [QUALITY.UNAVAILABLE] });
      const t = res.data;
      const res80 = fin(t.nativeResolutionM) ? `${t.nativeResolutionM} m cells` : t.nativeResolutionDescription;
      const quick = `This terrain is a ${t.gridSize} × ${t.gridSize} elevation grid with ${res80}, covering ${t.widthKm.toFixed(2)} × ${t.heightKm.toFixed(2)} km (${t.sourceProduct}). Heights span ${f1(t.elevationSpanM)} m inside the crop.`;
      const why = [
        `Display mesh: ${t.displayMesh}. Smoothing interpolates between samples; it adds no measured detail.`,
        'The 20 m LOLA product is a separate shadow-mask product, not the elevation used here. Page copy that says “20 m altimetry” or a “20 km tile” overstates this crop.',
        `Elevation range ${f1(t.minElevationM)} m to ${f1(t.maxElevationM)} m relative to the assumed reference radius. ${t.maskedSamples ?? 0} masked cells are shown as holes.`,
        `Frame: ${t.frame}. Datum: ${t.datum}. Projection: ${t.projectionStatus}.`,
        'The Ice/Thermal heatmap is coloured from elevation only, so it is not ice or temperature data.',
        'Shadows follow the modeled Sun for the selected UTC hour; terrain elevations never change.',
      ];
      return make('terrain', quick, { why, sources: [SOURCES.terrainManifest, SOURCES.lola], quality: res.meta.quality, actions: [...(state.activeView !== 'terrain' ? [nav('terrain', 'terrain-info')] : [hl('terrain-info', 'Show the terrain info panel')]), ask('What happens to shadows when I change UTC?', 'UTC and shadows')] });
    },

    prospectivity(r, state, use) {
      const siteId = r.entities.sites[0] ?? state.selectedSiteId;
      const res = use(tools.getProspectivityInfo(siteId));
      if (!res.data) return make('prospectivity', res.error, { pose: 'puzzled' });
      const p = res.data;
      const name = tools.getCurrentViewState({ ...state, selectedSiteId: siteId }).data.selectedSite.shortName;
      const quick = `For ${name}, the packaged NASA-IBM model score is ${p.aiProspectivity.value}% (expert model ${p.expertProspectivity.value}%). It estimates where conditions favour ice; it is not a measurement of ice.`;
      const why = [
        'Not live inference: the panel reads a JSON file, and its loading animation is a fixed 2.2-second timer.',
        `Other values in the record: permanently shadowed area ${p.psrPercent.value}% within 5 km, max temperature ${p.maxTempK.value} K, slope ${p.slopeDeg.value}°. Source patch: ${p.sourceSite}.`,
        ...(p.sharesValuesWith.length ? [`Identical values are listed for ${p.sharesValuesWith.join(', ')}: all copied from the same “${p.sourceSite}” patch, so the score does not distinguish these sites.`] : []),
        ...qualityNotes(res.meta),
      ];
      return make('prospectivity', quick, { why, sources: sourcesFor(res.meta), quality: res.meta.quality, actions: state.activeView === 'analysis' ? [hl('analysis-prospectivity', 'Show the panel')] : [nav('analysis', 'analysis-prospectivity')] });
    },

    ice(r, state, use) {
      const k = use(tools.getKnowledge(r.text, { viewId: state.activeView, limit: 3 }));
      const items = k.data.filter((x) => ['lunar-water', 'ch2-radar', 'm3', 'ch3', 'prospectivity'].includes(x.id));
      const primary = items.find((x) => x.id !== 'lunar-water') ?? items[0] ?? { text: '', detail: '' };
      const water = items.find((x) => x.id === 'lunar-water') ?? tools.getKnowledge('water ice psr').data[0];
      const site = tools.getCurrentViewState(state).data.selectedSite;
      const quick = primary.id && primary.id !== 'lunar-water' ? primary.text : water.text;
      const why = [
        ...(primary.id && primary.id !== 'lunar-water' ? [primary.detail, water.text] : [water.detail]),
        'Awilix currently shows no radar, M³ or Chandrayaan-3 data layers. The 3D Terrain “Ice” heatmap is inverted elevation, not evidence.',
        `The catalog lists ${site.shortName}'s water-ice potential as a claim that has not been reviewed. Ask about prospectivity for the packaged model score.`,
        'Chandrayaan-3 measurements describe Shiv Shakti only and are not transferred to these six sites.',
      ];
      return make('ice', quick, { why, sources: [SOURCES.plan, SOURCES.catalog], actions: [ask('What is the ice prospectivity score here?', 'Prospectivity score')] });
    },

    science(r, state, use) {
      const k = use(tools.getKnowledge(r.text, { viewId: state.activeView, limit: 2 }));
      if (!k.data.length) return handlers.unknown(r, state);
      const [a, b] = k.data;
      return make('science', a.text, { why: [a.detail, ...(b ? [b.text] : [])], sources: [...a.sourceRefs, ...(b?.sourceRefs ?? [])].filter((s, i, arr) => arr.findIndex((x) => x.label === s.label) === i), actions: [ask('Tell me a fun fact', 'Fun fact')] });
    },

    sources(r, state, use) {
      const k = use(tools.getKnowledge('sources ephemeris validation resolution', { limit: 4 }));
      const byId = Object.fromEntries(k.data.map((x) => [x.id, x]));
      const quick = 'Sun/Earth directions come from NASA SVS 5587 hourly 2026 data, terrain from legacy LOLA-derived 80 m crops, and site text from the Awilix catalog. Scenario Lab lists these under “Calculation provenance & limits”.';
      const why = [
        byId['horizons-check']?.text, byId['horizons-check']?.detail,
        byId.ephemeris?.detail,
        byId.resolution?.text,
        'Catalog descriptions, mission links and fun facts are unreviewed claims. The ice prospectivity panel uses packaged model values.',
        'There is no separate Sources page in the current navigation; DATA_SOURCES.md holds the full notes.',
      ].filter(Boolean);
      return make('sources', quick, { why, sources: [SOURCES.svs, SOURCES.horizons, SOURCES.lola, SOURCES.dataSources, SOURCES.naif], actions: [nav('scenario', 'scenario-provenance', 'Open provenance panel')] });
    },

    privacy(r, state, use) {
      const k = use(tools.getKnowledge('privacy astra model', { limit: 1 }));
      return make('privacy', k.data[0].text, { why: [k.data[0].detail, 'I can read app state and run Awilix calculations. I can navigate when you ask, but I only change settings when you press Apply.'], sources: [SOURCES.code] });
    },

    async 'fun-fact'(r, state, use) {
      factCursor += 1;
      if (factCursor % 2 === 1) {
        const res = use(await tools.getCurrentSiteAndTelemetry(state));
        const c = res.data?.calculated?.data;
        if (c && fin(c.sunMaxAlt.value)) {
          return make('fun-fact', `During this ${windowText(state.scenario)} window, the Sun never climbs more than ${f1(c.sunMaxAlt.value)}° above ${res.data.site.shortName}'s horizon. At the pole the Sun skims the edge of the sky instead of rising overhead.`, {
            why: ['Computed live by the science worker for the current site, date and window (reference horizon).', ...qualityNotes(res.data.calculated.meta)], sources: sourcesFor(res.data.calculated.meta), pose: 'celebrating',
          });
        }
      }
      const pool = STATIC_FACTS.filter((x) => x.views.includes(state.activeView));
      const fact = (pool.length ? pool : STATIC_FACTS)[factCursor % (pool.length || STATIC_FACTS.length)];
      return make('fun-fact', fact.text, { sources: fact.sources.map((s) => SOURCES[s]), pose: 'celebrating' });
    },

    async site(r, state, use) {
      const id = r.entities.sites[0];
      const res = use(await tools.getCurrentSiteAndTelemetry({ ...state, selectedSiteId: id }));
      if (!res.data) return handlers.unknown(r, state);
      const s = res.data.site, c = res.data.calculated?.data;
      const quick = `${s.shortName} sits at ${coord(s)} (${s.targetRegion}).${c ? ` For the current window it gets ${f1(c.sunVisibleHours.value)} h of modeled sunlight and ${f1(c.earthVisibleHours.value)} h of geometric Earth visibility.` : ''}`;
      const why = [
        'Coordinates are a regional catalog marker, not a surveyed touchdown point.',
        'Mission associations, “why NASA chose” text and fun facts on its card come from the Awilix catalog and have not been independently reviewed.',
        ...(res.data.calculated ? qualityNotes(res.data.calculated.meta) : []),
      ];
      const actions = [];
      if (id !== state.selectedSiteId) actions.push({ type: 'select-site', siteId: id, label: `Select ${s.shortName}` });
      if (!state.compareIds.includes(id)) actions.push({ type: 'set-compare', siteIds: [...state.compareIds, id].slice(0, 6), label: 'Add to comparison' });
      return make('site', quick, { why, sources: [...sourcesFor(res.data.calculated?.meta), SOURCES.catalog], actions });
    },

    unknown(r, state) {
      const v = VIEWS[state.activeView];
      return make('unknown', 'I don’t have a grounded answer for that, and I won’t guess. I can explain this page, a control, a chart or number, compare sites, or run a what-if.', {
        pose: 'puzzled',
        actions: [ask('Explain this page'), ...(v?.tryIt?.action?.type === 'ask' ? [ask(v.tryIt.action.question, v.tryIt.label)] : []), { type: 'tour', label: 'Take the tour' }],
      });
    },
  };

  // ── composite explainers ─────────────────────────────────────────────────
  async function explainView(viewId, state, use) {
    const v = VIEWS[viewId];
    const vs = use(tools.getCurrentViewState({ ...state, activeView: viewId })).data;
    const site = vs.selectedSite;
    let quick = `${v.label}: ${v.purpose}`;
    const why = [v.explain];
    const actions = Object.entries(v.anchors).slice(0, 3).map(([anchor, label]) => (viewId === state.activeView ? hl(anchor, `Show: ${label}`) : nav(viewId, anchor, `Open: ${label}`)));
    const quality = [];

    if (viewId === 'overview') {
      const all = use(await tools.getSelectedSiteComparison(vs.compareIds.length ? ['shackleton-rim', 'malapert-a', 'mons-mouton', 'nobile', 'shackleton-ridge', 'south-pole'] : [], state.scenario, { includeScience: false }));
      const mean = (k) => Math.round(all.data.rows.reduce((s, x) => s + x.shown[k].value, 0) / all.data.rows.length);
      why.unshift(`Current cards for ${state.scenario.date}, ${windowText(state.scenario)} window: solar ${mean('sunlight')}%, Earth ${mean('earth')}%, power ${mean('power')}% (illustrative six-site means).`);
      quality.push(QUALITY.ILLUSTRATIVE);
    } else if (viewId === 'sites') {
      why.push(`The six sites: ${list(['Shackleton Rim', 'Malapert A', 'Mons Mouton', 'Nobile Rim', 'Shackleton Ridge', 'Geographic Pole'])}.`);
      quality.push(QUALITY.ILLUSTRATIVE, QUALITY.CATALOG);
    } else if (viewId === 'globe') {
      quick = `${v.label}: ${v.purpose} ${site.shortName} (${coord(site)}) is selected.`;
    } else if (viewId === 'terrain') {
      const t = use(await tools.getTerrainProductInfo(site.id, state));
      const hour = state.terrainHour ?? 12;
      quick = `${v.label} shows ${site.shortName}'s terrain crop${t.data ? ` (${t.data.widthKm.toFixed(2)} km across, ${t.data.nativeResolutionM ?? '?'} m cells)` : ''}, lit by the modeled Sun at ${String(hour).padStart(2, '0')}:00 UTC on ${state.scenario.date}.`;
      why.push('Lighting toggle, smoothing, wireframe and exaggeration are display aids. The Ice/Thermal heatmap is derived from elevation only.');
      quality.push(QUALITY.EXPERIMENTAL_TERRAIN);
    } else if (viewId === 'analysis') {
      const tel = use(await tools.getCurrentSiteAndTelemetry(state, { includeScience: false }));
      const s = tel.data.shown.data;
      quick = `${v.label} for ${site.shortName}: the cards show ${s.sunlight.value}% sunlight, ${s.earth.value}% Earth, ${s.power.value}% power and ${s.comm.value}% comm. These are illustrative scores, not calculated hours.`;
      why.push(`Tab open: ${state.analysisTab === 'terrain' ? '3D terrain' : 'charts'}. The ice prospectivity panel shows packaged model values, not live inference.`);
      quality.push(QUALITY.ILLUSTRATIVE);
    } else if (viewId === 'compare') {
      const names = vs.compareNames;
      quick = names.length
        ? `${v.label}: you're comparing ${names.length} of 6 sites (${list(names)}) for a ${windowText(state.scenario)} window. Bars and table use the illustrative formula.`
        : `${v.label}: no sites are selected yet. Toggle the chips to add any of the six.`;
      if (names.length < 6) actions.unshift({ type: 'set-compare', siteIds: [...vs.compareIds, ...['shackleton-rim', 'malapert-a', 'mons-mouton', 'nobile', 'shackleton-ridge', 'south-pole'].filter((id) => !vs.compareIds.includes(id))], label: `Add the other ${6 - names.length}` });
      quality.push(QUALITY.ILLUSTRATIVE);
    } else if (viewId === 'scenario') {
      return explainScenario(state, use, true);
    }
    if (v.tryIt) {
      const a = v.tryIt.action;
      actions.push(a.type === 'ask' ? ask(a.question, v.tryIt.label) : { ...a, label: v.tryIt.label });
    }
    return make('screen', quick, { why: [...why, ...qualityNotes({ quality })], quality, sources: [SOURCES.code, ...sourcesFor({ quality })], actions });
  }

  function explainControl(id, state) {
    const c = CONTROLS[id];
    if (!c) return handlers.unknown({ text: '' }, state);
    const actions = c.view === state.activeView ? [hl(id, `Show the ${c.label.toLowerCase()}`)] : [nav(c.view, id, `Open ${VIEWS[c.view].label} at this control`)];
    if (id === 'terrain-hour') actions.push({ type: 'predict', id: 'terrain-utc', label: 'Predict, then reveal' });
    if (id === 'scenario-antenna-height') actions.push({ type: 'predict', id: 'scenario-antenna', label: 'Predict, then reveal' });
    if (id === 'scenario-date') actions.push({ type: 'predict', id: 'scenario-delay', label: 'Predict a 7-day delay' });
    return make('control', `${c.label}: ${c.text}`, { why: [c.why], sources: [SOURCES.code], actions });
  }

  async function explainChart(viewId, state, use) {
    if (viewId === 'scenario') return explainScenario(state, use, false, true);
    if (viewId === 'compare') return handlers.comparison({ text: 'compare', entities: { sites: [], priority: null } }, state, use);
    if (viewId === 'terrain') return handlers.utc({ text: '', entities: { hour: null } }, state, use);
    const tel = use(await tools.getCurrentSiteAndTelemetry(state));
    const s = tel.data.shown.data, c = tel.data.calculated?.data;
    if (viewId === 'analysis' || viewId === 'overview' || viewId === 'globe' || viewId === 'sites') {
      const quick = viewId === 'analysis'
        ? `The Site Analysis chart plots three illustrative lines for ${tel.data.site.shortName}: gold = Sun, cyan = Earth, blue = power opportunity, as 0–100% scores over the window. Its footnote says it is not a NASA ephemeris result.`
        : `These percentages for ${tel.data.site.shortName} (${s.sunlight.value}% sun, ${s.earth.value}% Earth) are illustrative normalized scores from a simple formula, not calculated hours.`;
      const why = [
        `The illustrative peak altitudes (Sun ${f1(s.peakSunAlt.value)}°, Earth ${f1(s.peakEarthAlt.value)}°) come from that formula too, and the polar horizon readout positions its icons from them.`,
        ...(c ? [`For comparison, the science worker gives ${f1(c.sunVisibleHours.value)} h Sun-visible (${f1(c.sunAvailability.value)}%) and ${f1(c.earthVisibleHours.value)} h Earth-visible (${f1(c.earthAvailability.value)}%) for the same window, with Sun max altitude ${f1(c.sunMaxAlt.value)}°.`] : []),
        BOUNDARY_POWER, BOUNDARY_LINK,
      ];
      return make('chart', quick, { why, quality: [QUALITY.ILLUSTRATIVE, ...(tel.data.calculated?.meta.quality ?? [])], sources: sourcesFor({ quality: [QUALITY.ILLUSTRATIVE] }, tel.data.calculated?.meta), actions: viewId === 'analysis' ? [hl('analysis-chart', 'Show the chart'), nav('scenario', 'scenario-chart', 'See the calculated chart')] : [] });
    }
    return explainView(viewId, state, use);
  }

  async function explainScenario(state, use, asPage = false, asChart = false) {
    const res = use(await tools.getScenarioVsReference(state.selectedSiteId, state.scenario, state.horizonMode));
    const site = res.data.site.shortName;
    const changed = res.data.changed;
    const changedText = changed.length
      ? `You changed ${list(changed.map((x) => `${PARAM[x.key].label.toLowerCase()} (${x.reference}${PARAM[x.key].unit} → ${x.custom}${PARAM[x.key].unit})`))}.`
      : 'Your settings currently match the reference, so every delta is zero.';
    if (res.error) {
      return make('scenario-explain', `Scenario Lab compares one custom case with a fixed reference at ${site}. ${changedText} The calculation is unavailable right now (${res.error}), so I have no deltas to report.`, { pose: 'puzzled', quality: [QUALITY.UNAVAILABLE] });
    }
    const byKey = Object.fromEntries(res.data.deltas.map((d) => [d.key, d]));
    const sun = byKey.sunAvailability, earth = byKey.earthAvailability;
    const quick = asChart
      ? `The calculated chart for ${site} (custom case) steps between visible and not visible for the Sun (gold) and Earth's centre (cyan); the blue line is panel incidence. Delta cards: Sun ${f1(sun.custom)}% vs ${f1(sun.reference)}% reference (${sgn(sun.delta)} pp), Earth ${f1(earth.custom)}% vs ${f1(earth.reference)}% (${sgn(earth.delta)} pp).`
      : `Scenario Lab compares one custom case with a fixed reference at ${site} (${state.horizonMode === 'terrain' ? 'experimental terrain' : 'reference-sphere'} horizon). ${changedText}${changed.length ? ` Sun availability ${f1(sun.custom)}% vs ${f1(sun.reference)}% (${sgn(sun.delta)} pp); Earth ${f1(earth.custom)}% vs ${f1(earth.reference)}% (${sgn(earth.delta)} pp).` : ''}`;
    const why = [
      ...res.data.deltas.map((d) => `${DELTA_LABEL[d.key]}: custom ${f2(d.custom)} vs reference ${f2(d.reference)} → ${sgn(d.delta)} ${d.unit}${d.higherIsBetter ? '' : ' (lower is better)'}${d.key === 'longestDarkness' ? ' (not shown as a card)' : ''}.`),
      'Reference case: 2026-11-13, 48 h, array 2 m, antenna 2 m, tilt 8°, azimuth 180°, same site and horizon mode. Every delta is custom minus reference.',
      ...changed.map((x) => CONTROLS[PARAM[x.key].control]?.why).filter(Boolean),
      ...(changed.some((x) => x.key === 'date' || x.key === 'windowHours') ? ['Date and window changes shift which part of the lunar day is sampled, which often dominates the delta.'] : []),
      ...qualityNotes(res.meta),
      BOUNDARY_POWER, BOUNDARY_LINK,
    ];
    const actions = [];
    if (state.activeView !== 'scenario') actions.push(nav('scenario', asChart ? 'scenario-chart' : 'scenario-delta'));
    else actions.push(hl(asChart ? 'scenario-chart' : 'scenario-delta', asChart ? 'Show the chart' : 'Show the delta cards'));
    actions.push({ type: 'predict', id: 'scenario-antenna', label: 'Predict: taller antenna' }, { type: 'predict', id: 'scenario-delay', label: 'Predict: 7-day delay' });
    return make(asPage ? 'screen' : 'scenario-explain', quick, { why, sources: sourcesFor(res.meta), quality: res.meta.quality, actions });
  }

  // ── predict, then reveal ─────────────────────────────────────────────────
  const PREDICTIONS = {
    'terrain-utc': (state) => {
      const from = state.terrainHour ?? 12, to = (from + 6) % 24;
      return {
        prompt: `On the 3D Terrain page it's ${String(from).padStart(2, '0')}:00 UTC. If we move to ${String(to).padStart(2, '0')}:00, what will the shadows do?`,
        options: [
          { id: 'rotate', label: 'Swing around to point a new way' },
          { id: 'shorter', label: 'Get much shorter as the Sun climbs high' },
          { id: 'same', label: 'Stay exactly the same' },
          { id: 'terrain', label: 'The mountains themselves will change' },
        ],
        context: { from, to },
      };
    },
    'scenario-antenna': (state) => {
      const from = state.scenario.antennaHeight, to = from <= 20 ? from + 10 : 2;
      return {
        prompt: `If the antenna goes from ${from} m to ${to} m at ${tools.getCurrentViewState(state).data.selectedSite.shortName}, what happens to Earth visibility?`,
        options: [
          { id: 'up-lot', label: 'Goes up a lot (5+ points)' },
          { id: 'up-little', label: 'Goes up a little' },
          { id: 'same', label: 'Basically no change' },
          { id: 'down', label: 'Goes down' },
        ],
        context: { from, to },
      };
    },
    'scenario-delay': (state) => ({
      prompt: `If landing slips 7 days (from ${state.scenario.date}), will Sun-visible hours in the ${windowText(state.scenario)} window go up or down?`,
      options: [{ id: 'up', label: 'Up' }, { id: 'down', label: 'Down' }, { id: 'same', label: 'About the same' }],
      context: { days: 7 },
    }),
  };

  async function reveal(id, choice, context, state) {
    const ev = [];
    const use = (x) => { ev.push(x); return x; };
    let out;
    if (id === 'terrain-utc') {
      const t = (h) => `${state.scenario.date}T${String(h).padStart(2, '0')}:00:00Z`;
      const a = use(await tools.getSkyAt(state.selectedSiteId, t(context.from))).data.sun;
      const bRes = use(await tools.getSkyAt(state.selectedSiteId, t(context.to)));
      const b = bRes.data.sun;
      const dAz = wrap180(b.az - a.az), dAlt = b.alt - a.alt;
      const dark = a.alt < 0 && b.alt < 0;
      const correct = dark ? 'none' : Math.abs(dAlt) >= 10 ? 'shorter' : 'rotate';
      const verdict = choice === correct ? 'You got it! ' : correct === 'none' ? '' : choice === 'terrain' ? 'Not quite: the terrain never changes. ' : 'Not quite. ';
      const quick = dark
        ? `${verdict}Interesting case: the modeled Sun is below the horizon at both times (${f1(a.alt)}° and ${f1(b.alt)}°), so there's no direct sunlight to cast shadows at all.`
        : `${verdict}The Sun's azimuth moved ${f1(Math.abs(dAz))}° while its altitude only changed from ${f1(a.alt)}° to ${f1(b.alt)}°. Near the pole the Sun stays low and circles the horizon, so shadows mostly swing around. The ground itself is fixed.`;
      out = make('predict-reveal', quick, {
        why: [`Sun direction at ${String(context.from).padStart(2, '0')}:00 UTC: alt ${f2(a.alt)}°, az ${f1(a.az)}°. At ${String(context.to).padStart(2, '0')}:00 UTC: alt ${f2(b.alt)}°, az ${f1(b.az)}°.`, 'I moved the terrain hour slider so you can see it. The renderer recomputed its light and shadow map.', ...qualityNotes(bRes.meta)],
        sources: [SOURCES.code, SOURCES.svs], quality: bRes.meta.quality, pose: choice === correct ? 'celebrating' : 'thinking',
        autoAction: { type: 'set-terrain-hour', hour: context.to, view: 'terrain' },
      });
    } else if (id === 'scenario-antenna' || id === 'scenario-delay') {
      const candidate = { ...state.scenario };
      if (id === 'scenario-antenna') candidate.antennaHeight = context.to;
      else candidate.date = new Date(Date.parse(`${state.scenario.date}T00:00:00Z`) + context.days * 86400000).toISOString().slice(0, 10);
      const res = use(await tools.getWhatIf(state.selectedSiteId, state.scenario, candidate, state.horizonMode));
      if (res.error) return make('predict-reveal', `I couldn't run the calculation: ${res.error}`, { pose: 'puzzled' });
      if (id === 'scenario-antenna') {
        const d = res.data.deltas.earthAvailability;
        const correct = !fin(d) ? null : d >= 5 ? 'up-lot' : d > 0.05 ? 'up-little' : d < -0.05 ? 'down' : 'same';
        out = make('predict-reveal', `${choice === correct ? 'You got it! ' : 'Not quite. '}Earth-centre availability changes by ${sgn(d, 2)} percentage points (${f1(res.data.base.earthAvailability.value)}% → ${f1(res.data.candidate.earthAvailability.value)}%). A taller mast only lowers the geometric horizon a tiny bit, so it matters mainly when Earth hugs the horizon.`, {
          why: [`Earth-visible hours: ${f2(res.data.base.earthVisibleHours.value)} → ${f2(res.data.candidate.earthVisibleHours.value)} h. Longest Earth outage: ${f2(res.data.base.longestEarthOutage.value)} → ${f2(res.data.candidate.longestEarthOutage.value)} h.`, CONTROLS['scenario-antenna-height'].why, ...qualityNotes(res.meta), BOUNDARY_LINK],
          sources: sourcesFor(res.meta), quality: res.meta.quality, pose: choice === correct ? 'celebrating' : 'thinking',
          actions: [{ type: 'preview-scenario', changes: { antennaHeight: context.to }, label: `Apply ${context.to} m antenna`, summary: `antenna height ${context.from} m → ${context.to} m` }],
        });
      } else {
        const d = res.data.deltas.sunVisibleHours;
        const correct = !fin(d) ? null : Math.abs(d) < 0.05 ? 'same' : d > 0 ? 'up' : 'down';
        out = make('predict-reveal', `${choice === correct ? 'You got it! ' : 'Not quite. '}Sun-visible time goes from ${f2(res.data.base.sunVisibleHours.value)} h to ${f2(res.data.candidate.sunVisibleHours.value)} h (${sgn(d, 2)} h). A week is about a quarter of a lunar day, so the Sun ends up in a very different part of its circle around the pole.`, {
          why: [`New start: ${candidate.date} 00:00 UTC. Longest darkness: ${f2(res.data.base.longestDarkness.value)} → ${f2(res.data.candidate.longestDarkness.value)} h.`, ...qualityNotes(res.meta), BOUNDARY_POWER],
          sources: sourcesFor(res.meta), quality: res.meta.quality, pose: choice === correct ? 'celebrating' : 'thinking',
          actions: [{ type: 'preview-scenario', changes: { date: candidate.date }, label: `Apply ${candidate.date}`, summary: `mission date ${state.scenario.date} → ${candidate.date}` }],
        });
      }
    } else {
      out = make('predict-reveal', 'That activity is not available.', { pose: 'puzzled' });
    }
    return finalize(out, ev, '');
  }

  function predict(id, state) {
    const p = PREDICTIONS[id]?.(state);
    if (!p) return make('predict', 'That activity is not available.', { pose: 'puzzled' });
    return make('predict', p.prompt, { predict: { id, options: p.options, context: p.context }, pose: 'thinking' });
  }

  // ── finalize: validate (and optionally rephrase) ─────────────────────────
  async function finalize(answer, evidenceList, question) {
    const evidence = collectEvidence(evidenceList, question, answer.actions, answer.predict);
    const { answer: checked, issues } = validateAnswer(answer, evidence);
    let final = { ...checked, validation: { issues, phrasedBy: null } };
    if (phraser && !final.predict && final.intent !== 'unknown') {
      try {
        const phrased = await phraser.rephrase(final.quick);
        if (phrased) {
          const v = validateText(phrased, evidence);
          if (v.ok && v.text) final = { ...final, quick: v.text, validation: { ...final.validation, phrasedBy: phraser.name } };
          else final.validation.issues.push({ type: 'phraser-rejected', detail: v.issues.map((i) => i.detail).join('; ') });
        }
      } catch (e) {
        final.validation.issues.push({ type: 'phraser-unavailable', detail: e.message });
      }
    }
    return final;
  }

  // ── model fallback: questions the router can't place go to the backend model,
  //    grounded in live tool output, then through the same validator. ─────────
  const history = [];
  const remember = (q, a) => { history.push({ role: 'user', content: q }, { role: 'assistant', content: a }); history.splice(0, Math.max(0, history.length - 8)); };

  async function modelAnswer(question, state, fallback) {
    const ev = [];
    const use = (x) => { ev.push(x); return x; };
    const [view, telemetry, comparison] = await Promise.all([
      use(tools.getCurrentViewState(state)),
      tools.getCurrentSiteAndTelemetry(state).then(use).catch(() => null),
      state.compareIds?.length ? tools.getSelectedSiteComparison(state.compareIds, state.scenario).then(use).catch(() => null) : null,
    ]);
    const knowledge = use(tools.getKnowledge(question, { viewId: state.activeView, limit: 4 }));
    const context = {
      view: view?.data,
      selectedSite: telemetry?.data ? { ...telemetry.data, quality: telemetry.meta?.quality } : null,
      comparison: comparison?.data ?? null,
      relevantKnowledge: knowledge?.data?.map((k) => ({ status: k.status, text: k.text, detail: k.detail })) ?? [],
      notes: 'shown = illustrative on-screen values (getSummary); calculated = science worker using the NASA SVS 2026 table and horizon geometry.',
    };
    const text = await phraser.answer(question, context, history.slice());
    if (!text) return null;
    const evidence = collectEvidence(ev, question, context);
    const v = validateText(text, evidence);
    if (!v.text) return null;
    remember(question, v.text);
    return {
      ...fallback,
      intent: 'model',
      quick: v.text,
      why: [],
      pose: 'pointing',
      sources: [SOURCES.code],
      quality: telemetry?.data?.calculated ? [] : [QUALITY.ILLUSTRATIVE],
      validation: { issues: v.issues, phrasedBy: phraser.name },
    };
  }

  async function askAgent(question, state) {
    const routed = routeIntent(question, state);
    const ev = [];
    const use = (x) => { ev.push(x); return x; };
    let answer;
    try {
      answer = await (handlers[routed.intent] ?? handlers.unknown)(routed, state, use);
    } catch (e) {
      answer = make(routed.intent, `Something went wrong while I was checking that (${e.message}). Nothing in the app was changed. Try again, or ask a different question.`, { pose: 'puzzled', quality: [QUALITY.UNAVAILABLE] });
    }
    answer.routed = { intent: routed.intent, entities: routed.entities };
    if (answer.intent === 'unknown' && phraser?.answer && phraser.enabled !== false) {
      try {
        const m = await modelAnswer(question, state, answer);
        if (m) return m;
      } catch { /* backend down: fall through to the deterministic reply */ }
    }
    const final = await finalize(answer, ev, question);
    remember(question, final.quick);
    return final;
  }

  return {
    ask: askAgent,
    predict,
    reveal,
    explainControl: (id, state) => finalize(explainControl(id, state), [], ''),
    explainPage: async (state) => {
      const ev = []; const use = (x) => { ev.push(x); return x; };
      return finalize(await explainView(state.activeView, state, use), ev, '');
    },
  };
}

/** Turn parsed changes into a validated candidate scenario (nothing is applied). */
export function buildCandidate(scenario, changes) {
  const candidate = { ...scenario }, notes = [];
  const clamp = (key, v, min, max) => {
    const c = Math.min(max, Math.max(min, v));
    if (c !== v) notes.push(`${PARAM[key].label} is limited to ${min}–${max}${PARAM[key].unit} in Scenario Lab, so I used ${c}${PARAM[key].unit}.`);
    return c;
  };
  if (changes.delayDays != null) {
    const days = clamp('date', changes.delayDays, 1, 60);
    candidate.date = new Date(Date.parse(`${scenario.date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
  }
  if (changes.date && Number.isFinite(Date.parse(`${changes.date}T00:00:00Z`))) candidate.date = changes.date;
  if (changes.antennaHeight === 'raise') candidate.antennaHeight = Math.min(30, scenario.antennaHeight + 10);
  else if (changes.antennaHeight === 'lower') candidate.antennaHeight = Math.max(0, scenario.antennaHeight - 10);
  else if (changes.antennaHeight != null) candidate.antennaHeight = clamp('antennaHeight', changes.antennaHeight, 0, 30);
  if (changes.observerHeight != null) candidate.observerHeight = clamp('observerHeight', changes.observerHeight, 0, 20);
  if (changes.panelTilt != null) candidate.panelTilt = clamp('panelTilt', changes.panelTilt, 0, 90);
  if (changes.panelAzimuth != null) candidate.panelAzimuth = clamp('panelAzimuth', changes.panelAzimuth, 0, 360);
  if (changes.windowHours != null) {
    if ([24, 48, 168, 336].includes(changes.windowHours)) candidate.windowHours = changes.windowHours;
    else notes.push('Scenario Lab windows are 24 h, 48 h, 7 days or 14 days.');
  }
  const changed = Object.keys(PARAM).filter((k) => candidate[k] !== scenario[k]);
  return { candidate, notes, changed };
}
