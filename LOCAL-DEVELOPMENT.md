# Local Development Guide

## Short URL Support

Short URLs (e.g., `/pacman-game-8041`) are supported on **Vercel production** via `vercel.json` rewrites.

## Testing Short URLs Locally

### Option 1: Use `serve` Package (Recommended) ✅

The project includes `serve.json` config for rewrite support:

1. **Start server with rewrite support:**
   ```bash
   # Windows
   START-LOCAL-SERVER.bat
   
   # Or manually
   npm install
   npm run dev
   ```

2. **Access short URLs:**
   ```
   http://localhost:5500/pacman-game-8041 ✅
   ```

### Option 2: Use Full URL

If using `python -m http.server` or Live Server:

```
http://localhost:5500/games/templates/pacman-template/index.html?game=pacman-game-8041
```

## Why?

Most local static servers (like `http-server`, `python -m http.server`, or Live Server) don't support rewrite rules. The `serve` package supports rewrites via `serve.json`.

## Production URLs

On production (memeplay.dev), both formats work:
- Short: `https://memeplay.dev/pacman-game-8041` ✅
- Full: `https://memeplay.dev/games/templates/pacman-template/index.html?game=pacman-game-8041` ✅

