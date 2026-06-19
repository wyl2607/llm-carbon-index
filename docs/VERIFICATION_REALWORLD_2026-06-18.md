# 真实性核查报告：电网 vs 数据中心数据

> 日期：2026-06-18 · 范围：核查 v0.7.0「地区与电网」页背后数据是否反映真实世界，**仅核查、未改动任何 data/代码**。
> 触发问题：用户质疑「中国每个计算中心都不一样」，并追问「我们查的是不是不能只是电网数据，而是数据中心的真实数据」。

## 0. 一句话结论

电网强度是整条排放链里**唯一能外部独立核实**的一环，且基本属实；真正决定数字准不准的 **PUE、数据中心位置、每 token 能耗、流量** 四项，目前**大多没有公开的「真实数据中心数据」可查**——这不是项目偷懒，是行业不披露的客观现状。项目用「可测代理 + 明确标注假设 + 区间」处理是合理做法，但有 2 处具体错误/低估应修。

## 1. 排放链与「真实度」分层

```
运营 CO₂ = 每token能耗 × 流量(token) × PUE × 电网强度
```

| 因子 | 项目来源 | 真实度 | 说明 |
|---|---|---|---|
| 电网强度 | EPA eGRID / Ember / 生态环境部 | 🟢 真·公开权威数据 | 可独立核实，见 §2 |
| PUE | 一律拍 1.2(US)/1.25(Google)/1.3(CN) | 🔴 猜测 | 无一为该 DC 实测，见 §3 |
| DC 所在电网 | 中国全钉 `cn-north`、美国全钉 `us-east` | 🔴 假设 | 文件自标"并非确认位置"，见 §3 |
| 每 token 能耗 | 仅 8 个 seed 有 AI Energy Score 实测，其余按参数量分档 | 🟡 少量实测+大量外推 | 闭源模型(GPT/Claude/Gemini)参数为 `null`，纯 LCA 估 |
| 流量 | OpenRouter 排行榜 | 🟡 真实流量的一小片 | ChatGPT/Claude/Gemini 自家流量不在内 |

**核心判断：只核电网 = 必要但远不充分，且给的是虚假的安心。** 不确定性大头全在下面四行。

## 2. 电网层核查结果（可独立核实）

| 地区 | 项目值 | 权威实数 | 判定 |
|---|---|---|---|
| us-east | 380 g/kWh | EPA eGRID2022 全美 CO₂ output rate ≈ 373–386 g/kWh | ✅ 站得住 |
| europe-west | 230 g/kWh | Ember 西欧 2024（含法核/北欧水电）合理区间 230–250 | ✅ 合理 |
| cn-north | 537 g/kWh | 见下方两点 | ⚠️ 数值对、标注错、且错配区域 |

### 关于 537 的两个精确发现

1. **数值其实是对的，错的是 source 标注。**
   `annual_factors.yaml` 标 `source: "Ember 2023 China national annual"`，但 537 实为**生态环境部+国家统计局 2024-12-20 公告（2024年第33号）公布的 2022 年全国平均电力 CO₂ 因子 0.5366 kgCO₂/kWh = 537 g/kWh**。Ember 生产法口径其实是 ~581–582。两者差在方法学（官方 vs Ember）。
   → **应修 source 标签**为生态环境部官方因子，而非数值。

2. **`cn-north`=华北，却灌了全国平均，低估约 26%。**
   同一份官方公告里，**华北区域电网 = 0.6776 kgCO₂/kWh = 678 g/kWh**（全国最高，2021 年 0.7120 降下来的）。若 key 真指华北，应是 678 而非 537。

### 用户直觉「中国每个计算中心不一样」属实

- 官方分区域因子差异巨大：华北 678、化石电力口径甚至 833 g/kWh，而南方/华中明显更低。
- 真实中国 AI 推理并不都在华北：**DeepSeek 算力底座在内蒙古（蒙西电网）+ 海南陵水海底 DC（南方电网、海水冷却）**；Kimi/智谱在北京、MiniMax 在上海（华东）。一个 537 拍平整个中国，既错配华北、又无视分散。

## 3. 数据中心层核查（用户真正的问题）

### 哪些是纯假设（项目已诚实标注）
- **PUE**：`closed_models.yaml` 里 US 全 1.2、Google 1.25、CN 全 1.3，注释明写"conservative default""inferred""sparse public data"。
- **区域**：所有中国 provider（tencent/stepfun/moonshotai/z-ai/minimax/deepseek/qwen/xiaomi）一律 `assumed_region: cn-north`；所有美国一律 `us-east`。
- **闭源能耗**：GPT-4o/Claude/Gemini 的 `params_b: null` → 走参数分档 fallback / EcoLogits LCA，**真实能耗厂商从不公布**。

### 哪些「真实 DC 数据」确实存在、可替换猜测
| 现用假设 | 可替换的公开实数 | 来源 |
|---|---|---|
| Google PUE 1.25 | 车队 2024 **PUE 1.09** | Google 2024 环境报告 |
| （参考）Meta | 2023 **PUE 1.08** | Meta 2024 可持续报告 |
| OpenAI/Azure 1.2 | 微软 2024 全球均值 **1.16** | 微软披露 |
| DeepSeek `cn-north` | 内蒙古（蒙西）+ 海南海底 DC 真实位置 | SCMP / 亚洲商业展望 |
| 每查询能耗锚点 | Gemini **0.24 Wh**、BLOOM **3.96 Wh**、OpenAI **0.34 Wh** | 项目已作 LIT-* 交叉校验 |

### 哪些数据「公开世界里根本不存在」
- OpenAI/Anthropic 的单模型推理能耗、单 DC 的 PUE、哪个区服务哪个模型——**全不公开**。
- 中国厂商（DeepSeek/Kimi/智谱/MiniMax）披露更少。
→ 结论：「数据中心真实数据」对这些厂商**大部分不可得**。任何人能做的极限是「可测代理 + 标注假设 + 区间」，这正是本项目所做（其 scope statement 也明示"estimates with uncertainty ranges, not measurements"）。

## 4. 建议修正项（按确定性排序，待用户决定是否动手）

1. **零争议**：`cn-north` 的 source 标签改为「生态环境部 2022 全国因子 0.5366」；若 key 语义=华北，则数值改 678 并新增 `cn-national`=537 两个 key 分开。
2. **低风险**：按生态环境部官方区域因子把中国拆成 华北/华东/华中/南方/西北，AI provider 映射到真实服务区（DeepSeek→内蒙/海南、MiniMax→华东…）。
3. **中等**：Google PUE 1.25→1.09（或保留保守但在 UI 标注实测值），统一用厂商披露 PUE 替换拍脑袋默认。
4. **透明度**：UI 在每个强度旁标 ± 区间与"assumed location"角标，弱化单点 false precision。

## 5. 数据出处
- 生态环境部+国家统计局《关于发布2022年电力二氧化碳排放因子的公告》(2024年第33号)：全国 0.5366、华北 0.6776 kgCO₂/kWh
- EPA eGRID2022 summary tables
- Ember Global Electricity Review 2024（中国 ~581 g/kWh）
- Google 2024 环境报告（车队 PUE 1.09）、Meta 2024 可持续报告（PUE 1.08）、微软披露（PUE 1.16）
- SCMP / 亚洲商业展望：DeepSeek 内蒙古 + 海南海底 DC
- 项目内 LIT-* 锚点：Gemini 0.24 Wh、BLOOM 3.96 Wh、OpenAI 0.34 Wh
