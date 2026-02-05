CHECK_LOADING_READY:
- YaGames.init exists
- LoadingAPI.ready called
- Called after assets loaded

CHECK_GAMEPLAY_API:
- start() on gameplay begin
- stop() on pause / ads / tab blur

CHECK_STORAGE:
- player.getData() or safeStorage used
- progress restored on reload

CHECK_ADS:
- no ads during gameplay
- ads triggered only after user action

CHECK_UI:
- no overflow
- no clipped UI
