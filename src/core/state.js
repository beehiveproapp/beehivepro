// ==========================================
// المتغيرات العامة (حالة التطبيق المشتركة)
// ==========================================
// ملاحظة: في وحدات ES لا يستطيع ملف أن يعدّل متغيراً مستورداً من ملف آخر،
// لذلك المتغيرات التي تتغير قيمتها موضوعة داخل الكائن state (مثال: state.sites).
export const managers = new Map();
export const analysisCharts = {};

export const state = {
    sites: [],
    activeSiteId: null,
    chartsInitialized: false,
    globalCharts: {},
    comparisonCharts: {},
    currentQuickFilter: 'all'
};
