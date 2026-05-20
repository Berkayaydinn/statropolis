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

export default function BuilderGame({ countryName = "", latestInvestment = null }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const actionsRef = useRef(null);
  const [tool, setTool] = useState("Road");

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071426);

    const width = wrapper.clientWidth;
    const height = wrapper.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.78);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.05);
    sunLight.position.set(8, 12, 6);
    scene.add(sunLight);

    const groundGeometry = new THREE.PlaneGeometry(38, 38);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f766e,
      roughness: 0.85,
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const grid = new THREE.GridHelper(18, 18, 0x7dd3fc, 0x7dd3fc);
    grid.position.y = 0.035;
    grid.material.opacity = 0.12;
    grid.material.transparent = true;
    scene.add(grid);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let currentTool = "Road";
    let buildings = {};
    let placementIndex = 0;

    function mat(color, roughness = 0.65) {
      return new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness: 0.04,
      });
    }

    function addBox(group, w, h, d, color, x, y, z) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    }

    function addCylinder(group, radius, h, color, x, y, z) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, h, 18), mat(color));
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    }

    function addRoof(group, x, y, z, color = 0x102040) {
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.34, 4), mat(color));
      roof.position.set(x, y, z);
      roof.rotation.y = Math.PI / 4;
      group.add(roof);
    }

    function addWindows(group, count, y, z, color = 0xdff6ff) {
      for (let i = 0; i < count; i++) {
        addBox(group, 0.09, 0.10, 0.025, color, -0.32 + i * 0.22, y, z);
      }
    }

    function roadAsset() {
      const group = new THREE.Group();

      addBox(group, 1.55, 0.045, 1.55, 0x111827, 0, 0.025, 0);
      addBox(group, 0.09, 0.052, 1.18, 0xfacc15, 0, 0.055, 0);
      addBox(group, 1.15, 0.052, 0.08, 0xe5e7eb, 0, 0.058, 0);

      return group;
    }

    function schoolAsset() {
      const group = new THREE.Group();

      addBox(group, 1.05, 0.8, 0.85, 0x38bdf8, 0, 0.4, 0);
      addRoof(group, 0, 0.98, 0, 0x172554);
      addBox(group, 0.22, 0.32, 0.035, 0xf8fafc, 0, 0.32, 0.44);
      addWindows(group, 3, 0.58, 0.45);
      addBox(group, 1.2, 0.055, 1.0, 0x0f172a, 0, 0.03, 0);

      return group;
    }

    function hospitalAsset() {
      const group = new THREE.Group();

      addBox(group, 1.1, 0.9, 0.95, 0xf8fafc, 0, 0.45, 0);
      addBox(group, 0.16, 0.52, 0.035, 0xef4444, 0, 0.62, 0.49);
      addBox(group, 0.48, 0.14, 0.035, 0xef4444, 0, 0.62, 0.5);
      addWindows(group, 3, 0.34, 0.5, 0x38bdf8);
      addWindows(group, 3, 0.72, 0.5, 0x38bdf8);

      return group;
    }

    function factoryAsset() {
      const group = new THREE.Group();

      addBox(group, 1.25, 0.7, 0.9, 0xf97316, 0, 0.35, 0);
      addBox(group, 0.18, 1.0, 0.18, 0x475569, -0.38, 0.78, -0.2);
      addBox(group, 0.16, 0.82, 0.16, 0x475569, 0.38, 0.68, -0.2);
      addBox(group, 1.1, 0.14, 0.12, 0x1e293b, 0, 0.82, 0.38);
      addWindows(group, 4, 0.45, 0.46, 0xfef3c7);

      return group;
    }

    function transitAsset() {
      const group = new THREE.Group();

      addBox(group, 1.45, 0.055, 1.45, 0x111827, 0, 0.03, 0);
      addBox(group, 1.12, 0.5, 0.36, 0x94a3b8, 0, 0.28, 0);
      addBox(group, 1.3, 0.12, 0.52, 0xe2e8f0, 0, 0.6, 0);
      addBox(group, 0.08, 0.055, 1.25, 0xf8fafc, -0.35, 0.07, 0);
      addBox(group, 0.08, 0.055, 1.25, 0xf8fafc, 0.35, 0.07, 0);

      return group;
    }

    function baseAsset() {
      const group = new THREE.Group();

      addBox(group, 1.05, 0.65, 0.9, 0x64748b, 0, 0.32, 0);
      addBox(group, 0.3, 0.95, 0.3, 0x334155, 0.32, 0.74, 0.24);
      addRoof(group, 0.32, 1.25, 0.24, 0x111827);
      addBox(group, 1.25, 0.055, 1.05, 0x1e293b, 0, 0.03, 0);

      return group;
    }

    function parkAsset() {
      const group = new THREE.Group();

      addBox(group, 1.4, 0.06, 1.4, 0x166534, 0, 0.03, 0);

      const positions = [
        [-0.42, -0.34],
        [0.38, -0.32],
        [-0.32, 0.4],
        [0.36, 0.36],
      ];

      positions.forEach(([x, z]) => {
        addCylinder(group, 0.045, 0.38, 0x7c2d12, x, 0.21, z);

        const leaves = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 14, 14),
          mat(0x22c55e)
        );

        leaves.position.set(x, 0.5, z);
        group.add(leaves);
      });

      return group;
    }

    function createAsset(sector) {
      if (sector === "Road") return roadAsset();
      if (sector === "Education") return schoolAsset();
      if (sector === "Healthcare") return hospitalAsset();
      if (sector === "Industry") return factoryAsset();
      if (sector === "Infrastructure") return transitAsset();
      if (sector === "Military") return baseAsset();
      if (sector === "Environment") return parkAsset();
      return schoolAsset();
    }

    function key(x, z) {
      return `${x},${z}`;
    }

    function addAssetAt(sector, x, z) {
      const assetKey = key(x, z);

      if (buildings[assetKey]) {
        scene.remove(buildings[assetKey].mesh);
      }

      const mesh = createAsset(sector);
      mesh.position.set(x, 0, z);

      buildings[assetKey] = {
        x,
        z,
        sector,
        mesh,
      };

      scene.add(mesh);
    }

    function removeAt(x, z) {
      const assetKey = key(x, z);

      if (!buildings[assetKey]) {
        return;
      }

      scene.remove(buildings[assetKey].mesh);
      delete buildings[assetKey];
    }

    function getGridPoint(event) {
      const rect = canvas.getBoundingClientRect();

      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const hits = raycaster.intersectObject(ground);

      if (!hits.length) {
        return null;
      }

      const point = hits[0].point;

      return {
        x: Math.round(point.x),
        z: Math.round(point.z),
      };
    }

    function handleClick(event) {
      if (event.target.tagName === "BUTTON") {
        return;
      }

      const point = getGridPoint(event);

      if (!point) {
        return;
      }

      if (currentTool === "Delete") {
        removeAt(point.x, point.z);
      } else {
        addAssetAt(currentTool, point.x, point.z);
      }
    }

    function placeInvestmentAsset(sector) {
      const roadPath = [
        [-3, -3], [-2, -3], [-1, -3], [0, -3], [1, -3], [2, -3], [3, -3],
        [0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [0, 3],
      ];

      const assetPositions = [
        [-2, -2], [2, -2],
        [-3, 0], [-1, 0], [1, 0], [3, 0],
        [-2, 2], [0, 2], [2, 2],
        [-4, 4], [-2, 4], [0, 4], [2, 4], [4, 4],
      ];

      if (placementIndex < roadPath.length) {
        const [rx, rz] = roadPath[placementIndex];
        addAssetAt("Road", rx, rz);
      }

      const [x, z] = assetPositions[placementIndex % assetPositions.length];

      placementIndex += 1;
      addAssetAt(sector, x, z);
    }

    function saveCity() {
      const output = {};

      for (const assetKey in buildings) {
        output[assetKey] = {
          x: buildings[assetKey].x,
          z: buildings[assetKey].z,
          sector: buildings[assetKey].sector,
        };
      }

      localStorage.setItem(
        `statropolis_city_builder_${countryName || "default"}`,
        JSON.stringify(output)
      );

      alert("City saved.");
    }

    function clearCity() {
      for (const assetKey in buildings) {
        scene.remove(buildings[assetKey].mesh);
      }

      buildings = {};
      placementIndex = 0;
    }

    function loadCity() {
      clearCity();

      const saved = localStorage.getItem(
        `statropolis_city_builder_${countryName || "default"}`
      );

      if (!saved) {
        alert("No saved city found.");
        return;
      }

      const data = JSON.parse(saved);

      for (const assetKey in data) {
        addAssetAt(data[assetKey].sector, data[assetKey].x, data[assetKey].z);
      }
    }

    actionsRef.current = {
      setTool: (newTool) => {
        currentTool = newTool;
      },
      placeInvestmentAsset,
      saveCity,
      loadCity,
      clearCity,
    };

    canvas.addEventListener("click", handleClick);

    function handleResize() {
      const newWidth = wrapper.clientWidth;
      const newHeight = wrapper.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    }

    window.addEventListener("resize", handleResize);

    let animationId;

    function animate() {
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }

    animate();

    return () => {
      canvas.removeEventListener("click", handleClick);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      actionsRef.current = null;
    };
  }, [countryName]);

  useEffect(() => {
    if (!latestInvestment || !latestInvestment.sector) {
      return;
    }

    actionsRef.current?.placeInvestmentAsset(latestInvestment.sector);
  }, [latestInvestment]);

  function chooseTool(newTool) {
    setTool(newTool);
    actionsRef.current?.setTool(newTool);
  }

  return (
    <div className="builderGame" ref={wrapperRef}>
      <div className="builderCountryLabel">
        {countryName || "Selected Country"}
      </div>

      <div className="builderControls builderSectorControls">
        {Object.keys(sectorLabels).map((sector) => (
          <button
            key={sector}
            className={tool === sector ? "active" : ""}
            onClick={() => chooseTool(sector)}
          >
            {sectorLabels[sector]}
          </button>
        ))}

        <button
          className={tool === "Delete" ? "active dangerTool" : "dangerTool"}
          onClick={() => chooseTool("Delete")}
        >
          Delete
        </button>

        <button onClick={() => actionsRef.current?.saveCity()}>
          Save
        </button>

        <button onClick={() => actionsRef.current?.loadCity()}>
          Load
        </button>

        <button onClick={() => actionsRef.current?.clearCity()}>
          Clear
        </button>
      </div>

      <canvas ref={canvasRef} className="builderCanvas" />
    </div>
  );
}
