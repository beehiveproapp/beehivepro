// ==========================================
// منطق التحليلات (Analysis Logic)
// ==========================================

import { analysisCharts, state } from '../core/state.js';
import { beehiveManager, getElement } from '../core/utils.js';
import { generateHiveRecommendations } from '../features/recommendations.js';

export async function populateHiveSelector() {
    const selector = getElement("hive-analysis-selector");
    selector.innerHTML = '<option value="">-- اختر خلية --</option>';
    const hiveIds = await beehiveManager.getActive().getUniqueHiveIds();
    hiveIds.forEach(id => {
        selector.innerHTML += `<option value="${id}">خلية رقم ${id}</option>`;
    });
}

export async function updateAnalysisCharts() {
    const selectedHiveId = getElement("hive-analysis-selector").value;
    const manager = beehiveManager.getActive();

    if (!selectedHiveId || !state.chartsInitialized) {
        Object.values(analysisCharts).forEach(chart => {
            chart.data.labels = [];
            chart.data.datasets.forEach(d => d.data = []);
            chart.update();
        });
        getElement("recommendations-list").innerHTML = '<p style="text-align: center; color: var(--text-color);">اختر خلية من القائمة لبدء التحليل.</p>';
        return;
    }

    const history = await manager.loadHistoryForHive(selectedHiveId);
    const dates = history.map(r => (new Date(r.date)).toLocaleDateString("ar-EG"));
    const frames = history.map(r => r.frames);
    const health = history.map(r => manager.calculateHealthScore(r));

    // تقليل كثافة التواريخ إذا كانت كثيرة
    let displayDates = dates;
    if (window.innerWidth < 768 && dates.length > 6) {
        displayDates = dates.filter((_, i) => i % Math.ceil(dates.length / 6) === 0);
    }

    analysisCharts.frames.data.labels = displayDates;
    analysisCharts.frames.data.datasets[0].data = frames;
    analysisCharts.frames.update();

    analysisCharts.health.data.labels = displayDates;
    analysisCharts.health.data.datasets[0].data = health;
    analysisCharts.health.update();

    const queenAgeData = history.map(r => {
        if (r.queenYear) {
            return {
                x: (new Date(r.date)).getFullYear() - parseInt(r.queenYear),
                y: r.frames
            };
        }
    }).filter(Boolean);
    
    analysisCharts.queenAge.data.datasets[0].data = queenAgeData;
    analysisCharts.queenAge.options.scales.x.title = { display: true, text: "عمر الملكة (سنوات)" };
    analysisCharts.queenAge.options.scales.y.title = { display: true, text: "عدد الإطارات" };
    analysisCharts.queenAge.update();

    generateHiveRecommendations(manager, history);
}
