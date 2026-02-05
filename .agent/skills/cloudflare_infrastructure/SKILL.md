---
name: cloudflare_infrastructure
description: Standardized Setup & Management for Cloudflare Pages, Workers (BFF), and D1 Databases.
---

# Cloudflare Infrastructure Skill

This skill governs the creation, configuration, and deployment of the Studio's standard web infrastructure stack:
- **Frontend**: Cloudflare Pages (React/Vite)
- **Backend**: Cloudflare Workers (Backend-for-Frontend / API)
- **Database**: Cloudflare D1 (SQLite) - **Unified Database**
- **Analytics**: Built-in KPI Dashboard (Production Only)

## Usage

Invoke this skill when:
- Initializing a new web-based game project.
- Setting up Staging/Production environments.
- Adding a KPI Dashboard to an existing project.
- Debugging deployment pipeline issues.

## 1. Standard Architecture

The Studio enforces a **Dual-Environment** architecture:

| Component | Staging (`staging` branch) | Production (`main` branch) |
| :--- | :--- | :--- |
| **Frontend** | `daily-cipher-dev.pages.dev` | `ai-indie-gamedev-studio-template.pages.dev` |
| **Backend** | `daily-cipher-stats.jikoentcompany.workers.dev` (Shared/Prod) | `daily-cipher-stats.jikoentcompany.workers.dev` |
| **Database** | `D1` (Unified) | `D1` (Unified) |
| **Dashboard** | **DISABLED** | **ENABLED** (`https://daily-cipher-stats.jikoentcompany.workers.dev/dashboard`) |

> **Key Rule**: The KPI Dashboard is hosted on **Production Only**. Staging is for feature verification, not long-term analytics.

## 2. Configuration Templates

### 2.1 Standard `wrangler.toml`

Use this structure to enforce environment separation.

```toml
name = "daily-cipher-stats"
main = "worker/worker.js"
compatibility_date = "2024-09-23"

# --- GLOBAL BINDINGS (Shared) ---
[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "daily-cipher-db"
database_id = "cbc..."

# --- STAGING ENVIRONMENT ---
[env.staging]
name = "daily-cipher-stats-staging"
[env.staging.vars]
ENVIRONMENT = "staging"

# Note: If reusing the same DB, ensure careful table management or row-level segregation if needed.
[[env.staging.d1_databases]]
binding = "DB"
database_name = "daily-cipher-db" 
database_id = "cbc..."
```
