# 更新日志 (Changelog)

[English](CHANGELOG.md) | [中文](CHANGELOG_zh.md) | [Deutsch](CHANGELOG_de.md)


本项目的所有显著变更均记录于此文件。格式参考 [Keep a Changelog](https://keepachangelog.com/)。

## [0.6.1] - 2026-06-16 (阶段 7)
### 新增
- 网页端仪表盘的完整中文（zh）本地化支持。
- UI 可读性增强（次要文本颜色的对比度从 `#717771` 提高至 `#9ba19b`）。
- 将未来的德语（de）本地化支持计划记录于 `PLANS.md` 中。

## [0.6.0] - 2026-06-16 (阶段 6A-6L)
### 新增
- **不确定性与敏感性分析框架**：正式确立了包含低/中/高范围的方法学，并追踪主要的不确定性驱动因素（例如 `PUE_UNCERTAINTY`）。
- **可复现性**：包含 `manifest.json` 校验和的每日快照，以及 `make verify` 黄金文件对比能力。
- **公允性与边界文档**：明确界定了仅覆盖 OpenRouter 可见流量的范围，避免对全球数据中心排放的误导性陈述。
- **UI 主题**：实现了 "Premium Dark ESG" 美学设计（现代风格、毛玻璃效果、翡翠绿高亮）。
- 网页 UI 动态拉取并显示 `methodology_version`（方法学版本）。

## [0.5.0] - 2026-06-15 (阶段 5)
### 新增
- 论文级别的 `docs/methodology.md`，详细说明了公式、常量及数据来源。
- GitHub Actions CI，用于每日数据抓取并自动部署至 GitHub Pages。

## [0.4.0] - 2026-06-15 (阶段 4)
### 新增
- 基于 Vite + React 的静态前端仪表盘。
- `build_outputs.py`，用于将管道输出聚合为 `latest.json` 和 `timeseries.json`。

## [0.3.0] - 2026-06-15 (阶段 3)
### 新增
- 电网碳强度集成（Electricity Maps 实时数据及年度回退数据）。
- “假设情景”模拟器（What-If Simulator），用于空间工作负载迁移分析。

## [0.2.0] - 2026-06-15 (阶段 2)
### 新增
- 能量估算逻辑 (`estimate_energy.py`)，带有基于模型参数量级的降级回退机制。

## [0.1.0] - 2026-06-15 (阶段 1)
### 新增
- 数据接入管道 (`fetch_openrouter.py`)，对接 OpenRouter 排名数据。

## [0.0.1] - 2026-06-15 (阶段 0)
### 新增
- 项目骨架、`PLAN.md`、`CLAUDE.md` 及初始结构约束。
