[English](PROJECT_STATUS.md) | [中文](PROJECT_STATUS_zh.md) | [Deutsch](PROJECT_STATUS_de.md)

# Project status & handoff

_Zuletzt aktualisiert: 2026-06-16._

## Was das ist

LLM Carbon Index — schätzt den CO₂-Fußabdruck der **OpenRouter-sichtbaren** LLM-Inferenz (Schätzungen mit `{low,mid,high}`-Bereichen, **keine** Messungen; partieller Ausschnitt, keine globalen Emissionen). Statische Pipeline → committed JSON → statisches Frontend.

- **Repo:** https://github.com/wyl2607/llm-carbon-index (öffentlich)
- **Live-Site:** https://wyl2607.github.io/llm-carbon-index/ (GitHub Pages)

## Wo alles lebt (Repo ist self-contained)

- `PLAN.md` — der ursprüngliche phasierte Plan. `CLAUDE.md` — harte Regeln.
- `specs/INDEX.md` + `specs/phase-*.md` — das Build-Handbuch (war das Specs-ZIP).
- `docs/ENGINEERING_STANDARDS.md`, `docs/DATA_SCHEMAS.md` (kanonische Artefaktformen), `docs/ASSUMPTIONS.md` (jede Zahl + Quelle), `docs/methodology.md` (thesis-grade Writeup), `docs/absorbed-from-gemini.md` (Merge-Provenienz).
- `pipeline/` — `config.py`/`types.py` (eingefrorene phasenübergreifende Verträge), `openrouter.py` + `storage.py` + `ingest.py` (P1), `ranges/tokens/energy/grid/carbon/estimate.py` (P2), `output.py` + `run.py` (P3). `schemas/output.schema.json`.
- `data/` — `crosswalk/`, `energy/`, `assumptions/`, `grid/` (gesetzte YAML), `output/latest.json` + `history/{date}.json` (von CI committed). `data/raw/` ist Cache (gitignored).
- `web/` — Vite+React+TS Dashboard, das `data/output/latest.json` liest. `scratch/prove_math.py` ist der Phase-0-Beweiser.

## Status — MVP (0–5) + Phase 6A–6E erledigt

| Phase | Status |
|---|---|
| 0 prove-math, 1 ingestion, 2 estimation, 3 output+schema, 4 frontend, 5 methodology+CI | ✅ erledigt, siehe `specs/INDEX.md` für Commit-Hashes |
| 6A green-electricity scenarios, 6B market-vs-location, 6C trends+Jevons, 6D water (WUE) | ✅ erledigt (in das Premium-Dashboard ausgeliefert; Hashes in `specs/INDEX.md`) |
| 6E coverage automation (scope honesty) | ✅ erledigt — Backend 65463cf + Frontend 414f06e; UI-Hinweis ruht, bis die Pipeline einen non-zero unmapped-Anteil emittiert (alle aktuellen Top-Modelle sind gemappt) |

- Tests: `uv run pytest -q` → 51 collected/grün; `uv run ruff check .` clean.
- `python -m pipeline.run --date latest` produziert ein schema-valides `latest.json`.
- CI: `ci.yml` (Tests/ruff bei PR/push), `pipeline.yml` (täglicher 06:30 UTC Cron + `workflow_dispatch`, nutzt Repo-Secret `OPENROUTER_API_KEY`, committet Daten bei Änderung), `deploy.yml` (Pages; chained vom Pipeline via `workflow_run`).
- Live-Site verifiziert, zeigt **reale** OpenRouter-Daten (50 Modelle, modeled_traffic_fraction ≈ 0.94).

## Bekannte Probleme / Top-Nächste Aufgaben

1. ~~**Crosswalk vs. reale Slugs (höchster Wert).** Reale OpenRouter `model_permaslug`-Werte tragen Datums-Suffixe (z. B. `minimax/minimax-m3-20260531`), verfehlen daher die Phase-2-Crosswalk-Seeds → jedes reale Modell wird derzeit zu `UNKNOWN_MODEL` + `FALLBACK_ENERGY_CLASS` + origin `OTHER` aufgelöst (ehrlich, aber nicht aufschlussreich). Fix: permaslug→base-slug normalisieren (Datums-Suffix entfernen) und/oder `data/crosswalk/model_crosswalk.yaml` + `data/energy/intensity.yaml` mit den aktuellen Top-Modellen erweitern (mit Quellen in `ASSUMPTIONS.md`).~~ **(✅ Behoben)**
2. **Live-Netzdaten.** Repo-Secret `ELECTRICITYMAPS_API_KEY` setzen, um Live-Intensität zu nutzen; ohne diesen fällt `grid.py` auf Jahresfaktoren zurück (`FALLBACK_GRID_ANNUAL`).
3. **🔑 OpenRouter-Key rotieren.** Er wurde während der Entwicklung im Klartext geteilt; auf openrouter.ai rotieren und Secret neu setzen: `gh secret set OPENROUTER_API_KEY --repo wyl2607/llm-carbon-index`.
4. **Phase 6 — alle Roadmap-Items ✅ erledigt.** 6A–6D (Szenarien, Market-vs-Location, Trends/Jevons, Wasser) + **6E Coverage-Automation** (unmapped Top-List-Slugs flaggen, unmapped-traffic % + Wartungs-To-Do, stilles Bucketing von Unknowns stoppen; Backend 65463cf, Frontend 414f06e, Spec `specs/phase-6e-coverage-automation.md`). Der 6E-UI-Hinweis bleibt dormant, bis ein Top-Modell außerhalb von `model_crosswalk.yaml` liegt (aktuell alle gemappt → unmapped fraction = 0, korrekt).
5. **Lose Enden — nicht gemergte Arbeit (vor nächstem Release entscheiden):** (Die App.tsx Thesis & ESG-Sektionsentfernung ist jetzt auf main committed — e56d2a2, gemäß der Entscheidung, sie zu behalten.)
   - `feat/scenario-math` (Worktree `../llm-carbon-index-6a`, Commit 2281962) extrahiert die Green-Shift-CO₂-Mathematik in eine getestete reine Fn — **ahead of main, unmerged.**

## Multi-Agent-Orchestrierung (was funktionierte / aktuelle Limits)

- **grok** war die zuverlässige Schreibspur innerhalb von Claude Code (`--cwd <wt> --always-approve --prompt-file`); führte Phase 1/2/3/4 in parallelen Worktrees aus. **agy kann nicht headless innerhalb von Claude Code schreiben** (sein einziges auto-approve-Flag ist classifier-blocked). **gemini/opencode** = nur leichtes Read-Only / Review.
- **⚠️ Update 2026-06-16:** Innerhalb der aktuellen Claude-Code-Session blockt der Auto-Mode-Classifier nun AUCH `grok --always-approve` (als Autonomous-Agent-Loop / "Create Unsafe Agents" markiert). Da agy + grok Auto-Write beide blockiert sind und das gemini Free-Tier 429 "no capacity" zurückgibt, degradiert das konforme Muster zu **Lanes generieren nach stdout (read-only) → Claude reviewed, apply und läuft `uv run pytest -q` / `ruff` zur Verifikation.** Die auto-approve-Flags innerhalb von Claude Code nicht erneut versuchen; Writes über Claude oder interaktiv genehmigte Lanes treiben.
  (gemini wurde im `--approval-mode plan` noch dabei beobachtet, eine Datei in-place zu editieren — seine Ausgabe als untrusted behandeln und diffen.)
- Der Coordinator muss vor dem Fan-out phasenübergreifende Verträge einfrieren (`types.py`/`config.py`/`schemas/output.schema.json`/pinned deps/fixtures) und dann jeden Diff/Build/Test verifizieren und integrieren.
