// --- Zombie Tap Game (Mini Version) ---
// Setup the canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 720;
canvas.height = 1100;

// Load sounds (optional)
let bonkSound, missSound;
try {
  bonkSound = new Audio("../../assets/zombie/bonk.wav");
  missSound = new Audio("../../assets/zombie/miss.wav");
} catch (e) {
  console.warn("⚠️ Sound files not found, running in silent mode.");
  bonkSound = { play: () => {} };
  missSound = { play: () => {} };
}

// Load images
const bg = new Image();
bg.src = "../../assets/zombie/bg.png";

const zombieImg = new Image();
zombieImg.src = "../../assets/zombie/zombie.png";

const zombieHit = new Image();
zombieHit.src = "../../assets/zombie/zombie_hit.png";

// Debug: confirm if images are loaded
bg.onload = () => console.log("✅ Background loaded!");
zombieImg.onload = () => console.log("✅ Zombie image loaded!");
zombieHit.onload = () => console.log("✅ Zombie hit image loaded!");

// Game variables
let zombies = [];
let score = 0;

// Spawn random zombies
function spawnZombie() {
  const size = 120;
  const x = Math.random() * (canvas.width - size);
  const y = Math.random() * (canvas.height - size - 200) + 100;
  zombies.push({ x, y, size, hit: false });

  // Limit number of zombies to keep performance smooth
  if (zombies.length > 5) zombies.shift();
}

// Draw everything on screen
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

  zombies.forEach(z => {
    const img = z.hit ? zombieHit : zombieImg;
    ctx.drawImage(img, z.x, z.y, z.size, z.size);
  });

  ctx.fillStyle = "#00ff87";
  ctx.font = "bold 48px Arial";
  ctx.fillText(`Score: ${score}`, 50, 70);
}

// Handle user clicks
canvas.addEventListener("click", e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  let hitZombie = false;

  zombies.forEach(z => {
    if (x > z.x && x < z.x + z.size && y > z.y && y < z.y + z.size && !z.hit) {
      z.hit = true;
      hitZombie = true;
      score++;
      bonkSound.play();
    }
  });

  if (!hitZombie) missSound.play();
});

// Main game loop
function gameLoop() {
  draw();
  requestAnimationFrame(gameLoop);
}

// Start game
setInterval(spawnZombie, 800);
gameLoop();
