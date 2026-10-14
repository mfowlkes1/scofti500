// The pit garage in 3D, built from scofti-offroad's garage room (Michael, 2026-10-12: "no like a
// garage, where we will offer upgrades", pointing at offroad's): a bright white shop with a glossy
// floor, diamond plate along the walls, hex lights on the ceiling, a black feature wall with SCOFTI
// 500 in neon, red tool chests, a rack of race tires, and your car on a turntable in the middle,
// in the colour you picked. It turns slowly on its own; drag to spin it. It only draws while the
// garage is showing.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { loadCar } from "./carModel";
import { addNumber, addTrim } from "./carNumber";
import { paintedUrl } from "./paint";
import { carUrl, type Car } from "./roster";
import { boxLeft, pointerX } from "./turn";

const W = 24; // wall to wall (x)
const D = 40; // back wall to front wall (z)
const H = 11;
const BACK = -9; // back wall z, from the turntable

export type Garage = {
  show(on: boolean): void;
  setCar(car: Car, paintId: string): void;
};

export function createGarage(canvas: HTMLCanvasElement): Garage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#e9ecef");
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  buildRoom(scene);

  // the turntable and what's on it
  const table = new THREE.Group();
  scene.add(table);
  let carObj: THREE.Object3D | null = null;
  let want = "";

  async function setCar(car: Car, paintId: string): Promise<void> {
    const key = `${car.id}|${paintId}`;
    want = key;
    // the garage lamps are bright enough to wash colours out (the hooter went pale yellow), so the
    // paint sits darker in here
    const obj = (await loadCar(car, paintId, { brightness: 0.5 })) ?? (await pictureStand(car, paintId));
    // a later pick arrived while this one loaded
    if (want !== key) return;
    // a black car keeps white trim: its number on the doors and roof, and pinstripes
    if (paintId === "black" && obj instanceof THREE.Group && obj.children.length) {
      addNumber(obj, car.id, car.number, "black");
      addTrim(obj, car.id);
    }
    if (carObj) table.remove(carObj);
    carObj = obj;
    table.add(obj);
  }

  // turning: slowly on its own, or with a drag
  let spin = 0;
  let dragX: number | null = null;
  let idle = 0;
  canvas.addEventListener("pointerdown", (e) => {
    dragX = pointerX(e);
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (dragX === null) return;
    spin += (pointerX(e) - dragX) * 0.01;
    dragX = pointerX(e);
    idle = 0;
  });
  const drop = () => (dragX = null);
  canvas.addEventListener("pointerup", drop);
  canvas.addEventListener("pointercancel", drop);

  function resize(): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tall = h > w;
    camera.fov = tall ? 52 : 38;
    // wide: the car sits left of the upgrade panel; tall: up top, the panel under it
    if (tall) {
      camera.clearViewOffset();
      camera.position.set(0, 3.6, 12.5);
      camera.lookAt(0, -1.6, 0);
    } else {
      // the car in the middle of the room the panel leaves it, however wide the panel is on this
      // screen (on a sideways phone the panel covered half the car: Michael, 2026-10-13)
      camera.position.set(-0.2, 2.3, 10.5);
      camera.lookAt(0, 0.7, 0);
      const panel = document.querySelector(".garage-panel");
      const room = panel && panel.clientWidth ? boxLeft(panel) : w * 0.6;
      camera.setViewOffset(w, h, w / 2 - room / 2, 0, w, h);
    }
    camera.updateProjectionMatrix();
  }

  let running = false;
  let last = 0;
  function frame(t: number): void {
    if (!running) return;
    const dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    idle += dt;
    if (dragX === null && idle > 1.5) spin += dt * 0.35;
    table.rotation.y = spin;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  addEventListener("resize", resize);
  return {
    show(on) {
      if (on === running) return;
      running = on;
      if (on) {
        resize();
        last = performance.now();
        requestAnimationFrame(frame);
      }
    },
    setCar: (car, paintId) => void setCar(car, paintId),
  };
}

// A car with no 3D model yet: its picture on a stand on the turntable.
async function pictureStand(car: Car, paintId: string): Promise<THREE.Object3D> {
  const url = await paintedUrl(carUrl(car), car.key, paintId);
  const tex = await new THREE.TextureLoader().loadAsync(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.5), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false }));
  board.position.y = 1.6;
  g.add(board);
  return g;
}

function buildRoom(scene: THREE.Scene): void {
  const room = new THREE.Group();
  scene.add(room);
  const white = new THREE.MeshStandardMaterial({ color: "#f3f4f6", roughness: 0.6 });
  const black = new THREE.MeshStandardMaterial({ color: "#151617", roughness: 0.35, metalness: 0.4 });
  const red = new THREE.MeshStandardMaterial({ color: "#c8161d", roughness: 0.3, metalness: 0.3 });
  const glow = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    room.add(b);
    return b;
  };

  // the floor: light grey epoxy in big tiles, polished so the lights shine in it
  const tiles = document.createElement("canvas");
  tiles.width = tiles.height = 256;
  const g = tiles.getContext("2d")!;
  g.fillStyle = "#d4d8dd";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#b9bec4";
  g.lineWidth = 4;
  g.strokeRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(tiles);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(W / 2.5, D / 2.5);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.16, metalness: 0.15 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.005, BACK + D / 2);
  floor.receiveShadow = true;
  room.add(floor);

  // the turntable: brushed steel with a glowing white ring
  const steel = new THREE.MeshStandardMaterial({ color: "#b8bdc3", metalness: 0.85, roughness: 0.28 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.7, 0.06, 64), steel);
  disc.position.y = -0.03;
  disc.receiveShadow = true;
  room.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.65, 0.05, 8, 96), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  room.add(ring);

  // walls and ceiling, diamond plate along the bottom with a red light strip on top
  const front = BACK + D;
  box(W, H, 0.2, white, 0, H / 2, BACK - 0.1);
  box(W, H, 0.2, white, 0, H / 2, front + 0.1);
  for (const s of [-1, 1]) box(0.2, H, D, white, s * (W / 2 + 0.1), H / 2, BACK + D / 2);
  box(W, 0.2, D, white, 0, H + 0.1, BACK + D / 2);
  const PLATE = 1.4;
  const plate = (len: number) => new THREE.MeshStandardMaterial({ map: diamondPlate(len / 1.2, PLATE / 1.2), metalness: 0.9, roughness: 0.32, color: "#c9cdd2" });
  const neonRed = new THREE.MeshBasicMaterial({ color: "#ff2a2a", toneMapped: false });
  box(W, PLATE, 0.05, plate(W), 0, PLATE / 2, BACK + 0.03);
  box(W, 0.07, 0.08, neonRed, 0, PLATE + 0.04, BACK + 0.04);
  for (const s of [-1, 1]) {
    box(0.05, PLATE, D, plate(D), s * (W / 2 - 0.03), PLATE / 2, BACK + D / 2);
    box(0.08, 0.07, D, neonRed, s * (W / 2 - 0.04), PLATE + 0.04, BACK + D / 2);
  }

  // the feature wall: matte black, white light slats down each side, SCOFTI 500 in neon
  const feature = new THREE.MeshStandardMaterial({ color: "#050505", roughness: 0.95 });
  box(13, H - PLATE - 0.1, 0.06, feature, 0, PLATE + 0.1 + (H - PLATE - 0.1) / 2, BACK + 0.05);
  for (const s of [-1, 1])
    for (let k = 0; k < 3; k++) box(0.08, H - PLATE - 1.4, 0.04, glow, s * (6.0 - k * 0.35), PLATE + 0.7 + (H - PLATE - 1.4) / 2, BACK + 0.09);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.1), new THREE.MeshBasicMaterial({ map: neonSign(), transparent: true, toneMapped: false }));
  sign.position.set(0, 4.8, BACK + 0.1);
  room.add(sign);

  // a checkered flag on the back wall, either side of the feature wall
  for (const s of [-1, 1]) {
    const flagGeo = new THREE.PlaneGeometry(3.6, 2.4, 24, 1);
    const fp = flagGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < fp.count; i++) fp.setZ(i, Math.sin((fp.getX(i) + 1.8) * 2.2) * 0.06);
    flagGeo.computeVertexNormals();
    const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ map: checkered(), roughness: 0.8, side: THREE.DoubleSide }));
    flag.position.set(s * 9.2, 5, BACK + 0.15);
    room.add(flag);
  }

  // spotlight beams from the ceiling onto the turntable
  const beam = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (const [x, z] of [[-3.2, -1.2], [3.2, -1.2], [0, 2.6]]) {
    const len = H - 0.4;
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 2.2, len, 24, 1, true), beam);
    cone.position.set(x, len / 2, z);
    cone.rotation.set(z * 0.04, 0, -x * 0.04);
    room.add(cone);
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16), black);
    can.position.set(x, H - 0.2, z);
    room.add(can);
  }

  // hex lights on the ceiling
  const hexR = 1.25;
  const bar = new THREE.BoxGeometry(hexR, 0.06, 0.1);
  const bars: THREE.Matrix4[] = [];
  const rowStep = hexR * Math.sqrt(3);
  for (let row = -3; row <= 3; row++)
    for (let col = -4; col <= 4; col++) {
      const cx = col * hexR * 1.5;
      const cz = row * rowStep + (col % 2 ? rowStep / 2 : 0) + 1.5;
      if (Math.abs(cx) > W / 2 - 1.5 || cz < BACK + 1.5 || cz > front - 1.5) continue;
      for (let k = 0; k < 6; k++) {
        const a = (k + 0.5) * (Math.PI / 3);
        const m = new THREE.Matrix4().makeRotationY(-a + Math.PI / 2);
        m.setPosition(cx + Math.cos(a) * hexR * 0.866, H - 0.05, cz + Math.sin(a) * hexR * 0.866);
        bars.push(m);
      }
    }
  const hex = new THREE.InstancedMesh(bar, glow, bars.length);
  bars.forEach((m, i) => hex.setMatrixAt(i, m));
  room.add(hex);

  // left wall: red rolling tool chests with silver drawer pulls
  const silver = new THREE.MeshStandardMaterial({ color: "#d0d4d9", metalness: 0.9, roughness: 0.25 });
  for (let i = 0; i < 4; i++) {
    const z = BACK + 2.5 + i * 1.6;
    box(0.8, 1.2, 1.5, red, -W / 2 + 0.45, 0.6, z);
    for (let d = 0; d < 4; d++) box(0.03, 0.04, 1.0, silver, -W / 2 + 0.86, 0.25 + d * 0.27, z);
  }
  box(0.9, 0.06, 6.4, silver, -W / 2 + 0.48, 1.23, BACK + 4.9);

  // right wall: a rack of slick race tires, stacked four high
  const tire = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 24);
  const rubber = new THREE.MeshStandardMaterial({ color: "#1b1b1b", roughness: 0.85 });
  for (let i = 0; i < 6; i++)
    for (let k = 0; k < 4; k++) {
      const t = new THREE.Mesh(tire, rubber);
      t.position.set(W / 2 - 0.6, 0.16 + k * 0.31, BACK + 2 + i * 1.0);
      room.add(t);
    }

  // the room's own light: bright and white, from the ceiling
  room.add(new THREE.HemisphereLight("#ffffff", "#c9ccd1", 1.1));
  for (const [x, z] of [[-5, -2], [5, -2], [0, 5]]) {
    const p = new THREE.PointLight("#ffffff", 70, 30, 1.6);
    p.position.set(x, H - 0.6, z);
    room.add(p);
  }
  const key = new THREE.DirectionalLight("#ffffff", 1.2);
  key.position.set(3, 9, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  for (const side of ["left", "right", "top", "bottom"] as const) key.shadow.camera[side] = side === "left" || side === "bottom" ? -5 : 5;
  room.add(key);
}

function diamondPlate(rx: number, ry: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const base = g.createLinearGradient(0, 0, 256, 256);
  base.addColorStop(0, "#9aa0a6");
  base.addColorStop(0.5, "#c6cbd0");
  base.addColorStop(1, "#8f959b");
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  const step = 32;
  for (let row = 0; row < 256 / step + 1; row++)
    for (let col = 0; col < 256 / step + 1; col++) {
      g.save();
      g.translate(col * step + (row % 2 ? step / 2 : 0), row * step);
      g.rotate(row % 2 ? Math.PI / 4 : -Math.PI / 4);
      g.fillStyle = "#e8ebee";
      g.fillRect(-11, -2.5, 22, 5);
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fillRect(-11, 2.5, 22, 1.5);
      g.restore();
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 4;
  return t;
}

// SCOFTI in white neon brush letters (the brush font only ever spells SCOFTI), 500 in red neon under it.
function neonSign(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 320;
  const g = c.getContext("2d")!;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    g.clearRect(0, 0, c.width, c.height);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = "#ffffff";
    g.shadowBlur = 30;
    g.fillStyle = "#ffffff";
    g.font = '170px "Permanent Marker", cursive';
    for (let k = 0; k < 2; k++) g.fillText("SCOFTI", 512, 120);
    g.shadowColor = "#ff2a2a";
    g.fillStyle = "#ff5050";
    g.font = 'italic 110px "Racing Sans One", system-ui, sans-serif';
    for (let k = 0; k < 2; k++) g.fillText("500", 512, 255);
    t.needsUpdate = true;
  };
  draw();
  // draw again once the fonts are in, or the sign bakes in a fallback face
  Promise.all([document.fonts.load('170px "Permanent Marker"'), document.fonts.load('110px "Racing Sans One"')]).then(draw);
  return t;
}

function checkered(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 360;
  c.height = 240;
  const g = c.getContext("2d")!;
  const s = 30;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 12; x++) {
      g.fillStyle = (x + y) % 2 ? "#111" : "#fafafa";
      g.fillRect(x * s, y * s, s, s);
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
