import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadMoonInfo2026, computePositions } from '../src/lib/ephemeris.js';
import { analyzeScenario } from '../src/lib/scenarioAnalysis.js';
import { panelIncidence } from '../src/lib/scienceMath.js';

const ephemeris = await readFile(new URL('../public/data/mooninfo_2026.json', import.meta.url), 'utf8');
globalThis.fetch = async (url) => String(url) === '/data/mooninfo_2026.json'
  ? new Response(ephemeris, { status: 200 })
  : new Response('', { status: 404 });
assert.ok(await loadMoonInfo2026(), 'NASA 2026 hourly direction table should load for these tests');

const site = { id: 'shackleton-rim', name: 'Shackleton Rim', lat: -89.9, lon: 0 };
const base = { site, date: '2026-03-20', hours: 24, mode: 'reference', solarHeight: 2, antennaHeight: 2, panelTilt: 0, panelAzimuth: 0 };

test('Scenario Lab uses bundled NASA 2026 ephemeris samples', () => {
  const result = analyzeScenario(base);
  assert.ok(result.sources.every((source) => source.includes('NASA SVS 5587')));
  assert.equal(result.stepMinutes, 10);
  assert.equal(result.startTime, '2026-03-20T00:00:00.000Z');
});

test('observer and antenna heights alter their own geometric horizon calculations', () => {
  const low = analyzeScenario({ ...base, solarHeight: 0, antennaHeight: 0 });
  const high = analyzeScenario({ ...base, solarHeight: 30, antennaHeight: 30 });
  const sampleLow = low.path[60];
  const sampleHigh = high.path[60];
  assert.notEqual(sampleLow.sunMargin, sampleHigh.sunMargin, 'solar array height must affect solar horizon margin');
  assert.notEqual(sampleLow.earthMargin, sampleHigh.earthMargin, 'antenna height must affect Earth topocentric/horizon margin');
});

test('panel incidence follows the computed Sun altitude/azimuth and panel normal', () => {
  const illuminated = { ...base, site: { ...site, lat: -84.5, lon: 29 }, date: '2026-11-24' };
  const flat = analyzeScenario({ ...illuminated, panelTilt: 0, panelAzimuth: 0 });
  const tilted = analyzeScenario({ ...illuminated, panelTilt: 45, panelAzimuth: 180 });
  const index = flat.path.findIndex((point) => point.sun.alt > 5);
  assert.ok(index >= 0, 'selected test window should include a Sun-above-horizon sample');
  const a = flat.path[index];
  const b = tilted.path[index];
  assert.ok(Math.abs(a.powerEfficiency - panelIncidence(a.sun.alt, a.sun.az, 0, 0)) < 1e-12);
  assert.ok(Math.abs(b.powerEfficiency - panelIncidence(b.sun.alt, b.sun.az, 45, 180)) < 1e-12);
  assert.notEqual(a.powerEfficiency, b.powerEfficiency, 'changing panel normal should change incidence for the same computed Sun vector');
});

test('missing terrain is unknown, never interpreted as unobstructed terrain', () => {
  const noDataTerrain = {
    id: site.id, lat: site.lat, lon: site.lon, gridSize: 5, spacingXM: 1000, spacingYM: 1000,
    observerGrid: { x: 2, y: 2 }, projection: 'local-enu', rawElev: Array(25).fill(null),
    metadata: { sha256: 'no-data-test' }, widthKm: 4, heightKm: 4,
  };
  const result = analyzeScenario({ ...base, hours: 1, mode: 'terrain' }, noDataTerrain);
  assert.equal(result.power.coveragePercent, 0);
  assert.equal(result.comm.coveragePercent, 0);
  assert.equal(result.power.availabilityPercent, null);
  assert.equal(result.comm.availabilityPercent, null);
  assert.ok(result.path.every((point) => Number.isNaN(point.sunMargin) && Number.isNaN(point.earthMargin)));
  assert.throws(() => analyzeScenario({ ...base, mode: 'terrain' }, null), /no terrain product/);
});

test('panel orientation API remains a bounded cosine factor, not watts', () => {
  assert.ok(panelIncidence(90, 45, 0, 0) >= 0 && panelIncidence(90, 45, 0, 0) <= 1);
  const position = computePositions(site.lat, site.lon, new Date('2026-03-20T12:00:00Z'));
  assert.ok(position.source.includes('NASA SVS 5587'));
});
