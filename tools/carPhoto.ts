// Studio pictures of a 3D car for the pick screen, in the same views as the sheet cut-outs (front
// three-quarter, rear three-quarter, side, top) against a sunset, for a car whose sheet can't be used
// (the '90s #90's sheet misspelled SCOFTI, so its pictures come from the lettered model instead).
// Dev server only: open /arcade/scofti500/tools/car-photo.html?car=car-90-nineties&view=0 at 1200x600
// and screenshot it once window.__ready is true. The car stays in its stock lime, which the game
// recolors to the picked paint like the other pictures.
import * as THREE from "three";
import { model } from "../src/models";

const q = new URLSearchParams(location.search);
const name = q.get("car") ?? "car-90-nineties";
const view = Number(q.get("view") ?? 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
document.body.append(renderer.domElement);

const scene = new THREE.Scene();
// the sunset the other car pictures sit in: orange low, purple, then blue up top
const sky = document.createElement("canvas");
sky.width = 2;
sky.height = 256;
const g = sky.getContext("2d")!;
const grad = g.createLinearGradient(0, 0, 0, 256);
grad.addColorStop(0, "#2b4fd8");
grad.addColorStop(0.45, "#a04cb0");
grad.addColorStop(0.75, "#ff7a3c");
grad.addColorStop(1, "#ffb15a");
g.fillStyle = grad;
g.fillRect(0, 0, 2, 256);
const skyTex = new THREE.CanvasTexture(sky);
skyTex.colorSpace = THREE.SRGBColorSpace;
scene.background = view === 4 ? new THREE.Color("#2a2a33") : skyTex;
// the sky in the glossy floor and the paint
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = skyTex.clone();
envTex.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = pmrem.fromEquirectangular(envTex).texture;

scene.add(new THREE.HemisphereLight("#ffd9b0", "#3a2a50", 1.6));
const sun = new THREE.DirectionalLight("#fff1dc", 2.4);
sun.position.set(-4, 6, 5);
sun.castShadow = true;
scene.add(sun);
const rim = new THREE.DirectionalLight("#ff9a50", 1.2);
rim.position.set(6, 2, -4);
scene.add(rim);

// a glossy dark floor, like the wet studio floor in the others
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: "#3a2c48", roughness: 0.38, metalness: 0.35 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// nose along -x, the driver's side +z (the same frames as the game)
const POSES: [number, number, number, number][] = [
  [-4.1, 1.2, 3.7, 0.5], // front three-quarter
  [4.1, 1.2, 3.7, 0.5], // rear three-quarter
  [0, 0.7, 5.1, 0.6], // side
  [0, 0, 0, 0],
  [0, 5.1, 0, 0], // top: nose left, the roof number upright (read from the right side, like the others)
];
const camera = new THREE.PerspectiveCamera(view === 4 ? 30 : 32, innerWidth / innerHeight, 0.1, 100);
const [x, y, z, look] = POSES[view];
camera.position.set(x, y, z);
if (view === 4) camera.up.set(0, 0, 1);
camera.lookAt(0, look, 0);

void model(name, 1.35).then((car) => {
  if (car) scene.add(car);
  renderer.render(scene, camera);
  (window as unknown as { __ready: boolean }).__ready = true;
});
