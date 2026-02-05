# Telegram Mini Apps — Hard Rules

## Initialization
- telegram-web-app.js MUST be loaded before any logic
- WebApp.ready() must be called as early as possible

## Security
- initData must be validated on backend
- initDataUnsafe MUST NOT be trusted
- Signature validation is mandatory for any auth

## UI & UX
- Must respect safeAreaInset and contentSafeAreaInset
- No overlapping system UI
- No forced full-screen without user action
- No autoplay audio
- Animations must be smooth (60fps target)

## Permissions
- No silent access to:
  - Location
  - Biometrics
  - Contacts
- All access must be user-triggered

## Ads & Monetization
- No ads during gameplay
- Rewarded ads must give reward
- Payments only via Telegram Stars or approved providers

## Data Storage
- Sensitive data → SecureStorage
- Non-sensitive → DeviceStorage or CloudStorage
- Do NOT exceed storage limits

## Forbidden
- External auth flows
- Silent redirects
- Breaking back button behavior
- UI blocking gestures
