# I18N Audit Report

**Scope:** `web/src/App.tsx` and every file in `web/src/components/`.

**Mechanism under test:** The `t(...)` / `translations` / `useI18n` layer defined in `web/src/lib/i18n.ts` (keys such as `brand`, `scopeWarnBody`, `kpiCo2`, `colModel`, etc.; supports en/zh/de).

**Rules applied (per task):**
- Only user-facing string literals that are rendered to the UI.
- Report only strings NOT routed through the i18n translation layer.
- Ignore: className strings, test files (`*.test.tsx` — none scanned for findings), import paths, aria roles (values of aria-* attributes), console logs, data-keys (e.g. CSV export header arrays treated as data), format strings already inside i18n.ts.
- Do NOT fix — report only.
- If reading any file had failed, it would have been skipped (none failed).

## Findings (file path, line number, literal string)

### web/src/App.tsx
- `138:29`: `LLM Carbon Index` (hardcoded brand in sticky header)
- `365:69`: `CSRD / ESRS E1 — ` (prefix before `tt.csrdExample`)
- `378:17`: `LinkedIn` (footer link text)
- `379:17`: `GitHub` (footer link text)
- `380:17`: `CHANGELOG` (footer link text)
- `386:21`: ` (±` (and closing `%)` in sensitivity display; surrounding dynamic expression not using i18n key)

### web/src/components/AccountingToggle.tsx
- `18:9`: `Location` (button label)
- `25:9`: `Market` (button label)
- `18:18`: `Physical grid emissions (location of inference)` (title attribute)
- `23:18`: `Market-based (incl. RECs / PPAs)` (title attribute)
(Note: entire component contains no use of `useI18n` / `tt` / `t` despite i18n keys `accounting` / `locationBased` / `marketBased` / `locationHint` / `marketHint` existing.)

### web/src/components/Co2BarChart.tsx
- `30:33`: `CO₂:` (inside CustomTooltip)
- `76:15`: `` `+${sortedModels.length - 15} others` `` (aggregated "others" bar name)
- `81:15`: `` `Remaining ${sortedModels.length - 15} models (aggregated)` `` (full name for others)
- `112:13`: `Show Top 15` (toggle button when `showAll`)
- `112:13`: `` `Show All (${models.length})` `` (toggle button text)
- `144:13`: `Mid + low/high whiskers. Grouped by ` (plus dynamic group + period + top-N note; entire caption string is hardcoded prose)

### web/src/components/FairnessNote.tsx
- `31:5`: `` `top-${topN} order is robust under alternative assumptions` `` (English stabilityLabel)
- `32:7`: `` `top-${topN} order shifts ≤${maxDisp} rank${maxDisp !== 1 ? 's' : ''} under alternative assumptions` `` (English stabilityLabel)
- `34:5`: `` `在替代假设下，前 ${topN} 排名稳定` `` (zhStabilityLabel)
- `35:7`: `` `在替代假设下，前 ${topN} 排名最多变动 ${maxDisp} 位` `` (zhStabilityLabel)
- `52:9`: `Comparability & Fairness` (English header)
- `52:9`: `公正性 & 系统边界` (zh header)
- `57:11`: `` `Rank stability: ${label}. Efficiency (CO₂/output-token) is the fairer cross-model axis than total CO₂.` ``
- `57:11`: `` `排名稳定性：${label}。效率轴（CO₂/输出 token）比总量 CO₂ 更能跨模型比较。` ``
- `61:11`: `⚠ L-TOKENIZER: token counts are not apples-to-apples across models (different tokenizers). Closed-model ranges are intentionally wider to reflect opacity — never ranked better on a midpoint alone.`
- `61:11`: `⚠ L-TOKENIZER：不同模型的 token 计数不可直接比较（分词器不同）。闭源模型区间故意更宽以反映其不透明性，从不仅凭中值排名。`
- `70:11`: `Boundary` (English link text)
- `70:11`: `边界` (zh link text)
- `79:11`: `Fairness` (English link text)
- `79:11`: `公正性` (zh link text)
(Note: component imports `Lang` but implements all copy via inline ternaries; no consumption of `translations` or `t` keys.)

### web/src/components/GroupToggle.tsx
- `32:46`: `Group:` (label before toggle buttons; the preceding "Colour by" is commented)
- `34:32`: `Open / Closed` (btn label)
- `35:32`: `Origin` (btn label)

### web/src/components/KpiCards.tsx
- `108:9`: `Substitution Potential` (KPICard title for the 4th card; other three use `tt.kpi*`)
- `109:9`: `Maximum daily emissions movable to low-carbon regions.` (sub text for the 4th card)

### web/src/components/ModelDetailModal.tsx
- `34:13`: `CO₂ (mid + range)` (section header)
- `56:13`: `PUE × Grid (gCO₂/kWh)` (section header)
- `83:13`: `FALLBACK flags indicate conservative parameter-class or annual grid assumptions. See methodology for full sensitivity.` (note paragraph under flags)
- `29:39`: `Close` (aria-label on X button; borderline per "aria roles" ignore rule but included for completeness as visible affordance text)

### web/src/components/ModelsTable.tsx
- `208:13`: `CSV` (button text after icon)
- `233:13`: `JSON` (button text)
- `334:52`: `Click headers to sort. All values carry low–mid–high ranges.` (fallback string in the `tt.tableNote || '...'` expression)
- `335:13`: ` models` (appended after count in footer; "models" word literal in template)

### web/src/components/OriginDonut.tsx
- `50:58`: `CO₂ mid` (Tooltip formatter label)
- `60:13`: `%` (percentage suffix rendered next to origin shares)

### web/src/components/PrecisionBanner.tsx
(No findings — all user-facing text via `tt.precision*` keys.)

### web/src/components/ScopeDisclaimerBanner.tsx
(No findings for prose — relies on `scopeNote` / `sourceCitation` from data + `tt.scope*` / `tt.unmapped*` keys. Data-driven strings from JSON are out of scope for this literal-string audit.)

### web/src/components/WhatIfSimulator.tsx
- `60:13`: `-BASED` (appended to `${accountingMethod.toUpperCase()}-BASED`)
- `106:15`: `100% — MAX GREEN` (right side of slider scale)
- `210:15`: `Move the slider to explore decarbonization impact.` (fallback when greenShiftPercent === 0; the zh branch uses an inline ternary literal too)
- `102:18`: `Percentage of traffic shifted to clean grid` (aria-label on slider; borderline aria but rendered affordance)
- `106:15`: `0% — ` (left side of slider scale prefix, combined with dynamic preset text)

## Summary of audit

- Total literal user-facing findings reported: 38 (distinct occurrences; some are repeated patterns across ternaries).
- Major clusters:
  - Hardcoded English (and occasional zh) UI copy inside components that either bypass `useI18n` entirely (AccountingToggle, GroupToggle, FairnessNote, large portions of Co2BarChart/ModelsTable/WhatIfSimulator/KpiCards) or use inline fallbacks / ternaries instead of `tt` keys.
  - Dynamic template literals for counts/aggregation ("... others", "Show All (N)", "Remaining N models") that are never internationalized.
  - A few brand / footer / section headers and one CSV/JSON export button label.
  - Tooltip / caption prose and scale labels.
- Existing i18n dictionary already contains many relevant keys (e.g. `locationBased`, `colOrigin`, `vizTitle`, `tableNote`, `scopeWarn*`, `thesis*`, `equiv*`, etc.) that are not being consumed by the offending components.
- The audit did **not** traverse `web/src/lib/format.ts`, `web/src/lib/equivalences.ts`, `web/src/main.tsx`, `index.html`, or any `public/` / `data/` assets, per the explicit scan instruction.
- No test files contributed findings.

**End of report. Do not modify source files as part of this task.**
