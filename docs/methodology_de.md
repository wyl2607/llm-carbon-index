[English](methodology.md) | [中文](methodology_zh.md) | [Deutsch](methodology_de.md)

# Methodik & Unsicherheit

> Dieses Dokument dient zugleich als methodischer Abschnitt der Projektarbeit. Jede darin zitierte Zahl lässt sich auf einen Eintrag in [`ASSUMPTIONS.md`](ASSUMPTIONS.md) zurückführen; jede Form auf [`DATA_SCHEMAS.md`](DATA_SCHEMAS.md).

## 1. Anwendungsbereich (unverhandelbar)

Dieses Projekt schätzt den CO₂-Fußabdruck der **über OpenRouter sichtbaren LLM-Inferenz** — ein *repräsentativer, aber partieller* Ausschnitt der globalen KI-Nutzung. Verbraucher-Apps (ChatGPT, Gemini, Claude-Apps) sind **nicht** enthalten. Es handelt sich **NICHT** um eine Messung der globalen Rechenzentrumsemissionen. **Alle Zahlen sind Schätzungen mit expliziten Unsicherheitsbereichen, keine Messungen**, insbesondere bei Closed-Source-Modellen, deren Parameter, Hardware und Rechenzentrumsstandorte nicht offengelegt sind. Der veröffentlichte `totals.modeled_traffic_fraction` gibt exakt an, wie viel des täglichen OpenRouter-Verkehrs wir tatsächlich modellieren.

Die genaue **Systemgrenze** — was einbezogen wird, was ausgeschlossen ist und warum — ist in [`BOUNDARY.md`](BOUNDARY.md) dokumentiert. Grundsätze für unparteiische Quervergleiche zwischen Modellen (Open- vs. Closed-Asymmetrie, Nicht-Vergleichbarkeit von Tokenizern, Herkunftsneutralität, Rangstabilität unter alternativen Annahmen) finden sich in [`FAIRNESS.md`](FAIRNESS.md).

## 2. Die Schätzkette

```
total_tokens (OpenRouter rankings-daily)
   └─ × 0.20  ──────────────▶ est_output_tokens          [A2, 80:20 input:output]
        └─ × wh_per_output_token (Range) ─▶ energy_Wh     [E-series; AI Energy Score / EcoLogits]
             └─ / 1000 ─────────────────▶ energy_kWh      [Wh→kWh guard]
                  └─ × PUE ──────────────▶ facility_kWh   [A4, default 1.2]
                       └─ × grid_gCO2/kWh ▶ gCO2           [C-GRID-* / Electricity Maps live]
                            └─ / 1000 ────▶ co2_kg         [g→kg guard]
```

Formal pro Modell pro Tag (**v0.2**):

```
energy_kwh   = (wh_per_output_token × est_output_tokens
              + α × wh_per_output_token × est_input_tokens) / 1000   [E-PREFILL]
co2_kg       = energy_kwh × PUE × carbon_intensity_gco2_kwh / 1000   [PUE is a band, A4]
co2_embodied = co2_kg × embodied_ratio                                [C-EMBODIED]
co2_total    = co2_kg + co2_embodied
water_L      = energy_kwh × PUE × (onsite_WUE + offsite_EWIF)         [W-WATER]
```

Output- (Decode-) Tokens dominieren den Energieverbrauch pro Token, aber v0.2 behandelt die ~80 % Input-Tokens nicht mehr als kostenlos: Die Prefill-Phase ist rechenintensiv und pro Token günstiger (α = 0.1–0.2–0.3 der Decode-Rate, E-PREFILL), aber nicht null. Die 80:20-Aufteilung (A2) und α sind dokumentierte Sensitivitätsachsen, keine gemessenen Verhältnisse.

**Änderungen in v0.2 (vs. v0.1):** (1) Input/Prefill-Energie wird mitgezählt; (2) PUE ist ein Band `{1.1, 1.25, 1.56}` statt eines flachen 1.2 (A4); (3) ein amortisierter **embodied** (Herstellungs-)CO₂-Term wird neben dem operationalen hinzugefügt (C-EMBODIED); (4) Wasser wird in On-Site-Kühlung + Off-Site-Erzeugung aufgeteilt (W-WATER). Die Schlagzeile `co2_kg` bleibt **operational, standortbasiert**; `co2_kg_total` ist die vollständige Lebenszykluszahl. Diese Änderungen heben die zentrale Schätzung an und *erweitern* das Band — mehrere unabhängige Unsicherheiten, endpoint-weise multipliziert, ergeben eine bewusst konservative Einhüllende (siehe §4).

## 3. Annahmen (vollständiges Register in `ASSUMPTIONS.md`)

| ID | What | Value | Source |
|---|---|---|---|
| A1 | Model subset (MVP) | OpenRouter top open models w/ AI Energy Score data + 1–2 closed via EcoLogits | `model_crosswalk.yaml` |
| A2 | Input:output token ratio | 80:20 → `est_output_tokens = total × 0.20`; input = total − output | OpenRouter usage study (refine) |
| A3 | DC region per model | one assumed region/provider; closed = `CLOSED_MODEL_ASSUMED` | DC-series |
| A4 | PUE | **band 1.1 / 1.25 / 1.56** (was flat 1.2) | Uptime Institute 2024 / Google |
| E-PREFILL | Input-token energy | `α·wh_out`, α = 0.1 / 0.2 / 0.3 | arXiv:2507.11417, 2512.03024 |
| C-EMBODIED | Embodied carbon | `op × {0.28,0.39,0.54}` (≈22–35 % of total) | BLOOM LCA; arXiv:2508.06524, 2501.15829 |
| W-WATER | Water (L/kWh) | on-site 0.3/0.9/1.8 + off-site EWIF 2.0/3.14/4.35 | Li et al. arXiv:2304.03271 |
| E-CLASS-* | Param-class fallback Wh/token | small 0.0005–0.0012–0.0025; large 0.002–0.005–0.012 | AI Energy Score v2 + EcoLogits |
| E-{model} | Per-model Wh/token | e.g. closed Claude-class 0.0025–0.006–0.015 (widest) | per-model entries |
| C-GRID-* | Annual grid factors (gCO₂/kWh) | us-east 380 (EPA eGRID2022), europe-west 230 (Ember 2024), cn-north 537 (Ember 2023), eu-27 242, default 400 | EPA / Ember |

Die Literatur zum Energieverbrauch pro Query reicht von **~0.3 Wh (Google) bis ~1.8–7 Wh (EcoLogits)**, abhängig von den Annahmen (E-METHOD); unsere Bereiche sind bewusst breit, um diese Diskrepanz abzudecken.

## 4. Umgang mit Unsicherheit (bitte vor Vertrauen in eine Zahl lesen)

Jede Energie-/CO₂-Größe ist ein **Range** `{low, mid, high}` mit `low ≤ mid ≤ high`, das end-to-end mitgeführt wird (`pipeline/ranges.py`). Die Propagation ist absichtlich einfach: Ein Range × positiver Skalar skaliert jeden Endpunkt; ein Range × Range multipliziert endpoint-weise.

**Dieses `{low, mid, high}`-Band ist ein KONSERVATIVES ENDPOINT-BAND, kein statistisches Konfidenzintervall.** Es drückt die Spanne vertretbarer Annahmen aus, keine Wahrscheinlichkeitsverteilung. Wir beanspruchen kein 95%-KI oder eine probabilistische Abdeckung — das würde Daten implizieren, die wir nicht haben (insbesondere bei Closed-Source-Modellen). Eine nackte Punktzahl irgendwo in den JSON-Daten oder der UI ist ein Fehler.

### 4a. Schätzpräzision nach Tier (`totals.precision`, methodology v0.3.0)

Über das Unsicherheits*band* hinaus veröffentlichen wir auch, auf welcher **Eingabe-Tier** jede Zahl beruht. Jede Zeile trägt bereits eine `energy_source` (`ai_energy_score` / `ecologits` → eine echte Messung; `parameter_class_fallback` → eine Parameterklassen-Schätzung) und eine `grid_source` (`electricity_maps_live` → Live-Netzintensität; `annual_factor` → ein Jahresdurchschnitt). `totals.precision` aggregiert diese Flags zu vier Anteilen:

- **`energy_measured_fraction`** — Anteil des modellierten Verkehrs, dessen Energie auf einer Messung (AI Energy Score oder EcoLogits) beruht, und sein Komplement **`energy_class_fallback_fraction`** (Parameterklassen-Fallback). Die beiden summieren sich zu 1.0.
- **`grid_live_fraction`** — Anteil, dessen Netzintensität von Live Electricity Maps stammt, und sein Komplement **`grid_annual_fallback_fraction`** (Jahrestabelle). Die beiden summieren sich zu 1.0.

Diese Anteile sind **token-gewichtet nach `total_tokens`**, nicht nach Anzahl gewichtet, und werden nur über die modellierten Zeilen berechnet (die `other`/nicht abgedeckte Aggregation ist ausgeschlossen). Die Token-Gewichtung ist bewusst: Sie beantwortet die Frage, „wie viel des veröffentlichten Fußabdrucks beruht auf gemessenen Eingaben?“, was ein Leser vertrauen sollte — ein einzelnes hochfrequentes Fallback-Modell zählt weit mehr als mehrere winzige gemessene Modelle. Ein Zähl-Begleiter (`models_measured` / `models_total`, `grid_live_models`) wird ebenfalls für lesbare UI-Texte veröffentlicht. Dieser Block führt **keine neuen Quellen-Zahlen** ein; er berichtet nur, was die pro-Zeile-Flags bereits implizieren.

### 4b. Provenienz & Verifizierbarkeit (`sources.yaml` + gate, methodology v0.4.0)

Die „no magic numbers“-Regel aus CLAUDE.md wird jetzt **maschinell durchgesetzt**. `data/provenance/sources.yaml` ist ein strukturiertes Register — ein Eintrag pro Quelle (`id`, `title`, `publisher`, `url`, `version`, `accessed`, `locator`, `license`, `claim`) — und **jeder** numerische Datensatz in `data/**/*.yaml` trägt eine `source_id` (oder `source_ids`), die zu einer Register-`id` aufgelöst werden muss. Das Build-Gate `pipeline/provenance.py` (`python -m pipeline.provenance`, ebenfalls ein pytest-Test und ein CI-Schritt) **schlägt bei jeder unquellengestützten Zahl fehl**, sodass spätere Phasen keine Zahl stillschweigend einführen können. Dies ist das Rückgrat des *可被验证 / 溯源* (verifiable / traceable) Ziels des Projekts.

Die veröffentlichte `latest.json` ist selbstbeschreibend: Sie trägt ein Top-Level-Array `sources[]` — die kompakte Teilmenge des Registers, die an diesem Tag tatsächlich referenziert wurde — und jede Modellzeile trägt `energy_source_id` und `grid_source_id`, sodass jede Zahl bis zu ihrer Quelle zurückverfolgt werden kann. Um das Urheberrecht der Quelle zu respektieren, ist jeder Register-`claim` eine **kurze Paraphrase plus Locator**, niemals reproduzierter Quellentext (das Gate begrenzt die Claim-Länge).

## 5. Umfang & Limitationen

- **Abdeckung ist partiell.** Nur über OpenRouter sichtbarer API-Verkehr; `modeled_traffic_fraction` quantifiziert den modellierten Anteil pro Tag (die `other`-Aggregatzeile ist der nicht modellierte Nenner, wird nie verworfen oder zusammengeführt).
- **Nicht-Vergleichbarkeit von Tokenizern (L-TOKENIZER).** Token-Zahlen stammen vom jeweiligen Provider-eigenen Tokenizer und sind **nicht direkt über Zeilen vergleichbar**; jede Quersummenbildung oder Effizienz pro Token trägt diesen Vorbehalt.
- **Undurchsichtigkeit von Closed-Source-Modellen.** Parameter, Hardware und DC-Standorte sind nicht offengelegt; Closed-Zeilen verwenden EcoLogits-Klassen-Annahmen, die weitesten Bereiche und das Flag `CLOSED_MODEL_ASSUMED`.
- **Netz-Timing.** Jahresfaktoren sind Durchschnitte; Echtzeit-Intensitäten schwanken stark je nach Stunde und Fuel-Mix. Live Electricity Maps wird bevorzugt; die Jahrestabelle ist der gekennzeichnete Fallback (`grid_source`).

## 6. Sensitivitätsanalyse (PUE und Last)

Angesichts der Unsicherheit bei der Hardware-Bereitstellung ist eine Sensitivitätsanalyse erforderlich:
- **PUE (Power Usage Effectiveness)**: Ein erstklassiges Rechenzentrum (z. B. Google) kann mit PUE ~1.1 betrieben werden, während ältere oder weniger optimierte Anlagen näher an 1.5 liegen. Dies erzeugt eine Varianz von ca. 36 % in der Gesamt-CO₂-Schätzung.
- **Auslastung/Last**: Server, die bei hoher Auslastung laufen, sind pro Token energieeffizienter. Unsere Basisbereiche berücksichtigen Variationen von 50 % bis 100 % Last.

## 7. EU-Kontext & ESG-Reporting-Relevanz (CSRD / EU Taxonomy)

Dieses Projekt richtet sich an aufkommende europäische Nachhaltigkeitsrahmenwerke aus:
- **CSRD / ESRS (E1 Climate Change)**: Die hier bereitgestellten Schätzungen unterstützen die Berechnung von Scope-3-Emissionen (gekaufte Dienstleistungen/Cloud-Computing), die gemäß der Corporate Sustainability Reporting Directive erforderlich sind.
- **EU Taxonomy (DNSH)**: Die Bewertung, ob KI-Workloads den Umweltzielen „keinen erheblichen Schaden zufügen“ (Do No Significant Harm), erfordert eine granulare, workload-spezifische Transparenz der Energieintensität.
- **Energiewende & regionale Netze**: Durch die Nutzung von *Electricity Maps* erfasst der Index den starken Kontrast zwischen Netzzonen. Beispielsweise ergeben sich für exakt dieselbe LLM-Anfrage völlig unterschiedliche Fußabdrücke, je nachdem ob die Inferenz nach Frankreich (kernenergielastig, ~50gCO₂/kWh) oder Deutschland (Kohle/Erneuerbare-Mix, ~300gCO₂/kWh) geroutet wird.

## 8. Markt-basiert vs. standort-basiert (GHG Protocol Scope 2)

- **Standort-basiert** verwendet die physische Netzintensität der bedienenden Region (was dieses MVP berichtet).
- **Markt-basiert** spiegelt vertragliche Instrumente (PPAs/RECs) wider, die ein Provider kauft, was die berichtete Intensität auf null treiben kann — ein *buchhalterisches* Ergebnis, keine Änderung der tatsächlich verbrauchten Elektronen.

Die beiden können um eine Größenordnung differieren. Beide sowie die Substitutionsszenarien zu berichten, ist **Phase 6**-Arbeit; dieses MVP berichtet nur standort-basiert und kennzeichnet die Unterscheidung, damit sie nie als physische Realität missverstanden wird.

## 9. Electricity Maps Lizenzentscheidung (L-EM-FREE)

Das Electricity Maps Free-Tier ist **nicht-kommerziell**. Entscheidung für dieses Projekt: im **nicht-kommerziellen akademischen / Portfolio-Modus** betrieben werden und bei Nichtverfügbarkeit von Live-Daten oder nicht unterstützter Zone anmutig auf die committed Jahresfaktor-Tabelle (`data/grid/annual_factors.yaml`) zurückfallen — mit Aufzeichnung von `grid_source` pro Zeile. Sollte das Projekt jemals kommerziell genutzt werden, wäre ein kostenpflichtiger Electricity Maps-Plan (oder reiner Jahresfaktor-Modus) erforderlich. Diese Entscheidung wird in `README.md` wiederholt.

## 10. Erforderliche Attributionen

- `Source: OpenRouter (openrouter.ai/rankings), as of {data_date}` — gespeichert in `source_citation` und in der UI angezeigt (L-OR-CITATION).
- Netzintensität: Electricity Maps (live) + Ember / EPA eGRID (jährlicher Fallback), pro Zeile via `grid_source` aufgezeichnet.
- Energie: Hugging Face **AI Energy Score** + **EcoLogits** (E-METHOD).

## 11. Reproduktion & Verifizierung

Ein veröffentlichter Lauf für das Datum `D` wird von einem eingefrorenen Snapshot seiner Roh-Eingaben unter `data/raw/snapshots/{D}/` begleitet (die exakte OpenRouter-Rankings-Antwort, jede Netzregions-Antwort oder der verwendete Jahresfaktor-Datensatz sowie ein `resolved.json`, das die Versionen der `data/**/*.yaml` über den Repo-Git-SHA zum Build-Zeitpunkt erfasst). Secrets und Auth-Header sind in Snapshots niemals vorhanden. `make verify {date}` führt die Pipeline strikt aus diesem Snapshot neu aus (kein Netzwerk) und stellt sicher, dass die ausgegebene `data/output/history/{date}.json` byte-identisch mit dem committed Golden-File ist (nur der volatile `generated_at`-Zeitstempel wird ignoriert). `data/output/manifest.json` zeichnet pro Datum `sha256:`-Checksummen über jede Snapshot-Eingabedatei plus die finale Ausgabe, den Code-Git-SHA, die Methodik-Version und Tool-Versionen auf; Dritte können daher die Integrität unabhängig bestätigen. Alle Abhängigkeiten sind über `uv.lock` gepinnt.

```bash
git clone https://github.com/wyl2607/llm-carbon-index.git
cd llm-carbon-index
uv sync
make verify 2026-06-14  # expect PASS
```

## 12. Verwandte Arbeiten und Einordnung in die Literatur

Strubell et al. (2019) lieferten die erste systematische Quantifizierung des Energie- und CO₂-Fußabdrucks beim NLP-Training und etablierten die wissenschaftliche Erwartung, dass der Energieverbrauch berichtet werden muss [1]. Dieses Projekt erweitert diese „Berichte deinen Energieverbrauch“-Norm vom Trainingsregime auf den Live-, disaggregierten *Inferenz*-Verkehr über ein von OpenRouter betriebenes öffentliches Dashboard.

Luccioni et al. (2023) erbrachten in der BLOOM-Volllaufzeitbewertung die erste detaillierte empirische Aufteilung dynamischer, Leerlauf- und embodied-Emissionen für ein öffentliches 176-Milliarden-Parameter-Modell und ermittelten embodied Carbon bei ~22 % der Gesamtmenge [2]. Der in v0.2 dieses Projekts eingeführte embodied-Term (C-EMBODIED) ist bewusst mit dem über diese Studie und Folgearbeiten berichteten 22–35 %-Bereich konsistent.

Faiz et al. (2023) stellten LLMCarbon vor, ein end-to-end operational-plus-embodied Projektionsmodell für Dense- und MoE-Architekturen, das eine Validierungsabweichung von ~8 % gegenüber gemessenen Workloads erreichte; embodied-Anteile lagen bei 24–35 % [3]. Die vorliegende Arbeit ist enger gefasst — auf Inferenzfluss und Echtzeit-Public-Rankings fokussiert — und daher komplementär; eine hybride Kreuzvalidierung zwischen den beiden Frameworks wird als künftige Möglichkeit identifiziert.

Hugging Faces AI Energy Score bietet einen standardisierten, CodeCarbon-gestützten Inferenz-Energie-Benchmark [4]; das Projekt konsumiert diese Zahlen direkt als primären gemessenen Anker für seine E-Series-Annahmen. EcoLogits liefert einen unabhängigen GenAI-API-Inferenz-Schätzer, der als E-METHOD-Baseline und für Closed-Model-Coverage verwendet wird [5]. CodeCarbon ist das gemeinsame lokale Mess-Substrat, das mehreren der zitierten Benchmarks zugrunde liegt [6].

Jegham et al. (2025) benchmarkten Energie, Wasser und Kohlenstoff über mehr als dreißig Modelle unter realistischen Infrastrukturbedingungen und dokumentierten, dass Workloads mit langen Prompts 30+ Wh pro Query überschreiten können [7]. Ihre Ergebnisse motivieren direkt die bewusst weiten Unsicherheitsbereiche, die in dieser Schätzpipeline durchgängig angewendet werden.

Die oben genannten Arbeiten liefern die empirische Grundlage und das methodische Vorbild für die hier verwendeten Gleichungen, Bereiche und Provenienzregeln. Wichtige Lücken bleiben ungeschlossen: dynamisches Batching und Echtzeit-Auslastungsregime, MoE-Routing-Overhead sowie eine standardisierte, auditierbare Beschaffungsmethodik für embodied-Carbon-Faktoren. Diese Limitationen werden als explizite künftige Arbeitsrichtungen anerkannt. Das Dashboard erzeugt Schätzungen mit Unsicherheitsbereichen; es erhebt keinen Anspruch auf direkte Messgenauigkeit.

## 13. Literaturverzeichnis

[1] Strubell, Ganesh, McCallum (2019). Energy and Policy Considerations for Deep Learning in NLP. https://arxiv.org/abs/1906.02243
[2] Luccioni, Viguier, Ligozat (2023). Estimating the Carbon Footprint of BLOOM. https://arxiv.org/abs/2211.02001
[3] Faiz et al. (2023). LLMCarbon: Modeling the End-to-End Carbon Footprint of LLMs. https://arxiv.org/abs/2309.14393 (code: https://github.com/SotaroKaneda/MLCarbon)
[4] Hugging Face AI Energy Score. https://huggingface.co/spaces/AIEnergyScore/Leaderboard
[5] EcoLogits. https://ecologits.ai/
[6] CodeCarbon. https://github.com/mlco2/codecarbon
[7] Jegham et al. (2025). How Hungry is AI? Benchmarking Energy, Water, and Carbon Footprint of LLM Inference. https://arxiv.org/abs/2505.09598
[8] Li et al. (2023). Making AI Less "Thirsty": Water Footprint of LLMs. https://arxiv.org/abs/2304.03271
