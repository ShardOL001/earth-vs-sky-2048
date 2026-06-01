// Earth 2048 — Nature's Growth
(function() {
'use strict';

const SIZE = 4;
const WIN_VALUE = 2048;

// Tile definitions with earth/nature theme
const TILE_DEFS = {
  2:    { icon: '🌰', label: 'Seed', class: 'tile-2' },
  4:    { icon: '🌱', label: 'Sprout', class: 'tile-4' },
  8:    { icon: '🌿', label: 'Plant', class: 'tile-8' },
  16:   { icon: '🌾', label: 'Shrub', class: 'tile-16' },
  32:   { icon: '🌲', label: 'Tree', class: 'tile-32' },
  64:   { icon: '🌳', label: 'Grove', class: 'tile-64' },
  128:  { icon: '🏕', label: 'Forest', class: 'tile-128' },
  256:  { icon: '🏔', label: 'Mountain', class: 'tile-256' },
  512:  { icon: '🌍', label: 'Biome', class: 'tile-512' },
  1024: { icon: '🌎', label: 'Ecosystem', class: 'tile-1024' },
  2048: { icon: '🌳', label: 'Gaia', class: 'tile-2048' },
};

function getTileDef(val) {
  return TILE_DEFS[val] || { icon: '✨', label: 'Beyond', class: 'tile-super' };
}

// Seasons based on total merges
const SEASONS = [
  { name: 'Spring', icon: '🌸', bgColors: ['#2d5016', '#1a3a0a', '#3d6b1f'] },
  { name: 'Summer', icon: '☀️', bgColors: ['#4a7c2e', '#2d5016', '#5a8c3e'] },
  { name: 'Autumn', icon: '🍂', bgColors: ['#8d6e63', '#5d4037', '#a1887f'] },
  { name: 'Winter', icon: '❄️', bgColors: ['#455a64', '#37474f', '#546e7a'] },
];

let grid, score, bestScore, gameOver, won, keepPlaying, mergeCount;
let tiles = []; // DOM tile elements
let rootLines = []; // SVG root lines
let particles = [];
let animFrame;

// DOM
const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best-score');
const gameOverOverlay = document.getElementById('game-over-overlay');
const winOverlay = document.getElementById('win-overlay');
const finalScoreEl = document.getElementById('final-score');
const seasonIcon = document.getElementById('season-icon');
const seasonName = document.getElementById('season-name');
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
const particlesCanvas = document.getElementById('particles-canvas');
const partCtx = particlesCanvas.getContext('2d');
const rootsSvg = document.getElementById('roots-svg');

// Init
function init() {
  bestScore = parseInt(localStorage.getItem('earth2048_best') || '0');
  bestEl.textContent = bestScore;
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  document.getElementById('new-game-btn').addEventListener('click', newGame);
  document.getElementById('restart-btn').addEventListener('click', newGame);
  document.getElementById('continue-btn').addEventListener('click', continueGame);
  document.getElementById('restart-btn-win').addEventListener('click', newGame);
  
  // Keyboard
  document.addEventListener('keydown', handleKey);
  
  // Touch
  let touchStartX, touchStartY;
  const wrapper = document.getElementById('board-wrapper');
  wrapper.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  wrapper.addEventListener('touchend', e => {
    if (!touchStartX || !touchStartY) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 30) return;
    if (absDx > absDy) {
      move(dx > 0 ? 'right' : 'left');
    } else {
      move(dy > 0 ? 'down' : 'up');
    }
    touchStartX = touchStartY = null;
  }, { passive: true });
  
  // Build grid cells
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      boardEl.appendChild(cell);
    }
  }
  
  // Background animation
  animateBg();
  
  newGame();
}

function resizeCanvas() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  particlesCanvas.width = window.innerWidth;
  particlesCanvas.height = window.innerHeight;
}

function newGame() {
  grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  score = 0;
  mergeCount = 0;
  gameOver = false;
  won = false;
  keepPlaying = false;
  rootLines = [];
  particles = [];
  
  gameOverOverlay.classList.add('hidden');
  winOverlay.classList.add('hidden');
  
  clearTiles();
  addRandomTile();
  addRandomTile();
  render();
  updateSeason();
}

function continueGame() {
  keepPlaying = true;
  winOverlay.classList.add('hidden');
}

function clearTiles() {
  // Remove tile DOM elements
  const existing = boardEl.querySelectorAll('.tile');
  existing.forEach(el => el.remove());
  tiles = [];
  rootsSvg.innerHTML = '';
}

// Grid logic
function addRandomTile() {
  const empty = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (grid[r][c] === 0) empty.push({ r, c });
  if (empty.length === 0) return;
  const { r, c } = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  
  // Create tile DOM
  createTileEl(r, c, grid[r][c], 'tile-new');
}

function createTileEl(r, c, value, extraClass) {
  const def = getTileDef(value);
  const cell = getCellEl(r, c);
  const tile = document.createElement('div');
  tile.className = `tile ${def.class}${extraClass ? ' ' + extraClass : ''}`;
  tile.innerHTML = `<span class="icon">${def.icon}</span><span class="value">${value}</span>`;
  tile.dataset.row = r;
  tile.dataset.col = c;
  tile.dataset.value = value;
  cell.appendChild(tile);
  tiles.push(tile);
  
  if (extraClass === 'tile-new') {
    setTimeout(() => tile.classList.remove('tile-new'), 300);
  }
  
  return tile;
}

function getCellEl(r, c) {
  return boardEl.children[r * SIZE + c];
}

function getCellCenter(r, c) {
  const cell = getCellEl(r, c);
  const rect = cell.getBoundingClientRect();
  const boardRect = boardEl.getBoundingClientRect();
  return {
    x: rect.left - boardRect.left + rect.width / 2,
    y: rect.top - boardRect.top + rect.height / 2
  };
}

function move(direction) {
  if (gameOver) return;
  
  const vectors = {
    up: { dr: -1, dc: 0 },
    down: { dr: 1, dc: 0 },
    left: { dr: 0, dc: -1 },
    right: { dr: 0, dc: 1 }
  };
  
  const { dr, dc } = vectors[direction];
  let moved = false;
  let mergedPositions = [];
  
  // Clear old tiles
  clearTiles();
  
  // Process move
  const merged = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  
  const traverse = buildTraverse(direction);
  
  for (const { r, c } of traverse) {
    if (grid[r][c] === 0) continue;
    
    let { nr, nc } = findFarthest(r, c, dr, dc);
    let nextR = nr + dr;
    let nextC = nc + dc;
    
    // Check merge
    if (nextR >= 0 && nextR < SIZE && nextC >= 0 && nextC < SIZE &&
        grid[nextR][nextC] === grid[r][c] && !merged[nextR][nextC]) {
      grid[nextR][nextC] *= 2;
      grid[r][c] = 0;
      merged[nextR][nextC] = true;
      score += grid[nextR][nextC];
      mergeCount++;
      moved = true;
      
      mergedPositions.push({ r: nextR, c: nextC, value: grid[nextR][nextC] });
      
      if (grid[nextR][nextC] === WIN_VALUE && !won) {
        won = true;
      }
    } else if (nr !== r || nc !== c) {
      grid[nr][nc] = grid[r][c];
      grid[r][c] = 0;
      moved = true;
    }
  }
  
  if (!moved) return;
  
  // Score animation
  if (mergedPositions.length > 0) {
    const totalMergeScore = mergedPositions.reduce((s, p) => s + p.value, 0);
    showScoreAdd(totalMergeScore);
  }
  
  // Add root lines for merges
  mergedPositions.forEach(({ r, c }) => {
    addRootLine(r, c);
    // Spawn particles
    spawnMergeParticles(r, c);
  });
  
  addRandomTile();
  render();
  updateSeason();
  
  // Update best
  if (score > bestScore) {
    bestScore = score;
    bestEl.textContent = bestScore;
    localStorage.setItem('earth2048_best', bestScore);
  }
  
  // Check game state
  if (won && !keepPlaying) {
    setTimeout(() => winOverlay.classList.remove('hidden'), 400);
  } else if (!canMove()) {
    gameOver = true;
    finalScoreEl.textContent = score;
    setTimeout(() => gameOverOverlay.classList.remove('hidden'), 600);
  }
}

function buildTraverse(direction) {
  const positions = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      positions.push({ r, c });
  
  if (direction === 'down') positions.sort((a, b) => b.r - a.r);
  if (direction === 'right') positions.sort((a, b) => b.c - a.c);
  return positions;
}

function findFarthest(r, c, dr, dc) {
  let nr = r, nc = c;
  while (true) {
    let nextR = nr + dr;
    let nextC = nc + dc;
    if (nextR < 0 || nextR >= SIZE || nextC < 0 || nextC >= SIZE) break;
    if (grid[nextR][nextC] !== 0) break;
    nr = nextR;
    nc = nextC;
  }
  return { nr, nc };
}

function canMove() {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return true;
      if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return true;
      if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return true;
    }
  return false;
}

function render() {
  scoreEl.textContent = score;
}

function showScoreAdd(amount) {
  const el = document.createElement('div');
  el.className = 'score-add';
  el.textContent = `+${amount}`;
  el.style.left = '50%';
  el.style.top = '10px';
  el.style.transform = 'translateX(-50%)';
  document.querySelector('.scores').appendChild(el);
  setTimeout(() => el.remove(), 800);
}

// Season system
function updateSeason() {
  const seasonIdx = Math.floor(mergeCount / 15) % 4;
  const season = SEASONS[seasonIdx];
  seasonIcon.textContent = season.icon;
  seasonName.textContent = season.name;
}

// Root lines for merge visualization
function addRootLine(r, c) {
  const center = getCellCenter(r, c);
  const boardRect = boardEl.getBoundingClientRect();
  const w = boardRect.width;
  const h = boardRect.height;
  
  // Create a random root path
  const startX = center.x + (Math.random() - 0.5) * 40;
  const startY = center.y + (Math.random() - 0.5) * 40;
  const cp1x = startX + (Math.random() - 0.5) * 60;
  const cp1y = startY + (Math.random() - 0.5) * 60;
  const cp2x = cp1x + (Math.random() - 0.5) * 80;
  const cp2y = cp1y + (Math.random() - 0.5) * 80;
  const endX = cp2x + (Math.random() - 0.5) * 60;
  const endY = cp2y + (Math.random() - 0.5) * 60;
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', `M${startX},${startY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${endX},${endY}`);
  path.setAttribute('stroke', '#5d4037');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('fill', 'none');
  path.setAttribute('opacity', '0.4');
  path.setAttribute('stroke-linecap', 'round');
  rootsSvg.appendChild(path);
  
  // Fade out over time
  let opacity = 0.4;
  const fade = () => {
    opacity -= 0.005;
    if (opacity <= 0) {
      path.remove();
      return;
    }
    path.setAttribute('opacity', opacity);
    requestAnimationFrame(fade);
  };
  setTimeout(fade, 500);
}

// Ambient particles (pollen/leaves floating around)
let ambientTimer = 0;
function spawnAmbientParticles() {
  ambientTimer++;
  if (ambientTimer % 30 === 0) { // Every ~0.5 seconds
    particles.push({
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + 10,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -Math.random() * 0.5 - 0.2,
      life: 1,
      decay: 0.003 + Math.random() * 0.005,
      size: 2 + Math.random() * 3,
      type: Math.random() < 0.7 ? 'pollen' : 'leaf'
    });
  }
}

// Particles
function spawnMergeParticles(r, c) {
  const center = getCellCenter(r, c);
  const boardRect = boardEl.getBoundingClientRect();
  const cx = boardRect.left + center.x;
  const cy = boardRect.top + center.y;
  
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: cx,
      y: cy,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 4 - 1,
      life: 1,
      decay: 0.01 + Math.random() * 0.02,
      size: 3 + Math.random() * 5,
      type: Math.random() < 0.5 ? 'leaf' : 'pollen'
    });
  }
}

function updateParticles() {
  spawnAmbientParticles();
  partCtx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
  
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05; // gravity
    p.life -= p.decay;
    
    if (p.life <= 0) return false;
    
    partCtx.globalAlpha = p.life;
    if (p.type === 'leaf') {
      partCtx.fillStyle = '#7cb342';
      partCtx.beginPath();
      partCtx.ellipse(p.x, p.y, p.size, p.size * 0.6, p.life * 3, 0, Math.PI * 2);
      partCtx.fill();
    } else {
      partCtx.fillStyle = '#f5f0e1';
      partCtx.beginPath();
      partCtx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      partCtx.fill();
    }
    
    return true;
  });
  
  partCtx.globalAlpha = 1;
  
  requestAnimationFrame(updateParticles);
}

// Background animation with seasonal colors
let bgTime = 0;
function animateBg() {
  bgTime += 0.005;
  const seasonIdx = Math.floor(mergeCount / 15) % 4;
  const colors = SEASONS[seasonIdx].bgColors;
  
  bgCtx.fillStyle = colors[0];
  bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
  
  // Animated gradient waves
  for (let i = 0; i < 3; i++) {
    bgCtx.globalAlpha = 0.15;
    bgCtx.fillStyle = colors[i + 1] || colors[0];
    bgCtx.beginPath();
    bgCtx.moveTo(0, bgCanvas.height);
    for (let x = 0; x <= bgCanvas.width; x += 20) {
      const y = bgCanvas.height * 0.6 + 
                Math.sin(x * 0.003 + bgTime + i * 2) * 80 +
                Math.sin(x * 0.007 + bgTime * 1.5 + i) * 40;
      bgCtx.lineTo(x, y);
    }
    bgCtx.lineTo(bgCanvas.width, bgCanvas.height);
    bgCtx.fill();
  }
  bgCtx.globalAlpha = 1;
  
  requestAnimationFrame(animateBg);
}

// Keyboard handler
function handleKey(e) {
  const keyMap = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right'
  };
  const dir = keyMap[e.key];
  if (dir) {
    e.preventDefault();
    move(dir);
  }
}

// Start
updateParticles();
init();
})();
