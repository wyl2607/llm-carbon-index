# Data health score

The Overview page shows a transparent data-health indicator derived from the published output and its manifest. It is a maintenance and evidence signal, not a scientific confidence interval or a claim that the underlying estimates are measured.

## Components

The score uses four independently visible components:

- Freshness (30%): data-date age is scored as 100 at 0–3 days, 80 at 4–7 days, 40 at 8–14 days, and 0 after 14 days.
- Provenance (30%): `totals.mapped_traffic_fraction`, the visible traffic mapped to the model crosswalk.
- Modeled coverage (20%): `totals.modeled_traffic_fraction`, the visible traffic included in modeled estimates.
- Reproducibility evidence (20%): a matching `manifest.json` run containing both a code SHA and an output SHA-256.

The overall score is a weighted average of available components. If evidence is unavailable, the component is shown as `unknown` and omitted from the average; it is never silently converted to zero.

The manifest check proves that publication metadata exists for the displayed data date. It does not claim that a fresh replay has been performed in the browser. Pipeline validation and source quality remain separate concerns and continue to be documented in the methodology and manifest.
