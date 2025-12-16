# Crypto Blocks 8×8 - Local Testing Guide

## 🎮 Test Game Locally

### Option 1: Direct File Open
1. Open `games/crypto-blocks/index.html` in your browser
2. Note: Some features (postMessage) may not work without parent frame

### Option 2: Local Server (Recommended)
1. Start a local server:
   ```bash
   # Python 3
   python -m http.server 5500
   
   # Or use Live Server extension in VS Code
   ```

2. Open in browser:
   ```
   http://localhost:5500/games/crypto-blocks/index.html
   ```

### Option 3: Test in MemePlay Platform
1. Add to `games/game-list.html`:
   ```html
   <div class="game-card" data-game-id="crypto-blocks">
     <iframe src="games/crypto-blocks/index.html"></iframe>
   </div>
   ```

2. Add to `index.html` `gameUrls`:
   ```javascript
   'crypto-blocks': 'games/crypto-blocks/index.html'
   ```

3. Test at:
   ```
   http://localhost:5500/#crypto-blocks
   ```

## 🎯 Game Features

✅ **8×8 Grid** (81px cells, centered in 720×1000px)
✅ **5 Block Colors** (Red, Green, Blue, Purple, Yellow)
✅ **3-Block Turn System** (place 3 blocks per turn)
✅ **Row/Column Clearing** (full lines auto-clear)
✅ **Combo System** (×1 to ×5, increases when consecutive turns clear)
✅ **8-bit Sound Effects** (place, clear, combo, game over)
✅ **Diamond Combo Indicator** (animated when combo increases)
✅ **Preview Blocks** (shows next blocks to place)
✅ **Score System** (points = lines cleared × combo multiplier)

## 🐛 Known Issues / TODO

- [ ] Test on mobile devices
- [ ] Optimize performance for low-end devices
- [ ] Add visual feedback when placing blocks
- [ ] Add particle effects on line clear
- [ ] Improve block rendering (glossy effect could be better)

## 📝 Notes

- Grid is 8×8 (not 9×9 as mentioned in some parts of spec)
- Combo increases only when previous turn also cleared lines
- Game over when grid is completely filled
- All sounds are generated via Web Audio API (no external files needed)

