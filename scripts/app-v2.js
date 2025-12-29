/**
 * Homepage V2 - Optimized Game Listing
 * 
 * Features:
 * - Priority game loading (?game=xxx)
 * - Optimistic localStorage loading
 * - Supabase background sync
 * - Batch loading (3 games per batch)
 * - Sort by likes (descending)
 * - PostMessage config for templates
 * - Social features (like, comment, share, leaderboard)
 * - Daily check-in
 * - Search/Filter (Recommended, Liked)
 * - Loading progress bar
 * - Realtime sync
 * - Focus mode
 * - Confetti animation
 */

// ==========================================
// 1. IMPORTS & INITIALIZATION
// ==========================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { 
  TEMPLATE_REGISTRY,
  getTemplateConfig,
  getEnabledTemplates,
  getTemplateUrl
} from '../games/templates-v2/core/template-registry.js'
import { getJSON } from '../games/templates-v2/core/storage-manager.js'

// ✅ Guard: Prevent double initialization
if (window.__MEMEPLAY_V2_INITIALIZED__) {
  console.warn('[V2] ⚠️ Initialization skipped (already initialized)')
  throw new Error('V2 App already initialized')
}
window.__MEMEPLAY_V2_INITIALIZED__ = true

// Supabase configuration
const SUPABASE_URL = 'https://iikckrcdrvnqctzacxgx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpa2NrcmNkcnZucWN0emFjeGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Mzc3NDgsImV4cCI6MjA3NzMxMzc0OH0.nIPvf11YfFlWH0XHDZdxI496zaP431QOJCuQ-5XX4DQ'

// ✅ Create Supabase client WITH Realtime enabled (for V2)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    headers: {},
    fetch: (url, options = {}) => fetch(url, options)
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
})

// ==========================================
// 2. GLOBAL STATE
// ==========================================

// userId will be set in initWalletHandlers() - prefer wallet address if connected
let userId = ''
let currentFilter = 'Recommended' // 'Recommended', 'Liked', 'Trending', 'Popular'
let allGames = [] // All loaded games
let renderedGames = [] // Games currently rendered in DOM
let renderedCount = 0 // Count of rendered games
let scrollObserver = null // IntersectionObserver for batch loading
let isScrolling = false // Flag to prevent Observer during scroll
let scrollTimeout = null // Debounce timeout
let activeGame = null // Currently active game ID
let userInitiatedScroll = false // ✅ PHƯƠNG ÁN 2: Flag to track user-initiated scroll vs auto-activation
let currentGroupIndex = -1 // ✅ GROUP LOGIC: Track nhóm đang active (0 = [0,1,2], 1 = [3,4,5], ...)

let isRenderingBatch = false // ✅ OPTION A: Flag to track if batch is being rendered
let activeStartTime = 0 // Start time for playtime tracking
let progressInterval = null // Interval for playtime tracking
let playCountIncremented = false // Flag to prevent double increment
let realtimeChannel = null // Realtime subscription channel
let initStartTime = 0 // Track initialization start time
let shouldShowLoadingBar = false // Flag to show loading bar only if > 300ms
let socialCountsObserver = null // ✅ IntersectionObserver cho lazy load social counts

// Game states
const GAME_STATES = Object.freeze({
  HIDDEN: 'hidden',
  WAITING: 'waiting',
  ACTIVE: 'active'
})
const gameStateStore = new Map()

// Batch loading config
const BATCH_SIZE = 3

// ==========================================
// 3. UTILITY FUNCTIONS
// ==========================================

function lsGetInt(key, fallback = 0) {
  const raw = localStorage.getItem(key)
  const num = raw == null ? NaN : Number(raw)
  return Number.isFinite(num) ? num : fallback
}

function lsSetInt(key, value) {
  localStorage.setItem(key, String(value))
}

function shortAddr10(addr) {
  if (!addr) return ''
  return addr.slice(0, 6) + '…' + addr.slice(-3)
}

function updateLoadingProgress(current, total) {
  const progress = Math.round((current / total) * 100)
  const container = document.getElementById('loadingProgressContainer')
  const bar = document.getElementById('loadingProgressBar')
  const text = document.getElementById('loadingProgressText')
  
  if (container && bar && text) {
    // ✅ OPTIMIZED: Không hiển thị loading bar cho game 0 (đã ẩn ngay từ đầu)
    // Check nếu loading bar đã bị ẩn (cho game 0) → không update
    if (container.style.display === 'none') {
      return // Đã ẩn rồi, không cần update
    }
    
    // Check if we should show loading bar (> 300ms)
    const elapsed = Date.now() - initStartTime
    if (elapsed > 300) {
      shouldShowLoadingBar = true
    }
    
    if (progress > 0 && progress < 100) {
      if (shouldShowLoadingBar) {
        container.classList.add('show')
      }
    } else if (progress >= 100) {
      if (shouldShowLoadingBar) {
        setTimeout(() => {
          container.classList.remove('show')
        }, 300)
      }
    }
    bar.style.width = `${progress}%`
    text.textContent = `${progress}%`
  }
}

// ==========================================
// 4. GAME LOADING FUNCTIONS
// ==========================================

/**
 * Load priority game from URL parameter (?game=xxx)
 */
async function loadPriorityGame(gameId) {
  if (!gameId || !gameId.startsWith('playmode-')) return null
  
  updateLoadingProgress(10, 100)
  
  try {
    // Try localStorage first
    const enabledTemplates = Object.keys(TEMPLATE_REGISTRY)
      .filter(id => TEMPLATE_REGISTRY[id].enabled !== false)
    
    for (const templateId of enabledTemplates) {
      const config = getTemplateConfig(templateId)
      const prefix = config.storagePrefix
      const storageKey = `${prefix}${gameId}`
      const gameData = getJSON(storageKey)
      
      if (gameData) {
        return {
          gameId,
          templateId,
          templateUrl: gameData.templateUrl || config.templateUrl,
          title: gameData.title || 'Untitled',
          fragmentLogoUrl: gameData.fragmentLogoUrl || '',
          stories: gameData.stories || [],
          mapColor: gameData.mapColor || '#1A0A2E',
          mapIndex: gameData.mapIndex || 0,
          source: 'localStorage'
        }
      }
    }
    
    // Try Supabase
    const normalizedTemplateId = gameId.replace('playmode-', '').split('-')[0]
    const supabaseTemplateId = normalizedTemplateId.includes('-template')
      ? normalizedTemplateId
      : `${normalizedTemplateId}-template`
    
    const { data, error } = await supabase.rpc('get_user_created_games', {
      p_template_id: supabaseTemplateId,
      p_game_id: gameId
    })
    
    if (error) {
      console.warn(`[V2] Priority game RPC error:`, error.message)
      return null
    }
    
    if (data && data.length > 0) {
      const item = data[0]
      const config = getTemplateConfig(normalizedTemplateId)
      
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
      
      return {
        gameId,
        templateId: normalizedTemplateId,
        templateUrl: item.template_url || config.templateUrl,
        title: item.title || 'Untitled',
        fragmentLogoUrl: item.fragment_logo_url || '',
        stories: stories.filter(s => s.trim()),
        mapColor: item.map_color || '#1A0A2E',
        mapIndex: item.map_index || 0,
        likes: item.likes_count ?? 0,
        comments: item.comments_count ?? 0,
        plays: item.plays_count ?? 0,
        creatorId: item.creator_id || '',
        creatorName: item.creator_name || 'Creator',
        source: 'supabase'
      }
    }
    
    return null
  } catch (error) {
    console.error(`[V2] Error loading priority game:`, error)
    return null
  }
}

/**
 * Load games from localStorage (optimistic load)
 */
function loadLocalStorageV2Games() {
  const games = []
  const startTime = performance.now()
  
  const enabledTemplates = Object.keys(TEMPLATE_REGISTRY)
    .filter(id => TEMPLATE_REGISTRY[id].enabled !== false)
  
  // Detect production
  const isProduction = 
    !window.location.origin.includes('localhost') &&
    !window.location.origin.includes('127.0.0.1') &&
    !window.location.origin.includes('192.168.')
  
  // Scan localStorage for each template
  for (const templateId of enabledTemplates) {
    const config = getTemplateConfig(templateId)
    const prefix = config.storagePrefix
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) {
        const gameId = key.replace(prefix, '')
        
        // ✅ Filter: Only V2 format (playmode-*)
        if (gameId.startsWith('playmode-')) {
          const gameData = getJSON(key)
          if (gameData) {
            const templateUrl = gameData.templateUrl || config.templateUrl
            
            // ✅ Filter localhost games trên production
            if (isProduction) {
              const isLocalhost = 
                templateUrl.includes('localhost') ||
                templateUrl.includes('127.0.0.1') ||
                templateUrl.includes('192.168.') ||
                templateUrl.includes('0.0.0.0')
              
              if (isLocalhost) {
                console.warn(`[V2] Removed localhost game: ${gameId}`)
                continue
              }
            }
            
            games.push({
              gameId,
              templateId,
              templateUrl,
              title: gameData.title || 'Untitled',
              fragmentLogoUrl: gameData.fragmentLogoUrl || '',
              stories: gameData.stories || [],
              mapColor: gameData.mapColor || '#1A0A2E',
              mapIndex: gameData.mapIndex || 0,
              source: 'localStorage'
            })
          }
        }
      }
    }
  }
  
  const loadTime = performance.now() - startTime
  
  return games
}

/**
 * Load games from Supabase (background load)
 * ✅ OPTIMIZED: Sort by likes ngay sau khi load (dùng likes_count có sẵn)
 */
async function loadSupabaseV2Games() {
  const enabledTemplates = Object.keys(TEMPLATE_REGISTRY)
    .filter(id => TEMPLATE_REGISTRY[id].enabled !== false)
  
  const allGames = []
  
  // Fetch games for each template (parallel)
  const promises = enabledTemplates.map(async (templateId) => {
    const config = getTemplateConfig(templateId)
    
    // Normalize template ID for Supabase
    const supabaseTemplateId = templateId.includes('-template')
      ? templateId
      : `${templateId}-template`
    
    try {
      const { data, error } = await supabase.rpc('list_user_created_games', {
        p_template_id: supabaseTemplateId
      })
      
      if (error) {
        // ✅ Error Handling: Graceful fallback (silent)
        console.warn(`[V2] RPC error for ${templateId}:`, error.message)
        return []
      }
      
      if (!Array.isArray(data) || data.length === 0) {
        return []
      }
      
      // ✅ DEBUG: Log first game để kiểm tra fields có sẵn
      if (data.length > 0) {
        console.log(`[V2] 🔍 Sample Supabase response fields for ${templateId}:`, Object.keys(data[0]))
        console.log(`[V2] 🔍 Sample game likes_count:`, data[0]?.likes_count, 'likes:', data[0]?.likes)
      }
      
      // Filter: Only V2 format (playmode-*)
      const v2Games = data
        .filter(item => {
          const gameId = item?.game_id || item?.id
          return gameId?.startsWith('playmode-')
        })
        .map(item => {
          const gameId = item.game_id || item.id
          
          // Normalize stories
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
          
          // Legacy stories (story_one, story_two, story_three)
          const legacyStories = [
            item.story_one,
            item.story_two,
            item.story_three
          ].filter(s => typeof s === 'string' && s.trim())
          
          if (legacyStories.length > 0) {
            stories = [...stories, ...legacyStories]
          }
          
          return {
            gameId,
            templateId,
            templateUrl: item.template_url || config.templateUrl,
            publicUrl: item.public_url || `/play-v2.html?game=${gameId}`,
            title: item.title || 'Untitled',
            fragmentLogoUrl: item.fragment_logo_url || '',
            stories: stories.filter(s => s.trim()),
            mapColor: item.map_color || '#1A0A2E',
            mapIndex: item.map_index || 0,
            likes: item.likes_count ?? item.likes ?? 0,
            comments: item.comments_count ?? item.comments ?? 0,
            plays: item.plays_count ?? item.plays ?? 0,
            creatorId: item.creator_id || '',
            creatorName: item.creator_name || 'Creator',
            source: 'supabase'
          }
        })
      
      return v2Games
    } catch (error) {
      // ✅ Error Handling: Graceful fallback (silent)
      console.error(`[V2] Error loading ${templateId}:`, error)
      return []
    }
  })
  
  const results = await Promise.all(promises)
  const flatGames = results.flat()
  
  // ✅ OPTIMIZED: Chỉ fetch likes cho games không có likes_count hoặc likes_count = 0
  // Games đã có likes_count > 0 từ Supabase → dùng luôn, không cần fetch
  const gamesNeedingFetch = flatGames.filter(game => !game.likes || game.likes === 0)
  const gamesWithLikes = [...flatGames] // Start with all games
  
  if (gamesNeedingFetch.length > 0) {
    console.log(`[V2] 📊 Fetching likes for ${gamesNeedingFetch.length} games (${flatGames.length - gamesNeedingFetch.length} games already have likes)`)
    
    // Fetch likes chỉ cho games cần fetch
    const fetchedLikes = await Promise.all(
      gamesNeedingFetch.map(async (game) => {
        try {
          const { data, error } = await supabase.rpc('get_social_counts', {
            p_game_id: game.gameId
          })
          if (error) {
            console.warn(`[V2] Failed to get likes for ${game.gameId}:`, error.message)
            return { gameId: game.gameId, likes: 0 }
          }
          return { gameId: game.gameId, likes: data?.likes || 0 }
        } catch (e) {
          console.warn(`[V2] Error getting likes for ${game.gameId}:`, e)
          return { gameId: game.gameId, likes: 0 }
        }
      })
    )
    
    // Update likes cho games vừa fetch
    const likesMap = new Map(fetchedLikes.map(item => [item.gameId, item.likes]))
    gamesWithLikes.forEach(game => {
      if (likesMap.has(game.gameId)) {
        game.likes = likesMap.get(game.gameId)
      }
    })
  } else {
    console.log(`[V2] ✅ All ${flatGames.length} games already have likes from Supabase`)
  }
  
  // ✅ Sort by likes (descending: highest likes first)
  const sortedGames = gamesWithLikes.sort((a, b) => {
    const aLikes = Number(a.likes) || 0
    const bLikes = Number(b.likes) || 0
    return bLikes - aLikes // Descending: highest likes first
  })
  
  // ✅ DEBUG: Log top 5 games với likes để verify
  const top5 = sortedGames.slice(0, 5).map((g, idx) => `${idx + 1}. ${g.gameId} (${g.likes || 0} likes)`)
  console.log(`[V2] ✅ Loaded and sorted ${sortedGames.length} games from Supabase by likes (top 5):`, top5.join(', '))
  
  return sortedGames
}

/**
 * Merge localStorage and Supabase games (Supabase overrides localStorage)
 * ✅ OPTIMIZED: Giữ thứ tự sort từ Supabase
 */
function mergeGames(localGames, supabaseGames) {
  const gameMap = new Map()
  const supabaseGameIds = new Set(supabaseGames.map(g => g.gameId))
  
  // 1. Add Supabase games first (đã được sort by likes)
  supabaseGames.forEach(game => {
    if (game.gameId && game.gameId.startsWith('playmode-')) {
      gameMap.set(game.gameId, game)
    }
  })
  
  // 2. Add localStorage games (chỉ những games không có trong Supabase)
  localGames.forEach(game => {
    if (game.gameId && game.gameId.startsWith('playmode-')) {
      // Chỉ thêm nếu không có trong Supabase
      if (!supabaseGameIds.has(game.gameId)) {
        gameMap.set(game.gameId, game)
      }
    }
  })
  
  // ✅ FIX: Giữ thứ tự sort từ Supabase, sau đó thêm localStorage games
  // Tạo array từ Supabase games (giữ thứ tự) + localStorage games
  const mergedGames = [...supabaseGames]
  
  // Thêm localStorage games (chỉ những games không có trong Supabase)
  localGames.forEach(game => {
    if (game.gameId && game.gameId.startsWith('playmode-')) {
      if (!supabaseGameIds.has(game.gameId)) {
        mergedGames.push(game)
      }
    }
  })
  
  return mergedGames
}

/**
 * Sort games by likes (descending)
 */
async function sortGamesByLikes(games) {
  if (!games || games.length === 0) return games
  
  // Fetch likes for all games (parallel)
  const likeCounts = await Promise.all(
    games.map(async (game) => {
      try {
        const { data, error } = await supabase.rpc('get_social_counts', {
          p_game_id: game.gameId
        })
        if (error) {
          console.warn(`[SORT] Failed to get likes for ${game.gameId}:`, error.message)
          return { gameId: game.gameId, likes: game.likes || 0 }
        }
        return { gameId: game.gameId, likes: data?.likes || game.likes || 0 }
      } catch (e) {
        console.warn(`[SORT] Error getting likes for ${game.gameId}:`, e)
        return { gameId: game.gameId, likes: game.likes || 0 }
      }
    })
  )
  
  // Create map for quick lookup
  const likesMap = new Map(likeCounts.map(item => [item.gameId, item.likes]))
  
  // Sort by likes (descending)
  const sortedGames = games.sort((a, b) => {
    const aLikes = likesMap.get(a.gameId) || 0
    const bLikes = likesMap.get(b.gameId) || 0
    return bLikes - aLikes // Descending: highest likes first
  })
  
  
  return sortedGames
}

// ==========================================
// 5. GAME CARD RENDERING
// ==========================================

/**
 * Build game card HTML (giữ nguyên structure từ V1)
 */
/**
 * ✅ PHASE 1 FIX: Sanitize template URL để tránh CORS error
 * Convert production URL sang local URL khi đang dev local
 */
function sanitizeTemplateUrl(url, fallbackPath = '') {
  const baseUrl = window.location.origin.replace(/\/$/, '')
  const isLocal = ['127.0.0.1', 'localhost', '192.168.', '0.0.0.0'].some(host => 
    window.location.hostname.includes(host)
  )
  
  if (!url) return fallbackPath ? `${baseUrl}${fallbackPath}` : ''
  let final = url
  
  if (/^https?:\/\//i.test(final)) {
    try {
      const parsed = new URL(final)
      
      // ✅ FIX: Convert production URL to local when running locally
      if (isLocal && (parsed.hostname.includes('memeplay.dev') || parsed.hostname.includes('127.0.0.1') || parsed.hostname.includes('localhost'))) {
        parsed.protocol = window.location.protocol
        parsed.host = window.location.host
        final = parsed.toString()
      } else if (['127.0.0.1', 'localhost'].includes(parsed.hostname) || parsed.hostname.includes('192.168.')) {
        // ✅ FIX: Convert local IP to current host
        parsed.protocol = window.location.protocol
        parsed.host = window.location.host
        final = parsed.toString()
      } else if (!isLocal && (parsed.hostname.includes('192.168.') || parsed.hostname.includes('127.0.0.1') || parsed.hostname.includes('localhost'))) {
        // ✅ FIX: On production, convert local URLs to production
        parsed.protocol = window.location.protocol
        parsed.host = window.location.host
        final = parsed.toString()
      }
    } catch (_) {
      // Invalid URL, use fallback
    }
  } else {
    final = final.startsWith('/') ? `${baseUrl}${final}` : `${baseUrl}/${final}`
  }
  
  return final
}

function buildGameCard(game) {
  const card = document.createElement('div')
  card.className = 'game-card'
  card.id = game.gameId
  card.setAttribute('data-game-id', game.gameId)
  card.setAttribute('data-user-created', 'true')
  card.setAttribute('data-template-id', game.templateId)
  
  // ✅ PHASE 1 FIX: Sanitize template URL để tránh CORS error
  const rawTemplateUrl = game.templateUrl || getTemplateUrl(game.templateId, game.gameId)
  // ✅ Build default path từ template config
  const config = getTemplateConfig(game.templateId)
  const defaultPath = config?.templateUrl 
    ? `${config.templateUrl}?game=${game.gameId}`
    : `/games/templates-v2/${game.templateId}/index.html?game=${game.gameId}`
  const templateUrl = sanitizeTemplateUrl(rawTemplateUrl, defaultPath)
  
  // ✅ PHASE 1 FIX: Debug log để kiểm tra URL
  if (!templateUrl) {
    console.error(`[V2] ❌ No templateUrl for ${game.gameId}`, {
      rawTemplateUrl,
      defaultPath,
      templateId: game.templateId
    })
  } else {
    console.log(`[V2] 🔗 Template URL for ${game.gameId}: ${templateUrl}`)
  }
  
  const cacheBuster = `v=${Date.now()}`
  const finalUrl = templateUrl.includes('?') 
    ? `${templateUrl}&${cacheBuster}`
    : `${templateUrl}?${cacheBuster}`
  
  // ✅ Giữ nguyên structure từ V1
  card.innerHTML = `
    <div class="game-stage">
      <iframe
        data-game-url="${templateUrl}"
        data-lazy-src="${finalUrl}"
        src="about:blank"
        width="720"
        height="1000"
        frameborder="0"
        scrolling="no"
        allow="autoplay; fullscreen; gamepad"
        title="${game.title || 'MemePlay Game'}">
      </iframe>
      <button class="focus-toggle" type="button" aria-label="Toggle focus mode">⤢</button>
      <!-- ✅ Loading bar cho lazy load games phía dưới -->
      <div class="game-loading-bar" data-game-id="${game.gameId}">
        <div class="game-loading-bar-fill"></div>
        <div class="game-loading-text">0%</div>
      </div>
    </div>
    <footer class="game-footer">
      <div class="game-icons">
        <div class="game-icons-left">
          <div class="icon-wrapper" data-role="like">
            <button type="button" title="Like" aria-label="Like">
              <svg viewBox="0 0 48 48"><path d="M24 40.5l-1.2-1.1C16 33 10 28 10 21.5 10 17 13.6 13.5 18 13.5c2.8 0 5.5 1.4 7 3.8 1.5-2.4 4.2-3.8 7-3.8 4.4 0 8 3.5 8 8 0 6.5-6 11.6-12.8 17.9L24 40.5z" /></svg>
            </button>
            <span class="icon-count" data-label="likes">${game.likes ?? 0}</span>
          </div>
          <div class="icon-wrapper" data-role="comment">
            <button type="button" title="Comments" aria-label="Comments">
              <svg viewBox="0 0 48 48"><path d="M9 20.5c0-7.2 7.5-12.5 16-12.5s16 5.3 16 12.5-7.5 12.5-16 12.5c-2.3 0-4.6-.3-6.7-.9l-5.8 4.7 1.7-6.3C11.5 27.4 9 24.2 9 20.5z" /></svg>
            </button>
            <span class="icon-count" data-label="comments">${game.comments ?? 0}</span>
          </div>
          <div class="icon-wrapper" data-role="share">
            <button type="button" title="Share" aria-label="Share">
              <svg viewBox="0 0 48 48"><path d="M10 36 Q16 24 24 18 Q32 12 40 14 M40 14 L35 10 M40 14 L35 18" /></svg>
            </button>
          </div>
          <div class="icon-wrapper" data-role="leaderboard">
            <button type="button" title="Leaderboard & Rewards" aria-label="Leaderboard">
              <svg viewBox="0 0 48 48"><rect x="8" y="22" width="10" height="18" /><rect x="19" y="12" width="10" height="28" /><rect x="30" y="26" width="10" height="14" /></svg>
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
        Creator: <strong>${game.creatorName || game.creator || 'Creator'}</strong>
      </div>
    </footer>
  `
  
  return card
}

/**
 * Setup PostMessage config cho templates có UPDATE_CONFIG
 */
function setupPostMessageConfig(card, game) {
  const config = getTemplateConfig(game.templateId)
  const messageType = config?.messageTypes?.UPDATE_CONFIG
  
  // Chỉ setup nếu template có UPDATE_CONFIG message type
  if (!messageType) return
  
  const iframe = card.querySelector('iframe')
  if (!iframe) return
  
  // Build payload dựa trên template
  const payload = {
    type: messageType, // 'UPDATE_CONFIG'
    payload: {
      story: game.stories?.[0] || '',
      logoUrl: game.fragmentLogoUrl || '',
      mapColor: game.mapColor || game.backgroundColor || '#1A0A2E',
      // ... more fields tùy template
    }
  }
  
  const sendConfig = () => {
    try {
      iframe.contentWindow?.postMessage(payload, '*')
    } catch (err) {
      console.warn(`[V2] PostMessage config failed for ${game.gameId}:`, err)
    }
  }
  
  // Send khi iframe load
  iframe.addEventListener('load', () => {
    sendConfig()
    setTimeout(sendConfig, 300) // Retry sau 300ms
  })
}

/**
 * Render games in batches (3 games mỗi lần)
 */
function renderGamesInBatches(games, container) {
  // ✅ FIX: Prevent multiple calls
  if (container.dataset.rendering === 'true') {
    console.warn('[V2] Already rendering, skipping...')
    return
  }
  
  container.dataset.rendering = 'true'
  
  // Clear existing user-created games
  container.querySelectorAll('.game-card[data-user-created="true"]')
    .forEach(card => card.remove())
  
  renderedCount = 0
  renderedGames = []
  
  // ✅ GROUP LOGIC: Render nhóm 0 (games 0,1,2) khi init
  if (games.length > 0) {
    // Render nhóm 0: [Game 0, Game 1, Game 2]
    const group0Games = getGroupGames(0, games)
    if (group0Games.length > 0) {
      renderBatch(group0Games, container, games)
      renderedCount = group0Games.length
      currentGroupIndex = 0
      console.log(`[V2] ✅ GROUP LOGIC: Rendered group 0: ${group0Games.map(g => g.gameId).join(', ')}`)
      
      // Ẩn per-card loading bar cho game 0
      const firstCard = document.getElementById(group0Games[0].gameId)
      if (firstCard) {
        const loadingBar = firstCard.querySelector('.game-loading-bar')
        if (loadingBar) {
          loadingBar.style.display = 'none'
        }
      }
      
      // Activate game 0 ngay
      requestAnimationFrame(() => {
        activateGame(group0Games[0].gameId)
        console.log(`[V2] ✅ GROUP LOGIC: Activated first game (group 0): ${group0Games[0].gameId}`)
      })
      
      // Tắt global loading bar
      const hideGlobalLoadingBar = () => {
        const loadingContainer = document.getElementById('loadingProgressContainer')
        if (loadingContainer) {
          loadingContainer.classList.remove('show')
          loadingContainer.style.display = 'none'
        }
        updateLoadingProgress(100, 100)
      }
      
      // Đợi game 0 iframe load xong
      const firstCardForIframe = document.getElementById(group0Games[0].gameId)
      const firstIframe = firstCardForIframe?.querySelector('iframe')
      if (firstIframe && firstIframe.src && firstIframe.src !== 'about:blank') {
        if (firstIframe.complete) {
          hideGlobalLoadingBar()
        } else {
          firstIframe.addEventListener('load', hideGlobalLoadingBar, { once: true })
          setTimeout(hideGlobalLoadingBar, 2000)
        }
      } else {
        setTimeout(() => {
          const retryIframe = firstCardForIframe?.querySelector('iframe')
          if (retryIframe && retryIframe.src && retryIframe.src !== 'about:blank') {
            if (retryIframe.complete) {
              hideGlobalLoadingBar()
            } else {
              retryIframe.addEventListener('load', hideGlobalLoadingBar, { once: true })
              setTimeout(hideGlobalLoadingBar, 2000)
            }
          } else {
            setTimeout(hideGlobalLoadingBar, 500)
          }
        }, 100)
      }
    }
    
    // Setup scroll observer
    setupScrollObserver(container, games)
    // ✅ PHASE 1 FIX: setupScrollEventListener không tồn tại - đã được thay thế bởi setupScrollObserver
    // setupScrollEventListener(container, games) // ❌ Removed - function không tồn tại
    
    container.dataset.rendering = 'false'
  } else {
    container.dataset.rendering = 'false'
  }
}

function renderBatch(games, container, allGames) {
  // ✅ GROUP LOGIC: Mark batch rendering started
  isRenderingBatch = true
  
  games.forEach(game => {
    // ✅ Check if card already exists (prevent duplicate)
    const existingCard = document.getElementById(game.gameId)
    if (existingCard) {
      console.warn(`[V2] Card ${game.gameId} already exists, skipping`)
      return
    }
    
    const card = buildGameCard(game) // ✅ Giữ nguyên structure từ V1
    container.appendChild(card)
    
    // ✅ FIX: Set initial state (HIDDEN) khi render card
    setGameState(game.gameId, GAME_STATES.HIDDEN)
    
    // ✅ PostMessage config cho templates cần
    setupPostMessageConfig(card, game)
    
    // ✅ FIX: Setup social handlers ngay sau khi render card
    setupCardSocialHandlers(card, game.gameId)
    
    renderedGames.push(game)
    
    // ✅ Mark as observed and observe để detect khi vào viewport (batch loading)
    if (scrollObserver) {
      card.dataset.observed = 'true'
      scrollObserver.observe(card)
    }
    
    // ✅ Also observe for activation (game loading)
    // ✅ FIX: Ensure activationObserver is initialized before observing
    if (activationObserver) {
      card.dataset.activationObserved = 'true'
      activationObserver.observe(card)
    } else {
      console.warn(`[V2] ⚠️ activationObserver not ready for card: ${game.gameId}`)
    }
  })
  
  // ✅ OPTION A: Mark batch rendering completed after a small delay
  // This ensures DOM is fully updated before cleanup
  setTimeout(() => {
    isRenderingBatch = false
  }, 150) // 150ms delay to ensure DOM is ready
  
  // ✅ Update renderedCount AFTER rendering (for accurate logging)
  const currentRendered = renderedCount + games.length
  
  // Observe cards cho lazy load social counts
  observeAllGameCards()
  
  // ✅ Observe cards cho lazy load social counts
  if (socialCountsObserver) {
    games.forEach(game => {
      const card = document.getElementById(game.gameId)
      if (card && card.dataset.countsObserved !== 'true') {
        // Game đầu tiên không cần lazy load (load ngay)
        const allCards = Array.from(document.querySelectorAll('.game-card[data-user-created="true"]'))
        const currentIndex = allCards.findIndex(c => (c.id || c.getAttribute('data-game-id')) === game.gameId)
        const isFirstGame = currentIndex === 0
        
        if (!isFirstGame) {
          socialCountsObserver.observe(card)
          card.dataset.countsObserved = 'true'
        } else {
          // Game đầu tiên: load ngay không cần loading bar
          hydrateSocialCountsWithProgress(game.gameId, card)
        }
      }
    })
  }
}

function setupScrollObserver(container, allGames) {
  if (scrollObserver) {
    scrollObserver.disconnect()
  }
  
  scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const gameId = entry.target.id || entry.target.getAttribute('data-game-id')
        if (!gameId) return
        
        const gameIndex = allGames.findIndex(g => g.gameId === gameId)
        if (gameIndex === -1) return
        
        // ✅ PRIORITY 1 FIX: Detect scroll direction và render games cần thiết
        // Check xem game hiện tại có trong DOM không
        const currentCard = document.getElementById(gameId) || document.querySelector(`[data-game-id="${gameId}"]`)
        if (!currentCard) {
          // Game không có trong DOM → cần render lại
          // Xác định cần render batch nào (phía trên hoặc phía dưới)
          const allCards = Array.from(document.querySelectorAll('.game-card[data-user-created="true"]'))
          if (allCards.length === 0) {
            // Không có games nào → render từ game hiện tại
            const startIndex = Math.max(0, gameIndex - 1)
            const batch = allGames.slice(startIndex, startIndex + BATCH_SIZE)
            if (batch.length > 0) {
              renderBatch(batch, container, allGames)
              renderedCount = Math.min(allGames.length, startIndex + batch.length)
              console.log(`[V2] ✅ PRIORITY 1: Rendered batch from index ${startIndex} (scroll to game ${gameId})`)
              
              // ✅ OPTION A: Activate game sau khi batch render xong (delay để batch hoàn thành)
              setTimeout(() => {
                activateGame(gameId)
              }, 200) // 200ms delay để batch render xong
            }
          } else {
            // Có games trong DOM → xác định hướng scroll
            const firstCardIndex = allGames.findIndex(g => {
              const card = document.getElementById(g.gameId) || document.querySelector(`[data-game-id="${g.gameId}"]`)
              return card !== null
            })
            
            if (firstCardIndex !== -1) {
              if (gameIndex < firstCardIndex) {
                // Scroll lên → render games phía trên
                const startIndex = Math.max(0, gameIndex - 1)
                const batch = allGames.slice(startIndex, startIndex + BATCH_SIZE)
                if (batch.length > 0) {
                  renderBatch(batch, container, allGames)
                  renderedCount = Math.max(renderedCount, startIndex + batch.length)
                  console.log(`[V2] ✅ PRIORITY 1: Rendered batch above (scroll up to game ${gameId}, index ${startIndex})`)
                  
                  // ✅ OPTION A: Activate game sau khi batch render xong (delay để batch hoàn thành)
                  setTimeout(() => {
                    activateGame(gameId)
                  }, 200) // 200ms delay để batch render xong
                }
              } else {
                // Scroll xuống → render games phía dưới
                const startIndex = renderedCount
                const batch = allGames.slice(startIndex, startIndex + BATCH_SIZE)
                if (batch.length > 0) {
                  renderBatch(batch, container, allGames)
                  renderedCount += batch.length
                  console.log(`[V2] ✅ PRIORITY 1: Rendered batch below (scroll down to game ${gameId}, index ${startIndex})`)
                  
                  // ✅ OPTION A: Activate game sau khi batch render xong (delay để batch hoàn thành)
                  setTimeout(() => {
                    activateGame(gameId)
                  }, 200) // 200ms delay để batch render xong
                }
              }
            }
          }
          
          // Re-observe sau khi render
          container.querySelectorAll('.game-card[data-user-created="true"]')
            .forEach(card => {
              if (scrollObserver && card.dataset.observed !== 'true') {
                scrollObserver.observe(card)
                card.dataset.observed = 'true'
              }
            })
          observeAllGameCards()
          return
        }
        
        // ✅ FIX: Render batch tiếp theo khi scroll đến game gần cuối danh sách đã render
        // Trigger khi scroll đến game thứ (renderedCount - 2) trở lên để render sớm hơn
        // Ví dụ: nếu đã render 3 games (index 0,1,2), khi scroll đến game index 1 → render tiếp
        // Điều này đảm bảo batch tiếp theo được render trước khi user scroll đến cuối
        const shouldRenderNext = gameIndex >= Math.max(0, renderedCount - 2) && renderedCount < allGames.length
        
        if (shouldRenderNext) {
          // ✅ GROUP LOGIC: Cleanup và render sẽ được handle trong activateGame() khi chuyển nhóm
          if (!activeGame) {
            // Nếu chưa có game active, xóa tất cả games cũ để giải phóng memory
            const allCards = Array.from(document.querySelectorAll('.game-card[data-user-created="true"]'))
            allCards.forEach(card => {
              const iframe = card.querySelector('iframe')
              if (iframe) iframe.src = 'about:blank'
              if (scrollObserver) scrollObserver.unobserve(card)
              if (activationObserver) activationObserver.unobserve(card)
              if (socialCountsObserver) socialCountsObserver.unobserve(card)
              card.remove()
            })
            renderedCount = 0
            renderedGames = []
            lastActiveGameIndex = -1 // ✅ PRIORITY 1: Reset scroll direction tracking
          }
          
          const nextBatch = allGames.slice(renderedCount, renderedCount + BATCH_SIZE)
          if (nextBatch.length > 0) {
            renderBatch(nextBatch, container, allGames)
            renderedCount += nextBatch.length
            
            // ✅ Re-observe all cards after rendering (including new ones)
            container.querySelectorAll('.game-card[data-user-created="true"]')
              .forEach(card => {
                if (!scrollObserver) return
                // Check if already observed
                const isObserved = card.dataset.observed === 'true'
                if (!isObserved) {
                  scrollObserver.observe(card)
                  card.dataset.observed = 'true'
                }
              })
            
            // ✅ Also observe new cards for activation
            observeAllGameCards()
          }
        }
      }
    })
  }, {
    root: container,
    rootMargin: '400px', // ✅ Increase margin để detect sớm hơn (từ 300px → 400px)
    threshold: [0, 0.1, 0.3, 0.5, 0.7, 1] // ✅ More thresholds để detect tốt hơn
  })
  
  // Observe tất cả cards đã render
  container.querySelectorAll('.game-card[data-user-created="true"]')
    .forEach(card => {
      scrollObserver.observe(card)
      card.dataset.observed = 'true'
    })
}

// ==========================================
// 6. MAIN INITIALIZATION
// ==========================================

async function init() {
  
  initStartTime = Date.now()
  shouldShowLoadingBar = false
  updateLoadingProgress(0, 100)
  
  // ✅ OPTIMIZED: Ẩn global loading bar ngay từ đầu cho game 0 (vì game 0 load nhanh, không cần loading bar)
  const globalLoadingContainer = document.getElementById('loadingProgressContainer')
  if (globalLoadingContainer) {
    globalLoadingContainer.style.display = 'none' // Ẩn ngay từ đầu
  }
  
  const container = document.querySelector('.game-container')
  if (!container) {
    console.error('[V2] ❌ Game container not found')
    return
  }
  
  
  // Check for priority game
  const urlParams = new URLSearchParams(window.location.search)
  const gameIdFromQuery = urlParams.get('game')
  let priorityGame = null
  
  if (gameIdFromQuery && gameIdFromQuery.startsWith('playmode-')) {
    priorityGame = await loadPriorityGame(gameIdFromQuery)
    if (priorityGame) {
      // Render và activate ngay lập tức
      renderBatch([priorityGame], container, [priorityGame])
      activateGame(priorityGame.gameId)
      scrollToGame(priorityGame.gameId)
      updateLoadingProgress(20, 100)
    }
  }
  
  // Load localStorage games (optimistic)
  updateLoadingProgress(20, 100)
  const localGames = loadLocalStorageV2Games()
  
  // Load Supabase games (background)
  updateLoadingProgress(40, 100)
  const supabaseGames = await loadSupabaseV2Games()
  
  // Merge games (Supabase games đã được sort by likes rồi)
  updateLoadingProgress(60, 100)
  allGames = mergeGames(localGames, supabaseGames)
  
  // ✅ OPTIMIZED: Sort lại toàn bộ để đảm bảo thứ tự đúng (game nhiều like nhất lên đầu)
  updateLoadingProgress(80, 100)
  
  // ✅ OPTIMIZED: Supabase games đã được sort và có likes rồi
  // Chỉ cần fetch likes cho localStorage games (nếu có) và sort lại toàn bộ
  const supabaseGameIds = new Set(supabaseGames.map(g => g.gameId))
  const localOnlyGames = allGames.filter(g => !supabaseGameIds.has(g.gameId))
  
  if (localOnlyGames.length > 0) {
    // Có games từ localStorage → cần fetch likes cho những games này
    const sortedLocalGames = await sortGamesByLikes(localOnlyGames)
    const supabaseGamesInAll = allGames.filter(g => supabaseGameIds.has(g.gameId))
    // Merge: Supabase games (đã sort) + localStorage games (vừa sort)
    allGames = [...supabaseGamesInAll, ...sortedLocalGames]
  }
  
  // ✅ Sort lại toàn bộ để đảm bảo game nhiều like nhất lên đầu
  allGames.sort((a, b) => {
    const aLikes = Number(a.likes) || 0
    const bLikes = Number(b.likes) || 0
    return bLikes - aLikes // Descending: highest likes first
  })
  
  // ✅ DEBUG: Log top 5 games để verify
  const top5 = allGames.slice(0, 5).map((g, idx) => `${idx + 1}. ${g.gameId} (${g.likes || 0} likes)`)
  console.log(`[V2] ✅ Sorted ${allGames.length} games by likes (descending):`, top5.join(', '))
  
  // ✅ FIX: Initialize scroll system BEFORE rendering games
  // This ensures activationObserver is ready when renderBatch() tries to observe cards
  initScrollSystem()
  
  // ✅ Initialize lazy load observer cho social counts
  initSocialCountsObserver()
  
  // Render games in batches
  updateLoadingProgress(90, 100)
  renderGamesInBatches(allGames, container)
  
  // Complete
  updateLoadingProgress(100, 100)
  
  // Initialize other features
  initSocialHandlers()
  initDailyCheckin()
  initSearchFilter()
  initHeaderHandlers()
  initRealtimeSync()
  
  // Observe all game cards
  observeAllGameCards()
  
}

// ==========================================
// 7. SCROLL SYSTEM (Native scroll-snap, debounced Observer)
// ==========================================

let activationObserver = null

function initScrollSystem() {
  const container = document.querySelector('.game-container')
  if (!container) return
  
  // Track scroll state
  container.addEventListener('scroll', () => {
    isScrolling = true
    userInitiatedScroll = true

    // ✅ Reset isScrolling flag sau khi scroll stop
    scrollTimeout = setTimeout(() => {
      isScrolling = false
      setTimeout(() => {
        userInitiatedScroll = false
      }, 300)
    }, 50)
  }, { passive: true })
  
  // Setup IntersectionObserver for game activation
  if (activationObserver) {
    activationObserver.disconnect()
  }
  
  activationObserver = new IntersectionObserver((entries) => {
    const isDesktop = window.innerWidth > 768
    
    
    // ✅ FIX: Chỉ skip nếu đang scroll nhanh (nhiều entries cùng lúc)
    if (isScrolling && entries.length > 2) {
      return
    }
    
    // ✅ Debounce: Only activate after scroll stops
    clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      
      // ✅ PHƯƠNG ÁN 6: Chỉ activate game nếu nó thực sự là game đang visible trong viewport (không chỉ trong rootMargin)
      // Tìm game có intersectionRatio cao nhất VÀ thực sự visible trong viewport
      const containerRect = container.getBoundingClientRect()
      const containerCenterY = containerRect.top + containerRect.height / 2
      const viewportTop = containerRect.top
      const viewportBottom = containerRect.bottom
      
      let bestGame = null
      let bestRatio = 0
      let bestDistance = Infinity
      
      // ✅ Chỉ check entries thực sự visible trong viewport (không chỉ trong rootMargin)
      const maxDistance = isDesktop ? 100 : 500
      const minRatio = isDesktop ? 0.3 : 0.2
      
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        
        const rect = entry.boundingClientRect
        const gameId = entry.target.id || entry.target.getAttribute('data-game-id')
        
        // ✅ Game phải thực sự visible trong viewport (không chỉ trong rootMargin)
        const isVisibleInViewport = rect.top < viewportBottom && rect.bottom > viewportTop
        
        // ✅ Chỉ activate game nếu nó có intersectionRatio cao (> 0.3) VÀ gần center
        const cardCenterY = rect.top + rect.height / 2
        const distance = Math.abs(cardCenterY - containerCenterY)
        const meetsRatio = entry.intersectionRatio >= minRatio
        const meetsDistance = distance <= maxDistance
        const isValid = isVisibleInViewport && meetsRatio && meetsDistance
        
        
        if (!isVisibleInViewport) return
        
        if (isValid) {
          // Chọn game có intersectionRatio cao nhất, nếu bằng nhau thì chọn game gần center nhất
          if (entry.intersectionRatio > bestRatio || 
              (entry.intersectionRatio === bestRatio && distance < bestDistance)) {
            bestRatio = entry.intersectionRatio
            bestDistance = distance
            if (gameId) {
              bestGame = { id: gameId, element: entry.target }
            }
          }
        }
      })
      
      
      // ✅ Fallback: Nếu không tìm thấy game từ entries, check tất cả visible cards
      if (!bestGame) {
        const allCards = Array.from(document.querySelectorAll('.game-card[data-user-created="true"]'))
        const maxDistance = isDesktop ? 100 : 500
        
        allCards.forEach(card => {
          const rect = card.getBoundingClientRect()
          const isVisible = rect.top < viewportBottom && rect.bottom > viewportTop
          
          if (isVisible) {
            const cardCenterY = rect.top + rect.height / 2
            const distance = Math.abs(cardCenterY - containerCenterY)
            const gameId = card.id || card.getAttribute('data-game-id')
            
            // ✅ Desktop: Chỉ activate nếu game thực sự gần center (< 100px)
            // ✅ Mobile: Cho phép activate game xa hơn (< 500px)
            if (distance <= maxDistance && distance < bestDistance) {
              bestDistance = distance
              if (gameId) {
                bestGame = { id: gameId, element: card }
              }
            }
          }
        })
      }
      
      
      // ✅ Chỉ activate nếu tìm thấy game hợp lệ
      // ✅ FIX: Skip nếu game đã được activate thủ công (tránh conflict)
      if (bestGame && bestGame.id !== activeGame) {
        activateGame(bestGame.id)
      }
    }, 100)
  }, {
    root: container,
    // ✅ PHƯƠNG ÁN 6: Giảm rootMargin xuống 50px (desktop) để chỉ detect game khi thực sự gần viewport
    rootMargin: window.innerWidth > 768 ? '50px 0px' : '400px 0px',
    threshold: [0, 0.1, 0.3, 0.5, 0.7, 1]
  })
  
  // ✅ Observe all game cards (including newly rendered ones)
  observeAllGameCards()
}

function observeAllGameCards() {
  if (!activationObserver) {
    console.warn('[V2] ⚠️ activationObserver not initialized yet')
    return
  }
  
  const container = document.querySelector('.game-container')
  if (!container) {
    console.warn('[V2] ⚠️ .game-container not found')
    return
  }
  
  const cards = container.querySelectorAll('.game-card[data-user-created="true"]')
  let observedCount = 0
  let alreadyObservedCount = 0
  const pacmanCards = []
  
  cards.forEach((card) => {
    const gameId = card.id || card.getAttribute('data-game-id')
    const isPacman = gameId?.includes('pacman')
    
    if (isPacman) {
      pacmanCards.push({
        gameId,
        isObserved: card.dataset.activationObserved === 'true'
      })
    }
    
    const isObserved = card.dataset.activationObserved === 'true'
    
    if (isObserved) {
      alreadyObservedCount++
      return
    }
    
    activationObserver.observe(card)
    card.dataset.activationObserved = 'true'
    observedCount++
  })
  
}

function findClosestGame(entries) {
  let bestEntry = null
  let bestDistance = Infinity
  
  // ✅ FIX: Also check all visible cards, not just entries
  const container = document.querySelector('.game-container')
  if (!container) return null
  
  const containerRect = container.getBoundingClientRect()
  const containerCenterY = containerRect.top + containerRect.height / 2
  
  // ✅ PHƯƠNG ÁN 3: Chỉ check các games thực sự visible trong viewport (không chỉ trong rootMargin)
  // Game phải có một phần nằm trong viewport: top < bottom và bottom > top
  const viewportTop = containerRect.top
  const viewportBottom = containerRect.bottom
  
  
  // ✅ PHƯƠNG ÁN 3: Chỉ check entries thực sự visible trong viewport
  entries.forEach(entry => {
    if (!entry.isIntersecting) return
    
    const rect = entry.boundingClientRect
    // ✅ Chỉ check game nếu nó thực sự visible trong viewport
    const isVisibleInViewport = rect.top < viewportBottom && rect.bottom > viewportTop
    if (!isVisibleInViewport) return // Skip games chỉ trong rootMargin nhưng không visible
    
    const cardCenterY = rect.top + rect.height / 2
    const distance = Math.abs(cardCenterY - containerCenterY)
    
    if (distance < bestDistance) {
      bestDistance = distance
      bestEntry = entry
    }
  })
  
  // ✅ FIX: If no entry found, check all visible cards
  if (!bestEntry) {
    const allCards = Array.from(document.querySelectorAll('.game-card[data-user-created="true"]'))
    allCards.forEach(card => {
      const rect = card.getBoundingClientRect()
      const isVisible = rect.top < containerRect.bottom && rect.bottom > containerRect.top
      
      if (isVisible) {
        const cardCenterY = rect.top + rect.height / 2
        const distance = Math.abs(cardCenterY - containerCenterY)
        
        if (distance < bestDistance) {
          bestDistance = distance
          bestEntry = { target: card }
        }
      }
    })
  }
  
  if (bestEntry) {
    const gameId = bestEntry.target.id || bestEntry.target.getAttribute('data-game-id')
    if (gameId) {
      return { id: gameId, element: bestEntry.target }
    }
  }
  return null
}

function scrollToGame(gameId) {
  const card = document.getElementById(gameId) || document.querySelector(`[data-game-id="${gameId}"]`)
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

// ==========================================
// 8. GAME ACTIVATION
// ==========================================

function activateGame(gameId) {
  if (!gameId) return
  
  
  // ✅ Skip if already active (prevent duplicate activation)
  if (activeGame === gameId) {
    // Ensure iframe is loaded even if already active
    const card = document.getElementById(gameId) || document.querySelector(`[data-game-id="${gameId}"]`)
    if (card) {
      const iframe = card.querySelector('iframe')
      if (iframe && iframe.dataset.lazySrc && (iframe.src === 'about:blank' || !iframe.src)) {
        iframe.src = iframe.dataset.lazySrc
      }
    }
    return
  }
  
  // Stop previous game
  if (activeGame) {
    stopGame()
  }
  
  activeGame = gameId
  const card = document.getElementById(gameId) || document.querySelector(`[data-game-id="${gameId}"]`)
  if (!card) {
    console.warn(`[V2] ⚠️ Card not found for game: ${gameId}`)
    return
  }
  
  // ✅ GROUP LOGIC: Xác định nhóm của game mới và chuyển nhóm nếu cần
  const container = document.querySelector('.game-container')
  const gameIndex = allGames.findIndex(g => g.gameId === gameId)
  if (gameIndex === -1) {
    console.warn(`[V2] ⚠️ Game not found in allGames: ${gameId}`)
    return
  }
  
  const newGroupIndex = Math.floor(gameIndex / 3) // Nhóm 0 = [0,1,2], nhóm 1 = [3,4,5], ...
  
  // Nếu chuyển sang nhóm mới → xóa nhóm cũ và render nhóm mới
  if (currentGroupIndex !== -1 && currentGroupIndex !== newGroupIndex) {
    console.log(`[V2] 🔄 Switching group: ${currentGroupIndex} → ${newGroupIndex} (game ${gameId}, index ${gameIndex})`)
    
    // Xóa nhóm cũ
    unloadGroup(currentGroupIndex, allGames)
    
    // Render nhóm mới
    const groupGames = getGroupGames(newGroupIndex, allGames)
    if (groupGames.length > 0 && container) {
      renderBatch(groupGames, container, allGames)
      console.log(`[V2] ✅ Rendered group ${newGroupIndex}: ${groupGames.map(g => g.gameId).join(', ')}`)
    }
  }
  
  // Update currentGroupIndex
  currentGroupIndex = newGroupIndex
  
  // ✅ Check loading status - chỉ activate khi social counts đã load xong
  // Game đầu tiên (index 0) không cần check (load ngay)
  const isFirstGame = gameIndex === 0
  
  if (!isFirstGame && card.dataset.countsLoaded !== 'true') {
    // Chưa load xong → đợi và retry
    const checkLoaded = setInterval(() => {
      if (card.dataset.countsLoaded === 'true') {
        clearInterval(checkLoaded)
        activateGame(gameId) // Retry activation
      }
    }, 100)
    
    // Timeout sau 5s để tránh infinite wait
    setTimeout(() => {
      clearInterval(checkLoaded)
      if (card.dataset.countsLoaded !== 'true') {
        // Force activate nếu timeout (fallback)
        card.dataset.countsLoaded = 'true'
        activateGame(gameId)
      }
    }, 5000)
    
    return
  }
  
  // ✅ Load iframe (critical - this is what loads the game)
  const iframe = card.querySelector('iframe')
  if (iframe) {
    if (iframe.dataset.lazySrc) {
      if (iframe.src === 'about:blank' || !iframe.src || iframe.src === '') {
        console.log(`[V2] 🎮 Loading iframe for ${gameId}: ${iframe.dataset.lazySrc}`)
        iframe.src = iframe.dataset.lazySrc
        
        // ✅ PHASE 1 FIX: Add error handler để debug
        iframe.addEventListener('error', (e) => {
          console.error(`[V2] ❌ Iframe load error for ${gameId}:`, e)
        }, { once: true })
        
        iframe.addEventListener('load', () => {
          console.log(`[V2] ✅ Iframe loaded for ${gameId}`)
        }, { once: true })
      } else {
        console.log(`[V2] ℹ️ Iframe already loaded for ${gameId}: ${iframe.src}`)
      }
    } else {
      console.warn(`[V2] ⚠️ No lazySrc found for ${gameId}. Iframe attributes:`, {
        src: iframe.src,
        dataGameUrl: iframe.dataset.gameUrl,
        dataLazySrc: iframe.dataset.lazySrc
      })
    }
  } else {
    console.error(`[V2] ❌ No iframe found in card for ${gameId}`)
  }
  
  // ✅ PHƯƠNG ÁN 2: Re-observe game khi activate để đảm bảo không miss activation
  if (scrollObserver && card.dataset.observed !== 'true') {
    scrollObserver.observe(card)
    card.dataset.observed = 'true'
  }
  if (activationObserver && card.dataset.activationObserved !== 'true') {
    activationObserver.observe(card)
    card.dataset.activationObserved = 'true'
  }
  
  // Set game state
  setGameState(gameId, GAME_STATES.ACTIVE)
  
  // Start playtime tracking
  startGame(gameId)
  
  // Preload next game trong cùng nhóm (delayed)
  const allCards = Array.from(document.querySelectorAll('.game-card[data-user-created="true"]'))
  const currentIndex = allCards.findIndex(c => (c.id || c.getAttribute('data-game-id')) === gameId)
  const nextCard = allCards[currentIndex + 1]
  
  if (nextCard) {
    setTimeout(() => {
      const nextGameId = nextCard.id || nextCard.getAttribute('data-game-id')
      const nextIframe = nextCard.querySelector('iframe')
      if (nextIframe && nextIframe.dataset.lazySrc && (nextIframe.src === 'about:blank' || !nextIframe.src)) {
        nextIframe.src = nextIframe.dataset.lazySrc
        setGameState(nextGameId, GAME_STATES.WAITING)
        
        // ✅ PHƯƠNG ÁN 2: Re-observe next game khi preload để đảm bảo không miss activation
        if (scrollObserver && nextCard.dataset.observed !== 'true') {
          scrollObserver.observe(nextCard)
          nextCard.dataset.observed = 'true'
        }
        if (activationObserver && nextCard.dataset.activationObserved !== 'true') {
          activationObserver.observe(nextCard)
          nextCard.dataset.activationObserved = 'true'
        }
      }
    }, 500)
  }
  
  // ✅ GROUP LOGIC: Cleanup đã được handle trong logic chuyển nhóm ở trên
}

function setGameState(gameId, state) {
  if (!gameId) return
  const card = document.getElementById(gameId) || document.querySelector(`[data-game-id="${gameId}"]`)
  if (!card) return
  
  card.dataset.gameState = state
  gameStateStore.set(gameId, state)
  
  card.classList.toggle('state-active', state === GAME_STATES.ACTIVE)
  card.classList.toggle('state-waiting', state === GAME_STATES.WAITING)
  card.classList.toggle('state-hidden', state === GAME_STATES.HIDDEN)
}

// ✅ GROUP LOGIC: Helper functions để quản lý nhóm games

/**
 * Xác định nhóm từ game index
 * @param {number} gameIndex - Index của game trong allGames
 * @returns {number} - Index của nhóm (0 = [0,1,2], 1 = [3,4,5], ...)
 */
function getGroupIndex(gameIndex) {
  return Math.floor(gameIndex / 3)
}

/**
 * Lấy 3 games trong nhóm
 * @param {number} groupIndex - Index của nhóm
 * @param {Array} allGames - Tất cả games
 * @returns {Array} - 3 games trong nhóm
 */
function getGroupGames(groupIndex, allGames) {
  const startIndex = groupIndex * 3
  return allGames.slice(startIndex, startIndex + 3)
}

/**
 * Xóa toàn bộ games trong nhóm khỏi DOM
 * @param {number} groupIndex - Index của nhóm cần xóa
 * @param {Array} allGames - Tất cả games
 */
function unloadGroup(groupIndex, allGames) {
  const groupGames = getGroupGames(groupIndex, allGames)
  const container = document.querySelector('.game-container')
  
  groupGames.forEach(game => {
    const card = document.getElementById(game.gameId) || document.querySelector(`[data-game-id="${game.gameId}"]`)
    if (!card) return
    
    // 1. Unload iframe
    const iframe = card.querySelector('iframe')
    if (iframe) {
      iframe.src = 'about:blank'
    }
    
    // 2. Unobserve tất cả observers
    if (scrollObserver && card.dataset.observed === 'true') {
      scrollObserver.unobserve(card)
      card.dataset.observed = 'false'
    }
    if (activationObserver && card.dataset.activationObserved === 'true') {
      activationObserver.unobserve(card)
      card.dataset.activationObserved = 'false'
    }
    if (socialCountsObserver && card.dataset.countsObserved === 'true') {
      socialCountsObserver.unobserve(card)
      card.dataset.countsObserved = 'false'
    }
    
    // 3. Set game state
    setGameState(game.gameId, GAME_STATES.HIDDEN)
    
    // 4. Xóa khỏi renderedGames array
    const gameIndex = renderedGames.findIndex(g => g.gameId === game.gameId)
    if (gameIndex !== -1) {
      renderedGames.splice(gameIndex, 1)
    }
    
    // 5. XÓA DOM ELEMENT (giải phóng memory hoàn toàn)
    card.remove()
    
    console.log(`[V2] 🗑️ Removed game from group ${groupIndex}: ${game.gameId}`)
  })
  
  console.log(`[V2] ✅ Unloaded group ${groupIndex}: ${groupGames.length} games removed`)
}

function startGame(gameId) {
  if (activeGame && activeGame !== gameId) stopGame()
  
  clearInterval(progressInterval)
  progressInterval = null
  
  activeGame = gameId
  activeStartTime = Date.now()
  playCountIncremented = false
  
  // Mark card as playing
  document.querySelectorAll('.game-card').forEach(card => card.classList.remove('is-playing'))
  const activeCard = document.getElementById(gameId) || document.querySelector(`[data-game-id="${gameId}"]`)
  if (activeCard) {
    activeCard.classList.add('is-playing')
  }
  
  // Progress tracking interval
  progressInterval = setInterval(() => {
    if (!activeGame || !activeStartTime) return
    updateProgress()
  }, 5000)
}

function stopGame() {
  if (!activeGame) return
  
  // Increment play count if played > 5 seconds
  if (!playCountIncremented && activeStartTime) {
    const playTime = Math.floor((Date.now() - activeStartTime) / 1000)
    if (playTime >= 5) {
      incrementPlayCount(activeGame)
      playCountIncremented = true
    }
  }
  
  clearInterval(progressInterval)
  progressInterval = null
  
  const card = document.getElementById(activeGame) || document.querySelector(`[data-game-id="${activeGame}"]`)
  if (card) card.classList.remove('is-playing')
  
  activeGame = null
  activeStartTime = 0
}

function updateProgress() {
  if (!activeGame || !activeStartTime) return
  
  const sessionSeconds = Math.floor((Date.now() - activeStartTime) / 1000)
  const storageKey = `mp_game_seconds_${activeGame}`
  const prevTotal = lsGetInt(storageKey, 0)
  const newTotal = prevTotal + sessionSeconds
  
  // Save progress
  lsSetInt(storageKey, newTotal)
  
  // Check for rewards (simplified - can be expanded)
  // Reward logic can be added here
}

function incrementPlayCount(gameId) {
  if (!gameId) return
  
  // Update Supabase play count
  supabase.rpc('increment_play_count', {
    p_game_id: gameId
  }).then(result => {
    if (result.error) {
      console.warn(`[V2] Failed to increment play count:`, result.error)
    }
  }).catch(err => {
    console.warn(`[V2] Failed to increment play count:`, err)
  })
}

// ==========================================
// 9. SOCIAL FEATURES (Implement lại toàn bộ)
// ==========================================

function initSocialHandlers() {
  // Comments overlay handlers
  const overlay = document.getElementById('commentsOverlay')
  const listEl = document.getElementById('commentsList')
  const loadMoreBtn = document.getElementById('commentsLoadMore')
  const closeBtn = document.getElementById('commentsCloseBtn')
  const ta = document.getElementById('commentsTextarea')
  const postBtn = document.getElementById('commentsPostBtn')
  
  if (!overlay || !listEl || !ta || !postBtn) return
  
  const paging = { gameId: null, offset: 0, limit: 10, loading: false, done: false }
  
  async function fetchMore() {
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
      if (rows.length === 0) {
        paging.done = true
        return
      }
      
      rows.forEach(r => {
        const item = document.createElement('div')
        item.className = 'comment-item'
        const meta = document.createElement('div')
        meta.className = 'comment-meta'
        meta.textContent = `${shortAddr10(r.user_id)} • ${new Date(r.created_at).toLocaleString()}`
        const text = document.createElement('div')
        text.className = 'comment-text'
        text.textContent = r.text
        item.appendChild(meta)
        item.appendChild(text)
        listEl.appendChild(item)
      })
      
      paging.offset += rows.length
    } catch (e) {
      console.error('[V2] list_comments error:', e?.message || e)
    } finally {
      paging.loading = false
    }
  }
  
  async function openPanel(forGame) {
    paging.gameId = forGame
    paging.offset = 0
    paging.loading = false
    paging.done = false
    listEl.innerHTML = ''
    ta.value = ''
    overlay.classList.add('open')
    
    await fetchMore()
    
    // Update comment count
    try {
      const { data } = await supabase.rpc('get_social_counts', { p_game_id: forGame })
      if (data) {
        const card = document.querySelector(`.game-card[data-game-id="${forGame}"]`)
        if (card) {
          const cmtWrapper = card.querySelector('.icon-wrapper[data-role="comment"]')
          const cmtCountEl = cmtWrapper?.querySelector('.icon-count')
          if (cmtCountEl) {
            cmtCountEl.textContent = String(data.comments || 0)
          }
        }
      }
    } catch (e) {
      console.error('[V2] Error refreshing comment count:', e)
    }
  }
  
  loadMoreBtn.onclick = fetchMore
  
  // ✅ Close button handler
  if (closeBtn) {
    closeBtn.onclick = () => overlay.classList.remove('open')
  }
  
  // ✅ Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open')
  })
  
  // ✅ ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      overlay.classList.remove('open')
    }
  })
  
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
      
      // Update comment count
      const card = document.querySelector(`.game-card[data-game-id="${paging.gameId}"]`)
      if (card) {
        const cmtWrapper = card.querySelector('.icon-wrapper[data-role="comment"]')
        const cmtCountEl = cmtWrapper?.querySelector('.icon-count')
        if (cmtCountEl) {
          const currentCount = parseInt(cmtCountEl.textContent) || 0
          cmtCountEl.textContent = String(currentCount + 1)
        }
      }
    } catch (e) {
      console.error('[V2] add_comment error:', e?.message || e)
    } finally {
      postBtn.disabled = false
    }
  }
  
  // ✅ Expose openPanel để dùng trong setupCardSocialHandlers
  window.__openCommentsPanel = openPanel
}

/**
 * ✅ Setup social handlers cho một card cụ thể
 * Gọi function này ngay sau khi render mỗi card trong renderBatch()
 */
function setupCardSocialHandlers(card, gameId) {
  if (!card || !gameId) return
  
  // Check if already setup (prevent duplicate handlers)
  if (card.dataset.socialHandlersSetup === 'true') return
  card.dataset.socialHandlersSetup = 'true'
  
  const likeWrapper = card.querySelector('.icon-wrapper[data-role="like"]')
  const commentWrapper = card.querySelector('.icon-wrapper[data-role="comment"]')
  const shareWrapper = card.querySelector('.icon-wrapper[data-role="share"]')
  const leaderboardWrapper = card.querySelector('.icon-wrapper[data-role="leaderboard"]')
  
  const likeBtn = likeWrapper?.querySelector('button')
  const commentBtn = commentWrapper?.querySelector('button')
  const shareBtn = shareWrapper?.querySelector('button')
  const leaderboardBtn = leaderboardWrapper?.querySelector('button')
  
  if (!likeBtn || !commentBtn) return
  
  // ✅ Like handler
  likeBtn.addEventListener('click', async () => {
    likeBtn.disabled = true
    try {
      const { data, error } = await supabase.rpc('toggle_like', {
        p_user_id: userId,
        p_game_id: gameId
      })
      
      if (error) throw error
      
      const isLiked = !!(data?.is_liked ?? data?.liked)
      const totalLikes = data?.total_likes ?? data?.likes ?? 0
      
      localStorage.setItem('mp_like_' + gameId, isLiked ? '1' : '0')
      
      // ✅ Lưu timestamp khi user like (để sort theo lượt like mới nhất)
      if (isLiked) {
        const timestamp = Date.now()
        localStorage.setItem('mp_like_time_' + gameId, String(timestamp))
      } else {
        localStorage.removeItem('mp_like_time_' + gameId)
      }
      
      likeWrapper.classList.toggle('liked', isLiked)
      const likeCountEl = likeWrapper.querySelector('.icon-count')
      if (likeCountEl) {
        likeCountEl.textContent = String(totalLikes)
      }
    } catch (e) {
      console.error('[V2] toggle_like error:', e?.message || e)
    } finally {
      likeBtn.disabled = false
    }
  })
  
  // ✅ Comment handler
  commentBtn.addEventListener('click', () => {
    if (window.__openCommentsPanel) {
      window.__openCommentsPanel(gameId)
    }
  })
  
  // ✅ Share handler
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      openShareOverlay(gameId)
    })
  }
  
  // ✅ Leaderboard handler
  if (leaderboardBtn) {
    leaderboardBtn.addEventListener('click', () => {
      openLeaderboardOverlay(gameId)
    })
  }
  
  // ✅ Load initial like state
  const localLiked = localStorage.getItem('mp_like_' + gameId) === '1'
  likeWrapper.classList.toggle('liked', localLiked)
  
  // ✅ Nếu game đã được like nhưng chưa có timestamp, tạo timestamp mặc định (0 = cũ nhất)
  if (localLiked && !localStorage.getItem('mp_like_time_' + gameId)) {
    localStorage.setItem('mp_like_time_' + gameId, '0')
  }
  
  // ✅ REMOVED: Không gọi hydrateSocialCounts() ngay nữa
  // Sẽ được gọi lazy khi game vào viewport (qua IntersectionObserver)
}

/**
 * ✅ Show/hide loading bar cho game card
 */
function showGameLoadingBar(card, progress) {
  if (!card) return
  
  const loadingBar = card.querySelector('.game-loading-bar')
  const fill = loadingBar?.querySelector('.game-loading-bar-fill')
  const text = loadingBar?.querySelector('.game-loading-text')
  
  if (!loadingBar || !fill || !text) return
  
  const progressPercent = Math.max(0, Math.min(100, progress))
  
  if (progressPercent > 0 && progressPercent < 100) {
    loadingBar.classList.add('show')
  } else if (progressPercent >= 100) {
    // Complete → ẩn sau 300ms
    setTimeout(() => {
      loadingBar.classList.remove('show')
    }, 300)
  } else {
    // 0% → ẩn ngay
    loadingBar.classList.remove('show')
  }
  
  fill.style.width = `${progressPercent}%`
  text.textContent = `${progressPercent}%`
}

/**
 * ✅ Hydrate social counts với loading bar progress
 */
async function hydrateSocialCountsWithProgress(gameId, card) {
  if (!card || !gameId) return
  
  // Chỉ load nếu chưa load
  if (card.dataset.countsLoaded === 'true') return
  
  showGameLoadingBar(card, 10) // Start
  
  try {
    showGameLoadingBar(card, 25) // API calls starting
    
    const [socialRes, playsRes] = await Promise.allSettled([
      supabase.rpc('get_social_counts', { p_game_id: gameId }),
      supabase.rpc('get_game_play_count', { p_game_id: gameId })
    ])
    
    showGameLoadingBar(card, 75) // API calls done
    
    // Update UI
    const likeWrapper = card.querySelector('.icon-wrapper[data-role="like"]')
    const commentWrapper = card.querySelector('.icon-wrapper[data-role="comment"]')
    
    if (socialRes.status === 'fulfilled' && socialRes.value.data) {
      const likeCountEl = likeWrapper?.querySelector('.icon-count')
      const cmtCountEl = commentWrapper?.querySelector('.icon-count')
      if (likeCountEl) likeCountEl.textContent = String(socialRes.value.data.likes || 0)
      if (cmtCountEl) cmtCountEl.textContent = String(socialRes.value.data.comments || 0)
    }
    
    if (playsRes.status === 'fulfilled' && playsRes.value.data && typeof playsRes.value.data.total_plays === 'number') {
      const totalPlays = Math.max(0, playsRes.value.data.total_plays)
      setPlaysLabelForCard(gameId, totalPlays)
    }
    
    showGameLoadingBar(card, 100) // Complete
    card.dataset.countsLoaded = 'true'
    
  } catch (err) {
    console.warn(`[V2] Failed to hydrate counts for ${gameId}:`, err)
    showGameLoadingBar(card, 100) // Complete even on error
    card.dataset.countsLoaded = 'true' // Mark as loaded to prevent retry loops
  }
}

/**
 * ✅ Initialize IntersectionObserver cho lazy load social counts
 */
function initSocialCountsObserver() {
  if (socialCountsObserver) {
    socialCountsObserver.disconnect()
  }
  
  const container = document.querySelector('.game-container')
  if (!container) return
  
  socialCountsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const gameId = entry.target.id || entry.target.getAttribute('data-game-id')
        const card = entry.target
        
        if (!gameId || !card) return
        
        // Chỉ load nếu chưa load
        if (card.dataset.countsLoaded === 'true') {
          socialCountsObserver.unobserve(card)
          return
        }
        
        // Load social counts với loading bar
        hydrateSocialCountsWithProgress(gameId, card)
          .then(() => {
            // Unobserve sau khi load xong
            socialCountsObserver.unobserve(card)
          })
      }
    })
  }, {
    root: container,
    rootMargin: '200px 0px', // Load sớm 200px trước khi vào viewport
    threshold: 0.01
  })
}

/**
 * ✅ Set plays label in footer (giống V1)
 */
function setPlaysLabelForCard(gameId, totalPlays) {
  const card = document.querySelector(`.game-card[data-game-id="${gameId}"]`) || document.getElementById(gameId)
  if (!card) return
  
  const creator = card.querySelector('.creator-text')
  if (!creator) return
  
  let span = creator.querySelector('[data-plays-count]')
  if (!span) {
    // Insert separator dot and span once
    const sep = document.createTextNode(' • ')
    span = document.createElement('span')
    span.setAttribute('data-plays-count', gameId)
    creator.appendChild(sep)
    creator.appendChild(span)
  }
  span.textContent = `${totalPlays} plays`
}
  

function openShareOverlay(gameId) {
  const overlay = document.getElementById('shareOverlay')
  if (!overlay) return
  
  const shareUrl = `${window.location.origin}/play-v2.html?game=${gameId}`
  
  overlay.classList.add('open')
  
  const copyBtn = document.getElementById('shareCopyBtn')
  const telegramBtn = document.getElementById('shareTelegramBtn')
  const xBtn = document.getElementById('shareXBtn')
  
  if (copyBtn) {
    copyBtn.onclick = async () => {
      try {
        // ✅ FIX: Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl)
        } else {
          // ✅ FALLBACK: Use legacy method if clipboard API not available
          const textArea = document.createElement('textarea')
          textArea.value = shareUrl
          textArea.style.position = 'fixed'
          textArea.style.left = '-999999px'
          textArea.style.top = '-999999px'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          
          try {
            document.execCommand('copy')
          } catch (e) {
            console.error('[V2] Legacy copy failed:', e)
            throw e
          } finally {
            document.body.removeChild(textArea)
          }
        }
        
        // ✅ Update button text
        const span = copyBtn.querySelector('span')
        if (span) {
          span.textContent = 'Copied!'
          setTimeout(() => {
            span.textContent = 'Copy Link'
          }, 1500)
        } else {
          copyBtn.textContent = 'Copied!'
          setTimeout(() => {
            copyBtn.textContent = 'Copy Link'
          }, 1500)
        }
      } catch (err) {
        console.error('[V2] Clipboard copy failed:', err)
        // ✅ Show error to user
        const span = copyBtn.querySelector('span')
        if (span) {
          span.textContent = 'Copy failed'
          setTimeout(() => {
            span.textContent = 'Copy Link'
          }, 1500)
        } else {
          copyBtn.textContent = 'Copy failed'
          setTimeout(() => {
            copyBtn.textContent = 'Copy Link'
          }, 1500)
        }
      }
    }
  }
  
  if (telegramBtn) {
    telegramBtn.onclick = () => {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`, '_blank')
    }
  }
  
  if (xBtn) {
    xBtn.onclick = () => {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`, '_blank')
    }
  }
  
  const closeBtn = document.getElementById('shareCloseBtn')
  if (closeBtn) {
    closeBtn.onclick = () => overlay.classList.remove('open')
  }
  
  // ✅ Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open')
  })
  
  // ✅ ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      overlay.classList.remove('open')
    }
  })
}

function initLeaderboardOverlay() {
  const overlay = document.getElementById('leaderboardOverlay')
  if (!overlay) return
  
  const closeBtn = document.getElementById('leaderboardCloseBtn')
  
  // ✅ Close button handler
  if (closeBtn) {
    closeBtn.onclick = () => overlay.classList.remove('open')
  }
  
  // ✅ Click outside to close (chỉ add một lần khi init)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open')
  })
  
  // ✅ ESC key to close (chỉ add một lần khi init)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      overlay.classList.remove('open')
    }
  })
}

function openLeaderboardOverlay(gameId) {
  const overlay = document.getElementById('leaderboardOverlay')
  if (!overlay) return
  
  overlay.classList.add('open')
  
  // Load leaderboard data
  // Implementation can be added here
}

// ==========================================
// 10. DAILY CHECK-IN (Giữ nguyên logic)
// ==========================================

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
  
  function showDailyCheckInToast(streak, reward, totalDays = null) {
    // Implementation from V1
    // Can be copied from scripts/app.js
  }
  
  async function dailyCheckin() {
    if (!userId) return
    
    const { data, error } = await supabase.rpc('daily_checkin', { p_user_id: userId })
    if (error) {
      console.error('[V2] Daily check-in error:', error.message)
      return
    }
    
    if (data?.awarded > 0) {
      const streak = Number(data.streak) || 1
      const totalDays = Number(data.total_days) || null
      const awarded = Number(data.awarded)
      
      // ✅ Cộng điểm vào PLAY points
      const newTotal = lsGetInt('mp_total_earned_plays', 0) + awarded
      lsSetInt('mp_total_earned_plays', newTotal)
      
      // ✅ Update UI
      if (typeof window.__updateStatsOverlay === 'function') {
        window.__updateStatsOverlay()
      }
      if (typeof window.__updateWalletOverlay === 'function') {
        window.__updateWalletOverlay()
      }
      
      showDailyCheckInToast(streak, awarded, totalDays)
      markCheckedInToday()
    }
    
    if (Number.isFinite(data?.streak)) {
      lsSetInt('mp_streak_count', Number(data.streak))
    }
  }
  
  // Only run on first load if not already checked in today
  if (!hasCheckedInToday()) dailyCheckin()
}

// ==========================================
// 11. SEARCH/FILTER (Recommended, Liked)
// ==========================================

function initSearchFilter() {
  const navDropdown = document.getElementById('navDropdown')
  const dropdownList = document.getElementById('dropdownList')
  const items = dropdownList ? dropdownList.querySelectorAll('.dropdown-item') : []
  const searchToggleButton = document.getElementById('searchToggleButton')
  
  // Hamburger menu dropdown (để close khi mở search dropdown)
  const hamburgerButton = document.getElementById('hamburgerButton')
  const hamburgerDropdown = document.getElementById('hamburgerDropdown')
  
  if (!navDropdown || !searchToggleButton || !items.length) return
  
  function closeNavDropdown() {
    navDropdown.classList.remove('open')
    navDropdown.setAttribute('aria-hidden', 'true')
    searchToggleButton.setAttribute('aria-expanded', 'false')
  }
  
  function closeHamburgerDropdown() {
    if (hamburgerDropdown) {
      hamburgerDropdown.classList.remove('open')
      hamburgerDropdown.setAttribute('aria-hidden', 'true')
      if (hamburgerButton) {
        hamburgerButton.setAttribute('aria-expanded', 'false')
      }
    }
  }
  
  // ✅ Toggle dropdown when clicking search icon (giống V1)
  searchToggleButton.addEventListener('click', (event) => {
    event.stopPropagation()
    closeHamburgerDropdown()
    
    const willOpen = !navDropdown.classList.contains('open')
    if (willOpen) {
      navDropdown.classList.add('open')
      navDropdown.setAttribute('aria-hidden', 'false')
      searchToggleButton.setAttribute('aria-expanded', 'true')
    } else {
      closeNavDropdown()
    }
  })
  
  // ✅ Handle dropdown item clicks (giống V1)
  items.forEach(item => {
    item.addEventListener('click', function(e) {
      items.forEach(i => i.classList.remove('active'))
      this.classList.add('active')
      
      const category = this.getAttribute('data-category')
      if (!category) return
      
      closeNavDropdown()
      e.stopPropagation()
      
      // Apply filter
      currentFilter = category
      applyFilter(category)
    })
  })
  
  // ✅ Close dropdown when clicking outside (giống V1)
  document.addEventListener('click', function(e) {
    if (navDropdown.contains(e.target) || searchToggleButton.contains(e.target)) {
      closeHamburgerDropdown()
      return
    }
    if (hamburgerDropdown?.contains(e.target) || hamburgerButton?.contains(e.target)) {
      closeNavDropdown()
      return
    }
    // Click outside - close all
    closeNavDropdown()
    closeHamburgerDropdown()
  })
  
  // ✅ Close dropdown on ESC key (giống V1)
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeNavDropdown()
      closeHamburgerDropdown()
    }
  })
}

async function applyFilter(filter) {
  const container = document.querySelector('.game-container')
  if (!container) return
  
  
  // ✅ FIX: Disconnect observers và reset state trước khi render lại
  if (scrollObserver) {
    scrollObserver.disconnect()
  }
  if (activationObserver) {
    activationObserver.disconnect()
  }
  
  // ✅ FIX: Reset rendering flag và state để cho phép render lại
  container.dataset.rendering = 'false'
  renderedCount = 0
  renderedGames = []
  
  if (filter === 'Recommended') {
    // ✅ OPTIMIZE: Chỉ reload nếu allGames rỗng hoặc cần refresh
    // Nếu allGames đã có và đã được sort, chỉ cần sort lại (nhanh hơn)
    let sortedGames
    if (allGames.length > 0) {
      // Sort lại từ allGames hiện tại (nhanh hơn)
      sortedGames = await sortGamesByLikes([...allGames])
    } else {
      // Chỉ reload nếu allGames rỗng
      const localGames = loadLocalStorageV2Games()
      const supabaseGames = await loadSupabaseV2Games()
      const mergedGames = mergeGames(localGames, supabaseGames)
      sortedGames = await sortGamesByLikes([...mergedGames])
    }
    
    // ✅ Update allGames để đồng bộ
    allGames = sortedGames
    
    renderGamesInBatches(sortedGames, container)
    
    // ✅ FIX: Activate và scroll về game đầu tiên (game nhiều lượt like nhất) sau khi render xong
    if (sortedGames.length > 0 && sortedGames[0]?.gameId) {
      const firstGameId = sortedGames[0].gameId
      setTimeout(() => {
        activateGame(firstGameId)
        scrollToGame(firstGameId)
      }, 200) // Delay để đảm bảo games đã được render vào DOM
    }
  } else if (filter === 'Liked') {
    // ✅ Filter liked games
    const likedGames = allGames.filter(game => {
      const likeStatus = localStorage.getItem('mp_like_' + game.gameId)
      return likeStatus === '1'
    })
    
    
    if (likedGames.length === 0) {
      console.warn('[V2] ⚠️ No liked games found')
    }
    
    // ✅ OPTIMIZE: Cache localStorage values để tránh duplicate calls
    const timeMap = new Map()
    likedGames.forEach(game => {
      const time = parseInt(localStorage.getItem('mp_like_time_' + game.gameId) || '0')
      timeMap.set(game.gameId, time)
    })
    
    // ✅ Sort liked games by lượt like mới nhất của user (mới nhất trước)
    const sortedLikedGames = [...likedGames].sort((a, b) => {
      const timeA = timeMap.get(a.gameId) || 0
      const timeB = timeMap.get(b.gameId) || 0
      // Descending order (mới nhất trước)
      return timeB - timeA
    })
    
    renderGamesInBatches(sortedLikedGames, container)
  } else {
    // Other filters (Trending, Popular) - can be implemented later
    renderGamesInBatches(allGames, container)
  }
  
  // ✅ Re-initialize scroll system sau khi render xong
  setTimeout(() => {
    initScrollSystem()
  }, 100)
}

// ==========================================
// 12. HEADER HANDLERS
// ==========================================

function initStatsOverlay() {
  const overlay = document.getElementById('statsOverlay')
  if (!overlay) return
  
  const closeBtn = document.getElementById('statsCloseBtn')
  const streakEl = document.getElementById('statsStreak')
  const playsEl = document.getElementById('statsPlays')
  
  function updateStatsOverlay() {
    // Get values from localStorage or wallet API
    const streak = lsGetInt('mp_streak_count', 0)
    const plays = lsGetInt('mp_total_earned_plays', 0)
    
    if (streakEl) streakEl.textContent = String(streak)
    if (playsEl) playsEl.textContent = String(plays)
  }
  
  function openStatsOverlay() {
    updateStatsOverlay()
    overlay.classList.add('open')
  }
  
  function closeStatsOverlay() {
    overlay.classList.remove('open')
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeStatsOverlay)
  }
  
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

function initCreatorOverlay() {
  const overlay = document.getElementById('creatorOverlay')
  if (!overlay) return
  
  const closeBtn = document.getElementById('creatorCloseBtn')
  
  function closeCreatorOverlay() {
    overlay.classList.remove('open')
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeCreatorOverlay)
  }
  
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeCreatorOverlay()
  })
  
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay.classList.contains('open')) {
      closeCreatorOverlay()
    }
  })
}

function initHeaderHandlers() {
  // Hamburger menu
  const hamburgerBtn = document.getElementById('hamburgerButton')
  const hamburgerDropdown = document.getElementById('hamburgerDropdown')
  
  if (hamburgerBtn && hamburgerDropdown) {
    hamburgerBtn.addEventListener('click', () => {
      const willOpen = !hamburgerDropdown.classList.contains('open')
      hamburgerDropdown.classList.toggle('open', willOpen)
      hamburgerBtn.setAttribute('aria-expanded', willOpen)
      hamburgerDropdown.setAttribute('aria-hidden', !willOpen)
    })
    
    // Handle menu items
    const menuItems = hamburgerDropdown.querySelectorAll('.dropdown-item')
    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-action')
        if (action === 'docs') {
          window.location.href = '/docs.html'
        } else if (action === 'stats') {
          if (typeof window.__openStatsOverlay === 'function') {
            window.__openStatsOverlay()
          } else {
            const overlay = document.getElementById('statsOverlay')
            if (overlay) overlay.classList.add('open')
          }
        }
        hamburgerDropdown.classList.remove('open')
      })
    })
  }
  
  // Creator button - navigate to template v2 editor
  const creatorBtn = document.getElementById('creatorButton')
  if (creatorBtn) {
    creatorBtn.addEventListener('click', (event) => {
      event.preventDefault()
      // Close any open dropdowns
      const navDropdown = document.getElementById('navDropdown')
      const hamburgerDropdown = document.getElementById('hamburgerDropdown')
      if (navDropdown) navDropdown.classList.remove('open')
      if (hamburgerDropdown) hamburgerDropdown.classList.remove('open')
      // Navigate to template v2 editor
      window.location.href = '/games/templates-v2/'
    })
  }
  
  // ✅ Initialize all overlays
  initStatsOverlay()
  initCreatorOverlay()
  initLeaderboardOverlay()
  
  // Wallet handlers (copy từ V1)
  initWalletHandlers()
}

// ==========================================
// 12. WALLET HANDLERS (MetaMask)
// ==========================================

function shortAddr(addr) {
  if (!addr || addr.length < 10) return addr
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}

function getWalletAddress() {
  return localStorage.getItem('mp_user_wallet') || ''
}

function getLocalUserId() {
  let id = localStorage.getItem('mp_user_id')
  if (!id) {
    id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('mp_user_id', id)
  }
  return id
}

function setWalletStatus(addr) {
  const walletStatus = document.getElementById('walletStatusText')
  if (!walletStatus) return
  walletStatus.textContent = addr ? `connected :${shortAddr(addr)}` : ''
  if (typeof window.__updateWalletOverlay === 'function') {
    window.__updateWalletOverlay()
  }
}

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
    
    // Auto check-in if not checked in today
    if (typeof hasCheckedInToday === 'function' && !hasCheckedInToday()) {
      if (typeof dailyCheckin === 'function') {
        try {
          await dailyCheckin()
        } catch (e) {
          console.warn('[V2] Auto check-in failed:', e)
        }
      }
    }
  } catch (e) {
    console.warn('[V2] Wallet connect failed:', e?.message || e)
  }
}

function disconnectWallet() {
  localStorage.removeItem('mp_user_wallet')
  userId = getLocalUserId()
  setWalletStatus('')
  setConnectButtonState()
}

function ensureWalletBindings() {
  const connectBtn = document.getElementById('walletConnectBtn')
  const statusBtn = document.getElementById('walletStatusBtn')
  
  if (connectBtn && !connectBtn.__memeplayBound) {
    connectBtn.addEventListener('click', (event) => {
      event.preventDefault()
      connectWallet()
    })
    connectBtn.__memeplayBound = true
  }
  
  if (statusBtn && !statusBtn.__memeplayBound) {
    statusBtn.addEventListener('click', () => {
      // ✅ FIX: Mở wallet overlay nếu có, nếu không thì disconnect trực tiếp
      if (typeof window.__openWalletOverlay === 'function') {
        window.__openWalletOverlay()
      } else {
        // Fallback: Disconnect trực tiếp nếu không có overlay
        const confirmDisconnect = confirm('Disconnect wallet?')
        if (confirmDisconnect) {
          disconnectWallet()
        }
      }
    })
    statusBtn.__memeplayBound = true
  }
}

function setConnectButtonState() {
  const connectBtn = document.getElementById('walletConnectBtn')
  const walletBadge = document.getElementById('walletStatusBtn')
  if (!connectBtn || !walletBadge) return
  
  const address = getWalletAddress()
  const isConnected = !!address
  
  if (isConnected) {
    connectBtn.hidden = true
    walletBadge.hidden = false
    const walletStatus = document.getElementById('walletStatusText')
    if (walletStatus) {
      walletStatus.textContent = `connected :${shortAddr(address)}`
    }
    ensureWalletBindings()
  } else {
    connectBtn.hidden = false
    walletBadge.hidden = true
    ensureWalletBindings()
  }
}

function initWalletOverlay() {
  const overlay = document.getElementById('walletOverlay')
  if (!overlay) return
  
  const closeBtn = document.getElementById('walletCloseBtn')
  const copyBtn = document.getElementById('walletCopyBtn')
  const disconnectBtn = document.getElementById('walletDisconnectBtn')
  const addressEl = document.getElementById('walletOverlayAddress')
  const streakEl = document.getElementById('walletOverlayStreak')
  const playsEl = document.getElementById('walletOverlayPlays')

  function updateWalletOverlay() {
    const api = globalThis.memeplayWallet || {}
    const address = api.getAddress?.() || ''
    if (addressEl) addressEl.textContent = address ? address : 'Not connected'
    const streak = api.getStreak?.()
    const plays = api.getPlayPoints?.()
    if (streakEl) streakEl.textContent = String(Number.isFinite(streak) ? streak : 0)
    if (playsEl) playsEl.textContent = String(Number.isFinite(plays) ? plays : 0)
  }

  function openWalletOverlay() {
    updateWalletOverlay()
    overlay.classList.add('open')
  }

  function closeWalletOverlay() {
    overlay.classList.remove('open')
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeWalletOverlay)
  }
  
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeWalletOverlay()
  })
  
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay.classList.contains('open')) {
      closeWalletOverlay()
    }
  })

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const api = globalThis.memeplayWallet || {}
      const address = api.getAddress?.() || ''
      if (!address) return
      try {
        await navigator.clipboard.writeText(address)
        copyBtn.textContent = 'Copied!'
        setTimeout(() => { copyBtn.textContent = 'Copy address' }, 1500)
      } catch (err) {
        console.warn('[V2] Clipboard copy failed', err)
        copyBtn.textContent = 'Copy failed'
        setTimeout(() => { copyBtn.textContent = 'Copy address' }, 1500)
      }
    })
  }

  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => {
      const api = globalThis.memeplayWallet || {}
      api.disconnect?.()
      closeWalletOverlay()
    })
  }

  window.__openWalletOverlay = openWalletOverlay
  window.__updateWalletOverlay = updateWalletOverlay
}

function initWalletHandlers() {
  // Update userId to use wallet if available
  userId = getWalletAddress() || getLocalUserId()
  
  // Set initial wallet status
  setWalletStatus(getWalletAddress())
  
  // ✅ Initialize wallet overlay
  initWalletOverlay()
  
  // Setup button bindings
  ensureWalletBindings()
  setConnectButtonState()
  
  // Listen for account changes
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
  
  // Expose wallet API globally
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
    const existing = (globalThis.memeplayWallet && typeof globalThis.memeplayWallet === 'object') 
      ? globalThis.memeplayWallet 
      : {}
    globalThis.memeplayWallet = Object.assign({}, existing, walletApi)
  } catch {
    globalThis.memeplayWallet = walletApi
  }
}

// ==========================================
// 13. REALTIME SYNC
// ==========================================

function initRealtimeSync() {
  const enabledTemplates = Object.keys(TEMPLATE_REGISTRY)
    .filter(id => TEMPLATE_REGISTRY[id].enabled !== false)
    .map(id => id.includes('-template') ? id : `${id}-template`)
  
  realtimeChannel = supabase
    .channel('homepage-v2-games')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'user_games',
      filter: `template_id=in.(${enabledTemplates.map(t => `"${t}"`).join(',')})`
    }, (payload) => {
      const newGame = payload.new
      const gameId = newGame.game_id
      
      if (gameId?.startsWith('playmode-')) {
        // Add new game to homepage
        const normalizedGame = {
          gameId,
          templateId: newGame.template_id?.replace('-template', '') || '',
          templateUrl: newGame.template_url || '',
          title: newGame.title || 'Untitled',
          fragmentLogoUrl: newGame.fragment_logo_url || '',
          stories: [],
          mapColor: newGame.map_color || '#1A0A2E',
          mapIndex: newGame.map_index || 0,
          likes: 0,
          comments: 0,
          plays: 0,
          creatorId: newGame.creator_id || '',
          creatorName: newGame.creator_name || 'Creator',
          source: 'realtime'
        }
        
        allGames.push(normalizedGame)
        // Re-sort and re-render
        sortGamesByLikes(allGames).then(sorted => {
          allGames = sorted
          renderGamesInBatches(allGames, document.querySelector('.game-container'))
        })
      }
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'user_games',
      filter: `template_id=in.(${enabledTemplates.map(t => `"${t}"`).join(',')})`
    }, (payload) => {
      const updatedGame = payload.new
      if (updatedGame.game_id?.startsWith('playmode-')) {
        // Update game on homepage
        const index = allGames.findIndex(g => g.gameId === updatedGame.game_id)
        if (index >= 0) {
          allGames[index] = {
            ...allGames[index],
            title: updatedGame.title || allGames[index].title,
            fragmentLogoUrl: updatedGame.fragment_logo_url || allGames[index].fragmentLogoUrl,
            // ... more fields
          }
        }
      }
    })
    .subscribe()
  
}

// ==========================================
// 14. FOCUS MODE & CONFETTI (Copy từ V1)
// ==========================================

function toggleFocusMode() {
  document.body.classList.toggle('focus-mode')
  
  const activeCard = document.getElementById(activeGame) || document.querySelector(`[data-game-id="${activeGame}"]`)
  if (activeCard) {
    activeCard.classList.toggle('is-focus-active', document.body.classList.contains('focus-mode'))
  }
  
  // Notify iframes
  document.querySelectorAll('iframe').forEach(iframe => {
    iframe.contentWindow?.postMessage({
      type: 'FOCUS_MODE_CHANGED',
      isFocus: document.body.classList.contains('focus-mode')
    }, '*')
  })
}

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

// ==========================================
// 15. START INITIALIZATION
// ==========================================

// ✅ Expose functions for debugging
window.__memeplayV2 = {
  activateGame,
  setGameState,
  findClosestGame,
  getActiveGame: () => activeGame,
  getAllGames: () => allGames,
  getRenderedCount: () => renderedCount
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

