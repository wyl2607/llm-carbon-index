[English](BOUNDARY.md) | [中文](BOUNDARY_zh.md) | [Deutsch](BOUNDARY_de.md)

# 系统边界 (LCA)

本文档定义了 LLM Carbon Index 的生命周期评估 (LCA) 系统边界。如项目范围 (`CLAUDE.md`) 所述，本指数仅估算 **OpenRouter 可见 LLM 推理** 的足迹。

## 系统边界图

```text
       UNIVERSE OF AI IMPACTS
+---------------------------------------+
|  [ OUT ] Model Training               |
|  [ OUT ] Hardware Manufacturing       |
|                                       |
|    +-----------------------------+    |
|    | [ IN ] SYSTEM BOUNDARY      |    |
|    |                             |    |
|    |  +-----------------------+  |    |
|    |  | API Inference Compute |  |    |
|    |  | (Energy Intensity)    |  |    |
|    |  +-----------+-----------+  |    |
|    |              |              |    |
|    |  +-----------v-----------+  |    |
|    |  | Data Center Overhead  |  |    |
|    |  | (PUE Factor [A4])     |  |    |
|    |  +-----------+-----------+  |    |
|    |              |              |    |
|    |  +-----------v-----------+  |    |
|    |  | Grid Intensity (CO2e) |  |    |
|    |  | & Operational Water   |  |    |
|    |  +-----------------------+  |    |
|    |                             |    |
|    +-----------------------------+    |
|                                       |
|  [ OUT ] Network Transmission         |
|  [ OUT ] End-User Devices             |
|  [ OUT ] Idle / Over-provisioning     |
|  [ OUT ] Non-OpenRouter Traffic       |
+---------------------------------------+
```

## 边界内包含 (IN)

以下运营组件包含在主要估算链中：

- **API 推理计算能耗**：LLM 请求的预填充和解码阶段期间硬件 (GPU/TPU) 消耗的电能 (Wh)。
- **数据中心 PUE 开销**：数据中心基础设施（冷却、照明、配电）使用的额外能源，建模为电能利用效率 (PUE) 范围 [A4]。
- **基于位置的运营电网排放**：假设发生推理的当地电网的碳强度 (gCO2e/kWh) [A3]，使用实时或年均因子。
- **运营水足迹**：与推理能耗相关的现场（冷却蒸发）和场外（发电）消耗的水 [W-WATER]。

## 边界外排除 (OUT)

为保持对推理边际影响的专注，以下内容被排除：

- **模型训练**：作为一次性资本支出 (CapEx) 被排除，具有与运营推理不同的分配规则。
- **嵌入式 / 硬件制造排放**：从核心运营边界排除；虽然作为生命周期伴随物报告，但硬件的制造足迹不属于从电力到推理的转换部分。
- **网络传输**：由于全球互联网路由能耗的极端变异性以及缺乏提供商侧控制而被排除。
- **终端用户设备**：作为排除项，因为用户手机或笔记本的能耗与服务器端推理相比可忽略，且因设备而异。
- **空闲 / 过度供应**：被排除，因为指数建模的是每 token 的边际成本；设施级基线功率不分配给特定推理请求。
- **所有非 OpenRouter 流量**：排除以尊重项目严格范围——仅建模通过 OpenRouter 排名可见的代表性使用切片。

## 与项目范围的对齐

此边界与 `CLAUDE.md` 中的范围声明严格对齐："This project estimates the CO2 footprint of OpenRouter-visible LLM inference — a representative but partial slice of global AI usage." 通过排除上游训练和下游网络，我们提供对 AI 文本生成特定环境成本的高信号估算。
