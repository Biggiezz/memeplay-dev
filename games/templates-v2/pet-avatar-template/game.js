// ============================================
// PET AVATAR - MemePlay Game Template
// ============================================

// ==================== DEBUG FLAG ====================
const DEBUG_MODE = false; // Set to false để tắt debug logs trong production

// ==================== IMPORT CONFIG ====================
import { 
    BRAND_CONFIG, 
    loadBrandConfig, 
    getEffectiveLogoUrl,
    getGameId,
    getLogoUrlWithCacheBuster,
    TEMPLATE_ID
} from './config.js';
import { getSupabaseClient } from '../core/supabase-client.js';

// ==================== DOM ELEMENTS ====================
let canvas, ctx;

// ==================== GAME CONSTANTS ====================
const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 1000;

// Avatar position (center)
const AVATAR_X = 360;
const AVATAR_Y = 540; // Đưa lên cao 60px (từ 600 → 540)
const AVATAR_SCALE = 1.7; // Phóng to 70% (từ 1.0 → 1.7 để nhân vật lớn hơn rõ rệt)

// Button configuration
const BUTTON_SIZE = 95; // 56px * 1.7 = 95px (phóng to thêm 70%)

// Button positions: Fixed positions
const BUTTONS = {
    shower: { 
        x: 60,   // Trái trên
        y: 400, 
        icon: 'shower',
        action: 'shower'
    },
    mic: { 
        x: 60,   // Trái dưới
        y: 600, 
        icon: 'mic',
        action: 'sing'
    },
    fly: { 
        x: 660,  // Phải trên
        y: 400, 
        icon: 'fly',
        action: 'fly'
    },
    beer: { 
        x: 660,  // Phải dưới
        y: 600, 
        icon: 'beer',
        action: 'drink'
    }
};

// Action durations (default, sẽ adjust sau)
const ACTION_DURATIONS = {
    idle: 0,        // Loop forever
    shower: 3000,  // 3 seconds
    sing: 4000,    // 4 seconds
    fly: 2500,     // 2.5 seconds
    drink: 3000    // 3 seconds
};

// Cooldown between actions
const ACTION_COOLDOWN = 500; // 0.5 seconds

// ==================== GAME STATE ====================
let gameState = {
    currentAction: 'idle',
    actionStartTime: 0,
    lastActionTime: 0,
    canInteract: true
};

// Avatar state
let avatarState = {
    x: AVATAR_X,
    y: AVATAR_Y,
    scale: AVATAR_SCALE
};

// Background image
let bgImage = null;

// Avatar static image (fallback)
let avatarImage = null;

// Auto-action: pickpocket (11 frames)
const PICKPOCKET_FRAME_COUNT = 11;
const PICKPOCKET_FRAME_DURATION = 350; // 0.35s / frame
let pickpocketFrames = [];
let pickpocketFramesLoaded = false;
let pickpocketAnim = {
    time: 0,
    frameIndex: 0,
    frameDuration: PICKPOCKET_FRAME_DURATION
};

// Auto-action timer
const AUTO_ACTION_INTERVAL = 3000; // 3s chờ giữa các auto-action
let autoActionTimer = 0;
let currentMode = 'idle'; // 'idle' | 'auto'
let currentAutoAction = null; // 'pickpocket' | null

// Button icons
let buttonIcons = {
    shower: null,
    mic: null,
    fly: null,
    beer: null
};

// Particles
let particles = [];
const MAX_PARTICLES = 50;

// Audio context for procedural sounds
let audioContext = null;
let audioUnlocked = false;

// ==================== INITIALIZE AUDIO ====================
function initAudio() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioUnlocked = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }
}

// Unlock audio on first user interaction
function unlockAudio() {
    if (!audioUnlocked && audioContext) {
        audioContext.resume().then(() => {
            audioUnlocked = true;
            console.log('[Pet Avatar] Audio unlocked');
        });
    }
}

// ==================== PROCEDURAL SOUND GENERATION ====================
// Tạo âm thanh giống nhân vật hoạt hình onion (ngắn, độc đáo, vui nhộn)
function playOnionSound(action) {
    if (!audioContext || !audioUnlocked) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Tùy theo action, tạo âm thanh khác nhau
    let frequency = 200;
    let duration = 0.15; // 150ms
    
    switch(action) {
        case 'shower':
            // Âm thanh vui vẻ, cao độ
            frequency = 300 + Math.random() * 100;
            break;
        case 'sing':
            // Âm thanh hát, có melody nhẹ
            frequency = 250 + Math.random() * 150;
            duration = 0.2;
            break;
        case 'fly':
            // Âm thanh nhanh, sắc
            frequency = 400 + Math.random() * 100;
            duration = 0.1;
            break;
        case 'drink':
            // Âm thanh thấp, vui
            frequency = 150 + Math.random() * 100;
            break;
    }
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    // Envelope: attack, sustain, release
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Quick attack
    gainNode.gain.linearRampToValueAtTime(0.2, now + duration * 0.5); // Sustain
    gainNode.gain.linearRampToValueAtTime(0, now + duration); // Release
    
    // Add vibrato for character
    const vibrato = audioContext.createOscillator();
    const vibratoGain = audioContext.createGain();
    vibrato.type = 'sine';
    vibrato.frequency.value = 5; // 5Hz vibrato
    vibratoGain.gain.value = 10; // 10Hz modulation
    vibrato.connect(vibratoGain);
    vibratoGain.connect(oscillator.frequency);
    
    vibrato.start(now);
    vibrato.stop(now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration);
}

// ==================== PARTICLE SYSTEM ====================
function createParticles(type, x, y) {
    const count = type === 'shower' ? 15 : type === 'sing' ? 8 : 5;
    
    for (let i = 0; i < count; i++) {
        if (particles.length >= MAX_PARTICLES) break;
        
        let particle = {
            x: x + (Math.random() - 0.5) * 40,
            y: y + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 2,
            vy: type === 'shower' ? -2 - Math.random() * 2 : (Math.random() - 0.5) * 3,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.02,
            size: type === 'shower' ? 3 + Math.random() * 4 : 4 + Math.random() * 3,
            type: type,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2
        };
        
        // Color based on type
        if (type === 'shower') {
            // Nước trong suốt với khói nhẹ
            particle.color = `rgba(200, 220, 255, 0.6)`;
        } else if (type === 'sing') {
            // Nhạc notes - màu vàng/trắng
            particle.color = Math.random() > 0.5 ? '#FFD700' : '#FFFFFF';
        } else {
            particle.color = '#FFFFFF';
        }
        
        particles.push(particle);
    }
}

function updateParticles(deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        // Update position
        p.x += p.vx * deltaTime * 0.1;
        p.y += p.vy * deltaTime * 0.1;
        
        // Gravity for shower particles
        if (p.type === 'shower') {
            p.vy += 0.05 * deltaTime * 0.1;
        }
        
        // Rotation
        p.rotation += p.rotationSpeed * deltaTime * 0.1;
        
        // Decay
        p.life -= p.decay * deltaTime * 0.1;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        if (p.type === 'sing') {
            // Draw music note shape
            ctx.fillStyle = p.color;
            ctx.font = `${p.size * 3}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('♪', 0, 0);
        } else {
            // Draw circle for water/smoke
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
            gradient.addColorStop(0, p.color);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    });
}

// ==================== LOAD ASSETS ====================
function loadAssets() {
    return new Promise((resolve) => {
        let loaded = 0;
        const total = 7;
        const checkComplete = () => { loaded++; if (loaded === total) resolve(); };
        
        // Load background
        bgImage = new Image();
        bgImage.onload = () => { checkComplete(); if (ctx && canvas) render(); };
        bgImage.onerror = checkComplete;
        bgImage.src = './assets/background.jpg';
        
        // Load pickpocket frames
        let pickLoaded = 0;
        for (let i = 1; i <= PICKPOCKET_FRAME_COUNT; i++) {
            const frame = new Image();
            const frameNum = i.toString().padStart(2, '0');
            frame.onload = () => {
                pickpocketFramesLoaded = pickpocketFramesLoaded || ++pickLoaded === PICKPOCKET_FRAME_COUNT;
                if (pickpocketFramesLoaded) checkComplete();
                if (ctx && canvas) render();
            };
            frame.onerror = () => {
                pickLoaded++;
                if (pickLoaded === PICKPOCKET_FRAME_COUNT) checkComplete();
            };
            frame.src = `./assets/avatar/auto-actions/idle/idle_${frameNum}.png`;
            pickpocketFrames.push(frame);
        }
        
        // Load avatar static image
        avatarImage = new Image();
        avatarImage.onload = checkComplete;
        avatarImage.onerror = checkComplete;
        avatarImage.src = './assets/avatar/avatar.png';
        
        // Load button icons
        ['shower', 'mic', 'fly', 'beer'].forEach(name => {
            const icon = new Image();
            icon.onload = checkComplete;
            icon.onerror = checkComplete;
            icon.src = `./assets/buttons/${name}-icon.png`;
            buttonIcons[name] = icon;
        });
    });
}

// ==================== ANIMATION SYSTEM ====================
function updateAnimation(deltaTime) {
    // Nếu đang ở chế độ idle (hiển thị ảnh gốc)
    if (currentMode === 'idle') {
        // Đếm thời gian chờ auto-action
        autoActionTimer += deltaTime;

        // Sau 3s nếu có auto-action -> kích hoạt pickpocket
        if (autoActionTimer >= AUTO_ACTION_INTERVAL && pickpocketFramesLoaded) {
            currentMode = 'auto';
            currentAutoAction = 'pickpocket';
            pickpocketAnim.time = 0;
            pickpocketAnim.frameIndex = 0;
            autoActionTimer = 0;
            if (DEBUG_MODE) console.log('[AutoAction] ▶️ Start pickpocket');
        }
    }
    // Đang chạy auto-action
    else if (currentMode === 'auto' && currentAutoAction === 'pickpocket' && pickpocketFramesLoaded) {
        pickpocketAnim.time += deltaTime;
        if (pickpocketAnim.time >= pickpocketAnim.frameDuration) {
            pickpocketAnim.time -= pickpocketAnim.frameDuration;
            pickpocketAnim.frameIndex += 1;

            if (pickpocketAnim.frameIndex >= PICKPOCKET_FRAME_COUNT) {
                // Kết thúc auto-action -> quay về idle (ảnh gốc)
                currentMode = 'idle';
                currentAutoAction = null;
                pickpocketAnim.frameIndex = 0;
                pickpocketAnim.time = 0;
                autoActionTimer = 0;
                if (DEBUG_MODE) console.log('[AutoAction] ⏹ End pickpocket -> back to idle');
            }
        }
    }
    
    // Update particles
    updateParticles(deltaTime);
    
    // Create particles during actions
    if (gameState.currentAction === 'shower' || gameState.currentAction === 'sing') {
        if (Math.random() < 0.3) { // 30% chance per frame
            createParticles(
                gameState.currentAction,
                avatarState.x,
                avatarState.y - 50
            );
        }
    }
}

// ==================== RENDERING ====================
function drawBackground() {
    if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
        ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        ctx.fillStyle = '#2a2a3a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
}

function drawAvatar() {
    ctx.save();
    
    let imageToDraw = null;

    // Ưu tiên: auto-action (pickpocket)
    if (currentMode === 'auto' && currentAutoAction === 'pickpocket' && pickpocketFramesLoaded) {
        const frame = pickpocketFrames[pickpocketAnim.frameIndex];
        if (frame && frame.complete && frame.naturalWidth > 0) {
            imageToDraw = frame;
        }
    }
    // Fallback: avatar.png
    if (!imageToDraw && avatarImage && avatarImage.complete && avatarImage.naturalWidth > 0) {
        imageToDraw = avatarImage;
    }

    if (!imageToDraw) {
        ctx.restore();
        return;
    }

    const drawWidth = imageToDraw.naturalWidth * AVATAR_SCALE;
    const drawHeight = imageToDraw.naturalHeight * AVATAR_SCALE;
    
    // Giới hạn tối đa để không vượt quá canvas (giữ tỷ lệ)
    const maxWidth = CANVAS_WIDTH - 100;
    const maxHeight = CANVAS_HEIGHT - 200;
    
    let finalWidth = drawWidth;
    let finalHeight = drawHeight;
    
    if (finalWidth > maxWidth || finalHeight > maxHeight) {
        const scaleX = maxWidth / finalWidth;
        const scaleY = maxHeight / finalHeight;
        const finalScale = Math.min(scaleX, scaleY);
        finalWidth *= finalScale;
        finalHeight *= finalScale;
    }
    
    ctx.drawImage(
        imageToDraw,
        avatarState.x - finalWidth / 2,
        avatarState.y - finalHeight / 2,
        finalWidth,
        finalHeight
    );
    
    ctx.restore();
}

function drawButtons() {
    if (!ctx) {
        console.warn('[Pet Avatar] Canvas context not ready for buttons');
        return;
    }
    
    Object.values(BUTTONS).forEach(button => {
        try {
            const icon = buttonIcons[button.icon];
            
            // Draw button circle với style đẹp hơn
            ctx.save();
            
            // Outer glow
            const gradient = ctx.createRadialGradient(
                button.x, button.y, 0,
                button.x, button.y, BUTTON_SIZE / 2 + 5
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
            gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(button.x, button.y, BUTTON_SIZE / 2 + 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Button circle
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(button.x, button.y, BUTTON_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Inner highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.beginPath();
            ctx.arc(button.x, button.y, BUTTON_SIZE / 2 - 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
            
            // Draw icon - Luôn vẽ icon (không phụ thuộc vào file icon)
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Vẽ icon cho từng button
            if (button.icon === 'fly') {
                // Vẽ icon con ruồi meme bằng canvas
                // Body (màu đen, hình bầu dục)
                ctx.fillStyle = '#1a1a1a';
                ctx.save();
                ctx.translate(button.x, button.y);
                ctx.scale(1.5, 1.0);
                ctx.beginPath();
                ctx.arc(0, 0, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Wings (màu xám nhạt, 2 cánh)
                ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
                // Wing trái
                ctx.save();
                ctx.translate(button.x - 10, button.y - 6);
                ctx.rotate(-0.3);
                ctx.scale(0.7, 1.2);
                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Wing phải
                ctx.save();
                ctx.translate(button.x + 10, button.y - 6);
                ctx.rotate(0.3);
                ctx.scale(0.7, 1.2);
                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Eyes (màu đỏ, 2 mắt meme)
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(button.x - 6, button.y - 4, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(button.x + 6, button.y - 4, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Mouth (màu đỏ, cười meme)
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(button.x, button.y + 6, 8, 0, Math.PI);
                ctx.stroke();
            } else {
                // Emoji cho các button khác (phóng to để rõ hơn)
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `bold ${BUTTON_SIZE * 0.6}px Arial`; // Tăng font size lên 60%
                let emoji = '?';
                switch(button.icon) {
                    case 'shower': emoji = '🚿'; break;
                    case 'mic': emoji = '🎤'; break;
                    case 'beer': emoji = '🍺'; break;
                }
                ctx.fillText(emoji, button.x, button.y);
            }
            ctx.restore();
        } catch (error) {
            console.error(`[Pet Avatar] Error drawing button ${button.icon}:`, error);
            // Vẽ button đơn giản nếu có lỗi
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(button.x, button.y, BUTTON_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    });
}

function render() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw layers (background phải vẽ đầu tiên)
    drawBackground();
    drawParticles();
    drawAvatar();
    
    // Draw buttons (luôn vẽ cuối cùng để ở trên cùng)
    drawButtons();
    
}

// ==================== INPUT HANDLING ====================
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function isPointInButton(x, y, button) {
    const dx = x - button.x;
    const dy = y - button.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= BUTTON_SIZE / 2;
}

function handleClick(x, y) {
    const currentTime = animationTime || performance.now();
    if (currentTime - gameState.lastActionTime < ACTION_COOLDOWN) return;
    
    for (const button of Object.values(BUTTONS)) {
        if (isPointInButton(x, y, button)) {
            gameState.currentAction = button.action;
            gameState.actionStartTime = gameState.lastActionTime = currentTime;
            playOnionSound(button.action);
            if (button.action === 'shower' || button.action === 'sing') {
                createParticles(button.action, avatarState.x, avatarState.y - 50);
            }
            break;
        }
    }
}

// ==================== GAME LOOP ====================
let lastTime = performance.now();
let animationTime = 0;
let frameCount = 0;
let gameLoopStarted = false;

function gameLoop(currentTime) {
    if (!gameLoopStarted) {
        gameLoopStarted = true;
        lastTime = animationTime = currentTime;
    }
    
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    animationTime += deltaTime;
    frameCount++;
    
    if (isNaN(deltaTime) || deltaTime < 0 || deltaTime > 1000) {
        lastTime = currentTime;
        requestAnimationFrame(gameLoop);
        return;
    }
    
    if (DEBUG_MODE && frameCount % 300 === 0) {
        console.log(`[Pet Avatar] 🎮 Game loop: frame=${frameCount}, FPS=${(1000/deltaTime).toFixed(1)}, mode=${currentMode}, autoAction=${currentAutoAction || 'none'}`);
    }
    
    // Check action timeout
    if (gameState.currentAction !== 'idle') {
        const duration = ACTION_DURATIONS[gameState.currentAction] || 0;
        if (duration > 0 && (animationTime - gameState.actionStartTime >= duration)) {
            gameState.currentAction = 'idle';
        }
    }
    
    updateAnimation(deltaTime);
    render();
    requestAnimationFrame(gameLoop);
}

// ==================== INITIALIZATION ====================
async function init() {
    // Get canvas
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    
    ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Initialize audio
    initAudio();
    
    // Unlock audio on first interaction
    canvas.addEventListener('click', unlockAudio, { once: true });
    canvas.addEventListener('touchstart', unlockAudio, { once: true });
    
    // Load config
    await initGameConfig();
    
    // Load assets
    await loadAssets();
    
    
    // Setup input
    canvas.addEventListener('click', (e) => {
        const pos = getMousePos(e);
        handleClick(pos.x, pos.y);
    });
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const pos = getMousePos(touch);
        handleClick(pos.x, pos.y);
    });
    
    // Start game loop
    console.log('[Pet Avatar] Game initialized');
    
    // Render ngay lập tức để hiển thị background
    render();
    
    // Start game loop
    gameLoop(performance.now());
    
    // Send ready message to parent (if in iframe)
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'PET_AVATAR_GAME_READY' }, '*');
    }
}

// ==================== CONFIG LOADING ====================
async function initGameConfig() {
    try {
        let gameId = getGameId();
        
        // Load config từ playtest nếu không có gameId trong URL
        if (!gameId) {
            const playtestKey = 'pet_avatar_brand_config_playtest';
            const playtestConfig = localStorage.getItem(playtestKey);
            if (playtestConfig) {
                try {
                    const parsed = JSON.parse(playtestConfig);
                    Object.assign(BRAND_CONFIG, parsed);
                } catch (e) {
                    console.warn('[Pet Avatar] Failed to parse playtest config:', e);
                }
            }
        } else {
            const hasLocalConfig = loadBrandConfig(gameId);
            
            if (!hasLocalConfig && gameId) {
                await loadBrandConfigFromSupabase(gameId);
            }
        }
    } catch (e) {
        console.warn('[Pet Avatar] initGameConfig error (non-critical):', e);
    }
}

async function loadBrandConfigFromSupabase(gameId) {
    try {
        const supabase = await getSupabaseClient();
        if (!supabase) return false;
        
        const { data, error } = await supabase
            .from('user_created_games')
            .select('*')
            .eq('game_id', gameId)
            .single();
        
        if (error || !data) return false;
        
        // Map Supabase fields to BRAND_CONFIG
        if (data.fragment_logo_url || data.logo_url) {
            BRAND_CONFIG.logoUrl = data.fragment_logo_url || data.logo_url || '';
        }
        if (data.story_one || data.story_text || data.storyText) {
            BRAND_CONFIG.storyText = data.story_one || data.story_text || data.storyText || 'MEMEPLAY';
        }
        
        return true;
    } catch (err) {
        console.warn('[Pet Avatar] Failed to load from Supabase:', err);
        return false;
    }
}

// Start game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

