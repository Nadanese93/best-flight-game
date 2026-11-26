// The HUD and the screens of Meridian Courier: lit instruments, a
// compass strip, fuel and score panels, and the title, pause, crash and
// mission-complete screens. Everything is drawn on the canvas so the
// screenshots show exactly what the player sees.

import { MISSIONS } from './missions.js';
import { FT } from './plane.js';

const INK = '#d9f4ff';
const DIM = '#8fb8c9';
const AMBER = '#ffc85e';
const GREEN = '#7dff9e';
const RED = '#ff6b5e';
const PANEL = 'rgba(6, 22, 34, 0.78)';
const PANEL_EDGE = 'rgba(127, 231, 255, 0.35)';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PANEL;
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
}

function label(ctx, text, x, y, size, colour) {
  ctx.fillStyle = colour || DIM;
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function value(ctx, text, x, y, size, colour) {
  ctx.fillStyle = colour || INK;
  ctx.font = `800 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function compassStrip(ctx, width, headingDeg) {
  const cx = width / 2;
  const y = 46;
  ctx.save();
  ctx.fillStyle = PANEL;
  ctx.strokeStyle = PANEL_EDGE;
  ctx.beginPath();
  ctx.roundRect(cx - 210, 14, 420, 44, 10);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(cx - 210, 14, 420, 44);
  ctx.clip();
  const points = [[0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'], [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW']];
  for (let d = -360; d <= 720; d += 15) {
    const rel = ((d - headingDeg + 540) % 360) - 180;
    if (rel < -120 || rel > 120) continue;
    const x = cx + rel * 1.7;
    const major = d % 45 === 0;
    ctx.strokeStyle = major ? INK : DIM;
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x, y + (major ? 12 : 6));
    ctx.stroke();
    const hit = points.find((p) => p[0] === ((d % 360) + 360) % 360);
    if (hit) {
      ctx.fillStyle = hit[1].length === 1 ? AMBER : INK;
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(hit[1], x, y + 26);
    }
  }
  ctx.restore();
  ctx.fillStyle = AMBER;
  ctx.beginPath();
  ctx.moveTo(cx, 12);
  ctx.lineTo(cx - 6, 2);
  ctx.lineTo(cx + 6, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = '800 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(headingDeg).padStart(3, '0') + '°', cx, 76);
}

function attitudeGauge(ctx, x, y, r, pitch, roll) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
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
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, y);
  ctx.lineTo(x - r * 0.18, y);
  ctx.moveTo(x + r * 0.18, y);
  ctx.lineTo(x + r * 0.55, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fillStyle = AMBER;
  ctx.fill();
}

export function drawHUD(ctx, width, height, game) {
  const plane = game.plane;
  const mission = game.mission;
  const W = width;
  const H = height;
  // Top-left: altitude, speed, vertical speed.
  panel(ctx, 14, 14, 208, 108);
  label(ctx, 'ALTITUDE', 28, 38, 12);
  value(ctx, `${Math.round(plane.y * FT).toLocaleString('en-US')} ft`, 28, 66, 24);
  label(ctx, 'AIRSPEED', 28, 92, 12);
  value(ctx, `${plane.airspeedKt} kt`, 28, 118, 24, plane.airspeedKt < 55 ? AMBER : INK);
  // Top-right: throttle, fuel, score, timer.
  panel(ctx, W - 232, 14, 218, 132);
  label(ctx, 'THROTTLE', W - 218, 38, 12);
  value(ctx, `${Math.round(plane.throttle)}%`, W - 218, 66, 24);
  label(ctx, 'FUEL', W - 218, 92, 12);
  const fuelW = 150;
  const fuelX = W - 218;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(fuelX, 100, fuelW, 12);
  const lowFuel = plane.fuel < 25;
  ctx.fillStyle = lowFuel ? RED : GREEN;
  ctx.fillRect(fuelX, 100, fuelW * Math.max(0, plane.fuel / 100), 12);
  value(ctx, `${Math.round(plane.fuel)}%`, fuelX + fuelW + 8, 112, 14, lowFuel ? RED : INK);
  label(ctx, 'SCORE', W - 218, 134, 12);
  value(ctx, `${mission.score}`, W - 152, 134, 16, AMBER);
  // Compass across the top.
  compassStrip(ctx, W, plane.headingDeg);
  // Mission strip under the compass (flying only; end screens hide it so
  // the result title owns the top of the frame).
  if (game.state === 'flying' || game.state === 'paused') {
    panel(ctx, W / 2 - 250, 86, 500, 52);
    ctx.fillStyle = INK;
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const target = game.nextTargetLabel();
    ctx.fillText(`${mission.def.name}  ·  ${target}`, W / 2, 104);
    const remain = Math.max(0, Math.ceil(mission.def.timeLimit - mission.elapsed));
    ctx.fillStyle = remain < 60 ? RED : DIM;
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(`TIME ${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, '0')}`, W / 2, 126);
  }
  // Attitude gauge, bottom-left — skipped in cockpit view, where the
  // panel carries its own horizon dial.
  if (game.cameraMode !== 'cockpit') {
    attitudeGauge(ctx, 74, H - 78, 46, plane.pitch, plane.roll);
    label(ctx, 'ATTITUDE', 38, H - 18, 11);
  }
  // Help line, bottom centre — above the prop disc in cockpit view, where
  // the nose and the panel would cover it at the bottom.
  ctx.fillStyle = 'rgba(217, 244, 255, 0.85)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('W/S pitch · A/D turn · Shift/Ctrl throttle · Space flaps · C camera: chase / cockpit / trail · M mute · P pause · R restart', W / 2, game.cameraMode === 'cockpit' ? H - 344 : H - 16);
  // Warnings.
  let warnY = 150;
  const warn = [];
  if (plane.fuel < 25) warn.push(['LOW FUEL', RED]);
  if (plane.airspeedKt < 55 && game.state === 'flying') warn.push(['STALL — ADD THROTTLE', AMBER]);
  const ground = game.groundBelow;
  if (plane.y - ground < 45 && plane.verticalSpeed < -6 && game.state === 'flying') {
    warn.push(['PULL UP', RED]);
  }
  for (const [text, colour] of warn) {
    ctx.fillStyle = colour;
    ctx.font = '800 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, W / 2, warnY);
    warnY += 30;
  }
  // Toast message (ring / landing).
  if (mission.message && game.now - mission.messageAt < 2.6) {
    ctx.fillStyle = GREEN;
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mission.message, W / 2, H * 0.32);
  }
  // Centre flight-path marker.
  ctx.strokeStyle = 'rgba(217, 244, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2 - 16, H / 2);
  ctx.lineTo(W / 2 - 6, H / 2);
  ctx.moveTo(W / 2 + 6, H / 2);
  ctx.lineTo(W / 2 + 16, H / 2);
  ctx.moveTo(W / 2, H / 2 - 16);
  ctx.lineTo(W / 2, H / 2 - 6);
  ctx.moveTo(W / 2, H / 2 + 6);
  ctx.lineTo(W / 2, H / 2 + 16);
  ctx.stroke();
  // Next-ring guide arrow at the screen edge.
  game.drawGuideArrow(ctx);
}

function overlay(ctx, width, height, alpha) {
  ctx.fillStyle = `rgba(4, 14, 24, ${alpha})`;
  ctx.fillRect(0, 0, width, height);
}

export function drawStartScreen(ctx, width, height, game) {
  overlay(ctx, width, height, 0.42);
  ctx.textAlign = 'center';
  ctx.fillStyle = AMBER;
  ctx.font = '800 15px system-ui, sans-serif';
  ctx.fillText('M E R I D I A N   A I R   M A I L', width / 2, height * 0.16);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 68px system-ui, sans-serif';
  ctx.fillText('MERIDIAN COURIER', width / 2, height * 0.16 + 72);
  ctx.fillStyle = INK;
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillText('Fly the mail run across the valley — rings, short strips, and weather that bites back.', width / 2, height * 0.16 + 108);
  const boxW = 640;
  const boxX = (width - boxW) / 2;
  const boxY = height * 0.16 + 140;
  panel(ctx, boxX, boxY, boxW, 218);
  ctx.fillStyle = INK;
  ctx.font = '800 16px system-ui, sans-serif';
  ctx.fillText('CHOOSE YOUR SORTIE — press 1, 2 or 3', width / 2, boxY + 30);
  MISSIONS.forEach((m, i) => {
    const y = boxY + 66 + i * 54;
    const selected = game.selectedMission === i;
    ctx.fillStyle = selected ? AMBER : INK;
    ctx.font = '800 19px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}. ${m.name}`, boxX + 26, y);
    ctx.fillStyle = DIM;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(m.blurb, boxX + 26, y + 21);
    if (selected) {
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(boxX + 8, y - 26, boxW - 16, 50, 8);
      ctx.stroke();
    }
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText('W/S pitch · A/D turn · Shift / Ctrl throttle · Space flaps · mouse steers · click boosts', width / 2, boxY + 240);
  ctx.fillStyle = DIM;
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText('C camera — chase / cockpit / trail · M mute · P pause · R restart', width / 2, boxY + 264);
  ctx.fillStyle = AMBER;
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.fillText('Press ENTER or click to fly', width / 2, boxY + 298);
  ctx.fillStyle = DIM;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText('Original game · vanilla JavaScript · no downloads, no network', width / 2, height - 22);
}

export function drawPauseScreen(ctx, width, height) {
  overlay(ctx, width, height, 0.55);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 54px system-ui, sans-serif';
  ctx.fillText('PAUSED', width / 2, height / 2 - 10);
  ctx.fillStyle = INK;
  ctx.font = '600 19px system-ui, sans-serif';
  ctx.fillText('P to resume · R to restart from the start screen', width / 2, height / 2 + 30);
}

export function drawCrashScreen(ctx, width, height, game) {
  overlay(ctx, width, height, 0.6);
  ctx.textAlign = 'center';
  ctx.fillStyle = RED;
  ctx.font = '800 54px system-ui, sans-serif';
  ctx.fillText('CRASHED', width / 2, height * 0.32);
  ctx.fillStyle = INK;
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillText(game.crashReason || 'The valley wins this round.', width / 2, height * 0.32 + 38);
  panel(ctx, width / 2 - 190, height * 0.32 + 66, 380, 96);
  ctx.fillStyle = DIM;
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE', width / 2 - 168, height * 0.32 + 98);
  ctx.fillText('RINGS', width / 2 - 168, height * 0.32 + 126);
  ctx.fillText('TIME', width / 2 - 168, height * 0.32 + 152);
  ctx.fillStyle = INK;
  ctx.font = '800 16px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${game.mission.score}`, width / 2 + 168, height * 0.32 + 98);
  ctx.fillText(`${game.mission.ringsHit}/${game.mission.rings.length}`, width / 2 + 168, height * 0.32 + 126);
  ctx.fillText(`${Math.round(game.mission.elapsed)}s`, width / 2 + 168, height * 0.32 + 152);
  ctx.textAlign = 'center';
  ctx.fillStyle = AMBER;
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.fillText('Press R to fly again', width / 2, height * 0.32 + 206);
}

export function drawCompleteScreen(ctx, width, height, game) {
  overlay(ctx, width, height, 0.55);
  ctx.textAlign = 'center';
  ctx.fillStyle = GREEN;
  ctx.font = '800 52px system-ui, sans-serif';
  ctx.fillText('MISSION COMPLETE', width / 2, height * 0.2);
  ctx.fillStyle = INK;
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillText(`${game.mission.def.name} — the mail got through.`, width / 2, height * 0.2 + 36);
  const b = game.breakdown;
  const rows = [
    ['Rings flown', b.rings],
    ['Landings', b.landings],
    ['Time bonus', b.timeBonus],
    ['Fuel bonus', b.fuelBonus],
  ];
  const boxY = height * 0.2 + 66;
  panel(ctx, width / 2 - 230, boxY, 460, 44 + rows.length * 36 + 52);
  rows.forEach((row, i) => {
    const y = boxY + 40 + i * 36;
    ctx.fillStyle = DIM;
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(row[0], width / 2 - 204, y);
    ctx.fillStyle = INK;
    ctx.font = '800 17px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`+${row[1]}`, width / 2 + 204, y);
  });
  const ty = boxY + 40 + rows.length * 36;
  ctx.strokeStyle = PANEL_EDGE;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 204, ty - 8);
  ctx.lineTo(width / 2 + 204, ty - 8);
  ctx.stroke();
  ctx.fillStyle = AMBER;
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL', width / 2 - 204, ty + 26);
  ctx.textAlign = 'right';
  ctx.fillText(`${b.total}`, width / 2 + 204, ty + 26);
  ctx.textAlign = 'center';
  ctx.fillStyle = AMBER;
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.fillText('Press R to fly the next sortie', width / 2, boxY + 44 + rows.length * 36 + 96);
}
