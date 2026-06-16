[English](DATA_SCHEMAS.md) | [中文](DATA_SCHEMAS_zh.md) | [Deutsch](DATA_SCHEMAS_de.md)

# docs/DATA_SCHEMAS.md

每个工件形状的单一事实来源。如果某个阶段需要更改形状，请在同一提交中编辑此文件。以下所有字段名称均为规范名称 — 逐字使用。

## 约定

- **Range** 始终为 `{"low": number, "mid": number, "high": number}` 且 `low ≤ mid ≤ high`。
- Token 计数为整数。能量单位 **kWh**。碳强度单位 **gCO₂eq/kWh**。排放单位 **kg CO₂eq**。
- `origin` ∈ `{ "CN", "US", "EU", "OTHER" }`。`open_or_closed` ∈ `{ "open", "closed" }`。
- `flags` 词汇表：`UNKNOWN_MODEL`、`FALLBACK_ENERGY_CLASS`、`FALLBACK_GRID_ANNUAL`、`CLOSED_MODEL_ASSUMED`。（`ILLUSTRATIVE_SAMPLE` 仅可能出现在 scratch/dev 中 —— **绝不** 出现在已发布工件中。）

---

## 1. `data/output/latest.json`（以及 `data/output/history/{date}.json`）

```jsonc
{
  "methodology_version": "0.1.0",
  "generated_at": "2026-06-15T00:00:00Z",      // volatile; 排除在 golden-file 测试之外
  "data_date": "2026-06-14",                    // 其所反映的 OpenRouter 日
  "source_citation": "Source: OpenRouter (openrouter.ai/rankings), as of 2026-06-14",
  "scope_note": "Estimated CO2 footprint of LLM-inference traffic visible through OpenRouter. NOT global data-center emissions. All figures are estimates with uncertainty.",
  "assumptions": {                              // v0.2 跨领域因子的快照
    "input_output_ratio": "80:20",              // A2; 见 ASSUMPTIONS.md
    "pue_band": "1.1 / 1.25 / 1.56",            // A4（修订为区间）
    "prefill_alpha": "0.1 / 0.2 / 0.3",         // E-PREFILL
    "embodied_ratio_of_operational": "0.28 / 0.39 / 0.54", // C-EMBODIED
    "water_l_per_kwh": "onsite 0.3/0.9/1.8 + offsite EWIF 2.0/3.14/4.35"  // W-WATER
  },
  "sources": [                                    // Phase 6G: 当日数字引用的紧凑来源条目
    { "id": "C-GRID-EGRID", "title": "eGRID2022", "publisher": "US EPA", "url": "https://www.epa.gov/egrid", "version": "2022", "accessed": "2026-06-14" }
  ],
  "models": [
    {
      "slug": "minimax/minimax-m2.5",
      "display_name": "MiniMax M2.5",
      "origin": "CN",
      "open_or_closed": "open",
      "total_tokens": 4550000000000,            // prompt + completion，由 OpenRouter 报告
      "est_output_tokens": 910000000000,        // 通过 input_output_ratio 推导
      "wh_per_output_token": { "low": 0.0008, "mid": 0.0015, "high": 0.003 },
      "energy_kwh": { "low": 728, "mid": 1365, "high": 2730 },
      "energy_source": "ai_energy_score",       // ai_energy_score | ecologits | parameter_class_fallback
      "energy_source_id": "E-MINIMAX-M2.5",     // Phase 6G: 此能耗数字的来源键 -> sources.yaml
      "region": "us-east",
      "carbon_intensity_gco2_kwh": 380,
      "grid_source": "electricity_maps_live",   // electricity_maps_live | annual_factor
      "grid_source_id": "GRID-EM-LIVE",         // Phase 6G: 此电网数字的来源键 -> sources.yaml
      "pue": 1.25,                              // 代表性标量（A4 区间的中值）
      "co2_kg": { "low": 332, "mid": 622, "high": 1245 },          // 运营，基于位置
      "co2_kg_embodied": { "low": 93, "mid": 243, "high": 672 },   // C-EMBODIED（摊销制造）
      "co2_kg_total": { "low": 425, "mid": 865, "high": 1917 },    // 运营 + 嵌入式（全生命周期）
      "co2_kg_market": { "low": 332, "mid": 622, "high": 1245 },   // 基于市场（供应商可再生匹配）
      "wue": 4.04,                              // 代表性合并 L/kWh（W-WATER）
      "water_liters": { "low": 2300, "mid": 4040, "high": 6150 },
      "flags": []
    }
  ],
  "totals": {
    "total_tokens": 0,
    "uncovered_tokens": 0,                       // OpenRouter "other" 聚合，未单独建模
    "modeled_traffic_fraction": 0.0,             // (total_tokens - uncovered) / total_tokens；量化范围诚实度
    "precision": {                               // Phase 6F: 估算层级诚实度（报告现有 energy_source/grid_source 标志；无新来源数字）
      "energy_measured_fraction": 0.0,           // 按 token 加权；实测（ai_energy_score/ecologits）÷ 已建模 token
      "energy_class_fallback_fraction": 1.0,     // 与 energy_measured_fraction 合计为 1.0
      "grid_live_fraction": 0.0,                 // 按 token 加权；electricity_maps_live ÷ 已建模 token
      "grid_annual_fallback_fraction": 1.0,      // 与 grid_live_fraction 合计为 1.0
      "models_measured": 0, "models_total": 50, "grid_live_models": 0  // UI 文案的计数伴随物
    },
    "mapped_traffic_fraction": 0.0,              // Phase 6E: (total - uncovered - unmapped) / total；匹配到 crosswalk 条目的诚实比例
    "unmapped_tokens": 0,                        // Phase 6E: 热门列表中不在 model_crosswalk.yaml 的 slug 上的 token（标记 UNMAPPED_SLUG，绝不静默归桶）
    "unmapped_traffic_fraction": 0.0,            // Phase 6E: unmapped_tokens / total_tokens
    "unmapped_slugs": [ { "slug": "vendor/new-x", "total_tokens": 0 } ],  // Phase 6E 维护待办：将这些添加到 crosswalk（按 token 降序）
    "co2_kg": { "low": 0, "mid": 0, "high": 0 },
    "co2_kg_embodied": { "low": 0, "mid": 0, "high": 0 },   // C-EMBODIED 总计
    "co2_kg_total": { "low": 0, "mid": 0, "high": 0 },      // 运营 + 嵌入式总计
    "by_origin": { "CN": { "co2_kg": {"low":0,"mid":0,"high":0} } },
    "by_open_closed": { "open": { "co2_kg": {"low":0,"mid":0,"high":0} }, "closed": { "co2_kg": {"low":0,"mid":0,"high":0} } },
    "fairness": {                                 // Phase 6I
      "rank_stability": {
        "by_co2":        { "top_n": 10, "ranks_changed": 0, "max_displacement": 0 },
        "by_efficiency": { "top_n": 10, "ranks_changed": 0, "max_displacement": 0 }
      },
      "unweighted": { "co2_kg": { "low": 0, "mid": 0, "high": 0 } }  // 每模型等权重均值 = totals.co2_kg / N（“平均已建模模型足迹”）；与流量加权总数不同的数字，因此标题不会被读作某一个热门模型的工件（FAIRNESS.md §4）
    }
  }
}
```

正式的 JSON Schema 位于 `schemas/output.schema.json`（Phase 3 创建），任何写入前均须验证。

---

## 2. `data/crosswalk/model_crosswalk.yaml`（仅身份）

```yaml
- openrouter_slug: "minimax/minimax-m2.5"
  display_name: "MiniMax M2.5"
  origin: "CN"
  open_or_closed: "open"
  energy_source: "ai_energy_score"   # 由哪种方法提供 wh_per_output_token
  params_b: 230                       # 总参数（十亿），若已知；否则 null
  active_params_b: 10                 # MoE 活跃参数，若适用；否则 null
  assumed_provider: "minimax"         # 用于闭源模型的区域/PUE 查找
  assumed_region: "us-east"           # 进入 Electricity Maps 区域 / annual_factors.yaml 的键
```

规则：仅身份 + 分配。**此处无能耗数字** —— 这些位于 §3。

---

## 3. `data/energy/intensity.yaml`（每输出 token 的 Wh，带来源）

```yaml
models:
  - openrouter_slug: "minimax/minimax-m2.5"
    wh_per_output_token: { low: 0.0008, mid: 0.0015, high: 0.003 }
    source: "AI Energy Score v2 (HF); see ASSUMPTIONS.md#E-MINIMAX"

parameter_class_fallback:            # 当模型 energy_source 为 parameter_class_fallback 或 UNKNOWN 时使用
  - max_active_params_b: 15
    wh_per_output_token: { low: 0.0005, mid: 0.0012, high: 0.0025 }
    source: "ASSUMPTIONS.md#E-CLASS-SMALL"
  - max_active_params_b: 100
    wh_per_output_token: { low: 0.002, mid: 0.005, high: 0.012 }
    source: "ASSUMPTIONS.md#E-CLASS-LARGE"
```

（以上数字为占位符 —— Phase 2 填入真实值并在 ASSUMPTIONS.md 中记录每项推导。）

---

## 4. `data/assumptions/closed_models.yaml`（不透明提供商的假设）

```yaml
- provider: "openai"
  models: ["openai/gpt-..."]
  assumed_cloud: "azure"
  assumed_region: "us-east"
  assumed_gpu: "H100"
  pue: 1.2
  source: "ASSUMPTIONS.md#DC-OPENAI"
```

---

## 5. `data/grid/annual_factors.yaml`（回退电网强度）

```yaml
- region: "us-east"
  gco2_per_kwh: 380
  year: 2022
  source: "EPA eGRID2022"
- region: "europe-west"
  gco2_per_kwh: 230
  year: 2024
  source: "Ember 2024"
```

`region` 值在 §2/§4/§5 间共享键，必须与您查询实时的 Electricity Maps 区域匹配。

以上每个数值记录还携带一个 `source_id`（或 `source_ids`），可解析到 §6 —— 参见来源门禁。

---

## 6. `data/provenance/sources.yaml`（来源注册表 —— Phase 6G）

`data/**/*.yaml` 中每个数值记录的单一事实来源。

每个数值记录携带一个 `source_id`（字符串）或 `source_ids`（列表），**必须** 解析到此处的一个 `id`，否则构建失败（`pipeline/provenance.py` → `unsourced_numbers`，在 CI 和作为 pytest 门禁运行）。ID 在存在时复用 `docs/ASSUMPTIONS.md` 方案（`A*` / `E*` / `C*` / `DC*` / `V*`）。

```yaml
- id: "C-GRID-EGRID"
  title: "eGRID2022"
  publisher: "US EPA"
  url: "https://www.epa.gov/egrid"
  version: "2022"
  accessed: "2026-06-14"
  locator: "US average output emission rate"   # 页/表/节指针
  license: "public domain (US gov)"
  claim: "annual-average US grid emission factor"  # 简短释义，绝不逐字引用
```

**版权：** `claim` 始终为简短释义 + 定位器，绝不复制来源文本；门禁限制 `claim` 长度。实际被当日数字引用的条目的紧凑子集 `{id, title, publisher, url, version, accessed}` 被输出到 `latest.json` `sources[]`（§1），且每个模型携带 `energy_source_id` / `grid_source_id`，因此每个已发布数字均可端到端追溯。

---

## 7. `data/output/manifest.json`（运行清单 —— Phase 6H）

```jsonc
{ "runs": [ {
    "data_date": "2026-06-14",
    "code_git_sha": "abc123",
    "methodology_version": "0.5.0",
    "tool_versions": { "python": "3.11.x", "ecologits": "x.y" },
    "inputs": { "openrouter.json": "sha256:...", "grid/us-east.json": "sha256:..." },
    "output_sha256": "sha256:..."
} ] }
```

快照（位于 `data/raw/snapshots/{data_date}/` 下）是运行的**输入**，而非已发布工件。保留策略：保留仓库中最近 N 天的快照；归档或丢弃更早的。每个 `sha256:` 值是对相应快照文件（或在电网响应位置使用的年因子回退记录）*精确*字节的摘要。
