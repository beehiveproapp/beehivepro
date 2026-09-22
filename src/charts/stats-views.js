// ==========================================
// وظائف العرض الشامل والمقارنة
// ==========================================

import Chart from 'chart.js/auto';
import { DBHelper } from '../core/db-helper.js';
import { state } from '../core/state.js';
import { beehiveManager, getElement } from '../core/utils.js';
import { showModal, showNotification } from '../ui/notifications.js';
import { applyTheme } from '../ui/theme-features.js';

export async function showHiveHistory(hiveId) {
    const manager = beehiveManager.getActive();
    const history = await manager.loadHistoryForHive(hiveId);
    
    if (history.length === 0) return showNotification("لا يوجد سجل لهذه الخلية.", "info");

    let html = `
        <div class="table-wrapper"><table style="min-width: 100%;">
            <thead><tr><th>التاريخ</th><th>الإطارات</th><th>حالة الملكة</th><th>المخزون (ع/ك)</th><th>الملاحظات</th></tr></thead>
            <tbody>${history.slice().reverse().map(rec => `
                <tr>
                    <td>${(new Date(rec.date)).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" })}</td>
                    <td>${rec.frames}</td><td>${rec.queenStatus}</td><td>${rec.honeyFrames || 0}/${rec.pollenFrames || 0}</td>
                    <td style="text-align: right; white-space: pre-wrap;">${rec.notes || "-"}</td>
                </tr>`).join('')}
            </tbody></table></div>`;
    
    showModal({ title: `سجل الخلية رقم ${hiveId}`, customHTML: html, showConfirm: false, cancelText: "إغلاق" });
}

export async function showGlobalStatsView() {
    getElement("standard-view-wrapper").style.display = "none";
    getElement("site-comparison-view").style.display = "none";
    getElement("global-stats-view").style.display = "block";
    
    const site = await DBHelper.get("sites", state.activeSiteId);
    getElement("active-location-title").textContent = `إحصائيات شاملة - ${site.name}`;
    await renderGlobalCharts();
}

export async function renderGlobalCharts() {
    Object.values(state.globalCharts).forEach(chart => chart.destroy());
    state.globalCharts = {};

    const manager = beehiveManager.getActive();
    const hives = await manager.loadHives();
    const history = await manager.loadHistory();

    const strengthCounts = { "ضعيفة (1-3)": 0, "متوسطة (4-6)": 0, "قوية (7+)": 0 };
    hives.forEach(h => {
        if (h.frames <= 3) strengthCounts["ضعيفة (1-3)"]++;
        else if (h.frames <= 6) strengthCounts["متوسطة (4-6)"]++;
        else strengthCounts["قوية (7+)"]++;
    });

    state.globalCharts.strength = new Chart(getElement("globalStrengthCanvas"), {
        type: 'bar',
        data: {
            labels: Object.keys(strengthCounts),
            datasets: [{
                data: Object.values(strengthCounts),
                backgroundColor: ["rgba(231, 76, 60, 0.6)", "rgba(241, 196, 15, 0.6)", "rgba(39, 174, 96, 0.6)"],
                borderWidth: 1
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    const queenAges = {};
    hives.forEach(h => {
        const year = h.queenYear || "غير معروف";
        queenAges[year] = (queenAges[year] || 0) + 1;
    });
    const sortedYears = Object.keys(queenAges).sort((a, b) => b.localeCompare(a));

    state.globalCharts.queenAge = new Chart(getElement("globalQueenAgeCanvas"), {
        type: 'doughnut',
        data: {
            labels: sortedYears,
            datasets: [{
                data: sortedYears.map(y => queenAges[y]),
                backgroundColor: ["#3498db", "#2ecc71", "#f1c40f", "#e74c3c", "#9b59b6", "#34495e"]
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const weeklyData = {};
    history.forEach(rec => {
        const d = new Date(rec.date);
        const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        weeklyData[key] = weeklyData[key] || [];
        weeklyData[key].push(rec.frames);
    });

    const sortedMonths = Object.keys(weeklyData).sort();
    const averages = sortedMonths.map(m => weeklyData[m].reduce((a, b) => a + b, 0) / weeklyData[m].length);
    
    let displayMonths = sortedMonths;
    if (window.innerWidth < 768 && sortedMonths.length > 8) {
        displayMonths = sortedMonths.filter((_, i) => i % Math.ceil(sortedMonths.length / 8) === 0);
    }

    state.globalCharts.weeklyAvg = new Chart(getElement("globalWeeklyAvgCanvas"), {
        type: 'line',
        data: { labels: displayMonths, datasets: [{ label: "متوسط عدد الإطارات", data: averages, tension: 0.1, fill: false }] },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const theme = (await DBHelper.get("settings", "theme"))?.value || "light";
    applyTheme(theme);
}

export async function showSiteComparisonView() {
    getElement("standard-view-wrapper").style.display = "none";
    getElement("global-stats-view").style.display = "none";
    getElement("site-comparison-view").style.display = "block";
    getElement("active-location-title").textContent = "مقارنة شاملة بين جميع المواقع";

    Object.values(state.comparisonCharts).forEach(chart => chart.destroy());
    state.comparisonCharts = {};

    const dataPoints = [];
    for (const site of state.sites) {
        const mgr = beehiveManager.get(site.id);
        const hives = await mgr.loadHives();
        if (hives.length === 0) continue;

        const stats = { strong: 0, medium: 0, weak: 0, totalHoney: 0, totalFrames: 0 };
        hives.forEach(h => {
            stats.totalFrames += h.frames;
            stats.totalHoney += h.honeyFrames || 0;
            if (h.frames > 6) stats.strong++;
            else if (h.frames < 4) stats.weak++;
            else stats.medium++;
        });

        dataPoints.push({
            name: site.name,
            avgStrength: (stats.totalFrames / hives.length).toFixed(1),
            avgHoney: (stats.totalHoney / hives.length).toFixed(1),
            strongPct: stats.strong / hives.length * 100,
            mediumPct: stats.medium / hives.length * 100,
            weakPct: stats.weak / hives.length * 100
        });
    }

    const labels = dataPoints.map(d => d.name);

    state.comparisonCharts.avgStrength = new Chart(getElement("siteAvgStrengthCanvas"), {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: "متوسط عدد الإطارات", data: dataPoints.map(d => d.avgStrength), backgroundColor: "rgba(52, 152, 219, 0.7)" }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });

    state.comparisonCharts.strengthDist = new Chart(getElement("siteStrengthDistCanvas"), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: "خلايا قوية (%)", data: dataPoints.map(d => d.strongPct), backgroundColor: "rgba(39, 174, 96, 0.7)" },
                { label: "خلايا متوسطة (%)", data: dataPoints.map(d => d.mediumPct), backgroundColor: "rgba(241, 196, 15, 0.7)" },
                { label: "خلايا ضعيفة (%)", data: dataPoints.map(d => d.weakPct), backgroundColor: "rgba(231, 76, 60, 0.7)" }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, max: 100, ticks: { callback: v => v + "%" } } } }
    });

    state.comparisonCharts.avgHoney = new Chart(getElement("siteAvgHoneyCanvas"), {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: "متوسط إطارات العسل المختوم", data: dataPoints.map(d => d.avgHoney), backgroundColor: "rgba(243, 156, 18, 0.7)" }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });

    const theme = (await DBHelper.get("settings", "theme"))?.value || "light";
    applyTheme(theme);
}
