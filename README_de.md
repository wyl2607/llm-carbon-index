# LLM Carbon Index

[English](README.md) | [中文](README_zh.md) | [Deutsch](README_de.md)

[![Live Demo](https://img.shields.io/badge/Live_Demo-wyl2607.github.io%2Fllm--carbon--index-16a34a?style=for-the-badge)](https://wyl2607.github.io/llm-carbon-index/)
[![GitHub Actions Pipeline](https://img.shields.io/github/actions/workflow/status/wyl2607/llm-carbon-index/pipeline.yml?style=for-the-badge&label=Pipeline)](https://github.com/wyl2607/llm-carbon-index/actions)

Dies ist ein transparentes, öffentlich zugängliches Dashboard-Projekt, das entwickelt wurde, um den **geschätzten CO₂-Fußabdruck des über die [OpenRouter Rankings](https://openrouter.ai/rankings) sichtbaren LLM-Inferenzverkehrs** zu berechnen. Das Projekt bietet detaillierte Aufschlüsselungen nach Modell, Open-/Closed-Source, Anbieter, Herkunftsland des Modells und den Emissionsfaktoren des Stromnetzes am primären Standort.

**▶ [Zum Live-Dashboard](https://wyl2607.github.io/llm-carbon-index/)** — Ranglisten nach Gesamt-CO₂ und nach Effizienz, Schieberegler für Ökostrom-Szenarien, ein markt- vs. standortbasierter Scope-2-Umschalter und eine Methodik-&-Unsicherheits-Seite. Dreisprachig (EN / 中文 / DE).

## Einschränkung des Anwendungsbereichs (Nicht verhandelbare Grundprinzipien)

Dieses Projekt schätzt den CO₂-Fußabdruck des **sichtbaren LLM-Inferenzverkehrs auf OpenRouter** — dies stellt nur einen **repräsentativen, aber begrenzten Teil** der globalen KI-Nutzung dar. Große B2C-Anwendungen wie ChatGPT, Gemini und Claude sind **nicht** enthalten. Dies ist **keine** Messung der globalen Rechenzentrumsemissionen. **Alle Zahlen sind Schätzungen mit expliziten Unsicherheitsbereichen, keine Messungen** — insbesondere bei Closed-Source-Modellen, deren Parameter, Hardware und Rechenzentrumsstandorte nicht öffentlich bekannt gegeben werden.

## 📊 Für Forscher und ESG-Experten

Die in diesem Projekt generierten Daten sind vollständig quelloffen und für die Integration in Ihre eigenen Nachhaltigkeitsberichte, Lebenszyklusanalysen (LCA) oder Scope-3-Offenlegungen nach CSRD/ESRS konzipiert.

- **Daten-Download**: Täglich aktualisierte JSON-Daten finden Sie unter [`data/output/latest.json`](https://raw.githubusercontent.com/wyl2607/llm-carbon-index/main/data/output/latest.json).
- **ESG- / CSRD-Export**: [`data/output/esg_export.json`](https://raw.githubusercontent.com/wyl2607/llm-carbon-index/main/data/output/esg_export.json) bildet standort- und marktbasierte Summen auf das GHG-Protocol-Scope-2-Dual-Reporting + eine ESRS-E1-Position ab, mit eingebettetem Scope-/Unsicherheitshinweis. Ein JSON/CSV-Download ist auch in der Web-UI verfügbar.
- **Methodik**: Konsultieren Sie unser detailliertes [Methodik- und Unsicherheitsrahmenwerk](docs/methodology.md) (derzeit auf Englisch), das die Gleichungen, Datenquellen (z. B. EcoLogits, AI Energy Score, Electricity Maps) und Sensitivitätsanalysen erklärt.

## Architektur (festgelegt)

Statisch zuerst, kein Server zum Betreuen (gemäß [`PLAN.md`](PLAN.md)):

```
OpenRouter rankings ─▶ pipeline (Python) ─▶ data/output/*.json (committed by CI) ─▶ web/ (Vite + React, static)
                                  │
                      EcoLogits + AI Energy Score   (Energie)
                      Electricity Maps + jährliche Fallbacks   (Stromnetz)
```

Kein Live-Backend für v1. Das Frontend liest committetes JSON; ein täglicher GitHub-Actions-Cron ([`.github/workflows/pipeline.yml`](.github/workflows/pipeline.yml)) führt die Pipeline erneut aus, friert deren Eingaben als Snapshot ein, durchläuft alle Gates und committet frisches JSON nur, wenn die Reproduzierbarkeitsprüfung (`make verify`) besteht.

## Status

Streng phasenweise gebaut ([`PLAN.md`](PLAN.md)); das maßgebliche Phasen-Register mit Commit-Hashes liegt in [`specs/INDEX.md`](specs/INDEX.md), das vollständige versionierte Protokoll im [CHANGELOG_de.md](CHANGELOG_de.md). Aktuelle Methodik-Version **0.7.0**; `main` ist grün (ruff · 149 pytest · `make verify` byte-identische Reproduktion · Web `tsc`+build · 20 vitest) und deployt. Alle künftigen Updates erfordern die gleichzeitige Aktualisierung der englischen, chinesischen und deutschen Dokumentation.

| Phase | Umfang | Status |
|---|---|---|
| 0–1 | Gerüst + Mathe-Nachweis · OpenRouter-Datenaufnahme | ✅ fertig |
| 2 | Energieschätzung ([`pipeline/energy.py`](pipeline/energy.py)) | ✅ fertig |
| 3 | CO₂ + Stromnetz + Ökostrom-Substitution ([`pipeline/carbon.py`](pipeline/carbon.py), [`pipeline/grid.py`](pipeline/grid.py)) | ✅ fertig |
| 4 | Ausgabe-Assemblierung + Frontend ([`pipeline/output.py`](pipeline/output.py), [`web/`](web/)) | ✅ fertig |
| 5 | Methodik-Dokument + CI + Deployment | ✅ fertig |
| 6A–6E | Ökostrom-Szenarien · markt- vs. standortbasiert · Verlauf/Jevons · Wasser-Fußabdruck (WUE) · Abdeckungs-Automatisierung | ✅ fertig |
| 6F–6I | Schätzungs-Ehrlichkeit · Provenienz-Register („keine Zahl ohne Quelle“-Gate) · Reproduzierbarkeits-Harness (`make verify`) · Fairness + Grenze | ✅ fertig |
| 6J–6K | Gemessene Energie pro Token + Idle-Term (`energy_measured_fraction` 0 → 0.29) · OAT-Sensitivitätsanalyse | ✅ fertig |
| 6L–6R | Retrofuturistisches Re-Skin · Ranking → Tiering · physischer Embodied-Schätzer · Literatur-Querprüfung · MoE-Aktivparameter-Energie · dynamisches Regime/Batching · ESG/CSRD-Scope-2-Export | ✅ fertig |
| 7 | Mehrsprachigkeit i18n (en/zh/de) + UI-Lesbarkeit | ✅ fertig |

## Repository-Struktur

Modelldaten liegen **ausschließlich** in `data/*.yaml` (Harte Bedingung #6); die Pipeline ist reines Python; das Frontend ist eine statische Vite-+-React-App, die committetes JSON liest.

```
llm-carbon-index/
├── PLAN.md · CLAUDE.md · README.md · LICENSE · SECURITY.md · CONTRIBUTING.md · CHANGELOG.md
├── pyproject.toml · Makefile · .env.example      # Abhängigkeiten, `make verify|test|lint`, nur Env-Var-NAMEN
├── data/                                         # Modelldaten nur hier (Harte Bedingung #6)
│   ├── crosswalk/model_crosswalk.yaml            #   OpenRouter-Slug → Energiequelle + Annahmen
│   ├── assumptions/                              #   Closed-Modelle, Embodied-Hardware, Hersteller-Claims, Regime-Sets
│   ├── grid/annual_factors.yaml                  #   jährliche gCO₂/kWh-Fallbacks (Ember/IEA, zitiert)
│   ├── energy/intensity.yaml                     #   Energieintensität pro Token (zitiert)
│   ├── provenance/sources.yaml                   #   Quellenregister — jede Zahl muss hier auflösbar sein (6G-Gate)
│   ├── validation/literature_anchors.yaml        #   externe Wh/Query-Anker zur Querprüfung
│   ├── raw/snapshots/<date>/                      #   eingefrorene Tageseingaben für reproduzierbares Replay (6H)
│   └── output/                                    #   generiertes JSON, von CI committet
│       ├── latest.json · timeseries.json · sensitivity.json
│       ├── validation.json · esg_export.json · manifest.json
│       └── history/<date>.json
├── pipeline/                                     # ingest → energy → carbon → embodied/water → output
│   ├── ingest.py · openrouter.py · slugs.py · tokens.py
│   ├── energy.py · carbon.py · grid.py · embodied.py · water.py
│   ├── sensitivity.py · fairness.py · precision.py · ranges.py
│   ├── provenance.py · snapshot.py · manifest.py · verify.py   # Provenienz + Reproduzierbarkeit (6G/6H)
│   ├── validate_literature.py · output.py · run.py            # Querprüfung, Assemblierung, täglicher Einstieg
│   └── README.md                                              # Modul-Karte
├── tests/                                        # 149 Tests — vollständige CO₂-Kette + Einheiten-Wächter
├── web/                                          # Vite + React statisches Dashboard (liest data/output/*.json)
│   └── src/{components,lib,theme}                 # 6L retrofuturistisches Theme; dreisprachiges i18n (en/zh/de)
├── docs/                                         # methodology · DATA_SCHEMAS · ASSUMPTIONS · BOUNDARY · FAIRNESS (je ×3 Sprachen)
├── schemas/                                      # JSON-Schema für Ausgabe + ESG-Export
├── specs/                                        # Phasen-Specs + INDEX.md (maßgebliches Phasen-Register)
└── .github/workflows/                            # ci · pipeline (täglicher Cron) · deploy · codeql · gitleaks
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
- **CO₂-Intensität des Stromnetzes**: Ember/IEA-Jahresdurchschnittsfaktoren (zeilenweise erfasst). Live-Electricity-Maps-Unterstützung existiert, ist aber für veröffentlichte, reproduzierbare Goldens **deaktiviert** (`grid_live_fraction = 0.0`); siehe `docs/methodology.md` §11a.
- **Energieverbrauch**: EcoLogits + Hugging Face AI Energy Score. Siehe [`docs/methodology.md`](docs/methodology.md).
