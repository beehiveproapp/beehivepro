// ==========================================
// --- دوال الصفحة المنبثقة لقوة الخلية ---
// ==========================================

import Chart from 'chart.js/auto';
import { beehiveManager, getElement } from '../core/utils.js';
import { showNotification } from './notifications.js';

let currentStrengthChartInstance;

export async function showHiveStrengthPopup(hiveId) {
    if (navigator.vibrate) navigator.vibrate(50);
    const manager = beehiveManager.getActive();
    if (!manager) return;

    const popup = getElement("hive-strength-popup");
    getElement("popup-hive-number").textContent = `للخلية رقم: ${hiveId}`;
    popup.classList.remove("popup-hidden");

    if (currentStrengthChartInstance) currentStrengthChartInstance.destroy();

    // 1. استخدام دالة جلب البيانات المعالجة (الخاصة بتبويب التحليلات)
    const history = await manager.loadHistoryForHive(hiveId);
    const validHistory = history.filter(h => h.frames !== undefined && !isNaN(h.frames));

    if (validHistory.length === 0) {
        showNotification("لا توجد بيانات لعرضها.", "info");
        return;
    }

    let labels = validHistory.map(h => { const d = new Date(h.date); return `${d.getMonth() + 1}/${d.getDate()}`; });
    let framesData = validHistory.map(h => h.frames);

    // 2. تطبيق خوارزمية التحليل: تقليل كثافة البيانات على شاشات الجوال لمنع التزاحم والتمدد
    if (window.innerWidth < 768 && validHistory.length > 6) {
        const step = Math.ceil(validHistory.length / 6);
        labels = labels.filter((_, i) => i % step === 0);
        framesData = framesData.filter((_, i) => i % step === 0);
    }

    const ctx = getElement("strength-popup-chart").getContext('2d');
    currentStrengthChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'الإطارات', data: framesData, borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 3, fill: true, tension: 0.3 }] },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } }, 
            scales: { y: { beginAtZero: true, suggestedMax: 10 } } // إضافة حد أقصى افتراضي لثبات الشكل
        }
    });
}

export function closeHiveStrengthPopup(event) {
    event?.stopPropagation();
    getElement("hive-strength-popup").classList.add("popup-hidden");
    if (currentStrengthChartInstance) currentStrengthChartInstance.destroy();
}

// ربط أحداث النقر الخاصة بهذه النافذة المنبثقة (كانت onclick مضمّنة في index.html):
// - النقر على الخلفية (overlay) نفسها يغلق النافذة.
// - النقر داخل محتوى النافذة يوقف انتشار الحدث حتى لا يصل لمستمع الخلفية ويغلقها.
// - زر الإغلاق (×) يغلق النافذة، ثم closeHiveStrengthPopup نفسها توقف الانتشار.
const hiveStrengthPopup = getElement("hive-strength-popup");
if (hiveStrengthPopup) {
    hiveStrengthPopup.addEventListener("click", (event) => closeHiveStrengthPopup(event));
    hiveStrengthPopup.querySelector(".popup-content")?.addEventListener("click", (event) => event.stopPropagation());
    hiveStrengthPopup.querySelector(".close-popup-btn")?.addEventListener("click", (event) => closeHiveStrengthPopup(event));
}
