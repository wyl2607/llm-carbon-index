# System Boundary (LCA)

This document defines the Life Cycle Assessment (LCA) system boundary for the LLM Carbon Index. As stated in the project scope (`CLAUDE.md`), this index estimates the footprint of **OpenRouter-visible LLM inference** only.

## System Boundary Diagram

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

## Included in Boundary (IN)

The following operational components are included in the primary estimation chain:

- **API Inference Compute Energy**: The electrical energy (Wh) consumed by hardware (GPUs/TPUs) during the prefill and decode phases of an LLM request.
- **Data-Center PUE Overhead**: The additional energy used by data center infrastructure (cooling, lighting, power distribution), modeled as a Power Usage Effectiveness (PUE) range [A4].
- **Operational Location-Based Grid Emissions**: The carbon intensity (gCO2e/kWh) of the local electricity grid where the inference is assumed to occur [A3], using live or annual factors.
- **Operational Water**: The water consumed both on-site (cooling evaporation) and off-site (electricity generation) associated with the inference energy [W-WATER].

## Excluded from Boundary (OUT)

To maintain focus on the marginal impact of inference, the following are excluded:

- **Model Training**: Excluded as it represents a one-time capital expenditure (CapEx) with distinct allocation rules from operational inference.
- **Embodied / Manufacturing Hardware Emissions**: Excluded from the core operational boundary; while reported as a lifecycle companion, the hardware's manufacturing footprint is not part of the electricity-to-inference conversion.
- **Network Transmission**: Excluded due to the extreme variability and lack of provider-side control over global internet routing energy.
- **End-User Devices**: Excluded as the energy consumed by a user's phone or laptop is negligible compared to server-side inference and varies by device.
- **Idle / Over-provisioning**: Excluded because the index models the marginal cost per token; facility-level baseline power is not allocated to specific inference requests.
- **ALL non-OpenRouter traffic**: Excluded to respect the project's strict scope of modeling only the representative slice of usage visible via OpenRouter rankings.

## Alignment with Project Scope

This boundary is rigorously aligned with the scope statement in `CLAUDE.md`: *"This project estimates the CO2 footprint of OpenRouter-visible LLM inference — a representative but partial slice of global AI usage."* By excluding upstream training and downstream networking, we provide a high-signal estimate of the specific environmental cost of AI text generation.
