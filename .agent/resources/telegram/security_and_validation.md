# Security & Validation

## Required validation
- Validate initData via HMAC or Ed25519
- Validate auth_date freshness
- Reject tampered payloads

## Storage rules
- Tokens → SecureStorage
- Game state → CloudStorage
- Temporary → memory only

## Forbidden
- Trusting client-only data
- Skipping validation
