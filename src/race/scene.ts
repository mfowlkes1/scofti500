// The track in 3D, built for whichever track is set (track.ts): asphalt with a dark rubbered-in
// groove (Martinsvale's turns are concrete), the flat apron, pit road behind its wall, a white outside
// wall with a catch fence, packed grandstands with camera flashes, SCOFTI 500 painted on the infield
// grass and a scoring pylon showing the running order. At night (Martinsvale) light towers blaze
// round the outside under a starry sky; by day (Hotlanta) it's sun and blue sky.
// Each track's scene is built once and kept; the race shows the one it needs.
import * as THREE from "three";
import { racingLine } from "./ai";
import { buildInfield } from "./infield";
import { APRON, HALF, L, LINE_S, PIT, R, TRACK, TURNS, frame, heightAt } from "./track";

export type TrackScene = {
  /** everything in the track's scene, to show or hide */
  root: THREE.Group;
  /** make this the track on screen: its sky and fog */
  apply(scene: THREE.Scene): void;
  /** call each frame: flashes in the stands, the flag */
  update(t: number, flag: "green" | "white" | "checkered" | "yellow"): void;
  /** the scoring pylon: car numbers in running order */
  pylon(numbers: string[]): void;
  /** the big leaderboards in the infield */
  board(rows: { number: string; name: string; me: boolean }[], lap: string): void;
  /** follow this point with the shadow light */
  focus(x: number, z: number): void;
};

const rand = mulberry(7);
function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function tex(c: HTMLCanvasElement, repeat = true, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** a strip of surface between d0 and d1 from s0 to s1; y from the track's banking plus lift */
function ribbon(
  s0: number,
  s1: number,
  d0: number,
  d1: number,
  opts: { step?: number; lift?: number; u?: number; v?: number; flat?: boolean; across?: number; dAt?: (s: number) => [number, number] } = {},
): THREE.BufferGeometry {
  const step = opts.step ?? 2;
  const n = Math.max(1, Math.ceil((s1 - s0) / step));
  const across = opts.across ?? 1;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const s = s0 + ((s1 - s0) * i) / n;
    const [a, b] = opts.dAt ? opts.dAt(s) : [d0, d1];
    for (let j = 0; j <= across; j++) {
      const d = a + ((b - a) * j) / across;
      const f = frame(s, d);
      const y = (opts.flat ? 0 : heightAt(s, d)) + (opts.lift ?? 0);
      pos.push(f.x, y, f.z);
      uv.push(s / (opts.u ?? 8), (d - a) / (opts.v ?? b - a));
    }
  }
  const row = across + 1;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < across; j++) {
      const a = i * row + j;
      // wound so the surface faces up
      idx.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** an upright strip (a wall face) along d from s0 to s1, from the surface up `height` */
function wallStrip(s0: number, s1: number, d: number, height: number, opts: { step?: number; u?: number; base?: number; flatBase?: boolean } = {}): THREE.BufferGeometry {
  const step = opts.step ?? 2;
  const n = Math.max(1, Math.ceil((s1 - s0) / step));
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const s = s0 + ((s1 - s0) * i) / n;
    const f = frame(s, d);
    const y0 = (opts.flatBase ? 0 : heightAt(s, Math.min(d, HALF))) + (opts.base ?? 0);
    pos.push(f.x, y0, f.z, f.x, y0 + height, f.z);
    uv.push(s / (opts.u ?? 8), 0, s / (opts.u ?? 8), 1);
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---- textures ----

function asphalt(light: number): THREE.CanvasTexture {
  const [c, g] = canvas(512, 512);
  g.fillStyle = `rgb(${light},${light},${light + 3})`;
  g.fillRect(0, 0, 512, 512);
  const img = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 34 + (rand() < 0.02 ? 30 : 0);
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return tex(c);
}

function concrete(): THREE.CanvasTexture {
  const [c, g] = canvas(512, 512);
  g.fillStyle = "#74767a";
  g.fillRect(0, 0, 512, 512);
  const img = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 22;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  // slab joints
  g.strokeStyle = "rgba(40,40,44,0.7)";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, 1);
  g.lineTo(512, 1);
  g.moveTo(1, 0);
  g.lineTo(1, 512);
  g.stroke();
  return tex(c);
}

function grass(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  g.fillStyle = "#1f4a22";
  g.fillRect(0, 0, 256, 256);
  // mowing stripes
  g.fillStyle = "#245427";
  g.fillRect(0, 0, 128, 256);
  const img = g.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 18;
    img.data[i] += n;
    img.data[i + 1] += n * 1.3;
    img.data[i + 2] += n * 0.6;
  }
  g.putImageData(img, 0, 0);
  return tex(c);
}

/** the rubbered-in groove: dark in the middle, fading out to the sides */
function groove(): THREE.CanvasTexture {
  const [c, g] = canvas(64, 64);
  const grad = g.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, "rgba(8,8,10,0)");
  grad.addColorStop(0.5, "rgba(8,8,10,0.55)");
  grad.addColorStop(1, "rgba(8,8,10,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return tex(c);
}

/** the outside wall: white SAFER-barrier panels with SCOFTI 500 boards and a red stripe */
function wallTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(1024, 128);
  g.fillStyle = "#eef0f2";
  g.fillRect(0, 0, 1024, 128);
  g.fillStyle = "#c8161d";
  g.fillRect(0, 108, 1024, 20);
  g.fillStyle = "rgba(0,0,0,0.25)";
  for (let x = 0; x < 1024; x += 128) g.fillRect(x, 0, 2, 108);
  g.fillStyle = "#111";
  g.font = "64px 'Permanent Marker'";
  g.textBaseline = "middle";
  g.fillText("SCOFTI", 40, 56);
  g.font = "italic 62px 'Racing Sans One'";
  g.fillStyle = "#c8161d";
  g.fillText("500", 300, 58);
  g.fillStyle = "#111";
  g.font = "48px 'Lilita One'";
  g.fillText(TRACK.id.toUpperCase(), 560, 58);
  return tex(c);
}

/** catch fence: chain-link diamonds, see-through */
function fenceTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(64, 64);
  g.strokeStyle = "rgba(200,205,215,0.55)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, 32);
  g.lineTo(32, 0);
  g.lineTo(64, 32);
  g.lineTo(32, 64);
  g.closePath();
  g.stroke();
  return tex(c, true, true);
}

/** the crowd: rows of seats packed with fans in every colour */
function crowdTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(512, 512);
  g.fillStyle = "#1c1d24";
  g.fillRect(0, 0, 512, 512);
  const rows = 32;
  const shirts = ["#d63a3a", "#f2f2f2", "#2f5fd0", "#f0c419", "#ff7a1a", "#3aa856", "#8a4fd8", "#ff5fa8", "#222", "#888", "#b5e3ff"];
  for (let r = 0; r < rows; r++) {
    const y = (r + 0.5) * (512 / rows);
    g.fillStyle = "#2b2d36";
    g.fillRect(0, y + 4, 512, 3);
    for (let x = 2; x < 512; x += 7 + rand() * 4) {
      if (rand() < 0.12) continue;
      g.fillStyle = shirts[Math.floor(rand() * shirts.length)];
      g.fillRect(x, y - 3, 5, 7);
      g.fillStyle = ["#f1c9a5", "#c68e5d", "#8d5a3b", "#e8b48a"][Math.floor(rand() * 4)];
      g.fillRect(x + 1, y - 7, 3, 4);
    }
  }
  return tex(c);
}

/** the banks of lamps on a light tower */
function lampTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 64);
  g.fillStyle = "#222";
  g.fillRect(0, 0, 128, 64);
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 8; x++) {
      const grad = g.createRadialGradient(8 + x * 16, 8 + y * 16, 0, 8 + x * 16, 8 + y * 16, 8);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.6, "#fff6dc");
      grad.addColorStop(1, "#7a7466");
      g.fillStyle = grad;
      g.fillRect(x * 16 + 1, y * 16 + 1, 14, 14);
    }
  return tex(c, false);
}

function glowTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,250,235,1)");
  grad.addColorStop(0.15, "rgba(255,245,220,0.6)");
  grad.addColorStop(0.45, "rgba(255,235,200,0.12)");
  grad.addColorStop(1, "rgba(255,235,200,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return tex(c, false);
}

function skyTexture(night: boolean): THREE.CanvasTexture {
  const [c, g] = canvas(16, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  if (!night) {
    // a hot afternoon: deep blue overhead, hazy toward the horizon
    grad.addColorStop(0, "#1f5fbf");
    grad.addColorStop(0.35, "#4f8fdc");
    grad.addColorStop(0.48, "#bcd6ee");
    grad.addColorStop(0.5, "#e6eef2");
    grad.addColorStop(0.52, "#8a8f78");
    grad.addColorStop(1, "#4a5040");
    g.fillStyle = grad;
    g.fillRect(0, 0, 16, 512);
    return tex(c, false);
  }
  grad.addColorStop(0, "#03040b");
  grad.addColorStop(0.42, "#0a0b1e");
  grad.addColorStop(0.49, "#24183a");
  grad.addColorStop(0.505, "#4a2a45");
  grad.addColorStop(0.52, "#120f1c");
  grad.addColorStop(1, "#05050a");
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 512);
  return tex(c, false);
}

function logoTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(1024, 384);
  g.clearRect(0, 0, 1024, 384);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "200px 'Permanent Marker'";
  g.fillStyle = "rgba(245,245,245,0.85)";
  g.fillText("SCOFTI", 430, 170);
  g.font = "italic 190px 'Racing Sans One'";
  g.fillStyle = "rgba(210,28,36,0.9)";
  g.fillText("500", 860, 200);
  return tex(c, false);
}

// ---- the scene ----

/** build the current track's scene (call setTrack first) */
export async function buildTrack(): Promise<TrackScene> {
  await Promise.all(
    ["64px 'Permanent Marker'", "italic 64px 'Racing Sans One'", "48px 'Lilita One'"].map((f) => document.fonts.load(f).catch(() => null)),
  );
  const night = TRACK.night;
  const scene = new THREE.Group();
  const add = (g: THREE.BufferGeometry, m: THREE.Material, shadows = true) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.receiveShadow = shadows;
    scene.add(mesh);
    return mesh;
  };
  // the big track's infield is bigger: things in it scale up
  const big = Math.max(1, Math.min(2, R / 90));
  // where the front stretch ends and the backstretch runs, from the turns
  const [[t1a, t1b], [t3a, t3b]] = TURNS;

  // sky, and stars at night
  const background = new THREE.Color(night ? "#05050c" : "#8fb8e6");
  const fog = night ? new THREE.Fog("#0b0a16", 320, 1100) : new THREE.Fog("#c7d9ea", 700, 2600);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.MeshBasicMaterial({ map: skyTexture(night), side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(sky);
  if (night) {
    const n = 900;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(1 - rand() * 0.85);
      p.set([Math.sin(ph) * Math.cos(th) * 1400, Math.cos(ph) * 1400, Math.sin(ph) * Math.sin(th) * 1400], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: "#c9d4ff", size: 1.6, sizeAttenuation: false, fog: false })));
  }

  // the ground round the track, and the infield
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ color: night ? "#121318" : "#4d5638", roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.06;
  ground.receiveShadow = true;
  scene.add(ground);
  const grassTex = grass();
  grassTex.repeat.set(1 / 12, 1 / 12);
  {
    // the infield: everything inside the apron's edge
    const edge: THREE.Vector2[] = [];
    for (let k = 0; k < L; k += 3) {
      const f = frame(k, APRON);
      edge.push(new THREE.Vector2(f.x, -f.z));
    }
    const g = new THREE.ShapeGeometry(new THREE.Shape(edge));
    g.rotateX(-Math.PI / 2);
    g.translate(0, -0.02, 0);
    add(g, new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  }

  // the racing surface: asphalt, and concrete in the turns at Martinsvale
  const asph = new THREE.MeshStandardMaterial({ map: asphalt(78), roughness: 0.92 });
  const conc = TRACK.concreteTurns ? new THREE.MeshStandardMaterial({ map: concrete(), roughness: 0.85 }) : asph;
  for (const [a, b, m] of [
    [0, t1a, asph],
    [t1a, t1b, conc],
    [t1b, t3a, asph],
    [t3a, L, conc],
  ] as [number, number, THREE.Material][]) {
    add(ribbon(a, b, -HALF, HALF + 0.3, { step: 1.5, across: 4, u: 6, v: 6 }), m);
  }
  // the groove where everyone runs
  const grooveMat = new THREE.MeshBasicMaterial({ map: groove(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  add(ribbon(0, L, 0, 0, { step: 1.5, lift: 0.02, u: 40, dAt: (s) => [racingLine(s) - 2.4, racingLine(s) + 2.4] }), grooveMat, false);
  // the apron, and the white line along the bottom of the track
  add(ribbon(0, L, APRON, -HALF, { step: 2, flat: true, lift: 0.005, u: 6, v: 6 }), new THREE.MeshStandardMaterial({ map: asphalt(110), roughness: 0.9 }));
  const white = new THREE.MeshStandardMaterial({ color: "#e8e8e8", roughness: 0.6 });
  add(ribbon(0, L, -HALF, -HALF + 0.3, { step: 2, lift: 0.03 }), white, false);
  // red and white curbing down in the turns
  {
    const [c, g] = canvas(64, 16);
    g.fillStyle = "#e6e6e6";
    g.fillRect(0, 0, 64, 16);
    g.fillStyle = "#c8161d";
    g.fillRect(0, 0, 32, 16);
    const curb = new THREE.MeshStandardMaterial({ map: tex(c), roughness: 0.7 });
    for (const [a, b] of TURNS)
      add(ribbon(a + 10, b - 10, APRON - 1.2, APRON, { step: 1, flat: true, lift: 0.04, u: 4 }), curb, false);
  }
  // start/finish: a checkered stripe across the track
  {
    const [c, g] = canvas(16, 128);
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 2; x++) {
        g.fillStyle = (x + y) % 2 ? "#111" : "#f4f4f4";
        g.fillRect(x * 8, y * 8, 8, 8);
      }
    const t = tex(c, false);
    add(ribbon(LINE_S - 0.6, LINE_S + 0.6, -HALF, HALF, { step: 1.2, lift: 0.035, u: 1.2 }), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), false);
  }

  // the outside wall, its cap, and the catch fence above it
  // mirrored, so the boards read the right way from the track
  const wallTex = wallTexture();
  wallTex.repeat.set(-1, 1);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.7, side: THREE.DoubleSide });
  add(wallStrip(0, L, HALF + 0.3, 1.25, { step: 1.5, u: 11 }), wallMat);
  add(ribbon(0, L, HALF + 0.3, HALF + 0.9, { step: 2, lift: 1.25, flat: false }), new THREE.MeshStandardMaterial({ color: "#d9dbde", roughness: 0.8 }));
  const fenceTex = fenceTexture();
  fenceTex.repeat.set(1, 6);
  const fence = add(
    wallStrip(0, L, HALF + 0.85, 5, { step: 3, u: 0.7, base: 1.25 }),
    new THREE.MeshBasicMaterial({ map: fenceTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    false,
  );
  fence.renderOrder = 2;
  {
    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 6.3, 0.14), new THREE.MeshStandardMaterial({ color: "#8a8f98", metalness: 0.6, roughness: 0.4 }), Math.ceil(L / 6));
    const m = new THREE.Matrix4();
    for (let i = 0; i < posts.count; i++) {
      const s = i * 6;
      const f = frame(s, HALF + 0.9);
      m.makeTranslation(f.x, heightAt(s, HALF) + 1.25 + 3.15, f.z);
      posts.setMatrixAt(i, m);
    }
    scene.add(posts);
  }

  // pit road: its surface, the pit wall, the far wall and a box for each team
  const pitMat = new THREE.MeshStandardMaterial({ map: asphalt(92), roughness: 0.9 });
  add(ribbon(PIT.wallFrom - 14, PIT.wallTo + 14, PIT.inner - 0.4, APRON, { step: 2, flat: true, lift: 0.004, u: 6, v: 6 }), pitMat);
  const link = PIT.link + 5;
  add(ribbon(L - link, L, 0, 0, { step: 2, flat: true, lift: 0.004, u: 6, v: 6, dAt: (s) => [PIT.inner + ((L - s) / link) * (APRON - PIT.inner - 1), APRON] }), pitMat);
  add(ribbon(0, PIT.wallFrom - 13, PIT.inner - 0.4, APRON, { step: 2, flat: true, lift: 0.004, u: 6, v: 6 }), pitMat);
  add(
    ribbon(PIT.wallTo + 13, PIT.wallTo + 80, 0, 0, {
      step: 2,
      flat: true,
      lift: 0.004,
      u: 6,
      v: 6,
      dAt: (s) => [PIT.inner + ((s - PIT.wallTo - 13) / 67) * (APRON - PIT.inner - 1), APRON],
    }),
    pitMat,
  );
  const concWall = new THREE.MeshStandardMaterial({ color: "#c9cbcf", roughness: 0.85, side: THREE.DoubleSide });
  for (const d of [PIT.wallOut, PIT.wallIn]) add(wallStrip(PIT.wallFrom, PIT.wallTo, d, 1.0, { flatBase: true }), concWall);
  add(ribbon(PIT.wallFrom, PIT.wallTo, PIT.wallIn, PIT.wallOut, { flat: true, lift: 1.0 }), concWall);
  add(wallStrip(PIT.wallFrom - 14, PIT.wallTo + 14, PIT.inner - 0.4, 1.0, { flatBase: true }), concWall);
  // the box lines and a red tool cart behind each box
  {
    const boxes = new THREE.Group();
    const cart = new THREE.MeshStandardMaterial({ color: "#b3141b", roughness: 0.4, metalness: 0.3 });
    for (let i = 0; i < TRACK.field; i++) {
      const s = PIT.stall(i);
      for (const ds of [-4, 4]) {
        const m = new THREE.Mesh(ribbon(s + ds - 0.12, s + ds + 0.12, PIT.inner, PIT.lane - 1.2, { flat: true, lift: 0.01, step: 0.24 }), white);
        boxes.add(m);
      }
      const f = frame(s, PIT.inner - 1.6);
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.8), cart);
      b.position.set(f.x, 0.6, f.z);
      b.castShadow = true;
      boxes.add(b);
    }
    scene.add(boxes);
  }

  // grandstands: packed, rising away from the track, all the way round the outside
  const crowd = crowdTexture();
  const standMat = new THREE.MeshStandardMaterial({ map: crowd, roughness: 1, side: THREE.DoubleSide });
  const backMat = new THREE.MeshStandardMaterial({ color: "#1a1b22", roughness: 1, side: THREE.DoubleSide });
  const flashes: THREE.Vector3[] = [];
  const stand = (s0: number, s1: number, d0: number, d1: number, y0: number, y1: number) => {
    const g = ribbon(s0, s1, d0, d1, { step: 3, flat: true, across: 1, u: 14, v: (d1 - d0) / 3 });
    const p = g.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setY(i, i % 2 === 0 ? y0 : y1);
    g.computeVertexNormals();
    add(g, standMat, false);
    add(wallStrip(s0, s1, d1, y1 + 1, { flatBase: true, step: 3 }), backMat, false);
    for (let i = 0; i < (s1 - s0) * 0.5; i++) {
      const s = s0 + rand() * (s1 - s0);
      const k = rand();
      const f = frame(s, d0 + (d1 - d0) * k);
      flashes.push(new THREE.Vector3(f.x, y0 + (y1 - y0) * k + 0.6, f.z));
    }
  };
  stand(-20, t1a + 20, HALF + 6, HALF + 50, 3, 30); // the big front stretch stands
  stand(t1a + 25, t1b - 25, HALF + 8, HALF + 34, 2.5, 17);
  stand(t1b + 10, t3a - 10, HALF + 6, HALF + 30, 2.5, 15);
  stand(t3a + 25, t3b - 25, HALF + 8, HALF + 34, 2.5, 17);
  // a press box on top of the front stretch stands, windows lit
  {
    const f = frame(LINE_S, HALF + 54);
    const press = new THREE.Mesh(new THREE.BoxGeometry(110, 8, 7), new THREE.MeshStandardMaterial({ color: "#20222a", roughness: 0.6 }));
    press.position.set(f.x, 34, f.z);
    scene.add(press);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(106, 3.2), new THREE.MeshBasicMaterial({ color: "#ffe9b8" }));
    win.position.set(f.x, 34.6, f.z - 3.55);
    win.rotation.y = Math.PI;
    scene.add(win);
  }
  // camera flashes twinkling in the crowd
  const flashGeo = new THREE.BufferGeometry();
  const flashPos = new Float32Array(60 * 3);
  flashGeo.setAttribute("position", new THREE.BufferAttribute(flashPos, 3));
  const flashPts = new THREE.Points(flashGeo, new THREE.PointsMaterial({ color: "#ffffff", size: 3, sizeAttenuation: false, transparent: true, depthWrite: false }));
  scene.add(flashPts);

  // light towers all round the outside, and a few in the infield
  const lamp = new THREE.MeshBasicMaterial({ map: lampTexture(), toneMapped: false });
  const pole = new THREE.MeshStandardMaterial({ color: "#5d626b", metalness: 0.7, roughness: 0.4 });
  const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), color: "#fff3d6", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const tower = (x: number, z: number, h: number) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, h, 8), pole);
    p.position.set(x, h / 2, z);
    scene.add(p);
    const head = new THREE.Group();
    head.position.set(x, h + 2, z);
    head.lookAt(0, h * 0.4, 0);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), lamp);
    head.add(panel);
    const back = new THREE.Mesh(new THREE.BoxGeometry(9.4, 4.9, 0.5), pole);
    back.position.z = -0.3;
    head.add(back);
    scene.add(head);
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(34);
    glow.position.set(x, h + 2, z);
    glow.position.lerp(new THREE.Vector3(0, h + 2, 0), 0.01);
    scene.add(glow);
  };
  // (only at night: a day race needs none)
  if (night) {
    for (let i = 0; i < 18; i++) {
      const s = (i / 18) * L + 20;
      const f = frame(s, HALF + 58);
      tower(f.x, f.z, 42);
    }
    for (const x of [-60, 0, 60]) tower(x, 0, 30);
  }

  // SCOFTI 500 painted on the infield grass
  {
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(120 * big, 45 * big), new THREE.MeshStandardMaterial({ map: logoTexture(), transparent: true, roughness: 1, depthWrite: false }));
    logo.rotation.x = -Math.PI / 2;
    logo.position.set(0, 0.02, 6);
    scene.add(logo);
  }

  // the scoring pylon in the infield, off the front straight
  const [pc, pg] = canvas(128, 1024);
  const pylonTex = tex(pc, false);
  {
    const f = frame(LINE_S + 78, -32);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3.2, 26, 3.2), new THREE.MeshStandardMaterial({ color: "#1a1b20", roughness: 0.6 }));
    tower.position.set(f.x, 13, f.z);
    scene.add(tower);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 23), new THREE.MeshBasicMaterial({ map: pylonTex, toneMapped: false }));
    face.position.set(f.x, 13.5, f.z + 1.62);
    scene.add(face);
    const face2 = face.clone();
    face2.position.z = f.z - 1.62;
    face2.rotation.y = Math.PI;
    scene.add(face2);
  }

  // the flag stand over the wall at the line
  const flagCanvas = canvas(64, 48);
  const flagTex = tex(flagCanvas[0], false);
  let flagShown = "";
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6, 8, 1), new THREE.MeshBasicMaterial({ map: flagTex, side: THREE.DoubleSide, toneMapped: false }));
  {
    const f = frame(LINE_S, HALF + 2.5);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 3), pole);
    stand.position.set(f.x, 7.5, f.z);
    scene.add(stand);
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 7.5), pole);
    legs.position.set(f.x, 3.75, f.z + 1);
    scene.add(legs);
    flag.position.set(f.x - 1.3, 9.2, f.z - 1.6);
    scene.add(flag);
  }

  // the infield: haulers, motorhomes, fans and the big leaderboards
  const infield = buildInfield(scene, night);

  // the light: at night a cool sky glow, and the towers' glare as one big light that follows your
  // car (for its shadows); by day a bright sky and a hot sun high in the southwest
  scene.add(night ? new THREE.HemisphereLight("#b9c6ff", "#2a2a33", 1.1) : new THREE.HemisphereLight("#d6e6ff", "#6b6a52", 1.5));
  const sun = new THREE.DirectionalLight(night ? "#fff4e0" : "#fff1d6", night ? 2.2 : 3.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -45;
  sc.right = sc.top = 45;
  sc.near = 1;
  sc.far = 200;
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  return {
    root: scene,
    apply(world) {
      world.background = background;
      world.fog = fog;
    },
    board: infield.board,
    update(t, state) {
      infield.update(t);
      // a few flashes going off at any moment
      for (let i = 0; i < 60; i++) {
        const live = Math.sin(t * (3 + (i % 7)) + i * 12.9) > 0.97;
        const p = flashes[(i * 37 + Math.floor(t * 0.7 + i) * 13) % flashes.length];
        flashPos.set(live && p ? [p.x, p.y, p.z] : [0, -100, 0], i * 3);
      }
      flashGeo.getAttribute("position").needsUpdate = true;
      // wave the flag
      if (flagShown !== state) {
        flagShown = state;
        const g = flagCanvas[1];
        if (state === "checkered") {
          for (let y = 0; y < 6; y++)
            for (let x = 0; x < 8; x++) {
              g.fillStyle = (x + y) % 2 ? "#111" : "#f4f4f4";
              g.fillRect(x * 8, y * 8, 8, 8);
            }
        } else {
          g.fillStyle = { green: "#19c43b", white: "#f4f4f4", yellow: "#ffd400" }[state];
          g.fillRect(0, 0, 64, 48);
        }
        flagTex.needsUpdate = true;
      }
      const pos = flag.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setZ(i, Math.sin(t * 9 + x * 3) * 0.18 * (x + 1.1));
      }
      pos.needsUpdate = true;
    },
    pylon(numbers) {
      pg.fillStyle = "#07070a";
      pg.fillRect(0, 0, 128, 1024);
      pg.textAlign = "center";
      pg.textBaseline = "middle";
      pg.fillStyle = "#ffd400";
      pg.font = "bold 46px 'Lilita One'";
      pg.fillText("POS", 64, 40);
      numbers.forEach((n, i) => {
        pg.fillStyle = i === 0 ? "#ffd400" : "#f4f4f4";
        pg.font = "italic 92px 'Racing Sans One'";
        pg.fillText(n, 64, 130 + i * 112);
      });
      pylonTex.needsUpdate = true;
    },
    focus(x, z) {
      sun.position.set(x + (night ? 30 : -40), night ? 80 : 90, z + (night ? 20 : 35));
      sun.target.position.set(x, 0, z);
    },
  };
}
