  // 1️⃣ Import Supabase SDK (library for connecting to Supabase directly on web)
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

  // === ✅ FIX 1: GUARD INIT - Prevent double initialization ===
  if (window.__MEMEPLAY_APP_INITIALIZED__) {
    console.warn('[APP] ⚠️ Initialization skipped (already initialized - likely live-reload or double script load)')
    throw new Error('App already initialized') // Stop execution safely
  }
  window.__MEMEPLAY_APP_INITIALIZED__ = true
  console.log('[APP] ✅ Initialization guard set')

  // ✅ SIMPLE FIX: Clear Pacman localhost games from localStorage on every page load
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('pacman_brand_config_') && 
        localStorage.getItem(key)?.includes('localhost')) {
      localStorage.removeItem(key)
    }
  })

  // 2️⃣ Declare connection info (URL & Anon Key of your project)
  const SUPABASE_URL = 'https://iikckrcdrvnqctzacxgx.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpa2NrcmNkcnZucWN0emFjeGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Mzc3NDgsImV4cCI6MjA3NzMxMzc0OH0.nIPvf11YfFlWH0XHDZdxI496zaP431QOJCuQ-5XX4DQ'

  // 3️⃣ Create "supabase" object for using RPC, queries, insert, etc.
  // ✅ FIX: Completely disable realtime to prevent local network permission prompt
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // NO realtime config - completely disabled
    global: {
      headers: {},
      fetch: (url, options = {}) => {
        return fetch(url, options);
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
  
  // ✅ CRITICAL: Explicitly disconnect realtime to prevent WebSocket connections
  // This prevents the "local network permission" popup on production
  if (supabase.realtime) {
    supabase.realtime.disconnect();
  }

  // ✅ Template IDs (matching play.js)
  const PACMAN_TEMPLATE_ID = 'pacman-template'
  const BLOCKS_TEMPLATE_ID = 'blocks-8x8'
  const WALL_BOUNCE_BIRD_TEMPLATE_ID = 'wall-bounce-bird'
  const BLOW_BUBBLE_TEMPLATE_ID = 'blow-bubble'
  const PACMAN_STORAGE_PREFIX = 'pacman_brand_config_'
  const BLOCKS_STORAGE_PREFIX = 'blocks_brand_config_'
  const WALL_BOUNCE_BIRD_STORAGE_PREFIX = 'wall_bounce_bird_config_'
  const BLOW_BUBBLE_STORAGE_PREFIX = 'blow_bubble_config_'

  // Global state for current filter
  let currentFilter = 'Recommended' // 'Recommended', 'Liked', 'Trending', 'Popular'
  
  const urlParams = new URLSearchParams(window.location.search)
  const hashParam = window.location.hash ? window.location.hash.replace(/^#/, '') : ''
  const sharedGameIdFromUrl = urlParams.get('game') || (hashParam && !hashParam.startsWith('?') ? hashParam : '')
  const isPlayMode = document.body?.dataset?.mode === 'play' || window.location.pathname.includes('play.html')

  if (isPlayMode) {
    document.body.classList.add('play-mode-active')
  }

  // Sort games by likes (descending - highest likes first)
  async function sortGamesByLikes(cards) {
    if (!cards || cards.length === 0) return cards
    
    // Get like counts for all games in parallel
    const likeCounts = await Promise.all(
      cards.map(async (card) => {
        const gameId = card.id || card.getAttribute('data-game-id')
        if (!gameId) return { gameId: null, likes: 0 }
        
        try {
          const { data, error } = await supabase.rpc('get_social_counts', { p_game_id: gameId })
          if (error) {
            console.warn(`Failed to get likes for ${gameId}:`, error.message)
            return { gameId, likes: 0 }
          }
          return { gameId, likes: (data?.likes || 0) }
        } catch (e) {
          console.warn(`Error getting likes for ${gameId}:`, e)
          return { gameId, likes: 0 }
        }
      })
    )
    
    // Create map for quick lookup
    const likesMap = new Map(likeCounts.map(item => [item.gameId, item.likes]))
    
    // Sort cards by likes (descending)
    const sorted = [...cards].sort((a, b) => {
      const aId = a.id || a.getAttribute('data-game-id')
      const bId = b.id || b.getAttribute('data-game-id')
      const aLikes = likesMap.get(aId) || 0
      const bLikes = likesMap.get(bId) || 0
      return bLikes - aLikes // Descending order
    })
    
    // ✅ DEBUG: Log top 5 games with their like counts
    const top5 = sorted.slice(0, 5).map((card, idx) => {
      const gameId = card.id || card.getAttribute('data-game-id')
      const likes = likesMap.get(gameId) || 0
      return `${idx + 1}. ${gameId} (${likes} likes)`
    })
    console.log(`📊 Sorted ${sorted.length} games by likes (highest first):`, top5.join(', '))
    
    return sorted
  }
  
  // Filter games by "Liked" (user's liked games)
  // CRITICAL: Only return games that are LIKED (localStorage = '1')
  // Games that are UNLIKED or NEVER LIKED will be filtered out (hidden)
  function filterLikedGames(cards) {
    if (!cards || cards.length === 0) return cards
    
    const likedGames = cards.filter(card => {
      const gameId = card.id || card.getAttribute('data-game-id')
      if (!gameId) return false
      
      // CRITICAL: Only show games where localStorage has '1' (liked)
      // If localStorage is '0' (unliked) or null/undefined (never liked) → HIDE
      const likeStatus = localStorage.getItem('mp_like_' + gameId)
      const isLiked = likeStatus === '1'
      
      if (!isLiked) {
        console.log(`   ❌ Game ${gameId} is NOT liked (status: ${likeStatus || 'null'}) → Will be HIDDEN`)
      }
      
      return isLiked
    })
    
    console.log(`❤️ Filtered to ${likedGames.length} liked game(s) (${cards.length - likedGames.length} games will be HIDDEN)`)
    return likedGames
  }
  
  // Apply filter and reorder games
  // Make it globally accessible (for event listeners in non-module scripts)
  window.applyGameFilter = async function applyGameFilter(category) {
    const container = document.querySelector('.game-container')
    if (!container) return
    
    currentFilter = category
    console.log(`🔍 Applying filter: ${category}`)
    
    // Get all game cards
    const allCards = Array.from(container.querySelectorAll('.game-card'))
    if (allCards.length === 0) return
    
    let filteredCards = allCards
    
    // Apply filter based on category
    if (category === 'Liked') {
      // STEP 1: First, hide ALL games
      allCards.forEach(card => {
        card.style.display = 'none'
      })
      
      // STEP 2: Filter to get only liked games
      filteredCards = filterLikedGames(allCards)
      
      // STEP 3: Show ONLY liked games
      filteredCards.forEach(card => {
        const gameId = card.id || card.getAttribute('data-game-id')
        card.style.display = '' // Show liked games
        console.log(`   ✅ Game ${gameId} is LIKED → SHOW`)
      })
      
      // STEP 4: Double-check: Hide any remaining games that are NOT liked
      allCards.forEach(card => {
        const gameId = card.id || card.getAttribute('data-game-id')
        if (!gameId) {
          card.style.display = 'none'
          return
        }
        
        const likeStatus = localStorage.getItem('mp_like_' + gameId)
        const isLiked = likeStatus === '1'
        
        if (!isLiked) {
          card.style.display = 'none' // Hide unliked/never-liked games
          console.log(`   ❌ Game ${gameId} is NOT liked (status: ${likeStatus || 'null'}) → HIDE`)
        }
      })
      
      if (filteredCards.length === 0) {
        console.log('⚠️ No liked games found - all games will be HIDDEN')
      } else {
        console.log(`❤️ Showing ${filteredCards.length} liked game(s)`)
      }
    } else {
      // Show all games for other filters
      allCards.forEach(card => card.style.display = '')
    }
    
    // Sort by likes (for Recommended, Trending, Popular, and Liked)
    if (category === 'Recommended' || category === 'Trending' || category === 'Popular' || category === 'Liked') {
      // Only sort visible games (for 'Liked', this is already filteredCards)
      const cardsToSort = category === 'Liked' ? filteredCards : allCards.filter(card => card.style.display !== 'none')
      filteredCards = await sortGamesByLikes(cardsToSort)
    }
    
    // Reorder DOM elements (only visible/liked games)
    // CRITICAL: Deduplicate by gameId to prevent duplicate games
    const seenGameIds = new Set()
    const visibleCards = filteredCards.filter(card => {
      const gameId = card.id || card.getAttribute('data-game-id')
      if (!gameId) return false
      
      // Skip if we've already seen this gameId
      if (seenGameIds.has(gameId)) {
        console.warn(`⚠️ Duplicate game detected: ${gameId} - skipping`)
        return false
      }
      seenGameIds.add(gameId)
      
      // For 'Liked' filter, double-check localStorage
      if (category === 'Liked') {
        const likeStatus = localStorage.getItem('mp_like_' + gameId)
        return likeStatus === '1'
      }
      
      return card.style.display !== 'none'
    })
    
    console.log(`📋 Reordering ${visibleCards.length} unique games (${seenGameIds.size} unique gameIds)`)
    
    visibleCards.forEach((card) => {
      container.appendChild(card) // Move to end (will reorder)
    })
    
    // Reinitialize after reordering
    const newAllCards = Array.from(container.querySelectorAll('.game-card'))
    
    // CRITICAL: Remove any duplicate games by gameId (keep only the first occurrence)
    const gameIdMap = new Map()
    const duplicatesToRemove = []
    
    newAllCards.forEach((card, index) => {
      const gameId = card.id || card.getAttribute('data-game-id')
      if (!gameId) return
      
      if (gameIdMap.has(gameId)) {
        // This is a duplicate - mark for removal
        duplicatesToRemove.push(card)
        console.warn(`⚠️ Found duplicate game in DOM: ${gameId} at index ${index} - will be removed`)
      } else {
        gameIdMap.set(gameId, card)
      }
    })
    
    // Remove duplicates from DOM
    duplicatesToRemove.forEach(card => {
      card.remove()
      console.log(`🗑️ Removed duplicate game: ${card.id || card.getAttribute('data-game-id')}`)
    })
    
    // Get updated list after removing duplicates
    const finalAllCards = Array.from(container.querySelectorAll('.game-card'))
    
    // Final check: Ensure only liked games are visible when filter is 'Liked'
    if (category === 'Liked') {
      finalAllCards.forEach(card => {
        const gameId = card.id || card.getAttribute('data-game-id')
        if (!gameId) {
          card.style.display = 'none'
          return
        }
        
        const likeStatus = localStorage.getItem('mp_like_' + gameId)
        if (likeStatus !== '1') {
          card.style.display = 'none'
        }
      })
    }
    
    const visibleAllCards = finalAllCards.filter(card => card.style.display !== 'none')
    
    if (typeof window.initializeGameStates === 'function') {
      window.initializeGameStates(finalAllCards)
    }
    
    // Reinitialize observer (cards order changed)
    initGameObserver()
    
    // Auto load first game (after filter/sort) - only if there are visible games
    if (visibleAllCards.length > 0 && visibleAllCards[0]?.id) {
      const game1Id = visibleAllCards[0].id
      const game2Id = visibleAllCards[1]?.id
      
      const game1Card = getGameCardElement(game1Id)
      if (game1Card) {
        loadGameIframe(game1Id)
        setGameState(game1Id, GAME_STATES.ACTIVE)
        currentActiveGame = game1Id
        try { window.__memeplayActiveGame = game1Id } catch {}
        document.dispatchEvent(new CustomEvent('memeplay:active-game-changed', { detail: { gameId: game1Id } }))
        console.log(`🚀 Filter applied: Game 1 (${game1Id}) loaded`)
      }
      
      if (game2Id) {
        const game2Card = getGameCardElement(game2Id)
        if (game2Card) {
          setGameState(game2Id, GAME_STATES.WAITING)
          loadGameIframe(game2Id)
          console.log(`📦 Filter applied: Game 2 (${game2Id}) preloaded`)
        }
      }
      
      // Scroll to first game
      const gameContainer = document.querySelector('.game-container')
      if (game1Card && gameContainer) {
        gameContainer.style.scrollSnapType = 'none'
        gameContainer.scrollTop = 0
        game1Card.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setTimeout(() => {
          gameContainer.style.scrollSnapType = 'y mandatory'
        }, 1000)
      }
    }
  }

  async function loadUserCreatedGames() {
    const container = document.querySelector('.game-container')
    if (!container) {
      console.warn('❌ Game container not found')
      return []
    }

    const baseUrl = window.location.origin.replace(/\/$/, '')
    container.querySelectorAll('.game-card[data-user-created="true"]').forEach(card => card.remove())

    // ✅ CLEANUP: Remove ALL existing Pacman games from production (one-time cleanup)
    // After this cleanup, new games created on production will display normally
    const isProduction = !window.location.origin.includes('localhost') && 
                         !window.location.origin.includes('127.0.0.1') && 
                         !window.location.origin.includes('192.168.')
    
    // Run Pacman cleanup only once per browser to avoid repeated heavy scans
    const PACMAN_CLEANUP_KEY = 'mp_pacman_cleanup_done_v2'
    let shouldRunPacmanCleanup = false
    try {
      shouldRunPacmanCleanup = localStorage.getItem(PACMAN_CLEANUP_KEY) !== 'true'
    } catch (err) {
      shouldRunPacmanCleanup = !window.__memeplayPacmanCleanupDone
    }

    if (isProduction && shouldRunPacmanCleanup) {
      console.log('🧹 [CLEANUP] Production detected - Removing existing Pacman games (one-time cleanup)')
      
      // Remove all Pacman games from DOM
      const allPacmanGames = container.querySelectorAll('.game-card[id^="pacman-"], .game-card[data-game-id^="pacman-"]')
      allPacmanGames.forEach(card => {
        const gameId = card.id || card.getAttribute('data-game-id') || ''
        if (gameId && (gameId.startsWith('pacman-') || gameId.startsWith('pacman-game-'))) {
          console.log(`🗑️ [CLEANUP] Removing Pacman game from DOM: ${gameId}`)
          card.remove()
        }
      })
      
      // Delete all Pacman games from localStorage (keep creation logic intact)
      const keysToDelete = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('pacman_brand_config_')) {
          const gameId = key.replace('pacman_brand_config_', '')
          if (gameId.startsWith('pacman-') || gameId.startsWith('pacman-game-')) {
            keysToDelete.push(key)
          }
        }
      }
      keysToDelete.forEach(key => {
        localStorage.removeItem(key)
        console.log(`🗑️ [CLEANUP] Deleted from localStorage: ${key}`)
      })
      
      if (keysToDelete.length > 0) {
        console.log(`✅ [CLEANUP] Removed ${keysToDelete.length} Pacman games from localStorage`)
      }

      try {
        localStorage.setItem(PACMAN_CLEANUP_KEY, 'true')
      } catch (_) {}
      window.__memeplayPacmanCleanupDone = true
    } else if (isProduction) {
      console.log('⏭️ [CLEANUP] Skipped Pacman cleanup (already completed once)')
    }

    // ✅ OPTIMIZATION 2: Priority loading - Check ?game= parameter first
    const urlParams = new URLSearchParams(window.location.search)
    const gameIdFromQuery = urlParams.get('game')
    let priorityGame = null
    let priorityGameActivated = false

    if (gameIdFromQuery) {
      console.log(`⚡ [PRIORITY] Loading game from ?game= parameter: ${gameIdFromQuery}`)
      priorityGame = loadGameFromLocalStorage(gameIdFromQuery, baseUrl)
      
      // ✅ FIX: If not found in localStorage, try Supabase immediately
      if (!priorityGame) {
        console.log(`⚠️ [PRIORITY] Priority game not found in localStorage, trying Supabase...`)
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('list_user_created_games', {
            p_template_id: 'pacman-template'
          })
          
          if (!rpcError && Array.isArray(rpcData)) {
            const foundGame = rpcData.find(item => {
              const gameId = item?.game_id || item?.id
              return gameId === gameIdFromQuery
            })
            
            if (foundGame) {
              let stories = foundGame.stories || []
              if (typeof stories === 'string') {
                try {
                  stories = JSON.parse(stories)
                } catch (e) {
                  stories = []
                }
              }
              if (!Array.isArray(stories)) {
                stories = []
              }
              
              const gameId = foundGame.game_id || foundGame.id || gameIdFromQuery
              priorityGame = {
                source: 'supabase',
                gameId: gameId,
                title: foundGame.title || 'Pacman Game',
                creator: foundGame.creator_name || foundGame.creator_id || 'Creator',
                mapColor: foundGame.map_color || '#1a1a2e',
                fragmentLogoUrl: foundGame.fragment_logo_url || '',
                mapIndex: Number.isInteger(foundGame.map_index) ? foundGame.map_index : 0,
                stories: stories,
                likes: foundGame.likes_count ?? foundGame.likes ?? 0,
                comments: foundGame.comments_count ?? foundGame.comments ?? 0,
                plays: foundGame.plays_count ?? foundGame.plays ?? 0,
                templateUrl: foundGame.template_url || `${baseUrl}/games/templates/pacman-template/index.html?game=${gameId}`,
                publicUrl: foundGame.public_url || `${baseUrl}/?game=${gameId}`
              }
              console.log(`✅ [PRIORITY] Found priority game in Supabase: ${priorityGame.gameId}`)
              cachePacmanBrandConfig(priorityGame)
            } else {
              console.log(`⚠️ [PRIORITY] Priority game not found in Supabase: ${gameIdFromQuery}`)
            }
          }
        } catch (err) {
          console.error(`❌ [PRIORITY] Error loading from Supabase:`, err)
        }
      }
      
      if (priorityGame) {
        // Filter out old format
        if (!priorityGame.gameId.startsWith('pacman-game-')) {
          console.log(`⚡ [PRIORITY] Rendering priority game immediately: ${priorityGame.gameId}`)
          renderUserGameCard(priorityGame, container)
          priorityGameActivated = true
          // Activate game immediately (<200ms)
          setTimeout(() => {
            if (typeof activateGame === 'function') {
              console.log(`⚡ [PRIORITY] Activating priority game: ${priorityGame.gameId}`)
              activateGame(priorityGame.gameId)
            }
          }, 50)
        } else {
          console.log(`⚠️ [PRIORITY] Priority game is old format, skipping: ${gameIdFromQuery}`)
          priorityGame = null
        }
      }
    }

    // ✅ OPTIMIZATION 1: Optimistic rendering - Load all games from localStorage first (<100ms)
    const startTime = performance.now()
    const localGames = loadLocalUserGames(baseUrl)
    const localLoadTime = performance.now() - startTime
    // ✅ PERFORMANCE: Removed debug log (summary in COMPLETE log)

    // Filter out old format and priority game (already rendered)
    // === ✅ FIX 2: COUNTER LOGS - Replace per-item logs with summary ===
    let filteredPacmanCount = 0
    const filteredLocalGames = localGames.filter(game => {
      if (!game || !game.gameId) return false
      if (game.gameId.startsWith('pacman-game-')) return false // Old format
      // ✅ CLEANUP: Filter out Pacman games created on localhost (check templateUrl)
      if (game.gameId.startsWith('pacman-')) {
        const templateUrl = game.templateUrl || ''
        const isLocalGame = templateUrl.includes('localhost') || templateUrl.includes('127.0.0.1') || templateUrl.includes('192.168.')
        if (isLocalGame) {
          filteredPacmanCount++ // Count instead of log per item
          return false
        }
      }
      if (priorityGameActivated && game.gameId === priorityGame?.gameId) return false // Skip if already rendered
      return true
    })
    
    // Summary log after filtering
    if (filteredPacmanCount > 0) {
      console.warn(`🗑️ [FILTER] Filtered out ${filteredPacmanCount} localhost Pacman test games from render`)
    }

    // Render all local games immediately (optimistic)
    if (filteredLocalGames.length > 0) {
      // ✅ PERFORMANCE: Removed debug log
      filteredLocalGames.forEach(game => {
        // Skip if already rendered (priority game)
        if (document.getElementById(game.gameId)) {
          return
        }
        renderUserGameCard(game, container)
      })

      // ✅ FIX: Don't activate first game if in "Recommended" category (will sort by likes after)
      // Only activate first game if NOT in Recommended category (Liked, Trending, Popular)
      // This prevents showing wrong game before sort completes
      if (!priorityGameActivated && filteredLocalGames.length > 0) {
        const isRecommended = currentFilter === 'Recommended'
        if (!isRecommended) {
          // Only activate first game if NOT in Recommended category
        const firstGame = filteredLocalGames[0]
        setTimeout(() => {
          if (typeof activateGame === 'function') {
              // ✅ PERFORMANCE: Removed debug log
            activateGame(firstGame.gameId)
          }
        }, 100)
        } else {
          console.log(`⏭️ [OPTIMISTIC] Skipping first game activation (Recommended category - will sort by likes first)`)
        }
      }
    }

    // ✅ Load Supabase games in background (non-blocking)
    // ✅ PERFORMANCE: Removed debug log (summary in COMPLETE log)
    const supabasePromise = fetchSupabaseUserGames(baseUrl).then(supabaseGames => {
      // ✅ PERFORMANCE: Removed debug log (summary in COMPLETE log)
      // ✅ PERFORMANCE: Removed debug logs (only keep summary)
      return supabaseGames
    }).catch(error => {
      console.error('❌ [BACKGROUND] Supabase load failed:', error)
      console.error('❌ [BACKGROUND] Error details:', error.message, error.stack)
      return []
    })

    // Wait for Supabase and merge with local games
    const supabaseGames = await supabasePromise
    const allGames = supabaseGames.length > 0 ? supabaseGames : localGames

    // ✅ DEBUG: Log before merge
    // ✅ PERFORMANCE: Removed debug log (summary in COMPLETE log)

    // Merge: Supabase games override local games (have more accurate data like likes, comments)
    const gameMap = new Map()
    // Add local games first
    localGames.forEach(game => {
      if (game.gameId && !game.gameId.startsWith('pacman-game-')) {
        if (game.templateId === PACMAN_TEMPLATE_ID && game.gameId.startsWith('pacman-')) {
          const templateUrl = game.templateUrl || ''
          const isLocalGame = templateUrl.includes('localhost') || templateUrl.includes('127.0.0.1') || templateUrl.includes('192.168.')
          if (isLocalGame) {
            console.log(`🗑️ [MERGE] Filtered out localhost Pacman game: ${game.gameId}`)
            return
          }
        }
        gameMap.set(game.gameId, game)
        // ✅ PERFORMANCE: Removed debug log (201+ logs per page load)
      } else if (game.gameId && game.gameId.startsWith('pacman-game-')) {
        console.log(`🗑️ [MERGE] Filtered out old format local game: ${game.gameId}`)
      }
    })
    // Override with Supabase games (more accurate)
    supabaseGames.forEach(game => {
      if (game.gameId && !game.gameId.startsWith('pacman-game-')) {
        if (game.templateId === PACMAN_TEMPLATE_ID && game.gameId.startsWith('pacman-')) {
          const templateUrl = game.templateUrl || ''
          const isLocalGame = templateUrl.includes('localhost') || templateUrl.includes('127.0.0.1') || templateUrl.includes('192.168.')
          if (isLocalGame) {
            console.log(`🗑️ [MERGE] Filtered out localhost Pacman game from Supabase: ${game.gameId} (templateUrl: ${templateUrl})`)
            return
          }
        }
        gameMap.set(game.gameId, game)
        // ✅ PERFORMANCE: Removed debug log (201+ logs per page load)
      } else if (game.gameId && game.gameId.startsWith('pacman-game-')) {
        console.log(`🗑️ [MERGE] Filtered out old format Supabase game: ${game.gameId}`)
      }
    })
    const mergedGames = Array.from(gameMap.values())

    // ✅ PERFORMANCE: Removed debug log (summary in COMPLETE log)
    // ✅ PERFORMANCE: Removed debug logs (only keep summary)
    const pacmanMerged = mergedGames.filter(g => g.gameId && g.gameId.startsWith('pacman-') && !g.gameId.startsWith('pacman-game-'))
    if (pacmanMerged.length === 0) {
      console.warn(`⚠️ [MERGE] No Pacman games found after merge! Check Supabase and localStorage.`)
    }
    const blocksMerged = mergedGames.filter(g => g.gameId && g.gameId.startsWith('blocks-'))
    if (blocksMerged.length === 0) {
      console.warn('⚠️ [MERGE] No Blocks games found after merge! Check localStorage/Supabase.')
    }

    // Update games that were already rendered (update likes, comments, etc.)
    mergedGames.forEach(game => {
      const existingCard = document.getElementById(game.gameId)
      if (existingCard) {
        // Update social counts if different
        const likeCount = existingCard.querySelector('[data-label="likes"]')
        const commentCount = existingCard.querySelector('[data-label="comments"]')
        if (likeCount && game.likes > 0) {
          likeCount.textContent = game.likes
        }
        if (commentCount && game.comments > 0) {
          commentCount.textContent = game.comments
        }
        // Update plays count
        if (typeof setPlaysLabelForCard === 'function' && Number.isFinite(game.plays)) {
          setPlaysLabelForCard(game.gameId, game.plays)
        }
      } else {
        // Render new games from Supabase that weren't in localStorage
        if (!game.gameId.startsWith('pacman-game-')) {
          if (game.templateId === PACMAN_TEMPLATE_ID && game.gameId.startsWith('pacman-')) {
            const templateUrl = game.templateUrl || ''
            const isLocalGame = templateUrl.includes('localhost') || templateUrl.includes('127.0.0.1') || templateUrl.includes('192.168.')
            if (isLocalGame) {
              console.log(`🗑️ [MERGE] Filtered out localhost Pacman game: ${game.gameId}`)
              return
            }
          }
          // ✅ PERFORMANCE: Removed debug log (201+ logs per page load)
          renderUserGameCard(game, container)
        }
      }
    })
    
    // ✅ CLEANUP: All Pacman games were already removed at the start of this function (production only)
    // New games created on production will display normally after this cleanup

    const totalTime = performance.now() - startTime
    if (mergedGames.length > 0) {
      console.log(`✅ [COMPLETE] Loaded ${mergedGames.length} user-created game(s) in ${totalTime.toFixed(2)}ms (local: ${localLoadTime.toFixed(2)}ms, supabase: ${(totalTime - localLoadTime).toFixed(2)}ms)`)
    } else {
      console.log('ℹ️ No user-created games found')
    }
    return mergedGames
  }

  // ✅ OPTIMIZATION: Load single game from localStorage (for priority loading)
  function loadGameFromLocalStorage(gameId, baseUrl) {
    if (!gameId) return null
    const isBlocksGame = typeof gameId === 'string' && gameId.startsWith('blocks-')
    const isWallBounceBirdGame = typeof gameId === 'string' && gameId.startsWith('wall-bounce-bird-')
    try {
      if (isBlocksGame) {
        const storageKey = `${BLOCKS_STORAGE_PREFIX}${gameId}`
        const saved = localStorage.getItem(storageKey)
        if (!saved) return null
        const config = JSON.parse(saved)
        if (!config) return null

        const storyText = typeof config.story === 'string' ? config.story : ''

        return {
          source: 'localStorage',
          templateId: BLOCKS_TEMPLATE_ID,
          gameId,
          title: storyText ? `Blocks 8x8 - ${storyText.slice(0, 24)}` : 'Blocks 8x8 Game',
          creator: 'Blocks 8x8',
          mapColor: config.mapColor || '#0a0a0a',
          fragmentLogoUrl: config.fragmentLogoUrl || '',
          mapIndex: 0,
          stories: storyText ? [storyText] : [],
          likes: 0,
          comments: 0,
          plays: 0,
          templateUrl: `${baseUrl}/games/crypto-blocks/index.html?game=${gameId}`,
          publicUrl: `${baseUrl}/?game=${gameId}`
        }
      }

      if (isWallBounceBirdGame) {
        const storageKey = `wall_bounce_bird_config_${gameId}`
        const saved = localStorage.getItem(storageKey)
        if (!saved) return null
        const config = JSON.parse(saved)
        if (!config) return null

        const storyText = typeof config.story === 'string' ? config.story : ''

        return {
          source: 'localStorage',
          templateId: WALL_BOUNCE_BIRD_TEMPLATE_ID,
          gameId,
          title: storyText ? `Wall Bounce Bird – ${storyText.slice(0, 24)}` : 'Wall Bounce Bird Game',
          creator: 'Wall Bounce Bird',
          mapColor: config.backgroundColor || config.mapColor || '#87ceeb',
          backgroundColor: config.backgroundColor || config.mapColor || '#87ceeb',
          fragmentLogoUrl: config.fragmentLogoUrl || '',
          mapIndex: 0,
          stories: storyText ? [storyText] : [],
          likes: 0,
          comments: 0,
          plays: 0,
          templateUrl: `${baseUrl}/games/wall-bounce-bird/index.html?game=${gameId}`,
          publicUrl: `${baseUrl}/?game=${gameId}`
        }
      }

      const storageKey = `${PACMAN_STORAGE_PREFIX}${gameId}`
      const saved = localStorage.getItem(storageKey)
      if (!saved) return null
      const config = JSON.parse(saved)
      if (!config || !config.title) return null
      
      return {
        source: 'localStorage',
        templateId: PACMAN_TEMPLATE_ID,
        gameId,
        title: config.title || 'Pacman Game',
        creator: config.title || 'Creator',
        mapColor: config.mapColor || '#1a1a2e',
        fragmentLogoUrl: config.fragmentLogoUrl || '',
        mapIndex: typeof config.mapIndex === 'number' ? config.mapIndex : 0,
        stories: Array.isArray(config.stories) ? config.stories : [],
        likes: 0,
        comments: 0,
        plays: 0,
        templateUrl: `${baseUrl}/games/templates/pacman-template/index.html?game=${gameId}`,
        publicUrl: `${baseUrl}/?game=${gameId}`
      }
    } catch (error) {
      console.warn(`[loadGameFromLocalStorage] Failed to load game ${gameId}:`, error)
      return null
    }
  }

  // === ✅ FIX 3: CHUNKED PROCESSING - Helper function ===
  function processInChunks(items, chunkSize, fn, onDone) {
    let i = 0
    function runChunk() {
      const end = Math.min(i + chunkSize, items.length)
      for (; i < end; i++) {
        try { 
          fn(items[i], i) 
        } catch(e) { 
          console.warn('[processInChunks] Error processing item:', e) 
        }
      }
      if (i < items.length) {
        // Yield to event loop to prevent blocking
        if (window.requestIdleCallback) {
          requestIdleCallback(runChunk, {timeout: 200})
        } else {
          setTimeout(runChunk, 16)
        }
      } else {
        if (onDone) onDone()
      }
    }
    runChunk()
  }

  // === ✅ FIX 4: LAZY-LOAD IFRAMES - IntersectionObserver ===
  let gameObserver = null
  
  function initGameObserver() {
    // Disconnect existing observer if any
    if (gameObserver) {
      gameObserver.disconnect()
    }
    
    // Create new observer to lazy-load iframes when visible
    gameObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const card = entry.target
          const iframe = card.querySelector('iframe[data-lazy-src]')
          
          if (iframe && iframe.src === 'about:blank') {
            const lazySrc = iframe.getAttribute('data-lazy-src')
            if (lazySrc) {
              console.log(`🎮 [LAZY-LOAD] Loading iframe for game: ${card.id}`)
              iframe.src = lazySrc
              iframe.removeAttribute('data-lazy-src') // Mark as loaded
            }
          }
        }
      })
    }, {
      root: null, // viewport
      rootMargin: '200px', // Load 200px before entering viewport
      threshold: 0.01 // Trigger when 1% visible
    })
    
    // Observe all game cards
    const allCards = document.querySelectorAll('.game-card')
    allCards.forEach(card => gameObserver.observe(card))
    
    console.log(`👁️ [LAZY-LOAD] Observer initialized for ${allCards.length} game cards`)
  }

  function loadLocalUserGames(baseUrl) {
    // ✅ FIX 3: Collect keys first, then parse in chunks to avoid blocking
    const results = []
    const keysToProcess = []
    
    // Fast pass: collect all keys (no parsing yet)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      
      if ((key.startsWith(PACMAN_STORAGE_PREFIX) && key.length > PACMAN_STORAGE_PREFIX.length && key !== 'pacman_brand_config') ||
          (key.startsWith(BLOCKS_STORAGE_PREFIX) && key.length > BLOCKS_STORAGE_PREFIX.length && key !== 'blocks_brand_config') ||
          (key.startsWith(WALL_BOUNCE_BIRD_STORAGE_PREFIX) && key.length > WALL_BOUNCE_BIRD_STORAGE_PREFIX.length && key !== 'wall_bounce_bird_config') ||
          (key.startsWith(BLOW_BUBBLE_STORAGE_PREFIX) && key.length > BLOW_BUBBLE_STORAGE_PREFIX.length && key !== 'blow_bubble_config')) {
        keysToProcess.push(key)
      }
    }
    
    // Now parse synchronously (but we've reduced the work by pre-filtering)
    // Note: Full async chunking would require refactoring the entire flow
    // This optimization reduces the loop iterations significantly
    for (const key of keysToProcess) {
      if (key.startsWith(PACMAN_STORAGE_PREFIX)) {
        try {
          const gameId = key.replace(PACMAN_STORAGE_PREFIX, '')
          const config = JSON.parse(localStorage.getItem(key) || '{}')
          if (!config || !config.title) continue
          
          results.push({
            source: 'localStorage',
            templateId: PACMAN_TEMPLATE_ID,
            gameId,
            title: config.title || 'Pacman Game',
            creator: config.title || 'Creator',
            mapColor: config.mapColor || '#1a1a2e',
            fragmentLogoUrl: config.fragmentLogoUrl || '',
            mapIndex: typeof config.mapIndex === 'number' ? config.mapIndex : 0,
            stories: Array.isArray(config.stories) ? config.stories : [],
            likes: 0,
            comments: 0,
            plays: 0,
            templateUrl: `${baseUrl}/games/templates/pacman-template/index.html?game=${gameId}`,
            publicUrl: `${baseUrl}/?game=${gameId}`
          })
        } catch (error) {
          console.warn('Failed to parse local Pacman game config:', key, error)
        }
        continue
      }

      if (key.startsWith(BLOCKS_STORAGE_PREFIX)) {
        try {
          const gameId = key.replace(BLOCKS_STORAGE_PREFIX, '')
          const config = JSON.parse(localStorage.getItem(key) || '{}')
          if (!config) continue
          const storyText = typeof config.story === 'string' ? config.story : ''
          
          results.push({
            source: 'localStorage',
            templateId: BLOCKS_TEMPLATE_ID,
            gameId,
            title: storyText ? `Blocks 8x8 - ${storyText.slice(0, 24)}` : 'Blocks 8x8 Game',
            creator: 'Blocks 8x8',
            mapColor: config.mapColor || '#0a0a0a',
            fragmentLogoUrl: config.fragmentLogoUrl || '',
            mapIndex: 0,
            stories: storyText ? [storyText] : [],
            likes: 0,
            comments: 0,
            plays: 0,
            templateUrl: `${baseUrl}/games/crypto-blocks/index.html?game=${gameId}`,
            publicUrl: `${baseUrl}/?game=${gameId}`
          })
        } catch (error) {
          console.warn('Failed to parse local Blocks game config:', key, error)
        }
        continue
      }

      if (key.startsWith(WALL_BOUNCE_BIRD_STORAGE_PREFIX)) {
        try {
          const gameId = key.replace(WALL_BOUNCE_BIRD_STORAGE_PREFIX, '')
          const config = JSON.parse(localStorage.getItem(key) || '{}')
          if (!config) continue
          const storyText = typeof config.story === 'string' ? config.story : ''
          
          results.push({
            source: 'localStorage',
            templateId: WALL_BOUNCE_BIRD_TEMPLATE_ID,
            gameId,
            title: storyText ? `Wall Bounce Bird – ${storyText.slice(0, 24)}` : 'Wall Bounce Bird Game',
            creator: 'Wall Bounce Bird',
            mapColor: config.backgroundColor || config.mapColor || '#87ceeb',
            backgroundColor: config.backgroundColor || config.mapColor || '#87ceeb',
            fragmentLogoUrl: config.fragmentLogoUrl || '',
            mapIndex: 0,
            stories: storyText ? [storyText] : [],
            likes: 0,
            comments: 0,
            plays: 0,
            templateUrl: `${baseUrl}/games/wall-bounce-bird/index.html?game=${gameId}`,
            publicUrl: `${baseUrl}/?game=${gameId}`
          })
        } catch (error) {
          console.warn('Failed to parse local Wall Bounce Bird game config:', key, error)
        }
        continue
      }

      if (key.startsWith(BLOW_BUBBLE_STORAGE_PREFIX) && key.length > BLOW_BUBBLE_STORAGE_PREFIX.length) {
        if (key === 'blow_bubble_config') continue
        try {
          const gameId = key.replace(BLOW_BUBBLE_STORAGE_PREFIX, '')
          const config = JSON.parse(localStorage.getItem(key) || '{}')
          if (!config) continue
          const storyText = typeof config.story === 'string' ? config.story : ''
          
          results.push({
            source: 'localStorage',
            templateId: BLOW_BUBBLE_TEMPLATE_ID,
            gameId,
            title: storyText ? `Blow Bubble – ${storyText.slice(0, 24)}` : 'Blow Bubble Game',
            creator: 'Blow Bubble',
            mapColor: config.backgroundColor || config.mapColor || '#87CEEB',
            backgroundColor: config.backgroundColor || config.mapColor || '#87CEEB',
            fragmentLogoUrl: config.fragmentLogoUrl || '',
            mapIndex: 0,
            stories: storyText ? [storyText] : [],
            likes: 0,
            comments: 0,
            plays: 0,
            templateUrl: `${baseUrl}/games/blow-bubble/index.html?game=${gameId}`,
            publicUrl: `${baseUrl}/?game=${gameId}`
          })
        } catch (error) {
          console.warn('Failed to parse local Blow Bubble game config:', key, error)
        }
        continue
      }
    }
    
    console.log(`📦 [loadLocalUserGames] Loaded ${results.length} games from localStorage (optimized key filtering)`)
    return results
  }

  function cachePacmanBrandConfig(game) {
    if (!game?.gameId) return
    const id = game.gameId
    if (!id.startsWith('pacman-') || id.startsWith('pacman-game-')) return
    try {
      const payload = {
        fragmentLogoUrl: game.fragmentLogoUrl || '',
        title: game.title || 'Pacman Game',
        mapColor: game.mapColor || '#1a1a2e',
        mapIndex: Number.isInteger(game.mapIndex) ? game.mapIndex : 0,
        stories: Array.isArray(game.stories) ? game.stories : []
      }
      localStorage.setItem(`pacman_brand_config_${id}`, JSON.stringify(payload))
      // ✅ PERFORMANCE: Removed debug log (hundreds of logs per page load)
    } catch (error) {
      console.warn('[cachePacmanBrandConfig] Failed to cache Pacman config:', error)
    }
  }

  function cacheBlocksBrandConfig(game) {
    if (!game?.gameId || !game.gameId.startsWith('blocks-')) return
    try {
      const payload = {
        fragmentLogoUrl: game.fragmentLogoUrl || '',
        story: Array.isArray(game.stories) && game.stories.length > 0
          ? game.stories[0]
          : (typeof game.story === 'string' ? game.story : ''),
        mapColor: game.mapColor || '#0a0a0a'
      }
      localStorage.setItem(`${BLOCKS_STORAGE_PREFIX}${game.gameId}`, JSON.stringify(payload))
      // ✅ PERFORMANCE: Removed debug log (hundreds of logs per page load)
    } catch (error) {
      console.warn('[cacheBlocksBrandConfig] Failed to cache Blocks config:', error)
    }
  }

  function cacheWallBounceBirdBrandConfig(game) {
    if (!game?.gameId || !game.gameId.startsWith('wall-bounce-bird-')) return
    try {
      const payload = {
        fragmentLogoUrl: game.fragmentLogoUrl || '',
        story: Array.isArray(game.stories) && game.stories.length > 0
          ? game.stories[0]
          : (typeof game.story === 'string' ? game.story : ''),
        backgroundColor: game.backgroundColor || game.mapColor || '#87ceeb'
      }
      localStorage.setItem(`wall_bounce_bird_config_${game.gameId}`, JSON.stringify(payload))
      // ✅ PERFORMANCE: Removed debug log (hundreds of logs per page load)
    } catch (error) {
      console.warn('[cacheWallBounceBirdBrandConfig] Failed to cache Wall Bounce Bird config:', error)
    }
  }

  function cacheBlowBubbleBrandConfig(game) {
    if (!game?.gameId || !game.gameId.startsWith('blow-bubble-')) return
    try {
      const payload = {
        fragmentLogoUrl: game.fragmentLogoUrl || '',
        story: Array.isArray(game.stories) && game.stories.length > 0
          ? game.stories[0]
          : (typeof game.story === 'string' ? game.story : ''),
        backgroundColor: game.backgroundColor || game.mapColor || '#87CEEB'
      }
      localStorage.setItem(`${BLOW_BUBBLE_STORAGE_PREFIX}${game.gameId}`, JSON.stringify(payload))
      // ✅ PERFORMANCE: Removed debug log (hundreds of logs per page load)
    } catch (error) {
      console.warn('[cacheBlowBubbleBrandConfig] Failed to cache Blow Bubble config:', error)
    }
  }

  async function fetchSupabaseUserGames(baseUrl) {
    if (typeof supabase === 'undefined') {
      console.warn('⚠️ [fetchSupabaseUserGames] Supabase client not available')
      return []
    }

    const fetchByTemplate = async (templateId) => {
    try {
      const { data, error } = await supabase.rpc('list_user_created_games', {
          p_template_id: templateId
      })
      if (error) {
          console.error(`❌ [fetchSupabaseUserGames] RPC error (${templateId}):`, error.message || error)
        return []
      }
        if (!Array.isArray(data) || data.length === 0) {
          console.log(`ℹ️ [fetchSupabaseUserGames] No ${templateId} games found`)
        return []
      }

        const isBlocksTemplate = templateId === BLOCKS_TEMPLATE_ID
        const isWallBounceBirdTemplate = templateId === WALL_BOUNCE_BIRD_TEMPLATE_ID
        const isBlowBubbleTemplate = templateId === BLOW_BUBBLE_TEMPLATE_ID

        return data
        .map(item => {
          const gameId = item?.game_id || item?.id
          if (!gameId) {
            console.warn('⚠️ [fetchSupabaseUserGames] Item missing game_id:', item)
            return null
          }

            let stories = []
            if (isBlocksTemplate || isWallBounceBirdTemplate || isBlowBubbleTemplate) {
              const story = typeof item.story_one === 'string' ? item.story_one.trim() : ''
              if (story) stories.push(story)
            } else {
              stories = Array.isArray(item.stories) ? item.stories : []
              if (typeof item.stories === 'string') {
            try {
                  stories = JSON.parse(item.stories)
            } catch (e) {
              console.warn('⚠️ [fetchSupabaseUserGames] Failed to parse stories as JSON:', e)
              stories = []
            }
          }
              if (!Array.isArray(stories)) stories = []
              const legacyStories = [item.story_one, item.story_two, item.story_three]
                .filter(story => typeof story === 'string' && story.trim() !== '')
                .map(story => story.trim())
              if (legacyStories.length > 0) {
                stories = [...stories, ...legacyStories]
              }
              stories = stories
                .map(story => (typeof story === 'string' ? story.trim() : ''))
                .filter(story => story !== '')
            }

            const defaultTemplateUrl = isBlocksTemplate
              ? `${baseUrl}/games/crypto-blocks/index.html?game=${gameId}`
              : isWallBounceBirdTemplate
              ? `${baseUrl}/games/wall-bounce-bird/index.html?game=${gameId}`
              : isBlowBubbleTemplate
              ? `${baseUrl}/games/blow-bubble/index.html?game=${gameId}`
              : `${baseUrl}/games/templates/pacman-template/index.html?game=${gameId}`
            const templateUrl = item.template_url || defaultTemplateUrl
          const publicUrl = item.public_url || `${baseUrl}/?game=${gameId}`
          
          const isLocalGame = templateUrl.includes('localhost') || templateUrl.includes('127.0.0.1') || templateUrl.includes('192.168.')
          if (isLocalGame) {
            console.log(`🗑️ [fetchSupabaseUserGames] Filtering out localhost game: ${gameId} (template_url: ${templateUrl})`)
            return null
          }
          
            const game = {
            source: 'supabase',
              templateId,
            gameId,
              title: item.title || (isBlocksTemplate ? 'Blocks 8x8 Game' : isWallBounceBirdTemplate ? 'Wall Bounce Bird Game' : isBlowBubbleTemplate ? 'Blow Bubble Game' : 'Pacman Game'),
              creator: item.creator_name || item.creator_id || item.title || (isBlocksTemplate ? 'Blocks 8x8' : isWallBounceBirdTemplate ? 'Wall Bounce Bird' : isBlowBubbleTemplate ? 'Blow Bubble' : 'Creator'),
              mapColor: item.map_color || (isBlocksTemplate ? '#0a0a0a' : isWallBounceBirdTemplate ? '#87ceeb' : isBlowBubbleTemplate ? '#87CEEB' : '#1a1a2e'),
            fragmentLogoUrl: item.fragment_logo_url || '',
              mapIndex: (isBlocksTemplate || isWallBounceBirdTemplate) ? 0 : (Number.isInteger(item.map_index) ? item.map_index : 0),
              stories,
            likes: item.likes_count ?? item.likes ?? 0,
            comments: item.comments_count ?? item.comments ?? 0,
            plays: item.plays_count ?? item.plays ?? 0,
              templateUrl,
              publicUrl
            }

            // ✅ Add backgroundColor for Wall Bounce Bird and Blow Bubble (must match play.js)
            if (isWallBounceBirdTemplate) {
              game.backgroundColor = item.map_color || '#87ceeb'
            }
            if (isBlowBubbleTemplate) {
              game.backgroundColor = item.map_color || item.background_color || '#87CEEB'
            }

            if (isBlocksTemplate) {
              cacheBlocksBrandConfig(game)
            } else if (isWallBounceBirdTemplate) {
              // ✅ Cache Wall Bounce Bird config (similar to Blocks)
              cacheWallBounceBirdBrandConfig(game)
            } else if (isBlowBubbleTemplate) {
              // ✅ Cache Blow Bubble config (similar to Wall Bounce Bird)
              cacheBlowBubbleBrandConfig(game)
            } else {
              cachePacmanBrandConfig(game)
          }
            return game
        })
        .filter(Boolean)
    } catch (error) {
        console.error(`❌ [fetchSupabaseUserGames] Unexpected error (${templateId}):`, error)
      return []
    }
  }

    const [pacmanGames, blocksGames, wallBounceBirdGames, blowBubbleGames] = await Promise.all([
      fetchByTemplate(PACMAN_TEMPLATE_ID),
      fetchByTemplate(BLOCKS_TEMPLATE_ID),
      fetchByTemplate(WALL_BOUNCE_BIRD_TEMPLATE_ID),
      fetchByTemplate(BLOW_BUBBLE_TEMPLATE_ID)
    ])

    return [...pacmanGames, ...blocksGames, ...wallBounceBirdGames, ...blowBubbleGames]
  }

  function renderUserGameCard(game, container) {
    if (!game?.gameId) return
    
    // ✅ FIX: Skip rendering old format Pacman games (pacman-game-*)
    if (game.gameId.startsWith('pacman-game-')) {
      console.log(`🗑️ Skipping render for old format Pacman game: ${game.gameId}`)
      return
    }
    
    if (document.getElementById(game.gameId)) {
      console.log(`⏭️ Game ${game.gameId} already exists, skipping`)
      return
    }

    const gameCard = document.createElement('div')
    gameCard.className = 'game-card'
    gameCard.id = game.gameId
    gameCard.setAttribute('data-game-id', game.gameId)
    gameCard.setAttribute('data-user-created', 'true')
    gameCard.setAttribute('data-source', game.source || 'unknown')
    const isBlocksGame = (game.templateId === BLOCKS_TEMPLATE_ID) || (game.gameId && game.gameId.startsWith('blocks-'))
    const isWallBounceBirdGame = (game.templateId === WALL_BOUNCE_BIRD_TEMPLATE_ID) || (game.gameId && game.gameId.startsWith('wall-bounce-bird-'))
    const isBlowBubbleGame = (game.templateId === BLOW_BUBBLE_TEMPLATE_ID) || (game.gameId && game.gameId.startsWith('blow-bubble-'))
    gameCard.setAttribute('data-template-id', isBlocksGame ? BLOCKS_TEMPLATE_ID : isWallBounceBirdGame ? WALL_BOUNCE_BIRD_TEMPLATE_ID : isBlowBubbleGame ? BLOW_BUBBLE_TEMPLATE_ID : (game.templateId || PACMAN_TEMPLATE_ID))

    const baseUrl = window.location.origin.replace(/\/$/, '')
    const sanitizeUrl = (url, fallbackPath) => {
      if (!url) return `${baseUrl}${fallbackPath}`
      let final = url
      if (/^https?:\/\//i.test(final)) {
        try {
          const parsed = new URL(final)
          
          // ✅ FIX: Check if we're developing locally
          const isLocalDev = window.location.hostname === '127.0.0.1' || 
                             window.location.hostname === 'localhost'
          
          if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
            // Convert localhost URLs to current host
            parsed.protocol = window.location.protocol
            parsed.host = window.location.host
            final = parsed.toString()
          } else if (isLocalDev && parsed.hostname === 'memeplay.dev') {
            // ✅ FIX: Convert production URLs to localhost when developing locally
            // This prevents cross-origin SecurityError when loading games from production URLs
            parsed.protocol = window.location.protocol
            parsed.host = window.location.host
            final = parsed.toString()
          }
        } catch (_) {}
      } else {
        final = final.startsWith('/') ? baseUrl + final : `${baseUrl}/${final}`
      }
      return final
    }

    const defaultPath = isBlocksGame
      ? `/games/crypto-blocks/index.html?game=${game.gameId}`
      : isWallBounceBirdGame
      ? `/games/wall-bounce-bird/index.html?game=${game.gameId}`
      : isBlowBubbleGame
      ? `/games/blow-bubble/index.html?game=${game.gameId}`
      : `/games/templates/pacman-template/index.html?game=${game.gameId}`
    let templateUrl = sanitizeUrl(game.templateUrl, defaultPath)
    if (!templateUrl) {
      console.warn(`⚠️ Missing templateUrl for ${game.gameId}, skipping render`)
      return
    }

    const cacheBuster = `v=${Date.now()}`
    const finalUrl = templateUrl.includes('?')
      ? `${templateUrl}&${cacheBuster}`
      : `${templateUrl}?${cacheBuster}`

    gameCard.innerHTML = `
      <div class="game-stage">
        <iframe
          data-game-url="${templateUrl || game.templateUrl}"
          data-lazy-src="${finalUrl}"
          src="about:blank"
          width="720"
          height="1000"
          frameborder="0"
          scrolling="no"
          allow="autoplay; fullscreen; gamepad"
          style="overflow: hidden; border: none;"
          title="${game.title || (isBlocksGame ? 'Blocks 8x8 Game' : isWallBounceBirdGame ? 'Wall Bounce Bird Game' : isBlowBubbleGame ? 'Blow Bubble Game' : 'Pacman Game')}">
        </iframe>
        <button class="focus-toggle" type="button" aria-label="Toggle focus mode" aria-pressed="false">⤢</button>
      </div>
      <footer class="game-footer">
        <div class="game-icons">
          <div class="game-icons-left">
            <div class="icon-wrapper" data-role="like">
              <button type="button" title="Like" aria-label="Like">
                <svg viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M24 40.5l-1.2-1.1C16 33 10 28 10 21.5 10 17 13.6 13.5 18 13.5c2.8 0 5.5 1.4 7 3.8 1.5-2.4 4.2-3.8 7-3.8 4.4 0 8 3.5 8 8 0 6.5-6 11.6-12.8 17.9L24 40.5z" />
                </svg>
              </button>
              <span class="icon-count" data-label="likes">${game.likes ?? 0}</span>
            </div>
            <div class="icon-wrapper" data-role="comment">
              <button type="button" title="Comments" aria-label="Comments">
                <svg viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M9 20.5c0-7.2 7.5-12.5 16-12.5s16 5.3 16 12.5-7.5 12.5-16 12.5c-2.3 0-4.6-.3-6.7-.9l-5.8 4.7 1.7-6.3C11.5 27.4 9 24.2 9 20.5z" />
                </svg>
              </button>
              <span class="icon-count" data-label="comments">${game.comments ?? 0}</span>
            </div>
            <div class="icon-wrapper" data-role="share">
              <button type="button" title="Share" aria-label="Share">
                <svg viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M10 36 Q16 24 24 18 Q32 12 40 14 M40 14 L35 10 M40 14 L35 18" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
            <div class="icon-wrapper" data-role="leaderboard">
              <button type="button" title="Leaderboard & Rewards" aria-label="Leaderboard">
                <svg viewBox="0 0 48 48" aria-hidden="true">
                  <rect x="8" y="22" width="10" height="18" />
                  <rect x="19" y="12" width="10" height="28" />
                  <rect x="30" y="26" width="10" height="14" />
                </svg>
              </button>
            </div>
          </div>
          <div class="game-icons-right">
            <div class="icon-wrapper" data-role="marketcap">
              <button type="button" title="Market Cap" aria-label="Market Cap">
                <span>...</span>
              </button>
            </div>
          </div>
        </div>
        <div class="creator-text">
          Creator: <strong>${game.creator || game.title || 'User'}</strong>
        </div>
      </footer>
    `

    container.appendChild(gameCard)

    // ✅ Ensure iframe src is set (for browsers that strip inline attributes during DOM insertion)
    const iframeEl = gameCard.querySelector('iframe')
    if (iframeEl && !iframeEl.src) {
      iframeEl.src = finalUrl
    }
    if (isBlocksGame && iframeEl) {
      const blocksPayload = {
        type: 'CRYPTO_BLOCKS_CONFIG',
        payload: {
          story: (Array.isArray(game.stories) && game.stories.length > 0) ? game.stories[0] : '',
          mapColor: game.mapColor || '#0a0a0a',
          logoUrl: game.fragmentLogoUrl || ''
        }
      }
      const sendBlocksConfig = () => {
        try {
          iframeEl.contentWindow?.postMessage(blocksPayload, '*')
        } catch (err) {
          console.warn('[Blocks card] Failed to send config:', err)
        }
      }
      iframeEl.addEventListener('load', () => {
        sendBlocksConfig()
        setTimeout(sendBlocksConfig, 300)
      })
    }
    
    // ✅ Send Wall Bounce Bird config to iframe (similar to Blocks)
    if (isWallBounceBirdGame && iframeEl) {
      const wallBounceBirdPayload = {
        type: 'WALL_BOUNCE_BIRD_CONFIG',
        payload: {
          story: (Array.isArray(game.stories) && game.stories.length > 0) ? game.stories[0] : '',
          backgroundColor: game.backgroundColor || game.mapColor || '#87ceeb',
          logoUrl: game.fragmentLogoUrl || '' // ✅ Game file expects logoUrl, not fragmentLogoUrl
        }
      }
      const sendWallBounceBirdConfig = () => {
        try {
          iframeEl.contentWindow?.postMessage(wallBounceBirdPayload, '*')
        } catch (err) {
          console.warn('[Wall Bounce Bird card] Failed to send config:', err)
        }
      }
      iframeEl.addEventListener('load', () => {
        sendWallBounceBirdConfig()
        setTimeout(sendWallBounceBirdConfig, 300)
      })
    }

    // ✅ Send Blow Bubble config to iframe (similar to Wall Bounce Bird)
    if (isBlowBubbleGame && iframeEl) {
      const blowBubblePayload = {
        type: 'BLOW_BUBBLE_CONFIG',
        payload: {
          story: (Array.isArray(game.stories) && game.stories.length > 0) ? game.stories[0] : '',
          backgroundColor: game.backgroundColor || game.mapColor || '#87CEEB',
          logoUrl: game.fragmentLogoUrl || '' // ✅ Game file expects logoUrl, not fragmentLogoUrl
        }
      }
      const sendBlowBubbleConfig = () => {
        try {
          iframeEl.contentWindow?.postMessage(blowBubblePayload, '*')
        } catch (err) {
          console.warn('[Blow Bubble card] Failed to send config:', err)
        }
      }
      iframeEl.addEventListener('load', () => {
        sendBlowBubbleConfig()
        setTimeout(sendBlowBubbleConfig, 300)
      })
    }

    if (typeof setPlaysLabelForCard === 'function' && Number.isFinite(game.plays)) {
      setPlaysLabelForCard(game.gameId, game.plays)
    }
  }

  async function loadGameCards() {
    const container = document.querySelector('.game-container')
    if (!container) return
    try {
      const response = await fetch('games/game-list.html', { cache: 'no-cache' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const markup = await response.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(markup, 'text/html')
      const wrapper = doc.querySelector('[data-game-list]')
      container.innerHTML = wrapper ? wrapper.innerHTML : markup
      // ✅ PERFORMANCE: Removed debug log
      
      // ✅ ARCHITECTURE: Removed virtual scroll - all games always visible
      
      // ✅ FIX: Remove old format Pacman games immediately after loading
      const oldFormatGames = container.querySelectorAll('.game-card[id^="pacman-game-"], .game-card[data-game-id^="pacman-game-"]')
      oldFormatGames.forEach(card => {
        const gameId = card.id || card.getAttribute('data-game-id') || ''
        console.log(`🗑️ Removing old format Pacman game from DOM: ${gameId}`)
        card.remove()
      })
      
      initFocusControls()
      
      // Load user-created games after loading static games
      await loadUserCreatedGames()
      
      // ✅ FIX: Final cleanup - remove any remaining old format Pacman games
      const remainingOldGames = container.querySelectorAll('.game-card[id^="pacman-game-"], .game-card[data-game-id^="pacman-game-"]')
      remainingOldGames.forEach(card => {
        const gameId = card.id || card.getAttribute('data-game-id') || ''
        console.log(`🗑️ Final cleanup - removing old format Pacman game: ${gameId}`)
        card.remove()
      })
      
      // ✅ OPTIMIZATION: Get all games and load first game IMMEDIATELY (before sort)
      // Sort will happen in background and reorder DOM later
      const allCards = Array.from(document.querySelectorAll('.game-card'))
      const gameContainer = document.querySelector('.game-container')
      
      // ✅ DEBUG: Check if gameContainer exists
      if (!gameContainer) {
        console.error('❌ [INITIAL] game-container not found in DOM!')
        console.log('Available containers:', document.querySelectorAll('[class*="container"]'))
      } else {
        // ✅ PERFORMANCE: Removed debug log
      }

      const focusGameCard = (targetGameId, {
        block = 'center',
        behavior = 'auto',
        activate = true,
        activateDelay = 150,
        reason = '',
        lockMs = 1000, // ✅ ARCHITECTURE: Reduced lock time from 4000ms to 1000ms
        afterActivate = null
      } = {}) => {
        if (!targetGameId) return false
        
        // ✅ FIX: Use container if exists, otherwise use document
        const searchContainer = container || document
        const targetCard = Array.from(searchContainer.querySelectorAll('.game-card')).find(card => {
          const cardId = card.id || card.getAttribute('data-game-id')
          return cardId === targetGameId
        })
        if (!targetCard) {
          console.warn(`⚠️ [FOCUS] Target game not found: ${targetGameId}`)
          return false
        }
        // ✅ PERFORMANCE: Removed debug log
        
        // ✅ FIX: Re-query gameContainer to ensure it exists after DOM reorder
        const currentGameContainer = document.querySelector('.game-container')
        if (!currentGameContainer) {
          console.warn(`⚠️ [FOCUS] game-container not found in DOM, skipping scroll but will still activate game`)
        } else {
          const previousSnap = currentGameContainer.style.scrollSnapType
          const previousBehavior = currentGameContainer.style.scrollBehavior
          currentGameContainer.style.scrollSnapType = 'none'
          currentGameContainer.style.scrollBehavior = behavior
          requestAnimationFrame(() => {
            try {
              targetCard.scrollIntoView({ behavior, block })
              // ✅ PERFORMANCE: Removed debug log
            } catch (err) {
              console.warn('[FOCUS] scrollIntoView failed:', err)
            }
            setTimeout(() => {
              if (currentGameContainer) {
                currentGameContainer.style.scrollSnapType = previousSnap || 'y mandatory'
                currentGameContainer.style.scrollBehavior = previousBehavior || 'smooth'
              }
            }, 800)
          })
        }
        if (activate && typeof activateGame === 'function') {
          const lockExpiresAt = Date.now() + lockMs
          if (lockMs > 0) {
            window.__memeplayLockObserverUntil = lockExpiresAt
            window.__memeplayPinnedGameId = targetGameId
          }
          setTimeout(() => {
            // ✅ PERFORMANCE: Removed debug logs
            activateGame(targetGameId)
            if (typeof afterActivate === 'function') {
              afterActivate()
            }
          }, activateDelay)
          if (lockMs > 0) {
            setTimeout(() => {
              if (window.__memeplayLockObserverUntil === lockExpiresAt) {
                window.__memeplayLockObserverUntil = 0
                window.__memeplayPinnedGameId = null
              }
            }, lockMs + 200)
          }
        } else {
          console.warn(`⚠️ [FOCUS] activateGame function not available or activate=false`)
        }
        return true
      }
      
      // STEP 2: Initialize game states
      if (typeof window.initializeGameStates === 'function') {
        window.initializeGameStates(allCards)
      } else {
        allCards.forEach(card => {
          const gid = card?.id || card?.dataset?.gameId
          if (gid) {
            card.dataset.gameState = card.dataset.gameState || 'hidden'
          }
        })
      }
      
      // STEP 3: Init social handlers only
      // ✅ CRITICAL: DO NOT init observer here - it will activate wrong game before sort
      initSocialHandlers()
      
      // STEP 4: Handle hash navigation (from share links)
      // ⚠️ SKIP hash navigation if in Recommended category - let STEP 6 handle it after sort
      // This ensures game with most likes is shown first, not hash game
      const allCardsWithUserCreated = Array.from(document.querySelectorAll('.game-card'))
      // Check ?game= parameter first (for Pacman games)
      const urlParams = new URLSearchParams(window.location.search)
      const gameIdFromQuery = urlParams.get('game')
      
      // If ?game= parameter exists, use it; otherwise use hash
      const hash = gameIdFromQuery || window.location.hash.slice(1)
      const isRecommended = currentFilter === 'Recommended'
      
      // ✅ OPTIMIZATION: If game was already activated by priority loading, skip this
      // Priority loading already activated the game, just need to scroll into view
      const wasPriorityLoaded = gameIdFromQuery && document.getElementById(gameIdFromQuery)?.dataset?.gameState === 'active'
      
      // Check if target game exists in all cards (including user-created games)
      const targetGameExists = hash && allCardsWithUserCreated.some(c => {
        const cardId = c.id || c.getAttribute('data-game-id')
        return cardId === hash
      })
      
      if (targetGameExists && !isRecommended) {
        // Only handle hash navigation if NOT in Recommended category
        if (wasPriorityLoaded) {
          // Game already activated by priority loading, just scroll into view
          console.log('🔗 [PRIORITY] Game already activated, scrolling into view:', hash)
          setTimeout(() => {
            focusGameCard(hash, { activate: false, behavior: 'smooth', block: 'center', reason: 'priority-loaded hash' })
          }, 200)
        } else {
          // Normal hash navigation (not priority loaded)
          console.log('🔗 Hash/Query detected (not Recommended):', hash)
          setTimeout(() => {
            focusGameCard(hash, { behavior: 'smooth', block: 'start', reason: 'hash navigation' })
          }, 1000)
        }
      } else if (hash && isRecommended) {
        if (gameIdFromQuery) {
          console.log('🔗 Query detected in Recommended category - will handle without resort')
        } else {
        console.log('🔗 Hash/Query detected in Recommended category, will be handled after sort:', hash)
        }
      } else if (hash && !targetGameExists) {
        console.log('⚠️ Hash/Query game not found in current games:', hash)
      }
      
      // STEP 5: MEMEPLAY logo click → Home (Game #1)
      const logoEl = document.getElementById('memeplayLogo')
      if (logoEl) {
        logoEl.addEventListener('click', () => {
          console.log('🏠 MEMEPLAY logo clicked → Go to Game #1')
          window.location.hash = ''
          const firstCard = Array.from(document.querySelectorAll('.game-card'))[0]
          if (firstCard && gameContainer) {
            gameContainer.style.scrollSnapType = 'none'
            gameContainer.scrollTop = 0
            firstCard.scrollIntoView({ behavior: 'smooth', block: 'start' })
            if (firstCard.id) activateGame(firstCard.id)
            setTimeout(() => {
              gameContainer.style.scrollSnapType = 'y mandatory'
            }, 1000)
          }
        })
      }
      
      // ✅ OPTIMIZATION: Load first game IMMEDIATELY (before sort) for faster initial display
      // Sort will happen in background and reorder DOM later
      const shouldSkipInitialSort = Boolean(gameIdFromQuery)
      
      // STEP 6A: Load first game IMMEDIATELY (optimistic load)
      // Check for hash/query first, otherwise use first card in DOM
      // Note: gameIdFromQuery, hash, isRecommended already defined in STEP 4
      let firstGameToLoad = null
      if (gameIdFromQuery) {
        // Priority: ?game= parameter
        const targetCard = allCards.find(card => {
          const cardId = card.id || card.getAttribute('data-game-id')
          return cardId === gameIdFromQuery
        })
        if (targetCard) {
          firstGameToLoad = gameIdFromQuery
          // ✅ PERFORMANCE: Removed debug log
        }
      } else if (hash && !isRecommended) {
        // Hash navigation (not Recommended)
        const targetCard = allCards.find(card => {
          const cardId = card.id || card.getAttribute('data-game-id')
          return cardId === hash
        })
        if (targetCard) {
          firstGameToLoad = hash
          // ✅ PERFORMANCE: Removed debug log
        }
      } else {
        // Default: First card in DOM
        const firstCard = allCards[0]
        if (firstCard) {
          firstGameToLoad = firstCard.id || firstCard.getAttribute('data-game-id')
          // ✅ PERFORMANCE: Removed debug log
        }
      }
      
      // Load first game immediately (if found)
      if (firstGameToLoad) {
        const firstCard = allCards.find(card => {
          const cardId = card.id || card.getAttribute('data-game-id')
          return cardId === firstGameToLoad
        })
        if (firstCard) {
          // Scroll to game and activate immediately (fast load)
          setTimeout(() => {
            if (typeof focusGameCard === 'function') {
              // ✅ PERFORMANCE: Removed debug log
              focusGameCard(firstGameToLoad, {
                block: 'center',
                behavior: 'auto',
                reason: 'fast-load before sort',
                lockMs: 3000, // Lock observer for 3s to prevent conflicts
                activateDelay: 50
              })
            } else if (typeof activateGame === 'function') {
              // ✅ PERFORMANCE: Removed debug log
              activateGame(firstGameToLoad)
            }
          }, 50)
        }
      }
      
      // STEP 6B: Sort games by likes in BACKGROUND (non-blocking)
      // After sort completes, reorder DOM but don't scroll if game is already active
      sortGamesByLikes(allCards).then(sortedCards => {
        if (!Array.isArray(sortedCards) || sortedCards.length === 0) {
          console.warn('⚠️ Sort returned no cards, skipping reorder')
          initGameObserver()
          return
        }
        
        // ✅ PERFORMANCE: Summary log instead of 8+ detailed logs
        const firstAfterSort = sortedCards[0]?.id || sortedCards[0]?.getAttribute('data-game-id')
        console.log(`📊 Sorted ${sortedCards.length} games by likes (top: ${firstAfterSort})`)
        
        // ✅ OPTIMIZATION: Check if game is already active before reordering
        const currentActiveGameId = window.__memeplayActiveGame || document.querySelector('.game-card.is-playing')?.id
        const isGameAlreadyActive = currentActiveGameId && sortedCards.some(card => {
          const cardId = card.id || card.getAttribute('data-game-id')
          return cardId === currentActiveGameId
        })
        
        if (shouldSkipInitialSort) {
          // Game already loaded in STEP 6A, just init observer
          setTimeout(() => {
            initGameObserver()
          }, 500)
          return
        }
        
        // Reorder DOM (background - user already sees game)
        sortedCards.forEach(card => {
          container.appendChild(card)
        })
        
        // ✅ OPTIMIZATION: If game is already active, don't scroll again
        // Just ensure it's in the right position after reorder
        if (isGameAlreadyActive && currentActiveGameId) {
          // Game is already active, just init observer
          setTimeout(() => {
            initGameObserver()
          }, 500)
          return
        }
        
        const handleAfterActivate = (targetId) => () => {
                  const secondAfterSort = sortedCards[1]?.id || sortedCards[1]?.getAttribute('data-game-id')
                  if (secondAfterSort && !isPacmanGame(secondAfterSort)) {
                    const secondCard = getGameCardElement(secondAfterSort)
                    if (secondCard) {
                      setGameState(secondAfterSort, GAME_STATES.WAITING)
                      loadGameIframe(secondAfterSort)
                    }
                  } else if (secondAfterSort && isPacmanGame(secondAfterSort)) {
                    console.log(`⏭️ [Pacman] Skipping preload of second Pacman game: ${secondAfterSort}`)
                  }
                  console.log(`✅ [INITIAL] Scrolled to target game: ${targetId} and activated`)
        }
        
        // ✅ PRIORITY: Check ?game= parameter first (for direct links)
        // Note: If game was already loaded in STEP 6A, we skip this
        const latestQueryId = urlParams.get('game')
        const targetGameId = latestQueryId || hash || firstAfterSort
        
        // ✅ OPTIMIZATION: If game is already active, skip focus (already loaded)
        if (isGameAlreadyActive && currentActiveGameId === targetGameId) {
          console.log(`📊 [INITIAL] Target game ${targetGameId} already active, skipping focus after sort`)
          setTimeout(() => {
            initGameObserver()
            console.log('✅ [INITIAL] Game observer initialized after background sort (target already active)')
          }, 500)
          return
        }
        
        // Check if target game exists in sorted cards
        const targetCard = sortedCards.find(card => {
          const cardId = card.id || card.getAttribute('data-game-id')
          return cardId === targetGameId
        })
        
        // ✅ PERFORMANCE: Removed debug logs
        if (!targetCard) {
          console.warn(`⚠️ Target card NOT found for: ${targetGameId}`)
        }
        
        const focusAfterSort = (finalGameId, originLabel) => {
          if (!finalGameId) {
            console.warn(`⚠️ [FOCUS] No gameId provided for focusAfterSort`)
            return false
          }
          console.log(`🎯 [FOCUS] Attempting to focus: ${finalGameId} (${originLabel})`)
          // ✅ FIX: Increase lock time to 6s to ensure observer doesn't activate different game
          // Observer init after 2.5s, so 6s lock ensures it won't activate game thứ 2
          const ok = focusGameCard(finalGameId, {
            block: 'center',
            behavior: 'auto',
            reason: originLabel,
            lockMs: 6000, // Increased from 4000ms to 6000ms
            afterActivate: handleAfterActivate(finalGameId)
          })
          // ✅ ARCHITECTURE: Removed virtual scroll
          if (!ok && firstAfterSort && finalGameId !== firstAfterSort) {
            console.warn(`⚠️ [FOCUS] focusGameCard failed for ${finalGameId}, trying fallback: ${firstAfterSort}`)
            focusGameCard(firstAfterSort, {
              block: 'center',
              behavior: 'auto',
              reason: 'fallback after sort',
              afterActivate: handleAfterActivate(firstAfterSort)
            })
          } else if (!ok) {
            console.error(`❌ [FOCUS] focusGameCard failed for ${finalGameId} and no fallback available`)
          }
          // ✅ ARCHITECTURE: Removed virtual scroll
          return ok
        }
        
        let initialFocusHandled = false
        const hasShareTarget = Boolean(latestQueryId || hash)
        if (targetCard && hasShareTarget) {
        const finalGameId = targetCard.id || targetCard.getAttribute('data-game-id')
        window.__memeplayStickyVirtualIds = window.__memeplayStickyVirtualIds || new Set()
        window.__memeplayStickyVirtualIds.add(finalGameId)
        console.log(`🎯 [INITIAL] Scrolling to hash/query target: ${finalGameId}`)
        initialFocusHandled = focusAfterSort(finalGameId, latestQueryId ? 'query after sort' : 'hash after sort')
        if (initialFocusHandled) {
          setTimeout(() => {
            window.__memeplayStickyVirtualIds?.delete(finalGameId)
            // ✅ ARCHITECTURE: Removed virtual scroll
          }, 1200)
        }
        }
        
        if (!initialFocusHandled && firstAfterSort) {
          console.log(`🎯 [INITIAL] Using top liked after sort: ${firstAfterSort}`)
          initialFocusHandled = focusAfterSort(firstAfterSort, 'top liked default')
        }
        
        if (!initialFocusHandled) {
          // ✅ FALLBACK: If no game found, try to activate first visible game card
          console.warn('⚠️ [INITIAL] No game found after sort, trying fallback...')
          const fallbackCard = Array.from(document.querySelectorAll('.game-card')).find(card => {
            const cardId = card.id || card.getAttribute('data-game-id')
            return cardId && card.style.display !== 'none'
          })
          if (fallbackCard) {
            const fallbackId = fallbackCard.id || fallbackCard.getAttribute('data-game-id')
            console.log(`🔄 [INITIAL] Fallback: Activating first visible game: ${fallbackId}`)
            focusAfterSort(fallbackId, 'fallback first visible')
          } else {
            console.error('❌ [INITIAL] No game cards found in DOM!')
          }
        }
        
        // Reinitialize after reordering
        const allCardsReordered = Array.from(document.querySelectorAll('.game-card'))
        if (typeof window.initializeGameStates === 'function') {
          window.initializeGameStates(allCardsReordered)
        }
        
        // ✅ OPTIMIZATION: Init observer after focus completes (reduced delay since game already loaded)
        // Game was already loaded in STEP 6A, so we just need to wait for scroll to complete
        setTimeout(() => {
          // ✅ DEBUG: Check which game is currently active before init observer
          const currentActive = window.__memeplayActiveGame || document.querySelector('.game-card.is-playing')?.id
          console.log(`👁️ [INITIAL] Initializing observer, current active game: ${currentActive || 'none'}`)
          initGameObserver()
          console.log('✅ [INITIAL] Game observer initialized after sort and scroll')
          // ✅ ARCHITECTURE: Removed virtual scroll
        }, 800) // Reduced from 2500ms to 800ms since game already loaded
      }).catch(error => {
        console.error('📊 [INITIAL] Sort failed:', error)
        // Continue with original order if sort fails
      })
      
      // ✅ REMOVED: Unload games logic - This was causing games 3+ to not display
      // Games are now managed by activateGame() function which properly loads/unloads games as needed
      // Only unload games that are very far away (more than 3 positions) to save memory
      
    } catch (error) {
      console.error('Load game list failed:', error)
      container.innerHTML = '<div style="padding:24px;text-align:center;color:#bbb;">Unable to load games. Please refresh.</div>'
    }
  }

  function findCardElementByGameId(gameId) {
    if (!gameId) return null
    const byId = document.getElementById(gameId)
    if (byId?.classList?.contains('game-card')) return byId
    return document.querySelector(`.game-card[data-game-id="${gameId}"]`)
  }

  function showPlayModeError(message) {
    const errorBox = document.getElementById('playModeError')
    if (errorBox) {
      errorBox.textContent = message
      errorBox.hidden = false
    } else {
      alert(message)
    }
  }

  function enforcePlayModeView(gameId) {
    const container = document.querySelector('.game-container')
    if (!container) return false
    let targetCard = findCardElementByGameId(gameId) || container.querySelector('.game-card')
    if (!targetCard) return false
    targetCard.remove()
    container.innerHTML = ''
    container.appendChild(targetCard)
    container.style.scrollSnapType = 'none'
    document.body.classList.add('play-mode-ready')
    const activeId = targetCard.id || targetCard.getAttribute('data-game-id')
    if (activeId) {
      setTimeout(() => {
        try { activateGame(activeId) } catch (err) {
          console.warn('[PLAY MODE] activateGame failed:', err)
        }
      }, 300)
    }
    return true
  }

  function updateFocusButtons() {
    const active = document.body.classList.contains('focus-mode')
    document.querySelectorAll('.focus-toggle').forEach(btn => {
      btn.setAttribute('aria-pressed', active ? 'true' : 'false')
      btn.textContent = active ? '⤡' : '⤢'
    })
  }

  const focusState = { scrollTop: 0, gameId: null }

  function toggleFocusMode(force) {
    const next = typeof force === 'boolean' ? force : !document.body.classList.contains('focus-mode')
    document.body.classList.toggle('focus-mode', !!next)
    const container = document.querySelector('.game-container')
    if (!next) {
      if (container) {
        container.style.scrollBehavior = 'auto'
        if (focusState.gameId) {
          const card = document.getElementById(focusState.gameId)
          if (card) {
            container.scrollTop = Math.max(0, card.offsetTop - container.offsetTop)
          } else {
            container.scrollTop = Math.max(0, focusState.scrollTop)
          }
        } else {
          container.scrollTop = Math.max(0, focusState.scrollTop)
        }
        container.style.scrollBehavior = ''
      }
      clearFocusActiveCard()
    } else {
      if (container) {
        focusState.scrollTop = container.scrollTop
      }
      const fallbackId = currentActiveGame || document.querySelector('.game-card')?.id
      let focusId = window.__memeplayActiveGame || fallbackId
      if (!focusId && fallbackId) focusId = fallbackId
      if (focusId) {
        focusState.gameId = focusId
        if (!window.__memeplayActiveGame) {
          try { window.__memeplayActiveGame = focusId } catch {}
        }
        applyFocusActiveCard(focusId)
      }
      requestAnimationFrame(scrollActiveGameIntoView)
    }
    updateFocusButtons()
    
    // Notify iframes about focus mode change
    // ✅ FIX: Hỗ trợ cả pixel-space-shooter và Pacman games
    const isFocus = document.body.classList.contains('focus-mode');
    document.querySelectorAll('iframe[data-game-url*="pixel-space-shooter"], iframe[data-game-url*="pacman"]').forEach(iframe => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'FOCUS_MODE_CHANGED',
          isFocus: isFocus
        }, '*');
      }
    });
  }

  function initFocusControls() {
    const buttons = document.querySelectorAll('.focus-toggle')
    buttons.forEach(btn => {
      if (btn.dataset.bound === '1') return
      btn.dataset.bound = '1'
      btn.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        const ownerCard = btn.closest('.game-card')
        if (ownerCard) {
          const gid = ownerCard.getAttribute('data-game-id') || ownerCard.id
          if (gid) {
            try { window.__memeplayActiveGame = gid } catch {}
            focusState.gameId = gid
          }
        }
        toggleFocusMode()
      })
    })
    updateFocusButtons()
  }

  function scrollActiveGameIntoView() {
    const container = document.querySelector('.game-container')
    if (!container) return
    const targetId = window.__memeplayActiveGame || currentActiveGame || container.querySelector('.game-card')?.id
    if (!targetId) return
    const card = document.getElementById(targetId)
    if (!card) return
    container.style.scrollBehavior = 'auto'
    container.scrollTop = Math.max(0, card.offsetTop - container.offsetTop)
    container.style.scrollBehavior = ''
  }

  function clearFocusActiveCard() {
    document.querySelectorAll('.game-card.is-focus-active').forEach(card => card.classList.remove('is-focus-active'))
  }

  function applyFocusActiveCard(gameId) {
    if (!gameId) return
    const card = document.getElementById(gameId)
    if (!card) return
    clearFocusActiveCard()
    card.classList.add('is-focus-active')
  }

  function lockGameTouch(gameId) {
    const stage = document.querySelector(`.game-card[data-game-id="${gameId}"] .game-stage`)
    if (!stage || stage.dataset.touchLocked === '1') return
    stage.dataset.touchLocked = '1'
    const prevent = (event) => { if (event.cancelable) event.preventDefault() }
    // Only prevent touchmove to stop scrolling, don't interfere with touchstart
    stage.addEventListener('touchmove', prevent, { passive: false, capture: true })
  }

  document.addEventListener('memeplay:active-game-changed', (event) => {
    const gameId = event?.detail?.gameId
    if (gameId) {
      try { window.__memeplayActiveGame = gameId } catch {}
      focusState.gameId = gameId
      lockGameTouch(gameId)
      if (document.body.classList.contains('focus-mode')) {
        applyFocusActiveCard(gameId)
        requestAnimationFrame(scrollActiveGameIntoView)
      }
    }
  })

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('focus-mode')) {
      toggleFocusMode(false)
    }
  })

  await loadGameCards()
  if (isPlayMode) {
    const ok = enforcePlayModeView(sharedGameIdFromUrl)
    if (!ok) {
      showPlayModeError(`Không tìm thấy game với mã: ${sharedGameIdFromUrl || '(trống)'}`)
    }
  } else {
    lockGameTouch('wojak-btc-blast')
  }

  // ✅ Supabase already initialized at top of script (before loadGameCards)

  // 🚀 Helper: Send RPC with keepalive (prevents data loss on F5/close)
  async function rpcWithKeepalive(functionName, params) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(params),
        keepalive: true  // ← Ensures delivery even if page closes!
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ [RPC] ${functionName} failed (${response.status}):`, errorText)
        throw new Error(`RPC ${functionName} failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Supabase RPC có thể return:
      // - Object trực tiếp: { is_new_best: true, ... }
      // - Array: [{ is_new_best: true, ... }]
      // - String (nếu function return TEXT): "result"
      // - Null nếu function không tồn tại
      
      // Log để debug
      if (data === null || (Array.isArray(data) && data.length === 0)) {
        console.warn(`⚠️ [RPC] ${functionName} returned null/empty. Function may not exist in Supabase.`)
      }
      
      return { data, error: null }
    } catch (error) {
      console.error(`❌ [RPC] rpcWithKeepalive(${functionName}) error:`, error.message)
      return { data: null, error }
    }
  }

  // =========================================================
  // 🔹 CREATE UNIQUE USER ID (stored in localStorage)
  // =========================================================
  // User identifier prefers wallet address if connected; falls back to random local id
  function generateLocalUuid() {
    try {
      const cryptoObj = globalThis.crypto || globalThis.msCrypto
      if (cryptoObj?.randomUUID) return cryptoObj.randomUUID()
      if (cryptoObj?.getRandomValues) {
        const buf = cryptoObj.getRandomValues(new Uint8Array(16))
        buf[6] = (buf[6] & 0x0f) | 0x40
        buf[8] = (buf[8] & 0x3f) | 0x80
        const hex = Array.from(buf, b => b.toString(16).padStart(2, '0')).join('')
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
      }
    } catch (err) {
      console.warn('generateLocalUuid fallback', err)
    }
    const fallback = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : ((r & 0x3) | 0x8)
      return v.toString(16)
    })
    return fallback
  }

  function getLocalUserId() {
    let id = localStorage.getItem('mp_user_id')
    if (!id) {
      id = 'u_' + generateLocalUuid()
      localStorage.setItem('mp_user_id', id)
    }
    return id
  }
  function getWalletAddress() {
    return localStorage.getItem('mp_user_wallet') || ''
  }
  let userId = getWalletAddress() || getLocalUserId()
  // ✅ PERFORMANCE: Removed debug log

  // =========================================================
  // 🔹 UI HELPERS (PLAY points header only)
  // =========================================================
  const els = {
    headerEarned: document.getElementById('headerEarned'),
    headerEarnedFlash: document.getElementById('headerEarnedFlash'),
    streak: document.getElementById('streakCount'),
    connectBtn: document.getElementById('walletConnectBtn'),
    walletBadge: document.getElementById('walletStatusBtn'),
    walletStatus: document.getElementById('walletStatusText')
  }

  function lsGetInt(key, fallback = 0) {
    const raw = localStorage.getItem(key)
    const num = raw == null ? NaN : Number(raw)
    return Number.isFinite(num) ? num : fallback
  }
  function lsSetInt(key, value) {
    localStorage.setItem(key, String(Math.max(0, Math.trunc(value))))
  }
  // No status bar counters

  function updateHeaderEarned() {
    const totalEarned = lsGetInt('mp_total_earned_plays')
    els.headerEarned && (els.headerEarned.textContent = String(totalEarned))
    if (typeof window.__updateStatsOverlay === 'function') window.__updateStatsOverlay()
  }

  // Show inline banner near PLAY points and apply increment after 3s
  // Confetti Engine
  function createConfetti() {
    const canvas = document.getElementById('confettiCanvas')
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    
    const particles = []
    const colors = ['#ffb642', '#ff9000', '#ffd700', '#ff6b6b', '#4ecdc4']
    
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: canvas.width / 2,
        y: (canvas.height * 0.5) - 50, // 50px higher than toast (toast at 50%)
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 1) * 15,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10
      })
    }
    
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let active = false
      
      particles.forEach(p => {
        p.vy += 0.3 // Gravity
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotationSpeed
        
        if (p.y < canvas.height + 50) {
          active = true
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rotation * Math.PI / 180)
          ctx.fillStyle = p.color
          ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size)
          ctx.restore()
        }
      })
      
      if (active) requestAnimationFrame(animate)
      else canvas.style.opacity = '0'
    }
    
    canvas.style.opacity = '1'
    animate()
    
    setTimeout(() => {
      canvas.style.opacity = '0'
    }, 3000)
  }

  function showAchievementToast(achievementName, count, total, reward) {
    const toast = document.getElementById('achievementToast')
    const nameEl = document.getElementById('achievementName')
    const rewardEl = document.getElementById('achievementReward')
    
    if (!toast) return
    
    // ✅ "10s Play Reward" doesn't show (x/3) because it's not a 1-time achievement
    // ❌ 60s, 300s still show (x/3)
    const showProgress = achievementName !== '10s Play Reward'
    nameEl.textContent = showProgress ? `⭐ ${achievementName} (${count}/${total})` : `⭐ ${achievementName}`
    rewardEl.textContent = `+${reward} PLAY`
    
    toast.classList.add('show')
    
    // Auto-dismiss after 5s
    const autoHideTimeout = setTimeout(() => {
      toast.classList.remove('show')
    }, 5000)
    
    // Store timeout ID so X button can cancel it
    toast.dataset.autoHideTimeout = autoHideTimeout
  }
  
  // Achievement toast X button handler (close immediately)
  document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('achievementToastClose')
    const toast = document.getElementById('achievementToast')
    
    if (closeBtn && toast) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        // ✅ PERFORMANCE: Removed debug log
        
        // Cancel auto-hide timeout
        if (toast.dataset.autoHideTimeout) {
          clearTimeout(parseInt(toast.dataset.autoHideTimeout))
        }
        // Hide immediately
        toast.classList.remove('show')
      }, { capture: true });
      
      // Also add touchend for mobile
      closeBtn.addEventListener('touchend', (e) => {
        e.stopPropagation();
        e.preventDefault();
        // ✅ PERFORMANCE: Removed debug log
        
        if (toast.dataset.autoHideTimeout) {
          clearTimeout(parseInt(toast.dataset.autoHideTimeout))
        }
        toast.classList.remove('show')
      }, { capture: true, passive: false });
    }
  })

  function celebrateAchievement(gameId, achievementName, count, reward) {
    // ✅ PERFORMANCE: Removed debug logs
    
    // 1. Fireworks explosion
    createConfetti()
    
    // 2. Toast center
    showAchievementToast(achievementName, count, 3, reward)
    
    // 3. Icon rung
    const card = document.querySelector(`.game-card[data-game-id="${gameId}"]`)
    const achievementIcon = card?.querySelector('.icon-wrapper[data-role="leaderboard"]')
    if (achievementIcon) {
      achievementIcon.classList.add('shake')
      setTimeout(() => achievementIcon.classList.remove('shake'), 800)
    }

    const leaderboardOverlayEl = document.getElementById('leaderboardOverlay')
    if (leaderboardOverlayEl?.classList.contains('open')) {
      renderRewardsPanel(gameId)
    }
  }

  // Queue achievements to show after game over
  const pendingAchievements = {}
  let isGameOver = false // Flag to prevent showing rewards during gameplay
  
  // Show all pending achievements for a game
  // CRITICAL: Only show after game over, not during gameplay
  function showPendingAchievements(gameId) {
    // SECURITY: Only allow showing achievements after game over
    if (!isGameOver) {
      console.warn('⚠️ [SECURITY] showPendingAchievements called during gameplay - BLOCKED! Must wait for game over.')
      return
    }
    
    const achievements = pendingAchievements[gameId]
    
    if (!achievements || achievements.length === 0) {
      return
    }
    
    // ✅ PERFORMANCE: Removed debug log
    
    // Sort by threshold (10 → 60 → 300)
    achievements.sort((a, b) => a.threshold - b.threshold)
    
    // Show each achievement with delay
    achievements.forEach((ach, index) => {
      setTimeout(() => {
        celebrateAchievement(gameId, ach.name, ach.count, ach.reward)
      }, index * 2500) // Each achievement 2.5s apart
    })
    
    // Clear queue after showing
    delete pendingAchievements[gameId]
    
    // Reset flag after showing (for next game)
    setTimeout(() => {
      isGameOver = false
    }, achievements.length * 2500 + 1000)
  }
  
  // Expose globally but with protection - games should NOT call this directly
  // Only game over handler should call this
  window.__showPendingAchievements = showPendingAchievements
  
  function showPlayAward(amount, label, isNewAchievement = false) {
    if (!amount || amount <= 0) return
    
    // Update total
    const newTotal = lsGetInt('mp_total_earned_plays') + amount
    lsSetInt('mp_total_earned_plays', newTotal)
    updateHeaderEarned()
    
    // If new achievement, QUEUE to show after game over
    if (isNewAchievement && activeGame) {
      const achievedCount = Object.values(getGameAwards(activeGame)).filter(Boolean).length
      // ✅ Rename: "Starter" → "10s Play Reward" (repeatable every time)
      const achievementNames = { 10: '10s Play Reward', 60: 'Engaged', 300: 'Champion' }
      const threshold = parseInt(label.replace('s', ''))
      
      // Add to pending queue
      if (!pendingAchievements[activeGame]) {
        pendingAchievements[activeGame] = []
      }
      pendingAchievements[activeGame].push({
        name: achievementNames[threshold],
        count: achievedCount,
        reward: amount,
        threshold
      })
      
      // ✅ PERFORMANCE: Removed debug logs
      // DON'T return - continue showing header flash!
    }
    
    // Header flash - ALWAYS SHOW for all rewards!
    const el = els.headerEarnedFlash
    if (!el) return
    el.textContent = `+${amount} PLAY${label ? ` for ${label}` : ''}`
    el.style.opacity = '1'
    setTimeout(() => {
      el.style.opacity = '0'
    }, 10000)
  }

  function updateStreak() {
    const streak = lsGetInt('mp_streak_count')
    els.streak && (els.streak.textContent = String(streak))
    if (typeof window.__updateStatsOverlay === 'function') window.__updateStatsOverlay()
  }

  // Initialize UI from localStorage
  updateHeaderEarned()
  updateStreak()

  // Load initial real play counts for all cards
  const allCards = document.querySelectorAll('.game-card')
  const cardCount = allCards.length
  allCards.forEach(card => {
    const gid = card.getAttribute('data-game-id') || card.id
    if (gid) {
      loadPlayCount(gid)
    }
  })
  // ✅ PERFORMANCE: Summary log instead of 200+ individual logs
  if (cardCount > 0) {
    console.log(`📊 Loading play counts for ${cardCount} games...`)
  }

  // ==============================
  // Wallet Connect (MetaMask)
  // ==============================
  function shortAddr(addr) {
    if (!addr) return ''
    const lower = String(addr).toLowerCase()
    if (lower.length <= 6) return lower
    return `${lower.slice(0, 3)}...${lower.slice(-3)}`
  }
  function setWalletStatus(addr) {
    if (!els.walletStatus) return
    els.walletStatus.textContent = addr ? `connected :${shortAddr(addr)}` : ''
    if (typeof window.__updateWalletOverlay === 'function') window.__updateWalletOverlay()
  }
  setWalletStatus(getWalletAddress())

  async function connectWallet() {
    if (!window.ethereum) {
      const ua = navigator.userAgent || ''
      const isMobile = /iphone|ipad|ipod|android/i.test(ua)
      if (isMobile) {
        const rawUrl = window.location.href.split('#')[0]
        const cleaned = rawUrl.replace(/^https?:\/\//i, '')
        const deepLink = `https://metamask.app.link/dapp/${cleaned}`
        const proceed = confirm('MetaMask mobile not opened. Open MetaMask app to connect?')
        if (proceed) {
          window.location.href = deepLink
        }
      } else {
        alert('Please install MetaMask to connect your wallet.')
      }
      return
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const address = (accounts && accounts[0]) ? String(accounts[0]) : ''
      if (!address) return
      localStorage.setItem('mp_user_wallet', address)
      userId = address // prefer wallet as identifier
      setWalletStatus(address)
      setConnectButtonState()
      // Do not auto re-checkin on wallet switch; guard by daily window
      if (!hasCheckedInToday()) {
        try { await dailyCheckin() } catch {}
      }
    } catch (e) {
      console.warn('Wallet connect failed:', e?.message || e)
    }
  }
  function disconnectWallet() {
    localStorage.removeItem('mp_user_wallet')
    userId = getLocalUserId()
    setWalletStatus('')
    setConnectButtonState()
  }
  function ensureWalletBindings() {
    const connectBtn = els.connectBtn
    const statusBtn = els.walletBadge
    if (connectBtn && !connectBtn.__memeplayBound) {
      connectBtn.addEventListener('click', (event) => {
        event.preventDefault()
        connectWallet()
      })
      connectBtn.__memeplayBound = true
    }
    if (statusBtn && !statusBtn.__memeplayBound) {
      statusBtn.addEventListener('click', () => {
        if (typeof window.__openWalletOverlay === 'function') {
          window.__openWalletOverlay()
        }
      })
      statusBtn.__memeplayBound = true
    }
  }
  function setConnectButtonState() {
    if (!els.connectBtn || !els.walletBadge) return
    const address = getWalletAddress()
    const isConnected = !!address

    if (isConnected) {
      els.connectBtn.hidden = true
      els.walletBadge.hidden = false
      els.walletStatus.textContent = `connected :${shortAddr(address)}`
      ensureWalletBindings()
    } else {
      els.connectBtn.hidden = false
      els.walletBadge.hidden = true
      ensureWalletBindings()
    }
  }
  const walletApi = {
    connect: () => connectWallet(),
    disconnect: () => disconnectWallet(),
    isConnected: () => !!getWalletAddress(),
    getAddress: () => getWalletAddress(),
    getStreak: () => lsGetInt('mp_streak_count'),
    getPlayPoints: () => lsGetInt('mp_total_earned_plays'),
    openOverlay: () => {
        if (typeof window.__openWalletOverlay === 'function') {
          window.__openWalletOverlay()
        }
      }
    }
  try {
    const existing = (globalThis.memeplayWallet && typeof globalThis.memeplayWallet === 'object') ? globalThis.memeplayWallet : {}
    globalThis.memeplayWallet = Object.assign({}, existing, walletApi)
  } catch {
    globalThis.memeplayWallet = walletApi
  }
  ensureWalletBindings()
  els.connectBtn && setConnectButtonState()
  if (window.ethereum) {
    window.ethereum.on?.('accountsChanged', (accs) => {
      const addr = (accs && accs[0]) ? String(accs[0]) : ''
      if (addr) {
        localStorage.setItem('mp_user_wallet', addr)
        userId = addr
        setWalletStatus(addr)
      } else {
        localStorage.removeItem('mp_user_wallet')
        userId = getLocalUserId()
        setWalletStatus('')
      }
      setConnectButtonState()
    })
  }

  // =========================================================
  // 🔹 PER-GAME ACCUMULATED PLAYTIME & ONE-TIME REWARDS
  // =========================================================
  const REWARD_THRESHOLDS = [10, 60, 300] // seconds (10s so user quickly understands rewards)
  const REWARD_VALUES = { 10: 100, 60: 300, 300: 1000 }
  const MAX_ACCUM_SECONDS = 300

  function getGameSeconds(gameId) {
    return lsGetInt(`mp_game_seconds_${gameId}`)
  }
  function setGameSeconds(gameId, seconds) {
    lsSetInt(`mp_game_seconds_${gameId}`, Math.min(seconds, MAX_ACCUM_SECONDS))
  }
  function getGameAwards(gameId) {
    try {
      const raw = localStorage.getItem(`mp_game_awards_${gameId}`)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }
  function setGameAwards(gameId, awardsObj) {
    localStorage.setItem(`mp_game_awards_${gameId}`, JSON.stringify(awardsObj || {}))
  }
  // Console helpers
  function listAllGameSeconds() {
    const cards = Array.from(document.querySelectorAll('.game-card'))
    const rows = cards.map(c => {
      const id = c.getAttribute('data-game-id') || c.id || 'unknown'
      return { gameId: id, seconds: getGameSeconds(id) }
    })
    console.table(rows)
    return rows
  }
  function resetGameProgress(gameId) {
    if (!gameId) return false
    lsSetInt(`mp_game_seconds_${gameId}`, 0)
    localStorage.removeItem(`mp_game_awards_${gameId}`)
    console.log(`🔄 Reset progress for ${gameId}`)
    return true
  }
  // Expose to window for activation script and dev console usage
  const helpers = Object.freeze({
    // inspectors
    getGameSeconds,
    listAllGameSeconds,
    resetGameProgress,
    // controls
    startGame,
    stopGame,
    forceStart
  })
  try { window.memeplay = helpers } catch {}
  try { self.memeplay = helpers } catch {}
  try { globalThis.memeplay = helpers } catch {}
  // ✅ PERFORMANCE: Removed debug log
  function grantPlays(amount) {
    if (!amount || amount <= 0) return 0
    const newTotal = lsGetInt('mp_total_earned_plays') + amount
    lsSetInt('mp_total_earned_plays', newTotal)
    updateHeaderEarned()
    return amount
  }

  // ===== Real play counts (per game) =====
  function setPlaysLabelForCard(gameId, totalPlays) {
    const card = document.querySelector(`.game-card[data-game-id="${gameId}"]`) || document.getElementById(gameId)
    if (!card) return
    const creator = card.querySelector('.creator-text')
    if (!creator) return
    let span = creator.querySelector('[data-plays-count]')
    if (!span) {
      // insert separator dot and span once
      const sep = document.createTextNode(' • ')
      span = document.createElement('span')
      span.setAttribute('data-plays-count', gameId)
      creator.appendChild(sep)
      creator.appendChild(span)
    }
    span.textContent = `${totalPlays} plays`

    const statsCount = card.querySelector('.icon-wrapper[data-role="stats"] .icon-count')
    if (statsCount) statsCount.textContent = String(Math.max(0, totalPlays|0))
  }
  async function loadPlayCount(gameId) {
    try {
      // ✅ PERFORMANCE: Removed debug log (200+ logs per page load)
      const { data, error } = await supabase.rpc('get_game_play_count', { p_game_id: gameId })
      if (error) { console.error('get_game_play_count error:', error.message); return }
      const val = (data && typeof data.total_plays === 'number') ? data.total_plays : 0
      setPlaysLabelForCard(gameId, val)
      // ✅ PERFORMANCE: Removed debug log (200+ logs per page load)
    } catch (e) { console.error('get_game_play_count error:', e?.message || e) }
  }
  async function incrementPlayCountIfEligible(gameId, seconds) {
    if (!gameId || !seconds || seconds < 5) return
    try {
      const { data, error } = await supabase.rpc('increment_play_count', {
        p_user_id: userId,
        p_game_id: gameId,
        p_seconds: seconds
      })
      if (error) { console.error('increment_play_count error:', error.message); return }
      const val = (data && typeof data.total_plays === 'number') ? data.total_plays : undefined
      if (val != null) {
        setPlaysLabelForCard(gameId, val)
        console.log(`[plays +1] ${gameId}:`, val)
      }
    } catch (e) {
      console.error('increment_play_count error:', e?.message || e)
    }
  }

  // =========================================================
  // 🔹 DAILY CHECK-IN (guarded once per day per device)
  // =========================================================
  function todayKey() {
    const d = new Date()
    return d.toISOString().slice(0,10)
  }
  function hasCheckedInToday() {
    return localStorage.getItem('mp_checkin_'+todayKey()) === '1'
  }
  function markCheckedInToday() {
    localStorage.setItem('mp_checkin_'+todayKey(), '1')
  }
  // Show daily check-in toast with stats
  function showDailyCheckInToast(streak, reward, totalDays = null) {
    // Remove old toast if exists
    const oldToast = document.querySelector('.daily-checkin-toast');
    if (oldToast) oldToast.remove();
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'daily-checkin-toast';
    
    // Build stats HTML
    let statsHTML = `
      <div class="daily-checkin-stat">
        <span class="daily-checkin-stat-value">${streak}</span>
        <span class="daily-checkin-stat-label">🔥 Day Streak</span>
      </div>
    `;
    
    // Add total days if available
    if (totalDays && totalDays > 0) {
      statsHTML += `
        <div class="daily-checkin-stat">
          <span class="daily-checkin-stat-value">${totalDays}</span>
          <span class="daily-checkin-stat-label">📅 Total Days</span>
        </div>
      `;
    }
    
    toast.innerHTML = `
      <div class="daily-checkin-icon">🎁</div>
      <div class="daily-checkin-title">Daily Check-in!</div>
      <div class="daily-checkin-stats">
        ${statsHTML}
      </div>
      <div class="daily-checkin-reward">+${reward} PLAY</div>
    `;
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Hide after 5 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
        // ✅ Show create game toast after daily reward is hidden
        showCreateGameToast();
      }, 500);
    }, 5000);
  }

  function showCreateGameToast() {
    // Remove old toast if exists
    const oldToast = document.querySelector('.create-game-toast');
    if (oldToast) oldToast.remove();
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'create-game-toast';
    
    toast.innerHTML = `
      <div class="create-game-toast-content">
        <div class="create-game-icon"></div>
        <span class="create-game-text">Create FREE game with your brand in 10s</span>
      </div>
    `;
    
    // Click handler to open editor
    toast.addEventListener('click', () => {
      window.location.href = '/games/templates/pacman-template/index.html#creatorScreen';
    });
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Hide after 3 seconds with fade out
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }

  async function dailyCheckin() {
    const { data, error } = await supabase.rpc('daily_checkin', { p_user_id: userId })
    if (error) {
      console.error('❌ Daily check-in error:', error.message)
      return
    }
    console.log('✅ Daily check-in result:', data)
    if (data?.awarded > 0) {
      // Show new daily check-in toast
      const streak = Number(data.streak) || 1;
      const totalDays = Number(data.total_days) || null; // If backend provides it
      showDailyCheckInToast(streak, Number(data.awarded), totalDays);
      
      // Still update header (small notification)
      showPlayAward(Number(data.awarded), 'daily login')
      markCheckedInToday()
    }
    if (Number.isFinite(data?.streak)) {
      lsSetInt('mp_streak_count', Number(data.streak))
      updateStreak()
    }
  }

  // Only run on first load if not already checked in today (prevents wallet-switch abuse)
  if (!hasCheckedInToday()) dailyCheckin()
// ==============================
//  AUTO-TRACK PLAYTIME + FOCUS DELAY
// ==============================

// Global variable to track running game
let activeGame = null;
let activeStartTime = 0;
let progressInterval = null;
// ✅ FIX: Flag to prevent double increment of play count
let playCountIncremented = false;

// Start timer
function startGame(gameId) {
  // If another game is running, stop it; if same game, reset ticker/time
  if (activeGame && activeGame !== gameId) stopGame();

  // Reset ticker before starting (even for same game)
  clearInterval(progressInterval);
  progressInterval = null;

  activeGame = gameId;
  activeStartTime = Date.now();
  playCountIncremented = false; // ✅ FIX: Reset flag when starting new game
  // ✅ PERFORMANCE: Removed debug log
  
  // Mark game card as playing to disable animations/transitions
  document.querySelectorAll('.game-card').forEach(card => card.classList.remove('is-playing'));
  const activeCard = document.querySelector(`.game-card[data-game-id="${gameId}"]`);
  if (activeCard) activeCard.classList.add('is-playing');

  // Live progress ticker: log session and cumulative totals every 5 seconds (optimized for performance)
  clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    if (!activeGame || !activeStartTime) return;
    
    // Use requestIdleCallback to avoid interrupting game
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        updateProgress();
      }, { timeout: 1000 });
    } else {
      updateProgress();
    }
  }, 5000);
  
  function updateProgress() {
    if (!activeGame || !activeStartTime) return;
    const sessionSeconds = Math.max(0, Math.floor((Date.now() - activeStartTime) / 1000));
    const prevTotal = getGameSeconds(activeGame);
    const previewTotal = Math.min(prevTotal + sessionSeconds, MAX_ACCUM_SECONDS);

    // Early reward grant when crossing thresholds during play
    const awardedMap = getGameAwards(activeGame);
    const crossedNow = [];
    for (const t of REWARD_THRESHOLDS) {
      if (prevTotal < t && previewTotal >= t && !awardedMap[t]) {
        awardedMap[t] = true;
        crossedNow.push(t);
      }
    }
    if (crossedNow.length) {
      setGameAwards(activeGame, awardedMap);
      let grant = 0;
      for (const t of crossedNow) grant += REWARD_VALUES[t];
      if (grant > 0) {
        const last = crossedNow[crossedNow.length - 1]
        showPlayAward(grant, `${last}s`, true) // ← true = NEW achievement!
      }
    }

    // ✅ PERFORMANCE: Removed frequent console.log (every 5s) to reduce lag when DevTools is open
    // Logic tính điểm vẫn hoạt động bình thường (lines 2706-2723)
  }
}

// Force safe start when switching games
function forceStart(gameId) {
  try { stopGame(); } catch {}
  clearInterval(progressInterval);
  progressInterval = null;
  activeGame = null;
  activeStartTime = 0;
  startGame(gameId);
}

  // Stop timer + send data to Supabase
async function stopGame() {
  if (!activeGame || !activeStartTime) return;

    const seconds = Math.floor((Date.now() - activeStartTime) / 1000);
  if (seconds > 0) {
      // Optimistic UI bump (visible immediately), will be corrected after server refresh
      try {
        if (seconds >= 3) {
          const card = document.querySelector(`.game-card[data-game-id="${activeGame}"]`) || document.getElementById(activeGame)
          const creator = card?.querySelector('.creator-text')
          if (creator) {
            const span = creator.querySelector('[data-plays-count]')
            if (span && /\d+/.test(span.textContent || '')) {
              const cur = parseInt((span.textContent || '0').replace(/\D/g, ''), 10) || 0
              span.textContent = `${cur + 1} plays`
            }
          }
          const statsCount = card?.querySelector('.icon-wrapper[data-role="stats"] .icon-count')
          if (statsCount && /\d+/.test(statsCount.textContent || '')) {
            const cur = parseInt((statsCount.textContent || '0').replace(/\D/g, ''), 10) || 0
            statsCount.textContent = String(cur + 1)
          }
        }
      } catch {}
    // ✅ PERFORMANCE: Removed debug log

    // Calculate per-game accumulated time and threshold rewards
    const prevTotal = getGameSeconds(activeGame)
    const nextTotalRaw = prevTotal + seconds
    const prevCapped = Math.min(prevTotal, MAX_ACCUM_SECONDS)
    const nextCapped = Math.min(nextTotalRaw, MAX_ACCUM_SECONDS)
    setGameSeconds(activeGame, nextCapped)

    const awardedMap = getGameAwards(activeGame)
    const newlyAwarded = []
    for (const t of REWARD_THRESHOLDS) {
      if (prevCapped < t && nextCapped >= t && !awardedMap[t]) {
        awardedMap[t] = true
        newlyAwarded.push(t)
      }
    }
    // ✅ PERFORMANCE: Removed debug log 
    if (newlyAwarded.length) {
      let totalGrant = 0
      for (const t of newlyAwarded) totalGrant += REWARD_VALUES[t]
      setGameAwards(activeGame, awardedMap)
      if (totalGrant > 0) {
        const last = newlyAwarded[newlyAwarded.length - 1]
        showPlayAward(totalGrant, `${last}s`, true) // ← true = NEW achievement!
      }
    }

    // Use keepalive to prevent data loss on F5/close tab
    try {
      const { data, error } = await rpcWithKeepalive('track_playtime_and_reward', {
        p_user_id: userId,
        p_game_id: activeGame,
        p_seconds: seconds
      });
      if (error) throw error;
      // ✅ PERFORMANCE: Removed debug log
      
      // ❌ REMOVED: Backend reward display (duplicate with frontend achievement system!)
      // Frontend already handles rewards via threshold checking (line ~2356)
      // Backend RPC just saves to DB, no need to show notification again!
      // if (data?.awarded > 0) showPlayAward(Number(data.awarded))
    } catch (err) {
      console.error('Playtime tracking error:', err.message);
    }

    // Increment real play count if eligible with keepalive
    // ✅ FIX: Prevent double increment with flag
    if (seconds >= 3 && !playCountIncremented) {
      playCountIncremented = true // ✅ Mark as incremented
      try {
        // 🔁 Legacy games: always send a fixed 3s to ensure exactly +1 play per full session
        // (backend may derive plays from seconds, e.g. floor(seconds / 3))
        const secondsForRpc = isLegacyGame(activeGame) ? 3 : seconds;
        const payload = {
          p_user_id: userId,
          p_game_id: activeGame,
          p_seconds: secondsForRpc
        };
        // ✅ PERFORMANCE: Removed debug log
        let { data, error } = await rpcWithKeepalive('increment_play_count', payload);
        if (error) {
          playCountIncremented = false // ✅ Reset flag on error so it can retry
          throw error;
        }
        
        // Update UI after server confirms (accurate count)
        if (data && typeof data.total_plays === 'number') {
          setPlaysLabelForCard(activeGame, data.total_plays)
          // ✅ PERFORMANCE: Removed debug log
          try { loadPlayCount(activeGame) } catch {}
        }
      } catch (err) {
        console.error('Play count increment error:', err.message);
        // If backend already counted (409 Conflict), just refresh UI from server
        const msg = String(err?.message || '');
        if (msg.includes('409') || msg.toLowerCase().includes('conflict')) {
          try { await loadPlayCount(activeGame) } catch {}
        } else {
          // Retry once after a short delay
          try {
            await new Promise(r => setTimeout(r, 800));
            const retryPayload = {
              p_user_id: userId,
              p_game_id: activeGame,
              p_seconds: seconds
            };
            // ✅ PERFORMANCE: Removed debug log
            const { data, error } = await rpcWithKeepalive('increment_play_count', retryPayload);
            if (!error && data && typeof data.total_plays === 'number') {
              setPlaysLabelForCard(activeGame, data.total_plays)
              // ✅ PERFORMANCE: Removed debug log
              try { loadPlayCount(activeGame) } catch {}
            } else {
              try { await loadPlayCount(activeGame) } catch {}
            }
          } catch (e2) {
            console.error('Play count retry failed:', e2.message);
            try { await loadPlayCount(activeGame) } catch {}
          }
        }
      }
    }
  }

  // Remove any stray global refresh (handled inside stopGame now)

  // Remove is-playing class to re-enable animations
  document.querySelectorAll('.game-card').forEach(card => card.classList.remove('is-playing'));
  
  activeGame = null;
  activeStartTime = 0;
  clearInterval(progressInterval);
  progressInterval = null;
  playCountIncremented = false; // ✅ FIX: Reset flag for next game
}

// When iframe finishes loading game → start tracking with delay
const iframes = document.querySelectorAll(".game-card iframe");
const fallbackTimers = {} // Track fallback timers for games without postMessage
window.fallbackTimers = fallbackTimers // Expose globally for GAME_SCORE handler

if (iframes && iframes.length) {
iframes.forEach((iframe) => {
  const gameId = iframe.closest(".game-card")?.dataset.gameId;
  if (!gameId) {
    console.warn("⚠️ Missing data-game-id for an iframe, tracking skipped.");
    return;
  }

  iframe.addEventListener("load", () => {
    // DON'T auto-start timer when iframe loads!
    // Timer only starts when user ACTUALLY plays (via GAME_SCORE message)
    // ✅ PERFORMANCE: Removed debug log (200+ logs per page load)
  });
  
  // 🔧 FALLBACK: Detect click on .game-stage (iframe wrapper)
  const gameStage = iframe.closest('.game-stage')
  if (gameStage) {
    gameStage.addEventListener('click', () => {
      console.log(`🖱️ [FALLBACK] User clicked game: ${gameId}`)
      
      // Clear previous fallback timer
      if (fallbackTimers[gameId]) {
        clearTimeout(fallbackTimers[gameId])
      }
      
      // If timer already running → skip
      if (activeGame === gameId && activeStartTime) {
        console.log(`⏭️ [FALLBACK] Timer already running for ${gameId}`)
        return
      }
      
      // Wait 2 seconds, if no GAME_SCORE → start timer
      fallbackTimers[gameId] = setTimeout(() => {
        if (activeGame !== gameId || !activeStartTime) {
          console.log(`⚠️ [FALLBACK] No GAME_SCORE after 2s → Auto-starting timer for ${gameId}`)
          startGame(gameId)
      }
      }, 2000)
    }, { passive: true })
  }
});
}

// Stop when tab hidden
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopGame();
  } else if (activeGame && gameStartTime) {
    // ✅ ONLY resume timer if game IS PLAYING (has gameStartTime)
    // ❌ DON'T auto-start if only activeGame exists (haven't clicked play)
    startGame(activeGame);
  }
});

// Stop when leaving page
window.addEventListener("beforeunload", stopGame);

  // ==============================
  // Likes & Comments (Supabase RPC)
  function initSocialHandlers() {
    // Global overlay controller (single instance handlers)
    const overlay = document.getElementById('commentsOverlay')
    const listEl = document.getElementById('commentsList')
    const loadMoreBtn = document.getElementById('commentsLoadMore')
    const closeBtn = document.getElementById('commentsCloseBtn')
    const ta = document.getElementById('commentsTextarea')
    const postBtn = document.getElementById('commentsPostBtn')

    const paging = { gameId: null, offset: 0, limit: 10, loading: false, done: false }
    function shortAddr10(addr){ if(!addr) return ''; return addr.slice(0,6) + '…' + addr.slice(-3) }
    async function fetchMore(){
      if (paging.loading || paging.done || !paging.gameId) return
      paging.loading = true
      try {
        const { data, error } = await supabase.rpc('list_comments', {
          p_game_id: paging.gameId,
          p_limit: paging.limit,
          p_offset: paging.offset
        })
        if (error) throw error
        const rows = Array.isArray(data) ? data : []
        if (rows.length === 0) { paging.done = true; return }
        rows.forEach(r => {
          const item = document.createElement('div')
          item.className = 'comment-item'
          const meta = document.createElement('div')
          meta.className = 'comment-meta'
          const when = new Date(r.created_at).toLocaleString()
          meta.textContent = `${shortAddr10(r.user_id)} • ${when}`
          const text = document.createElement('div')
          text.className = 'comment-text'
          text.textContent = r.text
          item.appendChild(meta)
          item.appendChild(text)
          listEl.appendChild(item)
        })
        paging.offset += rows.length
        
        // ✅ Update comment count after loading comments
        const card = document.querySelector(`.game-card[data-game-id="${paging.gameId}"]`)
        if (card) {
          const cmtWrapper = card.querySelector('.icon-wrapper[data-role="comment"]')
          const cmtCountEl = cmtWrapper?.querySelector('.icon-count')
          if (cmtCountEl && paging.offset > 0) {
            // Only update if current count = 0 (wrong) but actually has comments
            const currentCount = parseInt(cmtCountEl.textContent) || 0
            if (currentCount === 0) {
              cmtCountEl.textContent = String(paging.offset)
              // ✅ PERFORMANCE: Removed debug log
            }
          }
        }
      } catch(e){
        console.error('list_comments error:', e?.message || e)
      } finally { paging.loading = false }
    }
    // ✅ FIX: Init textarea handlers (chỉ 1 lần để tránh duplicate event listeners)
    let textareaHandlersInitialized = false
    function initTextareaHandlers() {
      if (textareaHandlersInitialized || !ta) return
      textareaHandlersInitialized = true
      
      // Prevent blur events from interfering
      ta.addEventListener('mousedown', (e) => {
        e.stopPropagation()
        ta.focus()
      }, { capture: true })
      
      ta.addEventListener('click', (e) => {
        e.stopPropagation()
        ta.focus()
      }, { capture: true })
      
      // Prevent blur khi click vào các element khác trong overlay
      ta.addEventListener('blur', (e) => {
        const relatedTarget = e.relatedTarget
        if (!relatedTarget || !overlay.contains(relatedTarget)) {
          setTimeout(() => {
            if (overlay.classList.contains('open') && document.activeElement !== ta) {
              ta.focus()
            }
          }, 10)
        }
      })
    }
    
    async function openPanel(forGame){
      paging.gameId = forGame
      paging.offset = 0
      paging.loading = false
      paging.done = false
      listEl.innerHTML = ''
      ta.value = ''
      overlay.classList.add('open')
      
      // ✅ FIX: Init textarea handlers (chỉ 1 lần)
      initTextareaHandlers()
      
      // ✅ FIX: Focus vào textarea ngay sau khi mở overlay (requestAnimationFrame để đảm bảo render)
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (ta && overlay.classList.contains('open')) {
            ta.focus()
            // Set cursor vào cuối textarea nếu có content
            if (ta.value) {
              ta.setSelectionRange(ta.value.length, ta.value.length)
            }
          }
        }, 100)
      })
      
      // ✅ Load comments and update count based on actual data
      await fetchMore()
      
      // ✅ FIX: Re-focus vào textarea sau khi fetchMore (tránh mất focus do re-render)
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (ta && overlay.classList.contains('open') && document.activeElement !== ta) {
            ta.focus()
          }
        }, 150)
      })
      
      // Update comment count based on loaded comments
      try {
        const { data, error } = await supabase.rpc('get_social_counts', { p_game_id: forGame })
        // ✅ PERFORMANCE: Removed debug log
        if (!error && data) {
          const card = document.querySelector(`.game-card[data-game-id="${forGame}"]`)
          if (card) {
            const cmtWrapper = card.querySelector('.icon-wrapper[data-role="comment"]')
            const cmtCountEl = cmtWrapper?.querySelector('.icon-count')
            if (cmtCountEl) {
              const realCount = data.comments ?? 0
              cmtCountEl.textContent = String(Math.max(0, realCount))
              // ✅ PERFORMANCE: Removed debug log
            }
          }
        }
      } catch (e) {
        console.error('[COMMENT DEBUG] openPanel - Error refreshing count:', e)
      }
    }
    loadMoreBtn.onclick = fetchMore
    closeBtn.onclick = () => overlay.classList.remove('open')
    
    // ✅ FIX: Click outside to close (desktop only) - nhưng không đóng khi click vào textarea/button
    overlay.addEventListener('click', (e) => {
      // Chỉ đóng nếu click vào overlay background, không phải vào comments-box hoặc children
      if (e.target === overlay) {
        overlay.classList.remove('open')
      }
    })
    
    // ✅ FIX: Prevent overlay click từ đóng khi click vào comments-box hoặc children
    const commentsBox = overlay.querySelector('.comments-box')
    if (commentsBox) {
      commentsBox.addEventListener('click', (e) => {
        e.stopPropagation() // Ngăn event bubble lên overlay để tránh đóng
      })
    }
    
    postBtn.onclick = async () => {
      const text = (ta.value || '').trim()
      if (!text || !paging.gameId) return
      postBtn.disabled = true
      try {
        const { data, error } = await supabase.rpc('add_comment', {
      p_user_id: userId,
          p_game_id: paging.gameId,
          p_text: text
        })
        if (error) throw error
        const item = document.createElement('div')
        item.className = 'comment-item'
        const meta = document.createElement('div')
        meta.className = 'comment-meta'
        meta.textContent = `${shortAddr10(userId)} • just now`
        const body = document.createElement('div')
        body.className = 'comment-text'
        body.textContent = text
        item.appendChild(meta)
        item.appendChild(body)
        listEl.prepend(item)
        ta.value = ''
        
        // ✅ Refresh comment count after successful post!
        // ✅ PERFORMANCE: Removed debug log
        const card = document.querySelector(`.game-card[data-game-id="${paging.gameId}"]`)
        if (card) {
          const cmtWrapper = card.querySelector('.icon-wrapper[data-role="comment"]')
          const cmtCountEl = cmtWrapper?.querySelector('.icon-count')
          if (cmtCountEl) {
            const currentCount = parseInt(cmtCountEl.textContent) || 0
            cmtCountEl.textContent = String(currentCount + 1)
            // ✅ PERFORMANCE: Removed debug log
          }
        }
      } catch(e){
        console.error('add_comment error:', e?.message || e)
      } finally { postBtn.disabled = false }
    }

    const cards = document.querySelectorAll('.game-card')
    cards.forEach(card => {
      const gameId = card.getAttribute('data-game-id') || card.id
      if (!gameId) return

      const likeWrapper = card.querySelector('.icon-wrapper[data-role="like"]')
      const commentWrapper = card.querySelector('.icon-wrapper[data-role="comment"]')
      const shareWrapper = card.querySelector('.icon-wrapper[data-role="share"]')
      const leaderboardWrapper = card.querySelector('.icon-wrapper[data-role="leaderboard"]')
      const marketcapWrapper = card.querySelector('.icon-wrapper[data-role="marketcap"]')

      const likeBtn = likeWrapper?.querySelector('button')
      const commentBtn = commentWrapper?.querySelector('button')
      const shareBtn = shareWrapper?.querySelector('button')
      const leaderboardBtn = leaderboardWrapper?.querySelector('button')
      const marketcapBtn = marketcapWrapper?.querySelector('button')

      if (!likeBtn || !commentBtn) return

      const ensureCountEl = (wrapper, selector, fallback = '0') => {
        if (!wrapper) return null
        const existing = wrapper.querySelector(selector)
        if (existing) return existing
        const span = document.createElement('span')
        span.className = 'icon-count'
        span.textContent = fallback
        wrapper.appendChild(span)
        return span
      }

      const likeCountEl = ensureCountEl(likeWrapper, '.icon-count')
      const cmtCountEl = ensureCountEl(commentWrapper, '.icon-count')

      function setCounts(likes, comments) {
        if (likeCountEl) likeCountEl.textContent = String(Math.max(0, likes|0))
        if (cmtCountEl) cmtCountEl.textContent = String(Math.max(0, comments|0))
      }
      function renderHeart(isLiked) {
        const wrapper = likeBtn.closest('.icon-wrapper')
        if (wrapper) {
          wrapper.classList.toggle('liked', !!isLiked)
        }
        likeBtn.setAttribute('aria-pressed', isLiked ? 'true' : 'false')
      }
      
      // Load initial like status from localStorage and Supabase
      ;(async () => {
        try {
          // First, check localStorage
          const localLiked = localStorage.getItem('mp_like_' + gameId) === '1'
          
          // Then, sync with Supabase to get accurate counts
          const { data, error } = await supabase.rpc('get_social_counts', { p_game_id: gameId })
          
          if (!error && data) {
            setCounts(data.likes ?? 0, data.comments ?? 0)
          }
          
          // Render based on localStorage (will be synced with Supabase on first click)
          // Note: We don't check Supabase here to avoid unnecessary API calls
          // The first click will sync localStorage with Supabase
          renderHeart(localLiked)
        } catch (e) {
          console.error(`❤️ [LIKE DEBUG] ${gameId} - Error loading initial state:`, e)
          // Fallback to localStorage
          const localLiked = localStorage.getItem('mp_like_' + gameId) === '1'
          renderHeart(localLiked)
        }
      })()
      
      likeBtn.addEventListener('click', async () => {
        likeBtn.disabled = true
        
        try {
          const { data, error } = await supabase.rpc('toggle_like', {
            p_user_id: userId,
            p_game_id: gameId
          })
          
          if (error) {
            console.error(`❌ toggle_like error:`, error)
            throw error
          }
          
          const isLiked = !!(data && (data.is_liked ?? data.liked))
          const totalLikes = (data && (data.total_likes ?? data.likes)) ?? 0
          
          // Update localStorage
          localStorage.setItem('mp_like_' + gameId, isLiked ? '1' : '0')
          
          // Update UI
          renderHeart(isLiked)
          
          // Update like count
          if (totalLikes != null) {
            const currentComments = cmtCountEl ? Number(cmtCountEl.textContent) || 0 : 0
            setCounts(totalLikes, currentComments)
          }
          
          // Only reload game list if user is currently viewing "Liked" filter
          // This prevents auto-switching to "Liked" filter when user likes a game
          if (currentFilter === 'Liked') {
            setTimeout(() => {
              if (typeof window.applyGameFilter === 'function') {
                window.applyGameFilter('Liked')
              }
            }, 200)
          }
        } catch (e) {
          console.error(`❌ toggle_like error:`, e?.message || e)
        } finally {
          likeBtn.disabled = false
        }
      })
      commentBtn.addEventListener('click', () => openPanel(gameId))
      // Market cap click handler is set by updateMC() function
      // Don't add handler here to avoid conflicts
      if (marketcapBtn) {
        // Handler will be set when MC is loaded via updateMC()
        // ✅ PERFORMANCE: Removed debug log (60+ logs per page load)
      }
      if (shareBtn) {
        shareBtn.addEventListener('click', () => {
          openShareOverlay(gameId)
        })
      }
      if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', () => {
          if (typeof window.__openLeaderboardOverlay === 'function') {
            window.__openLeaderboardOverlay(gameId)
          }
        })
      }
    })
  }
  // ❌ REMOVED: initSocialHandlers() - Already called in DOMContentLoaded (line 1555)
  // This was causing duplicate event listeners → like button flickering!

  // Listen for game scores via postMessage
  // Handle TOGGLE_FOCUS_MODE message from iframe (pixel-space-shooter)
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'TOGGLE_FOCUS_MODE') {
      const { gameId } = event.data;
      console.log('📥 Received TOGGLE_FOCUS_MODE from iframe:', gameId);
      
      // Set active game
      if (gameId) {
        try { window.__memeplayActiveGame = gameId } catch {}
        focusState.gameId = gameId;
        const card = document.querySelector(`[data-game-id="${gameId}"]`) || document.getElementById(gameId);
        if (card) {
          applyFocusActiveCard(gameId);
        }
      }
      
      // Toggle focus mode
      toggleFocusMode();
      
      // Send FOCUS_MODE_CHANGED back to iframe
      // ✅ FIX: Hỗ trợ cả pixel-space-shooter và Pacman games
      const iframes = document.querySelectorAll('iframe[data-game-url*="pixel-space-shooter"], iframe[data-game-url*="pacman"]');
      iframes.forEach(iframe => {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'FOCUS_MODE_CHANGED',
            isFocus: document.body.classList.contains('focus-mode')
          }, '*');
        }
      });
    }
  });
  
  // Legacy games (hosted on Lovable, sử dụng protocol cũ)
  const LEGACY_GAME_IDS = new Set([
    'bird-squash',      // Game 1
    'inverse-cramer',   // Jim Cramer
    'moonshot-bnb'      // Game 2
  ]);

  function isLegacyGame(gameId) {
    return !!gameId && LEGACY_GAME_IDS.has(gameId);
  }

  window.addEventListener('message', async (event) => {
    // ✅ PERFORMANCE: Removed debug log (only log errors)
    const msgType = event.data?.type
    const msgGameId = event.data?.gameId
    
    // ✅ ONLY sync activeGame when game is ACTUALLY PLAYING (GAME_SCORE only!)
    // ❌ DON'T sync with GAME_START/RESTART (may send automatically on iframe load)
    // ❌ DON'T sync with other messages (init, ready, etc.)
    if (event.data?.gameId && event.data?.type === 'GAME_SCORE') {
      const messageGameId = event.data.gameId
      
      if (activeGame !== messageGameId) {
        // ✅ PERFORMANCE: Removed debug log
        activeGame = messageGameId
      }
    }
    
    // Handle GAME_START message (start timer when user actually plays)
    if (event.data?.type === 'GAME_START' && event.data?.gameId) {
      const { gameId } = event.data;
      
      // Only start timer if not already running for this game
      if (!activeStartTime || (activeGame && activeGame !== gameId)) {
        // Stop previous game if different
        if (activeGame && activeGame !== gameId) {
          await stopGame();
        }
        
        startGame(gameId);
      }
    }
    
    if (event.data?.type === 'GAME_SCORE') {
      const { gameId, score, level } = event.data
      
      // ✅ Clear fallback timer when receiving GAME_SCORE (game handles itself!)
      if (window.fallbackTimers && window.fallbackTimers[gameId]) {
        clearTimeout(window.fallbackTimers[gameId])
        delete window.fallbackTimers[gameId]
      }
      
      if (!gameId) {
        return
      }
      
      // Convert to integer (round down for fairness)
      const finalScore = Math.floor(Number(score))
      
      // ✅ ALWAYS submit score first, then process timer logic
      // ✅ Ensure score is sent to leaderboard even if "Play Again" is detected
      // ✅ PERFORMANCE: Removed debug log
      
      // Submit score immediately (don't wait for timer logic)
      try {
        const payload = {
          p_user_id: userId,
          p_game_id: gameId,
          p_score: finalScore
        }
        if (Number.isFinite(Number(level))) {
          payload.p_level = Math.max(1, Math.trunc(Number(level)))
        } else {
          payload.p_level = 1
        }

        // ✅ PERFORMANCE: Removed debug log
        const { data, error } = await rpcWithKeepalive('submit_game_score', payload)
        
        if (error) {
          console.error('❌ [SCORE] RPC error:', error)
          // Không throw để không block game flow, nhưng log để debug
          console.warn('⚠️ [SCORE] Score submission failed. Make sure SQL function submit_game_score exists in Supabase.')
          return
        }
        
        // Supabase RPC có thể return array hoặc object
        let result = data
        if (Array.isArray(data)) {
          result = data.length > 0 ? data[0] : null
        }
        
        // ✅ PERFORMANCE: Removed debug log (only log high score)
        
        if (!result || typeof result !== 'object') {
          console.error('❌ [SCORE] Invalid response format:', result)
          console.warn('⚠️ [SCORE] SQL function submit_game_score may not exist. Run LEADERBOARD-SQL.sql in Supabase.')
          return
        }
        
        // Verify required fields
        if (result.best_score === undefined || result.user_rank === undefined) {
          console.warn('⚠️ [SCORE] Response missing fields:', result)
          console.warn('⚠️ [SCORE] Expected: { is_new_best, user_rank, total_players, best_score }')
        }
        
        if (result.is_new_best) {
          console.log(`🏆 New high score! Rank #${result.user_rank}/${result.total_players || 'N/A'}`)
          // TODO: Show toast/animation "New Best!"
        } else {
          console.log(`✓ Score submitted. Best: ${result.best_score || 'N/A'}, Rank: #${result.user_rank || 'N/A'}`)
        }
      } catch (err) {
        console.error('❌ [SCORE] Submit score error:', err)
      }

      // Ensure a play is counted even if timer didn't start properly.
      // Chỉ chạy safeguard khi timer KHÔNG chạy (ví dụ fallback hoặc iframe không gửi GAME_START).
      // Nếu timer đang chạy bình thường, stopGame() sẽ tự increment → tránh double-count.
      const timerRunningForGame = activeGame === gameId && !!activeStartTime;
      if (!isLegacyGame(gameId)) {
        // ✅ PERFORMANCE: Removed debug logs
        // Timer logic continues without logging
      } else if (!timerRunningForGame) {
        try {
          // Legacy fallback: game không gửi GAME_START nên ép cộng tối thiểu 3s
          const sgPayload = {
            p_user_id: userId,
            p_game_id: gameId,
            p_seconds: 3
          };
          // ✅ PERFORMANCE: Removed debug log
          const { data: incData, error: incErr } = await rpcWithKeepalive('increment_play_count', sgPayload)
          if (incErr) {
            console.warn('⏱ [PLAYS SAFEGUARD] increment_play_count failed:', incErr.message)
          } else if (incData && typeof incData.total_plays === 'number') {
            setPlaysLabelForCard(gameId, incData.total_plays)
            // ✅ PERFORMANCE: Removed debug log
          }
        } catch (e) {
          console.warn('⏱ [PLAYS SAFEGUARD] error:', e?.message || e)
          try { await loadPlayCount(gameId) } catch {}
        }
      } else if (timerRunningForGame) {
        console.log('⏭️ [PLAYS SAFEGUARD] Skip for', gameId, '- timer already running (stopGame handles increment)');
      }
      
      // LEGACY GAMES (Lovable): Always treat GAME_SCORE as full session end (old behavior)
      if (isLegacyGame(gameId)) {
        // ✅ PERFORMANCE: Removed debug logs (only log errors)
      
        // Nếu timer chưa chạy hoặc đang chạy cho game khác, backfill start time tối thiểu
        if (!activeGame || activeGame !== gameId || !activeStartTime) {
          activeGame = gameId;
          // Backdate 5s để đảm bảo có thời gian >0 cho reward (increment_play_count dùng 3s cố định)
          activeStartTime = Date.now() - 5000;
        }
      
        // Dừng game ngay để finalize playtime + achievements như cũ
        try {
          await stopGame();
        } catch (e) {
          console.error('❌ [LEGACY] stopGame error for', gameId, e);
        }
        // Không return; tiếp tục xuống logic GAME OVER chung để nổ toast giữa màn hình
      }
      
      // DETECT PLAY AGAIN: chỉ áp dụng cho game mới, không áp dụng cho legacy games
      if (!isLegacyGame(gameId)) {
        const hasScore = score > 0  // Score > 0 = game is being played
        const timerNotRunningForThisGame = !activeStartTime || (activeGame && activeGame !== gameId)
        
        const isPlayAgain = hasScore && timerNotRunningForThisGame && finalScore < 15  // ✅ Only detect Play Again if score < 15
        
        if (isPlayAgain) {
          // Stop previous session if exists (different game)
          if (activeGame && activeStartTime && activeGame !== gameId) {
            await stopGame()
          }
          
          startGame(gameId)
          // Return early, wait for higher score to process game over
          return
        }
      }
      
      // HIGH SCORE = GAME OVER
      // ✅ PERFORMANCE: Removed debug log
      
      // Set flag to allow showing achievements (ONLY after game over)
      isGameOver = true
      
      // Stop game = finalize playtime + queue any remaining achievements
      if (activeGame === gameId || activeGame) {
        await stopGame()
      }
      
      // NOW check pending achievements (after stopGame finalized them)
      // ✅ PERFORMANCE: Removed debug logs
      
      // Try BOTH gameId and any pending
      const achievementsToShow = pendingAchievements[gameId] || pendingAchievements[Object.keys(pendingAchievements)[0]]
      
      if (achievementsToShow && achievementsToShow.length > 0) {
        const keyUsed = pendingAchievements[gameId] ? gameId : Object.keys(pendingAchievements)[0]
        // Wait 1s after game over, then show achievements
        setTimeout(() => {
          showPendingAchievements(keyUsed)
        }, 1000)
      } else {
        // Reset flag if no achievements to show
        isGameOver = false
      }
    }
  })

  // Format count helper (1K, 10.5K, 1.2M)
  function formatCount(num) {
    const n = Number(num) || 0
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
    return String(n)
  }

  function shortAddrLeaderboard(addr) {
    if (!addr || addr.length <= 10) return addr || 'Anonymous'
    return addr.slice(0, 6) + '…' + addr.slice(-4)
  }

  // Format score based on game type
  function formatScore(score, gameId) {
    const num = Number(score) || 0;
    
    // Wojak game shows percentage
    if (gameId === 'wojak-btc-blast') {
      return num + '%';
    }
    
    // Other games use normal format (1K, 1M...)
    return formatCount(num);
  }

  function setLeaderboardActivePanel(panel) {
    const overlay = document.getElementById('leaderboardOverlay')
    if (!overlay) return
    const tabs = overlay.querySelectorAll('.leaderboard-tab')
    const scoresPanel = document.getElementById('leaderboardPanelScores')
    const rewardsPanel = document.getElementById('leaderboardPanelRewards')

    const target = panel === 'rewards' ? 'rewards' : 'scores'
    tabs.forEach(btn => {
      const isActive = btn.dataset.panel === target
      btn.classList.toggle('active', isActive)
    })
    scoresPanel?.classList.toggle('active', target === 'scores')
    rewardsPanel?.classList.toggle('active', target === 'rewards')
    overlay.dataset.activePanel = target
  }

  function renderRewardsPanel(gameId) {
    const summaryEl = document.getElementById('leaderboardRewardSummary')
    const listEl = document.getElementById('leaderboardRewardList')
    if (!summaryEl || !listEl) return

    const awardedMap = getGameAwards(gameId)
    const totalSeconds = getGameSeconds(gameId)
    const achievements = [
      { threshold: 10, name: '10s Play Reward', reward: 100 },
      { threshold: 60, name: 'Engaged', reward: 300 },
      { threshold: 300, name: 'Champion', reward: 1000 }
    ]

    const progress = Math.min(100, (totalSeconds / 300) * 100)
    summaryEl.innerHTML = `
      <div style="font-size:18px;">Total Playtime</div>
      <div class="reward-total">${totalSeconds}s / 300s</div>
      <div class="leaderboard-reward-progress"><span style="width:${progress}%"></span></div>
      <div style="margin-top:6px;font-size:13px;color:#a9b1c4;">Play more to unlock bonus PLAY rewards</div>
    `

    listEl.innerHTML = ''
    achievements.forEach(ach => {
      const unlocked = awardedMap[ach.threshold] || totalSeconds >= ach.threshold
      const secondsLeft = Math.max(0, ach.threshold - totalSeconds)
      const card = document.createElement('div')
      card.className = 'leaderboard-reward-card' + (unlocked ? ' unlocked' : '')
      card.innerHTML = `
        <div style="flex:1;">
          <div class="reward-name">${unlocked ? '✅' : '🔒'} ${ach.name}</div>
          <div class="reward-status">${unlocked ? 'Unlocked!' : `${secondsLeft}s remaining`}</div>
        </div>
        <div class="reward-amount">+${ach.reward}</div>
      `
      listEl.appendChild(card)
    })
  }

  async function openLeaderboardOverlay(gameId) {
    const overlay = document.getElementById('leaderboardOverlay')
    const list = document.getElementById('leaderboardList')
    const rewardSummary = document.getElementById('leaderboardRewardSummary')
    const rewardList = document.getElementById('leaderboardRewardList')
    if (!overlay || !list || !rewardSummary || !rewardList) return

    overlay.dataset.gameId = gameId
    setLeaderboardActivePanel('scores')
    renderRewardsPanel(gameId)

    list.innerHTML = '<div style="padding:24px;text-align:center;color:#bbb;">Loading...</div>'
    overlay.classList.add('open')

    try {
      const { data, error } = await supabase.rpc('get_game_leaderboard_with_user', {
        p_game_id: gameId,
        p_user_id: userId,
        p_limit: 100
      })

      if (error) {
        console.error('❌ [LEADERBOARD] RPC error:', error)
        list.innerHTML = '<div style="padding:24px;text-align:center;color:#f88;">Failed to load leaderboard. Make sure SQL function get_game_leaderboard_with_user exists in Supabase.</div>'
        return
      }

      // ✅ PERFORMANCE: Removed debug log

      list.innerHTML = ''

      // Supabase RPC có thể return array hoặc object
      let result = data
      if (Array.isArray(data)) {
        result = data.length > 0 ? data[0] : null
      }
      
      if (!result || typeof result !== 'object') {
        console.error('❌ [LEADERBOARD] Invalid response format:', result)
        console.warn('⚠️ [LEADERBOARD] SQL function get_game_leaderboard_with_user may not exist. Run LEADERBOARD-SQL.sql in Supabase.')
        list.innerHTML = '<div style="padding:24px;text-align:center;color:#f88;">Failed to load leaderboard (invalid response). Run LEADERBOARD-SQL.sql in Supabase.</div>'
        return
      }

      // Parse current_user (có thể là JSON string hoặc object)
      let userEntry = null
      if (result.current_user) {
        if (typeof result.current_user === 'string') {
          try {
            userEntry = result.current_user === 'null' ? null : JSON.parse(result.current_user)
          } catch {
            userEntry = null
          }
        } else if (typeof result.current_user === 'object') {
          userEntry = result.current_user
        }
      }
      if (userEntry) {
        const userItem = document.createElement('div')
        userItem.className = 'leaderboard-item user-highlight'
        userItem.innerHTML = `
          <div class="leaderboard-rank">${userEntry.rank ? '#' + userEntry.rank : '-'}</div>
          <div class="leaderboard-user">You</div>
          <div class="leaderboard-score">${formatScore(userEntry.best_score, gameId)}</div>
        `
        list.appendChild(userItem)
      }

      const divider = document.createElement('div')
      divider.className = 'leaderboard-divider'
      divider.textContent = 'Top 100 Players'
      list.appendChild(divider)

      // Parse top_players (có thể là JSON string hoặc array)
      let topPlayers = []
      if (result.top_players) {
        if (Array.isArray(result.top_players)) {
          topPlayers = result.top_players
        } else if (typeof result.top_players === 'string') {
          try {
            topPlayers = JSON.parse(result.top_players) || []
          } catch {
            topPlayers = []
          }
        }
      }
      if (topPlayers.length === 0) {
        const empty = document.createElement('div')
        empty.style.cssText = 'padding:24px;text-align:center;color:#888;'
        empty.textContent = 'No scores yet. Be the first!'
        list.appendChild(empty)
        return
      }

      topPlayers.forEach(player => {
        const item = document.createElement('div')
        item.className = 'leaderboard-item'
        if (player.user_id === userId) {
          item.classList.add('is-current-user')
        }

        let rankDisplay = `#${player.rank}`
        if (player.rank === 1) rankDisplay = '🥇'
        else if (player.rank === 2) rankDisplay = '🥈'
        else if (player.rank === 3) rankDisplay = '🥉'

        item.innerHTML = `
          <div class="leaderboard-rank">${rankDisplay}</div>
          <div class="leaderboard-user">${shortAddrLeaderboard(player.user_id)}</div>
          <div class="leaderboard-score">${formatScore(player.best_score, gameId)}</div>
        `
        list.appendChild(item)
      })
    } catch (err) {
      console.error('Leaderboard error:', err)
      list.innerHTML = '<div style="padding:24px;text-align:center;color:#f88;">Failed to load leaderboard</div>'
    }
  }

  ;(function initLeaderboardOverlay(){
    const overlay = document.getElementById('leaderboardOverlay')
    if (!overlay) return
    const closeBtn = document.getElementById('leaderboardCloseBtn')
    const tabButtons = overlay.querySelectorAll('.leaderboard-tab')

    if (!overlay.dataset.activePanel) overlay.dataset.activePanel = 'scores'

    function closeLeaderboardOverlay() {
      overlay.classList.remove('open')
    }

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.panel
        if (panel) setLeaderboardActivePanel(panel)
      })
    })

    closeBtn?.addEventListener('click', closeLeaderboardOverlay)
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeLeaderboardOverlay()
    })
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && overlay.classList.contains('open')) closeLeaderboardOverlay()
    })

    window.__openLeaderboardOverlay = openLeaderboardOverlay
    window.__closeLeaderboardOverlay = closeLeaderboardOverlay
  })()

  // Share Modal Logic
  let currentShareGameId = null
  
  function openShareOverlay(gameId) {
    currentShareGameId = gameId
    const overlay = document.getElementById('shareOverlay')
    if (overlay) overlay.classList.add('open')
  }

  // Build share URL pointing to dedicated play mode
  function buildShareUrl(gameId) {
    if (!gameId) return `${window.location.origin}/`
    const base = `${window.location.origin}/play.html`
    const encoded = encodeURIComponent(gameId)
    return `${base}?game=${encoded}`
  }

  ;(function initShareOverlay(){
    const overlay = document.getElementById('shareOverlay')
    if (!overlay) return
    
    const closeBtn = document.getElementById('shareCloseBtn')
    const copyBtn = document.getElementById('shareCopyBtn')
    const telegramBtn = document.getElementById('shareTelegramBtn')
    const xBtn = document.getElementById('shareXBtn')

    function closeShareOverlay() {
      overlay.classList.remove('open')
    }

    // Close handlers
    closeBtn?.addEventListener('click', closeShareOverlay)
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeShareOverlay()
    })
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && overlay.classList.contains('open')) closeShareOverlay()
    })

    // Copy Link Button
    copyBtn?.addEventListener('click', async () => {
      const shareUrl = buildShareUrl(currentShareGameId)
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl)
          const originalHTML = copyBtn.innerHTML
          copyBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>✓ Copied!</span>
          `
          setTimeout(() => {
            copyBtn.innerHTML = originalHTML
          }, 2000)
        }
      } catch (err) {
        console.error('Copy failed:', err)
      }
    })

    // Telegram Button
    telegramBtn?.addEventListener('click', () => {
      const shareUrl = buildShareUrl(currentShareGameId)
      const text = `🎮 Check out this awesome game on MemePlay Arcade! Play and earn PLAY points! 🚀`
      const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
      window.open(telegramUrl, '_blank')
      closeShareOverlay()
    })

    // X/Twitter Button
    xBtn?.addEventListener('click', () => {
      const shareUrl = buildShareUrl(currentShareGameId)
      const text = `🎮 Just played an awesome game on MemePlay! Play & earn PLAY points! 🚀`
      const xUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
      window.open(xUrl, '_blank')
      closeShareOverlay()
    })
  })()

  ;(function initStatsOverlay(){
    const overlay = document.getElementById('statsOverlay')
    if (!overlay) return
    const closeBtn = document.getElementById('statsCloseBtn')
    const streakEl = document.getElementById('statsStreak')
    const playsEl = document.getElementById('statsPlays')

    function updateStatsOverlay() {
      const streakSource = document.getElementById('streakCount')
      const playsSource = document.getElementById('headerEarned')
      if (streakSource) streakEl.textContent = streakSource.textContent || '0'
      if (playsSource) playsEl.textContent = playsSource.textContent || '0'
    }

    function openStatsOverlay() {
      updateStatsOverlay()
      overlay.classList.add('open')
    }

    function closeStatsOverlay() {
      overlay.classList.remove('open')
    }

    closeBtn?.addEventListener('click', closeStatsOverlay)
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeStatsOverlay()
    })
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && overlay.classList.contains('open')) closeStatsOverlay()
    })

    window.__openStatsOverlay = openStatsOverlay
    window.__updateStatsOverlay = updateStatsOverlay
  })()
 
   
  

