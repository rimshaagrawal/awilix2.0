# Awilix data sources, attribution, and accuracy notes

Last reviewed: 2026-11-15. This document describes the local Awilix 2.0 build.

## Challenge and project scope

Awilix is a scenario comparison and educational tool for lunar surface lighting and geometric Earth visibility. Its outputs are exploratory estimates; they are not mission certification, a flight dynamics product, a power budget, or a communications link budget.

NASA Space Apps requires participants to cite sources used and provide appropriate license documentation for solution materials. The source copy used for this preview has no project-level `LICENSE` file, so the team must choose and add its project license before challenge submission. This document does not grant a license to Awilix code or assets.

Reference: [NASA Space Apps legal terms](https://www.spaceappschallenge.org/legal/) (reviewed 2026-11-09).

## Celestial directions

| Item | Source and use | Provenance and limits |
|---|---|---|
| Hourly 2026 direction table | `public/data/mooninfo_2026.json`; application attributes it to [NASA SVS 5587](https://svs.gsfc.nasa.gov/5587/) and uses hourly subsolar/sub-Earth directions and Earth distance. | SHA-256: `098ec6434ba4fecb84e66485385816d465b7969f142864bcfc9ffc68311b4a86`. Covers 2026-01-01 00:00 through 2026-12-31 23:00 UTC. Row timestamps, order, coordinate ranges, distance, and phase are validated at load. Representative direction calculations are independently compared with JPL Horizons DE441 as described below; this comparison does not independently validate the source extraction recipe or all mission conditions. |
| Direction interpolation | Spherical interpolation on unit vectors between adjacent hourly subpoints. | Avoids longitude-wrap errors at ±180°. It does not add information between hourly records. |
| Outside table coverage | `astronomy-engine` package, analytic lunar orientation fallback. | Approximate fallback; not a NASA DE421 or SPICE validation claim. The Sun distance in the hourly-table path is fixed to 1 AU. |

## Scenario Lab calculation and independent check

Scenario Lab now obtains its path and metrics from `src/workers/science.worker.js` → `src/lib/scenarioAnalysis.js`, not the legacy formula summary. The selected date begins at **00:00 UTC**. Base sampling is 10 minutes up to 48 hours, 30 minutes up to 7 days, and 60 minutes for longer windows; sign-changing horizon crossings are additionally bracket-refined to at most one second. Visibility durations are integrated across the returned path. Unknown intervals are excluded from availability denominators and are not counted as visible or as confirmed outages.

The independent comparison is reproducible with `npm run validate:horizons`. It requests JPL Horizons observer-table apparent airless AZ/EL for the Sun and Earth center, from an observer at each of the six regional catalog coordinates (Mean Earth geodetic Moon coordinates, zero height), at each of three representative dates in 2026. It compares 30-minute samples with the bundled NASA SVS 5587 table plus the app's spherical interpolation and topocentric transform. The report is [`docs/validation/horizons-scenario-comparison.json`](../docs/validation/horizons-scenario-comparison.json); the compact UI summary is `public/data/horizons-validation-summary.json`. Across 1,764 comparisons, the maximum absolute azimuth/altitude differences are below 0.0007 degrees, against a declared 0.01-degree regression tolerance.

That is a bounded ephemeris geometry cross-check, not an end-to-end validation of the 10-minute visibility-window integral, terrain horizon, electrical generation, or a communications link. Catalog sites are regional markers, not surveyed touchdown coordinates. Horizons validates selected dates only; dates outside the bundled 2026 table use the approximate fallback and are not covered by this check.

Scenario Lab's **reference horizon** is a spherical body horizon with observer-height curvature and no local topographic obstruction. Its **terrain** option uses the selected local crop and is explicitly experimental: frame/datum registration, source raster identity, completeness, far-field terrain, and legacy NoData recovery are not fully verified. If a horizon direction has no valid terrain coverage, that interval is unknown and excluded rather than declared clear. Solar-array incidence is a geometric cosine factor (not watts); Earth-center visibility is not an antenna link or communications availability.

## Terrain

The runtime terrain manifest is [`science-terrain/manifest.json`](science-terrain/manifest.json). It lists each bundled terrain asset, its SHA-256, stated source family, native resolution, display sampling, frame/datum status, and missing-value policy. The app has distinct source products: polar crops labeled as 80 m elevation with a separate 20 m mask, and lower-resolution LDEM16 regional crops at 16 pixels/degree. Resampling or mesh subdivision is display sampling; it does not create new measured detail.

Source family reference: [NASA PDS Geosciences Node, LRO LOLA](https://pds-geosciences.wustl.edu/missions/lro/lola.htm) (reviewed 2026-11-09). The original PDS raster labels, source rasters, exact product identifiers, and original NoData masks are not included in this copy. Terrain crops are marked experimental because body-fixed registration and height datum have not been independently verified. Legacy builders replaced some missing samples with zero; where that occurred, the original validity cannot be recovered. The current conservative mask may also remove valid zero-valued elevations. Do not treat terrain-derived horizon values as validated landing predictions.

Runtime assumptions: lunar planetocentric latitude and east-positive longitude; lunar radius 1,737.4 km; locally reconstructed crop registration; curvature-corrected local terrain only. The model excludes far-field terrain, solar-disk fraction, atmospheric refraction, antenna pattern, Earth station scheduling, radio link budget, and solar-array tracking. Reference-sphere mode excludes local topographic obstruction.

## Mission and location catalog

Catalog coordinates are regional comparison markers, not surveyed touchdown coordinates. Mission associations are explicitly labeled as regional or unconfirmed. In particular, NASA records IM-2 Athena reaching the surface near Mons Mouton on 2025-03-06, and Blue Ghost 1 landing at Mare Crisium on 2025-03-02 and concluding its mission on 2025-03-16:

- [NASA: IM-2 on the Moon’s surface](https://www.nasa.gov/image-article/nasas-lunar-reconnaissance-orbiter-views-im-2-on-moons-surface/) (published 2025-03-25; reviewed 2026-11-09).
- [NASA: Blue Ghost 1 landing](https://www.nasa.gov/news-release/touchdown-carrying-nasa-science-fireflys-blue-ghost-lands-on-moon/) (published 2025-03-02; reviewed 2026-11-09).
- [NASA: Blue Ghost 1 mission conclusion](https://www.nasa.gov/news-release/nasa-science-continues-after-fireflys-first-moon-mission-concludes/) (published 2025-03-18; reviewed 2026-11-09).
- [NASA: Artemis III 2027 Earth-orbit test](https://www.nasa.gov/missions/artemis/nasa-shares-plans-to-accelerate-artemis-return-to-moon/) (published 2026-11-04; reviewed 2026-11-09). It is not a lunar landing date preset.
- [NASA: IM-3 / Lunar Vertex region](https://science.nasa.gov/lunar-science/clps-deliveries/cp-11/) (reviewed 2026-11-09). Its Reiner Gamma association is regional; the catalog does not assert the latest schedule or landing result.
- [NASA: IM-1 landing at Malapert A](https://science.nasa.gov/moon/missions/) (reviewed 2026-11-09). The selected Malapert coordinate is still a regional comparison marker.

Other future associations are not represented as confirmed site assignments. Review all mission schedules and catalog facts against current primary sources before submission; these schedules can change.

## Software and licenses

The runtime analytic fallback uses the [`astronomy-engine` npm package](https://www.npmjs.com/package/astronomy-engine); the project lockfile pins dependency versions. Third-party package licenses are supplied with their respective packages under `node_modules` after install and must be included in any distribution review. No project-level license was found in this source copy. The team should decide the source and asset license and include the corresponding license files before public challenge submission.

NASA marks and imagery are not implied to be endorsed by NASA. Review each asset’s original source and usage terms before redistribution; the presence of a NASA URL or a data checksum is not itself a license grant.
