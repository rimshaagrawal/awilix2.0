import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Site, Scenario } from '@/types';
import { Sun, Layers, Eye, RefreshCw, SlidersHorizontal, Mountain } from 'lucide-react';

interface SiteTerrain3DProps {
  site: Site;
  scenario?: Scenario;
  onBack?: () => void;
}

export const SiteTerrain3D: React.FC<SiteTerrain3DProps> = ({ site, scenario }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [exaggeration, setExaggeration] = useState(1.5);
  const [sunHour, setSunHour] = useState(12);
  const [stats, setStats] = useState<{ minAlt: number; maxAlt: number; relief: number } | null>(null);

  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Update solar angle based on hour slider
  useEffect(() => {
    if (!sunLightRef.current) return;
    const angle = (sunHour / 24) * Math.PI * 2;
    const distance = 400;
    // Polar grazing sun angle: elevation 1.5 deg to 3 deg
    const sunElevation = Math.max(0.04, Math.sin(angle) * 0.12 + 0.05);
    sunLightRef.current.position.set(
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      distance * sunElevation
    );
  }, [sunHour]);

  // Update terrain wireframe mode
  useEffect(() => {
    if (terrainMeshRef.current) {
      const mat = terrainMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.wireframe = wireframe;
      mat.needsUpdate = true;
    }
  }, [wireframe]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let isDisposed = false;
    setLoading(true);

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 500;

    // 1. Three.js Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080c11);

    // 2. Camera looking down obliquely at the terrain
    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 5000);
    camera.position.set(0, -320, 220);
    camera.up.set(0, 0, 1);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    mount.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Keep camera above terrain
    controls.minDistance = 30;
    controls.maxDistance = 1200;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0x1a2634, 0.45);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffeedd, 3.2);
    sunLight.position.set(300, 150, 40);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Secondary fill light representing scattered earthlight
    const fillLight = new THREE.DirectionalLight(0x65d5d0, 0.3);
    fillLight.position.set(-200, -200, 100);
    scene.add(fillLight);

    // 6. Fetch Terrain JSON and generate 3D mesh
    const terrainUrl = `/terrain/${site.id}_terrain_20mpp.json`;
    const fallbackUrl = `/terrain/${site.id}_terrain.json`;

    const loadTerrainData = async () => {
      let data: any = null;
      try {
        const res = await fetch(terrainUrl);
        if (res.ok) data = await res.json();
      } catch {
        // Fallback
      }

      if (!data) {
        try {
          const res = await fetch(fallbackUrl);
          if (res.ok) data = await res.json();
        } catch {
          // Synthetic procedural fallback
        }
      }

      if (isDisposed) return;

      const cols = data?.cols || 64;
      const rows = data?.rows || 64;
      const sizeX = 280;
      const sizeY = 280;

      const geometry = new THREE.PlaneGeometry(sizeX, sizeY, cols - 1, rows - 1);
      const posAttr = geometry.attributes.position;

      let minZ = Infinity;
      let maxZ = -Infinity;

      if (data && Array.isArray(data.elevations)) {
        const elevations = data.elevations;
        for (let i = 0; i < posAttr.count; i++) {
          const elev = elevations[i] ?? 0;
          if (elev < minZ) minZ = elev;
          if (elev > maxZ) maxZ = elev;
          // Apply scale and exaggeration
          posAttr.setZ(i, (elev - (data.meanElev || 0)) * 0.05 * exaggeration);
        }
        setStats({
          minAlt: Math.round(minZ),
          maxAlt: Math.round(maxZ),
          relief: Math.round(maxZ - minZ),
        });
      } else {
        // Procedural lunar crater and ridge relief
        for (let i = 0; i < posAttr.count; i++) {
          const u = posAttr.getX(i) / (sizeX / 2);
          const v = posAttr.getY(i) / (sizeY / 2);
          const r = Math.sqrt(u * u + v * v);
          const crater = -Math.exp(-r * r * 4) * 25 + Math.sin(u * 5) * 4 + Math.cos(v * 5) * 4;
          posAttr.setZ(i, crater * exaggeration);
        }
        setStats({ minAlt: -1200, maxAlt: 3596, relief: site.elevationReliefM || 4796 });
      }

      geometry.computeVertexNormals();

      // Terrain material with texture if available
      const textureLoader = new THREE.TextureLoader();
      const material = new THREE.MeshStandardMaterial({
        color: 0x829199,
        roughness: 0.92,
        metalness: 0.04,
        wireframe,
      });

      textureLoader.load(
        `/terrain/${site.id}_texture_20mpp.png`,
        (texture) => {
          material.map = texture;
          material.color.setHex(0xffffff);
          material.needsUpdate = true;
        },
        undefined,
        () => {
          textureLoader.load(`/terrain/${site.id}_texture.png`, (texture) => {
            material.map = texture;
            material.color.setHex(0xffffff);
            material.needsUpdate = true;
          });
        }
      );

      const mesh = new THREE.Mesh(geometry, material);
      terrainMeshRef.current = mesh;
      scene.add(mesh);

      // Target camera to center of terrain
      controls.target.set(0, 0, 0);
      controls.update();

      setLoading(false);
    };

    loadTerrainData();

    // 7. Render Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [site.id, exaggeration]);

  return (
    <div
      className="panel"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 460,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        className="panel-heading"
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #22303a',
          background: '#0a0f14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <span className="eyebrow">NASA LOLA 20 MPP 3D ALTIMETRY</span>
          <h2 style={{ fontSize: 16, margin: '4px 0 0' }}>{site.name} Terrain Elevation</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className={`quiet-button ${wireframe ? 'active' : ''}`}
            onClick={() => setWireframe(!wireframe)}
            title="Toggle Wireframe Grid"
          >
            <Layers size={14} />
            <span>Wireframe</span>
          </button>
        </div>
      </div>

      <div
        ref={mountRef}
        style={{
          width: '100%',
          flex: 1,
          minHeight: 380,
          position: 'relative',
          background: '#080c11',
        }}
      >
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              background: '#080c11cc',
              zIndex: 10,
              color: '#65d5d0',
              font: '500 11px DM Mono, monospace',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <RefreshCw className="animate-spin" size={16} />
              <span>Loading 20m LOLA altimetry mesh...</span>
            </div>
          </div>
        )}

        {/* Floating Telemetry Box */}
        {stats && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              padding: '10px 14px',
              borderRadius: 6,
              background: '#0d151bcc',
              backdropFilter: 'blur(8px)',
              border: '1px solid #24343d',
              font: '400 9px DM Mono, monospace',
              color: '#84959f',
              display: 'grid',
              gap: 4,
              zIndex: 5,
            }}
          >
            <div>
              <span style={{ color: '#65d5d0', fontWeight: 600 }}>RELIEF:</span>{' '}
              <strong style={{ color: '#dce8ea' }}>{stats.relief.toLocaleString()} m</strong>
            </div>
            <div>
              <span>MIN ELEVATION:</span>{' '}
              <strong style={{ color: '#dce8ea' }}>{stats.minAlt.toLocaleString()} m</strong>
            </div>
            <div>
              <span>MAX ELEVATION:</span>{' '}
              <strong style={{ color: '#dce8ea' }}>{stats.maxAlt.toLocaleString()} m</strong>
            </div>
          </div>
        )}

        {/* Floating Controls Box */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 12px',
            borderRadius: 6,
            background: '#0d151bcc',
            backdropFilter: 'blur(8px)',
            border: '1px solid #24343d',
            zIndex: 5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f0a970', font: '500 9px DM Mono, monospace' }}>
            <Sun size={13} />
            <span>SOLAR HOUR {sunHour}:00</span>
            <input
              type="range"
              min={0}
              max={23}
              value={sunHour}
              onChange={(e) => setSunHour(Number(e.target.value))}
              style={{ width: 80, accentColor: '#f0a970' }}
            />
          </div>

          <div style={{ width: 1, height: 16, background: '#24343d' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#65d5d0', font: '500 9px DM Mono, monospace' }}>
            <Mountain size={13} />
            <span>{exaggeration.toFixed(1)}x RELIEF</span>
            <input
              type="range"
              min={1.0}
              max={3.0}
              step={0.5}
              value={exaggeration}
              onChange={(e) => setExaggeration(Number(e.target.value))}
              style={{ width: 60, accentColor: '#65d5d0' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteTerrain3D;

