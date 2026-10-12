// The 3D cars (Meshy, from Michael's car sheets: art/meshy → public/models), loaded and painted in
// the picked colour. Used by the pit garage and the race.
import * as THREE from "three";
import { model } from "./models";
import { paintedTexture } from "./paint";
import type { Car } from "./roster";

export const CAR_HEIGHT = 1.35; // a stock car stands about 1.3 m

// which 3D model each car uses
export const MODELS: Record<string, string> = {
  "17-modern": "car-17-modern",
  "43-eighties": "car-43-eighties",
  "3-muscle": "car-3-muscle",
  "7-owl": "car-7-owl",
};

/** the car's model in its paint, nose along -x, or null if it has none */
export async function loadCar(car: Car, paintId: string, opts: PaintOpts = {}): Promise<THREE.Group | null> {
  const name = MODELS[car.id];
  if (!name) return null;
  const obj = await model(name, CAR_HEIGHT);
  if (obj) paintModel(obj, car, paintId, opts);
  return obj;
}

export type PaintOpts = {
  /** how bright the paint sits (bright lights wash colours out, so the garage turns it down) */
  brightness?: number;
  /** largest texture side, to save memory when there are lots of cars */
  maxSize?: number;
};

// Repaint a model's textures in the picked colour (the same recolouring as the car pictures).
export function paintModel(obj: THREE.Object3D, car: Car, paintId: string, opts: PaintOpts = {}): void {
  obj.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const m = o.material as THREE.MeshStandardMaterial;
    if (!m.map) return;
    // keep the model's own texture so the next colour starts from it, not from the last one
    const original = (m.userData.original ??= m.map) as THREE.Texture;
    const painted = paintedTexture(original.image as HTMLImageElement, car.key, paintId, opts.maxSize);
    // car paint, not chrome: Meshy bakes lumpy bumps into the normal map and the bright garage lit every
    // lump silver, so flatten the bumps, and turn the shine down so black stays black with small
    // sharp highlights instead of a grey sheen
    const mat = new THREE.MeshPhysicalMaterial({
      normalMap: m.normalMap,
      normalScale: new THREE.Vector2(0.15, 0.15),
      metalness: 0,
      roughness: 0.42,
      specularIntensity: 0.04,
      envMapIntensity: 0.08,
      color: new THREE.Color().setScalar(opts.brightness ?? 1),
      side: m.side,
    });
    o.material = mat;
    mat.userData.original = original;
    if (painted) {
      const t = new THREE.CanvasTexture(painted);
      t.colorSpace = THREE.SRGBColorSpace;
      t.flipY = original.flipY;
      t.anisotropy = 4;
      mat.map = t;
    } else {
      mat.map = original;
    }
  });
}

