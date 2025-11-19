// ====================================
// PACMAN TEMPLATE - MAIN GAME LOGIC
// ====================================

// ====================================
// GAME STATE
// ====================================

let canvas, ctx;
let editorCanvas, editorCtx;
let currentLevel = 1;
let currentMap = [];
let mapIndex = 0;
let score = 0;
let fragmentsCollected = 0;
let gameState = 'playing'; // 'playing', 'gameOver', 'levelComplete'
let isGameOver = false;

// Player
let player = {
  x: 0,
  y: 0,
  direction: 'right', // 'up', 'down', 'left', 'right'
  nextDirection: 'right',
  speed: CONFIG.PLAYER_SPEED,
  size: CONFIG.PLAYER_SIZE,
  animationFrame: 0, // For mouth animation
  lastDirection: 'right'
};

// Fragments
let fragments = [];
let exitGate = null;
let gateBlinkTimer = 0;

// Ghosts
let ghosts = [];
let ghostCount = 1;

// Ghost AI state
let ghostSpeedMultiplier = 0.25;          // starts at 25% of Pacman speed
let firstFragmentEaten = false;           // track first fragment event
let ghostFreezeTimer = 0;                 // ms remaining for global ghost freeze
let ghostGlowTimer = 0;                   // ms remaining for glow effect
let ghostGlowState = 'none';              // 'none' | 'yellow' | 'red'
let ghostPendingBoost = 0;                // boost applied after freeze completes

const DIRECTION_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};
const GHOST_MAX_SPEED_MULTIPLIER = 2.5;
const GHOST_REPEL_DISTANCE = 24;
const GHOST_REPEL_FORCE = 6;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'memeplay-project';
}

function buildPublicLinkUrl() {
  const titleInput = document.getElementById('titleInput');
  const rawTitle = titleInput ? titleInput.value.trim() : '';
  const slug = slugify(rawTitle || 'memeplay-project');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const baseUrl = window.location.origin.replace(/\/$/, '');
  return `${baseUrl}/${slug}-${randomSuffix}`;
}

function isWalkableTileValue(value) {
  return value === 0;
}

function isMobileViewport() {
  return window.innerWidth <= 992;
}

// Input
let keys = {};
let mobileDirection = null;
let mobileDirectionSource = null; // 'button' or 'swipe'
let mobileSwipeTimeoutId = null;
let mobileGameUnlocked = false;

function setMobileDirection(dir, source = 'button') {
  if (!dir) return;
  mobileDirection = dir;
  mobileDirectionSource = source;
  if (source === 'swipe') {
    if (mobileSwipeTimeoutId) {
      clearTimeout(mobileSwipeTimeoutId);
    }
    mobileSwipeTimeoutId = setTimeout(() => {
      if (mobileDirectionSource === 'swipe') {
        mobileDirection = null;
        mobileDirectionSource = null;
      }
      mobileSwipeTimeoutId = null;
    }, 200);
  }
}

function clearMobileDirection(source = 'button') {
  if (source === 'button') {
    if (mobileDirectionSource === 'button') {
      mobileDirection = null;
      mobileDirectionSource = null;
    }
    return;
  }
  if (source === 'swipe' && mobileDirectionSource === 'swipe') {
    mobileDirection = null;
    mobileDirectionSource = null;
    if (mobileSwipeTimeoutId) {
      clearTimeout(mobileSwipeTimeoutId);
    }
    mobileSwipeTimeoutId = null;
  }
}

// Animation
let lastTime = 0;
let animationFrame = 0;

// Audio
let audioCtx = null;
let audioUnlocked = false;
let audioUnlockHandlersBound = false;

const SOUND_PRESETS = {
  fragmentPickup: {
    sequence: [
      { freq: 1250, duration: 0.08, gain: 0.28, type: 'triangle' },
      { freq: 1500, duration: 0.06, gain: 0.22, offset: 0.05, type: 'sine' }
    ]
  },
  ghostFreeze: {
    sequence: [
      { freq: 520, duration: 0.1, gain: 0.25, type: 'sawtooth' },
      { freq: 840, duration: 0.1, gain: 0.18, offset: 0.08, type: 'triangle' }
    ]
  },
  playerHit: {
    sequence: [
      { freq: 220, duration: 0.18, gain: 0.35, type: 'sawtooth' },
      { freq: 110, duration: 0.2, gain: 0.25, offset: 0.14, type: 'square' }
    ]
  },
  portalOpen: {
    sequence: [
      { freq: 500, duration: 0.12, gain: 0.2, type: 'triangle' },
      { freq: 820, duration: 0.12, gain: 0.18, offset: 0.08, type: 'sine' }
    ]
  },
  levelComplete: {
    sequence: [
      { freq: 900, duration: 0.16, gain: 0.25, type: 'triangle' },
      { freq: 1200, duration: 0.2, gain: 0.22, offset: 0.1, type: 'sine' }
    ]
  },
  storyChime: {
    sequence: [
      { freq: 660, duration: 0.28, gain: 0.2, type: 'triangle' },
      { freq: 880, duration: 0.32, gain: 0.18, offset: 0.18, type: 'sine' }
    ]
  }
};

function ensureAudioContext() {
  if (audioCtx) {
    return audioCtx;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    console.warn('Web Audio API is not supported in this browser.');
    return null;
  }
  audioCtx = new AudioContextClass();
  audioUnlocked = audioCtx.state !== 'suspended';
  return audioCtx;
}

function setupAudioUnlock() {
  const ctx = ensureAudioContext();
  if (!ctx || audioUnlocked || audioUnlockHandlersBound) return;

  audioUnlockHandlersBound = true;
  const unlock = () => {
    ctx.resume().then(() => {
      audioUnlocked = true;
      ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
        document.removeEventListener(evt, unlock, true);
      });
    }).catch(() => {});
  };

  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
    document.addEventListener(evt, unlock, true);
  });
}

function playSound(name) {
  const preset = SOUND_PRESETS[name];
  const ctx = ensureAudioContext();
  if (!preset || !ctx) return;

  if (ctx.state === 'suspended' && !audioUnlocked) {
    return;
  }

  const startTime = ctx.currentTime;
  preset.sequence.forEach(step => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const offset = step.offset || 0;
    const duration = step.duration || 0.1;
    const freq = step.freq || 440;
    const gainValue = step.gain ?? 0.2;
    osc.type = step.type || 'sine';
    osc.frequency.setValueAtTime(freq, startTime + offset);
    gainNode.gain.setValueAtTime(gainValue, startTime + offset);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + offset + duration);
    osc.connect(gainNode).connect(ctx.destination);
    osc.start(startTime + offset);
    osc.stop(startTime + offset + duration + 0.05);
  });
}

function scrollToCreatorScreen() {
  const creator = document.getElementById('creatorScreen');
  if (creator) {
    creator.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Map offset (for centering map on canvas)
let mapOffsetX = 0;
let mapOffsetY = 0;

// ====================================
// INITIALIZATION
// ====================================

function initGame() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  
  // Set canvas to exact native resolution (700x730px - game area only)
  // NO SCALING - render at true pixel resolution
  canvas.width = 700;
  canvas.height = 730;
  
  // CRITICAL: Disable CSS scaling - canvas must render at native size
  canvas.style.width = '700px';
  canvas.style.height = '730px';
  
  // Enable high-quality image rendering for non-pixel art elements (like logo)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Initialize editor canvas preview (desktop)
  const editorCanvasEl = document.getElementById('gameCanvasEditor');
  if (editorCanvasEl) {
    editorCanvas = editorCanvasEl;
    editorCtx = editorCanvas.getContext('2d');
    editorCanvas.width = CONFIG.CANVAS_WIDTH;
    editorCanvas.height = CONFIG.CANVAS_HEIGHT;
    editorCanvas.style.width = CONFIG.CANVAS_WIDTH + 'px';
    editorCanvas.style.height = CONFIG.CANVAS_HEIGHT + 'px';
    editorCtx.imageSmoothingEnabled = true;
    editorCtx.imageSmoothingQuality = 'high';
  }
  
  // Calculate map offset (center map in game area: 700x730)
  // Calculate map dimensions dynamically from currentMap
  if (currentMap && currentMap.length > 0) {
    const mapCols = currentMap[0] ? currentMap[0].length : CONFIG.MAP_COLS;
    const mapRows = currentMap.length;
    const mapWidth = mapCols * CONFIG.TILE_SIZE;
    const mapHeight = mapRows * CONFIG.TILE_SIZE;
    mapOffsetX = (CONFIG.CANVAS_WIDTH - mapWidth) / 2; // Center horizontally in 700px
    mapOffsetY = (CONFIG.CANVAS_HEIGHT - mapHeight) / 2; // Center vertically in 730px
  }
  
  // Load brand config
  loadBrandConfig();
  
  // Initialize first level
  initLevel(1);
  
  // Setup controls
  setupControls();
  
  // Setup mobile controls
  setupMobileControls();

  // Prepare Web Audio unlock for mobile
  setupAudioUnlock();
  
  // Start game loop
  gameLoop();
  
  // MemePlay integration
  setupMemePlayIntegration();
}

function initLevel(level) {
  currentLevel = level;
  mapIndex = 0;
  const baseMap = MAPS[0] || [];
  currentMap = baseMap.map(row => [...row]);
  
  // Update map select dropdown if it exists
  const mapSelect = document.getElementById('mapSelect');
  if (mapSelect) {
    mapSelect.value = level.toString();
  }
  
  // Calculate ghost count (Level 1 = 3 ghosts, then +1 per level)
  ghostCount = Math.min(CONFIG.MIN_GHOSTS + Math.max(0, level - 1), CONFIG.MAX_GHOSTS);
  
  // Reset fragments
  fragmentsCollected = 0;
  fragments = [];
  exitGate = null;
  gateBlinkTimer = 0;
  
  // Reset ghost AI state
  ghostSpeedMultiplier = 0.25; // Start at 25% of Pacman speed
  firstFragmentEaten = false;
  ghostFreezeTimer = 0;
  ghostGlowTimer = 0;
  ghostGlowState = 'none';
  ghostPendingBoost = 0;
  firstFragmentEaten = false;
  ghostFreezeTimer = 0;
  ghostGlowTimer = 0;
  ghostGlowState = 'none';
  ghostPendingBoost = 0;
  
  // Find player spawn (first path tile)
  const spawnPos = findFirstPathTile();
  player.x = mapOffsetX + spawnPos.col * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
  player.y = mapOffsetY + spawnPos.row * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
  player.direction = 'right';
  player.nextDirection = 'right';
  
  // Player position is already set correctly, no need to snap
  // Just ensure it's within valid bounds
  
  // Spawn fragments
  spawnFragments();
  
  // Spawn ghosts
  spawnGhosts();
  
  // Update HUD
  updateHUD();
}

function findFirstPathTile() {
  // Find leftmost path tile (top-left corner)
  let leftmostCol = Infinity;
  let leftmostRow = 1;
  
  for (let row = 0; row < currentMap.length; row++) {
    for (let col = 0; col < currentMap[row].length; col++) {
      if (currentMap[row][col] === 0 && col < leftmostCol) {
        leftmostCol = col;
        leftmostRow = row;
      }
    }
  }
  
  return { row: leftmostRow, col: leftmostCol };
}

// ====================================
// FRAGMENT SYSTEM
// ====================================

function spawnFragments() {
  fragments = [];
  const pathTiles = getPathTiles(currentMap);
  
  // Shuffle and take 5 random path tiles
  const shuffled = pathTiles.sort(() => Math.random() - 0.5);
  const selectedTiles = shuffled.slice(0, CONFIG.FRAGMENTS_PER_LEVEL);
  
  selectedTiles.forEach((tile, index) => {
    fragments.push({
      row: tile[0],
      col: tile[1],
      x: mapOffsetX + tile[1] * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
      y: mapOffsetY + tile[0] * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
      label: CONFIG.FRAGMENT_LABELS[index],
      color: CONFIG.FRAGMENT_COLORS[index],
      collected: false
    });
  });
}

function checkFragmentCollection() {
  const playerTileCol = Math.floor((player.x - mapOffsetX) / CONFIG.TILE_SIZE);
  const playerTileRow = Math.floor((player.y - mapOffsetY) / CONFIG.TILE_SIZE);
  
  fragments.forEach(fragment => {
    if (!fragment.collected) {
      const fragmentTileCol = fragment.col;
      const fragmentTileRow = fragment.row;
      
      if (playerTileRow === fragmentTileRow && playerTileCol === fragmentTileCol) {
        fragment.collected = true;
        fragmentsCollected++;
        score += 100;
        playSound('fragmentPickup');
        updateHUD();
        
        // Ghost speed scaling (new system)
        if (!firstFragmentEaten) {
          handleFirstFragmentBoost();
        } else {
          applyGhostSpeedScaling(0.20);
          if (fragmentsCollected === 3) {
            ghostGlowState = 'red';
            ghostGlowTimer = Number.POSITIVE_INFINITY;
          }
        }
        
        // Check if all fragments collected
        if (fragmentsCollected >= CONFIG.FRAGMENTS_PER_LEVEL) {
          spawnExitGate();
        }
      }
    }
  });
}

function spawnExitGate() {
  const gatePositions = getGatePositions(mapIndex);
  const randomGate = gatePositions[Math.floor(Math.random() * gatePositions.length)];
  
  exitGate = {
    row: randomGate[0],
    col: randomGate[1],
    x: mapOffsetX + randomGate[1] * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
    y: mapOffsetY + randomGate[0] * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
    visible: true
  };
  playSound('portalOpen');
}

function checkExitGate() {
  if (!exitGate) return;
  
  const playerTileCol = Math.floor((player.x - mapOffsetX) / CONFIG.TILE_SIZE);
  const playerTileRow = Math.floor((player.y - mapOffsetY) / CONFIG.TILE_SIZE);
  
  if (playerTileRow === exitGate.row && playerTileCol === exitGate.col) {
    // Level complete!
    playSound('levelComplete');
    currentLevel++;
    initLevel(currentLevel);
  }
}

// ====================================
// GHOST SYSTEM
// ====================================

function spawnGhosts() {
  ghosts = [];
  const pathTiles = getPathTiles(currentMap);
  
  // Spawn ghosts at rightmost tiles (top-right corner)
  const playerTile = {
    row: Math.floor((player.y - mapOffsetY) / CONFIG.TILE_SIZE),
    col: Math.floor((player.x - mapOffsetX) / CONFIG.TILE_SIZE)
  };
  
  // Find rightmost path tiles (avoid player spawn)
  const availableTiles = pathTiles.filter(tile => 
    !(tile[0] === playerTile.row && tile[1] === playerTile.col)
  );
  
  // Sort by column (descending) to get rightmost tiles
  const sortedByCol = availableTiles.sort((a, b) => b[1] - a[1]);
  
  // Get rightmost tiles, prefer middle rows for better spawn
  const rightmostCol = sortedByCol[0][1];
  const rightmostTiles = sortedByCol.filter(tile => tile[1] === rightmostCol);
  
  // Sort rightmost tiles by row (prefer middle rows)
  rightmostTiles.sort((a, b) => {
    const midRow = currentMap.length / 2;
    return Math.abs(a[0] - midRow) - Math.abs(b[0] - midRow);
  });
  
  // Take up to ghostCount tiles from rightmost area
  const spawnTiles = rightmostTiles.slice(0, ghostCount);
  
  // If not enough rightmost tiles, add more from nearby columns
  if (spawnTiles.length < ghostCount) {
    const nearbyTiles = sortedByCol.filter(tile => 
      tile[1] >= rightmostCol - 2 && !spawnTiles.some(st => st[0] === tile[0] && st[1] === tile[1])
    );
    spawnTiles.push(...nearbyTiles.slice(0, ghostCount - spawnTiles.length));
  }
  
  spawnTiles.forEach((tile, index) => {
    // Classic ghost colors: Red, Pink, Cyan, Orange
    const ghostColors = [
      { body: '#FF0000', eyes: '#FFFFFF' }, // Red
      { body: '#FFB8FF', eyes: '#FFFFFF' }, // Pink
      { body: '#00FFFF', eyes: '#FFFFFF' }, // Cyan
      { body: '#FFB851', eyes: '#FFFFFF' }, // Orange
      { body: '#FF00FF', eyes: '#FFFFFF' }, // Magenta
      { body: '#00FF00', eyes: '#FFFFFF' }, // Green
      { body: '#FFFF00', eyes: '#FFFFFF' }, // Yellow
      { body: '#0000FF', eyes: '#FFFFFF' }  // Blue
    ];
    
    // Find valid directions from spawn tile
    const validDirections = [];
    const directions = ['up', 'down', 'left', 'right'];
    const row = tile[0];
    const col = tile[1];
    
    directions.forEach(dir => {
      let checkRow = row;
      let checkCol = col;
      
      switch(dir) {
        case 'up': checkRow--; break;
        case 'down': checkRow++; break;
        case 'left': checkCol--; break;
        case 'right': checkCol++; break;
      }
      
      // Check if next tile is valid path
      if (checkRow >= 0 && checkRow < currentMap.length &&
          checkCol >= 0 && checkCol < currentMap[0].length &&
          isWalkableTileValue(currentMap[checkRow][checkCol])) {
        validDirections.push(dir);
      }
    });
    
    // Choose a valid direction (or default to first available)
    // If no valid direction, find any direction that can be moved to
    let spawnDirection = validDirections.length > 0 
      ? validDirections[Math.floor(Math.random() * validDirections.length)]
      : null;
    
    // If still none, try to find direction from nearby tiles
    if (!spawnDirection) {
      for (let dir of directions) {
        let testRow = row;
        let testCol = col;
        switch(dir) {
          case 'up': testRow--; break;
          case 'down': testRow++; break;
          case 'left': testCol--; break;
          case 'right': testCol++; break;
        }
        if (testRow >= 0 && testRow < currentMap.length &&
            testCol >= 0 && testCol < currentMap[0].length &&
            isWalkableTileValue(currentMap[testRow][testCol])) {
          spawnDirection = dir;
          break;
        }
      }
    }
    
    // Fallback: default to right if still none
    if (!spawnDirection) spawnDirection = 'right';
    
    const colorIndex = index % ghostColors.length;
    const ghostX = mapOffsetX + tile[1] * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    const ghostY = mapOffsetY + tile[0] * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    const snappedX = Math.round(ghostX);
    const snappedY = Math.round(ghostY);
    ghosts.push({
      x: snappedX,
      y: snappedY,
      direction: spawnDirection,
      size: CONFIG.GHOST_SIZE,
      color: ghostColors[colorIndex].body,
      eyeColor: ghostColors[colorIndex].eyes,
      animationFrame: 0,
      stuckTime: 0,
      blockedTime: 0,
      lastX: snappedX,
      lastY: snappedY,
      randomInterval: randomFloat(0.5, 1.2) * 1000,
      timeSinceLastRandom: 0,
      isChasing: false
    });
  });
  
}

// ====================================
// GHOST AI - MAIN UPDATE FUNCTION
// ====================================

function updateGhost(ghost, deltaTime) {
  if (ghostGlowTimer > 0) {
    ghostGlowTimer = Math.max(0, ghostGlowTimer - deltaTime);
  }
  
  if (ghostFreezeTimer > 0) {
    ghostFreezeTimer -= deltaTime;
    if (ghostFreezeTimer <= 0) {
      ghostFreezeTimer = 0;
      if (ghostPendingBoost > 0) {
        applyGhostSpeedScaling(ghostPendingBoost);
        ghostPendingBoost = 0;
      }
    } else {
      return;
    }
  }
  
  if (!ghost.randomInterval) {
    ghost.randomInterval = randomFloat(0.5, 1.2) * 1000;
  }
  ghost.timeSinceLastRandom = (ghost.timeSinceLastRandom || 0) + deltaTime;
  
  const individualMultiplier = Math.min(Math.max(ghostSpeedMultiplier, 0.05), GHOST_MAX_SPEED_MULTIPLIER);
  const effectiveSpeed = player.speed * individualMultiplier;
  const normalizedDelta = Math.min(deltaTime / 16, 2);
  const moveDistance = effectiveSpeed * normalizedDelta;
  
  if (ghost.timeSinceLastRandom >= ghost.randomInterval) {
    ghost.isChasing = Math.random() < 0.3;
    ghost.randomInterval = randomFloat(0.5, 1.2) * 1000;
    ghost.timeSinceLastRandom = 0;
    const newDir = ghost.isChasing
      ? getChaseDirection(ghost)
      : getRandomValidDirectionForGhost(ghost);
    if (newDir) {
      ghost.direction = newDir;
    }
  }
  
  if (ghost.isChasing) {
    const chaseDir = getChaseDirection(ghost);
    if (chaseDir) {
      ghost.direction = chaseDir;
    }
  }
  
  const vector = DIRECTION_VECTORS[ghost.direction] || { x: 0, y: 0 };
  const canAdvance = canGhostMove(ghost, ghost.direction, moveDistance);
  
  if (canAdvance) {
    ghost.x += vector.x * moveDistance;
    ghost.y += vector.y * moveDistance;
    ghost.blockedTime = 0;
  } else {
    ghost.blockedTime = (ghost.blockedTime || 0) + deltaTime;
    if (ghost.blockedTime >= 200) {
      const alternate = ghost.isChasing
        ? getChaseDirection(ghost)
        : getRandomValidDirectionForGhost(ghost);
      if (alternate) {
        ghost.direction = alternate;
      }
      ghost.blockedTime = 0;
    }
  }
  
  clampGhostToBounds(ghost);
  
  const movedDistance = Math.hypot(ghost.x - ghost.lastX, ghost.y - ghost.lastY);
  if (movedDistance < 0.5) {
    ghost.stuckTime += deltaTime;
  } else {
    ghost.stuckTime = 0;
  }
  
  if (ghost.stuckTime >= 500) {
    const recoveryDir = ghost.isChasing
      ? getChaseDirection(ghost)
      : getRandomValidDirectionForGhost(ghost);
    if (recoveryDir) {
      ghost.direction = recoveryDir;
    }
    ghost.stuckTime = 0;
  }
  
  ghost.lastX = ghost.x;
  ghost.lastY = ghost.y;
}

function updateGhosts(deltaTime) {
  ghosts.forEach(ghost => {
    updateGhost(ghost, deltaTime);
  });
  resolveGhostCollisions();
}

// ====================================
// GHOST MOVEMENT FUNCTIONS
// ====================================

// ====================================
// GHOST MOVEMENT HELPERS (NEW SYSTEM)
// ====================================

function canGhostMove(ghost, direction, distance = CONFIG.TILE_SIZE / 2) {
  if (!currentMap || currentMap.length === 0) return false;
  const vector = DIRECTION_VECTORS[direction];
  if (!vector) return false;
  
  const nextX = ghost.x + vector.x * distance;
  const nextY = ghost.y + vector.y * distance;
  const tileCol = Math.floor((nextX - mapOffsetX) / CONFIG.TILE_SIZE);
  const tileRow = Math.floor((nextY - mapOffsetY) / CONFIG.TILE_SIZE);
  
  if (tileRow < 0 || tileRow >= currentMap.length ||
      tileCol < 0 || tileCol >= currentMap[0].length) {
    return false;
  }
  
  return isWalkableTileValue(currentMap[tileRow][tileCol]);
}

// Helper function to get opposite direction
function getOppositeDirection(dir) {
  const opposites = {
    'up': 'down',
    'down': 'up',
    'left': 'right',
    'right': 'left'
  };
  return opposites[dir] || dir;
}

// ====================================
// GHOST AI HELPER FUNCTIONS
// ====================================

function getChaseDirection(ghost) {
  const dx = player.x - ghost.x;
  const dy = player.y - ghost.y;
  const horizontalPriority = Math.abs(dx) >= Math.abs(dy);
  const primary = horizontalPriority
    ? (dx >= 0 ? 'right' : 'left')
    : (dy >= 0 ? 'down' : 'up');
  const secondary = horizontalPriority
    ? (dy >= 0 ? 'down' : 'up')
    : (dx >= 0 ? 'right' : 'left');
  
  if (canGhostMove(ghost, primary)) return primary;
  if (canGhostMove(ghost, secondary)) return secondary;
  return getRandomValidDirectionForGhost(ghost);
}

function getRandomValidDirectionForGhost(ghost, preferredDirection = null) {
  const directions = ["up", "down", "left", "right"];
  const validDirections = directions.filter(dir => canGhostMove(ghost, dir));
  
  if (preferredDirection && canGhostMove(ghost, preferredDirection)) {
    return preferredDirection;
  }
  
  if (!validDirections.length) {
    return null;
  }
  
  const opposite = getOppositeDirection(ghost.direction);
  const filtered = validDirections.filter(dir => dir !== opposite);
  const choices = filtered.length ? filtered : validDirections;
  return choices[Math.floor(Math.random() * choices.length)];
}

function resolveGhostCollisions() {
  for (let i = 0; i < ghosts.length; i++) {
    for (let j = i + 1; j < ghosts.length; j++) {
      const ghostA = ghosts[i];
      const ghostB = ghosts[j];
      const dx = ghostB.x - ghostA.x;
      const dy = ghostB.y - ghostA.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0 && distance < GHOST_REPEL_DISTANCE) {
        applyRepelForce(ghostA, ghostB, dx, dy, distance);
      }
    }
  }
}

function applyRepelForce(ghostA, ghostB, dx, dy, distance) {
  const overlap = (GHOST_REPEL_DISTANCE - distance) / 2;
  const nx = dx / distance;
  const ny = dy / distance;
  ghostA.x -= nx * overlap;
  ghostA.y -= ny * overlap;
  ghostB.x += nx * overlap;
  ghostB.y += ny * overlap;
  clampGhostToBounds(ghostA);
  clampGhostToBounds(ghostB);
}

function clampGhostToBounds(ghost) {
  const mapCols = currentMap[0] ? currentMap[0].length : CONFIG.MAP_COLS;
  const mapRows = currentMap.length;
  const mapWidth = mapCols * CONFIG.TILE_SIZE;
  const mapHeight = mapRows * CONFIG.TILE_SIZE;
  ghost.x = Math.min(Math.max(ghost.x, mapOffsetX), mapOffsetX + mapWidth);
  ghost.y = Math.min(Math.max(ghost.y, mapOffsetY), mapOffsetY + mapHeight);
}

function applyGhostSpeedScaling(amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) return;
  ghostSpeedMultiplier = Math.min(ghostSpeedMultiplier + amount, GHOST_MAX_SPEED_MULTIPLIER);
}

function handleFirstFragmentBoost() {
  firstFragmentEaten = true;
  ghostFreezeTimer = 2000;
  ghostGlowTimer = Number.POSITIVE_INFINITY;
  ghostGlowState = 'yellow';
  ghostPendingBoost = 0.25;
  flashBorder();
  playSound('ghostFreeze');
}

function checkGhostCollision() {
  ghosts.forEach(ghost => {
    const dx = player.x - ghost.x;
    const dy = player.y - ghost.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < (player.size / 2 + ghost.size / 2)) {
      // Game over
      gameOver();
    }
  });
}

// ====================================
// PLAYER MOVEMENT
// ====================================

// Helper function to snap player to tile center
function snapToGrid() {
  // Use floor to get current tile, then snap to center
  const tileCol = Math.floor((player.x - mapOffsetX) / CONFIG.TILE_SIZE);
  const tileRow = Math.floor((player.y - mapOffsetY) / CONFIG.TILE_SIZE);
  
  // Ensure tile is within bounds (calculate from currentMap)
  const mapCols = currentMap[0] ? currentMap[0].length : CONFIG.MAP_COLS;
  const mapRows = currentMap.length;
  if (tileCol >= 0 && tileCol < mapCols && 
      tileRow >= 0 && tileRow < mapRows) {
    player.x = mapOffsetX + tileCol * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    player.y = mapOffsetY + tileRow * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
  }
}

// Helper function to check if player is at tile center
function isAtCenter(threshold = 0.1) {
  const tileCol = Math.floor((player.x - mapOffsetX) / CONFIG.TILE_SIZE);
  const tileRow = Math.floor((player.y - mapOffsetY) / CONFIG.TILE_SIZE);
  
  const targetCenterX = mapOffsetX + tileCol * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
  const targetCenterY = mapOffsetY + tileRow * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
  
  const dx = Math.abs(player.x - targetCenterX);
  const dy = Math.abs(player.y - targetCenterY);
  
  return dx < threshold && dy < threshold;
}

function updatePlayer(deltaTime = 16) {
  // Get input direction
  let inputDir = null;
  
  if (mobileDirection) {
    inputDir = mobileDirection;
  } else {
    if (keys['ArrowUp'] || keys['w'] || keys['W']) inputDir = 'up';
    if (keys['ArrowDown'] || keys['s'] || keys['S']) inputDir = 'down';
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) inputDir = 'left';
    if (keys['ArrowRight'] || keys['d'] || keys['D']) inputDir = 'right';
  }
  
  if (inputDir) {
    player.nextDirection = inputDir;
    
    // Allow immediate direction change - no snap to avoid stuttering
    // Auto-align logic below will handle smooth grid alignment
    if (canMoveInDirection(player.nextDirection)) {
      player.direction = player.nextDirection;
      // Don't snap - let auto-align handle smooth movement
    }
  }
  
  if (!player.direction) {
    return;
  }
  
  // FIX 1: Allow turning at walls even if not perfectly centered
  // This prevents Pacman from getting stuck when hitting a wall
  if (!canMoveInDirection(player.direction)) {
    if (canMoveInDirection(player.nextDirection)) {
      player.direction = player.nextDirection;
      // Only snap when hitting wall to prevent getting stuck
      snapToGrid();
      return; // New direction will be processed next frame
    }
    return; // Can't move in current direction and can't turn - stop here
  }
  
  // FIX 3: Move player with deltaTime for consistent speed
  // Normalize deltaTime to 60fps (16ms per frame)
  const normalizedDelta = Math.min(deltaTime / 16, 2); // Cap at 2x to prevent large jumps
  const moveDistance = player.speed * normalizedDelta;
  
  switch(player.direction) {
    case 'up': player.y -= moveDistance; break;
    case 'down': player.y += moveDistance; break;
    case 'left': player.x -= moveDistance; break;
    case 'right': player.x += moveDistance; break;
  }
  player.lastDirection = player.direction;
  
  // FIX 3: Auto-align to grid axis when moving (allows smooth wall sliding)
  // This makes Pacman slide smoothly along walls like the arcade version
  const playerTileCol = Math.floor((player.x - mapOffsetX) / CONFIG.TILE_SIZE);
  const playerTileRow = Math.floor((player.y - mapOffsetY) / CONFIG.TILE_SIZE);
  
  const targetCenterX = mapOffsetX + playerTileCol * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
  const targetCenterY = mapOffsetY + playerTileRow * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
  
  // Auto-align to perpendicular axis when moving horizontally
  // This allows smooth sliding along vertical walls
  if (player.direction === 'left' || player.direction === 'right') {
    if (Math.abs(player.y - targetCenterY) < 1.2) {
      player.y = targetCenterY;
    }
  }
  
  // Auto-align to perpendicular axis when moving vertically
  // This allows smooth sliding along horizontal walls
  if (player.direction === 'up' || player.direction === 'down') {
    if (Math.abs(player.x - targetCenterX) < 1.2) {
      player.x = targetCenterX;
    }
  }
  
  // Keep player within map bounds (game area only - calculate from currentMap)
  const mapCols = currentMap[0] ? currentMap[0].length : CONFIG.MAP_COLS;
  const mapRows = currentMap.length;
  const mapWidth = mapCols * CONFIG.TILE_SIZE;
  const mapHeight = mapRows * CONFIG.TILE_SIZE;
  const minX = mapOffsetX;
  const maxX = mapOffsetX + mapWidth;
  const minY = mapOffsetY;
  const maxY = mapOffsetY + mapHeight;
  
  if (player.x < minX) {
    player.x = minX;
    snapToGrid();
  }
  if (player.x > maxX) {
    player.x = maxX;
    snapToGrid();
  }
  if (player.y < minY) {
    player.y = minY;
    snapToGrid();
  }
  if (player.y > maxY) {
    player.y = maxY;
    snapToGrid();
  }
}

function canMoveInDirection(direction) {
  // Use floor to get current tile
  const tileCol = Math.floor((player.x - mapOffsetX) / CONFIG.TILE_SIZE);
  const tileRow = Math.floor((player.y - mapOffsetY) / CONFIG.TILE_SIZE);
  
  // Calculate sprite bounds (hitbox) for accurate collision
  const halfSize = player.size / 2;
  const spriteLeft = player.x - halfSize;
  const spriteRight = player.x + halfSize;
  const spriteTop = player.y - halfSize;
  const spriteBottom = player.y + halfSize;
  
  // Calculate next tile position
  let nextCol = tileCol;
  let nextRow = tileRow;
  
  switch(direction) {
    case 'up':    nextRow -= 1; break;
    case 'down':  nextRow += 1; break;
    case 'left':  nextCol -= 1; break;
    case 'right': nextCol += 1; break;
  }
  
  // Calculate next tile boundaries
  const nextTileLeft = mapOffsetX + nextCol * CONFIG.TILE_SIZE;
  const nextTileRight = nextTileLeft + CONFIG.TILE_SIZE;
  const nextTileTop = mapOffsetY + nextRow * CONFIG.TILE_SIZE;
  const nextTileBottom = nextTileTop + CONFIG.TILE_SIZE;
  
  // Check if sprite edge will cross into next tile boundary
  let willCrossEdge = false;
  
  switch(direction) {
    case 'up':
      // Check if top edge will cross tile bottom boundary
      willCrossEdge = (spriteTop - player.speed) <= nextTileBottom;
      break;
    case 'down':
      // Check if bottom edge will cross tile top boundary
      willCrossEdge = (spriteBottom + player.speed) >= nextTileTop;
      break;
    case 'left':
      // Check if left edge will cross tile right boundary
      willCrossEdge = (spriteLeft - player.speed) <= nextTileRight;
      break;
    case 'right':
      // Check if right edge will cross tile left boundary
      willCrossEdge = (spriteRight + player.speed) >= nextTileLeft;
      break;
  }
  
  // If sprite edge won't cross into next tile, movement is safe
  if (!willCrossEdge) {
    return true; // Still within current tile
  }
  
  // Check if next tile is valid
  if (nextRow < 0 || nextRow >= currentMap.length ||
      nextCol < 0 || nextCol >= currentMap[0].length) {
    return false;
  }
  
  // Check if next tile is a path (0) or wall (1)
  return isWalkableTileValue(currentMap[nextRow][nextCol]);
}

// ====================================
// RENDERING
// ====================================

function render() {
  renderToCanvas(canvas, ctx);
  if (editorCanvas && editorCtx) {
    const editorContainer = document.getElementById('editorContainer');
    if (editorContainer && editorContainer.classList.contains('active')) {
      renderToCanvas(editorCanvas, editorCtx);
    }
  }
}

function renderToCanvas(targetCanvas, targetCtx) {
  // Clear entire canvas (game area only - 700x730)
  targetCtx.fillStyle = CONFIG.PATH_COLOR;
  targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
  
  // Draw map (full canvas - game area only)
  drawMapToCanvas(targetCtx);
  
  // Draw fragments
  drawFragmentsToCanvas(targetCtx);
  
  // Draw exit gate
  if (exitGate) {
    drawExitGateToCanvas(targetCtx);
  }
  
  // Draw ghosts
  drawGhostsToCanvas(targetCtx);
  
  // Draw player
  drawPlayerToCanvas(targetCtx);
}

function drawMap() {
  drawMapToCanvas(ctx);
}

function drawMapToCanvas(targetCtx) {
  for (let row = 0; row < currentMap.length; row++) {
    for (let col = 0; col < currentMap[row].length; col++) {
      const x = mapOffsetX + col * CONFIG.TILE_SIZE;
      const y = mapOffsetY + row * CONFIG.TILE_SIZE;
      
      if (currentMap[row][col] === 1) {
        // Wall
        targetCtx.fillStyle = CONFIG.WALL_COLOR;
        targetCtx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
      }
    }
  }
}

function drawFragments() {
  drawFragmentsToCanvas(ctx);
}

function drawFragmentsToCanvas(targetCtx) {
  fragments.forEach(fragment => {
    if (!fragment.collected) {
      // Draw fragment logo (BNB) if available, otherwise draw colored circle with label
      if (BRAND_CONFIG.fragmentLogo && BRAND_CONFIG.fragmentLogo.complete) {
        const logoSize = CONFIG.FRAGMENT_SIZE * 1.5; // Slightly larger for logo
        targetCtx.save();
        targetCtx.drawImage(
          BRAND_CONFIG.fragmentLogo,
          fragment.x - logoSize / 2,
          fragment.y - logoSize / 2,
          logoSize,
          logoSize
        );
        targetCtx.restore();
      } else {
        // Fallback: draw colored circle with label
        targetCtx.fillStyle = fragment.color;
        targetCtx.beginPath();
        targetCtx.arc(fragment.x, fragment.y, CONFIG.FRAGMENT_SIZE / 2, 0, Math.PI * 2);
        targetCtx.fill();
        
        // Draw label
        targetCtx.fillStyle = '#000';
        targetCtx.font = 'bold 12px Arial';
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText(fragment.label, fragment.x, fragment.y);
      }
    }
  });
}

function drawExitGate() {
  drawExitGateToCanvas(ctx);
}

function drawExitGateToCanvas(targetCtx) {
  if (!exitGate) return;
  
  gateBlinkTimer += 16; // ~60fps
  const blink = Math.floor(gateBlinkTimer / CONFIG.GATE_BLINK_INTERVAL) % 2;
  
  targetCtx.fillStyle = blink === 0 ? CONFIG.GATE_COLOR : CONFIG.GATE_COLOR_ALT;
  targetCtx.fillRect(
    exitGate.x - CONFIG.GATE_SIZE / 2,
    exitGate.y - CONFIG.GATE_SIZE / 2,
    CONFIG.GATE_SIZE,
    CONFIG.GATE_SIZE
  );
  
  // Gate symbol removed - just show blinking gate
}

function drawGhosts() {
  drawGhostsToCanvas(ctx);
}

function drawGhostsToCanvas(targetCtx) {
  const glowState = ghostGlowState;
  const glowActive = glowState && glowState !== 'none';
  // Mobile scale: 20% larger on mobile
  const isMobile = window.innerWidth <= 992;
  const mobileScale = isMobile ? 1.2 : 1.0;
  
  ghosts.forEach(ghost => {
    // Update animation frame for walking animation
    ghost.animationFrame = (ghost.animationFrame || 0) + 0.15;
    
    const size = ghost.size * mobileScale;
    const x = ghost.x;
    const y = ghost.y;
    
    // Draw ghost body (rounded top, animated wavy bottom)
    targetCtx.save();
    
    if (glowActive) {
      if (glowState === 'red') {
        targetCtx.shadowColor = "rgba(255, 0, 0, 0.85)";
        targetCtx.shadowBlur = 35;
      } else {
        targetCtx.shadowColor = "rgba(255, 255, 0, 0.65)";
        targetCtx.shadowBlur = 25;
      }
    } else {
      targetCtx.shadowColor = "transparent";
      targetCtx.shadowBlur = 0;
    }
    
    targetCtx.fillStyle = ghost.color;
    targetCtx.beginPath();
    
    // Top rounded part (semi-circle)
    targetCtx.arc(x, y - size / 4, size / 2, Math.PI, 0, false);
    
    // Animated wavy bottom (3 waves with animation)
    const waveHeight = size / 8;
    const waveWidth = size / 3;
    const bottomY = y + size / 2;
    
    // Animation offset for walking effect
    const animOffset = Math.sin(ghost.animationFrame) * waveHeight * 0.3;
    
    targetCtx.lineTo(x + size / 2, y);
    targetCtx.lineTo(x + size / 2, bottomY - waveHeight);
    
    // Draw animated wavy bottom (waves move up/down)
    for (let i = 0; i < 3; i++) {
      const waveX = x + size / 2 - (i * waveWidth);
      // Animate each wave with offset based on animation frame
      const wavePhase = (ghost.animationFrame + i * 0.5) % (Math.PI * 2);
      const waveAnimOffset = Math.sin(wavePhase) * waveHeight * 0.4;
      const waveY = bottomY - waveHeight + (i % 2 === 0 ? 0 : waveHeight) + waveAnimOffset;
      
      if (i === 0) {
        targetCtx.lineTo(waveX, waveY);
      } else {
        targetCtx.quadraticCurveTo(
          waveX + waveWidth / 2,
          bottomY - waveHeight / 2 + waveAnimOffset,
          waveX,
          waveY
        );
      }
    }
    
    // Complete the path
    targetCtx.lineTo(x - size / 2, bottomY - waveHeight + animOffset);
    targetCtx.lineTo(x - size / 2, y);
    targetCtx.closePath();
    targetCtx.fill();
    
    // Draw eyes (white circles)
    targetCtx.fillStyle = ghost.eyeColor || '#FFFFFF';
    const eyeSize = size / 6;
    const eyeOffsetX = size / 5;
    const eyeOffsetY = -size / 6;
    
    // Left eye
    targetCtx.beginPath();
    targetCtx.arc(x - eyeOffsetX, y + eyeOffsetY, eyeSize, 0, Math.PI * 2);
    targetCtx.fill();
    
    // Right eye
    targetCtx.beginPath();
    targetCtx.arc(x + eyeOffsetX, y + eyeOffsetY, eyeSize, 0, Math.PI * 2);
    targetCtx.fill();
    
    // Draw pupils (black, looking in direction)
    targetCtx.fillStyle = '#000000';
    const pupilSize = eyeSize / 2;
    let pupilOffsetX = 0;
    let pupilOffsetY = 0;
    
    // Adjust pupil position based on direction
    switch(ghost.direction) {
      case 'left': pupilOffsetX = -pupilSize / 2; break;
      case 'right': pupilOffsetX = pupilSize / 2; break;
      case 'up': pupilOffsetY = -pupilSize / 2; break;
      case 'down': pupilOffsetY = pupilSize / 2; break;
    }
    
    // Left pupil
    targetCtx.beginPath();
    targetCtx.arc(x - eyeOffsetX + pupilOffsetX, y + eyeOffsetY + pupilOffsetY, pupilSize, 0, Math.PI * 2);
    targetCtx.fill();
    
    // Right pupil
    targetCtx.beginPath();
    targetCtx.arc(x + eyeOffsetX + pupilOffsetX, y + eyeOffsetY + pupilOffsetY, pupilSize, 0, Math.PI * 2);
    targetCtx.fill();
    
    // Reset shadow effects
    targetCtx.shadowColor = "transparent";
    targetCtx.shadowBlur = 0;
    
    targetCtx.restore();
  });
}

function drawPlayer() {
  drawPlayerToCanvas(ctx);
}

function drawPlayerToCanvas(targetCtx) {
  // Check if player position is valid
  if (!player || !player.x || !player.y || isNaN(player.x) || isNaN(player.y)) {
    console.error('⚠️ Invalid player position:', player);
    return;
  }
  
  // Mobile scale: 20% larger on mobile
  const isMobile = window.innerWidth <= 992;
  const mobileScale = isMobile ? 1.2 : 1.0;
  const scaledSize = player.size * mobileScale;
  const scaledEyeOffsetX = (isMobile ? 4.8 : 4) * (player.direction === 'up' || player.direction === 'left' ? -1 : 1);
  const scaledEyeY = isMobile ? -7.2 : -6;
  const scaledEyeRadius = isMobile ? 3.6 : 3;
  
  // Draw Pacman (circle with animated mouth)
  targetCtx.fillStyle = '#FFD700';
  targetCtx.beginPath();
  
  const angle = {
    'up': -Math.PI / 2,
    'down': Math.PI / 2,
    'left': Math.PI,
    'right': 0
  }[player.direction] || 0;
  
  // Animated mouth opening/closing (continuous animation)
  const mouthAnimation = Math.sin(player.animationFrame) * 0.15 + 0.25; // Oscillates between 0.1 and 0.4
  const mouthOpen = mouthAnimation;
  
  targetCtx.arc(player.x, player.y, scaledSize / 2, angle + mouthOpen, angle + Math.PI * 2 - mouthOpen);
  targetCtx.lineTo(player.x, player.y);
  targetCtx.fill();
  
  // Draw eye (position changes based on direction)
  targetCtx.fillStyle = '#000';
  targetCtx.beginPath();
  
  // Eye position based on direction
  // Up and Left: eye on the left side
  // Down and Right: eye on the right side
  targetCtx.arc(player.x + scaledEyeOffsetX, player.y + scaledEyeY, scaledEyeRadius, 0, Math.PI * 2);
  targetCtx.fill();
}

function drawHUD() {
  // HUD is drawn via HTML overlay, but we can also draw on canvas if needed
  // The HTML HUD is handled separately
}

// ====================================
// HUD UPDATE
// ====================================

function updateHUD() {
  const scoreEl = document.getElementById('hudScore');
  const levelEl = document.getElementById('hudLevel');
  
  if (scoreEl) scoreEl.textContent = `Score: ${score}`;
  if (levelEl) levelEl.textContent = `LV ${currentLevel}`;
}


// ====================================
// CONTROLS
// ====================================

function setupControls() {
  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // Test maps: Press 1-5 to jump to specific map
    if (e.key >= '1' && e.key <= '5') {
      const mapNum = parseInt(e.key);
      currentLevel = mapNum;
      initLevel(mapNum);
      console.log(`Switched to Map ${mapNum}`);
    }
  });
  
  window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });
}

function setupMobileControls() {
  const upBtn = document.getElementById('btnUp');
  const downBtn = document.getElementById('btnDown');
  const leftBtn = document.getElementById('btnLeft');
  const rightBtn = document.getElementById('btnRight');
  
  if (upBtn) {
    upBtn.addEventListener('touchstart', () => setMobileDirection('up', 'button'));
    upBtn.addEventListener('touchend', () => clearMobileDirection('button'));
    upBtn.addEventListener('touchcancel', () => clearMobileDirection('button'));
  }
  
  if (downBtn) {
    downBtn.addEventListener('touchstart', () => setMobileDirection('down', 'button'));
    downBtn.addEventListener('touchend', () => clearMobileDirection('button'));
    downBtn.addEventListener('touchcancel', () => clearMobileDirection('button'));
  }
  
  if (leftBtn) {
    leftBtn.addEventListener('touchstart', () => setMobileDirection('left', 'button'));
    leftBtn.addEventListener('touchend', () => clearMobileDirection('button'));
    leftBtn.addEventListener('touchcancel', () => clearMobileDirection('button'));
  }
  
  if (rightBtn) {
    rightBtn.addEventListener('touchstart', () => setMobileDirection('right', 'button'));
    rightBtn.addEventListener('touchend', () => clearMobileDirection('button'));
    rightBtn.addEventListener('touchcancel', () => clearMobileDirection('button'));
  }
  
  // Show mobile controls on mobile devices
  if (window.innerWidth <= 768) {
    const mobileControls = document.querySelector('.mobile-controls');
    if (mobileControls) {
      mobileControls.classList.add('active');
    }
  }

  setupSwipeControls();
  // Footer swipe removed - only Pacman control in game area
}

function setupSwipeControls() {
  const canvasEl = document.getElementById('gameCanvas');
  if (!canvasEl) return;

  let touchStartX = null;
  let touchStartY = null;
  let isSwiping = false;
  const threshold = 30;

  const onTouchStart = (event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isSwiping = true;
  };

  const onTouchMove = (event) => {
    if (!isSwiping || touchStartX === null || touchStartY === null) return;
    const touch = event.touches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    // Only control Pacman - no scroll logic
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
      return;
    }

    isSwiping = false;
    let direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'right' : 'left';
    } else {
      direction = dy > 0 ? 'down' : 'up';
    }
    setMobileDirection(direction, 'swipe');
  };

  const resetSwipe = () => {
    touchStartX = null;
    touchStartY = null;
    isSwiping = false;
  };

  canvasEl.addEventListener('touchstart', onTouchStart, { passive: true });
  canvasEl.addEventListener('touchmove', onTouchMove, { passive: true });
  canvasEl.addEventListener('touchend', resetSwipe);
  canvasEl.addEventListener('touchcancel', resetSwipe);
}

// setupFooterSwipeToEditor removed - swipe in game area only controls Pacman

// ====================================
// GAME LOOP
// ====================================

function gameLoop(timestamp = 0) {
  let deltaTime = timestamp - lastTime;
  
  // Handle first frame (deltaTime will be 0 or very large)
  if (deltaTime === 0 || deltaTime > 100) {
    deltaTime = 16; // Default to ~60fps
  }
  
  lastTime = timestamp;
  
  // Ensure high-quality rendering is always enabled
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
  
  if (gameState === 'playing') {
    // Update animation frames
    player.animationFrame += deltaTime * 0.01; // Animate mouth
    
    // Update with deltaTime
    updatePlayer(deltaTime);
    updateGhosts(deltaTime);
    checkFragmentCollection();
    checkExitGate();
    checkGhostCollision();
    
    // Render
    render();
  }
  
  animationFrame = requestAnimationFrame(gameLoop);
}

// ====================================
// FLASH BORDER EFFECT
// ====================================

function flashBorder() {
  const gameWrapper = document.querySelector(".game-wrapper");
  if (!gameWrapper) return;

  gameWrapper.style.boxShadow = "0 0 25px 5px red";
  setTimeout(() => {
    gameWrapper.style.boxShadow = "none";
  }, 200);
}

// ====================================
// GAME OVER
// ====================================

function gameOver() {
  if (isGameOver) return;
  
  playSound('playerHit');
  isGameOver = true;
  gameState = 'gameOver';
  
  // Show random story
  const randomStory = BRAND_CONFIG.stories[
    Math.floor(Math.random() * BRAND_CONFIG.stories.length)
  ];
  
  const gameOverScreen = document.querySelector('.game-over-screen');
  const gameOverLogo = document.getElementById('gameOverLogo');
  const gameOverStory = document.getElementById('gameOverStory');
  
  if (gameOverScreen) {
    gameOverScreen.classList.add('active');
  }
  
  if (gameOverLogo) {
    if (BRAND_CONFIG.fragmentLogo && BRAND_CONFIG.fragmentLogo.complete && BRAND_CONFIG.fragmentLogoUrl) {
      gameOverLogo.src = BRAND_CONFIG.fragmentLogoUrl;
      gameOverLogo.style.display = 'block';
    } else {
      gameOverLogo.style.display = 'none';
    }
  }
  
  if (gameOverStory) {
    gameOverStory.textContent = randomStory;
  }
  
  setTimeout(() => playSound('storyChime'), 200);
  
  // Send score to MemePlay
  sendScoreToMemePlay();
}

function restartGame() {
  isGameOver = false;
  gameState = 'playing';
  score = 0;
  currentLevel = 1;
  
  // Reset ghost AI state
  ghostSpeedMultiplier = 0.25; // Start at 25% of Pacman speed
  
  const gameOverScreen = document.querySelector('.game-over-screen');
  if (gameOverScreen) {
    gameOverScreen.classList.remove('active');
  }
  
  // Re-enable high-quality rendering after restart
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
  if (editorCtx) {
    editorCtx.imageSmoothingEnabled = true;
    editorCtx.imageSmoothingQuality = 'high';
  }
  
  initLevel(1);
}

// ====================================
// MEMEPLAY INTEGRATION
// ====================================

function setupMemePlayIntegration() {
  // Listen for messages from parent (MemePlay)
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'GAME_OVER') {
      gameOver();
    }
  });
}

function sendScoreToMemePlay() {
  // Send score to parent window (MemePlay)
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: 'GAME_SCORE',
      score: score,
      level: currentLevel
    }, '*');
  }
}

// ====================================
// BACKGROUND REMOVAL
// ====================================

function processLogoImage(img, removeBackground, callback) {
  // Always remove background automatically for all logos
  // Remove background using edge detection and corner color sampling
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  
  // Draw original image
  ctx.drawImage(img, 0, 0);
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Check if image already has transparency (PNG with alpha channel)
  let hasTransparency = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      hasTransparency = true;
      break;
    }
  }
  
  // If already has transparency, keep it and just return
  if (hasTransparency) {
    callback(canvas.toDataURL('image/png'));
    return;
  }
  
  // Sample corner colors to detect background
  const corners = [
    { x: 0, y: 0 }, // Top-left
    { x: canvas.width - 1, y: 0 }, // Top-right
    { x: 0, y: canvas.height - 1 }, // Bottom-left
    { x: canvas.width - 1, y: canvas.height - 1 } // Bottom-right
  ];
  
  const cornerColors = corners.map(corner => {
    const idx = (corner.y * canvas.width + corner.x) * 4;
    return {
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
      a: data[idx + 3]
    };
  });
  
  // Calculate average corner color (likely background)
  const avgBg = {
    r: Math.round(cornerColors.reduce((sum, c) => sum + c.r, 0) / cornerColors.length),
    g: Math.round(cornerColors.reduce((sum, c) => sum + c.g, 0) / cornerColors.length),
    b: Math.round(cornerColors.reduce((sum, c) => sum + c.b, 0) / cornerColors.length)
  };
  
  // Adaptive threshold based on image size and complexity
  const threshold = Math.max(25, Math.min(40, canvas.width / 20));
  
  // Remove background pixels
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate distance from average background color
    const distance = Math.sqrt(
      Math.pow(r - avgBg.r, 2) +
      Math.pow(g - avgBg.g, 2) +
      Math.pow(b - avgBg.b, 2)
    );
    
    // If pixel is similar to background, make it transparent
    if (distance < threshold) {
      data[i + 3] = 0; // Set alpha to 0 (transparent)
    }
  }
  
  // Apply edge detection to preserve edges and restore important pixels
  const edgeThreshold = 25;
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const idx = (y * canvas.width + x) * 4;
      
      // Skip if pixel is already opaque
      if (data[idx + 3] > 0) continue;
      
      // Sample neighbors for edge detection
      const neighbors = [
        { idx: ((y - 1) * canvas.width + x) * 4 },
        { idx: ((y + 1) * canvas.width + x) * 4 },
        { idx: (y * canvas.width + (x - 1)) * 4 },
        { idx: (y * canvas.width + (x + 1)) * 4 }
      ];
      
      let maxDiff = 0;
      neighbors.forEach(n => {
        if (data[n.idx + 3] > 0) { // Only check opaque neighbors
          const diff = Math.abs(data[idx] - data[n.idx]) +
                       Math.abs(data[idx + 1] - data[n.idx + 1]) +
                       Math.abs(data[idx + 2] - data[n.idx + 2]);
          maxDiff = Math.max(maxDiff, diff);
        }
      });
      
      // If strong edge detected near transparent pixel, restore it
      if (maxDiff > edgeThreshold) {
        data[idx + 3] = 255; // Restore alpha for edge pixels
      }
    }
  }
  
  // Put processed image data back
  ctx.putImageData(imageData, 0, 0);
  
  // Return as PNG to preserve transparency
  callback(canvas.toDataURL('image/png'));
}

// ====================================
// IMAGE OPTIMIZATION
// ====================================

function optimizeImage(img, callback) {
  // Target size for logo (optimized for 48px display, can be smaller)
  const MAX_SIZE = CONFIG.FRAGMENT_LOGO_MAX_SIZE;
  const TARGET_SIZE_KB = CONFIG.FRAGMENT_LOGO_TARGET_SIZE_KB;
  
  let width = img.width;
  let height = img.height;
  
  // Calculate new dimensions (maintain aspect ratio)
  // Resize smaller for better compression (logo only needs 48px, so 128px is plenty)
  if (width > MAX_SIZE || height > MAX_SIZE) {
    if (width > height) {
      height = Math.round((height / width) * MAX_SIZE);
      width = MAX_SIZE;
    } else {
      width = Math.round((width / height) * MAX_SIZE);
      height = MAX_SIZE;
    }
  }
  
  // Create canvas for resizing
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Use high-quality image smoothing for better downscaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Draw resized image
  ctx.drawImage(img, 0, 0, width, height);
  
  // Check WebP support
  const supportsWebP = checkWebPSupport();
  
  // Aggressive compression: Use low quality WebP to achieve ~3% file size (like Squoosh)
  // WebP with quality 0.5-0.6 can achieve 2-5% of original size
  const compressImage = (format, quality, onComplete) => {
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const sizeKB = blob.size / 1024;
            const originalSizeKB = (img.width * img.height * 4) / 1024; // Approximate original size
            const compressionRatio = ((blob.size / (img.width * img.height * 4)) * 100).toFixed(1);
            console.log(`✅ Image optimized: ${sizeKB.toFixed(2)}KB (${format}, quality: ${quality}) - ${compressionRatio}% of original`);
            onComplete(e.target.result);
          };
          reader.onerror = () => {
            // Fallback to data URL
            const dataUrl = canvas.toDataURL(format, quality);
            onComplete(dataUrl);
          };
          reader.readAsDataURL(blob);
        } else {
          // Fallback to data URL
          const dataUrl = canvas.toDataURL(format, quality);
          onComplete(dataUrl);
        }
      }, format, quality);
    } else {
      // Fallback for older browsers
      const dataUrl = canvas.toDataURL(format, quality);
      onComplete(dataUrl);
    }
  };
  
  // Try WebP first with aggressive compression (quality 0.5-0.6 = ~3% of original)
  if (supportsWebP && canvas.toBlob) {
    compressImage('image/webp', CONFIG.FRAGMENT_LOGO_QUALITY, (result) => {
      callback(result);
    });
  } else {
    // Fallback for browsers without WebP support
    const isPhoto = img.width > 0 && img.height > 0 && 
                    (img.width / img.height > 1.2 || img.height / img.width > 1.2);
    const format = isPhoto ? 'image/jpeg' : 'image/png';
    compressImage(format, CONFIG.FRAGMENT_LOGO_QUALITY, (result) => {
      callback(result);
    });
  }
}

// Check if browser supports WebP
function checkWebPSupport() {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

// ====================================
// EDITOR PANEL
// ====================================

function setupEditor() {
  const editorContainer = document.getElementById('editorContainer');
  const editorToggle = document.getElementById('editorToggle');
  const playTestBtn = document.getElementById('playTestBtn');
  const saveBtn = document.getElementById('saveBtn');
  const publicLinkBtn = document.getElementById('publicLinkBtn');
  const mapSelect = document.getElementById('mapSelect');
  const titleInput = document.getElementById('titleInput');
  const story1Input = document.getElementById('story1Input');
  const story2Input = document.getElementById('story2Input');
  const story3Input = document.getElementById('story3Input');
  const story1Count = document.getElementById('story1Count');
  const story2Count = document.getElementById('story2Count');
  const story3Count = document.getElementById('story3Count');
  const fragmentLogoInput = document.getElementById('fragmentLogoInput');
  const fragmentLogoPreview = document.getElementById('fragmentLogoPreview');
  const fragmentLogoLoading = document.getElementById('fragmentLogoLoading');
  if (saveBtn) {
    saveBtn.dataset.visible = 'false';
    saveBtn.dataset.saved = 'false';
  }
  if (publicLinkBtn) {
    publicLinkBtn.dataset.visible = 'false';
    publicLinkBtn.dataset.enabled = 'false';
  }

  const applyMobileGameLockState = () => {
    if (!document.body) return;
    if (!mobileGameUnlocked && isMobileViewport()) {
      document.body.classList.add('mobile-game-locked');
    } else {
      document.body.classList.remove('mobile-game-locked');
    }
  };

  applyMobileGameLockState();
  window.addEventListener('resize', applyMobileGameLockState);

  const unlockMobileGameIfNeeded = () => {
    if (isMobileViewport() && !mobileGameUnlocked) {
      mobileGameUnlocked = true;
      applyMobileGameLockState();
    }
  };

  const setPublicLinkEnabled = (enabled) => {
    if (!publicLinkBtn) return;
    publicLinkBtn.dataset.enabled = enabled ? 'true' : 'false';
    if (enabled) {
      publicLinkBtn.style.opacity = '1';
      publicLinkBtn.style.pointerEvents = 'auto';
      publicLinkBtn.style.background = '#ffb642';
      publicLinkBtn.style.boxShadow = '0 0 12px rgba(255, 182, 66, 0.4)';
    } else {
      publicLinkBtn.style.opacity = '0.5';
      publicLinkBtn.style.pointerEvents = 'none';
      publicLinkBtn.style.background = '#555555';
      publicLinkBtn.style.boxShadow = '0 0 12px rgba(255, 182, 66, 0.2)';
    }
  };

  const showSaveFlow = () => {
    if (saveBtn) {
      saveBtn.style.display = 'block';
      saveBtn.dataset.visible = 'true';
      saveBtn.dataset.saved = 'false';
      saveBtn.textContent = '💾 Save';
      saveBtn.style.background = '#ffb642';
    }
    if (publicLinkBtn) {
      publicLinkBtn.style.display = 'block';
      publicLinkBtn.dataset.visible = 'true';
      publicLinkBtn.textContent = '🔗 Get Public Link';
      setPublicLinkEnabled(false);
    }
  };

  const PROJECT_HOME_URL = '../../../index.html';

  const handleFloatingButtonsVisibility = (isActive) => {
    if (saveBtn) {
      if (isActive && saveBtn.dataset.visible === 'true') {
        saveBtn.dataset.wasVisible = 'true';
        saveBtn.style.display = 'none';
      } else if (!isActive && saveBtn.dataset.wasVisible === 'true') {
        saveBtn.style.display = 'block';
        delete saveBtn.dataset.wasVisible;
      }
    }
    if (publicLinkBtn) {
      if (isActive && publicLinkBtn.dataset.visible === 'true') {
        publicLinkBtn.dataset.wasVisible = 'true';
        publicLinkBtn.style.display = 'none';
      } else if (!isActive && publicLinkBtn.dataset.wasVisible === 'true') {
        publicLinkBtn.style.display = 'block';
        delete publicLinkBtn.dataset.wasVisible;
      }
    }
  };

  if (fragmentLogoPreview && BRAND_CONFIG.fragmentLogoUrl) {
    fragmentLogoPreview.src = BRAND_CONFIG.fragmentLogoUrl;
    fragmentLogoPreview.classList.add('active');
  }
  
  // Character counter function
  const updateCharCount = (textarea, counter, maxLength) => {
    const length = textarea.value.length;
    counter.textContent = `${length}/${maxLength}`;
    if (length >= maxLength) {
      counter.classList.add('warning');
    } else {
      counter.classList.remove('warning');
    }
  };
  
  // Toggle editor
  if (editorToggle) {
    editorToggle.addEventListener('click', () => {
      if (isMobileViewport()) {
        scrollToCreatorScreen();
      } else if (editorContainer) {
        editorContainer.classList.add('active');
        editorToggle.style.display = 'none';
        handleFloatingButtonsVisibility(true);
      }
    });
  }
  
  // Close editor button
  const closeEditorBtn = document.getElementById('closeEditorBtn');
  if (closeEditorBtn) {
    closeEditorBtn.addEventListener('click', () => {
      window.location.href = PROJECT_HOME_URL;
    });
  }
  
  // Title input
  if (titleInput) {
    titleInput.value = BRAND_CONFIG.title;
    titleInput.addEventListener('input', (e) => {
      BRAND_CONFIG.title = e.target.value;
      saveBrandConfig();
    });
  }
  
  // Story inputs with character limit (50 chars)
  const MAX_STORY_LENGTH = 50;
  
  if (story1Input) {
    story1Input.value = (BRAND_CONFIG.stories[0] || '').substring(0, MAX_STORY_LENGTH);
    updateCharCount(story1Input, story1Count, MAX_STORY_LENGTH);
    story1Input.addEventListener('input', (e) => {
      const value = e.target.value.substring(0, MAX_STORY_LENGTH);
      e.target.value = value;
      BRAND_CONFIG.stories[0] = value;
      saveBrandConfig();
      updateCharCount(story1Input, story1Count, MAX_STORY_LENGTH);
    });
  }
  
  if (story2Input) {
    story2Input.value = (BRAND_CONFIG.stories[1] || '').substring(0, MAX_STORY_LENGTH);
    updateCharCount(story2Input, story2Count, MAX_STORY_LENGTH);
    story2Input.addEventListener('input', (e) => {
      const value = e.target.value.substring(0, MAX_STORY_LENGTH);
      e.target.value = value;
      BRAND_CONFIG.stories[1] = value;
      saveBrandConfig();
      updateCharCount(story2Input, story2Count, MAX_STORY_LENGTH);
    });
  }
  
  if (story3Input) {
    story3Input.value = (BRAND_CONFIG.stories[2] || '').substring(0, MAX_STORY_LENGTH);
    updateCharCount(story3Input, story3Count, MAX_STORY_LENGTH);
    story3Input.addEventListener('input', (e) => {
      const value = e.target.value.substring(0, MAX_STORY_LENGTH);
      e.target.value = value;
      BRAND_CONFIG.stories[2] = value;
      saveBrandConfig();
      updateCharCount(story3Input, story3Count, MAX_STORY_LENGTH);
    });
  }
  
  // Fragment logo upload (BNB)
  if (fragmentLogoInput) {
    fragmentLogoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validate file type
        if (!file.type.match(/^image\/(png|jpeg|jpg|webp|gif)$/i)) {
          alert('Please upload a valid image file (PNG, JPEG, WebP, or GIF)');
          return;
        }
        
        // Validate file size
        if (file.size > CONFIG.FRAGMENT_LOGO_MAX_FILE_SIZE) {
          const maxMB = (CONFIG.FRAGMENT_LOGO_MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
          alert(`Image file is too large. Please use an image smaller than ${maxMB}MB.`);
          return;
        }
        
        // Show loading indicator
        if (fragmentLogoLoading) {
          fragmentLogoLoading.style.display = 'block';
        }
        if (fragmentLogoPreview) {
          fragmentLogoPreview.classList.remove('active');
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            // Always remove background automatically
            processLogoImage(img, true, (processedDataUrl) => {
              // Optimize image: resize and compress
              const processedImg = new Image();
              processedImg.onload = () => {
                optimizeImage(processedImg, (optimizedDataUrl) => {
                  const optimizedImg = new Image();
                  optimizedImg.onload = () => {
                    BRAND_CONFIG.fragmentLogo = optimizedImg;
                    BRAND_CONFIG.fragmentLogoUrl = optimizedDataUrl;
                    saveBrandConfig();
                    
                    // Hide loading, show preview
                    if (fragmentLogoLoading) {
                      fragmentLogoLoading.style.display = 'none';
                    }
                    if (fragmentLogoPreview) {
                      fragmentLogoPreview.src = optimizedDataUrl;
                      fragmentLogoPreview.classList.add('active');
                    }
                    
                    console.log('✅ Fragment logo uploaded!');
                  };
                  optimizedImg.onerror = () => {
                    if (fragmentLogoLoading) {
                      fragmentLogoLoading.style.display = 'none';
                    }
                    alert('Failed to load optimized image. Please try again.');
                  };
                  optimizedImg.src = optimizedDataUrl;
                });
              };
              processedImg.onerror = () => {
                if (fragmentLogoLoading) {
                  fragmentLogoLoading.style.display = 'none';
                }
                alert('Failed to process image. Please try again.');
              };
              processedImg.src = processedDataUrl;
            });
          };
          img.onerror = () => {
            if (fragmentLogoLoading) {
              fragmentLogoLoading.style.display = 'none';
            }
            alert('Failed to load image. Please check the file format.');
          };
          img.src = event.target.result;
        };
        reader.onerror = () => {
          if (fragmentLogoLoading) {
            fragmentLogoLoading.style.display = 'none';
          }
          alert('Failed to read file. Please try again.');
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  // Map selection
  if (mapSelect) {
    mapSelect.value = currentLevel.toString();
    
    mapSelect.addEventListener('change', (e) => {
      const selectedMap = parseInt(e.target.value, 10);
      if (selectedMap === 1 && MAPS.length > 0 && editorCanvas && editorCtx) {
        if (editorContainer && editorContainer.classList.contains('active')) {
          const tempLevel = currentLevel;
          const tempMap = currentMap;
          const tempMapIndex = mapIndex;
          
          mapIndex = 0;
          const previewMap = MAPS[0].map(row => [...row]);
          
          const mapCols = previewMap[0] ? previewMap[0].length : CONFIG.MAP_COLS;
          const mapRows = previewMap.length;
          const mapWidth = mapCols * CONFIG.TILE_SIZE;
          const mapHeight = mapRows * CONFIG.TILE_SIZE;
          const previewMapOffsetX = (editorCanvas.width - mapWidth) / 2;
          const previewMapOffsetY = (editorCanvas.height - mapHeight) / 2;
          
          editorCtx.fillStyle = CONFIG.PATH_COLOR;
          editorCtx.fillRect(0, 0, editorCanvas.width, editorCanvas.height);
          
          for (let row = 0; row < previewMap.length; row++) {
            for (let col = 0; col < previewMap[row].length; col++) {
              const x = previewMapOffsetX + col * CONFIG.TILE_SIZE;
              const y = previewMapOffsetY + row * CONFIG.TILE_SIZE;
              if (previewMap[row][col] === 1) {
                editorCtx.fillStyle = CONFIG.WALL_COLOR;
                editorCtx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
              }
            }
          }
          
          currentLevel = tempLevel;
          currentMap = tempMap;
          mapIndex = tempMapIndex;
        }
      }
    });
  }
  
  // Play test button
  if (playTestBtn) {
    playTestBtn.addEventListener('click', () => {
      // Get selected map from dropdown
      const selectedMap = mapSelect ? parseInt(mapSelect.value) : currentLevel;
      
      if (!isMobileViewport() && editorContainer) {
        editorContainer.classList.remove('active');
        if (editorToggle) {
          editorToggle.style.display = 'block';
        }
        handleFloatingButtonsVisibility(false);
      }

      // Show save & public link workflow after Play Test
      showSaveFlow();

      if (isMobileViewport()) {
        unlockMobileGameIfNeeded();
      }
      
      // Reset game state but keep selected map
      isGameOver = false;
      gameState = 'playing';
      score = 0;
      
      // Reset ghost AI state
      ghostSpeedMultiplier = 0.25; // Start at 25% of Pacman speed
      firstFragmentEaten = false;
      ghostFreezeTimer = 0;
      ghostGlowTimer = 0;
      ghostGlowState = 'none';
      ghostPendingBoost = 0;
      
      // Initialize level with selected map (this will set currentLevel)
      initLevel(1);

      const gameWrapperEl = document.getElementById('gameWrapper');
      if (gameWrapperEl) {
        setTimeout(() => {
          gameWrapperEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (isMobileViewport()) {
            applyMobileGameScale();
          }
        }, 150);
      }
    });
  }
  
  // Save button
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (saveBtn.dataset.visible !== 'true') {
        return;
      }
      saveBtn.textContent = '✅ Saved';
      saveBtn.style.background = '#4ECDC4';
      saveBtn.dataset.saved = 'true';
      setPublicLinkEnabled(true);
    });
  }
  
  // Public Link button
  if (publicLinkBtn) {
    publicLinkBtn.addEventListener('click', () => {
      if (publicLinkBtn.dataset.enabled !== 'true') {
        return;
      }
      const shareUrl = buildPublicLinkUrl();
      
      // Get current page URL
      const currentUrl = shareUrl;
      
      // Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(currentUrl).then(() => {
          // Show success message
          const originalText = publicLinkBtn.textContent;
          publicLinkBtn.textContent = '✅ Link Copied!';
          publicLinkBtn.style.background = '#4ECDC4';
          
          setTimeout(() => {
            publicLinkBtn.textContent = originalText;
            publicLinkBtn.style.background = '#ffb642';
          }, 2000);
        }).catch(() => {
          // Fallback: show URL in alert
          alert(`Public Link:\n${currentUrl}\n\n(Copy this link to share)`);
        });
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = currentUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
          document.execCommand('copy');
          const originalText = publicLinkBtn.textContent;
          publicLinkBtn.textContent = '✅ Link Copied!';
          publicLinkBtn.style.background = '#4ECDC4';
          
          setTimeout(() => {
            publicLinkBtn.textContent = originalText;
            publicLinkBtn.style.background = '#ffb642';
          }, 2000);
        } catch (err) {
          alert(`Public Link:\n${currentUrl}\n\n(Copy this link to share)`);
        }
        
        document.body.removeChild(textArea);
      }
    });
  }
}

function applyMobileGameScale() {
  const wrapper = document.querySelector('#gameWrapper .game-wrapper');
  const container = document.getElementById('gameWrapper');
  if (!wrapper || !container) return;

  const viewportWidth = window.innerWidth;
  if (viewportWidth > 992) {
    wrapper.style.transform = 'none';
    wrapper.style.left = 'auto';
    wrapper.style.margin = '0 auto';
    wrapper.style.position = 'static';
    wrapper.style.width = '720px';
    container.style.height = `${wrapper.offsetHeight}px`;
    container.style.minHeight = `${wrapper.offsetHeight}px`;
    return;
  }

  const baseWidth = 720;
  const baseHeight = 1000;
  const containerWidth = container.clientWidth || viewportWidth;
  const scale = Math.min(containerWidth / baseWidth, 1);
  const scaledHeight = baseHeight * scale;
  const scaledWidth = baseWidth * scale;
  const translateX = Math.max((containerWidth - scaledWidth) / 2, 0);

  wrapper.style.position = 'relative';
  wrapper.style.left = '0';
  wrapper.style.margin = '0';
  wrapper.style.transformOrigin = 'top left';
  wrapper.style.transform = `translateX(${translateX}px) scale(${scale})`;
  wrapper.style.width = `${baseWidth}px`;
  container.style.height = `${scaledHeight}px`;
  container.style.minHeight = `${scaledHeight}px`;
}

window.addEventListener('resize', applyMobileGameScale);
window.addEventListener('orientationchange', applyMobileGameScale);

// ====================================
// INITIALIZE ON LOAD
// ====================================

window.addEventListener('DOMContentLoaded', () => {
  initGame();
  setupEditor();
  applyMobileGameScale();
  
  // On mobile, scroll to top (page 1) on refresh
  if (window.innerWidth <= 992) {
    setTimeout(() => {
      scrollToCreatorScreen();
    }, 100);
  }
  
  // Load fragment logo on startup
  if (BRAND_CONFIG.fragmentLogoUrl) {
    const img = new Image();
    img.onload = () => {
      BRAND_CONFIG.fragmentLogo = img;
    };
    img.onerror = () => {
      console.error('Failed to load saved fragment logo');
    };
    img.src = BRAND_CONFIG.fragmentLogoUrl;
  }
});

// Restart button
const restartBtn = document.getElementById('restartBtn');
if (restartBtn) {
  restartBtn.addEventListener('click', restartGame);
}

