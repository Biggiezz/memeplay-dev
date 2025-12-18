/**
 * SHOOTER - Bubble Shooter Game Template
 * MemePlay x Binance - Templates V2
 */

// ============== IMPORTS ==============
import { BRAND_CONFIG, loadBrandConfig, getGameId, getEffectiveLogoUrl } from './config.js';
import { getSupabaseClient } from '../core/supabase-client.js';

const TEMPLATE_ID = 'shooter-template';

// ============== GAME CONSTANTS ==============
const BALL_COLORS = ['green', 'orange', 'blue', 'yellow', 'purple', 'red'];
const COLOR_HEX = {
    green: '#4ade80',
    orange: '#fb923c',
    blue: '#60a5fa',
    yellow: '#facc15',
    purple: '#c084fc',
    red: '#f87171'
};

let BALL_RADIUS = 27;
const GRID_COLS = 12;
const PUSH_INTERVAL = 5000;
const SHOOTING_SPEED = 15;

// ============== GAME STATE ==============
let canvas, ctx;
let gameState = 'start';
let score = 0;
let level = 1;
let highScore = 0;
let highestLevel = 1;
let soundEnabled = true;

// Level mission
let targetColor = '';
let collectedBalls = 0;
let requiredBalls = 5;

// Grid & Balls
let grid = [];
let rowHeight = BALL_RADIUS * 1.75;
let topRowIsOffset = false;

// Shooter
let shooterX = 0;
let shooterY = 0;
let currentBall = null;
let nextBall = null;
let aimAngle = -Math.PI / 2;
let isAiming = false;

// Flying ball
let flyingBall = null;

// Timer
let pushTimer = PUSH_INTERVAL;
let lastTime = 0;

// Danger line Y position
let dangerLineY = 0;

// Animation
let particles = [];

// Logo (customizable via brand config)
let logoImg = new Image();
logoImg.src = 'assets/binance-logo.webp';

// Audio context for sounds
let audioCtx = null;

// ============== BRAND CONFIG ==============
function applyBrandConfig(config) {
    // Apply logo - use effective URL (default if empty)
    const effectiveLogoUrl = config.logoUrl || getEffectiveLogoUrl();
    
    logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = effectiveLogoUrl;
    
    // Update game over logo
    const gameLogoEl = document.getElementById('game-logo');
    if (gameLogoEl) {
        gameLogoEl.src = effectiveLogoUrl;
    }
    
    // Apply story text (only Game Over screen - Start screen doesn't have story)
    const storyText = config.storyText || 'memeplay';
    const gameoverStoryEl = document.getElementById('gameover-story');
    if (gameoverStoryEl) gameoverStoryEl.textContent = storyText;
    
    // Apply map color (background) - use 'background' to override CSS gradient
    if (config.mapColor) {
        document.body.style.background = config.mapColor;
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.background = config.mapColor;
        }
        // Store for canvas background
        BRAND_CONFIG.mapColor = config.mapColor;
    }
}

// Load brand config from Supabase (fallback when localStorage doesn't have it)
async function loadBrandConfigFromSupabase(gameId) {
    if (!gameId) return false;
    try {
        const supabase = await getSupabaseClient();
        if (!supabase) return false;
        const { data, error } = await supabase.rpc('list_user_created_games', {
            p_template_id: TEMPLATE_ID
        });
        if (error) return false;
        if (!Array.isArray(data)) return false;
        const foundGame = data.find(item => {
            const id = item?.game_id || item?.id;
            return id === gameId;
        });
        if (!foundGame) return false;
        
        // Apply config from Supabase
        const config = {
            logoUrl: foundGame.fragment_logo_url || '',
            storyText: foundGame.story_one || foundGame.token_story || 'memeplay',
            mapColor: foundGame.map_color || '#1a1a2e'
        };
        Object.assign(BRAND_CONFIG, config);
        applyBrandConfig(config);
        return true;
    } catch (err) {
        return false;
    }
}

// ============== SOUNDS ==============
function initSounds() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playShootSound() {
    if (!soundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.1);
    } catch(e) {}
}

function playPopSound() {
    if (!soundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.15);
    } catch(e) {}
}

// ============== INITIALIZATION ==============
async function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Load saved data
    loadProgress();
    
    // Initialize sounds
    initSounds();
    
    // Event listeners
    setupEventListeners();
    
    // Setup message listener for UPDATE_CONFIG
    setupMessageListener();
    
    // Load brand config
    const gameId = getGameId();
    
    if (gameId) {
        // Try localStorage first
        const localConfig = loadBrandConfig();
        
        if (localConfig.logoUrl || localConfig.storyText !== 'memeplay' || localConfig.mapColor) {
            applyBrandConfig(localConfig);
        } else {
            // Fallback to Supabase
            const supabaseLoaded = await loadBrandConfigFromSupabase(gameId);
            if (!supabaseLoaded) {
                // Apply default config if nothing found
                applyBrandConfig({ logoUrl: '', storyText: 'memeplay', mapColor: '#1a1a2e' });
            }
        }
    } else {
        // No gameId - apply defaults
        applyBrandConfig({ logoUrl: '', storyText: 'memeplay', mapColor: '#1a1a2e' });
    }
    
    // Initialize preview
    initPreview();
    
    // Send READY message to parent (editor/player)
    try {
        parent.postMessage({ type: 'SHOOTER_GAME_READY' }, '*');
    } catch (e) {
        // Silent fail
    }
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

function setupMessageListener() {
    window.addEventListener('message', (event) => {
        if (event.data?.type === 'UPDATE_CONFIG') {
            const config = event.data.config || event.data;
            const logoUrl = config.logoUrl || config.fragment_logo_url || '';
            const storyText = config.storyText || config.story_one || 'memeplay';
            const mapColor = config.mapColor || config.map_color || '#1a1a2e';
            const normalizedConfig = { logoUrl, storyText, mapColor };
            Object.assign(BRAND_CONFIG, normalizedConfig);
            applyBrandConfig(normalizedConfig);
        }
    });
}

function loadProgress() {
    highScore = parseInt(localStorage.getItem('shooter_highscore')) || 0;
    highestLevel = parseInt(localStorage.getItem('shooter_highlevel')) || 1;
}

function initPreview() {
    targetColor = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
    topRowIsOffset = false;
    initGrid();
    currentBall = createBall(shooterX, shooterY, getRandomColor());
    nextBall = createBall(0, 0, getRandomColor());
    updateUI();
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    
    const GAME_WIDTH = 720;
    const GAME_HEIGHT = 1000;
    const headerHeight = 60;
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const scaleX = screenWidth / GAME_WIDTH;
    const scaleY = screenHeight / GAME_HEIGHT;
    const scale = Math.min(scaleX, scaleY, 1);
    
    container.style.transform = `scale(${scale})`;
    
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT - headerHeight;
    
    BALL_RADIUS = 27;
    rowHeight = BALL_RADIUS * 1.75;
    
    shooterX = canvas.width / 2;
    shooterY = canvas.height - 100;
    dangerLineY = canvas.height - 180;
}

function setupEventListeners() {
    document.getElementById('start-screen').addEventListener('click', startGame);
    document.getElementById('start-screen').addEventListener('touchstart', (e) => {
        e.preventDefault();
        startGame();
    });
    
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    
    document.getElementById('continue-btn').addEventListener('click', continueToNextLevel);
    document.getElementById('playagain-btn').addEventListener('click', restartGame);
}

// ============== GAME STATES ==============
function startGame() {
    document.getElementById('start-screen').classList.remove('active');
    resetGame();
    gameState = 'playing';
    lastTime = performance.now();
    
    // Send GAME_START message to parent
    const gameId = getGameId();
    if (gameId) {
        parent.postMessage({ type: 'GAME_START', gameId }, '*');
    }
}

function resetGame() {
    score = 0;
    level = 1;
    collectedBalls = 0;
    requiredBalls = 5;
    pushTimer = PUSH_INTERVAL;
    particles = [];
    flyingBall = null;
    topRowIsOffset = false;
    
    targetColor = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
    initGrid();
    currentBall = createBall(shooterX, shooterY, getRandomColor());
    nextBall = createBall(0, 0, getRandomColor());
    updateUI();
}

function restartGame() {
    document.getElementById('gameover-screen').classList.remove('active');
    document.getElementById('levelup-screen').classList.remove('active');
    resetGame();
    gameState = 'playing';
    lastTime = performance.now();
    
    // Send GAME_START message to parent
    const gameId = getGameId();
    if (gameId) {
        parent.postMessage({ type: 'GAME_START', gameId }, '*');
    }
}

function showLevelUp() {
    gameState = 'levelup';
    
    const bonus = level * 100;
    score += bonus;
    
    document.getElementById('completed-level').textContent = level;
    document.getElementById('bonus-points').textContent = bonus;
    document.getElementById('next-level').textContent = level + 1;
    document.getElementById('next-required').textContent = (level + 1) * 5;
    
    const nextColorBall = document.getElementById('next-color-ball');
    const newTargetColor = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
    nextColorBall.style.background = COLOR_HEX[newTargetColor];
    nextColorBall.dataset.color = newTargetColor;
    
    document.getElementById('levelup-screen').classList.add('active');
    
    updateUI();
    saveProgress();
}

function continueToNextLevel() {
    document.getElementById('levelup-screen').classList.remove('active');
    
    level++;
    collectedBalls = 0;
    requiredBalls = level * 5;
    pushTimer = PUSH_INTERVAL;
    topRowIsOffset = false;
    
    const nextColorBall = document.getElementById('next-color-ball');
    targetColor = nextColorBall.dataset.color || BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
    
    initGrid();
    
    gameState = 'playing';
    lastTime = performance.now();
    
    updateUI();
}

function showGameOver() {
    gameState = 'gameover';
    saveProgress();
    document.getElementById('final-score').textContent = score.toLocaleString();
    document.getElementById('gameover-screen').classList.add('active');
    
    // Send GAME_OVER and GAME_SCORE messages to parent
    const gameId = getGameId();
    if (gameId) {
        parent.postMessage({ type: 'GAME_OVER', gameId }, '*');
        parent.postMessage({ type: 'GAME_SCORE', gameId, score, level }, '*');
    }
}

function saveProgress() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('shooter_highscore', highScore);
    }
    if (level > highestLevel) {
        highestLevel = level;
        localStorage.setItem('shooter_highlevel', highestLevel);
    }
}

// ============== GRID MANAGEMENT ==============
function initGrid() {
    grid = [];
    for (let row = 0; row < 6; row++) {
        grid.push(createRow(row));
    }
}

function createRow(rowIndex) {
    const row = [];
    const isOffset = isRowOffset(rowIndex);
    const cols = isOffset ? GRID_COLS - 1 : GRID_COLS;
    
    for (let col = 0; col < cols; col++) {
        if (Math.random() < 0.7) {
            const x = getGridX(col, isOffset);
            const y = getGridY(rowIndex);
            row.push(createBall(x, y, getRandomColor()));
        } else {
            row.push(null);
        }
    }
    
    return row;
}

function getGridX(col, isOffset) {
    const canvasWidth = canvas ? canvas.width : 720;
    const spacing = canvasWidth / GRID_COLS;
    const startX = spacing / 2;
    return startX + col * spacing + (isOffset ? spacing / 2 : 0);
}

function getGridY(row) {
    return BALL_RADIUS + 5 + row * rowHeight;
}

function isRowOffset(rowIndex) {
    if (topRowIsOffset) {
        return rowIndex % 2 === 0;
    } else {
        return rowIndex % 2 === 1;
    }
}

function pushGridDown() {
    if (gameState !== 'playing') return;
    
    topRowIsOffset = !topRowIsOffset;
    const newRow = createNewTopRow(topRowIsOffset);
    grid.unshift(newRow);
    
    if (checkDangerLine()) {
        return;
    }
}

function createNewTopRow(isOffset) {
    const row = [];
    const cols = isOffset ? GRID_COLS - 1 : GRID_COLS;
    
    for (let col = 0; col < cols; col++) {
        if (Math.random() < 0.80) {
            const x = getGridX(col, isOffset);
            const y = getGridY(0);
            row.push(createBall(x, y, getRandomColor()));
        } else {
            row.push(null);
        }
    }
    
    return row;
}

function checkDangerLine() {
    for (let row = 0; row < grid.length; row++) {
        const y = getGridY(row);
        const ballBottom = y + BALL_RADIUS;
        
        if (ballBottom >= dangerLineY) {
            for (let col = 0; col < grid[row].length; col++) {
                if (grid[row][col]) {
                    showGameOver();
                    return true;
                }
            }
        }
    }
    return false;
}

// ============== BALL FUNCTIONS ==============
function createBall(x, y, color) {
    return { x, y, color, radius: BALL_RADIUS, vx: 0, vy: 0 };
}

function getRandomColor() {
    return BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
}

// ============== SHOOTING ==============
function onPointerDown(e) {
    if (gameState !== 'playing' || flyingBall) return;
    isAiming = true;
    updateAim(e.clientX, e.clientY);
}

function onPointerMove(e) {
    if (!isAiming || gameState !== 'playing') return;
    updateAim(e.clientX, e.clientY);
}

function onPointerUp(e) {
    if (!isAiming || gameState !== 'playing') return;
    isAiming = false;
    shoot();
}

function onTouchStart(e) {
    e.preventDefault();
    if (gameState !== 'playing' || flyingBall) return;
    isAiming = true;
    const touch = e.touches[0];
    updateAim(touch.clientX, touch.clientY);
}

function onTouchMove(e) {
    e.preventDefault();
    if (!isAiming || gameState !== 'playing') return;
    const touch = e.touches[0];
    updateAim(touch.clientX, touch.clientY);
}

function onTouchEnd(e) {
    e.preventDefault();
    if (!isAiming || gameState !== 'playing') return;
    isAiming = false;
    shoot();
}

function updateAim(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    const dx = x - shooterX;
    const dy = y - shooterY;
    
    aimAngle = Math.atan2(dy, dx);
    
    if (aimAngle > -0.15) aimAngle = -0.15;
    if (aimAngle < -Math.PI + 0.15) aimAngle = -Math.PI + 0.15;
}

function shoot() {
    if (flyingBall || !currentBall) return;
    
    playShootSound();
    
    flyingBall = {
        ...currentBall,
        x: shooterX,
        y: shooterY - 25,
        vx: Math.cos(aimAngle) * SHOOTING_SPEED,
        vy: Math.sin(aimAngle) * SHOOTING_SPEED
    };
    
    currentBall = { ...nextBall, x: shooterX, y: shooterY };
    nextBall = createBall(0, 0, getRandomColor());
}

// ============== PHYSICS & COLLISION ==============
function updateFlyingBall() {
    if (!flyingBall) return;
    
    flyingBall.x += flyingBall.vx;
    flyingBall.y += flyingBall.vy;
    
    if (flyingBall.x - BALL_RADIUS <= 0) {
        flyingBall.x = BALL_RADIUS;
        flyingBall.vx *= -1;
    }
    if (flyingBall.x + BALL_RADIUS >= canvas.width) {
        flyingBall.x = canvas.width - BALL_RADIUS;
        flyingBall.vx *= -1;
    }
    
    if (flyingBall.y - BALL_RADIUS <= 0) {
        snapToGrid(flyingBall);
        return;
    }
    
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const ball = grid[row][col];
            if (ball) {
                const gridY = getGridY(row);
                const dist = distance(flyingBall.x, flyingBall.y, ball.x, gridY);
                if (dist < BALL_RADIUS * 2) {
                    snapToGrid(flyingBall);
                    return;
                }
            }
        }
    }
}

function snapToGrid(ball) {
    let bestRow = 0;
    let bestCol = 0;
    let minDist = Infinity;
    
    for (let row = 0; row < grid.length + 1; row++) {
        const isOffset = isRowOffset(row);
        const cols = isOffset ? GRID_COLS - 1 : GRID_COLS;
        
        for (let col = 0; col < cols; col++) {
            const x = getGridX(col, isOffset);
            const y = getGridY(row);
            
            if (row < grid.length && grid[row] && grid[row][col]) continue;
            
            const dist = distance(ball.x, ball.y, x, y);
            if (dist < minDist) {
                minDist = dist;
                bestRow = row;
                bestCol = col;
            }
        }
    }
    
    while (grid.length <= bestRow) {
        const isOffset = isRowOffset(grid.length);
        const cols = isOffset ? GRID_COLS - 1 : GRID_COLS;
        grid.push(new Array(cols).fill(null));
    }
    
    const isOffset = isRowOffset(bestRow);
    const newBall = createBall(getGridX(bestCol, isOffset), getGridY(bestRow), ball.color);
    grid[bestRow][bestCol] = newBall;
    
    flyingBall = null;
    
    if (checkDangerLine()) {
        return;
    }
    
    checkMatches(bestRow, bestCol, ball.color);
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// ============== MATCH DETECTION ==============
function checkMatches(row, col, color) {
    const matches = findConnectedBalls(row, col, color);
    
    if (matches.length >= 3) {
        playPopSound();
        
        let removedCount = 0;
        let targetColorCount = 0;
        
        matches.forEach(({ r, c }) => {
            const ball = grid[r][c];
            if (ball) {
                createParticles(ball.x, getGridY(r), ball.color);
                if (ball.color === targetColor) targetColorCount++;
                grid[r][c] = null;
                removedCount++;
            }
        });
        
        const floating = findFloatingBalls();
        floating.forEach(({ r, c }) => {
            const ball = grid[r][c];
            if (ball) {
                createParticles(ball.x, getGridY(r), ball.color);
                if (ball.color === targetColor) targetColorCount++;
                grid[r][c] = null;
                removedCount++;
            }
        });
        
        const points = removedCount * level;
        score += points;
        collectedBalls += targetColorCount;
        
        if (collectedBalls >= requiredBalls) {
            setTimeout(showLevelUp, 500);
        }
        
        updateUI();
    }
}

function findConnectedBalls(startRow, startCol, color) {
    const visited = new Set();
    const matches = [];
    const queue = [{ r: startRow, c: startCol }];
    
    while (queue.length > 0) {
        const { r, c } = queue.shift();
        const key = `${r},${c}`;
        
        if (visited.has(key)) continue;
        if (r < 0 || r >= grid.length) continue;
        if (c < 0 || !grid[r] || c >= grid[r].length) continue;
        
        const ball = grid[r][c];
        if (!ball || ball.color !== color) continue;
        
        visited.add(key);
        matches.push({ r, c });
        
        const neighbors = getNeighbors(r, c);
        neighbors.forEach(n => queue.push(n));
    }
    
    return matches;
}

function getNeighbors(row, col) {
    const isOffset = isRowOffset(row);
    const neighbors = [];
    
    neighbors.push({ r: row, c: col - 1 });
    neighbors.push({ r: row, c: col + 1 });
    
    if (isOffset) {
        neighbors.push({ r: row - 1, c: col });
        neighbors.push({ r: row - 1, c: col + 1 });
    } else {
        neighbors.push({ r: row - 1, c: col - 1 });
        neighbors.push({ r: row - 1, c: col });
    }
    
    if (isOffset) {
        neighbors.push({ r: row + 1, c: col });
        neighbors.push({ r: row + 1, c: col + 1 });
    } else {
        neighbors.push({ r: row + 1, c: col - 1 });
        neighbors.push({ r: row + 1, c: col });
    }
    
    return neighbors;
}

function findFloatingBalls() {
    const connected = new Set();
    
    if (grid.length > 0) {
        for (let c = 0; c < grid[0].length; c++) {
            if (grid[0][c]) {
                floodFillConnected(0, c, connected);
            }
        }
    }
    
    const floating = [];
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            if (grid[r][c] && !connected.has(`${r},${c}`)) {
                floating.push({ r, c });
            }
        }
    }
    
    return floating;
}

function floodFillConnected(row, col, connected) {
    const key = `${row},${col}`;
    if (connected.has(key)) return;
    if (row < 0 || row >= grid.length) return;
    if (col < 0 || !grid[row] || col >= grid[row].length) return;
    if (!grid[row][col]) return;
    
    connected.add(key);
    
    const neighbors = getNeighbors(row, col);
    neighbors.forEach(({ r, c }) => floodFillConnected(r, c, connected));
}

// ============== PARTICLES ==============
function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8 - 2,
            radius: Math.random() * 6 + 2,
            color: COLOR_HEX[color],
            life: 1
        });
    }
}

function updateParticles(dt) {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= dt / 500;
        return p.life > 0;
    });
}

// ============== UI UPDATE ==============
function updateUI() {
    document.querySelector('.level-value').textContent = level;
    document.querySelector('.score-value').textContent = score.toLocaleString();
    document.querySelector('.collect-value').textContent = `${collectedBalls}/${requiredBalls}`;
    document.querySelector('.target-ball').style.background = COLOR_HEX[targetColor];
}

// ============== GAME LOOP ==============
function gameLoop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    
    if (gameState === 'playing') {
        update(dt);
    }
    
    render();
    requestAnimationFrame(gameLoop);
}

function update(dt) {
    pushTimer -= dt;
    
    if (pushTimer <= 0) {
        pushTimer = PUSH_INTERVAL;
        pushGridDown();
        if (gameState !== 'playing') return;
    }
    
    updateFlyingBall();
    updateParticles(dt);
    updateUI();
    checkDangerLine();
}

// ============== RENDERING ==============
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Use mapColor from brand config (with gradient effect)
    const baseColor = BRAND_CONFIG.mapColor || '#1a1a2e';
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, lightenColor(baseColor, 10));
    gradient.addColorStop(0.5, baseColor);
    gradient.addColorStop(1, darkenColor(baseColor, 15));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let row = 0; row < grid.length; row++) {
        const isOffset = isRowOffset(row);
        for (let col = 0; col < grid[row].length; col++) {
            const ball = grid[row][col];
            if (ball) {
                drawBall(getGridX(col, isOffset), getGridY(row), ball.color);
            }
        }
    }
    
    drawDangerLine();
    
    if (flyingBall) {
        drawBall(flyingBall.x, flyingBall.y, flyingBall.color);
    }
    
    if (isAiming && currentBall && !flyingBall) {
        drawAimLine();
    }
    
    drawShooter();
    
    if (currentBall && !flyingBall) {
        drawBall(shooterX, shooterY - 25, currentBall.color);
    }
    
    particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}

function drawBall(x, y, color) {
    const gradient = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, BALL_RADIUS);
    gradient.addColorStop(0, lightenColor(COLOR_HEX[color], 40));
    gradient.addColorStop(0.7, COLOR_HEX[color]);
    gradient.addColorStop(1, darkenColor(COLOR_HEX[color], 30));
    
    ctx.beginPath();
    ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x - 5, y - 5, BALL_RADIUS * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();
}

function drawDangerLine() {
    ctx.strokeStyle = '#ff4757';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, dangerLineY);
    ctx.lineTo(canvas.width, dangerLineY);
    ctx.stroke();
}

function drawShooter() {
    const centerY = shooterY + 10;
    const ringRadius = BALL_RADIUS * 1.6;
    
    ctx.beginPath();
    ctx.arc(shooterX, centerY, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, BALL_RADIUS * 0.15);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(shooterX, centerY, ringRadius - 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    if (logoImg.complete && logoImg.naturalWidth > 0) {
        const logoSize = ringRadius * 1.2;
        ctx.drawImage(logoImg, shooterX - logoSize / 2, centerY - logoSize / 2, logoSize, logoSize);
    }
    
    if (nextBall) {
        const nextX = shooterX + ringRadius * 0.7;
        const nextY = centerY + ringRadius * 0.55;
        const nextRadius = BALL_RADIUS * 0.6;
        
        const gradient = ctx.createRadialGradient(nextX - 3, nextY - 3, 0, nextX, nextY, nextRadius);
        gradient.addColorStop(0, lightenColor(COLOR_HEX[nextBall.color], 40));
        gradient.addColorStop(0.7, COLOR_HEX[nextBall.color]);
        gradient.addColorStop(1, darkenColor(COLOR_HEX[nextBall.color], 30));
        
        ctx.beginPath();
        ctx.arc(nextX, nextY, nextRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(nextX - 3, nextY - 3, nextRadius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
    }
}

function drawAimLine() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    
    let x = shooterX;
    let y = shooterY - 25;
    let dx = Math.cos(aimAngle) * 12;
    let dy = Math.sin(aimAngle) * 12;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    for (let i = 0; i < 40; i++) {
        x += dx;
        y += dy;
        
        if (x < BALL_RADIUS) { x = BALL_RADIUS; dx *= -1; }
        if (x > canvas.width - BALL_RADIUS) { x = canvas.width - BALL_RADIUS; dx *= -1; }
        if (y < BALL_RADIUS) break;
        
        ctx.lineTo(x, y);
    }
    
    ctx.stroke();
    ctx.setLineDash([]);
}

// ============== COLOR UTILITIES ==============
function lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `rgb(${R}, ${G}, ${B})`;
}

function darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `rgb(${R}, ${G}, ${B})`;
}

// ============== START ==============
window.addEventListener('DOMContentLoaded', init);

