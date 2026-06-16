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
- **Methodik**: Konsultieren Sie unser detailliertes [Methodik- und Unsicherheitsrahmenwerk](docs/methodology.md) (derzeit auf Englisch), das die Gleichungen, Datenquellen (z. B. EcoLogits, AI Energy Score, Electricity Maps) und Sensitivitätsanalysen erklärt.

## Status und Versionierung

Bitte konsultieren Sie das [CHANGELOG_de.md](CHANGELOG_de.md) für ein vollständiges Update-Protokoll, das nach Versionsnummern nachvollziehbar ist. Alle zukünftigen Updates erfordern die gleichzeitige Aktualisierung der englischen, chinesischen und deutschen Dokumentation.

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
