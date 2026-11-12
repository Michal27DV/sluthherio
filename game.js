/**
 * KNIGHTSLIT.IO - Online multiplayer arena
 * With Duo Co-op Team Mode, Teammate Compass, and Radar Minimap
 */

// --- Audio Synthesizer (Web Audio API) ---
class SoundController {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.boostOsc = null;
    this.boostGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled && this.boostGain) {
      this.boostGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    return this.enabled;
  }

  playEat() {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400 + Math.random() * 200, t);
      osc.frequency.exponentialRampToValueAtTime(800 + Math.random() * 300, t + 0.08);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.09);
    } catch (e) {}
  }

  playDeath() {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.42);
    } catch (e) {}
  }

  startBoost() {
    if (!this.enabled || !this.ctx) return;
    try {
      if (!this.boostOsc) {
        const t = this.ctx.currentTime;
        this.boostOsc = this.ctx.createOscillator();
        this.boostGain = this.ctx.createGain();

        this.boostOsc.type = 'triangle';
        this.boostOsc.frequency.setValueAtTime(110, t);
        this.boostGain.gain.setValueAtTime(0.03, t);

        this.boostOsc.connect(this.boostGain);
        this.boostGain.connect(this.ctx.destination);
        this.boostOsc.start();
      } else {
        this.boostGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.boostGain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      }
    } catch (e) {}
  }

  stopBoost() {
    if (!this.ctx || !this.boostGain) return;
    try {
      this.boostGain.gain.setValueAtTime(0, this.ctx.currentTime);
    } catch (e) {}
  }
}

const sounds = new SoundController();

// --- Skin Palettes ---
const SKINS = [
  {
    name: 'Indigo',
    body: '#69549b',
    glans: '#a18be2',
    outline: '#35294f',
    vein: '#c1b2ef',
    ball: '#534371'
  },
  {
    name: 'Měděná',
    body: '#a95f36',
    glans: '#d8894c',
    outline: '#57351e',
    vein: '#e5ad69',
    ball: '#78432c'
  },
  {
    name: 'Tmavá',
    body: '#333b48',
    glans: '#59697a',
    outline: '#171d27',
    vein: '#8395a4',
    ball: '#252e3a'
  },
  {
    name: 'Ametyst',
    body: '#7957a5',
    glans: '#aa82d4',
    outline: '#34254d',
    vein: '#d7c2f0',
    ball: '#594071'
  },
  {
    name: 'Olivová',
    body: '#718c3c',
    glans: '#a7bc50',
    outline: '#36431e',
    vein: '#d3dc7b',
    ball: '#556d34'
  },
  {
    name: 'Modrá',
    body: '#4d8190',
    glans: '#83c1c8',
    outline: '#244754',
    vein: '#b9e5df',
    ball: '#3d6773'
  },
  {
    name: 'Zlatá',
    body: '#bd963e',
    glans: '#e2c56b',
    outline: '#67501e',
    vein: '#f3e0a0',
    ball: '#947438'
  },
  {
    name: 'Červená',
    body: '#9e4140',
    glans: '#d66d55',
    outline: '#4f2528',
    vein: '#e5a078',
    ball: '#743336'
  }
];

const BOT_NAMES = [
  'Jan', 'Eva', 'Marek', 'Klára', 'Bohumil', 'Matěj', 'Anna', 'Tomáš', 'Barbora', 'Karel',
  'Eliška', 'Pavel', 'Tereza', 'David', 'Hana', 'Vojtěch', 'Lucie', 'Filip', 'Veronika', 'Ondřej'
];

const WORLD_RADIUS = 2800;
const BASE_RADIUS = 16;
const BASE_SPEED = 235.0;
const BOOST_SPEED = 460.0;
const INITIAL_SCORE = 15;
const MAX_BOTS = 22;
const MAX_FOOD = 700;

function distSq(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

function normalizeAngle(a) {
  while (a < -Math.PI) a += Math.PI * 2;
  while (a > Math.PI) a -= Math.PI * 2;
  return a;
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

// --- Food Class ---
class Food {
  constructor(x, y, value = 1, isSperm = false, color = null) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.isSperm = !!isSperm;
    this.radius = Math.min(18, 3.5 + Math.sqrt(value) * 1.8);
    this.color = color || this.randomColor();
    this.pulse = Math.random() * Math.PI * 2;
    this.swimAngle = Math.random() * Math.PI * 2;
    this.swimSpeed = this.isSperm ? randRange(40, 85) : 0;
    this.tailWiggle = Math.random() * 10;
  }

  randomColor() {
    const palette = ['#a48cff', '#75c9ff', '#c5a7ff', '#6baee8', '#d5b6ff', '#8bc9f3', '#e0d2ff'];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  update(dt) {
    this.pulse += 3.2 * dt;
    if (this.isSperm) {
      this.tailWiggle += 15.0 * dt;
      this.x += Math.cos(this.swimAngle) * this.swimSpeed * dt;
      this.y += Math.sin(this.swimAngle) * this.swimSpeed * dt;
      this.swimAngle += (Math.random() - 0.5) * 5.0 * dt;

      const d = Math.sqrt(this.x * this.x + this.y * this.y);
      if (d > WORLD_RADIUS - 50) {
        this.swimAngle = Math.atan2(-this.y, -this.x);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.isSperm) {
      ctx.rotate(this.swimAngle);
      const glow = 4 + Math.sin(this.pulse) * 2;
      ctx.shadowBlur = glow;
      ctx.shadowColor = '#a9baff';

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(156, 190, 255, 0.82)';
      ctx.lineWidth = 2;
      ctx.moveTo(0, 0);
      const tailLen = this.radius * 3.5;
      const w1 = Math.sin(this.tailWiggle) * 6;
      const w2 = Math.cos(this.tailWiggle) * 6;
      ctx.quadraticCurveTo(-tailLen * 0.5, w1, -tailLen, w2);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = '#c7caff';
      ctx.moveTo(this.radius, 0);
      ctx.lineTo(0, this.radius * 0.72);
      ctx.lineTo(-this.radius, 0);
      ctx.lineTo(0, -this.radius * 0.72);
      ctx.closePath();
      ctx.fill();
    } else {
      const r = this.radius + Math.sin(this.pulse) * 1.2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, r), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f1e5bb';
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.25, Math.max(1, r * 0.28), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// --- Snake Class ---
class Drake {
  constructor(name, x, y, skin, isPlayer = false, playerIndex = 1, team = null) {
    this.name = name;
    this.skin = skin;
    this.skinIdx = SKINS.indexOf(skin);
    if (this.skinIdx === -1) this.skinIdx = 0;

    this.isPlayer = isPlayer;
    this.playerIndex = playerIndex;
    this.team = team;

    this.x = x || 0;
    this.y = y || 0;
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
    this.score = INITIAL_SCORE;
    this.isBoosting = false;
    this.dead = false;

    this.segments = [{ x: this.x, y: this.y }];
    this.history = [{ x: this.x, y: this.y }];
    this.turnRate = 5.5;
    this.boostTimer = 0.0;
    this.blinkTime = Math.random() * 10;

    // Smooth network interpolation targets
    this.serverX = this.x;
    this.serverY = this.y;
    this.serverAngle = this.angle;
    this.serverSegments = [];

    this.aiWanderTimer = 0;
    this.aiTarget = null;
  }

  getRadius() {
    return BASE_RADIUS + Math.min(22, Math.sqrt(this.score) * 0.42);
  }

  getTargetLength() {
    return Math.floor(12 + this.score * 0.65);
  }

  interpolateMMO(dt) {
    const lerpRate = 1.0 - Math.exp(-22.0 * dt);

    this.x += (this.serverX - this.x) * lerpRate;
    this.y += (this.serverY - this.y) * lerpRate;

    const angleDiff = normalizeAngle(this.serverAngle - this.angle);
    this.angle += angleDiff * lerpRate;

    if (this.serverSegments && this.serverSegments.length > 0) {
      if (this.segments.length !== this.serverSegments.length) {
        this.segments = this.serverSegments.map(p => ({ x: p.x, y: p.y }));
      } else {
        for (let i = 0; i < this.segments.length; i++) {
          this.segments[i].x += (this.serverSegments[i].x - this.segments[i].x) * lerpRate;
          this.segments[i].y += (this.serverSegments[i].y - this.segments[i].y) * lerpRate;
        }
      }
    }
  }

  update(foods, snakes, dt) {
    if (this.dead) return;

    const radius = this.getRadius();
    const speed = (this.isBoosting && this.score > 8) ? BOOST_SPEED : BASE_SPEED;

    if (!this.isPlayer) {
      this.updateAI(foods, snakes, dt);
    }

    const angleDiff = normalizeAngle(this.targetAngle - this.angle);
    const maxTurn = this.turnRate * dt;
    if (Math.abs(angleDiff) <= maxTurn) {
      this.angle = this.targetAngle;
    } else {
      this.angle += Math.sign(angleDiff) * maxTurn;
    }

    const dist = speed * dt;
    this.x += Math.cos(this.angle) * dist;
    this.y += Math.sin(this.angle) * dist;

    this.history.unshift({ x: this.x, y: this.y });

    const targetCount = this.getTargetLength();
    const segSpacing = Math.max(7, radius * 0.62);

    this.segments = [{ x: this.x, y: this.y }];
    let currentDist = 0;
    let targetDist = segSpacing;
    let historyIdx = 1;

    while (this.segments.length < targetCount && historyIdx < this.history.length) {
      const p1 = this.history[historyIdx - 1];
      const p2 = this.history[historyIdx];
      const stepDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      if (currentDist + stepDist >= targetDist) {
        const ratio = (targetDist - currentDist) / (stepDist || 0.001);
        const segX = p1.x + (p2.x - p1.x) * ratio;
        const segY = p1.y + (p2.y - p1.y) * ratio;
        this.segments.push({ x: segX, y: segY });
        targetDist += segSpacing;
      }
      currentDist += stepDist;
      historyIdx++;
    }

    const maxHistoryPoints = (targetCount + 5) * 20;
    if (this.history.length > maxHistoryPoints) {
      this.history.length = maxHistoryPoints;
    }

    if (this.isBoosting && this.score > 8) {
      this.boostTimer += dt;
      if (this.boostTimer >= 0.08) {
        this.boostTimer = 0.0;
        this.score -= 0.6;
        const tail = this.segments[this.segments.length - 1] || { x: this.x, y: this.y };
        foods.push(new Food(
          tail.x + randRange(-8, 8),
          tail.y + randRange(-8, 8),
          0.8,
          false,
          '#ffffff'
        ));
      }
    }

    this.blinkTime += 1.2 * dt;

    const distFromCenter = Math.hypot(this.x, this.y);
    if (distFromCenter > WORLD_RADIUS) {
      this.die(foods);
    }
  }

  updateAI(foods, snakes, dt) {
    this.aiWanderTimer -= dt;
    const headRadius = this.getRadius();

    const distToCenter = Math.hypot(this.x, this.y);
    if (distToCenter > WORLD_RADIUS - 200) {
      this.targetAngle = Math.atan2(-this.y, -this.x);
      this.isBoosting = false;
      return;
    }

    const lookAheadDist = headRadius * 4.5 + 40;
    const probeX = this.x + Math.cos(this.angle) * lookAheadDist;
    const probeY = this.y + Math.sin(this.angle) * lookAheadDist;

    let dangerFound = false;
    let avoidAngle = 0;

    for (let s of snakes) {
      if (s === this || s.dead) continue;

      const sRad = s.getRadius();
      for (let i = 0; i < s.segments.length; i += 3) {
        const seg = s.segments[i];
        if (distSq(probeX, probeY, seg.x, seg.y) < (headRadius + sRad + 25) ** 2) {
          dangerFound = true;
          const toDanger = Math.atan2(seg.y - this.y, seg.x - this.x);
          avoidAngle = toDanger + Math.PI * 0.55;
          break;
        }
      }
      if (dangerFound) break;
    }

    if (dangerFound) {
      this.targetAngle = avoidAngle;
      this.isBoosting = false;
      return;
    }

    if (this.aiWanderTimer <= 0 || !this.aiTarget) {
      this.aiWanderTimer = randRange(0.4, 1.2);
      let nearestFood = null;
      let minDistSq = 450 * 450;

      for (let f of foods) {
        const dSq = distSq(this.x, this.y, f.x, f.y);
        if (dSq < minDistSq) {
          minDistSq = dSq;
          nearestFood = f;
        }
      }

      if (nearestFood) {
        this.targetAngle = Math.atan2(nearestFood.y - this.y, nearestFood.x - this.x);
      } else {
        this.targetAngle += randRange(-0.8, 0.8);
      }
    }

    this.isBoosting = (this.score > 25 && Math.random() < 0.08);
  }

  die(foods) {
    if (this.dead) return;
    this.dead = true;

    for (let i = 0; i < this.segments.length; i += 2) {
      const seg = this.segments[i];
      const val = 1.5 + Math.random() * 2.5;
      foods.push(new Food(
        seg.x + randRange(-12, 12),
        seg.y + randRange(-12, 12),
        val,
        Math.random() < 0.25,
        this.skin.glans
      ));
    }

    if (this.isPlayer) {
      sounds.playDeath();
    }
  }

  draw(ctx, isMyTeammate = false, appearance = 'lizard') {
    if (appearance === 'classic') this.drawClassic(ctx, isMyTeammate);
    else this.drawLizard(ctx, isMyTeammate);
  }

  drawClassic(ctx, isMyTeammate = false) {
    if (this.dead || this.segments.length === 0) return;

    const radius = this.getRadius();
    const skin = this.skin;
    const points = this.segments;
    const outline = isMyTeammate ? '#6256c8' : skin.outline;

    // Rounded body beads recreate the original playful snake silhouette.
    for (let i = points.length - 1; i >= 1; i--) {
      const point = points[i];
      const taper = 0.84 + (1 - i / points.length) * 0.22;
      const beadRadius = radius * taper;
      ctx.fillStyle = skin.body;
      ctx.strokeStyle = outline;
      ctx.lineWidth = isMyTeammate ? 3 : 2.4;
      ctx.beginPath();
      ctx.arc(point.x, point.y, beadRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (i % 4 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,.3)';
        ctx.beginPath();
        ctx.arc(point.x - beadRadius * .28, point.y - beadRadius * .3, beadRadius * .2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (points.length > 3) {
      const tail = points[points.length - 1];
      const prev = points[points.length - 2];
      const tailAngle = Math.atan2(tail.y - prev.y, tail.x - prev.x) + Math.PI / 2;
      const offset = radius * .78;
      for (const side of [-1, 1]) {
        const bx = tail.x + Math.cos(tailAngle) * offset * side;
        const by = tail.y + Math.sin(tailAngle) * offset * side;
        ctx.fillStyle = skin.ball || skin.body;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(bx, by, radius * .86, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    const head = points[0];
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(this.angle);
    const r = radius * 1.2;
    ctx.fillStyle = skin.glans;
    ctx.strokeStyle = outline;
    ctx.lineWidth = isMyTeammate ? 3.2 : 2.6;
    ctx.beginPath();
    ctx.moveTo(-r * .45, -r * .72);
    ctx.bezierCurveTo(r * .1, -r * 1.12, r * .88, -r * .72, r * 1.1, 0);
    ctx.bezierCurveTo(r * .88, r * .72, r * .1, r * 1.12, -r * .45, r * .72);
    ctx.quadraticCurveTo(-r * .1, 0, -r * .45, -r * .72);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(r * .18, side * r * .43, r * .2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#252233';
      ctx.beginPath();
      ctx.arc(r * .25, side * r * .43, r * .09, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
    }
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r * .88, -r * .15);
    ctx.lineTo(r * .88, r * .15);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = '700 13px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = isMyTeammate ? '#6256c8' : '#f4f4fa';
    ctx.shadowColor = '#151522';
    ctx.shadowBlur = 5;
    ctx.fillText(this.name, head.x, head.y - radius * 1.65);
    ctx.restore();
  }

  drawLizard(ctx, isMyTeammate = false) {
    if (this.dead || this.segments.length === 0) return;

    const radius = this.getRadius();
    const skin = this.skin;
    const segments = this.segments;
    const len = segments.length;
    const outline = isMyTeammate ? '#f0d68a' : skin.outline;

    // Draw a single winding body first, then lay the scales over it.
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(segments[0].x, segments[0].y);
    for (let i = 1; i < len; i++) ctx.lineTo(segments[i].x, segments[i].y);
    ctx.strokeStyle = outline;
    ctx.lineWidth = radius * 1.55;
    ctx.stroke();

    const bodyGradient = ctx.createLinearGradient(
      this.x - radius, this.y - radius, this.x + radius, this.y + radius
    );
    bodyGradient.addColorStop(0, skin.vein);
    bodyGradient.addColorStop(0.5, skin.body);
    bodyGradient.addColorStop(1, skin.outline);
    ctx.strokeStyle = bodyGradient;
    ctx.lineWidth = radius * 1.32;
    ctx.stroke();

    // Repeating scale marks catch the light like small rows of armor.
    ctx.lineWidth = Math.max(1.2, radius * 0.09);
    for (let i = 3; i < len - 2; i += 3) {
      const p = segments[i];
      const before = segments[i - 1];
      const after = segments[i + 1];
      const angle = Math.atan2(after.y - before.y, after.x - before.x);
      const nx = -Math.sin(angle);
      const ny = Math.cos(angle);
      const scaleRadius = radius * (0.5 + 0.36 * (1 - i / len));
      ctx.strokeStyle = i % 2 ? 'rgba(238, 220, 163, 0.43)' : 'rgba(20, 35, 25, 0.34)';
      ctx.beginPath();
      ctx.moveTo(p.x - nx * scaleRadius, p.y - ny * scaleRadius);
      ctx.quadraticCurveTo(
        p.x + Math.cos(angle) * scaleRadius * 0.35,
        p.y + Math.sin(angle) * scaleRadius * 0.35,
        p.x + nx * scaleRadius,
        p.y + ny * scaleRadius
      );
      ctx.stroke();
    }

    // A tapered armored tail with a small crest at its tip.
    if (len > 3) {
      const tail = segments[len - 1];
      const previous = segments[len - 3];
      const tailAngle = Math.atan2(tail.y - previous.y, tail.x - previous.x);
      ctx.save();
      ctx.translate(tail.x, tail.y);
      ctx.rotate(tailAngle);
      ctx.fillStyle = skin.glans;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.65, -radius * 0.45);
      ctx.lineTo(radius * 0.8, 0);
      ctx.lineTo(-radius * 0.65, radius * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Broad drake head, facing the direction of travel.
    const head = segments[0];
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(this.angle);
    const headLength = radius * 1.95;
    const headWidth = radius * 1.22;
    ctx.fillStyle = skin.glans;
    ctx.strokeStyle = outline;
    ctx.lineWidth = isMyTeammate ? 3.5 : 2.8;
    ctx.beginPath();
    ctx.moveTo(headLength, 0);
    ctx.quadraticCurveTo(headLength * 0.62, headWidth * 0.82, radius * 0.02, headWidth);
    ctx.lineTo(-radius * 0.62, headWidth * 0.58);
    ctx.lineTo(-radius * 0.62, -headWidth * 0.58);
    ctx.lineTo(radius * 0.02, -headWidth);
    ctx.quadraticCurveTo(headLength * 0.62, -headWidth * 0.82, headLength, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Brow horns and bright reptile eyes.
    for (const side of [-1, 1]) {
      ctx.fillStyle = skin.vein;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.42, side * radius * 0.55);
      ctx.quadraticCurveTo(-radius * 1.05, side * radius * 1.2, radius * 0.02, side * radius * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f5e8bd';
      ctx.beginPath();
      ctx.ellipse(radius * 0.38, side * radius * 0.48, radius * 0.24, radius * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#20271e';
      ctx.beginPath();
      ctx.ellipse(radius * 0.48, side * radius * 0.48, radius * 0.07, radius * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(30, 39, 28, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(radius * 1.02, -radius * 0.12);
    ctx.lineTo(radius * 1.02, radius * 0.12);
    ctx.stroke();

    // Teammates carry a small gold crest.
    if (isMyTeammate || this.isPlayer) {
      ctx.fillStyle = isMyTeammate ? '#f0d68a' : '#d7e2ad';
      ctx.beginPath();
      ctx.moveTo(-radius * 0.35, -radius * 0.92);
      ctx.lineTo(-radius * 0.72, -radius * 1.72);
      ctx.lineTo(-radius * 0.05, -radius * 1.25);
      ctx.lineTo(radius * 0.38, -radius * 1.78);
      ctx.lineTo(radius * 0.48, -radius * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();

    ctx.save();
    ctx.font = '700 13px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = isMyTeammate ? '#f0d68a' : '#f4eedb';
    ctx.shadowColor = '#10150f';
    ctx.shadowBlur = 5;
    ctx.fillText(this.name, head.x, head.y - radius * 1.8);
    ctx.restore();
  }
}

// --- Main Engine with Co-op Teams ---
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.minimapCanvas = document.getElementById('minimapCanvas');
    this.miniCtx = this.minimapCanvas.getContext('2d');

    // UI Cache
    this.hud = document.getElementById('hud');
    this.scoreBox = document.getElementById('score-box');
    this.scoreVal = document.getElementById('score-val');
    this.scores2p = document.getElementById('scores-2p');
    this.p1HudName = document.getElementById('p1-hud-name');
    this.p1Cm = document.getElementById('p1-cm');
    this.p2HudName = document.getElementById('p2-hud-name');
    this.p2Cm = document.getElementById('p2-cm');
    this.lbHeader = document.getElementById('lb-header');
    this.lbList = document.getElementById('lb-list');
    this.roomInfo = document.getElementById('room-info');
    this.fpsBadge = document.getElementById('fps-badge');

    // Teammate Compass UI
    this.teammateCompass = document.getElementById('teammate-compass');
    this.compassArrow = document.getElementById('compass-arrow');
    this.compassName = document.getElementById('compass-name');
    this.compassDist = document.getElementById('compass-dist');

    // Modals
    this.menuOverlay = document.getElementById('menu-overlay');
    this.themeToggle = document.getElementById('theme-toggle');
    this.appearanceToggle = document.getElementById('appearance-toggle');
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.gameoverTitle = document.getElementById('gameover-title');
    this.gameoverSubtitle = document.getElementById('gameover-subtitle');
    this.finalScore = document.getElementById('final-score');
    this.restartBtn = document.getElementById('restart-btn');
    this.respawnTeammateBtn = document.getElementById('respawn-teammate-btn');
    this.menuBtn = document.getElementById('menu-btn');
    this.hudMenuBtn = document.getElementById('hud-menu-btn');
    this.soundBtn = document.getElementById('sound-btn');

    // Mode Inputs
    this.mmoNick = document.getElementById('mmo-nick');
    this.p1Nick = document.getElementById('p1-nick');
    this.p2Nick = document.getElementById('p2-nick');
    this.soloNick = document.getElementById('solo-nick');
    this.mmoStatus = document.getElementById('mmo-status');
    this.customServerBox = document.getElementById('custom-server-box');
    this.customServerUrl = document.getElementById('custom-server-url');

    // Team Controls
    this.teamModeSolo = document.getElementById('team-mode-solo');
    this.teamModeCoop = document.getElementById('team-mode-coop');
    this.teamConfigPanel = document.getElementById('team-config-panel');
    this.createTeamBtn = document.getElementById('create-team-btn');
    this.joinTeamInput = document.getElementById('join-team-input');
    this.teamCodeDisplay = document.getElementById('team-code-display');
    this.teamCodeVal = document.getElementById('team-code-val');
    this.copyTeamLinkBtn = document.getElementById('copy-team-link-btn');

    this.isCoopMode = false;
    this.teamCode = '';

    // Selected skins
    this.mmoSkinIdx = 0;
    this.p1SkinIdx = 0;
    this.p2SkinIdx = 5;
    this.soloSkinIdx = 0;

    // FPS Config
    this.targetFps = 60;
    this.lastRenderTime = performance.now();
    this.lastTime = performance.now();

    this.fpsFrameCount = 0;
    this.fpsLastSampleTime = performance.now();
    this.currentFpsDisplay = 60;
    this.lastLeaderboardUpdate = 0;
    this.leaderboardInterval = 250;

    // Game state
    this.currentMode = 'mmo';
    this.isRunning = false;
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.player1 = null;
    this.player2 = null;
    this.snakes = [];
    this.foods = [];

    this.mmoSnakesMap = new Map();

    // Inputs
    this.mouse = { x: 0, y: 0 };
    this.isMouseDown = false;
    this.p2Keys = { w: false, s: false, a: false, d: false, space: false };
    this.touchSticks = { 1: null, 2: null };
    this.touchAngles = { 1: 0, 2: 0 };
    this.touchBoosting = { 1: false, 2: false };
    this.touchControls = document.getElementById('touch-controls');
    this.touchStickElements = {
      1: document.getElementById('touch-stick-1'),
      2: document.getElementById('touch-stick-2')
    };

    // MMO WebSocket & Team state
    this.mmoWs = null;
    this.myPlayerId = null;
    this.myTeam = null;
    this.teammate = null;
    this.remoteCam = null;

    this.initTabs();
    this.initTheme();
    this.initAppearance();
    this.initSkinSelectors();
    this.initTeamControls();
    this.initFpsLimiter();
    this.bindEvents();
    this.initTouchControls();
    this.resize();
    this.checkIfCustomServerNeeded();
    this.checkUrlForTeam();
  }

  initTeamControls() {
    this.teamModeSolo.addEventListener('click', () => {
      this.isCoopMode = false;
      this.teamModeSolo.classList.add('active');
      this.teamModeCoop.classList.remove('active');
      this.teamConfigPanel.classList.add('hidden');
    });

    this.teamModeCoop.addEventListener('click', () => {
      this.isCoopMode = true;
      this.teamModeCoop.classList.add('active');
      this.teamModeSolo.classList.remove('active');
      this.teamConfigPanel.classList.remove('hidden');
      if (!this.teamCode) {
        this.generateTeamCode();
      }
    });

    this.createTeamBtn.addEventListener('click', () => {
      this.generateTeamCode();
    });

    this.joinTeamInput.addEventListener('input', () => {
      const clean = this.joinTeamInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      this.teamCode = clean;
    });

    this.copyTeamLinkBtn.addEventListener('click', () => {
      const url = `${window.location.origin}${window.location.pathname}?team=${this.teamCode}`;
      navigator.clipboard.writeText(url).then(() => {
        this.copyTeamLinkBtn.textContent = '✅ Odkaz zkopírován!';
        setTimeout(() => this.copyTeamLinkBtn.textContent = '📋 Kopírovat odkaz pro parťáka', 2000);
      });
    });
  }

  generateTeamCode() {
    this.teamCode = String(Math.floor(1000 + Math.random() * 9000));
    this.teamCodeVal.textContent = this.teamCode;
    this.joinTeamInput.value = this.teamCode;
    this.teamCodeDisplay.classList.remove('hidden');
  }

  checkUrlForTeam() {
    const params = new URLSearchParams(window.location.search);
    const team = params.get('team');
    if (team) {
      this.isCoopMode = true;
      this.teamModeCoop.click();
      this.teamCode = team.trim().toUpperCase();
      this.teamCodeVal.textContent = this.teamCode;
      this.joinTeamInput.value = this.teamCode;
      this.teamCodeDisplay.classList.remove('hidden');
    }
  }

  initFpsLimiter() {
    const buttons = document.querySelectorAll('.fps-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setTargetFps(parseInt(btn.dataset.fps, 10));
      });
    });

    if (this.fpsBadge) {
      this.fpsBadge.addEventListener('click', () => {
        const order = [60, 120, 0, 30];
        const nextIdx = (order.indexOf(this.targetFps) + 1) % order.length;
        this.setTargetFps(order[nextIdx]);
        buttons.forEach(b => {
          if (parseInt(b.dataset.fps, 10) === this.targetFps) b.classList.add('active');
          else b.classList.remove('active');
        });
      });
    }
  }

  setTargetFps(fps) {
    this.targetFps = fps;
    const label = fps === 0 ? 'Max FPS' : `${fps} FPS`;
    if (this.fpsBadge) {
      this.fpsBadge.textContent = label;
      this.fpsBadge.title = `Omezovač FPS: ${label} (Kliknutím změníš)`;
    }
  }

  updateFpsMetrics(now) {
    this.fpsFrameCount++;
    const delta = now - this.fpsLastSampleTime;
    if (delta >= 500) {
      this.currentFpsDisplay = Math.round((this.fpsFrameCount * 1000) / delta);
      this.fpsFrameCount = 0;
      this.fpsLastSampleTime = now;
      if (this.fpsBadge) {
        const limitStr = this.targetFps === 0 ? 'Max' : `${this.targetFps}`;
        this.fpsBadge.textContent = `${this.currentFpsDisplay} / ${limitStr} FPS`;
      }
    }
  }

  checkIfCustomServerNeeded() {
    if (window.location.protocol === 'file:' || window.location.host.includes('github.io')) {
      this.customServerBox.classList.remove('hidden');
    }
  }

  initTabs() {
    const tabs = document.querySelectorAll('.mode-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.mode;
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`tab-${mode}`).classList.remove('hidden');
      });
    });
  }

  initTheme() {
    let theme = 'light';
    try {
      theme = localStorage.getItem('knightslit-theme') === 'dark' ? 'dark' : 'light';
    } catch (e) {}

    const applyTheme = (nextTheme) => {
      theme = nextTheme;
      document.documentElement.dataset.theme = theme;
      const dark = theme === 'dark';
      this.themeToggle.querySelector('.theme-icon').textContent = dark ? '☀' : '☾';
      this.themeToggle.querySelector('.theme-label').textContent = dark ? 'Světlý režim' : 'Tmavý režim';
      this.themeToggle.setAttribute('aria-pressed', String(dark));
      try {
        localStorage.setItem('knightslit-theme', theme);
      } catch (e) {}
    };

    applyTheme(theme);
    this.themeToggle.addEventListener('click', () => {
      applyTheme(theme === 'dark' ? 'light' : 'dark');
    });
  }

  initAppearance() {
    this.appearanceStyle = 'lizard';
    try {
      this.appearanceStyle = localStorage.getItem('knightslit-appearance') === 'classic' ? 'classic' : 'lizard';
    } catch (e) {}

    const updateControl = () => {
      const classic = this.appearanceStyle === 'classic';
      this.appearanceToggle.querySelector('.appearance-icon').textContent = classic ? '🐍' : '🐉';
      this.appearanceToggle.querySelector('.appearance-label').textContent = classic ? 'Ještěří vzhled' : 'Klasický vzhled';
      this.appearanceToggle.setAttribute('aria-pressed', String(classic));
    };

    updateControl();
    this.appearanceToggle.addEventListener('click', () => {
      this.appearanceStyle = this.appearanceStyle === 'classic' ? 'lizard' : 'classic';
      updateControl();
      try {
        localStorage.setItem('knightslit-appearance', this.appearanceStyle);
      } catch (e) {}
    });
  }

  initSkinSelectors() {
    const setupSelector = (containerId, onSelect, activeIdx) => {
      const container = document.getElementById(containerId);
      container.innerHTML = '';
      SKINS.forEach((skin, idx) => {
        const btn = document.createElement('div');
        btn.className = `skin-btn ${idx === activeIdx ? 'active' : ''}`;
        btn.style.background = `linear-gradient(135deg, ${skin.glans} 0%, ${skin.body} 100%)`;
        btn.title = skin.name;
        btn.addEventListener('click', () => {
          container.querySelectorAll('.skin-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          onSelect(idx);
        });
        container.appendChild(btn);
      });
    };

    setupSelector('mmo-skins', idx => this.mmoSkinIdx = idx, this.mmoSkinIdx);
    setupSelector('p1-skins', idx => this.p1SkinIdx = idx, this.p1SkinIdx);
    setupSelector('p2-skins', idx => this.p2SkinIdx = idx, this.p2SkinIdx);
    setupSelector('solo-skins', idx => this.soloSkinIdx = idx, this.soloSkinIdx);
  }

  resize() {
    const viewport = window.visualViewport;
    this.width = viewport ? viewport.width : window.innerWidth;
    this.height = viewport ? viewport.height : window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * pixelRatio);
    this.canvas.height = Math.round(this.height * pixelRatio);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));

    window.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;

      if (this.currentMode === 'mmo') {
        const cx = this.width / 2;
        const cy = this.height / 2;
        const angle = Math.atan2(this.mouse.y - cy, this.mouse.x - cx);
        this.sendMmoInput(angle, this.isMouseDown);
      } else if (this.player1 && !this.player1.dead) {
        let targetX = this.width / 2;
        let targetY = this.height / 2;
        if (this.currentMode === 'local2p') {
          targetX = this.width / 2 + (this.player1.x - this.camera.x) * this.camera.zoom;
          targetY = this.height / 2 + (this.player1.y - this.camera.y) * this.camera.zoom;
        }
        this.player1.targetAngle = Math.atan2(this.mouse.y - targetY, this.mouse.x - targetX);
      }
    });

    window.addEventListener('mousedown', e => {
      if (e.button === 0) {
        this.isMouseDown = true;
        if (this.currentMode === 'mmo') {
          const cx = this.width / 2;
          const cy = this.height / 2;
          const angle = Math.atan2(this.mouse.y - cy, this.mouse.x - cx);
          this.sendMmoInput(angle, true);
          sounds.startBoost();
        } else if (this.player1) {
          this.player1.isBoosting = true;
          sounds.startBoost();
        }
      }
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 0) {
        this.isMouseDown = false;
        if (this.currentMode === 'mmo') {
          const cx = this.width / 2;
          const cy = this.height / 2;
          const angle = Math.atan2(this.mouse.y - cy, this.mouse.x - cx);
          this.sendMmoInput(angle, false);
          sounds.stopBoost();
        } else if (this.player1) {
          this.player1.isBoosting = false;
          sounds.stopBoost();
        }
      }
    });

    window.addEventListener('keydown', e => {
      const code = e.code;
      if (code === 'Space') {
        e.preventDefault();
        this.isMouseDown = true;
        if (this.currentMode === 'mmo') {
          const cx = this.width / 2;
          const cy = this.height / 2;
          const angle = Math.atan2(this.mouse.y - cy, this.mouse.x - cx);
          this.sendMmoInput(angle, true);
          sounds.startBoost();
        } else if (this.currentMode === 'solo' && this.player1) {
          this.player1.isBoosting = true;
          sounds.startBoost();
        } else if (this.currentMode === 'local2p' && this.player2) {
          this.p2Keys.space = true;
          this.player2.isBoosting = true;
        }
      }

      if (this.currentMode === 'local2p' && this.player2) {
        if (code === 'KeyW') this.p2Keys.w = true;
        if (code === 'KeyS') this.p2Keys.s = true;
        if (code === 'KeyA') this.p2Keys.a = true;
        if (code === 'KeyD') this.p2Keys.d = true;
        this.updateP2Heading();
      }
    });

    window.addEventListener('keyup', e => {
      const code = e.code;
      if (code === 'Space') {
        e.preventDefault();
        this.isMouseDown = false;
        if (this.currentMode === 'mmo') {
          const cx = this.width / 2;
          const cy = this.height / 2;
          const angle = Math.atan2(this.mouse.y - cy, this.mouse.x - cx);
          this.sendMmoInput(angle, false);
          sounds.stopBoost();
        } else if (this.currentMode === 'solo' && this.player1) {
          this.player1.isBoosting = false;
          sounds.stopBoost();
        } else if (this.currentMode === 'local2p' && this.player2) {
          this.p2Keys.space = false;
          this.player2.isBoosting = false;
        }
      }

      if (this.currentMode === 'local2p' && this.player2) {
        if (code === 'KeyW') this.p2Keys.w = false;
        if (code === 'KeyS') this.p2Keys.s = false;
        if (code === 'KeyA') this.p2Keys.a = false;
        if (code === 'KeyD') this.p2Keys.d = false;
        this.updateP2Heading();
      }
    });

    // Buttons
    document.getElementById('start-mmo-btn').addEventListener('click', () => {
      sounds.init();
      this.startMMO();
    });

    document.getElementById('start-local2p-btn').addEventListener('click', () => {
      sounds.init();
      this.startLocal2P();
    });

    document.getElementById('start-solo-btn').addEventListener('click', () => {
      sounds.init();
      this.startSolo();
    });

    this.restartBtn.addEventListener('click', () => {
      this.gameoverOverlay.classList.add('hidden');
      if (this.currentMode === 'mmo') {
        if (this.mmoWs && this.mmoWs.readyState === WebSocket.OPEN) {
          this.mmoWs.send(JSON.stringify({ type: 'respawn', nearTeammate: false }));
        } else {
          this.startMMO();
        }
      } else if (this.currentMode === 'local2p') {
        this.startLocal2P();
      } else {
        this.startSolo();
      }
    });

    this.respawnTeammateBtn.addEventListener('click', () => {
      this.gameoverOverlay.classList.add('hidden');
      if (this.mmoWs && this.mmoWs.readyState === WebSocket.OPEN) {
        this.mmoWs.send(JSON.stringify({ type: 'respawn', nearTeammate: true }));
      }
    });

    if (this.menuBtn) {
      this.menuBtn.addEventListener('click', () => {
        this.returnToMenu();
      });
    }

    if (this.hudMenuBtn) {
      this.hudMenuBtn.addEventListener('click', () => {
        this.returnToMenu();
      });
    }

    this.soundBtn.addEventListener('click', () => {
      const active = sounds.toggle();
      this.soundBtn.textContent = active ? '🔊' : '🔇';
    });
  }

  returnToMenu() {
    this.isRunning = false;
    sounds.stopBoost();
    this.setTouchControlsMode(false);
    this.setTouchBoost(1, false);
    this.setTouchBoost(2, false);

    if (this.mmoWs) {
      const ws = this.mmoWs;
      this.mmoWs = null;
      try {
        ws.close();
      } catch (e) {}
    }

    this.wasDead = false;
    this.myPlayerId = null;
    this.teammate = null;
    this.snakes = [];
    this.foods = [];

    this.gameoverOverlay.classList.add('hidden');
    this.hud.classList.add('hidden');
    this.teammateCompass.classList.add('hidden');
    this.menuOverlay.classList.remove('hidden');

    if (this.mmoStatus) {
      this.mmoStatus.classList.add('hidden');
      this.mmoStatus.textContent = '';
    }

    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  initTouchControls() {
    Object.entries(this.touchStickElements).forEach(([playerId, stick]) => {
      const player = Number(playerId);
      const knob = stick.querySelector('.stick-knob');
      const base = stick.querySelector('.stick-base');

      stick.addEventListener('pointerdown', event => {
        if (!this.isRunning || (player === 2 && this.currentMode !== 'local2p')) return;
        event.preventDefault();
        stick.setPointerCapture(event.pointerId);
        this.touchSticks[player] = event.pointerId;
        this.updateTouchStick(player, event, base, knob);
      });

      stick.addEventListener('pointermove', event => {
        if (this.touchSticks[player] !== event.pointerId) return;
        event.preventDefault();
        this.updateTouchStick(player, event, base, knob);
      });

      const releaseStick = event => {
        if (this.touchSticks[player] !== event.pointerId) return;
        this.touchSticks[player] = null;
        knob.style.transform = 'translate(0, 0)';
      };
      stick.addEventListener('pointerup', releaseStick);
      stick.addEventListener('pointercancel', releaseStick);
      stick.addEventListener('lostpointercapture', releaseStick);
    });

    document.querySelectorAll('.touch-boost').forEach(button => {
      const player = Number(button.dataset.player);
      const beginBoost = event => {
        if (!this.isRunning || (player === 2 && this.currentMode !== 'local2p')) return;
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.setTouchBoost(player, true);
      };
      const endBoost = event => {
        if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
        this.setTouchBoost(player, false);
      };
      button.addEventListener('pointerdown', beginBoost);
      button.addEventListener('pointerup', endBoost);
      button.addEventListener('pointercancel', endBoost);
      button.addEventListener('lostpointercapture', () => this.setTouchBoost(player, false));
    });
  }

  updateTouchStick(player, event, base, knob) {
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    const maxDistance = rect.width * .34;
    if (distance > maxDistance) {
      dx = dx / distance * maxDistance;
      dy = dy / distance * maxDistance;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    if (Math.hypot(dx, dy) < 5) return;

    const angle = Math.atan2(dy, dx);
    this.touchAngles[player] = angle;
    if (player === 1) {
      if (this.currentMode === 'mmo') {
        this.sendMmoInput(angle, this.isMouseDown || this.touchBoosting[1]);
      } else if (this.player1 && !this.player1.dead) {
        this.player1.targetAngle = angle;
      }
    } else {
      this.updateP2Heading();
    }
  }

  setTouchBoost(player, boosting) {
    this.touchBoosting[player] = boosting;
    if (player === 1) {
      if (this.currentMode === 'mmo') {
        this.sendMmoInput(this.touchAngles[1], this.isMouseDown || boosting);
      } else if (this.player1) {
        this.player1.isBoosting = boosting;
      }
      if (boosting) sounds.startBoost();
      else if (!this.isMouseDown) sounds.stopBoost();
    } else if (this.player2) {
      this.player2.isBoosting = boosting;
    }
  }

  setTouchControlsMode(duoMode) {
    this.touchControls.classList.toggle('duo', duoMode);
    this.touchStickElements[2].classList.toggle('hidden', !duoMode);
    document.getElementById('touch-boost-2').classList.toggle('hidden', !duoMode);
  }

  updateP2Heading() {
    if (!this.player2 || this.player2.dead) return;
    let dx = 0;
    let dy = 0;
    if (this.p2Keys.w) dy -= 1;
    if (this.p2Keys.s) dy += 1;
    if (this.p2Keys.a) dx -= 1;
    if (this.p2Keys.d) dx += 1;

    if (this.touchSticks[2] !== null) {
      this.player2.targetAngle = this.touchAngles[2];
      return;
    }

    if (dx !== 0 || dy !== 0) {
      this.player2.targetAngle = Math.atan2(dy, dx);
    }
  }

  // --- DEDICATED MMO MODE WITH DUO CO-OP ---
  startMMO() {
    this.currentMode = 'mmo';
    this.setTouchControlsMode(false);
    const nick = this.mmoNick.value.trim() || 'Hráč';
    const skin = this.mmoSkinIdx;
    const team = this.isCoopMode ? (this.teamCode || 'DUO') : null;

    this.mmoStatus.classList.remove('hidden');
    this.mmoStatus.className = 'status-msg status-info';
    this.mmoStatus.textContent = team ? `🔄 Připojuji se do týmu ${team}...` : '🔄 Připojuji se k serveru...';

    let wsUrl = '';
    const customUrl = this.customServerUrl.value.trim();

    if (customUrl) {
      let clean = customUrl.replace(/^http/, 'ws');
      if (!clean.endsWith('/ws')) clean = clean.replace(/\/$/, '') + '/ws';
      wsUrl = clean;
    } else if (window.location.protocol.startsWith('http')) {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${proto}//${window.location.host}/ws`;
    } else {
      wsUrl = 'ws://localhost:8000/ws';
    }

    try {
      if (this.mmoWs) {
        this.mmoWs.close();
      }
      this.mmoWs = new WebSocket(wsUrl);
    } catch (e) {
      this.mmoStatus.className = 'status-msg status-error';
      this.mmoStatus.textContent = 'Nelze se připojit: ' + e;
      return;
    }

    this.mmoWs.onopen = () => {
      this.mmoStatus.className = 'status-msg status-success';
      this.mmoStatus.textContent = '✅ Spojeno! Vstupuji do arény...';

      this.mmoWs.send(JSON.stringify({
        type: 'join',
        name: nick,
        skin: skin,
        team: team
      }));
    };

    this.mmoWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'joined') {
          this.myPlayerId = msg.myId;
          this.myTeam = msg.myTeam;

          this.menuOverlay.classList.add('hidden');
          this.gameoverOverlay.classList.add('hidden');
          this.hud.classList.remove('hidden');
          this.scoreBox.classList.remove('hidden');
          this.scores2p.classList.add('hidden');
          this.roomInfo.classList.remove('hidden');

          if (this.myTeam && !this.myTeam.startsWith('SOLO_')) {
            this.roomInfo.textContent = `🤝 TÝM [${this.myTeam}]`;
          } else {
            this.roomInfo.textContent = '🌍 Sólo aréna';
          }

          this.lastTime = performance.now();
          this.lastRenderTime = performance.now();
          this.fpsLastSampleTime = performance.now();
          this.fpsFrameCount = 0;
          this.isRunning = true;
          requestAnimationFrame(() => this.loopMMO());
        } else if (msg.type === 'world') {
          this.handleWorldSnapshot(msg);
        }
      } catch (e) {}
    };

    this.mmoWs.onerror = () => {
      this.mmoStatus.className = 'status-msg status-error';
      this.mmoStatus.innerHTML = '❌ Server neodpovídá.<br>Pokud běží na Renderu, počkej cca 20s na probuzení a zkus to znovu!';
    };

    this.mmoWs.onclose = () => {
      if (this.isRunning) {
        alert('Spojení se serverem bylo ukončeno.');
        this.menuOverlay.classList.remove('hidden');
        this.hud.classList.add('hidden');
        this.teammateCompass.classList.add('hidden');
        this.isRunning = false;
      }
    };
  }

  sendMmoInput(angle, isBoosting) {
    if (this.mmoWs && this.mmoWs.readyState === WebSocket.OPEN) {
      this.mmoWs.send(JSON.stringify({
        type: 'input',
        angle: +angle.toFixed(2),
        boost: !!isBoosting
      }));
    }
  }

  handleWorldSnapshot(data) {
    if (!this.isRunning) return;

    this.remoteCam = data.cam;
    this.myTeam = data.myTeam;
    this.teammate = data.teammate;

    if (data.myScore != null) {
      const cm = (10 + data.myScore * 0.16).toFixed(1);
      this.scoreVal.textContent = `${cm} cm`;
    }

    if (data.isDead && !this.wasDead) {
      this.wasDead = true;
      sounds.stopBoost();
      sounds.playDeath();
      this.returnToMenu();
      return;
    } else if (!data.isDead) {
      this.wasDead = false;
    }

    // Team Leaderboard
    const now = performance.now();
    if (data.teamsLb && now - this.lastLeaderboardUpdate >= this.leaderboardInterval) {
      this.lastLeaderboardUpdate = now;
      this.lbList.innerHTML = '';
      this.lbHeader.textContent = '🏆 Žebříček týmů';

      data.teamsLb.forEach((teamObj, idx) => {
        const li = document.createElement('li');
        const isMyTeam = (teamObj.teamCode === this.myTeam);
        if (isMyTeam) li.classList.add('team-me');

        const nameSpan = document.createElement('span');
        nameSpan.className = 'lb-name';

        if (teamObj.isSolo) {
          const m = teamObj.members[0];
          nameSpan.textContent = `${idx + 1}. ${m ? m[0] : 'Hráč'}`;
        } else {
          const names = teamObj.members.map(m => m[0]).join(' + ');
          nameSpan.textContent = `${idx + 1}. 🤝 ${names}`;
        }

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'lb-score';
        scoreSpan.textContent = `${(10 + teamObj.totalScore * 0.16).toFixed(0)}cm`;

        li.appendChild(nameSpan);
        li.appendChild(scoreSpan);
        this.lbList.appendChild(li);
      });
    }

    // Process foods
    this.foods = (data.foods || []).map(f => new Food(f[0], f[1], f[2], f[3] === 1, f[4]));

    // Entity Map Update
    const currentPids = new Set();
    const updatedSnakes = [];

    (data.snakes || []).forEach(s => {
      currentPids.add(s.id);
      let sn = this.mmoSnakesMap.get(s.id);
      const isMe = (s.id === this.myPlayerId);

      const headPos = s.segs && s.segs.length > 0 ? s.segs[0] : [s.x || 0, s.y || 0];

      if (!sn) {
        const skin = SKINS[s.skin] || SKINS[0];
        sn = new Drake(s.name, headPos[0], headPos[1], skin, isMe, isMe ? 1 : 0, s.team);
        sn.id = s.id;
        sn.segments = s.segs.map(pt => ({ x: pt[0], y: pt[1] }));
        this.mmoSnakesMap.set(s.id, sn);
      }

      sn.team = s.team;
      sn.serverX = headPos[0];
      sn.serverY = headPos[1];
      sn.serverAngle = s.angle;
      sn.score = s.score;
      sn.isBoosting = s.boost;
      sn.serverSegments = s.segs.map(pt => ({ x: pt[0], y: pt[1] }));

      sn.x = headPos[0];
      sn.y = headPos[1];

      updatedSnakes.push(sn);
    });

    for (let [pid] of this.mmoSnakesMap) {
      if (!currentPids.has(pid)) {
        this.mmoSnakesMap.delete(pid);
      }
    }

    this.snakes = updatedSnakes;

    // Update Teammate Compass Indicator
    this.updateTeammateCompass();
  }

  updateTeammateCompass() {
    if (!this.teammate || this.teammate.dead || !this.remoteCam) {
      this.teammateCompass.classList.add('hidden');
      return;
    }

    const myX = this.remoteCam.x;
    const myY = this.remoteCam.y;
    const tmX = this.teammate.x;
    const tmY = this.teammate.y;

    const dx = tmX - myX;
    const dy = tmY - myY;
    const distMeters = Math.round(Math.hypot(dx, dy) / 10);

    // Screen coordinates of teammate
    const screenX = this.width / 2 + dx * this.camera.zoom;
    const screenY = this.height / 2 + dy * this.camera.zoom;
    const margin = 80;

    const isOffScreen = screenX < margin || screenX > this.width - margin || screenY < margin || screenY > this.height - margin;

    if (isOffScreen) {
      this.teammateCompass.classList.remove('hidden');

      // Clamp compass badge to edge of screen
      const angle = Math.atan2(dy, dx);
      const edgeRadiusX = (this.width / 2) - margin;
      const edgeRadiusY = (this.height / 2) - margin;

      // Project onto ellipse border
      const posX = this.width / 2 + Math.cos(angle) * edgeRadiusX;
      const posY = this.height / 2 + Math.sin(angle) * edgeRadiusY;

      this.teammateCompass.style.left = `${posX}px`;
      this.teammateCompass.style.top = `${posY}px`;

      // Rotate arrow to point directly at teammate
      const deg = (angle * 180 / Math.PI) - 90;
      this.compassArrow.style.transform = `rotate(${deg}deg)`;

      this.compassName.textContent = this.teammate.name;
      this.compassDist.textContent = `${distMeters} m`;
    } else {
      this.teammateCompass.classList.add('hidden');
    }
  }

  loopMMO() {
    if (!this.isRunning || this.currentMode !== 'mmo') return;

    const now = performance.now();

    if (this.targetFps > 0 && this.targetFps < 120) {
      const frameInterval = 1000 / this.targetFps;
      const elapsed = now - this.lastRenderTime;
      if (elapsed < frameInterval - 3.0) {
        requestAnimationFrame(() => this.loopMMO());
        return;
      }
      this.lastRenderTime = now - (elapsed % frameInterval);
    } else {
      this.lastRenderTime = now;
    }

    let dt = (now - this.lastTime) / 1000.0;
    this.lastTime = now;
    if (dt > 0.1) dt = 0.1;

    this.updateFpsMetrics(now);

    for (let sn of this.snakes) {
      sn.interpolateMMO(dt);
    }

    for (let f of this.foods) {
      f.update(dt);
    }

    if (this.remoteCam) {
      const lerpFactor = 1.0 - Math.exp(-9.0 * dt);
      this.camera.x += (this.remoteCam.x - this.camera.x) * lerpFactor;
      this.camera.y += (this.remoteCam.y - this.camera.y) * lerpFactor;
      const targetZoom = Math.max(0.65, 1.15 - Math.sqrt(this.remoteCam.score || 10) * 0.035);
      this.camera.zoom += (targetZoom - this.camera.zoom) * (1.0 - Math.exp(-4.0 * dt));
    }

    this.renderWorld(this.snakes, this.foods);
    this.drawMinimap();

    requestAnimationFrame(() => this.loopMMO());
  }

  // --- SOLO & LOCAL 2P ---
  spawnInitialFood() {
    this.foods = [];
    for (let i = 0; i < MAX_FOOD; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * (WORLD_RADIUS - 80);
      const isSperm = Math.random() < 0.12;
      this.foods.push(new Food(
        Math.cos(angle) * dist,
        Math.sin(angle) * dist,
        isSperm ? randRange(2.5, 5) : 1,
        isSperm
      ));
    }
  }

  replenishFood() {
    while (this.foods.length < MAX_FOOD) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * (WORLD_RADIUS - 80);
      const isSperm = Math.random() < 0.12;
      this.foods.push(new Food(
        Math.cos(angle) * dist,
        Math.sin(angle) * dist,
        isSperm ? randRange(2.5, 5) : 1,
        isSperm
      ));
    }
  }

  spawnBot() {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * (WORLD_RADIUS - 300);
    const skin = SKINS[Math.floor(Math.random() * SKINS.length)];
    const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const bot = new Drake(name, Math.cos(angle) * dist, Math.sin(angle) * dist, skin, false);
    bot.score = randRange(15, 80);
    return bot;
  }

  startSolo() {
    this.currentMode = 'solo';
    this.setTouchControlsMode(false);
    const nick = this.soloNick.value.trim() || 'Hráč';
    const skin = SKINS[this.soloSkinIdx];

    this.player1 = new Drake(nick, 0, 0, skin, true, 1);
    this.player2 = null;
    this.snakes = [this.player1];

    this.spawnInitialFood();
    for (let i = 0; i < MAX_BOTS; i++) {
      this.snakes.push(this.spawnBot());
    }

    this.scoreBox.classList.remove('hidden');
    this.scores2p.classList.add('hidden');
    this.roomInfo.classList.remove('hidden');
    this.roomInfo.textContent = '🤖 Trénink s boty';
    this.teammateCompass.classList.add('hidden');
    this.respawnTeammateBtn.classList.add('hidden');

    this.menuOverlay.classList.add('hidden');
    this.gameoverOverlay.classList.add('hidden');
    this.hud.classList.remove('hidden');

    this.lastTime = performance.now();
    this.lastRenderTime = performance.now();
    this.fpsLastSampleTime = performance.now();
    this.fpsFrameCount = 0;
    this.isRunning = true;
    requestAnimationFrame(() => this.loopLocal());
  }

  startLocal2P() {
    this.currentMode = 'local2p';
    this.setTouchControlsMode(true);
    const nick1 = this.p1Nick.value.trim() || 'Hráč 1';
    const nick2 = this.p2Nick.value.trim() || 'Hráč 2';
    const skin1 = SKINS[this.p1SkinIdx];
    const skin2 = SKINS[this.p2SkinIdx];

    this.player1 = new Drake(nick1, -150, 0, skin1, true, 1);
    this.player2 = new Drake(nick2, 150, 0, skin2, true, 2);
    this.snakes = [this.player1, this.player2];

    this.spawnInitialFood();
    for (let i = 0; i < MAX_BOTS - 2; i++) {
      this.snakes.push(this.spawnBot());
    }

    this.scoreBox.classList.add('hidden');
    this.scores2p.classList.remove('hidden');
    this.p1HudName.textContent = this.player1.name + ':';
    this.p2HudName.textContent = this.player2.name + ':';
    this.roomInfo.classList.add('hidden');
    this.teammateCompass.classList.add('hidden');
    this.respawnTeammateBtn.classList.add('hidden');

    this.menuOverlay.classList.add('hidden');
    this.gameoverOverlay.classList.add('hidden');
    this.hud.classList.remove('hidden');

    this.lastTime = performance.now();
    this.lastRenderTime = performance.now();
    this.fpsLastSampleTime = performance.now();
    this.fpsFrameCount = 0;
    this.isRunning = true;
    requestAnimationFrame(() => this.loopLocal());
  }

  loopLocal() {
    if (!this.isRunning || this.currentMode === 'mmo') return;

    const now = performance.now();

    if (this.targetFps > 0 && this.targetFps < 120) {
      const frameInterval = 1000 / this.targetFps;
      const elapsed = now - this.lastRenderTime;
      if (elapsed < frameInterval - 3.0) {
        requestAnimationFrame(() => this.loopLocal());
        return;
      }
      this.lastRenderTime = now - (elapsed % frameInterval);
    } else {
      this.lastRenderTime = now;
    }

    let dt = (now - this.lastTime) / 1000.0;
    this.lastTime = now;
    if (dt > 0.1) dt = 0.1;

    this.updateFpsMetrics(now);

    for (let f of this.foods) f.update(dt);
    this.replenishFood();

    for (let s of this.snakes) s.update(this.foods, this.snakes, dt);

    // Collisions
    const eatDistSq = (rad) => (rad + 12) ** 2;
    for (let s of this.snakes) {
      if (s.dead) continue;
      const head = s.segments[0];
      const threshold = eatDistSq(s.getRadius());

      for (let i = this.foods.length - 1; i >= 0; i--) {
        const f = this.foods[i];
        if (distSq(head.x, head.y, f.x, f.y) < threshold) {
          s.score += f.value * 0.85;
          this.foods.splice(i, 1);
          if (s.isPlayer && s.playerIndex === 1) sounds.playEat();
        }
      }
    }

    for (let i = 0; i < this.snakes.length; i++) {
      const s1 = this.snakes[i];
      if (s1.dead) continue;
      const head1 = s1.segments[0];
      const rad1 = s1.getRadius();

      for (let j = 0; j < this.snakes.length; j++) {
        const s2 = this.snakes[j];
        if (s1 === s2 || s2.dead) continue;
        const killDistSq = (rad1 * 0.85 + s2.getRadius() * 0.72) ** 2;

        for (let k = 0; k < s2.segments.length; k++) {
          const seg2 = s2.segments[k];
          if (distSq(head1.x, head1.y, seg2.x, seg2.y) < killDistSq) {
            s1.die(this.foods);
            break;
          }
        }
        if (s1.dead) break;
      }
    }

    // Clean dead bots
    for (let i = this.snakes.length - 1; i >= 0; i--) {
      const s = this.snakes[i];
      if (s.dead) {
        if (!s.isPlayer) {
          this.snakes.splice(i, 1);
          setTimeout(() => {
            if (this.isRunning) this.snakes.push(this.spawnBot());
          }, randRange(1500, 3500));
        } else {
          sounds.stopBoost();
          this.returnToMenu();
          return;
        }
      }
    }

    // Camera handling with delta time
    const camLerp = 1.0 - Math.exp(-8.0 * dt);
    if (this.currentMode === 'local2p' && this.player1 && this.player2) {
      if (!this.player1.dead && !this.player2.dead) {
        const midX = (this.player1.x + this.player2.x) / 2;
        const midY = (this.player1.y + this.player2.y) / 2;
        this.camera.x += (midX - this.camera.x) * camLerp;
        this.camera.y += (midY - this.camera.y) * camLerp;
        const pDist = Math.hypot(this.player1.x - this.player2.x, this.player1.y - this.player2.y);
        const targetZoom = Math.min(1.0, Math.max(0.42, Math.min(this.width, this.height) / (pDist + 450)));
        this.camera.zoom += (targetZoom - this.camera.zoom) * (1.0 - Math.exp(-4.0 * dt));
      } else if (!this.player1.dead) {
        this.camera.x += (this.player1.x - this.camera.x) * camLerp;
        this.camera.y += (this.player1.y - this.camera.y) * camLerp;
      } else if (!this.player2.dead) {
        this.camera.x += (this.player2.x - this.camera.x) * camLerp;
        this.camera.y += (this.player2.y - this.camera.y) * camLerp;
      }
    } else if (this.player1 && !this.player1.dead) {
      this.camera.x += (this.player1.x - this.camera.x) * camLerp;
      this.camera.y += (this.player1.y - this.camera.y) * camLerp;
      const targetZoom = Math.max(0.65, 1.15 - Math.sqrt(this.player1.score) * 0.035);
      this.camera.zoom += (targetZoom - this.camera.zoom) * (1.0 - Math.exp(-4.0 * dt));
    }

    // HUD
    if (this.currentMode === 'solo' && this.player1) {
      this.scoreVal.textContent = `${(10 + this.player1.score * 0.16).toFixed(1)} cm`;
    } else if (this.currentMode === 'local2p') {
      if (this.player1) this.p1Cm.textContent = this.player1.dead ? 'K.O.' : `${(10 + this.player1.score * 0.16).toFixed(1)} cm`;
      if (this.player2) this.p2Cm.textContent = this.player2.dead ? 'K.O.' : `${(10 + this.player2.score * 0.16).toFixed(1)} cm`;
    }

    // Leaderboard
    if (now - this.lastLeaderboardUpdate >= this.leaderboardInterval) {
      this.lastLeaderboardUpdate = now;
      const sorted = this.snakes.slice().sort((a, b) => b.score - a.score).slice(0, 8);
      const items = sorted.map((snake, idx) => {
        const li = document.createElement('li');
        if (snake.isPlayer) li.classList.add(snake.playerIndex === 2 ? 'p2' : 'me');
        const name = document.createElement('span');
        name.className = 'lb-name';
        name.textContent = `${idx + 1}. ${snake.name}`;
        const score = document.createElement('span');
        score.className = 'lb-score';
        score.textContent = `${(10 + snake.score * 0.16).toFixed(0)}cm`;
        li.append(name, score);
        return li;
      });
      this.lbHeader.textContent = '🏆 Žebříček největších';
      this.lbList.replaceChildren(...items);
    }

    this.renderWorld(this.snakes, this.foods);
    this.drawMinimap();

    requestAnimationFrame(() => this.loopLocal());
  }

  // --- RADAR MINIMAP (Shows all friends, teammates with Crown and names) ---
  drawMinimap() {
    const mCtx = this.miniCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const mapRadius = w * 0.46;
    const scale = mapRadius / WORLD_RADIUS;

    mCtx.clearRect(0, 0, w, h);

    // Radar Dark Circular Background
    mCtx.fillStyle = 'rgba(20, 21, 48, 0.94)';
    mCtx.beginPath();
    mCtx.arc(cx, cy, mapRadius, 0, Math.PI * 2);
    mCtx.fill();

    mCtx.strokeStyle = 'rgba(145, 137, 236, 0.28)';
    mCtx.lineWidth = 1;
    mCtx.beginPath();
    mCtx.arc(cx, cy, mapRadius * 0.5, 0, Math.PI * 2);
    mCtx.stroke();

    mCtx.strokeStyle = '#8f9cf0';
    mCtx.lineWidth = 2.5;
    mCtx.beginPath();
    mCtx.arc(cx, cy, mapRadius, 0, Math.PI * 2);
    mCtx.stroke();

    mCtx.strokeStyle = 'rgba(232, 223, 196, 0.12)';
    mCtx.beginPath();
    mCtx.moveTo(cx, cy - mapRadius);
    mCtx.lineTo(cx, cy + mapRadius);
    mCtx.moveTo(cx - mapRadius, cy);
    mCtx.lineTo(cx + mapRadius, cy);
    mCtx.stroke();

    const pulseTime = performance.now() * 0.003;

    for (let s of this.snakes) {
      if (s.dead) continue;

      const head = (s.segments && s.segments.length > 0) ? s.segments[0] : { x: s.x, y: s.y };
      const mx = cx + head.x * scale;
      const my = cy + head.y * scale;

      const isMe = (this.currentMode === 'mmo' ? (s.id === this.myPlayerId) : s.isPlayer);
      const isMyTeammate = (this.currentMode === 'mmo' && this.myTeam && s.team === this.myTeam && !isMe);

      if (isMe) {
        // --- DRAW ME (Neon Green + Heading Pointer) ---
        const ringRad = 5.5 + Math.sin(pulseTime * 2) * 2.5;
        mCtx.strokeStyle = 'rgba(6, 214, 160, 0.7)';
        mCtx.lineWidth = 1.5;
        mCtx.beginPath();
        mCtx.arc(mx, my, ringRad, 0, Math.PI * 2);
        mCtx.stroke();

        mCtx.fillStyle = '#b9adff';
        mCtx.shadowColor = '#9a91ff';
        mCtx.shadowBlur = 8;
        mCtx.beginPath();
        mCtx.arc(mx, my, 5, 0, Math.PI * 2);
        mCtx.fill();
        mCtx.shadowBlur = 0;

        mCtx.strokeStyle = '#ffffff';
        mCtx.lineWidth = 2;
        mCtx.beginPath();
        mCtx.moveTo(mx, my);
        mCtx.lineTo(mx + Math.cos(s.angle) * 9, my + Math.sin(s.angle) * 9);
        mCtx.stroke();

      } else if (isMyTeammate) {
        // --- DRAW TEAMMATE (Bright Golden Crown/Star + Name) ---
        const teamRingRad = 6.0 + Math.sin(pulseTime * 2.5) * 3.0;
        mCtx.strokeStyle = '#8fcfff';
        mCtx.lineWidth = 2;
        mCtx.beginPath();
        mCtx.arc(mx, my, teamRingRad, 0, Math.PI * 2);
        mCtx.stroke();

        mCtx.fillStyle = '#8fcfff';
        mCtx.shadowColor = '#6ebdff';
        mCtx.shadowBlur = 10;
        mCtx.beginPath();
        mCtx.arc(mx, my, 5.5, 0, Math.PI * 2);
        mCtx.fill();
        mCtx.shadowBlur = 0;

        mCtx.save();
        mCtx.font = 'bold 10px Nunito, sans-serif';
        mCtx.fillStyle = '#9ddaff';
        mCtx.textAlign = 'center';
        mCtx.textBaseline = 'bottom';
        mCtx.shadowColor = '#000000';
        mCtx.shadowBlur = 4;
        mCtx.fillText(`👑 ${s.name}`, mx, my - 6);
        mCtx.restore();

      } else {
        // --- DRAW OTHER PLAYERS ---
        const color = s.skin ? s.skin.glans : '#83c9ff';

        mCtx.fillStyle = color;
        mCtx.shadowColor = color;
        mCtx.shadowBlur = 6;
        mCtx.beginPath();
        mCtx.arc(mx, my, 4.2, 0, Math.PI * 2);
        mCtx.fill();
        mCtx.shadowBlur = 0;

        mCtx.fillStyle = '#ffffff';
        mCtx.beginPath();
        mCtx.arc(mx, my, 1.8, 0, Math.PI * 2);
        mCtx.fill();

        mCtx.save();
        mCtx.font = 'bold 9px Nunito, sans-serif';
        mCtx.fillStyle = '#ffffff';
        mCtx.textAlign = 'center';
        mCtx.textBaseline = 'bottom';
        mCtx.shadowColor = '#000000';
        mCtx.shadowBlur = 3;
        mCtx.fillText(s.name, mx, my - 5);
        mCtx.restore();
      }
    }
  }

  drawGrid() {
    const ctx = this.ctx;
    const radius = 46;
    const columnStep = radius * 1.5;
    const rowStep = Math.sqrt(3) * radius;
    const viewWidth = this.width / this.camera.zoom;
    const viewHeight = this.height / this.camera.zoom;
    const left = this.camera.x - viewWidth / 2 - radius;
    const right = this.camera.x + viewWidth / 2 + radius;
    const top = this.camera.y - viewHeight / 2 - radius;
    const bottom = this.camera.y + viewHeight / 2 + radius;
    const firstColumn = Math.floor(left / columnStep);
    const lastColumn = Math.ceil(right / columnStep);
    const firstRow = Math.floor(top / rowStep) - 1;
    const lastRow = Math.ceil(bottom / rowStep) + 1;

    ctx.lineWidth = 1.15;
    for (let column = firstColumn; column <= lastColumn; column++) {
      const centerX = column * columnStep;
      const rowOffset = (column & 1) ? rowStep / 2 : 0;
      for (let row = firstRow; row <= lastRow; row++) {
        const centerY = row * rowStep + rowOffset;
        ctx.beginPath();
        for (let corner = 0; corner < 6; corner++) {
          const angle = corner * Math.PI / 3;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          if (corner === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        const tile = (column + row) % 3;
        ctx.fillStyle = tile === 0 ? 'rgba(143, 133, 219, 0.045)' : 'rgba(35, 48, 83, 0.16)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(159, 169, 255, 0.17)';
        ctx.stroke();
      }
    }
  }

  drawWorldBoundary() {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#8b8aff';
    ctx.strokeStyle = '#8d9be8';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, WORLD_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  renderWorld(snakes, foods) {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    this.drawGrid();
    this.drawWorldBoundary();

    const buffer = 60;
    const left = this.camera.x - this.width / (2 * this.camera.zoom) - buffer;
    const right = this.camera.x + this.width / (2 * this.camera.zoom) + buffer;
    const top = this.camera.y - this.height / (2 * this.camera.zoom) - buffer;
    const bottom = this.camera.y + this.height / (2 * this.camera.zoom) + buffer;

    for (let f of foods) {
      if (f.x > left && f.x < right && f.y > top && f.y < bottom) {
        f.draw(this.ctx);
      }
    }

    const renderOrder = [...snakes].sort((a, b) => {
      if (a.isPlayer) return 1;
      if (b.isPlayer) return -1;
      return a.score - b.score;
    });

    for (let s of renderOrder) {
      const isMyTeammate = (this.currentMode === 'mmo' && this.myTeam && s.team === this.myTeam && s.id !== this.myPlayerId);
      s.draw(this.ctx, isMyTeammate, this.appearanceStyle);
    }

    this.ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
