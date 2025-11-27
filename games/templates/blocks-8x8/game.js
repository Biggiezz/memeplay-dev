const SUPABASE_URL = 'https://iikckrcdrvnqctzacxgx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpa2NrcmNkcnZucWN0emFjeGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Mzc3NDgsImV4cCI6MjA3NzMxMzc0OH0.nIPvf11YfFlWH0XHDZdxI496zaP431QOJCuQ-5XX4DQ';

let supabaseClientPromise = null;
let currentGameId = null;

function getBlocksFrame() {
  return document.getElementById('blocksGameFrame');
}

function sendConfigToGameFrame() {
  const frame = getBlocksFrame();
  if (!frame || !frame.contentWindow) {
    return;
  }
  const payload = {
    type: 'CRYPTO_BLOCKS_CONFIG',
    payload: {
      story: BRAND_CONFIG.story || '',
      mapColor: BRAND_CONFIG.mapColor || '#0a0a0a',
      logoUrl: BRAND_CONFIG.fragmentLogoUrl || ''
    }
  };
  frame.contentWindow.postMessage(payload, '*');
}

async function getSupabaseClient() {
  if (window.supabaseClient) return window.supabaseClient;
  if (supabaseClientPromise) return supabaseClientPromise;
  supabaseClientPromise = (async () => {
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
      if (client.realtime) {
        client.realtime.disconnect();
      }
      window.supabaseClient = client;
      return client;
    } catch (error) {
      console.error('[BlocksTemplate] Failed to create Supabase client:', error);
      return null;
    }
  })();
  return supabaseClientPromise;
}

function getCreatorIdentifier() {
  const key = 'blocks_creator_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'creator_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(key, id);
  }
  return id;
}

function isLocalEnvironment() {
  const origin = window.location.origin.toLowerCase();
  return origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.') || origin.includes('0.0.0.0');
}

function buildPublicLinkUrl(gameId = null) {
  let id = gameId;
  if (!id || id === 'null' || id === 'undefined') {
    id = generateBlocksGameId();
  }
  const baseUrl = window.location.origin.replace(/\/$/, '');
  return `${baseUrl}/play.html?game=${id}`;
}

async function syncGameToSupabase(gameId, context = 'manual-save') {
  if (isLocalEnvironment()) {
    console.warn('[BlocksTemplate] Local environment detected, skip Supabase sync');
    return false;
  }
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return false;

    const baseUrl = window.location.origin.replace(/\/$/, '');
    const templateUrl = `${baseUrl}/games/templates/blocks-8x8/index.html?game=${gameId}`;
    const publicUrl = buildPublicLinkUrl(gameId);

    const payload = {
      p_game_id: gameId,
      p_template_id: TEMPLATE_ID,
      p_title: 'Blocks 8x8',
      p_map_color: BRAND_CONFIG.mapColor || '#0a0a0a',
      p_map_index: 0,
      p_fragment_logo_url: BRAND_CONFIG.fragmentLogoUrl || null,
      p_story_one: BRAND_CONFIG.story || '',
      p_story_two: '',
      p_story_three: '',
      p_public_url: publicUrl,
      p_template_url: templateUrl,
      p_creator_id: getCreatorIdentifier(),
      p_context: context
    };

    const { error } = await supabase.rpc('upsert_user_created_game', payload);
    if (error) {
      console.error('[BlocksTemplate] Supabase sync failed:', error.message || error);
      return false;
    }
    console.log('[BlocksTemplate] Synced game to Supabase:', gameId);
    return true;
  } catch (error) {
    console.error('[BlocksTemplate] Unexpected Supabase error:', error);
    return false;
  }
}

async function loadBrandConfigFromSupabase(gameId) {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return false;
    const { data, error } = await supabase.rpc('list_user_created_games', {
      p_template_id: TEMPLATE_ID
    });
    if (error) {
      console.error('[BlocksTemplate] list_user_created_games error:', error.message || error);
      return false;
    }
    if (!Array.isArray(data)) return false;
    const found = data.find(item => (item.game_id || item.id) === gameId);
    if (!found) return false;
    BRAND_CONFIG = {
      ...BRAND_CONFIG,
      fragmentLogoUrl: found.fragment_logo_url || '',
      story: found.story_one || '',
      mapColor: found.map_color || '#0a0a0a'
    };
    saveBrandConfig(gameId);
    return true;
  } catch (error) {
    console.error('[BlocksTemplate] Failed to load config from Supabase:', error);
    return false;
  }
}

function updateStoryCounter() {
  const storyInput = document.getElementById('storyInput');
  const storyCount = document.getElementById('storyCount');
  if (!storyInput || !storyCount) return;
  storyCount.textContent = `${storyInput.value.length}/50`;
}

function updateColorButtons() {
  const buttons = document.querySelectorAll('.map-color-btn');
  buttons.forEach(btn => {
    const color = btn.getAttribute('data-color');
    btn.setAttribute('aria-pressed', color === BRAND_CONFIG.mapColor ? 'true' : 'false');
  });
}

function setLogoPreview(url) {
  const preview = document.getElementById('logoPreview');
  if (!preview) return;
  if (url) {
    preview.src = url;
    preview.classList.add('show');
  } else {
    preview.src = '';
    preview.classList.remove('show');
  }
}

function updateEditorFields() {
  const storyInput = document.getElementById('storyInput');
  if (storyInput) {
    storyInput.value = BRAND_CONFIG.story || '';
  }
  updateStoryCounter();
  updateColorButtons();
  setLogoPreview(BRAND_CONFIG.fragmentLogoUrl);
}

function handleStoryChange(event) {
  BRAND_CONFIG.story = event.target.value.slice(0, 50);
  updateStoryCounter();
  sendConfigToGameFrame();
}

function handleColorClick(event) {
  const color = event.currentTarget.getAttribute('data-color');
  BRAND_CONFIG.mapColor = color;
  updateColorButtons();
  sendConfigToGameFrame();
}

function handleTemplateSelectChange(event) {
  const value = event.target.value;
  if (value === 'pacman') {
    const currentId = currentGameId || getBlocksGameId();
    const baseUrl = window.location.origin.replace(/\/$/, '');
    const targetUrl = currentId
      ? `${baseUrl}/games/templates/pacman-template/index.html?game=${currentId}`
      : `${baseUrl}/games/templates/pacman-template/index.html`;
    window.location.href = targetUrl;
  }
}

function processLogoFile(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert('Please choose an image under 5MB.');
    return;
  }
  const loading = document.getElementById('logoLoading');
  if (loading) loading.style.display = 'block';
  const reader = new FileReader();
  reader.onload = () => {
    BRAND_CONFIG.fragmentLogoUrl = reader.result;
    setLogoPreview(BRAND_CONFIG.fragmentLogoUrl);
    sendConfigToGameFrame();
    if (loading) loading.style.display = 'none';
  };
  reader.onerror = () => {
    console.error('[BlocksTemplate] Failed to read logo file');
    if (loading) loading.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function ensureGameId() {
  if (currentGameId) return currentGameId;
  const saved = localStorage.getItem('blocks_last_saved_game_id');
  if (saved) {
    currentGameId = saved;
    return currentGameId;
  }
  currentGameId = generateBlocksGameId();
  localStorage.setItem('blocks_last_saved_game_id', currentGameId);
  return currentGameId;
}

async function handleSave(context = 'manual-save') {
  const id = ensureGameId();
  saveBrandConfig(id);
  const saveBtn = document.getElementById('saveBtn');
  const mobileBtn = document.getElementById('saveBtnMobile');
  if (saveBtn) saveBtn.textContent = 'Saving...';
  if (mobileBtn) mobileBtn.textContent = 'Saving...';
  const success = await syncGameToSupabase(id, context);
  if (saveBtn) saveBtn.textContent = success ? 'Saved ✓' : 'Save';
  if (mobileBtn) mobileBtn.textContent = success ? 'Saved ✓' : 'Save';
  if (success) {
    enablePublicLink(id);
  }
  setTimeout(() => {
    if (saveBtn) saveBtn.textContent = 'Save';
    if (mobileBtn) mobileBtn.textContent = 'Save';
  }, 2000);
}

function enablePublicLink(gameId) {
  const buttons = [document.getElementById('publicLinkBtn'), document.getElementById('publicLinkBtnMobile')];
  buttons.forEach(btn => {
    if (!btn) return;
    btn.classList.remove('disabled');
    btn.dataset.gameId = gameId;
  });
}

function handlePublicLinkClick(event) {
  const button = event.currentTarget;
  if (!button || button.classList.contains('disabled')) return;
  const gameId = button.dataset.gameId || currentGameId;
  if (!gameId) {
    alert('Please save the game before generating public link.');
    return;
  }
  const publicUrl = buildPublicLinkUrl(gameId);
  navigator.clipboard.writeText(publicUrl).then(() => {
    button.textContent = 'Copied ✓';
    setTimeout(() => {
      button.textContent = button.id.includes('Mobile') ? 'Public Link' : 'Get Public Link';
    }, 2000);
  }).catch(() => {
    window.prompt('Copy this link:', publicUrl);
  });
}

function attachEditorEvents() {
  const storyInput = document.getElementById('storyInput');
  if (storyInput) {
    storyInput.addEventListener('input', handleStoryChange);
  }
  document.querySelectorAll('.map-color-btn').forEach(btn => {
    btn.addEventListener('click', handleColorClick);
  });
  const logoInput = document.getElementById('logoInput');
  if (logoInput) {
    logoInput.addEventListener('change', (event) => {
      processLogoFile(event.target.files?.[0]);
    });
  }
  const playTestBtn = document.getElementById('playTestBtn');
  if (playTestBtn) {
    playTestBtn.addEventListener('click', () => {
      sendConfigToGameFrame();
    });
  }
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => handleSave('manual-save'));
  }
  const saveMobile = document.getElementById('saveBtnMobile');
  if (saveMobile) {
    saveMobile.addEventListener('click', () => handleSave('manual-save'));
  }
  document.querySelectorAll('#publicLinkBtn, #publicLinkBtnMobile').forEach(btn => {
    btn.addEventListener('click', handlePublicLinkClick);
  });
  const templateSelect = document.getElementById('templateSelect');
  if (templateSelect) {
    templateSelect.addEventListener('change', handleTemplateSelectChange);
  }
}

function showEditorMode() {
  const templateSelect = document.getElementById('templateSelect');
  if (templateSelect) {
    templateSelect.value = 'blocks-8x8';
  }
  updateEditorFields();
  sendConfigToGameFrame();
}

async function showPublicMode(gameId) {
  document.body.classList.add('public-game-view');
  const hasLocalConfig = loadBrandConfig(gameId);
  if (!hasLocalConfig) {
    await loadBrandConfigFromSupabase(gameId);
  }
  updateEditorFields();
  sendConfigToGameFrame();
}

document.addEventListener('DOMContentLoaded', async () => {
  attachEditorEvents();
  const frame = getBlocksFrame();
  if (frame) {
    frame.addEventListener('load', () => {
      sendConfigToGameFrame();
    });
  }

  const gameId = getBlocksGameId();
  currentGameId = gameId || localStorage.getItem('blocks_last_saved_game_id') || null;

  if (gameId) {
    await showPublicMode(gameId);
  } else {
    if (currentGameId) {
      loadBrandConfig(currentGameId);
    }
    showEditorMode();
  }
});



