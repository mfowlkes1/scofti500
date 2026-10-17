// A rival's own number on their car (Michael, 2026-10-13: "the other cars cant all have the same
// numbers"). The four car models have their number baked into the paint, so a rival's number goes
// over it as a decal on each door and the roof: a panel in their paint color covering the old number,
// and the new one on it, white with a black edge so it reads on any color.
// Where each model's number sits is in the model's own units (x front − to back +, y up, z across;
// the same frames as art/meshy/fix-lettering.mjs, measured off the flat pictures from flat.mjs).
import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import { PAINTS } from "./paint";

type Panel = { side: "left" | "right" | "roof"; x: [number, number]; v: [number, number] };
// v is y on the doors and z on the roof
const PANELS: Record<string, Panel[]> = {
  "17-modern": [
    { side: "left", x: [-0.31, 0.11], v: [-0.18, 0.07] },
    { side: "right", x: [-0.37, 0.19], v: [-0.19, 0.11] },
    { side: "roof", x: [-0.08, 0.48], v: [-0.3, 0.3] },
  ],
  "43-eighties": [
    { side: "left", x: [-0.33, 0.23], v: [-0.2, 0.08] },
    { side: "right", x: [-0.33, 0.23], v: [-0.2, 0.08] },
    { side: "roof", x: [-0.1, 0.42], v: [-0.24, 0.24] },
  ],
  "3-muscle": [
    { side: "left", x: [-0.23, 0.15], v: [-0.18, 0.09] },
    { side: "right", x: [-0.23, 0.15], v: [-0.18, 0.09] },
    { side: "roof", x: [-0.1, 0.42], v: [-0.24, 0.24] },
  ],
  "7-owl": [
    { side: "left", x: [-0.26, 0.11], v: [-0.18, 0.08] },
    { side: "right", x: [-0.26, 0.11], v: [-0.18, 0.08] },
    { side: "roof", x: [-0.12, 0.24], v: [-0.19, 0.2] },
  ],
  "90-nineties": [
    { side: "left", x: [-0.38, 0.18], v: [-0.15, 0.05] },
    { side: "right", x: [-0.38, 0.18], v: [-0.15, 0.05] },
    { side: "roof", x: [-0.12, 0.41], v: [-0.22, 0.22] },
  ],
};

// which way each panel reads: its right, its up, and the way the decal projects (into the car)
const BASIS = {
  // the left (+z) door reads front to back
  left: new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)),
  // the right (−z) door reads front to back too, seen from that side
  right: new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1)),
  // the roof reads from the right side, the grandstands' view
  roof: new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)),
};

// the decal shapes depend only on the model, so each is worked out once and shared
const shapes = new Map<string, { geo: THREE.BufferGeometry; aspect: number }[]>();

function shapesFor(body: THREE.Object3D, carId: string): { geo: THREE.BufferGeometry; aspect: number }[] {
  const hit = shapes.get(carId);
  if (hit) return hit;
  const inner = body.children[0];
  // the biggest mesh is the body
  let mesh: THREE.Mesh | null = null;
  body.traverse((o) => {
    if (o instanceof THREE.Mesh && (!mesh || o.geometry.attributes.position.count > mesh.geometry.attributes.position.count)) mesh = o;
  });
  if (!inner || !mesh) return [];
  body.updateMatrixWorld(true);
  const scale = inner.scale.x;
  // the model's top and sides, to sit each projector just outside the body
  const box = new THREE.Box3().setFromObject(mesh);
  const local = (p: THREE.Vector3) => body.worldToLocal(p.clone());
  const top = local(box.max).y;
  const outZ = local(box.max).z;
  const made = (PANELS[carId] ?? []).map((p) => {
    const w = (p.x[1] - p.x[0]) * scale;
    const h = (p.v[1] - p.v[0]) * scale;
    const mid = inner.localToWorld(new THREE.Vector3((p.x[0] + p.x[1]) / 2, p.side === "roof" ? 0 : (p.v[0] + p.v[1]) / 2, p.side === "roof" ? (p.v[0] + p.v[1]) / 2 : 0));
    // from the middle of the car out to (just past) its skin on that side
    if (p.side === "left") mid.z = outZ * 0.6;
    else if (p.side === "right") mid.z = -outZ * 0.6;
    else mid.y = top * 0.85;
    const depth = p.side === "roof" ? top * 0.5 : outZ * 1.0;
    const orient = new THREE.Euler().setFromRotationMatrix(BASIS[p.side]);
    const geo = new DecalGeometry(mesh!, mid, orient, new THREE.Vector3(w, h, depth));
    return { geo, aspect: w / h };
  });
  shapes.set(carId, made);
  return made;
}

/** the number on a panel in this paint: the panel in the paint color with soft edges, the number on it */
function numberTexture(number: string, paintId: string, aspect: number): THREE.CanvasTexture {
  const H = 128;
  const W = Math.round(H * aspect);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const paint = PAINTS.find((p) => p.id === paintId);
  const color = paint?.camo === "woods" ? "#4b5530" : paint?.camo === "white" ? "#c9cdd2" : paint?.swatch.startsWith("#") ? paint.swatch : "#1b1b1b";
  // the panel, fading out at its edges into the paint round it
  g.fillStyle = color;
  g.fillRect(W * 0.04, H * 0.06, W * 0.92, H * 0.88);
  g.filter = "blur(4px)";
  g.fillRect(W * 0.02, H * 0.03, W * 0.96, H * 0.94);
  g.filter = "none";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  const size = H * 0.82;
  g.font = `italic 400 ${size}px "Racing Sans One"`;
  const tw = g.measureText(number).width;
  g.save();
  g.translate(W / 2, H * 0.53);
  if (tw > W * 0.86) g.scale((W * 0.86) / tw, 1);
  g.lineWidth = size * 0.16;
  g.strokeStyle = "#111";
  g.strokeText(number, 0, 0);
  g.fillStyle = "#fff";
  g.fillText(number, 0, 0);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** put number on a loaded car body (from loadCar, before it's turned or placed) */
export function addNumber(body: THREE.Group, carId: string, number: string, paintId: string): void {
  for (const { geo, aspect } of shapesFor(body, carId)) {
    const mat = new THREE.MeshStandardMaterial({
      map: numberTexture(number, paintId, aspect),
      transparent: true,
      roughness: 0.45,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      depthWrite: false,
    });
    body.add(new THREE.Mesh(geo, mat));
  }
}

// ---- white trim on black cars (Michael, 2026-10-13: "all black cars should always have white trim").
// The lime cars are black underneath, so painted black they lost every bit of contrast; a black car gets
// a double white pinstripe down each side, along the beltline. ----
const stripes = new Map<string, THREE.BufferGeometry[]>();

function stripesFor(body: THREE.Object3D, carId: string): THREE.BufferGeometry[] {
  const hit = stripes.get(carId);
  if (hit) return hit;
  const inner = body.children[0];
  let mesh: THREE.Mesh | null = null;
  body.traverse((o) => {
    if (o instanceof THREE.Mesh && (!mesh || o.geometry.attributes.position.count > mesh.geometry.attributes.position.count)) mesh = o;
  });
  if (!inner || !mesh) return [];
  body.updateMatrixWorld(true);
  // the body's size in the model's own units (x front to back, y up, z across)
  const box = new THREE.Box3().setFromObject(mesh);
  const a = inner.worldToLocal(box.min.clone());
  const b = inner.worldToLocal(box.max.clone());
  const lo = new THREE.Vector3(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z));
  const hi = new THREE.Vector3(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z));
  const scale = inner.scale.x;
  const outZ = body.worldToLocal(box.max.clone()).z;
  const len = (hi.x - lo.x) * 0.84 * scale;
  const made: THREE.BufferGeometry[] = [];
  // the beltline: a bit below the middle of the body's height, two lines close together
  for (const k of [0.4, 0.46]) {
    const y = lo.y + (hi.y - lo.y) * k;
    for (const side of ["left", "right"] as const) {
      const mid = inner.localToWorld(new THREE.Vector3((lo.x + hi.x) / 2, y, 0));
      mid.z = side === "left" ? outZ * 0.6 : -outZ * 0.6;
      const orient = new THREE.Euler().setFromRotationMatrix(BASIS[side]);
      made.push(new DecalGeometry(mesh!, mid, orient, new THREE.Vector3(len, (hi.y - lo.y) * 0.022 * scale, outZ)));
    }
  }
  stripes.set(carId, made);
  return made;
}

const stripeMat = new THREE.MeshStandardMaterial({ color: "#f4f4f4", roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -4 });

/** a black car: white pinstripes down both sides */
export function addTrim(body: THREE.Group, carId: string): void {
  for (const geo of stripesFor(body, carId)) body.add(new THREE.Mesh(geo, stripeMat));
}
