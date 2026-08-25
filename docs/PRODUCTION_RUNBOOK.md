# VEKTRA Production Runbook

## Release gate

Before each release, require the GitHub CI workflow to pass, confirm the frontend production build, run all backend tests and deterministic verification, run Expo Doctor, and verify that no secrets are committed.

## Deployment checks

1. Confirm `GET /api/health` returns `status: ok`, `neo4j: true`, and the expected AI-provider state.
2. Confirm the web origin returns HTTPS, HSTS, CSP, `nosniff`, frame denial, and the referrer policy.
3. Test registration, login, logout, password rotation, and rejection of unauthorized report access.
4. Test anonymous analysis, authenticated analysis, demo analysis, simulation, report history, and case ownership.
5. Confirm Razorpay order creation, captured-payment verification, webhook signature validation, and idempotent fulfillment in Test Mode before enabling Live Mode.

## Monitoring and alerts

Configure external uptime probes for the web root and `/api/health`. Alert maintainers on repeated non-200 responses, elevated 5xx rates, Neo4j disconnection, or sustained latency. Do not include policies, authorization headers, cookies, evidence, or secrets in telemetry.

## Backup and recovery

Enable Neo4j Aura backups appropriate to the selected plan. Test restoration into an isolated instance before launch and at least quarterly. Record recovery-point and recovery-time objectives and keep deployment configuration separately recoverable.

## Incident response

For a suspected credential leak: revoke or rotate the affected secret, replace it in Render/Vercel/EAS, redeploy, invalidate sessions by rotating `JWT_SECRET` when appropriate, inspect provider access logs, and remove the secret from Git history through a coordinated rewrite.

## Rollback

Retain the last known-good Vercel and Render deployments. Roll back both surfaces together when an API contract changes, then repeat the health, authentication, ownership, and analyzer smoke tests.
