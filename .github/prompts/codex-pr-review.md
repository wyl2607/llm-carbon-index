# Read-Only Pull-Request Review

You are reviewing a pull request to the LLM Carbon Index, a public pipeline that
estimates the CO2 footprint of OpenRouter-visible LLM inference. The diff is in
`pr-diff.patch` (summary in `pr-diff-stat.txt`).

Rules:

- Read only. Do not edit files, commit, push, or open PRs.
- Do not print secrets, tokens, or credentials.
- Review the diff, not the whole repository. Cite file and line.
- If the diff is clean on an axis, say so in one line rather than inventing findings.

Review against the project's hard constraints (`CONTRIBUTING.md`, `CLAUDE.md`):

1. **No magic numbers.** Every new numeric constant (energy intensity, PUE,
   emission factor, parameter count, capability index) must cite a source in a
   code comment *and* be registered in `data/provenance/sources.yaml` +
   `docs/methodology.md`.
2. **No silent zero/null.** An unmapped or unknown model must be flagged
   `source: "fallback"` with a `confidence` field — never contribute 0 silently.
3. **Unit-conversion safety.** Wh<->kWh, g<->kg, per-token<->per-1000-queries.
   Conversion errors are the project's highest-impact failure mode; demand a test
   for any new conversion.
4. **Reproducibility.** Changes to pinned inputs must not break `make verify`
   (byte-identical golden replay). Pinned inputs consumed by replay must be
   frozen per date under `data/raw/snapshots/<date>/`, not read live.
5. **Secrets.** Keys come from env vars only; no `.env` content, no key in CI logs.
6. **Uncertainty honesty.** No change may present an estimate as a measurement or
   drop an uncertainty range from published output.

Output format:

```markdown
## Verdict
<one line: approve / approve with comments / request changes>

## Findings
- Severity: <low|medium|high>
  Path: <file:line>
  Issue: <specific issue>
  Suggested fix: <concrete change>

## Checked and clean
- <constraints from the list above that the diff does not violate>
```
