import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import type { Condition, Electrode, Point } from "./ecg";
import { colors } from "./ecg";
import { createBloodFlow } from "./BloodFlow";
import type { CardiacCycle } from "./cardiacCycle";
import { patterns, patternState } from "./patterns";
type Props = {
  electrodes: Electrode[];
  selected: string;
  placing: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, p: Point) => void;
  time: React.RefObject<number>;
  condition: Condition;
  stage: React.RefObject<string>;
  vector: React.RefObject<Point>;
  xray: boolean;
  focus: boolean;
  view: number;
  flow: boolean;
  cycle: React.RefObject<CardiacCycle | null>;
};
export default function Anatomy(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(props);
  latest.current = props;
  const [status, setStatus] = useState("Loading reference anatomy…");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = host.current!;
    let alive = true;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 30);
    camera.position.set(0, 1.95, 6.9);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "3D human anatomy. Select an electrode, enable Place on body, then click the skin. Drag an electrode to move it.",
    );
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.85, 0);
    controls.enableDamping = true;
    controls.minDistance = 0.5;
    controls.maxDistance = 9;
    scene.add(new THREE.HemisphereLight(0xdcecf5, 0x252020, 2.2));
    const key = new THREE.DirectionalLight(0xffddbb, 3);
    key.position.set(-3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x75b1c6, 2);
    rim.position.set(3, 2, -3);
    scene.add(rim);
    const body = new THREE.Group();
    scene.add(body);
    let skins: THREE.Mesh[] = [],
      heart: THREE.Mesh | undefined;
    const internals: THREE.Mesh[] = [];
    const pads = new THREE.Group();
    scene.add(pads);
    let bloodFlow: ReturnType<typeof createBloodFlow> | undefined;
    const heartParts: {
      mesh: THREE.Mesh;
      position: THREE.Vector3;
      scale: THREE.Vector3;
    }[] = [];
    const center = new THREE.Vector3(0.08, 2.7, 0.025);
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, -1, 0).normalize(),
      center,
      0.3,
      0xffdb9b,
      0.07,
      0.035,
    );
    scene.add(arrow);
    const conduction = new THREE.Group();
    scene.add(conduction);
    const pulseNodes: THREE.Mesh[] = [];
    const impulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.009, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }),
    );
    impulse.renderOrder = 7;
    conduction.add(impulse);
    const injuryRegion = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 20, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffaa66,
        transparent: true,
        opacity: 0.3,
        depthTest: false,
        depthWrite: false,
      }),
    );
    injuryRegion.scale.set(1, 0.7, 0.2);
    injuryRegion.renderOrder = 4;
    scene.add(injuryRegion);
    const loader = new GLTFLoader();
    const draco = new DRACOLoader()
      .setDecoderPath("/models/draco/")
      .setWorkerLimit(2);
    loader.setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
    Promise.all([
      loader.loadAsync("/models/neutral-skin.glb"),
      loader.loadAsync("/models/bodyparts-atlas.glb"),
      fetch("/models/bodyparts-atlas-metadata.json").then((r) => {
        if (!r.ok) throw Error("Vessel paths unavailable");
        return r.json();
      }),
    ])
      .then(([skin, atlas, metadata]) => {
        if (!alive) return;
        skin.scene.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.material = new THREE.MeshPhysicalMaterial({
              color: 0xd1b7a0,
              transparent: true,
              opacity: 0.19,
              roughness: 0.67,
              metalness: 0.05,
              depthWrite: false,
              side: THREE.DoubleSide,
            });
            o.renderOrder = 3;
            skins.push(o);
          }
        });
        body.add(skin.scene);
        atlas.scene.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          const name = o.name;
          const isHeart = /heart|coronary/.test(name),
            isBone = /skeleton|ribs|cartilage/.test(name),
            isLung = /lung_/.test(name),
            isVessel = /arteries|veins/.test(name) && !isHeart;
          if (!isHeart && !isBone && !isLung && !isVessel) {
            o.visible = false;
            return;
          }
          o.material = new THREE.MeshStandardMaterial({
            color: isHeart
              ? 0xbd584b
              : isLung
                ? 0x72938d
                : isVessel
                  ? /veins/.test(name)
                    ? 0x548cc0
                    : 0xce675a
                  : 0xbcb1a0,
            transparent: true,
            opacity: isHeart ? 1 : isLung ? 0.16 : isVessel ? 0.28 : 0.14,
            roughness: 0.75,
            depthWrite: isHeart,
          });
          internals.push(o);
          o.userData.flowVessel = isVessel;
          if (isHeart)
            heartParts.push({
              mesh: o,
              position: o.position.clone(),
              scale: o.scale.clone(),
            });
          if (name === "heart") {
            heart = o;
            const b = new THREE.Box3().setFromObject(o);
            b.getCenter(center);
            arrow.position.copy(center);
          }
        });
        body.add(atlas.scene);
        bloodFlow = createBloodFlow(metadata.flowPaths);
        scene.add(bloodFlow.group);
        const pts = [
          [-0.07, 0.14, 0],
          [-0.015, 0.07, 0.025],
          [-0.005, 0.015, 0.025],
          [0.025, -0.07, 0.035],
          [0.11, -0.14, 0.015],
          [-0.085, -0.09, 0.01],
        ].map((p) => new THREE.Vector3(...(p as Point)).add(center));
        for (let i = 0; i < pts.length; i++) {
          const dot = new THREE.Mesh(
            new THREE.SphereGeometry(i < 2 ? 0.012 : 0.009, 16, 12),
            new THREE.MeshBasicMaterial({
              color: 0xffd899,
              transparent: true,
              depthTest: false,
            }),
          );
          dot.position.copy(pts[i]);
          dot.renderOrder = 5;
          pulseNodes.push(dot);
          conduction.add(dot);
        }
        for (const [a, b] of [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [3, 5],
        ]) {
          const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([pts[a], pts[b]]),
            new THREE.LineBasicMaterial({
              color: 0xe7b57a,
              transparent: true,
              opacity: 0.55,
              depthTest: false,
            }),
          );
          line.renderOrder = 5;
          conduction.add(line);
        }
        setStatus("");
      })
      .catch(() => {
        if (alive) {
          setStatus("Anatomy could not load. Reload to try again.");
          setFailed(true);
        }
      });
    function disposeGroup(g: THREE.Group) {
      for (const child of [...g.children]) {
        g.remove(child);
        child.traverse((o) => {
          if (
            o instanceof THREE.Mesh ||
            o instanceof THREE.Line ||
            o instanceof THREE.Sprite
          ) {
            "geometry" in o && o.geometry?.dispose();
            const ms = Array.isArray(o.material) ? o.material : [o.material];
            ms.forEach((m) => {
              if ("map" in m) (m.map as THREE.Texture)?.dispose();
              m.dispose();
            });
          }
        });
      }
    }
    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const cast = (event: PointerEvent) => {
      const b = el.getBoundingClientRect();
      pointer.set(
        ((event.clientX - b.left) / b.width) * 2 - 1,
        (-(event.clientY - b.top) / b.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
    };
    let drag: string | null = null,
      start: [number, number] | null = null,
      pending: Point | null = null;
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      cast(event);
      const hit = ray
        .intersectObjects(pads.children, true)
        .find((h) => h.object.userData.electrode);
      if (hit) {
        drag = hit.object.userData.electrode;
        latest.current.onSelect(drag!);
        controls.enabled = false;
        renderer.domElement.setPointerCapture(event.pointerId);
      } else if (latest.current.placing) {
        drag = latest.current.selected;
        controls.enabled = false;
      }
      start = [event.clientX, event.clientY];
    };
    const move = (event: PointerEvent) => {
      if (!drag) return;
      cast(event);
      const hit = ray.intersectObjects(skins, true)[0];
      if (hit) {
        pending = hit.point.toArray() as Point;
        const pad = pads.children.find((o) => o.userData.electrode === drag);
        pad?.position.copy(hit.point);
      }
    };
    const up = (event: PointerEvent) => {
      if (drag) {
        cast(event);
        const hit = ray.intersectObjects(skins, true)[0];
        if (hit) pending = hit.point.toArray() as Point;
        if (pending) latest.current.onMove(drag, pending);
      } else if (
        start &&
        Math.hypot(event.clientX - start[0], event.clientY - start[1]) < 5
      ) {
        cast(event);
        const hit = ray
          .intersectObjects(pads.children, true)
          .find((h) => h.object.userData.electrode);
        if (hit) latest.current.onSelect(hit.object.userData.electrode);
      }
      drag = null;
      pending = null;
      start = null;
      controls.enabled = true;
    };
    renderer.domElement.addEventListener("pointerdown", down, true);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.tabIndex = 0;
    renderer.domElement.addEventListener("keydown", (event) => {
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      )
        return;
      const pad = latest.current.electrodes.find(
        (e) => e.id === latest.current.selected,
      );
      if (!pad) return;
      event.preventDefault();
      const projected = new THREE.Vector3(...pad.position).project(camera);
      const step = event.shiftKey ? 0.035 : 0.01;
      pointer.set(
        projected.x +
          (event.key === "ArrowLeft"
            ? -step
            : event.key === "ArrowRight"
              ? step
              : 0),
        projected.y +
          (event.key === "ArrowDown"
            ? -step
            : event.key === "ArrowUp"
              ? step
              : 0),
      );
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(skins, true)[0];
      if (hit) latest.current.onMove(pad.id, hit.point.toArray() as Point);
    });
    renderer.domElement.addEventListener("pointercancel", () => {
      drag = null;
      pending = null;
      controls.enabled = true;
    });
    let signature = "",
      lastView = -1,
      lastFocus = false;
    function label(id: string, color: string) {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 80;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#121619";
      ctx.beginPath();
      ctx.roundRect(1, 1, 126, 78, 20);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = "bold 38px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(id, 64, 42);
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, depthTest: false }),
      );
      sprite.scale.set(0.15, 0.095, 1);
      const chestLabels: Record<string, Point> = {
        V1: [-0.12, 0.15, 0.025],
        V2: [0.01, 0.24, 0.025],
        V3: [0.17, 0.16, 0.025],
        V4: [0.22, 0.07, 0.025],
        V5: [0.22, -0.045, 0.025],
        V6: [0.19, -0.16, 0.025],
      };
      sprite.position.fromArray(chestLabels[id] ?? [0.09, 0.065, 0.025]);
      sprite.renderOrder = 9;
      sprite.userData.electrode = id;
      return sprite;
    }
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    renderer.setAnimationLoop(() => {
      const p = latest.current;
      if (lastView !== p.view || lastFocus !== p.focus) {
        lastView = p.view;
        lastFocus = p.focus;
        controls.target.copy(p.focus ? center : new THREE.Vector3(0, 1.85, 0));
        camera.position
          .copy(controls.target)
          .add(new THREE.Vector3(0, 0.04, p.focus ? 1.15 : 7.3));
      }
      const sig = JSON.stringify([p.electrodes, p.selected]);
      if (sig !== signature && !drag) {
        signature = sig;
        disposeGroup(pads);
        p.electrodes.forEach((e, i) => {
          const g = new THREE.Group();
          g.userData.electrode = e.id;
          g.position.fromArray(e.position);
          const color =
            e.id === p.selected ? "#fff0c9" : colors[i % colors.length];
          const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 20, 12),
            new THREE.MeshStandardMaterial({
              color,
              emissive: color,
              emissiveIntensity: 0.3,
              depthTest: false,
            }),
          );
          sphere.userData.electrode = e.id;
          sphere.renderOrder = 8;
          g.add(sphere, label(e.id, color));
          pads.add(g);
        });
      }
      skins.forEach((m) => {
        (m.material as THREE.MeshPhysicalMaterial).opacity = p.xray
          ? 0.19
          : 0.9;
      });
      internals.forEach(
        (m) => (m.visible = p.xray && (!m.userData.flowVessel || p.flow)),
      );
      const cycle = p.cycle.current;
      if (bloodFlow) {
        bloodFlow.group.visible = p.flow && p.xray;
        if (cycle) bloodFlow.update(cycle);
      }
      if (cycle) {
        const size =
          cycle.phase === "VF"
            ? 1 + 0.006 * Math.sin(p.time.current * 38)
            : 1 - 0.07 * cycle.squeeze;
        heartParts.forEach((part) => {
          part.mesh.scale.copy(part.scale).multiplyScalar(size);
          part.mesh.position
            .copy(part.position)
            .addScaledVector(center, 1 - size);
        });
        el.dataset.cardiacPhase = cycle.phase;
        el.dataset.ejection = cycle.ejection.toFixed(3);
        el.dataset.flowEnabled = String(p.flow && p.xray);
      }
      conduction.visible = p.xray;
      arrow.visible = p.xray && !p.flow && !patterns[p.condition];
      const v = new THREE.Vector3(...p.vector.current);
      const len = v.length();
      if (len > 0.0001) {
        arrow.setDirection(v.normalize());
        arrow.setLength(Math.min(0.5, 0.08 + len * 0.24), 0.065, 0.03);
      }
      const stage = p.stage.current;
      const teaching = patterns[p.condition]
        ? patternState(p.condition, p.time.current)
        : null;
      const phase = cycle?.phase ?? "Rest";
      injuryRegion.visible =
        p.xray && ["anterior", "inferior", "ischemia"].includes(p.condition);
      injuryRegion.position
        .copy(center)
        .add(
          new THREE.Vector3(
            0.07,
            p.condition === "inferior" ? -0.15 : -0.05,
            0.16,
          ),
        );
      (injuryRegion.material as THREE.MeshBasicMaterial).opacity =
        phase === "ST" || phase === "T" ? 0.58 : 0.16;
      impulse.visible = false;
      if (pulseNodes.length === 6 && teaching) {
        const ventricular = phase.includes("QRS");
        if (
          ventricular ||
          phase === "AV" ||
          phase === "P" ||
          phase === "Flutter"
        ) {
          const progress = teaching
            ? ventricular
              ? Math.max(
                  0,
                  Math.min(
                    1,
                    (teaching.elapsed + (teaching.beat?.wide ? 0.096 : 0.04)) /
                      (teaching.beat?.wide ? 0.264 : 0.11),
                  ),
                )
              : Math.max(
                  0,
                  Math.min(
                    1,
                    teaching.atrialAge /
                      Math.max(
                        0.1,
                        (teaching.atrium?.ventricular ??
                          (teaching.atrium?.at ?? 0) + 0.2) -
                          (teaching.atrium?.at ?? 0),
                      ),
                  ),
                )
            : (p.time.current * 4) % 1;
          const ectopic = ventricular && teaching?.beat?.ectopic;
          impulse.position
            .copy(pulseNodes[ventricular ? (ectopic ? 4 : 2) : 0].position)
            .lerp(
              pulseNodes[ventricular ? (ectopic ? 2 : 4) : 1].position,
              progress,
            );
          (impulse.material as THREE.MeshBasicMaterial).color.set(
            ectopic ? 0xea94bd : 0xffffff,
          );
          impulse.visible = true;
        }
      }
      pulseNodes.forEach((dot, i) => {
        const active =
          teaching && i < 2 && teaching.atrialAge < 0.1
            ? true
            : p.condition === "vfib"
              ? Math.sin(p.time.current * 20 + i * 2) > 0
              : p.condition === "afib"
                ? i < 2
                  ? Math.sin(p.time.current * 31 + i) > 0
                  : phase === "QRS"
                : p.condition === "flutter" && i < 2
                  ? Math.sin(p.time.current * Math.PI * 10 + i) > 0
                  : stage.includes("P ·")
                    ? i < 2
                    : stage.includes("AV")
                      ? i === 1
                      : stage.includes("QRS")
                        ? i >= 2
                        : stage.includes("T ·")
                          ? i >= 3
                          : false;
        const blockedNode =
          (teaching?.blocked || p.condition === "complete") &&
          i === (p.condition === "mobitz2" ? 2 : 1);
        (dot.material as THREE.MeshBasicMaterial).color.set(
          blockedNode
            ? 0xf08b88
            : teaching?.beat?.ectopic && phase.includes("QRS") && i >= 2
              ? 0xea94bd
              : 0xffd899,
        );
        (dot.material as THREE.MeshBasicMaterial).opacity = active ? 1 : 0.25;
        if (blockedNode) (dot.material as THREE.MeshBasicMaterial).opacity = 1;
        dot.scale.setScalar(active ? 1.6 : 1);
      });
      if (heart) {
        const m = heart.material as THREE.MeshStandardMaterial;
        m.emissive.set(
          p.condition === "vfib"
            ? 0x662211
            : stage.includes("QRS")
              ? 0x5a2716
              : 0x120703,
        );
      }
      renderer.domElement.style.cursor = drag
        ? "grabbing"
        : p.placing
          ? "crosshair"
          : "grab";
      controls.update();
      renderer.render(scene, camera);
    });
    return () => {
      alive = false;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      disposeGroup(pads);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            m.dispose(),
          );
        }
      });
      draco.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div className="anatomy-canvas">
      <div className="renderer-mount" ref={host} />
      {status ? (
        <div className={"loading " + (failed ? "failed" : "")}>
          <span className="loading-orbit" />
          {status}
        </div>
      ) : null}
    </div>
  );
}
