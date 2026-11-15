import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Site, Scenario } from '@/types';
import { sites } from '@/data/sites';
import { computePositions } from '@/lib/ephemeris';
import { bilinearGrid, gridToENU, sampleTerrain } from '@/lib/terrainScience';
import {
  Sun,
  Radio,
  Play,
  Pause,
  RefreshCw,
  Grid,
  SlidersHorizontal,
  Lightbulb,
  X,
  RotateCcw,
} from 'lucide-react';
import { OptionWheel } from '@/components/reactbits/OptionWheel';
import { WakeSlider } from '@/components/reactbits/WakeSlider';

interface SiteTerrain3DProps {
  site: Site;
  scenario?: Scenario;
  onSelectSite?: (siteId: string) => void;
}

interface TerrainData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  gridSize: number;
  rawElev: number[];
  observerGrid: { x: number; y: number };
  spacingXM: number;
  spacingYM: number;
  widthKm: number;
  heightKm: number;
  minElevationM: number;
  maxElevationM: number;
  elevationSpanM: number;
}

const terrainCache = new Map<string, TerrainData>();

export const SiteTerrain3D: React.FC<SiteTerrain3DProps> = ({
  site,
  scenario,
  onSelectSite,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [terrainData, setTerrainData] = useState<TerrainData | null>(() => terrainCache.get(site.id) || null);
  const [loading, setLoading] = useState(!terrainCache.has(site.id));
  const [currentHour, setCurrentHour] = useState(12);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lightingMode, setLightingMode] = useState(true); // Global inspect fill (Lighting: ON in screenshot)
  const [useInterpolation, setUseInterpolation] = useState(true); // Raw DEM vs continuous
  const [wireframe, setWireframe] = useState(false);
  const [exaggeration, setExaggeration] = useState(1.0);
  const [surfaceMode, setSurfaceMode] = useState<'elevation' | 'slope'>('elevation');
  const [showInspector, setShowInspector] = useState(false);
  const [telemetry, setTelemetry] = useState<{
    sun: { alt: number; az: number };
    earth: { alt: number; az: number };
  } | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const arrowsGroupRef = useRef<THREE.Group | null>(null);

  // 1. Fetch High-Resolution LOLA 20 MPP Terrain Altimetry
  useEffect(() => {
    let alive = true;
    const cached = terrainCache.get(site.id);
    if (cached) {
      setTerrainData(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/science-terrain/${site.id}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: TerrainData) => {
        terrainCache.set(site.id, data);
        if (alive) {
          setTerrainData(data);
          setLoading(false);
        }
      })
      .catch(() => {
        // Fallback to procedural terrain if file missing
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [site.id]);

  // 2. Play / Pause Timeline Animation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentHour((prev) => (prev + 1) % 24);
    }, 700);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 3. Update Lighting Mode
  useEffect(() => {
    if (!ambientLightRef.current) return;
    if (lightingMode) {
      // Global inspect fill: illuminates deep craters and shadow areas in high clarity
      ambientLightRef.current.intensity = 0.35;
      ambientLightRef.current.color.setHex(0xffffff);
    } else {
      // Physical Solar Lighting: deep lunar shadows with subtle earthshine
      ambientLightRef.current.intensity = 0.08;
      ambientLightRef.current.color.setHex(0x283848);
    }
  }, [lightingMode]);

  // 4. Update Solar & Earth Ephemeris Positions & Azimuth Arrows
  const updateLightingAndArrows = useCallback(() => {
    try {
    const dateStr = scenario?.date || '2026-03-01';
    const hourStr = String(currentHour).padStart(2, '0');
    const time = new Date(`${dateStr}T${hourStr}:00:00Z`);

    const pos = computePositions(site.lat, site.lon, time);
    setTelemetry({ sun: pos.sun, earth: pos.earth });

    // Convert topocentric alt/az to Three.js coordinates
    // Three.js Ground Plane: X = East, -Z = North, Y = Up
    const sunAltRad = (pos.sun.alt * Math.PI) / 180;
    const sunAzRad = (pos.sun.az * Math.PI) / 180;
    const sunDist = 35;

    const sunX = Math.cos(sunAltRad) * Math.sin(sunAzRad) * sunDist;
    const sunY = Math.sin(sunAltRad) * sunDist;
    const sunZ = -Math.cos(sunAltRad) * Math.cos(sunAzRad) * sunDist;

    if (sunLightRef.current) {
      sunLightRef.current.position.set(sunX, sunY, sunZ);
      sunLightRef.current.target.position.set(0, 0, 0);
      sunLightRef.current.target.updateMatrixWorld();

      if (pos.sun.alt > 0) {
        sunLightRef.current.intensity = 3.2;
      } else {
        sunLightRef.current.intensity = 0.2;
      }
    }

    // Update Directional Vectors at Landing Site
    if (arrowsGroupRef.current) {
      arrowsGroupRef.current.clear();

      // Red Arrow: Solar Azimuth direction
      const sunDir = new THREE.Vector3(Math.sin(sunAzRad), 0.05, -Math.cos(sunAzRad)).normalize();
      const redArrow = new THREE.ArrowHelper(
        sunDir,
        new THREE.Vector3(0, 0.04, 0),
        2.2,
        0xef4444,
        0.45,
        0.22
      );
      arrowsGroupRef.current.add(redArrow);

      // Cyan Arrow: Earth Azimuth direction
      const earthAzRad = (pos.earth.az * Math.PI) / 180;
      const earthDir = new THREE.Vector3(Math.sin(earthAzRad), 0.05, -Math.cos(earthAzRad)).normalize();
      const cyanArrow = new THREE.ArrowHelper(
        earthDir,
        new THREE.Vector3(0, 0.04, 0),
        1.9,
        0x65d5d0,
        0.4,
        0.2
      );
      arrowsGroupRef.current.add(cyanArrow);
    }
    } catch (err) {
      console.warn('[SiteTerrain3D] ephemeris error:', err);
    }
  }, [site.lat, site.lon, scenario?.date, currentHour]);

  useEffect(() => {
    updateLightingAndArrows();
  }, [updateLightingAndArrows]);

  // 5. Initialize Three.js Viewport
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 540;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1218);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 7.5, 9.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.minDistance = 1.2;
    controls.maxDistance = 60;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, lightingMode ? 0.35 : 0.08);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // Camera Headlight for clear surface visibility
    const cameraLight = new THREE.DirectionalLight(0xffffff, 0.6);
    camera.add(cameraLight);
    scene.add(camera);

    // Directional Sunlight with Soft Shadows
    const sunLight = new THREE.DirectionalLight(0xfffaed, 3.2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -10;
    sunLight.shadow.camera.right = 10;
    sunLight.shadow.camera.top = 10;
    sunLight.shadow.camera.bottom = -10;
    sunLight.shadow.camera.updateProjectionMatrix();
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Group for Solar & Earth directional arrows
    const arrowsGroup = new THREE.Group();
    scene.add(arrowsGroup);
    arrowsGroupRef.current = arrowsGroup;

    // Subtle starfield
    const starGeo = new THREE.BufferGeometry();
    const starCount = 450;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 120;
      starPos[i + 1] = Math.random() * 60 + 2;
      starPos[i + 2] = (Math.random() - 0.5) * 120;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x88bbdd, size: 0.12, transparent: true, opacity: 0.6 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 6. Build 3D Terrain Mesh from Altimetry Data
  useEffect(() => {
    if (!sceneRef.current || !terrainData) return;
    const scene = sceneRef.current;

    if (terrainMeshRef.current) {
      scene.remove(terrainMeshRef.current);
      terrainMeshRef.current.geometry.dispose();
      (terrainMeshRef.current.material as THREE.Material).dispose();
    }

    const sourceSize = terrainData.gridSize || 128;
    const gridSize = sourceSize;
    const geometry = new THREE.PlaneGeometry(10, 10, gridSize - 1, gridSize - 1);
    geometry.rotateX(-Math.PI / 2); // Lay horizontal in XZ plane

    // Flip index winding so normals point UP (+Y) for south-polar coordinates
    const index = geometry.index;
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const tmp = index.getX(i);
        index.setX(i, index.getX(i + 1));
        index.setX(i + 1, tmp);
      }
    }

    const posAttr = geometry.attributes.position;
    const center = sampleTerrain(terrainData, 0, 0) ?? terrainData.minElevationM;
    const colors = new Float32Array(gridSize * gridSize * 3);

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const idx = y * gridSize + x;
        const gx = (x / (gridSize - 1)) * (sourceSize - 1);
        const gy = (y / (gridSize - 1)) * (sourceSize - 1);

        const z = useInterpolation
          ? (bilinearGrid(terrainData.rawElev, sourceSize, gx, gy) ?? terrainData.rawElev[y * sourceSize + x])
          : terrainData.rawElev[y * sourceSize + x];

        const enu = gridToENU(terrainData, gx, gy);
        const physical = (Number.isFinite(z) ? z : center) - center - (enu.east ** 2 + enu.north ** 2) / (2 * 1737400);

        // Position: X = East / 1000, Y = Elevation * exaggeration, Z = -North / 1000
        posAttr.setXYZ(
          idx,
          enu.east / 1000,
          (physical / 1000) * exaggeration,
          -enu.north / 1000
        );

        let t = Number.isFinite(z)
          ? (z - terrainData.minElevationM) / (terrainData.elevationSpanM || 1)
          : 0;

        // Slope mode heatmap
        if (surfaceMode === 'slope') {
          const a = bilinearGrid(terrainData.rawElev, sourceSize, Math.max(0, gx - 1), gy) ?? z;
          const b = bilinearGrid(terrainData.rawElev, sourceSize, Math.min(sourceSize - 1, gx + 1), gy) ?? z;
          const c = bilinearGrid(terrainData.rawElev, sourceSize, gx, Math.max(0, gy - 1)) ?? z;
          const d = bilinearGrid(terrainData.rawElev, sourceSize, gx, Math.min(sourceSize - 1, gy + 1)) ?? z;
          const dx = (b - a) / (2 * terrainData.spacingXM);
          const dy = (d - c) / (2 * terrainData.spacingYM);
          t = Math.min(1, (Math.atan(Math.hypot(dx, dy)) * 180) / Math.PI / 30);
        }

        // Lunar basalt regolith (#22303c) to bright anorthosite peak (#f0ebe1)
        const color = new THREE.Color().lerpColors(
          new THREE.Color(surfaceMode === 'slope' ? '#7fbdca' : '#22303c'),
          new THREE.Color(surfaceMode === 'slope' ? '#e39d75' : '#f0ebe1'),
          Math.max(0, Math.min(1, t))
        );
        colors.set([color.r, color.g, color.b], idx * 3);
      }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.04,
      wireframe,
      flatShading: !useInterpolation,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    terrainMeshRef.current = mesh;

    // Glowing target ring around center landing point
    const targetRing = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.26, 24),
      new THREE.MeshBasicMaterial({ color: 0xeac18b, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    targetRing.rotation.x = -Math.PI / 2;
    targetRing.position.set(0, 0.03, 0);
    mesh.add(targetRing);

    // Center pin
    const pinGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.45, 12);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.set(0, 0.22, 0);
    mesh.add(pin);

    updateLightingAndArrows();
  }, [terrainData, useInterpolation, exaggeration, wireframe, surfaceMode, updateLightingAndArrows]);

  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 7.5, 9.5);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const reliefVal = terrainData?.elevationSpanM != null
    ? terrainData.elevationSpanM.toFixed(1)
    : site.elevationReliefM.toFixed(1);
  const minVal = terrainData?.minElevationM != null
    ? terrainData.minElevationM.toFixed(1)
    : (-site.elevationReliefM * 0.8).toFixed(1);
  const maxVal = terrainData?.maxElevationM != null
    ? terrainData.maxElevationM.toFixed(1)
    : (site.elevationReliefM * 0.2).toFixed(1);
  const gridVal = terrainData?.widthKm != null
    ? `${terrainData.widthKm.toFixed(1)} × ${terrainData.heightKm.toFixed(1)} km`
    : '10.2 × 10.2 km';

  return (
    <div
      className="terrain-viewer"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 560,
        background: '#0c1218',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: 560 }} />

      {/* ────────────────────────────────────────────────────────── */}
      {/* TOP HEADER CONTROLS (EXACT LAYOUT FROM USER'S SCREENSHOT)   */}
      {/* ────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          right: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          zIndex: 25,
          pointerEvents: 'none',
        }}
      >
        {/* Left: Site Selector Dropdown & Coordinates */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' }}>
          <OptionWheel
            align="left"
            selectedId={site.id}
            onChange={(id) => onSelectSite?.(id)}
            options={sites.map((s) => ({ id: s.id, label: s.name }))}
          />
        </div>

        {/* Right: Lighting, Raw DEM, Settings, Grid icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
          {/* Lighting Mode toggle: golden background when ON */}
          <button
            onClick={() => setLightingMode((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: lightingMode ? '#eef0f5' : '#10161bf2',
              color: lightingMode ? '#07080d' : '#d6e4e4',
              border: lightingMode ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #283742',
              boxShadow: 'none',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            <Lightbulb size={14} />
            <span>Lighting: {lightingMode ? 'On' : 'Off'}</span>
          </button>

          {/* Raw DEM toggle */}
          <button
            onClick={() => setUseInterpolation((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: !useInterpolation ? '#223440' : '#10161bf2',
              border: '1px solid #283742',
              borderRadius: 8,
              color: !useInterpolation ? '#65d5d0' : '#d6e4e4',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            <RefreshCw size={13} />
            <span>Raw DEM</span>
          </button>

          {/* Settings inspector toggle */}
          <button
            onClick={() => setShowInspector((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: showInspector ? '#223440' : '#10161bf2',
              border: '1px solid #283742',
              borderRadius: 8,
              color: '#d6e4e4',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            <SlidersHorizontal size={14} />
            <span>Settings</span>
          </button>

          {/* Grid / wireframe toggle */}
          <button
            onClick={() => setWireframe((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              background: wireframe ? '#65d5d0' : '#10161bf2',
              color: wireframe ? '#071516' : '#d6e4e4',
              border: '1px solid #283742',
              borderRadius: 8,
              cursor: 'pointer',
            }}
            title="Toggle Wireframe Grid"
          >
            <Grid size={15} />
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* SETTINGS POPUP INSPECTOR                                  */}
      {/* ────────────────────────────────────────────────────────── */}
      {showInspector && (
        <div
          style={{
            position: 'absolute',
            top: 58,
            right: 14,
            width: 250,
            background: '#10171ff5',
            border: '1px solid #2a3a46',
            borderRadius: 10,
            padding: 16,
            zIndex: 30,
            boxShadow: '0 12px 30px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            fontSize: 11,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#f0ebe1', fontSize: 12 }}>Terrain Inspector</strong>
            <button
              onClick={() => setShowInspector(false)}
              style={{ background: 'transparent', border: 'none', color: '#82929a', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>

          <div>
            <label style={{ color: '#82929a', display: 'block', marginBottom: 4 }}>Surface Map</label>
            <select
              value={surfaceMode}
              onChange={(e) => setSurfaceMode(e.target.value as any)}
              style={{
                width: '100%',
                background: '#152028',
                border: '1px solid #2c3c47',
                borderRadius: 6,
                padding: '5px 8px',
                color: '#d6e4e4',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              <option value="elevation">Elevation Color Map</option>
              <option value="slope">Slope Angle Heatmap</option>
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#82929a', marginBottom: 4 }}>
              <span>Vertical Relief Exaggeration</span>
              <strong style={{ color: '#65d5d0' }}>{exaggeration.toFixed(1)}x</strong>
            </div>
            <WakeSlider
              value={exaggeration}
              min={1}
              max={4}
              step={0.5}
              onChange={setExaggeration}
              ariaLabel="Vertical Relief Exaggeration"
              bars={24}
              height={32}
              restHeight={7}
              gap={3}
              fillColor="#65d5d0"
              trackColor="rgba(214, 228, 228, 0.12)"
              crestColor="#f0a970"
            />
          </div>

          <button
            onClick={resetCamera}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px 10px',
              background: '#18252f',
              border: '1px solid #2a3a46',
              borderRadius: 6,
              color: '#d6e4e4',
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            <RotateCcw size={12} />
            <span>Reset Camera</span>
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* BOTTOM UNIFIED HUD DASHBOARD (FROM USER'S SCREENSHOT)       */}
      {/* ────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          left: 14,
          right: 14,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 18px',
          background: '#0c141ce8',
          border: '1px solid #23333e',
          borderRadius: 10,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          zIndex: 25,
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
        }}
      >
        {/* Left Stats: Relief, Min, Max, Grid */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ color: '#82929a', fontSize: 10, letterSpacing: '0.08em' }}>RELIEF:</span>
            <strong style={{ color: '#e0edeb', fontSize: 12 }}>{reliefVal} m</strong>
          </div>

          <span style={{ color: '#253540' }}>|</span>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, color: '#82929a' }}>
            <span>Min: <strong style={{ color: '#e0edeb' }}>{minVal}m</strong></span>
            <span>Max: <strong style={{ color: '#e0edeb' }}>{maxVal}m</strong></span>
          </div>

          <span style={{ color: '#253540' }}>|</span>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, color: '#82929a' }}>
            <span>Grid: <strong style={{ color: '#f0a970' }}>{gridVal}</strong></span>
          </div>
        </div>

        {/* Center: Play button + UTC time + Timeline Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 360, minWidth: 220 }}>
          <button
            onClick={() => setIsPlaying((p) => !p)}
            style={{
              padding: '4px 10px',
              borderRadius: 5,
              background: isPlaying ? '#f0a970' : '#142028',
              color: isPlaying ? '#120e07' : '#d6e4e4',
              border: '1px solid #2c3c47',
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {isPlaying ? <Pause size={10} /> : <Play size={10} />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <span style={{ color: '#d6e4e4', minWidth: 62, fontSize: 11 }}>
            {String(currentHour).padStart(2, '0')}:00 UTC
          </span>

          <WakeSlider
            value={currentHour}
            min={0}
            max={23}
            step={1}
            onChange={setCurrentHour}
            ariaLabel="Mission hour"
            bars={24}
            height={28}
            restHeight={6}
            gap={3}
            fillColor="#f0a970"
            trackColor="rgba(214, 228, 228, 0.12)"
            crestColor="#65d5d0"
          />
        </div>

        {/* Right: Sun and Earth Live Telemetry Elevation Readouts */}
        {telemetry && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: '#f0a970',
                fontSize: 12,
              }}
              title="Sun elevation above horizon"
            >
              <Sun size={14} />
              <span>{telemetry.sun.alt.toFixed(1)}°</span>
            </span>

            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: telemetry.earth.alt > 0 ? '#65d5d0' : '#f1857a',
                fontSize: 12,
              }}
              title="Earth elevation above horizon (Direct-to-Earth contact)"
            >
              <Radio size={14} />
              <span>{telemetry.earth.alt.toFixed(1)}°</span>
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(12, 18, 24, 0.75)',
            color: '#65d5d0',
            fontFamily: "'DM Mono', monospace",
            fontSize: 12,
            zIndex: 40,
          }}
        >
          Loading LOLA 20 MPP Altimetry Data...
        </div>
      )}
    </div>
  );
};

export default SiteTerrain3D;
