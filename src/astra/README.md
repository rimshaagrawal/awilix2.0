# Astra agent

Astra explains Awilix. It never calculates science itself: every number comes from Awilix's own tools, and the validator removes anything it can't trace.

```
question ─► router.js ─► agent.js handler ─► tools.js (read-only) ─► compose ─► validator.js ─► UI
                         (intent + entities)    │                                   ▲
                                                └─ facts.js (reviewed knowledge) ───┘
```

| File | Role |
|---|---|
| `facts.js` | Reviewed fact sheet (P0). Views, controls, knowledge snippets, sources and scientific boundaries, each with an evidence status. |
| `tools.js` | Tool contract (P1): `getCurrentViewState`, `getCurrentSiteAndTelemetry`, `getSelectedSiteComparison`, `getScenarioVsReference`, `getWhatIf`, `getTerrainProductInfo`, `getProspectivityInfo`, `getKnowledge`, `navigateTo`, `getSkyAt`. Every science result returns `{data, meta:{time, source, frame, coverage, assumptions, quality}}`. |
| `router.js` | Deterministic intent classifier plus entity extraction (sites, views, controls, what-if changes, priority, hour). |
| `agent.js` | Composes answers (`quick`, `why[]`, `sources`, `quality`, `actions`), runs predict-then-reveal, and finalises with the validator. |
| `validator.js` | Drops any sentence with a number not found in tool output, facts or the question, or one that breaks a boundary (watts, guaranteed link, "best site", measured ice, glaciers). |
| `tour.js` | Guided tour stops, each tied to a real `data-astra` anchor. |
| `phraser.js` | Optional local-model rephrasing, **off by default**. |
| `runtime.ts` | Browser wiring: injects the science worker, ephemeris, terrain and data into the tools. |

## Rules the UI follows
- Astra auto-performs only navigation the user explicitly asked for, plus the terrain hour change in a predict activity the user started.
- Scenario, comparison and site changes appear as buttons or Apply/Dismiss cards.
- Answers whose context has since changed show "Settings changed since this answer · refresh".

## Moving tools to a backend
`createAstraTools(deps)` takes its dependencies by injection. To serve them from a server, implement the same functions behind an API and swap them in `runtime.ts`. The agent, validator and UI don't change. Keep tools read-only.

## OpenAI backend (`/api/astra`)
`server/astra-llm.js` holds the key and calls the model. It is served by the Vite dev/preview server (`vite.config.ts`) and on Vercel by `api/astra.js`.

```
# .env.local (dev) or Vercel project env (prod). No VITE_ prefix, so it is never bundled.
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini          # optional
OPENAI_BASE_URL=...               # optional, any OpenAI-compatible endpoint
```
- Questions the router can place are still answered by the deterministic handlers.
- Questions it can't place (`unknown`) go to the model, with the reviewed fact sheet (built server-side from `facts.js`) and a live app snapshot from the tools.
- Every model reply goes through `validator.js` in the browser. Unsupported numbers and boundary violations are dropped, and if nothing survives, the deterministic reply is used.
- With no key, `/api/astra` returns 503 and Astra stays deterministic. `VITE_ASTRA_MODEL=off` disables the model client entirely.
- `GET /api/astra` reports `{enabled, model}`. The panel header shows it.

## Adding knowledge
Add an entry to `KNOWLEDGE` in `facts.js` with `tags`, `status`, `sources`, `text` and `detail`. Numbers inside fact texts become approved evidence, so only add reviewed facts. Then run `npm run test:astra`.
