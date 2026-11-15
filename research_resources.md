# Moon & Space Resources for Awilix 2.0

Research-only document. No code changes. Compiled via web search, Nov 2026.

## 0. NASA Space Apps Terms — Compliance Notes

Per the NASA Space Apps Challenge legal terms (spaceappschallenge.org/legal):
- Solutions (and Solution Materials) must be open-source (OSI-approved license) or freely publicly available.
- Non-NASA materials must be cited with license documentation in submission.
- NASA data (LRO, LOLA, LROC, PDS, SVS) is US government work → public domain (17 U.S.C. § 105). Freely usable, no attribution required by law, but citation recommended.
- Third-party code with copyleft licenses (AGPL-3.0, GPL-3.0) is OSI-compliant but imposes redistribution obligations on your codebase — flag these.
- NASA Space Apps explicitly forbids proprietary materials and export-controlled (ITAR/EAR) information. Avoid military-graded datasets (e.g., precise LRO attitude CK beyond public archive) and commercial imagery (e.g., Maxar, Planet).
- Do NOT redistribute restricted datasets (e.g., Chandrayaan-2 OHRC high-res, Chang'e-4/5 restricted). Stick to PDS-public products.

---

## 1. NASA APIs & Data Services

### 1.1 NASA Horizons (JPL)
- **URL**: https://ssd.jpl.nasa.gov/horizons/ ; API https://ssd.jpl.nasa.gov/api/horizons.api
- **Offers**: Ephemeris for Sun/Moon/Earth/spacecraft; LRO trajectory; supports position/velocity, illumination geometry. REST API, JSON/text output.
- **License**: Public domain (NASA/JPL).
- **Effort**: Low — fetch positions for Earth visibility, lighting, comms line-of-sight.
- **Value**: Replaces hand-rolled sun/earth geometry; enables time-scrub animation of lighting & Earth visibility.
- **Caveat**: Rate-limited; cache responses. No redistribution restriction.

### 1.2 SPICE (NAIF)
- **URL**: https://naif.jpl.nasa.gov/naif/ ; LRO archive https://naif.jpl.nasa.gov/pub/naif/pds/data/lro-l-spice-6-v1.0/
- **Offers**: Kernels (SPK/PCK/CK/IK/FK/LSK/SCLK) for LRO and planetary bodies; precise attitude, frames.
- **License**: Public domain.
- **Effort**: High for browser (needs JS SPICE port, e.g., spice.js); easier via server pre-compute. JS ports exist (spicejs).
- **Value**: High-precision lunar south pole illumination/visibility; matches NASA mission planning tools.
- **Caveat**: Browser bundle large. Consider pre-computing into CSV (like connecting-ridge dataset) instead.

### 1.3 Moon Trek / Solar System Treks (JPL)
- **URL**: https://trek.nasa.gov/moon/ ; API https://trek.nasa.gov/tiles/apidoc/ (WMTS)
- **Offers**: Hundreds of lunar map layers (LOLA DEM, LROC WAC/NAC, Diviner temp, illumination, PSR, Clementine), 3D flyover, distance/elevation/sun-angle tools, WMTS tiles.
- **License**: NASA public domain; WMTS freely usable.
- **Effort**: Low — embed tiles via WMTS in three.js/Mapbox/Cesium.
- **Value**: Huge — direct source for terrain imagery, illumination layers, PSR overlays; matches Artemis candidate regions.
- **Caveat**: Tile URLs require correct projection (polar stereographic). Check ToS for bulk download (fine for hackathon).

### 1.4 LROC QuickMap (ASU)
- **URL**: https://quickmap.lroc.asu.edu/
- **Offers**: Interactive lunar map with LROC NAC/WAC, LOLA, temp, slopes, PSR; measure tools.
- **License**: NASA public domain (LROC data); QuickMap UI is ASU-hosted.
- **Effort**: Low — embed iframe or use tile endpoints.
- **Value**: Quick verification tool; compare Awilix outputs against official maps.
- **Caveat**: No documented public tile API; iframe embed safer.

### 1.5 PDS Geosciences Node / ODE
- **URL**: https://ode.rsl.wustl.edu/ ; https://pds-geosciences.wustl.edu/missions/lro/
- **Offers**: Search/download LOLA RDR/GDR, SLDEM, LROC, Diviner, Mini-RF, GRAIL; REST search API; LOLA point queries.
- **License**: Public domain.
- **Effort**: Medium — download + convert to browser-friendly (COG/GeoTIFF → PNG heightmap).
- **Value**: Authoritative source for all elevation/ice/temp layers.

### 1.6 LROC Planetary Image Atlas / Apollo Browse Gallery
- **URL**: https://www.lpi.usra.edu/resources/apollo/ ; https://data.lroc.im-ldi.com/apollo/browse/
- **Offers**: 25k+ Apollo photos (70mm, metric, panoramic, ALSCC), LROC NAC of Apollo sites.
- **License**: Public domain (NASA).
- **Effort**: Low — link/embed thumbnails.
- **Value**: Fun "Apollo landing sites" overlay; historical context panel.

### 1.7 Apollo Lunar Surface Journal / Flight Journal
- **URL**: https://www.nasa.gov/history/alsj-and-afj/
- **Offers**: Annotated transcripts, photos, maps, audio/video for all Apollo missions.
- **License**: Public domain.
- **Effort**: Low — deep links.
- **Value**: Educational content; "stand where Apollo 11 stood" feature.

### 1.8 NASA SVS (Scientific Visualization Studio)
- **URL**: https://svs.gsfc.nasa.gov/ ; API https://svs.gsfc.nasa.gov/api/
- **Offers**: Pre-rendered lunar visualizations (Earthrise, Apollo paths, DEM, illumination); downloadable MP4/PNG; searchable API.
- **License**: Public domain (NASA).
- **Effort**: Low — embed videos/images.
- **Value**: Marketing/demo assets; "Earthrise from south pole" hero video.

### 1.9 NASA Eyes
- **URL**: https://eyes.nasa.gov/
- **Offers**: Browser 3D solar system/Moon fly-through; embeddable.
- **License**: NASA.
- **Effort**: Low — iframe.
- **Value**: Fun "fly to Moon" onboarding.

---

## 2. Open-Source Libraries & Globe Engines

### 2.1 three-globe / globe.gl / react-globe.gl (Vasturiano)
- **URL**: https://globe.gl/ ; https://github.com/vasturiano/react-globe.gl
- **Offers**: React component for 3D globe with layers (points, arcs, heatmaps, tiles, day/night terminator). Moon Landing Sites example exists.
- **License**: MIT.
- **Effort**: Low — drop-in React component; matches Vite+React stack.
- **Value**: High — quick globe view of Apollo sites, Earth visibility arcs, comms coverage.

### 2.2 spacekit (typpo)
- **URL**: https://github.com/typpo/spacekit ; https://typpo.github.io/spacekit/
- **Offers**: 3D space viz lib (Earth/Moon/solar system), accurate orbits, skybox presets (NASA Tycho), Three.js r186.
- **License**: MIT.
- **Effort**: Low — npm install spacekit.js.
- **Value**: Earth-Moon system view; sun/earth/moon geometry; skybox.

### 2.3 three-geospatial (Takram)
- **URL**: https://github.com/takram-design-engineering/three-geospatial
- **Offers**: Atmosphere scattering, clouds, post-processing effects for Three.js GIS.
- **License**: MIT.
- **Effort**: Medium — modular packages.
- **Value**: Earth atmosphere glow for Earth-visibility scenes; lunar terminator realism.

### 2.4 react-cartoon-planet
- **URL**: https://github.com/krzysztofradomski/react-cartoon-planet
- **Offers**: Animated cartoon globe with markers, day/night, clouds, render modes; includes MOON_MAP.
- **License**: (check repo) — likely MIT.
- **Effort**: Low.
- **Value**: Stylized "fun" moon view for educational mode.

### 2.5 skylumi 3d-moon
- **URL**: https://github.com/skylumi-labs/3d-moon ; https://skylumi.org/3d-moon/
- **Offers**: Full-screen ray-casted Moon with real terrain (LOLA+SELENE), LRO WAC imagery, Apollo 11/17 high-res, terrain-aware lighting, shadows, Astronomy Engine for sun/earth/moon. TypeScript + three.js + Vite.
- **License**: **AGPL-3.0-only** (code); data has separate terms (DATA-LICENSES.md).
- **Effort**: Medium — study architecture; cannot directly copy (AGPL contagion) unless project is AGPL-compatible. Can reimplement ideas.
- **Value**: Reference architecture for terrain streaming, tile LOD, terrain-aware shadows.
- **⚠️ Space Apps conflict**: AGPL is OSI-compliant, so usable IF you open-source under AGPL. But AGPL's network-use clause may conflict with NASA's redistribution expectations. **Recommend: cite as reference only; reimplement, do not vendor.**

### 2.6 fly-around-the-moon (smford)
- **URL**: https://github.com/smford/fly-around-the-moon
- **Offers**: Accurate 3D Moon, LOD, sub-km recon photos, selenographic coords, real-time ephemeris.
- **License**: **AGPL-3.0** (code); data public domain.
- **Effort**: Medium.
- **Value**: Reference for LOD + coord systems.
- **⚠️ Same AGPL caveat as 2.5.**

### 2.7 astronomy-engine
- **URL**: https://www.npmjs.com/package/astronomy-engine
- **Offers**: Sun/Moon/planet positions, phases, rise/set, libration, illumination; pure JS, no network.
- **License**: MIT.
- **Effort**: Low — npm install.
- **Value**: High — moon phase, Earth visibility, illumination fraction, terminator; already used by Lunaria/SpaceView/Cosmos.
- **Recommendation**: Adopt as primary ephemeris (replaces Horizons for client-side).

### 2.8 MeeusJs
- **URL**: https://github.com/Fabiz/MeeusJs
- **Offers**: Meeus astronomical algorithms (sun/moon positions, phases, rise/set).
- **License**: MIT.
- **Effort**: Low.
- **Value**: Alternative to astronomy-engine; smaller bundle.

### 2.9 react-three-fiber / drei
- **URL**: https://github.com/pmndrs/react-three-fiber
- **Offers**: React renderer for Three.js; drei helpers (OrbitControls, Html, etc.).
- **License**: MIT.
- **Effort**: Low — likely already in stack.
- **Value**: Idiomatic React 3D; recommended if Awilix 2.0 uses raw three.js.

### 2.10 3d-tiles-renderer (NASA AMMOS / NYPL)
- **URL**: https://github.com/NASA-AMMOS/3DTilesRendererJS
- **Offers**: OGC 3D Tiles renderer for Three.js; supports Cesium 3D Tiles.
- **License**: Apache-2.0.
- **Effort**: Medium.
- **Value**: Stream high-res lunar terrain tiles (from Moon Trek) efficiently.

---

## 3. Datasets (DEM, Ice, Temp, Illumination)

### 3.1 LOLA South Pole DEMs (PGDA)
- **URL**: https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/
- **Offers**: 5 m/px LOLA DEMs for 6 south pole sites (Connecting Ridge, Shackleton rim, Peak near Shackleton, de Gerlache rim, Leibnitz beta plateau, Malapert massif); slope, uncertainty, PSR-adjacent.
- **License**: Public domain (NASA).
- **Effort**: Medium — GeoTIFF → heightmap.
- **Value**: High — matches Artemis candidate regions; sub-10m detail.

### 3.2 SLDEM2015 (Barker et al.)
- **URL**: https://imbrium.mit.edu/BROWSE/SLDEM2015/TILES/
- **Offers**: Merged LOLA+Kaguya DEM, 512 ppd (~60 m) global, 118 m at equator; south pole tiles.
- **License**: Public domain.
- **Effort**: Medium.
- **Value**: Global terrain base; south pole coverage.

### 3.3 Diviner (LRO) Temperature
- **URL**: https://www.diviner.ucla.edu/published-datasets
- **Offers**: Bolometric brightness temp, rock abundance, CF; published datasets (binary + browse images).
- **License**: Public domain (NASA LRO).
- **Effort**: Medium-high — binary format conversion.
- **Value**: Ice prospectivity proxy; thermal stability layers.

### 3.4 Connecting Ridge 5m Dataset (Terranova, HuggingFace)
- **URL**: https://huggingface.co/datasets/terranova-robotics/connecting-ridge-5m
- **Offers**: 3 km×3 km, 5 m/px: DEM, slope, curvature, aspect, PSR mask (horizon sweep), ice prospectivity index, boulder counts, crater detections (NASA-IBM LFM), illumination fraction CSV, site summary JSON.
- **License**: **CC-BY-4.0** (derived); underlying sources retain attribution.
- **Effort**: Low — ready-to-use GeoTIFF/CSV/JSON.
- **Value**: Very high — directly models Awilix's "ice prospectivity + terrain + illumination" use case; includes prospectivity fuzzy-overlay rule reproduction.
- **Caveat**: CC-BY-4.0 requires attribution. Cite Terranova + source papers. Compliant with Space Apps (OSI-adjacent; CC-BY is acceptable for datasets per NASA "freely available" rule — but verify: NASA requires OSI open-source for code; CC-BY is fine for data). **Recommend: use + cite.**

### 3.5 Lemelin et al. — Ice-bearing PSR database
- **URL**: https://zenodo.org/records/4646092
- **Offers**: Database of water-ice-bearing PSRs in south polar region; Excel + ArcGIS shapefile.
- **License**: CC-BY-4.0.
- **Effort**: Low — convert shapefile to GeoJSON.
- **Value**: Overlay "confirmed ice PSRs" on map.

### 3.6 Hydrogen/Neutron Ice Evidence (Zenodo)
- **URL**: https://zenodo.org/records/14002739
- **Offers**: Data + IDL software for H sequestration in south polar cold traps; CC0 data, NOSA software.
- **License**: Data CC0; software NOSA 1.3 (NASA open source — OSI? NOSA is not OSI-approved; check). **Flag: software under NOSA, not OSI — for Space Apps, prefer data only.**
- **Effort**: Medium.
- **Value**: Ice evidence layer.

### 3.7 Scott-E Surface Roughness & Thermal (Zenodo)
- **URL**: https://zenodo.org/records/4050849
- **Offers**: Elevation roughness, brightness roughness, Tmax, depth-to-ice rasters (south polar stereographic).
- **License**: (check Zenodo record — likely CC-BY or open).
- **Effort**: Low.
- **Value**: Ice stability depth layer.

### 3.8 Artemis III Candidate Landing Regions Grids (USGS)
- **URL**: https://www.usgs.gov/data/down-selected-artemis-iii-candidate-landing-site-navigational-grids
- **Offers**: LGRS ACC grids (1 km/100 m/10 m) for 9 Artemis III sites; shapefiles.
- **License**: USGS public domain.
- **Effort**: Medium — shapefile → GeoJSON.
- **Value**: Direct overlay of official Artemis candidate sites; aligns with Awilix "site evaluation" purpose.

### 3.9 NASA-IBM Lunar Foundation Model
- **URL**: https://huggingface.co/... (referenced in connecting-ridge dataset); NASA-IBM
- **Offers**: Crater detection head for LROC NAC; model card.
- **License**: (check model card — likely Apache-2.0 or similar).
- **Effort**: High — requires inference runtime.
- **Value**: Auto-crater/boulder detection on NAC imagery.
- **Caveat**: Model card says untested under grazing illumination; treat as candidate detection, not certified.

---

## 4. Embeddable Viewers & Widgets

### 4.1 Moon Trek (embed via iframe / WMTS)
- **URL**: https://trek.nasa.gov/moon/
- **Offers**: Full 3D lunar viewer with layers; iframe embeddable; WMTS tiles.
- **License**: NASA.
- **Effort**: Low.
- **Value**: "Compare with official NASA view" panel.

### 4.2 Stellarium Web
- **URL**: https://stellarium-web.org/
- **Offers**: Sky viewer with Moon position/phase; embeddable widget.
- **License**: AGPL-3.0 (Stellarium web).
- **Effort**: Low (iframe).
- **Value**: Moon phase & sky context for a given date/location.
- **⚠️ AGPL** — iframe embed is fine (no code mixing).

### 4.3 Lumina Lunar / CycleCalcs / MoonPhase widgets
- **URLs**: https://luminalunar.com/widget/ ; https://www.cyclecalcs.com/embed.html ; https://moonphase.guide/widget
- **Offers**: Drop-in moon phase widgets (iframe/script).
- **License**: Free for personal/commercial (CycleCalcs); Lumina free.
- **Effort**: Very low.
- **Value**: Quick "today's moon phase" sidebar; educational.

### 4.4 AstronomyAPI Widgets
- **URL**: https://docs.astronomyapi.com/widgets
- **Offers**: Moon phase + star chart widgets (PNG); requires API key.
- **License**: Freemium (API key).
- **Effort**: Low.
- **Value**: Star chart overlay; but requires account — less ideal for hackathon.

### 4.5 Celestia (desktop) / Celestia Web
- **URL**: https://celestiaproject.space/
- **Offers**: 3D space simulation; lunar surface fly-through.
- **License**: GPL-2.0.
- **Effort**: High (desktop app, not web-embeddable easily).
- **Value**: Low for web integration; better as inspiration.

---

## 5. UI Component Kits & Icon Sets

### 5.1 H2D2 Apollo 11 Icons
- **URL**: https://www.h2d2.de/en/downloads/apollo11-icons/
- **Offers**: 29 SVG/PDF/PNG icons (Apollo 11 theme).
- **License**: Apache-2.0.
- **Effort**: Low.
- **Value**: Thematic icon set for Apollo landing sites / mission markers.

### 5.2 IconHub Space / Astronaut packs
- **URL**: https://iconhub.com/packs/space-85 ; https://iconhub.com/packs/astronaut-3
- **Offers**: 36 + 25 flat space icons (SVG/PNG/React).
- **License**: Free for personal & commercial with credit.
- **Effort**: Low.
- **Value**: General space UI icons.

### 5.3 lunar-icons (pr1mer-tech)
- **URL**: https://github.com/lucasgruwez/lunar-icons ; https://lunar.pr1mer.tech/
- **Offers**: Handcrafted SVG icon set.
- **License**: MIT.
- **Effort**: Low.
- **Value**: Lunar-themed icons.

### 5.4 Infyicon Astronaut (80 icons)
- **URL**: https://infyicon.com/free-icons/astronaut
- **Offers**: 80 astronaut icons (outline/filled/color).
- **License**: Free with attribution; premium removes credit.
- **Effort**: Low.
- **Value**: Astronaut avatars/markers.

### 5.5 shadcn/ui (likely already in stack)
- **URL**: https://ui.shadcn.com/
- **Offers**: React component primitives (Radix + Tailwind).
- **License**: MIT.
- **Value**: Consistent with React+Vite; recommended for panels/sliders.

---

## 6. Educational Content & Fun Features

### 6.1 Apollo Surface Panoramas (LPI)
- **URL**: https://www.lpi.usra.edu/resources/apollopanoramas/
- **Offers**: Stitched 70mm Hasselblad panoramas at each Apollo site with annotations.
- **License**: Public domain.
- **Effort**: Low — embed images.
- **Value**: "Stand on the Moon" immersive panel at Apollo 11/17.

### 6.2 Apollo Image Atlas
- **URL**: https://www.lpi.usra.edu/resources/apollo/
- **Offers**: 25k lunar images searchable by feature/coordinate.
- **License**: Public domain.
- **Value**: Search-by-coordinate for any south pole location.

### 6.3 Apollo Image Archive (ASU)
- **URL**: https://apollo.im-ldi.com/
- **Offers**: Scanned original flight films (metric, panoramic).
- **License**: Public domain (NASA/ASU).
- **Value**: High-res ortho for Apollo sites.

### 6.4 NASA Apollo Landing Sites page
- **URL**: https://science.nasa.gov/resource/landing-sites/
- **Offers**: Overview + links to 14k Apollo photos.
- **Value**: Narrative content for "Apollo context" tab.

### 6.5 SVS Apollo collection
- **URL**: https://svs.gsfc.nasa.gov/gallery/apollo/
- **Offers**: Earthrise video, Apollo path anims, Blue Marble.
- **Value**: Hero media; "Earthrise from south pole" animation.

### 6.6 Moon phase libs (mblode/moon, NeaByteLab/MoonPhases, Lunaria)
- **URLs**: https://github.com/mblode/moon ; https://github.com/NeaByteLab/MoonPhases ; https://github.com/kokoro-ele/Lunaria
- **Offers**: React/R3F moon phase visualizers with astronomy-engine; share cards; i18n.
- **License**: (check each; Lunaria MIT-ish; mblode MIT).
- **Effort**: Low — adapt components.
- **Value**: "Moon phase today" + "you were born under this moon" fun feature; time-scrub illumination.

### 6.7 spaceview (antoine-paris)
- **URL**: https://github.com/antoine-paris/spaceview
- **Offers**: Sky viz with Moon/Sun phases, libration, projections, timelapse, WebM export.
- **License**: (check) likely MIT.
- **Effort**: Medium.
- **Value**: Time-lapse illumination; exportable videos for demos.

### 6.8 Cosmos (Yashkapure06) — satellite/solar system tracker
- **URL**: https://github.com/Yashkapure06/Cosmos
- **Offers**: Real-time 3D solar system, Moon phase, deep-space fleet positions from Horizons.
- **License**: (check).
- **Effort**: Medium.
- **Value**: Reference for Horizons integration + deep-space objects.

### 6.9 earthOS (efolusi)
- **URL**: https://github.com/efolusi/earthOS
- **Offers**: Plugin-based 3D Earth digital twin; day/night, sun/moon, eclipses.
- **License**: (check).
- **Effort**: Medium-high.
- **Value**: Plugin architecture inspiration; eclipse rendering.

---

## 7. Recommended Integration Priority for Awilix 2.0

**Tier 1 (do now, low effort, high value):**
1. astronomy-engine (npm) — ephemeris for lighting/Earth visibility/moon phase.
2. Moon Trek WMTS tiles — terrain/illumination/PSR layers.
3. Connecting Ridge 5m dataset (HuggingFace) — ice prospectivity reference + validation.
4. react-globe.gl — Apollo sites + Earth visibility globe.
5. H2D2 Apollo 11 icons + lunar-icons — UI polish.

**Tier 2 (medium effort):**
6. LOLA south pole DEMs (PGDA) — high-res terrain for the 6 sites.
7. Diviner temperature — thermal stability layer.
8. Artemis III USGS grids — official candidate site overlays.
9. Lunaria / mblode/moon components — moon phase fun feature.
10. Apollo panoramas — immersive site panels.

**Tier 3 (reference only / inspiration):**
11. skylumi 3d-moon, fly-around-the-moon — study terrain streaming & LOD (do NOT vendor; AGPL).
12. three-geospatial — atmosphere effects.
13. 3d-tiles-renderer — if streaming Moon Trek tiles at high res.

**Avoid:**
- AGPL/GPL code vendoring into an Apache-2.0 (or unspecified) project without license reconciliation.
- Chandrayaan-2/Chang'e restricted imagery.
- AstronomyAPI (requires API key; less hackathon-friendly).
- Celestia (desktop, not web).

---

## 8. License Compliance Matrix (Space Apps)

| Asset | License | OSI? | Space Apps OK? | Action |
|---|---|---|---|---|
| NASA LRO/LOLA/LROC/PDS/SVS | Public domain | N/A | ✅ Yes | Cite NASA |
| Moon Trek WMTS | NASA public | N/A | ✅ Yes | Cite NASA/JPL |
| Horizons API | NASA public | N/A | ✅ Yes | Cite JPL |
| Connecting Ridge 5m | CC-BY-4.0 | (data) | ✅ Yes (cite) | Cite Terranova |
| Lemelin ice PSR DB | CC-BY-4.0 | (data) | ✅ Yes (cite) | Cite Lemelin et al. |
| Zenodo H-evidence data | CC0 | ✅ | ✅ Yes | Cite |
| Zenodo H-evidence software | NOSA 1.3 | ❌ not OSI | ⚠️ Data only | Don't vendor software |
| USGS Artemis grids | Public domain | N/A | ✅ Yes | Cite USGS |
| astronomy-engine | MIT | ✅ | ✅ Yes | Cite |
| MeeusJs | MIT | ✅ | ✅ Yes | Cite |
| three-globe / globe.gl | MIT | ✅ | ✅ Yes | Cite |
| spacekit | MIT | ✅ | ✅ Yes | Cite |
| three-geospatial | MIT | ✅ | ✅ Yes | Cite |
| react-three-fiber / drei | MIT | ✅ | ✅ Yes | Cite |
| 3d-tiles-renderer | Apache-2.0 | ✅ | ✅ Yes | Cite |
| H2D2 Apollo icons | Apache-2.0 | ✅ | ✅ Yes | Cite |
| lunar-icons | MIT | ✅ | ✅ Yes | Cite |
| IconHub | Free w/ credit | (not OSI) | ⚠️ OK for assets; cite | Cite IconHub |
| skylumi 3d-moon | AGPL-3.0 | ✅ | ⚠️ Only if project is AGPL | Reference only |
| fly-around-the-moon | AGPL-3.0 | ✅ | ⚠️ Only if project is AGPL | Reference only |
| Stellarium Web | AGPL-3.0 | ✅ | ⚠️ iframe OK | Embed only |
| Celestia | GPL-2.0 | ✅ | ⚠️ Desktop only | Skip |

---

## 9. Conflicts & Red Flags

1. **AGPL contagion**: skylumi/3d-moon and fly-around-the-moon are AGPL-3.0. Vendoring their code into an Apache/MIT project would require relicensing the whole project to AGPL. NASA Space Apps requires OSI license — AGPL qualifies, but changes project's license posture. **Recommend: study, reimplement, do not copy.**
2. **NOSA software** (Zenodo H-evidence): NOSA 1.3 is NASA's own open-source agreement but is NOT OSI-approved. NASA Space Apps explicitly requires OSI for Solution Materials. **Use the CC0 data; ignore the IDL software.**
3. **IconHub / Infyicon**: "free with credit" is not an OSI license. Acceptable for graphical assets (not code) but must be cited. NASA requires citation of all sources.
4. **Commercial imagery**: Do NOT use Maxar, Planet, or LROC QuickMap proprietary composites. Use PDS-public LROC NAC/WAC only.
5. **Export control**: LRO SPICE CK (attitude) is public archive — OK. But any ITAR-controlled (e.g., precision Starship HLS data) must be excluded. Not relevant to public data.
6. **Redistribution of large datasets**: NASA allows free redistribution of public-domain data, but bulk re-hosting of PDS volumes may be discouraged. Prefer linking/downloading at runtime or citing PDS URLs. For hackathon, subset + re-host is acceptable with citation.
7. **Attribution**: NASA Space Apps requires citation of every source, including open-source. Maintain a `CREDITS.md` / references section in submission.

---

## 10. Quick-Start Snippets (reference)

### astronomy-engine (ephemeris)
```bash
npm i astronomy-engine
```
```ts
import { Body, Illumination, MakeTime, MoonPhase, Observer, SearchRiseSet } from 'astronomy-engine';
const illum = Illumination(Body.Moon, new Date());
// illum.phase_fraction, .phase_angle
```

### react-globe.gl (Apollo sites)
```bash
npm i react-globe.gl
```
```tsx
import Globe from 'react-globe.gl';
<Globe globeImageUrl="//cdn..." pointsData={apolloSites} />
```

### Moon Trek WMTS tile (example)
```
https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd/1.0.0/default/default028mm/{z}/{y}/{x}.jpg
```
(verify exact layer name via https://trek.nasa.gov/tiles/apidoc/)

---

*End of research document. No code changes made.*