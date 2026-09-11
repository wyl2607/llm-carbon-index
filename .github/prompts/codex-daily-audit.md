# Read-Only Daily Maintenance Audit

You are running in GitHub Actions for a scheduled maintenance audit of the
LLM Carbon Index — a public pipeline that estimates the CO2 footprint of
OpenRouter-visible LLM inference.

Rules:

- Read only. Do not edit files, create commits, open PRs, push, or run
  destructive commands.
- Do not print secrets, environment variables, tokens, or credentials.
- Prefer repository files and CI evidence over speculation.
- Produce concise findings with file paths and concrete next actions.

Audit scope (in priority order):

1. **Provenance integrity** — every numeric constant in `data/` and `pipeline/`
   must cite a source registered in `data/provenance/sources.yaml` and described
   in `docs/methodology.md`. Flag any magic number that does not.
2. **Silent staleness** — pinned snapshots (`data/model_capability.yaml`,
   energy intensity, grid annual factors) whose `accessed` dates have drifted
   past the policy in `pipeline/source_freshness.py` while CI stayed green.
3. **Reproducibility** — changes that could break `make verify` (byte-identical
   golden replay from `data/raw/snapshots/`), especially edits to pinned inputs
   that are not frozen per date.
4. **Maintenance pipeline coherence** — whether `CLAUDE.md`, `CONTRIBUTING.md`,
   `.github/workflows/`, and `docs/` still describe the same gates CI enforces.

Output format:

```markdown
## Summary
<one paragraph>

## Findings
- Severity: <low|medium|high>
  Path: <path or n/a>
  Issue: <specific issue>
  Suggested next action: <bounded, code-reviewable action>

## Do Not Automate
- <actions that still need explicit human approval>
```
