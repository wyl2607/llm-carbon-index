[English](ENGINEERING_STANDARDS.md) | [中文](ENGINEERING_STANDARDS_zh.md) | [Deutsch](ENGINEERING_STANDARDS_de.md)

# docs/ENGINEERING_STANDARDS.md

Erweitert `CLAUDE.md`. Wo dies mit einer Phasen-Spezifikation konfligiert, gewinnt die **strengere** Regel. Diese Standards gelten für jede Phase.

## 1. Code-Struktur

- Python 3.11+, `ruff` sauber, vollständig typisiert. Die Schätz-Mathematik lebt in **kleinen reinen Funktionen** (Eingabe → Ausgabe, kein I/O, keine Globals), sodass sie trivial testbar ist.
- I/O (Netzwerk, Datei, Env) ist in eigenem Modul isoliert (`openrouter.py`, `grid.py`, `storage.py`) und wird in die reine Logik **injiziert**, nie von innerhalb einer Berechnung aus direkt zugegriffen.
- Keine Modell-Fakten in `.py`-Dateien — niemals. Modell-Identität, Parameter, Regionen und Energieintensitäten leben nur in `data/**/*.yaml` (erzwungen: ein grep von `pipeline/*.py` nach einem Modell-Slug muss nichts zurückgeben).

## 2. Unsicherheitsdarstellung (nicht verhandelbar)

- Jede Energie/CO₂-Größe ist ein **Range**: `{low, mid, high}` mit `low ≤ mid ≤ high`. Definieren Sie einen `Range`-Typ (`pipeline/ranges.py`) und verwenden Sie ihn überall wieder.
- **Propagationsregel (MVP):** Ein Range mal ein positiver Skalar skaliert jeden Endpunkt; ein Range mal ein weiterer positiver Range multipliziert Endpunkt-weise (`low×low`, `mid×mid`, `high×high`). Dies ist ein bewusst einfaches **konservatives Band, kein statistisches Konfidenzintervall** — sagen Sie genau das in `methodology.md`. Erfinden Sie kein probabilistisches Intervall, das Sie nicht verteidigen können.
- UI und JSON tragen immer den vollen Bereich. Eine nackte Punktzahl ist ein Bug.

## 3. Fehlerbehandlung & Fallbacks

- Jeder externe Aufruf (OpenRouter, Electricity Maps) ist gewrappt; Fehler werfen **getypte** Fehler.
- Fallbacks sind **explizit und beschriftet**: Wenn Live-Netzdaten nicht verfügbar sind, auf die Jahresfaktor-Tabelle zurückfallen und `grid_source` entsprechend setzen. Gleiches Muster, das Phase 0 für `ILLUSTRATIVE_SAMPLE` verwendet hat.
- **Niemals stillschweigend Sample-/Illustrative-/Fallback-Daten für echte Daten einsetzen.** Ein Konsument muss immer anhand des Quell-Labels oder der Flags der Zeile erkennen können, woher jede Zahl stammt.

## 4. Secrets

- Keys kommen nur aus der Umgebung (`OPENROUTER_API_KEY`, `ELECTRICITYMAPS_API_KEY`). `.env` ist git-ignored; CI verwendet GitHub Actions Secrets.
- Kein Key im Code, in Fixtures, Logs oder committed JSON. Vor jedem Commit: `git diff --cached --name-only` darf `.env` nicht enthalten.

## 5. Test-Standard

Jede Phase liefert Tests. Mindestmaßstab nach Kategorie:

- **Konversionswächter:** Wh↔kWh, g↔kg, per-token↔per-1000-queries auf bekannten Eingaben asserten.
- **Range-Invarianten:** `low ≤ mid ≤ high` bei jeder Operation erhalten; Skalierung mit 0 → alles Null; monoton unter positiver Skalierung.
- **Fallback-Pfade:** Grid-Client zum Werfen / Rückgabe einer unbekannten Region zwingen → asserten, dass der jährliche Fallback verwendet und beschriftet wird.
- **Unbekanntes Modell:** Ein Slug, der im Crosswalk fehlt → asserten, dass er geflaggt wird und der Parameter-Class-Fallback (kein Absturz) verwendet wird.
- **Kein Netzwerk in Tests:** Alle externen Aufrufe sind gemockt oder aus `tests/fixtures/` serviert. Tests müssen offline bestehen.
- **Schema-Validierung** (ab Phase 3): gültiger Output besteht; ein absichtlich kaputter Datensatz schlägt fehl.
- **Golden File** (ab Phase 3): Ein Fixture-Input-Tag produziert ein stabiles `latest.json` (volatile `generated_at` ausgenommen).

## 6. Attribution

Jedes von OpenRouter-Daten abgeleitete Artefakt trägt: `Source: OpenRouter (openrouter.ai/rankings), as of {data_date}`. Das Frontend zeigt es; das JSON speichert es in `source_citation`.

## 7. Commits

- Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`. Referenzieren Sie die Phase, z. B. `feat(pipeline): phase 2 energy + CO2 estimation with ranges`.
- Eine Phase pro Commit, wo praktikabel. **Nur pushen, wenn der User es explizit verlangt** — Standard ist lokaler Commit.

## 8. Definition of Done (diese Checkliste am Ende jeder Phase ausführen)

- [ ] Alle Akzeptanzkriterien der Phasen-Spez sind erfüllt.
- [ ] Tests für diese Phase hinzugefügt/aktualisiert; `pytest` ist vollständig grün.
- [ ] `ruff` ist sauber; alles ist typisiert.
- [ ] Keine Secrets gestaged (`git diff --cached` geprüft); kein Key im Code/Logs/JSON.
- [ ] Jede neue Zahl (Konstante, Koeffizient, Verhältnis, Regionsfaktor) ist in `docs/ASSUMPTIONS.md` mit Quelle und Unsicherheitsnotiz erfasst.
- [ ] Artefaktformen stimmen mit `docs/DATA_SCHEMAS.md` überein (oder das Schema-Dokument wurde im selben Commit aktualisiert).
- [ ] Keine Modell-Fakten in `.py` hardcodiert (grep sauber).
- [ ] Scope-Statement nicht verletzt; jede emittierte Zahl trägt einen Range oder ein explizites Source/Flag.
- [ ] `specs/INDEX.md` Statuszeile mit Commit-Hash auf ✅ aktualisiert.
- [ ] Lokal committed. (Nicht pushed, es sei denn, explizit verlangt.)
