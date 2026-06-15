## What & why

<!-- Brief summary. Which PLAN.md phase does this belong to? State assumptions. -->

## Hard-constraint checklist (see CONTRIBUTING.md)

- [ ] No secrets committed; keys read from env (`.env` still gitignored)
- [ ] No magic numbers — every new constant cites a source in code **and** `docs/methodology.md`
- [ ] Conversion guards tested (Wh↔kWh, g↔kg, per-token↔per-1000-queries)
- [ ] No silent 0/null for unknown models (`source: fallback` + `confidence`)
- [ ] Uncertainty carried as `{min, max}` — not collapsed to one number
- [ ] Model data only in `data/*.yaml` — nothing model-specific in `.py`
- [ ] OpenRouter limits respected + attribution string included where data is shown/exported
- [ ] Scope statement intact (partial slice, estimates not measurements)

## Verification

```
uv run pytest
uv run ruff check .
```
