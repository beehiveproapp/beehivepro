// ==========================================
// ربط أحداث النقر والتغيير (Event Bindings)
// ==========================================
// تحل هذه الوحدة محل الاعتماد القديم على onclick="..." و onchange="..."
// المضمّنة داخل HTML. كل عنصر تفاعلي يحمل الآن data-action (وأحياناً سمات
// data-* إضافية بدلاً من المعطيات التي كانت تُكتب داخل onclick/onchange)،
// ومستمعا نقر وتغيير مفوَّضان (event delegation) على document يقرآن هذه
// السمات وينفّذان الدالة المناسبة من الجدول المطابق.
//
// أهم فائدة من التفويض هنا أنه يعمل تلقائياً مع أي عنصر يُنشأ لاحقاً عبر
// innerHTML (مثل صفوف الجدول أو نافذة الإجراءات السريعة) دون الحاجة لإعادة
// ربط الأحداث في كل مرة يُعاد فيها بناء تلك العناصر.

import {
    confirmSignOut,
    showFirebaseAuthModal,
    signInWithEmail,
    signInWithGoogle,
    signUpWithEmail,
    skipLogin
} from '../auth/auth-ui.js';
import { updateAnalysisCharts } from '../charts/analysis-tab.js';
import { showChart } from '../charts/chart-setup.js';
import { showGlobalStatsView, showSiteComparisonView } from '../charts/stats-views.js';
import { state } from '../core/state.js';
import { beehiveManager, changeValue, getElement, togglePassword } from '../core/utils.js';
import { closeHoneycom, openHoneycom, sendHoneycomMessage } from '../features/honeycom.js';
import { openSite } from '../managers/sites.js';
import { exportData, importData } from '../services/data-transfer.js';
import { addBulkReviewTask, showQuickActionsModal } from '../ui/floating-actions.js';
import {
    addReviewTask,
    performQuickAction,
    showFormTab,
    toggleQuickActionsMenu
} from '../ui/form-quick-actions.js';
import { switchMobileTab, toggleMobileSidebar } from '../ui/mobile-nav.js';
import { toggleRecsFeature, toggleStarsFeature, toggleTheme } from '../ui/theme-features.js';
import { endTutorial, nextTutorialStep } from '../ui/tutorial.js';

// جدول الإجراءات: كل مفتاح يطابق قيمة data-action، والدالة تستقبل العنصر
// الذي حمل السمة (وهو ما كان يمثله "this" داخل onclick القديم).
const actions = {
    'sign-in-google': () => signInWithGoogle(),
    'sign-in-email': () => signInWithEmail(),
    'sign-up-email': () => signUpWithEmail(),
    'skip-login': () => skipLogin(),

    'toggle-sidebar': () => getElement("main-sidebar").classList.toggle("collapsed"),
    'toggle-menu': (target) => target.nextElementSibling.classList.toggle("open"),
    'toggle-mobile-sidebar': () => toggleMobileSidebar(),
    'toggle-password': (target) => togglePassword(target.dataset.target, target),
    'toggle-quick-actions-menu': () => toggleQuickActionsMenu(),

    'show-main-tab': (target) => beehiveManager.getActive().showMainTab(target.dataset.tab),
    'switch-mobile-tab': (target) => switchMobileTab(target.dataset.tab, target),
    'show-form-tab': (target) => showFormTab(target.dataset.tab, target),
    'show-chart': (target) => showChart(target.dataset.chart, target),
    'show-global-stats': () => showGlobalStatsView(),
    'show-site-comparison': () => showSiteComparisonView(),
    'go-back-to-dashboard': () => openSite(state.activeSiteId),

    'import-data': () => importData(),
    'export-data': () => exportData(),
    'show-firebase-auth': () => showFirebaseAuthModal(),
    'confirm-sign-out': () => confirmSignOut(),

    'open-honeycom': () => openHoneycom(),
    'close-honeycom': () => closeHoneycom(),
    'send-honeycom-message': () => sendHoneycomMessage(),

    'add-task': () => beehiveManager.getActive().addTask(),
    'refresh-ui': () => beehiveManager.getActive().refreshUI(),
    'save-hive': () => beehiveManager.getActive().saveHive(),
    'sort-table': (target) => beehiveManager.getActive().sortTable(parseInt(target.dataset.col, 10)),
    'delete-task': (target) => beehiveManager.getActive().deleteTask(parseInt(target.dataset.id, 10)),
    'change-value': (target) => changeValue(target.dataset.target, parseInt(target.dataset.delta, 10)),

    'quick-action': (target) => performQuickAction(
        parseInt(target.dataset.frames, 10),
        target.dataset.message,
        target.dataset.stockType,
        parseInt(target.dataset.stock, 10)
    ),
    'add-review-task': (target) => addReviewTask(target.dataset.label, parseInt(target.dataset.frames, 10)),
    'add-bulk-review-task': (target) => addBulkReviewTask(target.dataset.label),
    'show-quick-actions-modal': () => showQuickActionsModal(),

    'end-tutorial': () => endTutorial(),
    'next-tutorial-step': () => nextTutorialStep()
};

document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const handler = actions[target.dataset.action];
    if (handler) handler(target, event);
});

// نفس آلية data-action أعلاه، لكن لعناصر <select>/<input type="checkbox">
// التي كانت تعتمد سابقاً على onchange="..." المضمّنة في index.html.
const changeActions = {
    'update-analysis-charts': () => updateAnalysisCharts(),
    'toggle-theme': () => toggleTheme(),
    'toggle-stars-feature': () => toggleStarsFeature(),
    'toggle-recs-feature': () => toggleRecsFeature()
};

document.addEventListener("change", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const handler = changeActions[target.dataset.action];
    if (handler) handler(target, event);
});
