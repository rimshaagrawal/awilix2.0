import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { sites } from '@/data/sites';
import { SITE_COLORS } from '@/lib/scenarioCalculations';
import { Move3d, Compass, Maximize2, RotateCcw } from 'lucide-react';

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
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 12;
    controls.minDistance = 1.6;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0x223344, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff6e8, 2.5);
    sunLight.position.set(10, -2, 5);
    scene.add(sunLight);

    const earthFillLight = new THREE.DirectionalLight(0x65d5d0, 0.4);
    earthFillLight.position.set(-6, -4, -3);
    scene.add(earthFillLight);

    // Starfield particles in the background
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 600;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 80;
      starPositions[i + 1] = (Math.random() - 0.5) * 80;
      starPositions[i + 2] = (Math.random() - 0.5) * 80;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0x88bbdd,
      size: 0.1,
      transparent: true,
      opacity: 0.7,
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // 6. Moon Mesh / GLB Loader
    const moonGroup = new THREE.Group();
    scene.add(moonGroup);

    const moonRadius = 1.0;
    const textureLoader = new THREE.TextureLoader();
    const gltfLoader = new GLTFLoader();

    // Default fallback Moon sphere with procedural shader/texture
    const moonGeo = new THREE.SphereGeometry(moonRadius, 64, 64);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0x99a6aa,
      roughness: 0.88,
      metalness: 0.05,
    });

    // Try loading texture
    textureLoader.load(
      '/textures/lroc_color_2k.jpg',
      (texture) => {
        moonMat.map = texture;
        moonMat.needsUpdate = true;
      },
      undefined,
      () => {
        // Fallback procedural shading if texture not ready
      }
    );

    const fallbackMoonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonGroup.add(fallbackMoonMesh);

    // Attempt loading NASA GLB model
    gltfLoader.load(
      '/models/Moon_NASA_LRO_8k_Topo_Small.glb',
      (gltf) => {
        moonGroup.remove(fallbackMoonMesh);
        const model = gltf.scene;
        // Normalize size to moonRadius
        const box = new THREE.Box3().setFromObject(model);
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        const scale = moonRadius / (sphere.radius || 1);
        model.scale.set(scale, scale, scale);
        moonGroup.add(model);
        setLoadingModel(false);
      },
      undefined,
      () => {
        // If GLB is large or loading slowly, keep the texture mesh
        setLoadingModel(false);
      }
    );

    // 7. Site Markers on the Moon
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

    // 8. Raycaster for clicking markers
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

    // 9. Resize observer
    const handleResize = () => {
      if (!mount) return;
      const newWidth = mount.clientWidth;
      const newHeight = mount.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // 10. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      // Subtle atmospheric celestial rotation
      starField.rotation.y += 0.0001;

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

  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, -3.8, 2.2);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div
      className={`globe-scene ${compact ? 'globe-compact' : ''}`}
      style={{ position: 'relative', width: '100%', height: '100%', minHeight: compact ? 340 : 500 }}
    >
      <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: compact ? 340 : 500 }} />

      <div className="scene-sun">
        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f0a970', boxShadow: '0 0 10px #f0a970' }} />
        <span>SUN VECTOR</span>
      </div>

      <div className="scene-earth">
        <div className="earth-disc">
          <span />
        </div>
        <span>EARTH DTE</span>
      </div>

      <div className="scene-caption">
        <Move3d size={14} />
        <span>drag to rotate · click a 3D marker · pinch to zoom</span>
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
          onClick={resetCamera}
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

