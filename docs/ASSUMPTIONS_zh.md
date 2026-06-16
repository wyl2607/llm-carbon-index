[English](ASSUMPTIONS.md) | [中文](ASSUMPTIONS_zh.md) | [Deutsch](ASSUMPTIONS_de.md)

# docs/ASSUMPTIONS.md

本项目所依赖的每一个数字都记录在此，附带来源、数值/范围以及不确定性说明。**每当引入任何新的常数、系数、比率或区域因子时，必须在同一提交中添加条目。** 本文件是方法学章节/论文的支柱。

每个条目格式：`ID · 说明 · 数值(范围) · 来源 · 不确定性 · 使用位置 · 最后审核日期`。

**自 Phase 6G 起机器强制执行：** `data/**/*.yaml` 中的每一个数字必须携带一个 `source_id`，该 ID 可解析到 `data/provenance/sources.yaml` 中的条目，由 CI 和 pytest 中的 `python -m pipeline.provenance` 进行检查。本文件中的 ID 是这些注册表条目的人类可读伴随物——添加常数时请保持两者同步。

---

## A — 建模假设

### A1 — 模型子集 (MVP)
从 OpenRouter 热门列表中的 **开源** 模型开始，这些模型具有 AI Energy Score 数据，加上 1–2 个通过 EcoLogits 的 **闭源** 模型。列于 `model_crosswalk.yaml`。后续阶段将扩展。*不确定性：* 覆盖率是部分的；`totals.modeled_traffic_fraction` 报告实际建模的当日流量占比。

### A2 — 输入:输出 token 比率
`rankings-daily` 返回的是 **合并** 的 prompt+completion token；推理能耗主要随 **输出** token 变化。默认拆分 **80:20 (input:output)** → `est_output_tokens = total_tokens × 0.20`。
- *状态：* 首先验证 API 是否暴露仅 completion 字段；若有则使用之并废弃此假设。
- *来源：* 默认参考 OpenRouter 发布的用量研究（将用其报告的比率细化）。*不确定性：* 高；将其作为方法学中的敏感性分析轴处理。*使用位置：* `pipeline/tokens.py`。

### A3 — 每个模型的数据中心区域
每个提供商假设一个区域（`closed_models.yaml`），用于获取电网强度。*来源：* 公开的提供商/云披露 + 合理推断。*不确定性：* 对于闭源提供商较高（位置未披露）。用 `CLOSED_MODEL_ASSUMED` 标记行。

### A4 — 电能利用效率 (PUE)  *(修订 v0.2：现为区间而非单点)*
PUE 作为 **范围 `{low 1.1, mid 1.25, high 1.56}`** 应用，而非固定标量，因为 OpenRouter 路由到 *混合* 的超大规模和非超大规模后端，且每个请求的单一设施 PUE 不可知。
- *数值：* low **1.1**（Google/超大规模机群报告）；mid **1.25**（典型现代设施）；high **1.56**（Uptime Institute 全球数据中心调查 2024 行业平均值，连续 5 年持平）。
- *来源：* Uptime Institute Global Data Center Survey 2024；Google 环境/PUE 报告。*不确定性：* 实际机群 PUE 1.1–1.6+。已知提供商 PUE（来自 `closed_models.yaml`）作为区间中值中心；low/high 保留全球边界。*使用位置：* `methodology_factors.yaml` `pue`；`estimate.py`；`carbon.co2_kg`（接受 Range）。*最后审核：* 2026-06-16。

### E-PREFILL — 输入 (prefill) token 能耗  *(新增 v0.2)*
推理能耗取决于 **输入和输出** token。预填充阶段（处理提示）是 **计算密集且并行**（硬件利用率高），因此每 token 比内存带宽受限的解码阶段 *更便宜* —— 但 **并非零**。v0.1 仅建模输出 token，将约 80% 的 token 视为无能耗丢弃；v0.2 增加了预填充项。
- *数值：* `wh_per_input_token = alpha × wh_per_output_token`，其中 **alpha = {low 0.1, mid 0.2, high 0.3}**。`input_tokens = total − est_output_tokens`。
- *来源：* LLM 推理能耗研究中的预填充/解码能耗分解 —— arXiv:2507.11417 (Quantifying Energy & Carbon of LLM Inference via Simulations)；TokenPowerBench arXiv:2512.03024。*不确定性：* 非常高（无公开的按模型预填充:解码能耗拆分）；将 alpha 视为敏感性轴。*使用位置：* `methodology_factors.yaml` `prefill_alpha`；`tokens.input_tokens`；`energy.energy_kwh`。*最后审核：* 2026-06-16。

---

## E — 能耗强度（每输出 token 的 Wh）

这些数据馈入 `data/energy/intensity.yaml`。每个模型/类别条目必须引用其每输出 token Wh 范围的推导方式。

- **E-METHOD** — 两个主要来源：(1) **AI Energy Score**（Hugging Face/Salesforce/CMU）—— 按 1000 次标准化查询测量的 Wh；通过除以基准查询的假设平均输出 token 数（记录假设值）反推出每输出 token 值。(2) **EcoLogits** —— 基于提供商 + 模型 + 输出 token 数 + 延迟的每请求影响建模（基于 LCA，符合 ISO 14044）。对于闭源模型，参数计数为估算 → 携带宽范围。*不确定性：* 注意一次聊天式查询的能耗估算值可在 ~0.3 Wh（Google）至 ~1.8–7 Wh（EcoLogits）之间，取决于假设 —— 你的范围应反映此差异。
- **E-CLASS-\*** — 未知/未覆盖模型的参数类别回退系数，按活跃参数段键控。每段的来源 + 推导均有记录。*不确定性：* 非常高；这些条目存在是为了让管道优雅降级，而非追求精确。
- **E-{MODEL}** — 每添加一个被建模的模型即有一个条目。

### E-CLASS-SMALL (Phase 2 seed)
- **E-CLASS-SMALL** — 活跃参数 ≲15B 的模型，每输出 token 0.0005–0.0012–0.0025 Wh。*来源：* 参考 AI Energy Score v2 小模型测量值 + EcoLogits 对 7-13B 类的范围；为基准到生产的方差、分词器差异和测量不确定性加宽约 ±2x。*不确定性：* 高（类别段而非按模型）。*使用位置：* intensity.yaml 参数类别回退首段；未知模型或 crosswalk 中显式 "parameter_class_fallback" 的回退路径。*最后审核：* 2026-06-15。

### E-CLASS-LARGE (Phase 2 seed)
- **E-CLASS-LARGE** — 活跃参数高达 ~100B 的模型，每输出 token 0.002–0.005–0.012 Wh。*来源：* 参考 AI Energy Score v2 + EcoLogits 30-100B 类测量；为闭源模型不透明性（无公开参数）加宽上限。*不确定性：* 非常高。*使用位置：* intensity.yaml 大段；UNKNOWN_MODEL 的默认保守选择。*最后审核：* 2026-06-15。

### E-MINIMAX-M2.5 (Phase 2 A1 seed)
- **E-MINIMAX-M2.5** — 每输出 token 0.0008–0.0015–0.003 Wh。*来源：* AI Energy Score v2 针对 ~10B 活跃 MoE 类（MiniMax M2.5）；为生产方差加宽范围。*不确定性：* 中（针对开源模型测量）。*使用位置：* crosswalk + intensity.yaml；cn-north 电网区域。*最后审核：* 2026-06-15。

### E-LLAMA-31-8B (Phase 2 A1 seed)
- **E-LLAMA-31-8B** — 每输出 token 0.0004–0.0009–0.0018 Wh（Llama 3.1 8B）。*来源：* AI Energy Score v2 7-13B 段；因为小型密集模型而略微收紧下限。*不确定性：* 中。*使用位置：* intensity.yaml。*最后审核：* 2026-06-15。

### E-QWEN25-72B (Phase 2 A1 seed)
- **E-QWEN25-72B** — 每输出 token 0.0018–0.0040–0.0090 Wh（Qwen2.5 72B）。*来源：* AI Energy Score v2 针对 70B 密集模型的信息；从 8B 段 + 已发布缩放观测放大。*不确定性：* 高（种子时无针对此确切检查点的直接 HF 测量）。*使用位置：* intensity.yaml；cn-north 电网。*最后审核：* 2026-06-15。

### E-MISTRAL-7B (Phase 2 A1 seed)
- **E-MISTRAL-7B** — 每输出 token 0.0005–0.0013–0.0026 Wh。*来源：* AI Energy Score v2 小段应用于 Mistral 7B EU 模型。*不确定性：* 中。*使用位置：* intensity.yaml；europe-west 电网。*最后审核：* 2026-06-15。

### E-DEEPSEEK-67B (Phase 2 A1 seed)
- **E-DEEPSEEK-67B** — 每输出 token 0.0015–0.0035–0.0080 Wh。*来源：* AI Energy Score v2 针对 60-70B 类（DeepSeek 密集/MoE）的信息。*不确定性：* 高。*使用位置：* intensity.yaml；cn-north。*最后审核：* 2026-06-15。

### E-CLAUDE-35-SONNET (Phase 2 A1 seed, closed)
- **E-CLAUDE-35-SONNET** — 每输出 token 0.0025–0.0060–0.0150 Wh。*来源：* EcoLogits 针对前沿闭源模型（Claude 3.5 Sonnet）的基于 LCA 的估算；范围比开源 70B 宽 >2× 以反映未披露的参数计数、硬件和数据中心效率。*不确定性：* 非常高。*使用位置：* intensity.yaml（ecologits 标签）；us-east 电网 + CLOSED_MODEL_ASSUMED。*最后审核：* 2026-06-15。

### E-MINIMAX-M3 (Phase 6j)
- **E-MINIMAX-M3** — 每输出 token 0.0008–0.0015–0.003 Wh（与 E-MINIMAX-M2.5 相同区间）。*来源：* AI Energy Score v2 MoE ~10B 活跃类；通过家族连续性应用于当前高流量 MiniMax M3（公开卡片无退化证据）。*不确定性：* 中（类匹配）。*使用位置：* minimax/minimax-m3 的 intensity.yaml（规范）；2026-06-14 上最高 token 份额贡献者。*最后审核：* 2026-06-16。

### E-DEEPSEEK-V4-FLASH (Phase 6j)
- **E-DEEPSEEK-V4-FLASH** — 每输出 token 0.0015–0.0035–0.0080 Wh（与 E-DEEPSEEK-67B 相同）。*来源：* AI Energy Score v2 60-70B 密集/MoE 类；通过家族应用于 DeepSeek V4 Flash（高流量开源）。*不确定性：* 高（flash 变体可能更高效；保守使用完整类区间）。*使用位置：* intensity.yaml；2026-06-14 第二高开源 token 量。*最后审核：* 2026-06-16。

### E-DEEPSEEK-V4-PRO (Phase 6j)
- **E-DEEPSEEK-V4-PRO** — 每输出 token 0.0015–0.0035–0.0080 Wh（与 E-DEEPSEEK-67B 相同）。*来源：* AI Energy Score v2 60-70B 密集/MoE 类；通过家族应用于 DeepSeek V4 Pro。*不确定性：* 中。*使用位置：* intensity.yaml；显著的开源 token 份额。*最后审核：* 2026-06-16。

### E-IDLE (Phase 6j; wired into estimate Phase 7)
- **E-IDLE** — 针对可比大型模型部署切片的 idle_kwh_per_day 区间 {3000, 8500, 18000} kWh/天，与 **idle_share_of_day = 0.2** 一起应用。*来源：* BLOOM 全口径 vs 仅 token 差距（Luccioni et al. arXiv:2211.02001: 914 kWh / 230,768 queries 得出 ~3.96 Wh/query 总计；~1.25 归因于每 token 仅留给 E-PREFILL/C-EMBODIED 后的 idle + 系统因子剩余）。转换为代表性查询量的每日 kWh；0.2 份额经过**校准**，使隐含的全口径 Wh/query 区间包含 BLOOM 的 ~3.96 数值（见 test_energy.py 中的 idle 回归）。*不确定性：* 非常高（切片分配近似；仅附加到具有强类比的模型）。*使用位置：* intensity.yaml（deepseek/deepseek-chat 携带 idle_kwh_per_day + idle_share_of_day + idle_source_id）；由 `energy.idle_for_slug` 解析并在 `estimate.py` 中添加（标记 **IDLE_INCLUDED**）；无 idle 数据的模型走纯动态路径（无静默 idle）。*最后审核：* 2026-06-16。

## R — 动态工况 / 批处理 / 提示长度（P6）
P6 引入可调工况乘子（取代固定 Wh/token 假设），以捕捉批大小、利用率、KV 缓存压力以及静态每输出 token 数字忽略的 prefill/decode 非线性。现有的 prefill_alpha (E-PREFILL) 现在是更广义工况中的一个轴。

- **R-REGIME-\*** — 六个离散工况区间（短/中/长提示 × 高/低批）。每个是参考每输出 token 能耗（来自 intensity，参考 ≈ 中提示 + 高批/利用率）的 {low,mid,high} 乘子。在 `energy_kwh(regime_multiplier=...)`（Range 相乘，端到端）和 web `scenario.ts` what-if 数学中应用。*来源：* 以 Jegham et al. (arXiv:2505.09598: 长提示工作负载达 ~29 Wh/query 而短 ~0.42 Wh，>30 模型) + prefill/decode 不对称（arXiv:2507.11417 Quantifying Energy & Carbon...; TokenPowerBench arXiv:2512.03024）+ 推理基准的利用率观测为锚点的合成。乘子设置保守，使缩放后的查询能耗（E-METHOD ~150 output tok）保持在已发表极值内/接近，而不编造。*单调性（必需）：* 严格更长提示类或更低批类产生更高乘子区间（无重叠反转）。*不确定性：* 非常高（工作负载相关；非按模型）。*使用位置：* `data/assumptions/regime_factors.yaml`；`pipeline/energy.py`；`web/src/lib/scenario.ts` + `scenario.test.ts`；WhatIfSimulator 工况/提示滑块。*最后审核：* 2026-06-16。

### R-REGIME-SHORT-HIGH
- 短提示（小输入，轻 KV/prefill）+ 高批（良好摊销，高利用）→ 乘子接近或低于 1.0（略优于参考基准混合）。R-REGIME-SHORT-HIGH。

### R-REGIME-SHORT-LOW / MED-LOW / LONG-HIGH / LONG-LOW
- 渐进增加：低批通过利用率下降提高成本；长提示通过 KV 缓存驻留 + prefill 份额（输入/输出比率非线性）提高成本。LONG-LOW 最高（最坏情况低利用长上下文）。确切区间见 regime_factors.yaml；sources.yaml 中的所有 R-* 条目。

---

## C — 物理 / 电网常数（自 Phase 0 种子；持续引用）

- **C-ENERGY-LUCCIONI** — 每查询 / 每 token 推理能耗参考数据。*来源：* Luccioni et al., 2024（推理能耗基准测试）。*使用位置：* 能耗强度合理性检查。
- **C-ENERGY-DEVRIES** — AI/数据中心能耗需求框架。*来源：* de Vries, 2023。*使用位置：* 量级合理性检查，方法学上下文。
- **C-PUE** — 见 A4（Google / Uptime）。
- **C-GRID-EGRID** — 美国电网排放因子。*来源：* EPA eGRID2022。*使用位置：* `annual_factors.yaml` 美国区域；Phase 0 电网常数。
- **C-GRID-US-EAST-380** (Phase 2 seed) — "us-east" 区域键的年均 380 gCO₂eq/kWh。*来源：* EPA eGRID2022（美国平均输出排放率）。*不确定性：* 年均值；实时值依小时/燃料组合在 ~150-700+ 波动；有实时 EM 数据时优先使用。*使用位置：* annual_factors.yaml us-east；电网回退路径；测试夹具。*最后审核：* 2026-06-15。
- **C-GRID-EUROPE-WEST-230** (Phase 2 seed) — "europe-west" 的 230 gCO₂eq/kWh。*来源：* Ember 2024 Europe West 年均。*不确定性：* 年均；冬季小时波动更大。*使用位置：* annual_factors.yaml；europe-west 模型。*最后审核：* 2026-06-15。
- **C-GRID-CN-NORTH-537** (Phase 2 seed) — "cn-north" 的 537 gCO₂eq/kWh。*来源：* Ember 2023 China（全国年均）。*不确定性：* 高（中国煤炭份额依省份/年份变化）；中国电网通常比美欧高碳。*使用位置：* annual_factors.yaml；A1 种子中所有 CN 来源模型。*最后审核：* 2026-06-15。
- **C-GRID-EU-27-242** (Phase 2 seed) — "eu-27" 的 242 gCO₂eq/kWh。*来源：* Ember 2023 EU-27 年均。*不确定性：* 年均聚合；实际服务区（DE/FR/NL）可能低得多。*使用位置：* annual_factors.yaml 作为可能回退。*最后审核：* 2026-06-15。
- **C-GRID-DEFAULT-400** (Phase 2 seed) — 保守复合 400 gCO₂eq/kWh。*来源：* 受 Ember 全球 2023 混合（种子中的美/欧/中因子）的数量级复合启发（非单一官方统计）。*不确定性：* 非常高；仅在 annual_factors 表中缺少区域键时使用。*使用位置：* annual_factors.yaml "default" 条目；grid.py 最后手段路径。*最后审核：* 2026-06-15。
- **C-GRID-\*** — 额外区域（例如 Ember / IEA 用于欧盟/亚洲）随 `annual_factors.yaml` 增长而添加。优先 Electricity Maps 实时数据；这些是文档化的回退。

### C-EMBODIED — 嵌入式（制造）碳  *(新增 v0.2)*
v0.1 仅报告 **运营** 碳。v0.2 增加 **摊销嵌入式** 项（硬件制造，EcoLogits 已包含的 LCA 组件）。
- *数值：* `co2_embodied = co2_operational × embodied_ratio`，其中 **embodied_ratio = {low 0.28, mid 0.39, high 0.54}**。源自文献将嵌入式碳置于 **总 LLM 碳的 ~22–35 %**，通过 `share/(1−share)` 转换为运营碳的分数（22 %→0.28，28 %→0.39，35 %→0.54）。`co2_total = operational + embodied`。
- *来源：* BLOOM LCA（~22 % 嵌入式，Luccioni et al.）；CarbonScaling arXiv:2508.06524；老化感知嵌入式摊销 arXiv:2501.15829。*不确定性：* 高；嵌入式随运营能耗缩放是硬件小时数的文档化代理，而非按模型测量的值。*使用位置：* `methodology_factors.yaml` `embodied_ratio`；`carbon.embodied_co2_kg` / `carbon.total_lca_co2_kg`；作为 `co2_kg_embodied` + `co2_kg_total` 发出。*最后审核：* 2026-06-16。

---

## W — 水足迹  *(新增 v0.2)*

### W-WATER — 现场 + 场外水拆分
v0.1 使用扁平 **1.5 L/kWh** WUE，将场外水混为一谈并低估。
v0.2 拆分足迹，两者均随 **设施** 能耗（IT × PUE）缩放：
`water_L = facility_energy_kWh × (onsite_WUE + offsite_EWIF)`。
- *数值：* **现场 WUE {0.3, 0.9, 1.8} L/kWh**（数据中心冷却蒸发）+ **场外 EWIF {2.0, 3.14, 4.35} L/kWh**（发电蒸发的水；美国均值 3.14）。
- *来源：* Li et al., *"Making AI Less Thirsty"*（arXiv:2304.03271 / CACM 2025）；其中的 EWIF 美国发电水因子。*不确定性：* 高；WUE 随空间/时间和冷却技术变化。*使用位置：* `methodology_factors.yaml` `water`；`water.water_liters`；作为 `water_liters`（+ 代表性 `wue`）发出。*最后审核：* 2026-06-16。

---

## DC — 闭源模型数据中心假设（Phase 2）

这些数据馈入 `data/assumptions/closed_models.yaml`。每个闭源模型行接收 `CLOSED_MODEL_ASSUMED` 标志。区域 + PUE 是驱动不透明提供商方差的主要因素。

- **DC-OPENAI** (Phase 2 seed) — 提供商 "openai"，假设区域 "us-east"，pue 1.2，云 "azure"，GPU H100（代表性）。*来源：* OpenAI 工作负载的公开 Azure 区域使用披露 + 超大规模 PUE 报告（Google 1.10 机群；我们使用 1.2 保守值）。*不确定性：* 每个请求位置未披露；实际服务区域可能取决于客户延迟为 US-West、EU 或 Asia。*使用位置：* closed_models.yaml；estimate.py 对 gpt-4o 的 pue 覆盖 + 区域。*最后审核：* 2026-06-15。
- **DC-ANTHROPIC** (Phase 2 seed) — 提供商 "anthropic"，假设区域 "us-east"，pue 1.2，云 "aws"。*来源：* Anthropic AWS Bedrock / 直接推理合作伙伴关系；保守的东海岸安置。*不确定性：* 高（无公开按模型 DC 地图）。*使用位置：* closed_models.yaml 用于 claude-3.5-sonnet。*最后审核：* 2026-06-15。
- **DC-GOOGLE** (Phase 2 seed) — 提供商 "google"，假设区域 "us-east"，pue 1.25，云 "google"。*来源：* Gemini 的 Google Cloud 美国区域；Google 发布强劲机群 PUE（~1.10），但我们应用 1.25 以界定较旧/合作伙伴容量。*不确定性：* 高。*使用位置：* closed_models.yaml 用于 gemini-1.5-flash。*最后审核：* 2026-06-15。

### DC-TENCENT (Phase 3 expansion)
- **DC-TENCENT** — 提供商 "tencent"，假设区域 "cn-north"，pue 1.3，云 "tencent_cloud"。*来源：* 公开的 Tencent Cloud / 中国提供商 DC 特性；非超大规模 CN 冷却效率的 PUE 1.3（A4）。*不确定性：* 高（未披露确切位置和工作负载路由）。*使用位置：* closed_models.yaml。*最后审核：* 2026-06-15。

### DC-STEPFUN (Phase 3 expansion)
- **DC-STEPFUN** — 提供商 "stepfun"，假设区域 "cn-north"，pue 1.3，云 "unknown"。*来源：* StepFun（中国 AI 提供商）的有限公开披露；按 CN 非超大规模指南应用保守 PUE 1.3。*不确定性：* 非常高。*使用位置：* closed_models.yaml。*最后审核：* 2026-06-15。

### DC-OPENROUTER (Phase 3 expansion)
- **DC-OPENROUTER** — 提供商 "openrouter"，假设区域 "us-east"，pue 1.2，云 "unknown"。*来源：* OpenRouter 充当推理路由器/网关；底层容量通常为美国超大规模或合作伙伴；默认 PUE 按 A4。*不确定性：* 高（多提供商后端，客户选择）。*使用位置：* closed_models.yaml。*最后审核：* 2026-06-15。

### DC-MOONSHOTAI (Phase 3 expansion)
- **DC-MOONSHOTAI** — 提供商 "moonshotai"，假设区域 "cn-north"，pue 1.3，云 "unknown"。*来源：* Moonshot AI（中国）；稀疏的公开 DC / 区域数据；中国提供商的 PUE 1.3。*不确定性：* 高。*使用位置：* closed_models.yaml。*最后审核：* 2026-06-15。

### DC-ZAI (Phase 3 expansion)
- **DC-ZAI** — 提供商 "z-ai"，假设区域 "cn-north"，pue 1.3，云 "unknown"。*来源：* 智谱 AI（GLM 系列，中国）；对中国实验室规模/区域提供商冷却的保守 PUE 1.3。*不确定性：* 高。*使用位置：* closed_models.yaml。*最后审核：* 2026-06-15。

---

## V — 供应商可再生能源声明

- **V-GOOGLE** — 100% 年可再生能源匹配。*来源：* Google Environmental Report（自 2017 年起）。*不确定性：* 低（对于年度匹配，但不意味着 24/7 CFE）。*使用位置：* vendor_claims.yaml。
- **V-OPENAI** — 100% 年可再生能源匹配。*来源：* Microsoft Azure Environmental Sustainability Report（自 2014 年起匹配）。*不确定性：* 低。*使用位置：* vendor_claims.yaml。
- **V-ANTHROPIC** — 100% 年可再生能源匹配。*来源：* 基于通过 Google Cloud 和 AWS 托管的假设，两者均声称 100% 可再生能源匹配。*不确定性：* 中（假设所有推理基础设施均被主机声明覆盖）。*使用位置：* vendor_claims.yaml。
- **V-META** — 100% 年可再生能源匹配。*来源：* Meta Sustainability Report（自 2020 年起匹配）。*不确定性：* 低。*使用位置：* vendor_claims.yaml。

### C-MARKET-RESIDUAL — 基于市场的残余下限 *(Phase 7)*
- **C-MARKET-RESIDUAL** — `market_factor = max(market_residual_floor, 1 − match%/100)` ，其中 **market_residual_floor = 0.10**。供应商 **100 % 年度** 可再生匹配否则会将基于市场（Scope 2）的 CO₂ 推至恰好 **0** —— 项目“无静默零”规则禁止的假精度零。年度匹配**不是** 24/7 无碳：每小时发电/消耗不匹配留下真实残余排放（Google 2023 报告尽管 100 % 年度匹配，全球 24/7 CFE 约 64 %）。0.10 是残余的**保守下界**（实际可能更高）；下限生效的行标记为 **MARKET_RESIDUAL_FLOOR**。*不确定性：* 高（单一全球下限；每提供商每小时配置文件变化）。*使用位置：* `methodology_factors.yaml` `market_residual_floor`；`estimate.py` market 步骤；`data/provenance/sources.yaml#C-MARKET-RESIDUAL`。*最后审核：* 2026-06-16。

### C-AGG-CORRELATION — 不确定性聚合 *(Phase 7)*
- **C-AGG-CORRELATION** — 每模型 `{low,mid,high}` 范围按两种方式求和为生态系统总量。**`totals.co2_kg`**（头条）线性求和端点（low+low, high+high）—— 保守的**完美相关包络**，理由是主导不确定性（PUE 区间、能耗类强度、电网因子）是*共享的系统*假设，对每个模型应用相同，因此其误差相干相加。**`totals.co2_kg_independent`** 以**平方和开根**（√Σ squares）组合半宽，即如果每模型误差统计上*独立*并部分抵消时应用的较窄区间。现实介于两者之间；头条使用保守的 `co2_kg`。*使用位置：* `output._sum_co2` / `output._sum_co2_independent`；`totals.co2_kg` + `totals.co2_kg_independent`。*最后审核：* 2026-06-16。

---

## L — 许可 / 范围说明

- **L-EM-FREE** — Electricity Maps 免费层级为 **非商业**。公开部署的决策（学术/非商业用途 vs 学术访问 vs 主要依赖年因子模式）在上线前记录于 `methodology.md` 和 `README.md`（Phase 5）。
- **L-OR-CITATION** — OpenRouter 要求在任何再发布图表中包含引用字符串（见 ENGINEERING_STANDARDS §6）。
- **L-TOKENIZER** — Token 计数来自各提供商自己的分词器，**跨行不可直接比较**；无论何处出现跨模型 token 总和，均须注明这一点。

---

*维护：* 在刷新数据或提交论文前审核带日期的条目。陈旧的电网因子和能耗系数最可能漂移。

---

## A6 — 替代假设集（仅 Phase 6I）

`data/assumptions/alt_assumption_sets.yaml` 仅向 `pipeline.fairness.rank_stability`（通过 `build_output`）提供可辩护的变体。这些量化在改变以下条件时两个排行榜（总 CO₂；每输出 token 的 CO₂）上的排行榜稳健性：

- A2 输入:输出拆分（70:30 vs 文档的 80:20）
- A4 PUE（1.1 和 1.5 标量 vs 区间）
- 区域电网因子（"best" = 最低的种子年均值，europe-west 230 g，vs 每个模型的假设区域）

每个数值叶子携带一个 `source_id`，可在 `sources.yaml` 中解析（A2、A4、C-GRID-EUROPE-WEST-230）。这些集合绝不影响主要发布的估算或核心链；它们仅为 `totals.fairness.rank_stability` 伴随物（以及未加权聚合视图）而存在。参见 `specs/phase-6i-fairness-and-boundary.md`（任务 3/4/6）和 `DATA_SCHEMAS.md` §1。

数值 + 来源（复用；无新魔法值）：
- "70:30" → A2
- PUE 1.1 / 1.5 → A4
- grid_gco2 230 → C-GRID-EUROPE-WEST-230

最后审核：2026-06-16。
