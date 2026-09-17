import * as THREE from "three";
import type { CardiacCycle } from "./cardiacCycle";
type Route = {
  id: string;
  name: string;
  kind: string;
  points: [number, number, number][];
};
/** Source-derived arterial segments; gaps are not joined by invented vessels. */
export function createBloodFlow(routes: Route[]) {
  const group = new THREE.Group();
  group.name = "Blood movement on source vessel segments";
  const parts = routes.map((route) => {
    const points = route.points.map((p) => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    const color = route.kind === "pulmonary-arterial" ? 0x70c5ff : 0xff7862;
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 64, 0.0045, 5, false),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.28,
        depthTest: false,
      }),
    );
    tube.renderOrder = 4;
    group.add(tube);
    const length = curve.getLength(),
      count = Math.max(2, Math.ceil(length / 0.085));
    const particles = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.008, 8, 6),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        depthTest: false,
      }),
      count,
    );
    particles.renderOrder = 6;
    particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    particles.frustumCulled = false;
    group.add(particles);
    return { curve, length, count, particles, tube };
  });
  const matrix = new THREE.Matrix4(),
    scale = new THREE.Vector3(),
    rotation = new THREE.Quaternion();
  return {
    group,
    update(cycle: CardiacCycle) {
      for (const part of parts) {
        part.particles.visible = cycle.phase !== "VF";
        (part.tube.material as THREE.MeshBasicMaterial).opacity =
          cycle.phase === "VF" ? 0.08 : 0.22 + cycle.ejection * 0.2;
        scale.setScalar(0.75 + cycle.ejection * 0.55);
        for (let i = 0; i < part.count; i++) {
          const u =
            (((cycle.travel / Math.max(0.1, part.length) + i / part.count) %
              1) +
              1) %
            1;
          matrix.compose(part.curve.getPointAt(u), rotation, scale);
          part.particles.setMatrixAt(i, matrix);
        }
        part.particles.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
