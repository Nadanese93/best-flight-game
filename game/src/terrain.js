// The valley of Meridian Courier: heightfield hills, a winding river,
// a small town, pine woods, and two runways carved flat into the ground.
// Everything here is a pure function of (x, z) plus the seed, so the
// world is identical on every load with the same seed.

import { clamp, hash2, lerp, mulberry32, smooth } from './random.js';

export const WATER_LEVEL = 0;
export const WORLD_HALF = 4200;

// Smooth value noise: two octaves of hashed lattice points.
function valueNoise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fz = smooth(z - iz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fz);
}

// The river snakes across the valley; its centre line is a fixed curve.
export function riverCentreZ(x) {
  return 620 * Math.sin(x * 0.00085 + 0.7) + 260 * Math.sin(x * 0.0021 + 2.4);
}

export function distanceToRiver(x, z) {
  return Math.abs(z - riverCentreZ(x));
}

// Runway strips, in world coordinates. heading is radians, 0 = +Z.
export const RUNWAYS = [
  { id: 'A', name: 'Meridian Field', x: 0, z: 300, heading: 0, length: 620, width: 46, height: 3 },
  { id: 'B', name: 'Pine Hollow', x: -1450, z: 2350, heading: 0.6, length: 520, width: 40, height: 3 },
];

export const TOWN = { x: 750, z: -650, radius: 380 };

function runwayBlend(x, z) {
  let best = 0;
  for (const r of RUNWAYS) {
    const dx = x - r.x;
    const dz = z - r.z;
    const along = dx * Math.sin(r.heading) + dz * Math.cos(r.heading);
    const across = dx * Math.cos(r.heading) - dz * Math.sin(r.heading);
    const d = Math.max(Math.abs(along) - r.length / 2, Math.abs(across) - r.width / 2);
    const blend = clamp(1 - d / 220, 0, 1);
    if (blend > best) best = blend;
  }
  return best;
}

export function groundHeight(x, z) {
  let h = valueNoise(x * 0.0016, z * 0.0016) * 52
    + valueNoise(x * 0.006, z * 0.006) * 11
    + 14 * Math.sin(x * 0.0009 + 1.3) * Math.cos(z * 0.0011 + 0.5)
    - 10;
  // The river carves a shallow channel.
  const rd = distanceToRiver(x, z);
  if (rd < 90) h = lerp(-4, h, smooth(clamp((rd - 18) / 72, 0, 1)));
  // The town sits on a flattened shelf.
  const td = Math.hypot(x - TOWN.x, z - TOWN.z);
  if (td < TOWN.radius + 120) {
    h = lerp(5, h, smooth(clamp((td - TOWN.radius * 0.55) / (TOWN.radius * 0.8), 0, 1)));
  }
  // Runways are flat pads.
  const rb = runwayBlend(x, z);
  if (rb > 0) h = lerp(h, RUNWAYS[0].height, rb);
  return h;
}

// Colour of one terrain cell, by height and place.
export function terrainColour(x, z, h) {
  const rd = distanceToRiver(x, z);
  if (rd < 26) return '#2e6d9e';
  if (rd < 52) return '#c9b98a';
  const td = Math.hypot(x - TOWN.x, z - TOWN.z);
  if (td < TOWN.radius * 0.8) return '#8f887a';
  const n = hash2(Math.floor(x / 150), Math.floor(z / 150));
  const dry = clamp((h - 18) / 30, 0, 1);
  const g = 96 + Math.floor(38 * (1 - dry)) + Math.floor(18 * n);
  const r = 74 + Math.floor(64 * dry) + Math.floor(16 * n);
  const b = 52 + Math.floor(22 * dry);
  return `rgb(${r},${g},${b})`;
}

// Scatter the world dressing once per seed: trees, buildings, clouds.
export function scatterWorld(seed) {
  const rand = mulberry32(seed);
  const trees = [];
  let guard = 0;
  while (trees.length < 240 && guard++ < 4000) {
    const x = (rand() * 2 - 1) * WORLD_HALF;
    const z = (rand() * 2 - 1) * WORLD_HALF;
    if (distanceToRiver(x, z) < 70) continue;
    if (Math.hypot(x - TOWN.x, z - TOWN.z) < TOWN.radius) continue;
    let onStrip = false;
    for (const r of RUNWAYS) {
      const dx = x - r.x;
      const dz = z - r.z;
      const along = dx * Math.sin(r.heading) + dz * Math.cos(r.heading);
      const across = dx * Math.cos(r.heading) - dz * Math.sin(r.heading);
      if (Math.abs(along) < r.length / 2 + 60 && Math.abs(across) < r.width / 2 + 60) onStrip = true;
    }
    if (onStrip) continue;
    const h = groundHeight(x, z);
    if (h < 2) continue;
    trees.push({ x, z, y: h, s: 14 + rand() * 16, shade: 0.75 + rand() * 0.25 });
  }
  const buildings = [];
  for (let i = 0; i < 30; i++) {
    const a = rand() * Math.PI * 2;
    const d = rand() * TOWN.radius * 0.72;
    const x = TOWN.x + Math.cos(a) * d;
    const z = TOWN.z + Math.sin(a) * d;
    buildings.push({
      x, z, y: groundHeight(x, z),
      w: 26 + rand() * 34, d: 22 + rand() * 30, h: 16 + rand() * 26,
      rot: rand() * Math.PI, tone: 0.7 + rand() * 0.3,
    });
  }
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    clouds.push({
      x: (rand() * 2 - 1) * WORLD_HALF,
      z: (rand() * 2 - 1) * WORLD_HALF,
      y: 480 + rand() * 260, s: 90 + rand() * 150,
    });
  }
  return { trees, buildings, clouds };
}
