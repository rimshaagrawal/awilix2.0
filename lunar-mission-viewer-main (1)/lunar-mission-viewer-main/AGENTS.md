# AI project handoff

This file applies to the entire repository. Read it before making changes, then inspect the files relevant to the user's request. The notes below describe the local working tree inspected on November 15, 2026; recheck the current code and Git status when resuming.

## Project and experience

**Lunar Polar Explorer** is a browser-based, interactive 3D Moon experience built with vanilla JavaScript, Three.js, and Vite. There is no application framework, backend, database, or API-key setup in the current project.

The opening view shows a textured Moon, stars, orbiters, symbolic polar ice patches, and selectable geographic waypoints. Selecting a waypoint animates a descent into a local, drivable rover scene. Destinations include Apollo 11 / Tranquility Base, the south-polar region, Shackleton Crater Rim, Malapert A, Mons Mouton, Nobile Crater Rim, and Shackleton Connecting Ridge. Surface scenes include terrain, rocks, a rover station, boosters, dust, sound effects, and scannable exhibits. Apollo has a flag encounter; the south-pole scene also has an AppDev Daddy portrait encounter. Preserve these custom elements unless the user requests changes.

No outstanding feature request or deployment target was supplied for this handoff. Ask for the next objective rather than inventing a roadmap.

## Setup and commands

Use npm and preserve `package-lock.json`. The handoff checks ran with Node.js v26.10.0 and npm 12.2.0; these are observed versions, not a declared minimum. The package uses ES modules and some JSON imports use import attributes.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

- `npm start` also starts the Vite development server.
- Dev and preview scripts bind to `0.0.0.0`; use the URL printed by Vite.
- `npm test` runs Node's built-in test runner over `tests/*.test.js`.
- Production output is `dist/`, which is ignored by Git. Do not edit generated output or `node_modules/`.
- `vite.config.js` uses `base: './'`. Resolve public assets through `import.meta.env.BASE_URL` or the existing helper patterns so hosting under a subpath continues to work.
- Run the app through Vite/HTTP, not by opening `index.html` as a local file. A WebGL-capable browser is needed for visual checks.

## Code map

| File or group | Responsibility |
| --- | --- |
| `index.html` | Viewport host and module entry point. |
| `src/main.js` | Globe scene, renderer, OrbitControls, textures, stars, polar patches, waypoint UI, descent/return transitions, surface HUD, resize, and animation orchestration. |
| `src/surface.js` | Local scene integration, terrain and colliders, region switching, rover input, camera following, encounters, and audio lifecycle. |
| `src/regions.js` | Waypoint IDs, geographic coordinates, images, captions, and lunar coordinate conversion. |
| `src/waypoint-model.js`, `src/waypoint-layout.js` | 3D waypoint pins and screen-space placement of labels/leaders. |
| `src/surface-terrain.js`, `src/site-topography.js` | Generic terrain, deterministic site-specific landforms, and in-place terrain mesh updates. |
| `src/surface-materials.js`, `src/surface-effects.js` | Surface materials and rendering effects. |
| `src/player-physics.js` | Rendered-triangle terrain sampling, movement, gravity, collision, boosters, and bounds. |
| `src/rover.js`, `src/rover-dynamics.js` | Rover model, collider dimensions, wheel support, suspension, and booster visuals. |
| `src/chase-camera.js`, `src/mouse-capture.js` | Camera clearance and pointer-lock behavior. |
| `src/wheel-particles.js`, `src/rover-audio.js` | Ground-contact dust and Web Audio driving/booster/scanner effects. |
| `src/rover-station.js` | Station geometry and shared spawn constants. |
| `src/photo-encounter.js` | Proximity prompt and approach → align → scan → result → return sequence, scan beam/grid, and card/media lifecycle. |
| `src/american-flag.js`, `src/flag-scan-content.js` | Apollo flag geometry/collisions, scan content, and Armstrong media. |
| `src/mission-objects.js`, `src/site-scan-content.js` | Educational exhibit models, safe placement, site explanations, and source links. |
| `src/orbiters.js` | Globe-view orbiters. |
| `src/style.css`, `src/hud.css`, `src/hud-frame.js` | Main layout, HUD/scanner styling, and shared SVG frames. |
| `public/` | Bundled Moon textures, photographs, and audio. Asset provenance is recorded in the `sources.json` files under images/sites, images/missions, and audio. |
| `tests/` | Physics, suspension, camera, terrain, waypoints, exhibits, flag, scanner, particles, and audio regression tests. |

## Interaction reference

- Globe: drag to orbit, scroll to zoom, hover/focus waypoint cards, and select a destination.
- Surface: WASD or arrow keys to move; Shift uses the faster movement input; hold Space for boosters.
- Mouse movement controls the surface view when captured; Ctrl toggles capture. Touch dragging and on-screen movement/booster buttons are supported.
- Press K or select the scan prompt when a target is in range. Close the result card to return to the chase view.
- Use the Moon button or Escape to return to the globe.
- The lower-left Sound on/off button controls rover effects. Audio unlocks after a user gesture.

## Constraints to preserve

- **Scientific framing:** polar patches are symbolic, not measured deposits or a continuous ice cap. Named surface landforms are photo-interpreted, compressed, procedural scenes, not surveyed DEM reconstructions. Several waypoint locations are representative/approximate. Educational instrument models are exhibits; orbital hardware shown on the ground must not be described as having landed there. Preserve those distinctions and existing source attribution. Verify authoritative sources when changing scientific or mission claims.
- **Coordinates:** world Y is elevation. Surface telemetry displays map X = world X and map Y = world Z, in scene units. Globe longitude mapping and the globe's rotation are separate; use `lunarNormal()` and the existing transforms.
- **Terrain/collision agreement:** physics samples the rendered mesh triangles. Collision samplers retain the position attribute, so update terrain geometry in place and recompute normals/bounds. Keep spawn areas, exhibit support, scan parking, and approach routes traversable when editing terrain.
- **Rover/camera behavior:** preserve collider clearances, independent suspension, bounded wheel travel, grounded particle emission, and frame-rate stability. Camera clearance must handle its own terrain/rock position while allowing low views and travel below overhead geometry.
- **Lifecycle/input:** clear movement on blur, pointer-lock changes, region changes, and inactive scenes. Scan transitions must coordinate rover motion, camera, card media, and audio. Leaving a scene or cancelling must clear temporary effects and playback.
- **Audio:** keep gesture-based startup, mute/focus/visibility handling, graceful load failure/retry, and protection against late downloads starting inactive audio. Driving follows grounded speed, boosters follow thrust, and scanner audio follows the beam with one completion cue. Preserve CC0 credits and edits in `public/audio/rover-sources.json` and the README.
- **UI:** retain keyboard accessibility, meaningful labels, touch controls, responsive positioning, and existing reduced-motion behavior. Keep new HUD elements consistent with the shared frame and CSS.
- Follow the existing ES-module/factory-function structure and local style. Keep changes focused; inspect the relevant module before editing rather than reorganizing the whole application.

## Working-tree handoff

The repository already had uncommitted work before this document was created. Preserve it. At inspection, tracked modifications existed in `README.md`, `src/hud.css`, `src/main.js`, `src/photo-encounter.js`, `src/surface.js`, and `tests/photo-encounter.test.js`. Untracked additions included `src/rover-audio.js`, `tests/rover-audio.test.js`, `public/images/appdev-daddy.png`, five rover effect WAV files, and `public/audio/rover-sources.json`.

These files are part of the working project even if they are absent from HEAD. Re-run `git status --short` and inspect diffs before acting. Do not reset, clean, discard, or overwrite existing changes. When transferring the project, include the current working files and untracked assets as well as this document; a clone of HEAD alone may omit recent behavior. `node_modules/` and `dist/` can be regenerated.

## Validation and next-agent checklist

Handoff baseline: **62 tests passed** and **`npm run build` succeeded**. Vite reported a non-fatal warning for a minified JavaScript chunk larger than 500 kB. No browser walkthrough was performed as part of writing this document; passing unit tests and a build do not establish visual correctness.

For subsequent code changes:

1. Read this file, check Git status/diffs, and identify the user's requested outcome.
2. Inspect the owning modules and relevant tests; preserve the constraints above.
3. Implement a focused change. Add or adjust meaningful regression tests when behavior warrants them.
4. Run relevant tests and the production build. There is currently no lint or typecheck script.
5. For visual/input/media changes, check the app in a browser: globe and waypoints, descent/return, region terrain, driving/boosters/collision, scanning and card closure, mute/focus behavior, narrow-screen layout, and reduced motion as applicable. Report any browser checks you could not perform.
6. Summarize what changed, validation results, and remaining limitations. Update this handoff when architecture, controls, commands, or project status materially change.
