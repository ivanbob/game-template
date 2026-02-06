# Technical Specification: API V1 (Soft Launch)

## Metadata
- **ID:** `tech_api_v1`
- **Base URL:** `/api/game/vault`
- **Protocol:** HTTP/1.1 REST
- **Auth:** Telegram WebApp Data (HMAC)
- **Status:** LIVE

## 1. Authentication
All write operations REQUIRE authentication via the `Authorization` header.
- **Header:** `Authorization: tma <initData>`
- **Mechanism:** Server validates `hash` using `TELEGRAM_BOT_TOKEN`.
- **Identity:** `userId` is extracted from the `user` JSON field in `initData`.

## 2. Endpoints

### 2.1 Get Vault State
Fetch the current state of the daily vault.
- **GET** `/`
- **Auth:** Optional (Public Read).
- **Response (200 OK):**
```json
{
  "date": "2026-02-06",
  "grid": [
    {
      "id": "t1",
      "status": "OPEN", // or CLAIMED, SOLVED
      "claimedBy": "12345", // or null
      "lockExpiry": 1700000000000,
      "data": { "clue": "..." }
    }
  ]
}
```

### 2.2 Claim Tile
Attempt to lock a tile.
- **POST** `/claim`
- **Auth:** Required.
- **Body:** `{ "tileId": "t1" }`
- **Response (200 OK):** `{ "success": true, "data": { ...tile } }`
- **Errors:**
  - `400`: Missing `tileId`
  - `409`: Tile not OPEN
  - `429`: User has active lock

### 2.3 Solve Tile
Submit a solution for a claimed tile.
- **POST** `/solve`
- **Auth:** Required.
- **Body:** `{ "tileId": "t1", "solution": { "val": 123 } }`
- **Response (200 OK):** `{ "success": true, "data": { "reward": "SHARD_FOUND" } }`
- **Errors:**
  - `403`: Not Owner (or Lock Expired)

### 2.4 Release Tile
Release a lock.
- **POST** `/release`
- **Auth:** Required.
- **Body:** `{ "tileId": "t1" }`
- **Response (200 OK):** `{ "success": true }`

### 2.5 Admin Seed
Force seed a daily vault.
- **POST** `/admin/seed`
- **Auth:** `X-Admin-Key` header.
- **Response (200 OK):** `{ "success": true }`

## 3. Error Handling
Global error format:
```json
{
  "error": "Message",
  "stack": "Stack trace (dev only)"
}
```
Common codes:
- `401 Unauthorized`: Invalid/Missing `tma` data.
- `500 Internal Error`: Database/Worker failure.
