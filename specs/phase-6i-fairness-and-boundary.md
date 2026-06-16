# specs/phase-6i-fairness-and-boundary.md — Fairness, comparability & system boundary

## Objective
Make the index **fair and complete on paper and in tests**: (a) document and *test* where the methodology could systematically advantage or disadvantage a model class, provider, or origin country; (b) quantify whether leaderboard **rankings** survive reasonable alternative assumptions; (c) state the LCA **system boundary** explicitly — what's counted, what isn't, and why. Serves *公正 + 完整* (impartiality + completeness).

## Prerequisites
6H done (reproducible runs make sensitivity trustworthy). Read `ASSUMPTIONS.md` (A2, A3, A4, L-TOKENIZER) and `DATA_SCHEMAS.md` §1.

## Tasks
1. `docs/BOUNDARY.md` — the system boundary with a simple diagram (ASCII or figure):
   - **In:** API inference compute energy, data-center PUE overhead (A4), operational grid emissions (location-based), water (6D).
   - **Out, each with a stated reason:** model *training*, embodied/manufacturing emissions of hardware, network transmission, end-user devices, idle/over-provisioning, and **all non-OpenRouter traffic** (consumer apps). Tie back to the scope statement.
2. `docs/FAIRNESS.md` — enumerate and address each asymmetry:
   - **open vs closed:** open = measured (6J), closed = assumed wide ranges (A3). State that comparisons must use **ranges, not midpoints**, that closed ranges are intentionally wider, and that a closed model is never ranked "better" on a midpoint alone.
   - **tokenizer non-comparability (L-TOKENIZER):** total-token sums aren't apples-to-apples; promote **CO₂ per output token** as the fairer cross-model axis and label the caveat wherever a total-token sum appears.
   - **origin neutrality:** identical method regardless of `origin`; the only origin-linked difference is the *sourced* grid factor of the assumed region.
   - **traffic weighting:** totals are token-weighted (a few models dominate); report an **unweighted** companion so the picture isn't one model's artifact.
3. `pipeline/fairness.py` (pure):
   - `rank_stability(models, assumption_sets) -> report` — recompute the top-N leaderboard under each alternative-but-defensible assumption set (io-ratio 70:30 vs 80:20, PUE 1.1/1.2/1.5, best-vs-assumed region) and report, per board (total CO₂ and efficiency), how many top-N ranks change and the max rank displacement.
   - `origin_invariance(model) -> bool` — swapping only the `origin` label must not change energy/CO₂.
4. `build_outputs.py` — emit `totals.fairness` (schema below): the rank-stability summary + an `unweighted` totals companion. Bump `methodology_version`.
5. **UI:** a "Comparability & fairness" note linked from the leaderboard; a rank-stability indicator (e.g. *"top-10 order is robust / fragile under alternative assumptions"*); default the cross-model sort to the efficiency axis with the tokenizer caveat visible.
6. `data/assumptions/alt_assumption_sets.yaml` — the defensible alternative sets used by `rank_stability`, each value carrying a `source_id` (6G).

## Interfaces & schemas
Add to `totals` (`DATA_SCHEMAS.md` §1):
```jsonc
"fairness": {
  "rank_stability": {
    "by_co2":        { "top_n": 10, "ranks_changed": 0, "max_displacement": 0 },
    "by_efficiency": { "top_n": 10, "ranks_changed": 0, "max_displacement": 0 }
  },
  "unweighted": { "co2_kg": { "low": 0, "mid": 0, "high": 0 } }
}
```

## Test requirements
- **Origin invariance:** relabeling `origin` (CN↔US) with all else fixed leaves energy/CO₂ unchanged.
- **Stability is computed, not asserted true:** `rank_stability` returns counts for each alternative set on a fixture; a deliberately fragile fixture reports `ranks_changed > 0`.
- **Range-not-midpoint rule:** a test/lint that the leaderboard comparison path consumes the `Range`, not a bare `mid`.
- **Boundary presence:** `methodology.md` references `BOUNDARY.md`; scope statement unchanged.

## Acceptance criteria
- [ ] `BOUNDARY.md` + `FAIRNESS.md` exist and are linked from `methodology.md` and the UI.
- [ ] `totals.fairness` (rank stability + unweighted companion) emitted and rendered.
- [ ] Origin-invariance and rank-stability tests pass; alternative sets are sourced.
- [ ] `pytest` green; `ruff` clean; `DATA_SCHEMAS.md` + `ASSUMPTIONS.md` updated in the same commit.

## Standards
ENGINEERING_STANDARDS §2 (ranges drive comparisons), §5; CLAUDE.md scope statement. No origin/provider favoritism in code.

## Out of scope
Replacing fallbacks with measured data (6J). Probabilistic intervals (6K). Visual restyle (6L).

## Definition of Done
ENGINEERING_STANDARDS §8 + acceptance above. Update `specs/INDEX.md`.
