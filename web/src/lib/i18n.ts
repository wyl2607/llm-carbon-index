/**
 * Lightweight bilingual (en / zh-CN) dictionary for LLM Carbon Index dashboard.
 * All major UI copy lives here for consistency and easy review.
 * Academic/professional tone suitable for thesis, German job applications, ESG reports.
 * Never claim exact measurements; always emphasize estimates + ranges.
 */

export type Lang = 'en' | 'zh';

export const translations = {
  en: {
    // Header / Brand
    brand: 'LLM Carbon Index',
    tagline: 'Estimated Lifecycle Inference Footprint for OpenRouter LLM traffic',
    taglineZh: 'OpenRouter 大模型推理全生命周期碳足迹估算',
    lastUpdated: 'Data as of',
    methodology: 'Methodology',
    github: 'GitHub',
    exportData: 'Export Data',
    share: 'Share View',

    // Language
    langEn: 'EN',
    langZh: '中文',

    // Accounting
    accounting: 'Accounting',
    locationBased: 'Location-based',
    marketBased: 'Market-based',
    locationHint: 'Physical grid emissions (region of inference)',
    marketHint: 'Adjusted for RE/REC matching',

    // Scope / Transparency (non-negotiable)
    scopeTitle: 'Scope & Transparency',
    scopeMain: 'Estimated CO₂ footprint of LLM-inference traffic visible through OpenRouter — a representative but partial slice of global AI usage. NOT global data-center emissions. All figures are estimates with explicit uncertainty ranges (low/mid/high), not measurements.',
    scopeBilingual: '本项目仅估算 OpenRouter 可见 LLM 推理流量（全球 AI 使用量的代表性切片），绝非全球数据中心总排放测量值。所有数据均为带不确定性范围（低/中/高）的估算，非实测值。',
    modeledFraction: (pct: string) => `We model ${pct}% of the day's visible OpenRouter tokens.`,
    sourceCitation: 'Source: OpenRouter (openrouter.ai/rankings)',
    // Phase 6E: unmapped traffic honesty (non-alarming factual note, matching modeled % messaging)
    unmappedCoverageNote: (pct: string, n: number) => `${pct}% of tracked traffic runs on ${n} models not yet in our crosswalk — shown as estimates, flagged for maintenance.`,
    unmappedTopModels: 'Top unmapped models (by token volume):',
    // Phase 6F: estimation-tier honesty (always-visible, non-dismissable precision badge)
    precisionTitle: 'Estimation precision',
    precisionHeadline: (energyPct: string, gridPct: string) => `Current data: ${energyPct}% measured energy · ${gridPct}% live grid.`,
    precisionDetail: (measuredEnergy: number, total: number, liveGrid: number) => `Energy is measured for ${measuredEnergy} of ${total} models; ${liveGrid} use live grid intensity. The rest are parameter-class energy + annual-average grid estimates. Fractions are token-weighted.`,
    precisionAllFallback: 'All published figures are parameter-class energy + annual-average grid estimates — no measured energy, no live grid yet.',
    tierMeasured: 'measured',
    tierClassFallback: 'class est.',
    tierGridLive: 'live grid',
    tierGridAnnual: 'annual grid',

    // Scenario Lab
    scenarioTitle: 'Grid Carbon Intensity Scenario Analysis',
    scenarioSubtitle: 'Scenario analysis: Shifting inference workloads to verified low-carbon grids (≈50 gCO₂e/kWh). Exploring spatial decarbonization potential.',
    scenarioSubtitleZh: '情景推演分析：将推理负载迁移至验证的低碳电网（约 50 gCO₂e/kWh），探索空间脱碳潜力。',
    shiftLabel: 'Share of modeled traffic shifted to clean grid',
    dailyAvoided: 'Daily Emissions Avoided',
    kgCO2: 'kg CO₂eq',
    carsEquivalent: (n: number) => `≈ ${n.toLocaleString()} cars off the road for one year`,
    impactNote: (pct: string) => `Spatial shift reduces modeled physical emissions by ~${pct}% while delivering identical compute.`,
    impactNoteMarket: (pct: string) => `Under market-based accounting this reduces the remaining physically-unmatched share by ~${pct}%.`,
    maxPotentialNote: (pct: string) => `Max modeled mitigation potential on current slice: ~${pct}%`,

    // Equivalences
    equivTitle: 'Real-world Equivalents (illustrative)',
    equivNote: 'Based on average factors (EPA, Our World in Data, USFS, UBA Germany, Electricity Maps). For communication & ESG storytelling only — not verified offsets.',
    equivCars: 'passenger vehicles (1 yr)',
    equivFlights: 'transatlantic flights (economy)',
    equivTrees: 'mature trees (1 yr sequestration)',
    equivHomes: 'US homes (annual electricity)',
    equivDeHomes: 'German households (annual electricity, ~1.8 t CO₂ avg)',
    equivEnergiewende: 'Reference: aligns with Germany Energiewende grid decarbonization trajectory',

    // New presets (DE/EU focused for thesis & EU jobs)
    presetReality: 'Reality (0%)',
    presetClean: 'Clean Shift (50%)',
    presetMax: 'Max Green (100%)',
    presetEuAvg: 'EU Grid Avg (~250 g)',
    presetFrNuclear: 'FR / Nordic (Nuclear-Hydro ~50-60 g)',
    presetDeToday: 'DE Grid Today (~380 g, improving)',
    presetCfe247: '100% 24/7 CFE (Google-style match)',
    presetFrankfurt: 'Frankfurt DC (Electricity Maps DE zone)',
    presetEnergiewende: 'DE Energiewende Path (improving grid)',

    // Thesis & ESG section
    thesisBadge: 'For Researchers & ESG Reporting',
    thesisTitle: 'For Thesis, CSRD/ESRS & German ESG Roles',
    thesisSubtitle: 'Ready-to-use materials for Master\'s theses, sustainability reports and job applications in green tech / consulting (E.ON, RWE, Siemens Energy, Deloitte, etc.).',
    thesisCopyCitation: 'Copy Citation',
    thesisMethodology: 'Methodology Summary (EN/DE ready)',
    thesisScopeNote: 'Scope 3 Category 1 / Purchased Services or Category 15 (if investment) — use the modeled_traffic_fraction to scale to your actual OpenRouter or similar API spend. Always disclose "estimates with uncertainty ranges, partial coverage of OpenRouter-visible inference only".',
    thesisDownload: 'Download current scenario (JSON + metadata)',
    climateScore: 'Climate Neutrality Score',
    climateScoreNote: 'Higher = closer to a clean-grid counterfactual (illustrative 0-100).',
    // Citation templates
    citeBibtex: (date: string, version: string) => `@techreport{wyl2026llmcarbon,\n  author = {Wyl},\n  title = {LLM Carbon Index: Transparent CO₂ Estimates for OpenRouter-visible LLM Inference},\n  institution = {Open Source},\n  year = {2026},\n  note = {Data date: ${date}; Methodology v${version}; https://wyl2607.github.io/llm-carbon-index/}\n}`,
    citeApa: (date: string) => `Wyl. (2026). LLM Carbon Index — OpenRouter-visible LLM inference CO₂ estimates with uncertainty ranges (data date ${date}). https://wyl2607.github.io/llm-carbon-index/`,
    csrdExample: 'For CSRD/ESRS: “Scope 3.1 Purchased services – estimated 2.1 tCO₂e (mid) from OpenRouter-visible LLM inference in the reporting period (range 1.4–5.1 tCO₂e; 42% of daily modeled traffic; methodology v0.1.0).”',
    euTaxonomy: 'EU Taxonomy DNSH: Spatial workload shifting to verified low-carbon grids (e.g. FR/NO via Electricity Maps) can support DNSH demonstration when combined with additionality evidence.',

    // Germany / EU hints
    deEuHint: 'Electricity Maps DE/FR live factors + annual fallbacks from Ember/IEA. EU Taxonomy DNSH alignment requires demonstrating no significant harm — spatial shifting to low-carbon zones (FR, NO, SE) is a documented lever.',

    // KPIs
    kpiTokens: 'Aggregate Inference Volume',
    kpiTokensSub: 'Billions of Tokens',
    kpiCo2: 'Total Estimated Emissions',
    kpiCo2Sub: 'tCO₂e (Mid estimate with range)',
    lcaTitle: 'Full lifecycle & water (methodology v0.2)',
    lcaOperational: 'Operational (headline)',
    lcaEmbodied: '+ Embodied (manufacturing)',
    lcaTotal: '= Full lifecycle',
    lcaWater: 'Water footprint',
    lcaNote: 'Headline CO₂ is operational, location-based. Full lifecycle adds amortised hardware-manufacturing carbon (~22–35% of total, C-EMBODIED). Water splits on-site cooling + off-site generation (Li et al.). All ranges are conservative endpoint bands.',
    kpiAvoided: 'Avoided vs Baseline',
    kpiAvoidedSub: 'From current grid mix',
    kpiIntensity: 'Weighted Carbon Intensity',
    kpiIntensitySub: 'gCO₂e per 10k tokens',
    kpiEnergy: 'Proxy Energy Consumption',
    kpiEnergySub: 'MWh (Includes PUE overhead)',

    // Visual Explorer
    vizTitle: 'Emissions by Model',
    vizBy: 'Color by',
    vizOpenClosed: 'Open vs Closed',
    vizOrigin: 'Model Origin',
    vizTopN: 'Top emitters shown',
    vizAllNote: 'Bars show mid estimate; whiskers = full low–high range. Click bars to focus table.',
    vizOriginBreakdown: 'CO₂ by Origin (mid)',
    vizEfficiency: 'Model Efficiency Highlights',

    // Table / Directory
    tableTitle: 'Emissions Directory',
    tableSubtitle: 'Sortable, filterable. All CO₂ and water values include full uncertainty ranges.',
    searchPlaceholder: 'Search models or flags...',
    filterOrigin: 'Origin',
    filterType: 'Type',
    all: 'All',
    exportCsv: 'Export CSV (current scenario)',
    tableNote: 'Values reflect the active grid-shift scenario when >0%. Ranges always shown. Click headers to sort.',
    colModel: 'Model',
    colCo2: 'CO₂ (kg, range)',
    colWater: 'Water (L, range)',
    colEff: 'CO₂ / 1k output tokens',
    colOrigin: 'Origin',
    colOpenClosed: 'Open/Closed',
    colEnergySrc: 'Energy source',
    colGridSrc: 'Grid source',
    colFlags: 'Flags',

    // History
    historyTitle: 'Historical Trends & Efficiency',
    historyCollecting: 'Collecting daily history…',
    historyCollectingSub: 'Trend charts appear once {min} days of data are recorded (currently {n}). New snapshots are added daily via GitHub Actions.',
    historyCo2: 'Daily Emissions (kg CO₂ mid)',
    historyEff: 'Ecosystem Efficiency (gCO₂ / M tokens)',
    jevonsTitle: 'The Jevons Paradox in LLM Inference',
    jevonsBody: 'While algorithmic and hardware optimizations structurally reduce carbon intensity per token, the subsequent exponential growth in total inference volume frequently outpaces these unit-level efficiency gains. Consequently, aggregate physical emissions expand. Robust ESG reporting (e.g., CSRD/ESRS) mandates the simultaneous tracking of both relative intensity (gCO₂e/token) and absolute environmental impact.',

    // Footer
    footerStatic: 'Static site • All numbers are estimates with ranges • Data refreshed daily via GitHub Actions',
    cite: 'Cite this dataset',
    citeCopied: 'Citation copied to clipboard',
    rawJson: 'Raw latest.json',
    methodologyFull: 'Full Methodology (thesis-grade)',

    // Misc
    sampleWarning: 'SAMPLE / PLACEHOLDER DATA — for pipeline verification only. Real OpenRouter data will replace this.',
    loading: 'Loading latest estimates…',
    noData: 'No data available.',
    details: 'Details',
    close: 'Close',
    assumptions: 'Assumptions & Sources',

    methodologyVersion: 'Methodology v',
    heroTitle: 'LLM Carbon Index',
    heroSubtitle: 'Transparent CO₂ estimation for the AI era.',
    heroDesc: 'Tracking the environmental footprint of OpenRouter LLM inference with end-to-end uncertainty ranges.',
    heroDescSub: '追踪 OpenRouter 大模型推理的碳足迹，提供端到端的不确定性估算范围。',
    btnDocs: 'Methodology & Docs',
    btnShare: 'Share Scenario',
    errLoad: 'Error loading data:',
    errEnsure: 'Ensure copy-data ran and public/data/latest.json exists.',
    topEmitters: 'Top emitters + others',
    scenarioActive: 'SCENARIO VALUES ACTIVE',
    baselineActive: 'BASELINE VALUES',
    footerCopyright: 'Estimates only. Not global measurement. (c) 2026 Wyl.',
    sensitivityLabel: 'Sensitivity:',
  },
  zh: {
    brand: 'LLM Carbon Index',
    tagline: 'OpenRouter 大模型推理的透明碳排放估算',
    taglineZh: 'Transparent CO₂ estimation for OpenRouter LLM inference',
    lastUpdated: '数据日期',
    methodology: '方法学',
    github: 'GitHub',
    exportData: '导出数据',
    share: '分享视图',

    langEn: 'EN',
    langZh: '中文',

    accounting: '核算方法',
    locationBased: '基于位置',
    marketBased: '基于市场',
    locationHint: '按实际服务区域电网排放（物理量）',
    marketHint: '考虑可再生能源证书（REC/PPA）匹配',

    scopeTitle: '范围与透明度声明',
    scopeMain: '本项目估算 OpenRouter 可见 LLM 推理流量的 CO₂ 足迹 —— 仅为全球 AI 使用量的代表性部分切片，绝非全球数据中心总排放测量值。所有数字均为带完整不确定性范围（低/中/高）的估算值，而非实测数据。',
    scopeBilingual: 'Estimated footprint of OpenRouter-visible LLM inference — representative but partial slice. NOT global data-center emissions. All figures are estimates with ranges (low/mid/high), never exact measurements.',
    modeledFraction: (pct: string) => `本日已建模 OpenRouter 可见 token 比例：${pct}%`,
    sourceCitation: '数据来源：OpenRouter (openrouter.ai/rankings)',
    // Phase 6E: unmapped traffic honesty (non-alarming factual note, matching modeled % messaging)
    unmappedCoverageNote: (pct: string, n: number) => `追踪流量中约 ${pct}% 来自尚未纳入 crosswalk 的 ${n} 个模型 —— 以估算值呈现，并标记待维护。`,
    unmappedTopModels: '按 token 量排序的未映射模型（前几位）：',
    // Phase 6F: 估算精度诚实披露（常驻、不可关闭的精度标识）
    precisionTitle: '估算精度',
    precisionHeadline: (energyPct: string, gridPct: string) => `当前数据：${energyPct}% 实测能耗 · ${gridPct}% 实时电网。`,
    precisionDetail: (measuredEnergy: number, total: number, liveGrid: number) => `${total} 个模型中有 ${measuredEnergy} 个采用实测能耗，${liveGrid} 个采用实时电网强度；其余均为参数级能耗 + 年均电网估算。各比例按 token 加权。`,
    precisionAllFallback: '当前所有公布数值均为参数级能耗 + 年均电网估算 —— 尚无实测能耗、尚无实时电网。',
    tierMeasured: '实测',
    tierClassFallback: '参数级估算',
    tierGridLive: '实时电网',
    tierGridAnnual: '年均电网',

    scenarioTitle: '电网替代情景模拟器',
    scenarioSubtitle: '如果将推理工作负载迁移至最清洁电网（约 50 gCO₂/kWh），排放会减少多少？探索空间脱碳潜力。',
    scenarioSubtitleZh: 'What if workloads moved to the cleanest regional grids? Explore spatial decarbonization potential.',
    shiftLabel: '迁移至清洁电网的建模流量比例',
    dailyAvoided: '每日可避免排放',
    kgCO2: 'kg CO₂eq',
    carsEquivalent: (n: number) => `相当于约 ${n.toLocaleString()} 辆乘用车停驶一年`,
    impactNote: (pct: string) => `空间迁移可在保持相同算力的前提下， 将建模物理排放降低约 ${pct}%。`,
    impactNoteMarket: (pct: string) => `在市场法核算下，此举可降低剩 余未匹配物理排放约 ${pct}%。`,
    maxPotentialNote: (pct: string) => `当前数据切片最大建模减排潜力 ：约 ${pct}%`,

    equivTitle: '现实世界等效量（示意）',
    equivNote: '基于 EPA、Our World in Data、USFS、UBA Germany、Electricity Maps 等平均因子。仅用于传播、论文与 ESG 叙事，非经核实的碳抵消。',
    equivCars: '辆乘用车（年排放）',
    equivFlights: '次跨大西洋经济舱航班',
    equivTrees: '棵成熟树木（年固碳量）',
    equivHomes: '个美国家庭（年用电排放）',
    equivDeHomes: '个德国家庭（年用电排放，约 1.8 t CO₂ 平均）',
    equivEnergiewende: '参考：符合德国 Energiewende 电网脱碳轨迹',

    // New presets (DE/EU focused)
    presetReality: '现状 (0%)',
    presetClean: '清洁迁移 (50%)',
    presetMax: '最大绿电 (100%)',
    presetEuAvg: '欧盟电网平均 (~250 g)',
    presetFrNuclear: '法国/北欧（核电-水电 ~50-60 g）',
    presetDeToday: '德国当前电网 (~380 g，持续改善中)',
    presetCfe247: '100% 24/7 CFE（Google 式匹配）',
    presetFrankfurt: '法兰克福数据中心（Electricity Maps DE 区域）',
    presetEnergiewende: '德国 Energiewende 路径（电网持续改善）',


    // Thesis & ESG section
    thesisBadge: '面向研究者与 ESG 披露',
    thesisTitle: '适用于论文、CSRD/ESRS 与德国 ESG 职位',
    thesisSubtitle: '为硕士论文、可持续报告和绿色科技/咨询求职（E.ON、RWE、Siemens Energy、Deloitte 等）准备的即用材料。',
    thesisCopyCitation: '一键复制引用',
    thesisMethodology: '方法学摘要（中英就绪）',
    thesisScopeNote: 'Scope 3 Category 1 / Purchased Services 或 Category 15（若为投资）—— 使用 modeled_traffic_fraction 将结果按比例缩放到你的实际 OpenRouter 或类似 API 消耗。始终披露“估算值，带不确定性范围，仅覆盖 OpenRouter 可见推理的代表性部分”。',
    thesisDownload: '下载当前情景（JSON + 元数据）',
    climateScore: '气候中和得分',
    climateScoreNote: '越高越接近清洁电网情景（示意性 0-100）。',
    // Citation templates (zh)
    citeBibtex: (date: string, version: string) => `@techreport{wyl2026llmcarbon,\n  author = {Wyl},\n  title = {LLM Carbon Index: Transparent CO₂ Estimates for OpenRouter-visible LLM Inference},\n  institution = {Open Source},\n  year = {2026},\n  note = {数据日期: ${date}; Methodology v${version}; https://wyl2607.github.io/llm-carbon-index/}\n}`,
    citeApa: (date: string) => `Wyl. (2026). LLM Carbon Index — OpenRouter 可见 LLM 推理碳排放透明估算（数据日期 ${date}，含不确定性范围）。https://wyl2607.github.io/llm-carbon-index/`,
    csrdExample: 'CSRD/ESRS 示例： “Scope 3.1 采购服务——报告期内来自 OpenRouter 可见 LLM 推理的估算排放 2.1 tCO₂e（中位），范围 1.4–5.1 tCO₂e；占当日已建模流量的 42%；方法学 v0.1.0。”',
    euTaxonomy: 'EU Taxonomy DNSH：将工作负载空间迁移至经 Electricity Maps 验证的低碳电网（如 FR/NO），结合额外性证据可支持 DNSH 论证。',

    // Germany / EU hints
    deEuHint: 'Electricity Maps DE/FR 实时因子 + Ember/IEA 年均回退。EU Taxonomy DNSH 对齐要求证明“无重大危害”——将负载空间迁移至低碳区域（FR、NO、SE）是已记录的杠杆。',

    kpiTokens: '总计推理量',
    kpiTokensSub: '十亿 Tokens',
    kpiCo2: '总计估算碳排放',
    lcaTitle: '全生命周期与水足迹（方法学 v0.2）',
    lcaOperational: '运营碳（头条）',
    lcaEmbodied: '+ 嵌入式（制造）',
    lcaTotal: '= 全生命周期',
    lcaWater: '水足迹',
    lcaNote: '头条 CO₂ 为运营、基于地点口径。全生命周期额外计入摊销的硬件制造碳（约占总量 22–35%，C-EMBODIED）。水足迹拆分为 on-site 冷却 + off-site 发电（Li et al.）。所有范围均为保守端点带。',
    kpiCo2Sub: 'tCO₂e (中位数 + 范围)',
    kpiAvoided: '相较基线减排',
    kpiAvoidedSub: '较当前电网结构',
    kpiIntensity: '加权碳排放强度',
    kpiIntensitySub: 'gCO₂e 每万次 tokens',
    kpiEnergy: '预估能耗',
    kpiEnergySub: 'MWh (包含 PUE 损耗)',

    vizTitle: '各模型排放量',
    vizBy: '颜色分组',
    vizOpenClosed: '开源 vs 闭源',
    vizOrigin: '模型来源地',
    vizTopN: '显示排放最高模型',
    vizAllNote: '柱高 = 中位估算值；误差线 = 完整低-高范围。点击柱可筛选表格。',
    vizOriginBreakdown: '按来源地 CO₂ 占比（中位）',
    vizEfficiency: '模型效率亮点',

    tableTitle: '排放目录',
    tableSubtitle: '可排序、可过滤。所有 CO₂ 与水资源数值均包含完整不确定性范围。',
    searchPlaceholder: '搜索模型或标志...',
    filterOrigin: '来源地',
    filterType: '类型',
    all: '全部',
    exportCsv: '导出 CSV（当前情景）',
    tableNote: '当情景滑块 >0% 时数值反映电网迁移情景。范围始终显示。表头可点击排序。',
    colModel: '模型',
    colCo2: 'CO₂（kg，范围）',
    colWater: '耗水（L，范围）',
    colEff: 'CO₂ / 千输出 token',
    colOrigin: '来源',
    colOpenClosed: '开源/闭源',
    colEnergySrc: '能耗来源',
    colGridSrc: '电网数据源',
    colFlags: '标志',

    historyTitle: '历史趋势与效率演进',
    historyCollecting: '正在采集每日历史数据…',
    historyCollectingSub: '累计满 {min} 天数据后显示趋势图（当前 {n} 天）。每日通过 GitHub Actions 追加新快照。',
    historyCo2: '每日排放（kg CO₂ 中位）',
    historyEff: '系统效率（gCO₂ / 百万 token）',
    jevonsTitle: '大语言模型推理中的杰文斯悖论 (Jevons Paradox)',
    jevonsBody: '尽管算法创新与硬件优化结构性地降低了单 token 的碳排放强度，但由此诱发的推理总量指数级增长通常会抵消单位效率的提升。因此，整体物理绝对排放量呈扩张趋势。严谨的 ESG 披露体系（如 CSRD/ESRS）要求必须同时审计相对效率指标（gCO₂e/token）与绝对环境影响总量。',

    footerStatic: '静态站点 • 所有数字均为带范围的估算值 • 数据每日通过 GitHub Actions 更新',
    cite: '引用此数据集',
    citeCopied: '引用文本已复制',
    rawJson: '原始 latest.json',
    methodologyFull: '完整方法学文档（可用于论文）',

    sampleWarning: '当前为 SAMPLE / 占位数据，仅用于管道验证。真实 OpenRouter 数据上线后将自动替换。',
    loading: '正在加载最新估算结果…',
    noData: '暂无数据。',
    details: '详情',
    close: '关闭',
    assumptions: '假设与数据来源',

    methodologyVersion: '方法学 v',
    heroTitle: 'LLM Carbon Index',
    heroSubtitle: 'AI 时代的透明 CO₂ 估算。',
    heroDesc: '追踪 OpenRouter 大模型推理的碳足迹，提供端到端的不确定性估算范围。',
    heroDescSub: 'Tracking the environmental footprint of OpenRouter LLM inference with end-to-end uncertainty ranges.',
    btnDocs: '方法学与文档',
    btnShare: '分享情景视图',
    errLoad: '数据加载失败：',
    errEnsure: '请确保 copy-data 脚本已运行，且 public/data/latest.json 存在。',
    topEmitters: '前排排放模型及其他',
    scenarioActive: '情景数值生效中',
    baselineActive: '基线数值',
    footerCopyright: '仅为估算值，非全球测量数据。(c) 2026 Wyl.',
    sensitivityLabel: '敏感度:',
  }
} as const;


export function useI18n(lang: Lang) {
  return translations[lang];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function t(lang: Lang, key: keyof typeof translations.en, ...args: any[]): string {
  const dict = translations[lang];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const val = (dict as any)[key];
  if (typeof val === 'function') return val(...args);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return val ?? (translations.en as any)[key] ?? String(key);
}
