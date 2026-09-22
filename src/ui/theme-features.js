// ==========================================
// إدارة الثيمات والميزات الإضافية
// ==========================================

import { updateChartColors } from '../charts/chart-setup.js';
import { DBHelper } from '../core/db-helper.js';
import { analysisCharts, state } from '../core/state.js';
import { beehiveManager, getElement } from '../core/utils.js';
import { FirebaseHelper } from '../services/firebase-helper.js';

export async function applyTheme(theme) {
    document.body.classList.toggle("dark-mode", theme === "dark");
    getElement("theme-checkbox").checked = (theme === "dark");
    updateChartColors();

    if (state.chartsInitialized) Object.values(analysisCharts).forEach(chart => chart.update());
    if (Object.keys(state.globalCharts).length > 0) Object.values(state.globalCharts).forEach(chart => chart.update());
    if (Object.keys(state.comparisonCharts).length > 0) Object.values(state.comparisonCharts).forEach(chart => chart.update());
}

export function applyStarsFeature(enabled) {
    document.querySelectorAll(".star-feature").forEach(el => {
        if (enabled) {
            el.classList.remove("feature-hidden");
        } else {
            el.classList.add("feature-hidden");
        }
    });
}

export function applyRecsFeature(enabled) {
    document.querySelectorAll(".recommendation-feature").forEach(el => {
        if (enabled) {
            el.classList.remove("feature-hidden");
        } else {
            el.classList.add("feature-hidden");
        }
    });
}

export async function toggleTheme() {
    const theme = document.body.classList.contains("dark-mode") ? "light" : "dark";
    await DBHelper.put("settings", { key: "theme", value: theme });
    applyTheme(theme);
    
    // تم الإصلاح: رفع الإعداد فقط بدلاً من المزامنة الشاملة
    if (FirebaseHelper.currentUser) {
        FirebaseHelper.saveItem("settings", "theme", { key: "theme", value: theme });
    }
}

export async function toggleStarsFeature() {
    const enabled = getElement("stars-feature-checkbox").checked;
    await DBHelper.put("settings", { key: "starsFeature", value: enabled });
    applyStarsFeature(enabled);
    
    // تم الإصلاح: رفع الإعداد فقط
    if (FirebaseHelper.currentUser) {
        FirebaseHelper.saveItem("settings", "starsFeature", { key: "starsFeature", value: enabled });
    }
}

export async function toggleRecsFeature() {
    const enabled = getElement("recs-feature-checkbox").checked;
    await DBHelper.put("settings", { key: "recsFeature", value: enabled });
    applyRecsFeature(enabled);
    if (beehiveManager.getActive()) beehiveManager.getActive().refreshUI();
    
    // تم الإصلاح: رفع الإعداد فقط
    if (FirebaseHelper.currentUser) {
        FirebaseHelper.saveItem("settings", "recsFeature", { key: "recsFeature", value: enabled });
    }
}
