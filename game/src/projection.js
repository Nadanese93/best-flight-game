// A tiny software 3D camera: world points in, screen points out.
// No library, no WebGL — just a view basis and a perspective divide,
// plus a roll of the camera that follows the plane's bank.

export class Camera {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.focal = height * 0.95;
    this.pos = { x: 0, y: 0, z: 0 };
    this.fwd = { x: 0, y: 0, z: 1 };
    this.right = { x: 1, y: 0, z: 0 };
    this.up = { x: 0, y: 1, z: 0 };
    this.roll = 0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.focal = height * 0.95;
  }

  // Place the camera behind the plane, looking along its heading.
  // mode 'chase' sits back and above; 'trail' sits further back;
  // 'cockpit' sits at the pilot's seat, just ahead of the plane centre
  // and a touch above it, looking straight out over the nose.
  lookAtPlane(plane, mode) {
    const h = plane.heading;
    const p = plane.pitch;
    const fwd = {
      x: Math.sin(h) * Math.cos(p),
      y: Math.sin(p),
      z: Math.cos(h) * Math.cos(p),
    };
    let back = 0;
    let lift = 0;
    let rollScale = 1;
    if (mode === 'chase') {
      back = 40;
      lift = 10;
      rollScale = 0.55;
    } else if (mode === 'cockpit') {
      back = -5;
      lift = 2.2;
      rollScale = 1;
    } else {
      back = 58;
      lift = 16;
    }
    this.pos = {
      x: plane.x - fwd.x * back,
      y: plane.y - fwd.y * back + lift,
      z: plane.z - fwd.z * back,
    };
    this.fwd = fwd;
    const right = { x: Math.cos(h), y: 0, z: -Math.sin(h) };
    // Up is fwd x right: with heading 0 this gives (0, 1, 0).
    const up = {
      x: fwd.y * right.z - fwd.z * right.y,
      y: fwd.z * right.x - fwd.x * right.z,
      z: fwd.x * right.y - fwd.y * right.x,
    };
    this.right = right;
    this.up = up;
    this.roll = plane.roll * rollScale;
  }

  // Project a world point. Returns null when behind the camera.
  project(x, y, z) {
    const dx = x - this.pos.x;
    const dy = y - this.pos.y;
    const dz = z - this.pos.z;
    let cx = dx * this.right.x + dy * this.right.y + dz * this.right.z;
    let cy = dx * this.up.x + dy * this.up.y + dz * this.up.z;
    const cz = dx * this.fwd.x + dy * this.fwd.y + dz * this.fwd.z;
    if (cz < 4) return null;
    const cos = Math.cos(this.roll);
    const sin = Math.sin(this.roll);
    const rx = cx * cos - cy * sin;
    const ry = cx * sin + cy * cos;
    cx = rx;
    cy = ry;
    const scale = this.focal / cz;
    return {
      x: this.width / 2 + cx * scale,
      y: this.height / 2 - cy * scale,
      depth: cz,
      scale,
    };
  }

  // Project a world point, clamping points nearer than the near plane onto
  // it so ground quads that straddle the camera still draw instead of
  // leaving a hole right below the lens. rawDepth stays the true depth
  // for sorting; it is negative only for points behind the camera.
  projectLoose(x, y, z) {
    const dx = x - this.pos.x;
    const dy = y - this.pos.y;
    const dz = z - this.pos.z;
    let cx = dx * this.right.x + dy * this.right.y + dz * this.right.z;
    let cy = dx * this.up.x + dy * this.up.y + dz * this.up.z;
    const rawDepth = dx * this.fwd.x + dy * this.fwd.y + dz * this.fwd.z;
    let cz = rawDepth;
    if (cz < 4) {
      const k = 4 / Math.max(cz, 0.5);
      cx *= k;
      cy *= k;
      cz = 4;
    }
    const cos = Math.cos(this.roll);
    const sin = Math.sin(this.roll);
    const rx = cx * cos - cy * sin;
    const ry = cx * sin + cy * cos;
    cx = rx;
    cy = ry;
    const scale = this.focal / cz;
    return {
      x: this.width / 2 + cx * scale,
      y: this.height / 2 - cy * scale,
      depth: cz,
      rawDepth,
      scale,
    };
  }

  // Rough "is this point worth drawing" test, by depth and screen bounds.
  visible(x, y, z, margin) {
    const p = this.project(x, y, z);
    if (!p) return null;
    const m = margin || 0;
    if (p.x < -m || p.x > this.width + m || p.y < -m || p.y > this.height + m) return null;
    return p;
  }
}
