// Load your Loveable game inside the main area
document.addEventListener("DOMContentLoaded", () => {
  const gameContainer = document.getElementById("game-container");

  // Create the wrapper and iframe dynamically
  const wrapper = document.createElement("div");
  wrapper.className = "game-wrapper";

  const iframe = document.createElement("iframe");
  iframe.src = "https://yourgame.lovable.app"; // Replace with your Loveable link
  iframe.allowFullscreen = true;

  wrapper.appendChild(iframe);
  gameContainer.appendChild(wrapper);

  // Responsive scaling function
  function resizeGame() {
    const gameWidth = 720;
    const gameHeight = 1100;
    const containerWidth = gameContainer.clientWidth;
    const containerHeight = gameContainer.clientHeight;
    const scale = Math.min(
      containerWidth / gameWidth,
      containerHeight / gameHeight
    );

    iframe.style.transform = `scale(${scale})`;
  }

  window.addEventListener("resize", resizeGame);
  resizeGame();
});
