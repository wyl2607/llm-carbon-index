[English](ASSUMPTIONS.md) | [中文](ASSUMPTIONS_zh.md) | [Deutsch](ASSUMPTIONS_de.md)

# docs/ASSUMPTIONS.md

Jede Zahl, auf die dieses Projekt angewiesen ist, lebt hier mit einer Quelle, einem Wert/Bereich und einer Unsicherheitsnotiz. **Wenn Sie eine neue Konstante, einen Koeffizienten, ein Verhältnis oder einen Regionsfaktor einführen, fügen Sie einen Eintrag im selben Commit hinzu.** Diese Datei ist das Rückgrat des Methodik-Kapitels / der Thesis.

Jeder Eintrag: `ID · Aussage · Wert(Bereich) · Quelle · Unsicherheit · wo verwendet · zuletzt geprüft`.

**Maschinell erzwungen seit Phase 6G:** Jede Zahl in `data/**/*.yaml` muss eine `source_id` tragen, die in `data/provenance/sources.yaml` aufgelöst werden kann, geprüft durch `python -m pipeline.provenance` in CI und pytest. Die IDs in dieser Datei sind die menschenlesbaren Begleiter dieser Registry-Einträge — halten Sie beide synchron, wenn Sie eine Konstante hinzufügen.

---

## A — Modellierungsannahmen

### A1 — Modell-Teilmenge (MVP)
Beginnen Sie mit OpenRouter-Top-Listen-**open** Modellen, die AI Energy Score-Daten haben, plus 1–2 **closed** Modellen über EcoLogits. Gelistet in `model_crosswalk.yaml`. Wird in späteren Phasen erweitert. *Unsicherheit:* Abdeckung ist partiell; `totals.modeled_traffic_fraction` berichtet, wie viel des Tagesverkehrs tatsächlich modelliert wird.

### A2 — Input:Output-Token-Verhältnis
`rankings-daily` liefert **kombinierte** Prompt+Completion-Tokens; Inferenzenergie skaliert hauptsächlich mit **Output**-Tokens. Standardaufteilung **80:20 (Input:Output)** → `est_output_tokens = total_tokens × 0.20`.
- *Status:* Zuerst prüfen, ob die API ein Completion-only-Feld exponiert; falls ja, dieses verwenden und die Annahme aufgeben.
- *Quelle:* Standard basierend auf OpenRouter's veröffentlichter Nutzungsstudie (mit ihren berichteten Verhältnissen verfeinern). *Unsicherheit:* hoch; als Sensitivitätsanalyse-Achse in der Methodik behandeln. *Wo verwendet:* `pipeline/tokens.py`.

### A3 — Data-Center-Region pro Modell
Eine angenommene Region pro Provider (`closed_models.yaml`), um die Netzintensität abzurufen. *Quelle:* öffentliche Provider/Cloud-Offenlegungen + vernünftige Inferenz. *Unsicherheit:* hoch bei Closed-Providern (Standort nicht offengelegt). Zeilen mit `CLOSED_MODEL_ASSUMED` markieren.

### A4 — Power Usage Effectiveness (PUE)  *(überarbeitet v0.2: jetzt ein Band, kein Punkt)*
PUE wird als **Bereich `{low 1.1, mid 1.25, high 1.56}`** angewendet, nicht als flacher Skalar, weil OpenRouter zu einem *Mix* aus Hyperscaler- und Nicht-Hyperscaler-Backends routet und ein einzelnes Facility-PUE pro Request nicht bekannt ist.
- *Werte:* low **1.1** (Google/Hyperscaler-Flottenberichte); mid **1.25** (typische moderne Anlage); high **1.56** (Uptime Institute Global Data Center Survey 2024 Branchendurchschnitt, seit 5 Jahren flach).
- *Quelle:* Uptime Institute Global Data Center Survey 2024; Google Environmental/PUE-Berichte. *Unsicherheit:* reale Flotten-PUE 1.1–1.6+. Ein bekanntes Provider-PUE (aus `closed_models.yaml`) zentriert die Bandmitte; low/high halten die globalen Grenzen. *Wo verwendet:* `methodology_factors.yaml` `pue`; `estimate.py`; `carbon.co2_kg` (akzeptiert einen Range). *Zuletzt geprüft:* 2026-06-16.

### E-PREFILL — Input (Prefill) Token Energie  *(neu v0.2)*
Inferenzenergie hängt von **sowohl Input- als auch Output**-Tokens ab. Die Prefill-Phase (Verarbeitung des Prompts) ist **rechenintensiv und parallel** (hohe Hardware-Auslastung), daher pro Token *günstiger* als die speicherbandbreitenbeschränkte Decode-Phase — aber **nicht null**. v0.1 modellierte nur Output-Tokens und verwarf ~80 % der Tokens als energiefrei; v0.2 fügt einen Prefill-Term hinzu.
- *Wert:* `wh_per_input_token = alpha × wh_per_output_token`, mit **alpha = {low 0.1, mid 0.2, high 0.3}**. `input_tokens = total − est_output_tokens`.
- *Quelle:* Prefill/Decode-Energie-Zerlegung in LLM-Inferenz-Energiestudien — arXiv:2507.11417 (Quantifying Energy & Carbon of LLM Inference via Simulations); TokenPowerBench arXiv:2512.03024. *Unsicherheit:* sehr hoch (kein öffentlicher Per-Modell-Prefill:Decode-Energie-Split); alpha als Sensitivitätsachse behandeln. *Wo verwendet:* `methodology_factors.yaml` `prefill_alpha`; `tokens.input_tokens`; `energy.energy_kwh`. *Zuletzt geprüft:* 2026-06-16.

---

## E — Energieintensität (Wh pro Output-Token)

Diese speisen `data/energy/intensity.yaml`. Jeder Modell-/Klassen-Eintrag muss zitieren, wie sein Wh/Output-Token-Bereich abgeleitet wurde.

- **E-METHOD** — Zwei primäre Quellen: (1) **AI Energy Score** (Hugging Face/Salesforce/CMU) — gemessene Wh pro 1000 standardisierter Queries; pro Output-Token durch Division durch die angenommene mittlere Output-Tokens pro Benchmark-Query zurückrechnen (angenommenen Wert festhalten). (2) **EcoLogits** — pro-Request-Auswirkungen modelliert aus Provider + Modell + Output-Token-Anzahl + Latenz (LCA-basiert, ISO 14044). Bei Closed-Modellen sind Parameterzahlen Schätzungen → breiten Bereich mitführen. *Unsicherheit:* beachten, dass eine einzelne Chat-Query je nach Annahmen irgendwo zwischen ~0.3 Wh (Google) und ~1.8–7 Wh (EcoLogits) geschätzt wurde — Ihre Bereiche sollten diese Streuung widerspiegeln.
- **E-CLASS-\*** — Parameterklassen-Fallback-Koeffizienten für unbekannte/nicht abgedeckte Modelle, nach aktivem Parameterband. Quelle + Ableitung pro Band dokumentiert. *Unsicherheit:* sehr hoch; diese existieren, damit die Pipeline graceful degradiert, nicht um präzise zu sein.
- **E-{MODEL}** — Ein Eintrag pro modelliertem Modell, sobald es hinzugefügt wird.

### E-CLASS-SMALL (Phase 2 seed)
- **E-CLASS-SMALL** — 0.0005–0.0012–0.0025 Wh pro Output-Token für Modelle mit aktiven Params ≲15B. *Quelle:* informiert durch AI Energy Score v2 Small-Modell-Messungen + EcoLogits-Bereiche für 7-13B-Klasse; ±~2x für Benchmark-zu-Prod-Varianz, Tokenizer-Diffs und Messunsicherheit verbreitert. *Unsicherheit:* hoch (Klassenband, nicht pro Modell). *Wo verwendet:* intensity.yaml parameter_class_fallback erstes Band; Fallback-Pfad für unbekannte Modelle oder explizites "parameter_class_fallback" im Crosswalk. *Zuletzt geprüft:* 2026-06-15.

### E-CLASS-LARGE (Phase 2 seed)
- **E-CLASS-LARGE** — 0.002–0.005–0.012 Wh pro Output-Token für Modelle mit aktiven Params bis ~100B. *Quelle:* informiert durch AI Energy Score v2 + EcoLogits 30-100B-Klassenmessungen; obere Grenze für Closed-Modell-Opazität verbreitert (keine öffentlichen Params). *Unsicherheit:* sehr hoch. *Wo verwendet:* intensity.yaml large band; default konservative Wahl für UNKNOWN_MODEL. *Zuletzt geprüft:* 2026-06-15.

### E-MINIMAX-M2.5 (Phase 2 A1 seed)
- **E-MINIMAX-M2.5** — 0.0008–0.0015–0.003 Wh pro Output-Token. *Quelle:* AI Energy Score v2 für ~10B aktive MoE-Klasse (MiniMax M2.5); Bereich für Produktionsvarianz verbreitert. *Unsicherheit:* mittel (für Open-Modell gemessen). *Wo verwendet:* crosswalk + intensity.yaml; cn-north Netzregion. *Zuletzt geprüft:* 2026-06-15.

### E-LLAMA-31-8B (Phase 2 A1 seed)
- **E-LLAMA-31-8B** — 0.0004–0.0009–0.0018 Wh pro Output-Token (Llama 3.1 8B). *Quelle:* AI Energy Score v2 7-13B-Band; etwas engeres Low, weil kleines dichtes Modell. *Unsicherheit:* mittel. *Wo verwendet:* intensity.yaml. *Zuletzt geprüft:* 2026-06-15.

### E-QWEN25-72B (Phase 2 A1 seed)
- **E-QWEN25-72B** — 0.0018–0.0040–0.0090 Wh pro Output-Token (Qwen2.5 72B). *Quelle:* AI Energy Score v2 informiert für 70B dense; skaliert vom 8B-Band + veröffentlichte Skalierungsbeobachtungen. *Unsicherheit:* hoch (keine direkte HF-Messung für diesen exakten Checkpoint zum Seed-Zeitpunkt). *Wo verwendet:* intensity.yaml; cn-north Netz. *Zuletzt geprüft:* 2026-06-15.

### E-MISTRAL-7B (Phase 2 A1 seed)
- **E-MISTRAL-7B** — 0.0005–0.0013–0.0026 Wh pro Output-Token. *Quelle:* AI Energy Score v2 Small-Band auf Mistral 7B EU-Modell angewendet. *Unsicherheit:* mittel. *Wo verwendet:* intensity.yaml; europe-west Netz. *Zuletzt geprüft:* 2026-06-15.

### E-DEEPSEEK-67B (Phase 2 A1 seed)
- **E-DEEPSEEK-67B** — 0.0015–0.0035–0.0080 Wh pro Output-Token. *Quelle:* AI Energy Score v2 informiert für 60-70B-Klasse (DeepSeek dense/MoE). *Unsicherheit:* hoch. *Wo verwendet:* intensity.yaml; cn-north. *Zuletzt geprüft:* 2026-06-15.

### E-CLAUDE-35-SONNET (Phase 2 A1 seed, closed)
- **E-CLAUDE-35-SONNET** — 0.0025–0.0060–0.0150 Wh pro Output-Token. *Quelle:* EcoLogits LCA-basierte Schätzung für Frontier-Closed-Modell (Claude 3.5 Sonnet); Bereich >2× breiter als Open 70B, um nicht offengelegte Parameterzahl, Hardware und Datacenter-Effizienz widerzuspiegeln. *Unsicherheit:* sehr hoch. *Wo verwendet:* intensity.yaml (ecologits tag); us-east Netz + CLOSED_MODEL_ASSUMED. *Zuletzt geprüft:* 2026-06-15。

---

## C — Physikalische / Netz-Konstanten (seit Phase 0 gesetzt; weiter zitieren)

- **C-ENERGY-LUCCIONI** — Pro-Query / Pro-Token Inferenzenergie-Referenzwerte. *Quelle:* Luccioni et al., 2024 (Inferenzenergie-Benchmarking). *Wo verwendet:* Energieintensitäts-Sanity-Checks.
- **C-ENERGY-DEVRIES** — AI/Data-Center-Energiebedarfs-Rahmen. *Quelle:* de Vries, 2023. *Wo verwendet:* Größenordnungs-Sanity-Checks, Methodik-Kontext.
- **C-PUE** — siehe A4 (Google / Uptime).
- **C-GRID-EGRID** — US-Netz-Emissionsfaktoren. *Quelle:* EPA eGRID2022. *Wo verwendet:* `annual_factors.yaml` US-Regionen; Phase 0 Netz-Konstante.
- **C-GRID-US-EAST-380** (Phase 2 seed) — 380 gCO₂eq/kWh jährlich für "us-east" Regionsschlüssel. *Quelle:* EPA eGRID2022 (U.S. average output emission rate). *Unsicherheit:* Jahresdurchschnitt; Echtzeit schwankt ~150-700+ je nach Stunde/Fuel-Mix; Live-EM bevorzugt, wenn verfügbar. *Wo verwendet:* annual_factors.yaml us-east; Netz-Fallback-Pfad; Test-Fixtures. *Zuletzt geprüft:* 2026-06-15。
- **C-GRID-EUROPE-WEST-230** (Phase 2 seed) — 230 gCO₂eq/kWh für "europe-west". *Quelle:* Ember 2024 Europe West annual. *Unsicherheit:* jährlich; stündliche Schwankungen im Winter größer. *Wo verwendet:* annual_factors.yaml; europe-west Modelle. *Zuletzt geprüft:* 2026-06-15。
- **C-GRID-CN-NORTH-537** (Phase 2 seed) — 537 gCO₂eq/kWh für "cn-north". *Quelle:* Ember 2023 China (national annual). *Unsicherheit:* hoch (Chinas Kohleanteil variiert je Provinz/Jahr); CN-Netz oft kohlenstoffintensiver als US/EU. *Wo verwendet:* annual_factors.yaml; alle CN-Herkunftsmodelle in A1-Seed. *Zuletzt geprüft:* 2026-06-15。
- **C-GRID-EU-27-242** (Phase 2 seed) — 242 gCO₂eq/kWh für "eu-27". *Quelle:* Ember 2023 EU-27 annual. *Unsicherheit:* jährliches Aggregat; tatsächliche Servicezone (DE/FR/NL) kann viel niedriger sein. *Wo verwendet:* annual_factors.yaml als möglicher Fallback. *Zuletzt geprüft:* 2026-06-15。
- **C-GRID-DEFAULT-400** (Phase 2 seed) — 400 gCO₂eq/kWh konservatives Komposit. *Quelle:* Größenordnungs-Komposit, informiert durch Ember global 2023 Mix der gesetzten US/EU/CN-Faktoren (keine einzelne offizielle Statistik). *Unsicherheit:* sehr hoch; nur verwendet, wenn Regionsschlüssel in annual_factors-Tabelle fehlt. *Wo verwendet:* annual_factors.yaml "default" Eintrag; grid.py Last-Resort-Pfad. *Zuletzt geprüft:* 2026-06-15。
- **C-GRID-\*** — Zusätzliche Regionen (z. B. Ember / IEA für EU/Asien) werden hinzugefügt, während `annual_factors.yaml` wächst. Bevorzugen Sie Electricity Maps Live; diese sind die dokumentierten Fallbacks.

### C-EMBODIED — Embodied (Manufacturing) Carbon  *(neu v0.2)*
v0.1 berichtete nur **operational** Carbon. v0.2 fügt einen **amortisierten embodied**-Term hinzu (Hardware-Herstellung, der LCA-Anteil, den EcoLogits — bereits zitiert — einschließt).
- *Wert:* `co2_embodied = co2_operational × embodied_ratio`, mit **embodied_ratio = {low 0.28, mid 0.39, high 0.54}**. Abgeleitet aus Literatur, die Embodied bei **~22–35 % des *total* LLM Carbon** ansetzt, umgewandelt in einen Anteil von operational via `share/(1−share)` (22 %→0.28, 28 %→0.39, 35 %→0.54). `co2_total = operational + embodied`.
- *Quelle:* BLOOM LCA (~22 % embodied, Luccioni et al.); CarbonScaling arXiv:2508.06524; aging-aware embodied-amortisation arXiv:2501.15829. *Unsicherheit:* hoch; embodied-Skalierung mit operationaler Energie ist ein dokumentierter Proxy für Hardware-Stunden, kein gemessener Wert pro Modell. *Wo verwendet:* `methodology_factors.yaml` `embodied_ratio`; `carbon.embodied_co2_kg` / `carbon.total_lca_co2_kg`; ausgegeben als `co2_kg_embodied` + `co2_kg_total`. *Zuletzt geprüft:* 2026-06-16。

---

## W — Wasser-Fußabdruck  *(neu v0.2)*

### W-WATER — On-site + Off-site Wasser-Aufteilung
v0.1 verwendete einen flachen **1.5 L/kWh** WUE, der Off-site-Wasser vermischte und unterschätzte.
v0.2 teilt den Fußabdruck auf, beide skalieren mit **Facility**-Energie (IT × PUE):
`water_L = facility_energy_kWh × (onsite_WUE + offsite_EWIF)`.
- *Werte:* **On-site WUE {0.3, 0.9, 1.8} L/kWh** (Data-Center-Kühlungsverdunstung) + **Off-site EWIF {2.0, 3.14, 4.35} L/kWh** (Wasser, das bei der Stromerzeugung verdunstet; US-Mittel 3.14).
- *Quelle:* Li et al., *"Making AI Less Thirsty"* (arXiv:2304.03271 / CACM 2025); EWIF US Power-Generation-Wasserfaktoren darin. *Unsicherheit:* hoch; WUE variiert räumlich/temporal und je nach Kühltechnik. *Wo verwendet:* `methodology_factors.yaml` `water`; `water.water_liters`; ausgegeben als `water_liters` (+ repräsentatives `wue`). *Zuletzt geprüft:* 2026-06-16。

---

## DC — Closed-Model Data-Center-Annahmen (Phase 2)

Diese speisen `data/assumptions/closed_models.yaml`. Jede Closed-Model-Zeile erhält das `CLOSED_MODEL_ASSUMED`-Flag. Region + PUE sind die dominanten Treiber der Varianz bei opaken Providern.

- **DC-OPENAI** (Phase 2 seed) — Provider "openai", assumed_region "us-east", pue 1.2, cloud "azure", GPU H100 (repräsentativ). *Quelle:* öffentliche Azure-Region-Nutzungs-Offenlegungen für OpenAI-Workloads + Hyperscaler-PUE-Berichte (Google 1.10 Flotte; wir verwenden 1.2 konservativ). *Unsicherheit:* Standort pro Request nicht offengelegt; tatsächliche Serving-Region kann je nach Kundenlatenz US-West, EU oder Asien sein. *Wo verwendet:* closed_models.yaml; estimate.py pue-Override + Region für gpt-4o. *Zuletzt geprüft:* 2026-06-15。
- **DC-ANTHROPIC** (Phase 2 seed) — Provider "anthropic", assumed_region "us-east", pue 1.2, cloud "aws". *Quelle:* Anthropic AWS Bedrock / direkte Inferenz-Partnerschaften; konservative East-Coast-Platzierung. *Unsicherheit:* hoch (keine öffentliche pro-Modell-DC-Karte). *Wo verwendet:* closed_models.yaml für claude-3.5-sonnet. *Zuletzt geprüft:* 2026-06-15。
- **DC-GOOGLE** (Phase 2 seed) — Provider "google", assumed_region "us-east", pue 1.25, cloud "google". *Quelle:* Google Cloud US-Regionen für Gemini; Google veröffentlicht starke Flotten-PUE (~1.10), aber wir wenden 1.25 an, um ältere/Partner-Kapazität zu begrenzen. *Unsicherheit:* hoch. *Wo verwendet:* closed_models.yaml für gemini-1.5-flash. *Zuletzt geprüft:* 2026-06-15。

### DC-TENCENT (Phase 3 expansion)
- **DC-TENCENT** — Provider "tencent", assumed_region "cn-north", pue 1.3, cloud "tencent_cloud". *Quelle:* Öffentliche Tencent Cloud / chinesische Provider-DC-Charakteristika; PUE 1.3 für Non-Hyperscaler-CN-Kühlungseffizienz (A4). *Unsicherheit:* hoch (genaue Standorte und Workload-Routing nicht offengelegt). *Wo verwendet:* closed_models.yaml. *Zuletzt geprüft:* 2026-06-15。

### DC-STEPFUN (Phase 3 expansion)
- **DC-STEPFUN** — Provider "stepfun", assumed_region "cn-north", pue 1.3, cloud "unknown". *Quelle:* Begrenzte öffentliche Offenlegungen für StepFun (CN AI Provider); konservatives PUE 1.3 pro CN Non-Hyperscaler-Richtlinie angewendet. *Unsicherheit:* sehr hoch. *Wo verwendet:* closed_models.yaml. *Zuletzt geprüft:* 2026-06-15。

### DC-OPENROUTER (Phase 3 expansion)
- **DC-OPENROUTER** — Provider "openrouter", assumed_region "us-east", pue 1.2, cloud "unknown". *Quelle:* OpenRouter fungiert als Inferenz-Router/Gateway; zugrunde liegende Kapazität typischerweise US-Hyperscaler oder Partner; default PUE per A4. *Unsicherheit:* hoch (Multi-Provider-Backend, kundenselektiert). *Wo verwendet:* closed_models.yaml. *Zuletzt geprüft:* 2026-06-15。

### DC-MOONSHOTAI (Phase 3 expansion)
- **DC-MOONSHOTAI** — Provider "moonshotai", assumed_region "cn-north", pue 1.3, cloud "unknown". *Quelle:* Moonshot AI (CN); spärliche öffentliche DC-/Regionsdaten; PUE 1.3 für CN-Provider. *Unsicherheit:* hoch. *Wo verwendet:* closed_models.yaml. *Zuletzt geprüft:* 2026-06-15。

### DC-ZAI (Phase 3 expansion)
- **DC-ZAI** — Provider "z-ai", assumed_region "cn-north", pue 1.3, cloud "unknown". *Quelle:* Zhipu AI (GLM-Familie, CN); PUE 1.3 konservativ für CN Lab-Scale-/Regional-Provider-Kühlung. *Unsicherheit:* hoch. *Wo verwendet:* closed_models.yaml. *Zuletzt geprüft:* 2026-06-15。

---

## V — Vendor Renewable Claims

- **V-GOOGLE** — 100 % jährlicher Renewable-Match. *Quelle:* Google Environmental Report (seit 2017). *Unsicherheit:* niedrig (für jährliches Matching, impliziert aber nicht 24/7 CFE). *Wo verwendet:* vendor_claims.yaml。
- **V-OPENAI** — 100 % jährlicher Renewable-Match. *Quelle:* Microsoft Azure Environmental Sustainability Report (matched seit 2014). *Unsicherheit:* niedrig. *Wo verwendet:* vendor_claims.yaml。
- **V-ANTHROPIC** — 100 % jährlicher Renewable-Match. *Quelle:* Angenommen basierend auf Hosting via Google Cloud und AWS, die beide 100 % Renewable-Matching claimen. *Unsicherheit:* mittel (nimmt an, dass die gesamte Inferenz-Infrastruktur durch Host-Claims abgedeckt ist). *Wo verwendet:* vendor_claims.yaml。
- **V-META** — 100 % jährlicher Renewable-Match. *Quelle:* Meta Sustainability Report (matched seit 2020). *Unsicherheit:* niedrig. *Wo verwendet:* vendor_claims.yaml。

---

## L — Lizenz- / Scope-Notizen

- **L-EM-FREE** — Electricity Maps Free Tier ist **non-commercial**. Entscheidung für öffentliche Deployment (akademisch/non-commercial use vs. akademischer Zugriff vs. annual-factor-heavy mode) wird in `methodology.md` und `README.md` vor Live-Gang festgehalten (Phase 5).
- **L-OR-CITATION** — OpenRouter erfordert den Citation-String in jedem republizierten Figure (siehe ENGINEERING_STANDARDS §6).
- **L-TOKENIZER** — Token-Zählungen kommen vom jeweiligen Provider-eigenen Tokenizer und sind **nicht direkt vergleichbar** über Zeilen hinweg; dies überall dort vermerken, wo Cross-Model-Token-Summen erscheinen.

---

*Wartung:* die datierten Einträge bei Datenaktualisierungen oder vor Thesis-Abgabe prüfen. Veraltete Netz-Faktoren und Energie-Koeffizienten sind am ehesten von Drift betroffen.

---

## A6 — Alternative Annahmen-Sets (nur Phase 6I)

`data/assumptions/alt_assumption_sets.yaml` liefert die vertretbaren Varianten, die ausschließlich an `pipeline.fairness.rank_stability` (via `build_output`) übergeben werden. Diese quantifizieren die Leaderboard-Robustheit auf den beiden Boards (total CO₂; CO₂ pro Output-Token), wenn wir variieren:

- A2 Input:Output-Split (70:30 vs. dokumentiert 80:20)
- A4 PUE (1.1 und 1.5 Skalare vs. das Band)
- Regions-Netz-Faktor ("best" = niedrigster gesetzter Jahreswert, europe-west 230 g, vs. jede Modell-assumed Region)

Jedes numerische Blatt trägt eine `source_id`, die in `sources.yaml` auflösbar ist (A2, A4, C-GRID-EUROPE-WEST-230). Die Sets beeinflussen niemals primär veröffentlichte Schätzungen oder die Kernkette; sie existieren nur für das `totals.fairness.rank_stability`-Begleitobjekt (und die ungewichtete Aggregat-Ansicht). Siehe `specs/phase-6i-fairness-and-boundary.md` (Tasks 3/4/6) und `DATA_SCHEMAS.md` §1.

Werte + Quellen (wiederverwendet; keine neuen Magic Numbers):
- "70:30" → A2
- PUE 1.1 / 1.5 → A4
- grid_gco2 230 → C-GRID-EUROPE-WEST-230

Zuletzt geprüft: 2026-06-16。
