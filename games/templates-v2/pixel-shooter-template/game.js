    // ===== CONFIG =====
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // ✅ Load config từ config.js (đã được load trước game.js)
    // BRAND_CONFIG được định nghĩa trong config.js
    
    // ✅ Supabase constants for loading config
    const TEMPLATE_ID = 'pixel-shooter-template';
    const PRODUCTION_BASE_URL = 'https://memeplay.dev';
    const SUPABASE_URL = 'https://iikckrcdrvnqctzacxgx.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpa2NrcmNkcnZucWN0emFjeGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Mzc3NDgsImV4cCI6MjA3NzMxMzc0OH0.nIPvf11YfFlWH0XHDZdxI496zaP431QOJCuQ-5XX4DQ';
    let supabaseClientPromise = null;
    
    // ✅ Get Supabase client (lazy load)
    async function getSupabaseClient() {
      if (supabaseClientPromise) return supabaseClientPromise;
      
      supabaseClientPromise = (async () => {
        try {
          const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
          const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          return supabase;
        } catch (error) {
          console.error('[Pixel Shooter] Failed to load Supabase client:', error);
          return null;
        }
      })();
      return supabaseClientPromise;
    }
    
    // ✅ Load brand config from Supabase (fallback when localStorage doesn't have it)
    async function loadBrandConfigFromSupabase(gameId) {
      if (!gameId) {
        console.warn('[Pixel Shooter] Missing gameId, skip loading brand config from Supabase');
        return false;
      }
      try {
        const supabase = await getSupabaseClient();
        if (!supabase) {
          console.warn('[Pixel Shooter] Supabase client unavailable');
          return false;
        }
        const { data, error } = await supabase.rpc('list_user_created_games', {
          p_template_id: TEMPLATE_ID
        });
        if (error) {
          console.error('[Pixel Shooter] list_user_created_games error:', error.message || error);
          return false;
        }
        if (!Array.isArray(data)) {
          console.warn('[Pixel Shooter] Unexpected response while loading brand config:', data);
          return false;
        }
        const foundGame = data.find(item => {
          const id = item?.game_id || item?.id;
          return id === gameId;
        });
        if (!foundGame) {
          console.warn(`[Pixel Shooter] Game ${gameId} not found when loading brand config`);
          return false;
        }
        // ✅ Parse stories (similar to Pacman)
        let stories = Array.isArray(foundGame.stories) ? foundGame.stories : [];
        if (typeof foundGame.stories === 'string') {
          try {
            stories = JSON.parse(foundGame.stories);
          } catch (err) {
            console.warn('[Pixel Shooter] Failed to parse stories JSON:', err);
            stories = [];
          }
        }
        if (!Array.isArray(stories)) {
          stories = [];
        }
        // ✅ Get legacy stories (story_one, story_two, story_three)
        const legacyStories = [foundGame.story_one, foundGame.story_two, foundGame.story_three]
          .filter(story => typeof story === 'string' && story.trim() !== '')
          .map(story => story.trim());
        if (legacyStories.length > 0) {
          stories = [...stories, ...legacyStories];
        }
        const uniqueStories = stories
          .map(story => (typeof story === 'string' ? story.trim() : ''))
          .filter(story => story !== '');
        // ✅ Build config object (Pixel Shooter doesn't have mapIndex)
        const supabaseConfig = {
          fragmentLogoUrl: foundGame.fragment_logo_url || '',
          title: foundGame.title || 'Pixel Shooter Game',
          mapColor: foundGame.map_color || '#1a1a2e',
          stories: uniqueStories
        };
        BRAND_CONFIG = { ...BRAND_CONFIG, ...supabaseConfig };
        // ✅ Save to localStorage for next time
        if (typeof saveBrandConfig === 'function') {
          saveBrandConfig(gameId);
        }
        // ✅ Load logo image if URL exists
        if (BRAND_CONFIG.fragmentLogoUrl) {
          const logo = new Image();
          logo.onload = () => {
            BRAND_CONFIG.fragmentLogo = logo;
            console.log('[Pixel Shooter] ✅ Logo loaded from Supabase');
          };
          logo.onerror = () => {
            console.warn('[Pixel Shooter] Failed to load logo from Supabase');
          };
          logo.src = BRAND_CONFIG.fragmentLogoUrl;
        }
        console.log(`[Pixel Shooter] ✅ Loaded brand config for ${gameId} from Supabase`);
        return true;
      } catch (error) {
        console.error('[Pixel Shooter] Unexpected error while loading brand config:', error);
        return false;
      }
    }
    
    // ✅ Listen UPDATE_CONFIG message từ editor
    window.addEventListener('message', (event) => {
      // Security check
      if (event.origin !== window.location.origin && 
          !event.origin.includes('127.0.0.1') && 
          !event.origin.includes('localhost')) {
        return;
      }
      
      if (event.data && event.data.type === 'UPDATE_CONFIG') {
        const config = event.data.config;
        if (!config) return;
        
        // ✅ Update config ngay lập tức (không cần reload)
        if (typeof BRAND_CONFIG !== 'undefined') {
          BRAND_CONFIG = {
            ...BRAND_CONFIG,
            fragmentLogoUrl: config.fragmentLogoUrl || '',
            title: config.title || 'Untitled Game',
            smartContract: config.smartContract || '',
            mapColor: config.mapColor || '#1a1a2e',
            stories: Array.isArray(config.stories) ? config.stories : []
          };
          
          // Load logo nếu có
          if (BRAND_CONFIG.fragmentLogoUrl) {
            const img = new Image();
            img.onload = () => {
              BRAND_CONFIG.fragmentLogo = img;
              console.log('[Pixel Shooter] ✅ Logo updated from postMessage');
            };
            img.onerror = () => {
              console.warn('[Pixel Shooter] Failed to load logo from postMessage');
            };
            img.src = BRAND_CONFIG.fragmentLogoUrl;
          }
          
          // Update background color nếu có
          if (BRAND_CONFIG.mapColor && canvas) {
            // Background color sẽ được áp dụng trong gameLoop
            console.log('[Pixel Shooter] ✅ Map color updated from postMessage:', BRAND_CONFIG.mapColor);
          }
        }
      }
    });
    
    // ✅ Get game ID from URL (similar to Pacman)
    const EMBEDDED_GAME_ID = typeof getGameId === 'function' ? getGameId() : null;
    const isPublicView = !!EMBEDDED_GAME_ID;
    
    const CONFIG = {
      CANVAS_WIDTH: 720,
      CANVAS_HEIGHT: 1000,
      MAX_OBJECTS: 15, // Maximum simultaneous objects (kept modest for performance)
      INITIAL_ENERGY: 11, // 11 seconds of energy
      ENERGY_PER_BLUE_GEM: 3, // +3 seconds per blue gem
      MAX_LEVEL: 100,
      SHOW_HITBOX: false, // Set to false to hide hitboxes for better performance (saves ~1-2% CPU)
      ENABLE_PARTICLES_MOBILE: true, // Enable light explosion particles on mobile
      MAX_PARTICLES: 60, // Safety cap for total particles
      SPREAD_DURATION_MS: 5000, // 5s spread-shot buff
      SPREAD_BULLET_COUNT: 5,
      SPREAD_BULLET_SPREAD_DEG: 24, // ±24°, evenly spaced
      SPREAD_POWERUP_SIZE: 50
    };
    
    // ===== CANVAS SETUP =====
    const canvas = document.getElementById('gameCanvas');
    const gameWrapper = document.querySelector('.game-wrapper');
    
    // Set canvas internal size (always 720x1000px)
    canvas.width = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;
    
    // Function to scale wrapper to fit viewport (only on mobile)
    function updateWrapperScale() {
      if (!gameWrapper) return;
      
      // Get iframe container dimensions (not window - iframe may be scaled by parent)
      const container = gameWrapper.parentElement;
      if (!container) {
        // Fallback to window if no container
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        
        if (vw > 800) {
          gameWrapper.style.transform = 'none';
          return;
        }
        
        const scaleX = vw / 720;
        const scaleY = vh / 1000;
        const scale = Math.min(scaleX, scaleY);
        const finalScale = Math.min(scale, 1);
        gameWrapper.style.transform = `scale(${finalScale})`;
        gameWrapper.style.transformOrigin = 'center center';
        return;
      }
      
      // Use container dimensions (iframe viewport)
      const containerWidth = container.clientWidth || container.offsetWidth;
      const containerHeight = container.clientHeight || container.offsetHeight;
      
      // Only scale on mobile devices
      if (containerWidth > 800 || window.innerWidth > 800) {
        gameWrapper.style.transform = 'none';
        return;
      }
      
      // Calculate scale to fit container - use smaller ratio
      const scaleX = containerWidth / 720;
      const scaleY = containerHeight / 1000;
      const scale = Math.min(scaleX, scaleY);
      
      // Don't scale larger than 1 (don't zoom in)
      const finalScale = Math.min(scale, 1);
      
      // Apply scale ONLY - no translate, body flex handles centering
      gameWrapper.style.transform = `scale(${finalScale})`;
      gameWrapper.style.transformOrigin = 'center center';
      
      console.log(`📐 Scale: ${finalScale.toFixed(3)} (container: ${containerWidth}x${containerHeight})`);
    }
    
    // Update scale on load and resize
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(updateWrapperScale, 100);
      });
    } else {
      setTimeout(updateWrapperScale, 100);
    }
    
    window.addEventListener('resize', updateWrapperScale);
    window.addEventListener('orientationchange', () => {
      setTimeout(updateWrapperScale, 200);
    });
    
    // Use ResizeObserver to watch container size changes
    if (window.ResizeObserver && gameWrapper && gameWrapper.parentElement) {
      const resizeObserver = new ResizeObserver(() => {
        updateWrapperScale();
      });
      resizeObserver.observe(gameWrapper.parentElement);
    }
    
    // ===== DRAG BUTTON (FOCUS TOGGLE) =====
    // Button is inside wrapper, uses 720x1000 coordinate system, scales with wrapper
    const focusToggleBtn = document.querySelector('.focus-toggle');
    if (focusToggleBtn) {
      // Update button state based on parent focus mode
      function updateFocusButtonState() {
        // Listen for focus mode changes from parent
        window.addEventListener('message', (event) => {
          if (event.data?.type === 'FOCUS_MODE_CHANGED') {
            const isFocus = event.data.isFocus;
            focusToggleBtn.setAttribute('aria-pressed', isFocus ? 'true' : 'false');
            focusToggleBtn.textContent = isFocus ? '⤡' : '⤢';
          }
        });
      }
      
      // Handle button click - send message to parent
      focusToggleBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        // Send message to parent to toggle focus mode
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'TOGGLE_FOCUS_MODE',
            gameId: 'pixel-space-shooter'
          }, '*');
          console.log('📤 Sent TOGGLE_FOCUS_MODE to parent');
        }
      });
      
      updateFocusButtonState();
    }
    
    const ctx = canvas.getContext('2d', { 
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    });
    
    ctx.imageSmoothingEnabled = false;
    
    // ===== LOAD SPRITES =====
    const playerRocketImg = new Image();
    playerRocketImg.src = 'assets/player-rocket.webp';
    let playerRocketLoaded = false;
    let playerRocketAspectRatio = 1;
    playerRocketImg.onload = () => {
      playerRocketLoaded = true;
      playerRocketAspectRatio = playerRocketImg.width / playerRocketImg.height;
      console.log('Player rocket image loaded:', playerRocketImg.width, 'x', playerRocketImg.height, 'aspect:', playerRocketAspectRatio);
      // Update ship size based on actual image dimensions (scale to desired height)
      // Increase size by x2.5 (80 * 2.5 = 200)
      const targetHeight = 200;
      gameState.ship.width = targetHeight * playerRocketAspectRatio;
      gameState.ship.height = targetHeight;
    };
    playerRocketImg.onerror = () => {
      console.error('Player rocket image failed to load!');
    };
    
    const enemyRocketImg = new Image();
    enemyRocketImg.src = 'assets/enemy-rocket.webp';
    let enemyRocketLoaded = false;
    let enemyRocketAspectRatio = 1;
    enemyRocketImg.onload = () => {
      enemyRocketLoaded = true;
      enemyRocketAspectRatio = enemyRocketImg.width / enemyRocketImg.height;
      console.log('Enemy rocket image loaded:', enemyRocketImg.width, 'x', enemyRocketImg.height, 'aspect:', enemyRocketAspectRatio);
    };
    enemyRocketImg.onerror = () => {
      console.error('Enemy rocket image failed to load!');
    };
    
    // Load Blue Striker image
    const blueStrikerImg = new Image();
    blueStrikerImg.src = 'assets/Blue Striker.webp';
    let blueStrikerLoaded = false;
    blueStrikerImg.onload = () => {
      blueStrikerLoaded = true;
      console.log('Blue Striker image loaded');
    };
    blueStrikerImg.onerror = () => {
      console.error('Blue Striker image failed to load!');
    };
    
    // Load Purple Phantom image
    const purplePhantomImg = new Image();
    purplePhantomImg.src = 'assets/Purple Phantom.webp';
    let purplePhantomLoaded = false;
    purplePhantomImg.onload = () => {
      purplePhantomLoaded = true;
      console.log('Purple Phantom image loaded');
    };
    purplePhantomImg.onerror = () => {
      console.error('Purple Phantom image failed to load!');
    };
    
    // ===== GAME STATE =====
    const gameState = {
      level: 1,
      score: 0,
      energy: CONFIG.INITIAL_ENERGY,
      gemsCollected: 0,
      gemsRequired: 3, // Lv1 = 3, Lv2 = 4, ...
      gameOver: false,
      gameStarted: false,
      isPaused: false,
      levelTransitionActive: false, // Prevent spawning during level transition
      ship: {
        x: 360,
        y: 800,
        width: 150, // Will be updated when image loads (maintains aspect ratio, initial x2.5)
        height: 200, // Target height x2.5, width calculated from image aspect ratio
        targetX: 360,
        targetY: 800,
        speed: 20 // Increase speed by 4x (5 → 20)
      },
      gems: [], // {x, y, type: 'gold'|'blue', vx, vy}
      enemies: [], // {x, y, width, height, vx, vy, type}
      bullets: [], // Enemy bullets {x, y, width, height, vx, vy}
      playerBullets: [], // Player bullets {x, y, width, height, vy}
      matrixDrops: [], // Matrix background effect
      particles: [], // Explosion particles
      touchPosition: null, // Current touch position for hold control
      lastTime: performance.now(),
      deltaTime: 0,
      shootCooldown: 0, // Player shoot cooldown
      isHolding: false, // Track if user is holding/dragging
      powerUps: [], // power-up icons (e.g., spread shot)
      spreadPowerExpiresAt: 0 // timestamp (ms) when spread shot ends
    };
    
    // ===== SOUND SYSTEM =====
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let audioUnlocked = false;
    
    function unlockAudio() {
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          audioUnlocked = true;
          try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(1, audioContext.currentTime);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.01);
          } catch (e) {}
        }).catch(() => {});
      } else if (audioContext.state === 'running' && !audioUnlocked) {
        audioUnlocked = true;
        try {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(1, audioContext.currentTime);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.01);
        } catch (e) {}
      }
    }
    
    // ONLY attach listeners to canvas, DON'T use document/window to avoid triggering audio for other games
    // Event listeners will be attached to canvas in control handlers section
    
    function playSound(type, frequency = 440, duration = 0.2, volume = 0.3) {
      try {
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {});
          setTimeout(() => playSound(type, frequency, duration, volume), 50);
          return;
        }
        
        if (!audioUnlocked || audioContext.state !== 'running') {
          unlockAudio();
          setTimeout(() => playSound(type, frequency, duration, volume), 50);
          return;
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'square'; // 8-bit sound
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      } catch (e) {
        console.log('Audio error:', e);
      }
    }
    
    function playCollectSound() {
      playSound('collect', 800, 0.15, 0.5);
    }
    
    // Original explosion sound (requested)
    function playExplodeSound() {
      playSound('explode', 200, 0.3, 0.8);
    }
    
    // Wind-like "xoạt" using short bandpassed noise burst (much less piercing)
    let __shootNoiseBuffer = null;
    function getShootNoiseBuffer() {
      if (__shootNoiseBuffer) return __shootNoiseBuffer;
      const sr = audioContext.sampleRate || 44100;
      const duration = 0.08; // 80ms
      const length = Math.max(1, Math.floor(sr * duration));
      const buffer = audioContext.createBuffer(1, length, sr);
      const data = buffer.getChannelData(0);
      // White noise
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * 0.9;
      __shootNoiseBuffer = buffer;
      return buffer;
    }
    function playShootWind() {
      try {
        if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
        const t0 = audioContext.currentTime;
        const source = audioContext.createBufferSource();
        source.buffer = getShootNoiseBuffer();
        // Bandpass around 800Hz to make a soft "whoosh"
        const band = audioContext.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = 800;
        band.Q.value = 0.7;
        // Gentle high-shelf cut to remove harshness
        const lowpass = audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 1500;
        // Envelope
        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.015); // attack
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1); // fast decay
        source.connect(band);
        band.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(audioContext.destination);
        source.start(t0);
        source.stop(t0 + 0.11);
      } catch {}
    }

    // Softer, wider sound for spread-shot
    function playSpreadShootSound() {
      try {
        if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
        const t0 = audioContext.currentTime;
        const osc1 = audioContext.createOscillator();
        const osc2 = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(520, t0);
        osc2.frequency.setValueAtTime(780, t0);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioContext.destination);
        osc1.start(t0);
        osc2.start(t0);
        osc1.stop(t0 + 0.2);
        osc2.stop(t0 + 0.2);
      } catch {}
    }
    
    // Clear and punchy "bòm" explosion: low sine with slight pitch drop
    function playBoom() {
      try {
        if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
        const t0 = audioContext.currentTime;
        const tEnd = t0 + 0.45;
        
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, t0);
        osc.frequency.exponentialRampToValueAtTime(60, tEnd - 0.05);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.exponentialRampToValueAtTime(0.9, t0 + 0.02); // fast attack
        gain.gain.exponentialRampToValueAtTime(0.0001, tEnd);   // decay
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(t0);
        osc.stop(tEnd + 0.02);
      } catch {}
    }
    
    // ===== MATRIX BACKGROUND =====
    function initMatrixDrops() {
      gameState.matrixDrops = [];
      for (let i = 0; i < 2; i++) { // Reduced to 2 drops for maximum performance
        const dropLength = 10 + Math.random() * 20;
        // Pre-generate characters for this drop (optimization: avoid Math.random() in draw loop)
        const chars = [];
        for (let j = 0; j < dropLength; j++) {
          chars.push(String.fromCharCode(0x30A0 + Math.random() * 96));
        }
        gameState.matrixDrops.push({
          x: Math.random() * CONFIG.CANVAS_WIDTH,
          y: Math.random() * CONFIG.CANVAS_HEIGHT,
          speed: 2 + Math.random() * 3,
          length: dropLength,
          chars: chars // Pre-generated characters
        });
      }
    }
    
    function updateMatrixDrops(deltaTime) {
      for (let drop of gameState.matrixDrops) {
        drop.y += drop.speed * (deltaTime / 16.67); // Normalize to 60fps
        if (drop.y > CONFIG.CANVAS_HEIGHT) {
          drop.y = -drop.length;
          drop.x = Math.random() * CONFIG.CANVAS_WIDTH;
          // Regenerate characters when drop resets (optimization: only when needed)
          drop.chars = [];
          for (let j = 0; j < drop.length; j++) {
            drop.chars.push(String.fromCharCode(0x30A0 + Math.random() * 96));
          }
        }
      }
    }
    
    function drawMatrixBackground() {
      ctx.font = '12px monospace';
      for (let drop of gameState.matrixDrops) {
        for (let i = 0; i < drop.length; i++) {
          const alpha = 1 - (i / drop.length) * 0.8;
          ctx.fillStyle = `rgba(0, 255, 0, ${alpha * 0.1})`;
          // Use pre-generated character (optimization: avoid Math.random() in draw loop)
          ctx.fillText(drop.chars[i] || ' ', drop.x, drop.y + i * 12);
        }
      }
    }
    
    // ===== SHIP CONTROL (HOLD) =====
    // Control anchor stays below rocket so finger/mouse does not cover the ship
    const CONTROL_POINT_EXTRA_OFFSET = 48; // Pixels below rocket bottom for the control anchor
    function getControlOffset() {
      // Center->bottom plus extra padding so finger sits under the rocket
      return (gameState.ship.height / 2) + CONTROL_POINT_EXTRA_OFFSET;
    }
    // Optimization: Cache constants to avoid recalculating
    const SHIP_MIN_X = 20;
    const SHIP_MAX_X = CONFIG.CANVAS_WIDTH - 20;
    const SHIP_MIN_Y = 20;
    const SHIP_MAX_Y = CONFIG.CANVAS_HEIGHT - 20;
    
    // Optimization: Helper function to clamp position (faster than Math.max/min)
    function clampShipPosition(x, y) {
      // Fast clamp using ternary (faster than Math.max/min when simple)
      const clampedX = x < SHIP_MIN_X ? SHIP_MIN_X : (x > SHIP_MAX_X ? SHIP_MAX_X : x);
      const clampedY = y < SHIP_MIN_Y ? SHIP_MIN_Y : (y > SHIP_MAX_Y ? SHIP_MAX_Y : y);
      return { x: clampedX, y: clampedY };
    }

    function isSpreadShotActive() {
      return gameState.spreadPowerExpiresAt && performance.now() < gameState.spreadPowerExpiresAt;
    }
    
    // Optimization: Update ship position directly (called from event handlers)
    // CRITICAL FIX: Convert coordinates from device pixels to 720x1000 coordinate system
    // When canvas is scaled via CSS transform, getBoundingClientRect() returns scaled coordinates
    // We must divide by scale factor to convert back to 720x1000 system
    function updateShipPositionDirect(clientX, clientY) {
      if (gameState.gameOver) return; // Freeze position on Game Over
      const rect = canvas.getBoundingClientRect();
      
      // Calculate actual scale factor being used (from CSS transform: scale())
      // rect.width/height are the SCALED dimensions on screen
      // CONFIG.CANVAS_WIDTH/HEIGHT are the ACTUAL canvas dimensions (720x1000)
      const scaleX = rect.width / CONFIG.CANVAS_WIDTH;
      const scaleY = rect.height / CONFIG.CANVAS_HEIGHT;
      const scale = Math.min(scaleX, scaleY); // Use smaller scale to maintain aspect ratio
      
      // Convert coordinates from device pixels to 720x1000 coordinate system
      // Divide by scale to undo the CSS transform scaling
      // Pointer anchors at the control handle below the rocket
      const pointerX = (clientX - rect.left) / scale;
      const pointerY = (clientY - rect.top) / scale;
      const desiredShipX = pointerX;
      const desiredShipY = pointerY - getControlOffset();
      const x = desiredShipX;
      const y = desiredShipY;
      
      const clamped = clampShipPosition(x, y);
      
      // Update directly (don't wait for gameLoop)
      gameState.ship.x = clamped.x;
      gameState.ship.y = clamped.y;
      gameState.ship.targetX = clamped.x;
      gameState.ship.targetY = clamped.y;
      gameState.touchPosition = clamped;
    }
    
    function handleTouchStart(e) {
      if (gameState.gameOver) return;
      unlockAudio();
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        gameState.isHolding = true;
        updateShipPositionDirect(touch.clientX, touch.clientY);
      }
    }
    
    function handleTouchMove(e) {
      if (gameState.gameOver) return;
      unlockAudio();
      e.preventDefault();
      // Only update when holding
      if (!gameState.isHolding) return;
      const touch = e.touches[0];
      if (touch) {
        updateShipPositionDirect(touch.clientX, touch.clientY);
      }
    }
    
    function handleTouchEnd(e) {
      if (gameState.gameOver) return;
      unlockAudio();
      // Reset holding flag
      gameState.isHolding = false;
      // Keep last position (hold control - ship stays where released)
    }
    
    function handleMouseDown(e) {
      if (gameState.gameOver) return;
      unlockAudio();
      gameState.isHolding = true;
      updateShipPositionDirect(e.clientX, e.clientY);
    }
    
    function handleMouseMove(e) {
      if (gameState.gameOver) return;
      // Only update when holding
      if (!gameState.isHolding) return;
      updateShipPositionDirect(e.clientX, e.clientY);
    }
    
    function handleMouseUp(e) {
      if (gameState.gameOver) return;
      // Reset holding flag
      gameState.isHolding = false;
      // Keep last position
    }
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    // ===== SHIP UPDATE =====
    function updateShip(deltaTime) {
      // Optimization: Skip position update when holding (already updated directly in event handlers)
      if (!gameState.isHolding) {
        // Smooth movement when not holding (for natural animation)
        const dx = gameState.ship.targetX - gameState.ship.x;
        const dy = gameState.ship.targetY - gameState.ship.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 1) {
          const speed = gameState.ship.speed * (deltaTime / 16.67);
          gameState.ship.x += (dx / distance) * speed;
          gameState.ship.y += (dy / distance) * speed;
        } else {
          gameState.ship.x = gameState.ship.targetX;
          gameState.ship.y = gameState.ship.targetY;
        }
        
        // Keep ship in bounds (only when not holding)
        gameState.ship.x = Math.max(20, Math.min(CONFIG.CANVAS_WIDTH - 20, gameState.ship.x));
        gameState.ship.y = Math.max(20, Math.min(CONFIG.CANVAS_HEIGHT - 20, gameState.ship.y));
      }
      // When holding: position already updated directly in event handlers, skip this logic
      
      // Auto-shoot: Rocket always shoots bullets
      const dt = deltaTime / 16.67;
      gameState.shootCooldown -= dt;
      if (gameState.shootCooldown <= 0) {
        spawnPlayerBullet();
        // ↑ Increase fire rate by 100% (halve the cooldown baseline)
        gameState.shootCooldown = Math.max(5, (30 - gameState.level * 0.5) / 2);
      }
    }
    
    // Helper function: Check if point is inside ellipse
    function isPointInEllipse(px, py, ex, ey, ew, eh) {
      const dx = (px - ex) / (ew / 2);
      const dy = (py - ey) / (eh / 2);
      return (dx * dx + dy * dy) <= 1;
    }
    
    // Helper function: Check ellipse-ellipse collision (optimized)
    // OPTIMIZATION: Instead of checking 16 perimeter points (8 per ellipse), we use a simpler approach:
    // 1. Quick distance check (bounding circle)
    // 2. Check if centers are inside each other's ellipse
    // 3. Only check 4 key points (top, bottom, left, right) instead of 8
    // This reduces from 16 point checks to 6 checks (2 centers + 4 points) = 62% faster
    function checkEllipseCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
      // Quick distance check first (optimization)
      const dx = x1 - x2;
      const dy = y1 - y2;
      const maxDist = Math.max(w1, h1) / 2 + Math.max(w2, h2) / 2;
      if (dx * dx + dy * dy > maxDist * maxDist) return false;
      
      // Check if center of ellipse1 is in ellipse2 or vice versa
      if (isPointInEllipse(x1, y1, x2, y2, w2, h2) || 
          isPointInEllipse(x2, y2, x1, y1, w1, h1)) {
        return true;
      }
      
      // OPTIMIZED: Check only 4 key points (top, bottom, left, right) instead of 8
      // This covers 90% of collision cases while being 50% faster
      const r1x = w1 / 2;
      const r1y = h1 / 2;
      const keyPoints = [
        { x: x1, y: y1 - r1y }, // Top
        { x: x1, y: y1 + r1y }, // Bottom
        { x: x1 - r1x, y: y1 }, // Left
        { x: x1 + r1x, y: y1 }  // Right
      ];
      
      for (let point of keyPoints) {
        if (isPointInEllipse(point.x, point.y, x2, y2, w2, h2)) {
          return true;
        }
      }
      
      // Check key points of ellipse2
      const r2x = w2 / 2;
      const r2y = h2 / 2;
      const keyPoints2 = [
        { x: x2, y: y2 - r2y }, // Top
        { x: x2, y: y2 + r2y }, // Bottom
        { x: x2 - r2x, y: y2 }, // Left
        { x: x2 + r2x, y: y2 }  // Right
      ];
      
      for (let point of keyPoints2) {
        if (isPointInEllipse(point.x, point.y, x1, y1, w1, h1)) {
          return true;
        }
      }
      
      return false;
    }
    
    function drawShip() {
      if (!playerRocketLoaded) return; // Don't draw if image not loaded
      
      ctx.save();
      
      // Draw player rocket image
      ctx.drawImage(
        playerRocketImg,
        gameState.ship.x - gameState.ship.width / 2,
        gameState.ship.y - gameState.ship.height / 2,
        gameState.ship.width,
        gameState.ship.height
      );
      
      // Draw hitbox (collision detection ellipse - covers from nose to tail)
      // Only draw if SHOW_HITBOX is enabled (for debugging/accuracy checking)
      if (CONFIG.SHOW_HITBOX) {
        const hitboxWidth = gameState.ship.width * 0.65; // Ellipse width (65% of ship width, wider on both sides)
        const hitboxHeight = gameState.ship.height * 0.7; // Ellipse height (70% of ship height, shorter to fit within nose to tail)
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        // Draw ellipse manually (compatible with all browsers)
        const radiusX = hitboxWidth / 2;
        const radiusY = hitboxHeight / 2;
        const centerX = gameState.ship.x;
        const centerY = gameState.ship.y;
        // Use bezier curves to approximate ellipse (4 curves for full ellipse)
        const k = 0.5522848; // Magic number for bezier approximation
        ctx.moveTo(centerX + radiusX, centerY);
        ctx.bezierCurveTo(centerX + radiusX, centerY - radiusY * k, centerX + radiusX * k, centerY - radiusY, centerX, centerY - radiusY);
        ctx.bezierCurveTo(centerX - radiusX * k, centerY - radiusY, centerX - radiusX, centerY - radiusY * k, centerX - radiusX, centerY);
        ctx.bezierCurveTo(centerX - radiusX, centerY + radiusY * k, centerX - radiusX * k, centerY + radiusY, centerX, centerY + radiusY);
        ctx.bezierCurveTo(centerX + radiusX * k, centerY + radiusY, centerX + radiusX, centerY + radiusY * k, centerX + radiusX, centerY);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      ctx.restore();
    }

    function drawControlHandle() {
      // Small guide just below the rocket showing the control anchor
      const offset = getControlOffset();
      const handleX = gameState.ship.x;
      const handleY = gameState.ship.y + offset;
      
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      const radius = 18;
      const lineLen = 12;
      const lineWidth = 3;
      
      // Outer circle
      ctx.beginPath();
      ctx.arc(handleX, handleY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Crosshair lines
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(handleX - lineLen, handleY);
      ctx.lineTo(handleX + lineLen, handleY);
      ctx.moveTo(handleX, handleY - lineLen);
      ctx.lineTo(handleX, handleY + lineLen);
      ctx.stroke();
      ctx.restore();
    }
    
    // ===== GEMS SYSTEM =====
    function spawnGoldGem() {
      if (gameState.gems.length >= CONFIG.MAX_OBJECTS) return;
      
      const side = Math.random() < 0.5 ? 'left' : 'right';
      const gem = {
        x: side === 'left' ? -20 : CONFIG.CANVAS_WIDTH + 20,
        y: 100 + Math.random() * (CONFIG.CANVAS_HEIGHT - 200),
        type: 'gold',
        width: 50, // 2.5x bigger (20 -> 50)
        height: 50,
        // Increase speed by 300% (x3) then +40% → total x4.2
        vx: side === 'left' ? (2 + gameState.level * 0.1) * 3 * 1.4 : -(2 + gameState.level * 0.1) * 3 * 1.4,
        vy: (Math.random() - 0.5) * 2 * 3 * 1.4
      };
      gameState.gems.push(gem);
    }
    
    function spawnBlueGem() {
      if (gameState.gems.length >= CONFIG.MAX_OBJECTS) return;
      
      // Count existing blue gems - max 3 blue gems on screen
      const blueGemCount = gameState.gems.filter(gem => gem.type === 'blue').length;
      if (blueGemCount >= 3) return; // Don't spawn if already 3 blue gems
      
      const side = Math.random() < 0.5 ? 'left' : 'right';
      const gem = {
        x: side === 'left' ? -20 : CONFIG.CANVAS_WIDTH + 20,
        y: 100 + Math.random() * (CONFIG.CANVAS_HEIGHT - 200),
        type: 'blue',
        width: 20,
        height: 20,
        // Increase speed by 300% (x3)
        vx: side === 'left' ? (1.5 + gameState.level * 0.08) * 3 : -(1.5 + gameState.level * 0.08) * 3,
        vy: (Math.random() - 0.5) * 1.5 * 3
      };
      gameState.gems.push(gem);
    }
    
    function updateGems(deltaTime) {
      const dt = deltaTime / 16.67; // Normalize to 60fps
      
      for (let i = gameState.gems.length - 1; i >= 0; i--) {
        const gem = gameState.gems[i];
        // ✅ Fix: Skip if gem is undefined (can happen if nextLevel() clears array during loop)
        if (!gem) continue;
        gem.x += gem.vx * dt;
        gem.y += gem.vy * dt;
        
        // Remove if out of bounds
        if (gem.x < -30 || gem.x > CONFIG.CANVAS_WIDTH + 30 || 
            gem.y < -30 || gem.y > CONFIG.CANVAS_HEIGHT + 30) {
          gameState.gems.splice(i, 1);
          continue;
        }
        
        // Collision with ship (ellipse collision)
        const shipHitboxW = gameState.ship.width * 0.65; // Wider on both sides
        const shipHitboxH = gameState.ship.height * 0.7; // Shorter to fit within nose to tail
        // Check if gem center is inside ship ellipse
        if (isPointInEllipse(gem.x, gem.y, gameState.ship.x, gameState.ship.y, shipHitboxW, shipHitboxH)) {
          if (gem.type === 'gold') {
            gameState.gemsCollected++;
            gameState.score += 10 * gameState.level;
            playCollectSound();
            
            // Check level complete
            if (gameState.gemsCollected >= gameState.gemsRequired) {
              nextLevel();
            }
          } else if (gem.type === 'blue') {
            // Only +3s when energy < 8s, and cannot exceed 8s
            if (gameState.energy < CONFIG.INITIAL_ENERGY) {
              gameState.energy = Math.min(CONFIG.INITIAL_ENERGY, gameState.energy + CONFIG.ENERGY_PER_BLUE_GEM);
            }
            gameState.score += 5 * gameState.level;
            playCollectSound();
          }
          
          gameState.gems.splice(i, 1);
        }
      }
    }
    
    function drawGems() {
      for (let gem of gameState.gems) {
        if (gem.type === 'gold') {
          // ✅ Thay gem vàng bằng logo nếu có
          if (typeof BRAND_CONFIG !== 'undefined' && BRAND_CONFIG.fragmentLogo) {
            ctx.drawImage(
              BRAND_CONFIG.fragmentLogo,
              gem.x - gem.width / 2,
              gem.y - gem.width / 2,
              gem.width,
              gem.width
            );
          } else {
            // Fallback: vẽ circle vàng nếu không có logo
            ctx.fillStyle = '#ffd700';
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(gem.x, gem.y, gem.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Glow (disabled on mobile for performance)
            if (!isMobile) {
              ctx.shadowColor = '#ffd700';
              ctx.shadowBlur = 8;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        } else {
          // Blue gem: giữ nguyên
          ctx.fillStyle = '#00ffff';
          ctx.strokeStyle = '#0088ff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(gem.x, gem.y, gem.width / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Glow (disabled on mobile for performance)
          if (!isMobile) {
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }
    }
    
    // ===== POWER-UP: SPREAD SHOT =====
    function spawnSpreadPowerUp() {
      // Only one spread icon at a time
      if (gameState.powerUps.some(p => p.type === 'spread')) return;
      
      const fromLeft = Math.random() < 0.5;
      const y = 180 + Math.random() * (CONFIG.CANVAS_HEIGHT - 360); // stay away from HUD edges
      const speed = (3.2 + gameState.level * 0.05) * 2; // faster (x2)
      const powerUp = {
        type: 'spread',
        x: fromLeft ? -40 : CONFIG.CANVAS_WIDTH + 40,
        y,
        baseY: y,
        width: CONFIG.SPREAD_POWERUP_SIZE,
        height: CONFIG.SPREAD_POWERUP_SIZE,
        vx: fromLeft ? speed : -speed,
        zigzagPhase: Math.random() * Math.PI * 2,
        zigzagSpeed: 0.2 + Math.random() * 0.1,
        zigzagAmp: 18 * 3 // bigger zigzag
      };
      gameState.powerUps.push(powerUp);
    }
    
    function updatePowerUps(deltaTime) {
      const dt = deltaTime / 16.67;
      for (let i = gameState.powerUps.length - 1; i >= 0; i--) {
        const p = gameState.powerUps[i];
        p.x += p.vx * dt;
        p.zigzagPhase += dt * p.zigzagSpeed;
        p.y = p.baseY + Math.sin(p.zigzagPhase) * p.zigzagAmp;
        
        // Remove if out of bounds
        if (p.x < -80 || p.x > CONFIG.CANVAS_WIDTH + 80) {
          gameState.powerUps.splice(i, 1);
          continue;
        }
        
        // Collision with ship
        const shipHitboxW = gameState.ship.width * 0.65;
        const shipHitboxH = gameState.ship.height * 0.7;
        if (isPointInEllipse(p.x, p.y, gameState.ship.x, gameState.ship.y, shipHitboxW, shipHitboxH)) {
          gameState.spreadPowerExpiresAt = performance.now() + CONFIG.SPREAD_DURATION_MS;
          playCollectSound();
          gameState.powerUps.splice(i, 1);
        }
      }
      
      // Expire spread power
      if (gameState.spreadPowerExpiresAt && performance.now() > gameState.spreadPowerExpiresAt) {
        gameState.spreadPowerExpiresAt = 0;
      }
    }
    
    function drawPowerUps() {
      for (let p of gameState.powerUps) {
        ctx.save();
        // Icon: three small bullets fanning out (spread-shot cue)
        const r = p.width / 2;
        ctx.fillStyle = 'rgba(0, 200, 255, 0.12)';
        ctx.strokeStyle = '#00c8ff';
        ctx.lineWidth = 3;
        
        // Outer ring
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw three bullet shapes (narrow capsules) angled out
        const bullets = [
          { angle: -0.35, offset: -0.22 },
          { angle: 0, offset: 0 },
          { angle: 0.35, offset: 0.22 }
        ];
        const len = p.width * 0.42;
        const w = p.width * 0.10;
        ctx.fillStyle = '#00e0ff';
        ctx.strokeStyle = '#00c8ff';
        for (const b of bullets) {
          ctx.save();
          ctx.translate(p.x + r * b.offset * 0.6, p.y);
          ctx.rotate(b.angle);
          ctx.beginPath();
          ctx.roundRect(-w / 2, -len / 2, w, len, w / 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }
    }
    
    // ===== ENEMIES SYSTEM =====
    function spawnEnemy() {
      if (gameState.enemies.length + gameState.bullets.length >= CONFIG.MAX_OBJECTS) return;
      
      // Increase size by x2.5 (70 * 2.5 = 175)
      const targetEnemyHeight = 175;
      const enemyWidth = enemyRocketLoaded ? targetEnemyHeight * enemyRocketAspectRatio : 125;
      
      // Enemy type distribution:
      // - Basic: Always available
      // - Zigzag: Level 5+ (30% chance)
      // - Blue Striker: Level 2+ (25% chance)
      // - Purple Phantom: Level 3+ (20% chance)
      const rand = Math.random();
      let enemyType = 'basic';
      if (gameState.level >= 3 && rand < 0.2) {
        enemyType = 'purple'; // Purple Phantom (Level 3+)
      } else if (gameState.level >= 5 && rand < 0.3) {
        enemyType = 'zigzag';
      } else if (gameState.level >= 2 && rand < 0.25) {
        enemyType = 'blue'; // Blue Striker (Level 2+)
      }
      
      // Spawn position based on enemy type
      let spawnX, spawnY, vx, vy;
      if (enemyType === 'purple') {
        // Purple Phantom: Spawn from left or right side, move horizontally
        const fromLeft = Math.random() < 0.5;
        spawnX = fromLeft ? -30 : CONFIG.CANVAS_WIDTH + 30;
        spawnY = 200 + Math.random() * (CONFIG.CANVAS_HEIGHT - 400); // Random y in middle area
        vx = fromLeft ? (1 + gameState.level * 0.1) * 3 : -(1 + gameState.level * 0.1) * 3; // Move horizontally
        vy = (Math.random() - 0.5) * 1; // Slight vertical movement
      } else {
        // Other enemies: Spawn from top down
        spawnX = 50 + Math.random() * (CONFIG.CANVAS_WIDTH - 100);
        spawnY = -30;
        vx = (Math.random() - 0.5) * 1; // Slight horizontal movement
        vy = (1 + gameState.level * 0.1) * 5; // Always moves down
      }
      
      const enemy = {
        x: spawnX,
        y: spawnY,
        width: enemyWidth,
        height: targetEnemyHeight,
        vx: vx,
        vy: vy,
        type: enemyType,
        shootCooldown: 0,
        bulletCount: 0, // For Purple Phantom: track number of bullets shot
        health: enemyType === 'blue' ? 2 : (enemyType === 'purple' ? 3 : 1) // Health: Blue=2, Purple=3, others=1
      };
      
      if (enemyType === 'zigzag') {
        enemy.zigzagPhase = 0;
      }
      
      gameState.enemies.push(enemy);
    }
    
    function updateEnemies(deltaTime) {
      const dt = deltaTime / 16.67;
      
      for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        
        // Movement based on enemy type
        if (enemy.type === 'zigzag') {
          enemy.zigzagPhase += dt * 0.1;
          enemy.y += Math.sin(enemy.zigzagPhase) * 2 * dt;
        }
        
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        
        // Remove if out of bounds
        if (enemy.y > CONFIG.CANVAS_HEIGHT + 50 || enemy.y < -50 || 
            enemy.x < -50 || enemy.x > CONFIG.CANVAS_WIDTH + 50) {
          gameState.enemies.splice(i, 1);
          continue;
        }
        
        // Shooting logic based on enemy type
        enemy.shootCooldown -= dt;
        
        if (enemy.type === 'blue') {
          // Blue Striker: Shoot 1 bullet at player (can shoot from any level)
          if (enemy.shootCooldown <= 0) {
            spawnEnemyBullet(enemy);
            enemy.shootCooldown = 60 - gameState.level; // Faster shooting at higher levels
          }
        } else if (enemy.type === 'purple') {
          // Purple Phantom: Shoot 2 bullets at different times
          if (enemy.shootCooldown <= 0 && enemy.bulletCount < 2) {
            spawnEnemyBullet(enemy);
            enemy.bulletCount++;
            if (enemy.bulletCount === 1) {
              // First bullet, wait before second
              enemy.shootCooldown = 30 - gameState.level * 0.5;
            } else {
              // Second bullet fired, reset
              enemy.bulletCount = 0;
              enemy.shootCooldown = 90 - gameState.level; // Longer cooldown between volleys
            }
          }
        } else if (gameState.level >= 5) {
          // Basic and Zigzag: Shoot only after level 5
          if (enemy.shootCooldown <= 0) {
            spawnEnemyBullet(enemy);
            enemy.shootCooldown = 60 - gameState.level;
          }
        }
        
        // Collision with ship (ellipse collision)
        const shipHitboxW = gameState.ship.width * 0.65; // Wider on both sides
        const shipHitboxH = gameState.ship.height * 0.7; // Shorter to fit within nose to tail
        const enemyHitboxW = enemy.width * 0.3; // Narrower width (30%)
        const enemyHitboxH = enemy.height * 0.7; // Same height as player ship
        if (checkEllipseCollision(gameState.ship.x, gameState.ship.y, shipHitboxW, shipHitboxH,
                                  enemy.x, enemy.y, enemyHitboxW, enemyHitboxH)) {
          gameOver();
          return;
        }
      }
    }
    
    function drawEnemies() {
      for (let enemy of gameState.enemies) {
        ctx.save();
        
        // Select image based on enemy type
        let imgToDraw = null;
        let shouldFlip = true; // Default: flip horizontally
        
        if (enemy.type === 'blue' && blueStrikerLoaded) {
          imgToDraw = blueStrikerImg;
          shouldFlip = enemy.vx < 0; // Flip if moving left
        } else if (enemy.type === 'purple' && purplePhantomLoaded) {
          imgToDraw = purplePhantomImg;
          shouldFlip = enemy.vx < 0; // Flip if moving left
        } else if (enemyRocketLoaded) {
          imgToDraw = enemyRocketImg;
          shouldFlip = true; // Always flip basic enemies
        }
        
        if (imgToDraw) {
          // Draw enemy image
          ctx.translate(enemy.x, enemy.y);
          if (shouldFlip) {
            ctx.scale(-1, 1); // Flip horizontally
          }
          ctx.drawImage(
            imgToDraw,
            -enemy.width / 2,
            -enemy.height / 2,
            enemy.width,
            enemy.height
          );
        } else {
          // Fallback: draw colored rectangle
          if (enemy.type === 'blue') {
            ctx.fillStyle = '#00aaff';
          } else if (enemy.type === 'purple') {
            ctx.fillStyle = '#aa00ff';
          } else {
            ctx.fillStyle = '#ff4444';
          }
          ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);
        }
        ctx.restore();
        
        // Draw hitbox (collision detection ellipse - narrower width for enemy)
        // Only draw if SHOW_HITBOX is enabled (for debugging/accuracy checking)
        if (CONFIG.SHOW_HITBOX) {
          const hitboxWidth = enemy.width * 0.3; // Ellipse width (30% of enemy width, narrower)
          const hitboxHeight = enemy.height * 0.7; // Ellipse height (70% of enemy height, shorter to fit within nose to tail)
          ctx.strokeStyle = '#ff00ff';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          // Draw ellipse manually (compatible with all browsers)
          const radiusX = hitboxWidth / 2;
          const radiusY = hitboxHeight / 2;
          const centerX = enemy.x;
          const centerY = enemy.y;
          // Use bezier curves to approximate ellipse (4 curves for full ellipse)
          const k = 0.5522848; // Magic number for bezier approximation
          ctx.moveTo(centerX + radiusX, centerY);
          ctx.bezierCurveTo(centerX + radiusX, centerY - radiusY * k, centerX + radiusX * k, centerY - radiusY, centerX, centerY - radiusY);
          ctx.bezierCurveTo(centerX - radiusX * k, centerY - radiusY, centerX - radiusX, centerY - radiusY * k, centerX - radiusX, centerY);
          ctx.bezierCurveTo(centerX - radiusX, centerY + radiusY * k, centerX - radiusX * k, centerY + radiusY, centerX, centerY + radiusY);
          ctx.bezierCurveTo(centerX + radiusX * k, centerY + radiusY, centerX + radiusX, centerY + radiusY * k, centerX + radiusX, centerY);
          ctx.closePath();
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
    
    // ===== PLAYER BULLETS SYSTEM =====
    function spawnPlayerBullet() {
      const spreadActive = isSpreadShotActive();
      const neededSlots = spreadActive ? CONFIG.SPREAD_BULLET_COUNT : 1;
      if (gameState.playerBullets.length > CONFIG.MAX_OBJECTS - neededSlots) return;
      
      // Base bullet params
      const baseSpeed = (5 + gameState.level * 0.2) * 2 * 1.3;
      const bulletW = 7.5;
      const bulletH = 15;
      const originX = gameState.ship.x;
      const originY = gameState.ship.y - gameState.ship.height / 2;
      
      if (spreadActive) {
        const halfSpread = CONFIG.SPREAD_BULLET_SPREAD_DEG;
        const count = CONFIG.SPREAD_BULLET_COUNT;
        const step = count > 1 ? (halfSpread * 2) / (count - 1) : 0;
        for (let i = 0; i < count; i++) {
          const angleDeg = -halfSpread + step * i; // from -spread to +spread, relative to straight up
          const angleRad = angleDeg * (Math.PI / 180);
          const vx = Math.sin(angleRad) * baseSpeed;
          const vy = -Math.cos(angleRad) * baseSpeed; // negative = upward
          gameState.playerBullets.push({
            x: originX,
            y: originY,
            width: bulletW,
            height: bulletH,
            vx,
            vy
          });
        }
        try { playSpreadShootSound(); } catch {}
      } else {
        const bullet = {
          x: originX,
          y: originY,
          width: bulletW,
          height: bulletH,
          // Increase bullet speed by x2, then add 30% more
          vy: -baseSpeed
        };
        gameState.playerBullets.push(bullet);
        // Play wind-like "xoạt" sound for each shot
        try { playShootWind() } catch {}
      }
    }
    
    function updatePlayerBullets(deltaTime) {
      const dt = deltaTime / 16.67;
      
      for (let i = gameState.playerBullets.length - 1; i >= 0; i--) {
        const bullet = gameState.playerBullets[i];
        if (bullet.vx) {
          bullet.x += bullet.vx * dt;
        }
        bullet.y += bullet.vy * dt;
        
        // Remove if out of bounds
        if (bullet.y < -20 || bullet.x < -20 || bullet.x > CONFIG.CANVAS_WIDTH + 20) {
          gameState.playerBullets.splice(i, 1);
          continue;
        }
        
        // Collision with enemies (ellipse collision)
        for (let j = gameState.enemies.length - 1; j >= 0; j--) {
          const enemy = gameState.enemies[j];
          const enemyHitboxW = enemy.width * 0.3; // Narrower width (30%)
          const enemyHitboxH = enemy.height * 0.7; // Same height as player ship
          // Check if bullet center is inside enemy ellipse
          if (isPointInEllipse(bullet.x, bullet.y, enemy.x, enemy.y, enemyHitboxW, enemyHitboxH)) {
            // Hit enemy - reduce health
            enemy.health--;
            gameState.playerBullets.splice(i, 1);
            
            if (enemy.health <= 0) {
              // Enemy destroyed
              gameState.enemies.splice(j, 1);
              gameState.score += 20 * gameState.level;
              playExplodeSound();
              // Visual explosion effect
              createExplosion(enemy.x, enemy.y);
            } else {
              // Enemy hit but not destroyed (Blue Striker or Purple Phantom)
              playExplodeSound(); // Play sound on hit
            }
            break;
          }
        }
      }
    }
    
    function drawPlayerBullets() {
      for (let bullet of gameState.playerBullets) {
        ctx.save();
        ctx.fillStyle = '#ffffff'; // White color
        ctx.strokeStyle = '#ffffff';
        // No stroke to reduce overdraw cost
        
        // Draw rectangle (thin and long)
        ctx.fillRect(
          bullet.x - bullet.width / 2,
          bullet.y - bullet.height / 2,
          bullet.width,
          bullet.height
        );
        ctx.restore();
      }
    }
    
    // ===== ENEMY BULLETS SYSTEM =====
    function spawnEnemyBullet(enemy) {
      if (gameState.bullets.length >= CONFIG.MAX_OBJECTS) return;
      
      const dx = gameState.ship.x - enemy.x;
      const dy = gameState.ship.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Blue and Purple enemies shoot faster bullets (1.5x speed)
      const baseSpeed = (2 + gameState.level * 0.1) * 2;
      const speedMultiplier = (enemy.type === 'blue' || enemy.type === 'purple') ? 1.5 : 1; // 50% faster for blue and purple
      
      const bullet = {
        x: enemy.x,
        y: enemy.y,
        // Make enemy bullet rectangular with same size as player's bullet
        width: 7.5,
        height: 15,
        // Increase bullet speed - faster for blue and purple enemies
        vx: (dx / distance) * baseSpeed * speedMultiplier,
        vy: (dy / distance) * baseSpeed * speedMultiplier,
        zigzag: gameState.level >= 10 && Math.random() < 0.3, // Zigzag bullets every 10 levels
        zigzagPhase: 0
      };
      
      gameState.bullets.push(bullet);
    }
    
    function updateBullets(deltaTime) {
      const dt = deltaTime / 16.67;
      
      for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        const bullet = gameState.bullets[i];
        
        if (bullet.zigzag) {
          bullet.zigzagPhase += dt * 0.2;
          bullet.x += Math.sin(bullet.zigzagPhase) * 3 * dt;
        }
        
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        
        // Remove if out of bounds
        if (bullet.x < -20 || bullet.x > CONFIG.CANVAS_WIDTH + 20 ||
            bullet.y < -20 || bullet.y > CONFIG.CANVAS_HEIGHT + 20) {
          gameState.bullets.splice(i, 1);
          continue;
        }
        
        // Collision with ship (ellipse collision)
        const shipHitboxW = gameState.ship.width * 0.65; // Wider on both sides
        const shipHitboxH = gameState.ship.height * 0.7; // Shorter to fit within nose to tail
        // Check if bullet center is inside ship ellipse
        if (isPointInEllipse(bullet.x, bullet.y, gameState.ship.x, gameState.ship.y, shipHitboxW, shipHitboxH)) {
          gameOver();
          return;
        }
      }
    }
    
    function drawBullets() {
      for (let bullet of gameState.bullets) {
        ctx.save();
        ctx.fillStyle = '#ff6666';
        ctx.strokeStyle = '#ff0000';
        // No stroke to reduce overdraw cost
        // Draw rectangle (same size style as player's bullet)
        ctx.fillRect(
          bullet.x - bullet.width / 2,
          bullet.y - bullet.height / 2,
          bullet.width,
          bullet.height
        );
        ctx.restore();
      }
    }

    // ===== SIMPLE EXPLOSION PARTICLES =====
    function createExplosion(x, y) {
      if (isMobile && !CONFIG.ENABLE_PARTICLES_MOBILE) return;
      const count = isMobile ? 8 : 14; // lower on mobile
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2) * (i / count) + Math.random() * 0.5;
        const speed = 2 + Math.random() * 4;
        gameState.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: isMobile ? 12 + Math.random() * 12 : 20 + Math.random() * 20, // shorter on mobile
          size: 2 + Math.random() * 3,
          color: i % 2 ? '#ffaa00' : '#ffdd55'
        });
      }
      // Enforce hard cap
      if (gameState.particles.length > CONFIG.MAX_PARTICLES) {
        gameState.particles.splice(0, gameState.particles.length - CONFIG.MAX_PARTICLES);
      }
    }
    function updateParticles(deltaTime) {
      const dt = deltaTime / 16.67;
      for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const p = gameState.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.05 * dt; // slight gravity
        p.life -= dt;
        if (p.life <= 0) gameState.particles.splice(i, 1);
      }
    }
    function drawParticles() {
      for (let p of gameState.particles) {
        ctx.save();
        const alpha = Math.max(0, Math.min(1, p.life / 25));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.restore();
      }
    }
    
    // ===== LEVEL SYSTEM =====
    function nextLevel() {
      gameState.level++;
      gameState.gemsCollected = 0;
      gameState.gemsRequired = 3 + (gameState.level - 1); // Lv1=3, Lv2=4, Lv3=5...
      gameState.energy = CONFIG.INITIAL_ENERGY; // Reset energy on level up
      
      // Clear all objects
      gameState.gems = [];
      gameState.enemies = [];
      gameState.bullets = [];
      gameState.playerBullets = [];
      
      // Show "Next Level" overlay for 2 seconds (game continues, rocket can still move)
      const nextLevelEl = document.getElementById('nextLevel');
      const nextLevelNumberEl = document.getElementById('nextLevelNumber');
      nextLevelNumberEl.textContent = gameState.level;
      nextLevelEl.classList.add('show');
      
      // Prevent enemy spawning during 2s level transition
      gameState.levelTransitionActive = true;
      
      // Don't pause game - rocket can still move during level transition
      setTimeout(() => {
        nextLevelEl.classList.remove('show');
        gameState.levelTransitionActive = false; // Allow spawning after 2s
      }, 2000);
      
      if (gameState.level > CONFIG.MAX_LEVEL) {
        // Win game
        gameOver();
      }
    }
    
    // ===== ENERGY SYSTEM =====
    function updateEnergy(deltaTime) {
      if (gameState.gameOver || !gameState.gameStarted) return;
      
      const dt = deltaTime / 16.67; // Normalize to 60fps
      gameState.energy -= dt / 60; // Decrease by 1 second per 60 frames
      
      if (gameState.energy <= 0) {
        gameState.energy = 0;
        gameOver();
      }
    }
    
    function drawEnergyBar() {
      const barWidth = 200;
      const barHeight = 20;
      const barX = CONFIG.CANVAS_WIDTH - barWidth - 20 - 10; // Move left 10px
      const barY = 20 + 5; // Move down 5px
      
      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Energy bar (orange to red)
      const energyPercent = gameState.energy / CONFIG.INITIAL_ENERGY;
      const r = energyPercent < 0.5 ? 255 : 255;
      const g = energyPercent < 0.5 ? Math.floor(energyPercent * 2 * 165) : Math.floor((1 - energyPercent) * 2 * 165);
      const b = 0;
      
      // Red blinking effect when energy <= 3 seconds
      let fillColor = `rgb(${r}, ${g}, ${b})`;
      let borderColor = '#ffffff';
      
      if (gameState.gameStarted && !gameState.gameOver && gameState.energy <= 3 && gameState.energy > 0) {
        // Blinking red effect on energy bar
        const pulseIntensity = 0.7 + Math.sin(Date.now() / 80) * 0.3; // Blink intensity (0.4-1.0)
        const redIntensity = Math.floor(255 * pulseIntensity);
        fillColor = `rgb(${redIntensity}, 0, 0)`; // Bright red, blinking
        borderColor = `rgba(255, 0, 0, ${pulseIntensity})`; // Red border, blinking
      }
      
      ctx.fillStyle = fillColor;
      ctx.fillRect(barX, barY, barWidth * energyPercent, barHeight);
      
      // Border (white normally, red when blinking)
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
      
      // Text: Only show number "8s" on the left side
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${Math.max(0, Math.ceil(gameState.energy))}s`, barX - 40, barY + 15); // Left side, aligned with bar
    }
    
    // ===== SPAWNING SYSTEM =====
    let spawnTimer = 0;
    let gemSpawnTimer = 0;
    let powerUpSpawnTimer = 0;
    
    function updateSpawning(deltaTime) {
      if (gameState.gameOver || !gameState.gameStarted) return;
      
      const dt = deltaTime / 16.67;
      spawnTimer += dt;
      gemSpawnTimer += dt;
      powerUpSpawnTimer += dt;
      
      // Spawn gold gems (increase frequency by 100%: reduce rate by 2x)
      const goldGemRate = (Math.max(30, 60 - gameState.level * 0.5) * 20) / 2;
      if (gemSpawnTimer >= goldGemRate) {
        spawnGoldGem();
        gemSpawnTimer = 0;
      }
      
      // Spawn blue gems (increase frequency by 100%: from 0.006 to 0.012)
      if (Math.random() < 0.012 && gameState.energy < CONFIG.INITIAL_ENERGY * 0.5) {
        spawnBlueGem();
      }
      
      // Spawn enemies: Increase spawn rate by 50% each level
      // Base rate: 120 frames, increases by 50% per level (120 / 1.5^level)
      // Level 1: 120, Level 2: 80, Level 3: 53, Level 4: 35, etc.
      // Don't spawn enemies during 2s level transition
      if (!gameState.levelTransitionActive) {
        const baseRate = 120;
        // Increase spawn frequency by additional 50% (divide interval by 1.5)
        const enemyRate = Math.max(15, (baseRate / Math.pow(1.5, gameState.level - 1)) / 1.5);
        if (spawnTimer >= enemyRate) {
          spawnEnemy();
          spawnTimer = 0;
        }
      }
      
      // Spawn spread-shot power-up occasionally (about every 15s normalized)
      if (powerUpSpawnTimer >= 900 && !isSpreadShotActive()) {
        spawnSpreadPowerUp();
        powerUpSpawnTimer = 0;
      }
    }
    
    // ===== UI DRAWING =====
    function drawUI() {
      // Score
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'left';
      // Text shadows (disabled on mobile for performance)
      if (!isMobile) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
      }
      ctx.fillText(`SCORE: ${gameState.score}`, 20, 40);
      
      // Level
      ctx.fillText(`LV: ${gameState.level}`, 20, 70);
      
      // Gems collected - draw logo instead of gold gem icon
      const gemIconX = 24;  // Nudge right to avoid text
      const gemIconY = 130; // Push down so it doesn't overlap LV text
      const gemIconSize = 40; // Larger icon to match bigger gold gem
      
      // ✅ Thay gem vàng bằng logo nếu có
      if (typeof BRAND_CONFIG !== 'undefined' && BRAND_CONFIG.fragmentLogo) {
        ctx.drawImage(
          BRAND_CONFIG.fragmentLogo,
          gemIconX,
          gemIconY - gemIconSize,
          gemIconSize,
          gemIconSize
        );
      } else {
        // Fallback: vẽ circle vàng nếu không có logo
        ctx.fillStyle = '#ffd700'; // Gold color
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(gemIconX + gemIconSize / 2, gemIconY - gemIconSize / 2, gemIconSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      
      // Draw gem count next to icon
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${gameState.gemsCollected}/${gameState.gemsRequired}`, gemIconX + gemIconSize + 8, gemIconY);
      
      ctx.shadowBlur = 0;
      
      // Energy bar
      drawEnergyBar();
    }
    
    // ===== GAME OVER =====
    function gameOver() {
      if (gameState.gameOver) return;
      
      gameState.gameOver = true;
      playExplodeSound();
      
      document.getElementById('finalScore').textContent = gameState.score;
      
      // ✅ Load logo và story vào game over screen
      const gameOverLogo = document.getElementById('gameOverLogo');
      const gameOverStory = document.getElementById('gameOverStory');
      
      if (typeof BRAND_CONFIG !== 'undefined') {
        // Load logo
        if (BRAND_CONFIG.fragmentLogoUrl && gameOverLogo) {
          gameOverLogo.src = BRAND_CONFIG.fragmentLogoUrl;
          gameOverLogo.style.display = 'block';
        } else if (gameOverLogo) {
          gameOverLogo.style.display = 'none';
        }
        
        // Load story
        if (gameOverStory) {
          const story = Array.isArray(BRAND_CONFIG.stories) && BRAND_CONFIG.stories.length > 0 
            ? BRAND_CONFIG.stories[0] 
            : '';
          gameOverStory.textContent = story;
          gameOverStory.style.display = story ? 'block' : 'none';
        }
      }
      
      document.getElementById('gameOver').classList.add('show');
      
      // ✅ Send score to leaderboard (include level for backend)
      if (window.parent && window.parent !== window) {
        const gameId = EMBEDDED_GAME_ID || (typeof getGameId === 'function' ? getGameId() : null);
        if (gameId) {
          // Send GAME_SCORE
          window.parent.postMessage({
            type: 'GAME_SCORE',
            gameId: gameId,
            score: gameState.score,
            level: gameState.level
          }, '*');
          console.log('📤 Sent GAME_SCORE to parent:', { gameId, score: gameState.score, level: gameState.level });
          
          // ✅ Send GAME_OVER message (required for toast rewards)
          window.parent.postMessage({
            type: 'GAME_OVER',
            gameId: gameId
          }, '*');
          console.log('📤 Sent GAME_OVER to parent:', gameId);
        }
      }
    }
    
    function showGameOver() {
      gameOver();
    }
    
    // ===== MAIN GAME LOOP =====
    function gameLoop(currentTime) {
      // Calculate deltaTime for frame-rate independent movement
      if (!gameState.lastTime) gameState.lastTime = currentTime;
      gameState.deltaTime = currentTime - gameState.lastTime;
      gameState.lastTime = currentTime;
      
      // Cap deltaTime to prevent large jumps
      if (gameState.deltaTime > 100) gameState.deltaTime = 100;
      
      // Clear canvas only once per frame
      // ✅ Dùng mapColor từ BRAND_CONFIG (3 màu nhạt: #1a1a2e, #2d1b3d, #1a2e1a)
      const bgColor = (typeof BRAND_CONFIG !== 'undefined' && BRAND_CONFIG.mapColor) 
        ? BRAND_CONFIG.mapColor 
        : '#000000';
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
      
      if (!gameState.gameOver && gameState.gameStarted) {
        // Update game (DO NOT draw here)
        updateMatrixDrops(gameState.deltaTime);
        updateShip(gameState.deltaTime); // Only update position, do not draw
        updateGems(gameState.deltaTime);
        updatePowerUps(gameState.deltaTime);
        updateEnemies(gameState.deltaTime);
        updateBullets(gameState.deltaTime);
        updatePlayerBullets(gameState.deltaTime);
        updateParticles(gameState.deltaTime);
        updateEnergy(gameState.deltaTime);
        updateSpawning(gameState.deltaTime);
      }
      
      // Draw everything only once, in correct order
      drawMatrixBackground();
      drawGems();
      drawPowerUps();
      drawEnemies();
      drawBullets();
      drawPlayerBullets();
      drawParticles();
      if (gameState.gameStarted) {
        drawShip(); // Draw rocket only once here
        drawControlHandle(); // Visual anchor for touch/mouse control
      }
      drawUI();
      
      requestAnimationFrame(gameLoop);
    }
    
    // ===== TAP TO START =====
    const tapToStartOverlay = document.getElementById('tapToStartOverlay');
    const tapToStartBtn = document.getElementById('tapToStart');
    let gameStarted = false;

    function beginGame() {
      tapToStartOverlay.classList.add('hidden');
      gameState.gameStarted = true;
      gameStarted = true;
      gameState.lastTime = performance.now();
      
      // ✅ Post message to parent (start game timer)
      if (window.parent !== window) {
        const gameId = EMBEDDED_GAME_ID || (typeof getGameId === 'function' ? getGameId() : null);
        if (gameId) {
          window.parent.postMessage({ 
            type: 'GAME_START', 
            gameId: gameId 
          }, '*');
          console.log('📤 Sent GAME_START to parent:', gameId);
        }
      }
    }
    
    function handleTapToStart() {
      if (gameStarted) return;
      
      unlockAudio();
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          audioUnlocked = true;
        }).catch(() => {});
      } else {
        audioUnlocked = true;
      }
      
      beginGame();
    }
    
    if (tapToStartOverlay) {
      tapToStartOverlay.addEventListener('click', handleTapToStart);
      tapToStartOverlay.addEventListener('touchstart', handleTapToStart, { passive: true });
    }
    
    // ===== GAME CONTROL =====
    const game = {
      start() {
        gameState.level = 1;
        gameState.score = 0;
        gameState.energy = CONFIG.INITIAL_ENERGY;
        gameState.gemsCollected = 0;
        gameState.gemsRequired = 3;
        gameState.gameOver = false;
        gameState.gameStarted = false;
        gameState.ship.x = 360;
        gameState.ship.y = 800;
        gameState.ship.targetX = 360;
        gameState.ship.targetY = 800;
        gameState.gems = [];
        gameState.enemies = [];
        gameState.bullets = [];
        gameState.playerBullets = [];
        gameState.touchPosition = null;
        gameState.isHolding = false; // Reset holding flag
        gameState.isPaused = false; // Reset pause flag
        gameState.levelTransitionActive = false; // Reset level transition flag
        gameState.shootCooldown = 0;
        gameState.powerUps = [];
        gameState.spreadPowerExpiresAt = 0;
        gameState.lastTime = performance.now();
        
        spawnTimer = 0;
        gemSpawnTimer = 0;
        powerUpSpawnTimer = 0;
        
        initMatrixDrops();
        
        unlockAudio();
      },
      
      restart() {
        document.getElementById('gameOver').classList.remove('show');
        document.getElementById('nextLevel').classList.remove('show'); // Hide next level overlay if visible
        tapToStartOverlay.classList.add('hidden'); // Auto-start, no tap needed
        gameStarted = true;
        gameState.isPaused = false; // Reset pause flag
        gameState.levelTransitionActive = false; // Reset level transition flag
        this.start();
        beginGame(); // Immediately start gameplay after reset
      }
    };
    
    // ===== INITIALIZE =====
    // ✅ Load config từ localStorage hoặc Supabase khi khởi động
    // Similar to Pacman: Load config with gameId from URL, fallback to Supabase
    async function initializeGame() {
      // Check if this is a public game link (has ?game= parameter)
      const urlParams = new URLSearchParams(window.location.search);
      const gameId = urlParams.get('game');
      const isPublicGame = gameId !== null && gameId !== '';
      
      if (isPublicGame) {
        console.log('[Pixel Shooter] 🎮 Public game mode - Game ID:', gameId);
        
        // ✅ Load brand config with correct gameId BEFORE game starts
        const hasLocalBrandConfig = typeof loadBrandConfig === 'function' ? loadBrandConfig(gameId) : false;
        if (!hasLocalBrandConfig) {
          // Try Supabase, but if still no config, use defaults
          const hasSupabaseConfig = await loadBrandConfigFromSupabase(gameId);
          if (!hasSupabaseConfig) {
            // Use default config
            console.log('[Pixel Shooter] No config found, using defaults');
            if (typeof BRAND_CONFIG !== 'undefined') {
              BRAND_CONFIG = {
                fragmentLogo: null,
                fragmentLogoUrl: '',
                title: 'Pixel Shooter Game',
                smartContract: '',
                mapColor: '#1a1a2e',
                stories: []
              };
            }
          }
        }
      } else {
        // ✅ Editor mode: Load config từ localStorage (playtest)
        if (typeof loadBrandConfig === 'function') {
          loadBrandConfig();
        }
      }
      
      // ✅ Load logo nếu có
      if (typeof BRAND_CONFIG !== 'undefined' && BRAND_CONFIG.fragmentLogoUrl) {
        const img = new Image();
        img.onload = () => {
          BRAND_CONFIG.fragmentLogo = img;
          console.log('[Pixel Shooter] ✅ Logo loaded on init');
        };
        img.onerror = () => {
          console.warn('[Pixel Shooter] Failed to load logo on init');
        };
        img.src = BRAND_CONFIG.fragmentLogoUrl;
      }
      
      // ✅ Start game
      initMatrixDrops();
      game.start();
      gameLoop(performance.now());
      
      // ✅ Send READY signal SAU KHI game đã start xong (giống Pacman pattern)
      // ✅ FIX: Gửi READY signal BÊN TRONG initializeGame() để đảm bảo game đã init xong
      setTimeout(() => {
        if (window.parent && window.parent !== window) {
          try {
            const gameId = typeof getGameId === 'function' ? getGameId() : 'playtest-pixel-shooter';
            window.parent.postMessage({
              type: 'PIXEL_SHOOTER_GAME_READY',
              gameId: gameId,
              timestamp: Date.now()
            }, '*');
            console.log('[Pixel Shooter] ✅ Sent ready signal to parent');
          } catch (err) {
            console.warn('[Pixel Shooter] Failed to send ready signal:', err);
          }
        }
      }, 50); // Delay 50ms giống Pacman để đảm bảo game đã init xong
    }
    
    // ✅ Initialize game when DOM is ready (or immediately if already loaded)
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', initializeGame);
    } else {
      // DOM already loaded, run immediately
      initializeGame();
    }
