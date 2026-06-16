[English](methodology.md) | [中文](methodology_zh.md) | [Deutsch](methodology_de.md)

# 方法学与不确定性

> 本文档同时作为项目论文的方法学部分。文中引用的每一个数字均可追溯至 [`ASSUMPTIONS.md`](ASSUMPTIONS.md) 中的条目；每一个形状均可追溯至 [`DATA_SCHEMAS.md`](DATA_SCHEMAS.md)。

## 1. 范围（不可妥协）

本项目估算的是 **OpenRouter 可见的 LLM 推理** 的 CO₂ 足迹 —— 这是全球 AI 使用量中一个*具有代表性但部分*的切片。消费者应用（ChatGPT、Gemini、Claude 应用）**不**包含在内。它**不是**对全球数据中心总排放量的测量。**所有数字均为包含显式不确定性范围的估算值，而非实测数据**，尤其是对于闭源模型而言，其参数、硬件和数据中心位置均未公开披露。已发布的 `totals.modeled_traffic_fraction` 精确说明了我们实际建模的每日 OpenRouter 流量的比例。

确切的**系统边界**——哪些计入、哪些排除以及原因——记录在 [`BOUNDARY.md`](BOUNDARY.md) 中。用于公平跨模型比较的原则（开源 vs 闭源不对称、分词器不可比性、来源中立性、备选假设下的排名稳定性）见 [`FAIRNESS.md`](FAIRNESS.md)。

## 2. 估算链

```
total_tokens (OpenRouter rankings-daily)
   └─ × 0.20  ──────────────▶ est_output_tokens          [A2, 80:20 input:output]
        └─ × wh_per_output_token (Range) ─▶ energy_Wh     [E-series; AI Energy Score / EcoLogits]
             └─ / 1000 ─────────────────▶ energy_kWh      [Wh→kWh guard]
                  └─ × PUE ──────────────▶ facility_kWh   [A4, default 1.2]
                       └─ × grid_gCO2/kWh ▶ gCO2           [C-GRID-* / Electricity Maps live]
                            └─ / 1000 ────▶ co2_kg         [g→kg guard]
```

正式地，按模型按天（**v0.2**）：

```
energy_kwh   = (wh_per_output_token × est_output_tokens
              + α × wh_per_output_token × est_input_tokens) / 1000   [E-PREFILL]
co2_kg       = energy_kwh × PUE × carbon_intensity_gco2_kwh / 1000   [PUE is a band, A4]
co2_embodied = co2_kg × embodied_ratio                                [C-EMBODIED]
co2_total    = co2_kg + co2_embodied
water_L      = energy_kwh × PUE × (onsite_WUE + offsite_EWIF)         [W-WATER]
```

输出（解码）token 在每 token 能耗中占主导，但 v0.2 不再将约 80 % 的输入 token 视为免费：预填充阶段是计算密集型的，每 token 成本为解码速率的 α = 0.1–0.2–0.3 倍（E-PREFILL），但并非零。80:20 分割（A2）和 α 是文档化的敏感性轴，而非实测比率。

**v0.2 相对于 v0.1 的变化：** (1) 计入了输入/预填充能耗；(2) PUE 是一个区间 `{1.1, 1.25, 1.56}` 而非固定的 1.2（A4）；(3) 增加了与运行（operational）并列的摊销**隐含**（制造）碳项（C-EMBODIED）；(4) 水资源被拆分为现场冷却 + 场外发电（W-WATER）。标题 `co2_kg` 仍为**运行的、基于位置的**；`co2_kg_total` 是全生命周期数字。这些变化提高了中心估算值并*扩大*了区间——多个独立不确定性按端点相乘后复合成一个刻意保守的包络（见 §4）。

## 3. 假设（完整登记表见 `ASSUMPTIONS.md`）

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

每查询能耗文献范围在 **~0.3 Wh（Google）至 ~1.8–7 Wh（EcoLogits）** 之间，取决于假设（E-METHOD）；我们的区间刻意宽泛，以覆盖这些分歧。

## 4. 不确定性处理（在信任任何数字前请阅读）

每一个能耗/CO₂ 量都是一个 **Range** `{low, mid, high}` 且 `low ≤ mid ≤ high`，端到端传递（`pipeline/ranges.py`）。传播有意保持简单：Range × 正标量会缩放每个端点；Range × Range 会按端点相乘。

**这个 `{low, mid, high}` 区间是一个保守的端点区间，而非统计置信区间。** 它表达的是可辩护假设的 spread，而非概率分布。我们不声称 95% CI 或任何概率覆盖——那样做会暗示我们并不拥有的数据（尤其是闭源模型）。JSON 或 UI 中任何裸露的点数字都是 bug。

### 4a. 估算层级精度（`totals.precision`，methodology v0.3.0）

除不确定性*区间*外，我们还发布每个数字所依据的**输入层级**。每一行已携带 `energy_source`（`ai_energy_score` / `ecologits` → 真实测量；`parameter_class_fallback` → 参数类猜测）和 `grid_source`（`electricity_maps_live` → 实时电网强度；`annual_factor` → 年度平均）。`totals.precision` 将这些标志聚合为四个分数：

- **`energy_measured_fraction`** — 建模流量中能耗基于测量（AI Energy Score 或 EcoLogits）的份额，以及其补集 **`energy_class_fallback_fraction`**（参数类回退）。两者之和为 1.0。
- **`grid_live_fraction`** — 电网强度来自实时 Electricity Maps 的份额，以及其补集 **`grid_annual_fallback_fraction`**（年度表）。两者之和为 1.0。

这些分数按 `total_tokens` **进行 token 加权**，而非按计数加权，且仅在建模行上计算（排除 `other`/未覆盖聚合）。Token 加权是刻意的：它回答“已发布足迹中有多少 rests on 测量的输入？”，这是读者应该信任的——单个高流量回退模型远比几个微小的已测量模型更重要。还发布了可读 UI 文案的计数伴随项（`models_measured` / `models_total`，`grid_live_models`）。此区块**未引入新的来源数字**；它仅报告每行标志已经蕴含的内容。

### 4b. 来源与可验证性（`sources.yaml` + gate，methodology v0.4.0）

CLAUDE.md 的“无魔法数字”规则现已**机器强制执行**。`data/provenance/sources.yaml` 是一个结构化登记表——每个来源一个条目（`id`、`title`、`publisher`、`url`、`version`、`accessed`、`locator`、`license`、`claim`）——且 `data/**/*.yaml` 中的**每一个**数字记录都携带 `source_id`（或 `source_ids`），必须解析到登记表的 `id`。构建门禁 `pipeline/provenance.py`（`python -m pipeline.provenance`，同时也是 pytest 测试和 CI 步骤）**会在任何未来源数字上失败**，因此后续阶段无法悄无声息地引入数字。这是项目*可被验证 / 溯源*（verifiable / traceable）目标的支柱。

已发布的 `latest.json` 是自描述的：它携带顶层 `sources[]` 数组——当天实际引用的登记表的紧凑子集——且每个模型行携带 `energy_source_id` 和 `grid_source_id`，因此每个数字都可追溯到其来源。为尊重来源版权，每个登记表 `claim` 都是**简短的释义加定位器**，从不复制来源原文（门禁限制 claim 长度）。

## 5. 范围与局限

- **覆盖是部分的。** 仅 OpenRouter 可见的 API 流量；`modeled_traffic_fraction` 量化每天被建模的份额（`other` 聚合行是未建模的分母，绝不丢弃或合并）。
- **分词器不可比性（L-TOKENIZER）。** Token 计数来自各提供商自己的分词器，**跨行不可直接比较**；任何跨模型 token 求和或每 token 效率都带有此免责。
- **闭源模型不透明。** 参数、硬件和 DC 位置未披露；闭源行使用 EcoLogits 类假设、最宽的区间，以及 `CLOSED_MODEL_ASSUMED` 标志。
- **电网时序。** 年度因子是平均值；实时强度随小时/燃料结构大幅波动。优先使用实时 Electricity Maps；年度表是带标签的回退（`grid_source`）。

## 6. 敏感性分析（PUE 与负载）

鉴于硬件部署的不确定性，需要进行敏感性分析：
- **PUE（Power Usage Effectiveness）**：最佳数据中心（如 Google）可能运行在 PUE ~1.1，而较旧或优化较差的设施接近 1.5。这在总 CO₂ 估算中造成约 36% 的方差。
- **利用率/负载**：高利用率运行的服务器每 token 更节能。我们的基础区间纳入了 50% 至 100% 负载的变化。

## 7. 欧盟语境与 ESG 报告相关性（CSRD / EU Taxonomy）

本项目与新兴的欧洲可持续性框架保持一致：
- **CSRD / ESRS (E1 Climate Change)**：此处的估算支持根据《企业可持续发展报告指令》计算范围 3 排放（购买的服务/云计算）的要求。
- **EU Taxonomy (DNSH)**：评估 AI 工作负载是否对环境目标“无重大损害”（Do No Significant Harm），需要工作负载级别的能耗强度颗粒度透明度。
- **Energiewende 与区域电网**：通过使用 *Electricity Maps*，该指数捕捉了电网区域之间的鲜明对比。例如，推理路由到法国（核能为主，~50gCO₂/kWh）与德国（煤/可再生混合，~300gCO₂/kWh）对完全相同的 LLM 查询会产生截然不同的足迹。

## 8. 基于市场 vs 基于位置（GHG Protocol Scope 2）

- **基于位置** 使用服务区域的物理电网强度（本 MVP 报告的内容）。
- **基于市场** 反映提供商购买的合同工具（PPA/REC），这可以将报告强度推向零——这是一种*会计*结果，而非消耗电子的物理变化。

两者可能相差一个数量级。报告两者以及替代情景是 **Phase 6** 的工作；本 MVP 仅报告基于位置的，并标记该区别，以免被误读为物理现实。

## 9. Electricity Maps 许可决策（L-EM-FREE）

Electricity Maps 免费层级是**非商业的**。本项目的决策：在**非商业学术 / 投资组合模式**下运行，并在实时数据不可用或区域不受支持时，优雅降级到已提交的年度因子表（`data/grid/annual_factors.yaml`），同时每行记录 `grid_source`。如果项目将来用于商业用途，则需要付费的 Electricity Maps 计划（或仅年度因子模式）。该决策在 `README.md` 中重述。

## 10. 必需的归属

- `Source: OpenRouter (openrouter.ai/rankings), as of {data_date}` — 存储在 `source_citation` 并在 UI 中显示（L-OR-CITATION）。
- 电网强度：Electricity Maps（实时）+ Ember / EPA eGRID（年度回退），通过 `grid_source` 每行记录。
- 能耗：Hugging Face **AI Energy Score** + **EcoLogits**（E-METHOD）。

## 11. 复现与验证

针对数据日期 `D` 的已发布运行，附带其原始输入的冻结快照，位于 `data/raw/snapshots/{D}/` 下（确切的 OpenRouter 排名响应、每个电网区域响应或所使用的年度因子记录，以及通过构建时 repo git SHA 捕获 `data/**/*.yaml` 版本的 `resolved.json`）。快照中绝不出现密钥和认证头。`make verify {date}` 严格从该快照重新执行流水线（无网络），并断言发出的 `data/output/history/{date}.json` 与已提交的黄金文件字节一致（仅忽略易变的 `generated_at` 时间戳）。`data/output/manifest.json` 记录每日期的 `sha256:` 校验和，覆盖每个快照输入文件加上最终输出、代码 git SHA、方法学版本和工具版本；因此第三方可以独立确认完整性。所有依赖通过 `uv.lock` 锁定。

```bash
git clone https://github.com/wyl2607/llm-carbon-index.git
cd llm-carbon-index
uv sync
make verify 2026-06-14  # expect PASS
```

## 12. 相关工作与文献定位

Strubell et al. (2019) 首次系统量化了 NLP 训练的能耗与碳足迹，并确立了学术界应报告模型能耗的规范 [1]。本项目将这一“报告能耗”规范从训练阶段扩展至通过 OpenRouter 驱动的公开仪表盘对实时的、按模型拆分的*推理*流量进行观测。

Luccioni et al. (2023) 在 BLOOM 全生命周期评估中，首次对一个 176 B 公开模型的动态、空闲与隐含排放进行了详细的实证拆分，发现隐含碳约占总量的 ~22 % [2]。本项目 v0.2 中引入的隐含项（C-EMBODIED）刻意与该研究及后续工作报告的 22–35 % 范围保持一致。

Faiz et al. (2023) 提出了 LLMCarbon，这是一个面向稠密与 MoE 架构的端到端运行+隐含投影模型，在针对实测工作负载的验证中达到 ~8 % 误差，隐含份额为 24–35 % [3]。本项目范围更窄——聚焦于推理流与实时公开排名——因此是互补的；两个框架之间的混合交叉验证被确定为未来的机会。

Hugging Face 的 AI Energy Score 提供了一个标准化的、由 CodeCarbon 支持的推理能耗基准 [4]；本项目直接将这些数字作为其 E-series 假设的主要测量锚点消费。EcoLogits 提供了一个独立的 GenAI API 推理估算器，用作 E-METHOD 基线并用于闭源模型覆盖 [5]。CodeCarbon 是支撑上述若干基准的共同本地测量基底 [6]。

Jegham et al. (2025) 在真实基础设施条件下对三十多个模型的能耗、水和碳进行了基准测试，并记录长提示工作负载可超过每查询 30+ Wh [7]。他们的发现直接推动了本估算流水线全流程采用的刻意宽泛不确定性区间。

上述工作为这里使用的方程、区间和来源规则提供了经验基础与建模范例。文献中若干重要空白仍未完全弥合：动态批处理与瞬时利用率机制、MoE 路由开销，以及用于隐含碳因子的标准化、可审计的提供商来源方法。这些局限被诚实地确认为未来的明确工作方向。本仪表盘产出的是带有不确定性范围的估算值；它不声称直接测量精度。

## 13. 参考文献

[1] Strubell, Ganesh, McCallum (2019). Energy and Policy Considerations for Deep Learning in NLP. https://arxiv.org/abs/1906.02243
[2] Luccioni, Viguier, Ligozat (2023). Estimating the Carbon Footprint of BLOOM. https://arxiv.org/abs/2211.02001
[3] Faiz et al. (2023). LLMCarbon: Modeling the End-to-End Carbon Footprint of LLMs. https://arxiv.org/abs/2309.14393 (code: https://github.com/SotaroKaneda/MLCarbon)
[4] Hugging Face AI Energy Score. https://huggingface.co/spaces/AIEnergyScore/Leaderboard
[5] EcoLogits. https://ecologits.ai/
[6] CodeCarbon. https://github.com/mlco2/codecarbon
[7] Jegham et al. (2025). How Hungry is AI? Benchmarking Energy, Water, and Carbon Footprint of LLM Inference. https://arxiv.org/abs/2505.09598
[8] Li et al. (2023). Making AI Less "Thirsty": Water Footprint of LLMs. https://arxiv.org/abs/2304.03271

## 14. 文献交叉验证与引用（Phase 6P）

本项目对其每次查询的能耗（及衍生 CO₂）区间，与独立发表的文献锚点做结构化、自动化的交叉验证。验证程序位于 `pipeline/validate_literature.py`，由机器可读的注册表 `data/validation/literature_anchors.yaml` 驱动。

### 锚点与出处
- 每个锚点以 `{low, mid, high}` 容差带记录确切的已发表数值（或短 prompt 代表值），并在可得时附 `co2_g_per_query` 中值。
- 每个数值都带 `source_id`，**必须**解析到 `data/provenance/sources.yaml` 中独立的 `LIT-*` 命名空间条目（BLOOM、Gemini、OpenAI 博客主张、Jegham）。测试门禁 `tests/test_literature_anchors.py` 校验所有锚点可解析。
- `LIT-OPENAI`（0.34 Wh「平均查询」，Altman 2025-06-10 博客）明确标记 `verified: false`，仅作报告用软锚点；在被同行评审来源取代前，不对它执行硬性区间断言。

### 模型匹配与每查询推导
对每个锚点，验证程序：用 `model_match`（`params_b_gte`+`dense`/`family` 等）在当日 `latest.json` 中定位可比模型（必要时查 `model_crosswalk.yaml` 的 `params_b`/`active_params_b`）；索引中无精确高参稠密模型时回退到 `intensity.yaml` 的 `parameter_class_fallback` 区间；按锚点的 `query_output_tokens` 缩放 `wh_per_output_token` 得到 Wh/查询带；含 `co2_g_per_query` 时用匹配模型的 `pue` 与 `carbon_intensity_gco2_kwh` 推并行 CO₂ 带；以 `band.low <= anchor_mid <= band.high` 检验包含性，出带（flag）作为显式 finding 记录，绝不静默接受。输出 `data/output/validation.json` 每锚点一条记录。

### 为何需要该 harness
文献数值因可理解的原因不同：BLOOM（arXiv:2211.02001）是 176B 稠密模型法国电网上的全口径（动态+idle+embodied），我们的运营每 token 区间故意排除常驻 idle；Gemini 报告（arXiv:2508.15734）在高度优化的服务栈上报低中值（0.24 Wh），我们的闭源行用宽 `parameter_class_fallback` 区间正因参数/硬件/数据中心效率未披露；Jegham（arXiv:2505.09598）记录短查询（0.42 Wh）与长 prompt 极值（29 Wh），长 prompt 离群点会如期 flag 并向读者揭示；Strubell（arXiv:1906.02243）确立了能耗报告的最初呼吁；LLMCarbon/Faiz（arXiv:2309.14393）的 24–35% embodied 份额支撑了 C-EMBODIED。出带的已验证锚点是设计信号而非失败。

## 15. vNext 深度增补（层级 / 物理 embodied / MoE 能耗 / 工况 / ESG 导出）

**不可区分层级（6m）。** 因逐模型 CO₂ 排名在合理替代假设下不稳定（见 `totals.fairness.rank_stability`），索引把 `{low, high}` CO₂ 区间重叠的模型归入不可区分的「层级」（`pipeline/fairness.py:indistinguishable_tiers` → `totals.tiers`）。Tier 1 为影响最低层；层级是头条，精确名次为次要。当前全 fallback 数据下所有头部模型坍缩为单一层——这是对 ~10–16× 不确定度的诚实反映，而非缺陷。

**物理 embodied 交叉验证（6n）。** 在 ratio-of-operational 代理（C-EMBODIED）之外，第二个物理估算器（`pipeline/embodied.py`）沿用 LLMCarbon：`embodied_kg = 芯片面积_cm² × CPA_kgCO₂/cm² × (GPU小时 / 寿命小时) / 利用率`，GPU 小时由运营能耗 ÷ 单卡功率推得。硬件常数（面积、CPA、TDP、寿命、利用率）在 `data/assumptions/hardware_embodied.yaml` 的 `H-*` 命名空间溯源。两个估算器都报告，其差值即 embodied 方法不确定度。

**MoE 感知能耗（6q）。** 推理能耗随**活跃**而非总参数缩放。参数类 fallback 区间以 `model_crosswalk.yaml` 的 `active_params_b` 为键（仅在活跃缺失时回退总 `params_b`），故高总参/低活跃的 MoE 模型落入 small-active 能耗类。

**动态工况 / 批处理（6o）。** 固定 Wh/token 忽略批大小、KV 缓存与 prefill/decode 非线性。有出处的工况乘子（`data/assumptions/regime_factors.yaml`，`R-*` 命名空间）让短→长 prompt 与低→高批可调；关系单调（更长 prompt / 更低批 → 更高能耗），经 What-If 模拟器滑块交互暴露。

**ESG / CSRD 范围二导出（6r）。** `pipeline/output.py` 输出 `data/output/esg_export.json`，把基于位置（`totals.co2_kg`）与基于市场（`totals.co2_kg_market`）映射为 GHG Protocol 范围二双重报告及 ESRS-E1 风格行项。项目范围/不确定性声明逐字嵌入每个导出产物且不可移除；不创造新数值。网页 UI 提供下载入口。
