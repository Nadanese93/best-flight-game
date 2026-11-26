// The cockpit view of Meridian Courier: the canopy frame, the nose
// cowling and spinning prop seen over it, and a lit instrument panel
// along the bottom — artificial horizon, altimeter, airspeed, heading
// compass, throttle and fuel — all driven by the same plane data the
// HUD reads. Drawn on the canvas, so screenshots show exactly what
// the player sees. Only used when cameraMode is 'cockpit'. The frame
// (canopy, nose, prop) draws before the HUD so the HUD stays legible
// over it; the panel draws after the HUD so the dials sit on top.

import { FT } from './plane.js';

const INK = '#d9f4ff';
const DIM = '#8fb8c9';
const AMBER = '#ffc85e';
const GREEN = '#7dff9e';
const RED = '#ff6b5e';
const PANEL_EDGE = 'rgba(127, 231, 255, 0.35)';
const FRAME = '#1d2733';
const FRAME_EDGE = '#3d4a58';

function dialFace(ctx, x, y, r) {
  ctx.fillStyle = '#0a1c28';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(217, 244, 255, 0.55)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const major = i % 3 === 0;
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(a) * r * (major ? 0.8 : 0.86), y - Math.cos(a) * r * (major ? 0.8 : 0.86));
    ctx.lineTo(x + Math.sin(a) * r * 0.94, y - Math.cos(a) * r * 0.94);
    ctx.stroke();
  }
}

function needle(ctx, x, y, r, angle, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = colour || AMBER;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.18);
  ctx.lineTo(0, -r * 0.82);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = AMBER;
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function dialLabel(ctx, text, x, y) {
  ctx.fillStyle = DIM;
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

function dialValue(ctx, text, x, y, size, colour) {
  ctx.fillStyle = colour || INK;
  ctx.font = `800 ${size || 15}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

function horizonDial(ctx, x, y, r, pitch, roll) {
  dialFace(ctx, x, y, r);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r - 3, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(-roll);
  const horizon = pitch * r * 1.4;
  ctx.fillStyle = '#2f6db3';
  ctx.fillRect(-r, -r + horizon, r * 2, r);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-r, horizon, r * 2, r);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(-r, horizon - 1, r * 2, 2);
  ctx.rotate(roll);
  ctx.restore();
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, y);
  ctx.lineTo(x - r * 0.18, y);
  ctx.moveTo(x + r * 0.18, y);
  ctx.lineTo(x + r * 0.55, y);
  ctx.stroke();
  ctx.fillStyle = AMBER;
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

function compassDial(ctx, x, y, r, headingDeg) {
  dialFace(ctx, x, y, r);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r - 3, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(-(headingDeg * Math.PI) / 180);
  const points = [[0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'], [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW']];
  for (let d = 0; d < 360; d += 15) {
    const a = (d * Math.PI) / 180;
    const major = d % 45 === 0;
    ctx.strokeStyle = major ? INK : DIM;
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(a) * r * 0.72, y - Math.cos(a) * r * 0.72);
    ctx.lineTo(x + Math.sin(a) * r * 0.86, y - Math.cos(a) * r * 0.86);
    ctx.stroke();
    const hit = points.find((p) => p[0] === d);
    if (hit) {
      ctx.fillStyle = hit[1].length === 1 ? AMBER : INK;
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hit[1], x + Math.sin(a) * r * 0.52, y - Math.cos(a) * r * 0.52);
    }
  }
  ctx.restore();
  // Fixed lubber line at the top of the dial.
  ctx.fillStyle = AMBER;
  ctx.beginPath();
  ctx.moveTo(x, y - r + 2);
  ctx.lineTo(x - 6, y - r + 12);
  ctx.lineTo(x + 6, y - r + 12);
  ctx.closePath();
  ctx.fill();
  ctx.textBaseline = 'alphabetic';
}

function verticalGauge(ctx, x, y, h, frac, labelText, valueText, colour) {
  const w = 22;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  ctx.fill();
  ctx.fillStyle = colour;
  const fh = Math.max(0, Math.min(1, frac)) * (h - 4);
  ctx.beginPath();
  ctx.roundRect(x + 2, y + h - 2 - fh, w - 4, fh, 4);
  ctx.fill();
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  ctx.stroke();
  dialLabel(ctx, labelText, x + w / 2, y + h + 16);
  dialValue(ctx, valueText, x + w / 2, y - 10, 14);
}

export function drawCockpitFrame(ctx, width, height, game) {
  const W = width;
  const H = height;
  const plane = game.plane;
  const cx = W / 2;
  const panelH = 150;
  const panelY = H - panelH;

  // --- Canopy frame: side pillars and the top arch. ---
  ctx.fillStyle = FRAME;
  ctx.strokeStyle = FRAME_EDGE;
  ctx.lineWidth = 2;
  // Left pillar.
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, 0);
  ctx.lineTo(44, 0);
  ctx.lineTo(66, panelY);
  ctx.lineTo(66, H);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Right pillar.
  ctx.beginPath();
  ctx.moveTo(W, H);
  ctx.lineTo(W, 0);
  ctx.lineTo(W - 44, 0);
  ctx.lineTo(W - 66, panelY);
  ctx.lineTo(W - 66, H);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Top arch band.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, 30);
  ctx.lineTo(0, 30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // A faint windscreen glare so the glass reads as glass.
  const glare = ctx.createLinearGradient(0, 0, W, H * 0.5);
  glare.addColorStop(0, 'rgba(255,255,255,0.05)');
  glare.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glare;
  ctx.fillRect(66, 30, W - 132, H * 0.5);

  // --- Nose cowling and spinning prop, seen over the panel. ---
  const propY = panelY - 96;
  const propR = 82;
  // Prop disc, translucent so the world shows through.
  ctx.save();
  ctx.translate(cx, propY);
  ctx.rotate(plane.propAngle);
  ctx.fillStyle = 'rgba(220, 225, 235, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 0, propR * 0.14, propR, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(40, 40, 46, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 0, propR * 0.14, propR, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(220, 225, 235, 0.16)';
  ctx.beginPath();
  ctx.arc(cx, propY, propR, 0, Math.PI * 2);
  ctx.fill();
  // Cowling: cream nose with the courier's orange stripe.
  ctx.fillStyle = '#f2e6c8';
  ctx.strokeStyle = '#8a6d3b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 96, panelY + 2);
  ctx.lineTo(cx - 46, propY + 26);
  ctx.quadraticCurveTo(cx, propY - 6, cx + 46, propY + 26);
  ctx.lineTo(cx + 96, panelY + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8732a';
  ctx.beginPath();
  ctx.moveTo(cx - 58, panelY + 2);
  ctx.lineTo(cx - 30, propY + 30);
  ctx.lineTo(cx + 30, propY + 30);
  ctx.lineTo(cx + 58, panelY + 2);
  ctx.closePath();
  ctx.fill();
  // Spinner hub.
  ctx.fillStyle = '#2c2c30';
  ctx.beginPath();
  ctx.arc(cx, propY, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8732a';
  ctx.beginPath();
  ctx.arc(cx, propY, 5, 0, Math.PI * 2);
  ctx.fill();
}

// The instrument panel along the bottom. Drawn after the HUD so the
// dials sit on top of the world and the frame, never under them.
export function drawCockpitPanel(ctx, width, height, game) {
  const W = width;
  const H = height;
  const plane = game.plane;
  const panelH = 150;
  const panelY = H - panelH;
  const grad = ctx.createLinearGradient(0, panelY, 0, H);
  grad.addColorStop(0, '#16242e');
  grad.addColorStop(1, '#0a141b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, panelY, W, panelH);
  ctx.fillStyle = 'rgba(255, 220, 140, 0.5)';
  ctx.fillRect(0, panelY, W, 2);
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, panelY + 2.5, W - 1, panelH - 3);

  const dialY = panelY + 62;
  const dialR = 44;
  // Artificial horizon.
  horizonDial(ctx, 116, dialY, dialR, plane.pitch, plane.roll);
  dialLabel(ctx, 'ATTITUDE', 116, panelY + 128);
  // Altimeter: 0–3000 ft over a 270° sweep.
  const altFt = Math.max(0, Math.round(plane.y * FT));
  dialFace(ctx, 288, dialY, dialR);
  needle(ctx, 288, dialY, dialR, (-135 + Math.min(1, altFt / 3000) * 270) * Math.PI / 180);
  dialValue(ctx, `${altFt.toLocaleString('en-US')}`, 288, dialY + 22, 13);
  dialLabel(ctx, 'ALTITUDE · FT', 288, panelY + 128);
  // Airspeed: 0–180 kt over a 270° sweep.
  const kt = plane.airspeedKt;
  dialFace(ctx, 460, dialY, dialR);
  needle(ctx, 460, dialY, dialR, (-135 + Math.min(1, kt / 180) * 270) * Math.PI / 180, kt < 55 ? AMBER : GREEN);
  dialValue(ctx, `${kt}`, 460, dialY + 22, 13);
  dialLabel(ctx, 'AIRSPEED · KT', 460, panelY + 128);
  // Heading compass.
  compassDial(ctx, 824, dialY, dialR, plane.headingDeg);
  dialValue(ctx, `${String(plane.headingDeg).padStart(3, '0')}°`, 824, dialY + 22, 13);
  dialLabel(ctx, 'HEADING', 824, panelY + 128);
  // Throttle and fuel gauges.
  const lowFuel = plane.fuel < 25;
  verticalGauge(ctx, 972, panelY + 22, 84, plane.throttle / 100, 'THROTTLE', `${Math.round(plane.throttle)}%`, AMBER);
  verticalGauge(ctx, 1064, panelY + 22, 84, plane.fuel / 100, 'FUEL', `${Math.round(plane.fuel)}%`, lowFuel ? RED : GREEN);
  // Panel plate, centre-right of the cowling.
  dialLabel(ctx, 'MERIDIAN COURIER', 1180, panelY + 34);
  ctx.fillStyle = lowFuel ? RED : DIM;
  ctx.font = '800 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(lowFuel ? 'LOW FUEL' : `SCORE ${game.mission.score}`, 1180, panelY + 58);
  ctx.fillStyle = DIM;
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('CAM · COCKPIT', 1180, panelY + 80);
  ctx.fillText('C TO CHANGE', 1180, panelY + 96);
}
