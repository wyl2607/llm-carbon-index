# LLM Carbon Index (大模型碳足迹指数)

[English](README.md) | [中文](README_zh.md) | [Deutsch](README_de.md)

[![Live Demo](https://img.shields.io/badge/Live_Demo-wyl2607.github.io%2Fllm--carbon--index-16a34a?style=for-the-badge)](https://wyl2607.github.io/llm-carbon-index/)
[![GitHub Actions Pipeline](https://img.shields.io/github/actions/workflow/status/wyl2607/llm-carbon-index/pipeline.yml?style=for-the-badge&label=Pipeline)](https://github.com/wyl2607/llm-carbon-index/actions)

这是一个公开透明的仪表盘项目，旨在**估算 [OpenRouter 公开排名](https://openrouter.ai/rankings) 中可见的大模型 (LLM) 推理流量的 CO₂ 碳足迹**。该项目按模型、开源/闭源、提供商、模型来源国以及模型主要服务区域的电网情况进行详细拆解。

## 范围声明（不可妥协的核心原则）

本项目估算的是 **OpenRouter 可见 LLM 推理流量** 的 CO₂ 足迹 —— 这仅仅代表了全球 AI 使用量的一个**部分且具有代表性的切片**。诸如 ChatGPT、Gemini 和 Claude 等主流 C 端应用**并未**包含在内。这**绝不是**对全球数据中心总排放量的测量。**所有的数字均为包含显式不确定性范围的估算值，而非实测数据** —— 尤其是对于闭源模型而言，其参数、硬件及数据中心位置均未公开披露。

## 📊 面向研究者与 ESG 专业人士

本项目生成的数据完全开源，专为集成到您自己的可持续发展报告、LCA（生命周期评估）工具或 CSRD/ESRS Scope 3（范围 3）披露中而设计。

- **下载数据**: 每日更新的 JSON 数据位于 [`data/output/latest.json`](https://raw.githubusercontent.com/wyl2607/llm-carbon-index/main/data/output/latest.json)。
- **ESG / CSRD 导出**: [`data/output/esg_export.json`](https://raw.githubusercontent.com/wyl2607/llm-carbon-index/main/data/output/esg_export.json) 将基于位置法与基于市场法的总量映射为 GHG Protocol 范围二双重报告 + ESRS-E1 行项，并嵌入范围/不确定性声明。网页 UI 也提供 JSON/CSV 下载。
- **方法学**: 查阅我们详尽的 [方法学与不确定性框架](docs/methodology.md)，其中详细说明了方程式、数据来源（如 EcoLogits、AI Energy Score、Electricity Maps）以及敏感性分析（如 PUE 偏差）。
- **贡献指南**: 参见 [CONTRIBUTING.md](CONTRIBUTING.md) 并在报告数据纠错或提供新的模型架构配置文件时，使用我们的 [Issue 模板](.github/ISSUE_TEMPLATE/)。

## 架构设计

坚持静态优先，无服务器负担（遵循 `PLAN.md`）：

```
OpenRouter rankings ─▶ pipeline (Python) ─▶ output/*.json (由 CI 提交) ─▶ web/ (Vite+React, 静态页面)
                                  │
                      EcoLogits + AI Energy Score (能耗)
                      Electricity Maps + 年度回退数据 (电网)
```

v1 版本不设实时后端。前端直接读取已提交的 JSON 数据；数据更新依赖 GitHub Actions 定时任务驱动。

## 状态与版本溯源

请参阅 [CHANGELOG_zh.md](CHANGELOG_zh.md) 以获取完整的按版本号溯源的更新和提交日志。

| 阶段 | 范围 | 状态 |
|---|---|---|
| 0 | 脚手架与数学公式验证 | ✅ 完成 |
| 1 | 数据接入 (`fetch_openrouter.py`) | ✅ 完成 |
| 2 | 能耗估算 (`estimate_energy.py`) | ✅ 完成 |
| 3 | 碳排放、电网与绿色替代情景 (`estimate_carbon.py`) | ✅ 完成 |
| 4 | 输出聚合与前端展示 (`build_outputs.py`, `web/`) | ✅ 完成 |
| 5 | 方法学文档、CI 与自动化部署 | ✅ 完成 |
| 6 | 高级特性（溯源、复现性、公允性、敏感度、UI 主题等）| ✅ 完成 |
| 7 | 多语言 i18n 与 UI 可读性增强 | ✅ 完成 |

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
- **电网碳强度**: Electricity Maps (实时数据) + Ember/IEA 年度回退数据。
- **能耗数据**: EcoLogits + Hugging Face AI Energy Score。参见 [`docs/methodology.md`](docs/methodology.md)。
