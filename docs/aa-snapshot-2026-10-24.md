# AA capability snapshot — 2026-10-24

Re-transcribed from https://artificialanalysis.ai/leaderboards/models, with model-page
fallbacks for five deprecated entries absent from the leaderboard score rows.
Same six capability keys and effort variants as draft PR #201; no successor models
substituted. Headline `intelligenceIndex` rounded to the displayed integer, stored
as `N.0`. MiniMax-M3 has no effort suffix in the leaderboard payload.

The leaderboard explicitly states `Artificial Analysis Intelligence Index v4.3.2`
at zero-based byte offset **1857436** in `/tmp/aa-2026-10-24.html`.
All five fallback pages also contain that version string. The previous pin was
v4.1.1. This is a methodology/comparability risk: all six scores are lower by
15–19 points than the August pin; these observations do not prove why AA changed
the scale. Do not interpret the difference as model capability regression.
Keep source ID `Q-AAII-V41` stable; version metadata now records the observed
v4.3.2. Historical outputs and frozen replay inputs remain unchanged.

## Transcription evidence

Offsets below are zero-based **bytes in the original fetched HTML**, before
JSON/Next.js unescaping. `slug`, `name`, `effort`, and score refer to the same
model object. For model pages this is the first `currentModel` object; for
MiniMax this is the leaderboard score row. All `intelligenceIndexIsEstimated`
flags are `false`. Payload names provide the variant; the model pages additionally
have `effort.slug` values `max`, `high`, or `xhigh`.

| key | AA slug / payload variant | raw intelligenceIndex | stored | HTML file | slug byte | score byte |
|---|---|---|---|---|---|---|
| deepseek-v4-flash | `deepseek-v4-flash-0420` / Max | `24.1673138235549` | 24.0 | `aa-2026-10-24-deepseek-v4-flash-0420.html` | 758712 | 759592 |
| minimax-m3 | `minimax-m3` / MiniMax-M3 | `29.2202932236316` | 29.0 | `aa-2026-10-24.html` | 1277314 | 1277654 |
| deepseek-v4-pro | `deepseek-v4-pro-0424` / Max | `30.4496601315524` | 30.0 | `aa-2026-10-24-deepseek-v4-pro-0424.html` | 761266 | 762133 |
| gemini-3.5-flash | `gemini-3-5-flash` / High | `32.5983283695905` | 33.0 | `aa-2026-10-24-gemini-3-5-flash.html` | 707276 | 708048 |
| gpt-5.5 | `gpt-5-5` / Xhigh | `38.3556437590607` | 38.0 | `aa-2026-10-24-gpt-5-5.html` | 705978 | 706704 |
| claude-4.8-opus | `claude-opus-4-8` / Max | `41.7899103794639` | 42.0 | `aa-2026-10-24-claude-opus-4-8.html` | 702524 | 703283 |

## Fetch artifacts

Fetched with `timeout 90 curl -fLsS --retry 2 URL -o FILE`. The leaderboard URL is
above; each fallback URL is `https://artificialanalysis.ai/models/<AA slug>`.
HTML stays under `/tmp`, not in the repository. SHA-256 checksums:

- `aa-2026-10-24.html`: `191f4c92b7c287de657b187605d4447919df3716f7953d4fb815b921fb99252f`
- `aa-2026-10-24-deepseek-v4-flash-0420.html`: `c0e2bb61c359944a744429606738c299b5e0fc09828db4dcbe6f13d3ddc529d3`
- `aa-2026-10-24-deepseek-v4-pro-0424.html`: `7f6f849a0fc5fb520a5022c49b734911db2bed336d7c33007a09cc4ee858520f`
- `aa-2026-10-24-gemini-3-5-flash.html`: `02a9e43a7f3acfd0180bde3487e5f8120e40cacddda2ab648990959efb6ab5e6`
- `aa-2026-10-24-gpt-5-5.html`: `edba3e630018b4e59b9933a1d2a1e3594a12314ac09f7664fb91c05f6c9788d5`
- `aa-2026-10-24-claude-opus-4-8.html`: `b74c6c7a75403f83681ad8e96d43e7ca62427adab756525c4c032275a88ee3de`
