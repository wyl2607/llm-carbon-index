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
    tagline: 'Transparent CO₂ estimation for OpenRouter LLM inference',
    taglineZh: 'OpenRouter 大模型推理的透明碳排放估算',
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

    // Scenario Lab
    scenarioTitle: 'Grid Substitution Simulator',
    scenarioSubtitle: 'What if inference workloads were shifted to the cleanest grids (≈50 gCO₂/kWh)? Explore spatial decarbonization potential.',
    scenarioSubtitleZh: '如果推理负载迁移至最清洁电网（约 50 gCO₂/kWh），碳排放将如何变化？探索空间脱碳潜力。',
    shiftLabel: 'Share of modeled traffic shifted to clean grid',
    presetReality: 'Reality (0%)',
    presetClean: 'Clean Shift (50%)',
    presetMax: 'Max Green (100%)',
    dailyAvoided: 'Daily Emissions Avoided',
    kgCO2: 'kg CO₂eq',
    carsEquivalent: (n: number) => `≈ ${n.toLocaleString()} cars off the road for one year`,
    impactNote: (pct: string) => `Spatial shift reduces modeled physical emissions by ~${pct}% while delivering identical compute.`,
    impactNoteMarket: (pct: string) => `Under market-based accounting this reduces the remaining physically-unmatched share by ~${pct}%.`,
    maxPotentialNote: (pct: string) => `Max modeled mitigation potential on current slice: ~${pct}%`,

    // Equivalences
    equivTitle: 'Real-world Equivalents (illustrative)',
    equivNote: 'Based on average factors (EPA, Our World in Data, USFS). For communication only — not verified offsets.',
    equivCars: 'passenger vehicles (1 yr)',
    equivFlights: 'transatlantic flights (economy)',
    equivTrees: 'mature trees (1 yr sequestration)',
    equivHomes: 'US homes (annual electricity)',

    // KPIs
    kpiTokens: 'Modeled Tokens',
    kpiTokensSub: 'Daily visible inference',
    kpiCo2: 'Est. CO₂eq (scenario)',
    kpiCo2Sub: 'Mid estimate with range',
    kpiAvoided: 'Avoided vs Baseline',
    kpiAvoidedSub: 'From current grid mix',
    kpiIntensity: 'Intensity (mid)',
    kpiIntensitySub: 'g CO₂eq per 1k output tokens',
    kpiWater: 'Est. Water Use',
    kpiWaterSub: 'Evaporative cooling (kL)',

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
    historyCo2: 'Daily Emissions (kg CO₂ mid)',
    historyEff: 'Ecosystem Efficiency (gCO₂ / M tokens)',
    jevonsTitle: 'The Jevons Paradox in AI',
    jevonsBody: 'As models become dramatically more efficient per token, total inference volume often grows faster — increasing aggregate emissions. Tracking both intensity and totals is essential for honest ESG accounting.',

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

    scenarioTitle: '电网替代情景模拟器',
    scenarioSubtitle: '如果将推理工作负载迁移至最清洁电网（约 50 gCO₂/kWh），排放会减少多少？探索空间脱碳潜力。',
    scenarioSubtitleZh: 'What if workloads moved to the cleanest regional grids? Explore spatial decarbonization potential.',
    shiftLabel: '迁移至清洁电网的建模流量比例',
    presetReality: '现状 (0%)',
    presetClean: '清洁迁移 (50%)',
    presetMax: '最大绿电 (100%)',
    dailyAvoided: '每日可避免排放',
    kgCO2: 'kg CO₂eq',
    carsEquivalent: (n: number) => `相当于约 ${n.toLocaleString()} 辆乘用车停驶一年`,
    impactNote: (pct: string) => `空间迁移可在保持相同算力的前提下，将建模物理排放降低约 ${pct}%。`,
    impactNoteMarket: (pct: string) => `在市场法核算下，此举可降低剩余未匹配物理排放约 ${pct}%。`,
    maxPotentialNote: (pct: string) => `当前数据切片最大建模减排潜力：约 ${pct}%`,

    equivTitle: '现实世界等效量（示意）',
    equivNote: '基于 EPA、Our World in Data、USFS 等平均因子。仅用于传播与理解，非经核实的碳抵消。',
    equivCars: '辆乘用车（年排放）',
    equivFlights: '次跨大西洋经济舱航班',
    equivTrees: '棵成熟树木（年固碳量）',
    equivHomes: '个美国家庭（年用电排放）',

    kpiTokens: '建模 Token 总量',
    kpiTokensSub: '当日可见推理量',
    kpiCo2: '估算 CO₂eq（情景后）',
    kpiCo2Sub: '中位数 + 不确定性范围',
    kpiAvoided: '相较基线减排',
    kpiAvoidedSub: '较当前电网结构',
    kpiIntensity: '排放强度（中位）',
    kpiIntensitySub: '每千输出 token 克 CO₂eq',
    kpiWater: '估算耗水量',
    kpiWaterSub: '蒸发冷却（千升）',

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
    historyCo2: '每日排放（kg CO₂ 中位）',
    historyEff: '系统效率（gCO₂ / 百万 token）',
    jevonsTitle: 'AI 中的杰文斯悖论',
    jevonsBody: '模型单 token 效率大幅提升的同时，推理总量增速常超过效率增益，导致总体排放上升。ESG 报告必须同时追踪强度与总量。',

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
  }
} as const;

export function useI18n(lang: Lang) {
  return translations[lang];
}

export function t(lang: Lang, key: keyof typeof translations.en, ...args: any[]): string {
  const dict = translations[lang];
  const val = (dict as any)[key];
  if (typeof val === 'function') return val(...args);
  return val ?? (translations.en as any)[key] ?? String(key);
}
