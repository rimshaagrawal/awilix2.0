// Astra intent router (Plan §5.1).
// Classifies a request and extracts entities. Deterministic and explainable:
// each intent is a list of weighted patterns; the highest score wins.

import { VIEWS, CONTROLS } from './facts.js';

export const INTENTS = [
  'greeting', 'tour', 'navigation', 'screen', 'control', 'chart',
  'comparison', 'scenario-change', 'scenario-explain', 'telemetry', 'utc', 'terrain',
  'prospectivity', 'ice', 'science', 'sources', 'privacy', 'fun-fact', 'site', 'unknown',
];

const SITE_ALIASES = [
  ['shackleton-rim', ['shackleton rim', 'shackleton crater rim', 'crater rim']],
  ['shackleton-ridge', ['shackleton ridge', 'connecting ridge', 'shackleton connecting ridge', 'de gerlache ridge']],
  ['malapert-a', ['malapert a', 'malapert']],
  ['mons-mouton', ['mons mouton', 'mouton']],
  ['nobile', ['nobile rim', 'nobile']],
  ['south-pole', ['geographic pole', 'geographic south pole', 'south pole datum', 'the pole']],
];

const RULES = {
  greeting: [[/^(hi|hello|hey|yo|thanks|thank you|good (morning|evening|afternoon))\b[\s!.]*$/, 5]],
  tour: [[/\b(tour|walk ?me ?through|show me around|guide me|onboard|getting started|how do i use)\b/, 5]],
  navigation: [[/\b(take me|go to|open|navigate|show me the|bring me|switch to|jump to)\b/, 3]],
  screen: [[/\b(explain|what('?s| is)) (this|the current) (page|screen|view)\b/, 6], [/\bwhat am i (looking at|seeing)\b/, 6], [/\bwhat does this page\b/, 6], [/\bexplain (this|the) page\b/, 6], [/\bwhere am i\b/, 4]],
  control: [[/\bwhat does (the |this )?.{0,40}(control|slider|toggle|button|dropdown|selector|picker|switch|chip)s? do\b/, 6], [/\b(control|slider|toggle|button|dropdown)\b/, 2], [/\bexplain (the |this )?control\b/, 6]],
  chart: [[/\b(chart|graph|plot|bars?|table|line|curve|axis|legend|number|metric|card|percentage|value)s?\b/, 2], [/\bexplain (this|the) (chart|graph|number|metric|bar|table)\b/, 6], [/\bwhat does .{0,30}(mean|represent)\b/, 2]],
  comparison: [[/\bcompar(e|ing|ison)\b/, 3], [/\b(best|better|worse|rank|ranking|trade-?offs?|versus|vs\.?|which site)\b/, 3], [/\badd (the )?(other|remaining|rest|all)\b/, 4]],
  'scenario-change': [[/\bwhat if\b/, 4], [/\b(delay(ed)?|slip(s|ped)?|later|postpone)\b.{0,20}\d/, 5], [/\b(raise|lower|increase|decrease|set|change|make)\b.{0,30}\b(antenna|array|tilt|azimuth|height|window|date)\b/, 5], [/\b\d+\s*(m|meters?|°|deg|degrees?)\b.{0,20}\b(antenna|array|tilt|azimuth)\b/, 4]],
  'scenario-explain': [[/\bscenario( lab)?\b/, 3], [/\breference (case|scenario)\b/, 4], [/\bdelta\b/, 3], [/\bcustom (case|scenario)\b/, 4]],
  telemetry: [[/\b(calculated|science|worker|real|actual) (values?|numbers?|telemetry|results?)\b/, 6], [/\bhow (many|much) (hours|sun|sunlight|earth)\b/, 4], [/\b(sunlight|sun visibility|earth visibility|darkness|outage)\b/, 2], [/\btelemetry\b/, 2]],
  utc: [[/\butc\b/, 4], [/\b(hour|time of day|time slider|timeline)\b/, 2], [/\bwhen (i|you) (change|move) (the )?time\b/, 5], [/\bshadows? (move|change|rotate)\b/, 5]],
  terrain: [[/\b(terrain|dem|lola|elevation|slope|mesh|resolution|exaggeration|wireframe|hillshade|bilinear|20 ?m|80 ?m|crop|shadows?)\b/, 2]],
  prospectivity: [[/\b(prospectivity|lfm|foundation model|ai score|ibm|ice score|inference)\b/, 5]],
  ice: [[/\b(ice|water|psr|permanently shadowed|cold trap|volatiles?|chandrayaan|m3|m³|radar|shiv shakti|glacier)\b/, 3]],
  science: [[/\b(why|how come|how does|physics|libration|tilt of the moon|axis|horizon|incidence|watts?|power|radio|link|dsn|ephemeris|coordinate|frame)\b/, 2]],
  sources: [[/\b(sources?|citations?|methodology|references?|where.{0,15}data|provenance|validat\w*|accura\w*|trust)\b/, 3]],
  privacy: [[/\b(privacy|cloud|llm|gpt|chatgpt|openai|gemini|model|offline|are you (an )?ai|who are you|what are you)\b/, 3]],
  'fun-fact': [[/\b(fun fact|did you know|something cool|interesting fact|surprise me|trivia)\b/, 6]],
};

/** Extract site ids mentioned in text. */
export function findSites(text) {
  const t = text.toLowerCase();
  const found = [];
  for (const [id, aliases] of SITE_ALIASES) if (aliases.some((a) => t.includes(a))) found.push(id);
  return found;
}

export function findView(text) {
  const t = ` ${text.toLowerCase()} `;
  let best = null, bestLen = 0;
  for (const [id, v] of Object.entries(VIEWS)) {
    for (const alias of [v.label.toLowerCase(), ...v.aliases]) {
      if (t.includes(` ${alias} `) || t.includes(` ${alias}?`) || t.includes(` ${alias}.`) || t.includes(` ${alias},`)) {
        if (alias.length > bestLen) { best = id; bestLen = alias.length; }
      }
    }
  }
  return best;
}

export function findControl(text, viewId) {
  const t = text.toLowerCase();
  let best = null, bestScore = 0;
  for (const [id, c] of Object.entries(CONTROLS)) {
    for (const alias of [c.label.toLowerCase(), ...c.aliases]) {
      if (t.includes(alias)) {
        const score = alias.length + (c.view === viewId ? 10 : 0);
        if (score > bestScore) { best = id; bestScore = score; }
      }
    }
  }
  return best;
}

function parseChanges(text) {
  const t = text.toLowerCase();
  const changes = {};
  const num = (re) => { const m = t.match(re); return m ? Number(m[1]) : null; };
  const delay = num(/(?:delay(?:ed)?|slip(?:s|ped)?|postpone[sd]?|later)\D{0,12}(\d{1,3})\s*days?/) ?? num(/(\d{1,3})\s*days?\s*(?:later|delay)/);
  if (delay != null) changes.delayDays = delay;
  const antenna = num(/antenna\D{0,20}?(\d{1,3}(?:\.\d+)?)\s*m\b/) ?? num(/(\d{1,3}(?:\.\d+)?)\s*m(?:eters?)?\s*antenna/);
  if (antenna != null) changes.antennaHeight = antenna;
  const array = num(/(?:array|panel|observer)\s*height\D{0,12}?(\d{1,3}(?:\.\d+)?)\s*m\b/) ?? num(/(\d{1,3}(?:\.\d+)?)\s*m(?:eters?)?\s*(?:solar\s*)?array/);
  if (array != null) changes.observerHeight = array;
  const tilt = num(/tilt\D{0,12}?(\d{1,2})\s*(?:°|deg|degrees?)?/);
  if (tilt != null) changes.panelTilt = tilt;
  const az = num(/azimuth\D{0,12}?(\d{1,3})\s*(?:°|deg|degrees?)?/);
  if (az != null) changes.panelAzimuth = az;
  const win = t.match(/\b(24|48)\s*h(?:ours?)?\b|\b(7|14)\s*d(?:ays?)?\s*window\b/);
  if (win) changes.windowHours = win[1] ? Number(win[1]) : Number(win[2]) * 24;
  const date = t.match(/\b(20\d\d-\d\d-\d\d)\b/);
  if (date) changes.date = date[1];
  if (/\b(raise|increase|taller|higher)\b.{0,20}antenna/.test(t) && changes.antennaHeight == null) changes.antennaHeight = 'raise';
  if (/\b(lower|decrease|shorter)\b.{0,20}antenna/.test(t) && changes.antennaHeight == null) changes.antennaHeight = 'lower';
  return changes;
}

function parsePriority(text) {
  const t = text.toLowerCase();
  if (/\b(dark|darkness|night|outage|eclipse)\b/.test(t) && !/earth/.test(t)) return 'darkness';
  if (/\b(incidence|panel)\b/.test(t)) return 'incidence';
  if (/\b(earth|comm|communication|link|dte|radio)\b/.test(t)) return 'earth';
  if (/\b(sun|sunlight|solar|light|illuminat\w*|power)\b/.test(t)) return 'sunlight';
  return null;
}

/**
 * @param {string} question
 * @param {{activeView:string}} ctx
 * @returns {{intent:string, scores:Record<string,number>, entities:object}}
 */
export function routeIntent(question, ctx = {}) {
  const text = String(question ?? '').trim().slice(0, 600);
  const t = text.toLowerCase();
  const scores = {};
  for (const [intent, rules] of Object.entries(RULES)) {
    let s = 0;
    for (const [re, w] of rules) if (re.test(t)) s += w;
    if (s) scores[intent] = s;
  }
  const entities = {
    sites: findSites(t),
    view: findView(t),
    control: findControl(t, ctx.activeView),
    changes: parseChanges(t),
    priority: parsePriority(t),
    hour: (() => { const m = t.match(/\b([01]?\d|2[0-3]):00\b/); return m ? Number(m[1]) : null; })(),
  };

  // Structural boosts from entities.
  if (entities.view && scores.navigation) scores.navigation += 3;
  if (entities.control) scores.control = (scores.control ?? 0) + 3;
  if (Object.keys(entities.changes).length) scores['scenario-change'] = (scores['scenario-change'] ?? 0) + 3;
  if (entities.sites.length >= 2) scores.comparison = (scores.comparison ?? 0) + 3;
  if (scores.prospectivity && scores.ice) scores.ice -= 2;
  if (scores.utc && scores.terrain) scores.terrain -= 1;
  // Navigation needs a destination to win.
  if (scores.navigation && !entities.view) scores.navigation = 0;
  if (!t) return { intent: 'unknown', scores, entities, text };

  let intent = 'unknown', best = 0;
  for (const name of INTENTS) if ((scores[name] ?? 0) > best) { intent = name; best = scores[name]; }
  // A single named site with no stronger signal → talk about that site.
  if (entities.sites.length === 1 && best < 3) intent = 'site';
  return { intent, scores, entities, text };
}
