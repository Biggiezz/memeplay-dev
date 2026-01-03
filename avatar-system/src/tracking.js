// Avatar Mint Tracking - Supabase Integration
// Tracks mint events for analytics and stats

const SUPABASE_URL = 'https://iikckrcdrvnqctzacxgx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpa2NrcmNkcnZucWN0emFjeGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Mzc3NDgsImV4cCI6MjA3NzMxMzc0OH0.nIPvf11YfFlWH0XHDZdxI496zaP431QOJCuQ-5XX4DQ';

let supabaseClient = null;

/**
 * Initialize Supabase client (lazy load)
 */
async function initSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    return supabaseClient;
  } catch (error) {
    console.error('[Tracking] Failed to initialize Supabase client:', error);
    return null;
  }
}

/**
 * Track avatar mint event
 * @param {Object} mintData - Mint data object
 * @param {number|string} mintData.tokenId - Token ID
 * @param {string} mintData.userAddress - User wallet address
 * @param {string} mintData.configHash - Config hash
 * @param {Object} mintData.config - Full config object {actor, skin, clothes, equipment, hat}
 * @param {string} mintData.transactionHash - Transaction hash
 * @returns {Promise<boolean>} - Success status
 */
export async function trackMint(mintData) {
  try {
    const supabase = await initSupabaseClient();
    if (!supabase) {
      console.warn('[Tracking] Supabase client not available, skipping tracking');
      return false;
    }

    const { tokenId, userAddress, configHash, config, transactionHash } = mintData;

    // Validate required fields
    if (!tokenId && tokenId !== 0) {
      console.error('[Tracking] Missing tokenId');
      return false;
    }

    if (!userAddress) {
      console.error('[Tracking] Missing userAddress');
      return false;
    }

    // Prepare data for insert
    const insertData = {
      token_id: parseInt(tokenId, 10),
      user_address: userAddress.toLowerCase(),
      config_hash: configHash || null,
      config_json: config || null,
      transaction_hash: transactionHash || null,
      minted_at: new Date().toISOString()
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('avatar_mints')
      .insert([insertData])
      .select();

    if (error) {
      console.error('[Tracking] Failed to track mint:', error);
      return false;
    }

    console.log('[Tracking] ✅ Mint tracked successfully:', data);
    return true;
  } catch (error) {
    console.error('[Tracking] Error tracking mint:', error);
    return false;
  }
}

/**
 * Get mint statistics
 * @returns {Promise<Object|null>} - Stats object or null on error
 */
export async function getMintStats() {
  try {
    const supabase = await initSupabaseClient();
    if (!supabase) {
      console.warn('[Tracking] Supabase client not available');
      return null;
    }

    // Get total mints
    const { count: totalMints, error: countError } = await supabase
      .from('avatar_mints')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('[Tracking] Failed to get total mints:', countError);
      return null;
    }

    // Get today's mints
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { count: todayMints, error: todayError } = await supabase
      .from('avatar_mints')
      .select('*', { count: 'exact', head: true })
      .gte('minted_at', todayISO);

    if (todayError) {
      console.error('[Tracking] Failed to get today mints:', todayError);
    }

    // Get unique users
    const { data: uniqueUsers, error: uniqueError } = await supabase
      .from('avatar_mints')
      .select('user_address')
      .then(result => {
        if (result.error) throw result.error;
        const unique = new Set(result.data.map(r => r.user_address));
        return { data: Array.from(unique), error: null };
      })
      .catch(error => ({ data: null, error }));

    if (uniqueError) {
      console.error('[Tracking] Failed to get unique users:', uniqueError);
    }

    return {
      totalMints: totalMints || 0,
      todayMints: todayMints || 0,
      uniqueUsers: uniqueUsers ? uniqueUsers.length : 0
    };
  } catch (error) {
    console.error('[Tracking] Error getting stats:', error);
    return null;
  }
}

/**
 * Get config popularity stats
 * @returns {Promise<Object|null>} - Popular configs or null on error
 */
export async function getConfigStats() {
  try {
    const supabase = await initSupabaseClient();
    if (!supabase) {
      console.warn('[Tracking] Supabase client not available');
      return null;
    }

    // Get all mints with config
    const { data, error } = await supabase
      .from('avatar_mints')
      .select('config_json');

    if (error) {
      console.error('[Tracking] Failed to get config stats:', error);
      return null;
    }

    // Count configs
    const actorCount = {};
    const clothesCount = {};
    const equipmentCount = {};
    const hatCount = {};

    data.forEach(mint => {
      if (mint.config_json) {
        const config = mint.config_json;
        
        // Count actors
        const actor = config.actor || 'unknown';
        actorCount[actor] = (actorCount[actor] || 0) + 1;
        
        // Count clothes
        const clothes = config.clothes || 0;
        clothesCount[clothes] = (clothesCount[clothes] || 0) + 1;
        
        // Count equipment
        const equipment = config.equipment || 0;
        equipmentCount[equipment] = (equipmentCount[equipment] || 0) + 1;
        
        // Count hat
        const hat = config.hat || 0;
        hatCount[hat] = (hatCount[hat] || 0) + 1;
      }
    });

    return {
      actors: actorCount,
      clothes: clothesCount,
      equipment: equipmentCount,
      hat: hatCount
    };
  } catch (error) {
    console.error('[Tracking] Error getting config stats:', error);
    return null;
  }
}

