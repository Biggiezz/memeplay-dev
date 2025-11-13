/**
 * Bird Squash Game - Flappy Bird Clone
 * NO-IFRAME Architecture for MemePlay
 * Performance: 60 FPS target
 */

export class BirdSquashGame {
  constructor(canvasId, gameId = 'bird-squash-clone') {
    // Canvas setup
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas #${canvasId} not found!`);
    }
    
    this.ctx = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    });
    
    this.gameId = gameId;
    this.canvas.width = 720;
    this.canvas.height = 1000;
    
    // Mobile detection
    this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Game state
    this.isRunning = false;
    this.isPaused = false;
    this.gameOver = false;
    this.score = 0;
    this.gameStarted = false;
    
    // Timing
    this.lastFrameTime = 0;
    this.deltaTime = 0;
    this.TARGET_FPS = 60;
    this.FRAME_TIME = 1000 / this.TARGET_FPS;
    
    // Game objects
    this.bird = null;
    this.pipes = [];
    this.particles = [];
    
    // Config
    this.config = {
      gravity: 0.4,
      jumpForce: -8,
      pipeSpeed: 3,
      pipeGap: 180,
      pipeSpawnInterval: 1800, // ms
      birdSize: 40,
      pipeWidth: 80
    };
    
    // Event handlers (for cleanup)
    this.boundHandlers = {
      keydown: this.handleKeyDown.bind(this),
      click: this.handleClick.bind(this),
      touchstart: this.handleTouch.bind(this)
    };
    
    // Animation ID
    this.animationId = null;
    this.lastPipeSpawn = 0;
    
    // Audio context
    this.audioContext = null;
    
    console.log('🐦 BirdSquashGame initialized:', canvasId);
  }
  
  // ==================== LIFECYCLE ====================
  
  start() {
    if (this.isRunning) return;
    
    console.log('🎮 Starting Bird Squash game...');
    this.isRunning = true;
    this.gameOver = false;
    this.gameStarted = false;
    this.score = 0;
    this.pipes = [];
    this.particles = [];
    this.lastPipeSpawn = Date.now();
    
    // Create bird
    this.bird = new Bird(
      this.canvas.width / 3,
      this.canvas.height / 2,
      this.config.birdSize
    );
    
    // Add event listeners
    this.canvas.addEventListener('click', this.boundHandlers.click);
    this.canvas.addEventListener('touchstart', this.boundHandlers.touchstart, { passive: false });
    document.addEventListener('keydown', this.boundHandlers.keydown);
    
    // Start game loop
    this.lastFrameTime = performance.now();
    this.loop();
    
    console.log('✅ Bird Squash game started!');
  }
  
  stop() {
    if (!this.isRunning) return;
    
    console.log('🛑 Stopping Bird Squash game...');
    this.isRunning = false;
    
    // Cancel animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Remove event listeners
    this.cleanup();
    
    console.log('✅ Bird Squash game stopped!');
  }
  
  cleanup() {
    // Remove all event listeners
    this.canvas.removeEventListener('click', this.boundHandlers.click);
    this.canvas.removeEventListener('touchstart', this.boundHandlers.touchstart);
    document.removeEventListener('keydown', this.boundHandlers.keydown);
    
    // Clear objects
    this.bird = null;
    this.pipes = [];
    this.particles = [];
    
    console.log('🧹 Bird Squash cleaned up!');
  }
  
  restart() {
    this.stop();
    setTimeout(() => this.start(), 100);
  }
  
  // ==================== GAME LOOP ====================
  
  loop(currentTime = 0) {
    if (!this.isRunning) return;
    
    // Calculate delta time
    this.deltaTime = Math.min((currentTime - this.lastFrameTime) / this.FRAME_TIME, 2);
    this.lastFrameTime = currentTime;
    
    // Update & render
    this.update();
    this.render();
    
    // Next frame
    this.animationId = requestAnimationFrame(this.loop.bind(this));
  }
  
  update() {
    if (this.gameOver || this.isPaused) return;
    
    // Update bird
    if (this.bird) {
      this.bird.update(this.config.gravity * this.deltaTime);
      
      // Check bounds
      if (this.bird.y + this.bird.size > this.canvas.height || this.bird.y < 0) {
        this.endGame();
        return;
      }
    }
    
    // Spawn pipes
    if (this.gameStarted) {
      const now = Date.now();
      if (now - this.lastPipeSpawn > this.config.pipeSpawnInterval) {
        this.spawnPipe();
        this.lastPipeSpawn = now;
      }
    }
    
    // Update pipes
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const pipe = this.pipes[i];
      pipe.update(this.config.pipeSpeed * this.deltaTime);
      
      // Check collision
      if (this.bird && this.checkCollision(this.bird, pipe)) {
        this.endGame();
        return;
      }
      
      // Check score
      if (!pipe.scored && pipe.x + pipe.width < this.bird.x) {
        pipe.scored = true;
        this.score++;
        this.playSound('score');
        this.createParticles(pipe.x + pipe.width, this.canvas.height / 2);
      }
      
      // Remove off-screen pipes
      if (pipe.x + pipe.width < 0) {
        this.pipes.splice(i, 1);
      }
    }
    
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
  
  render() {
    const ctx = this.ctx;
    
    // Background (gradient sky)
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Clouds (simple)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 3; i++) {
      const x = (Date.now() * 0.01 + i * 300) % (this.canvas.width + 100);
      const y = 100 + i * 150;
      ctx.beginPath();
      ctx.arc(x, y, 40, 0, Math.PI * 2);
      ctx.arc(x + 30, y, 30, 0, Math.PI * 2);
      ctx.arc(x + 60, y, 40, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Ground
    ctx.fillStyle = '#7EC850';
    ctx.fillRect(0, this.canvas.height - 100, this.canvas.width, 100);
    ctx.fillStyle = '#5FA035';
    ctx.fillRect(0, this.canvas.height - 100, this.canvas.width, 20);
    
    // Pipes
    this.pipes.forEach(pipe => pipe.draw(ctx));
    
    // Particles
    this.particles.forEach(p => p.draw(ctx));
    
    // Bird
    if (this.bird) {
      this.bird.draw(ctx);
    }
    
    // Score
    ctx.fillStyle = '#FFF';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.strokeText(this.score.toString(), this.canvas.width / 2, 80);
    ctx.fillText(this.score.toString(), this.canvas.width / 2, 80);
    
    // Start message
    if (!this.gameStarted && !this.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, this.canvas.height / 2 - 60, this.canvas.width, 120);
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 36px Arial';
      ctx.fillText('TAP TO START', this.canvas.width / 2, this.canvas.height / 2);
      ctx.font = '24px Arial';
      ctx.fillText('Tap or press SPACE to fly', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }
    
    // Game over
    if (this.gameOver) {
      this.renderGameOver();
    }
  }
  
  renderGameOver() {
    const ctx = this.ctx;
    
    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Game Over box
    const boxWidth = 500;
    const boxHeight = 350;
    const boxX = (this.canvas.width - boxWidth) / 2;
    const boxY = (this.canvas.height - boxHeight) / 2;
    
    ctx.fillStyle = '#2C2C2C';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = '#F3BA2F';
    ctx.lineWidth = 4;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    
    // Text
    ctx.fillStyle = '#F3BA2F';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', this.canvas.width / 2, boxY + 80);
    
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, boxY + 150);
    
    // Restart button
    const btnWidth = 300;
    const btnHeight = 60;
    const btnX = (this.canvas.width - btnWidth) / 2;
    const btnY = boxY + boxHeight - 100;
    
    ctx.fillStyle = '#F3BA2F';
    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('TAP TO RESTART', this.canvas.width / 2, btnY + 38);
  }
  
  // ==================== GAME LOGIC ====================
  
  spawnPipe() {
    const minHeight = 100;
    const maxHeight = this.canvas.height - this.config.pipeGap - minHeight - 100; // 100 = ground
    const topHeight = minHeight + Math.random() * (maxHeight - minHeight);
    
    this.pipes.push(new Pipe(
      this.canvas.width,
      0,
      this.config.pipeWidth,
      topHeight,
      this.config.pipeGap,
      this.canvas.height - 100 // Ground level
    ));
  }
  
  checkCollision(bird, pipe) {
    const birdBox = {
      x: bird.x,
      y: bird.y,
      width: bird.size,
      height: bird.size
    };
    
    // Top pipe
    const topPipe = {
      x: pipe.x,
      y: 0,
      width: pipe.width,
      height: pipe.topHeight
    };
    
    // Bottom pipe
    const bottomPipe = {
      x: pipe.x,
      y: pipe.topHeight + pipe.gap,
      width: pipe.width,
      height: pipe.groundLevel - (pipe.topHeight + pipe.gap)
    };
    
    return this.boxCollision(birdBox, topPipe) || this.boxCollision(birdBox, bottomPipe);
  }
  
  boxCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }
  
  createParticles(x, y) {
    for (let i = 0; i < 10; i++) {
      this.particles.push(new Particle(x, y));
    }
  }
  
  endGame() {
    if (this.gameOver) return;
    
    this.gameOver = true;
    this.playSound('gameover');
    
    // Send score to parent (MemePlay)
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'GAME_SCORE',
        score: this.score,
        gameId: this.gameId
      }, '*');
      console.log('📤 Sent GAME_SCORE to parent:', this.score);
    }
  }
  
  // ==================== INPUT HANDLERS ====================
  
  handleKeyDown(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      this.handleInput();
    }
  }
  
  handleClick(e) {
    e.preventDefault();
    this.handleInput();
  }
  
  handleTouch(e) {
    e.preventDefault();
    this.handleInput();
  }
  
  handleInput() {
    if (this.gameOver) {
      this.restart();
      return;
    }
    
    if (!this.gameStarted) {
      this.gameStarted = true;
      
      // Send GAME_START to parent
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'GAME_START',
          gameId: this.gameId
        }, '*');
        console.log('📤 Sent GAME_START to parent');
      }
    }
    
    if (this.bird) {
      this.bird.jump(this.config.jumpForce);
      this.playSound('jump');
    }
  }
  
  // ==================== AUDIO ====================
  
  playSound(type) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    switch (type) {
      case 'jump':
        oscillator.frequency.value = 400;
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
        break;
      
      case 'score':
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        break;
      
      case 'gameover':
        oscillator.frequency.value = 200;
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
        break;
    }
  }
}

// ==================== GAME CLASSES ====================

class Bird {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.velocity = 0;
    this.rotation = 0;
  }
  
  update(gravity) {
    this.velocity += gravity;
    this.y += this.velocity;
    
    // Rotation based on velocity
    this.rotation = Math.min(Math.max(this.velocity * 3, -30), 90);
  }
  
  jump(force) {
    this.velocity = force;
  }
  
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
    ctx.rotate(this.rotation * Math.PI / 180);
    
    // Bird body (yellow circle)
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird outline
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Eye
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(this.size / 6, -this.size / 6, this.size / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(this.size / 6, -this.size / 6, this.size / 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Beak
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.moveTo(this.size / 2, 0);
    ctx.lineTo(this.size / 2 + 15, -5);
    ctx.lineTo(this.size / 2 + 15, 5);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
}

class Pipe {
  constructor(x, y, width, topHeight, gap, groundLevel) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.topHeight = topHeight;
    this.gap = gap;
    this.groundLevel = groundLevel;
    this.scored = false;
  }
  
  update(speed) {
    this.x -= speed;
  }
  
  draw(ctx) {
    // Top pipe
    ctx.fillStyle = '#5FA035';
    ctx.fillRect(this.x, 0, this.width, this.topHeight);
    ctx.strokeStyle = '#4A7C2C';
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x, 0, this.width, this.topHeight);
    
    // Top pipe cap
    ctx.fillStyle = '#6BB042';
    ctx.fillRect(this.x - 5, this.topHeight - 30, this.width + 10, 30);
    ctx.strokeRect(this.x - 5, this.topHeight - 30, this.width + 10, 30);
    
    // Bottom pipe
    const bottomY = this.topHeight + this.gap;
    const bottomHeight = this.groundLevel - bottomY;
    ctx.fillStyle = '#5FA035';
    ctx.fillRect(this.x, bottomY, this.width, bottomHeight);
    ctx.strokeRect(this.x, bottomY, this.width, bottomHeight);
    
    // Bottom pipe cap
    ctx.fillStyle = '#6BB042';
    ctx.fillRect(this.x - 5, bottomY, this.width + 10, 30);
    ctx.strokeRect(this.x - 5, bottomY, this.width + 10, 30);
  }
}

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 5;
    this.vy = (Math.random() - 0.5) * 5;
    this.alpha = 1;
    this.size = Math.random() * 5 + 2;
    this.color = ['#FFD700', '#FFA500', '#FF8C00'][Math.floor(Math.random() * 3)];
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 0.02;
  }
  
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

