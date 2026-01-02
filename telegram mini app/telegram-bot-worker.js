// Telegram Bot Webhook Handler cho Cloudflare Workers
// Deploy lên Cloudflare Workers - không cần cài Node.js!

export default {
  async fetch(request, env) {
    // Chỉ handle POST requests (Telegram webhook)
    if (request.method === 'POST') {
      try {
        const update = await request.json();
        const message = update.message;
        
        // Bot token - lấy từ environment variable hoặc hardcode
        const botToken = env.BOT_TOKEN || '8336542347:AAGY3F_OETiDDcb9YiQzywdSu5I5PrTjJv0';
        
        // Handle /start command (with or without referral code)
        if (message?.text?.startsWith('/start')) {
          const chatId = message.chat.id;
          const text = message.text;
          
          // Extract referral code from /start ABC123
          let referralCode = null;
          if (text.includes(' ')) {
            referralCode = text.split(' ')[1];
          }
          
          // Build welcome message
          let welcomeText = `👋 Welcome to MemePlay!\n\n`;
          
          if (referralCode) {
            // User joined via referral link
            welcomeText += `🎁 You've been invited by a friend!\n\n`;
            welcomeText += `When you join, both you and your friend will receive 2000 PLAY points! 🎉\n\n`;
          } else {
            // User joined without referral link - encourage them to invite friends
            welcomeText += `🎁 Invite friends and earn rewards!\n\n`;
            welcomeText += `Share your referral link and get 2000 PLAY points for each friend who joins!\n\n`;
            welcomeText += `Your friend will also receive 2000 PLAY points when they join! 🎉\n\n`;
          }
          
          welcomeText += `Click "🎮 Start App" to begin! 🚀`;
          
          // Build Mini App URL with referral code
          let miniAppUrl = 'https://memeplay.dev/telegram-mini-app';
          if (referralCode) {
            miniAppUrl += `?start=${referralCode}`;
          }
          
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: welcomeText,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '🎮 Start App',
                      web_app: { url: miniAppUrl }
                    }
                  ],
                  [
                    {
                      text: '🔗 Join Telegram Channel',
                      url: 'https://t.me/memeplaydev'
                    }
                  ]
                ]
              }
            })
          });
          
          return new Response('OK');
        }
        
        // Handle /help command
        if (message?.text === '/help') {
          const chatId = message.chat.id;
          
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `📖 MemePlay Guide:

/start - Welcome and open Mini App
/help - Show this help message

• Click "🎮 Start App" to open Mini App
• Play games and earn rewards
• Invite friends to get more rewards

Have fun playing! 🎉`
            })
          });
          
          return new Response('OK');
        }
        
        // Ignore other messages
        return new Response('OK');
        
      } catch (error) {
        console.error('Error:', error);
        return new Response('Error', { status: 500 });
      }
    }
    
    // GET request - return info
    return new Response('Telegram Bot Webhook - MemePlay', { status: 200 });
  }
};
