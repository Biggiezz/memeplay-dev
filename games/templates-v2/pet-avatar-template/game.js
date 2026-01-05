// ============================================
// PET AVATAR - MemePlay Game Template
// ============================================

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
const TARGET_FPS = 40;
const FRAME_DURATION = 1000 / TARGET_FPS; // ~25ms per frame

// Avatar position (center)
const AVATAR_X = 360;
const AVATAR_Y = 500;
const AVATAR_SCALE = 1.0;

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
    scale: AVATAR_SCALE,
    currentFrame: 0,
    frameCount: 0,
    frameRate: 10, // 10 FPS for sprite animation (chuyển frame mỗi 100ms)
    lastFrameTime: 0
};

// Sprite sheets (will be loaded)
let spriteSheets = {
    idle: null,
    shower: null,
    sing: null,
    fly: null,
    drink: null
};

// Sprite sheet config (sẽ được set khi load)
let spriteConfig = {
    idle: { frames: 8, width: 200, height: 200 },    // Default, sẽ update
    shower: { frames: 12, width: 200, height: 200 },
    sing: { frames: 10, width: 200, height: 200 },
    fly: { frames: 8, width: 200, height: 200 },
    drink: { frames: 10, width: 200, height: 200 }
};

// Background image
let bgImage = null;

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
        const total = 6; // bg, 4 button icons (sprite sheets sẽ load sau)
        
        // Load background
        bgImage = new Image();
        bgImage.onload = () => {
            console.log('[Pet Avatar] Background loaded:', bgImage.naturalWidth, 'x', bgImage.naturalHeight);
            // Render ngay khi background load xong
            if (ctx && canvas) {
                render();
            }
            loaded++;
            if (loaded === total) resolve();
        };
        bgImage.onerror = () => {
            console.warn('Failed to load background');
            loaded++;
            if (loaded === total) resolve();
        };
        bgImage.src = './assets/background.jpg';
        
        // Load button icons
        const buttonNames = ['shower', 'mic', 'fly', 'beer'];
        buttonNames.forEach(name => {
            const icon = new Image();
            icon.onload = () => {
                loaded++;
                if (loaded === total) resolve();
            };
            icon.onerror = () => {
                console.warn(`Failed to load ${name} icon`);
                loaded++;
                if (loaded === total) resolve();
            };
            icon.src = `./assets/buttons/${name}-icon.png`;
            buttonIcons[name] = icon;
        });
    });
}

// Load sprite sheets (sẽ được gọi sau khi có thông tin về sprite sheets)
function loadSpriteSheets() {
    return new Promise((resolve) => {
        const actions = ['idle', 'shower', 'sing', 'fly', 'drink'];
        let loaded = 0;
        const total = actions.length;
        
        actions.forEach(action => {
            const img = new Image();
            img.onload = () => {
                loaded++;
                if (loaded === total) resolve();
            };
            img.onerror = () => {
                console.warn(`Failed to load ${action} sprite sheet`);
                loaded++;
                if (loaded === total) resolve();
            };
            img.src = `./assets/avatar/${action}/sprite.png`;
            spriteSheets[action] = img;
        });
    });
}

// ==================== ANIMATION SYSTEM ====================
function updateAnimation(deltaTime) {
    const currentTime = Date.now();
    
    // Update frame based on frame rate
    if (currentTime - avatarState.lastFrameTime >= 1000 / avatarState.frameRate) {
        const config = spriteConfig[gameState.currentAction];
        if (config && spriteSheets[gameState.currentAction]) {
            avatarState.currentFrame = (avatarState.currentFrame + 1) % config.frames;
        }
        avatarState.lastFrameTime = currentTime;
    }
    
    // Check if action should end
    if (gameState.currentAction !== 'idle') {
        const duration = ACTION_DURATIONS[gameState.currentAction] || 3000;
        if (Date.now() - gameState.actionStartTime >= duration) {
            gameState.currentAction = 'idle';
            avatarState.currentFrame = 0;
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
        // Scale background để fill toàn bộ canvas (720x1000)
        ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        console.log('[Pet Avatar] Background drawn:', bgImage.width, 'x', bgImage.height, '→', CANVAS_WIDTH, 'x', CANVAS_HEIGHT);
    } else {
        // Fallback: solid color
        ctx.fillStyle = '#2a2a3a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        if (bgImage) {
            console.warn('[Pet Avatar] Background not ready:', {
                complete: bgImage.complete,
                naturalWidth: bgImage.naturalWidth,
                naturalHeight: bgImage.naturalHeight
            });
        }
    }
}

function drawAvatar() {
    const action = gameState.currentAction;
    const sprite = spriteSheets[action];
    const config = spriteConfig[action];
    
    if (!sprite || !config || !sprite.complete) {
        // Fallback: draw placeholder với style đẹp hơn
        ctx.save();
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(avatarState.x, avatarState.y + 60, 60, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Avatar placeholder circle
        const gradient = ctx.createRadialGradient(
            avatarState.x, avatarState.y - 20, 0,
            avatarState.x, avatarState.y, 80
        );
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(0.7, '#FFA500');
        gradient.addColorStop(1, '#FF8C00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(avatarState.x, avatarState.y, 80, 0, Math.PI * 2);
        ctx.fill();
        
        // Face
        ctx.fillStyle = '#000';
        // Eyes
        ctx.beginPath();
        ctx.arc(avatarState.x - 20, avatarState.y - 10, 8, 0, Math.PI * 2);
        ctx.arc(avatarState.x + 20, avatarState.y - 10, 8, 0, Math.PI * 2);
        ctx.fill();
        // Mouth
        ctx.beginPath();
        ctx.arc(avatarState.x, avatarState.y + 15, 15, 0, Math.PI);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.restore();
        return;
    }
    
    // Calculate frame position in sprite sheet
    const frameWidth = config.width;
    const frameHeight = config.height;
    const framesPerRow = Math.floor(sprite.width / frameWidth);
    const row = Math.floor(avatarState.currentFrame / framesPerRow);
    const col = avatarState.currentFrame % framesPerRow;
    
    const sx = col * frameWidth;
    const sy = row * frameHeight;
    
    // Draw frame
    ctx.save();
    ctx.translate(avatarState.x, avatarState.y);
    ctx.scale(avatarState.scale, avatarState.scale);
    ctx.drawImage(
        sprite,
        sx, sy, frameWidth, frameHeight,
        -frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight
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
    
    // Debug: Log button positions
    if (Math.random() < 0.01) { // Chỉ log 1% thời gian để không spam
        console.log('[Pet Avatar] Buttons:', Object.values(BUTTONS).map(b => `${b.icon}: (${b.x}, ${b.y})`));
    }
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
    // Check cooldown
    const now = Date.now();
    if (now - gameState.lastActionTime < ACTION_COOLDOWN) {
        return;
    }
    
    // Check which button was clicked
    for (const [key, button] of Object.entries(BUTTONS)) {
        if (isPointInButton(x, y, button)) {
            // Start action (can interrupt current action)
            gameState.currentAction = button.action;
            gameState.actionStartTime = now;
            gameState.lastActionTime = now;
            avatarState.currentFrame = 0;
            
            // Play sound
            playOnionSound(button.action);
            
            // Create initial particles
            if (button.action === 'shower' || button.action === 'sing') {
                createParticles(button.action, avatarState.x, avatarState.y - 50);
            }
            
            break;
        }
    }
}

// ==================== GAME LOOP ====================
let lastTime = performance.now();

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Update
    updateAnimation(deltaTime);
    
    // Render
    render();
    
    // Continue loop
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
    console.log('[Pet Avatar] Loading assets...');
    await loadAssets();
    
    // Load sprite sheets (sẽ load sau khi có thông tin)
    // await loadSpriteSheets();
    
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
    console.log('[Pet Avatar] Canvas:', canvas.width, 'x', canvas.height);
    console.log('[Pet Avatar] Background image:', bgImage ? `${bgImage.naturalWidth}x${bgImage.naturalHeight}` : 'not loaded');
    
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

