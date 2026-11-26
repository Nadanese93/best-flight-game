// Meridian Courier — the game itself: state machine, world rendering
// (sky, clouds, terrain, town, trees, rings, runways), landings, crashes
// and scoring. Vanilla canvas 2D with a hand-rolled 3D projection.

import { Camera } from './projection.js';
import { Plane, drawPlane, FT } from './plane.js';
import { RUNWAYS, TOWN, distanceToRiver, groundHeight, scatterWorld, terrainColour } from './terrain.js';
import { buildMission, checkRingPass, finalBreakdown, landingVerdict, missionComplete, nextTarget, onLanding, onRingPassed } from './missions.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { drawCompleteScreen, drawCrashScreen, drawHUD, drawPauseScreen, drawStartScreen } from './hud.js';
import { drawCockpitFrame, drawCockpitPanel } from './cockpit.js';
import { applyShot, parseShot } from './shots.js';
import { clamp } from './random.js';

const CELL = 150;
const VIEW_CELLS = 16;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 1280;
    this.height = 800;
    this.input = new Input(canvas);
    this.audio = new AudioEngine();
    this.plane = new Plane();
    this.camera = new Camera(1280, 800);
    this.state = 'start';
    this.selectedMission = 0;
    this.seed = 1;
    this.world = scatterWorld(1);
    this.mission = buildMission(0, 1);
    this.cameraMode = 'chase';
    this.now = 0;
    this.last = 0;
    this.crashReason = '';
    this.breakdown = null;
    this.groundBelow = 0;
    this.shotMode = false;
    this.landedFlash = 0;
    this.bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  bindInput() {
    const input = this.input;
    input.onPause = () => {
      if (this.state === 'flying') this.state = 'paused';
      else if (this.state === 'paused') this.state = 'flying';
    };
    input.onRestart = () => {
      this.toStart();
    };
    input.onCamera = () => {
      const modes = ['chase', 'cockpit', 'trail'];
      this.cameraMode = modes[(modes.indexOf(this.cameraMode) + 1) % modes.length];
    };
    input.onMute = () => {
      this.audio.ensure();
      this.audio.toggleMute();
    };
    input.onConfirm = () => {
      this.audio.ensure();
      if (this.state === 'start') this.startMission(this.selectedMission);
    };
    input.onMission = (i) => {
      if (this.state === 'start') this.selectedMission = i;
    };
    this.canvas.addEventListener('click', () => {
      this.audio.ensure();
      if (this.state === 'start') this.startMission(this.selectedMission);
    });
  }

  buildWorld(seed) {
    this.seed = seed;
    this.world = scatterWorld(seed);
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || 1280;
    const h = this.canvas.clientHeight || 800;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = w;
    this.height = h;
    this.camera.resize(w, h);
  }

  toStart() {
    this.state = 'start';
    this.mission = buildMission(this.selectedMission, this.seed);
    this.plane.reset(0, 300, -1100, 0.15);
    this.plane.speed = 52;
    this.plane.throttle = 62;
  }

  startMission(index) {
    this.selectedMission = index;
    this.mission = buildMission(index, this.seed);
    const def = this.mission.def;
    if (def.id === 'hop') {
      this.plane.reset(0, 14, 40, 0);
      this.plane.speed = 42;
      this.plane.throttle = 68;
    } else {
      const ring = this.mission.rings[0];
      this.plane.reset(
        ring.x - Math.sin(ring.heading) * 320,
        ring.y + 6,
        ring.z - Math.cos(ring.heading) * 320,
        ring.heading,
      );
      this.plane.speed = 50;
      this.plane.throttle = 70;
    }
    this.plane.fuel = def.fuel;
    this.state = 'flying';
  }

  crash(reason) {
    if (this.state !== 'flying') return;
    this.state = 'crashed';
    this.crashReason = reason;
    this.audio.crashSound();
    this.audio.setEngine(0, 0, false);
  }

  complete() {
    if (this.state !== 'flying') return;
    this.state = 'complete';
    this.mission.fuelLeft = this.plane.fuel;
    this.breakdown = finalBreakdown(this.mission);
    this.audio.thud();
    this.audio.setEngine(0, 0, false);
  }

  nextTargetLabel() {
    const t = nextTarget(this.mission);
    if (!t || (!t.ring && !t.runway)) return 'SORTIE CLEAR';
    if (t.kind === 'ring') {
      const ring = t.ring;
      const d = Math.round(Math.hypot(this.plane.x - ring.x, this.plane.y - ring.y, this.plane.z - ring.z));
      return `RING ${this.mission.ringIndex + 1}/${this.mission.rings.length} · ${d}m`;
    }
    return `LAND AT ${t.runway.name.toUpperCase()}`;
  }

  drawGuideArrow(ctx) {
    if (this.state !== 'flying') return;
    const t = nextTarget(this.mission);
    const target = t.ring || t.runway;
    if (!target) return;
    const tx = target.x;
    const ty = target.y || 20;
    const tz = target.z;
    const p = this.camera.project(tx, ty, tz);
    const W = this.width;
    const H = this.height;
    const dist = Math.round(Math.hypot(this.plane.x - tx, this.plane.y - ty, this.plane.z - tz));
    if (p && p.x > 60 && p.x < W - 60 && p.y > 90 && p.y < H - 90) {
      ctx.save();
      ctx.translate(p.x, p.y - 44);
      ctx.fillStyle = '#ffc85e';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, 8);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();
      ctx.font = '800 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${dist}m`, 0, 30);
      ctx.restore();
      return;
    }
    const bearing = Math.atan2(tx - this.plane.x, tz - this.plane.z) - this.plane.heading;
    const ax = W / 2 + Math.sin(bearing) * (W * 0.36);
    const ay = H / 2 - Math.cos(bearing) * (H * 0.32);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(bearing);
    ctx.fillStyle = '#ffc85e';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(11, 10);
    ctx.lineTo(-11, 10);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(-bearing);
    ctx.font = '800 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${dist}m`, 0, 32);
    ctx.restore();
  }

  update(dt) {
    this.now += dt;
    if (this.state === 'start') {
      this.plane.update(dt, {
        up: false, down: false, left: false, right: false,
        throttleUp: false, throttleDown: false, brake: false, boost: false,
        mouseSteer: 0, mousePitch: 0,
      }, null);
      this.groundBelow = groundHeight(this.plane.x, this.plane.z);
      if (this.plane.x > 3600 || this.plane.z > 3600) this.toStart();
      return;
    }
    if (this.state !== 'flying') return;
    const inputState = this.input.state();
    this.groundBelow = this.plane.update(dt, inputState, null);
    this.mission.elapsed += dt;
    this.audio.setEngine(this.plane.throttle, this.plane.speed, true);
    if (this.mission.elapsed > this.mission.def.timeLimit) {
      this.crash('Out of time — the mail is late.');
      return;
    }
    // Rings.
    const ring = this.mission.rings[this.mission.ringIndex];
    if (ring && checkRingPass(this.plane, ring)) {
      onRingPassed(this.mission);
      this.audio.chime();
      if (missionComplete(this.mission)) {
        this.complete();
        return;
      }
    }
    // Ground contact.
    const heightAbove = this.plane.y - this.groundBelow;
    if (heightAbove <= 6) {
      for (const runway of RUNWAYS) {
        const verdict = landingVerdict(this.plane, runway);
        if (verdict === 'crash') {
          this.crash('Hard landing — the strip is not that forgiving.');
          return;
        }
        if (verdict === 'clean' || verdict === 'rough') {
          this.audio.thud();
          if (this.mission.def.id === 'hop') {
            onLanding(this.mission, runway, verdict);
            if (missionComplete(this.mission)) {
              this.complete();
              return;
            }
            // Touch-and-go: back into the air for the next strip.
            this.plane.y = this.groundBelow + 9;
            this.plane.pitch = 0.12;
            this.plane.speed = Math.max(this.plane.speed, 42);
            this.plane.throttle = 72;
          } else {
            this.complete();
            return;
          }
        }
      }
    }
    if (heightAbove <= 1.5) {
      this.crash('Terrain strike — the valley wins this round.');
      return;
    }
    if (this.plane.fuel <= 0 && this.plane.speed < 20 && heightAbove < 30) {
      this.crash('Out of fuel — glided in short of the strip.');
    }
  }

  render() {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;
    const cam = this.camera;
    cam.lookAtPlane(this.plane, this.cameraMode);
    this.drawSky(ctx, W, H, cam);
    const items = [];
    this.collectTerrain(ctx, cam, items);
    this.collectTown(cam, items);
    this.collectTrees(cam, items);
    this.collectRings(cam, items);
    items.sort((a, b) => b.depth - a.depth);
    for (const item of items) item.draw(ctx);
    // Runways draw after the terrain: they sit on the same ground, so the
    // painter's sort would let nearer ground cells cover them.
    this.drawRunways(ctx, cam);
    if (this.cameraMode !== 'cockpit') drawPlane(ctx, cam, this.plane, this.now);
    // Cockpit frame (canopy, nose, prop) sits under the HUD so the
    // instruments stay legible; the panel draws over the HUD below.
    const cockpit = this.cameraMode === 'cockpit' && this.state !== 'start';
    if (cockpit) drawCockpitFrame(ctx, W, H, this);
    if (this.state === 'start') {
      drawStartScreen(ctx, W, H, this);
    } else if (this.state === 'paused') {
      drawHUD(ctx, W, H, this);
      if (cockpit) drawCockpitPanel(ctx, W, H, this);
      drawPauseScreen(ctx, W, H);
    } else if (this.state === 'crashed') {
      drawHUD(ctx, W, H, this);
      if (cockpit) drawCockpitPanel(ctx, W, H, this);
      drawCrashScreen(ctx, W, H, this);
    } else if (this.state === 'complete') {
      drawHUD(ctx, W, H, this);
      if (cockpit) drawCockpitPanel(ctx, W, H, this);
      drawCompleteScreen(ctx, W, H, this);
    } else {
      drawHUD(ctx, W, H, this);
      if (cockpit) drawCockpitPanel(ctx, W, H, this);
    }
  }

  drawSky(ctx, W, H, cam) {
    const horizonPt = cam.project(
      cam.pos.x + cam.fwd.x * 4000, 0, cam.pos.z + cam.fwd.z * 4000,
    );
    const horizonY = horizonPt ? horizonPt.y : H * 0.62;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#17457e');
    grad.addColorStop(clamp(horizonY / H, 0.2, 0.9), '#7fb2d9');
    grad.addColorStop(1, '#cfe3d8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // Sun.
    const sunDir = { x: 0.55, y: 0.5, z: -0.55 };
    const sun = cam.project(
      cam.pos.x + sunDir.x * 5000, cam.pos.y + sunDir.y * 5000, cam.pos.z + sunDir.z * 5000,
    );
    if (sun) {
      const glow = ctx.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, 120);
      glow.addColorStop(0, 'rgba(255, 244, 200, 0.95)');
      glow.addColorStop(0.25, 'rgba(255, 226, 140, 0.55)');
      glow.addColorStop(1, 'rgba(255, 226, 140, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, 120, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff6cf';
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, 26, 0, Math.PI * 2);
      ctx.fill();
    }
    // Clouds.
    for (const cloud of this.world.clouds) {
      const p = cam.visible(cloud.x, cloud.y, cloud.z, 200);
      if (!p) continue;
      const s = cloud.s * p.scale * 0.9;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      for (let i = 0; i < 4; i++) {
        const ox = (i - 1.5) * s * 0.55;
        const oy = Math.sin(i * 2.1) * s * 0.12;
        ctx.beginPath();
        ctx.ellipse(p.x + ox, p.y + oy, s * 0.55, s * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  collectTerrain(ctx, cam, items) {
    const px = this.plane.x;
    const pz = this.plane.z;
    const x0 = Math.floor((px - CELL * VIEW_CELLS) / CELL) * CELL;
    const z0 = Math.floor((pz - CELL * VIEW_CELLS) / CELL) * CELL;
    for (let gx = 0; gx < VIEW_CELLS * 2; gx++) {
      for (let gz = 0; gz < VIEW_CELLS * 2; gz++) {
        const x = x0 + gx * CELL;
        const z = z0 + gz * CELL;
        const h00 = groundHeight(x, z);
        const h10 = groundHeight(x + CELL, z);
        const h11 = groundHeight(x + CELL, z + CELL);
        const h01 = groundHeight(x, z + CELL);
        const p00 = cam.projectLoose(x, h00, z);
        const p10 = cam.projectLoose(x + CELL, h10, z);
        const p11 = cam.projectLoose(x + CELL, h11, z + CELL);
        const p01 = cam.projectLoose(x, h01, z + CELL);
        const rawDepth = (p00.rawDepth + p10.rawDepth + p11.rawDepth + p01.rawDepth) / 4;
        if (rawDepth < 0) continue;
        const depth = (p00.depth + p10.depth + p11.depth + p01.depth) / 4;
        const colour = terrainColour(x + CELL / 2, z + CELL / 2, (h00 + h11) / 2);
        items.push({
          depth,
          draw(c) {
            c.fillStyle = colour;
            c.beginPath();
            c.moveTo(p00.x, p00.y);
            c.lineTo(p10.x, p10.y);
            c.lineTo(p11.x, p11.y);
            c.lineTo(p01.x, p01.y);
            c.closePath();
            c.fill();
          },
        });
      }
    }
  }

  drawRunways(ctx, cam) {
    for (const runway of RUNWAYS) {
      const half = runway.length / 2;
      const hw = runway.width / 2;
      const sin = Math.sin(runway.heading);
      const cos = Math.cos(runway.heading);
      const corner = (a, b) => ({
        x: runway.x + sin * a + cos * b,
        z: runway.z + cos * a - sin * b,
        y: runway.height + 0.8,
      });
      const c = [corner(-half, -hw), corner(half, -hw), corner(half, hw), corner(-half, hw)];
      const sp = c.map((q) => cam.projectLoose(q.x, q.y, q.z));
      ctx.fillStyle = '#3a3f45';
      ctx.beginPath();
      ctx.moveTo(sp[0].x, sp[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(sp[i].x, sp[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sp[0].x, sp[0].y);
      ctx.lineTo(sp[3].x, sp[3].y);
      ctx.moveTo(sp[1].x, sp[1].y);
      ctx.lineTo(sp[2].x, sp[2].y);
      ctx.stroke();
      // Centreline dashes.
      ctx.fillStyle = '#f5f5f5';
      for (let a = -half + 40; a < half - 20; a += 70) {
        const d0 = corner(a, -2);
        const d1 = corner(a + 34, -2);
        const d2 = corner(a + 34, 2);
        const d3 = corner(a, 2);
        const q0 = cam.projectLoose(d0.x, d0.y, d0.z);
        const q1 = cam.projectLoose(d1.x, d1.y, d1.z);
        const q2 = cam.projectLoose(d2.x, d2.y, d2.z);
        const q3 = cam.projectLoose(d3.x, d3.y, d3.z);
        ctx.beginPath();
        ctx.moveTo(q0.x, q0.y);
        ctx.lineTo(q1.x, q1.y);
        ctx.lineTo(q2.x, q2.y);
        ctx.lineTo(q3.x, q3.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  collectTown(cam, items) {
    for (const b of this.world.buildings) {
      const p = cam.visible(b.x, b.y + b.h, b.z, 120);
      if (!p) continue;
      const cos = Math.cos(b.rot);
      const sin = Math.sin(b.rot);
      const hw = b.w / 2;
      const hd = b.d / 2;
      const corner = (sx, sz, y) => ({
        x: b.x + sx * hw * cos - sz * hd * sin,
        z: b.z + sx * hw * sin + sz * hd * cos,
        y,
      });
      const top = [corner(-1, -1, b.y + b.h), corner(1, -1, b.y + b.h), corner(1, 1, b.y + b.h), corner(-1, 1, b.y + b.h)];
      const side = [corner(-1, -1, b.y), corner(1, -1, b.y), corner(1, -1, b.y + b.h), corner(-1, -1, b.y + b.h)];
      const spTop = top.map((q) => cam.project(q.x, q.y, q.z));
      const spSide = side.map((q) => cam.project(q.x, q.y, q.z));
      if (spTop.some((q) => !q) || spSide.some((q) => !q)) continue;
      const tone = Math.round(150 * b.tone);
      items.push({
        depth: p.depth,
        draw(ctx) {
          ctx.fillStyle = `rgb(${tone - 40},${tone - 44},${tone - 52})`;
          ctx.beginPath();
          ctx.moveTo(spSide[0].x, spSide[0].y);
          for (let i = 1; i < 4; i++) ctx.lineTo(spSide[i].x, spSide[i].y);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = `rgb(${tone + 20},${tone + 8},${tone - 12})`;
          ctx.beginPath();
          ctx.moveTo(spTop[0].x, spTop[0].y);
          for (let i = 1; i < 4; i++) ctx.lineTo(spTop[i].x, spTop[i].y);
          ctx.closePath();
          ctx.fill();
        },
      });
    }
  }

  collectTrees(cam, items) {
    for (const tree of this.world.trees) {
      const dx = tree.x - cam.pos.x;
      const dz = tree.z - cam.pos.z;
      if (dx * dx + dz * dz > 1500 * 1500) continue;
      const p = cam.visible(tree.x, tree.y + tree.s, tree.z, 60);
      if (!p) continue;
      const h = tree.s * p.scale;
      const w = h * 0.42;
      const base = cam.project(tree.x, tree.y, tree.z);
      if (!base) continue;
      const shade = Math.round(52 * tree.shade);
      items.push({
        depth: p.depth,
        draw(ctx) {
          ctx.fillStyle = '#5d4126';
          ctx.fillRect(base.x - w * 0.06, base.y - h * 0.22, w * 0.12, h * 0.22);
          ctx.fillStyle = `rgb(${34 + shade},${96 + shade},${40 + shade})`;
          ctx.beginPath();
          ctx.moveTo(base.x, base.y - h);
          ctx.lineTo(base.x - w, base.y - h * 0.18);
          ctx.lineTo(base.x + w, base.y - h * 0.18);
          ctx.closePath();
          ctx.fill();
        },
      });
    }
  }

  collectRings(cam, items) {
    this.mission.rings.forEach((ring, i) => {
      if (ring.passed) return;
      const centre = cam.project(ring.x, ring.y, ring.z);
      if (!centre) return;
      const isNext = i === this.mission.ringIndex;
      const colour = isNext ? '#ffc85e' : 'rgba(127, 231, 255, 0.85)';
      const pts = [];
      const right = { x: Math.cos(ring.heading), y: 0, z: -Math.sin(ring.heading) };
      for (let k = 0; k <= 20; k++) {
        const t = (k / 20) * Math.PI * 2;
        const px = ring.x + Math.cos(t) * ring.r * right.x;
        const py = ring.y + Math.sin(t) * ring.r;
        const pz = ring.z + Math.cos(t) * ring.r * right.z;
        const q = cam.project(px, py, pz);
        pts.push(q);
      }
      if (pts.some((q) => !q)) return;
      const ground = cam.project(ring.x, groundHeight(ring.x, ring.z), ring.z);
      items.push({
        depth: centre.depth,
        draw(ctx) {
          if (ground) {
            ctx.strokeStyle = 'rgba(255, 200, 94, 0.45)';
            ctx.setLineDash([6, 8]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centre.x, centre.y);
            ctx.lineTo(ground.x, ground.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.strokeStyle = colour;
          ctx.lineWidth = isNext ? 7 : 4;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
          ctx.closePath();
          ctx.stroke();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
          ctx.fill();
        },
      });
    });
  }

  loop(timestamp) {
    const dt = this.shotMode ? 0 : clamp((timestamp - this.last) / 1000, 0, 0.05);
    this.last = timestamp;
    if (!this.shotMode) this.update(dt);
    this.render();
    this.input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  }

  start() {
    const { shot, seed, mission, cam } = parseShot();
    if (shot) {
      this.shotMode = true;
      applyShot(this, shot, seed, mission, cam);
    }
    this.render();
    requestAnimationFrame((t) => {
      this.last = t;
      this.loop(t);
    });
  }
}

const canvas = document.getElementById('game');
const game = new Game(canvas);
game.start();
