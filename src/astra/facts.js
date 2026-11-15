// Astra reviewed fact sheet (Plan P0).
//
// Every statement Astra may make that is NOT a live tool output lives here, with
// its evidence status. Live numbers always come from tools.js. If you add a
// fact, give it a status and at least one source; unsourced site-catalog
// claims must stay `catalog-unverified` so Astra never repeats them as settled.
//
// status values:
//   verified-in-code   – checked against the current source code of this app
//   documented         – stated in repository documentation / data manifests
//   external-reference – approved external scientific reference
//   catalog-unverified – appears in the site catalog but has no reviewed source
//   plan-guidance      – scientific boundary from the Astra implementation plan;
//                        external links still need team review before display

export const SOURCES = {
  code: { id: 'code', label: 'Awilix source code (reviewed)', kind: 'project' },
  worker: { id: 'worker', label: 'Awilix science worker · scenarioAnalysis.js', kind: 'tool' },
  legacy: { id: 'legacy', label: 'Legacy illustrative formula · getSummary()', kind: 'tool' },
  dataSources: { id: 'dataSources', label: 'DATA_SOURCES.md', href: '/DATA_SOURCES.md', kind: 'project' },
  svs: { id: 'svs', label: 'NASA SVS 5587 (2026 hourly Moon data)', href: 'https://svs.gsfc.nasa.gov/5587/', kind: 'external' },
  horizons: { id: 'horizons', label: 'JPL Horizons DE441 cross-check', kind: 'project' },
  lola: { id: 'lola', label: 'LOLA archive (PDS Geosciences)', href: 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm', kind: 'external' },
  naif: { id: 'naif', label: 'NASA NAIF lunar frames tutorial', href: 'https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/Tutorials/pdf/individual_docs/23_lunar-earth_pck-fk.pdf', kind: 'external' },
  terrainManifest: { id: 'terrainManifest', label: 'science-terrain manifest', href: '/science-terrain/manifest.json', kind: 'project' },
  lfm: { id: 'lfm', label: 'ice-prospectivity.json (packaged NASA-IBM LFM values)', kind: 'project' },
  catalog: { id: 'catalog', label: 'Awilix site catalog (unreviewed claims)', kind: 'catalog' },
  im2: { id: 'im2', label: 'NASA IM-2 surface record', href: 'https://www.nasa.gov/image-article/nasas-lunar-reconnaissance-orbiter-views-im-2-on-moons-surface/', kind: 'external' },
  plan: { id: 'plan', label: 'Astra plan · evidence-layer guidance', kind: 'project' },
};

/** Navigation views that exist in the current UI (NAVIGATION_ITEMS). */
export const VIEWS = {
  overview: {
    label: 'Mission Overview',
    aliases: ['overview', 'home', 'mission overview', 'dashboard', 'start'],
    purpose: 'The landing page: project goal, a compact globe, four headline metric cards and the six-site shortlist.',
    anchors: { 'overview-hero': 'Mission hero and compact globe', 'overview-metrics': 'Headline metric cards', 'overview-shortlist': 'South-pole shortlist' },
    explain:
      'The three percentage cards are six-site means from the legacy illustrative formula, not the science worker. The "Ephemeris status: Ready" card is static text; it does not report a live check.',
    tryIt: { label: 'Open the Candidate Sites list', action: { type: 'navigate', view: 'sites' } },
  },
  sites: {
    label: 'Candidate Sites',
    aliases: ['candidate sites', 'sites', 'site list', 'site cards', 'candidates'],
    purpose: 'Cards for all six catalog sites with coordinates, catalog descriptions and quick metrics. Grid and stack layouts are available.',
    anchors: { 'sites-grid': 'Site cards', 'sites-layout': 'Grid / stack layout toggle' },
    explain:
      'Card percentages come from the legacy illustrative formula. Descriptions, mission links and fun facts come from the site catalog and have not been independently reviewed, so treat them as claims.',
    tryIt: { label: 'Open a site in Site Analysis', action: { type: 'navigate', view: 'analysis' } },
  },
  globe: {
    label: 'Lunar Globe',
    aliases: ['globe', 'lunar globe', 'moon globe', '3d globe', 'whole moon'],
    purpose: 'An interactive 3D Moon with the six site markers, Sun and Earth direction vectors, scale modes and camera targets.',
    anchors: { 'globe-canvas': '3D globe', 'globe-readout': 'Selected-site readout', 'globe-legend': 'Candidate marker legend' },
    explain:
      'Click a marker or a legend entry to select a site. Vector directions come from the shared ephemeris module for the mission date. Body sizes are enlarged in proportional mode for visibility; use true-distance mode for real spacing.',
    tryIt: { label: 'Pick a different marker in the legend', action: { type: 'highlight', anchor: 'globe-legend' } },
  },
  terrain: {
    label: '3D Terrain',
    aliases: ['3d terrain', 'terrain', 'surface', 'dem', 'mesh', 'altimetry'],
    purpose: 'A 3D crop of the selected site built from the bundled elevation grid, lit by the modeled Sun for the chosen UTC hour.',
    anchors: { 'terrain-controls': 'Lighting / mesh / overlay controls', 'terrain-timeline': 'UTC hour scrubber', 'terrain-info': 'Terrain product and scale panel' },
    explain:
      'Move the UTC hour slider and the modeled Sun direction changes. The renderer recomputes its directional light and shadow map from that direction. Terrain elevations stay fixed.',
    tryIt: { label: 'Predict what the shadows will do', action: { type: 'predict', id: 'terrain-utc' } },
  },
  analysis: {
    label: 'Site Analysis',
    aliases: ['site analysis', 'analysis', 'telemetry', 'charts', 'time series'],
    purpose: 'One site in depth: metric cards, a time-series chart, a polar horizon readout, an optional terrain tab, ice prospectivity and the site record.',
    anchors: {
      'analysis-metrics': 'Metric cards', 'analysis-tabs': 'Charts / terrain tabs', 'analysis-chart': 'Illumination and link profile chart',
      'analysis-readout': 'Polar horizon readout', 'analysis-prospectivity': 'Ice prospectivity panel', 'analysis-record': 'Site record', 'analysis-limits': 'Scientific fidelity notice',
    },
    explain:
      'The cards, time-series chart and horizon readout on this page use the legacy illustrative formula, and the chart footnote says so. For science-worker numbers, ask me for the calculated telemetry or open Scenario Lab.',
    tryIt: { label: 'Show the calculated (science-worker) values', action: { type: 'ask', question: 'What are the calculated values for this site?' } },
  },
  compare: {
    label: 'Compare Sites',
    aliases: ['compare', 'compare sites', 'comparison', 'trade-offs', 'tradeoffs'],
    purpose: 'Side-by-side bars and a table for whichever of the six sites are currently selected.',
    anchors: { 'compare-chips': 'Site selection chips', 'compare-add': 'Add site button', 'compare-chart': 'Opportunity profile bars', 'compare-table': 'Parameter table' },
    explain:
      'All six sites can be selected; toggle the chips. The bars and table use the legacy illustrative formula ("reference estimate"). I can also compute science-worker values for the same subset.',
    tryIt: { label: 'Compare by a stated priority', action: { type: 'ask', question: 'Compare the selected sites by modeled sunlight' } },
  },
  scenario: {
    label: 'Scenario Lab',
    aliases: ['scenario lab', 'scenario', 'lab', 'what if', 'assumptions'],
    purpose: 'One customized scenario compared with a fixed reference case at the same site, both computed by the science worker.',
    anchors: {
      'scenario-controls': 'Scenario inputs', 'scenario-delta': 'Delta cards', 'scenario-chart': 'Calculated time series', 'scenario-provenance': 'Calculation provenance and limits',
    },
    explain:
      'Your settings form the custom case. The reference is 2026-11-13, 48 h, 2 m array, 2 m antenna, 8° tilt, 180° azimuth, at the same site and horizon mode. Every delta card is custom minus reference.',
    tryIt: { label: 'Predict the effect of a taller antenna', action: { type: 'predict', id: 'scenario-antenna' } },
  },
  astra: {
    label: 'Astra Assistant',
    aliases: ['astra', 'assistant', 'astra assistant', 'help page'],
    purpose: 'An overview of what Astra can do and the context it is reading.',
    anchors: { 'astra-page': 'Astra overview' },
    explain: 'Astra reads the app state and uses Awilix\'s own calculations. It runs locally by default and does not send your questions to a cloud model.',
    tryIt: { label: 'Start the guided tour', action: { type: 'tour' } },
  },
};

/** Controls Astra can explain ("What does this control do?"). Keys match data-astra attributes. */
export const CONTROLS = {
  'scenario-site': { view: 'scenario', label: 'Active site', aliases: ['active site', 'site selector', 'site dropdown'],
    text: 'Chooses the site used for both the custom and the reference case.', why: 'Changing the site moves both cases together, so the delta still isolates your other settings.' },
  'scenario-date': { view: 'scenario', label: 'Mission date', aliases: ['mission date', 'date picker', 'date'],
    text: 'Start date of the custom window. The analysis always begins at 00:00 UTC on that date.', why: 'The bundled NASA table covers 2026-01-01 00:00 to 2026-12-31 23:00 UTC. Outside that range, an approximate analytic fallback is used and labeled.' },
  'scenario-window': { view: 'scenario', label: 'Time window', aliases: ['time window', 'window', 'duration', '24h', '48h', '7d', '14d'],
    text: 'Length of the custom analysis: 24 h, 48 h, 7 days or 14 days.', why: 'Sampling is 10 min up to 48 h, 30 min up to 7 d and 60 min beyond. Horizon crossings are refined to about 1 s. Longer windows average over more of the lunar day.' },
  'scenario-horizon': { view: 'scenario', label: 'Visibility horizon', aliases: ['visibility horizon', 'horizon mode', 'reference horizon', 'terrain crop', 'horizon'],
    text: 'Chooses what counts as "above the horizon": a smooth reference sphere, or the experimental local terrain crop.', why: 'Terrain mode only knows the bundled crop (about 10 km for the polar sites). Far-field ridges are not modeled, and uncovered directions are reported as unknown.' },
  'scenario-array-height': { view: 'scenario', label: 'Solar array height', aliases: ['solar array height', 'array height', 'observer height', 'panel height'],
    text: 'Height of the solar array above the ground, used for the Sun-visibility horizon.', why: 'A higher viewpoint lowers the geometric horizon slightly, so the Sun can clear it a little earlier and set a little later.' },
  'scenario-antenna-height': { view: 'scenario', label: 'Antenna height', aliases: ['antenna height', 'antenna', 'mast'],
    text: 'Height of the antenna, used for the Earth-visibility horizon.', why: 'Raising it lowers the geometric horizon for Earth. It does not model antenna gain, a link budget or DSN scheduling.' },
  'scenario-tilt': { view: 'scenario', label: 'Panel tilt from horizontal', aliases: ['panel tilt', 'tilt'],
    text: 'Tilt of the panel surface from flat (0°) to vertical (90°).', why: 'Incidence = max(0, panel normal · Sun direction) while the Sun is visible. Near the pole the Sun stays low, so steeper tilts usually face it better. This is a geometric factor, not watts.' },
  'scenario-azimuth': { view: 'scenario', label: 'Panel normal azimuth', aliases: ['panel azimuth', 'azimuth', 'panel direction'],
    text: 'Compass direction the panel faces, clockwise from lunar north.', why: 'A fixed panel only faces the Sun well when the Sun\'s azimuth is near this value. At the pole the Sun circles the whole horizon each lunar day.' },
  'scenario-reset': { view: 'scenario', label: 'Reset to reference', aliases: ['reset', 'reset to reference'],
    text: 'Puts every input back to the reference values, which makes all deltas zero.', why: 'Use it to confirm that the delta cards measure your changes only.' },
  'terrain-lighting': { view: 'terrain', label: 'Lighting toggle', aliases: ['lighting', 'lighting toggle', 'inspection light', 'fill light'],
    text: 'Adds a flat inspection fill light so shadowed areas are visible.', why: 'It is a viewing aid. With it ON, dark areas no longer mean "unlit by the modeled Sun".' },
  'terrain-interpolation': { view: 'terrain', label: 'Source grid / bilinear mesh', aliases: ['interpolation', 'bilinear', 'source grid', 'smooth', 'mesh toggle'],
    text: 'Switches between the raw source grid and a smoother 256 × 256 bilinear display mesh.', why: 'Subdividing the mesh adds no measured detail. The polar crops are 80 m elevation grids whatever the mesh density.' },
  'terrain-wireframe': { view: 'terrain', label: 'Wireframe', aliases: ['wireframe', 'grid lines'],
    text: 'Shows the mesh triangles.', why: 'Useful for seeing display sampling. Missing elevation cells show as holes, not zero-height walls.' },
  'terrain-heatmap': { view: 'terrain', label: 'Heatmap overlay (Ice / Thermal)', aliases: ['heatmap', 'ice heatmap', 'thermal heatmap', 'ice overlay', 'overlay'],
    text: 'Paints a colour overlay. The current "Ice" ramp is just inverted elevation (low ground = darker blue), and "Thermal" is just elevation.', why: 'Neither uses ice, radar, temperature or illumination data, so the overlay is not evidence of ice or temperature.' },
  'terrain-surface': { view: 'terrain', label: 'Surface mode', aliases: ['surface mode', 'elevation mode', 'slope mode', 'hillshade'],
    text: 'Colours the mesh by elevation, by slope (0–30°+ from neighbouring cells) or with a hillshade texture.', why: 'Slope is computed from the same 80 m grid, so it smooths out features smaller than the grid spacing.' },
  'terrain-exaggeration': { view: 'terrain', label: 'Vertical exaggeration', aliases: ['exaggeration', 'vertical exaggeration'],
    text: 'Stretches heights visually from 1× to 5×.', why: 'It changes the picture only; calculations always use real heights.' },
  'terrain-hour': { view: 'terrain', label: 'UTC hour scrubber', aliases: ['utc slider', 'hour slider', 'utc', 'timeline', 'play'],
    text: 'Sets the hour (00–23 UTC) on the mission date for the terrain lighting. PLAY steps one hour per second.', why: 'The Sun and Earth directions are recomputed for that time. Shadows move, but the terrain does not change.' },
  'compare-chips': { view: 'compare', label: 'Site chips', aliases: ['chips', 'site chips', 'select sites'],
    text: 'Toggles which of the six sites appear in the bars and table.', why: 'Up to all six can be compared at once.' },
  'compare-add': { view: 'compare', label: 'Add site', aliases: ['add site', 'add button'],
    text: 'Adds the next unselected site to the comparison.', why: 'Same as clicking an unselected chip.' },
  'analysis-tabs': { view: 'analysis', label: 'Charts / terrain tabs', aliases: ['tabs', 'terrain tab', 'charts tab'],
    text: 'Switches the main area between the illustrative charts and the embedded 3D terrain.', why: 'The embedded terrain is the same renderer as the 3D Terrain page.' },
  'analysis-site': { view: 'analysis', label: 'Active site wheel', aliases: ['option wheel', 'site wheel'],
    text: 'Changes the selected site for every page.', why: 'Site selection is shared app state.' },
};

/** Approved knowledge snippets used for retrieval (getKnowledge). */
export const KNOWLEDGE = [
  { id: 'project-goal', tags: ['awilix', 'project', 'mission', 'goal', 'purpose', 'what is'], status: 'documented', sources: ['dataSources'],
    text: 'Awilix compares six lunar south-pole regions by modeled sunlight and geometric Earth visibility over a chosen time window.',
    detail: 'It is an educational, exploratory tool. Its outputs are not mission certification, a power budget or a communications link budget.' },
  { id: 'two-engines', tags: ['illustrative', 'legacy', 'formula', 'science worker', 'difference', 'why different', 'numbers differ', 'which numbers'], status: 'verified-in-code', sources: ['code'],
    text: 'Awilix currently has two number sources. Overview, Sites, Globe readout, Site Analysis and Compare use a legacy illustrative formula. Scenario Lab uses the science worker (NASA 2026 ephemeris + horizon geometry).',
    detail: 'The legacy formula is a smooth sine model of catalog base values. The Site Analysis chart footnote states that it is not a NASA ephemeris result. Astra labels which one each number comes from.' },
  { id: 'ephemeris', tags: ['ephemeris', 'sun', 'earth', 'direction', 'svs', 'nasa', 'table', 'source', 'data'], status: 'documented', sources: ['svs', 'dataSources'],
    text: 'Sun and Earth directions come from NASA SVS 5587 hourly 2026 data, interpolated on the unit sphere between hours.',
    detail: 'Coverage: 2026-01-01 00:00 to 2026-12-31 23:00 UTC. Outside it, an approximate analytic orientation (astronomy-engine) is used and labeled. The table path fixes the Sun distance at 1 AU.' },
  { id: 'horizons-check', tags: ['validation', 'accuracy', 'horizons', 'verified', 'trust', 'error', 'validate'], status: 'documented', sources: ['horizons', 'dataSources'],
    text: 'Representative Sun/Earth directions were compared with JPL Horizons DE441 for all six coordinates on three 2026 dates.',
    detail: 'That check validates sampled direction geometry only, not terrain, electrical power or a radio link. Run it again with npm run validate:horizons.' },
  { id: 'utc-geometry', tags: ['utc', 'time', 'hour', 'shadow', 'move', 'change', 'azimuth', 'altitude'], status: 'verified-in-code', sources: ['code'],
    text: 'Changing UTC changes the modeled Sun and Earth directions. Their altitude and azimuth are evaluated against the chosen horizon, while terrain elevations stay fixed.',
    detail: 'Near the pole the Sun stays within a few degrees of the horizon and sweeps around in azimuth over the ~29.5-day lunar day. Small time changes therefore mostly rotate shadows instead of shortening them.' },
  { id: 'renderer-shadows', tags: ['shadow', 'shadows', 'lighting', 'renderer', 'light', 'dark', 'recompute'], status: 'verified-in-code', sources: ['code'],
    text: 'The 3D Terrain renderer places its directional "Sun" light at the modeled Sun altitude/azimuth for the selected date and hour, and the mesh casts and receives a shadow map.',
    detail: 'When the modeled Sun is below 0° altitude, the directional light is switched off. Shadow-map shadows are a display approximation: they only include terrain inside the crop and do not replace a horizon or illumination calculation.' },
  { id: 'resolution', tags: ['resolution', '20 m', '80 m', '20m', '80m', 'mesh', 'sampling', 'dem', 'lola', 'detail', 'pixel'], status: 'documented', sources: ['terrainManifest', 'lola'],
    text: 'The polar terrain crops are 80 m elevation grids (128 × 128, about 10.16 km across). The 20 m LOLA product is a separate shadow-mask product, not the elevation used here.',
    detail: 'The bilinear display mesh (256 × 256) only interpolates; it does not add measured detail. Some page copy says "20 m LOLA altimetry" or a "20 km tile", but the bundled terrain metadata says 80 m and 10.16 km.' },
  { id: 'terrain-limits', tags: ['terrain', 'registration', 'datum', 'frame', 'projection', 'experimental'], status: 'documented', sources: ['terrainManifest'],
    text: 'Terrain crops are legacy-derived exports. The projection was reconstructed from the builder, and frame registration against the original PDS labels is still pending.',
    detail: 'Heights are assumed relative to a 1737.4 km reference radius. Masked (NoData) cells are holes, never zero-height walls.' },
  { id: 'horizon-model', tags: ['horizon', 'reference sphere', 'terrain horizon', 'far-field', 'obstruction', 'mask'], status: 'verified-in-code', sources: ['code'],
    text: 'The reference horizon is a smooth sphere, lowered slightly by observer height. The terrain horizon scans the local crop every 2° of azimuth, with curvature correction.',
    detail: 'The terrain horizon is a geometric estimate limited to the crop. It is not a validated long-range obstruction model, because ridges tens of km away can still block the Sun near the pole.' },
  { id: 'power-boundary', tags: ['power', 'watts', 'energy', 'panel', 'incidence', 'electricity', 'battery', 'kw'], status: 'verified-in-code', sources: ['code'],
    text: 'Sunlight hours and panel incidence are geometry, not electrical power.',
    detail: 'Turning them into watts would need array area, cell efficiency, temperature, degradation, dust and battery assumptions, none of which Awilix models.' },
  { id: 'comm-boundary', tags: ['communication', 'comm', 'link', 'radio', 'dsn', 'dte', 'antenna', 'earth visibility'], status: 'verified-in-code', sources: ['code'],
    text: 'Earth visibility means the centre of Earth is geometrically above the modeled horizon. It is not proof of a working radio link.',
    detail: 'Antenna patterns, link budget, DSN station geometry and scheduling, relays and far-field terrain are not modeled.' },
  { id: 'unknown-intervals', tags: ['unknown', 'missing', 'coverage', 'gap', 'outage'], status: 'verified-in-code', sources: ['code'],
    text: 'Samples where the horizon is unknown are excluded. They are not counted as visible or as confirmed outages.',
    detail: 'Each science result reports a known-time coverage percentage so you can see how much of the window was evaluable.' },
  { id: 'prospectivity', tags: ['prospectivity', 'lfm', 'ai', 'foundation model', 'ice score', 'ibm'], status: 'verified-in-code', sources: ['lfm', 'code'],
    text: 'The ice prospectivity panel shows packaged values from a JSON file. The loading animation is a 2.2-second timer, not live model inference.',
    detail: 'Values are model estimates of where conditions favour ice, not measurements. Shackleton Rim, Shackleton Ridge and the Geographic Pole carry identical values copied from one "Shackleton crater" training patch, so they do not differentiate those three sites.' },
  { id: 'lunar-water', tags: ['water', 'ice', 'psr', 'cold trap', 'glacier', 'volatile'], status: 'plan-guidance', sources: ['plan'],
    text: 'Lunar water evidence concerns water molecules in soil and possible ice in permanently shadowed cold traps. It is patchy, not glaciers or ice sheets.',
    detail: 'No source used by Awilix provides ice thickness or volume, so no colour or 3D volume in the app is measured ice.' },
  { id: 'ch2-radar', tags: ['chandrayaan-2', 'radar', 'dfsar', 'cpr', 'isro'], status: 'plan-guidance', sources: ['plan'],
    text: 'Chandrayaan-2 polar radar products (e.g. circular polarization ratio) can indicate possible ice. They are not direct ice measurements.',
    detail: 'Awilix does not currently display radar layers. Before it does, coverage, registration and missing pixels need checking at each site.' },
  { id: 'm3', tags: ['m3', 'moon mineralogy mapper', 'surface water', 'oh', 'hydroxyl'], status: 'plan-guidance', sources: ['plan'],
    text: 'The M³ water map is broad, coarse context (280 m pixels) that groups OH and H₂O together as "water". It is not a detailed polar ice map.',
    detail: 'Awilix does not currently display M³ data.' },
  { id: 'ch3', tags: ['chandrayaan-3', 'shiv shakti', 'pradan', 'vikram', 'pragyan'], status: 'plan-guidance', sources: ['plan'],
    text: 'Chandrayaan-3 measured in situ at Shiv Shakti (69.367621°S, 32.348126°E), far from Awilix\'s more poleward sites.',
    detail: 'It is a useful comparison with another explored high-latitude location, not ground truth for any of the six sites.' },
  { id: 'catalog-claims', tags: ['catalog', 'fun fact', 'why nasa', 'description', 'claim', 'mission partner', 'contractor'], status: 'verified-in-code', sources: ['catalog'],
    text: 'Site descriptions, mission links, "why NASA chose" text and fun facts come from the Awilix catalog and have not been independently reviewed.',
    detail: 'Catalog coordinates are regional markers, not surveyed touchdown points. Some entries need checking, for example the claim that Earth never sets at Shackleton Ridge (libration moves Earth by several degrees) and the 100 km "crater diameter" listed for Mons Mouton, which is a mountain.' },
  { id: 'coordinates', tags: ['coordinate', 'latitude', 'longitude', 'frame', 'moon_me', 'moon_pa'], status: 'external-reference', sources: ['naif', 'code'],
    text: 'Coordinates are planetocentric latitude and east-positive longitude. MOON_ME and MOON_PA are different body-fixed frames, and the legacy terrain export does not state which one it uses.',
    detail: 'Differences between those frames are hundreds of metres, comparable to several terrain cells.' },
  { id: 'libration', tags: ['libration', 'wobble', 'earth sets', 'earth moves'], status: 'external-reference', sources: ['naif'],
    text: 'Libration makes Earth wander a few degrees in the lunar sky, so near the pole Earth can dip below the horizon for days at a time.',
    detail: 'The science worker includes this through the NASA sub-Earth point table.' },
  { id: 'axial-tilt', tags: ['tilt', 'axis', 'seasons', 'peak of eternal light', 'low sun'], status: 'external-reference', sources: ['naif'],
    text: 'The Moon\'s spin axis is tilted only about 1.5° to the ecliptic, so at the south pole the Sun always skims the horizon.',
    detail: 'That is why a few hundred metres of extra height, or a nearby ridge, can change sunlit hours a lot.' },
  { id: 'globe-date', tags: ['globe', 'vectors', 'date', 'sightline'], status: 'verified-in-code', sources: ['code'],
    text: 'The globe draws Sun and Earth vectors from the shared ephemeris module for the mission date.',
    detail: 'Proportional mode enlarges bodies for exploration. True-distance mode shows real spacing.' },
  { id: 'astra-privacy', tags: ['privacy', 'cloud', 'model', 'llm', 'ai', 'offline', 'local', 'astra'], status: 'verified-in-code', sources: ['code'],
    text: 'Astra answers from Awilix\'s own calculations and this reviewed fact sheet. When the team\'s model backend is switched on, your question and a snapshot of the app state go through the Awilix server to an OpenAI model so answers read more naturally.',
    detail: 'The model never calculates numbers: a validator removes any number or claim that did not come from Awilix tools or the fact sheet. The API key stays on the server.' },
  { id: 'sources-page', tags: ['sources', 'methodology', 'methods', 'citations', 'references'], status: 'verified-in-code', sources: ['code', 'dataSources'],
    text: 'There is no separate Sources & Methodology page in the current navigation. Provenance lives in Scenario Lab\'s "Calculation provenance & limits" panel and in DATA_SOURCES.md.',
    detail: 'I can summarise sources, assumptions and limits here at any time.' },
];

/** Live "fun facts" must be computed from tool outputs; these static ones carry a source. */
export const STATIC_FACTS = [
  { text: 'The Moon\'s axis is tilted only ~1.5°, so at the south pole the Sun never climbs high. It skims the horizon all lunar day.', sources: ['naif'], views: ['overview', 'globe', 'terrain', 'analysis'] },
  { text: 'Libration makes Earth wobble a few degrees in the lunar sky, enough to drop below a polar horizon for days.', sources: ['naif'], views: ['globe', 'scenario', 'compare'] },
  { text: 'Awilix\'s 2026 Sun/Earth table has 8,760 hourly records, one per hour of the year.', sources: ['svs', 'dataSources'], views: ['scenario', 'overview'] },
  { text: 'Each polar terrain crop is 128 × 128 cells of 80 m, about 10 km across: smaller than many polar craters.', sources: ['terrainManifest'], views: ['terrain', 'analysis'] },
];

/** Scientific boundaries the validator enforces. */
export const BOUNDARIES = [
  { id: 'no-watts', pattern: /\b(\d[\d.,]*\s*(k?w|watts?|kwh)|generates?\s+\d)/i, note: 'Illumination is not electrical power.' },
  { id: 'no-guaranteed-link', pattern: /\b(guarantee[sd]?|confirmed|reliable|working)\s+(radio\s+|comm\w*\s+|dsn\s+)?(link|contact|communication)/i, note: 'Earth visibility is not a working link.' },
  { id: 'no-best-site', pattern: /\b(is|are)\s+(the\s+)?(best|optimal|ideal)\s+(landing\s+)?(site|choice|candidate)\b/i, note: 'No universal best site.' },
  { id: 'no-measured-ice', pattern: /\b(measured|confirmed|proven)\s+(water\s+)?ice\b|\bice\s+(thickness|volume)\s+(is|of)\s+\d/i, note: 'No source measures ice at these sites.' },
  { id: 'no-glacier', pattern: /\b(glaciers?|ice\s+caps?|ice\s+sheets?)\b/i, note: 'Lunar ice is not glaciers.' },
];
