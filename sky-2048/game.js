// Sky 2048 — Ethereal Ascent
(function() {
'use strict';

const SIZE = 4;
const WIN_VALUE = 2048;

// Tile definitions with sky/air theme
const TILE_DEFS = {
  2:    { icon: '🌫️', label: 'Mist', class: 'tile-2' },
  4:    { icon: '☁️', label: 'Cloud', class: 'tile-4' },
  8:    { icon: '💨', label: 'Wind', class: 'tile-8' },
  16:   { icon: '🌬️', label: 'Gale', class: 'tile-16' },
  32:   { icon: '⛈️', label: 'Storm', class: 'tile-32' },
  64:   { icon: '⚡', label: 'Thunder', class: 'tile-64' },
  128:  { icon: '🌌', label: 'Cosmos', class: 'tile-128' },
  256:  { icon: '🔮', label: 'Nebula', class: 'tile-256' },
  512:  { icon: '✨', label: 'Galaxy', class: 'tile-512' },
  1024: { icon: '💫', label: 'Beyond', class: 'tile-1024' },
  2048: { icon: '🌟', label: 'Celestial', class: 'tile-2048' },
};

function getTileDef(val) {
  return TILE_DEFS[val] || { icon: '🌠', label: 'Infinite', class: 'tile-super' };
}

// Weather system based on score
const WEATHER_STATES = [
  { name: 'Clear Skies', icon: '🌤️', bgColors: ['#1a3a5c', '#0d2137', '#2d6aa0'] },
  { name: 'Partly Cloudy', icon: '⛅', bgColors: ['#2d4a6e', '#1a3050', '#3a7ab8'] },
  { name: 'Overcast', icon: '☁️', bgColors: ['#3a4a5c', '#2a3a4c', '#4a5a6c'] },
  { name: 'Thunderstorm', icon: '⛈️', bgColors: ['#1a1a2e', '#0f0f1e', '#2a2a4e'] },
  { name: 'Aurora', icon: '🌌', bgColors: ['#0a1a2e', '#0a2a1e', '#1a0a3e'] },
  { name: 'Cosmic Dawn', icon: '🌅', bgColors: ['#2a1a3e', '#1a0a2e', '#3a1a2e'] },
];

let grid, score, bestScore, gameOver, won, keepPlaying, mergeCount;
let tiles = [];
let clouds = [];
let stars = [];
let animFrame;

// DOM
const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best-score');
const gameOverOverlay = document.getElementById('game-over-overlay');
const winOverlay = document.getElementById('win-overlay');
const finalScoreEl = document.getElementById('final-score');
const weatherIcon = document.getElementById('weather-icon');
const weatherName = document.getElementById('weather-name');
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
const starsCanvas = document.getElementById('stars-canvas');
const starsCtx = starsCanvas.getContext('2d');
const cloudCanvas = document.getElementById('cloud-canvas');
const cloudCtx = cloudCanvas.getContext('2d');

// Init
function init() {
  bestScore = parseInt(localStorage.getItem('sky2048_best') || '0');
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
  
  // Initialize stars
  initStars();
  
  // Start animations
  animateBg();
  animateStars();
  animateClouds();
  
  newGame();
}

function resizeCanvas() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  starsCanvas.width = window.innerWidth;
  starsCanvas.height = window.innerHeight;
  cloudCanvas.width = document.getElementById('board-wrapper').offsetWidth;
  cloudCanvas.height = document.getElementById('board-wrapper').offsetHeight;
}

function initStars() {
  stars = [];
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 2 + 0.5,
      brightness: Math.random(),
      twinkleSpeed: Math.random() * 0.02 + 0.01,
      twinklePhase: Math.random() * Math.PI * 2
    });
  }
}

function newGame() {
  grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  score = 0;
  mergeCount = 0;
  gameOver = false;
  won = false;
  keepPlaying = false;
  clouds = [];
  
  gameOverOverlay.classList.add('hidden');
  winOverlay.classList.add('hidden');
  
  clearTiles();
  addRandomTile();
  addRandomTile();
  render();
  updateWeather();
}

function continueGame() {
  keepPlaying = true;
  winOverlay.classList.add('hidden');
}

function clearTiles() {
  const existing = boardEl.querySelectorAll('.tile');
  existing.forEach(el => el.remove());
  tiles = [];
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
  
  clearTiles();
  
  const merged = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const traverse = buildTraverse(direction);
  
  for (const { r, c } of traverse) {
    if (grid[r][c] === 0) continue;
    
    let { nr, nc } = findFarthest(r, c, dr, dc);
    let nextR = nr + dr;
    let nextC = nc + dc;
    
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
  
  if (mergedPositions.length > 0) {
    const totalMergeScore = mergedPositions.reduce((s, p) => s + p.value, 0);
    showScoreAdd(totalMergeScore);
  }
  
  // Spawn cloud puffs for merges
  mergedPositions.forEach(({ r, c }) => {
    spawnCloudPuff(r, c);
  });
  
  addRandomTile();
  render();
  updateWeather();
  
  if (score > bestScore) {
    bestScore = score;
    bestEl.textContent = bestScore;
    localStorage.setItem('sky2048_best', bestScore);
  }
  
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

// Weather system
function updateWeather() {
  let weatherIdx;
  if (score < 200) weatherIdx = 0;
  else if (score < 500) weatherIdx = 1;
  else if (score < 1000) weatherIdx = 2;
  else if (score < 2000) weatherIdx = 3;
  else if (score < 5000) weatherIdx = 4;
  else weatherIdx = 5;
  
  const weather = WEATHER_STATES[weatherIdx];
  weatherIcon.textContent = weather.icon;
  weatherName.textContent = weather.name;
}

// Cloud puffs on merge
function spawnCloudPuff(r, c) {
  const center = getCellCenter(r, c);
  const boardRect = boardEl.getBoundingClientRect();
  const cx = center.x;
  const cy = center.y;
  
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: cx + (Math.random() - 0.5) * 20,
      y: cy + (Math.random() - 0.5) * 20,
      size: 15 + Math.random() * 25,
      opacity: 0.6,
      vx: (Math.random() - 0.5) * 2,
      vy: -Math.random() * 2 - 0.5,
      decay: 0.008 + Math.random() * 0.012
    });
  }
}

function animateClouds() {
  cloudCtx.clearRect(0, 0, cloudCanvas.width, cloudCanvas.height);
  
  clouds = clouds.filter(c => {
    c.x += c.vx;
    c.y += c.vy;
    c.opacity -= c.decay;
    
    if (c.opacity <= 0) return false;
    
    cloudCtx.globalAlpha = c.opacity;
    cloudCtx.fillStyle = '#e8f0f8';
    cloudCtx.beginPath();
    cloudCtx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
    cloudCtx.fill();
    
    // Secondary cloud puff
    cloudCtx.beginPath();
    cloudCtx.arc(c.x + c.size * 0.5, c.y - c.size * 0.3, c.size * 0.7, 0, Math.PI * 2);
    cloudCtx.fill();
    
    cloudCtx.beginPath();
    cloudCtx.arc(c.x - c.size * 0.4, c.y + c.size * 0.2, c.size * 0.6, 0, Math.PI * 2);
    cloudCtx.fill();
    
    return true;
  });
  
  cloudCtx.globalAlpha = 1;
  requestAnimationFrame(animateClouds);
}

// Stars animation
let starTime = 0;
function animateStars() {
  starTime += 0.016;
  starsCtx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
  
  // Only show stars based on highest tile value
  let maxTile = 0;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (grid[r][c] > maxTile) maxTile = grid[r][c];
  
  const starVisibility = Math.min(1, Math.max(0, (maxTile - 64) / 512));
  
  if (starVisibility > 0) {
    stars.forEach(star => {
      const twinkle = Math.sin(starTime * star.twinkleSpeed * 60 + star.twinklePhase) * 0.3 + 0.7;
      starsCtx.globalAlpha = starVisibility * star.brightness * twinkle;
      starsCtx.fillStyle = '#fff';
      starsCtx.beginPath();
      starsCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      starsCtx.fill();
      
      // Star glow for brighter stars
      if (star.brightness > 0.7) {
        starsCtx.globalAlpha = starVisibility * star.brightness * twinkle * 0.3;
        starsCtx.fillStyle = '#a0d4ff';
        starsCtx.beginPath();
        starsCtx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
        starsCtx.fill();
      }
    });
  }
  
  starsCtx.globalAlpha = 1;
  requestAnimationFrame(animateStars);
}

// Background animation with weather colors
let bgTime = 0;
function animateBg() {
  bgTime += 0.003;
  
  let weatherIdx;
  if (score < 200) weatherIdx = 0;
  else if (score < 500) weatherIdx = 1;
  else if (score < 1000) weatherIdx = 2;
  else if (score < 2000) weatherIdx = 3;
  else if (score < 5000) weatherIdx = 4;
  else weatherIdx = 5;
  
  const colors = WEATHER_STATES[weatherIdx].bgColors;
  
  // Sky gradient
  const gradient = bgCtx.createLinearGradient(0, 0, 0, bgCanvas.height);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.5, colors[1]);
  gradient.addColorStop(1, colors[2]);
  bgCtx.fillStyle = gradient;
  bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
  
  // Floating aurora/nebula effect
  for (let i = 0; i < 3; i++) {
    bgCtx.globalAlpha = 0.08 + Math.sin(bgTime + i) * 0.03;
    bgCtx.fillStyle = i === 0 ? '#4a1a6a' : i === 1 ? '#1a4a6a' : '#6a1a4a';
    bgCtx.beginPath();
    bgCtx.moveTo(0, bgCanvas.height * 0.3);
    for (let x = 0; x <= bgCanvas.width; x += 30) {
      const y = bgCanvas.height * 0.3 + 
                Math.sin(x * 0.002 + bgTime + i * 2) * 100 +
                Math.sin(x * 0.005 + bgTime * 1.5 + i) * 50;
      bgCtx.lineTo(x, y);
    }
    bgCtx.lineTo(bgCanvas.width, bgCanvas.height);
    bgCtx.lineTo(0, bgCanvas.height);
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
init();
})();
