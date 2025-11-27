import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://iikckrcdrvnqctzacxgx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpa2NrcmNkcnZucWN0emFjeGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Mzc3NDgsImV4cCI6MjA3NzMxMzc0OH0.nIPvf11YfFlWH0XHDZdxI496zaP431QOJCuQ-5XX4DQ'
const PACMAN_TEMPLATE_ID = 'pacman-template'
const BLOCKS_TEMPLATE_ID = 'blocks-8x8'
const PACMAN_STORAGE_PREFIX = 'pacman_brand_config_'
const BLOCKS_STORAGE_PREFIX = 'blocks_brand_config_'

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

function getGameAwards(gameId) {
  try {
    const raw = localStorage.getItem(`mp_game_awards_${gameId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
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
    : [PACMAN_TEMPLATE_ID, BLOCKS_TEMPLATE_ID]

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
      const stories = (() => {
        if (isBlocks) {
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
        : `/games/templates/pacman-template/index.html?game=${gameId}`

      return {
        gameId,
        templateId,
        title: match.title || (isBlocks ? 'Blocks 8x8 Game' : 'Pacman Game'),
        creator: match.creator_name || match.creator_id || match.title || 'Creator',
        likes: match.likes_count ?? match.likes ?? 0,
        comments: match.comments_count ?? match.comments ?? 0,
        plays: match.plays_count ?? match.plays ?? 0,
        stories,
        mapColor: match.map_color || (isBlocks ? '#0a0a0a' : '#1a1a2e'),
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
  const card = document.createElement('div')
  card.className = 'game-card play-mode-card'
  card.id = game.gameId
  card.dataset.gameId = game.gameId
  card.dataset.userCreated = 'true'
  card.dataset.templateId = isBlocks ? BLOCKS_TEMPLATE_ID : PACMAN_TEMPLATE_ID

  const defaultPath = isBlocks
    ? `/games/crypto-blocks/index.html?game=${game.gameId}`
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
    const likeWrapper = card.querySelector('.icon-wrapper[data-role="like"]')
    const commentWrapper = card.querySelector('.icon-wrapper[data-role="comment"]')

    const likeCountEl = ensureIconCount(likeWrapper)
    const commentCountEl = ensureIconCount(commentWrapper)

    const [socialRes, playsRes] = await Promise.allSettled([
      supabase.rpc('get_social_counts', { p_game_id: gameId }),
      supabase.rpc('get_game_play_count', { p_game_id: gameId })
    ])

    if (socialRes.status === 'fulfilled' && !socialRes.value.error) {
      const data = socialRes.value.data || {}
      if (likeCountEl) likeCountEl.textContent = String(Math.max(0, data.likes ?? 0))
      if (commentCountEl) commentCountEl.textContent = String(Math.max(0, data.comments ?? 0))
    }

    if (playsRes.status === 'fulfilled' && !playsRes.value.error) {
      const totalPlays = (playsRes.value.data && playsRes.value.data.total_plays) || 0
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

// Listen for GAME_SCORE messages from game iframes to save scores to leaderboard
window.addEventListener('message', async (event) => {
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

