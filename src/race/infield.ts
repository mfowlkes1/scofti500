// The infield on race night: the teams' haulers parked in a row off the backstretch in their team
// colors, fans' motorhomes packed into both ends with awnings, string lights, flags and grills going,
// pickups parked between them, people everywhere (fans on the motorhome roofs; the pit crews are in crew.ts),
// and a giant video leaderboard at each end facing down the straights (with an ad now and then, ads.ts).
// Built from simple shapes; if Meshy models turn up in public/models (hauler, motorhome, pickup) they
// take the place of the hand-built ones.
import * as THREE from "three";
import { model } from "../models";
import { PAINTS } from "../paint";
import { CARS } from "../roster";
import { AD_EVERY, AD_FOR, drawAd, warmAds } from "./ads";
import { RIVALS } from "./rivals";
import { APRON, HALF, LINE_S, PIT, R, S, frame, project } from "./track";

export type Infield = {
  update(t: number): void;
  /** the leaderboards: the running order and the lap */
  board(rows: { number: string; name: string; me: boolean }[], lap: string): void;
};

const rand = mulberry(31);
function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}
function tex(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const SHIRTS = ["#d63a3a", "#f2f2f2", "#2f5fd0", "#f0c419", "#ff7a1a", "#3aa856", "#8a4fd8", "#ff5fa8", "#26272e", "#7d8088", "#b5e3ff", "#5a3a22"];
const SKIN = ["#f1c9a5", "#c68e5d", "#8d5a3b", "#e8b48a"];
const TRUCK_PAINT = ["#f2f2f2", "#1b1c22", "#b3141b", "#1f4fb8", "#7d8088", "#c9a227", "#2d5a2d", "#5b2c1a"];

export function buildInfield(scene: THREE.Object3D, night: boolean): Infield {
  const root = new THREE.Group();
  scene.add(root);
  /** the infield's turn ends: the middle of each turn */
  const ENDS = [new THREE.Vector2(S / 2, 0), new THREE.Vector2(-S / 2, 0)];
  // the big track's infield is bigger: another ring of motorhomes, and bigger boards
  const big = R > 100;
  const std = (color: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.castShadow = true;
    b.receiveShadow = true;
    parent.add(b);
    return b;
  };
  const tireMat = std("#141414", { roughness: 0.9 });
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 12).rotateX(Math.PI / 2);
  const wheels = (parent: THREE.Object3D, xs: number[], half: number, r = 0.5) => {
    for (const x of xs)
      for (const z of [-half, half]) {
        const w = new THREE.Mesh(wheelGeo, tireMat);
        w.scale.setScalar(r / 0.5);
        w.position.set(x, r, z);
        parent.add(w);
      }
  };
  const glass = std("#0d1420", { roughness: 0.15, metalness: 0.4 });
  const chrome = std("#d8dce2", { roughness: 0.2, metalness: 0.9 });
  // lit windows at night; by day they're just glass catching the sky
  const lit = night ? new THREE.MeshBasicMaterial({ color: "#ffd99a" }) : std("#9fb6cc", { roughness: 0.15, metalness: 0.3 });

  // people stand where they're put; some bounce (cheering), all as two instanced meshes
  const people: { x: number; y: number; z: number; color: string; bounce: number }[] = [];
  const person = (x: number, y: number, z: number, color = pick(SHIRTS), bounce = rand() < 0.3 ? rand() : 0) => people.push({ x, y, z, color, bounce });
  const crowdAround = (x: number, z: number, n: number, spread: number, y = 0) => {
    for (let i = 0; i < n; i++) person(x + (rand() - 0.5) * spread, y, z + (rand() - 0.5) * spread);
  };

  // ---- the teams' haulers: one per rival plus a spare, in a row off the backstretch ----
  const teams = RIVALS.map((r) => ({
    color: PAINTS.find((p) => p.id === r.paint)?.swatch.startsWith("#") ? PAINTS.find((p) => p.id === r.paint)!.swatch : "#4b5530",
    number: r.number,
    name: r.name,
  }));
  teams.push({ color: "#111", number: "", name: "SCOFTI 500" });
  const haulers: THREE.Group[] = [];
  teams.forEach((team, i) => {
    const g = new THREE.Group();
    // the trailer's sides: team color, the number big, the driver's name
    const [c, x] = canvas(1024, 256);
    x.fillStyle = team.color;
    x.fillRect(0, 0, 1024, 256);
    x.fillStyle = "rgba(0,0,0,0.25)";
    x.fillRect(0, 200, 1024, 56);
    const ink = ["#f2f2f2", "#ffd400", "#f0c419"].includes(team.color) ? "#111" : "#fff";
    x.fillStyle = ink;
    x.textBaseline = "middle";
    x.font = "italic 190px 'Racing Sans One'";
    x.fillText(team.number, 40, 110);
    x.font = "84px 'Lilita One'";
    x.fillText(team.name.toUpperCase(), team.number ? 300 : 60, 100);
    x.font = "40px 'Permanent Marker'";
    x.fillText("SCOFTI RACING", team.number ? 304 : 64, 170);
    const side = new THREE.MeshStandardMaterial({ map: tex(c), roughness: 0.45 });
    const paint = std(team.color, { roughness: 0.35 });
    // trailer along +x, cab at the +x end
    const trailer = new THREE.Mesh(new THREE.BoxGeometry(16, 3.6, 2.6), [paint, paint, paint, paint, side, side]);
    trailer.position.set(-3, 2.5, 0);
    trailer.castShadow = trailer.receiveShadow = true;
    g.add(trailer);
    wheels(g, [-9.5, -8.3, 3.2], 1.0);
    box(1.8, 2.4, 2.5, paint, 7.2, 2.3, 0, g); // sleeper and cab
    box(1.3, 1.5, 2.4, paint, 8.7, 1.85, 0, g); // the cab's nose
    box(1.4, 1.2, 2.3, paint, 9.8, 1.5, 0, g); // the long hood
    box(0.08, 1.0, 1.4, chrome, 10.52, 1.45, 0, g); // grille
    box(0.06, 0.8, 2.2, glass, 8.1, 2.95, 0, g).rotation.z = 0.25; // windshield
    box(2.6, 0.12, 2.0, std("#2a2b30"), 6.5, 0.9, 0, g); // fifth wheel deck
    wheels(g, [6.3, 7.4, 9.6], 1.05);
    for (const z of [-1.0, 1.0]) {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.2, 8), chrome);
      stack.position.set(7.95, 3.1, z);
      g.add(stack);
    }
    // the lift gate down at the back, lit, with the crew working round it
    box(0.12, 0.08, 2.4, chrome, -11.2, 1.0, 0, g);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), lit);
    glow.position.set(-11.02, 2.5, 0);
    glow.rotation.y = -Math.PI / 2;
    g.add(glow);
    // parked at an angle, noses toward the infield's middle
    const hx = -87.5 + i * 25;
    g.position.set(hx, 0, -(R - 32));
    g.rotation.y = -0.45;
    root.add(g);
    haulers.push(g);
    // the crew at the back of the hauler, in team colors
    const back = new THREE.Vector3(-12.5, 0, 0).applyEuler(g.rotation).add(g.position);
    for (let k = 0; k < 4; k++) person(back.x + (rand() - 0.5) * 3, 0, back.z + (rand() - 0.5) * 3, team.color, 0);
  });

  // ---- fans' motorhomes, packed into both ends ----
  const rvBody = std("#eceef0", { roughness: 0.5 });
  const stripeMats = ["#2f3440", "#7a1e1e", "#1e3f7a", "#5a4a2a", "#2d5a2d"].map((c) => std(c));
  const awnings = ["#c8161d", "#1f62e8", "#e8b020", "#1fae3a", "#e8e8e8", "#7b3fe0"].map((c) => std(c, { roughness: 0.8, side: THREE.DoubleSide }));
  const bulbs: number[] = [];
  const bulbColors: number[] = [];
  const fires: THREE.Vector3[] = [];
  const flags: THREE.Mesh[] = [];
  const rvs: THREE.Group[] = [];
  const motorhome = (x: number, z: number, yaw: number) => {
    const g = new THREE.Group();
    box(12, 3.0, 2.55, rvBody, 0, 1.85, 0, g);
    box(12.02, 0.35, 2.57, pick(stripeMats), 0, 1.1, 0, g);
    box(0.1, 1.1, 2.3, glass, 6.02, 2.3, 0, g); // windshield
    for (const z2 of [-1.29, 1.29]) {
      // a lit window or two down each side
      for (const wx of [-3.5, 0.5, 3.2]) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.7), rand() < 0.7 ? lit : glass);
        w.position.set(wx, 2.4, z2 * 1.005);
        w.rotation.y = z2 > 0 ? 0 : Math.PI;
        g.add(w);
      }
    }
    wheels(g, [-3.8, 4.0], 1.15, 0.5);
    // the awning out on the +z side, and string lights along its edge
    const aw = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.6), pick(awnings));
    aw.rotation.x = -Math.PI / 2 + 0.18;
    aw.position.set(-1, 2.9, 2.55);
    g.add(aw);
    for (const ax of [-4.4, 2.4]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6), chrome);
      leg.position.set(ax, 1.3, 3.8);
      g.add(leg);
    }
    const warm = rand() < 0.5;
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    g.updateMatrixWorld();
    for (let k = 0; k <= 14; k++) {
      const p = new THREE.Vector3(-4.5 + k * 0.5, 2.55 - Math.sin((k / 14) * Math.PI) * 0.15, 3.85).applyMatrix4(g.matrixWorld);
      bulbs.push(p.x, p.y, p.z);
      const col = new THREE.Color(warm ? "#ffcf7a" : ["#ff4040", "#40ff70", "#4090ff", "#ffd040"][k % 4]);
      bulbColors.push(col.r, col.g, col.b);
    }
    root.add(g);
    rvs.push(g);
    const local = (lx: number, lz: number) => new THREE.Vector3(lx, 0, lz).applyMatrix4(g.matrixWorld);
    // fans under the awning, a couple up on the roof watching, maybe the grill going
    for (let k = 0; k < 2 + Math.floor(rand() * 5); k++) {
      const p = local(-4 + rand() * 6, 3 + rand() * 2.5);
      person(p.x, 0, p.z);
    }
    for (let k = 0; k < Math.floor(rand() * 4); k++) {
      const p = local(-4 + rand() * 7, (rand() - 0.5) * 1.4);
      person(p.x, 3.35, p.z, pick(SHIRTS), 0.6 + rand() * 0.4);
    }
    if (rand() < 0.5) fires.push(local(2.5, 4.6).setY(0.6));
    // a flag on a pole off the back
    if (rand() < 0.6) {
      const p = local(-6.5, 2.2);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 8), chrome);
      pole.position.set(p.x, 4, p.z);
      root.add(pole);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1, 6, 1), std(pick(["#c8161d", "#1f62e8", "#ffd400", "#1fae3a", "#111", "#f2f2f2", "#ff7a1a"]), { side: THREE.DoubleSide, roughness: 0.9 }));
      f.position.set(p.x + 0.9, 7.3, p.z);
      root.add(f);
      flags.push(f);
    }
  };
  const pickups: THREE.Group[] = [];
  const pickup = (x: number, z: number, yaw: number) => {
    const g = new THREE.Group();
    const paint = std(pick(TRUCK_PAINT), { roughness: 0.35, metalness: 0.2 });
    box(5.6, 0.9, 2.0, paint, 0, 0.95, 0, g);
    box(2.6, 0.85, 1.95, paint, 0.6, 1.8, 0, g);
    box(0.05, 0.6, 1.7, glass, 1.92, 1.8, 0, g).rotation.z = 0.35;
    box(0.06, 0.55, 1.6, chrome, 2.82, 0.95, 0, g);
    wheels(g, [-1.8, 1.8], 0.9, 0.42);
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    root.add(g);
    pickups.push(g);
  };

  for (const [e, end] of ENDS.entries()) {
    const out = e === 0 ? 1 : -1;
    // two rings round each end, sideways on to the track
    for (const [r, n, span] of [
      [25, 5, 0.42],
      [13, 2, 0.25],
      ...(big ? [[48, 9, 0.42]] : []),
    ]) {
      for (let k = 0; k < n; k++) {
        const a = (-span + (k / (n - 1)) * span * 2) * Math.PI;
        const x = end.x + Math.cos(a) * r * out;
        const z = Math.sin(a) * r * out;
        // along the ring, awning side (+z) out toward the track
        const yaw = Math.atan2(Math.cos(a) * out, Math.sin(a) * out);
        motorhome(x, z, yaw);
        if (rand() < 0.6) pickup(end.x + Math.cos(a + 0.2) * (r - 5) * out, Math.sin(a + 0.2) * (r - 5) * out, yaw + 0.3);
      }
    }
    // and a row along the infield toward the middle
    for (let k = 0; k < 4; k++) motorhome(end.x - out * (24 + k * 5.5), 19, Math.PI / 2 + 0.1);
    for (let k = 0; k < 18; k++) crowdAround(end.x + out * (rand() * 26), (rand() - 0.5) * 40, 1, 2);
  }
  // pickups and a few people by the haulers
  for (let k = 0; k < 7; k++) pickup(-75 + k * 25, -(R - 44), 1.2 + rand() * 0.3);

  // ---- the camping lots (Michael, 2026-10-13: "infield needs more action", with an aerial photo of
  // a big speedway packed solid): rows and rows of campers, motorhomes, trucks and cars, all round
  // the outside past the grandstands and, on a big track, filling the infield too, with people
  // milling between them. Plain shapes, one instanced mesh per part, so hundreds cost next to nothing.
  {
    type Spot = { x: number; z: number; yaw: number; kind: 0 | 1 | 2 };
    const spots: Spot[] = [];
    const pylon = frame(LINE_S + 78, -32);
    const free = (x: number, z: number, inside: boolean) => {
      if (!inside) return true;
      // keep clear of the motorhome rings and boards at the ends, the haulers, the logo and the pylon
      for (const e of ENDS) if (Math.hypot(x - e.x, z - e.y) < (big ? 62 : 34)) return false;
      if (Math.abs(x) < 115 && z < -(R - 58) && z > -(R - 18)) return false;
      if (Math.abs(x) < 125 && Math.abs(z - 6) < 50) return false;
      return Math.hypot(x - pylon.x, z - pylon.z) > 14;
    };
    // a lot: rows across it, 9 m apart, a vehicle every few meters, a gap now and then for a lane
    // (every spot that fits is found first, then picked from at random, so a lot fills evenly)
    const fill = (inside: boolean, cap: number) => {
      const reach = inside ? R + 60 : R + HALF + 230;
      const found: Spot[] = [];
      for (let z = -reach; z <= reach + 120; z += 9) {
        let x = -S / 2 - reach;
        while (x < S / 2 + reach) {
          const kind = (rand() < 0.42 ? 0 : rand() < 0.75 ? 1 : 2) as 0 | 1 | 2;
          const len = kind === 0 ? 12 : kind === 1 ? 4.8 : 6;
          x += len / 2 + 1.2;
          const p = project(x, z);
          const ok = inside ? p.d < APRON - 22 && !(p.s > PIT.wallFrom - 40 && p.s < PIT.wallTo + 40 && p.d > APRON - 70) : p.d > HALF + 68 && p.d < HALF + 175;
          if (ok && free(x, z, inside)) found.push({ x, z, yaw: rand() < 0.5 ? 0 : Math.PI, kind });
          x += len / 2 + 1.2 + (rand() < 0.08 ? 10 : 0);
        }
      }
      for (let i = found.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [found[i], found[j]] = [found[j], found[i]];
      }
      spots.push(...found.slice(0, cap));
    };
    fill(false, big ? 2200 : 900);
    if (big) fill(true, 1800);

    // the parts: a camper's box and its window band, a car's body and its cabin, a truck's body and cab
    const any = (r: () => number, list: string[]) => list[Math.floor(r() * list.length)];
    const parts: { geo: THREE.BufferGeometry; kind: number; color: (r: () => number) => string }[] = [
      { geo: new THREE.BoxGeometry(12, 3, 2.5).translate(0, 1.9, 0), kind: 0, color: (r) => any(r, ["#eceef0", "#e6dfcf", "#f4f4f2", "#d9dbd6"]) },
      { geo: new THREE.BoxGeometry(12.04, 0.7, 2.54).translate(0, 2.3, 0), kind: 0, color: (r) => any(r, ["#2f3440", "#7a1e1e", "#1e3f7a", "#5a4a2a", "#2d5a2d", "#6b6f78"]) },
      { geo: new THREE.BoxGeometry(4.8, 0.8, 1.85).translate(0, 0.65, 0), kind: 1, color: (r) => any(r, TRUCK_PAINT.concat(["#c4c8ce", "#2a4f8f", "#8f2a2a"])) },
      { geo: new THREE.BoxGeometry(2.4, 0.6, 1.7).translate(-0.2, 1.35, 0), kind: 1, color: () => "#1a1f28" },
      { geo: new THREE.BoxGeometry(6, 1.0, 2.0).translate(0, 0.9, 0), kind: 2, color: (r) => any(r, TRUCK_PAINT) },
      { geo: new THREE.BoxGeometry(2.6, 0.9, 1.95).translate(1.2, 1.85, 0), kind: 2, color: (r) => any(r, TRUCK_PAINT) },
    ];
    const mat = std("#fff", { roughness: 0.55 });
    const mm = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const col = new THREE.Color();
    for (const part of parts) {
      const mine = spots.filter((sp) => sp.kind === part.kind);
      if (!mine.length) continue;
      const mesh = new THREE.InstancedMesh(part.geo, mat, mine.length);
      mine.forEach((sp, i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), sp.yaw);
        mm.compose(new THREE.Vector3(sp.x, 0, sp.z), q, one);
        mesh.setMatrixAt(i, mm);
        // each vehicle's colors come from where it's parked, so a truck's body and cab match
        const r = mulberry(Math.round(sp.x * 7 + sp.z * 13));
        mesh.setColorAt(i, col.set(part.color(r)));
      });
      mesh.receiveShadow = true;
      root.add(mesh);
    }
    // folks between the rows: a few by every camper, some cheering
    for (const sp of spots) {
      if (sp.kind === 0 && rand() < 0.5) crowdAround(sp.x + (rand() - 0.5) * 8, sp.z + 4, 1 + Math.floor(rand() * 3), 3);
      else if (rand() < 0.08) person(sp.x + (rand() - 0.5) * 5, 0, sp.z + 3.5);
    }
  }

  // ---- big tracks: the garages, two long buildings behind pit road ----
  if (big) {
    const garage = std("#d9dbde", { roughness: 0.7 });
    const roofMat = std("#8e939b", { roughness: 0.5, metalness: 0.3 });
    const doorMat = std("#3a3e46", { roughness: 0.6 });
    for (const [d0, d1] of [
      [APRON - 34, APRON - 48],
      [APRON - 56, APRON - 70],
    ]) {
      const s0 = PIT.wallFrom + 10;
      const s1 = PIT.wallTo - 10;
      const a = frame(s0, (d0 + d1) / 2);
      const b = frame(s1, (d0 + d1) / 2);
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const g = new THREE.Group();
      g.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
      g.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      box(len, 5, Math.abs(d1 - d0), garage, 0, 2.5, 0, g);
      box(len + 1, 0.5, Math.abs(d1 - d0) + 1.2, roofMat, 0, 5.2, 0, g);
      // bay doors down both long sides
      for (let k = -len / 2 + 6; k < len / 2 - 4; k += 9) for (const zz of [-1, 1]) box(6, 3.6, 0.1, doorMat, k, 1.8, zz * (Math.abs(d1 - d0) / 2 + 0.05), g);
      root.add(g);
      for (let k = 0; k < 30; k++) person(g.position.x + (rand() - 0.5) * len, 0, g.position.z + (rand() < 0.5 ? -1 : 1) * (Math.abs(d1 - d0) / 2 + 2 + rand() * 3), pick(SHIRTS), 0);
    }
  }

  // ---- people: a body and a head each ----
  const bodies = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.19, 0.23, 1.2, 7).translate(0, 0.6, 0), std("#fff", { roughness: 0.9 }), people.length);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6).translate(0, 1.37, 0), std("#fff", { roughness: 0.8 }), people.length);
  bodies.castShadow = true;
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  people.forEach((p, i) => {
    m.makeTranslation(p.x, p.y, p.z);
    bodies.setMatrixAt(i, m);
    heads.setMatrixAt(i, m);
    bodies.setColorAt(i, col.set(p.color));
    heads.setColorAt(i, col.set(pick(SKIN)));
  });
  root.add(bodies, heads);
  const bouncers = people.map((p, i) => [p, i] as const).filter(([p]) => p.bounce > 0);

  // string lights and grills
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(bulbs, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(bulbColors, 3));
    root.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.28, vertexColors: true, toneMapped: false })));
  }
  const [fc, fx] = canvas(64, 64);
  const grad = fx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,220,150,1)");
  grad.addColorStop(0.3, "rgba(255,120,30,0.7)");
  grad.addColorStop(1, "rgba(255,60,0,0)");
  fx.fillStyle = grad;
  fx.fillRect(0, 0, 64, 64);
  const fireMat = new THREE.SpriteMaterial({ map: tex(fc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const fireSprites = fires.map((p) => {
    const s = new THREE.Sprite(fireMat);
    s.position.copy(p);
    s.scale.setScalar(1.6);
    root.add(s);
    return s;
  });

  // ---- the big leaderboards, one at each end, facing down the straights ----
  const [bc, bg] = canvas(1024, 640);
  const boardTex = tex(bc);
  // the boards cut to an ad now and then (ads.ts), then back to the running order
  warmAds();
  const ad = { on: false, n: Math.floor(rand() * 100), start: 0, next: -1, drawn: 0 };
  let lastRows: { number: string; name: string; me: boolean }[] = [];
  let lastLap = "";
  for (const [e, end] of ENDS.entries()) {
    const out = e === 0 ? 1 : -1;
    const g = new THREE.Group();
    const frameMat = std("#16171c", { roughness: 0.5, metalness: 0.5 });
    box(37, 23.5, 1.2, frameMat, 0, 24, -0.7, g);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(35, 21.9), new THREE.MeshBasicMaterial({ map: boardTex, toneMapped: false }));
    face.position.set(0, 24, 0.02);
    g.add(face);
    for (const lx of [-14, 14]) box(1.2, 13, 1.2, frameMat, lx, 6.5, -0.7, g);
    // faces back down the straight that leads into this end
    g.position.set(end.x + out * 4, 0, 0);
    g.rotation.y = -out * Math.PI / 2;
    if (big) g.scale.setScalar(1.6);
    root.add(g);
  }

  // Meshy models, when they exist, take over from the hand-built ones (same spot, same heading)
  const swap = async (name: string, groups: THREE.Group[], length: number, tint?: (i: number) => string) => {
    const proto = await model(name, 1);
    if (!proto) return;
    const size = new THREE.Box3().setFromObject(proto).getSize(new THREE.Vector3());
    const scale = length / Math.max(size.x, size.z);
    groups.forEach((g, i) => {
      const m2 = proto.clone();
      m2.scale.setScalar(scale);
      // long side along x like the hand-built ones
      if (size.z > size.x) m2.rotation.y = Math.PI / 2;
      if (tint) m2.traverse((o) => o instanceof THREE.Mesh && (o.material = (o.material as THREE.MeshStandardMaterial).clone()) && (o.material as THREE.MeshStandardMaterial).color.set(tint(i)));
      for (const c of [...g.children]) if (!(c instanceof THREE.Mesh && c.geometry.type === "PlaneGeometry")) g.remove(c);
      g.add(m2);
    });
  };
  void swap("hauler", haulers, 22, (i) => teams[i].color);
  void swap("motorhome", rvs, 12);
  void swap("pickup", pickups, 5.8);

  return {
    update(t) {
      if (ad.next < 0 || t < ad.start) ad.next = t + AD_EVERY * 0.5; // first one comes a bit sooner
      if (!ad.on && t >= ad.next) {
        ad.on = true;
        ad.start = t;
        ad.n++;
      }
      if (ad.on) {
        if (t - ad.start > AD_FOR) {
          ad.on = false;
          ad.next = t + AD_EVERY;
          drawBoard();
        } else if (t - ad.drawn > 1 / 20) {
          ad.drawn = t;
          drawAd(bg, 1024, 640, ad.n, t - ad.start);
          boardTex.needsUpdate = true;
        }
      }
      for (const [p, i] of bouncers) {
        m.makeTranslation(p.x, p.y + Math.abs(Math.sin(t * (5 + p.bounce * 4) + i)) * 0.18 * p.bounce, p.z);
        bodies.setMatrixAt(i, m);
        heads.setMatrixAt(i, m);
      }
      bodies.instanceMatrix.needsUpdate = true;
      heads.instanceMatrix.needsUpdate = true;
      fireSprites.forEach((s, i) => s.scale.setScalar(1.4 + Math.sin(t * 13 + i * 3) * 0.2 + Math.sin(t * 7.3 + i) * 0.15));
      for (const f of flags) {
        const pos = f.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let k = 0; k < pos.count; k++) {
          const x = pos.getX(k);
          pos.setZ(k, Math.sin(t * 5 + x * 2.5 + f.id) * 0.15 * (x + 0.9));
        }
        pos.needsUpdate = true;
      }
    },
    board(rows, lap) {
      lastRows = rows;
      lastLap = lap;
      if (!ad.on) drawBoard();
    },
  };

  function drawBoard(): void {
    const rows = lastRows;
    const lap = lastLap;
    bg.fillStyle = "#05060a";
    bg.fillRect(0, 0, 1024, 640);
    // header: SCOFTI 500 and the lap
    bg.fillStyle = "#c8161d";
    bg.fillRect(0, 0, 1024, 92);
    bg.textBaseline = "middle";
    bg.fillStyle = "#fff";
    bg.font = "64px 'Permanent Marker'";
    bg.textAlign = "left";
    bg.fillText("SCOFTI 500", 28, 50);
    bg.textAlign = "right";
    bg.font = "58px 'Lilita One'";
    bg.fillText(lap, 996, 50);
    rows.slice(0, 8).forEach((r, k) => {
      const y = 100 + k * 67;
      bg.fillStyle = r.me ? "#ffd400" : k % 2 ? "#12141b" : "#0b0c12";
      bg.fillRect(0, y, 1024, 64);
      const ink = r.me ? "#111" : "#fff";
      bg.textAlign = "right";
      bg.fillStyle = r.me ? "#111" : "#ffd400";
      bg.font = "52px 'Lilita One'";
      bg.fillText(String(k + 1), 92, y + 34);
      bg.textAlign = "center";
      bg.fillStyle = r.me ? "#111" : "#ffd400";
      bg.font = "italic 58px 'Racing Sans One'";
      bg.fillText(r.number, 190, y + 34);
      bg.textAlign = "left";
      bg.fillStyle = ink;
      bg.font = "52px 'Lilita One'";
      bg.fillText(r.name.toUpperCase(), 270, y + 34);
    });
    boardTex.needsUpdate = true;
  }
}
