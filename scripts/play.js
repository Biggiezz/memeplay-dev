import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://iikckrcdrvnqctzacxgx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpa2NrcmNkcnZucWN0emFjeGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Mzc3NDgsImV4cCI6MjA3NzMxMzc0OH0.nIPvf11YfFlWH0XHDZdxI496zaP431QOJCuQ-5XX4DQ'
const PACMAN_TEMPLATE_ID = 'pacman-template'
const BLOCKS_TEMPLATE_ID = 'blocks-8x8'
const WALL_BOUNCE_BIRD_TEMPLATE_ID = 'wall-bounce-bird'
const PACMAN_STORAGE_PREFIX = 'pacman_brand_config_'
const BLOCKS_STORAGE_PREFIX = 'blocks_brand_config_'
const WALL_BOUNCE_BIRD_STORAGE_PREFIX = 'wall_bounce_bird_config_'

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
  return `${window.location.origin}/play.html?game=${encodeURIComponent(gameId)}`
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
    await navigator.clipboard.writeText(url)
    const original = shareCopyBtn.innerHTML
    shareCopyBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>Copied!</span>
    `
    setTimeout(() => {
      shareCopyBtn.innerHTML = original
    }, 1500)
  } catch (err) {
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
  if (gameId === 'wojak-btc-blast') return num + '%'
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

function guessTemplateFromId(gameId) {
  if (!gameId) return null
  if (gameId.startsWith('blocks-')) return BLOCKS_TEMPLATE_ID
  if (gameId.startsWith('wall-bounce-bird-')) return WALL_BOUNCE_BIRD_TEMPLATE_ID
  if (gameId.startsWith('pacman-')) return PACMAN_TEMPLATE_ID
  return null
}

function sanitizeTemplateUrl(url, fallbackPath = '') {
  const baseUrl = window.location.origin.replace(/\/$/, '')
  if (!url) return fallbackPath ? `${baseUrl}${fallbackPath}` : ''
  let final = url
  if (/^https?:\/\//i.test(final)) {
    try {
      const parsed = new URL(final)
      if (['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
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

function loadGameFromLocalStorage(gameId) {
  if (!gameId) return null
  try {
    if (gameId.startsWith('blocks-')) {
      const raw = localStorage.getItem(`${BLOCKS_STORAGE_PREFIX}${gameId}`)
      if (!raw) return null
      const config = JSON.parse(raw)
      return {
        gameId,
        templateId: BLOCKS_TEMPLATE_ID,
        title: config?.story ? `Blocks 8x8 – ${config.story.slice(0, 24)}` : 'Blocks 8x8 Game',
        creator: 'Blocks 8x8',
        likes: 0,
        comments: 0,
        plays: 0,
        stories: config?.story ? [config.story] : [],
        mapColor: config?.mapColor || '#0a0a0a',
        fragmentLogoUrl: config?.fragmentLogoUrl || '',
        templateUrl: `${window.location.origin.replace(/\/$/, '')}/games/crypto-blocks/index.html?game=${gameId}`
      }
    }
    if (gameId.startsWith('wall-bounce-bird-')) {
      const raw = localStorage.getItem(`${WALL_BOUNCE_BIRD_STORAGE_PREFIX}${gameId}`)
      if (!raw) return null
      const config = JSON.parse(raw)
      return {
        gameId,
        templateId: WALL_BOUNCE_BIRD_TEMPLATE_ID,
        title: config?.story ? `Wall Bounce Bird – ${config.story.slice(0, 24)}` : 'Wall Bounce Bird Game',
        creator: 'Wall Bounce Bird',
        likes: 0,
        comments: 0,
        plays: 0,
        stories: config?.story ? [config.story] : [],
        backgroundColor: config?.backgroundColor || '#87ceeb',
        fragmentLogoUrl: config?.fragmentLogoUrl || '',
        templateUrl: `${window.location.origin.replace(/\/$/, '')}/games/wall-bounce-bird/index.html?game=${gameId}`
      }
    }
    const raw = localStorage.getItem(`${PACMAN_STORAGE_PREFIX}${gameId}`)
    if (!raw) return null
    const config = JSON.parse(raw)
    if (!config?.title) return null
    return {
      gameId,
      templateId: PACMAN_TEMPLATE_ID,
      title: config.title,
      creator: config.title,
      likes: 0,
      comments: 0,
      plays: 0,
      stories: Array.isArray(config.stories) ? config.stories : [],
      mapColor: config.mapColor || '#1a1a2e',
      fragmentLogoUrl: config.fragmentLogoUrl || '',
      templateUrl: `${window.location.origin.replace(/\/$/, '')}/games/templates/pacman-template/index.html?game=${gameId}`
    }
  } catch (error) {
    console.warn('[PLAY MODE] Failed to read local game config:', error)
    return null
  }
}

async function fetchGameFromSupabase(gameId) {
  if (!gameId) return null
  const templateCandidates = guessTemplateFromId(gameId)
    ? [guessTemplateFromId(gameId)]
    : [PACMAN_TEMPLATE_ID, BLOCKS_TEMPLATE_ID, WALL_BOUNCE_BIRD_TEMPLATE_ID]

  for (const templateId of templateCandidates) {
    try {
      const { data, error } = await supabase.rpc('list_user_created_games', { p_template_id: templateId })
      if (error) {
        console.warn(`[PLAY MODE] Supabase RPC failed (${templateId}):`, error.message || error)
        continue
      }
      if (!Array.isArray(data)) continue
      const match = data.find(item => (item?.game_id || item?.id) === gameId)
      if (!match) continue

      const isBlocks = templateId === BLOCKS_TEMPLATE_ID
      const isWallBounceBird = templateId === WALL_BOUNCE_BIRD_TEMPLATE_ID
      const stories = (() => {
        if (isBlocks || isWallBounceBird) {
          const story = typeof match.story_one === 'string' ? match.story_one.trim() : ''
          return story ? [story] : []
        }
        if (Array.isArray(match.stories)) return match.stories
        if (typeof match.stories === 'string') {
          try {
            const parsed = JSON.parse(match.stories)
            if (Array.isArray(parsed)) return parsed
          } catch (_) {}
        }
        const legacy = [match.story_one, match.story_two, match.story_three]
          .filter(story => typeof story === 'string' && story.trim() !== '')
        return legacy
      })()

      const defaultPath = isBlocks
        ? `/games/crypto-blocks/index.html?game=${gameId}`
        : isWallBounceBird
        ? `/games/wall-bounce-bird/index.html?game=${gameId}`
        : `/games/templates/pacman-template/index.html?game=${gameId}`

      return {
        gameId,
        templateId,
        title: match.title || (isBlocks ? 'Blocks 8x8 Game' : isWallBounceBird ? 'Wall Bounce Bird Game' : 'Pacman Game'),
        creator: match.creator_name || match.creator_id || match.title || 'Creator',
        likes: match.likes_count ?? match.likes ?? 0,
        comments: match.comments_count ?? match.comments ?? 0,
        plays: match.plays_count ?? match.plays ?? 0,
        stories,
        mapColor: match.map_color || (isBlocks ? '#0a0a0a' : isWallBounceBird ? '#87ceeb' : '#1a1a2e'),
        backgroundColor: match.background_color || (isWallBounceBird ? '#87ceeb' : undefined),
        fragmentLogoUrl: match.fragment_logo_url || '',
        templateUrl: sanitizeTemplateUrl(match.template_url, defaultPath)
      }
    } catch (err) {
      console.error('[PLAY MODE] Supabase fetch error:', err)
    }
  }
  return null
}

function buildUserGameCard(game) {
  const isBlocks = game.templateId === BLOCKS_TEMPLATE_ID || game.gameId.startsWith('blocks-')
  const isWallBounceBird = game.templateId === WALL_BOUNCE_BIRD_TEMPLATE_ID || game.gameId.startsWith('wall-bounce-bird-')
  const card = document.createElement('div')
  card.className = 'game-card play-mode-card'
  card.id = game.gameId
  card.dataset.gameId = game.gameId
  card.dataset.userCreated = 'true'
  card.dataset.templateId = isBlocks ? BLOCKS_TEMPLATE_ID : isWallBounceBird ? WALL_BOUNCE_BIRD_TEMPLATE_ID : PACMAN_TEMPLATE_ID

  const defaultPath = isBlocks
    ? `/games/crypto-blocks/index.html?game=${game.gameId}`
    : isWallBounceBird
    ? `/games/wall-bounce-bird/index.html?game=${game.gameId}`
    : `/games/templates/pacman-template/index.html?game=${game.gameId}`
  const templateUrl = sanitizeTemplateUrl(game.templateUrl, defaultPath)
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
        Creator: <strong>${game.creator || 'Creator'}</strong>
      </div>
    </footer>
  `

  if (isBlocks) {
    const iframe = card.querySelector('iframe')
    if (iframe) {
      const payload = {
        type: 'CRYPTO_BLOCKS_CONFIG',
        payload: {
          story: Array.isArray(game.stories) && game.stories.length > 0 ? game.stories[0] : '',
          mapColor: game.mapColor || '#0a0a0a',
          logoUrl: game.fragmentLogoUrl || ''
        }
      }
      const sendConfig = () => {
        try {
          iframe.contentWindow?.postMessage(payload, '*')
        } catch (err) {
          console.warn('[PLAY MODE] Blocks config postMessage failed:', err)
        }
      }
      iframe.addEventListener('load', () => {
        sendConfig()
        setTimeout(sendConfig, 300)
      })
    }
  }

  if (isWallBounceBird) {
    const iframe = card.querySelector('iframe')
    if (iframe) {
      const payload = {
        type: 'WALL_BOUNCE_BIRD_CONFIG',
        payload: {
          story: Array.isArray(game.stories) && game.stories.length > 0 ? game.stories[0] : '',
          backgroundColor: game.backgroundColor || game.mapColor || '#87ceeb',
          logoUrl: game.fragmentLogoUrl || ''
        }
      }
      const sendConfig = () => {
        try {
          iframe.contentWindow?.postMessage(payload, '*')
        } catch (err) {
          console.warn('[PLAY MODE] Wall Bounce Bird config postMessage failed:', err)
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

function updateDocumentTitle(card, fallbackTitle) {
  const iframeTitle = card.querySelector('iframe')?.title?.trim()
  const title = iframeTitle || fallbackTitle || 'MemePlay – Play'
  document.title = title.includes('MemePlay') ? title : `${title} – MemePlay`
}

async function renderGameCard(gameId) {
  setLoaderVisible(true)
  hideError()
  if (!gameId) {
    showError('Missing game id in URL.')
    setLoaderVisible(false)
    return
  }

  try {
    const staticCard = await fetchStaticGameMarkup(gameId)
    if (staticCard) {
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
      return
    }

    const localGame = loadGameFromLocalStorage(gameId)
    if (localGame) {
      const card = buildUserGameCard(localGame)
      if (!card) throw new Error('Failed to render local game.')
      markCardActive(card)
      bindSocialInteractions(card, gameId)
      cardHost.innerHTML = ''
      cardHost.appendChild(card)
      updateDocumentTitle(card, localGame.title)
      await hydrateSocialCounts(gameId, card)
      setLoaderVisible(false)
      return
    }

    const remoteGame = await fetchGameFromSupabase(gameId)
    if (remoteGame) {
      const card = buildUserGameCard(remoteGame)
      if (!card) throw new Error('Unable to render remote game.')
      markCardActive(card)
      bindSocialInteractions(card, gameId)
      cardHost.innerHTML = ''
      cardHost.appendChild(card)
      updateDocumentTitle(card, remoteGame.title)
      await hydrateSocialCounts(gameId, card)
      setLoaderVisible(false)
      return
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

function startGame(gameId) {
  if (activeGame && activeGame !== gameId) stopGame()
  clearInterval(progressInterval)
  progressInterval = null
  activeGame = gameId
  activeStartTime = Date.now()
  isGameOver = false // ✅ Reset flag when starting new game
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
    
    console.log(`[PLAY MODE] ⏳ ${activeGame}: session ${sessionSeconds}s · total ${previewTotal}/${MAX_ACCUM_SECONDS}s`)
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
    
    console.log(`🎖️ Achievement queued: ${achievementNames[threshold]} (+${amount} PLAY)`)
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
  
  const achievements = pendingAchievements[gameId]
  if (!achievements || achievements.length === 0) {
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
    
    // ✅ Increment play count if eligible
    if (seconds >= 3) {
      try {
        const { data, error } = await supabase.rpc('increment_play_count', {
          p_user_id: userId,
          p_game_id: activeGame,
          p_seconds: seconds
        })
        if (error) {
          console.warn('[PLAY MODE] increment_play_count error:', error)
        } else {
          const totalPlays = (data && typeof data.total_plays === 'number') ? data.total_plays : undefined
          if (totalPlays != null) {
            const card = document.querySelector(`.game-card[data-game-id="${activeGame}"]`)
            if (card) {
              setPlaysLabel(card, activeGame, totalPlays)
            }
            console.log(`[PLAY MODE] 📊 Play count updated: ${totalPlays} for ${activeGame}`)
          }
        }
      } catch (err) {
        console.error('[PLAY MODE] increment_play_count error:', err)
      }
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
    startGame(gameId)
    return
  }
  
  // ✅ Handle GAME_OVER to stop timer and grant rewards
  if (event.data?.type === 'GAME_OVER' && event.data?.gameId) {
    const { gameId } = event.data
    console.log(`[PLAY MODE] GAME_OVER received for ${gameId}`)
    
    // ✅ Set flag to allow showing achievements
    isGameOver = true
    
    // ✅ Stop timer and grant rewards
    await stopGame()
    
    // ✅ Show pending achievements after game over
    setTimeout(() => {
      showPendingAchievements(gameId)
    }, 500) // Small delay to ensure game over UI is shown
    
    return
  }
  
  if (event.data?.type === 'GAME_SCORE') {
    const { gameId, score, level } = event.data
    if (!gameId || typeof score !== 'number') return

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

function initPlayMode() {
  const url = new URL(window.location.href)
  const gameFromQuery = normalizeId(url.searchParams.get('game') || '')
  const gameFromHash = normalizeId(window.location.hash)
  const targetGameId = gameFromQuery || gameFromHash
  renderGameCard(targetGameId)
}

document.addEventListener('DOMContentLoaded', initPlayMode)

