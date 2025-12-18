/**
 * SHOOTER - Bubble Shooter Game
 * MemePlay x Binance
 */

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
const PUSH_INTERVAL = 5000; // 5 seconds
const SHOOTING_SPEED = 15;

// ============== GAME STATE ==============
let canvas, ctx;
let gameState = 'start'; // start, playing, levelup, gameover
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

// Binance logo
const binanceLogo = new Image();
binanceLogo.src = 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png';

// Audio context for sounds
let audioCtx = null;

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
function init() {
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
    
    // Initialize preview
    initPreview();
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

function loadProgress() {
    highScore = parseInt(localStorage.getItem('shooter_highscore')) || 0;
    highestLevel = parseInt(localStorage.getItem('shooter_highlevel')) || 1;
}

function initPreview() {
    // Setup initial state for preview
    targetColor = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
    topRowIsOffset = false;
    initGrid();
    currentBall = createBall(shooterX, shooterY, getRandomColor());
    nextBall = createBall(0, 0, getRandomColor());
    updateUI();
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    const header = document.querySelector('.game-header');
    
    // Fixed 720x1000 game size
    const GAME_WIDTH = 720;
    const GAME_HEIGHT = 1000;
    const headerHeight = 60; // Fixed header height
    
    // Calculate scale to fit screen
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const scaleX = screenWidth / GAME_WIDTH;
    const scaleY = screenHeight / GAME_HEIGHT;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
    
    // Apply scale to container
    container.style.transform = `scale(${scale})`;
    
    // Fixed canvas size
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT - headerHeight;
    
    // Fixed ball radius for 12 balls in 720px width
    BALL_RADIUS = 27;
    
    // Update row height based on ball radius
    rowHeight = BALL_RADIUS * 1.75;
    
    // Fixed shooter position
    shooterX = canvas.width / 2;
    shooterY = canvas.height - 100;
    
    // Fixed danger line position
    dangerLineY = canvas.height - 180;
}

function setupEventListeners() {
    // Start screen
    document.getElementById('start-screen').addEventListener('click', startGame);
    document.getElementById('start-screen').addEventListener('touchstart', (e) => {
        e.preventDefault();
        startGame();
    });
    
    // Game controls
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    
    // Buttons
    document.getElementById('continue-btn').addEventListener('click', continueToNextLevel);
    document.getElementById('playagain-btn').addEventListener('click', restartGame);
}

// ============== GAME STATES ==============
function startGame() {
    document.getElementById('start-screen').classList.remove('active');
    resetGame();
    gameState = 'playing';
    lastTime = performance.now();
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
}

function showLevelUp() {
    gameState = 'levelup';
    
    const bonus = level * 100;
    score += bonus;
    
    document.getElementById('completed-level').textContent = level;
    document.getElementById('bonus-points').textContent = bonus;
    document.getElementById('next-level').textContent = level + 1;
    document.getElementById('next-required').textContent = (level + 1) * 5;
    
    // Set next color ball preview
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
    gridOffsetY = 0;
    topRowIsOffset = false;
    
    // Get the color from popup
    const nextColorBall = document.getElementById('next-color-ball');
    targetColor = nextColorBall.dataset.color || BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
    
    // Reset grid
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
    
    // Create 6 initial rows
    for (let row = 0; row < 6; row++) {
        grid.push(createRow(row));
    }
}

function createRow(rowIndex) {
    const row = [];
    const isOffset = isRowOffset(rowIndex);
    const cols = isOffset ? GRID_COLS - 1 : GRID_COLS;
    
    for (let col = 0; col < cols; col++) {
        // 70% chance to have a ball
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
    // Calculate spacing to fill 720px width with 12 balls
    const canvasWidth = canvas ? canvas.width : 720;
    const spacing = canvasWidth / GRID_COLS;
    const startX = spacing / 2;
    return startX + col * spacing + (isOffset ? spacing / 2 : 0);
}

function getGridY(row) {
    return BALL_RADIUS + 5 + row * rowHeight;
}

function isRowOffset(rowIndex) {
    // Calculate if a row should be offset based on topRowIsOffset and row index
    // If topRowIsOffset is true, even rows (0,2,4) are offset, odd rows (1,3,5) are not
    // If topRowIsOffset is false, even rows are not offset, odd rows are offset
    if (topRowIsOffset) {
        return rowIndex % 2 === 0;
    } else {
        return rowIndex % 2 === 1;
    }
}

function pushGridDown() {
    // Don't push if game is over
    if (gameState !== 'playing') return;
    
    // Toggle offset for new row (alternates each time)
    topRowIsOffset = !topRowIsOffset;
    
    // Create new row at top with balls
    const newRow = createNewTopRow(topRowIsOffset);
    grid.unshift(newRow);
    
    // Check if any ball touches danger line
    if (checkDangerLine()) {
        return; // Stop if game over
    }
}

function createNewTopRow(isOffset) {
    const row = [];
    const cols = isOffset ? GRID_COLS - 1 : GRID_COLS;
    
    for (let col = 0; col < cols; col++) {
        // 80% chance to have a ball in new row
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
        // Check if ball center + radius touches or passes danger line
        const ballBottom = y + BALL_RADIUS;
        
        if (ballBottom >= dangerLineY) {
            // Check if there's actually a ball in this row
            for (let col = 0; col < grid[row].length; col++) {
                if (grid[row][col]) {
                    console.log('Game Over! Ball at row', row, 'y:', y, 'bottom:', ballBottom, 'dangerLine:', dangerLineY);
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
    return {
        x: x,
        y: y,
        color: color,
        radius: BALL_RADIUS,
        vx: 0,
        vy: 0
    };
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
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const dx = x - shooterX;
    const dy = y - canvas.height;
    
    aimAngle = Math.atan2(dy, dx);
    
    // Limit angle to upward direction
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
    
    // Wall collision (bounce)
    if (flyingBall.x - BALL_RADIUS <= 0) {
        flyingBall.x = BALL_RADIUS;
        flyingBall.vx *= -1;
    }
    if (flyingBall.x + BALL_RADIUS >= canvas.width) {
        flyingBall.x = canvas.width - BALL_RADIUS;
        flyingBall.vx *= -1;
    }
    
    // Top collision
    if (flyingBall.y - BALL_RADIUS <= 0) {
        snapToGrid(flyingBall);
        return;
    }
    
    // Grid collision
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
    // Find best grid position
    let bestRow = 0;
    let bestCol = 0;
    let minDist = Infinity;
    
    for (let row = 0; row < grid.length + 1; row++) {
        const isOffset = isRowOffset(row);
        const cols = isOffset ? GRID_COLS - 1 : GRID_COLS;
        
        for (let col = 0; col < cols; col++) {
            const x = getGridX(col, isOffset);
            const y = getGridY(row);
            
            // Check if position is empty
            if (row < grid.length && grid[row] && grid[row][col]) continue;
            
            const dist = distance(ball.x, ball.y, x, y);
            if (dist < minDist) {
                minDist = dist;
                bestRow = row;
                bestCol = col;
            }
        }
    }
    
    // Add row if needed
    while (grid.length <= bestRow) {
        const isOffset = isRowOffset(grid.length);
        const cols = isOffset ? GRID_COLS - 1 : GRID_COLS;
        grid.push(new Array(cols).fill(null));
    }
    
    // Place ball
    const isOffset = isRowOffset(bestRow);
    const newBall = createBall(getGridX(bestCol, isOffset), getGridY(bestRow), ball.color);
    grid[bestRow][bestCol] = newBall;
    
    flyingBall = null;
    
    // Check if this placement causes game over
    if (checkDangerLine()) {
        return;
    }
    
    // Check matches
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
                // Create particles
                createParticles(ball.x, getGridY(r), ball.color);
                
                if (ball.color === targetColor) {
                    targetColorCount++;
                }
                
                grid[r][c] = null;
                removedCount++;
            }
        });
        
        // Find and remove floating balls
        const floating = findFloatingBalls();
        floating.forEach(({ r, c }) => {
            const ball = grid[r][c];
            if (ball) {
                createParticles(ball.x, getGridY(r), ball.color);
                
                if (ball.color === targetColor) {
                    targetColorCount++;
                }
                
                grid[r][c] = null;
                removedCount++;
            }
        });
        
        // Update score: balls × level
        const points = removedCount * level;
        score += points;
        
        // Update collected balls
        collectedBalls += targetColorCount;
        
        // Check level completion
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
        
        // Get neighbors (hexagonal grid)
        const neighbors = getNeighbors(r, c);
        neighbors.forEach(n => queue.push(n));
    }
    
    return matches;
}

function getNeighbors(row, col) {
    const isOffset = isRowOffset(row);
    const neighbors = [];
    
    // Same row
    neighbors.push({ r: row, c: col - 1 });
    neighbors.push({ r: row, c: col + 1 });
    
    // Row above
    if (isOffset) {
        neighbors.push({ r: row - 1, c: col });
        neighbors.push({ r: row - 1, c: col + 1 });
    } else {
        neighbors.push({ r: row - 1, c: col - 1 });
        neighbors.push({ r: row - 1, c: col });
    }
    
    // Row below
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
    // Find all balls connected to top
    const connected = new Set();
    
    // Start from top row
    if (grid.length > 0) {
        for (let c = 0; c < grid[0].length; c++) {
            if (grid[0][c]) {
                floodFillConnected(0, c, connected);
            }
        }
    }
    
    // Find balls not connected
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
            x: x,
            y: y,
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
        p.vy += 0.2; // Gravity
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
    // Update push timer
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
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid balls
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
    
    // Particles
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
    
    // Highlight
    ctx.beginPath();
    ctx.arc(x - 5, y - 5, BALL_RADIUS * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();
}

function drawDangerLine() {
    // Simple solid red line - no blinking
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
    
    // Responsive ring size based on ball radius
    const ringRadius = BALL_RADIUS * 1.6;
    
    // Draw white circular ring (shooter base)
    ctx.beginPath();
    ctx.arc(shooterX, centerY, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, BALL_RADIUS * 0.15);
    ctx.stroke();
    
    // Inner glow effect
    ctx.beginPath();
    ctx.arc(shooterX, centerY, ringRadius - 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw Binance logo in center of ring
    if (binanceLogo.complete && binanceLogo.naturalWidth > 0) {
        const logoSize = ringRadius * 1.2;
        ctx.drawImage(
            binanceLogo,
            shooterX - logoSize / 2,
            centerY - logoSize / 2,
            logoSize,
            logoSize
        );
    }
    
    // Draw next ball (small) at bottom right of ring
    if (nextBall) {
        const nextX = shooterX + ringRadius * 0.7;
        const nextY = centerY + ringRadius * 0.55;
        
        // Next ball (smaller size - 60% of main ball)
        const nextRadius = BALL_RADIUS * 0.6;
        const gradient = ctx.createRadialGradient(nextX - 3, nextY - 3, 0, nextX, nextY, nextRadius);
        gradient.addColorStop(0, lightenColor(COLOR_HEX[nextBall.color], 40));
        gradient.addColorStop(0.7, COLOR_HEX[nextBall.color]);
        gradient.addColorStop(1, darkenColor(COLOR_HEX[nextBall.color], 30));
        
        ctx.beginPath();
        ctx.arc(nextX, nextY, nextRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Highlight on next ball
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
    
    // Simulate trajectory with bounces
    for (let i = 0; i < 40; i++) {
        x += dx;
        y += dy;
        
        // Bounce off walls
        if (x < BALL_RADIUS) {
            x = BALL_RADIUS;
            dx *= -1;
        }
        if (x > canvas.width - BALL_RADIUS) {
            x = canvas.width - BALL_RADIUS;
            dx *= -1;
        }
        
        // Stop at top or if hitting grid area
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

