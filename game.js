/**
 * SLUTTER.IO - Multiplayer & Solo Penis Battle Royale
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
    name: 'Klasik',
    body: '#fbc3b5',
    glans: '#ff7b90',
    outline: '#c2796c',
    vein: '#d8627b',
    ball: '#f5b5a7'
  },
  {
    name: 'Opálený',
    body: '#d89b6c',
    glans: '#cf6361',
    outline: '#965b36',
    vein: '#9e3b4a',
    ball: '#cb8e5f'
  },
  {
    name: 'Čokoláda',
    body: '#704229',
    glans: '#552e1a',
    outline: '#422111',
    vein: '#4e2815',
    ball: '#663922'
  },
  {
    name: 'Neon Pink',
    body: '#ff66c4',
    glans: '#ff1493',
    outline: '#b3006b',
    vein: '#ffffff',
    ball: '#ff4da6'
  },
  {
    name: 'Hulk / Alien',
    body: '#70e000',
    glans: '#38b000',
    outline: '#007200',
    vein: '#ccff33',
    ball: '#5bb800'
  },
  {
    name: 'Lilek Fialový',
    body: '#9d4edd',
    glans: '#7b2cbf',
    outline: '#3c096c',
    vein: '#e0aaff',
    ball: '#8b38cb'
  },
  {
    name: 'Zlatý Titan',
    body: '#ffd166',
    glans: '#ff9e00',
    outline: '#d48b00',
    vein: '#ffffff',
    ball: '#e5b84c'
  },
  {
    name: 'Mrazivý Modrák',
    body: '#00b4d8',
    glans: '#0077b6',
    outline: '#03045e',
    vein: '#caf0f8',
    ball: '#0096c7'
  }
];

const BOT_NAMES = [
  'Šulinátor 3000', 'Dlouhý Jan', 'Valibuk', 'Slim Shady', 'Bohumil',
  'Titan XXL', 'Anakonda', 'Mikro-Péťa', 'TurboKlobása', 'Karel ze vsi',
  'Cik-Cak', 'Velký Šéf', 'Kladivo', 'Rocco Siffredi', 'Párkař',
  'Generál Žalud', 'Větroplach', 'Pérodráp', 'Růžový Panter', 'Monstrum'
];

// Robust WebRTC ICE Servers with OpenRelay TURN for symmetric NAT & firewall traversal
const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ],
    iceCandidatePoolSize: 10
  }
};

const WORLD_RADIUS = 2800;
const BASE_RADIUS = 16;
const BASE_SPEED = 3.6;
const BOOST_SPEED = 7.0;
const INITIAL_SCORE = 15;
const MAX_BOTS = 22;
const MAX_FOOD = 900;

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

function cleanRoomCode(input) {
  if (!input) return '';
  const str = String(input).trim().toUpperCase();
  const digits = str.replace(/[^0-9]/g, '');
  if (digits.length >= 4) return digits.slice(0, 6);
  return str.replace(/[^A-Z0-9]/g, '').slice(0, 8);
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
    this.swimSpeed = this.isSperm ? randRange(0.6, 1.4) : 0;
    this.tailWiggle = Math.random() * 10;
  }

  randomColor() {
    const palette = ['#ff4d94', '#ffd166', '#06d6a0', '#118ab2', '#ff99c8', '#ffffff', '#e0aaff'];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  update() {
    this.pulse += 0.05;
    if (this.isSperm) {
      this.tailWiggle += 0.25;
      this.x += Math.cos(this.swimAngle) * this.swimSpeed;
      this.y += Math.sin(this.swimAngle) * this.swimSpeed;
      this.swimAngle += (Math.random() - 0.5) * 0.1;

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
      ctx.shadowColor = '#ffffff';

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.moveTo(0, 0);
      const tailLen = this.radius * 3.5;
      const w1 = Math.sin(this.tailWiggle) * 6;
      const w2 = Math.cos(this.tailWiggle) * 6;
      ctx.quadraticCurveTo(-tailLen * 0.5, w1, -tailLen, w2);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = '#ffffff';
      ctx.ellipse(0, 0, this.radius, this.radius * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const r = this.radius + Math.sin(this.pulse) * 1.2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, r), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.25, Math.max(1, r * 0.35), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// --- Snake (Penis) Class ---
class PenisSnake {
  constructor(name, x, y, skin, isPlayer = false, playerIndex = 1) {
    this.name = name;
    this.skin = skin;
    this.skinIdx = SKINS.indexOf(skin);
    if (this.skinIdx === -1) this.skinIdx = 0;

    this.isPlayer = isPlayer;
    this.playerIndex = playerIndex;

    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
    this.score = INITIAL_SCORE;
    this.isBoosting = false;
    this.dead = false;

    this.segments = [{ x: this.x, y: this.y }];
    this.history = [];
    this.turnRate = 0.088;
    this.boostTimer = 0;
    this.blinkTime = Math.random() * 10;

    this.aiWanderTimer = 0;
    this.aiTarget = null;
  }

  getRadius() {
    return BASE_RADIUS + Math.min(22, Math.sqrt(this.score) * 0.42);
  }

  getTargetLength() {
    return Math.floor(12 + this.score * 0.65);
  }

  update(foods, snakes) {
    if (this.dead) return;

    const radius = this.getRadius();
    const speed = (this.isBoosting && this.score > 8) ? BOOST_SPEED : BASE_SPEED;

    if (!this.isPlayer) {
      this.updateAI(foods, snakes);
    }

    const angleDiff = normalizeAngle(this.targetAngle - this.angle);
    this.angle += angleDiff * this.turnRate;

    this.x += Math.cos(this.angle) * speed;
    this.y += Math.sin(this.angle) * speed;

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

    const maxHistoryPoints = (targetCount + 5) * 15;
    if (this.history.length > maxHistoryPoints) {
      this.history.length = maxHistoryPoints;
    }

    if (this.isBoosting && this.score > 8) {
      this.boostTimer++;
      if (this.boostTimer % 4 === 0) {
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

    this.blinkTime += 0.02;

    const distFromCenter = Math.hypot(this.x, this.y);
    if (distFromCenter > WORLD_RADIUS) {
      this.die(foods);
    }
  }

  updateAI(foods, snakes) {
    this.aiWanderTimer--;
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

      for (let i = 0; i < s.segments.length; i += 3) {
        const seg = s.segments[i];
        const sRad = s.getRadius();
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
      this.aiWanderTimer = Math.floor(randRange(20, 60));
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

  draw(ctx) {
    if (this.dead || this.segments.length === 0) return;

    const radius = this.getRadius();
    const skin = this.skin;
    const len = this.segments.length;

    // 1. TESTICLES / BALLS AT TAIL
    if (len > 3) {
      const tailSeg = this.segments[len - 1];
      const prevSeg = this.segments[len - 2] || tailSeg;
      const tailAngle = Math.atan2(tailSeg.y - prevSeg.y, tailSeg.x - prevSeg.x);

      const ballRadius = radius * 1.25;
      const perpAngle = tailAngle + Math.PI / 2;
      const offsetDist = radius * 0.95;

      const leftX = tailSeg.x + Math.cos(perpAngle) * offsetDist;
      const leftY = tailSeg.y + Math.sin(perpAngle) * offsetDist;
      const rightX = tailSeg.x - Math.cos(perpAngle) * offsetDist;
      const rightY = tailSeg.y - Math.sin(perpAngle) * offsetDist;

      const drawBall = (bx, by) => {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = 6;
        ctx.fillStyle = skin.ball;
        ctx.strokeStyle = skin.outline;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(bx, by, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.arc(bx - ballRadius * 0.28, by - ballRadius * 0.28, ballRadius * 0.42, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = skin.outline;
        ctx.lineWidth = 1.5;
        for (let h = 0; h < 2; h++) {
          const hAngle = tailAngle + Math.PI + (h === 0 ? 0.4 : -0.4);
          const hStartX = bx + Math.cos(hAngle) * (ballRadius - 1);
          const hStartY = by + Math.sin(hAngle) * (ballRadius - 1);
          ctx.beginPath();
          ctx.moveTo(hStartX, hStartY);
          ctx.quadraticCurveTo(
            hStartX + Math.cos(hAngle) * 8 + (h === 0 ? 3 : -3),
            hStartY + Math.sin(hAngle) * 8,
            hStartX + Math.cos(hAngle) * 12,
            hStartY + Math.sin(hAngle) * 12
          );
          ctx.stroke();
        }
        ctx.restore();
      };

      drawBall(leftX, leftY);
      drawBall(rightX, rightY);
    }

    // 2. SHAFT SEGMENTS
    for (let i = len - 1; i >= 1; i--) {
      const seg = this.segments[i];
      const taper = 0.85 + (1 - i / len) * 0.25;
      const segRad = radius * taper;

      ctx.save();
      ctx.fillStyle = skin.body;
      ctx.strokeStyle = skin.outline;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(seg.x, seg.y, segRad, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (i % 4 === 0 && i < len - 2) {
        const nextSeg = this.segments[i - 1];
        ctx.strokeStyle = skin.vein;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(seg.x, seg.y);
        const midX = (seg.x + nextSeg.x) / 2 + Math.sin(i) * 3;
        const midY = (seg.y + nextSeg.y) / 2 + Math.cos(i) * 3;
        ctx.quadraticCurveTo(midX, midY, nextSeg.x, nextSeg.y);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 3. GLANS & FACE
    const head = this.segments[0];
    const headAngle = this.angle;

    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(headAngle);

    const glansRadius = radius * 1.28;
    ctx.fillStyle = skin.glans;
    ctx.strokeStyle = skin.outline;
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.moveTo(-glansRadius * 0.3, -glansRadius * 0.95);
    ctx.bezierCurveTo(
      glansRadius * 0.3, -glansRadius * 1.05,
      glansRadius * 0.9, -glansRadius * 0.65,
      glansRadius * 1.25, 0
    );
    ctx.bezierCurveTo(
      glansRadius * 0.9, glansRadius * 0.65,
      glansRadius * 0.3, glansRadius * 1.05,
      -glansRadius * 0.3, glansRadius * 0.95
    );
    ctx.quadraticCurveTo(-glansRadius * 0.1, 0, -glansRadius * 0.3, -glansRadius * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Slit
    ctx.strokeStyle = skin.outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(glansRadius * 1.05, -glansRadius * 0.35);
    ctx.lineTo(glansRadius * 1.05, glansRadius * 0.35);
    ctx.stroke();

    // Glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(glansRadius * 0.45, -glansRadius * 0.35, glansRadius * 0.4, glansRadius * 0.18, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    const isBlinking = Math.sin(this.blinkTime) > 0.96;
    const eyeSpacing = glansRadius * 0.45;
    const eyeX = glansRadius * 0.2;
    const eyeRadius = glansRadius * 0.28;

    [-1, 1].forEach(side => {
      const ey = side * eyeSpacing;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(eyeX, ey, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (isBlinking) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(eyeX - eyeRadius * 0.8, ey);
        ctx.lineTo(eyeX + eyeRadius * 0.8, ey);
        ctx.stroke();
      } else {
        const pupilRadius = eyeRadius * 0.52;
        const pupilOffset = eyeRadius * 0.32;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(eyeX + pupilOffset, ey, pupilRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(eyeX + pupilOffset + 1.5, ey - 1.5, pupilRadius * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();

    // Name tag
    ctx.save();
    ctx.font = 'bold 13px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    if (this.isPlayer) {
      ctx.fillStyle = this.playerIndex === 2 ? '#ffd166' : '#06d6a0';
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(this.name, head.x, head.y - radius * 1.5);
    ctx.restore();
  }
}

// --- Main Game Engine with Dual-Transport Multiplayer ---
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
    this.lbList = document.getElementById('lb-list');
    this.roomInfo = document.getElementById('room-info');

    this.menuOverlay = document.getElementById('menu-overlay');
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.gameoverTitle = document.getElementById('gameover-title');
    this.gameoverSubtitle = document.getElementById('gameover-subtitle');
    this.finalScore = document.getElementById('final-score');
    this.restartBtn = document.getElementById('restart-btn');
    this.soundBtn = document.getElementById('sound-btn');

    // Mode Inputs
    this.soloNick = document.getElementById('solo-nick');
    this.p1Nick = document.getElementById('p1-nick');
    this.p2Nick = document.getElementById('p2-nick');
    this.onlineNick = document.getElementById('online-nick');

    this.hostBtn = document.getElementById('host-btn');
    this.joinBtn = document.getElementById('join-btn');
    this.joinCodeInput = document.getElementById('join-code-input');
    this.hostRoomInfo = document.getElementById('host-room-info');
    this.hostCodeVal = document.getElementById('host-code-val');
    this.hostStatus = document.getElementById('host-status');
    this.copyLinkBtn = document.getElementById('copy-link-btn');
    this.joinStatus = document.getElementById('join-status');

    // Selected skins
    this.soloSkinIdx = 0;
    this.p1SkinIdx = 0;
    this.p2SkinIdx = 5;
    this.onlineSkinIdx = 0;

    // Game state
    this.currentMode = 'solo';
    this.isRunning = false;
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.player1 = null;
    this.player2 = null;
    this.snakes = [];
    this.foods = [];

    // Inputs
    this.mouse = { x: 0, y: 0 };
    this.p2Keys = { w: false, s: false, a: false, d: false, space: false };

    // Networking
    this.peer = null;
    this.netConn = null;
    this.wsSocket = null;
    this.useWebSocket = false;
    this.remoteSnakes = [];
    this.remoteFoods = [];

    this.initTabs();
    this.initSkinSelectors();
    this.bindEvents();
    this.resize();
    this.checkUrlForRoom();
    this.detectLocalWebSocketServer();
  }

  detectLocalWebSocketServer() {
    // If served via python3 server.py over http, check if /ws is active
    if (window.location.protocol.startsWith('http')) {
      try {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${proto}//${window.location.host}/ws`;
        const testWs = new WebSocket(wsUrl);
        testWs.onopen = () => {
          this.useWebSocket = true;
          this.wsSocket = testWs;
          console.log('SLUTTER: Local WebSocket Server Detected! Using ultra-fast direct relay.');
        };
        testWs.onerror = () => {
          this.useWebSocket = false;
        };
      } catch (e) {
        this.useWebSocket = false;
      }
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

    setupSelector('solo-skins', idx => this.soloSkinIdx = idx, this.soloSkinIdx);
    setupSelector('p1-skins', idx => this.p1SkinIdx = idx, this.p1SkinIdx);
    setupSelector('p2-skins', idx => this.p2SkinIdx = idx, this.p2SkinIdx);
    setupSelector('online-skins', idx => this.onlineSkinIdx = idx, this.onlineSkinIdx);
  }

  checkUrlForRoom() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      const onlineTab = document.querySelector('.mode-tab[data-mode="online"]');
      if (onlineTab) onlineTab.click();
      this.joinCodeInput.value = cleanRoomCode(room);
    }
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    // Mouse movement
    window.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (this.currentMode === 'online-guest') {
        const cx = this.width / 2;
        const cy = this.height / 2;
        this.guestAngle = Math.atan2(this.mouse.y - cy, this.mouse.x - cx);
        this.sendGuestInput();
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

    // Mouse boost
    window.addEventListener('mousedown', e => {
      if (e.button === 0) {
        if (this.currentMode === 'online-guest') {
          this.guestBoosting = true;
          this.sendGuestInput();
          sounds.startBoost();
        } else if (this.player1) {
          this.player1.isBoosting = true;
          sounds.startBoost();
        }
      }
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 0) {
        if (this.currentMode === 'online-guest') {
          this.guestBoosting = false;
          this.sendGuestInput();
          sounds.stopBoost();
        } else if (this.player1) {
          this.player1.isBoosting = false;
          sounds.stopBoost();
        }
      }
    });

    // Keyboard (Player 2 WASD & Space for Solo)
    window.addEventListener('keydown', e => {
      const code = e.code;
      if (code === 'Space') {
        if (this.currentMode === 'solo' && this.player1) {
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
        if (this.currentMode === 'solo' && this.player1) {
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
    document.getElementById('start-solo-btn').addEventListener('click', () => {
      sounds.init();
      this.startSolo();
    });

    document.getElementById('start-local2p-btn').addEventListener('click', () => {
      sounds.init();
      this.startLocal2P();
    });

    this.hostBtn.addEventListener('click', () => {
      sounds.init();
      this.startOnlineHost();
    });

    this.joinBtn.addEventListener('click', () => {
      sounds.init();
      this.startOnlineGuest();
    });

    this.copyLinkBtn.addEventListener('click', () => {
      const url = `${window.location.origin}${window.location.pathname}?room=${this.roomCode}`;
      navigator.clipboard.writeText(url).then(() => {
        this.copyLinkBtn.textContent = '✅ Odkaz zkopírován!';
        setTimeout(() => this.copyLinkBtn.textContent = '📋 Kopírovat odkaz pro kamaráda', 2000);
      });
    });

    this.restartBtn.addEventListener('click', () => {
      this.gameoverOverlay.classList.add('hidden');
      if (this.currentMode === 'solo') this.startSolo();
      else if (this.currentMode === 'local2p') this.startLocal2P();
      else {
        this.menuOverlay.classList.remove('hidden');
        this.hud.classList.add('hidden');
      }
    });

    this.soundBtn.addEventListener('click', () => {
      const active = sounds.toggle();
      this.soundBtn.textContent = active ? '🔊' : '🔇';
    });
  }

  updateP2Heading() {
    if (!this.player2 || this.player2.dead) return;
    let dx = 0;
    let dy = 0;
    if (this.p2Keys.w) dy -= 1;
    if (this.p2Keys.s) dy += 1;
    if (this.p2Keys.a) dx -= 1;
    if (this.p2Keys.d) dx += 1;

    if (dx !== 0 || dy !== 0) {
      this.player2.targetAngle = Math.atan2(dy, dx);
    }
  }

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
    const bot = new PenisSnake(
      name,
      Math.cos(angle) * dist,
      Math.sin(angle) * dist,
      skin,
      false
    );
    bot.score = randRange(15, 80);
    return bot;
  }

  // --- START MODES ---
  startSolo() {
    this.currentMode = 'solo';
    const nick = this.soloNick.value.trim() || 'MegaKláda';
    const skin = SKINS[this.soloSkinIdx];

    this.player1 = new PenisSnake(nick, 0, 0, skin, true, 1);
    this.player2 = null;
    this.snakes = [this.player1];

    this.spawnInitialFood();
    for (let i = 0; i < MAX_BOTS; i++) {
      this.snakes.push(this.spawnBot());
    }

    this.setupHUDForMode('solo');
    this.menuOverlay.classList.add('hidden');
    this.gameoverOverlay.classList.add('hidden');
    this.hud.classList.remove('hidden');

    this.isRunning = true;
    requestAnimationFrame(() => this.loop());
  }

  startLocal2P() {
    this.currentMode = 'local2p';
    const nick1 = this.p1Nick.value.trim() || 'Macko 1';
    const nick2 = this.p2Nick.value.trim() || 'Macko 2';
    const skin1 = SKINS[this.p1SkinIdx];
    const skin2 = SKINS[this.p2SkinIdx];

    this.player1 = new PenisSnake(nick1, -150, 0, skin1, true, 1);
    this.player2 = new PenisSnake(nick2, 150, 0, skin2, true, 2);
    this.snakes = [this.player1, this.player2];

    this.spawnInitialFood();
    for (let i = 0; i < MAX_BOTS - 2; i++) {
      this.snakes.push(this.spawnBot());
    }

    this.setupHUDForMode('local2p');
    this.menuOverlay.classList.add('hidden');
    this.gameoverOverlay.classList.add('hidden');
    this.hud.classList.remove('hidden');

    this.isRunning = true;
    requestAnimationFrame(() => this.loop());
  }

  // --- ONLINE MULTIPLAYER (DUAL WEBSOCKET / WEBRTC WITH TURN) ---
  generateRoomCode() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  startOnlineHost() {
    this.roomCode = this.generateRoomCode();
    this.hostBtn.disabled = true;
    this.hostBtn.textContent = '⏳ Vytvářím místnost...';

    // Check if WebSocket server is available first
    if (this.useWebSocket && this.wsSocket && this.wsSocket.readyState === WebSocket.OPEN) {
      this.startHostViaWebSocket();
    } else {
      this.startHostViaWebRTC();
    }
  }

  startHostViaWebSocket() {
    this.hostBtn.classList.add('hidden');
    this.hostRoomInfo.classList.remove('hidden');
    this.hostCodeVal.textContent = this.roomCode;
    this.hostStatus.textContent = '⏳ Čekám na připojení kamaráda...';

    this.wsSocket.send(JSON.stringify({
      type: 'create_room',
      room: this.roomCode
    }));

    this.wsSocket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'guest_connected') {
          this.hostStatus.textContent = '✅ Kamarád připojen! Spouštím hru...';
        } else if (msg.type === 'hello') {
          this.setupHostGame();
          const guestSkin = SKINS[msg.skinIdx] || SKINS[3];
          this.player2 = new PenisSnake(msg.name || 'Kamarád', 120, 0, guestSkin, true, 2);
          this.snakes.push(this.player2);

          this.wsSocket.send(JSON.stringify({
            type: 'welcome',
            room: this.roomCode
          }));

          this.setupHUDForMode('online-host');
          this.menuOverlay.classList.add('hidden');
          this.hud.classList.remove('hidden');
          this.isRunning = true;
          requestAnimationFrame(() => this.loop());
        } else if (msg.type === 'input' && this.player2) {
          this.player2.targetAngle = msg.angle;
          this.player2.isBoosting = !!msg.isBoosting;
        } else if (msg.type === 'peer_disconnected') {
          alert('Kamarád se odpojil!');
        }
      } catch (e) {}
    };
  }

  startHostViaWebRTC() {
    if (typeof Peer === 'undefined') {
      alert('Knihovna WebRTC se nenačetla. Zkontrolujte připojení k internetu, nebo použijte "python3 server.py" na stejné Wi-Fi!');
      this.hostBtn.disabled = false;
      this.hostBtn.textContent = 'Vytvořit kód místnosti';
      return;
    }

    const peerId = 'slutterio-v3-' + this.roomCode;
    try {
      this.peer = new Peer(peerId, PEER_CONFIG);
    } catch (e) {
      alert('Chyba vytvoření Peer: ' + e);
      return;
    }

    this.peer.on('open', () => {
      this.hostBtn.classList.add('hidden');
      this.hostRoomInfo.classList.remove('hidden');
      this.hostCodeVal.textContent = this.roomCode;
      this.hostStatus.textContent = '⏳ Čekám na připojení kamaráda...';
    });

    this.peer.on('connection', conn => {
      this.netConn = conn;
      this.hostStatus.textContent = '🔄 Kamarád se připojuje...';

      conn.on('open', () => {
        this.hostStatus.textContent = '✅ Kamarád připojen! Spouštím hru...';
      });

      this.setupHostConnection();
    });

    this.peer.on('error', err => {
      console.warn('Peer error:', err);
      if (err.type === 'unavailable-id') {
        // Retry with another code if collision
        this.roomCode = this.generateRoomCode();
        this.startHostViaWebRTC();
      } else {
        this.hostStatus.textContent = '⚠️ Chyba spojení: ' + (err.type || err);
      }
    });
  }

  setupHostGame() {
    this.currentMode = 'online-host';
    const nick1 = this.onlineNick.value.trim() || 'HostBorec';
    const skin1 = SKINS[this.onlineSkinIdx];

    this.player1 = new PenisSnake(nick1, -120, 0, skin1, true, 1);
    this.player2 = null;
    this.snakes = [this.player1];

    this.spawnInitialFood();
    for (let i = 0; i < MAX_BOTS - 2; i++) {
      this.snakes.push(this.spawnBot());
    }
  }

  setupHostConnection() {
    this.setupHostGame();

    this.netConn.on('data', data => {
      if (data.type === 'hello') {
        const guestSkin = SKINS[data.skinIdx] || SKINS[3];
        this.player2 = new PenisSnake(data.name || 'Kamarád', 120, 0, guestSkin, true, 2);
        this.snakes.push(this.player2);

        this.netConn.send({
          type: 'welcome',
          room: this.roomCode
        });

        this.setupHUDForMode('online-host');
        this.menuOverlay.classList.add('hidden');
        this.hud.classList.remove('hidden');
        this.isRunning = true;
        requestAnimationFrame(() => this.loop());
      } else if (data.type === 'input' && this.player2) {
        this.player2.targetAngle = data.angle;
        this.player2.isBoosting = !!data.isBoosting;
      }
    });

    this.netConn.on('close', () => {
      alert('Kamarád se odpojil!');
    });
  }

  startOnlineGuest() {
    const rawCode = this.joinCodeInput.value.trim();
    const clean = cleanRoomCode(rawCode);

    if (!clean) {
      alert('Zadej 4-místný kód místnosti!');
      return;
    }

    this.joinBtn.disabled = true;
    this.joinBtn.textContent = '⏳ Připojuji se...';
    this.joinStatus.classList.remove('hidden');
    this.joinStatus.className = 'status-msg status-info';
    this.joinStatus.textContent = `🔍 Hledám místnost ${clean}...`;

    if (this.useWebSocket && this.wsSocket && this.wsSocket.readyState === WebSocket.OPEN) {
      this.startGuestViaWebSocket(clean);
    } else {
      this.startGuestViaWebRTC(clean);
    }
  }

  startGuestViaWebSocket(cleanCode) {
    this.wsSocket.send(JSON.stringify({
      type: 'join_room',
      room: cleanCode
    }));

    this.wsSocket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'room_joined') {
          this.joinStatus.className = 'status-msg status-success';
          this.joinStatus.textContent = '✅ Místnost nalezena! Spouštím hru...';
          this.currentMode = 'online-guest';

          this.wsSocket.send(JSON.stringify({
            type: 'hello',
            name: this.onlineNick.value.trim() || 'Hráč 2',
            skinIdx: this.onlineSkinIdx
          }));
        } else if (msg.type === 'welcome') {
          this.setupHUDForMode('online-guest');
          this.menuOverlay.classList.add('hidden');
          this.hud.classList.remove('hidden');
          this.isRunning = true;
          requestAnimationFrame(() => this.loopGuest());
        } else if (msg.type === 'sync') {
          this.handleGuestSync(msg);
        } else if (msg.type === 'error') {
          this.joinStatus.className = 'status-msg status-error';
          this.joinStatus.textContent = '❌ ' + msg.message;
          this.joinBtn.disabled = false;
          this.joinBtn.textContent = 'Připojit se';
        }
      } catch (e) {}
    };
  }

  startGuestViaWebRTC(cleanCode) {
    if (typeof Peer === 'undefined') {
      alert('Knihovna WebRTC se nenačetla. Zkontrolujte připojení k internetu, nebo použijte "python3 server.py"!');
      this.joinBtn.disabled = false;
      this.joinBtn.textContent = 'Připojit se';
      return;
    }

    const targetPeerId = 'slutterio-v3-' + cleanCode;
    let peerConnected = false;

    try {
      this.peer = new Peer(null, PEER_CONFIG);
    } catch (e) {
      this.joinStatus.className = 'status-msg status-error';
      this.joinStatus.textContent = 'Chyba inicializace WebRTC: ' + e;
      this.joinBtn.disabled = false;
      this.joinBtn.textContent = 'Připojit se';
      return;
    }

    const timeoutTimer = setTimeout(() => {
      if (!peerConnected) {
        this.joinStatus.className = 'status-msg status-error';
        this.joinStatus.innerHTML = `⚠️ Místnost ${cleanCode} neodpovídá.<br>1. Má Hostitel hru stále otevřenou s kódem <b>${cleanCode}</b>?<br>2. Pokud jste na stejné Wi-Fi, spusťte v terminálu <code>python3 server.py</code>.`;
        this.joinBtn.disabled = false;
        this.joinBtn.textContent = '🚀 Zkusit znovu';
      }
    }, 14000);

    this.peer.on('open', () => {
      this.joinStatus.textContent = `🔄 Spojuji se s místností ${cleanCode}...`;
      const conn = this.peer.connect(targetPeerId, {
        reliable: true
      });
      this.netConn = conn;

      conn.on('open', () => {
        peerConnected = true;
        clearTimeout(timeoutTimer);
        this.currentMode = 'online-guest';
        this.joinStatus.className = 'status-msg status-success';
        this.joinStatus.textContent = '✅ Spojeno! Načítám hru...';

        conn.send({
          type: 'hello',
          name: this.onlineNick.value.trim() || 'Hráč 2',
          skinIdx: this.onlineSkinIdx
        });
      });

      conn.on('data', data => {
        if (data.type === 'welcome') {
          this.setupHUDForMode('online-guest');
          this.menuOverlay.classList.add('hidden');
          this.hud.classList.remove('hidden');
          this.isRunning = true;
          requestAnimationFrame(() => this.loopGuest());
        } else if (data.type === 'sync') {
          this.handleGuestSync(data);
        }
      });

      conn.on('close', () => {
        alert('Spojení se serverem bylo ukončeno.');
      });
    });

    this.peer.on('error', err => {
      clearTimeout(timeoutTimer);
      this.joinBtn.disabled = false;
      this.joinBtn.textContent = 'Připojit se';
      this.joinStatus.className = 'status-msg status-error';

      if (err.type === 'peer-unavailable') {
        this.joinStatus.innerHTML = `❌ Místnost <b>${cleanCode}</b> nebyla nalezena.<br>Ujisti se, že hostitel má hru zapnutou a kód je správný.`;
      } else {
        this.joinStatus.textContent = '❌ Chyba sítě: ' + (err.message || err.type);
      }
    });
  }

  sendGuestInput() {
    if (this.currentMode !== 'online-guest') return;

    const payload = {
      type: 'input',
      angle: this.guestAngle || 0,
      isBoosting: !!this.guestBoosting
    };

    if (this.useWebSocket && this.wsSocket && this.wsSocket.readyState === WebSocket.OPEN) {
      this.wsSocket.send(JSON.stringify(payload));
    } else if (this.netConn && this.netConn.open) {
      this.netConn.send(payload);
    }
  }

  handleGuestSync(data) {
    this.remoteSnakes = data.snakes;
    this.remoteFoods = data.foods;
    this.remoteScores = data.scores;
    this.remoteCam = data.cam;

    if (data.myScore != null) {
      this.scoreVal.textContent = `${(10 + data.myScore * 0.16).toFixed(1)} cm`;
    }

    if (data.isDead) {
      this.onGuestDeath(data.myScore);
    }
  }

  setupHUDForMode(mode) {
    if (mode === 'local2p') {
      this.scoreBox.classList.add('hidden');
      this.scores2p.classList.remove('hidden');
      this.p1HudName.textContent = this.player1.name + ':';
      this.p2HudName.textContent = this.player2.name + ':';
      this.roomInfo.classList.add('hidden');
    } else if (mode === 'online-host') {
      this.scoreBox.classList.remove('hidden');
      this.scores2p.classList.add('hidden');
      this.roomInfo.classList.remove('hidden');
      this.roomInfo.textContent = `Kód místnosti: ${this.roomCode}`;
    } else {
      this.scoreBox.classList.remove('hidden');
      this.scores2p.classList.add('hidden');
      this.roomInfo.classList.add('hidden');
    }
  }

  checkCollisions() {
    const eatDistSq = (rad) => (rad + 12) ** 2;

    for (let s of this.snakes) {
      if (s.dead) continue;
      const head = s.segments[0];
      const headRad = s.getRadius();
      const threshold = eatDistSq(headRad);

      for (let i = this.foods.length - 1; i >= 0; i--) {
        const f = this.foods[i];
        if (distSq(head.x, head.y, f.x, f.y) < threshold) {
          s.score += f.value * 0.85;
          this.foods.splice(i, 1);
          if (s.isPlayer && s.playerIndex === 1) {
            sounds.playEat();
          }
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

        const rad2 = s2.getRadius();
        const killDistSq = (rad1 * 0.85 + rad2 * 0.72) ** 2;

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

    for (let i = this.snakes.length - 1; i >= 0; i--) {
      const s = this.snakes[i];
      if (s.dead) {
        if (!s.isPlayer) {
          this.snakes.splice(i, 1);
          setTimeout(() => {
            if (this.isRunning) this.snakes.push(this.spawnBot());
          }, randRange(1500, 3500));
        } else {
          if (this.currentMode === 'solo') {
            this.onPlayerDeath(s);
          } else if (this.currentMode === 'local2p') {
            if (this.player1.dead && this.player2.dead) {
              this.onLocal2PBothDead();
            }
          }
        }
      }
    }
  }

  onPlayerDeath(snake) {
    sounds.stopBoost();
    const cm = (10 + snake.score * 0.16).toFixed(1);
    this.gameoverTitle.textContent = '💥 SKONČIL JSI OCHABNUTÝ!';
    this.gameoverSubtitle.textContent = 'Byl jsi zlomen v boji titánů.';
    this.finalScore.textContent = `${cm} cm`;
    setTimeout(() => {
      this.gameoverOverlay.classList.remove('hidden');
    }, 600);
  }

  onLocal2PBothDead() {
    sounds.stopBoost();
    const cm1 = (10 + this.player1.score * 0.16).toFixed(1);
    const cm2 = (10 + this.player2.score * 0.16).toFixed(1);

    let winner = this.player1.score > this.player2.score ? this.player1.name : this.player2.name;
    this.gameoverTitle.textContent = `👑 VÍTĚZ: ${winner}!`;
    this.gameoverSubtitle.textContent = `${this.player1.name} (${cm1} cm) vs ${this.player2.name} (${cm2} cm)`;
    this.finalScore.textContent = `${Math.max(cm1, cm2)} cm`;
    setTimeout(() => {
      this.gameoverOverlay.classList.remove('hidden');
    }, 800);
  }

  onGuestDeath(finalScore) {
    sounds.stopBoost();
    const cm = (10 + (finalScore || 0) * 0.16).toFixed(1);
    this.gameoverTitle.textContent = '💥 PRASKNUL JSI!';
    this.gameoverSubtitle.textContent = 'Váš macko narazil do soupeře.';
    this.finalScore.textContent = `${cm} cm`;
    this.gameoverOverlay.classList.remove('hidden');
  }

  updateHUD() {
    if (this.currentMode === 'solo' && this.player1) {
      const cm = (10 + this.player1.score * 0.16).toFixed(1);
      this.scoreVal.textContent = `${cm} cm`;
    } else if (this.currentMode === 'local2p') {
      if (this.player1) {
        const cm1 = (10 + this.player1.score * 0.16).toFixed(1);
        this.p1Cm.textContent = this.player1.dead ? 'K.O.' : `${cm1} cm`;
      }
      if (this.player2) {
        const cm2 = (10 + this.player2.score * 0.16).toFixed(1);
        this.p2Cm.textContent = this.player2.dead ? 'K.O.' : `${cm2} cm`;
      }
    } else if (this.currentMode === 'online-host' && this.player1) {
      const cm = (10 + this.player1.score * 0.16).toFixed(1);
      this.scoreVal.textContent = `${cm} cm`;
    }

    const sorted = [...this.snakes].sort((a, b) => b.score - a.score).slice(0, 8);
    this.lbList.innerHTML = '';
    sorted.forEach((s, idx) => {
      const li = document.createElement('li');
      if (s.isPlayer) {
        if (s.playerIndex === 2) li.classList.add('p2');
        else li.classList.add('me');
      }

      const nameSpan = document.createElement('span');
      nameSpan.className = 'lb-name';
      nameSpan.textContent = `${idx + 1}. ${s.name}`;

      const scoreSpan = document.createElement('span');
      scoreSpan.className = 'lb-score';
      scoreSpan.textContent = `${(10 + s.score * 0.16).toFixed(0)}cm`;

      li.appendChild(nameSpan);
      li.appendChild(scoreSpan);
      this.lbList.appendChild(li);
    });
  }

  drawMinimap() {
    const mCtx = this.miniCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = (w * 0.46) / WORLD_RADIUS;

    mCtx.clearRect(0, 0, w, h);

    mCtx.fillStyle = 'rgba(20, 16, 38, 0.9)';
    mCtx.beginPath();
    mCtx.arc(cx, cy, w * 0.46, 0, Math.PI * 2);
    mCtx.fill();
    mCtx.strokeStyle = 'rgba(255, 77, 148, 0.4)';
    mCtx.lineWidth = 2;
    mCtx.stroke();

    for (let s of this.snakes) {
      if (s.dead) continue;
      const mx = cx + s.x * scale;
      const my = cy + s.y * scale;

      if (s.isPlayer) {
        mCtx.fillStyle = s.playerIndex === 2 ? '#ffd166' : '#06d6a0';
      } else {
        mCtx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      }
      mCtx.beginPath();
      mCtx.arc(mx, my, s.isPlayer ? 3.5 : 2, 0, Math.PI * 2);
      mCtx.fill();
    }
  }

  drawGrid() {
    const ctx = this.ctx;
    const gridSize = 70;
    const startX = Math.floor((this.camera.x - this.width / 2 / this.camera.zoom) / gridSize) * gridSize;
    const endX = this.camera.x + this.width / 2 / this.camera.zoom;
    const startY = Math.floor((this.camera.y - this.height / 2 / this.camera.zoom) / gridSize) * gridSize;
    const endY = this.camera.y + this.height / 2 / this.camera.zoom;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();
  }

  drawWorldBoundary() {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#ff3366';
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, WORLD_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // --- HOST LOOP ---
  loop() {
    if (!this.isRunning) return;

    for (let f of this.foods) {
      f.update();
    }
    this.replenishFood();

    for (let s of this.snakes) {
      s.update(this.foods, this.snakes);
    }

    this.checkCollisions();

    // Camera handling
    if (this.currentMode === 'local2p' && this.player1 && this.player2) {
      if (!this.player1.dead && !this.player2.dead) {
        const midX = (this.player1.x + this.player2.x) / 2;
        const midY = (this.player1.y + this.player2.y) / 2;
        this.camera.x += (midX - this.camera.x) * 0.1;
        this.camera.y += (midY - this.camera.y) * 0.1;

        const pDist = Math.hypot(this.player1.x - this.player2.x, this.player1.y - this.player2.y);
        const targetZoom = Math.min(1.0, Math.max(0.42, Math.min(this.width, this.height) / (pDist + 450)));
        this.camera.zoom += (targetZoom - this.camera.zoom) * 0.05;
      } else if (!this.player1.dead) {
        this.camera.x += (this.player1.x - this.camera.x) * 0.1;
        this.camera.y += (this.player1.y - this.camera.y) * 0.1;
      } else if (!this.player2.dead) {
        this.camera.x += (this.player2.x - this.camera.x) * 0.1;
        this.camera.y += (this.player2.y - this.camera.y) * 0.1;
      }
    } else if (this.player1 && !this.player1.dead) {
      this.camera.x += (this.player1.x - this.camera.x) * 0.12;
      this.camera.y += (this.player1.y - this.camera.y) * 0.12;

      const targetZoom = Math.max(0.65, 1.15 - Math.sqrt(this.player1.score) * 0.035);
      this.camera.zoom += (targetZoom - this.camera.zoom) * 0.05;
    }

    // Host sends sync packet to guest
    if (this.currentMode === 'online-host') {
      const guestSnake = this.player2;
      const syncData = {
        type: 'sync',
        myScore: guestSnake ? guestSnake.score : 0,
        isDead: guestSnake ? guestSnake.dead : true,
        cam: guestSnake && !guestSnake.dead ? { x: Math.round(guestSnake.x), y: Math.round(guestSnake.y), score: guestSnake.score } : { x: 0, y: 0, score: 10 },
        snakes: this.snakes.map(s => ({
          name: s.name,
          skinIdx: s.skinIdx,
          isPlayer: s.isPlayer,
          playerIndex: s.playerIndex,
          angle: +s.angle.toFixed(2),
          score: Math.round(s.score),
          dead: s.dead,
          segments: s.segments.map(p => [Math.round(p.x), Math.round(p.y)])
        })),
        foods: this.foods.map(f => [
          Math.round(f.x),
          Math.round(f.y),
          +(f.value.toFixed(1)),
          f.isSperm ? 1 : 0,
          f.color
        ])
      };

      if (this.useWebSocket && this.wsSocket && this.wsSocket.readyState === WebSocket.OPEN) {
        this.wsSocket.send(JSON.stringify(syncData));
      } else if (this.netConn && this.netConn.open) {
        this.netConn.send(syncData);
      }
    }

    // RENDER
    this.renderWorld(this.snakes, this.foods);
    this.updateHUD();
    this.drawMinimap();

    requestAnimationFrame(() => this.loop());
  }

  // --- GUEST LOOP ---
  loopGuest() {
    if (!this.isRunning) return;

    if (this.remoteCam) {
      this.camera.x += (this.remoteCam.x - this.camera.x) * 0.15;
      this.camera.y += (this.remoteCam.y - this.camera.y) * 0.15;
      const targetZoom = Math.max(0.65, 1.15 - Math.sqrt(this.remoteCam.score || 10) * 0.035);
      this.camera.zoom += (targetZoom - this.camera.zoom) * 0.05;
    }

    const dummyFoods = (this.remoteFoods || []).map(f => {
      const food = new Food(f[0], f[1], f[2], f[3] === 1, f[4]);
      return food;
    });

    const dummySnakes = (this.remoteSnakes || []).map(s => {
      const skin = SKINS[s.skinIdx] || SKINS[0];
      const sn = new PenisSnake(s.name, 0, 0, skin, s.isPlayer, s.playerIndex);
      sn.angle = s.angle;
      sn.score = s.score;
      sn.dead = s.dead;
      sn.segments = s.segments.map(p => ({ x: p[0], y: p[1] }));
      return sn;
    });

    this.snakes = dummySnakes;
    this.renderWorld(dummySnakes, dummyFoods);
    this.drawMinimap();

    requestAnimationFrame(() => this.loopGuest());
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
      s.draw(this.ctx);
    }

    this.ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
