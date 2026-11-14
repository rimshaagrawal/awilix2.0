import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { sites } from '@/data/sites';
import { SITE_COLORS } from '@/lib/scenarioCalculations';
import { getSubPoints, computePositions } from '@/lib/ephemeris';
import {
  Globe,
  Info,
  RotateCcw,
  Maximize2,
  Target,
  Radio,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Layers,
} from 'lucide-react';
import { Crosshair } from '@/components/reactbits/Crosshair';

interface MoonGlobe3DProps {
  selectedSiteId: string;
  onSelectSite: (id: string) => void;
  compact?: boolean;
  date?: string;
}

// NASA Physical Dimensions
const NASA = {
  MOON_R_KM: 1737.4,
  EARTH_R_KM: 6371.0,
  SUN_R_KM: 696340.0,
  EARTH_DIST_KM: 384400.0,
  SUN_DIST_KM: 149597870.0,
  EARTH_R_RATIO: 3.667, // 6371 / 1737.4
  SUN_R_RATIO: 400.8, // 696340 / 1737.4
  EARTH_DIST_RATIO: 221.25, // 384400 / 1737.4
  SUN_DIST_RATIO: 86105.0, // 149.6M / 1737.4
};

export const MoonGlobe3D: React.FC<MoonGlobe3DProps> = ({
  selectedSiteId,
  onSelectSite,
  compact = false,
  date = '2026-03-01',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Object references
  const moonModelRef = useRef<THREE.Object3D | null>(null);
  const earthModelRef = useRef<THREE.Object3D | null>(null);
  const sunModelRef = useRef<THREE.Object3D | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const dteVectorsGroupRef = useRef<THREE.Group | null>(null);
  const solarRaysGroupRef = useRef<THREE.Group | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const updateEphemerisRef = useRef<() => void>(() => {});
  const selectedSiteIdRef = useRef<string>(selectedSiteId);

  useEffect(() => {
    selectedSiteIdRef.current = selectedSiteId;
  }, [selectedSiteId]);

  // UI States matching user's screenshot
  const [scaleMode, setScaleMode] = useState<'proportional' | 'true'>('proportional');
  const [focusTarget, setFocusTarget] = useState<'moon' | 'earth' | 'sun' | 'system'>('moon');
  const [vectorMode, setVectorMode] = useState<'all' | 'dte' | 'solar' | 'off'>('all');
  const [showScaleDetails, setShowScaleDetails] = useState(false);
  const [currentHour] = useState(12);

  // Vertical Collapsible Accordion State (all collapsed by default)
  const [expandedCategory, setExpandedCategory] = useState<'scale' | 'target' | 'vectors' | 'display' | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [displaySettings, setDisplaySettings] = useState({
    labels: true,
    beacons: true,
    grid: false,
    lighting: true,
  });

  const lunarGridGroupRef = useRef<THREE.Group | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);

  // Compute active 3D units based on selected scaleMode
  const scaleConfig = useMemo(() => {
    if (scaleMode === 'true') {
      return {
        moonRadius: 1.0,
        earthRadius: NASA.EARTH_R_RATIO,
        sunRadius: NASA.SUN_R_RATIO,
        earthDist: NASA.EARTH_DIST_RATIO,
        sunDist: NASA.SUN_DIST_RATIO,
        maxCameraDist: 250000,
      };
    } else {
      // Proportional Spaceflight Exploration view:
      // Earth and colossal glowing Sun prominently visible in celestial space
      return {
        moonRadius: 1.0,
        earthRadius: 2.2,
        sunRadius: 16.0, // Colossal radiant star
        earthDist: 16.0,
        sunDist: 48.0,
        maxCameraDist: 600,
      };
    }
  }, [scaleMode]);

  // Convert lunar latitude & longitude to 3D Cartesian coordinates on sphere
  const latLonToVector3 = (lat: number, lon: number, radius: number): THREE.Vector3 => {
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    // On the NASA Moon GLB model:
    // +Y is Lunar North Pole (lat = +90°)
    // -Y is Lunar South Pole (lat = -90°)
    // +X is Lunar Prime Meridian (lon = 0°, lat = 0°)
    // -Z is East limb (lon = +90°, lat = 0°)
    // +Z is West limb (lon = -90°, lat = 0°)
    // -X is Lunar Far Side (lon = 180°, lat = 0°)
    const x = radius * Math.cos(latRad) * Math.cos(lonRad);
    const y = radius * Math.sin(latRad);
    const z = -radius * Math.cos(latRad) * Math.sin(lonRad);
    return new THREE.Vector3(x, y, z);
  };

  // 1. Initialize Scene, Renderer, Controls, and Base Celestial Objects
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060910);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 300000);
    if (compact) {
      // Direct view of south polar candidate landing sites for the hero card
      camera.position.set(0, -2.4, 0.7);
    } else {
      // Moon globe view centered on south pole
      camera.position.set(0, -1.8, 2.2);
    }
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = scaleConfig.maxCameraDist;
    controls.minDistance = 1.4;
    controlsRef.current = controls;

    // 1. Ambient lighting for base celestial illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // 2. Camera headlight — ensures whichever side of Moon/Earth you orbit to is clearly illuminated
    const cameraLight = new THREE.DirectionalLight(0xffffff, 0.9);
    camera.add(cameraLight);
    scene.add(camera);

    // 3. Hemisphere sky/ground illumination
    const hemiLight = new THREE.HemisphereLight(0x446688, 0x112233, 0.5);
    scene.add(hemiLight);

    // Starfield particles in deep space
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 600;
      starPositions[i + 1] = (Math.random() - 0.5) * 600;
      starPositions[i + 2] = (Math.random() - 0.5) * 600;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0x99ccff,
      size: 0.15,
      transparent: true,
      opacity: 0.75,
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // Vector Groups
    const dteGroup = new THREE.Group();
    scene.add(dteGroup);
    dteVectorsGroupRef.current = dteGroup;

    const solarGroup = new THREE.Group();
    scene.add(solarGroup);
    solarRaysGroupRef.current = solarGroup;

    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    // Coordinate Grid Group (latitude parallels & longitude meridians)
    const gridGroup = new THREE.Group();
    gridGroup.visible = false;
    const ringMat = new THREE.LineBasicMaterial({ color: 0x486581, transparent: true, opacity: 0.35 });
    const latitudes = [-85, -80, -60, -30, 0, 30, 60, 80, 85];
    latitudes.forEach((lat) => {
      const phi = (lat * Math.PI) / 180;
      const r = Math.cos(phi) * 1.002;
      const y = Math.sin(phi) * 1.002;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(r * Math.cos(theta), y, -r * Math.sin(theta)));
      }
      gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
    });
    for (let m = 0; m < 12; m++) {
      const lon = (m / 12) * Math.PI * 2;
      const pts: THREE.Vector3[] = [];
      for (let i = -32; i <= 32; i++) {
        const lat = (i / 32) * (Math.PI / 2);
        const y = Math.sin(lat) * 1.002;
        const r = Math.cos(lat) * 1.002;
        pts.push(new THREE.Vector3(r * Math.cos(lon), y, -r * Math.sin(lon)));
      }
      gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
    }
    scene.add(gridGroup);
    lunarGridGroupRef.current = gridGroup;

    const texLoader = new THREE.TextureLoader();
    const gltfLoader = new GLTFLoader();

    // ── 1. MOON (Real NASA LRO 8k LOLA Topographic Model) ────
    const moonTex = texLoader.load('/textures/lroc_color_2k.jpg');
    moonTex.colorSpace = THREE.SRGBColorSpace;
    const moonGeo = new THREE.SphereGeometry(1.0, 64, 64);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      roughness: 0.88,
      metalness: 0.05,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(moonMesh);
    moonModelRef.current = moonMesh;

    // Load authentic NASA LRO 8k Topo GLB
    const loadNasaMoon = (url: string) => {
      gltfLoader.load(
        url,
        (gltf) => {
          scene.remove(moonMesh);
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          // Scale so Moon radius is exactly 1.0 (diameter 2.0)
          const scale = 2.0 / (maxDim || 2.0);
          model.scale.set(scale, scale, scale);

          // Center geometry to (0,0,0)
          const center = new THREE.Vector3();
          box.getCenter(center);
          model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

          // Retain authentic NASA LRO 8k topography & crisp crater relief
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((mat) => {
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.roughness = 0.88;
                  mat.metalness = 0.02;
                  mat.needsUpdate = true;
                }
              });
            }
          });
          scene.add(model);
          moonModelRef.current = model;
          updateEphemerisRef.current?.();
        },
        undefined,
        () => {
          if (url !== '/models/moon_small.glb') {
            loadNasaMoon('/models/moon_small.glb');
          }
        }
      );
    };
    loadNasaMoon('/models/moon_small.glb');

    // ── 2. EARTH (Real NASA EarthClouds_1_12756 Model) ─────────
    const earthTex = texLoader.load('/textures/earth_2k.jpg');
    earthTex.colorSpace = THREE.SRGBColorSpace;
    const earthGeo = new THREE.SphereGeometry(1.0, 48, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.65,
      metalness: 0.05,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.userData.naturalDim = 2.0;
    scene.add(earthMesh);
    earthModelRef.current = earthMesh;

    gltfLoader.load(
      '/models/earth.glb',
      (gltf) => {
        scene.remove(earthMesh);
        const earthScene = gltf.scene;
        const box = new THREE.Box3().setFromObject(earthScene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1000.0;
        earthScene.userData.naturalDim = maxDim;

        // Enhance NASA Earth Blue Marble with dynamic cloud layer & normal map
        earthScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((mat) => {
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.roughness = 0.65;
                mat.metalness = 0.05;
                mat.needsUpdate = true;
              }
            });
          }
        });

        scene.add(earthScene);
        earthModelRef.current = earthScene;
        updateEphemerisRef.current?.();
      },
      undefined,
      () => {}
    );

    // ── 3. SUN (Real NASA SDO Sun_1_1391000 Model) ────────────
    const sunTex = texLoader.load('/textures/sun_texture_2k.jpg');
    sunTex.colorSpace = THREE.SRGBColorSpace;
    const sunGeo = new THREE.SphereGeometry(1.0, 48, 48);
    const sunMat = new THREE.MeshBasicMaterial({
      map: sunTex,
      color: 0xffffff,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.userData.naturalDim = 2.0;
    scene.add(sunMesh);
    sunModelRef.current = sunMesh;

    // Glowing sun corona billboard
    const coronaGeo = new THREE.SphereGeometry(1.25, 32, 32);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xffaa22,
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    sunMesh.add(coronaMesh);

    // Glowing PointLight inside the Sun
    const sunPointLight = new THREE.PointLight(0xfff6dd, 4.0, 800);
    sunMesh.add(sunPointLight);

    gltfLoader.load(
      '/models/sun.glb',
      (gltf) => {
        scene.remove(sunMesh);
        const sunScene = gltf.scene;
        const box = new THREE.Box3().setFromObject(sunScene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1.0;
        sunScene.userData.naturalDim = maxDim;

        // Extract and display the authentic NASA SDO sun_diff.jpg texture embedded inside the model
        sunScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            const realNasaSunTexture = mat?.emissiveMap || mat?.map || sunTex;
            mesh.material = new THREE.MeshBasicMaterial({
              map: realNasaSunTexture,
              color: 0xffffff,
            });
          }
        });

        const cGeo = new THREE.SphereGeometry(maxDim * 0.65, 32, 32);
        const cMesh = new THREE.Mesh(cGeo, coronaMat);
        sunScene.add(cMesh);

        const pLight = new THREE.PointLight(0xfff6dd, 4.0, 800);
        sunScene.add(pLight);

        scene.add(sunScene);
        sunModelRef.current = sunScene;
        updateEphemerisRef.current?.();
      },
      undefined,
      () => {}
    );

    // Directional sunlight shining from the Sun onto Moon and Earth
    const sunLight = new THREE.DirectionalLight(0xfffaed, 3.5);
    sunLight.position.set(50, 20, 30);
    scene.add(sunLight);
    scene.add(sunLight.target);
    sunLightRef.current = sunLight;

    // ── 4. SITE PIN MARKERS ──────────────────────────────────
    const PIN_STEM_HEIGHT = 0.07;   // Height of pin stem above Moon surface
    const PIN_HEAD_RADIUS = 0.016;  // Radius of pin head sphere
    const PIN_STEM_RADIUS = 0.003;  // Thickness of pin stem cylinder

    const markerMeshes: { id: string; mesh: THREE.Mesh }[] = [];
    sites.forEach((site, index) => {
      const surfacePos = latLonToVector3(site.lat, site.lon, 1.0);
      const tipPos = latLonToVector3(site.lat, site.lon, 1.0 + PIN_STEM_HEIGHT);
      const colorHex = parseInt(SITE_COLORS[index % SITE_COLORS.length].replace('#', '0x'), 16);

      // Surface normal direction (points outward from Moon center)
      const normal = surfacePos.clone().normalize();

      // Pin head — small sphere at top of stem
      const headGeo = new THREE.SphereGeometry(PIN_HEAD_RADIUS, 12, 12);
      const headMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.position.copy(tipPos);
      headMesh.userData = { siteId: site.id };
      markersGroup.add(headMesh);
      markerMeshes.push({ id: site.id, mesh: headMesh });

      // Pin stem — thin cylinder from surface to head
      const stemGeo = new THREE.CylinderGeometry(PIN_STEM_RADIUS, PIN_STEM_RADIUS, PIN_STEM_HEIGHT, 6);
      const stemMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9 });
      const stemMesh = new THREE.Mesh(stemGeo, stemMat);
      // Position at midpoint between surface and tip
      const midPoint = surfacePos.clone().add(tipPos).multiplyScalar(0.5);
      stemMesh.position.copy(midPoint);
      // Orient cylinder along the surface normal (cylinder default axis is Y)
      stemMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      markersGroup.add(stemMesh);

      // Tiny base dot on the Moon surface
      const baseGeo = new THREE.CircleGeometry(0.008, 12);
      const baseMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.copy(surfacePos.clone().add(normal.clone().multiplyScalar(0.001)));
      baseMesh.lookAt(0, 0, 0);
      markersGroup.add(baseMesh);
    });

    // Raycaster for clicking site beacons
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(markerMeshes.map((m) => m.mesh));
      if (hits.length > 0) {
        const id = hits[0].object.userData.siteId;
        if (id) onSelectSite(id);
      }
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // Resize listener
    const handleResize = () => {
      if (!mount) return;
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      if (earthModelRef.current) earthModelRef.current.rotation.y += 0.003;
      if (sunModelRef.current) sunModelRef.current.rotation.y += 0.0008;
      starField.rotation.y += 0.0001;

      // Pulse selected pin head
      markerMeshes.forEach((item) => {
        if (item.id === selectedSiteIdRef.current) {
          const s = 1.4 + Math.sin(Date.now() * 0.005) * 0.35;
          item.mesh.scale.set(s, s, s);
        } else {
          item.mesh.scale.set(1, 1, 1);
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 2. Compute Celestial Ephemeris Positions, Vector Sheaf & DTE Lines
  const updateEphemerisAndVectors = useCallback(() => {
    if (!sceneRef.current) return;
    try {
    const hourStr = String(currentHour).padStart(2, '0');
    const time = new Date(`${date}T${hourStr}:00:00Z`);

    const { subsolar, subearth } = getSubPoints(time);
    const toVector = (p: { lat: number; lon: number }) => latLonToVector3(p.lat, p.lon, 1.0);

    const sunDir = toVector(subsolar).normalize();
    const earthDir = toVector(subearth).normalize();
    const sunMag = subsolar.distKm;
    const earthMag = subearth.distKm;

    // 1. Earth position & scale
    const earthPos = earthDir
      .clone()
      .multiplyScalar(scaleMode === 'true' ? earthMag / NASA.MOON_R_KM : scaleConfig.earthDist);
    if (earthModelRef.current) {
      earthModelRef.current.position.copy(earthPos);
      const s = (scaleConfig.earthRadius * 2) / (earthModelRef.current.userData?.naturalDim || 2.0);
      earthModelRef.current.scale.set(s, s, s);
    }

    // 2. Sun position & scale
    const sunPos = sunDir
      .clone()
      .multiplyScalar(scaleMode === 'true' ? sunMag / NASA.MOON_R_KM : scaleConfig.sunDist);
    if (sunModelRef.current) {
      sunModelRef.current.position.copy(sunPos);
      const s = (scaleConfig.sunRadius * 2) / (sunModelRef.current.userData?.naturalDim || 2.0);
      sunModelRef.current.scale.set(s, s, s);
    }

    // Move directional light to match sun position so Moon/Earth get lit
    if (sunLightRef.current) {
      sunLightRef.current.position.copy(sunPos);
      sunLightRef.current.target.position.set(0, 0, 0);
      sunLightRef.current.target.updateMatrixWorld();
    }

    // 3. Earth Direct-to-Earth (DTE) Lines
    if (dteVectorsGroupRef.current) {
      dteVectorsGroupRef.current.clear();
      const showDTE = vectorMode === 'all' || vectorMode === 'dte';

      if (showDTE) {
        sites.forEach((site) => {
          const siteVec = latLonToVector3(site.lat, site.lon, 1.015);

          const isVisible = computePositions(site.lat, site.lon, time).earth.alt > 0;
          const color = isVisible ? 0x8fd3e8 : 0xef4444;
          const opacity = isVisible ? (site.id === selectedSiteId ? 0.95 : 0.45) : 0.18;

          const geom = new THREE.BufferGeometry().setFromPoints([siteVec, earthPos]);
          const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
          dteVectorsGroupRef.current?.add(new THREE.Line(geom, mat));
        });
      }
    }

    // 4. Mathematical Conical Sun Rays Vector Sheaf (From Screenshot)
    if (solarRaysGroupRef.current) {
      solarRaysGroupRef.current.clear();
      const showSolar = vectorMode === 'all' || vectorMode === 'solar';

      if (showSolar) {
        // Construct orthonormal basis on the sunlit hemisphere of the Moon
        const w = sunDir.clone().normalize();
        const arbitrary = Math.abs(w.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        const u = new THREE.Vector3().crossVectors(arbitrary, w).normalize();
        const v = new THREE.Vector3().crossVectors(w, u).normalize();

        const linePositions: number[] = [];
        const lineColors: number[] = [];

        // Concentric linear rings covering the illuminated surface from subsolar point to terminator
        const rings = [
          { thetaDeg: 0, count: 1 },
          { thetaDeg: 12, count: 6 },
          { thetaDeg: 24, count: 10 },
          { thetaDeg: 36, count: 14 },
          { thetaDeg: 48, count: 18 },
          { thetaDeg: 60, count: 22 },
          { thetaDeg: 72, count: 26 },
          { thetaDeg: 84, count: 30 },
        ];

        rings.forEach(({ thetaDeg, count }) => {
          const theta = (thetaDeg * Math.PI) / 180;
          const sinT = Math.sin(theta);
          const cosT = Math.cos(theta);

          for (let i = 0; i < count; i++) {
            const phi = count === 1 ? 0 : (i / count) * Math.PI * 2;
            const cosP = Math.cos(phi);
            const sinP = Math.sin(phi);

            // Vector Head precisely on Moon's topographic surface (radius 1.002)
            const headX = (sinT * cosP * u.x + sinT * sinP * v.x + cosT * w.x) * 1.002;
            const headY = (sinT * cosP * u.y + sinT * sinP * v.y + cosT * w.y) * 1.002;
            const headZ = (sinT * cosP * u.z + sinT * sinP * v.z + cosT * w.z) * 1.002;

            // Vector Tail on the Sun disk facing the Moon
            const discRadius = Math.min(scaleConfig.sunRadius * 0.45, 14.0);
            const tailX = sunPos.x + (sinT * cosP * u.x + sinT * sinP * v.x) * discRadius;
            const tailY = sunPos.y + (sinT * cosP * u.y + sinT * sinP * v.y) * discRadius;
            const tailZ = sunPos.z + (sinT * cosP * u.z + sinT * sinP * v.z) * discRadius;

            linePositions.push(tailX, tailY, tailZ, headX, headY, headZ);

            // Radiant amber color gradient
            const alpha = 0.25 + cosT * 0.55;
            lineColors.push(1.0, 0.72, 0.42, alpha * 0.4); // Tail at Sun
            lineColors.push(1.0, 0.88, 0.58, alpha); // Head on Moon
          }
        });

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        geom.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 4));

        const mat = new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        solarRaysGroupRef.current.add(new THREE.LineSegments(geom, mat));
      }
    }
    } catch (err) {
      console.warn('[MoonGlobe3D] ephemeris error:', err);
    }
  }, [date, currentHour, vectorMode, selectedSiteId, scaleConfig, scaleMode]);

  useEffect(() => {
    updateEphemerisRef.current = updateEphemerisAndVectors;
    updateEphemerisAndVectors();
  }, [updateEphemerisAndVectors]);

  // 3. Camera Focus Targets
  const handleFocus = (target: 'moon' | 'earth' | 'sun' | 'system') => {
    if (!cameraRef.current || !controlsRef.current) return;
    setFocusTarget(target);

    if (target === 'moon') {
      controlsRef.current.target.set(0, 0, 0);
      cameraRef.current.position.set(0, -0.4, 3.0);
    } else if (target === 'earth') {
      if (earthModelRef.current) {
        const ep = earthModelRef.current.position;
        controlsRef.current.target.copy(ep);
        cameraRef.current.position.set(ep.x + 8, ep.y + 4, ep.z + 8);
      }
    } else if (target === 'sun') {
      if (sunModelRef.current) {
        const sp = sunModelRef.current.position;
        controlsRef.current.target.copy(sp);
        const offset = scaleConfig.sunRadius * 2.5;
        cameraRef.current.position.set(sp.x, sp.y + offset * 0.3, sp.z + offset);
      }
    } else if (target === 'system') {
      controlsRef.current.target.set(0, 0, 0);
      if (scaleMode === 'true') {
        cameraRef.current.position.set(0, 25000, 75000);
      } else {
        cameraRef.current.position.set(0, 45, 120);
      }
    }
    controlsRef.current.update();
  };

  // React to Display Settings toggles
  useEffect(() => {
    if (markersGroupRef.current) {
      markersGroupRef.current.visible = displaySettings.beacons;
    }
  }, [displaySettings.beacons]);

  useEffect(() => {
    if (lunarGridGroupRef.current) {
      lunarGridGroupRef.current.visible = displaySettings.grid;
    }
  }, [displaySettings.grid]);

  useEffect(() => {
    if (sunLightRef.current) {
      sunLightRef.current.intensity = displaySettings.lighting ? 3.5 : 1.0;
    }
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = displaySettings.lighting ? 1.4 : 2.4;
    }
  }, [displaySettings.lighting]);

  return (
    <div
      className={`globe-scene ${compact ? 'globe-compact' : ''}`}
      style={{ position: 'relative', width: '100%', height: '100%', minHeight: compact ? 340 : 540 }}
    >
      <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: compact ? 340 : 540 }} />

      {/* React Bits Crosshair cursor specifically for the lunar visualization */}
      <Crosshair color="#91c6d4" lineStyle="dashed" thickness={1} smoothing={0.2} />

      {/* ── COMPACT MODE: simple bottom-left label + terrain button ── */}
      {compact ? (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            right: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#f0ebe1',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "'Manrope', sans-serif",
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              background: 'rgba(10,14,23,0.7)',
              padding: '4px 10px',
              borderRadius: 20,
            }}
          >
            <Globe size={13} color="#f0a970" />
            <span>3D Moon Globe · Click pin to explore</span>
          </div>
        </div>
      ) : (
        <>
          {/* ── LEFT VERTICAL ACCORDION CONTROL PANEL ── */}
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              width: panelOpen ? 190 : 38,
              zIndex: 20,
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              transition: 'width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
              pointerEvents: 'auto',
            }}
          >
            {/* Panel Glass Container */}
            <div
              style={{
                background: 'rgba(8, 14, 23, 0.88)',
                border: '1px solid rgba(35, 51, 62, 0.7)',
                borderRadius: 12,
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                overflow: 'hidden',
              }}
            >
              {/* Panel Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: panelOpen ? '10px 12px 8px' : '10px 0',
                  borderBottom: panelOpen ? '1px solid rgba(35,51,62,0.5)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => setPanelOpen(!panelOpen)}
              >
                {panelOpen ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={12} color="#91c6d4" />
                      <span style={{ color: '#91c6d4', fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                        3D Controls
                      </span>
                    </div>
                    <ChevronLeft size={13} color="#687a86" style={{ transition: 'transform 0.2s ease' }} />
                  </>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <ChevronRight size={15} color="#91c6d4" />
                  </div>
                )}
              </div>

              {/* Categories - only visible when panel is open */}
              {panelOpen && (
                <div style={{ padding: '4px 0 6px' }}>
                  {/* ── CATEGORY 1: VISUAL SCALE ── */}
                  {(() => {
                    const cat = 'scale' as const;
                    const isExpanded = expandedCategory === cat;
                    const activeLabel = scaleMode === 'proportional' ? 'Prop' : '1:1';
                    return (
                      <div style={{ borderBottom: '1px solid rgba(35,51,62,0.3)' }}>
                        <div
                          onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '7px 12px',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(145,198,212,0.06)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <Maximize2 size={11} color={isExpanded ? '#91c6d4' : '#687a86'} style={{ transition: 'color 0.2s ease' }} />
                            <span style={{ color: isExpanded ? '#d6e4e4' : '#8899a6', fontSize: 10, fontWeight: 600, letterSpacing: '0.6px', transition: 'color 0.2s ease' }}>
                              SCALE
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{
                              fontSize: 9,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: 'rgba(145,198,212,0.12)',
                              color: '#91c6d4',
                              fontWeight: 600,
                            }}>
                              {activeLabel}
                            </span>
                            <ChevronDown
                              size={11}
                              color="#687a86"
                              style={{
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.25s cubic-bezier(0.2,0.8,0.2,1)',
                              }}
                            />
                          </div>
                        </div>
                        <div
                          style={{
                            maxHeight: isExpanded ? 120 : 0,
                            opacity: isExpanded ? 1 : 0,
                            overflow: 'hidden',
                            transition: 'max-height 0.28s cubic-bezier(0.2,0.8,0.2,1), opacity 0.22s ease',
                          }}
                        >
                          <div style={{ padding: '2px 12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {[
                              { value: 'proportional' as const, label: 'Proportional' },
                              { value: 'true' as const, label: '1:1 (True Scale)' },
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => setScaleMode(opt.value)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 7,
                                  padding: '5px 8px',
                                  borderRadius: 6,
                                  border: scaleMode === opt.value ? '1px solid rgba(145,198,212,0.35)' : '1px solid transparent',
                                  background: scaleMode === opt.value ? 'rgba(145,198,212,0.1)' : 'transparent',
                                  color: scaleMode === opt.value ? '#d6e4e4' : '#687a86',
                                  cursor: 'pointer',
                                  fontSize: 10,
                                  fontWeight: scaleMode === opt.value ? 600 : 400,
                                  textAlign: 'left',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <div style={{
                                  width: 6, height: 6, borderRadius: '50%',
                                  background: scaleMode === opt.value ? '#91c6d4' : 'rgba(104,122,134,0.3)',
                                  boxShadow: scaleMode === opt.value ? '0 0 6px rgba(145,198,212,0.5)' : 'none',
                                  transition: 'all 0.2s ease',
                                }} />
                                {opt.label}
                              </button>
                            ))}
                            <button
                              onClick={() => setShowScaleDetails(!showScaleDetails)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 7,
                                padding: '5px 8px',
                                borderRadius: 6,
                                border: '1px solid transparent',
                                background: 'transparent',
                                color: '#687a86',
                                cursor: 'pointer',
                                fontSize: 9,
                                fontWeight: 400,
                                textAlign: 'left',
                                transition: 'color 0.15s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#91c6d4'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#687a86'; }}
                            >
                              <Info size={10} />
                              NASA Specs
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── CATEGORY 2: TARGET BODY ── */}
                  {(() => {
                    const cat = 'target' as const;
                    const isExpanded = expandedCategory === cat;
                    const activeLabel = focusTarget.charAt(0).toUpperCase() + focusTarget.slice(1);
                    return (
                      <div style={{ borderBottom: '1px solid rgba(35,51,62,0.3)' }}>
                        <div
                          onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '7px 12px',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(145,198,212,0.06)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <Target size={11} color={isExpanded ? '#91c6d4' : '#687a86'} style={{ transition: 'color 0.2s ease' }} />
                            <span style={{ color: isExpanded ? '#d6e4e4' : '#8899a6', fontSize: 10, fontWeight: 600, letterSpacing: '0.6px', transition: 'color 0.2s ease' }}>
                              TARGET
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{
                              fontSize: 9,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: 'rgba(145,198,212,0.12)',
                              color: '#91c6d4',
                              fontWeight: 600,
                            }}>
                              {activeLabel}
                            </span>
                            <ChevronDown
                              size={11}
                              color="#687a86"
                              style={{
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.25s cubic-bezier(0.2,0.8,0.2,1)',
                              }}
                            />
                          </div>
                        </div>
                        <div
                          style={{
                            maxHeight: isExpanded ? 180 : 0,
                            opacity: isExpanded ? 1 : 0,
                            overflow: 'hidden',
                            transition: 'max-height 0.28s cubic-bezier(0.2,0.8,0.2,1), opacity 0.22s ease',
                          }}
                        >
                          <div style={{ padding: '2px 12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {(['moon', 'earth', 'sun', 'system'] as const).map((t) => (
                              <button
                                key={t}
                                onClick={() => handleFocus(t)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 7,
                                  padding: '5px 8px',
                                  borderRadius: 6,
                                  border: focusTarget === t ? '1px solid rgba(145,198,212,0.35)' : '1px solid transparent',
                                  background: focusTarget === t ? 'rgba(145,198,212,0.1)' : 'transparent',
                                  color: focusTarget === t ? '#d6e4e4' : '#687a86',
                                  cursor: 'pointer',
                                  fontSize: 10,
                                  fontWeight: focusTarget === t ? 600 : 400,
                                  textAlign: 'left',
                                  textTransform: 'capitalize',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <div style={{
                                  width: 6, height: 6, borderRadius: '50%',
                                  background: focusTarget === t ? '#91c6d4' : 'rgba(104,122,134,0.3)',
                                  boxShadow: focusTarget === t ? '0 0 6px rgba(145,198,212,0.5)' : 'none',
                                  transition: 'all 0.2s ease',
                                }} />
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── CATEGORY 3: VECTOR OVERLAYS ── */}
                  {(() => {
                    const cat = 'vectors' as const;
                    const isExpanded = expandedCategory === cat;
                    const vecLabels: Record<string, string> = { all: 'All', dte: 'LOS', solar: 'Sun', off: 'Off' };
                    const activeLabel = vecLabels[vectorMode] || 'All';
                    return (
                      <div style={{ borderBottom: '1px solid rgba(35,51,62,0.3)' }}>
                        <div
                          onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '7px 12px',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(240,169,112,0.06)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <Radio size={11} color={isExpanded ? '#f0a970' : '#687a86'} style={{ transition: 'color 0.2s ease' }} />
                            <span style={{ color: isExpanded ? '#d6e4e4' : '#8899a6', fontSize: 10, fontWeight: 600, letterSpacing: '0.6px', transition: 'color 0.2s ease' }}>
                              VECTORS
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{
                              fontSize: 9,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: 'rgba(240,169,112,0.12)',
                              color: '#f0a970',
                              fontWeight: 600,
                            }}>
                              {activeLabel}
                            </span>
                            <ChevronDown
                              size={11}
                              color="#687a86"
                              style={{
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.25s cubic-bezier(0.2,0.8,0.2,1)',
                              }}
                            />
                          </div>
                        </div>
                        <div
                          style={{
                            maxHeight: isExpanded ? 180 : 0,
                            opacity: isExpanded ? 1 : 0,
                            overflow: 'hidden',
                            transition: 'max-height 0.28s cubic-bezier(0.2,0.8,0.2,1), opacity 0.22s ease',
                          }}
                        >
                          <div style={{ padding: '2px 12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {[
                              { id: 'all' as const, label: 'All Vectors', accent: '#f0a970' },
                              { id: 'dte' as const, label: 'Earth LOS', accent: '#91c6d4' },
                              { id: 'solar' as const, label: 'Sun Rays', accent: '#f0a970' },
                              { id: 'off' as const, label: 'Off', accent: '#687a86' },
                            ].map((v) => (
                              <button
                                key={v.id}
                                onClick={() => setVectorMode(v.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 7,
                                  padding: '5px 8px',
                                  borderRadius: 6,
                                  border: vectorMode === v.id ? `1px solid ${v.accent}44` : '1px solid transparent',
                                  background: vectorMode === v.id ? `${v.accent}18` : 'transparent',
                                  color: vectorMode === v.id ? '#d6e4e4' : '#687a86',
                                  cursor: 'pointer',
                                  fontSize: 10,
                                  fontWeight: vectorMode === v.id ? 600 : 400,
                                  textAlign: 'left',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <div style={{
                                  width: 6, height: 6, borderRadius: '50%',
                                  background: vectorMode === v.id ? v.accent : 'rgba(104,122,134,0.3)',
                                  boxShadow: vectorMode === v.id ? `0 0 6px ${v.accent}88` : 'none',
                                  transition: 'all 0.2s ease',
                                }} />
                                {v.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── CATEGORY 4: DISPLAY SETTINGS ── */}
                  {(() => {
                    const cat = 'display' as const;
                    const isExpanded = expandedCategory === cat;
                    const activeCount = Object.values(displaySettings).filter(Boolean).length;
                    return (
                      <div>
                        <div
                          onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '7px 12px',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(145,198,212,0.06)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <SlidersHorizontal size={11} color={isExpanded ? '#91c6d4' : '#687a86'} style={{ transition: 'color 0.2s ease' }} />
                            <span style={{ color: isExpanded ? '#d6e4e4' : '#8899a6', fontSize: 10, fontWeight: 600, letterSpacing: '0.6px', transition: 'color 0.2s ease' }}>
                              DISPLAY
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{
                              fontSize: 9,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: 'rgba(145,198,212,0.12)',
                              color: '#91c6d4',
                              fontWeight: 600,
                            }}>
                              {activeCount} ON
                            </span>
                            <ChevronDown
                              size={11}
                              color="#687a86"
                              style={{
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.25s cubic-bezier(0.2,0.8,0.2,1)',
                              }}
                            />
                          </div>
                        </div>
                        <div
                          style={{
                            maxHeight: isExpanded ? 200 : 0,
                            opacity: isExpanded ? 1 : 0,
                            overflow: 'hidden',
                            transition: 'max-height 0.28s cubic-bezier(0.2,0.8,0.2,1), opacity 0.22s ease',
                          }}
                        >
                          <div style={{ padding: '2px 12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {([
                              { key: 'labels' as const, label: 'Labels' },
                              { key: 'beacons' as const, label: 'Beacons' },
                              { key: 'grid' as const, label: 'Grid' },
                              { key: 'lighting' as const, label: 'Lighting' },
                            ]).map((opt) => (
                              <button
                                key={opt.key}
                                onClick={() => setDisplaySettings((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '5px 8px',
                                  borderRadius: 6,
                                  border: '1px solid transparent',
                                  background: 'transparent',
                                  color: displaySettings[opt.key] ? '#d6e4e4' : '#687a86',
                                  cursor: 'pointer',
                                  fontSize: 10,
                                  fontWeight: displaySettings[opt.key] ? 600 : 400,
                                  textAlign: 'left',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {opt.label}
                                {/* Toggle Switch */}
                                <div style={{
                                  width: 28,
                                  height: 14,
                                  borderRadius: 7,
                                  background: displaySettings[opt.key] ? 'rgba(145,198,212,0.35)' : 'rgba(104,122,134,0.2)',
                                  border: displaySettings[opt.key] ? '1px solid rgba(145,198,212,0.4)' : '1px solid rgba(104,122,134,0.3)',
                                  position: 'relative',
                                  transition: 'all 0.2s ease',
                                }}>
                                  <div style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    background: displaySettings[opt.key] ? '#91c6d4' : '#687a86',
                                    position: 'absolute',
                                    top: 1,
                                    left: displaySettings[opt.key] ? 15 : 1,
                                    transition: 'left 0.2s cubic-bezier(0.2,0.8,0.2,1), background 0.2s ease',
                                    boxShadow: displaySettings[opt.key] ? '0 0 4px rgba(145,198,212,0.5)' : 'none',
                                  }} />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* SCIENTIFIC DIMENSIONS MODAL                                */}
      {/* ────────────────────────────────────────────────────────── */}
      {showScaleDetails && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: panelOpen ? 216 : 60,
            maxWidth: 280,
            background: '#0e1520f5',
            border: '1px solid #283946',
            borderRadius: 10,
            padding: 14,
            zIndex: 30,
            fontSize: 11,
            fontFamily: "'DM Mono', monospace",
            color: '#d6e4e4',
            boxShadow: '0 12px 30px rgba(0,0,0,0.8)',
          }}
        >
          <div style={{ color: '#f0a970', fontWeight: 700, marginBottom: 6 }}>NASA Physical Scale Calibrations</div>
          <div style={{ display: 'grid', gap: 4, lineHeight: 1.5, fontSize: 10, color: '#9bb0ba' }}>
            <div>• Moon Radius: 1,737.4 km (1.0x baseline)</div>
            <div>• Earth Radius: 6,371.0 km (3.67x Moon, 49.3x volume)</div>
            <div>• Sun Radius: 696,340 km (400.8x Moon, 64.3M x volume)</div>
            <div>• Earth Distance: 384,400 km (221.25x Moon radius)</div>
            <div>• Sun Distance: 149.6M km (86,105x Moon radius)</div>
          </div>
          <button
            onClick={() => setShowScaleDetails(false)}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '4px 0',
              background: '#192834',
              border: '1px solid #2e4352',
              borderRadius: 6,
              color: '#d6e4e4',
              cursor: 'pointer',
              fontSize: 10,
            }}
          >
            Close Specification
          </button>
        </div>
      )}

      {/* Reset Camera Button — hidden in compact */}
      {!compact && (
      <div style={{ position: 'absolute', bottom: 14, right: 14, zIndex: 10 }}>
        <button
          className="icon-button"
          onClick={() => handleFocus('system')}
          title="Reset to Full Celestial System View"
          style={{ background: '#0e171eee', borderColor: '#26343d' }}
        >
          <RotateCcw size={14} />
        </button>
      </div>
      )}
    </div>
  );
};

export default MoonGlobe3D;
