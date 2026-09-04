"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import type { PropagatedOrbitPosition } from "@/features/orbit";

type CameraCommand = Readonly<{
  sequence: number;
  action: "reset" | "zoom-in" | "zoom-out";
}>;
type LaunchSite = Readonly<{
  name: string;
  latitudeDegrees: number;
  longitudeDegrees: number;
}>;

function spherePosition(latitude: number, longitude: number, radius: number) {
  const phi = THREE.MathUtils.degToRad(90 - latitude);
  const theta = THREE.MathUtils.degToRad(longitude + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function createSchematicEarthTexture(colors: {
  ocean: string;
  land: string;
  boundary: string;
}) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 1_024;
  textureCanvas.height = 512;
  const context = textureCanvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = colors.ocean;
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
  context.fillStyle = colors.land;
  context.strokeStyle = colors.boundary;
  context.lineWidth = 3;
  const continents = [
    [
      [75, 130],
      [165, 75],
      [280, 110],
      [325, 175],
      [260, 225],
      [160, 205],
      [85, 245],
      [35, 190],
    ],
    [
      [385, 95],
      [485, 45],
      [625, 58],
      [682, 118],
      [650, 178],
      [535, 166],
      [452, 215],
      [365, 165],
    ],
    [
      [710, 265],
      [810, 225],
      [935, 265],
      [960, 340],
      [885, 415],
      [770, 395],
      [695, 330],
    ],
  ];
  for (const polygon of continents) {
    context.beginPath();
    polygon.forEach(([x, y], index) => {
      if (index === 0) context.moveTo(x!, y!);
      else context.lineTo(x!, y!);
    });
    context.closePath();
    context.fill();
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function OrbitGlobe3D({
  positions,
  launchSites,
  selectedId,
  paused,
  reducedMotion,
  cameraCommand,
  onSelect,
  onFailure,
}: {
  positions: readonly PropagatedOrbitPosition[];
  launchSites: readonly LaunchSite[];
  selectedId: string;
  paused: boolean;
  reducedMotion: boolean;
  cameraCommand: CameraCommand;
  onSelect: (id: string) => void;
  onFailure: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<{
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    markers: Map<string, THREE.Mesh>;
  } | null>(null);
  const initialPositionsRef = useRef(positions);
  const latestRef = useRef({ paused, reducedMotion, onSelect, onFailure });

  useEffect(() => {
    latestRef.current = { paused, reducedMotion, onSelect, onFailure };
  }, [onFailure, onSelect, paused, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
      });
    } catch {
      latestRef.current.onFailure();
      return;
    }
    const styles = getComputedStyle(document.documentElement);
    const color = (token: string) => styles.getPropertyValue(token).trim();
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(color("--color-cosmos"), 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.4, 4.2);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 2.4;
    controls.maxDistance = 7;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

    scene.add(
      new THREE.HemisphereLight(
        color("--color-signal"),
        color("--color-void"),
        2.2,
      ),
    );
    const keyLight = new THREE.DirectionalLight(color("--color-text"), 2.8);
    keyLight.position.set(3, 2, 4);
    scene.add(keyLight);

    const earthTexture = createSchematicEarthTexture({
      ocean: color("--color-surface"),
      land: color("--color-surface-raised"),
      boundary: color("--color-line"),
    });
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, window.devicePixelRatio > 1 ? 64 : 40, 32),
      new THREE.MeshStandardMaterial({
        color: color("--color-text"),
        map: earthTexture,
        roughness: 0.82,
        metalness: 0.08,
      }),
    );
    scene.add(earth);
    const grid = new THREE.Mesh(
      new THREE.SphereGeometry(1.006, 32, 16),
      new THREE.MeshBasicMaterial({
        color: color("--color-line"),
        wireframe: true,
        transparent: true,
        opacity: 0.32,
      }),
    );
    scene.add(grid);

    for (const site of launchSites) {
      const marker = new THREE.Mesh(
        new THREE.ConeGeometry(0.035, 0.1, 4),
        new THREE.MeshBasicMaterial({ color: color("--color-caution") }),
      );
      marker.position.copy(
        spherePosition(site.latitudeDegrees, site.longitudeDegrees, 1.045),
      );
      marker.lookAt(new THREE.Vector3(0, 0, 0));
      marker.userData.label = site.name;
      scene.add(marker);
    }

    const markers = new Map<string, THREE.Mesh>();
    for (const position of initialPositionsRef.current) {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 14, 10),
        new THREE.MeshBasicMaterial({ color: color("--color-orbit") }),
      );
      marker.position.copy(
        spherePosition(
          position.latitudeDegrees,
          position.longitudeDegrees,
          1.08 + Math.min(position.altitudeKm / 60_000, 0.42),
        ),
      );
      marker.userData.objectId = position.objectId;
      markers.set(position.objectId, marker);
      scene.add(marker);

      const orbitalRadius = marker.position.length();
      const path = new THREE.Mesh(
        new THREE.TorusGeometry(orbitalRadius, 0.0025, 5, 96),
        new THREE.MeshBasicMaterial({
          color: color("--color-orbit"),
          transparent: true,
          opacity: 0.14,
        }),
      );
      path.rotation.x = THREE.MathUtils.degToRad(position.latitudeDegrees + 90);
      scene.add(path);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const selectAtPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects([...markers.values()])[0];
      const objectId = hit?.object.userData.objectId as string | undefined;
      if (objectId) latestRef.current.onSelect(objectId);
    };
    canvas.addEventListener("pointerup", selectAtPointer);

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();
    runtimeRef.current = { camera, controls, markers };

    let frame = 0;
    const draw = () => {
      const state = latestRef.current;
      if (!state.paused && !state.reducedMotion) earth.rotation.y += 0.00045;
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    draw();

    const contextLost = (event: Event) => {
      event.preventDefault();
      latestRef.current.paused = true;
      latestRef.current.onFailure();
    };
    canvas.addEventListener("webglcontextlost", contextLost);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerup", selectAtPointer);
      canvas.removeEventListener("webglcontextlost", contextLost);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      earthTexture?.dispose();
      renderer.dispose();
      runtimeRef.current = null;
    };
  }, [launchSites]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const styles = getComputedStyle(document.documentElement);
    for (const position of positions) {
      const marker = runtime.markers.get(position.objectId);
      if (!marker) continue;
      marker.position.copy(
        spherePosition(
          position.latitudeDegrees,
          position.longitudeDegrees,
          1.08 + Math.min(position.altitudeKm / 60_000, 0.42),
        ),
      );
      const selected = position.objectId === selectedId;
      marker.scale.setScalar(selected ? 1.55 : 1);
      const material = marker.material as THREE.MeshBasicMaterial;
      material.color.setStyle(
        styles
          .getPropertyValue(selected ? "--color-signal" : "--color-orbit")
          .trim(),
      );
    }
  }, [positions, selectedId]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || cameraCommand.sequence === 0) return;
    if (cameraCommand.action === "reset") {
      runtime.camera.position.set(0, 0.4, 4.2);
      runtime.controls.target.set(0, 0, 0);
    } else {
      const factor = cameraCommand.action === "zoom-in" ? 0.82 : 1.22;
      runtime.camera.position.multiplyScalar(factor);
    }
    runtime.controls.update();
  }, [cameraCommand]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Interactive 3D Earth showing calculated orbital positions. Use the visible zoom and reset controls or drag to rotate. The synchronized object list is the keyboard-accessible equivalent."
      className="block h-full w-full touch-none"
    />
  );
}
