// Astra release checks (Plan §8) run against the real science engine.
// Run: npm run test:astra
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadMoonInfo2026, computePositions } from '../src/lib/ephemeris.js';
import { analyzeScenario } from '../src/lib/scenarioAnalysis.js';
import { createAstraTools } from '../src/astra/tools.js';
import { createAstraAgent } from '../src/astra/agent.js';
import { routeIntent } from '../src/astra/router.js';
import { collectEvidence, validateText } from '../src/astra/validator.js';

const root = new URL('../', import.meta.url);
const ephemeris = await readFile(new URL('public/data/mooninfo_2026.json', root), 'utf8');
globalThis.fetch = async (url) => String(url) === '/data/mooninfo_2026.json' ? new Response(ephemeris, { status: 200 }) : new Response('', { status: 404 });
await loadMoonInfo2026();

const rawSites = JSON.parse(await readFile(new URL('src/data/sites.json', root), 'utf8'));
const SHORT = { 'shackleton-rim': 'Shackleton Rim', 'malapert-a': 'Malapert A', 'mons-mouton': 'Mons Mouton', nobile: 'Nobile Rim', 'shackleton-ridge': 'Shackleton Ridge', 'south-pole': 'Geographic Pole' };
const sites = rawSites.map((s) => ({ ...s, shortName: SHORT[s.id] ?? s.name }));
const prospectivity = JSON.parse(await readFile(new URL('src/data/ice-prospectivity.json', root), 'utf8'));
const terrain = async (id) => JSON.parse(await readFile(new URL(`public/science-terrain/${id}.json`, root), 'utf8'));
const DEFAULT = { date: '2026-11-13', windowHours: 48, observerHeight: 2, antennaHeight: 2, panelTilt: 8, panelAzimuth: 180 };
// Deterministic stand-in for the legacy illustrative formula.
const getSummary = (site) => ({ samples: [], sunlight: 70, earth: 80, power: 60, comm: 75, peakSunAlt: 1.2, peakEarthAlt: 3.4 });

let workerCalls = 0;
const tools = createAstraTools({
  sites, getSummary, defaultScenario: DEFAULT, prospectivity, computePositions,
  ensureEphemeris: async () => true,
  fetchTerrain: terrain,
  requestScenarios: async (inputs) => {
    workerCalls += 1;
    return { results: await Promise.all(inputs.map(async (i) => analyzeScenario(i, i.mode === 'terrain' ? await terrain(i.site.id) : null))), ephemeris: 'nasa' };
  },
});
const agent = createAstraAgent({ tools });
const state = (over = {}) => ({
  activeView: 'overview', selectedSiteId: 'shackleton-ridge', compareIds: ['shackleton-ridge', 'mons-mouton', 'malapert-a'],
  scenario: { ...DEFAULT }, horizonMode: 'reference', analysisTab: 'charts', terrainHour: 12, ...over,
});
const allText = (a) => [a.quick, ...a.why].join(' ');

test('router classifies core intents', () => {
  const r = (q, v = 'overview') => routeIntent(q, { activeView: v }).intent;
  assert.equal(r('Explain this page'), 'screen');
  assert.equal(r('take me to scenario lab'), 'navigation');
  assert.equal(r('what if landing is delayed by 3 days?'), 'scenario-change');
  assert.equal(r('which site is best?'), 'comparison');
  assert.equal(r('what does the antenna height slider do?', 'scenario'), 'control');
  assert.equal(r('start the tour'), 'tour');
  assert.equal(r('is the prospectivity score live inference?'), 'prospectivity');
  assert.equal(r('tell me about mons mouton'), 'site');
});

test('1 · identifies active view, selected sites, UTC window and visible metrics', async () => {
  const a = await agent.ask('Explain this page', state({ activeView: 'compare' }));
  assert.match(a.quick, /Compare Sites/);
  assert.match(a.quick, /3 of 6/);
  assert.match(a.quick, /Shackleton Ridge, Mons Mouton and Malapert A/);
  assert.deepEqual(a.validation.issues, []);
});

test('2 · offers to add the unselected sites without changing selection', async () => {
  const a = await agent.ask('add the other sites to the comparison', state({ activeView: 'compare' }));
  const add = a.actions.find((x) => x.type === 'set-compare');
  assert.ok(add, 'should offer a set-compare action');
  assert.equal(add.siteIds.length, 6);
  assert.equal(a.autoAction, null, 'must not auto-apply a selection change');
});

test('3 · Scenario Lab is one custom case vs reference, values from the calculator', async () => {
  const s = state({ activeView: 'scenario', scenario: { ...DEFAULT, antennaHeight: 20 } });
  const a = await agent.ask('explain the scenario delta', s);
  assert.match(a.quick, /one custom case with a fixed reference/);
  assert.match(a.quick, /antenna height \(2 m → 20 m\)/);
  assert.doesNotMatch(allText(a), /\bA\/B\b|pin(ned)? two/i);
  const ref = analyzeScenario({ site: sites.find((x) => x.id === 'shackleton-ridge'), date: DEFAULT.date, hours: 48, mode: 'reference', solarHeight: 2, antennaHeight: 2, panelTilt: 8, panelAzimuth: 180 });
  assert.ok(allText(a).includes(ref.comm.availabilityPercent.toFixed(1)), 'reference Earth availability must match the calculator');
  assert.deepEqual(a.validation.issues, []);
});

test('4/5 · UTC explanation: directions change, terrain fixed, renderer shadows verified', async () => {
  const a = await agent.ask('what happens when I change UTC?', state({ activeView: 'terrain', terrainHour: 6 }));
  assert.equal(a.intent, 'utc');
  assert.match(a.quick, /terrain heights stay fixed/);
  assert.match(allText(a), /recomputes the shadow map/);
  const p = computePositions(-89.5, 0, new Date('2026-11-13T06:00:00Z'));
  assert.ok(a.quick.includes(p.sun.alt.toFixed(1)), 'Sun altitude must come from the ephemeris');
});

test('6 · native resolution vs display mesh; corrects 20 m claim', async () => {
  const a = await agent.ask('what is the terrain resolution?', state({ activeView: 'terrain' }));
  assert.match(a.quick, /128 × 128/);
  assert.match(a.quick, /80 m/);
  assert.match(allText(a), /adds no measured detail/);
  assert.match(allText(a), /20 m LOLA product is a separate shadow-mask/);
});

test('7/8 · ice evidence labelled honestly; Chandrayaan-3 not transferred', async () => {
  const a = await agent.ask('Does Chandrayaan-3 show ice at Shackleton?', state());
  assert.match(allText(a), /not ground truth|not transferred/);
  const h = await agent.ask('what does the ice heatmap show?', state({ activeView: 'terrain' }));
  assert.match(allText(h), /inverted elevation|elevation only|not evidence/);
});

test('prospectivity: packaged, not live, duplicates flagged', async () => {
  const a = await agent.ask('what is the prospectivity score?', state({ selectedSiteId: 'shackleton-rim' }));
  assert.match(a.quick, /100%/);
  assert.match(allText(a), /Not live inference/);
  assert.match(allText(a), /shackleton-ridge/);
  assert.ok(a.quality.includes('duplicated-across-sites'));
});

test('9 · approximate fallback outside table coverage is labelled', async () => {
  const a = await agent.ask('What are the calculated values for this site?', state({ scenario: { ...DEFAULT, date: '2027-02-01' } }));
  assert.ok(a.quality.includes('approximate-ephemeris-fallback'));
  assert.match(allText(a), /approximate/);
});

test('10 · never equates illumination with watts or visibility with a link; no universal best site', async () => {
  const a = await agent.ask('which site is best?', state({ activeView: 'compare' }));
  assert.match(a.quick, /no universal best site/i);
  assert.match(allText(a), /not electrical watts/);
  assert.match(allText(a), /not proof of a working radio link/);
  const ev = collectEvidence([]);
  assert.equal(validateText('Shackleton Ridge is the best site for landing.', ev).ok, false);
  assert.equal(validateText('The array generates 450 W at noon.', ev).ok, false);
  assert.equal(validateText('Earth visibility guarantees a reliable radio link.', ev).ok, false);
  assert.equal(validateText('Sun visible 37.42 h.', ev).ok, false, 'unsupported number must be rejected');
});

test('11 · navigation only to real views; Sources page not invented', async () => {
  const a = await agent.ask('take me to scenario lab', state());
  assert.equal(a.autoAction?.type, 'navigate');
  assert.equal(a.autoAction?.view, 'scenario');
  const s = await agent.ask('what are your sources?', state());
  assert.match(allText(s), /no separate Sources page/);
});

test('scenario what-if is computed but never applied automatically', async () => {
  const a = await agent.ask('what if landing is delayed by 3 days?', state({ activeView: 'scenario' }));
  assert.equal(a.intent, 'scenario-change');
  const apply = a.actions.find((x) => x.type === 'preview-scenario');
  assert.deepEqual(apply.changes, { date: '2026-11-16' });
  assert.equal(a.autoAction, null);
  assert.match(a.quick, /Nothing has been changed yet/);
  assert.deepEqual(a.validation.issues, []);
});

test('predict-and-reveal uses real calculations', async () => {
  const s = state({ activeView: 'scenario' });
  const p = agent.predict('scenario-antenna', s);
  assert.equal(p.predict.options.length, 4);
  const r = await agent.reveal('scenario-antenna', 'up-little', p.predict.context, s);
  assert.match(r.quick, /percentage points/);
  assert.ok(r.actions.some((x) => x.type === 'preview-scenario'));
  const t = await agent.reveal('terrain-utc', 'rotate', { from: 12, to: 18 }, state({ activeView: 'terrain' }));
  assert.equal(t.autoAction.type, 'set-terrain-hour');
  assert.equal(t.autoAction.hour, 18);
});

test('14 · safe response when the calculator is unavailable', async () => {
  const broken = createAstraAgent({ tools: createAstraTools({
    sites, getSummary, defaultScenario: DEFAULT, prospectivity, computePositions, ensureEphemeris: async () => false,
    fetchTerrain: async () => { throw new Error('offline'); },
    requestScenarios: async () => { throw new Error('Science worker failed'); },
  }) });
  const a = await broken.ask('What are the calculated values for this site?', state());
  assert.match(a.quick, /couldn't run the science calculation/);
  const t = await broken.ask('what is the terrain resolution?', state());
  assert.match(t.quick, /isn't available/);
});

test('every canned answer passes validation', async () => {
  const questions = ['hi', 'Explain this page', 'tell me a fun fact', 'why is the sun so low at the pole?', 'is astra using chatgpt?', 'compare by earth visibility', 'explain this chart', 'what does the tilt control do?', 'tell me about nobile', 'what is libration?'];
  for (const view of ['overview', 'sites', 'globe', 'terrain', 'analysis', 'compare', 'scenario', 'astra']) {
    for (const q of questions) {
      const a = await agent.ask(q, state({ activeView: view }));
      assert.deepEqual(a.validation.issues, [], `${view} · “${q}” → ${JSON.stringify(a.validation.issues)}`);
      assert.ok(a.quick.length > 0);
    }
  }
  assert.ok(workerCalls > 0);
});
