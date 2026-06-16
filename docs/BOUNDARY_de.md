[English](BOUNDARY.md) | [中文](BOUNDARY_zh.md) | [Deutsch](BOUNDARY_de.md)

# System Boundary (LCA)

Dieses Dokument definiert die Life Cycle Assessment (LCA) Systemgrenze für den LLM Carbon Index. Wie im Projekt-Scope (`CLAUDE.md`) festgelegt, schätzt dieser Index nur den Fußabdruck der **OpenRouter-sichtbaren LLM-Inferenz**.

## System Boundary Diagram

```text
       UNIVERSE OF AI IMPACTS
+---------------------------------------+
|  [ OUT ] Model Training               |
|  [ OUT ] Hardware Manufacturing       |
|                                       |
|    +-----------------------------+    |
|    | [ IN ] SYSTEM BOUNDARY      |    |
|    |                             |    |
|    |  +-----------------------+  |    |
|    |  | API Inference Compute |  |    |
|    |  | (Energy Intensity)    |  |    |
|    |  +-----------+-----------+  |    |
|    |              |              |    |
|    |  +-----------v-----------+  |    |
|    |  | Data Center Overhead  |  |    |
|    |  | (PUE Factor [A4])     |  |    |
|    |  +-----------+-----------+  |    |
|    |              |              |    |
|    |  +-----------v-----------+  |    |
|    |  | Grid Intensity (CO2e) |  |    |
|    |  | & Operational Water   |  |    |
|    |  +-----------------------+  |    |
|    |                             |    |
|    +-----------------------------+    |
|                                       |
|  [ OUT ] Network Transmission         |
|  [ OUT ] End-User Devices             |
|  [ OUT ] Idle / Over-provisioning     |
|  [ OUT ] Non-OpenRouter Traffic       |
+---------------------------------------+
```

## Included in Boundary (IN)

Die folgenden operativen Komponenten sind in der primären Schätzkette enthalten:

- **API Inference Compute Energy**: Der elektrische Energieverbrauch (Wh) der Hardware (GPUs/TPUs) während der Prefill- und Decode-Phasen einer LLM-Anfrage.
- **Data-Center PUE Overhead**: Der zusätzliche Energieverbrauch der Rechenzentrums-Infrastruktur (Kühlung, Beleuchtung, Stromverteilung), modelliert als Power Usage Effectiveness (PUE) Band [A4].
- **Operational Location-Based Grid Emissions**: Die Kohlenstoffintensität (gCO2e/kWh) des lokalen Stromnetzes, an dem die Inferenz stattfindet [A3], unter Verwendung von Live- oder Jahresfaktoren.
- **Operational Water**: Das sowohl on-site (Kühlungsverdunstung) als auch off-site (Stromerzeugung) mit der Inferenzenergie verbundene verbrauchte Wasser [W-WATER].

## Excluded from Boundary (OUT)

Um den Fokus auf die marginalen Auswirkungen der Inferenz zu erhalten, sind folgende ausgeschlossen:

- **Model Training**: Ausgeschlossen, da es eine einmalige CapEx darstellt mit eigenen Allokationsregeln gegenüber operativer Inferenz.
- **Embodied / Manufacturing Hardware Emissions**: Aus der operativen Kerngrenze ausgeschlossen; während als Lifecycle-Begleitgröße berichtet, gehört der Manufacturing-Fußabdruck der Hardware nicht zur Strom-zu-Inferenz-Umrechnung.
- **Network Transmission**: Ausgeschlossen aufgrund extremer Variabilität und fehlender Provider-seitiger Kontrolle über globale Internet-Routing-Energie.
- **End-User Devices**: Ausgeschlossen, da der Energieverbrauch eines Nutzer-Telefons oder Laptops im Vergleich zur serverseitigen Inferenz vernachlässigbar und geräteabhängig ist.
- **Idle / Over-provisioning**: Ausgeschlossen, weil der Index die marginalen Kosten pro Token modelliert; anlagenweite Grundlast wird nicht einzelnen Inferenz-Requests zugeordnet.
- **ALLE non-OpenRouter-Traffic**: Ausgeschlossen, um den strikten Scope des Projekts zu respektieren — nur die repräsentative Nutzungsscheibe zu modellieren, die über OpenRouter-Rankings sichtbar ist.

## Alignment with Project Scope

Diese Grenze ist streng mit der Scope-Aussage in `CLAUDE.md` abgestimmt: *"This project estimates the CO2 footprint of OpenRouter-visible LLM inference — a representative but partial slice of global AI usage."* Durch den Ausschluss von Upstream-Training und Downstream-Netzwerken liefern wir eine hochsignifikante Schätzung der spezifischen Umweltkosten der AI-Textgenerierung.
