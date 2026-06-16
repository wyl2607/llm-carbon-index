[English](ENGINEERING_STANDARDS.md) | [中文](ENGINEERING_STANDARDS_zh.md) | [Deutsch](ENGINEERING_STANDARDS_de.md)

# docs/ENGINEERING_STANDARDS.md

扩展 `CLAUDE.md`。当本文件与阶段规范冲突时，**更严格**的规则优先。这些标准适用于每个阶段。

## 1. 代码结构

- Python 3.11+，`ruff` 清洁，完全类型标注。估算数学位于**小型纯函数**中（输入 → 输出，无 I/O，无全局变量），因此可平凡地进行测试。
- I/O（网络、文件、环境）隔离在自己的模块中（`openrouter.py`、`grid.py`、`storage.py`），并**注入**到纯逻辑中，绝不从计算内部直接访问。
- 模型事实绝不放入 `.py` 文件。模型身份、参数、区域和能耗强度仅存在于 `data/**/*.yaml` 中（强制：对 `pipeline/*.py` 进行 grep 搜索任何模型 slug 必须返回空）。

## 2. 不确定性表示（不可妥协）

- 每个能量/CO₂ 量均为 **Range**：`{low, mid, high}` 且 `low ≤ mid ≤ high`。定义一个 `Range` 类型（`pipeline/ranges.py`）并在各处复用。
- **传播规则（MVP）：** Range 乘以正标量时对每个端点缩放；Range 乘以另一个正 Range 时端点逐一相乘（`low×low`、`mid×mid`、`high×high`）。这是故意简单的**保守区间，而非统计置信区间** —— 在 `methodology.md` 中准确说明这一点。不要发明您无法辩护的概率区间。
- UI 和 JSON 始终携带完整范围。裸点数是一个 bug。

## 3. 错误处理与回退

- 每个外部调用（OpenRouter、Electricity Maps）均被包装；失败时抛出**带类型的**错误。
- 回退是**显式且带标签的**：当实时电网数据不可用时，回退到年因子表并相应设置 `grid_source`。Phase 0 用于 `ILLUSTRATIVE_SAMPLE` 的相同模式。
- **绝不静默用样本/说明性/回退数据替代真实数据。** 消费者必须始终能够从行的来源标签或标志判断每个数字的来源。

## 4. 密钥

- 密钥仅来自环境（`OPENROUTER_API_KEY`、`ELECTRICITYMAPS_API_KEY`）。`.env` 被 gitignore；CI 使用 GitHub Actions secrets。
- 代码、夹具、日志或已提交 JSON 中无密钥。每次提交前：`git diff --cached --name-only` 必须不包含 `.env`。

## 5. 测试标准

每个阶段均附带测试。各类别最低标准：

- **转换守卫：** 对已知输入断言 Wh↔kWh、g↔kg、per-token↔per-1000-queries。
- **Range 不变量：** `low ≤ mid ≤ high` 在每次操作中保持；乘以 0 → 全部为零；在正缩放下单调。
- **回退路径：** 强制电网客户端抛出 / 返回未知区域 → 断言使用年回退并带标签。
- **未知模型：** crosswalk 中缺失的 slug → 断言被标记且使用参数类别回退（而非崩溃）。
- **测试中无网络：** 所有外部调用均被模拟或从 `tests/fixtures/` 提供。测试必须离线通过。
- **Schema 验证**（自 Phase 3 起）：有效输出通过；故意损坏的记录失败。
- **Golden file**（自 Phase 3 起）：夹具输入日产生稳定的 `latest.json`（排除易变的 `generated_at`）。

## 6. 归属

源自 OpenRouter 数据的任何工件均携带：`Source: OpenRouter (openrouter.ai/rankings), as of {data_date}`。前端显示之；JSON 在 `source_citation` 中存储。

## 7. 提交

- 约定式提交：`feat:`、`fix:`、`test:`、`docs:`、`chore:`。引用阶段，例如 `feat(pipeline): phase 2 energy + CO2 estimation with ranges`。
- 实际可行时一个阶段一个提交。**仅当用户明确要求时才推送** —— 默认是本地提交。

## 8. 完成定义（每个阶段结束时运行此清单）

- [ ] 阶段规范中的所有验收标准均已满足。
- [ ] 为本阶段添加/更新测试；`pytest` 完全绿色。
- [ ] `ruff` 清洁；一切均有类型标注。
- [ ] 无密钥暂存（已检查 `git diff --cached`）；代码/日志/JSON 中无密钥。
- [ ] 任何新数字（常数、系数、比率、区域因子）均在 `docs/ASSUMPTIONS.md` 中记录，附带来源和不确定性说明。
- [ ] 工件形状匹配 `docs/DATA_SCHEMAS.md`（或在同一提交中更新了 schema 文档）。
- [ ] 模型事实未硬编码在 `.py` 中（grep 清洁）。
- [ ] 范围声明未被违反；每个发出的数字携带范围或显式来源/标志。
- [ ] `specs/INDEX.md` 状态行以提交哈希更新为 ✅。
- [ ] 已本地提交。（除非被要求，否则不推送。）
