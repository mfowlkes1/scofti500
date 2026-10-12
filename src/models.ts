import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

// Each file downloads once; later asks for the same model get a copy.
const files = new Map<string, Promise<GLTF>>();

// Everything asked for so far, so the title screen can wait for its models (see whenLoaded).
const asked: Promise<unknown>[] = [];

// Loads public/models/<name>.glb, scaled so it stands `height` tall with its feet at y = 0,
// centered on x and z. Resolves to null if the file is missing, so a model still being made
// doesn't stop the game.
export function model(name: string, height: number): Promise<THREE.Group | null> {
  let file = files.get(name);
  if (!file) {
    file = loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`);
    files.set(name, file);
  }
  const made = file
    .then((gltf) => {
      const inner = gltf.scene.clone();
      inner.traverse((o) => {
        o.castShadow = true;
        o.receiveShadow = true;
      });
      const box = new THREE.Box3().setFromObject(inner);
      const size = box.getSize(new THREE.Vector3());
      inner.scale.setScalar(height / size.y);
      box.setFromObject(inner);
      const center = box.getCenter(new THREE.Vector3());
      inner.position.set(-center.x, -box.min.y, -center.z);
      const group = new THREE.Group();
      group.add(inner);
      return group;
    })
    .catch((err) => {
      console.warn(`model ${name} not loaded`, err);
      return null;
    });
  asked.push(made);
  return made;
}

// Waits for every model asked for up to now (not ones asked for later), calling `progress`
// with 0..1 as they arrive. Gives up waiting after `maxWait` ms, so a slow connection still
// gets a title screen.
export function whenLoaded(progress: (k: number) => void, maxWait = 25000): Promise<void> {
  const total = asked.length;
  let arrived = 0;
  for (const p of asked.slice()) {
    p.then(() => progress(++arrived / total));
  }
  return Promise.race([
    Promise.all(asked.slice()).then(() => undefined),
    new Promise<void>((r) => setTimeout(r, maxWait)),
  ]);
}
