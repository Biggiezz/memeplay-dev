/**
 * 🧹 Cleanup Localhost Games Script
 * 
 * Mục đích: Xóa tất cả games được tạo trên localhost (192.168.x.x, 127.0.0.1, localhost)
 * trước khi deploy lên GitHub/production.
 * 
 * Cách sử dụng:
 * 1. Mở browser console trên localhost
 * 2. Copy và paste toàn bộ code này vào console
 * 3. Hoặc import vào HTML: <script type="module" src="scripts/cleanup-localhost-games.js"></script>
 * 
 * ⚠️ LƯU Ý: Script này sẽ XÓA VĨNH VIỄN các games localhost từ localStorage!
 */

// Import template registry (nếu chạy trong browser với ES modules)
// Nếu không dùng ES modules, comment lại và dùng hardcode template list

async function cleanupLocalhostGames() {
  console.log('🧹 [CLEANUP] Starting localhost games cleanup...')
  
  // Template registry paths (hardcode nếu không import được)
  const TEMPLATE_STORAGE_PREFIXES = {
    'pacman': 'pacman_brand_config_',
    'pixel-shooter': 'pixel_shooter_brand_config_',
    'rocket-bnb-template': 'rocket_bnb_brand_config_',
    'space-jump-template': 'space_jump_brand_config_',
    'fallen-crypto-template': 'fallen_crypto_brand_config_',
    'shooter-template': 'shooter_brand_config_',
    'arrow-template': 'arrow_brand_config_',
    'draw-runner-template': 'draw_runner_brand_config_',
    'knife-fix-template': 'knife_fix_brand_config_',
    'moon-template': 'moon_brand_config_',
    'wall-bird-template': 'wall_bird_brand_config_'
  }
  
  let totalCleaned = 0
  const cleanedGames = []
  
  // Scan tất cả localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    
    // Check từng template prefix
    for (const [templateId, prefix] of Object.entries(TEMPLATE_STORAGE_PREFIXES)) {
      if (key.startsWith(prefix)) {
        const gameId = key.replace(prefix, '')
        
        // Chỉ check V2 format (playmode-*)
        if (gameId.startsWith('playmode-')) {
          try {
            const gameDataStr = localStorage.getItem(key)
            if (!gameDataStr) continue
            
            const gameData = JSON.parse(gameDataStr)
            
            // Check localhost trong các URLs
            const templateUrl = gameData.templateUrl || ''
            const publicUrl = gameData.publicUrl || ''
            const fragmentLogoUrl = gameData.fragmentLogoUrl || ''
            
            const isLocalhost = 
              templateUrl.includes('localhost') ||
              templateUrl.includes('127.0.0.1') ||
              templateUrl.includes('192.168.') ||
              templateUrl.includes('0.0.0.0') ||
              publicUrl.includes('localhost') ||
              publicUrl.includes('127.0.0.1') ||
              publicUrl.includes('192.168.') ||
              publicUrl.includes('0.0.0.0') ||
              fragmentLogoUrl.includes('localhost') ||
              fragmentLogoUrl.includes('127.0.0.1') ||
              fragmentLogoUrl.includes('192.168.') ||
              fragmentLogoUrl.includes('0.0.0.0')
            
            if (isLocalhost) {
              console.log(`🗑️ [CLEANUP] Removing localhost game: ${gameId} (${templateId})`)
              localStorage.removeItem(key)
              totalCleaned++
              cleanedGames.push({
                gameId,
                templateId,
                key
              })
            }
          } catch (error) {
            console.warn(`⚠️ [CLEANUP] Failed to parse game data for key ${key}:`, error)
          }
        }
      }
    }
  }
  
  // Summary
  console.log(`\n✅ [CLEANUP] Cleanup complete!`)
  console.log(`📊 Total games removed: ${totalCleaned}`)
  
  if (cleanedGames.length > 0) {
    console.log(`\n📋 Removed games:`)
    cleanedGames.forEach(({ gameId, templateId }) => {
      console.log(`  - ${gameId} (${templateId})`)
    })
  } else {
    console.log(`\n✨ No localhost games found. All clean!`)
  }
  
  return {
    totalCleaned,
    cleanedGames
  }
}

// Auto-run nếu chạy trong browser
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  // Check nếu đang ở localhost (chỉ chạy trên localhost để an toàn)
  const isLocalhost = 
    window.location.origin.includes('localhost') ||
    window.location.origin.includes('127.0.0.1') ||
    window.location.origin.includes('192.168.')
  
  if (isLocalhost) {
    console.log('🔍 [CLEANUP] Localhost detected. Ready to cleanup.')
    console.log('💡 [CLEANUP] Run: cleanupLocalhostGames()')
    
    // Export function để có thể gọi thủ công
    window.cleanupLocalhostGames = cleanupLocalhostGames
  } else {
    console.warn('⚠️ [CLEANUP] Not running on localhost. This script should only run on localhost.')
  }
}

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { cleanupLocalhostGames }
}







