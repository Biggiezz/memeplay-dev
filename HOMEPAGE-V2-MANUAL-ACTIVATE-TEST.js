// 🔬 Manual Activate Test Script
// Copy và paste toàn bộ code này vào Console để test

console.log('🔬 Starting Manual Activate Test...')

// Step 1: Check if cards exist
const cards = document.querySelectorAll('.game-card[data-user-created="true"]')
console.log(`📊 Total cards found: ${cards.length}`)

if (cards.length < 3) {
  console.error('❌ Not enough cards! Need at least 3 cards.')
} else {
  const card3 = cards[2]
  const gameId = card3.id || card3.getAttribute('data-game-id')
  
  if (!gameId) {
    console.error('❌ Game ID not found on card 3')
  } else {
    console.log(`✅ Game 3 ID: ${gameId}`)
    
    // Step 2: Check current state
    const stateBefore = card3.getAttribute('data-game-state') || 'UNKNOWN'
    const iframeBefore = card3.querySelector('iframe')
    const srcBefore = iframeBefore?.src || 'NO IFRAME'
    const lazySrcBefore = iframeBefore?.dataset.lazySrc || 'NO LAZY_SRC'
    
    console.log(`\n📊 BEFORE activation:`)
    console.log(`  - State: ${stateBefore}`)
    console.log(`  - Iframe exists: ${iframeBefore !== null}`)
    console.log(`  - Iframe src: ${srcBefore}`)
    console.log(`  - Iframe lazySrc: ${lazySrcBefore}`)
    
    // Step 3: Try to find activateGame function
    console.log(`\n🔍 Looking for activateGame function...`)
    
    // Check global scope
    let activateGameFunc = null
    
    // Method 1: Check window object
    if (typeof window.activateGame === 'function') {
      activateGameFunc = window.activateGame
      console.log(`✅ Found activateGame in window object`)
    }
    // Method 2: Check if it's in closure (try to access via debugger)
    else if (typeof activateGame === 'function') {
      activateGameFunc = activateGame
      console.log(`✅ Found activateGame in global scope`)
    }
    // Method 3: Try to access from app-v2.js context
    else {
      console.log(`⚠️ activateGame not found in global scope`)
      console.log(`📝 Trying alternative methods...`)
      
      // Check if we can access it via script tag
      const scripts = document.querySelectorAll('script[src*="app-v2"]')
      console.log(`📝 Found ${scripts.length} app-v2.js script(s)`)
      
      // Try to call via eval (last resort)
      try {
        // This might work if function is in module scope
        console.log(`⚠️ activateGame might be in module scope, trying eval...`)
        const result = eval('typeof activateGame')
        if (result === 'function') {
          activateGameFunc = eval('activateGame')
          console.log(`✅ Found activateGame via eval`)
        }
      } catch (e) {
        console.log(`❌ Cannot access activateGame: ${e.message}`)
      }
    }
    
    // Step 4: If function found, call it
    if (activateGameFunc) {
      console.log(`\n🎯 Calling activateGame(${gameId})...`)
      
      try {
        activateGameFunc(gameId)
        console.log(`✅ activateGame called successfully`)
        
        // Step 5: Check state after 1 second
        setTimeout(() => {
          const stateAfter = card3.getAttribute('data-game-state') || 'UNKNOWN'
          const iframeAfter = card3.querySelector('iframe')
          const srcAfter = iframeAfter?.src || 'NO IFRAME'
          
          console.log(`\n📊 AFTER activation (1s):`)
          console.log(`  - State: ${stateAfter}`)
          console.log(`  - Iframe src: ${srcAfter}`)
          
          if (srcAfter !== 'about:blank' && srcAfter !== 'NO IFRAME' && srcAfter !== srcBefore) {
            console.log(`\n✅ SUCCESS: Game activated!`)
            console.log(`✅ Iframe src changed from "${srcBefore}" → "${srcAfter}"`)
            console.log(`\n🎯 CONCLUSION: activateGame() works! → Vấn đề ở observer (không trigger)`)
          } else if (srcAfter === 'about:blank') {
            console.log(`\n❌ FAILED: Iframe still blank`)
            console.log(`\n🎯 CONCLUSION: activateGame() không hoạt động đúng → Cần check activateGame() logic`)
          } else {
            console.log(`\n⚠️ UNCLEAR: Iframe src không thay đổi`)
            console.log(`\n🎯 CONCLUSION: Cần check thêm activateGame() logic`)
          }
        }, 1000)
      } catch (e) {
        console.error(`❌ Error calling activateGame: ${e.message}`)
        console.error(`❌ Stack: ${e.stack}`)
      }
    } else {
      // Step 6: Manual activation (bypass function)
      console.log(`\n⚠️ activateGame function not accessible`)
      console.log(`📝 Trying manual activation...`)
      
      // Try to manually set iframe src
      if (iframeBefore && lazySrcBefore !== 'NO LAZY_SRC') {
        console.log(`📝 Setting iframe src manually...`)
        iframeBefore.src = lazySrcBefore
        
        setTimeout(() => {
          const srcAfter = iframeBefore.src || 'NO IFRAME'
          console.log(`\n📊 AFTER manual activation (1s):`)
          console.log(`  - Iframe src: ${srcAfter}`)
          
          if (srcAfter !== 'about:blank' && srcAfter !== 'NO IFRAME') {
            console.log(`\n✅ SUCCESS: Manual iframe load works!`)
            console.log(`\n🎯 CONCLUSION: Iframe có thể load → Vấn đề ở activateGame() hoặc observer`)
          } else {
            console.log(`\n❌ FAILED: Iframe still blank after manual load`)
            console.log(`\n🎯 CONCLUSION: Có vấn đề ở iframe loading hoặc lazySrc`)
          }
        }, 1000)
      } else {
        console.error(`❌ Cannot manual activate: iframe or lazySrc not found`)
        console.log(`\n🎯 CONCLUSION: Card structure có vấn đề`)
      }
    }
  }
}

console.log('\n📝 Test script loaded. Results will appear above.')







