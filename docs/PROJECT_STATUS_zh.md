[English](PROJECT_STATUS.md) | [中文](PROJECT_STATUS_zh.md) | [Deutsch](PROJECT_STATUS_de.md)

# 项目状态与交接

_最后更新：2026-06-16。_

## 这是什么

LLM Carbon Index —— 估算 **OpenRouter 可见** LLM 推理的 CO₂ 足迹（带 `{low,mid,high}` 范围的**估算**，而**非**测量；部分切片，非全球排放）。静态管道 → 已提交 JSON → 静态前端。

- **仓库：** https://github.com/wyl2607/llm-carbon-index (公开)
- **在线站点：** https://wyl2607.github.io/llm-carbon-index/ (GitHub Pages)

## 一切所在位置（仓库自包含）

- `PLAN.md` —— 原始分阶段计划。`CLAUDE.md` —— 硬性规则。
- `specs/INDEX.md` + `specs/phase-*.md` —— 构建手册（曾是 specs 压缩包）。
- `docs/ENGINEERING_STANDARDS.md`、`docs/DATA_SCHEMAS.md`（规范工件形状）、`docs/ASSUMPTIONS.md`（每个数字 + 来源）、`docs/methodology.md`（论文级撰写）、`docs/absorbed-from-gemini.md`（合并来源）。
- `pipeline/` —— `config.py`/`types.py`（冻结的跨阶段契约）、`openrouter.py` + `storage.py` + `ingest.py`（P1）、`ranges/tokens/energy/grid/carbon/estimate.py`（P2）、`output.py` + `run.py`（P3）。`schemas/output.schema.json`。
- `data/` —— `crosswalk/`、`energy/`、`assumptions/`、`grid/`（种子 YAML）、`output/latest.json` + `history/{date}.json`（由 CI 提交）。`data/raw/` 是缓存（gitignored）。
- `web/` —— 读取 `data/output/latest.json` 的 Vite+React+TS 仪表盘。`scratch/prove_math.py` 是 Phase-0 证明器。

## 状态 —— MVP (0–5) + Phase 6A–6E 完成

| 阶段 | 状态 |
|---|---|
| 0 证明数学、1 接入、2 估算、3 输出+schema、4 前端、5 方法学+CI | ✅ 完成，提交哈希见 `specs/INDEX.md` |
| 6A 绿电情景、6B 市场 vs 位置、6C 趋势+Jevons、6D 水 (WUE) | ✅ 完成（已在高级仪表盘中交付；哈希见 `specs/INDEX.md`） |
| 6E 覆盖自动化（范围诚实度） | ✅ 完成 —— 后端 65463cf + 前端 414f06e；UI 注释在管道发出非零 unmapped 比例前休眠（当前所有热门模型均已映射） |

- 测试：`uv run pytest -q` → 51 个收集/绿色；`uv run ruff check .` 清洁。
- `python -m pipeline.run --date latest` 产生 schema 有效的 `latest.json`。
- CI：`ci.yml`（PR/push 上的测试/ruff）、`pipeline.yml`（每日 06:30 UTC cron + `workflow_dispatch`，使用仓库 secret `OPENROUTER_API_KEY`，若数据变化则提交）、`deploy.yml`（Pages；通过 `workflow_run` 链式接 pipeline）。
- 已验证在线站点显示**真实** OpenRouter 数据（50 个模型，modeled_traffic_fraction ≈ 0.94）。

## 已知问题 / 顶级后续任务

1. ~~**Crosswalk vs 真实 slug（最高价值）。** 真实 OpenRouter `model_permaslug` 值携带日期后缀（例如 `minimax/minimax-m3-20260531`），因此未命中 Phase-2 crosswalk 种子 → 当前每个真实模型均解析为 `UNKNOWN_MODEL` + `FALLBACK_ENERGY_CLASS` + 来源 `OTHER`（诚实，但无洞察）。修复：规范化 permaslug→基础 slug（剥离日期后缀）和/或使用当前热门模型（在 `ASSUMPTIONS.md` 中带来源）扩展 `data/crosswalk/model_crosswalk.yaml` + `data/energy/intensity.yaml`。~~ **(✅ 已修复)**
2. **实时电网数据。** 设置仓库 secret `ELECTRICITYMAPS_API_KEY` 以使用实时强度；无密钥时 `grid.py` 回退到年因子 (`FALLBACK_GRID_ANNUAL`)。
3. **🔑 轮换 OpenRouter 密钥。** 它在开发期间以明文共享；在 openrouter.ai 上轮换并重新设置 secret：`gh secret set OPENROUTER_API_KEY --repo wyl2607/llm-carbon-index`。
4. **Phase 6 —— 所有路线图项目 ✅ 完成。** 6A–6D（情景、市场 vs 位置、趋势/Jevons、水）+ **6E 覆盖自动化**（标记未映射的热门列表 slug、未映射流量 % + 维护待办、停止静默归桶未知；后端 65463cf、前端 414f06e、规范 `specs/phase-6e-coverage-automation.md`）。6E UI 注释在某个热门模型落在 `model_crosswalk.yaml` 之外前保持休眠（当前全部已映射 → unmapped 比例 = 0，正确）。
5. **松散末端 —— 未合并工作（在下次发布前决定）：**（App.tsx 论文与 ESG 部分移除现已在 main 上提交 —— e56d2a2，按照保留它的决定。）
   - `feat/scenario-math`（工作树 `../llm-carbon-index-6a`，提交 2281962）将绿移 CO₂ 数学提取为已测试的纯函数 —— **领先 main，未合并。**

## 多代理编排（有效之处 / 当前限制）

- **grok** 是在 Claude Code 内可靠的写入通道（`--cwd <wt> --always-approve --prompt-file`）；在并行工作树中运行 Phase 1/2/3/4。**agy 无法在 Claude Code 内无头写入**（其唯一的 auto-approve 标志被分类器阻挡）。**gemini/opencode** = 仅轻量只读 / 评审。
- **⚠️ 2026-06-16 更新：** 在当前 Claude Code 会话内，自动模式分类器现在**也阻挡** `grok --always-approve`（标记为自主代理循环 / “创建不安全代理”）。由于 agy + grok 自动写入均被阻挡且 gemini 免费层返回 429 “no capacity”，合规模式降级为**通道生成到 stdout（只读）→ Claude 评审、应用并运行 `uv run pytest -q` / `ruff` 验证。** 不要在 Claude Code 内重试 auto-approve 标志；通过 Claude 或交互批准的通道驱动写入。
  （gemini 在 `--approval-mode plan` 下仍被观察到就地编辑文件 —— 将其输出视为不可信并 diff 之。）
- 协调者必须在扇出前冻结跨阶段契约（`types.py`/`config.py`/`schemas/output.schema.json`/固定依赖/夹具），然后验证每个 diff/构建/测试并集成。
