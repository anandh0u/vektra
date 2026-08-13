# VEKTRA CLI

The CLI supports human-readable terminal output and stable JSON for automation.

## Install

```bash
python -m pip install -e .
vektra --version
```

You can also run it without installing:

```bash
python -m backend.cli doctor
```

## Configuration

- `VEKTRA_API_URL`: API origin; defaults to `http://localhost:8000`.
- `VEKTRA_TOKEN`: optional bearer token. Do not pass secrets directly in shared shell history.
- `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`: checked by `doctor` without printing their values.
- `SARVAM_API_KEY` and `JWT_SECRET`: checked by `doctor` without printing their values.

Global flags such as `--api`, `--token`, `--timeout`, and `--json` must appear before the command.

## Commands

```bash
# Local configuration diagnosis
vektra --json doctor

# Configuration plus deployed API connectivity
vektra --api https://vektra-six.vercel.app doctor --remote

# Deployment health
vektra --api https://vektra-six.vercel.app health

# Analyze a policy; exit 3 when the risk score is at least 70
vektra --json analyze policy.json --format iam --fail-above 70

# Start and monitor the complete workflow
vektra workflow rbac.yaml --format k8s --wait
```

Exit codes are automation-friendly: `0` success, `2` configuration/API/input error, `3` risk threshold reached, `4` workflow failure, and `130` interrupted.
