#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sites = [
  { id: 'shackleton-rim', name: 'Shackleton Rim', lat: -89.9, lon: 0 },
  { id: 'malapert-a', name: 'Malapert A', lat: -86, lon: -2 },
  { id: 'mons-mouton', name: 'Mons Mouton', lat: -84.5, lon: 29 },
  { id: 'nobile', name: 'Nobile Rim', lat: -85.2, lon: 54 },
  { id: 'shackleton-ridge', name: 'Shackleton Ridge', lat: -89.5, lon: 0 },
  { id: 'south-pole', name: 'Geographic South Pole', lat: -90, lon: 0 },
];
const dates = ['2026-03-20', '2026-06-21', '2026-11-13'];
const targets = [{ id: '10', name: 'Sun' }, { id: '399', name: 'Earth center' }];
const timestampsFor = (date) => Array.from({ length: 49 }, (_, index) => index * 30).map((minutes) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMinutes(minutes);
  return d.toISOString().replace('.000Z', 'Z');
});

const ephemerisJson = await readFile(resolve(root, 'public/data/mooninfo_2026.json'), 'utf8');
const fetchOriginal = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input, init) => {
  if (String(input) === '/data/mooninfo_2026.json') {
    return new Response(ephemerisJson, { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return fetchOriginal(input, init);
};

const { loadMoonInfo2026, computePositions } = await import('../src/lib/ephemeris.js');
await loadMoonInfo2026();

function parseRows(result) {
  const block = result.match(/\$\$SOE([\s\S]*?)\$\$EOE/);
  if (!block) throw new Error(`Horizons result has no data block: ${result.slice(0, 500)}`);
  return block[1].trim().split(/\r?\n/).map((line) => {
    const match = line.match(/^\s*(\d{4}-[A-Za-z]{3}-\d{2})\s+(\d{2}:\d{2})\s+[A-Za-z*]*\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/);
    if (!match) throw new Error(`Cannot parse Horizons row: ${line}`);
    const [, date, clock, azimuth, altitude] = match;
    const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(date.slice(5, 8));
    const day = date.slice(9, 11);
    const year = date.slice(0, 4);
    const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month];
    const utc = `${year}-${String(month + 1).padStart(2, '0')}-${day}T${clock}:00Z`;
    return { utc, azimuthDeg: Number(azimuth), altitudeDeg: Number(altitude) };
  });
}

async function queryHorizons(site, target) {
  const params = new URLSearchParams({
    format: 'json', COMMAND: `'${target.id}'`, OBJ_DATA: "'NO'", MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'", CENTER: "'coord@301'", COORD_TYPE: "'GEODETIC'",
    SITE_COORD: `'${site.lon},${site.lat},0'`,
    START_TIME: `'${site.date} 00:00'`, STOP_TIME: `'${new Date(Date.parse(`${site.date}T00:00:00Z`) + 24 * 3600000).toISOString().slice(0, 10)} 00:00'`,
    STEP_SIZE: "'30m'", TIME_TYPE: "'UT'", QUANTITIES: "'4'", APPARENT: "'AIRLESS'",
  });
  const response = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${params}`);
  if (!response.ok) throw new Error(`Horizons HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`Horizons error for ${site.id}/${target.name}: ${payload.error}`);
  return { signature: payload.signature, result: payload.result, rows: parseRows(payload.result) };
}

const rows = [];
const queryEvidence = [];
for (const site of sites) {
  for (const date of dates) {
    const siteDate = { ...site, date };
    for (const target of targets) {
      const horizon = await queryHorizons(siteDate, target);
      queryEvidence.push({ siteId: site.id, target: target.name, date, signature: horizon.signature, header: horizon.result.split('$$SOE')[0].trim() });
      const expected = new Map(horizon.rows.map((row) => [row.utc, row]));
      for (const utc of timestampsFor(date)) {
        const reference = expected.get(utc);
        if (!reference) throw new Error(`No Horizons sample at ${utc} for ${site.id}/${target.name}`);
        const computed = computePositions(site.lat, site.lon, new Date(utc));
        const position = target.id === '10' ? computed.sun : computed.earth;
        const azDelta = ((position.az - reference.azimuthDeg + 540) % 360) - 180;
        rows.push({ siteId: site.id, site: site.name, target: target.name, utc, appAzimuthDeg: position.az, horizonsAzimuthDeg: reference.azimuthDeg, azimuthErrorDeg: azDelta, appAltitudeDeg: position.alt, horizonsAltitudeDeg: reference.altitudeDeg, altitudeErrorDeg: position.alt - reference.altitudeDeg, appSource: computed.source });
      }
    }
  }
}

const statsFor = (target, key) => {
  const values = rows.filter((row) => row.target === target).map((row) => row[key]);
  return { maxAbsoluteDeg: Math.max(...values.map(Math.abs)), meanAbsoluteDeg: values.reduce((sum, value) => sum + Math.abs(value), 0) / values.length };
};
const toleranceDeg = 0.01;
const report = {
  title: 'Awilix 2.0 scenario ephemeris comparison with JPL Horizons',
  generatedAtUtc: new Date().toISOString(),
  reference: 'NASA/JPL Horizons observer-table ephemerides, DE441, airless apparent AZ/EL, lunar geodetic site coordinates in the Mean Earth frame, 30-minute samples.',
  appInput: 'Bundled NASA SVS 5587 2026 hourly direction table; spherical interpolation; app topocentric transform.',
  note: 'This comparison validates representative Sun/Earth center azimuth and altitude, not terrain horizons, power systems, or communications links.',
  acceptanceToleranceDeg: toleranceDeg,
  sampleCount: rows.length,
  stats: Object.fromEntries(targets.map(({ name }) => [name, { azimuth: statsFor(name, 'azimuthErrorDeg'), altitude: statsFor(name, 'altitudeErrorDeg') }])),
  queries: queryEvidence,
  rows,
};
const out = resolve(root, 'docs/validation/horizons-scenario-comparison.json');
await mkdir(dirname(out), { recursive: true });
await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
const check = {
  reference: 'NASA/JPL Horizons DE441, observer table, airless apparent AZ/EL',
  app: 'Bundled NASA SVS 5587 2026 hourly table with spherical interpolation and Awilix topocentric transform',
  sampleCount: report.sampleCount,
  sites: sites.map(({ id, lat, lon }) => ({ id, lat, lon })),
  dates,
  timestamps: 'Every 30 minutes from 00:00 to 24:00 UTC for every site/date/target combination',
  toleranceDeg,
  stats: report.stats,
  passed: Object.values(report.stats).every((target) => target.azimuth.maxAbsoluteDeg <= toleranceDeg && target.altitude.maxAbsoluteDeg <= toleranceDeg),
  report: '/docs/validation/horizons-scenario-comparison.json',
  limitations: report.note,
};
await writeFile(resolve(root, 'public/data/horizons-validation-summary.json'), `${JSON.stringify(check, null, 2)}\n`);
await writeFile(resolve(root, 'src/data/horizons-validation-summary.json'), `${JSON.stringify(check, null, 2)}\n`);
console.log(JSON.stringify({ output: out, sampleCount: report.sampleCount, toleranceDeg, passed: check.passed, stats: report.stats }, null, 2));
