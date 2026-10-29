# Unmapped traffic audit (#113)

Audit date: 2026-10-02. Inputs: checked-in `data/output/latest.json`
(data date 2026-10-01) and `data/crosswalk/model_crosswalk.yaml`.

The remaining mapping work is blocked on serving-region evidence. No crosswalk
entries were added: model identity or vendor nationality alone cannot justify
assigning all of a model's measured traffic to one provider/grid region.

## Coverage and priorities

Mapped share before / after this audit: **78.351781% / 78.351781%**.
Unmapped share: **15.330289%** (17 slugs, 3,594,488,243,534 tokens).
Uncovered share: **6.317929%**. The denominator is all 23,446,969,177,065
measured tokens, including the uncovered aggregate, matching
`totals.mapped_traffic_fraction`. Mapped does not mean measured energy or known
physical routing. Cross-provider tokenizers also make these weights approximate.

| Unmapped slug | Tokens | Share of all measured tokens |
| --- | ---: | ---: |
| `xiaomi/mimo-v2.6-flash-20260921` | 1,340,271,290,700 | 5.716181% |
| `typesafe/jev-1.13-20260917` | 503,135,217,969 | 2.145843% |
| `openai/gpt-6-astra-20260903` | 459,821,328,032 | 1.961112% |
| `meta/muse-spark-1.3-contributor-20260902` | 241,761,787,084 | 1.031100% |
| `xiaomi/mimo-v2.6-pro-20260921` | 156,214,726,133 | 0.666247% |
| `openai/gpt-6.1-sol-20260929` | 153,444,863,855 | 0.654434% |
| `openai/gpt-6-luna-pro-20260922` | 100,005,033,803 | 0.426516% |
| `qwen/qwen3.8-flash-20260826` | 85,041,599,452 | 0.362698% |
| `anthropic/claude-opus-5-20260723` | 80,044,072,333 | 0.341383% |
| `google/gemini-3.7-flash-20260813` | 68,068,281,158 | 0.290307% |

The top five account for 75.148510% of unmapped tokens and were the focus of
the source check. The other rows are priorities for subsequent research, not
validated mapping candidates.

The issue's original 2026-08-25 figures have changed on this base branch:
the checked-in history now reports 41.049861% mapped and 54.205972% unmapped.
Use the current files rather than treating the issue's 59% headline as a baseline.

## Public evidence and why no mapping was added

- Xiaomi's [official V2.6 release](https://mimo.mi.com/docs/en-US/news/latest/v2-6)
  establishes the Pro/Flash identities and open weights. OpenRouter's
  [Flash endpoint metadata](https://openrouter.ai/api/v1/models/xiaomi/mimo-v2.6-flash/endpoints)
  lists Darkbloom, GMICloud, Io Net, InferenceNet, Novita, DeepInfra, Xiaomi,
  and Venice; its [Pro endpoint metadata](https://openrouter.ai/api/v1/models/xiaomi/mimo-v2.6-pro/endpoints)
  lists GMICloud, DeepInfra, Novita, and Xiaomi. These do not establish a single
  serving region or the historical traffic split. Assigning `xiaomi/cn-north`
  from the model prefix would be a guess.
- The [Jev endpoint metadata](https://openrouter.ai/api/v1/models/typesafe/jev-1.13/endpoints)
  identifies TypeSafe as the provider, but does not establish the grid region
  needed by the crosswalk. A country-level US claim would still not establish
  the repo's `us-east` region.
- OpenRouter's [Astra model page](https://openrouter.ai/openai/gpt-6-astra)
  and [endpoint metadata](https://openrouter.ai/api/v1/models/openai/gpt-6-astra/endpoints)
  identify OpenAI, Azure, and Amazon Bedrock. One endpoint tag names
  `amazon-bedrock/us-west-2`, but that is not evidence that all Astra traffic
  ran there. The checked-in rankings contain no provider/region token split.
- The [Muse Spark Contributor endpoint metadata](https://openrouter.ai/api/v1/models/meta/muse-spark-1.3-contributor/endpoints)
  identifies Meta, but does not establish a serving grid region.

These metadata checks returned HTTP 200 on the audit date; current endpoint
availability is not a frozen record of the measured day's routing.
OpenRouter's [in-region routing announcement](https://openrouter.ai/blog/announcements/us-in-region-routing/)
explicitly explains that global requests can run anywhere the serving provider
operates, including US-origin models. Regional routing must be requested.

The safe next input is a public source identifying the applicable serving
region for a candidate model, with enough evidence to justify the chosen
provider/region assumption. Do not substitute headquarters, training location,
or another model's region. Unknown parameter and capability values must also
remain unknown unless separately sourced.

[PR #177](https://github.com/wyl2607/llm-carbon-index/pull/177) already proposes
the annual all-region envelope and assumption flags for unmapped traffic
(#149). This audit does not duplicate it or change fallback behavior.

## Reproduce the coverage calculation

Run from the repository root. The normalized, date-filtered crosswalk join
matches `estimate()`; the assertions also check the committed coverage flags.
Run against the base and proposed trees to compare before/after. Since this
audit changes no mappings, both print the same share.

```bash
UV_CACHE_DIR="$PWD/.cache/uv" uv run python - <<'PY'
import json
import yaml
from pipeline.slugs import normalize_slug

doc = json.load(open('data/output/latest.json'))
crosswalk = yaml.safe_load(open('data/crosswalk/model_crosswalk.yaml'))
known = {
    row['openrouter_slug'] for row in crosswalk
    if str(row.get('valid_from', '')) <= doc['data_date']
}
total = doc['totals']['total_tokens']
mapped = sum(row['total_tokens'] for row in doc['models']
             if normalize_slug(row['slug']) in known)
unmapped = sorted(
    (row for row in doc['models'] if normalize_slug(row['slug']) not in known),
    key=lambda row: row['total_tokens'], reverse=True,
)
assert mapped / total == doc['totals']['mapped_traffic_fraction']
assert sum(row['total_tokens'] for row in unmapped) == doc['totals']['unmapped_tokens']
print(doc['data_date'], 'mapped tokens:', mapped, 'total tokens:', total)
print(f'mapped share: {mapped / total:.6%}; unmapped slugs: {len(unmapped)}')
for row in unmapped:
    print(row['slug'], row['total_tokens'], f"{row['total_tokens'] / total:.6%}")
PY
```
