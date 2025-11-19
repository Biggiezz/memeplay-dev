# Pacman Template - MVP1

A complete Pac-Man-style game template built with HTML5 Canvas, vanilla JavaScript, and CSS. Designed for 720×1000 portrait mode.

## Features

### Core Gameplay
- **5 Preset Maps**: Rotating through 5 different maze layouts
- **Fragment System**: Collect 5 fragments (A, B, C, D, E) to unlock exit gate
- **Level Progression**: Infinite levels with increasing ghost count (1-10 ghosts)
- **Ghost AI**: Simple AI that moves towards player with randomness
- **Collision Detection**: Wall collision and ghost collision

### Controls
- **Desktop**: WASD or Arrow keys
- **Mobile**: Touch buttons in bottom 1/3 of screen (4-directional pad)

### Customization (Editor Panel)
- **Brand Logo**: Upload custom logo (displayed in HUD and game over screen)
- **Game Title**: Customizable game title
- **3 Stories**: Random story displayed on game over

### HUD (Heads-Up Display)
- Top-left: Brand logo (48px, opacity 0.45)
- Top-right: Score, Level, Fragments counter (X/5)

### Game Over Screen
- Brand logo (full opacity)
- Random story from 3 user-provided stories
- Restart button

## File Structure

```
pacman-template/
├── index.html      # Main HTML file
├── style.css       # All styles
├── game.js         # Main game logic
├── maps.js         # 5 preset maps + gate positions
├── config.js       # Configuration + brand customization
└── README.md       # This file
```

## How to Use

1. **Open `index.html`** in a browser
2. **Click "⚙️ Editor"** button (top-right) to customize:
   - Upload brand logo
   - Set game title
   - Enter 3 story texts
   - Click "Play Test" to start
3. **Play the game**:
   - Collect all 5 fragments
   - Enter the exit gate to advance to next level
   - Avoid ghosts!

## Technical Details

### Map System
- Maps are 21×11 tile grids
- `1` = wall, `0` = path
- Maps are centered on canvas with calculated offset
- Gate positions are preset for each map

### Fragment System
- 5 fragments spawn randomly on path tiles each level
- Fragments are labeled A, B, C, D, E with different colors
- When all 5 collected, exit gate spawns at random gate position
- Gate blinks (0.4s interval) to indicate exit

### Level System
- Level 1: 1 ghost
- Level 2: 2 ghosts
- ...
- Level 10+: 10 ghosts (max)
- Maps cycle: `mapIndex = (level - 1) % 5`

### Ghost AI
- 70% chance to move towards player
- 30% chance to move randomly
- Checks valid directions (no wall collision)
- Stays within map bounds

### MemePlay Integration
- Listens for `GAME_OVER` messages from parent
- Sends `GAME_SCORE` messages with score and level

## Customization Points

### Speed Adjustment
Edit `config.js`:
```javascript
PLAYER_SPEED: 2,    // Player movement speed
GHOST_SPEED: 1.5,   // Ghost movement speed
```

### Colors
Edit `config.js`:
```javascript
WALL_COLOR: '#1a1a2e',
PATH_COLOR: '#0f0f1e',
FRAGMENT_COLORS: ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181'],
```

### Map Selection
Edit `maps.js` to modify maps or add new ones. Update `MAPS` array.

### Mobile Controls
Edit `style.css`:
```css
.mobile-controls {
  height: 333px; /* 1/3 of 1000px */
}
.control-btn {
  width: 100px;
  height: 100px;
  opacity: 0.4;
}
```

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires Canvas API support

## Notes

- All game state is stored in memory (no persistent saves)
- Brand config is saved to `localStorage` (key: `pacman_brand_config`)
- Game runs at ~60 FPS using `requestAnimationFrame`
- Canvas is 720×1000 pixels (portrait mode)

## Future Enhancements (Not in MVP1)

- Power pellets (make ghosts vulnerable)
- Multiple game modes
- High score system
- Sound effects
- Particle effects
- More complex ghost AI patterns
- Custom map editor

