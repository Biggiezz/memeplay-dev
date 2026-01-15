# Homepage Game Display

## Overview

The MemePlay homepage displays a curated feed of games, optimized for discovery and engagement.

## Display Rules

### One Game Per Template

- **The homepage shows only one game per template**
- **The displayed game is the one with the highest likes at load time**
- This is a **presentation-layer behavior**, not a database rule

### Selection Logic

1. Games are loaded from Supabase and sorted by `likes_count` (descending)
2. If multiple games share the same `likes_count`, they are further sorted by `plays_count` (descending)
3. After sorting, games are deduplicated by `template_id`
4. Only the first game (highest-liked) for each template is kept
5. The final list is limited to a maximum of 11 games

### Implementation Details

The deduplication logic is implemented in `scripts/app-v3.js` within the `loadGameListFromSupabase()` function:

```javascript
// After sorting games by likes_count DESC
const seenTemplates = new Set()
allGames = allGames.filter(game => {
  if (seenTemplates.has(game.template_id)) {
    return false
  }
  seenTemplates.add(game.template_id)
  return true
})

// Limit to 11 templates
allGames = allGames.slice(0, 11)
```

## Important Notes

- **This is a presentation-layer filter**: The database still contains all games
- **No backend or database changes**: This behavior is implemented entirely in the frontend
- **Selection is based on load time**: The game with the highest likes at the moment of page load is selected
- **Real-time updates**: If a game's likes change, the selection will update on the next page load (after cache expires)

## Cache Behavior

The game list is cached in localStorage with a 5-minute TTL. To see immediate changes:

1. Clear localStorage, or
2. Wait for the cache to expire (5 minutes)

## Technical Constraints

- No backend or database changes required
- Minimal code changes (deduplication logic only)
- Existing behavior unchanged except for deduplication
- Compatible with existing caching and real-time sync mechanisms

