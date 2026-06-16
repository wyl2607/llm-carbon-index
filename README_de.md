# LLM Carbon Index

[English](README.md) | [中文](README_zh.md) | [Deutsch](README_de.md)

[![Live Demo](https://img.shields.io/badge/Live_Demo-wyl2607.github.io%2Fllm--carbon--index-16a34a?style=for-the-badge)](https://wyl2607.github.io/llm-carbon-index/)
[![GitHub Actions Pipeline](https://img.shields.io/github/actions/workflow/status/wyl2607/llm-carbon-index/pipeline.yml?style=for-the-badge&label=Pipeline)](https://github.com/wyl2607/llm-carbon-index/actions)

Dies ist ein transparentes, öffentlich zugängliches Dashboard-Projekt, das entwickelt wurde, um den **geschätzten CO₂-Fußabdruck des über die [OpenRouter Rankings](https://openrouter.ai/rankings) sichtbaren LLM-Inferenzverkehrs** zu berechnen. Das Projekt bietet detaillierte Aufschlüsselungen nach Modell, Open-/Closed-Source, Anbieter, Herkunftsland des Modells und den Emissionsfaktoren des Stromnetzes am primären Standort.

## Einschränkung des Anwendungsbereichs (Nicht verhandelbare Grundprinzipien)

Dieses Projekt schätzt den CO₂-Fußabdruck des **sichtbaren LLM-Inferenzverkehrs auf OpenRouter** — dies stellt nur einen **repräsentativen, aber begrenzten Teil** der globalen KI-Nutzung dar. Große B2C-Anwendungen wie ChatGPT, Gemini und Claude sind **nicht** enthalten. Dies ist **keine** Messung der globalen Rechenzentrumsemissionen. **Alle Zahlen sind Schätzungen mit expliziten Unsicherheitsbereichen, keine Messungen** — insbesondere bei Closed-Source-Modellen, deren Parameter, Hardware und Rechenzentrumsstandorte nicht öffentlich bekannt gegeben werden.

## 📊 Für Forscher und ESG-Experten

Die in diesem Projekt generierten Daten sind vollständig quelloffen und für die Integration in Ihre eigenen Nachhaltigkeitsberichte, Lebenszyklusanalysen (LCA) oder Scope-3-Offenlegungen nach CSRD/ESRS konzipiert.

- **Daten-Download**: Täglich aktualisierte JSON-Daten finden Sie unter [`data/output/latest.json`](https://raw.githubusercontent.com/wyl2607/llm-carbon-index/main/data/output/latest.json).
- **ESG- / CSRD-Export**: [`data/output/esg_export.json`](https://raw.githubusercontent.com/wyl2607/llm-carbon-index/main/data/output/esg_export.json) bildet standort- und marktbasierte Summen auf das GHG-Protocol-Scope-2-Dual-Reporting + eine ESRS-E1-Position ab, mit eingebettetem Scope-/Unsicherheitshinweis. Ein JSON/CSV-Download ist auch in der Web-UI verfügbar.
- **Methodik**: Konsultieren Sie unser detailliertes [Methodik- und Unsicherheitsrahmenwerk](docs/methodology.md) (derzeit auf Englisch), das die Gleichungen, Datenquellen (z. B. EcoLogits, AI Energy Score, Electricity Maps) und Sensitivitätsanalysen erklärt.

## Architektur (festgelegt)

Statisch zuerst, kein Server zum Betreuen (gemäß `PLAN.md`):

```
OpenRouter rankings ─▶ pipeline (Python) ─▶ output/*.json (committed by CI) ─▶ web/ (Vite+React, static)
                                  │
                      EcoLogits + AI Energy Score (energy)
                      Electricity Maps + annual fallbacks (grid)
```

Kein Live-Backend für v1. Das Frontend liest committed JSON; Datenaktualisierungen erfolgen über einen GitHub Actions Cron (Phase 5).

## Status und Versionierung

Bitte konsultieren Sie das [CHANGELOG_de.md](CHANGELOG_de.md) für ein vollständiges Update-Protokoll, das nach Versionsnummern nachvollziehbar ist. Alle zukünftigen Updates erfordern die gleichzeitige Aktualisierung der englischen, chinesischen und deutschen Dokumentation.

## Dateimanifest — was ein vollständiges Projekt hier benötigt

Legende: ✅ existiert · 🟡 Stub/Seed · ⬜ geplant (in seiner Phase erstellt).

```
llm-carbon-index/
├── README.md                       ✅ this file (scope + reproduce + manifest)
├── CLAUDE.md                       ✅ agent guardrails
├── PLAN.md                         ✅ phased plan (canonical source of truth)
├── LICENSE                         ✅ MIT + data-is-estimates notice
├── CONTRIBUTING.md                 ✅ phase workflow + hard constraints
├── SECURITY.md                     ✅ secrets policy + how to report
├── CHANGELOG.md                    ✅ Keep-a-Changelog
├── .gitignore                      ✅ incl. .env, node_modules, data/raw
├── .editorconfig                   ✅ formatting baseline
├── .env.example                    ✅ documents env var NAMES only
├── pyproject.toml                  ✅ deps + pytest + ruff config
├── data/                           model data ONLY here (Hard Constraint #6)
│   ├── grid_fallback_factors.yaml  🟡 annual grid factors (seeded, cited)
│   ├── provider_region_map.yaml    🟡 provider → likely region (seeded, cited)
│   ├── model_crosswalk.yaml        🟡 schema stub (seeded in Phase 2)
│   └── closed_model_assumptions.yaml 🟡 schema stub (seeded in Phase 2)
├── pipeline/                       Python pipeline (Phases 1–4, 6)
│   ├── README.md                   ✅ module map
│   ├── fetch_openrouter.py         ✅ Phase 1
│   ├── electricity.py              ✅ Phase 3
│   ├── estimate_energy.py          ✅ Phase 2
│   ├── estimate_carbon.py          ✅ Phase 3
│   ├── build_outputs.py            ✅ Phase 4
│   └── sensitivity.py              ✅ Phase 6K
├── tests/
│   ├── test_prove_math.py          ✅ conversion guards + sanity + ranges
│   ├── test_energy.py              ✅ Phase 2
│   ├── test_carbon.py              ✅ Phase 3
│   └── fixtures/                   ✅ (.gitkeep)
├── output/                         generated JSON (committed by CI, Phase 4+)
│   └── .gitkeep                    ✅
├── web/                            Vite + React static frontend (Phase 4, 6)
│   └── README.md                   ✅ planned views + absorbed UI design
├── docs/
│   ├── methodology.md              ✅ thesis methodology (scope/formulas/sources)
│   ├── absorbed-from-gemini.md     ✅ merge provenance + constraint reconciliation
│   ├── DATA_SCHEMAS.md             ✅ Phase 6 docs
│   ├── ASSUMPTIONS.md              ✅ Phase 6 docs
│   ├── PROJECT_STATUS.md           ✅ Phase 6 docs
│   ├── BOUNDARY.md                 ✅ Phase 6I
│   └── FAIRNESS.md                 ✅ Phase 6I
└── .github/
    ├── workflows/
    │   ├── ci.yml                  ✅ run tests + ruff on push/PR
    │   └── update-data.yml         ✅ Phase 5 daily cron → commit JSON
    ├── ISSUE_TEMPLATE/             ✅ bug + data-correction templates
    └── PULL_REQUEST_TEMPLATE.md    ✅ constraint checklist
```

## Reproduktion

Um den Pipeline-Lauf für ein bestimmtes Datum zu reproduzieren:

```bash
git clone https://github.com/wyl2607/llm-carbon-index.git
cd llm-carbon-index
uv sync
make verify 2026-06-14  # Erwartete Ausgabe: PASS
```

## Datenquellen

- **Ranking-Daten**: `Quelle: OpenRouter (openrouter.ai/rankings), Stand: {date}`.
- **CO₂-Intensität des Stromnetzes**: Electricity Maps (Echtzeitdaten) + Ember/IEA (jährliche Durchschnittswerte).
- **Energieverbrauch**: EcoLogits + Hugging Face AI Energy Score. Siehe [`docs/methodology.md`](docs/methodology.md).
