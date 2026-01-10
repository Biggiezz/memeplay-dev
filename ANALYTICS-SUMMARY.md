# 📊 ANALYTICS TRACKING - TÓM TẮT

## ✅ ĐÃ HOÀN THÀNH

### 1. Database Schema (Supabase)
- ✅ File: `01-database-scripts/ANALYTICS-TRACKING-SETUP.sql`
- ✅ Tạo 2 bảng: `visitor_sessions`, `game_events`
- ✅ Tạo 3 RPC functions: `track_visitor_session`, `end_visitor_session`, `track_game_event`
- ✅ Setup RLS policies để cho phép public insert/select

### 2. JavaScript Tracking Code
- ✅ File: `scripts/analytics-tracker.js`
- ✅ Auto-start session khi page load
- ✅ Auto-end session khi page unload
- ✅ Functions: `trackGameStart()`, `trackReplay()`, `trackAvatarMintClick()`

### 3. Tích hợp vào Code
- ✅ File: `scripts/app-v3.js` - Track game start và replay
- ✅ File: `scripts/avatar-creator.js` - Track avatar mint click
- ✅ Logic replay detection: Track khi user chơi lại game đã từng chơi trong session

### 4. Reports SQL
- ✅ File: `01-database-scripts/ANALYTICS-REPORTS.sql`
- ✅ Các queries để xem:
  - Unique visitors / day
  - Avg session time (phân loại <10s, 10-30s, 30s+)
  - Game starts
  - Replay count (QUAN TRỌNG NHẤT)
  - Avatar mint clicks
  - Summary dashboard

### 5. Hướng dẫn chi tiết
- ✅ File: `ANALYTICS-IMPLEMENTATION-GUIDE.md`

## 📋 CHECKLIST TRƯỚC KHI DEPLOY

### Step 1: Chạy SQL Script
- [ ] Mở Supabase Dashboard → SQL Editor
- [ ] Copy toàn bộ `01-database-scripts/ANALYTICS-TRACKING-SETUP.sql`
- [ ] Paste và chạy
- [ ] Verify không có errors
- [ ] Verify tables đã được tạo (visitor_sessions, game_events)

### Step 2: Test Local
- [ ] Mở website localhost
- [ ] Mở Browser Console (F12)
- [ ] Check logs:
  - `[Analytics] ✅ Session started` khi page load
  - `[Analytics] ✅ Event tracked: {eventType: 'game_start', ...}` khi start game
  - `[Analytics] ✅ Event tracked: {eventType: 'replay', ...}` khi replay
  - `[Analytics] ✅ Event tracked: {eventType: 'avatar_mint_click', ...}` khi click mint
  - `[Analytics] ✅ Session ended` khi rời trang

### Step 3: Test Database
- [ ] Vào Supabase Dashboard → Table Editor
- [ ] Check `visitor_sessions` table - có session mới
- [ ] Check `game_events` table - có events được track

### Step 4: Test Reports
- [ ] Chạy queries trong `01-database-scripts/ANALYTICS-REPORTS.sql`
- [ ] Verify data hiển thị đúng

### Step 5: Deploy Production
- [ ] Commit code changes
- [ ] Deploy lên production
- [ ] Test tracking trên production
- [ ] Monitor Supabase Dashboard

## 🎯 5 CHỈ SỐ ĐƯỢC TRACK

### 1. Unique Visitors / Day ✅
**Mục đích**: Có ai vào thật không?

**Cách xem**:
```sql
SELECT COUNT(DISTINCT visitor_id) as unique_visitors_today
FROM visitor_sessions
WHERE DATE(session_start) = CURRENT_DATE;
```

### 2. Avg Session Time ✅
**Mục đích**: Họ ở lại bao lâu?
- <10s = không hiểu game
- 20–30s = có tín hiệu ✅

**Cách xem**:
```sql
SELECT 
  ROUND(AVG(session_duration_seconds)::NUMERIC, 2) as avg_duration_seconds,
  COUNT(*) as completed_sessions
FROM visitor_sessions
WHERE DATE(session_start) = CURRENT_DATE
  AND session_end IS NOT NULL;
```

### 3. Game Start ✅
**Mục đích**: Vào web có bấm chơi không?

**Cách xem**:
```sql
SELECT 
  COUNT(*) as game_starts_today,
  COUNT(DISTINCT visitor_id) as unique_players_today
FROM game_events
WHERE event_type = 'game_start'
  AND DATE(event_timestamp) = CURRENT_DATE;
```

### 4. Replay Count ✅ (QUAN TRỌNG NHẤT)
**Mục đích**: Có chơi lại không?

**Cách xem**:
```sql
SELECT 
  COUNT(*) as replays_today,
  COUNT(DISTINCT visitor_id) as unique_replayers_today
FROM game_events
WHERE event_type = 'replay'
  AND DATE(event_timestamp) = CURRENT_DATE;
```

### 5. Avatar Mint Click ✅
**Mục đích**: Có click mint không? (chỉ cần click, không cần mint thành công)

**Cách xem**:
```sql
SELECT 
  COUNT(*) as mint_clicks_today,
  COUNT(DISTINCT visitor_id) as unique_clickers_today
FROM game_events
WHERE event_type = 'avatar_mint_click'
  AND DATE(event_timestamp) = CURRENT_DATE;
```

## 📁 FILES CREATED/MODIFIED

### Files Created:
1. `01-database-scripts/ANALYTICS-TRACKING-SETUP.sql` - Database schema
2. `01-database-scripts/ANALYTICS-REPORTS.sql` - SQL queries để xem reports
3. `scripts/analytics-tracker.js` - JavaScript tracking code
4. `ANALYTICS-IMPLEMENTATION-GUIDE.md` - Hướng dẫn chi tiết
5. `ANALYTICS-SUMMARY.md` - File này (tóm tắt)

### Files Modified:
1. `scripts/app-v3.js` - Thêm tracking cho game start và replay
2. `scripts/avatar-creator.js` - Thêm tracking cho avatar mint click

## 🔍 TESTING SCENARIOS

### Scenario 1: New Visitor
1. Visit homepage → Session starts
2. Click play game → Game start tracked
3. Play game → Game ends
4. Click "Play Again" → Replay tracked ✅
5. Leave page → Session ends (duration calculated)

### Scenario 2: Avatar Mint
1. Go to avatar-creator page → Session starts (if new page)
2. Click "Mint Avatar" button → Mint click tracked ✅ (TRƯỚC khi check wallet)
3. Complete mint or cancel → Session continues

### Scenario 3: Multiple Games
1. Play game A → Game start tracked
2. Play game B → Game start tracked
3. Replay game A → Replay tracked ✅

## 📊 METRICS INTERPRETATION

### High Replay Rate
- ✅ Game hay, user muốn chơi lại
- Action: Promote games có replay rate cao

### Low Replay Rate
- ❌ Game chưa đủ hấp dẫn
- Action: Cải thiện game hoặc UX

### High Session Time (>30s)
- ✅ User engaged
- Action: Maintain quality

### Low Session Time (<10s)
- ❌ User không hiểu hoặc không thích
- Action: Improve onboarding hoặc landing page

### High Mint Click Rate
- ✅ Avatar system hấp dẫn
- Action: Promote avatar system tốt hơn

### Low Mint Click Rate
- ❌ Avatar system chưa được notice
- Action: Add more prominent CTA hoặc banner

## 🚀 NEXT STEPS (OPTIONAL)

1. **Create Dashboard** (optional)
   - Build custom dashboard để visualize metrics
   - Hoặc dùng Supabase Dashboard

2. **Set up Alerts** (optional)
   - Alert khi replay rate thấp
   - Alert khi session time trung bình <10s

3. **A/B Testing** (optional)
   - Test landing page variations
   - Test game promotion strategies

## 📝 NOTES

- Tracking là **non-blocking** - không ảnh hưởng UX nếu fail
- Tracking chạy **async** - không block UI thread
- Visitor ID persistent trong localStorage
- Session ID unique mỗi page load
- All functions return `Promise<boolean>` - có thể await hoặc ignore

## 🐛 TROUBLESHOOTING

### Tracking không hoạt động?
1. Check Browser Console - có errors không?
2. Check Supabase connection - URL và key đúng không?
3. Check RLS policies - cho phép INSERT không?
4. Check Network tab - requests đến Supabase thành công không?

### Session không end?
- Session tự động end khi page unload
- Nếu session không end, có thể user đóng tab đột ngột
- Không vấn đề - có thể calculate duration manually

### Duplicate events?
- Tracker có logic prevent duplicate
- Nếu vẫn có duplicate, check code có gọi track nhiều lần không

---

**✨ Ready to deploy! Follow checklist above.**

