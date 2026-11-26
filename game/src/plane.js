// The courier plane: flight physics and the built-looking 3D model
// drawn from its own vertices (fuselage, wings, tail, spinning prop).

import { clamp } from './random.js';
import { groundHeight } from './terrain.js';

export const MAX_SPEED = 92; // m/s at full throttle, about 179 kt
export const STALL_SPEED = 26; // m/s, below this the nose drops
export const KT = 1.94384; // m/s to knots
export const FT = 3.28084; // m to feet

// Rotate a local model point by heading (yaw), pitch, then roll.
export function modelToWorld(px, py, pz, plane) {
  const ch = Math.cos(plane.heading);
  const sh = Math.sin(plane.heading);
  const cp = Math.cos(plane.pitch);
  const sp = Math.sin(plane.pitch);
  const cr = Math.cos(plane.roll);
  const sr = Math.sin(plane.roll);
  // Roll about the forward axis first.
  let x = px;
  let y = py * cr - pz * sr;
  let z = py * sr + pz * cr;
  // Then pitch about the right axis.
  const y2 = y * cp - z * sp;
  const z2 = y * sp + z * cp;
  y = y2;
  z = z2;
  // Then yaw about the up axis. Forward is +Z in local space.
  const x3 = x * ch + z * sh;
  const z3 = -x * sh + z * ch;
  return { x: plane.x + x3, y: plane.y + y, z: plane.z + z3 };
}

export class Plane {
  constructor() {
    this.reset(0, 260, -900, 0);
  }

  reset(x, y, z, heading) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.heading = heading;
    this.pitch = 0;
    this.roll = 0;
    this.speed = 46;
    this.throttle = 62;
    this.fuel = 100;
    this.damage = 0;
    this.verticalSpeed = 0;
    this.flaps = false;
    this.propAngle = 0;
  }

  update(dt, input, wind) {
    const targetRoll = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const rollTarget = targetRoll * 0.85 + (input.mouseSteer || 0) * 0.9;
    this.roll += (clamp(rollTarget, -1, 1) - this.roll) * Math.min(1, dt * 3.2);
    const pitchInput = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const pitchTarget = clamp(pitchInput * 0.32 + (input.mousePitch || 0) * 0.3, -0.38, 0.38);
    this.pitch += (pitchTarget - this.pitch) * Math.min(1, dt * 2.6);
    if (input.throttleUp) this.throttle = clamp(this.throttle + 34 * dt, 0, 100);
    if (input.throttleDown) this.throttle = clamp(this.throttle - 34 * dt, 0, 100);
    if (input.boost) this.throttle = clamp(this.throttle + 60 * dt, 0, 100);
    this.flaps = !!input.brake;

    const flapDrag = this.flaps ? 0.78 : 1;
    const targetSpeed = MAX_SPEED * (this.throttle / 100) * flapDrag;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 0.55);
    if (this.speed < STALL_SPEED) {
      this.pitch += ( -0.22 - this.pitch) * Math.min(1, dt * 1.4);
    }
    // Roll banks the plane into a turn; a steep bank turns harder.
    const turnRate = -this.roll * 0.55 * clamp(this.speed / 55, 0.25, 1.15);
    this.heading += turnRate * dt;

    const fwdX = Math.sin(this.heading) * Math.cos(this.pitch);
    const fwdY = Math.sin(this.pitch);
    const fwdZ = Math.cos(this.heading) * Math.cos(this.pitch);
    const wx = wind ? wind.x : 0;
    const wz = wind ? wind.z : 0;
    this.x += (fwdX * this.speed + wx) * dt;
    this.y += fwdY * this.speed * dt;
    this.z += (fwdZ * this.speed + wz) * dt;
    this.verticalSpeed = fwdY * this.speed;
    this.propAngle += dt * (6 + this.throttle * 0.55);
    // Fuel burns with throttle; flaps and full power drink faster.
    this.fuel = Math.max(0, this.fuel - dt * (0.16 + this.throttle * 0.0042 + (this.flaps ? 0.05 : 0)));
    if (this.fuel <= 0 && this.throttle > 0) this.throttle = 0;
    // Keep the plane inside the valley.
    const lim = 4000;
    this.x = clamp(this.x, -lim, lim);
    this.z = clamp(this.z, -lim, lim);
    if (this.y > 900) this.y = 900;
    return groundHeight(this.x, this.z);
  }

  get altitudeFt() {
    return Math.max(0, Math.round((this.y - groundHeight(this.x, this.z)) * FT));
  }

  get airspeedKt() {
    return Math.round(this.speed * KT);
  }

  get headingDeg() {
    return Math.round(((this.heading * 180) / Math.PI % 360 + 360) % 360);
  }
}

// Draw the plane as a small built courier aircraft in 3D space.
export function drawPlane(ctx, cam, plane, time) {
  const P = (x, y, z) => modelToWorld(x, y, z, plane);
  const proj = (pt) => cam.project(pt.x, pt.y, pt.z);
  const poly = (pts, fill, stroke) => {
    const sp = pts.map((q) => proj(P(q[0], q[1], q[2])));
    if (sp.some((q) => !q)) return;
    ctx.beginPath();
    ctx.moveTo(sp[0].x, sp[0].y);
    for (let i = 1; i < sp.length; i++) ctx.lineTo(sp[i].x, sp[i].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };
  // Wings (upper surface, cream with orange tips).
  poly([[-8.5, 0.15, -0.6], [-8.5, 0.15, -2.4], [8.5, 0.15, -2.4], [8.5, 0.15, -0.6]], '#f2e6c8', '#8a6d3b');
  poly([[-8.5, 0.15, -0.6], [-6.4, 0.15, -0.6], [-6.4, 0.15, -2.4], [-8.5, 0.15, -2.4]], '#e8732a', '#8a6d3b');
  poly([[8.5, 0.15, -0.6], [6.4, 0.15, -0.6], [6.4, 0.15, -2.4], [8.5, 0.15, -2.4]], '#e8732a', '#8a6d3b');
  // Tailplane and fin.
  poly([[-3.2, 0.5, -5.2], [-3.2, 0.5, -6.4], [3.2, 0.5, -6.4], [3.2, 0.5, -5.2]], '#e8732a', '#8a6d3b');
  poly([[0, 0.5, -4.6], [0, 2.6, -5.6], [0, 2.6, -6.6], [0, 0.5, -6.6]], '#e8732a', '#8a6d3b');
  // Fuselage: top spine and belly, orange stripe down the side.
  poly([[0, 1.05, 7.2], [-1.15, 0.35, -5.8], [-1.15, 0.35, -6.6], [0, 1.05, 7.2]], '#f7ead0', '#8a6d3b');
  poly([[0, 1.05, 7.2], [1.15, 0.35, -5.8], [1.15, 0.35, -6.6], [0, 1.05, 7.2]], '#e8d5ac', '#8a6d3b');
  poly([[0, -0.95, 7.0], [-1.05, -0.35, -5.8], [1.05, -0.35, -5.8], [0, -0.95, 7.0]], '#c85a1e', '#8a6d3b');
  // Canopy glass.
  poly([[-0.85, 1.0, 3.6], [0.85, 1.0, 3.6], [0.7, 1.05, 0.6], [-0.7, 1.05, 0.6]], '#9fd8ef', '#5b7d8c');
  // Spinning propeller: a translucent disc with two blades.
  const hub = proj(P(0, 0, 7.6));
  if (hub) {
    const r = 2.6 * hub.scale;
    ctx.save();
    ctx.translate(hub.x, hub.y);
    ctx.rotate(plane.propAngle);
    ctx.fillStyle = 'rgba(40,40,46,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.16, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,225,235,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#2c2c30';
    ctx.beginPath();
    ctx.arc(hub.x, hub.y, Math.max(2, r * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
  void time;
}
