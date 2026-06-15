# Security Policy

## Secrets

This project **never** commits secrets. API keys (OpenRouter, Electricity Maps)
are read from environment variables; `.env` is gitignored and only
`.env.example` — documenting variable *names* — is tracked. CI reads keys from
repository secrets.

If you discover a committed secret, treat it as compromised: rotate the key
immediately, then open a private report (below) so we can purge it from history.

## Reporting a vulnerability

Please report security issues privately rather than in a public issue:

- Use GitHub's **"Report a vulnerability"** (Security → Advisories) on this repo, or
- email the maintainer listed on the GitHub profile.

We aim to acknowledge within a few days. Because this is a static data project
with no live backend (v1), the main surfaces are: leaked API keys, and
supply-chain risk in build dependencies.

## Data integrity

Figures here are **estimates with uncertainty ranges**. Misrepresenting them as
measurements, or stripping the uncertainty ranges / scope statement, is treated
as a correctness defect — see `CONTRIBUTING.md`.
