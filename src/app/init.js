// ==========================================
// تهيئة التطبيق (Initialization)
// ==========================================

import { updateAnalysisCharts } from '../charts/analysis-tab.js';
import { renderGlobalCharts } from '../charts/stats-views.js';
import { DBHelper } from '../core/db-helper.js';
import { managers, state } from '../core/state.js';
import { beehiveManager, debounce, getElement } from '../core/utils.js';
import { BeehiveManager } from '../managers/beehive-manager.js';
import { addSite, createSiteButtons, openSite } from '../managers/sites.js';
import { applyRecsFeature, applyStarsFeature, applyTheme } from '../ui/theme-features.js';

export async function initializeApp() {
    const theme = (await DBHelper.get("settings", "theme"))?.value || "light";
    applyTheme(theme);

    const starsEnabled = (await DBHelper.get("settings", "starsFeature"))?.value ?? false;
    getElement("stars-feature-checkbox").checked = starsEnabled;
    applyStarsFeature(starsEnabled);

    const recsEnabled = (await DBHelper.get("settings", "recsFeature"))?.value ?? true;
    getElement("recs-feature-checkbox").checked = recsEnabled;
    applyRecsFeature(recsEnabled);

    state.sites = await DBHelper.getAll("sites");
    if (state.sites.length === 0) return addSite();

    state.sites.forEach(s => managers.set(s.id, new BeehiveManager(s.id)));
    await createSiteButtons();

    const lastActive = (await DBHelper.get("settings", "activeSiteId"))?.value;
    const targetSite = state.sites.find(s => s.id === lastActive) ? lastActive : state.sites[0].id;
    openSite(targetSite);

    getElement("hive-filter-input").addEventListener("keyup", debounce(() => beehiveManager.getActive().displayHives(), 300));
    
    getElement("select-all-hives").addEventListener("change", (e) => {
        document.querySelectorAll(".hive-select-checkbox").forEach(cb => cb.checked = e.target.checked);
    });

    window.addEventListener("resize", debounce(() => {
        if (getElement("analysis-tab").classList.contains("active")) updateAnalysisCharts();
        if (getElement("global-stats-view").style.display === "block") renderGlobalCharts();
    }, 250));
}
