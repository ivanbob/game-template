# Telegram Mini Apps — Platform Overview

Telegram Mini Apps are embedded web applications running inside Telegram clients.

Core characteristics:
- HTML5-based
- Runs inside Telegram WebView
- Integrated with Telegram account, UI, payments, and storage
- Can operate without backend (limited) or with backend
- Can be launched from:
  - Bot menu
  - Inline buttons
  - Direct links
  - Attachment menu
  - Inline mode

Primary use cases:
- Games
- Utilities
- E-commerce
- Social apps
- AI tools

Important constraints:
- No arbitrary browser APIs
- Strong UX and safety rules
- Telegram controls navigation, lifecycle, and permissions
