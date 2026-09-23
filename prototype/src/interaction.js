import * as THREE from "three";
import { petalGeometry } from "./flowers.js";

export const isTap = (start, end) =>
  !!start &&
  !start.cancelled &&
  end.time - start.time < 650 &&
  Math.hypot(end.x - start.x, end.y - start.y) < 7;

// One pointer field feeds every foliage material. Picking is against a cheap crown
// envelope, never thousands of individual leaf triangles on every pointer move.
export function treeInteractions(canvas, camera, controls, uniforms, getShown) {
  const ray = new THREE.Raycaster(),
    plane = new THREE.Plane(),
    point = new THREE.Vector3();
  const normal = new THREE.Vector3(),
    center = new THREE.Vector3();
  let down = null,
    hovering = false,
    enabled = true,
    pulse = 0,
    lastTap = -Infinity;
  let detached = null,
    pieces = [],
    elapsed = 0;
  const target = (uniforms.touchPoint = {
    value: new THREE.Vector3(0, -100, 0),
  });
  const strength = (uniforms.touchStrength = { value: 0 });
  function hit(e) {
    const built = getShown()?.built;
    if (!built?.tree) return false;
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((e.clientY - rect.top) / rect.height) * 2,
    );
    const ex = built.extents;
    center.set(0, ex.targetY + ex.height * 0.13, 0);
    plane.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(normal),
      center,
    );
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(plane, point)) return false;
    if (point.distanceTo(center) > Math.max(ex.width, ex.height) * 0.48)
      return false;
    target.value.copy(point);
    return true;
  }
  function clearPieces() {
    if (!detached) return;
    detached.removeFromParent();
    detached.geometry.dispose();
    detached.material.dispose();
    detached = null;
    pieces = [];
  }
  function shed() {
    clearPieces();
    const shown = getShown(),
      built = shown?.built;
    if (!built?.tree || (built.season !== "autumn" && !built.stats?.flowers))
      return;
    // Reuse the project's own botanical geometry rather than inventing particles.
    let source = null;
    built.tree.traverse((o) => {
      if (!source && o.isInstancedMesh && o.userData.sheddable) source = o;
    });
    if (!source) return;
    const flowering = built.season !== "autumn";
    const bloomSites = flowering ? built.bloomSites || [] : [];
    const count = Math.min(7, flowering ? bloomSites.length : source.count);
    if (!count) return;
    const geometry = flowering
      ? petalGeometry({ length: 0.17, width: 0.75, cup: 0.25 })
      : source.geometry.clone();
    const material = flowering
      ? new THREE.MeshStandardMaterial({
          color: built.petalColor
            ? "#" + built.petalColor.replace("#", "")
            : "#eee4ca",
          roughness: 1,
          side: THREE.DoubleSide,
        })
      : source.material.clone();
    material.transparent = true;
    // Do not carry the canopy's pinned sway onto detached leaves.
    material.onBeforeCompile = () => {};
    material.customProgramCacheKey = () => "detached-leaf-v1";
    detached = new THREE.InstancedMesh(geometry, material, count);
    detached.frustumCulled = false;
    shown.env.scene.add(detached);
    built.tree.updateMatrixWorld(true);
    const matrix = new THREE.Matrix4();
    pieces = Array.from({ length: count }, (_, i) => {
      source.getMatrixAt(
        Math.floor(((i + 0.5) * source.count) / count),
        matrix,
      );
      matrix.premultiply(source.matrixWorld);
      const position = new THREE.Vector3(),
        rotation = new THREE.Quaternion(),
        scale = new THREE.Vector3();
      matrix.decompose(position, rotation, scale);
      if (flowering) {
        position
          .copy(
            built.spots[
              bloomSites[Math.floor(((i + 0.5) * bloomSites.length) / count)]
            ].pos,
          )
          .applyMatrix4(built.tree.matrixWorld);
        scale.setScalar(1);
      }
      return { position, rotation, scale, phase: i * 1.73 };
    });
    elapsed = 0;
  }
  function stir() {
    if (!enabled) return;
    const shown = getShown();
    if (!shown?.built?.tree) return;
    pulse = 1;
    const now = performance.now();
    if (now - lastTap > 1600) {
      shed();
      lastTap = now;
    }
  }
  const onDown = (e) => {
    if (down) down.cancelled = true;
    else
      down = {
        x: e.clientX,
        y: e.clientY,
        time: performance.now(),
        id: e.pointerId,
      };
    hovering = false;
  };
  const onMove = (e) => {
    hovering = enabled && !down && e.pointerType !== "touch" && hit(e);
  };
  const onUp = (e) => {
    if (
      down?.id === e.pointerId &&
      isTap(down, { x: e.clientX, y: e.clientY, time: performance.now() }) &&
      hit(e)
    )
      stir();
    down = null;
  };
  const onCancel = () => {
    down = null;
    hovering = false;
  };
  const onLeave = () => {
    hovering = false;
  };
  const onKey = (e) => {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      center.set(0, getShown()?.built?.extents?.targetY || 3, 0);
      target.value.copy(center);
      stir();
    } else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
      e.preventDefault();
      camera.position
        .sub(controls.target)
        .applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          e.code === "ArrowLeft" ? -0.13 : 0.13,
        )
        .add(controls.target);
      controls.update();
    }
  };
  const events = [
    ["pointerdown", onDown],
    ["pointermove", onMove],
    ["pointerup", onUp],
    ["pointercancel", onCancel],
    ["pointerleave", onLeave],
    ["keydown", onKey],
  ];
  for (const [name, fn] of events) canvas.addEventListener(name, fn);
  const matrix = new THREE.Matrix4(),
    p = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    axis = new THREE.Vector3(1, 0.3, 0.5).normalize();
  return {
    stir,
    setEnabled(value) {
      enabled = value;
      if (!value) {
        hovering = false;
        pulse = 0;
        strength.value = 0;
        clearPieces();
      }
    },
    reset() {
      clearPieces();
      hovering = false;
      pulse = 0;
      strength.value = 0;
    },
    update(dt) {
      pulse *= Math.exp(-dt * 2.4);
      strength.value +=
        ((hovering ? 0.75 : 0) + pulse * 2.6 - strength.value) *
        (1 - Math.exp(-dt * 9));
      if (!detached || !enabled) return;
      elapsed += dt;
      if (elapsed > 3.4) {
        clearPieces();
        return;
      }
      materialOpacity(detached.material, elapsed);
      pieces.forEach((it, i) => {
        p.copy(it.position);
        p.y -= elapsed * 0.72;
        p.x += Math.sin(elapsed * 2 + it.phase) * elapsed * 0.18;
        p.z += elapsed * 0.13;
        q.setFromAxisAngle(axis, elapsed * 1.4 + it.phase).multiply(
          it.rotation,
        );
        matrix.compose(p, q, it.scale);
        detached.setMatrixAt(i, matrix);
      });
      detached.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      clearPieces();
      for (const [name, fn] of events) canvas.removeEventListener(name, fn);
    },
  };
}
function materialOpacity(material, t) {
  material.opacity = Math.min(1, Math.max(0, (3.4 - t) / 0.7));
}
