// ==========================================
// Telegram Mini App - Game Loading System
// ==========================================
// ✅ Phiên bản Telegram của app-v3.js
// ✅ Chỉ khác ở getUserId() - detect Telegram user thay vì wallet/local

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
import { 
  TEMPLATE_REGISTRY,
  getTemplateConfig,
  getEnabledTemplates
} from '../games/templates-v2/core/template-registry.js'

// ==========================================
// ✅ TELEGRAM WEBAPP INITIALIZATION
// ==========================================
// Telegram WebApp SDK được load trong <head> của HTML
// Code này chạy ngay khi module load để init Telegram WebApp

(function initTelegramWebApp() {
  // Kiểm tra xem có đang chạy trong Telegram không
  if (typeof window.Telegram === 'undefined' || !window.Telegram.WebApp) {
    console.warn('[Telegram] WebApp SDK not found - running in browser, not Telegram')
    return // Fallback to wallet/local storage
  }
  
  const tg = window.Telegram.WebApp
  
  // ✅ QUAN TRỌNG: Expand app để chiếm full height (không có space phía trên)
  tg.expand()
  
  // ✅ Đánh dấu app đã ready (Telegram sẽ hide loading spinner)
  tg.ready()
  
  // ✅ Optional: Enable closing confirmation (nếu muốn)
  // tg.enableClosingConfirmation() // Uncomment nếu muốn confirm khi user đóng app
  
  // ✅ Log để debug (có thể remove sau)
  console.log('[Telegram] WebApp initialized', {
    platform: tg.platform,
    version: tg.version,
    colorScheme: tg.colorScheme,
    userId: tg.initDataUnsafe?.user?.id
  })
})()

// ==========================================
// STEP 2.1: Setup Supabase Client
// ==========================================

const SUPABASE_URL = 'https://iikckrcdrvnqctzacxgx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpa2NrcmNkcnZucWN0emFjeGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Mzc3NDgsImV4cCI6MjA3NzMxMzc0OH0.nIPvf11YfFlWH0XHDZdxI496zaP431QOJCuQ-5XX4DQ'

let supabaseClient = null

// ==========================================
// PHASE 3: Global State
// ==========================================

let gameListGlobal = [] // Store gameList for Phase 3
let currentGameWindow = {
  prev: null,
  current: null,
  next: null
}
let scrollObserver = null

// ✅ PHASE 4: Game tracking state
let activeGame = null
let activeStartTime = 0
let progressInterval = null
let playCountIncremented = false // Flag to ensure play count is only incremented once per game session
let isGameOver = false // Flag to prevent showing rewards during gameplay
let stopGameInProgress = false // Flag to prevent double call to stopGame()

// ✅ Reward thresholds and values
const REWARD_THRESHOLDS = [10, 60, 300]
const REWARD_VALUES = { 10: 100, 60: 300, 300: 1000 }
const MAX_ACCUM_SECONDS = 300

// ✅ Queue achievements to show after game over
const pendingAchievements = {}

function initSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
  }
  return supabaseClient
}

// ==========================================
// STEP 2.2: Load Game List & Sort by Likes
// ==========================================

const GAME_LIST_CACHE_KEY = 'mp_v3_game_list_cache'
const GAME_LIST_CACHE_TTL = 5 * 60 * 1000 // 5 phút

async function loadGameListFromSupabase() {
  // ✅ OPTIMIZATION 1: Check cache first (chỉ dùng nếu có games)
  const cached = localStorage.getItem(GAME_LIST_CACHE_KEY)
  if (cached) {
    try {
      const { games, timestamp } = JSON.parse(cached)
      const age = Date.now() - timestamp
      // ✅ FIX: Chỉ dùng cache nếu có games và chưa hết hạn
      if (Array.isArray(games) && games.length > 0 && age < GAME_LIST_CACHE_TTL) {
        return games
      } else {
        // Cache invalid hoặc empty, xóa cache cũ
        localStorage.removeItem(GAME_LIST_CACHE_KEY)
      }
    } catch (e) {
      // Cache invalid, xóa cache cũ
      localStorage.removeItem(GAME_LIST_CACHE_KEY)
    }
  }
  
  const supabase = initSupabaseClient()
  const enabledTemplates = Object.keys(TEMPLATE_REGISTRY)
    .filter(id => TEMPLATE_REGISTRY[id].enabled !== false)
  
  // Fetch games for each template (parallel)
  const promises = enabledTemplates.map(async (templateId) => {
    const config = getTemplateConfig(templateId)
    const supabaseTemplateId = templateId.includes('-template')
      ? templateId
      : `${templateId}-template`
    
    try {
      const { data, error } = await supabase.rpc('list_user_created_games', {
        p_template_id: supabaseTemplateId
      })
      
      if (error) {
        return { templateId, data: [] }
      }
      
      if (!Array.isArray(data) || data.length === 0) {
        return { templateId, data: [] }
      }
      
      return { templateId, data, config }
    } catch (err) {
      return { templateId, data: [] }
    }
  })

  const results = await Promise.all(promises)
  
  // ✅ OPTIMIZATION 3: Filter playmode-* chỉ 1 lần và normalize
  const allGames = results.flatMap((r) => {
    const templateId = r.templateId
    const config = r.config || getTemplateConfig(templateId)
    const data = r.data || []
    
    return data
      .filter(item => {
        const gameId = item?.game_id || item?.id
        return gameId?.startsWith('playmode-')
      })
      .map(item => {
        const gameId = item.game_id || item.id
        
        // ✅ OPTIMIZATION: Tối ưu stories parsing
        let stories = []
        if (Array.isArray(item.stories)) {
          stories = item.stories
        } else if (typeof item.stories === 'string') {
          try {
            stories = JSON.parse(item.stories)
          } catch (e) {
            stories = []
          }
        }
        
        const legacyStories = [
          item.story_one,
          item.story_two,
          item.story_three
        ].filter(s => typeof s === 'string' && s.trim())
        
        if (legacyStories.length > 0) {
          stories = [...stories, ...legacyStories]
        }
        
        return {
          id: gameId,
          game_id: gameId,
          template_id: templateId,
          templateUrl: item.template_url || (config?.templateUrl || ''),
          title: item.title || 'Untitled',
          fragmentLogoUrl: item.fragment_logo_url || '',
          stories: stories.filter(s => s.trim()),
          mapColor: item.map_color || '#1A0A2E',
          mapIndex: item.map_index || 0,
          likes_count: item.likes_count ?? item.likes ?? 0,
          comments_count: item.comments_count ?? item.comments ?? 0,
          plays_count: item.plays_count ?? item.plays ?? 0,
          creator_name: item.creator_name || item.creator_id || 'Creator',
          creator_id: item.creator_id || '',
          ...item
        }
      })
  })
  
  // Sort by likes_count DESC, then by plays_count DESC
  allGames.sort((a, b) => {
    const aLikes = a.likes_count || 0
    const bLikes = b.likes_count || 0
    if (bLikes !== aLikes) {
      return bLikes - aLikes
    }
    return (b.plays_count || 0) - (a.plays_count || 0)
  })
  
  // ✅ OPTIMIZATION 1: Cache game list
  try {
    localStorage.setItem(GAME_LIST_CACHE_KEY, JSON.stringify({
      games: allGames,
      timestamp: Date.now()
    }))
  } catch (e) {
    // localStorage full, ignore
  }
  
  return allGames
}

// ✅ OPTIMIZATION 4: Inline getGame0() - không cần function riêng

// ==========================================
// STEP 2.4: Load Game Config
// ==========================================

async function loadGameConfig(gameId, templateId) {
  // Check localStorage first
  const storageKey = `${templateId}_brand_config_${gameId}`
  const cached = localStorage.getItem(storageKey)
  if (cached) {
    try {
      const config = JSON.parse(cached)
      return config
    } catch (e) {
      console.warn('[V3] Failed to parse cached config:', e)
    }
  }
  
  // Load from Supabase (nếu cần - tạm thời return empty config)
  return {
    title: '',
    stories: [],
    mapColor: null
  }
}

// ==========================================
// Helper: Get Game URL
// ==========================================

// ✅ OPTIMIZATION 7: Tối ưu getGameUrl() - đơn giản hóa
function getGameUrl(gameId, templateId) {
  const baseUrl = window.location.origin.replace(/\/$/, '')
  const config = getTemplateConfig(templateId)
  const templateUrl = config?.templateUrl || `/games/templates-v2/pacman-template/index.html`
  const separator = templateUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${templateUrl}${separator}game=${gameId}&v=${Date.now()}`
}

// ==========================================
// Helper: Create Game Footer
// ==========================================

function createGameFooter(game, config) {
  const footer = document.createElement('footer')
  footer.className = 'game-footer'
  
  footer.innerHTML = `
    <div class="game-icons">
      <div class="game-icons-left">
        <div class="icon-wrapper" data-role="like">
          <button type="button" title="Like" aria-label="Like">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path d="M24 40.5l-1.2-1.1C16 33 10 28 10 21.5 10 17 13.6 13.5 18 13.5c2.8 0 5.5 1.4 7 3.8 1.5-2.4 4.2-3.8 7-3.8 4.4 0 8 3.5 8 8 0 6.5-6 11.6-12.8 17.9L24 40.5z" />
            </svg>
          </button>
          <span class="icon-count" data-label="likes">${game.likes_count || 0}</span>
        </div>
        <div class="icon-wrapper" data-role="comment">
          <button type="button" title="Comments" aria-label="Comments">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path d="M9 20.5c0-7.2 7.5-12.5 16-12.5s16 5.3 16 12.5-7.5 12.5-16 12.5c-2.3 0-4.6-.3-6.7-.9l-5.8 4.7 1.7-6.3C11.5 27.4 9 24.2 9 20.5z" />
            </svg>
          </button>
          <span class="icon-count" data-label="comments">0</span>
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
      Creator: <strong>${config.title || 'Unknown'}</strong>
      <span data-plays-count="${game.id}" style="display:none;"></span>
    </div>
  `
  
  return footer
}

// ==========================================
// STEP 2.5: Render Game Card HTML (Modified for Phase 3)
// ==========================================

function renderGameCard(game, config, options = {}) {
  const { active = true, preloaded = false } = options
  const container = document.querySelector('.game-container')
  if (!container) {
    console.error('[V3] Game container not found')
    return null
  }
  
  // Check if card already exists (for scroll back)
  let card = document.getElementById(game.id)
  if (card) {
    // Card exists, just update state
    if (active) card.classList.add('active')
    if (preloaded) card.classList.add('preloaded')
    return card
  }
  
  card = document.createElement('div')
  card.className = 'game-card'
  if (active) card.classList.add('active')
  if (preloaded) card.classList.add('preloaded')
  
  card.id = game.id
  card.setAttribute('data-game-id', game.id)
  card.setAttribute('data-template-id', game.template_id)
  card.setAttribute('data-game-ready', 'false') // Track game ready state
  
  // Game stage với iframe
  const stage = document.createElement('div')
  stage.className = 'game-stage'
  
  const iframe = document.createElement('iframe')
  iframe.src = getGameUrl(game.id, game.template_id)
  iframe.loading = active ? 'eager' : 'lazy'
  iframe.setAttribute('frameborder', '0')
  iframe.setAttribute('scrolling', 'no')
  iframe.setAttribute('allow', 'autoplay; fullscreen; gamepad')
  iframe.setAttribute('title', `Game: ${game.id}`)
  iframe.style.width = '100%'
  iframe.style.height = '100%'
  
  // ✅ Loading bar overlay
  const loadingOverlay = document.createElement('div')
  loadingOverlay.className = 'game-loading-overlay show'
  loadingOverlay.innerHTML = `
    <div class="game-loading-spinner"></div>
    <div class="game-loading-text">Loading game...</div>
  `
  
  stage.appendChild(iframe)
  stage.appendChild(loadingOverlay)
  
  // ✅ Game ready detection
  setupGameReadyDetection(card, iframe, loadingOverlay)
  
  // Game footer
  const footer = createGameFooter(game, config)
  
  card.appendChild(stage)
  card.appendChild(footer)
  container.appendChild(card)
  
  // ✅ PHASE 4: Setup social handlers and hydrate counts
  if (typeof window.__setupSocialHandlersForCard === 'function') {
    window.__setupSocialHandlersForCard(card, game.id)
  }
  if (typeof window.__hydrateSocialCounts === 'function') {
    window.__hydrateSocialCounts(game.id, card)
  }
  
  return card
}

// ==========================================
// STEP 2.6: Load Game 0 + Preload Game 1 (Phase 3)
// ==========================================

async function loadGame0() {
  const startTime = performance.now()
  
  try {
    // Load game list
    const gameList = await loadGameListFromSupabase()
    if (!gameList || gameList.length === 0) {
      console.error('[V3] No games found')
      return null
    }
    
    // Store globally for Phase 3
    gameListGlobal = gameList
    
    // Get Game 0
    const game0 = gameList[0]
    if (!game0) {
      console.error('[V3] Game 0 not found')
      return null
    }
    
    // Get Game 1 for preload
    const game1 = gameList[1] || null
    
    // Load configs in parallel
    const [config0, config1] = await Promise.all([
      loadGameConfig(game0.id, game0.template_id),
      game1 ? loadGameConfig(game1.id, game1.template_id) : null
    ])
    
    // Render Game 0 (active)
    const card0 = renderGameCard(game0, config0, { active: true })
    
    // Render Game 1 (preloaded, paused) if exists
    if (game1) {
      const card1 = renderGameCard(game1, config1, { active: false, preloaded: true })
    }
    
    // Update window state
    currentGameWindow = {
      prev: null,
      current: game0.id,
      next: game1?.id || null
    }
    
    // Init scroll observer
    initScrollObserver()
    
    const loadTime = performance.now() - startTime
    console.log(`[V3] ✅ Game 0 loaded in ${Math.round(loadTime)}ms`)
    
    if (loadTime > 1000) {
      console.warn(`[V3] ⚠️ Game 0 load time exceeded target: ${Math.round(loadTime)}ms`)
    }
    
    return card0
  } catch (error) {
    console.error('[V3] Failed to load Game 0:', error)
    return null
  }
}

// ==========================================
// PHASE 3: Scroll Observer & Window Management
// ==========================================

// ✅ Debounce for updateGameWindow
let updateWindowTimeout = null
let lastScrollTop = 0
let scrollDirection = 'down' // 'up' or 'down'

function initScrollObserver() {
  const container = document.querySelector('.game-container')
  if (!container) return
  
  // Cleanup old observer if exists
  if (scrollObserver) {
    scrollObserver.disconnect()
  }
  
  // ✅ Fix 4: Detect scroll direction
  container.addEventListener('scroll', () => {
    const currentScrollTop = container.scrollTop
    scrollDirection = currentScrollTop > lastScrollTop ? 'down' : 'up'
    lastScrollTop = currentScrollTop
  }, { passive: true })
  
  // ✅ Fix 1: Check all visible games (not just entries)
  function checkAllVisibleGames() {
    const viewportCenter = window.innerHeight / 2
    const containerRect = container.getBoundingClientRect()
    let bestGame = null
    let minDistance = Infinity
    let bestRatio = 0
    
    // Check all game cards, not just entries
    const allCards = document.querySelectorAll('.game-card')
    allCards.forEach(card => {
      const rect = card.getBoundingClientRect()
      const cardTop = rect.top - containerRect.top
      const cardBottom = rect.bottom - containerRect.top
      const cardHeight = rect.height
      
      // Check if card is visible in viewport
      const isVisible = cardBottom > 0 && cardTop < containerRect.height
      if (!isVisible) return
      
      // Calculate intersection ratio
      const visibleTop = Math.max(0, cardTop)
      const visibleBottom = Math.min(containerRect.height, cardBottom)
      const visibleHeight = Math.max(0, visibleBottom - visibleTop)
      const intersectionRatio = visibleHeight / cardHeight
      
      // ✅ Fix 1: Reduced threshold from 0.3 to 0.1 (detect earlier)
      if (intersectionRatio > 0.1) {
        const cardCenter = rect.top + rect.height / 2
        const distance = Math.abs(cardCenter - viewportCenter)
        
        if (distance < minDistance || 
            (distance === minDistance && intersectionRatio > bestRatio)) {
          minDistance = distance
          bestRatio = intersectionRatio
          bestGame = card
        }
      }
    })
    
    return bestGame
  }
  
  scrollObserver = new IntersectionObserver((entries) => {
    // ✅ Debounce updateGameWindow
    clearTimeout(updateWindowTimeout)
    updateWindowTimeout = setTimeout(() => {
      // ✅ Fix 1: Check all visible games, not just entries
      const bestGame = checkAllVisibleGames()
      
      if (bestGame) {
        const gameId = bestGame.id
        if (gameId && gameId !== currentGameWindow.current) {
          updateGameWindow(gameId)
        }
      }
    }, 50) // ✅ Reduced debounce from 100ms to 50ms for faster response
  }, {
    root: container,
    rootMargin: '150px 0px',
    threshold: [0, 0.1, 0.3, 0.5, 0.7, 1.0] // ✅ Fix 1: Added 0.1 threshold
  })
  
  // Observe all existing cards
  const cards = document.querySelectorAll('.game-card')
  cards.forEach(card => {
    scrollObserver.observe(card)
  })
}

async function updateGameWindow(gameAId) {
  if (!gameListGlobal || gameListGlobal.length === 0) return
  if (currentGameWindow.current === gameAId) return
  
  const currentIndex = gameListGlobal.findIndex(g => g.id === gameAId)
  if (currentIndex === -1) {
    console.warn(`[V3] Game ${gameAId} not found in gameList`)
    return
  }
  
  const prevIndex = currentIndex - 1
  const nextIndex = currentIndex + 1
  
  const gameA = gameListGlobal[currentIndex]
  const gamePrev = prevIndex >= 0 ? gameListGlobal[prevIndex] : null
  const gameNext = nextIndex < gameListGlobal.length ? gameListGlobal[nextIndex] : null
  
  // ✅ Fix 2 & 3: Preload next game immediately based on scroll direction
  // Scroll down → preload next game first (priority)
  // Scroll up → preload prev game first (priority)
  if (scrollDirection === 'down' && gameNext) {
    // Preload next game immediately (don't wait)
    loadGamePreloaded(gameNext).catch(err => console.error(`[V3] Failed to preload next game:`, err))
  }
  if (scrollDirection === 'up' && gamePrev) {
    // Preload prev game immediately (don't wait)
    loadGamePreloaded(gamePrev).catch(err => console.error(`[V3] Failed to preload prev game:`, err))
  }
  
  // ✅ Load prev/next games (handle scroll back - Option B: giữ DOM, chỉ load lại iframe)
  if (gamePrev) {
    await loadGamePreloaded(gamePrev)
  }
  if (gameNext) {
    await loadGamePreloaded(gameNext)
  }
  
  // Activate Game A
  activateGame(gameA.id)
  
  // Cleanup games outside window
  const windowGameIds = [gamePrev?.id, gameA.id, gameNext?.id].filter(Boolean)
  cleanupGamesOutsideWindow(windowGameIds)
  
  // Update window state
  currentGameWindow = {
    prev: gamePrev?.id || null,
    current: gameA.id,
    next: gameNext?.id || null
  }
  
  // Re-observe cards (new cards may have been added)
  if (scrollObserver) {
    const cards = document.querySelectorAll('.game-card')
    cards.forEach(card => {
      if (!card.dataset.observed) {
        scrollObserver.observe(card)
        card.dataset.observed = 'true'
      }
    })
  }
}

async function loadGamePreloaded(game) {
  // ✅ Check if card exists (for scroll back)
  let card = document.getElementById(game.id)
  if (card) {
    // Card exists, check if iframe exists
    const stage = card.querySelector('.game-stage')
    if (stage && !stage.querySelector('iframe')) {
      // DOM exists but iframe removed, reload iframe
      const config = await loadGameConfig(game.id, game.template_id)
      reloadGameIframe(card, game, config)
    }
    return card
  }
  
  // New card, render normally
  const config = await loadGameConfig(game.id, game.template_id)
  card = renderGameCard(game, config, { 
    active: false, 
    preloaded: true 
  })
  
  return card
}

// ✅ Helper: Reload iframe for existing card
function reloadGameIframe(card, game, config) {
  const stage = card.querySelector('.game-stage')
  if (!stage) return
  
  // Create iframe
  const iframe = document.createElement('iframe')
  iframe.src = getGameUrl(game.id, game.template_id)
  iframe.loading = 'lazy'
  iframe.setAttribute('frameborder', '0')
  iframe.setAttribute('scrolling', 'no')
  iframe.setAttribute('allow', 'autoplay; fullscreen; gamepad')
  iframe.setAttribute('title', `Game: ${game.id}`)
  iframe.style.width = '100%'
  iframe.style.height = '100%'
  
  // ✅ Loading bar overlay
  const loadingOverlay = document.createElement('div')
  loadingOverlay.className = 'game-loading-overlay show'
  loadingOverlay.innerHTML = `
    <div class="game-loading-spinner"></div>
    <div class="game-loading-text">Loading game...</div>
  `
  
  stage.appendChild(iframe)
  stage.appendChild(loadingOverlay)
  
  // ✅ Game ready detection
  setupGameReadyDetection(card, iframe, loadingOverlay)
  
  // Reset game ready state
  card.setAttribute('data-game-ready', 'false')
}

function activateGame(gameId) {
  // Deactivate all games
  document.querySelectorAll('.game-card').forEach(card => {
    card.classList.remove('active')
  })
  
  // Activate Game A
  const cardA = document.getElementById(gameId)
  if (cardA) {
    cardA.classList.add('active')
    cardA.classList.remove('preloaded')
  }
  
  // Set prev/next as preloaded
  const window = currentGameWindow
  if (window.prev) {
    const cardPrev = document.getElementById(window.prev)
    if (cardPrev) {
      cardPrev.classList.add('preloaded')
      cardPrev.classList.remove('active')
    }
  }
  if (window.next) {
    const cardNext = document.getElementById(window.next)
    if (cardNext) {
      cardNext.classList.add('preloaded')
      cardNext.classList.remove('active')
    }
  }
}

// ✅ Option B: Giữ DOM, chỉ xóa iframe
function cleanupGamesOutsideWindow(windowGameIds) {
  const allCards = document.querySelectorAll('.game-card')
  const windowSet = new Set(windowGameIds)
  
  allCards.forEach(card => {
    const gameId = card.id
    if (!windowSet.has(gameId)) {
      // ✅ Option B: Chỉ xóa iframe, giữ DOM
      const stage = card.querySelector('.game-stage')
      if (stage) {
        const iframe = stage.querySelector('iframe')
        if (iframe) {
          iframe.src = '' // Unload iframe
          iframe.remove()
        }
        
        // Remove loading overlay if exists
        const loadingOverlay = stage.querySelector('.game-loading-overlay')
        if (loadingOverlay) {
          loadingOverlay.remove()
        }
      }
      
      // Reset game ready state
      card.setAttribute('data-game-ready', 'false')
      card.classList.remove('active', 'preloaded')
    }
  })
}

// ==========================================
// PHASE 3: Game Ready Detection
// ==========================================

// ✅ Hybrid: PostMessage + iframe.onload + Timeout
function setupGameReadyDetection(card, iframe, loadingOverlay) {
  const gameId = card.id
  let gameReady = false
  let loadingTimeout = null
  let iframeLoadTimeout = null
  
  // ✅ 1. Iframe onload (HTML loaded)
  iframe.onload = () => {
    // Start timeout (1s) - nếu game chưa ready thì vẫn hiện loading bar
    iframeLoadTimeout = setTimeout(() => {
      // Iframe loaded nhưng game chưa ready, keep loading bar
    }, 1000)
  }
  
  // ✅ 2. PostMessage from game (game ready)
  const messageHandler = (e) => {
    // Verify message is from our iframe
    if (e.source !== iframe.contentWindow) return
    
    if (e.data && (e.data.type === 'GAME_READY' || e.data.type === 'PACMAN_GAME_READY' || 
        e.data.type === 'PIXEL_SHOOTER_GAME_READY' || e.data.type === 'ROCKET_BNB_GAME_READY' ||
        e.data.type === 'SPACE_JUMP_GAME_READY' || e.data.type === 'SHOOTER_GAME_READY' ||
        e.data.type === 'MOON_GAME_READY' || e.data.type === 'WALL_BIRD_GAME_READY' ||
        e.data.type === 'FALLEN_CRYPTO_GAME_READY')) {
      gameReady = true
      clearTimeout(loadingTimeout)
      clearTimeout(iframeLoadTimeout)
      hideLoadingBar(card, loadingOverlay)
      card.setAttribute('data-game-ready', 'true')
      window.removeEventListener('message', messageHandler)
    }
  }
  
  window.addEventListener('message', messageHandler)
  
  // ✅ 3. Fallback timeout (nếu game không support PostMessage)
  loadingTimeout = setTimeout(() => {
    if (!gameReady) {
      // Fallback: Ẩn loading bar sau 3s (game có thể đã ready nhưng không gửi PostMessage)
      hideLoadingBar(card, loadingOverlay)
      card.setAttribute('data-game-ready', 'true')
      window.removeEventListener('message', messageHandler)
    }
  }, 3000) // 3s fallback
}

function hideLoadingBar(card, loadingOverlay) {
  if (loadingOverlay && loadingOverlay.classList.contains('show')) {
    loadingOverlay.classList.remove('show')
  }
}

// ==========================================
// PHASE 4: Social Interactions
// ==========================================

// ✅ Helper: Get User ID (đồng bộ với play mode)
function getLocalUserId() {
  let id = localStorage.getItem('mp_user_id')
  if (!id) {
    // Generate UUID
    try {
      const cryptoObj = globalThis.crypto || globalThis.msCrypto
      if (cryptoObj?.randomUUID) {
        id = 'u_' + cryptoObj.randomUUID()
      } else if (cryptoObj?.getRandomValues) {
        const buf = cryptoObj.getRandomValues(new Uint8Array(16))
        buf[6] = (buf[6] & 0x0f) | 0x40
        buf[8] = (buf[8] & 0x3f) | 0x80
        const hex = Array.from(buf, b => b.toString(16).padStart(2, '0')).join('')
        id = `u_${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
      } else {
        id = 'u_' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
      }
    } catch (err) {
      id = 'u_' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
    }
    localStorage.setItem('mp_user_id', id)
  }
  return id
}

function getWalletAddress() {
  return localStorage.getItem('mp_user_wallet') || ''
}

// ✅ TELEGRAM: Get Telegram User ID
// Telegram WebApp cung cấp user.id trong window.Telegram.WebApp.initDataUnsafe.user
function getTelegramUserId() {
  // Kiểm tra xem có đang chạy trong Telegram WebApp không
  if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    const tgUserId = window.Telegram.WebApp.initDataUnsafe.user.id
    // Format: "tg_" + telegram_user_id (ví dụ: "tg_123456789")
    return `tg_${tgUserId}`
  }
  return null
}

// ✅ TELEGRAM: Override getUserId() - Priority: Telegram > Wallet > Local
// Đây là điểm khác biệt duy nhất so với app-v3.js
function getUserId() {
  // Priority 1: Telegram user (nếu đang chạy trong Telegram)
  const tgUserId = getTelegramUserId()
  if (tgUserId) return tgUserId
  
  // Priority 2: Wallet (fallback nếu mở trong browser và có wallet)
  const wallet = getWalletAddress()
  if (wallet) return wallet
  
  // Priority 3: Local anonymous user
  return getLocalUserId()
}

// ✅ Helper: Format functions (đồng bộ với play mode)
function shortAddr(addr) {
  if (!addr) return ''
  return addr.length <= 10 ? addr : addr.slice(0, 6) + '…' + addr.slice(-4)
}

function shortAddrLeaderboard(addr) {
  if (!addr || addr.length <= 10) return addr || 'Anonymous'
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}

function formatScore(score, gameId) {
  const num = Number(score) || 0
  // Format as percentage for games that use % (wojak-btc-blast, blow-bubble games)
  if (gameId === 'wojak-btc-blast' || (gameId && gameId.startsWith('blow-bubble-'))) {
    return num + '%'
  }
  return num.toLocaleString()
}

function buildShareUrl(gameId) {
  if (!gameId) return `${window.location.origin}/`
  return `${window.location.origin}/play.html?game=${encodeURIComponent(gameId)}`
}

// ✅ Initialize social handlers after Game 0 loads
let socialHandlersInitialized = false

function initSocialHandlers() {
  if (socialHandlersInitialized) return
  socialHandlersInitialized = true
  
  const userId = getUserId()
  const supabase = initSupabaseClient()
  
  // Comments overlay state
  const commentsState = {
    gameId: null,
    offset: 0,
    limit: 10,
    loading: false,
    done: false
  }
  
  const commentsOverlay = document.getElementById('commentsOverlay')
  const commentsList = document.getElementById('commentsList')
  const commentsTextarea = document.getElementById('commentsTextarea')
  const commentsPostBtn = document.getElementById('commentsPostBtn')
  const commentsLoadMoreBtn = document.getElementById('commentsLoadMore')
  const commentsCloseBtn = document.getElementById('commentsCloseBtn')
  
  // Share overlay
  const shareOverlay = document.getElementById('shareOverlay')
  const shareCloseBtn = document.getElementById('shareCloseBtn')
  const shareCopyBtn = document.getElementById('shareCopyBtn')
  const shareTelegramBtn = document.getElementById('shareTelegramBtn')
  const shareXBtn = document.getElementById('shareXBtn')
  const shareUrlDisplay = document.getElementById('shareUrlDisplay')
  let currentShareGameId = null
  
  // Leaderboard overlay
  const leaderboardOverlay = document.getElementById('leaderboardOverlay')
  const leaderboardCloseBtn = document.getElementById('leaderboardCloseBtn')
  const leaderboardTabs = leaderboardOverlay ? leaderboardOverlay.querySelectorAll('.leaderboard-tab') : []
  const leaderboardList = document.getElementById('leaderboardList')
  const leaderboardRewardSummary = document.getElementById('leaderboardRewardSummary')
  const leaderboardRewardList = document.getElementById('leaderboardRewardList')
  
  // ✅ Comments: Load more
  async function loadMoreComments() {
    if (commentsState.loading || commentsState.done || !commentsState.gameId) return
    commentsState.loading = true
    try {
      const { data, error } = await supabase.rpc('list_comments', {
        p_game_id: commentsState.gameId,
        p_limit: commentsState.limit,
        p_offset: commentsState.offset
      })
      if (error) throw error
      const rows = Array.isArray(data) ? data : []
      if (rows.length === 0) {
        commentsState.done = true
        return
      }
      rows.forEach(row => {
        const item = document.createElement('div')
        item.className = 'comment-item'
        const meta = document.createElement('div')
        meta.className = 'comment-meta'
        meta.textContent = `${shortAddr(row.user_id)} • ${new Date(row.created_at).toLocaleString()}`
        const text = document.createElement('div')
        text.className = 'comment-text'
        text.textContent = row.text
        item.appendChild(meta)
        item.appendChild(text)
        commentsList.appendChild(item)
      })
      commentsState.offset += rows.length
    } catch (err) {
      console.error('[V3] list_comments error:', err)
    } finally {
      commentsState.loading = false
    }
  }
  
  // ✅ Comments: Open overlay
  async function openCommentsOverlay(gameId) {
    if (!commentsOverlay) return
    commentsState.gameId = gameId
    commentsState.offset = 0
    commentsState.loading = false
    commentsState.done = false
    commentsList.innerHTML = ''
    commentsTextarea.value = ''
    commentsOverlay.classList.add('open')
    await loadMoreComments()
    
    // Update comment count
    try {
      const { data, error } = await supabase.rpc('get_social_counts', { p_game_id: gameId })
      if (!error && data) {
        const card = document.getElementById(gameId)
        if (card) {
          const cmtWrapper = card.querySelector('.icon-wrapper[data-role="comment"]')
          const cmtCountEl = cmtWrapper?.querySelector('.icon-count')
          if (cmtCountEl) {
            cmtCountEl.textContent = String(Math.max(0, data.comments ?? 0))
          }
        }
      }
    } catch (e) {
      console.error('[V3] Error refreshing comment count:', e)
    }
  }
  
  // ✅ Comments: Post comment
  async function postComment() {
    const text = (commentsTextarea.value || '').trim()
    if (!text || !commentsState.gameId) return
    commentsPostBtn.disabled = true
    try {
      const { data, error } = await supabase.rpc('add_comment', {
        p_user_id: userId,
        p_game_id: commentsState.gameId,
        p_text: text
      })
      if (error) throw error
      
      // Add comment to list
      const item = document.createElement('div')
      item.className = 'comment-item'
      const meta = document.createElement('div')
      meta.className = 'comment-meta'
      meta.textContent = `${shortAddr(userId)} • just now`
      const textEl = document.createElement('div')
      textEl.className = 'comment-text'
      textEl.textContent = text
      item.appendChild(meta)
      item.appendChild(textEl)
      commentsList.prepend(item)
      commentsTextarea.value = ''
      commentsState.offset += 1
      commentsState.done = false
      
      // Update comment count
      const card = document.getElementById(commentsState.gameId)
      if (card) {
        const cmtWrapper = card.querySelector('.icon-wrapper[data-role="comment"]')
        const cmtCountEl = cmtWrapper?.querySelector('.icon-count')
        if (cmtCountEl) {
          const currentCount = parseInt(cmtCountEl.textContent) || 0
          cmtCountEl.textContent = String(currentCount + 1)
        }
      }
    } catch (err) {
      console.error('[V3] add_comment error:', err)
    } finally {
      commentsPostBtn.disabled = false
    }
  }
  
  // ✅ Share: Open overlay
  function openShareOverlay(gameId) {
    currentShareGameId = gameId
    shareOverlay?.classList.add('open')
  }
  
  // ✅ Share: Copy URL (với fallback)
  async function copyShareUrl() {
    if (!currentShareGameId) return
    const url = buildShareUrl(currentShareGameId)
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        // Fallback: Use old method
        const textArea = document.createElement('textarea')
        textArea.value = url
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      shareCopyBtn.textContent = 'Copied!'
      shareCopyBtn.classList.add('copied')
      setTimeout(() => {
        shareCopyBtn.textContent = 'Copy Link'
        shareCopyBtn.classList.remove('copied')
      }, 1500)
    } catch (err) {
      console.error('[V3] Copy failed:', err)
      shareCopyBtn.textContent = 'Copy failed'
      shareCopyBtn.classList.remove('copied')
      setTimeout(() => {
        shareCopyBtn.textContent = 'Copy Link'
      }, 1500)
    }
  }
  
  // ✅ Share: Share to Telegram
  function shareToTelegram() {
    if (!currentShareGameId) return
    const url = buildShareUrl(currentShareGameId)
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}`, '_blank')
  }
  
  // ✅ Share: Share to X
  function shareToX() {
    if (!currentShareGameId) return
    const url = buildShareUrl(currentShareGameId)
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`, '_blank')
  }
  
  // ✅ Leaderboard: Set active panel
  function setLeaderboardActivePanel(panel) {
    if (!leaderboardOverlay) return
    const target = panel === 'rewards' ? 'rewards' : 'scores'
    leaderboardOverlay.dataset.activePanel = target
    leaderboardTabs.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.panel === target)
    })
    document.getElementById('leaderboardPanelScores')?.classList.toggle('active', target === 'scores')
    document.getElementById('leaderboardPanelRewards')?.classList.toggle('active', target === 'rewards')
  }
  
  // ✅ Leaderboard: Render rewards panel (load playtime from localStorage)
  function renderRewardsPanel(gameId) {
    if (!leaderboardRewardSummary || !leaderboardRewardList) return
    
    // ✅ Load playtime from localStorage
    const totalSeconds = getGameSeconds(gameId)
    const MAX_ACCUM_SECONDS = 300
    const progress = Math.min(100, (totalSeconds / MAX_ACCUM_SECONDS) * 100)
    
    leaderboardRewardSummary.innerHTML = `
      <div style="font-size:18px;">Total Playtime</div>
      <div class="reward-total">${totalSeconds}s / ${MAX_ACCUM_SECONDS}s</div>
      <div class="leaderboard-reward-progress"><span style="width:${progress}%"></span></div>
      <div style="margin-top:6px;font-size:13px;color:#a9b1c4;">Play more to unlock bonus PLAY rewards</div>
    `
    
    // ✅ Render reward thresholds (simplified - không track awards trong homepage)
    leaderboardRewardList.innerHTML = ''
  }
  
  // ✅ Leaderboard: Open overlay
  async function openLeaderboardOverlay(gameId) {
    if (!leaderboardOverlay || !leaderboardList) return
    leaderboardOverlay.dataset.gameId = gameId
    setLeaderboardActivePanel('scores')
    renderRewardsPanel(gameId)
    leaderboardList.innerHTML = '<div style="padding:24px;text-align:center;color:#bbb;">Loading...</div>'
    leaderboardOverlay.classList.add('open')
    
    try {
      const { data, error } = await supabase.rpc('get_game_leaderboard_with_user', {
        p_game_id: gameId,
        p_user_id: userId,
        p_limit: 100
      })
      if (error) throw error
      
      let result = data
      if (Array.isArray(result)) result = result[0]
      if (!result || typeof result !== 'object') {
        leaderboardList.innerHTML = '<div style="padding:24px;text-align:center;color:#f88;">Leaderboard not available.</div>'
        return
      }
      
      leaderboardList.innerHTML = ''
      let userEntry = null
      if (result.current_user) {
        if (typeof result.current_user === 'string') {
          try { userEntry = result.current_user === 'null' ? null : JSON.parse(result.current_user) } catch { userEntry = null }
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
        leaderboardList.appendChild(userItem)
      }
      
      const divider = document.createElement('div')
      divider.className = 'leaderboard-divider'
      divider.textContent = 'Top 100 Players'
      leaderboardList.appendChild(divider)
      
      let topPlayers = []
      if (Array.isArray(result.top_players)) topPlayers = result.top_players
      else if (typeof result.top_players === 'string') {
        try { topPlayers = JSON.parse(result.top_players) || [] } catch { topPlayers = [] }
      }
      
      if (topPlayers.length === 0) {
        const empty = document.createElement('div')
        empty.style.cssText = 'padding:24px;text-align:center;color:#888;'
        empty.textContent = 'No scores yet. Be the first!'
        leaderboardList.appendChild(empty)
        return
      }
      
      topPlayers.forEach(player => {
        const item = document.createElement('div')
        item.className = 'leaderboard-item'
        if (player.user_id === userId) item.classList.add('user-highlight')
        let rankDisplay = `#${player.rank}`
        if (player.rank === 1) rankDisplay = '🥇'
        else if (player.rank === 2) rankDisplay = '🥈'
        else if (player.rank === 3) rankDisplay = '🥉'
        item.innerHTML = `
          <div class="leaderboard-rank">${rankDisplay}</div>
          <div class="leaderboard-user">${shortAddrLeaderboard(player.user_id)}</div>
          <div class="leaderboard-score">${formatScore(player.best_score, gameId)}</div>
        `
        leaderboardList.appendChild(item)
      })
    } catch (err) {
      console.error('[V3] Leaderboard error:', err)
      leaderboardList.innerHTML = '<div style="padding:24px;text-align:center;color:#f88;">Failed to load leaderboard</div>'
    }
  }
  
  // ✅ Event listeners
  commentsCloseBtn?.addEventListener('click', () => commentsOverlay?.classList.remove('open'))
  commentsOverlay?.addEventListener('click', (event) => {
    if (event.target === commentsOverlay) commentsOverlay.classList.remove('open')
  })
  commentsLoadMoreBtn?.addEventListener('click', loadMoreComments)
  commentsPostBtn?.addEventListener('click', postComment)
  
  shareCloseBtn?.addEventListener('click', () => shareOverlay?.classList.remove('open'))
  shareOverlay?.addEventListener('click', (event) => {
    if (event.target === shareOverlay) shareOverlay.classList.remove('open')
  })
  shareCopyBtn?.addEventListener('click', copyShareUrl)
  shareTelegramBtn?.addEventListener('click', shareToTelegram)
  shareXBtn?.addEventListener('click', shareToX)
  
  leaderboardCloseBtn?.addEventListener('click', () => leaderboardOverlay?.classList.remove('open'))
  leaderboardOverlay?.addEventListener('click', (event) => {
    if (event.target === leaderboardOverlay) leaderboardOverlay.classList.remove('open')
  })
  leaderboardTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel
      if (panel) setLeaderboardActivePanel(panel)
    })
  })
  
  // ✅ Setup handlers for all game cards
  function setupSocialHandlersForCard(card, gameId) {
    if (!card || !gameId) return
    
    const likeWrapper = card.querySelector('.icon-wrapper[data-role="like"]')
    const commentWrapper = card.querySelector('.icon-wrapper[data-role="comment"]')
    const shareWrapper = card.querySelector('.icon-wrapper[data-role="share"]')
    const leaderboardWrapper = card.querySelector('.icon-wrapper[data-role="leaderboard"]')
    
    const likeBtn = likeWrapper?.querySelector('button')
    const commentBtn = commentWrapper?.querySelector('button')
    const shareBtn = shareWrapper?.querySelector('button')
    const leaderboardBtn = leaderboardWrapper?.querySelector('button')
    
    const likeCountEl = likeWrapper?.querySelector('.icon-count')
    const commentCountEl = commentWrapper?.querySelector('.icon-count')
    
    // ✅ Like handler
    if (likeBtn) {
      likeBtn.addEventListener('click', async () => {
        likeBtn.disabled = true
        try {
          const { data, error } = await supabase.rpc('toggle_like', {
            p_user_id: userId,
            p_game_id: gameId
          })
          if (error) throw error
          
          const isLiked = !!(data && (data.is_liked ?? data.liked))
          const totalLikes = (data && (data.total_likes ?? data.likes)) ?? 0
          
          // Update localStorage
          localStorage.setItem('mp_like_' + gameId, isLiked ? '1' : '0')
          
          // Update UI
          likeWrapper.classList.toggle('liked', isLiked)
          likeBtn.setAttribute('aria-pressed', isLiked ? 'true' : 'false')
          
          // Update like count
          if (likeCountEl && totalLikes != null) {
            likeCountEl.textContent = String(Math.max(0, totalLikes))
          }
        } catch (err) {
          console.error('[V3] toggle_like error:', err)
        } finally {
          likeBtn.disabled = false
        }
      })
    }
    
    // ✅ Comment handler
    if (commentBtn) {
      commentBtn.addEventListener('click', () => openCommentsOverlay(gameId))
    }
    
    // ✅ Share handler
    if (shareBtn) {
      shareBtn.addEventListener('click', () => openShareOverlay(gameId))
    }
    
    // ✅ Leaderboard handler
    if (leaderboardBtn) {
      leaderboardBtn.addEventListener('click', () => openLeaderboardOverlay(gameId))
    }
  }
  
  // ✅ Hydrate social counts (includes plays, score, playtime)
  async function hydrateSocialCounts(gameId, card) {
    if (!gameId || !card) return
    try {
      const supabase = initSupabaseClient()
      const userId = getUserId()
      
      // Load all data in parallel
      const [socialRes, playsRes, leaderboardRes] = await Promise.allSettled([
        supabase.rpc('get_social_counts', { p_game_id: gameId }),
        supabase.rpc('get_game_play_count', { p_game_id: gameId }),
        supabase.rpc('get_game_leaderboard_with_user', {
          p_game_id: gameId,
          p_user_id: userId,
          p_limit: 1
        })
      ])
      
      // Update likes/comments counts
      if (socialRes.status === 'fulfilled' && !socialRes.value.error) {
        const data = socialRes.value.data || {}
        const likeWrapper = card.querySelector('.icon-wrapper[data-role="like"]')
        const commentWrapper = card.querySelector('.icon-wrapper[data-role="comment"]')
        const likeCountEl = likeWrapper?.querySelector('.icon-count')
        const commentCountEl = commentWrapper?.querySelector('.icon-count')
        
        if (likeCountEl && typeof data.likes === 'number') {
          likeCountEl.textContent = String(Math.max(0, data.likes))
        }
        if (commentCountEl && typeof data.comments === 'number') {
          commentCountEl.textContent = String(Math.max(0, data.comments))
        }
      }
      
      // ✅ Update plays count in footer
      if (playsRes.status === 'fulfilled' && !playsRes.value.error) {
        const data = playsRes.value.data || {}
        const totalPlays = (data && typeof data.total_plays === 'number') 
          ? Math.max(0, data.total_plays) 
          : 0
        
        const creator = card.querySelector('.creator-text')
        if (creator) {
          let span = creator.querySelector(`[data-plays-count="${gameId}"]`)
          if (!span) {
            creator.appendChild(document.createTextNode(' \u2022 '))
            span = document.createElement('span')
            span.dataset.playsCount = gameId
            creator.appendChild(span)
          }
          span.textContent = `${totalPlays} plays`
          span.style.display = totalPlays > 0 ? 'inline' : 'none'
        }
      }
      
      // Load like state from localStorage
      const localLiked = localStorage.getItem('mp_like_' + gameId) === '1'
      const likeWrapper = card.querySelector('.icon-wrapper[data-role="like"]')
      if (likeWrapper) {
        likeWrapper.classList.toggle('liked', localLiked)
        const likeBtn = likeWrapper.querySelector('button')
        if (likeBtn) {
          likeBtn.setAttribute('aria-pressed', localLiked ? 'true' : 'false')
        }
      }
    } catch (error) {
      console.warn('[V3] hydrateSocialCounts failed:', error)
    }
  }
  
  // ✅ Expose functions globally
  window.__setupSocialHandlersForCard = setupSocialHandlersForCard
  window.__hydrateSocialCounts = hydrateSocialCounts
  window.__openLeaderboardOverlay = openLeaderboardOverlay
  window.__renderRewardsPanel = renderRewardsPanel
}

// ==========================================
// PHASE 4: Game Tracking (Plays, Score, Playtime)
// ==========================================

// ✅ Helper: Get playtime from localStorage
function getGameSeconds(gameId) {
  const key = `mp_game_seconds_${gameId}`
  const raw = localStorage.getItem(key)
  const num = raw == null ? NaN : Number(raw)
  return Number.isFinite(num) ? Math.max(0, Math.trunc(num)) : 0
}

// ✅ Helper: Set game seconds in localStorage
function setGameSeconds(gameId, seconds) {
  const key = `mp_game_seconds_${gameId}`
  localStorage.setItem(key, String(Math.max(0, Math.trunc(seconds))))
}

// ✅ Helper: Get game awards from localStorage
function getGameAwards(gameId) {
  try {
    const raw = localStorage.getItem(`mp_game_awards_${gameId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// ✅ Helper: Set game awards in localStorage
function setGameAwards(gameId, awardsObj) {
  localStorage.setItem(`mp_game_awards_${gameId}`, JSON.stringify(awardsObj || {}))
}

// ✅ Helper: Get/Set int from localStorage
function lsGetInt(key, fallback = 0) {
  const raw = localStorage.getItem(key)
  const num = raw == null ? NaN : Number(raw)
  return Number.isFinite(num) ? num : fallback
}

function lsSetInt(key, value) {
  localStorage.setItem(key, String(Math.max(0, Math.trunc(value))))
}

// ✅ Create confetti animation
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
      y: (canvas.height * 0.5) - 50,
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

// ✅ Show achievement toast
function showAchievementToast(achievementName, count, total, reward) {
  const toast = document.getElementById('achievementToast')
  const nameEl = document.getElementById('achievementName')
  const rewardEl = document.getElementById('achievementReward')
  
  if (!toast) return
  
  // ✅ "10s Play Reward" doesn't show (x/3) because it's not a 1-time achievement
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

// ✅ Setup achievement toast close button
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('achievementToastClose')
  const toast = document.getElementById('achievementToast')
  
  if (closeBtn && toast) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      e.preventDefault()
      if (toast.dataset.autoHideTimeout) {
        clearTimeout(parseInt(toast.dataset.autoHideTimeout))
      }
      toast.classList.remove('show')
    }, { capture: true })
    
    closeBtn.addEventListener('touchend', (e) => {
      e.stopPropagation()
      e.preventDefault()
      if (toast.dataset.autoHideTimeout) {
        clearTimeout(parseInt(toast.dataset.autoHideTimeout))
      }
      toast.classList.remove('show')
    }, { capture: true, passive: false })
  }
})

// ✅ Show PLAY reward (queue để show sau game over)
function showPlayAward(amount, label, isNewAchievement = false) {
  if (!amount || amount <= 0) return
  
  // ✅ Update total earned plays
  const newTotal = lsGetInt('mp_total_earned_plays') + amount
  lsSetInt('mp_total_earned_plays', newTotal)
  
  // ✅ If new achievement, QUEUE to show after game over
  if (isNewAchievement && activeGame) {
    const achievedCount = Object.values(getGameAwards(activeGame)).filter(Boolean).length
    const achievementNames = { 10: '10s Play Reward', 60: 'Engaged', 300: 'Champion' }
    const threshold = parseInt(label.replace('s', ''))
    
    // Add to pending queue (không show ngay)
    if (!pendingAchievements[activeGame]) {
      pendingAchievements[activeGame] = []
    }
    pendingAchievements[activeGame].push({
      name: achievementNames[threshold] || 'Reward',
      count: achievedCount,
      reward: amount,
      threshold
    })
  }
}

// ✅ Show all pending achievements for a game (chỉ sau game over)
function showPendingAchievements(gameId) {
  // SECURITY: Only allow showing achievements after game over
  if (!isGameOver) {
    return
  }
  
  const achievements = pendingAchievements[gameId]
  if (!achievements || achievements.length === 0) {
    return
  }
  
  // Sort by threshold (10 → 60 → 300)
  achievements.sort((a, b) => a.threshold - b.threshold)
  
  // Show each achievement with delay
  achievements.forEach((ach, index) => {
    setTimeout(() => {
      // 1. Fireworks explosion
      createConfetti()
      
      // 2. Toast center
      showAchievementToast(ach.name, ach.count, 3, ach.reward)
    }, index * 2500) // Each achievement 2.5s apart
  })
  
  // Clear queue after showing
  delete pendingAchievements[gameId]
  
  // Reset flag after showing (for next game)
  setTimeout(() => {
    isGameOver = false
  }, achievements.length * 2500 + 1000)
}

// ✅ Start tracking game playtime
function startGame(gameId) {
  if (activeGame && activeGame !== gameId) stopGame()
  clearInterval(progressInterval)
  progressInterval = null
  activeGame = gameId
  activeStartTime = Date.now()
  playCountIncremented = false
  stopGameInProgress = false // ✅ Reset flag when starting new game
  
  const activeCard = document.getElementById(gameId)
  if (activeCard) activeCard.classList.add('is-playing')
  
  // Update progress every 5 seconds (check for threshold rewards)
  progressInterval = setInterval(() => {
    if (!activeGame || !activeStartTime) return
    
    // ✅ Check for threshold rewards during play
    const prevTotal = getGameSeconds(activeGame)
    const sessionSeconds = Math.floor((Date.now() - activeStartTime) / 1000)
    const previewTotal = Math.min(prevTotal + sessionSeconds, MAX_ACCUM_SECONDS)
    
    const awardedMap = getGameAwards(activeGame)
    const crossedNow = []
    for (const t of REWARD_THRESHOLDS) {
      if (prevTotal < t && previewTotal >= t && !awardedMap[t]) {
        awardedMap[t] = true
        crossedNow.push(t)
      }
    }
    if (crossedNow.length) {
      setGameAwards(activeGame, awardedMap)
      let grant = 0
      for (const t of crossedNow) grant += REWARD_VALUES[t]
      if (grant > 0) {
        const last = crossedNow[crossedNow.length - 1]
        // ✅ Queue achievement to show after game over (không show ngay)
        showPlayAward(grant, `${last}s`, true)
      }
    }
  }, 5000)
}

// ✅ Stop tracking game playtime and save data
async function stopGame() {
  // ✅ Prevent double call: if already in progress or no active game, return early
  if (stopGameInProgress || !activeGame || !activeStartTime) return
  
  // ✅ Set flag to prevent concurrent calls
  stopGameInProgress = true
  
  const seconds = Math.floor((Date.now() - activeStartTime) / 1000)
  if (seconds > 0) {
    const supabase = initSupabaseClient()
    const userId = getUserId()
    
    // ✅ Track playtime in localStorage
    const prevTotal = getGameSeconds(activeGame)
    const nextTotalRaw = prevTotal + seconds
    const prevCapped = Math.min(prevTotal, MAX_ACCUM_SECONDS)
    const nextCapped = Math.min(nextTotalRaw, MAX_ACCUM_SECONDS)
    setGameSeconds(activeGame, nextCapped)
    
    // ✅ Check for threshold rewards
    const awardedMap = getGameAwards(activeGame)
    const newlyAwarded = []
    for (const t of REWARD_THRESHOLDS) {
      if (prevCapped < t && nextCapped >= t && !awardedMap[t]) {
        awardedMap[t] = true
        newlyAwarded.push(t)
      }
    }
    if (newlyAwarded.length) {
      setGameAwards(activeGame, awardedMap)
      let grant = 0
      for (const t of newlyAwarded) grant += REWARD_VALUES[t]
      if (grant > 0) {
        const last = newlyAwarded[newlyAwarded.length - 1]
        // ✅ Queue achievement to show after game over (không show ngay)
        showPlayAward(grant, `${last}s`, true)
      }
    }
    
    // ✅ Track playtime in Supabase
    try {
      const { data, error } = await supabase.rpc('track_playtime_and_reward', {
        p_user_id: userId,
        p_game_id: activeGame,
        p_seconds: seconds
      })
      if (error) {
        console.warn('[V3] track_playtime_and_reward error:', error)
      }
    } catch (err) {
      console.error('[V3] track_playtime_and_reward error:', err)
    }
    
    // ✅ Increment play count if eligible (ONLY ONCE per game session)
    if (seconds >= 3 && !playCountIncremented) {
      playCountIncremented = true
      try {
        const { data, error } = await supabase.rpc('increment_play_count', {
          p_user_id: userId,
          p_game_id: activeGame,
          p_seconds: seconds
        })
        if (error) {
          console.warn('[V3] increment_play_count error:', error)
          playCountIncremented = false
        } else {
          const totalPlays = (data && typeof data.total_plays === 'number') ? data.total_plays : undefined
          if (totalPlays != null) {
            // ✅ Update plays count in footer
            const card = document.getElementById(activeGame)
            if (card) {
              const creator = card.querySelector('.creator-text')
              if (creator) {
                let span = creator.querySelector(`[data-plays-count="${activeGame}"]`)
                if (!span) {
                  creator.appendChild(document.createTextNode(' \u2022 '))
                  span = document.createElement('span')
                  span.dataset.playsCount = activeGame
                  creator.appendChild(span)
                }
                span.textContent = `${totalPlays} plays`
                span.style.display = totalPlays > 0 ? 'inline' : 'none'
              }
            }
          }
        }
      } catch (err) {
        console.error('[V3] increment_play_count error:', err)
        playCountIncremented = false
      }
    }
    
    // ✅ Update rewards panel if leaderboard is open
    const leaderboardOverlayEl = document.getElementById('leaderboardOverlay')
    if (leaderboardOverlayEl?.dataset.gameId === activeGame) {
      if (typeof window.__renderRewardsPanel === 'function') {
        window.__renderRewardsPanel(activeGame)
      }
    }
  }
  
  clearInterval(progressInterval)
  progressInterval = null
  const gameId = activeGame
  activeGame = null
  activeStartTime = 0
  
  const activeCard = document.getElementById(gameId)
  if (activeCard) activeCard.classList.remove('is-playing')
  
  // ✅ Reset flag after completion
  stopGameInProgress = false
}

// ✅ Listen for GAME_START, GAME_OVER, and GAME_SCORE messages
window.addEventListener('message', async (event) => {
  // ✅ Handle GAME_START to start timer
  if (event.data?.type === 'GAME_START' && event.data?.gameId) {
    const { gameId } = event.data
    startGame(gameId)
    return
  }
  
  // ✅ Handle GAME_OVER to stop timer
  if (event.data?.type === 'GAME_OVER' && event.data?.gameId) {
    const { gameId } = event.data
    // ✅ Set flag to allow showing achievements
    isGameOver = true
    await stopGame()
    
    // ✅ Show pending achievements after game over
    setTimeout(() => {
      showPendingAchievements(gameId)
    }, 500) // Small delay to ensure game over UI is shown
    
    return
  }
  
  // ✅ Handle GAME_SCORE to submit score and stop timer
  if (event.data?.type === 'GAME_SCORE') {
    const { gameId, score, level } = event.data
    if (!gameId || typeof score !== 'number') return
    
    const finalScore = Math.max(0, Math.trunc(score))
    const supabase = initSupabaseClient()
    const userId = getUserId()
    
    try {
      const payload = {
        p_user_id: userId,
        p_game_id: gameId,
        p_score: finalScore,
        p_level: Number.isFinite(Number(level)) ? Math.max(1, Math.trunc(Number(level))) : 1
      }
      
      const { data, error } = await supabase.rpc('submit_game_score', payload)
      
      if (error) {
        console.error('[V3] Score submission error:', error)
      } else {
        let result = data
        if (Array.isArray(data)) {
          result = data.length > 0 ? data[0] : null
        }
        
        // ✅ Note: Best score được hiển thị ở vị trí khác (không phải footer)
        // Chỉ cần lưu vào Supabase, UI sẽ tự update khi hydrate
      }
    } catch (err) {
      console.error('[V3] Submit score error:', err)
    }
    
    // Stop timer and grant rewards when game ends
    await stopGame()
  }
})

// ==========================================
// Auto-load khi DOM ready
// ==========================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadGame0()
    initSocialHandlers()
    initStatsOverlay()
    initDailyCheckin()
    initReferralOverlay()
    
    // ✅ Detect referral code when app loads
    setTimeout(() => {
      detectReferralCode()
    }, 500) // Wait a bit for Telegram WebApp SDK to initialize
  })
} else {
  loadGame0()
  initSocialHandlers()
  initStatsOverlay()
  initDailyCheckin()
  initReferralOverlay()
  
  // ✅ Detect referral code when app loads
  setTimeout(() => {
    detectReferralCode()
  }, 500) // Wait a bit for Telegram WebApp SDK to initialize
}

// ==========================================
// STATS OVERLAY
// ==========================================
function initStatsOverlay() {
  const overlay = document.getElementById('statsOverlay')
  if (!overlay) return
  
  const closeBtn = document.getElementById('statsCloseBtn')
  const streakEl = document.getElementById('statsStreak')
  const playsEl = document.getElementById('statsPlays')
  
  async function updateStatsOverlay() {
    const userId = getUserId()
    if (!userId) {
      if (streakEl) streakEl.textContent = '0'
      if (playsEl) playsEl.textContent = '0'
      return
    }
    
    const supabase = initSupabaseClient()
    
    // Load streak from daily_checkin RPC
    try {
      const { data: checkinData, error: checkinError } = await supabase.rpc('daily_checkin', { p_user_id: userId })
      if (!checkinError && checkinData && Number.isFinite(checkinData.streak)) {
        const streak = Number(checkinData.streak) || 0
        if (streakEl) streakEl.textContent = String(streak)
        // Update localStorage for consistency
        lsSetInt('mp_streak_count', streak)
      } else {
        // Fallback to localStorage
        const streak = lsGetInt('mp_streak_count', 0)
        if (streakEl) streakEl.textContent = String(streak)
      }
    } catch (err) {
      console.warn('[V3] Failed to load streak:', err)
      const streak = lsGetInt('mp_streak_count', 0)
      if (streakEl) streakEl.textContent = String(streak)
    }
    
    // Load Play Points: localStorage (playtime) + telegram_referral_rewards (referral)
    try {
      let totalPoints = 0
      let playtimeRewards = 0
      let referralRewards = 0
      let referredRewards = 0
      
      // 1. Get playtime rewards from localStorage (bảng game_playtime không tồn tại)
      playtimeRewards = lsGetInt('mp_total_earned_plays', 0)
      totalPoints += playtimeRewards
      console.log('[Stats] Playtime rewards (localStorage):', playtimeRewards)
      
      // 2. Query referral rewards from telegram_referral_rewards table (as referrer)
      if (userId && userId.startsWith('tg_')) {
        const { data: referralData, error: referralError } = await supabase
          .from('telegram_referral_rewards')
          .select('commission_earned')
          .eq('referrer_id', userId)
        
        if (!referralError && Array.isArray(referralData)) {
          referralRewards = referralData.reduce((sum, row) => sum + (Number(row.commission_earned) || 0), 0)
          totalPoints += referralRewards
          console.log('[Stats] Referral rewards (as referrer):', referralRewards, 'from', referralData.length, 'records')
        } else if (referralError) {
          console.warn('[Stats] Referral query error:', referralError)
        }
      }
      
      // 3. Query referral rewards as referred user (when user joins via referral link)
      if (userId && userId.startsWith('tg_')) {
        const { data: referredData, error: referredError } = await supabase
          .from('telegram_referral_rewards')
          .select('reward_amount')
          .eq('referred_id', userId)
        
        if (!referredError && Array.isArray(referredData)) {
          referredRewards = referredData.reduce((sum, row) => sum + (Number(row.reward_amount) || 0), 0)
          totalPoints += referredRewards
          console.log('[Stats] Referral rewards (as referred):', referredRewards, 'from', referredData.length, 'records')
        } else if (referredError) {
          console.warn('[Stats] Referred query error:', referredError)
        }
      }
      
      console.log('[Stats] Total Play Points:', totalPoints, '(playtime:', playtimeRewards, '+ referral:', referralRewards, '+ referred:', referredRewards, ')')
      
      // Update UI and localStorage (sync total)
      if (playsEl) playsEl.textContent = String(totalPoints)
      // Sync total to localStorage để đồng bộ với referral overlay
      lsSetInt('mp_total_earned_plays', totalPoints)
      console.log('[Stats] Updated UI with total:', totalPoints)
    } catch (err) {
      console.warn('[Stats] Failed to load Play Points:', err)
      // Fallback to localStorage if query fails
      const plays = lsGetInt('mp_total_earned_plays', 0)
      if (playsEl) playsEl.textContent = String(plays)
    }
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
    if (event.key === 'Escape' && overlay.classList.contains('open')) {
      closeStatsOverlay()
    }
  })
  
  window.__openStatsOverlay = openStatsOverlay
  window.__updateStatsOverlay = updateStatsOverlay
}

// ==========================================
// DAILY CHECK-IN
// ==========================================

// Show daily check-in toast with stats
function showDailyCheckInToast(streak, reward, totalDays = null) {
  // Remove old toast if exists
  const oldToast = document.querySelector('.daily-checkin-toast')
  if (oldToast) oldToast.remove()
  
  // Create toast element
  const toast = document.createElement('div')
  toast.className = 'daily-checkin-toast'
  
  // Build stats HTML
  let statsHTML = `
    <div class="daily-checkin-stat">
      <span class="daily-checkin-stat-value">${streak}</span>
      <span class="daily-checkin-stat-label">🔥 Day Streak</span>
    </div>
  `
  
  // Add total days if available
  if (totalDays && totalDays > 0) {
    statsHTML += `
      <div class="daily-checkin-stat">
        <span class="daily-checkin-stat-value">${totalDays}</span>
        <span class="daily-checkin-stat-label">📅 Total Days</span>
      </div>
    `
  }
  
  toast.innerHTML = `
    <div class="daily-checkin-icon">🎁</div>
    <div class="daily-checkin-title">Daily Check-in!</div>
    <div class="daily-checkin-stats">
      ${statsHTML}
    </div>
    <div class="daily-checkin-reward">+${reward} PLAY</div>
  `
  
  document.body.appendChild(toast)
  
  // Show toast
  setTimeout(() => toast.classList.add('show'), 100)
  
  // Hide after 5 seconds
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => {
      toast.remove()
    }, 500)
  }, 5000)
}

function initDailyCheckin() {
  function todayKey() {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  }
  
  function hasCheckedInToday() {
    return localStorage.getItem('mp_checkin_' + todayKey()) === '1'
  }
  
  function markCheckedInToday() {
    localStorage.setItem('mp_checkin_' + todayKey(), '1')
  }
  
  async function dailyCheckin() {
    const userId = getUserId()
    if (!userId) return
    
    const supabase = initSupabaseClient()
    try {
      const { data, error } = await supabase.rpc('daily_checkin', { p_user_id: userId })
      if (error) {
        console.warn('[V3] Daily check-in error:', error.message)
        return
      }
      
      if (data?.awarded > 0) {
        const streak = Number(data.streak) || 1
        const totalDays = Number(data.total_days) || null // If backend provides it
        const awarded = Number(data.awarded)
        
        // ✅ Cộng điểm vào PLAY points
        const newTotal = lsGetInt('mp_total_earned_plays', 0) + awarded
        lsSetInt('mp_total_earned_plays', newTotal)
        
        // Show daily check-in toast
        showDailyCheckInToast(streak, awarded, totalDays)
        // Update localStorage
        lsSetInt('mp_streak_count', streak)
        markCheckedInToday()
        
        // Update stats overlay if open
        if (typeof window.__updateStatsOverlay === 'function') {
          window.__updateStatsOverlay()
        }
      } else if (Number.isFinite(data?.streak)) {
        lsSetInt('mp_streak_count', Number(data.streak))
      }
    } catch (err) {
      console.warn('[V3] Daily check-in failed:', err)
    }
  }
  
  // Only run on first load if not already checked in today
  if (!hasCheckedInToday()) {
    dailyCheckin()
  }
}

// ==========================================
// REFERRAL SYSTEM
// ==========================================

// ✅ Show referral welcome popup
function showReferralWelcomePopup(referralCode) {
  // Check if already shown (avoid duplicate)
  if (localStorage.getItem('mp_referral_popup_shown') === 'true') {
    return
  }
  
  // Create popup element
  const popup = document.createElement('div')
  popup.className = 'referral-welcome-popup'
  popup.innerHTML = `
    <div class="referral-welcome-content">
      <div class="referral-welcome-icon">🎁</div>
      <div class="referral-welcome-title">Welcome Bonus!</div>
      <div class="referral-welcome-text">
        <div>✅ You'll receive: 2000 PLAYS</div>
        <div>✅ Your friend will receive: 2000 PLAYS</div>
      </div>
      <button class="referral-welcome-btn" data-referral-code="${referralCode}">Join to claim!</button>
    </div>
  `
  
  // Add styles
  popup.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
  `
  
  const content = popup.querySelector('.referral-welcome-content')
  content.style.cssText = `
    background: #1a1a2e;
    border: 2px solid #ffb642;
    border-radius: 20px;
    padding: 32px;
    text-align: center;
    max-width: 320px;
    width: 90%;
    animation: slideUp 0.3s ease;
  `
  
  const icon = popup.querySelector('.referral-welcome-icon')
  icon.style.cssText = `font-size: 64px; margin-bottom: 16px;`
  
  const title = popup.querySelector('.referral-welcome-title')
  title.style.cssText = `
    font-size: 24px;
    font-weight: 700;
    color: #ffb642;
    margin-bottom: 20px;
  `
  
  const text = popup.querySelector('.referral-welcome-text')
  text.style.cssText = `
    color: #fff;
    font-size: 16px;
    line-height: 1.8;
    margin-bottom: 24px;
  `
  
  const btn = popup.querySelector('.referral-welcome-btn')
  btn.style.cssText = `
    background: #ffb642;
    color: #000;
    border: none;
    border-radius: 12px;
    padding: 16px 32px;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    width: 100%;
    transition: transform 0.2s ease, background 0.2s ease;
  `
  
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.05)'
    btn.style.background = '#ffce7a'
  })
  
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)'
    btn.style.background = '#ffb642'
  })
  
  // Add CSS animations
  if (!document.getElementById('referral-popup-styles')) {
    const style = document.createElement('style')
    style.id = 'referral-popup-styles'
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `
    document.head.appendChild(style)
  }
  
  document.body.appendChild(popup)
  
  // Handle button click
  btn.addEventListener('click', async () => {
    const code = btn.dataset.referralCode
    if (code) {
      await processReferralJoin(code)
    }
    popup.remove()
    localStorage.setItem('mp_referral_popup_shown', 'true')
  })
}

// ✅ Process referral when user clicks "Join to claim!"
async function processReferralJoin(referralCode) {
  const userId = getUserId()
  const supabase = initSupabaseClient()
  
  // Validate: chỉ Telegram users
  if (!userId || !userId.startsWith('tg_')) {
    console.warn('[Referral] Only Telegram users can use referral system')
    return
  }
  
  try {
    // Call RPC: process_referral
    const { data, error } = await supabase.rpc('process_referral', {
      p_referred_id: userId,
      p_referral_code: referralCode
    })
    
    if (error) {
      console.error('[Referral] Process error:', error)
      // Show error toast if needed
      return
    }
    
    if (data && data.success) {
      // Mark referral code as processed
      localStorage.setItem(`mp_referral_processed_${referralCode}`, 'true')
      
      // Grant reward to user (update localStorage)
      const currentPlays = parseInt(localStorage.getItem('mp_total_earned_plays') || '0', 10)
      const newPlays = currentPlays + 2000
      localStorage.setItem('mp_total_earned_plays', newPlays.toString())
      
      // Show success toast
      showReferralRewardToast(2000)
      
      // Update stats overlay if open
      if (typeof window.__updateStatsOverlay === 'function') {
        window.__updateStatsOverlay()
      }
      
      // Update referral overlay if open
      if (typeof window.__updateReferralOverlay === 'function') {
        window.__updateReferralOverlay()
      }
    }
  } catch (err) {
    console.error('[Referral] Process exception:', err)
  }
}

// ✅ Show referral reward toast
function showReferralRewardToast(reward) {
  // Use existing achievement toast if available
  const toast = document.getElementById('achievementToast')
  const nameEl = document.getElementById('achievementName')
  const rewardEl = document.getElementById('achievementReward')
  
  if (toast && nameEl && rewardEl) {
    nameEl.textContent = '🎉 Referral Bonus!'
    rewardEl.textContent = `+${reward} PLAYS`
    toast.classList.add('show')
    
    const autoHideTimeout = setTimeout(() => {
      toast.classList.remove('show')
    }, 5000)
    
    toast.dataset.autoHideTimeout = autoHideTimeout
    return
  }
  
  // Fallback: create simple toast
  const fallbackToast = document.createElement('div')
  fallbackToast.className = 'referral-reward-toast'
  fallbackToast.textContent = `🎉 +${reward} PLAYS`
  fallbackToast.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #ffb642;
    color: #000;
    padding: 16px 24px;
    border-radius: 12px;
    font-size: 18px;
    font-weight: 700;
    z-index: 10001;
    animation: slideDown 0.3s ease;
  `
  
  if (!document.getElementById('referral-toast-styles')) {
    const style = document.createElement('style')
    style.id = 'referral-toast-styles'
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    `
    document.head.appendChild(style)
  }
  
  document.body.appendChild(fallbackToast)
  
  setTimeout(() => {
    fallbackToast.style.opacity = '0'
    setTimeout(() => fallbackToast.remove(), 300)
  }, 3000)
}

// ✅ Detect start parameter when Mini App loads
function detectReferralCode() {
  // Method 1: Check Telegram WebApp start_param
  if (window.Telegram?.WebApp?.initDataUnsafe?.start_param) {
    const code = window.Telegram.WebApp.initDataUnsafe.start_param
    if (code) {
      // Check if already processed
      const processed = localStorage.getItem(`mp_referral_processed_${code}`)
      if (!processed) {
        showReferralWelcomePopup(code)
      }
      return code
    }
  }
  
  // Method 2: Check URL parameter
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('start')
  if (code) {
    const processed = localStorage.getItem(`mp_referral_processed_${code}`)
    if (!processed) {
      showReferralWelcomePopup(code)
    }
    return code
  }
  
  return null
}

// ✅ Get or create referral code
async function getOrCreateReferralCode() {
  const userId = getUserId()
  const supabase = initSupabaseClient()
  
  // Validate: chỉ Telegram users
  if (!userId || !userId.startsWith('tg_')) {
    console.warn('[Referral] Only Telegram users can use referral system')
    return null
  }
  
  try {
    const { data, error } = await supabase.rpc('get_or_create_referral_code', {
      p_user_id: userId
    })
    
    if (error) {
      console.error('[Referral] Get code error:', error)
      return null
    }
    
    return data
  } catch (err) {
    console.error('[Referral] Get code exception:', err)
    return null
  }
}

// ✅ Get referral stats
async function getReferralStats() {
  const userId = getUserId()
  const supabase = initSupabaseClient()
  
  // Validate: chỉ Telegram users
  if (!userId || !userId.startsWith('tg_')) {
    return null
  }
  
  try {
    const { data, error } = await supabase.rpc('get_referral_stats', {
      p_user_id: userId
    })
    
    if (error) {
      console.error('[Referral] Get stats error:', error)
      return null
    }
    
    return data
  } catch (err) {
    console.error('[Referral] Get stats exception:', err)
    return null
  }
}

// ✅ Update referral overlay with stats
async function updateReferralOverlay() {
  console.log('[Referral] updateReferralOverlay called')
  const overlay = document.getElementById('referralOverlay')
  if (!overlay) {
    console.warn('[Referral] Overlay not found')
    return
  }
  
  // Update overlay content - ALWAYS show new UI, even if stats is null
  const content = overlay.querySelector('.referral-content')
  if (!content) {
    console.warn('[Referral] Content element not found')
    return
  }
  
  console.log('[Referral] Getting stats...')
  const stats = await getReferralStats()
  console.log('[Referral] Stats received:', stats)
  
  // Use stats if available, otherwise use default/placeholder values
  let referralCode = 'Loading...'
  let friendsReferred = 0
  let totalRewards = 0
  
  if (stats) {
    referralCode = stats.referral_code || 'Loading...'
    friendsReferred = stats.friends_referred || 0
    totalRewards = stats.total_rewards || 0
  } else {
    // If stats is null, try to get/create referral code directly
    console.log('[Referral] Stats null, trying to get referral code...')
    const userId = getUserId()
    if (userId && userId.startsWith('tg_')) {
      const code = await getOrCreateReferralCode()
      if (code) {
        referralCode = code
      }
    }
  }
  
  const referralLink = referralCode !== 'Loading...' 
    ? `https://t.me/memeplay_bot?start=${referralCode}`
    : 'Loading...'
  
  // Always update HTML with new UI
  content.innerHTML = `
    <div class="referral-stats-section">
      <div class="referral-stat-card">
        <div class="referral-stat-label">Your Referral Link</div>
        <div class="referral-stat-value link-value">${referralLink}</div>
        ${referralLink !== 'Loading...' ? `<button class="referral-copy-btn" data-copy="${referralLink}">Copy Link</button>` : ''}
      </div>
      
      <div class="referral-stats-grid">
        <div class="referral-stat-item">
          <div class="referral-stat-number">${friendsReferred}</div>
          <div class="referral-stat-text">Friends Referred</div>
        </div>
        <div class="referral-stat-item">
          <div class="referral-stat-number">${totalRewards.toLocaleString()}</div>
          <div class="referral-stat-text">Total Rewards (PLAY)</div>
        </div>
      </div>
    </div>
  `
  
  // Add copy button handlers
  const copyButtons = content.querySelectorAll('.referral-copy-btn')
  copyButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy
      if (text) {
        try {
          await navigator.clipboard.writeText(text)
          const originalText = btn.textContent
          btn.textContent = '✓ Copied!'
          setTimeout(() => {
            btn.textContent = originalText
          }, 2000)
        } catch (err) {
          console.error('Copy failed:', err)
        }
      }
    })
  })
  
  // If stats was null, try to refresh after a short delay
  if (!stats) {
    setTimeout(async () => {
      const refreshedStats = await getReferralStats()
      if (refreshedStats) {
        updateReferralOverlay() // Recursive call to update with real data
      }
    }, 1000)
  }
}

function initReferralOverlay() {
  const overlay = document.getElementById('referralOverlay')
  if (!overlay) return
  
  const closeBtn = document.getElementById('referralCloseBtn')
  
  function openReferralOverlay() {
    updateReferralOverlay()
    overlay.classList.add('open')
  }
  
  function closeReferralOverlay() {
    overlay.classList.remove('open')
  }
  
  closeBtn?.addEventListener('click', closeReferralOverlay)
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeReferralOverlay()
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay.classList.contains('open')) {
      closeReferralOverlay()
    }
  })
  
  window.__openReferralOverlay = openReferralOverlay
  window.__updateReferralOverlay = updateReferralOverlay
}

