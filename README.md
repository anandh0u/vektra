# VEKTRA

### Evidence-driven cybersecurity intelligence, built on a living security graph

[Live application](https://vektra-six.vercel.app/) · [CLI guide](CLI.md) · [License](LICENSE)

VEKTRA is a cloud-policy vulnerability graph engine evolving into a unified defensive-security intelligence platform. It parses AWS IAM and Kubernetes RBAC policies, builds permission relationships, detects dangerous access paths, stores graph context in Neo4j AuraDB, and coordinates AI-assisted analysis to explain risk and recommend least-privilege fixes.

The goal is not another generic chatbot or isolated scanner. VEKTRA is designed to become a **Living Security Twin**: an evidence-backed, time-aware model of an organization’s identities, permissions, workloads, vulnerabilities, incidents, and defensive actions.

> VEKTRA prioritizes evidence before claims and safe action before autonomy. It supports authorized defensive analysis; it does not promise to identify or “crack” every possible threat.

Built for HACKHAZARDS '26 across Developer Tools, Trust/Identity/Security, Neo4j, Sarvam, and Render tracks.

## What VEKTRA delivers

- **Living Security Twin** — a unified view of exposure, attack paths, evidence confidence, specialist agents, and safe interventions.
- **Policy graph analysis** — IAM and Kubernetes RBAC policies become inspectable nodes, relationships, and attack paths.
- **Fourteen vulnerability classes** — deterministic checks cover conflicts, wildcards, privilege escalation, trust paths, secrets access, and related risks.
- **Neo4j relationship memory** — findings and relationships can persist as connected organizational knowledge instead of disappearing after a chat session.
- **Evidence provenance** — investigations retain source context, hashes, confidence, and auditable relationships.
- **Specialist security agents** — bounded agents support analysis, verification, forensics, risk scoring, remediation, and executive communication.
- **Change simulation** — proposed policy changes can be evaluated before deployment, including introduced and resolved findings.
- **Cases and forensic workflows** — evidence, timelines, comments, activity, reports, and investigations remain organized by case.
- **Operator CLI** — health checks, diagnostics, policy analysis, workflow monitoring, JSON output, and automation-friendly exit codes.
- **Hardened delivery pipeline** — tests, builds, CodeQL, secret detection, dependency auditing, and deploy previews run through GitHub Actions.

## The Living Security Twin

Open `/twin` to see VEKTRA’s flagship command center. It combines the project’s existing graph, evidence, agent, and simulation capabilities into one customer-facing workflow:

1. Map identities, policies, resources, workloads, and relationships.
2. Rank attack paths by exploitability, evidence confidence, and business impact.
3. Show the evidence supporting every important conclusion.
4. Coordinate bounded specialist agents that challenge and verify findings.
5. Recommend the smallest safe intervention.
6. Preview changes before execution and preserve a rollback path.

The screen includes a guided scenario for first-time visitors and automatically uses real nodes, edges, findings, and risk data after an analysis.

## What it detects

VEKTRA detects all V01-V14 classes from the original build prompt:

- **Critical:** direct allow/deny conflicts, privilege-escalation actions, sensitive wildcard resources, admin wildcards, assume-role chain escalation, and Kubernetes `ClusterRole` namespace bypass.
- **Warning:** wildcard services or RBAC verbs, conditional-deny bypasses, redundant allow shadows, cross-account trust, Kubernetes secrets access, and missing resource constraints.
- **Informational:** unused denies and duplicate statements.

Each finding becomes a graph relationship such as `CONFLICTS_WITH`, `ESCALATES_TO`, `BYPASSES`, `EXPOSES`, `GRANTS_ADMIN`, `ASSUMES`, `SHADOWS`, or `REDUNDANT_WITH`.

## Architecture

```text
Web / Mobile / CLI
        |
        v
FastAPI application and workflow API
        |
        +-- IAM and Kubernetes parsers
        +-- deterministic graph analyzer
        +-- change simulator
        +-- forensic and specialist agents
        +-- evidence and case workflows
        |
        +--> Neo4j AuraDB relationship memory
        +--> Sarvam AI reasoning (optional)
        +--> Stellar evidence anchoring (optional)
```

### Technology stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Flow, Zustand, React Router, and Recharts.
- **Backend:** FastAPI, Pydantic, NetworkX, Neo4j Python Driver, PyYAML, and httpx.
- **AI:** Sarvam AI `sarvam-m` through its OpenAI-compatible chat-completions API.
- **Mobile:** Expo and React Native.
- **Delivery:** GitHub Actions, Vercel, and Render.
- **Optional integrity layer:** Stellar testnet evidence anchoring and usage credits.

## Quick start

### Prerequisites

- Python 3.11 or 3.12
- Node.js 22
- npm
- Optional Neo4j AuraDB and Sarvam AI credentials

### Backend

```bash
python -m venv .venv

# Windows PowerShell
.\.venv\Scripts\Activate.ps1

python -m pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

The analyzer works without Neo4j or Sarvam credentials. Neo4j writes are skipped when credentials are missing, and agent output falls back to deterministic local text.

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. The local frontend expects the backend at `http://localhost:8000` unless `VITE_API_URL` is configured.

### Mobile

```bash
cd mobile
npm ci
npm start
```

## VEKTRA CLI

Install the project command:

```bash
python -m pip install -e .
vektra --version
```

Common commands:

```bash
# Check local configuration without exposing secret values
vektra --json doctor

# Check a deployed environment
vektra --api https://vektra-six.vercel.app health

# Analyze IAM and fail automation when risk reaches 70
vektra --json analyze policy.json --format iam --fail-above 70

# Run and monitor the complete Kubernetes workflow
vektra workflow rbac.yaml --format k8s --wait
```

Use `VEKTRA_API_URL` and `VEKTRA_TOKEN` for automation. See [CLI.md](CLI.md) for commands, configuration, JSON behavior, and exit codes.

## Configuration

Create a local `.env` file or configure the deployment platform directly. Never commit actual secret values.

```dotenv
SARVAM_API_KEY=
NEO4J_URI=
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=
JWT_SECRET=replace-with-at-least-32-random-characters
INTERNAL_API_KEY=replace-with-a-separate-random-secret
CORS_ORIGINS=http://localhost:5173
VITE_API_URL=http://localhost:8000
```

Important boundaries:

- `JWT_SECRET` and `INTERNAL_API_KEY` must be separate values.
- Production CORS must list only trusted application origins.
- Neo4j credentials remain server-side and must never use a `VITE_` prefix.
- Customer or attacker-controlled content must not automatically become trusted permanent memory or training data.

## Verification

Run the same core checks used by CI:

```bash
python -m pip install -r backend/requirements.txt pytest
python -m pip install -e .
python -m compileall -q backend
python -m pytest backend -q
python backend/verify.py
python -m backend.cli --json doctor

cd frontend
npm ci
npm run lint
npm run build
npm audit --omit=dev --audit-level=high

cd ../mobile
npm ci
npx tsc --noEmit
npm run lint
```

Pull requests and pushes to `main` are checked by GitHub Actions. The pipeline includes:

- Python 3.11 and 3.12 backend tests
- CLI installation and smoke tests
- Frontend linting and production builds
- Mobile type and lint checks when mobile files change
- Python and npm dependency audits
- CodeQL analysis for Python and JavaScript/TypeScript
- Committed-secret detection
- Build-artifact retention
- A final aggregate CI gate

Vercel creates a preview deployment for pull requests. Production releases should merge a reviewed, green PR and follow documented verification and rollback procedures.

## Deployment

### Vercel frontend

The root `vercel.json` builds the frontend and forwards `/api/*` traffic to the deployed backend. Configure the Vercel project through the GitHub integration so every PR receives an isolated preview.

### Render backend

The included `render.yaml` defines the FastAPI deployment. Production requires:

- `SARVAM_API_KEY`
- `NEO4J_URI`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
- `JWT_SECRET`
- `INTERNAL_API_KEY`
- `CORS_ORIGINS`, set to the deployed frontend origin

If a separate Render frontend is used, set `VITE_API_URL` to the backend service URL.

## Repository access and contributions

This repository is public so anyone can view the project, review the source code, and learn how VEKTRA works. Direct development and maintenance of the official VEKTRA repository are restricted to authorized collaborators—currently Anandhu and Afnan.

- Public visitors may view and clone the repository.
- Only explicitly authorized collaborators may push branches or edit the official repository.
- Changes to `main` should be made through reviewed pull requests.
- Issues and suggestions are welcome, but outside code contributions are accepted only with prior approval from the maintainers.
- Forks are independent copies and are not official VEKTRA releases.

Being able to view this public repository does not grant permission to represent a modified copy as an official VEKTRA product.

## Security and responsible use

Use VEKTRA only on systems and data you own or are explicitly authorized to assess. Recommendations and simulations must be reviewed before production execution. High-impact or irreversible actions require human approval, least-privilege credentials, complete audit logs, and tested rollback procedures.

Do not publish security vulnerabilities in public issues. Report them privately through [GitHub Security Advisories](https://github.com/anandh0u/vektra/security/advisories/new).

## Product direction

VEKTRA’s development path is intentionally phase-gated:

1. Secure company and platform foundation
2. Tenant-isolated temporal threat memory
3. Trusted threat-intelligence ingestion
4. Customer evidence and telemetry integration
5. Detection, correlation, and attack-path reasoning
6. Specialist security-agent coordination
7. Isolated malware and artifact analysis
8. Evaluation, feedback, and controlled learning
9. Enterprise integrations and analyst workflows
10. Supervised, reversible response automation
11. Enterprise trust, compliance, and resilience
12. Global defensive-security research and intelligence

Capability is not considered complete because it produces an impressive demonstration. It is complete only when its evidence, security, reliability, privacy, operational, and customer-value exit criteria are satisfied.

## License

See [LICENSE](LICENSE) for the repository’s license terms.
