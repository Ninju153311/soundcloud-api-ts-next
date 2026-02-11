# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

- **Email:** twinpawsai@icloud.com
- **Do not** open a public GitHub issue for security vulnerabilities

## Security Design

This package is designed with security in mind:

- **Client secrets never reach the browser** — all SoundCloud API credentials are kept server-side in Next.js API routes
- **OAuth uses PKCE** (Proof Key for Code Exchange) — prevents authorization code interception attacks
- **State parameter** — CSRF protection on OAuth flows
- **No token storage** — the package does not persist tokens; storage is left to the consuming application

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅        |
