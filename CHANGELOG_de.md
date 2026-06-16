# Änderungsprotokoll (Changelog)

[English](CHANGELOG.md) | [中文](CHANGELOG_zh.md) | [Deutsch](CHANGELOG_de.md)

Alle bemerkenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [0.6.2] - 2026-06-16 (Phase 7 - Deutsch)
### Hinzugefügt
- Dreisprachige Unterstützung (EN, ZH, DE) mit Deutsch als Standard im Dashboard.
- Hinzufügen von `CHANGELOG_de.md` und `README_de.md`, um die Anforderung zu erfüllen, dass alle drei Sprachen bei Updates synchronisiert sein müssen.
- Sprachumschalter in der Benutzeroberfläche von Schaltflächen zu einem Dropdown-Menü (`<select>`) geändert.

## [0.7.0] - 2026-06-16 (vNext: Genauigkeit & Abdeckung)
### Hinzugefügt
- **Gemessene Energie + Idle (6J)**: Die Pipeline nutzt nun gemessene Intensitäten von AI Energy Score / EcoLogits vor dem Fallback, plus einen optionalen `E-IDLE`-Always-on-Term. `energy_measured_fraction` steigt von 0,0 auf ≈0,29 (3 von 50 Modellen, token-gewichtet).
- **Ranking → Stufen (6M)**: Modelle mit überlappenden `{low,high}`-CO₂-Bereichen werden zu nicht unterscheidbaren `totals.tiers` gruppiert; Stufen stehen im Vordergrund, exakte Ränge sind zweitrangig.
- **Physischer Embodied-Schätzer (6N)**: LLMCarbon-Stil `Die-Fläche × CPA × GPU-Stunden/Lebensdauer/Auslastung` (`pipeline/embodied.py`), neben dem Verhältnis-Proxy berichtet, mit Methodenspanne.
- **Literatur-Kreuzvalidierung (6P)**: `validate_literature.py` + `literature_anchors.yaml` → `validation.json`; BLOOM/Gemini bestehen, OpenAI 0,34 Wh nur als Report (Blog), Jegham-Langprompt geflaggt.
- **MoE-bewusste Energie (6Q)**: Parameterklassen-Fallback auf `active_params_b` (nicht Gesamt) geschlüsselt.
- **Dynamisches Regime / Batching (6O)**: belegter Regime-Multiplikator (`regime_factors.yaml`) + What-If-Schieberegler für Prompt-Länge/Batch.
- **ESG- / CSRD-Scope-2-Export (6R)**: `esg_export.json` + Web-Download, der standort-/marktbasierte Summen auf GHG-Protocol-Scope-2-Dual-Reporting + ESRS-E1 abbildet, mit unentfernbarem Hinweis.
- Vollständige zh/de-Lokalisierung der neuen Stufen-, Regime- und ESG-UI-Oberflächen + Methodik §14–§15.

## [0.6.1] - 2026-06-16 (Phase 7)
### Hinzugefügt
- Vollständige chinesische (ZH) Lokalisierung für die Benutzeroberfläche (`web/src/lib/i18n.ts`).

### Geändert
- Textkontrast für bessere Lesbarkeit auf der Website erhöht.
- Das Theming der Benutzeroberfläche wurde in Richtung „Premium Dark ESG“ weiterentwickelt.

## [0.6.0] - 2026-06-16 (Phase 6)
### Hinzugefügt
- „What If“-Simulator (Was-wäre-wenn-Simulator) für Sensitivitätsanalysen.
- Strengere Versionsverfolgung und Methodik-Richtlinien.

## [0.5.0] - 2026-06-15 (Phase 5)
### Hinzugefügt
- Thesis-grade `docs/methodology.md` mit detaillierten Formeln, Konstanten und Quellen.
- GitHub Actions CI für tägliches Datenabrufen und automatisiertes Deployment zu GitHub Pages.

## [0.4.0] - 2026-06-15 (Phase 4)
### Hinzugefügt
- Vite + React statisches Frontend-Dashboard.
- `build_outputs.py` zum Aggregieren der Pipeline-Ausgabe in `latest.json` und `timeseries.json`.

## [0.3.0] - 2026-06-15 (Phase 3)
### Hinzugefügt
- Integration der Kohlenstoffintensität des Stromnetzes (Electricity Maps und jährliche Fallbacks).
- What-If-Szenario-Simulator für räumliche Workload-Verschiebung.

## [0.2.0] - 2026-06-15 (Phase 2)
### Hinzugefügt
- Energie-Schätzlogik (`estimate_energy.py`) mit Fallback-Mechanismen basierend auf Modell-Parameterklassen.

## [0.1.0] - 2026-06-15 (Phase 1)
### Hinzugefügt
- Daten-Ingestion-Pipeline (`fetch_openrouter.py`) für OpenRouter-Rankings.

## [0.0.1] - 2026-06-15 (Phase 0)
### Hinzugefügt
- Projekt-Gerüst, `PLAN.md`, `CLAUDE.md` und initiale strukturelle Constraints.
