// ==========================================
// وظائف الرسوم البيانية (Charts)
// ==========================================

import Chart from 'chart.js/auto';
import { analysisCharts, state } from '../core/state.js';
import { getElement } from '../core/utils.js';

export function updateChartColors() {
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-color');
    const headerColor = getComputedStyle(document.body).getPropertyValue('--header-color');
    const successColor = getComputedStyle(document.body).getPropertyValue('--success-color');
    const infoColor = getComputedStyle(document.body).getPropertyValue('--info-color');

    const commonOptions = {
        scales: {
            x: { ticks: { color: textColor }, grid: { color: "rgba(128,128,128,0.1)" } },
            y: { ticks: { color: textColor }, grid: { color: "rgba(128,128,128,0.1)" } }
        },
        plugins: { legend: { labels: { color: textColor } } }
    };

    // تحديث المخططات الفردية
    if (analysisCharts.frames) {
        analysisCharts.frames.options = { ...analysisCharts.frames.options, ...commonOptions, plugins: { ...commonOptions.plugins, title: { display: true, text: "تطور قوة الخلية (بالإطارات)", color: textColor } } };
        analysisCharts.frames.data.datasets[0].borderColor = headerColor;
    }
    if (analysisCharts.health) {
        analysisCharts.health.options = { ...analysisCharts.health.options, ...commonOptions, plugins: { ...commonOptions.plugins, title: { display: true, text: "تطور صحة الخلية", color: textColor } } };
        analysisCharts.health.data.datasets[0].borderColor = successColor;
    }
    if (analysisCharts.queenAge) {
        analysisCharts.queenAge.options = { ...analysisCharts.queenAge.options, ...commonOptions, plugins: { ...commonOptions.plugins, title: { display: true, text: "علاقة عمر الملكة بقوة الخلية", color: textColor } } };
        analysisCharts.queenAge.data.datasets[0].backgroundColor = infoColor;
    }

    // تحديث المخططات العامة والمقارنة
    if (state.globalCharts.strength) state.globalCharts.strength.options = { ...state.globalCharts.strength.options, ...commonOptions };
    if (state.globalCharts.queenAge) state.globalCharts.queenAge.options = { ...state.globalCharts.queenAge.options, plugins: { legend: { labels: { color: textColor } } } };
    if (state.globalCharts.weeklyAvg) {
        state.globalCharts.weeklyAvg.options = { ...state.globalCharts.weeklyAvg.options, ...commonOptions };
        state.globalCharts.weeklyAvg.data.datasets[0].borderColor = headerColor;
    }
    if (state.comparisonCharts.avgStrength) state.comparisonCharts.avgStrength.options = { ...state.comparisonCharts.avgStrength.options, ...commonOptions };
    if (state.comparisonCharts.strengthDist) state.comparisonCharts.strengthDist.options = { ...state.comparisonCharts.strengthDist.options, ...commonOptions };
    if (state.comparisonCharts.avgHoney) state.comparisonCharts.avgHoney.options = { ...state.comparisonCharts.avgHoney.options, ...commonOptions };
}

export function showChart(chartId, btn) {
    document.querySelectorAll(".chart-wrapper").forEach(el => el.classList.remove("active-chart"));
    document.querySelectorAll(".chart-section .tab-button").forEach(el => el.classList.remove("active"));
    getElement(`${chartId}-chart`).classList.add("active-chart");
    btn.classList.add("active");
}

export function initializeAnalysisCharts() {
    if (state.chartsInitialized) {
        updateChartColors();
        return;
    }
    const commonOptions = { responsive: true, maintainAspectRatio: false };

    analysisCharts.frames = new Chart(getElement("framesTrendCanvas"), {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'عدد الإطارات', data: [], tension: 0.1 }] },
        options: commonOptions
    });

    analysisCharts.health = new Chart(getElement("healthTrendCanvas"), {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'درجة الصحة (%)', data: [], tension: 0.1 }] },
        options: commonOptions
    });

    analysisCharts.queenAge = new Chart(getElement("queenAgeCanvas"), {
        type: 'scatter',
        data: { datasets: [{ label: 'عمر الملكة (سنوات)', data: [] }] },
        options: commonOptions
    });

    state.chartsInitialized = true;
    updateChartColors();
}
