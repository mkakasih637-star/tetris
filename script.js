/* ═══════════════════════════════════════════════════════════
   TETRIS — NEON EDITION
   Complete game logic: engine, rendering, audio, UI
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ════════════════════════════════════════════════════════════
// §1  CONSTANTS & CONFIGURATION
// ════════════════════════════════════════════════════════════

const COLS        = 10;
const ROWS        = 20;
const HIDDEN_ROWS = 2;    // rows above visible area for spawn
const TOTAL_ROWS  = ROWS + HIDDEN_ROWS;

// Level speed table (ms per gravity tick)
const LEVEL_SPEEDS = [
  800, 720, 630, 550, 470, 380, 300, 220, 150, 100,
  80,  80,  80,  75,  70,  65,  60,  55,  50,  40
];

// Scoring constants
const SCORE_TABLE   = { 1: 100, 2: 300, 3: 500, 4: 800 };
const COMBO_BASE    = 50;
const SOFT_DROP_PTS = 1;
const HARD_DROP_PTS = 2;
const LINES_PER_LEVEL = 10;

// Auto-repeat delays (ms)
const DAS_DELAY    = 160;  // delayed auto-shift initial delay
const DAS_INTERVAL = 50;   // repeat rate

// Lock delay
const LOCK_DELAY   = 500;  // ms before piece locks after touching ground
const LOCK_MOVES   = 15;   // max moves before forced lock

// ════════════════════════════════════════════════════════════
// §2  TETROMINO DEFINITIONS
// ════════════════════════════════════════════════════════════

/**
 * Each piece: { color, glow, shape[] }
 * shape = 4×4 grid arrays (4 rotations).
 * 1 = filled cell, 0 = empty.
 */
const PIECES = {
  I: {
    color: '#00f5ff',
    glow:  '0 0 10px #00f5ffaa, 0 0 22px #00f5ff44',
    shapes: [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
      [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
    ]
  },
  O: {
    color: '#ffe600',
    glow:  '0 0 10px #ffe600aa, 0 0 22px #ffe60044',
    shapes: [
      [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]]
    ]
  },
  T: {
    color: '#c800ff',
    glow:  '0 0 10px #c800ffaa, 0 0 22px #c800ff44',
    shapes: [
      [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
      [[0,0,0,0],[1,1,1,0],[0,1,0,0],[0,0,0,0]],
      [[0,1,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]]
    ]
  },
  S: {
    color: '#00ff88',
    glow:  '0 0 10px #00ff88aa, 0 0 22px #00ff8844',
    shapes: [
      [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,0,0],[0,1,1,0],[0,0,1,0],[0,0,0,0]],
      [[0,0,0,0],[0,1,1,0],[1,1,0,0],[0,0,0,0]],
      [[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]]
    ]
  },
  Z: {
    color: '#ff2244',
    glow:  '0 0 10px #ff2244aa, 0 0 22px #ff224444',
    shapes: [
      [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
      [[0,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,0,0]],
      [[0,1,0,0],[1,1,0,0],[1,0,0,0],[0,0,0,0]]
    ]
  },
  J: {
    color: '#004cff',
    glow:  '0 0 10px #004cffaa, 0 0 22px #004cff44',
    shapes: [
      [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
      [[0,0,0,0],[1,1,1,0],[0,0,1,0],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[1,1,0,0],[0,0,0,0]]
    ]
  },
  L: {
    color: '#ff7700',
    glow:  '0 0 10px #ff7700aa, 0 0 22px #ff770044',
    shapes: [
      [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0]],
      [[0,0,0,0],[1,1,1,0],[1,0,0,0],[0,0,0,0]],
      [[1,1,0,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]]
    ]
  }
};

const PIECE_KEYS = Object.keys(PIECES);

// SRS wall-kick offsets for J,L,S,T,Z: [rotation][test] = [dx, dy]
const KICK_JLSTZ = [
  [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]]
];
// SRS wall-kick offsets for I
const KICK_I = [
  [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  [[0,0],[1,0],[-2,0],[1,-2],[-2,1]]
];

// ════════════════════════════════════════════════════════════
// §3  AUDIO ENGINE (Web Audio API)
// ════════════════════════════════════════════════════════════

const AudioEngine = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** Play a simple synthesised tone */
  function tone(freq, type, duration, volume = 0.25, decay = true) {
    if (!settings.sound) return;
    try {
      const c   = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, c.currentTime);
      if (decay) gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + duration);
    } catch(e) {}
  }

  /** Noise burst */
  function noise(duration, volume = 0.15) {
    if (!settings.sound) return;
    try {
      const c = getCtx();
      const bufLen = Math.ceil(c.sampleRate * duration);
      const buf = c.createBuffer(1, bufLen, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      const gain = c.createGain();
      gain.gain.setValueAtTime(volume, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      src.connect(gain);
      gain.connect(c.destination);
      src.start();
    } catch(e) {}
  }

  return {
    move()      { tone(220, 'square', 0.06, 0.12); },
    rotate()    { tone(440, 'square', 0.07, 0.14); tone(660, 'square', 0.04, 0.08); },
    hardDrop()  { noise(0.08, 0.2); tone(110, 'sawtooth', 0.1, 0.18); },
    softDrop()  { tone(180, 'square', 0.04, 0.09); },
    lock()      { noise(0.06, 0.12); },
    lineClear(n) {
      if (n === 4) {
        // Tetris fanfare
        [523, 659, 784, 1047].forEach((f,i) => {
          setTimeout(() => tone(f, 'sine', 0.15, 0.3), i * 55);
        });
      } else {
        tone(330 + n * 80, 'triangle', 0.2, 0.3);
      }
    },
    levelUp()   {
      [523, 659, 784, 1047, 1319].forEach((f,i) => {
        setTimeout(() => tone(f, 'triangle', 0.18, 0.35), i * 60);
      });
    },
    gameOver()  {
      [440, 370, 311, 261, 220].forEach((f,i) => {
        setTimeout(() => tone(f, 'sawtooth', 0.25, 0.4), i * 90);
      });
    },
    hold()      { tone(330, 'sine', 0.1, 0.2); },
    comboHit(n) { tone(440 + n * 55, 'sine', 0.12, 0.22); }
  };
})();

// ════════════════════════════════════════════════════════════
// §4  SETTINGS
// ════════════════════════════════════════════════════════════

const settings = {
  sound:     true,
  ghost:     true,
  animation: true,
  vibration: true
};

function loadSettings() {
  const saved = localStorage.getItem('tetris_settings');
  if (saved) Object.assign(settings, JSON.parse(saved));
  // Sync UI
  document.getElementById('toggle-sound').checked = settings.sound;
  document.getElementById('toggle-ghost').checked = settings.ghost;
  document.getElementById('toggle-anim').checked  = settings.animation;
  document.getElementById('toggle-vib').checked   = settings.vibration;
}
function saveSettings() {
  localStorage.setItem('tetris_settings', JSON.stringify(settings));
}

// ════════════════════════════════════════════════════════════
// §5  GAME STATE
// ════════════════════════════════════════════════════════════

let board       = [];   // TOTAL_ROWS × COLS, each cell = null | {color}
let current     = null; // { key, shape, x, y, rot, color, glow }
let nextQueue   = [];   // 3 preview pieces
let holdPiece   = null; // { key, color, glow }
let holdUsed    = false;

let score       = 0;
let hiScore     = 0;
let level       = 1;
let linesTotal  = 0;
let combo       = -1;   // starts at -1, first clear sets to 0
let lastClear   = 0;    // timestamp of last line clear

let gameState   = 'idle';  // 'idle' | 'running' | 'paused' | 'over'
let animId      = null;
let lastTime    = 0;
let dropAccum   = 0;

// Lock delay tracking
let lockTimer   = null;
let lockMoves   = 0;
let onGround    = false;

// Auto-repeat (DAS)
let dasLeft     = null;
let dasRight    = null;

// 7-bag randomiser state
let bag         = [];

// ════════════════════════════════════════════════════════════
// §6  CANVAS SETUP & SIZING
// ════════════════════════════════════════════════════════════

const gameCanvas  = document.getElementById('game-canvas');
const gCtx        = gameCanvas.getContext('2d');
const holdCanvas  = document.getElementById('hold-canvas');
const hCtx        = holdCanvas.getContext('2d');
const nextCanvas  = document.getElementById('next-canvas');
const nCtx        = nextCanvas.getContext('2d');

let CELL = 30;  // pixel size per cell, recalculated on resize

function sizeBoard() {
  const maxH = window.innerHeight * (window.innerWidth < 780 ? 0.58 : 0.92);
  const maxW = window.innerWidth  * (window.innerWidth < 780 ? 0.48 : 0.35);
  CELL = Math.floor(Math.min(maxH / ROWS, maxW / COLS));
  CELL = Math.max(18, Math.min(CELL, 38));

  gameCanvas.width  = COLS * CELL;
  gameCanvas.height = ROWS * CELL;

  const previewCell = CELL * 0.8;
  holdCanvas.width  = 4 * previewCell;
  holdCanvas.height = 4 * previewCell;
  nextCanvas.width  = 4 * previewCell;
  nextCanvas.height = 3 * 4 * previewCell;  // 3 previews
}

window.addEventListener('resize', () => { sizeBoard(); renderAll(); });

// ════════════════════════════════════════════════════════════
// §7  BOARD UTILITIES
// ════════════════════════════════════════════════════════════

function createBoard() {
  return Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null));
}

/** Get absolute filled cells for a piece */
function pieceCells(piece, overrideRot) {
  const rot   = overrideRot !== undefined ? overrideRot : piece.rot;
  const shape = PIECES[piece.key].shapes[rot];
  const cells = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (shape[r][c]) cells.push({ r: piece.y + r, c: piece.x + c });
  return cells;
}

function isValid(piece, dx = 0, dy = 0, rot = piece.rot) {
  const shape = PIECES[piece.key].shapes[rot];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (shape[r][c]) {
        const nr = piece.y + r + dy;
        const nc = piece.x + c + dx;
        if (nc < 0 || nc >= COLS || nr >= TOTAL_ROWS) return false;
        if (nr >= 0 && board[nr][nc]) return false;
      }
  return true;
}

// ════════════════════════════════════════════════════════════
// §8  7-BAG RANDOMISER
// ════════════════════════════════════════════════════════════

function refillBag() {
  bag = [...PIECE_KEYS];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}

function nextPieceKey() {
  if (bag.length === 0) refillBag();
  return bag.pop();
}

function buildPiece(key) {
  const p = PIECES[key];
  return { key, color: p.color, glow: p.glow, rot: 0, x: 3, y: 0 };
}

function spawnPiece() {
  if (nextQueue.length < 3) {
    while (nextQueue.length < 3) nextQueue.push(nextPieceKey());
  }
  current   = buildPiece(nextQueue.shift());
  nextQueue.push(nextPieceKey());
  holdUsed  = false;
  onGround  = false;
  lockMoves = 0;
  clearLockTimer();

  // Super-rotation spawn position for I piece
  if (current.key === 'I') current.y = -1;

  if (!isValid(current)) {
    // Game over: cannot spawn
    triggerGameOver();
  }
}

// ════════════════════════════════════════════════════════════
// §9  MOVEMENT & ROTATION
// ════════════════════════════════════════════════════════════

function moveLeft() {
  if (gameState !== 'running') return;
  if (isValid(current, -1, 0)) {
    current.x--;
    AudioEngine.move();
    vibrate(10);
    onMovement();
  }
}

function moveRight() {
  if (gameState !== 'running') return;
  if (isValid(current, 1, 0)) {
    current.x++;
    AudioEngine.move();
    vibrate(10);
    onMovement();
  }
}

function softDrop() {
  if (gameState !== 'running') return;
  if (isValid(current, 0, 1)) {
    current.y++;
    score += SOFT_DROP_PTS;
    updateHUD();
    AudioEngine.softDrop();
    dropAccum = 0;
  }
}

function hardDrop() {
  if (gameState !== 'running') return;
  let dropped = 0;
  while (isValid(current, 0, 1)) { current.y++; dropped++; }
  score += dropped * HARD_DROP_PTS;
  updateHUD();
  AudioEngine.hardDrop();
  vibrate(20);
  lockPiece(true);
}

/** SRS rotation with wall kicks */
function rotatePiece(dir = 1) {
  if (gameState !== 'running') return;
  const newRot = (current.rot + dir + 4) % 4;
  const kicks  = current.key === 'I' ? KICK_I : KICK_JLSTZ;
  const tests  = kicks[current.rot];

  for (const [dx, dy] of tests) {
    if (isValid(current, dx, -dy, newRot)) {
      current.x   += dx;
      current.y   -= dy;
      current.rot  = newRot;
      AudioEngine.rotate();
      vibrate(8);
      onMovement();
      return;
    }
  }
}

/** Called on any successful move/rotation while on ground (resets lock delay) */
function onMovement() {
  const ground = !isValid(current, 0, 1);
  if (ground) {
    if (!onGround) { startLockTimer(); onGround = true; }
    else if (lockMoves < LOCK_MOVES) { resetLockTimer(); lockMoves++; }
    // else: forced lock will happen naturally
  } else {
    onGround = false;
    clearLockTimer();
  }
}

// ════════════════════════════════════════════════════════════
// §10  HOLD PIECE
// ════════════════════════════════════════════════════════════

function doHold() {
  if (gameState !== 'running' || holdUsed) return;
  AudioEngine.hold();
  if (!holdPiece) {
    holdPiece = { key: current.key, color: current.color, glow: current.glow };
    spawnPiece();
  } else {
    const tmp = holdPiece;
    holdPiece = { key: current.key, color: current.color, glow: current.glow };
    current   = buildPiece(tmp.key);
    if (current.key === 'I') current.y = -1;
  }
  holdUsed  = true;
  onGround  = false;
  lockMoves = 0;
  clearLockTimer();
  renderHold();
}

// ════════════════════════════════════════════════════════════
// §11  LOCKING & LINE CLEARING
// ════════════════════════════════════════════════════════════

function startLockTimer() {
  clearLockTimer();
  lockTimer = setTimeout(() => lockPiece(false), LOCK_DELAY);
}
function resetLockTimer() {
  clearLockTimer();
  lockTimer = setTimeout(() => lockPiece(false), LOCK_DELAY);
}
function clearLockTimer() {
  if (lockTimer) { clearTimeout(lockTimer); lockTimer = null; }
}

function lockPiece(fromHardDrop = false) {
  clearLockTimer();

  // Stamp cells onto board
  pieceCells(current).forEach(({ r, c }) => {
    if (r >= 0 && r < TOTAL_ROWS) {
      board[r][c] = { color: current.color, glow: current.glow };
    }
  });

  AudioEngine.lock();

  // Find full lines
  const fullRows = [];
  for (let r = 0; r < TOTAL_ROWS; r++) {
    if (board[r].every(cell => cell !== null)) fullRows.push(r);
  }

  if (fullRows.length > 0) {
    clearLines(fullRows);
  } else {
    combo = -1;
    updateHUD();
    spawnPiece();
    renderAll();
  }
}

function clearLines(rows) {
  const count = rows.length;
  const now   = Date.now();

  // Combo logic
  if (now - lastClear < 500 + LEVEL_SPEEDS[Math.min(level - 1, LEVEL_SPEEDS.length - 1)] * 2) {
    combo++;
  } else {
    combo = 0;
  }
  lastClear = now;

  // Score
  const base  = (SCORE_TABLE[count] || 0) * level;
  const comboBonus = combo > 0 ? COMBO_BASE * combo * level : 0;
  score += base + comboBonus;
  linesTotal += count;

  // Level up
  const newLevel = Math.floor(linesTotal / LINES_PER_LEVEL) + 1;
  const leveledUp = newLevel > level;
  level = newLevel;

  if (hiScore < score) { hiScore = score; localStorage.setItem('tetris_hi', hiScore); }

  AudioEngine.lineClear(count);
  if (combo > 0) AudioEngine.comboHit(combo);
  if (leveledUp) AudioEngine.levelUp();
  vibrate(leveledUp ? 60 : 25);

  // Flash board area
  if (settings.animation) {
    const boardArea = document.querySelector('.board-area');
    boardArea.classList.remove('flash');
    void boardArea.offsetWidth; // reflow
    boardArea.classList.add('flash');
    setTimeout(() => boardArea.classList.remove('flash'), 450);
  }

  // Animate line-clear: flash rows then remove
  if (settings.animation) {
    flashRows(rows, () => {
      removeRows(rows);
      updateHUD(leveledUp);
      if (leveledUp) showLevelUp(level);
      spawnPiece();
      renderAll();
    });
  } else {
    removeRows(rows);
    updateHUD(leveledUp);
    if (leveledUp) showLevelUp(level);
    spawnPiece();
    renderAll();
  }
}

/** Flash clear rows white before removing */
function flashRows(rows, cb) {
  const rowSet = new Set(rows);
  let tick = 0;
  const FLASHES = 3;
  const interval = setInterval(() => {
    tick++;
    // Render with flash override
    renderBoard(rowSet, tick % 2 === 1 ? '#ffffff' : null);
    if (tick >= FLASHES * 2) { clearInterval(interval); cb(); }
  }, 55);
}

function removeRows(rows) {
  // Sort descending so splicing doesn't shift indices
  rows.sort((a, b) => b - a);
  rows.forEach(r => board.splice(r, 1));
  // Prepend empty rows
  while (board.length < TOTAL_ROWS) board.unshift(Array(COLS).fill(null));
}

// ════════════════════════════════════════════════════════════
// §12  GHOST PIECE
// ════════════════════════════════════════════════════════════

function getGhostY() {
  if (!current) return 0;
  let gy = current.y;
  while (isValid({ ...current, y: gy + 1 })) gy++;
  return gy;
}

// ════════════════════════════════════════════════════════════
// §13  RENDERING
// ════════════════════════════════════════════════════════════

const GRID_COLOR  = 'rgba(30,58,96,0.25)';
const GHOST_ALPHA = 0.18;

/** Render all canvases */
function renderAll() {
  renderBoard();
  renderHold();
  renderNext();
}

/** Draw a single filled cell on any context */
function drawCell(ctx, x, y, size, color, glow, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  // Main fill
  ctx.fillStyle = color;
  ctx.shadowColor   = color;
  ctx.shadowBlur    = 10;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
  // Highlight stripe
  const grad = ctx.createLinearGradient(x, y, x, y + size);
  grad.addColorStop(0, 'rgba(255,255,255,0.35)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  grad.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle  = grad;
  ctx.shadowBlur = 0;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
  ctx.restore();
}

/** Render the main board */
function renderBoard(flashRowSet = null, flashColor = null) {
  const ctx  = gCtx;
  const W    = gameCanvas.width;
  const H    = gameCanvas.height;
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = 'rgba(7,10,16,1)';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth   = 0.5;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL);
    ctx.stroke();
  }

  // Board cells (hidden rows offset)
  for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) {
        const screenR = r - HIDDEN_ROWS;
        let color = board[r][c].color;
        if (flashRowSet && flashRowSet.has(r) && flashColor) color = flashColor;
        drawCell(ctx, c * CELL, screenR * CELL, CELL, color, board[r][c].glow);
      }
    }
  }

  if (!current || gameState === 'over') return;

  // Ghost piece
  if (settings.ghost) {
    const gy = getGhostY();
    const shape = PIECES[current.key].shapes[current.rot];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        if (shape[r][c]) {
          const sr = (current.y + r + gy - current.y) - HIDDEN_ROWS;
          const sc = current.x + c;
          if (sr >= 0 && sr < ROWS) {
            ctx.save();
            ctx.globalAlpha = GHOST_ALPHA;
            ctx.fillStyle   = current.color;
            ctx.fillRect(sc * CELL + 1, sr * CELL + 1, CELL - 2, CELL - 2);
            ctx.restore();
            // Ghost border
            ctx.save();
            ctx.globalAlpha   = 0.45;
            ctx.strokeStyle   = current.color;
            ctx.lineWidth     = 1.5;
            ctx.shadowColor   = current.color;
            ctx.shadowBlur    = 4;
            ctx.strokeRect(sc * CELL + 1.5, sr * CELL + 1.5, CELL - 3, CELL - 3);
            ctx.restore();
          }
        }
  }

  // Active piece
  const shape = PIECES[current.key].shapes[current.rot];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (shape[r][c]) {
        const sr = current.y + r - HIDDEN_ROWS;
        const sc = current.x + c;
        if (sr >= 0 && sr < ROWS) {
          drawCell(ctx, sc * CELL, sr * CELL, CELL, current.color, current.glow);
        }
      }
}

/** Render a piece into a small preview canvas */
function renderPreview(ctx, pieceKey, cellSize, offsetX = 0, offsetY = 0) {
  if (!pieceKey) return;
  const p     = PIECES[pieceKey];
  const shape = p.shapes[0];
  // Find bounding box
  let minR = 4, maxR = -1, minC = 4, maxC = -1;
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (shape[r][c]) { minR=Math.min(minR,r); maxR=Math.max(maxR,r); minC=Math.min(minC,c); maxC=Math.max(maxC,c); }
  const pw = (maxC - minC + 1) * cellSize;
  const ph = (maxR - minR + 1) * cellSize;
  const startX = offsetX + (cellSize * 4 - pw) / 2;
  const startY = offsetY + (cellSize * 4 - ph) / 2;
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (shape[r][c]) {
        drawCell(
          ctx,
          startX + (c - minC) * cellSize,
          startY + (r - minR) * cellSize,
          cellSize, p.color, p.glow
        );
      }
}

function renderHold() {
  const cell = Math.floor(holdCanvas.width / 4);
  hCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  hCtx.fillStyle = 'rgba(7,10,16,0.8)';
  hCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (!holdPiece) return;
  hCtx.globalAlpha = holdUsed ? 0.35 : 1;
  renderPreview(hCtx, holdPiece.key, cell);
  hCtx.globalAlpha = 1;
}

function renderNext() {
  const cell = Math.floor(nextCanvas.width / 4);
  nCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nCtx.fillStyle = 'rgba(7,10,16,0.8)';
  nCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextQueue.slice(0, 3).forEach((key, i) => {
    renderPreview(nCtx, key, cell, 0, i * cell * 4);
    if (i < 2) {
      nCtx.strokeStyle = 'rgba(30,58,96,0.4)';
      nCtx.lineWidth = 1;
      nCtx.beginPath();
      nCtx.moveTo(4, (i + 1) * cell * 4);
      nCtx.lineTo(nextCanvas.width - 4, (i + 1) * cell * 4);
      nCtx.stroke();
    }
  });
}

// ════════════════════════════════════════════════════════════
// §14  HUD UPDATES
// ════════════════════════════════════════════════════════════

function updateHUD(leveledUp = false) {
  const scoreEl = document.getElementById('score');
  scoreEl.textContent = score.toLocaleString();
  if (settings.animation) {
    scoreEl.classList.remove('score-pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('score-pop');
  }

  document.getElementById('hiscore').textContent = hiScore.toLocaleString();
  document.getElementById('level').textContent   = level;
  document.getElementById('lines').textContent   = linesTotal;

  const comboEl = document.getElementById('combo');
  if (combo > 0) {
    comboEl.textContent = `x${combo + 1}`;
    if (settings.animation) {
      comboEl.classList.remove('combo-show');
      void comboEl.offsetWidth;
      comboEl.classList.add('combo-show');
    }
  } else {
    comboEl.textContent = '—';
  }
}

// ════════════════════════════════════════════════════════════
// §15  GAME LOOP
// ════════════════════════════════════════════════════════════

function getSpeed() {
  return LEVEL_SPEEDS[Math.min(level - 1, LEVEL_SPEEDS.length - 1)];
}

function gameLoop(timestamp) {
  if (gameState !== 'running') return;

  const dt = timestamp - lastTime;
  lastTime = timestamp;
  dropAccum += dt;

  // Gravity
  if (dropAccum >= getSpeed()) {
    dropAccum -= getSpeed();
    if (isValid(current, 0, 1)) {
      current.y++;
      onGround = false;
    } else {
      // Piece touching ground
      if (!onGround) {
        onGround = true;
        lockMoves = 0;
        startLockTimer();
      }
    }
  }

  renderAll();
  animId = requestAnimationFrame(gameLoop);
}

// ════════════════════════════════════════════════════════════
// §16  GAME CONTROL (start / pause / restart / over)
// ════════════════════════════════════════════════════════════

function startGame() {
  board      = createBoard();
  nextQueue  = [];
  bag        = [];
  holdPiece  = null;
  holdUsed   = false;
  score      = 0;
  level      = 1;
  linesTotal = 0;
  combo      = -1;
  dropAccum  = 0;
  onGround   = false;
  lockMoves  = 0;
  clearLockTimer();
  stopDAS();

  hiScore = parseInt(localStorage.getItem('tetris_hi') || '0', 10);
  refillBag();
  while (nextQueue.length < 3) nextQueue.push(nextPieceKey());
  spawnPiece();
  updateHUD();
  sizeBoard();

  gameState = 'running';
  hideAllOverlays();

  lastTime  = performance.now();
  dropAccum = 0;
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
  if (gameState !== 'running') return;
  gameState = 'paused';
  cancelAnimationFrame(animId);
  clearLockTimer();
  showOverlay('pause-screen');
}

function resumeGame() {
  if (gameState !== 'paused') return;
  hideAllOverlays();
  gameState = 'running';
  lastTime  = performance.now();
  animId    = requestAnimationFrame(gameLoop);
}

function triggerGameOver() {
  gameState = 'over';
  cancelAnimationFrame(animId);
  clearLockTimer();
  stopDAS();
  AudioEngine.gameOver();
  vibrate([50, 30, 80]);

  if (hiScore < score) { hiScore = score; localStorage.setItem('tetris_hi', hiScore); }

  setTimeout(() => {
    document.getElementById('go-score').textContent  = score.toLocaleString();
    document.getElementById('go-hiscore').textContent = hiScore.toLocaleString();
    document.getElementById('go-level').textContent  = level;
    document.getElementById('go-lines').textContent  = linesTotal;
    showOverlay('gameover-screen');
  }, 800);
}

// ════════════════════════════════════════════════════════════
// §17  OVERLAY HELPERS
// ════════════════════════════════════════════════════════════

function showOverlay(id) {
  document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function hideAllOverlays() {
  document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active'));
}

function showLevelUp(lvl) {
  document.getElementById('levelup-num').textContent = lvl;
  showOverlay('levelup-screen');
  setTimeout(hideAllOverlays, 1200);
}

// ════════════════════════════════════════════════════════════
// §18  KEYBOARD INPUT
// ════════════════════════════════════════════════════════════

const keysDown = new Set();

document.addEventListener('keydown', (e) => {
  if (keysDown.has(e.code)) return; // handled by DAS
  keysDown.add(e.code);

  switch (e.code) {
    case 'ArrowLeft':
      e.preventDefault();
      moveLeft();
      startDAS('left');
      break;
    case 'ArrowRight':
      e.preventDefault();
      moveRight();
      startDAS('right');
      break;
    case 'ArrowDown':
      e.preventDefault();
      softDrop();
      break;
    case 'ArrowUp':
      e.preventDefault();
      rotatePiece(1);
      break;
    case 'KeyZ':
      rotatePiece(-1);
      break;
    case 'KeyX':
      rotatePiece(1);
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      doHold();
      break;
    case 'KeyP':
    case 'Escape':
      if (gameState === 'running') pauseGame();
      else if (gameState === 'paused') resumeGame();
      break;
  }
});

document.addEventListener('keyup', (e) => {
  keysDown.delete(e.code);
  if (e.code === 'ArrowLeft')  stopDAS('left');
  if (e.code === 'ArrowRight') stopDAS('right');
  if (e.code === 'ArrowDown')  {/* soft drop stops naturally */}
});

// ── DAS (Delayed Auto Shift) ─────────────────────────────────
function startDAS(dir) {
  stopDAS(dir);
  const fn = dir === 'left' ? moveLeft : moveRight;
  if (dir === 'left') {
    dasLeft = setTimeout(() => {
      dasLeft = setInterval(fn, DAS_INTERVAL);
    }, DAS_DELAY);
  } else {
    dasRight = setTimeout(() => {
      dasRight = setInterval(fn, DAS_INTERVAL);
    }, DAS_DELAY);
  }
}
function stopDAS(dir) {
  if (!dir || dir === 'left') {
    clearTimeout(dasLeft); clearInterval(dasLeft); dasLeft = null;
  }
  if (!dir || dir === 'right') {
    clearTimeout(dasRight); clearInterval(dasRight); dasRight = null;
  }
}

// ════════════════════════════════════════════════════════════
// §19  MOBILE TOUCH CONTROLS
// ════════════════════════════════════════════════════════════

function bindMobileBtn(id, fn, holdRepeat = false) {
  const el = document.getElementById(id);
  if (!el) return;

  let repeatTimer = null;
  let repeatInt   = null;

  const start = (e) => {
    e.preventDefault();
    fn();
    if (holdRepeat) {
      repeatTimer = setTimeout(() => {
        repeatInt = setInterval(fn, DAS_INTERVAL);
      }, DAS_DELAY);
    }
  };
  const end = () => {
    clearTimeout(repeatTimer);
    clearInterval(repeatInt);
  };

  el.addEventListener('touchstart', start, { passive: false });
  el.addEventListener('touchend',   end,   { passive: false });
  el.addEventListener('touchcancel',end,   { passive: false });
  // Mouse fallback for desktop testing
  el.addEventListener('mousedown', start);
  el.addEventListener('mouseup',   end);
}

bindMobileBtn('btn-left',      moveLeft,   true);
bindMobileBtn('btn-right',     moveRight,  true);
bindMobileBtn('btn-soft-drop', softDrop,   true);
bindMobileBtn('btn-rotate',    () => rotatePiece(1));
bindMobileBtn('btn-hard-drop', hardDrop);
bindMobileBtn('btn-hold',      doHold);

// ════════════════════════════════════════════════════════════
// §20  UI BUTTON BINDINGS
// ════════════════════════════════════════════════════════════

// Start screen
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('settings-btn-start').addEventListener('click', () => showOverlay('settings-screen'));

// Game over screen
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('menu-btn').addEventListener('click', () => {
  gameState = 'idle';
  showOverlay('start-screen');
});

// Pause screen
document.getElementById('resume-btn').addEventListener('click', resumeGame);
document.getElementById('restart-btn-pause').addEventListener('click', startGame);
document.getElementById('settings-btn-pause').addEventListener('click', () => showOverlay('settings-screen'));

// HUD buttons
document.getElementById('pause-btn').addEventListener('click', () => {
  if (gameState === 'running') pauseGame();
  else if (gameState === 'paused') resumeGame();
});
document.getElementById('restart-btn-hud').addEventListener('click', () => {
  if (gameState !== 'idle') startGame();
});
document.getElementById('settings-btn-hud').addEventListener('click', () => {
  if (gameState === 'running') pauseGame();
  showOverlay('settings-screen');
});

// Settings close
document.getElementById('settings-close-btn').addEventListener('click', () => {
  if (gameState === 'paused') showOverlay('pause-screen');
  else hideAllOverlays();
});

// Settings toggles
document.getElementById('toggle-sound').addEventListener('change', (e) => {
  settings.sound = e.target.checked; saveSettings();
});
document.getElementById('toggle-ghost').addEventListener('change', (e) => {
  settings.ghost = e.target.checked; saveSettings();
});
document.getElementById('toggle-anim').addEventListener('change', (e) => {
  settings.animation = e.target.checked; saveSettings();
});
document.getElementById('toggle-vib').addEventListener('change', (e) => {
  settings.vibration = e.target.checked; saveSettings();
});

// ════════════════════════════════════════════════════════════
// §21  VIBRATION HELPER
// ════════════════════════════════════════════════════════════

function vibrate(pattern) {
  if (!settings.vibration) return;
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}

// ════════════════════════════════════════════════════════════
// §22  SWIPE GESTURE DETECTION (mobile)
// ════════════════════════════════════════════════════════════

let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 20;

gameCanvas.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

gameCanvas.addEventListener('touchend', (e) => {
  if (!e.changedTouches.length) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
    // Tap = rotate
    rotatePiece(1);
    return;
  }
  if (Math.abs(dy) > Math.abs(dx)) {
    if (dy > SWIPE_THRESHOLD * 2) hardDrop();
    else if (dy > SWIPE_THRESHOLD) softDrop();
  } else {
    if (dx < -SWIPE_THRESHOLD) moveLeft();
    else if (dx > SWIPE_THRESHOLD) moveRight();
  }
}, { passive: true });

// ════════════════════════════════════════════════════════════
// §23  INIT
// ════════════════════════════════════════════════════════════

function init() {
  loadSettings();
  sizeBoard();
  hiScore = parseInt(localStorage.getItem('tetris_hi') || '0', 10);
  document.getElementById('hiscore').textContent = hiScore.toLocaleString();

  // Draw empty board
  renderAll();
  showOverlay('start-screen');
}

init();
