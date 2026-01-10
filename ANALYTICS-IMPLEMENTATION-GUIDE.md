# 📊 HƯỚNG DẪN IMPLEMENT ANALYTICS TRACKING - MemePlay

## Tổng quan

Hệ thống tracking này đo 5 chỉ số quan trọng:
1. **Unique visitors / day** - Có ai vào thật không?
2. **Avg session time** - Họ ở lại bao lâu? (<10s = không hiểu, 20-30s = có tín hiệu)
3. **Game start** - Vào web có bấm chơi không?
4. **Replay count** - Có chơi lại không? (QUAN TRỌNG NHẤT)
5. **Avatar mint click** - Có click mint không? (chỉ cần click, không cần mint thành công)

## BƯỚC 1: Setup Database (Supabase)

### 1.1. Chạy SQL Script

1. Mở Supabase Dashboard → SQL Editor
2. Copy toàn bộ file `01-database-scripts/ANALYTICS-TRACKING-SETUP.sql`
3. Paste vào SQL Editor và chạy
4. Verify setup bằng các queries ở cuối file

### 1.2. Verify Tables Created

Kiểm tra các bảng đã được tạo:
- `visitor_sessions` - Track mỗi session
- `game_events` - Track các events (game_start, replay, avatar_mint_click)

## BƯỚC 2: Tích hợp JavaScript Tracking Code

### 2.1. Import Analytics Tracker

Thêm vào file HTML chính (index.html hoặc index-v2.html) TRƯỚC app script:

```html
<!-- Analytics Tracker -->
<script type="module" src="scripts/analytics-tracker.js"></script>
```

### 2.2. Tích hợp vào app-v3.js (hoặc app-v2.js)

#### A. Import tracker ở đầu file:

```javascript
import { 
  trackGameStart, 
  trackReplay, 
  startSession,
  endSession 
} from './analytics-tracker.js'
```

#### B. Track Game Start

Trong function `startGame()` hoặc khi nhận `GAME_START` message:

```javascript
// ✅ Track game start
function startGame(gameId) {
  // ... existing code ...
  
  // Track analytics
  trackGameStart(gameId, {
    source: 'homepage', // hoặc 'play_mode', 'direct_link', etc.
    device: /mobile|tablet/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
  }).catch(() => {
    // Silent fail - tracking is non-critical
  });
  
  // ... rest of code ...
}
```

#### C. Track Replay

Khi detect replay (ví dụ trong app.js, dòng 3566):

```javascript
// Detect Play Again
if (isPlayAgain) {
  // ... existing code ...
  
  // ✅ Track replay (QUAN TRỌNG NHẤT)
  trackReplay(gameId, {
    previous_score: finalScore, // Score trước khi replay
    source: 'game_over_screen'
  }).catch(() => {
    // Silent fail
  });
  
  // ... rest of code ...
}
```

**Lưu ý**: Replay được detect khi:
- User click "Play Again" button sau game over
- User start game lại trong cùng session (game đã từng chơi)

#### D. Track Session Lifecycle

Session tự động start/end khi module load, nhưng có thể manual:

```javascript
// Session đã tự động start khi page load
// Nhưng có thể manual start nếu cần:
startSession().catch(() => {});

// End session khi page unload (đã tự động)
// Nhưng có thể manual nếu cần:
window.addEventListener('beforeunload', () => {
  endSession().catch(() => {});
});
```

### 2.3. Tích hợp Avatar Mint Click

Trong `scripts/avatar-creator.js`, function `initMintButton()`:

```javascript
// Mint Avatar handler
function initMintButton() {
  const mintBtn = document.getElementById('mintBtn');
  const mintMessage = document.getElementById('mintMessage');
  
  // ✅ Import tracker ở đầu file
  import { trackAvatarMintClick } from './analytics-tracker.js';
  
  mintBtn.addEventListener('click', async () => {
    // ✅ Track mint click NGAY KHI CLICK (trước khi check wallet, etc.)
    trackAvatarMintClick({
      from_page: 'avatar-creator',
      config_hash: generateHash(currentConfig),
      config: currentConfig
    }).catch(() => {
      // Silent fail - tracking is non-critical
    });
    
    // Reset message
    mintMessage.className = 'mint-message';
    mintMessage.textContent = '';
    mintBtn.disabled = true;
    
    // ... rest of existing code ...
  });
}
```

**Lưu ý**: Track click TRƯỚC khi check wallet hoặc validate. Chỉ cần click = có nhu cầu, không cần mint thành công.

## BƯỚC 3: Xem Reports

### 3.1. Mở Supabase Dashboard → SQL Editor

### 3.2. Chạy các queries trong `01-database-scripts/ANALYTICS-REPORTS.sql`

#### Quick Reports:

**1. Unique Visitors hôm nay:**
```sql
SELECT COUNT(DISTINCT visitor_id) as unique_visitors_today
FROM visitor_sessions
WHERE DATE(session_start) = CURRENT_DATE;
```

**2. Avg Session Time hôm nay:**
```sql
SELECT 
  ROUND(AVG(session_duration_seconds)::NUMERIC, 2) as avg_duration_seconds,
  COUNT(*) as completed_sessions
FROM visitor_sessions
WHERE DATE(session_start) = CURRENT_DATE
  AND session_end IS NOT NULL;
```

**3. Game Starts hôm nay:**
```sql
SELECT 
  COUNT(*) as game_starts_today,
  COUNT(DISTINCT visitor_id) as unique_players_today
FROM game_events
WHERE event_type = 'game_start'
  AND DATE(event_timestamp) = CURRENT_DATE;
```

**4. Replays hôm nay (QUAN TRỌNG NHẤT):**
```sql
SELECT 
  COUNT(*) as replays_today,
  COUNT(DISTINCT visitor_id) as unique_replayers_today
FROM game_events
WHERE event_type = 'replay'
  AND DATE(event_timestamp) = CURRENT_DATE;
```

**5. Avatar Mint Clicks hôm nay:**
```sql
SELECT 
  COUNT(*) as mint_clicks_today,
  COUNT(DISTINCT visitor_id) as unique_clickers_today
FROM game_events
WHERE event_type = 'avatar_mint_click'
  AND DATE(event_timestamp) = CURRENT_DATE;
```

### 3.3. Dashboard Summary (Tất cả metrics trong 1 query)

Xem file `01-database-scripts/ANALYTICS-REPORTS.sql` - phần "SUMMARY DASHBOARD"

## BƯỚC 4: Test Tracking

### 4.1. Test Local

1. Mở website localhost
2. Mở Browser Console (F12)
3. Check logs:
   - `[Analytics] ✅ Session started` - Khi page load
   - `[Analytics] ✅ Event tracked: {eventType: 'game_start', ...}` - Khi start game
   - `[Analytics] ✅ Event tracked: {eventType: 'replay', ...}` - Khi replay
   - `[Analytics] ✅ Event tracked: {eventType: 'avatar_mint_click', ...}` - Khi click mint
   - `[Analytics] ✅ Session ended` - Khi rời trang

### 4.2. Test Database

1. Vào Supabase Dashboard → Table Editor
2. Check table `visitor_sessions` - Sẽ có session mới
3. Check table `game_events` - Sẽ có events được track

### 4.3. Test Reports

1. Chạy queries trong `ANALYTICS-REPORTS.sql`
2. Verify data hiển thị đúng

## BƯỚC 5: Production Deployment

### 5.1. Deploy Code

1. Commit các file:
   - `scripts/analytics-tracker.js` (NEW)
   - `scripts/app-v3.js` (UPDATED - thêm tracking calls)
   - `scripts/avatar-creator.js` (UPDATED - thêm mint click tracking)
   - `02-html-pages/index-v2.html` (UPDATED - thêm script import)

2. Deploy lên production

### 5.2. Verify Production

1. Mở website production
2. Test tracking bằng Browser Console
3. Check Supabase Dashboard → Tables → Data đã được insert

## ARCHITECTURE OVERVIEW

```
User visits page
    ↓
analytics-tracker.js auto-starts session
    ↓
User clicks "Play Game"
    ↓
trackGameStart(gameId) → game_events table
    ↓
User plays game → game ends → clicks "Play Again"
    ↓
trackReplay(gameId) → game_events table (QUAN TRỌNG)
    ↓
User clicks "Mint Avatar" button
    ↓
trackAvatarMintClick() → game_events table
    ↓
User leaves page
    ↓
endSession() → visitor_sessions table (session_duration calculated)
```

## DATA STRUCTURE

### visitor_sessions Table
- `session_id` - Unique session ID
- `visitor_id` - Persistent visitor ID (localStorage)
- `session_start` - When session started
- `session_end` - When session ended (NULL if active)
- `session_duration_seconds` - Calculated duration
- `user_agent` - Browser info
- `referrer` - Where user came from

### game_events Table
- `session_id` - Reference to visitor_sessions
- `visitor_id` - Reference to visitor (for unique counting)
- `event_type` - 'game_start', 'replay', 'avatar_mint_click'
- `game_id` - Game ID (NULL for avatar_mint_click)
- `event_timestamp` - When event occurred
- `metadata` - JSONB extra data

## TROUBLESHOOTING

### Tracking không hoạt động

1. **Check Browser Console** - Xem có errors không?
2. **Check Supabase Connection** - Verify SUPABASE_URL và SUPABASE_ANON_KEY đúng
3. **Check RLS Policies** - Verify policies cho phép INSERT
4. **Check Network Tab** - Xem requests đến Supabase có thành công không?

### Session không end

- Session tự động end khi page unload
- Nếu session không end (session_end = NULL), có thể user đóng tab đột ngột
- Không vấn đề - có thể calculate duration manually hoặc set timeout

### Duplicate events

- Tracker có logic prevent duplicate nếu cần
- Nếu vẫn có duplicate, check code có gọi trackGameStart() nhiều lần không

## METRICS INTERPRETATION

### Session Time
- **<10s**: User không hiểu game, bỏ đi ngay
- **10-20s**: Chưa rõ ý định
- **20-30s**: Có tín hiệu tích cực ✅
- **30s+**: User engaged, có khả năng quay lại

### Replay Count (QUAN TRỌNG NHẤT)
- **High replay rate**: Game hay, user muốn chơi lại
- **Low replay rate**: Cần cải thiện game hoặc UX

### Game Start vs Unique Visitors
- **Low conversion**: Nhiều visitor nhưng ít người chơi
- **High conversion**: Landing page tốt, user muốn thử ngay

### Avatar Mint Click vs Visitors
- **High click rate**: Avatar system hấp dẫn
- **Low click rate**: Cần promote avatar system tốt hơn

## NEXT STEPS

1. ✅ Setup database schema
2. ✅ Implement tracking code
3. ✅ Test tracking
4. ⏳ Deploy to production
5. ⏳ Monitor metrics daily
6. ⏳ Create dashboard (optional - có thể dùng Supabase Dashboard hoặc build custom)

## NOTES

- Tracking là **non-blocking** - nếu fail thì chỉ log warning, không ảnh hưởng UX
- Tracking chạy **async** - không block UI thread
- Visitor ID được lưu trong **localStorage** - persistent across sessions
- Session ID được generate mỗi lần page load - unique per visit
- All tracking functions return `Promise<boolean>` - có thể await hoặc ignore

