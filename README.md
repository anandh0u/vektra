# VEKTRA - Cloud Policy Vulnerability Graph Engine

VEKTRA parses AWS IAM and Kubernetes RBAC policies, builds a permission relationship graph, detects 14 vulnerability classes, writes graph relationships to Neo4j AuraDB, and uses Sarvam AI agents to explain risk and produce copy-pasteable fixes.

Built for HACKHAZARDS '26 across Developer Tools, Trust/Identity/Security, Neo4j, Sarvam, and Render tracks.

## What It Detects

VEKTRA detects all V01-V14 classes from the build prompt:

- Critical: direct allow/deny conflicts, privilege escalation actions, sensitive wildcard resources, admin wildcards, assume-role chain escalation, Kubernetes ClusterRole namespace bypass.
- Warning: wildcard service or RBAC verbs, conditional deny bypasses, redundant allow shadows, cross-account trust, Kubernetes secrets access, missing resource constraints.
- Info: unused denies and duplicate statements.

Each finding becomes a graph edge such as `CONFLICTS_WITH`, `ESCALATES_TO`, `BYPASSES`, `EXPOSES`, `GRANTS_ADMIN`, `ASSUMES`, `SHADOWS`, or `REDUNDANT_WITH`.

## Stack

- Frontend: React 18, Vite, TailwindCSS, React Flow, Zustand, React Router v6.
- Backend: FastAPI, NetworkX, Neo4j Python Driver, PyYAML, httpx.
- Mobile: Expo SDK 51, Expo Router, NativeWind, Zustand, AsyncStorage, axios.
- AI: Sarvam AI `sarvam-m` through the OpenAI-compatible chat completions API.
- Deployment: Render web service plus Render static site through `render.yaml`.

## Local Setup

### Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
cd ..
uvicorn backend.main:app --reload --port 8000
```

Optional `.env` values:

```bash
SARVAM_API_KEY=...
NEO4J_URI=...
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=...
```

The analyzer works without Neo4j or Sarvam keys. Neo4j writes are skipped when credentials are missing, and agent output falls back to deterministic local text.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

### Mobile

```bash
cd mobile
npm install
npx expo start
```

Set the backend URL in `mobile/.env` or inside the app Settings screen:

```bash
EXPO_PUBLIC_API_URL=https://vektra-six.vercel.app
```

The mobile app supports scan, results, vulnerability detail, local scan history, and service-status screens. Base44 history is optional for now; when `/api/history` or `/api/report/save` is unavailable, the app stores scan history locally with AsyncStorage and shows Base44 as not configured.

## Verification

```bash
python backend/verify.py
cd frontend
npm run build
cd ../mobile
npx expo-doctor
```

## Render Deployment

This repo includes a Render blueprint:

- `vektra-backend`: FastAPI service started with `uvicorn backend.main:app`.
- `vektra-frontend`: Vite static site.

Set these Render environment variables before production use:

- `SARVAM_API_KEY`
- `NEO4J_URI`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
- `VITE_API_URL` on the frontend, pointed at the backend service URL.
