// Missions for Meridian Courier: three sorties with different goals,
// rings to fly through, runways to land on, and the scoring behind them.

import { mulberry32 } from './random.js';
import { RUNWAYS, groundHeight } from './terrain.js';

export const MISSIONS = [
  {
    id: 'rings',
    name: 'Ring Run',
    blurb: 'Fly through 8 rings in order before the fuel runs dry.',
    fuel: 100,
    rings: 8,
    timeLimit: 300,
  },
  {
    id: 'hop',
    name: 'Island Hop',
    blurb: 'Land clean on both short strips: Meridian Field, then Pine Hollow.',
    fuel: 100,
    rings: 0,
    timeLimit: 420,
  },
  {
    id: 'storm',
    name: 'Storm Courier',
    blurb: 'Six rings on a long course, tight fuel, no room for a wide turn.',
    fuel: 72,
    rings: 6,
    timeLimit: 300,
  },
];

function ringCourse(seed, count, longCourse) {
  const rand = mulberry32(seed * 7919 + 13);
  const rings = [];
  let x = -260 + rand() * 200;
  let z = -700;
  let heading = 0;
  for (let i = 0; i < count; i++) {
    heading += (rand() - 0.5) * 0.9;
    const step = longCourse ? 620 + rand() * 260 : 520 + rand() * 220;
    x += Math.sin(heading) * step;
    z += Math.cos(heading) * step;
    const y = 150 + rand() * 150;
    rings.push({
      x, z, y,
      r: 26,
      heading,
      passed: false,
    });
  }
  return rings;
}

export function buildMission(index, seed) {
  const def = MISSIONS[index];
  const rings = def.rings > 0 ? ringCourse(seed, def.rings, def.id === 'storm') : [];
  const runways = def.id === 'hop' ? [RUNWAYS[0], RUNWAYS[1]] : [RUNWAYS[0]];
  return {
    def,
    rings,
    runways,
    ringIndex: 0,
    landed: [],
    score: 0,
    ringsHit: 0,
    landings: 0,
    timeBonus: 0,
    fuelBonus: 0,
    elapsed: 0,
    message: '',
    messageAt: 0,
  };
}

export function nextTarget(mission) {
  if (mission.def.id === 'hop') {
    return { kind: 'runway', runway: mission.runways[mission.landed.length] || null };
  }
  return { kind: 'ring', ring: mission.rings[mission.ringIndex] || null };
}

// True when the plane crosses a ring's disc closely enough to count.
export function checkRingPass(plane, ring) {
  if (!ring || ring.passed) return false;
  const dx = plane.x - ring.x;
  const dy = plane.y - ring.y;
  const dz = plane.z - ring.z;
  const dist = Math.hypot(dx, dy, dz);
  return dist < ring.r + 6;
}

export function onRingPassed(mission) {
  const ring = mission.rings[mission.ringIndex];
  if (!ring) return;
  ring.passed = true;
  mission.ringIndex += 1;
  mission.ringsHit += 1;
  mission.score += 250;
  mission.message = `RING ${mission.ringsHit}/${mission.rings.length}  +250`;
  mission.messageAt = mission.elapsed;
}

export function onLanding(mission, runway, quality) {
  mission.landed.push(runway.id);
  mission.landings += 1;
  const points = quality === 'clean' ? 500 : 250;
  mission.score += points;
  mission.message = quality === 'clean'
    ? `CLEAN LANDING — ${runway.name}  +${points}`
    : `ROUGH LANDING — ${runway.name}  +${points}`;
  mission.messageAt = mission.elapsed;
}

export function missionComplete(mission) {
  if (mission.def.id === 'hop') return mission.landed.length >= 2;
  if (mission.def.id === 'rings') return mission.ringIndex >= mission.rings.length;
  return mission.ringIndex >= mission.rings.length;
}

// Score breakdown shown on the mission-complete screen.
export function finalBreakdown(mission) {
  const timeLeft = Math.max(0, mission.def.timeLimit - mission.elapsed);
  mission.timeBonus = Math.round(timeLeft * 2);
  mission.fuelBonus = Math.round(mission.fuelLeft * 4);
  const total = mission.score + mission.timeBonus + mission.fuelBonus;
  return {
    rings: mission.ringsHit * 250,
    landings: mission.landings * 500,
    timeBonus: mission.timeBonus,
    fuelBonus: mission.fuelBonus,
    total,
  };
}

export function runwayLocal(runway, x, z) {
  const dx = x - runway.x;
  const dz = z - runway.z;
  return {
    along: dx * Math.sin(runway.heading) + dz * Math.cos(runway.heading),
    across: dx * Math.cos(runway.heading) - dz * Math.sin(runway.heading),
  };
}

// Landing check: over the strip, low, slow, and descending gently.
export function landingVerdict(plane, runway) {
  const local = runwayLocal(runway, plane.x, plane.z);
  const ground = groundHeight(plane.x, plane.z);
  const heightAbove = plane.y - ground;
  if (Math.abs(local.along) > runway.length / 2 + 20) return null;
  if (Math.abs(local.across) > runway.width / 2 + 6) return null;
  if (heightAbove > 4) return null;
  if (plane.verticalSpeed < -9) return 'crash';
  if (plane.speed > 62) return 'crash';
  if (Math.abs(plane.roll) > 0.5) return 'crash';
  return plane.verticalSpeed < -4.5 || plane.speed > 48 ? 'rough' : 'clean';
}
