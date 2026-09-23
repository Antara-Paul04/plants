import * as THREE from "three";

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
  function stir() {
    if (!enabled) return;
    const shown = getShown();
    if (!shown?.built?.tree) return;
    pulse = 1;
    const now = performance.now();
    if (now - lastTap > 900) {
      shown.built.shedLeaves?.(target.value);
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
  return {
    stir,
    setEnabled(value) {
      enabled = value;
      if (!value) {
        hovering = false;
        pulse = 0;
        strength.value = 0;
      }
    },
    reset() {
      hovering = false;
      pulse = 0;
      lastTap = -Infinity;
      strength.value = 0;
    },
    update(dt) {
      pulse *= Math.exp(-dt * 2.4);
      strength.value +=
        ((hovering ? 0.75 : 0) + pulse * 2.6 - strength.value) *
        (1 - Math.exp(-dt * 9));
    },
    dispose() {
      for (const [name, fn] of events) canvas.removeEventListener(name, fn);
    },
  };
}
