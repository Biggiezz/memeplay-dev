# Local Development Guide

## Short URL Support

Short URLs (e.g., `/pacman-game-8041`) are supported on **Vercel production** via `vercel.json` rewrites.

For **local development**, use the full URL format:

```
http://localhost:5500/games/templates/pacman-template/index.html?game=pacman-game-8041
```

## Why?

Local static servers (like `http-server`, `python -m http.server`, or Live Server) don't support rewrite rules. The short URL format only works on Vercel deployment.

## Testing Short URLs Locally

If you need to test short URLs locally, you can:

1. **Use full URL** (recommended for local testing)
2. **Deploy to Vercel** and test there
3. **Use a local server with rewrite support** (like `serve` with custom config)

## Production URLs

On production (memeplay.dev), both formats work:
- Short: `https://memeplay.dev/pacman-game-8041` ✅
- Full: `https://memeplay.dev/games/templates/pacman-template/index.html?game=pacman-game-8041` ✅

