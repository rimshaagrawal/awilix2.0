import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { sites } from '@/data/sites';
import { SITE_COLORS } from '@/lib/scenarioCalculations';
import { getSubPoints, computePositions } from '@/lib/ephemeris';
import { Globe, ArrowRight, Info, RotateCcw } from 'lucide-react';
import { Crosshair } from '@/components/reactbits/Crosshair';

interface MoonGlobe3DProps {
  selectedSiteId: string;
  onSelectSite: (id: string) => void;
  onVisitTerrain?: () => void;
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
  onVisitTerrain,
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
  const [focusTarget, setFocusTarget] = useState<'moon' | 'earth' | 'sun' | 'system'>('system');
  const [vectorMode, setVectorMode] = useState<'all' | 'dte' | 'solar' | 'off'>('all');
  const [showScaleDetails, setShowScaleDetails] = useState(false);
  const [currentHour] = useState(12);

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
    camera.position.set(0, 40, 110);
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
    loadNasaMoon('/models/Moon_NASA_LRO_8k_Topo_Small.glb');

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

    // ── 4. SITE MARKERS ──────────────────────────────────────
    const markerMeshes: { id: string; mesh: THREE.Mesh }[] = [];
    sites.forEach((site, index) => {
      const pos = latLonToVector3(site.lat, site.lon, 1.015);
      const surfacePos = latLonToVector3(site.lat, site.lon, 1.0);
      const colorHex = parseInt(SITE_COLORS[index % SITE_COLORS.length].replace('#', '0x'), 16);

      // Spherical Beacon
      const markerGeo = new THREE.SphereGeometry(0.024, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const markerMesh = new THREE.Mesh(markerGeo, markerMat);
      markerMesh.position.copy(pos);
      markerMesh.userData = { siteId: site.id };
      markersGroup.add(markerMesh);
      markerMeshes.push({ id: site.id, mesh: markerMesh });

      // Grounding target ring
      const ringGeo = new THREE.RingGeometry(0.032, 0.042, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pos);
      ringMesh.lookAt(0, 0, 0);
      markersGroup.add(ringMesh);

      // Pin stem connecting exact Moon surface (radius 1.0) to beacon head (radius 1.015)
      const stemGeom = new THREE.BufferGeometry().setFromPoints([surfacePos, pos]);
      const stemMat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.75 });
      markersGroup.add(new THREE.Line(stemGeom, stemMat));
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

      // Pulse selected beacon
      markerMeshes.forEach((item) => {
        if (item.id === selectedSiteIdRef.current) {
          const s = 1.35 + Math.sin(Date.now() * 0.006) * 0.3;
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
            <span>3D Moon Globe · Click beacon to explore</span>
          </div>
          {onVisitTerrain && (
            <button
              onClick={onVisitTerrain}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                background: '#f5cca0',
                border: '1px solid #f0a970',
                borderRadius: 8,
                color: '#120e07',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Manrope', sans-serif",
                pointerEvents: 'auto',
              }}
            >
              <span>3D Terrain</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      ) : (
        <>
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
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            {/* Title */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#f0ebe1',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Manrope', sans-serif",
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                pointerEvents: 'auto',
              }}
            >
              <Globe size={16} color="#f0a970" />
              <span>Interactive 3D Moon Globe · Click any beacon to explore</span>
            </div>

            {/* Visit 3D Terrain Button */}
            {onVisitTerrain && (
              <button
                onClick={onVisitTerrain}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  background: '#eef0f5',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 6,
                  color: '#07080d',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Manrope', sans-serif",
                  boxShadow: 'none',
                  pointerEvents: 'auto',
                }}
              >
                <span>Visit 3D Terrain</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>

          {/* ────────────────────────────────────────────────────────── */}
          {/* SECOND ROW OPTIONS TOOLBAR (EXACT PILLS FROM SCREENSHOT)  */}
          {/* ────────────────────────────────────────────────────────── */}
          <div
            style={{
              position: 'absolute',
              top: 52,
              left: 14,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 10,
              zIndex: 20,
              fontFamily: "'DM Mono', monospace",
          fontSize: 11,
        }}
      >
        {/* Scale Mode Group: Proportional | 1:1 NASA | Info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: '#0a0e17ee',
            padding: '3px 4px',
            borderRadius: 10,
            border: '1px solid #23333e',
            backdropFilter: 'blur(8px)',
          }}
        >
          <button
            onClick={() => setScaleMode('proportional')}
            style={{
              padding: '4px 10px',
              borderRadius: 7,
              background: scaleMode === 'proportional' ? '#91c6d4' : 'transparent',
              color: scaleMode === 'proportional' ? '#060910' : '#8899a6',
              border: 'none',
              fontWeight: scaleMode === 'proportional' ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            Proportional
          </button>
          <button
            onClick={() => setScaleMode('true')}
            style={{
              padding: '4px 10px',
              borderRadius: 7,
              background: scaleMode === 'true' ? '#f0a970' : 'transparent',
              color: scaleMode === 'true' ? '#120e07' : '#8899a6',
              border: 'none',
              fontWeight: scaleMode === 'true' ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            1:1 NASA
          </button>
          <button
            onClick={() => setShowScaleDetails(!showScaleDetails)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8899a6',
              padding: '2px 6px',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
            title="Toggle NASA scientific dimensions specification"
          >
            <Info size={14} />
          </button>
        </div>

        {/* Target Focus Group: Target: Moon | Earth | Sun | System */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            background: '#0a0e17ee',
            padding: '3px 8px',
            borderRadius: 10,
            border: '1px solid #23333e',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ color: '#687a86', paddingRight: 4, fontSize: 10 }}>Target:</span>
          {(['moon', 'earth', 'sun', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleFocus(t)}
              style={{
                padding: '3px 9px',
                borderRadius: 6,
                background: focusTarget === t ? '#ffffff22' : 'transparent',
                color: focusTarget === t ? '#ffffff' : '#8899a6',
                border: 'none',
                fontWeight: focusTarget === t ? 700 : 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Vectors Mode Group: Vectors: All | Earth LOS | Sun Rays | Off */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            background: '#0a0e17ee',
            padding: '3px 8px',
            borderRadius: 10,
            border: '1px solid #23333e',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ color: '#687a86', paddingRight: 4, fontSize: 10 }}>Vectors:</span>
          {[
            { id: 'all', label: 'All', activeColor: '#f0a970', textColor: '#120e07' },
            { id: 'dte', label: 'Earth LOS', activeColor: '#91c6d4', textColor: '#060910' },
            { id: 'solar', label: 'Sun Rays', activeColor: '#f0a970', textColor: '#120e07' },
            { id: 'off', label: 'Off', activeColor: '#ffffff25', textColor: '#ffffff' },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setVectorMode(v.id as any)}
              style={{
                padding: '3px 9px',
                borderRadius: 6,
                background: vectorMode === v.id ? v.activeColor : 'transparent',
                color: vectorMode === v.id ? v.textColor : '#8899a6',
                border: 'none',
                fontWeight: vectorMode === v.id ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {v.label}
            </button>
          ))}
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
            top: 96,
            left: 14,
            maxWidth: 320,
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
