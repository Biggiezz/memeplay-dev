ROADMAP PLAY TEST TEMPLATE V2

1) Play Test thật cho Pacman (V2)
  1.1 Generate gameId tạm và pass config
    - Khi bấm Play Test: generate gameId tạm (playtest-pacman-xxx)
    - Lưu config tạm vào localStorage với key pacman_brand_config_playtest-pacman-xxx (format giống save thật)
    - Build templateUrl với gameId tạm: /games/templates/pacman-template/index.html?game=playtest-pacman-xxx
    - Tạo iframe mới với templateUrl này → game trong iframe tự load config từ localStorage
  1.2 Container preview và lifecycle iframe
    - Desktop: previewBox
    - Mobile: mobilePreviewBox
    - Khi bấm Play Test: remove iframe cũ (detach), tạo iframe mới, append; enable Save & Copy
    - Bấm lại Play Test: remove iframe cũ, tạo iframe mới (fresh state)
  1.3 Loading state & error handling
    - Hiển thị loading khi iframe đang tải
    - Nếu iframe fail → error message, không để trống
    - Timeout (vd 10s) → cảnh báo “Game is taking longer…”
  1.4 Config sync strategy
    - Chỉ reload khi bấm Play Test lại (không auto-reload khi config đổi)
    - Mỗi lần Play Test → gameId mới → config mới → iframe mới

2) Cleanup & navigation
  2.1 Cleanup khi đóng/chuyển trang
    - Close editor / beforeunload: remove iframe desktop/mobile
    - Back to Editor (mobile): remove iframe mobile, scroll về editor
  2.2 Reset preview text
    - Khi chưa có iframe: “Play preview will appear here after Play Test”
    - Remove iframe: reset text

3) Hạ tầng chọn template (khi cần)
  3.1 Template selector
    - Thêm selector (Pacman active; template khác disable/“Coming soon”)
  3.2 Hook change template
    - Clear form/state adapter nếu khác template
    - Remove iframe preview (desktop + mobile), reset text
    - Clear config tạm (playtest-*) của template cũ

4) Sau khi Play Test Pacman ổn, thêm template mới dần
  4.1 Mỗi template mới
    - Adapter riêng + play test lazy iframe (1 cái/lần)
    - gameId tạm: playtest-{templateId}-xxx
    - Lưu config tạm với storage prefix tương ứng
  4.2 Đổi template
    - Remove iframe cũ (desktop + mobile), reset state, clear config tạm cũ

5) Kiểm thử
  5.1 Desktop + Mobile LAN (Pacman)
    - Play Test nhiều lần → iframe recreate, không rò rỉ/lag
    - Config load đúng (story/map/color/logo), loading state, error handling
    - Cleanup khi đóng/chuyển trang
  5.2 Template mới: lặp lại kiểm thử tương tự


