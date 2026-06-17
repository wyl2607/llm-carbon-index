# LLM Carbon Index (大模型碳足迹指数)

[English](README.md) | [中文](README_zh.md) | [Deutsch](README_de.md)

[![Live Demo](https://img.shields.io/badge/Live_Demo-wyl2607.github.io%2Fllm--carbon--index-16a34a?style=for-the-badge)](https://wyl2607.github.io/llm-carbon-index/)
[![GitHub Actions Pipeline](https://img.shields.io/github/actions/workflow/status/wyl2607/llm-carbon-index/pipeline.yml?style=for-the-badge&label=Pipeline)](https://github.com/wyl2607/llm-carbon-index/actions)

这是一个公开透明的仪表盘项目，旨在**估算 [OpenRouter 公开排名](https://openrouter.ai/rankings) 中可见的大模型 (LLM) 推理流量的 CO₂ 碳足迹**。该项目按模型、开源/闭源、提供商、模型来源国以及模型主要服务区域的电网情况进行详细拆解。

**▶ [访问在线仪表盘](https://wyl2607.github.io/llm-carbon-index/)** —— 按总 CO₂ 与能效双榜单、绿电情景滑块、基于市场法 vs 基于位置法的 Scope-2 切换，以及方法学与不确定性页面。支持三语（EN / 中文 / DE）。

## 范围声明（不可妥协的核心原则）

本项目估算的是 **OpenRouter 可见 LLM 推理流量** 的 CO₂ 足迹 —— 这仅仅代表了全球 AI 使用量的一个**部分且具有代表性的切片**。诸如 ChatGPT、Gemini 和 Claude 等主流 C 端应用**并未**包含在内。这**绝不是**对全球数据中心总排放量的测量。**所有的数字均为包含显式不确定性范围的估算值，而非实测数据** —— 尤其是对于闭源模型而言，其参数、硬件及数据中心位置均未公开披露。

## 📊 面向研究者与 ESG 专业人士

本项目生成的数据完全开源，专为集成到您自己的可持续发展报告、LCA（生命周期评估）工具或 CSRD/ESRS Scope 3（范围 3）披露中而设计。

- **下载数据**: 每日更新的 JSON 数据位于 [`data/output/latest.json`](https://raw.githubusercontent.com/wyl2607/llm-carbon-index/main/data/output/latest.json)。
- **ESG / CSRD 导出**: [`data/output/esg_export.json`](https://raw.githubusercontent.com/wyl2607/llm-carbon-index/main/data/output/esg_export.json) 将基于位置法与基于市场法的总量映射为 GHG Protocol 范围二双重报告 + ESRS-E1 行项，并嵌入范围/不确定性声明。网页 UI 也提供 JSON/CSV 下载。
- **方法学**: 查阅我们详尽的 [方法学与不确定性框架](docs/methodology.md)，其中详细说明了方程式、数据来源（如 EcoLogits、AI Energy Score、Electricity Maps）以及敏感性分析（如 PUE 偏差）。
- **贡献指南**: 参见 [CONTRIBUTING.md](CONTRIBUTING.md) 并在报告数据纠错或提供新的模型架构配置文件时，使用我们的 [Issue 模板](.github/ISSUE_TEMPLATE/)。

## 架构设计

坚持静态优先，无服务器负担（遵循 [`PLAN.md`](PLAN.md)）：

```
OpenRouter rankings ─▶ pipeline (Python) ─▶ data/output/*.json (由 CI 提交) ─▶ web/ (Vite + React, 静态页面)
                                  │
                      EcoLogits + AI Energy Score   (能耗)
                      Electricity Maps + 年度回退数据   (电网)
```

v1 版本不设实时后端。前端直接读取已提交的 JSON 数据；每日 GitHub Actions 定时任务（[`.github/workflows/pipeline.yml`](.github/workflows/pipeline.yml)）重跑流水线、冻结其输入快照、跑全部门禁，仅在可复现性校验（`make verify`）通过后才提交新 JSON。

## 状态

严格按阶段构建（[`PLAN.md`](PLAN.md)）；带提交哈希的权威阶段台账见 [`specs/INDEX.md`](specs/INDEX.md)，完整版本溯源见 [CHANGELOG_zh.md](CHANGELOG_zh.md)。当前方法学版本 **0.7.0**；`main` 全绿（ruff · 149 项 pytest · `make verify` 字节级复现 · 前端 `tsc`+build · 20 项 vitest）并已部署。

| 阶段 | 范围 | 状态 |
|---|---|---|
| 0–1 | 脚手架与数学公式验证 · OpenRouter 数据接入 | ✅ 完成 |
| 2 | 能耗估算（[`pipeline/energy.py`](pipeline/energy.py)） | ✅ 完成 |
| 3 | 碳排放、电网与绿色替代情景（[`pipeline/carbon.py`](pipeline/carbon.py), [`pipeline/grid.py`](pipeline/grid.py)） | ✅ 完成 |
| 4 | 输出聚合与前端展示（[`pipeline/output.py`](pipeline/output.py), [`web/`](web/)） | ✅ 完成 |
| 5 | 方法学文档、CI 与自动化部署 | ✅ 完成 |
| 6A–6E | 绿电情景 · 市场法 vs 位置法 · 历史趋势/Jevons · 水足迹 (WUE) · 覆盖率自动化 | ✅ 完成 |
| 6F–6I | 估算分级诚实度 · 溯源账本（“无来源数字”门禁）· 可复现性校验（`make verify`）· 公允性与边界 | ✅ 完成 |
| 6J–6K | 实测每 token 能耗 + 待机项（`energy_measured_fraction` 0 → 0.29）· OAT 敏感性分析 | ✅ 完成 |
| 6L–6R | 复古未来主义皮肤 · 排名 → 分层 · 物理 embodied 估算 · 文献交叉验证 · MoE 活跃参数能耗 · 动态 regime/批处理 · ESG/CSRD Scope-2 导出 | ✅ 完成 |
| 7 | 多语言 i18n（en/zh/de）与 UI 可读性增强 | ✅ 完成 |

## 仓库结构

模型数据**仅**存放于 `data/*.yaml`（硬性约束 #6）；流水线为纯 Python；前端为读取已提交 JSON 的静态 Vite + React 应用。

```
llm-carbon-index/
├── PLAN.md · CLAUDE.md · README.md · LICENSE · SECURITY.md · CONTRIBUTING.md · CHANGELOG.md
├── pyproject.toml · Makefile · .env.example      # 依赖、`make verify|test|lint`、仅环境变量「名」
├── data/                                         # 模型数据仅此处（硬性约束 #6）
│   ├── crosswalk/model_crosswalk.yaml            #   OpenRouter slug → 能耗来源 + 假设
│   ├── assumptions/                              #   闭源模型、embodied 硬件、厂商声明、regime 集合
│   ├── grid/annual_factors.yaml                  #   年度 gCO₂/kWh 回退（Ember/IEA，已引用）
│   ├── energy/intensity.yaml                     #   每 token 能耗强度（已引用）
│   ├── provenance/sources.yaml                   #   来源登记表 —— 每个数字都须在此可溯源（6G 门禁）
│   ├── validation/literature_anchors.yaml        #   用于交叉校验的外部 Wh/query 锚点
│   ├── raw/snapshots/<date>/                      #   冻结的每日输入，供可复现重放（6H）
│   └── output/                                    #   生成的 JSON，由 CI 提交
│       ├── latest.json · timeseries.json · sensitivity.json
│       ├── validation.json · esg_export.json · manifest.json
│       └── history/<date>.json
├── pipeline/                                     # ingest → energy → carbon → embodied/water → output
│   ├── ingest.py · openrouter.py · slugs.py · tokens.py
│   ├── energy.py · carbon.py · grid.py · embodied.py · water.py
│   ├── sensitivity.py · fairness.py · precision.py · ranges.py
│   ├── provenance.py · snapshot.py · manifest.py · verify.py   # 溯源 + 可复现性（6G/6H）
│   ├── validate_literature.py · output.py · run.py            # 交叉验证、聚合、每日入口
│   └── README.md                                              # 模块图
├── tests/                                        # 149 项测试 —— 完整 CO₂ 链 + 单位换算守卫
├── web/                                          # Vite + React 静态仪表盘（读取 data/output/*.json）
│   └── src/{components,lib,theme}                 # 6L 复古未来主义主题；三语 i18n (en/zh/de)
├── docs/                                         # methodology · DATA_SCHEMAS · ASSUMPTIONS · BOUNDARY · FAIRNESS（各 ×3 语言）
├── schemas/                                      # 输出 + ESG 导出的 JSON Schema
├── specs/                                        # 阶段规格 + INDEX.md（权威阶段台账）
└── .github/workflows/                            # ci · pipeline（每日 cron）· deploy · codeql · gitleaks
```

## 复现与验证

要利用确切的冻结输入数据（Phase 6H）复现某一日期的发布运行结果：

```bash
git clone https://github.com/wyl2607/llm-carbon-index.git
cd llm-carbon-index
uv sync
make verify 2026-06-14  # 预期输出：PASS
```

参阅 `docs/methodology.md` 第 11 节，了解快照布局、`manifest.json` 校验和、黄金文件对比以及依赖锁定契约。

## 数据归属与引用

- **排名数据**: `来源: OpenRouter (openrouter.ai/rankings), 截至 {date}`。
- **电网碳强度**: Ember/IEA 年度平均因子（逐行记录）。实时 Electricity Maps 支持已具备，但在发布的可复现黄金数据中**关闭**（`grid_live_fraction = 0.0`）；详见 `docs/methodology.md` 第 11a 节。
- **能耗数据**: EcoLogits + Hugging Face AI Energy Score。参见 [`docs/methodology.md`](docs/methodology.md)。
