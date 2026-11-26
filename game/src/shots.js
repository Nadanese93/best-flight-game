// Deterministic screenshot scenes for Meridian Courier.
// ?shot=start|play|land|complete (&seed=) freezes the game in a staged
// pose so every screenshot is a reproducible render of the real game.

import { buildMission, finalBreakdown } from './missions.js';
import { RUNWAYS } from './terrain.js';

export function parseShot() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number(params.get('seed') || '1') || 1;
  const mission = Number(params.get('mission') || '0') || 0;
  const cam = params.get('cam');
  return { shot, seed, mission, cam };
}

export function applyShot(game, shot, seed, missionIndex, cam) {
  game.seed = seed;
  game.buildWorld(seed);
  game.selectedMission = missionIndex;
  if (cam === 'chase' || cam === 'cockpit' || cam === 'trail') {
    game.cameraMode = cam;
  }
  const runway = RUNWAYS[0];
  if (shot === 'start') {
    game.state = 'start';
    game.mission = buildMission(0, seed);
    game.plane.reset(0, 300, -1100, 0.15);
    game.plane.speed = 52;
    game.plane.throttle = 62;
    game.plane.fuel = 100;
    game.mission.score = 0;
    return;
  }
  if (shot === 'land') {
    game.state = 'flying';
    game.mission = buildMission(1, seed);
    game.plane.reset(0, 20, -60, 0);
    game.plane.speed = 42;
    game.plane.throttle = 38;
    game.plane.pitch = -0.05;
    game.plane.fuel = 61;
    game.mission.score = 500;
    game.mission.ringsHit = 0;
    game.mission.elapsed = 96;
    return;
  }
  if (shot === 'complete') {
    game.state = 'complete';
    game.mission = buildMission(0, seed);
    game.mission.ringsHit = 8;
    game.mission.ringIndex = 8;
    game.mission.rings.forEach((r) => { r.passed = true; });
    game.mission.score = 2000;
    game.mission.elapsed = 148;
    game.mission.fuelLeft = 38;
    game.plane.reset(0, 320, -400, 0.2);
    game.plane.speed = 48;
    game.plane.throttle = 55;
    game.plane.fuel = 38;
    game.breakdown = finalBreakdown(game.mission);
    return;
  }
  // Default: 'play' — mid-flight, the next ring big and dead ahead, HUD lit.
  game.state = 'flying';
  game.mission = buildMission(0, seed);
  const ring = game.mission.rings[1];
  game.plane.reset(ring.x - Math.sin(ring.heading) * 300, ring.y + 4, ring.z - Math.cos(ring.heading) * 300, ring.heading);
  game.plane.speed = 58;
  game.plane.throttle = 74;
  game.plane.roll = -0.22;
  game.plane.fuel = 82;
  game.plane.pitch = 0.02;
  game.mission.score = 250;
  game.mission.ringsHit = 1;
  game.mission.ringIndex = 1;
  game.mission.rings[0].passed = true;
  game.mission.elapsed = 42;
  game.mission.message = 'RING 1/8  +250';
  game.mission.messageAt = 41;
}
