import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const sectorLabels = {
  Road: "Road",
  Education: "School",
  Healthcare: "Hospital",
  Industry: "Factory",
  Infrastructure: "Transit",
  Military: "Base",
  Environment: "Park",
};

// ── DAY/NIGHT CYCLE ──────────────────────────────────────────────────────────
// Each "turn" = one full day/night cycle in 12 seconds
// turnPhase 0..1: 0=dawn, 0.25=noon, 0.5=dusk, 0.75=midnight
const SKY_COLORS = {
  dawn:     new THREE.Color(0xff6b35).lerp(new THREE.Color(0x071426), 0.3),
  noon:     new THREE.Color(0x5bb8f5),
  dusk:     new THREE.Color(0xff4500).lerp(new THREE.Color(0x1a0533), 0.4),
  midnight: new THREE.Color(0x020a18),
};

function skyColorAt(phase) {
  // phase 0..1
  const c = new THREE.Color();
  if (phase < 0.25) {
    // dawn → noon
    c.lerpColors(SKY_COLORS.dawn, SKY_COLORS.noon, phase / 0.25);
  } else if (phase < 0.5) {
    // noon → dusk
    c.lerpColors(SKY_COLORS.noon, SKY_COLORS.dusk, (phase - 0.25) / 0.25);
  } else if (phase < 0.75) {
    // dusk → midnight
    c.lerpColors(SKY_COLORS.dusk, SKY_COLORS.midnight, (phase - 0.5) / 0.25);
  } else {
    // midnight → dawn
    c.lerpColors(SKY_COLORS.midnight, SKY_COLORS.dawn, (phase - 0.75) / 0.25);
  }
  return c;
}

function groundColorAt(phase) {
  const isNight = phase > 0.5;
  const t = isNight ? (phase - 0.5) / 0.5 : phase / 0.5;
  return isNight
    ? new THREE.Color(0x0d3b2e).lerp(new THREE.Color(0x041a14), t)
    : new THREE.Color(0x041a14).lerp(new THREE.Color(0x0d3b2e), t);
}

export default function BuilderGame({ countryName = "", latestInvestment = null, turnNumber = 1 }) {
  const canvasRef   = useRef(null);
  const wrapperRef  = useRef(null);
  const actionsRef  = useRef(null);
  const [tool, setTool] = useState("Road");
  const [timeLabel, setTimeLabel] = useState("🌅 Dawn");
  const [turnPhaseRef] = useState({ v: 0 }); // mutable ref for animation

  useEffect(() => {
    const canvas  = canvasRef.current;
    const wrapper = wrapperRef.current;

    // ── SCENE ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071426);
    scene.fog = new THREE.Fog(0x071426, 18, 38);

    const width  = wrapper.clientWidth;
    const height = wrapper.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(12, 11, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ── LIGHTS ──
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.2);
    sunLight.position.set(8, 14, 6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far  = 60;
    sunLight.shadow.camera.left = sunLight.shadow.camera.bottom = -15;
    sunLight.shadow.camera.right = sunLight.shadow.camera.top = 15;
    scene.add(sunLight);

    // Moon (point light, active at night)
    const moonLight = new THREE.PointLight(0x8ab4f8, 0, 40);
    moonLight.position.set(-6, 12, -6);
    scene.add(moonLight);

    // ── GROUND ──
    const groundGeo = new THREE.PlaneGeometry(38, 38);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0d3b2e, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(18, 18, 0x7dd3fc, 0x7dd3fc);
    grid.position.y = 0.036;
    grid.material.opacity = 0.10;
    grid.material.transparent = true;
    scene.add(grid);

    // ── STARS (visible at night) ──
    const starGeo = new THREE.BufferGeometry();
    const starVerts = [];
    for (let i = 0; i < 280; i++) {
      starVerts.push(
        (Math.random() - 0.5) * 80,
        12 + Math.random() * 18,
        (Math.random() - 0.5) * 80
      );
    }
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starVerts, 3));
    const starMat  = new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0 });
    const stars    = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ── SUN SPHERE ──
    const sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff4a0 })
    );
    scene.add(sunSphere);

    // ── MOON SPHERE ──
    const moonSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xd0dff8 })
    );
    scene.add(moonSphere);

    // ── HELPERS ──
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();

    function mat(color, roughness = 0.65, emissive = 0x000000, emissiveIntensity = 0) {
      return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04, emissive, emissiveIntensity });
    }
    function addBox(group, w, h, d, color, x, y, z, opts = {}) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        mat(color, opts.roughness ?? 0.65, opts.emissive ?? 0, opts.emissiveIntensity ?? 0));
      m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      if (opts.tag) m.userData.tag = opts.tag;
      group.add(m); return m;
    }
    function addCylinder(group, r, h, color, x, y, z) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14), mat(color));
      m.position.set(x, y, z); m.castShadow = true;
      group.add(m); return m;
    }
    function addRoof(group, x, y, z, color = 0x102040) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.34, 4), mat(color));
      m.position.set(x, y, z); m.rotation.y = Math.PI / 4;
      m.castShadow = true; group.add(m);
    }
    function addWindows(group, count, y, z, color = 0xdff6ff) {
      for (let i = 0; i < count; i++) {
        addBox(group, 0.09, 0.10, 0.025, color, -0.32 + i * 0.22, y, z,
          { emissive: color, emissiveIntensity: 0, tag: "window" });
      }
    }

    // ── STREET LAMP helper ──
    function addLamp(group, x, z) {
      addBox(group, 0.05, 0.55, 0.05, 0x4a5568, x, 0.28, z);
      addBox(group, 0.12, 0.04, 0.05, 0x4a5568, x, 0.55, z);
      const bulb = addBox(group, 0.07, 0.07, 0.07, 0xfff9d0, x + 0.03, 0.54, z,
        { emissive: 0xffd580, emissiveIntensity: 0, tag: "lamp" });
      const pl = new THREE.PointLight(0xffd580, 0, 2.5);
      pl.position.set(x, 0.6, z);
      group.add(pl);
      bulb.userData.pointLight = pl;
    }

    // ── ASSET BUILDERS ──
    function roadAsset() {
      const g = new THREE.Group();
      addBox(g, 1.55, 0.045, 1.55, 0x111827, 0, 0.025, 0);
      addBox(g, 0.09, 0.052, 1.18, 0xfacc15, 0, 0.055, 0);
      addBox(g, 1.15, 0.052, 0.08, 0xe5e7eb, 0, 0.058, 0);
      addLamp(g, -0.64, -0.5);
      addLamp(g,  0.64,  0.5);
      return g;
    }

    function schoolAsset() {
      const g = new THREE.Group();
      addBox(g, 1.05, 0.8, 0.85, 0x38bdf8, 0, 0.4, 0);
      addRoof(g, 0, 0.98, 0, 0x172554);
      addBox(g, 0.22, 0.32, 0.035, 0xf8fafc, 0, 0.32, 0.44);
      addWindows(g, 3, 0.58, 0.45);
      addBox(g, 1.2, 0.055, 1.0, 0x0f172a, 0, 0.03, 0);
      addLamp(g, 0.5, 0.55);
      return g;
    }

    function hospitalAsset() {
      const g = new THREE.Group();
      addBox(g, 1.1, 0.9, 0.95, 0xf8fafc, 0, 0.45, 0);
      addBox(g, 0.16, 0.52, 0.035, 0xef4444, 0, 0.62, 0.49,
        { emissive: 0xef4444, emissiveIntensity: 0, tag: "sign" });
      addBox(g, 0.48, 0.14, 0.035, 0xef4444, 0, 0.62, 0.50,
        { emissive: 0xef4444, emissiveIntensity: 0, tag: "sign" });
      addWindows(g, 3, 0.34, 0.5, 0x38bdf8);
      addWindows(g, 3, 0.72, 0.5, 0x38bdf8);
      addLamp(g, -0.6, 0.55); addLamp(g, 0.6, 0.55);
      return g;
    }

    function factoryAsset() {
      const g = new THREE.Group();
      addBox(g, 1.25, 0.7, 0.9, 0xf97316, 0, 0.35, 0);
      const chimney1 = addBox(g, 0.18, 1.0, 0.18, 0x475569, -0.38, 0.78, -0.2);
      const chimney2 = addBox(g, 0.16, 0.82, 0.16, 0x475569,  0.38, 0.68, -0.2);
      chimney1.userData.tag = "chimney";
      chimney2.userData.tag = "chimney";
      addBox(g, 1.1, 0.14, 0.12, 0x1e293b, 0, 0.82, 0.38);
      addWindows(g, 4, 0.45, 0.46, 0xfef3c7);
      // smoke particles stored on group
      g.userData.smokeParticles = [];
      for (let i = 0; i < 6; i++) {
        const sp = new THREE.Mesh(
          new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.55 })
        );
        sp.position.set(-0.38 + (i % 2) * 0.76, 1.35 + i * 0.18, -0.2);
        sp.userData.baseY = sp.position.y;
        sp.userData.speed = 0.004 + Math.random() * 0.003;
        sp.userData.offset = Math.random() * Math.PI * 2;
        g.add(sp);
        g.userData.smokeParticles.push(sp);
      }
      return g;
    }

    function transitAsset() {
      const g = new THREE.Group();
      addBox(g, 1.45, 0.055, 1.45, 0x111827, 0, 0.03, 0);
      addBox(g, 1.12, 0.5, 0.36, 0x94a3b8, 0, 0.28, 0);
      addBox(g, 1.3, 0.12, 0.52, 0xe2e8f0, 0, 0.6, 0);
      addBox(g, 0.08, 0.055, 1.25, 0xf8fafc, -0.35, 0.07, 0);
      addBox(g, 0.08, 0.055, 1.25, 0xf8fafc,  0.35, 0.07, 0);
      addLamp(g, -0.55, -0.55); addLamp(g, 0.55, 0.55);
      return g;
    }

    function baseAsset() {
      const g = new THREE.Group();
      addBox(g, 1.05, 0.65, 0.9, 0x64748b, 0, 0.32, 0);
      addBox(g, 0.3, 0.95, 0.3, 0x334155, 0.32, 0.74, 0.24);
      addRoof(g, 0.32, 1.25, 0.24, 0x111827);
      addBox(g, 1.25, 0.055, 1.05, 0x1e293b, 0, 0.03, 0);
      addLamp(g, 0.5, 0.5);
      return g;
    }

    function parkAsset() {
      const g = new THREE.Group();
      addBox(g, 1.4, 0.06, 1.4, 0x166534, 0, 0.03, 0);
      [[-0.42,-0.34],[0.38,-0.32],[-0.32,0.4],[0.36,0.36]].forEach(([x,z]) => {
        addCylinder(g, 0.045, 0.38, 0x7c2d12, x, 0.21, z);
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), mat(0x22c55e));
        leaves.position.set(x, 0.5, z); leaves.castShadow = true;
        g.add(leaves);
      });
      addLamp(g, 0, 0.55);
      return g;
    }

    function createAsset(sector) {
      const map = { Road:"Road", Education:"Education", Healthcare:"Healthcare",
        Industry:"Industry", Infrastructure:"Infrastructure", Military:"Military", Environment:"Environment" };
      const builders = { Road: roadAsset, Education: schoolAsset, Healthcare: hospitalAsset,
        Industry: factoryAsset, Infrastructure: transitAsset, Military: baseAsset, Environment: parkAsset };
      return (builders[sector] || schoolAsset)();
    }

    // ── CAR SYSTEM ──
    const CAR_COLORS = [0xff3333, 0xffdd33, 0x33aaff, 0xffffff, 0x33dd88];
    const cars = [];

    function spawnCar() {
      if (cars.length > 14) return;
      const g = new THREE.Group();
      const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
      addBox(g, 0.28, 0.10, 0.16, color, 0, 0.06, 0);
      addBox(g, 0.18, 0.07, 0.14, color, 0, 0.13, 0);
      // headlights
      const hl = addBox(g, 0.04, 0.04, 0.04, 0xffffff, 0.12, 0.06, 0.09,
        { emissive: 0xffffcc, emissiveIntensity: 0, tag: "headlight" });
      const hr = addBox(g, 0.04, 0.04, 0.04, 0xffffff, 0.12, 0.06, -0.09,
        { emissive: 0xffffcc, emissiveIntensity: 0, tag: "headlight" });
      // taillights
      addBox(g, 0.04, 0.04, 0.04, 0xff2222, -0.12, 0.06, 0.09,
        { emissive: 0xff0000, emissiveIntensity: 0, tag: "taillight" });
      addBox(g, 0.04, 0.04, 0.04, 0xff2222, -0.12, 0.06, -0.09,
        { emissive: 0xff0000, emissiveIntensity: 0, tag: "taillight" });

      // random road position
      const axis = Math.random() > 0.5 ? "x" : "z";
      const lane = (Math.random() - 0.5) * 0.28;
      const sign = Math.random() > 0.5 ? 1 : -1;
      const startPos = sign * (8 + Math.random() * 3);
      g.position.set(
        axis === "x" ? startPos : lane,
        0.04,
        axis === "z" ? startPos : lane
      );
      g.rotation.y = axis === "x" ? (sign > 0 ? Math.PI : 0) : (sign > 0 ? Math.PI * 1.5 : Math.PI * 0.5);

      g.userData = { axis, sign, lane, speed: 0.04 + Math.random() * 0.03 };
      g.userData.headlightMeshes = [hl, hr];
      scene.add(g);
      cars.push(g);
    }

    // Spawn initial cars
    for (let i = 0; i < 6; i++) spawnCar();
    const carTimer = window.setInterval(spawnCar, 3000);

    // ── PEOPLE SYSTEM ──
    const people = [];

    function spawnPerson() {
      if (people.length > 20) return;
      const g = new THREE.Group();
      // body
      addBox(g, 0.06, 0.14, 0.05, 0x4a90d9, 0, 0.10, 0);
      // head
      const hm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), mat(0xf5c5a0));
      hm.position.set(0, 0.225, 0); g.add(hm);
      // legs (two boxes that alternate)
      const legL = addBox(g, 0.025, 0.10, 0.025, 0x1e3a5f, -0.018, 0.02, 0);
      const legR = addBox(g, 0.025, 0.10, 0.025, 0x1e3a5f,  0.018, 0.02, 0);
      legL.userData.tag = "legL"; legR.userData.tag = "legR";

      const angle  = Math.random() * Math.PI * 2;
      const radius = 1 + Math.random() * 5;
      g.position.set(Math.cos(angle) * radius, 0.04, Math.sin(angle) * radius);
      g.userData = {
        angle,
        radius,
        speed:  0.008 + Math.random() * 0.006,
        legPhase: Math.random() * Math.PI * 2,
      };
      scene.add(g);
      people.push(g);
    }

    for (let i = 0; i < 8; i++) spawnPerson();
    const personTimer = window.setInterval(spawnPerson, 2000);

    // ── BUILDINGS store ──
    let buildings     = {};
    let placementIndex = 0;
    let currentTool   = "Road";

    function key(x, z) { return `${x},${z}`; }

    function addAssetAt(sector, x, z) {
      const k = key(x, z);
      if (buildings[k]) scene.remove(buildings[k].mesh);
      const mesh = createAsset(sector);
      mesh.position.set(x, 0, z);
      buildings[k] = { x, z, sector, mesh };
      scene.add(mesh);
    }

    function removeAt(x, z) {
      const k = key(x, z);
      if (!buildings[k]) return;
      scene.remove(buildings[k].mesh);
      delete buildings[k];
    }

    function getGridPoint(ev) {
      const rect = canvas.getBoundingClientRect();
      mouse.x =  ((ev.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((ev.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(ground);
      if (!hits.length) return null;
      const p = hits[0].point;
      return { x: Math.round(p.x), z: Math.round(p.z) };
    }

    function handleClick(ev) {
      if (ev.target.tagName === "BUTTON") return;
      const pt = getGridPoint(ev);
      if (!pt) return;
      currentTool === "Delete" ? removeAt(pt.x, pt.z) : addAssetAt(currentTool, pt.x, pt.z);
    }

    const roadPath = [
      [-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],
      [0,-2],[0,-1],[0,0],[0,1],[0,2],[0,3],
    ];
    const assetPositions = [
      [-2,-2],[2,-2],[-3,0],[-1,0],[1,0],[3,0],
      [-2,2],[0,2],[2,2],[-4,4],[-2,4],[0,4],[2,4],[4,4],
    ];

    function placeInvestmentAsset(sector) {
      if (placementIndex < roadPath.length) {
        const [rx, rz] = roadPath[placementIndex];
        addAssetAt("Road", rx, rz);
      }
      const [x, z] = assetPositions[placementIndex % assetPositions.length];
      placementIndex++;
      addAssetAt(sector, x, z);
    }

    function saveCity() {
      const out = {};
      for (const k in buildings) out[k] = { x: buildings[k].x, z: buildings[k].z, sector: buildings[k].sector };
      localStorage.setItem(`statropolis_city_${countryName || "default"}`, JSON.stringify(out));
      alert("City saved.");
    }

    function clearCity() {
      for (const k in buildings) scene.remove(buildings[k].mesh);
      buildings = {}; placementIndex = 0;
    }

    function loadCity() {
      clearCity();
      const saved = localStorage.getItem(`statropolis_city_${countryName || "default"}`);
      if (!saved) { alert("No saved city found."); return; }
      const data = JSON.parse(saved);
      for (const k in data) addAssetAt(data[k].sector, data[k].x, data[k].z);
    }

    actionsRef.current = {
      setTool: (t) => { currentTool = t; },
      placeInvestmentAsset,
      saveCity, loadCity, clearCity,
    };

    canvas.addEventListener("click", handleClick);

    function handleResize() {
      const w = wrapper.clientWidth, h = wrapper.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", handleResize);

    // ── ANIMATION LOOP ──
    let frame = 0;
    let animId;
    const CYCLE_FRAMES = 3600; // full day in frames (~60s at 60fps)

    function updateDayNight(phase) {
      // Sky & fog
      const sky = skyColorAt(phase);
      scene.background.copy(sky);
      scene.fog.color.copy(sky);

      // Ground color
      ground.material.color.copy(groundColorAt(phase));

      // Sun position (arc)
      const sunAngle  = phase * Math.PI * 2 - Math.PI / 2;
      const sunRadius = 16;
      sunSphere.position.set(Math.cos(sunAngle) * sunRadius, Math.sin(sunAngle) * 10, -8);
      sunLight.position.copy(sunSphere.position);

      // Moon (opposite)
      const moonAngle = sunAngle + Math.PI;
      moonSphere.position.set(Math.cos(moonAngle) * sunRadius, Math.sin(moonAngle) * 10, -8);

      const isDay   = phase < 0.5;
      const dayIntensity = Math.max(0, Math.sin(phase * Math.PI));
      sunLight.intensity  = dayIntensity * 1.2;
      ambientLight.intensity = 0.18 + dayIntensity * 0.42;

      // Moon visibility
      moonSphere.material.opacity = isDay ? 0 : 1;
      moonLight.intensity = isDay ? 0 : 0.4;

      // Stars
      starMat.opacity = Math.max(0, (phase - 0.55) / 0.2) * 0.9;
      if (phase > 0.75) starMat.opacity = Math.max(0, (1 - phase) / 0.25) * 0.9;

      // Night factor (0=day, 1=full night)
      const nightFactor = Math.max(0, Math.sin((phase - 0.5) * Math.PI));

      // Street lamps — glow at night
      scene.traverse((obj) => {
        if (obj.isMesh && obj.userData.tag === "lamp") {
          obj.material.emissiveIntensity = nightFactor * 1.8;
        }
        if (obj.isPointLight && obj.parent?.userData?.tag !== undefined) {
          // lamps inside building groups
        }
        if (obj.isMesh && (obj.userData.tag === "window" || obj.userData.tag === "sign")) {
          obj.material.emissiveIntensity = nightFactor * (0.6 + 0.4 * Math.sin(frame * 0.04 + obj.id));
        }
      });

      // Car lights at night
      cars.forEach(car => {
        car.traverse(obj => {
          if (obj.isMesh && (obj.userData.tag === "headlight" || obj.userData.tag === "taillight")) {
            obj.material.emissiveIntensity = nightFactor * 2.5;
          }
        });
      });

      // Update all PointLights in building groups
      scene.traverse(obj => {
        if (obj.isPointLight) {
          if (obj.parent?.type === "Group") {
            obj.intensity = nightFactor * 1.2;
          }
        }
      });

      // Time label
      let label;
      if (phase < 0.12)       label = "🌅 Dawn";
      else if (phase < 0.38)  label = "☀️ Day";
      else if (phase < 0.52)  label = "🌆 Dusk";
      else if (phase < 0.88)  label = "🌙 Night";
      else                     label = "🌅 Dawn";
      return label;
    }

    function animate() {
      animId = requestAnimationFrame(animate);
      frame++;

      // Day/night phase from frame
      const phase = (frame % CYCLE_FRAMES) / CYCLE_FRAMES;
      turnPhaseRef.v = phase;
      const label = updateDayNight(phase);
      if (frame % 30 === 0) setTimeLabel(label);

      // ── Move cars ──
      for (let i = cars.length - 1; i >= 0; i--) {
        const car = cars[i];
        const { axis, sign, speed } = car.userData;
        if (axis === "x") car.position.x += sign * speed;
        else               car.position.z += sign * speed;

        if (Math.abs(car.position.x) > 12 || Math.abs(car.position.z) > 12) {
          scene.remove(car);
          cars.splice(i, 1);
        }
      }

      // ── Animate people ──
      for (const person of people) {
        const d = person.userData;
        d.angle    += d.speed;
        d.legPhase += 0.18;
        person.position.x = Math.cos(d.angle) * d.radius;
        person.position.z = Math.sin(d.angle) * d.radius;
        person.rotation.y = -d.angle + Math.PI / 2;
        // Leg swing
        person.traverse(obj => {
          if (obj.userData.tag === "legL") obj.rotation.x =  Math.sin(d.legPhase) * 0.5;
          if (obj.userData.tag === "legR") obj.rotation.x = -Math.sin(d.legPhase) * 0.5;
        });
      }

      // ── Smoke from factories ──
      for (const k in buildings) {
        const b = buildings[k];
        if (b.sector === "Industry" && b.mesh.userData.smokeParticles) {
          b.mesh.userData.smokeParticles.forEach(sp => {
            sp.position.y = sp.userData.baseY + ((frame * sp.userData.speed + sp.userData.offset) % 1.2);
            sp.material.opacity = 0.55 * (1 - (sp.position.y - sp.userData.baseY) / 1.2);
          });
        }
      }

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      canvas.removeEventListener("click", handleClick);
      window.removeEventListener("resize", handleResize);
      window.clearInterval(carTimer);
      window.clearInterval(personTimer);
      cancelAnimationFrame(animId);
      renderer.dispose();
      actionsRef.current = null;
    };
  }, [countryName]);

  // Place asset when investment arrives
  useEffect(() => {
    if (!latestInvestment?.sector) return;
    actionsRef.current?.placeInvestmentAsset(latestInvestment.sector);
  }, [latestInvestment]);

  function chooseTool(t) {
    setTool(t);
    actionsRef.current?.setTool(t);
  }

  return (
    <div className="builderGame" ref={wrapperRef} style={{ position: "relative" }}>
      {/* Time-of-day badge */}
      <div style={{
        position: "absolute", top: 10, right: 14, zIndex: 20,
        background: "rgba(7,20,38,0.82)",
        border: "0.5px solid rgba(125,211,252,0.25)",
        borderRadius: 99, padding: "4px 13px",
        fontSize: 12, color: "#eef6ff", fontFamily: "inherit",
        backdropFilter: "blur(6px)",
      }}>
        {timeLabel} &nbsp;·&nbsp; Turn {turnNumber}
      </div>

      {/* Country label */}
      <div className="builderCountryLabel">
        {countryName || "Selected Country"}
      </div>

      {/* Toolbar */}
      <div className="builderControls builderSectorControls">
        {Object.keys(sectorLabels).map(sector => (
          <button key={sector}
            className={tool === sector ? "active" : ""}
            onClick={() => chooseTool(sector)}>
            {sectorLabels[sector]}
          </button>
        ))}
        <button className={tool === "Delete" ? "active dangerTool" : "dangerTool"}
          onClick={() => chooseTool("Delete")}>Delete</button>
        <button onClick={() => actionsRef.current?.saveCity()}>Save</button>
        <button onClick={() => actionsRef.current?.loadCity()}>Load</button>
        <button onClick={() => actionsRef.current?.clearCity()}>Clear</button>
      </div>

      <canvas ref={canvasRef} className="builderCanvas" />
    </div>
  );
}
