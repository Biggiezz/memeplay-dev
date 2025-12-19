import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// ✅ Import Template Registry để dùng thay vì hardcode
import { 
  getTemplateConfig,
  TEMPLATE_REGISTRY,
  getTemplateUrl
} from '../games/templates-v2/core/template-registry.js'

const SUPABASE_URL = 'https://iikckrcdrvnqctzacxgx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpa2NrcmNkcnZucWN0emFjeGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Mzc3NDgsImV4cCI6MjA3NzMxMzc0OH0.nIPvf11YfFlWH0XHDZdxI496zaP431QOJCuQ-5XX4DQ'

// ✅ Legacy template IDs (giữ lại để backward compatibility)
const PACMAN_TEMPLATE_ID = 'pacman-template'
const BLOCKS_TEMPLATE_ID = 'blocks-8x8'
const WALL_BOUNCE_BIRD_TEMPLATE_ID = 'wall-bounce-bird'
const BLOW_BUBBLE_TEMPLATE_ID = 'blow-bubble'
const PIXEL_SHOOTER_TEMPLATE_ID = 'pixel-shooter-template' // ✅ For Supabase lookup (editor uses this ID)

// ✅ Legacy storage prefixes (giữ lại để backward compatibility)
const PACMAN_STORAGE_PREFIX = 'pacman_brand_config_'
const BLOCKS_STORAGE_PREFIX = 'blocks_brand_config_'
const WALL_BOUNCE_BIRD_STORAGE_PREFIX = 'wall_bounce_bird_config_'
const BLOW_BUBBLE_STORAGE_PREFIX = 'blow_bubble_config_'

const playLogo = document.getElementById('playLogo')
const playHomeBtn = document.getElementById('playHomeBtn')
const playErrorBack = document.getElementById('playErrorBack')
const cardHost = document.getElementById('playCardHost')
const loader = document.getElementById('playLoader')
const errorBox = document.getElementById('playError')
const errorText = document.getElementById('playErrorText')
const commentsOverlay = document.getElementById('commentsOverlay')
const commentsList = document.getElementById('commentsList')
const commentsTextarea = document.getElementById('commentsTextarea')
const commentsPostBtn = document.getElementById('commentsPostBtn')
const commentsLoadMoreBtn = document.getElementById('commentsLoadMore')
const commentsCloseBtn = document.getElementById('commentsCloseBtn')
const shareOverlay = document.getElementById('shareOverlay')
const shareCloseBtn = document.getElementById('shareCloseBtn')
const shareCopyBtn = document.getElementById('shareCopyBtn')
const shareTelegramBtn = document.getElementById('shareTelegramBtn')
const shareXBtn = document.getElementById('shareXBtn')
const shareUrlDisplay = document.getElementById('shareUrlDisplay')
const leaderboardOverlay = document.getElementById('leaderboardOverlay')
const leaderboardCloseBtn = document.getElementById('leaderboardCloseBtn')
const leaderboardTabs = leaderboardOverlay ? leaderboardOverlay.querySelectorAll('.leaderboard-tab') : []
const leaderboardList = document.getElementById('leaderboardList')
const leaderboardRewardSummary = document.getElementById('leaderboardRewardSummary')
const leaderboardRewardList = document.getElementById('leaderboardRewardList')

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

if (supabase.realtime) {
  supabase.realtime.disconnect()
}

// ✅ Load game over sound for Blow Bubble
let blowBubbleGameOverSound = null
try {
  blowBubbleGameOverSound = new Audio('assets/rocket_fail_oh_oh.wav')
  blowBubbleGameOverSound.preload = 'auto' // Preload để sẵn sàng
  blowBubbleGameOverSound.volume = 1.0 // Full volume
} catch (e) {
  console.warn('[PLAY MODE] Failed to load blow bubble game over sound:', e)
  blowBubbleGameOverSound = { play: () => {} } // Fallback
}

// ✅ Audio unlock for mobile browsers
let audioUnlocked = false
function unlockAudio() {
  if (audioUnlocked) return
  try {
    // Unlock bằng cách play một âm thanh rất ngắn (silence)
    const silentAudio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=')
    silentAudio.volume = 0
    silentAudio.play().catch(() => {})
    audioUnlocked = true
  } catch (e) {
    // Ignore errors
  }
}

// ✅ Unlock audio on user interaction
document.addEventListener('click', unlockAudio, { once: true })
document.addEventListener('touchstart', unlockAudio, { once: true })
document.addEventListener('keydown', unlockAudio, { once: true })

const lsGetInt = (key, fallback = 0) => {
  const raw = localStorage.getItem(key)
  const num = raw == null ? NaN : Number(raw)
  return Number.isFinite(num) ? num : fallback
}

const lsSetInt = (key, value) => {
  localStorage.setItem(key, String(Math.max(0, Math.trunc(value))))
}

function generateLocalUuid() {
  try {
    const cryptoObj = globalThis.crypto || globalThis.msCrypto
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID()
    if (cryptoObj?.getRandomValues) {
      const buf = cryptoObj.getRandomValues(new Uint8Array(16))
      buf[6] = (buf[6] & 0x0f) | 0x40
      buf[8] = (buf[8] & 0x3f) | 0x80
      const hex = Array.from(buf, b => b.toString(16).padStart(2, '0')).join('')
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
    }
  } catch (err) {
    console.warn('[PLAY MODE] generateLocalUuid fallback:', err)
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : ((r & 0x3) | 0x8)
    return v.toString(16)
  })
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

const userId = getWalletAddress() || getLocalUserId()
const REWARD_THRESHOLDS = [10, 60, 300]
const REWARD_VALUES = { 10: 100, 60: 300, 300: 1000 }
const MAX_ACCUM_SECONDS = 300
let currentShareGameId = null

// ✅ Queue achievements to show after game over (giống homepage)
const pendingAchievements = {}
let isGameOver = false // Flag to prevent showing rewards during gameplay

const buildShareUrl = (gameId) => {
  if (!gameId) return `${window.location.origin}/`
  // ✅ V2: Use short /playmode-xxx format
  return `${window.location.origin}/${gameId}`
}

function closeShareOverlay() {
  shareOverlay?.classList.remove('open')
}

function openShareOverlay(gameId) {
  currentShareGameId = gameId
  const url = buildShareUrl(gameId)
  if (shareUrlDisplay) shareUrlDisplay.textContent = url
  shareOverlay?.classList.add('open')
}

shareCloseBtn?.addEventListener('click', closeShareOverlay)
shareOverlay?.addEventListener('click', (event) => {
  if (event.target === shareOverlay) closeShareOverlay()
})

shareCopyBtn?.addEventListener('click', async () => {
  const url = buildShareUrl(currentShareGameId)
  try {
    // ✅ Auto-copy link
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.top = '0'
      textarea.style.left = '0'
      textarea.style.width = '2em'
      textarea.style.height = '2em'
      textarea.style.padding = '0'
      textarea.style.border = 'none'
      textarea.style.outline = 'none'
      textarea.style.boxShadow = 'none'
      textarea.style.background = 'transparent'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }
    
    // ✅ Change button text to "Copied"
    const original = shareCopyBtn.innerHTML
    shareCopyBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>Copied</span>
    `
    setTimeout(() => {
      shareCopyBtn.innerHTML = original
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
    alert(`Share link:\n${url}`)
  }
})

shareTelegramBtn?.addEventListener('click', () => {
  const url = buildShareUrl(currentShareGameId)
  const text = `🎮 Play this MemePlay game with me!`
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
  window.open(tgUrl, '_blank')
})

shareXBtn?.addEventListener('click', () => {
  const url = buildShareUrl(currentShareGameId)
  const text = `Playing MemePlay: ${url}`
  const xUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
  window.open(xUrl, '_blank')
})

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

const formatCount = (num) => {
  const n = Number(num) || 0
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

const shortAddrLeaderboard = (addr) => {
  if (!addr || addr.length <= 10) return addr || 'Anonymous'
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}

const formatScore = (score, gameId) => {
  const num = Number(score) || 0
  // Format as percentage for games that use % (wojak-btc-blast, blow-bubble games)
  // ✅ V2: Support playmode-xxx format
  if (gameId === 'wojak-btc-blast' || (gameId && (gameId.startsWith('blow-bubble-') || gameId.startsWith('playmode-blow-bubble-')))) {
    return num + '%'
  }
  return formatCount(num)
}

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

function renderRewardsPanel(gameId) {
  if (!leaderboardRewardSummary || !leaderboardRewardList) return
  const totalSeconds = getGameSeconds(gameId)
  const awardedMap = getGameAwards(gameId)
  const progress = Math.min(100, (totalSeconds / MAX_ACCUM_SECONDS) * 100)

  leaderboardRewardSummary.innerHTML = `
    <div style="font-size:18px;">Total Playtime</div>
    <div class="reward-total">${totalSeconds}s / ${MAX_ACCUM_SECONDS}s</div>
    <div class="leaderboard-reward-progress"><span style="width:${progress}%"></span></div>
    <div style="margin-top:6px;font-size:13px;color:#a9b1c4;">Play more to unlock bonus PLAY rewards</div>
  `

  leaderboardRewardList.innerHTML = ''
  REWARD_THRESHOLDS.forEach(threshold => {
    const unlocked = awardedMap[threshold] || totalSeconds >= threshold
    const secondsLeft = Math.max(0, threshold - totalSeconds)
    const card = document.createElement('div')
    card.className = 'leaderboard-reward-card' + (unlocked ? ' unlocked' : '')
    card.innerHTML = `
      <div style="flex:1;">
        <div class="reward-name">${unlocked ? '✅' : '🔒'} ${threshold}s Reward</div>
        <div class="reward-status">${unlocked ? 'Unlocked!' : `${secondsLeft}s remaining`}</div>
      </div>
      <div class="reward-amount">+${REWARD_VALUES[threshold] || 0}</div>
    `
    leaderboardRewardList.appendChild(card)
  })
}

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
    console.error('[PLAY MODE] Leaderboard error:', err)
    leaderboardList.innerHTML = '<div style="padding:24px;text-align:center;color:#f88;">Failed to load leaderboard</div>'
  }
}

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

const goHome = () => window.location.replace('/')
;[playLogo, playHomeBtn, playErrorBack].forEach(btn => btn?.addEventListener('click', goHome))

function setLoaderVisible(isVisible) {
  loader?.classList.toggle('hidden', !isVisible)
}

function showError(message) {
  if (errorText) errorText.textContent = message || 'Unable to load this game.'
  errorBox?.classList.remove('hidden')
}

function hideError() {
  errorBox?.classList.add('hidden')
}

function normalizeId(raw) {
  if (!raw) return ''
  return raw.trim().replace(/^#/, '')
}

// ✅ Helper: Get storage prefix từ registry
function getStoragePrefix(templateId) {
  const config = getTemplateConfig(templateId)
  return config?.storagePrefix || null
}

// ✅ Helper: Normalize template ID từ Supabase/Editor về registry ID
// Map editor template IDs → registry template IDs
function normalizeTemplateId(templateId) {
  if (!templateId) return templateId
  
  const templateIdMap = {
    'pixel-shooter-template': 'pixel-shooter',
    'pacman-template': 'pacman',
    'blocks-8x8-template': 'blocks-8x8',
    'wall-bounce-bird-template': 'wall-bounce-bird',
    'blow-bubble-template': 'blow-bubble',
    'rocket-bnb-template': 'rocket-bnb-template', // ✅ Rocket BNB: keep same ID
    'fallen-crypto-template': 'fallen-crypto-template', // ✅ Fallen Crypto: keep same ID (matches registry)
    'space-jump-template': 'space-jump-template', // ✅ Space Jump: keep same ID
    'shooter-template': 'shooter-template' // ✅ Shooter: keep same ID
  }
  
  return templateIdMap[templateId] || templateId
}

// ✅ Helper: Generate gameId variants để thử (dùng chung cho TẤT CẢ templates)
// Hỗ trợ cả 2 format: có và không có 'playmode-' prefix
function getGameIdVariants(gameId) {
  if (!gameId) return [gameId]
  
  const variants = [gameId] // Luôn thử gameId gốc trước
  
  // Nếu gameId không có 'playmode-' prefix, thử thêm prefix
  if (!gameId.startsWith('playmode-')) {
    const withPrefix = `playmode-${gameId}`
    variants.push(withPrefix)
  }
  
  // Nếu gameId có 'playmode-' prefix, thử bỏ prefix
  if (gameId.startsWith('playmode-')) {
    const withoutPrefix = gameId.replace(/^playmode-/, '')
    variants.push(withoutPrefix)
  }
  
  return [...new Set(variants)] // Remove duplicates
}

async function fetchStaticGameMarkup(gameId) {
  const response = await fetch('games/game-list.html', { cache: 'no-cache' })
  if (!response.ok) throw new Error(`Failed to load static list (HTTP ${response.status})`)
  const markup = await response.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(markup, 'text/html')
  const root = doc.querySelector('[data-game-list]') || doc.body
  if (!gameId) return null
  const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(gameId) : gameId.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1')
  return root.querySelector(`#${escaped}`) || root.querySelector(`.game-card[data-game-id="${gameId}"]`)
}

// ✅ Refactor: Dùng registry thay vì hardcode
function guessTemplateFromId(gameId) {
  if (!gameId) return null
  
  // ✅ Special case: Rocket BNB (gameId format: playmode-rocket-bnb-XXX, template ID: rocket-bnb-template)
  if (gameId.startsWith('playmode-rocket-bnb-') || gameId.startsWith('rocket-bnb-')) {
    console.log(`[PLAY MODE V2] 🎯 Detected rocket-bnb-template from gameId: ${gameId}`)
    return 'rocket-bnb-template'
  }
  
  // ✅ Special case: Fallen Crypto (gameId format: playmode-fallen-crypto-XXX, template ID: fallen-crypto-template)
  if (gameId.startsWith('playmode-fallen-crypto-') || gameId.startsWith('fallen-crypto-')) {
    console.log(`[PLAY MODE V2] 🎯 Detected fallen-crypto-template from gameId: ${gameId}`)
    return 'fallen-crypto-template'
  }
  
  // ✅ Special case: Space Jump (gameId format: playmode-space-jump-XXX, template ID: space-jump-template)
  if (gameId.startsWith('playmode-space-jump-') || gameId.startsWith('space-jump-')) {
    console.log(`[PLAY MODE V2] 🎯 Detected space-jump-template from gameId: ${gameId}`)
    return 'space-jump-template'
  }
  
  // ✅ Special case: Shooter (gameId format: playmode-shooter-XXX, template ID: shooter-template)
  if (gameId.startsWith('playmode-shooter-') || gameId.startsWith('shooter-')) {
    console.log(`[PLAY MODE V2] 🎯 Detected shooter-template from gameId: ${gameId}`)
    return 'shooter-template'
  }
  
  // ✅ Special case: Arrow (gameId format: playmode-arrow-XXX, template ID: arrow-template)
  if (gameId.startsWith('playmode-arrow-') || gameId.startsWith('arrow-')) {
    console.log(`[PLAY MODE V2] 🎯 Detected arrow-template from gameId: ${gameId}`)
    return 'arrow-template'
  }
  
  // ✅ Special case: Draw Runner (gameId format: playmode-draw-runner-XXX, template ID: draw-runner-template)
  if (gameId.startsWith('playmode-draw-runner-') || gameId.startsWith('draw-runner-')) {
    console.log(`[PLAY MODE V2] 🎯 Detected draw-runner-template from gameId: ${gameId}`)
    return 'draw-runner-template'
  }
  
  // ✅ Special case: Knife Fix (gameId format: playmode-knife-fix-XXX, template ID: knife-fix-template)
  if (gameId.startsWith('playmode-knife-fix-') || gameId.startsWith('knife-fix-')) {
    console.log(`[PLAY MODE V2] 🎯 Detected knife-fix-template from gameId: ${gameId}`)
    return 'knife-fix-template'
  }
  
  // ✅ Loop qua tất cả templates trong registry
  for (const [templateId, config] of Object.entries(TEMPLATE_REGISTRY)) {
    if (config.enabled === false) continue
    
    // ✅ Check gameId pattern: playmode-{template-id}-XXX hoặc {template-id}-XXX
    // Ví dụ: playmode-pixel-shooter-035m hoặc pixel-shooter-035m
    const patterns = [
      `playmode-${templateId}-`,
      `${templateId}-`
    ]
    
    for (const pattern of patterns) {
      if (gameId.startsWith(pattern)) {
        console.log(`[PLAY MODE V2] 🎯 Detected template: ${templateId} from gameId: ${gameId}`)
        return templateId
      }
    }
  }
  
  // ✅ Fallback: Legacy templates (không có trong registry)
  if (gameId.startsWith('playmode-blocks-') || gameId.startsWith('blocks-')) return BLOCKS_TEMPLATE_ID
  if (gameId.startsWith('playmode-wall-bounce-bird-') || gameId.startsWith('wall-bounce-bird-')) return WALL_BOUNCE_BIRD_TEMPLATE_ID
  if (gameId.startsWith('playmode-blow-bubble-') || gameId.startsWith('blow-bubble-')) {
    console.log(`[PLAY MODE V2] 🎯 Detected blow-bubble game: ${gameId}`)
    return BLOW_BUBBLE_TEMPLATE_ID
  }
  if (gameId.startsWith('playmode-pacman-') || gameId.startsWith('pacman-')) return PACMAN_TEMPLATE_ID
  
  console.log(`[PLAY MODE V2] ⚠️ Could not guess template from gameId: ${gameId}`)
  return null
}

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
      } else if (['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
        parsed.protocol = window.location.protocol
        parsed.host = window.location.host
        final = parsed.toString()
      }
    } catch (_) {}
  } else {
    final = final.startsWith('/') ? `${baseUrl}${final}` : `${baseUrl}/${final}`
  }
  return final
}

// ✅ Refactor: Dùng registry thay vì hardcode
function defaultTemplatePath(templateId, gameId) {
  // ✅ 1. Lấy templateUrl từ registry
  const templateUrl = getTemplateUrl(templateId, gameId)
  if (templateUrl) return templateUrl
  
  // ✅ 2. Templates-v2 pattern: /games/templates-v2/{template-id}-template/index.html
  if (TEMPLATE_REGISTRY[templateId]) {
    return `/games/templates-v2/${templateId}-template/index.html?game=${gameId}`
  }
  
  // ✅ 3. Legacy templates (không có trong registry)
  const legacyPaths = {
    [BLOCKS_TEMPLATE_ID]: `/games/crypto-blocks/index.html?game=${gameId}`,
    [WALL_BOUNCE_BIRD_TEMPLATE_ID]: `/games/wall-bounce-bird/index.html?game=${gameId}`,
    [BLOW_BUBBLE_TEMPLATE_ID]: `/games/blow-bubble/index.html?game=${gameId}`
  }
  
  return legacyPaths[templateId] || `/games/templates-v2/pacman-template/index.html?game=${gameId}`
}

function buildTemplateUrl(templateId, gameId, suppliedUrl) {
  const baseUrl = window.location.origin.replace(/\/$/, '')
  const defaultPath = defaultTemplatePath(templateId, gameId)
  const sanitized = sanitizeTemplateUrl(suppliedUrl, defaultPath)

  // Blow-bubble correction: ensure path points to blow-bubble template
  if (templateId === BLOW_BUBBLE_TEMPLATE_ID && !sanitized.includes('/blow-bubble/')) {
    const corrected = `${baseUrl}${defaultPath}`
    if (corrected !== sanitized) {
      console.warn('[PLAY MODE] ⚠️ Corrected templateUrl from Supabase/localStorage:', {
        original: sanitized,
        corrected
      })
    }
    return corrected
  }

  return sanitized
}

// ✅ Refactor: Dùng registry thay vì hardcode
function normalizeGame(templateId, gameId, raw = {}, options = {}) {
  const source = options.source || 'supabase'
  const creatorFallback = options.creatorFallback || 'Creator'

  // ✅ Normalize template ID từ Supabase/Editor về registry ID
  const normalizedTemplateId = normalizeTemplateId(templateId)
  
  // ✅ Lấy template config từ registry (dùng normalized ID)
  const config = getTemplateConfig(normalizedTemplateId)
  const templateName = config?.displayName || normalizedTemplateId || 'MemePlay'

  // ✅ Legacy template checks (backward compatibility) - dùng normalized ID
  const isBlocks = normalizedTemplateId === BLOCKS_TEMPLATE_ID || templateId === BLOCKS_TEMPLATE_ID
  const isWall = normalizedTemplateId === WALL_BOUNCE_BIRD_TEMPLATE_ID || templateId === WALL_BOUNCE_BIRD_TEMPLATE_ID
  const isBubble = normalizedTemplateId === BLOW_BUBBLE_TEMPLATE_ID || templateId === BLOW_BUBBLE_TEMPLATE_ID

  // Stories
  let stories = []
  // ✅ Rocket BNB: Xử lý token_story (từ Supabase) hoặc tokenStory (từ localStorage)
  const isRocketBnb = normalizedTemplateId === 'rocket-bnb-template' || templateId === 'rocket-bnb-template' || templateId === 'rocket-bnb'
  if (isRocketBnb) {
    const tokenStory = raw.token_story || raw.tokenStory
    if (typeof tokenStory === 'string' && tokenStory.trim()) {
      stories = [tokenStory.trim()]
    }
  }
  
  // ✅ Space Jump: Xử lý storyText (từ localStorage) hoặc story_one (từ Supabase)
  const isSpaceJump = normalizedTemplateId === 'space-jump-template' || templateId === 'space-jump-template' || templateId === 'space-jump'
  if (isSpaceJump) {
    const storyText = raw.storyText || raw.story_one || raw.story_text
    if (typeof storyText === 'string' && storyText.trim()) {
      stories = [storyText.trim()]
    }
  }
  
  // ✅ Shooter: Xử lý storyText (từ localStorage) hoặc story_one (từ Supabase)
  const isShooter = normalizedTemplateId === 'shooter-template' || templateId === 'shooter-template' || templateId === 'shooter'
  if (isShooter) {
    const storyText = raw.storyText || raw.story_one || raw.story_text
    if (typeof storyText === 'string' && storyText.trim()) {
      stories = [storyText.trim()]
    }
  }
  
  if (!stories.length) {
    if (isBlocks || isWall || isBubble) {
      const story = raw.story || raw.story_one
      if (typeof story === 'string' && story.trim()) stories = [story.trim()]
    } else if (Array.isArray(raw.stories)) {
      stories = raw.stories
    } else if (typeof raw.stories === 'string') {
      try {
        const parsed = JSON.parse(raw.stories)
        if (Array.isArray(parsed)) stories = parsed
      } catch (_) {}
    }
    if (!stories.length) {
      const legacy = [raw.story_one, raw.story_two, raw.story_three].filter(
        (s) => typeof s === 'string' && s.trim() !== ''
      )
      stories = legacy
    }
  }

  // ✅ Colors: Lấy từ registry config hoặc fallback
  const defaultMapColor = config?.uiFields?.mapColor?.colors?.[0]?.value || 
    (isBlocks ? '#0a0a0a' : isWall ? '#87ceeb' : isBubble ? '#87CEEB' : '#1a1a2e')
  const mapColor = raw.mapColor || raw.map_color || defaultMapColor
  
  // ✅ Background Color: Chỉ cho wall-bounce-bird và blow-bubble - dùng normalized ID
  const needsBackgroundColor = ['wall-bounce-bird', 'blow-bubble'].includes(normalizedTemplateId)
  const backgroundColor = needsBackgroundColor 
    ? (raw.backgroundColor || raw.background_color || raw.map_color || mapColor)
    : undefined

  // ✅ Titles: Lấy từ registry hoặc fallback
  let title = raw.title || `${templateName} Game`
  // ✅ Rocket BNB: Nếu không có title, tạo từ token_story
  if (isRocketBnb && !raw.title && stories.length > 0) {
    title = `Rocket BNB – ${stories[0].slice(0, 24)}`
  }

  // Creator
  const creator =
    raw.creator_id || raw.creator_name || raw.creator || (source === 'local' ? creatorFallback : creatorFallback)

  // Counts
  const likes = raw.likes_count ?? raw.likes ?? 0
  const comments = raw.comments_count ?? raw.comments ?? 0
  const plays = raw.plays_count ?? raw.plays ?? 0

  // ✅ Fragment Logo URL: Xử lý đặc biệt cho Rocket BNB
  let fragmentLogoUrl = raw.fragmentLogoUrl || raw.fragment_logo_url || ''
  if (isRocketBnb && !fragmentLogoUrl) {
    // Rocket BNB: Ưu tiên game_over_logo_url, sau đó coin_logo_url
    fragmentLogoUrl = raw.game_over_logo_url || raw.gameOverLogoUrl || raw.coin_logo_url || raw.coinLogoUrl || ''
  }
  // ✅ Space Jump: Ưu tiên gameOverLogoUrl, sau đó headLogoUrl
  if (isSpaceJump && !fragmentLogoUrl) {
    fragmentLogoUrl = raw.game_over_logo_url || raw.gameOverLogoUrl || raw.head_logo_url || raw.headLogoUrl || ''
  }
  // ✅ Shooter: Ưu tiên logoUrl
  if (isShooter && !fragmentLogoUrl) {
    fragmentLogoUrl = raw.logo_url || raw.logoUrl || ''
  }
  // ✅ Dùng normalized template ID để build template URL
  const templateUrl = buildTemplateUrl(normalizedTemplateId, gameId, raw.templateUrl || raw.template_url)

  return {
    gameId,
    templateId: normalizedTemplateId, // ✅ Return normalized template ID
    title,
    creator,
    likes,
    comments,
    plays,
    stories,
    mapColor,
    backgroundColor,
    fragmentLogoUrl,
    templateUrl
  }
}

// ✅ Refactor: Dùng registry thay vì hardcode
function loadGameFromLocalStorage(gameId) {
  if (!gameId) return null
  
  try {
    // ✅ 1. Guess template từ gameId
    const templateId = guessTemplateFromId(gameId)
    if (!templateId) return null
    
    // ✅ 2. Lấy storage prefix từ registry hoặc legacy fallback
    let storagePrefix = getStoragePrefix(templateId)
    
    // ✅ Fallback: Legacy templates (không có trong registry)
    if (!storagePrefix) {
      const legacyPrefixes = {
        [BLOCKS_TEMPLATE_ID]: BLOCKS_STORAGE_PREFIX,
        [WALL_BOUNCE_BIRD_TEMPLATE_ID]: WALL_BOUNCE_BIRD_STORAGE_PREFIX,
        [BLOW_BUBBLE_TEMPLATE_ID]: BLOW_BUBBLE_STORAGE_PREFIX,
        [PACMAN_TEMPLATE_ID]: PACMAN_STORAGE_PREFIX
      }
      storagePrefix = legacyPrefixes[templateId]
    }
    
    if (!storagePrefix) {
      console.warn(`[PLAY MODE] No storage prefix found for template: ${templateId}`)
      return null
    }
    
    // ✅ 3. Load từ localStorage - thử tất cả variants của gameId (dùng chung cho TẤT CẢ templates)
    const gameIdVariants = getGameIdVariants(gameId)
    let raw = null
    let foundGameId = null
    
    for (const variant of gameIdVariants) {
      const storageKey = `${storagePrefix}${variant}`
      raw = localStorage.getItem(storageKey)
      if (raw) {
        foundGameId = variant
        console.log(`[PLAY MODE] ✅ Found game in localStorage with variant: ${variant} (original: ${gameId})`)
        break
      }
    }
    
    if (!raw) {
      console.log(`[PLAY MODE] Game not found in localStorage for variants: ${gameIdVariants.join(', ')}`)
      return null
    }
    
    // Use foundGameId for consistency (nếu có variant match)
    const actualGameId = foundGameId || gameId
    
    const config = JSON.parse(raw)
    
    // ✅ 4. Build game data object
    const gameData = {
      title: config.title,
      stories: config.stories,
      mapColor: config.mapColor,
      backgroundColor: config.backgroundColor,
      fragmentLogoUrl: config.fragmentLogoUrl,
      templateUrl: config.templateUrl || config.template_url
    }
    
    // ✅ Legacy: Một số templates dùng `story` thay vì `stories`
    if (!gameData.stories && config.story) {
      gameData.story = config.story
      if (typeof config.story === 'string') {
        gameData.title = config.title || `${templateId} – ${config.story.slice(0, 24)}`
      }
    }
    
    // ✅ Rocket BNB: Hỗ trợ tokenStory, coinLogoUrl, gameOverLogoUrl
    if (templateId === 'rocket-bnb-template' || templateId === 'rocket-bnb') {
      if (config.tokenStory) {
        gameData.stories = [config.tokenStory]
        if (!gameData.title) {
          gameData.title = config.title || `Rocket BNB – ${config.tokenStory.slice(0, 24)}`
        }
      }
      // Rocket BNB dùng gameOverLogoUrl làm fragmentLogoUrl (fallback)
      if (config.gameOverLogoUrl && !gameData.fragmentLogoUrl) {
        gameData.fragmentLogoUrl = config.gameOverLogoUrl
      } else if (config.coinLogoUrl && !gameData.fragmentLogoUrl) {
        gameData.fragmentLogoUrl = config.coinLogoUrl
      }
    }
    
    // ✅ Space Jump: Hỗ trợ storyText, headLogoUrl, gameOverLogoUrl
    if (templateId === 'space-jump-template' || templateId === 'space-jump') {
      if (config.storyText) {
        gameData.stories = [config.storyText]
        if (!gameData.title) {
          gameData.title = config.title || `Space Jump – ${config.storyText.slice(0, 24)}`
        }
      }
      // Space Jump dùng gameOverLogoUrl hoặc headLogoUrl làm fragmentLogoUrl
      if (config.gameOverLogoUrl && !gameData.fragmentLogoUrl) {
        gameData.fragmentLogoUrl = config.gameOverLogoUrl
      } else if (config.headLogoUrl && !gameData.fragmentLogoUrl) {
        gameData.fragmentLogoUrl = config.headLogoUrl
      }
    }
    
    // ✅ Shooter: Hỗ trợ storyText, logoUrl
    if (templateId === 'shooter-template' || templateId === 'shooter') {
      if (config.storyText) {
        gameData.stories = [config.storyText]
        if (!gameData.title) {
          gameData.title = config.title || `Shooter – ${config.storyText.slice(0, 24)}`
        }
      }
      // Shooter dùng logoUrl làm fragmentLogoUrl
      if (config.logoUrl && !gameData.fragmentLogoUrl) {
        gameData.fragmentLogoUrl = config.logoUrl
      }
    }
    
    // ✅ Legacy: Pacman có creator_id riêng
    if (templateId === PACMAN_TEMPLATE_ID || templateId === 'pacman') {
      const creatorId = localStorage.getItem('pacman_creator_id') || 'Creator'
      gameData.creator = creatorId
      gameData.creator_id = creatorId
    }
    
    // ✅ 5. Normalize game data (dùng actualGameId nếu có variant match)
    // ✅ Normalize template ID trước khi pass vào normalizeGame()
    const normalizedTemplateId = normalizeTemplateId(templateId)
    const configObj = getTemplateConfig(normalizedTemplateId)
    return normalizeGame(normalizedTemplateId, actualGameId, gameData, {
      source: 'local',
      creatorFallback: configObj?.displayName || normalizedTemplateId
    })
  } catch (error) {
    console.warn('[PLAY MODE] Failed to read local game config:', error)
    return null
  }
}

// ✅ Refactor: Dùng registry thay vì hardcode
async function fetchGameFromSupabase(gameId) {
  if (!gameId) return null
  
  // ✅ 1. Guess template từ gameId
  const guessedTemplate = guessTemplateFromId(gameId)
  
  // ✅ 2. Template ID variants mapping (registry ID ↔ editor ID)
  // Editor saves to Supabase with '-template' suffix, registry uses short ID
  const templateIdVariants = {
    'pixel-shooter': ['pixel-shooter', 'pixel-shooter-template'],
    'pacman': ['pacman', 'pacman-template'],
    'blocks-8x8': ['blocks-8x8', 'blocks-8x8-template'],
    'wall-bounce-bird': ['wall-bounce-bird', 'wall-bounce-bird-template'],
    'blow-bubble': ['blow-bubble', 'blow-bubble-template'],
    'rocket-bnb-template': ['rocket-bnb-template', 'rocket-bnb'],
    'rocket-bnb': ['rocket-bnb-template', 'rocket-bnb'],
    'fallen-crypto-template': ['fallen-crypto-template', 'fallen-crypto'],
    'fallen-crypto': ['fallen-crypto-template', 'fallen-crypto'],
    'space-jump-template': ['space-jump-template', 'space-jump'],
    'space-jump': ['space-jump-template', 'space-jump'],
    'shooter-template': ['shooter-template', 'shooter'],
    'shooter': ['shooter-template', 'shooter'],
    'draw-runner-template': ['draw-runner-template', 'draw-runner'],
    'draw-runner': ['draw-runner-template', 'draw-runner']
  }
  
  // ✅ 3. OPTIMIZED: Smart template prioritization
  let templateCandidates = []
  
  if (guessedTemplate) {
    // ✅ Nếu guess được: chỉ check guessed template + 1 editor variant
    templateCandidates = [guessedTemplate]
    if (templateIdVariants[guessedTemplate]) {
      // Thêm editor variant (khác với registry ID)
      const variants = templateIdVariants[guessedTemplate]
      const editorVariant = variants.find(v => v !== guessedTemplate)
      if (editorVariant) {
        templateCandidates.push(editorVariant)
      }
    }
  } else {
    // ✅ Nếu không guess được: chỉ check các templates quan trọng nhất
    // Priority: Pacman, Pixel Shooter, Rocket BNB, Fallen Crypto, Space Jump, Shooter
    templateCandidates = [
      PACMAN_TEMPLATE_ID,
      PIXEL_SHOOTER_TEMPLATE_ID,
      'rocket-bnb-template',
      'fallen-crypto-template',
      'space-jump-template',
      'shooter-template',
      // Thêm editor variants cho các templates này
      'pacman-template',
      'pixel-shooter-template',
      'rocket-bnb',
      'fallen-crypto',
      'space-jump',
      'shooter'
    ]
  }
  
  // Remove duplicates
  templateCandidates = [...new Set(templateCandidates)]

  for (const templateId of templateCandidates) {
    try {
      console.log(`[PLAY MODE] 🔍 Checking Supabase template: ${templateId} for game: ${gameId}`)
      const { data, error } = await supabase.rpc('list_user_created_games', { p_template_id: templateId })
      if (error) {
        console.warn(`[PLAY MODE] Supabase RPC failed (${templateId}):`, error.message || error)
        continue
      }
      if (!Array.isArray(data)) {
        console.log(`[PLAY MODE] ⚠️ Supabase returned non-array for ${templateId}`)
        continue
      }
      console.log(`[PLAY MODE] 📋 Found ${data.length} games in template ${templateId}`)
      // Log all game IDs found for debugging
      const normalizeId = (id) => (id || '').trim().toLowerCase()
      const foundGameIds = data
        .map(item => item?.game_id || item?.id || item?.gameId)
        .filter(Boolean)
      console.log(`[PLAY MODE] 📋 Game IDs found in Supabase:`, foundGameIds)
      
      // ✅ OPTIMIZED: Chỉ thử 2 variants quan trọng nhất (bỏ -probe suffix)
      // Variant 1: gameId gốc
      // Variant 2: với/không có playmode- prefix
      const gameIdVariants = []
      gameIdVariants.push(gameId) // Luôn thử gốc trước
      
      // Thêm variant với/không có playmode- prefix
      if (gameId.startsWith('playmode-')) {
        const withoutPrefix = gameId.replace(/^playmode-/, '')
        if (withoutPrefix !== gameId) {
          gameIdVariants.push(withoutPrefix)
        }
      } else {
        const withPrefix = `playmode-${gameId}`
        gameIdVariants.push(withPrefix)
      }
      
      // Remove duplicates
      const uniqueVariants = [...new Set(gameIdVariants)]
      console.log(`[PLAY MODE] 🔍 Looking for game ID variants: ${uniqueVariants.join(', ')}`)
      
      let match = null
      let matchedGameId = null
      
      // ✅ OPTIMIZED: Early return khi tìm thấy
      for (const variant of uniqueVariants) {
        match = data.find(item => {
          const itemId = item?.game_id || item?.id || item?.gameId
          return normalizeId(itemId) === normalizeId(variant)
        })
        if (match) {
          matchedGameId = variant
          console.log(`[PLAY MODE] ✅ Found game ${variant} in template ${templateId} (original: ${gameId})`)
          break
        }
      }
      
      // ✅ OPTIMIZED: Bỏ fallback logic (không dùng record đầu tiên nếu không match)
      if (!match) {
        console.log(`[PLAY MODE] ⚠️ Game variants ${uniqueVariants.join(', ')} not found in template ${templateId}`)
        console.log(`[PLAY MODE] ⚠️ Available game IDs: ${foundGameIds.join(', ')}`)
        continue // Check template tiếp theo
      }

      // ✅ Normalize template ID trước khi pass vào normalizeGame()
      // Supabase có thể trả về 'pixel-shooter-template', cần normalize về 'pixel-shooter'
      const normalizedId = normalizeTemplateId(templateId)
      return normalizeGame(normalizedId, matchedGameId || gameId, match, { source: 'supabase', creatorFallback: 'Creator' })
    } catch (err) {
      console.error('[PLAY MODE] Supabase fetch error:', err)
    }
  }
  return null
}

// ✅ Refactor: Dùng registry và hỗ trợ pixel-shooter
function buildUserGameCard(game) {
  const templateId = game.templateId || PACMAN_TEMPLATE_ID
  const config = getTemplateConfig(templateId)
  
  // ✅ Legacy template checks (backward compatibility)
  const isBlocks = templateId === BLOCKS_TEMPLATE_ID || game.gameId.startsWith('blocks-') || game.gameId.startsWith('playmode-blocks-')
  const isWallBounceBird = templateId === WALL_BOUNCE_BIRD_TEMPLATE_ID || game.gameId.startsWith('wall-bounce-bird-') || game.gameId.startsWith('playmode-wall-bounce-bird-')
  const isBlowBubble = templateId === BLOW_BUBBLE_TEMPLATE_ID || game.gameId.startsWith('blow-bubble-') || game.gameId.startsWith('playmode-blow-bubble-')
  
  const card = document.createElement('div')
  card.className = 'game-card play-mode-card'
  card.id = game.gameId
  card.dataset.gameId = game.gameId
  card.dataset.userCreated = 'true'
  card.dataset.templateId = templateId

  const templateUrl = buildTemplateUrl(game.templateId || PACMAN_TEMPLATE_ID, game.gameId, game.templateUrl)
  if (!templateUrl) return null
  const cacheBuster = templateUrl.includes('?') ? '&' : '?'
  const iframeSrc = `${templateUrl}${cacheBuster}v=${Date.now()}`

  card.innerHTML = `
    <div class="game-stage">
      <iframe
        data-game-url="${templateUrl}"
        src="${iframeSrc}"
        width="720"
        height="1000"
        frameborder="0"
        scrolling="no"
        allow="autoplay; fullscreen; gamepad"
        title="${game.title || 'MemePlay Game'}">
      </iframe>
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
        Creator: <strong>${game.creator || 'Creator'}</strong>
      </div>
    </footer>
  `

  // ✅ PostMessage config: Cho legacy templates và Templates V2 with UPDATE_CONFIG
  const legacyTemplates = [BLOCKS_TEMPLATE_ID, WALL_BOUNCE_BIRD_TEMPLATE_ID, BLOW_BUBBLE_TEMPLATE_ID]
  const templatesV2WithPostMessage = ['space-jump-template', 'shooter-template']
  const needsPostMessage = legacyTemplates.includes(templateId) || templatesV2WithPostMessage.includes(templateId)
  
  if (needsPostMessage) {
    const iframe = card.querySelector('iframe')
    if (iframe) {
      const messageTypes = {
        [BLOCKS_TEMPLATE_ID]: 'CRYPTO_BLOCKS_CONFIG',
        [WALL_BOUNCE_BIRD_TEMPLATE_ID]: 'WALL_BOUNCE_BIRD_CONFIG',
        [BLOW_BUBBLE_TEMPLATE_ID]: 'BLOW_BUBBLE_CONFIG',
        'space-jump-template': 'UPDATE_CONFIG',
        'shooter-template': 'UPDATE_CONFIG'
      }
      
      let payload
      if (templateId === 'space-jump-template') {
        // Space Jump uses UPDATE_CONFIG format
        payload = {
          type: 'UPDATE_CONFIG',
          config: {
            headLogoUrl: game.fragmentLogoUrl || '',
            gameOverLogoUrl: game.fragmentLogoUrl || '',
            storyText: Array.isArray(game.stories) && game.stories.length > 0 ? game.stories[0] : 'memeplay'
          }
        }
      } else if (templateId === 'shooter-template') {
        // Shooter uses UPDATE_CONFIG format
        payload = {
          type: 'UPDATE_CONFIG',
          config: {
            logoUrl: game.fragmentLogoUrl || '',
            storyText: Array.isArray(game.stories) && game.stories.length > 0 ? game.stories[0] : 'memeplay',
            mapColor: game.mapColor || '#1a1a2e'
          }
        }
      } else {
        payload = {
          type: messageTypes[templateId],
          payload: {
            story: Array.isArray(game.stories) && game.stories.length > 0 ? game.stories[0] : '',
            mapColor: game.mapColor || game.backgroundColor || '#1a1a2e',
            backgroundColor: game.backgroundColor || game.mapColor || '#87ceeb',
            logoUrl: game.fragmentLogoUrl || ''
          }
        }
      }
      
      const sendConfig = () => {
        try {
          iframe.contentWindow?.postMessage(payload, '*')
        } catch (err) {
          console.warn(`[PLAY MODE] ${templateId} config postMessage failed:`, err)
        }
      }
      
      iframe.addEventListener('load', () => {
        sendConfig()
        setTimeout(sendConfig, 300)
      })
    }
  }

  return card
}

function markCardActive(card) {
  card.dataset.gameState = 'active'
  card.classList.add('is-playing', 'state-active')
  card.classList.remove('state-hidden', 'state-waiting')
}

function ensureIconCount(wrapper) {
  if (!wrapper) return null
  let badge = wrapper.querySelector('.icon-count')
  if (!badge) {
    badge = document.createElement('span')
    badge.className = 'icon-count'
    badge.textContent = '0'
    wrapper.appendChild(badge)
  }
  return badge
}

function setPlaysLabel(card, gameId, totalPlays = 0) {
  const creator = card.querySelector('.creator-text')
  if (!creator) return
  let span = creator.querySelector('[data-plays-count]')
  if (!span) {
    creator.appendChild(document.createTextNode(' • '))
    span = document.createElement('span')
    span.dataset.playsCount = gameId
    creator.appendChild(span)
  }
  span.textContent = `${totalPlays} plays`
}

function renderHeartState(card, gameId, isLiked) {
  const likeWrapper = card.querySelector('.icon-wrapper[data-role="like"]')
  const likeBtn = likeWrapper?.querySelector('button')
  if (!likeBtn || !likeWrapper) return
  likeWrapper.classList.toggle('liked', !!isLiked)
  likeBtn.setAttribute('aria-pressed', isLiked ? 'true' : 'false')
}

async function hydrateSocialCounts(gameId, card) {
  if (!gameId || !card) return
  try {
    // ✅ Initialize to 0 first (for new games)
    const likeWrapper = card.querySelector('.icon-wrapper[data-role="like"]')
    const commentWrapper = card.querySelector('.icon-wrapper[data-role="comment"]')
    const likeCountEl = ensureIconCount(likeWrapper)
    const commentCountEl = ensureIconCount(commentWrapper)
    
    // ✅ Reset to 0 first to avoid showing cached data
    if (likeCountEl) likeCountEl.textContent = '0'
    if (commentCountEl) commentCountEl.textContent = '0'
    setPlaysLabel(card, gameId, 0)

    const [socialRes, playsRes] = await Promise.allSettled([
      supabase.rpc('get_social_counts', { p_game_id: gameId }),
      supabase.rpc('get_game_play_count', { p_game_id: gameId })
    ])

    // ✅ Only update if RPC returns valid data (not from cache/old game)
    if (socialRes.status === 'fulfilled' && !socialRes.value.error) {
      const data = socialRes.value.data || {}
      // Verify data is for this specific gameId (not cached)
      if (data && typeof data.likes === 'number') {
        if (likeCountEl) likeCountEl.textContent = String(Math.max(0, data.likes))
      }
      if (data && typeof data.comments === 'number') {
        if (commentCountEl) commentCountEl.textContent = String(Math.max(0, data.comments))
      }
    }

    if (playsRes.status === 'fulfilled' && !playsRes.value.error) {
      const totalPlays = (playsRes.value.data && typeof playsRes.value.data.total_plays === 'number') 
        ? Math.max(0, playsRes.value.data.total_plays) 
        : 0
      setPlaysLabel(card, gameId, totalPlays)
    }

    const localLiked = localStorage.getItem('mp_like_' + gameId) === '1'
    renderHeartState(card, gameId, localLiked)
  } catch (error) {
    console.warn('[PLAY MODE] hydrateSocialCounts failed:', error)
  }
}

function setupLikeHandler(card, gameId) {
  const likeWrapper = card.querySelector('.icon-wrapper[data-role="like"]')
  const likeBtn = likeWrapper?.querySelector('button')
  if (!likeBtn) return
  const likeCountEl = ensureIconCount(likeWrapper)

  likeBtn.addEventListener('click', async () => {
    likeBtn.disabled = true
    try {
      const { data, error } = await supabase.rpc('toggle_like', {
        p_user_id: userId,
        p_game_id: gameId
      })
      if (error) throw error
      const isLiked = !!(data && (data.is_liked ?? data.liked))
      const totalLikes = (data && (data.total_likes ?? data.likes)) ?? null
      localStorage.setItem('mp_like_' + gameId, isLiked ? '1' : '0')
      renderHeartState(card, gameId, isLiked)
      if (likeCountEl && totalLikes != null) {
        likeCountEl.textContent = String(Math.max(0, totalLikes))
      }
    } catch (err) {
      console.error('[PLAY MODE] toggle_like failed:', err)
    } finally {
      likeBtn.disabled = false
    }
  })
}

const commentsState = {
  gameId: null,
  offset: 0,
  limit: 10,
  loading: false,
  done: false
}

function shortAddr(addr) {
  if (!addr) return ''
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}

function renderCommentRow(row) {
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
  return item
}

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
      commentsList.appendChild(renderCommentRow(row))
    })
    commentsState.offset += rows.length
  } catch (err) {
    console.error('[PLAY MODE] list_comments failed:', err)
  } finally {
    commentsState.loading = false
  }
}

function closeCommentsOverlay() {
  commentsOverlay?.classList.remove('open')
}

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
}

commentsCloseBtn?.addEventListener('click', closeCommentsOverlay)
commentsOverlay?.addEventListener('click', (event) => {
  if (event.target === commentsOverlay) closeCommentsOverlay()
})
commentsLoadMoreBtn?.addEventListener('click', loadMoreComments)
commentsPostBtn?.addEventListener('click', async () => {
  const text = commentsTextarea.value.trim()
  if (!text || !commentsState.gameId) return
  commentsPostBtn.disabled = true
  try {
    const { error } = await supabase.rpc('add_comment', {
      p_user_id: userId,
      p_game_id: commentsState.gameId,
      p_text: text
    })
    if (error) throw error
    commentsList.prepend(renderCommentRow({
      user_id: userId,
      created_at: new Date().toISOString(),
      text
    }))
    commentsTextarea.value = ''
    commentsState.offset += 1
    commentsState.done = false
  } catch (err) {
    console.error('[PLAY MODE] add_comment failed:', err)
  } finally {
    commentsPostBtn.disabled = false
  }
})

function setupCommentHandler(card, gameId) {
  const commentBtn = card.querySelector('.icon-wrapper[data-role="comment"] button')
  if (!commentBtn) return
  commentBtn.addEventListener('click', () => openCommentsOverlay(gameId))
}

function bindSocialInteractions(card, gameId) {
  setupLikeHandler(card, gameId)
  setupCommentHandler(card, gameId)
  const shareBtn = card.querySelector('.icon-wrapper[data-role="share"] button')
  if (shareBtn) {
    shareBtn.addEventListener('click', (event) => {
      event.preventDefault()
      openShareOverlay(gameId)
    })
  }
  const leaderboardBtn = card.querySelector('.icon-wrapper[data-role="leaderboard"] button')
  if (leaderboardBtn) {
    leaderboardBtn.addEventListener('click', () => openLeaderboardOverlay(gameId))
  }
}

// ✅ Refactor: Dùng registry thay vì hardcode
function updateDocumentTitle(card) {
  const templateId = card?.dataset?.templateId
  const config = getTemplateConfig(templateId)
  const templateName = config?.displayName || templateId || 'MemePlay'
  document.title = `${templateName} – MemePlay`
}

async function renderGameCard(gameId) {
  setLoaderVisible(true)
  hideError()
  if (!gameId) {
    showError('Missing game id in URL.')
    setLoaderVisible(false)
    return
  }

  console.log(`[PLAY MODE] 🔍 Loading game: ${gameId}`)

  try {
    const staticCard = await fetchStaticGameMarkup(gameId)
    if (staticCard) {
      console.log(`[PLAY MODE] ✅ Found in static list: ${gameId}`)
      const cloned = staticCard.cloneNode(true)
      cloned.classList.add('play-mode-card')
      markCardActive(cloned)
      const iframe = cloned.querySelector('iframe')
      if (iframe) {
        const dataUrl = iframe.getAttribute('data-game-url') || iframe.src
        if (dataUrl) {
          const sep = dataUrl.includes('?') ? '&' : '?'
          iframe.src = `${dataUrl}${sep}v=${Date.now()}`
          iframe.removeAttribute('loading')
        }
      }
      bindSocialInteractions(cloned, gameId)
      cardHost.innerHTML = ''
      cardHost.appendChild(cloned)
      updateDocumentTitle(cloned)
      await hydrateSocialCounts(gameId, cloned)
      setLoaderVisible(false)
      // ✅ Update URL to short link after game loads successfully
      updateUrlToShortLink(gameId)
      return
    }

    const localGame = loadGameFromLocalStorage(gameId)
    if (localGame) {
      console.log(`[PLAY MODE] ✅ Found in localStorage: ${gameId}`)
      const card = buildUserGameCard(localGame)
      if (!card) throw new Error('Failed to render local game.')
      markCardActive(card)
      bindSocialInteractions(card, gameId)
      cardHost.innerHTML = ''
      cardHost.appendChild(card)
      updateDocumentTitle(card, localGame.title)
      await hydrateSocialCounts(gameId, card)
      setLoaderVisible(false)
      // ✅ Update URL to short link after game loads successfully
      updateUrlToShortLink(gameId)
      return
    }
    console.log(`[PLAY MODE] ⚠️ Not found in localStorage, checking Supabase...`)

    const remoteGame = await fetchGameFromSupabase(gameId)
    if (remoteGame) {
      console.log(`[PLAY MODE] ✅ Found in Supabase: ${gameId}`)
      const card = buildUserGameCard(remoteGame)
      if (!card) throw new Error('Unable to render remote game.')
      markCardActive(card)
      bindSocialInteractions(card, gameId)
      cardHost.innerHTML = ''
      cardHost.appendChild(card)
      updateDocumentTitle(card, remoteGame.title)
      await hydrateSocialCounts(gameId, card)
      setLoaderVisible(false)
      // ✅ Update URL to short link after game loads successfully
      updateUrlToShortLink(gameId)
      return
    }
    console.error(`[PLAY MODE] ❌ Game not found: ${gameId}`)
    console.error(`[PLAY MODE] Checked: static list, localStorage, Supabase`)
    
    // Provide helpful error message based on game type
    const isBlowBubble = gameId.startsWith('blow-bubble-')
    const isRocketBnb = gameId.startsWith('playmode-rocket-bnb-') || gameId.startsWith('rocket-bnb-')
    const isSpaceJump = gameId.startsWith('playmode-space-jump-') || gameId.startsWith('space-jump-')
    const isShooter = gameId.startsWith('playmode-shooter-') || gameId.startsWith('shooter-')
    const isArrow = gameId.startsWith('playmode-arrow-') || gameId.startsWith('arrow-')
    const isDrawRunner = gameId.startsWith('playmode-draw-runner-') || gameId.startsWith('draw-runner-')
    const isKnifeFix = gameId.startsWith('playmode-knife-fix-') || gameId.startsWith('knife-fix-')
    if (isBlowBubble || isRocketBnb || isSpaceJump || isShooter || isArrow || isDrawRunner || isKnifeFix) {
      console.error(`[PLAY MODE] 💡 Tip: Make sure you clicked "Save" button in the template editor to sync this game to Supabase.`)
      console.error(`[PLAY MODE] 💡 If you just created this game, go back to the editor and click "Save" again.`)
      console.error(`[PLAY MODE] 💡 Game ID: ${gameId}`)
      console.error(`[PLAY MODE] 💡 Template ID: ${guessTemplateFromId(gameId)}`)
    }

    throw new Error('Game not found in the catalog.')
  } catch (error) {
    console.error('[PLAY MODE] Render failed:', error)
    showError(error.message || 'Unable to load this game.')
  } finally {
    setLoaderVisible(false)
  }
}

// ✅ Timer and rewards tracking (like app.js)
let activeGame = null
let activeStartTime = 0
let progressInterval = null
let playCountIncremented = false // ✅ Flag to ensure play count is only incremented once per game session

function startGame(gameId) {
  if (activeGame && activeGame !== gameId) stopGame()
  clearInterval(progressInterval)
  progressInterval = null
  activeGame = gameId
  activeStartTime = Date.now()
  isGameOver = false // ✅ Reset flag when starting new game
  playCountIncremented = false // ✅ Reset play count flag for new game session
  console.log(`[PLAY MODE] ▶️ Game ${gameId} started`)
  
  const activeCard = document.querySelector(`.game-card[data-game-id="${gameId}"]`)
  if (activeCard) activeCard.classList.add('is-playing')
  
  // Update progress every 5 seconds
  progressInterval = setInterval(() => {
    if (!activeGame || !activeStartTime) return
    updateProgress()
  }, 5000)
  
  function updateProgress() {
    if (!activeGame || !activeStartTime) return
    const sessionSeconds = Math.max(0, Math.floor((Date.now() - activeStartTime) / 1000))
    const prevTotal = getGameSeconds(activeGame)
    const previewTotal = Math.min(prevTotal + sessionSeconds, MAX_ACCUM_SECONDS)
    
    // Check for threshold rewards during play
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
        console.log(`🎁 [PLAY MODE] Reward unlocked: +${grant} PLAY for ${last}s threshold!`)
        // ✅ Queue achievement to show after game over (không show ngay)
        showPlayAward(grant, `${last}s`, true)
      }
    }
    
    // ✅ PERFORMANCE: Removed frequent console.log (every 5s) to reduce lag when DevTools is open
    // Logic tính điểm vẫn hoạt động bình thường (lines 1165-1184)
  }
}

// ✅ Create confetti animation (giống homepage)
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

// ✅ Show achievement toast (giống homepage)
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

// ✅ Show PLAY reward (giống homepage - queue để show sau game over)
function showPlayAward(amount, label, isNewAchievement = false) {
  if (!amount || amount <= 0) return
  
  // ✅ Update total earned plays (giống homepage)
  const newTotal = lsGetInt('mp_total_earned_plays') + amount
  lsSetInt('mp_total_earned_plays', newTotal)
  
  // ✅ Header flash - ALWAYS SHOW for all rewards (giống V1)
  const headerFlash = document.getElementById('headerEarnedFlash')
  if (headerFlash) {
    headerFlash.textContent = `+${amount} PLAY${label ? ` for ${label}` : ''}`
    headerFlash.style.opacity = '1'
    setTimeout(() => {
      headerFlash.style.opacity = '0'
    }, 3000)
  }
  
  // ✅ If new achievement, QUEUE to show after game over (giống homepage)
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
    
    console.log(`🎖️ Achievement queued for ${activeGame}: ${achievementNames[threshold]} (+${amount} PLAY)`)
    console.log(`   → Pending achievements keys: ${Object.keys(pendingAchievements).join(', ')}`)
    console.log('   → Will show Toast after game over')
  }
}

// ✅ Show all pending achievements for a game (chỉ sau game over)
function showPendingAchievements(gameId) {
  // SECURITY: Only allow showing achievements after game over
  if (!isGameOver) {
    console.warn('⚠️ [SECURITY] showPendingAchievements called during gameplay - BLOCKED! Must wait for game over.')
    return
  }
  
  console.log(`[PLAY MODE] 🔍 Checking pending achievements for gameId: ${gameId}`)
  console.log(`[PLAY MODE] 📦 Available pendingAchievements keys:`, Object.keys(pendingAchievements))
  
  const achievements = pendingAchievements[gameId]
  if (!achievements || achievements.length === 0) {
    console.log(`[PLAY MODE] ⚠️ No pending achievements found for ${gameId}`)
    return
  }
  
  console.log(`🎉 Showing ${achievements.length} pending achievement(s) for ${gameId}`)
  
  // Sort by threshold (10 → 60 → 300)
  achievements.sort((a, b) => a.threshold - b.threshold)
  
  // Show each achievement with delay
  achievements.forEach((ach, index) => {
    setTimeout(() => {
      // 1. Fireworks explosion
      createConfetti()
      
      // 2. Toast center
      showAchievementToast(ach.name, ach.count, 3, ach.reward)
      
      console.log(`🎊 Achievement shown: ${ach.name} (+${ach.reward} PLAY)`)
    }, index * 2500) // Each achievement 2.5s apart
  })
  
  // Clear queue after showing
  delete pendingAchievements[gameId]
  
  // Reset flag after showing (for next game)
  setTimeout(() => {
    isGameOver = false
  }, achievements.length * 2500 + 1000)
}

async function stopGame() {
  if (!activeGame || !activeStartTime) return
  
  const seconds = Math.floor((Date.now() - activeStartTime) / 1000)
  if (seconds > 0) {
    console.log(`[PLAY MODE] ⏱ Played ${seconds}s on ${activeGame}`)
    
    // Calculate accumulated time and threshold rewards
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
    if (newlyAwarded.length) {
      setGameAwards(activeGame, awardedMap)
      let grant = 0
      for (const t of newlyAwarded) grant += REWARD_VALUES[t]
      if (grant > 0) {
        const last = newlyAwarded[newlyAwarded.length - 1]
        console.log(`🎁 [PLAY MODE] Rewards unlocked: +${grant} PLAY for thresholds: ${newlyAwarded.join(', ')}s`)
        // ✅ Queue achievement to show after game over (không show ngay)
        showPlayAward(grant, `${last}s`, true)
      }
    }
    
    // ✅ Track playtime and grant rewards in Supabase
    try {
      const { data, error } = await supabase.rpc('track_playtime_and_reward', {
        p_user_id: userId,
        p_game_id: activeGame,
        p_seconds: seconds
      })
      if (error) {
        console.warn('[PLAY MODE] track_playtime_and_reward error:', error)
      } else {
        console.log(`[PLAY MODE] 🎮 Playtime tracked: ${seconds}s, reward result:`, data)
      }
    } catch (err) {
      console.error('[PLAY MODE] track_playtime_and_reward error:', err)
    }
    
    // ✅ Increment play count if eligible (ONLY ONCE per game session)
    if (seconds >= 3 && !playCountIncremented) {
      playCountIncremented = true // ✅ Mark as incremented to prevent duplicate calls
      console.log(`[PLAY MODE] 📊 Incrementing play count for ${activeGame} (played ${seconds}s)`)
      try {
        const { data, error } = await supabase.rpc('increment_play_count', {
          p_user_id: userId,
          p_game_id: activeGame,
          p_seconds: seconds
        })
        if (error) {
          console.warn('[PLAY MODE] increment_play_count error:', error)
          playCountIncremented = false // ✅ Reset flag on error so it can be retried
        } else {
          const totalPlays = (data && typeof data.total_plays === 'number') ? data.total_plays : undefined
          if (totalPlays != null) {
            const card = document.querySelector(`.game-card[data-game-id="${activeGame}"]`)
            if (card) {
              setPlaysLabel(card, activeGame, totalPlays)
            }
            console.log(`[PLAY MODE] 📊 Play count updated: ${totalPlays} for ${activeGame} (1 play counted for ${seconds}s session)`)
          }
        }
      } catch (err) {
        console.error('[PLAY MODE] increment_play_count error:', err)
        playCountIncremented = false // ✅ Reset flag on error so it can be retried
      }
    } else if (seconds >= 3 && playCountIncremented) {
      console.log(`[PLAY MODE] ⚠️ Play count already incremented for this session (${seconds}s), skipping duplicate increment`)
    }
    
    // Update rewards panel if leaderboard is open
    if (leaderboardOverlay?.dataset.gameId === activeGame) {
      renderRewardsPanel(activeGame)
    }
  }
  
  clearInterval(progressInterval)
  progressInterval = null
  const gameId = activeGame
  activeGame = null
  activeStartTime = 0
  
  const activeCard = document.querySelector(`.game-card[data-game-id="${gameId}"]`)
  if (activeCard) activeCard.classList.remove('is-playing')
}

// Listen for GAME_START, GAME_OVER, and GAME_SCORE messages
window.addEventListener('message', async (event) => {
  // ✅ Handle GAME_START to start timer
  if (event.data?.type === 'GAME_START' && event.data?.gameId) {
    const { gameId } = event.data
    console.log(`[PLAY MODE] GAME_START received for ${gameId}`)
    console.log(`[PLAY MODE] Current activeGame: ${activeGame}`)
    startGame(gameId)
    return
  }
  
  // ✅ Handle GAME_OVER to stop timer and grant rewards
  if (event.data?.type === 'GAME_OVER' && event.data?.gameId) {
    const { gameId } = event.data
    console.log(`[PLAY MODE] GAME_OVER received for ${gameId}`)
    
    // ✅ Play game over sound for Blow Bubble (desktop + mobile)
    if (gameId.startsWith('blow-bubble-')) {
      unlockAudio() // Ensure audio is unlocked
      if (blowBubbleGameOverSound) {
        try {
          blowBubbleGameOverSound.currentTime = 0 // Reset to start
          await blowBubbleGameOverSound.play()
          console.log('[PLAY MODE] ✅ Played blow bubble game over sound')
        } catch (e) {
          console.warn('[PLAY MODE] Failed to play game over sound:', e)
        }
      }
    }
    
    // ✅ Set flag to allow showing achievements
    isGameOver = true
    
    // ✅ Store activeGame before stopGame() clears it
    // IMPORTANT: Use activeGame if it exists and matches, otherwise use gameId from message
    // This ensures we use the same gameId that was used to start the game
    const targetGameId = (activeGame && (activeGame === gameId || gameId === TEMPLATE_ID || activeGame.startsWith(gameId) || gameId.startsWith(activeGame))) ? activeGame : gameId
    console.log(`[PLAY MODE] GAME_OVER: activeGame=${activeGame}, gameId=${gameId}, targetGameId=${targetGameId}`)
    
    // ✅ Stop timer and grant rewards (uses activeGame internally)
    await stopGame()
    
    // ✅ Show pending achievements after game over (use stored gameId to match pendingAchievements key)
    setTimeout(() => {
      console.log(`[PLAY MODE] Showing pending achievements for: ${targetGameId}`)
      showPendingAchievements(targetGameId)
    }, 500) // Small delay to ensure game over UI is shown
    
    return
  }
  
  if (event.data?.type === 'GAME_SCORE') {
    const { gameId, score, level } = event.data
    if (!gameId || typeof score !== 'number') return

    // ✅ Fallback: Nếu game gửi score = 0 và có flag isGameOver, tự động trigger game over
    // (Một số game có thể gửi score = 0 khi game over thay vì GAME_OVER message)
    if (score === 0 && event.data?.isGameOver && !isGameOver) {
      console.log(`[PLAY MODE] Fallback: GAME_SCORE with isGameOver=true, triggering game over for ${gameId}`)
      isGameOver = true
      setTimeout(async () => {
        await stopGame()
        setTimeout(() => {
          showPendingAchievements(gameId)
        }, 500)
      }, 100)
    }

    const finalScore = Math.max(0, Math.trunc(score))
    console.log(`[PLAY MODE] Received score: ${finalScore} for ${gameId}`)

    try {
      const payload = {
        p_user_id: userId,
        p_game_id: gameId,
        p_score: finalScore,
        p_level: Number.isFinite(Number(level)) ? Math.max(1, Math.trunc(Number(level))) : 1
      }

      const { data, error } = await supabase.rpc('submit_game_score', payload)

      if (error) {
        console.error('[PLAY MODE] Score submission error:', error)
        return
      }

      let result = data
      if (Array.isArray(data)) {
        result = data.length > 0 ? data[0] : null
      }

      if (result && typeof result === 'object') {
        if (result.is_new_best) {
          console.log(`🏆 [PLAY MODE] New high score! Rank #${result.user_rank}/${result.total_players || 'N/A'}`)
        } else {
          console.log(`✓ [PLAY MODE] Score submitted. Best: ${result.best_score || 'N/A'}, Rank: #${result.user_rank || 'N/A'}`)
        }
      }
    } catch (err) {
      console.error('[PLAY MODE] Submit score error:', err)
    }
    
    // ✅ Stop timer and grant rewards when game ends
    await stopGame()
  }
})

// ✅ DISABLED: Keep long URL format instead of converting to short link
// Short links get redirected by Cloudflare and lose game ID
// Long URLs work reliably: /play-v2.html?game=playmode-xxx
function updateUrlToShortLink(gameId) {
  // Disabled: Keep long URL format to avoid Cloudflare redirect issues
  // if (!gameId || !gameId.startsWith('playmode-')) return
  // 
  // const currentPath = window.location.pathname
  // const currentSearch = window.location.search
  // const shortPath = `/${gameId}`
  // 
  // // Only update if currently on long URL format (has query param)
  // if (currentSearch.includes('game=') || currentPath.includes('play-v2.html')) {
  //   const newUrl = `${window.location.origin}${shortPath}`
  //   // Use replaceState to update URL without reload
  //   window.history.replaceState({ gameId }, '', newUrl)
  //   console.log(`[PLAY MODE] ✅ Updated URL to short link: ${newUrl}`)
  // }
  return // No-op: Keep long URL format
}

function initPlayMode() {
  const url = new URL(window.location.href)
  let gameFromQuery = normalizeId(url.searchParams.get('game') || '')
  
  // ✅ Parse game ID from hash: #game=playmode-xxx
  let gameFromHash = ''
  const hash = window.location.hash
  if (hash) {
    const hashMatch = hash.match(/#game=([^&]+)/i)
    if (hashMatch && hashMatch[1]) {
      gameFromHash = normalizeId(decodeURIComponent(hashMatch[1]))
    } else {
      // Fallback: try to parse hash directly (for backward compatibility)
      gameFromHash = normalizeId(hash.replace(/^#/, ''))
    }
  }
  
  // ✅ V2: Support short path /playmode-xxx (if server rewrite already handled)
  if (!gameFromQuery && !gameFromHash) {
    const pathMatch = window.location.pathname.match(/^\/(playmode-[^/]+)$/i)
    if (pathMatch) {
      gameFromQuery = pathMatch[1]
    }
  }
  
  const targetGameId = gameFromQuery || gameFromHash
  
  // ✅ V2: Don't replace URL immediately - wait for game to load successfully
  // This prevents "cannot get /playmode-xxx" error on reload
  
  renderGameCard(targetGameId)
}

// ✅ Focus Mode - Toggle footer visibility
let isFocusMode = false

function toggleFocusMode(force) {
  const next = typeof force === 'boolean' ? force : !isFocusMode
  isFocusMode = !!next
  document.body.classList.toggle('focus-mode', isFocusMode)
  
  // Notify iframe about focus mode change
  const iframes = document.querySelectorAll('iframe[data-game-url]')
  iframes.forEach(iframe => {
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'FOCUS_MODE_CHANGED',
        isFocus: isFocusMode
      }, '*')
    }
  })
  
  console.log(`[PLAY MODE] Focus mode ${isFocusMode ? 'ON' : 'OFF'}`)
}

// ✅ Handle TOGGLE_FOCUS_MODE message from game iframe
window.addEventListener('message', (event) => {
  if (event.data?.type === 'TOGGLE_FOCUS_MODE') {
    const { gameId } = event.data
    console.log('📥 [PLAY MODE] Received TOGGLE_FOCUS_MODE from iframe:', gameId)
    toggleFocusMode()
  }
})

document.addEventListener('DOMContentLoaded', initPlayMode)

