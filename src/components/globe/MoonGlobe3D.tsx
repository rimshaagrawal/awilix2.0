import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { sites } from '@/data/sites';
import { SITE_COLORS } from '@/lib/scenarioCalculations';
import { Move3d, RotateCcw, Globe, Sun as SunIcon, Orbit } from 'lucide-react';

interface MoonGlobe3DProps {
  selectedSiteId: string;
  onSelectSite: (id: string) => void;
  compact?: boolean;
}

export const MoonGlobe3D: React.FC<MoonGlobe3DProps> = ({
  selectedSiteId,
  onSelectSite,
  compact = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const [loadingModel, setLoadingModel] = useState(true);
  const [activeFocus, setActiveFocus] = useState<'moon' | 'earth' | 'sun' | 'system'>('moon');

  // Convert lunar latitude & longitude to 3D Cartesian coordinates on sphere
  const latLonToVector3 = (lat: number, lon: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 600;
    const height = mount.clientHeight || 400;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera: position targeting lunar South Pole (lat ~ -90 deg)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, -3.8, 2.2);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    mount.appendChild(renderer.domElement);

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 120;
    controls.minDistance = 1.4;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0x16222f, 0.7);
    scene.add(ambientLight);

    // Starfield particles in the background
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 900;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 160;
      starPositions[i + 1] = (Math.random() - 0.5) * 160;
      starPositions[i + 2] = (Math.random() - 0.5) * 160;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0x99ccff,
      size: 0.12,
      transparent: true,
      opacity: 0.75,
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // 6. Moon Mesh / GLB Loader
    const moonGroup = new THREE.Group();
    scene.add(moonGroup);

    const moonRadius = 1.0;
    const textureLoader = new THREE.TextureLoader();
    const gltfLoader = new GLTFLoader();

    // Instant Moon sphere with photographic LROC texture
    const moonGeo = new THREE.SphereGeometry(moonRadius, 64, 64);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xc8d2d6,
      roughness: 0.88,
      metalness: 0.04,
    });

    textureLoader.load(
      '/textures/lroc_color_2k.jpg',
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        moonMat.map = texture;
        moonMat.needsUpdate = true;
      },
      undefined,
      () => {}
    );

    const fallbackMoonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonGroup.add(fallbackMoonMesh);

    // Attempt loading NASA Moon GLB model
    gltfLoader.load(
      '/models/Moon_NASA_LRO_8k_Topo_Small.glb',
      (gltf) => {
        moonGroup.remove(fallbackMoonMesh);
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        const scale = moonRadius / (sphere.radius || 1);
        model.scale.set(scale, scale, scale);
        moonGroup.add(model);
        setLoadingModel(false);
      },
      undefined,
      () => {
        // Try fallback small glb
        gltfLoader.load(
          '/models/moon_small.glb',
          (gltf) => {
            moonGroup.remove(fallbackMoonMesh);
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const sphere = box.getBoundingSphere(new THREE.Sphere());
            const scale = moonRadius / (sphere.radius || 1);
            model.scale.set(scale, scale, scale);
            moonGroup.add(model);
            setLoadingModel(false);
          },
          undefined,
          () => setLoadingModel(false)
        );
      }
    );

    // ───────────────────────────────────────────
    // 7. 3D SUN MODEL & SOLAR LIGHTING
    // ───────────────────────────────────────────
    const sunGroup = new THREE.Group();
    const sunPos = new THREE.Vector3(26, -5, 16);
    sunGroup.position.copy(sunPos);
    scene.add(sunGroup);

    // Directional sunlight shining from the Sun onto the Moon and Earth
    const sunLight = new THREE.DirectionalLight(0xfffaed, 3.2);
    sunLight.position.copy(sunPos);
    scene.add(sunLight);

    const sunGlowLight = new THREE.PointLight(0xffb74d, 2.5, 80);
    sunGlowLight.position.copy(sunPos);
    scene.add(sunGlowLight);

    // Instant Sun Photosphere sphere with texture
    const sunRadius = 3.6;
    const sunGeo = new THREE.SphereGeometry(sunRadius, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
    });

    textureLoader.load('/textures/sun_texture_2k.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      sunMat.map = tex;
      sunMat.needsUpdate = true;
    });

    const fallbackSunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunGroup.add(fallbackSunMesh);

    // Sun outer corona glow billboard
    const coronaGeo = new THREE.SphereGeometry(sunRadius * 1.35, 24, 24);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    sunGroup.add(coronaMesh);

    // Load full 3D Sun GLB model
    gltfLoader.load(
      '/models/sun.glb',
      (gltf) => {
        sunGroup.remove(fallbackSunMesh);
        const sunScene = gltf.scene;
        const box = new THREE.Box3().setFromObject(sunScene);
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        const s = sunRadius / (sphere.radius || 1);
        sunScene.scale.set(s, s, s);
        sunGroup.add(sunScene);
      },
      undefined,
      () => {
        // Try alternate path if not found
        gltfLoader.load(
          '/earth,sun,moon textures and models/Sun_1_1391000.glb',
          (gltf) => {
            sunGroup.remove(fallbackSunMesh);
            const sunScene = gltf.scene;
            const box = new THREE.Box3().setFromObject(sunScene);
            const sphere = box.getBoundingSphere(new THREE.Sphere());
            const s = sunRadius / (sphere.radius || 1);
            sunScene.scale.set(s, s, s);
            sunGroup.add(sunScene);
          },
          undefined,
          () => {}
        );
      }
    );

    // ───────────────────────────────────────────
    // 8. 3D EARTH MODEL & DIRECT-TO-EARTH (DTE) LINK
    // ───────────────────────────────────────────
    const earthGroup = new THREE.Group();
    const earthPos = new THREE.Vector3(-12, -7, -6);
    earthGroup.position.copy(earthPos);
    scene.add(earthGroup);

    const earthRadius = 1.7; // ~3.67x Moon radius in proportion
    const earthGeo = new THREE.SphereGeometry(earthRadius, 48, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x66aacc,
      roughness: 0.65,
      metalness: 0.1,
    });

    textureLoader.load('/textures/earth_blue_marble.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      earthMat.map = tex;
      earthMat.needsUpdate = true;
    });

    const fallbackEarthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(fallbackEarthMesh);

    // Earth atmosphere halo
    const atmosGeo = new THREE.SphereGeometry(earthRadius * 1.08, 32, 32);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x65d5d0,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    earthGroup.add(atmosMesh);

    // Load full 3D Earth GLB model
    gltfLoader.load(
      '/models/earth.glb',
      (gltf) => {
        earthGroup.remove(fallbackEarthMesh);
        const earthScene = gltf.scene;
        const box = new THREE.Box3().setFromObject(earthScene);
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        const s = earthRadius / (sphere.radius || 1);
        earthScene.scale.set(s, s, s);
        earthGroup.add(earthScene);
      },
      undefined,
      () => {
        gltfLoader.load(
          '/earth,sun,moon textures and models/EarthClouds_1_12756.glb',
          (gltf) => {
            earthGroup.remove(fallbackEarthMesh);
            const earthScene = gltf.scene;
            const box = new THREE.Box3().setFromObject(earthScene);
            const sphere = box.getBoundingSphere(new THREE.Sphere());
            const s = earthRadius / (sphere.radius || 1);
            earthScene.scale.set(s, s, s);
            earthGroup.add(earthScene);
          },
          undefined,
          () => {}
        );
      }
    );

    // Subtle Earth radio link vector line to Moon
    const dtePoints = [earthPos, new THREE.Vector3(0, -0.98, 0.05)];
    const dteGeo = new THREE.BufferGeometry().setFromPoints(dtePoints);
    const dteMat = new THREE.LineDashedMaterial({
      color: 0x65d5d0,
      dashSize: 0.4,
      gapSize: 0.25,
      transparent: true,
      opacity: 0.45,
    });
    const dteLine = new THREE.Line(dteGeo, dteMat);
    dteLine.computeLineDistances();
    scene.add(dteLine);

    // ───────────────────────────────────────────
    // 9. Site Markers on the Moon
    // ───────────────────────────────────────────
    const markersGroup = new THREE.Group();
    moonGroup.add(markersGroup);

    const markerMeshes: { id: string; mesh: THREE.Mesh }[] = [];

    sites.forEach((site, index) => {
      const pos = latLonToVector3(site.lat, site.lon, moonRadius * 1.015);
      const colorHex = parseInt(SITE_COLORS[index % SITE_COLORS.length].replace('#', '0x'), 16);

      // Marker pin
      const markerGeo = new THREE.SphereGeometry(0.026, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({
        color: colorHex,
      });
      const markerMesh = new THREE.Mesh(markerGeo, markerMat);
      markerMesh.position.copy(pos);
      markerMesh.userData = { siteId: site.id };
      markersGroup.add(markerMesh);
      markerMeshes.push({ id: site.id, mesh: markerMesh });

      // Pulsing beacon ring around marker
      const ringGeo = new THREE.RingGeometry(0.035, 0.045, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pos);
      ringMesh.lookAt(0, 0, 0);
      markersGroup.add(ringMesh);
    });

    // 10. Raycaster for clicking markers
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(
        markerMeshes.map((m) => m.mesh)
      );

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const siteId = hit.userData.siteId;
        if (siteId) {
          onSelectSite(siteId);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // 11. Resize observer
    const handleResize = () => {
      if (!mount) return;
      const newWidth = mount.clientWidth;
      const newHeight = mount.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // 12. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      // Subtle celestial rotations
      starField.rotation.y += 0.0001;
      earthGroup.rotation.y += 0.003;
      sunGroup.rotation.y += 0.0008;

      // Pulse selected site marker scale
      markerMeshes.forEach((item) => {
        if (item.id === selectedSiteId) {
          const s = 1.3 + Math.sin(Date.now() * 0.006) * 0.25;
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
  }, [selectedSiteId, onSelectSite]);

  // Camera viewpoint controllers
  const focusOn = (target: 'moon' | 'earth' | 'sun' | 'system') => {
    setActiveFocus(target);
    if (!cameraRef.current || !controlsRef.current) return;

    if (target === 'moon') {
      controlsRef.current.target.set(0, 0, 0);
      cameraRef.current.position.set(0, -3.8, 2.2);
    } else if (target === 'earth') {
      controlsRef.current.target.set(-12, -7, -6);
      cameraRef.current.position.set(-8, -4, -1);
    } else if (target === 'sun') {
      controlsRef.current.target.set(26, -5, 16);
      cameraRef.current.position.set(26, -2, 28);
    } else if (target === 'system') {
      controlsRef.current.target.set(4, -4, 4);
      cameraRef.current.position.set(12, -22, 34);
    }
    controlsRef.current.update();
  };

  return (
    <div
      className={`globe-scene ${compact ? 'globe-compact' : ''}`}
      style={{ position: 'relative', width: '100%', height: '100%', minHeight: compact ? 340 : 500 }}
    >
      <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: compact ? 340 : 500 }} />

      {/* Target Focus Pills */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          display: 'flex',
          gap: 6,
          zIndex: 10,
        }}
      >
        <button
          className={`icon-pill ${activeFocus === 'moon' ? 'active' : ''}`}
          onClick={() => focusOn('moon')}
          title="Focus on Lunar South Pole"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            fontSize: 11,
            borderRadius: 6,
            background: activeFocus === 'moon' ? '#65d5d0' : '#101920dd',
            color: activeFocus === 'moon' ? '#071516' : '#91a2a9',
            border: '1px solid #293944',
            cursor: 'pointer',
            fontFamily: "'DM Mono', monospace",
          }}
        >
          <Orbit size={13} />
          <span>Moon</span>
        </button>

        <button
          className={`icon-pill ${activeFocus === 'earth' ? 'active' : ''}`}
          onClick={() => focusOn('earth')}
          title="View 3D Earth Model"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            fontSize: 11,
            borderRadius: 6,
            background: activeFocus === 'earth' ? '#65d5d0' : '#101920dd',
            color: activeFocus === 'earth' ? '#071516' : '#91a2a9',
            border: '1px solid #293944',
            cursor: 'pointer',
            fontFamily: "'DM Mono', monospace",
          }}
        >
          <Globe size={13} />
          <span>3D Earth</span>
        </button>

        <button
          className={`icon-pill ${activeFocus === 'sun' ? 'active' : ''}`}
          onClick={() => focusOn('sun')}
          title="View 3D Sun Model"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            fontSize: 11,
            borderRadius: 6,
            background: activeFocus === 'sun' ? '#f0a970' : '#101920dd',
            color: activeFocus === 'sun' ? '#120e07' : '#91a2a9',
            border: '1px solid #293944',
            cursor: 'pointer',
            fontFamily: "'DM Mono', monospace",
          }}
        >
          <SunIcon size={13} />
          <span>3D Sun</span>
        </button>

        <button
          className={`icon-pill ${activeFocus === 'system' ? 'active' : ''}`}
          onClick={() => focusOn('system')}
          title="View Full Sun-Earth-Moon Celestial System"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            fontSize: 11,
            borderRadius: 6,
            background: activeFocus === 'system' ? '#9aaeff' : '#101920dd',
            color: activeFocus === 'system' ? '#09101d' : '#91a2a9',
            border: '1px solid #293944',
            cursor: 'pointer',
            fontFamily: "'DM Mono', monospace",
          }}
        >
          <span>All 3 Bodies</span>
        </button>
      </div>

      <div className="scene-caption">
        <Move3d size={14} />
        <span>drag to rotate · click a 3D marker · zoom out to view Earth &amp; Sun</span>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          display: 'flex',
          gap: 6,
          zIndex: 10,
        }}
      >
        <button
          className="icon-button"
          onClick={() => focusOn('moon')}
          title="Reset South Polar Camera"
          style={{ background: '#0e171eee', borderColor: '#26343d' }}
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};

export default MoonGlobe3D;
