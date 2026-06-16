[English](FAIRNESS.md) | [中文](FAIRNESS_zh.md) | [Deutsch](FAIRNESS_de.md)

# Fairness & Vergleichbarkeit

Dieses Dokument skizziert die Prinzipien, die verwendet werden, um sicherzustellen, dass der LLM Carbon Index bei Vergleichen unterschiedlicher Modellklassen, Provider und Herkünfte unparteiisch und akademisch rigoros bleibt.

## 1. Open vs. Closed Model-Asymmetrie

Es gibt eine fundamentale Informationslücke zwischen Open-Weights-Modellen und proprietären „Closed“-Modellen.

- **Open Models**: Energieintensität wird aus direkten Messungen (z. B. AI Energy Score [E-METHOD]) oder bekannten Parameterzahlen und Architekturen abgeleitet.
- **Closed Models**: Energieintensität wird mit EcoLogits-Klassen-Annahmen modelliert [E-METHOD, A3], die breitere Unsicherheitsbänder einbeziehen, um nicht offengelegte Parameterzahlen, Hardware und Anlageneffizienz zu berücksichtigen.

**Fairness-Regeln:**
- **Bereiche, nicht Mittelpunkte**: Alle Modell-übergreifenden Vergleiche **MÜSSEN** den vollen `{low, mid, high}`-Bereich verwenden. Ranking oder Sortierung nach einem einzelnen Mittelwert ist verboten, da dies falsche Präzision erzeugt.
- **Absichtliche Breite**: Closed-Model-Bereiche sind absichtlich breiter, um ihre Opazität widerzuspiegeln.
- **Mittelwert-Ranking-Einschränkung**: Ein Closed-Modell darf niemals allein auf Basis eines Mittelwert-Vergleichs als „besser“ als ein Open-Modell gerankt werden, wenn sich ihre Bereiche signifikant überlappen.

## 2. Tokenizer-Nicht-Vergleichbarkeit (L-TOKENIZER)

Token-Zählungen werden vom proprietären Tokenizer jedes Modells bereitgestellt. Da verschiedene Tokenizer denselben Text in unterschiedliche Token-Anzahlen segmentieren, ist eine einfache Summe von „Total Tokens“ kein Äpfel-zu-Äpfel-Vergleich der Arbeitslast.

- **Fairere Achse**: Um dies abzumildern, fördert der Index **CO₂ pro Output-Token** als primäre Effizienzmetrik, da Output-Tokens die energieintensivste Phase der Inferenz sind.
- **Caveat-Kennzeichnung**: Wo immer Modell-übergreifende Token-Summen oder pro-Token-Effizienzmetriken erscheinen, muss der `L-TOKENIZER`-Hinweis sichtbar sein, um den Leser darüber zu informieren, dass diese Zahlen relativ zum jeweiligen modell-spezifischen Tokenizer sind.

## 3. Herkunftsneutralität

Das Projekt wahrt strikte Herkunftsneutralität. Die Schätzmethode ist für alle Modelle identisch, unabhängig von ihrem `origin` (z. B. CN, US, EU).

- **Konsistente Methode**: Dieselbe physikbasierte Schätzkette (Tokens → Energie → PUE → Carbon) wird auf alle Zeilen angewendet.
- **Regionale Faktoren**: Der einzige herkunftsverknüpfte Unterschied in der Berechnung ist der **gesourcte Netzfaktor** der angenommenen Serving-Region [A3]. Ein Modell mit `cn-north`-Herkunft verwendet den Netzfaktor für diese Region [C-GRID-CN-NORTH-537], genauso wie ein `us-east`-Modell seinen jeweiligen Faktor [C-GRID-US-EAST-380] verwendet. Es wird keine willkürliche „Strafe“ oder „Belohnung“ auf Basis geopolitischer Herkunft angewendet.

## 4. Verkehrsgewichtung

OpenRouter-Verkehr ist stark verzerrt; eine kleine Anzahl populärer Modelle dominiert oft den Gesamt-Fußabdruck.

- **Token-gewichtete Gesamtsummen**: Tägliche Gesamtsummen sind token-gewichtet nach `total_tokens`, um die tatsächlichen Umweltauswirkungen der Nutzung des Tages widerzuspiegeln.
- **Ungewichteter Begleiter**: Um sicherzustellen, dass das Bild nicht lediglich ein Artefakt von ein oder zwei hochfrequenten Modellen ist, berichtet der Index einen **ungewichteten Begleiter** für Gesamtsummen. Dies ermöglicht Forschern, den durchschnittlichen Fußabdruck der modellierten Modellbibliothek unabhängig von aktueller Marktbekanntheit zu sehen.

## Zusammenfassung der Prinzipien

Durch die Einhaltung dieser Regeln — Priorisierung von Bereichen über Punkten, Anerkennung von Tokenizer-Unterschieden, methodische Konsistenz über Herkünfte hinweg und Bereitstellung ungewichteter Vergleiche — stellt der LLM Carbon Index sicher, dass seine Rankings eine faire Repräsentation der bestverfügbaren Evidenz sind.
