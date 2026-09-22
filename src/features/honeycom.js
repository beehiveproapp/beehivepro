// ==========================================
// خلية التواصل (Honeycom)
// ==========================================

import { getElement } from '../core/utils.js';
import { showNotification } from '../ui/notifications.js';

export function openHoneycom() {
    const modal = getElement("honeycom-modal");
    const grid = modal.querySelector(".honeycomb-grid");
    grid.innerHTML = "";
    
    const staticCells = [
        { icon: "fas fa-bullhorn", text: "تحديث جديد قادم قريباً!" },
        { icon: "fas fa-question-circle", text: "كيفية تصدير البيانات؟" }
    ];

    for (let i = 0; i < 7; i++) {
        const cell = document.createElement("div");
        cell.className = "honeycomb-cell";
        if (i < staticCells.length) {
            cell.classList.add("pinned");
            cell.innerHTML = `<i class="${staticCells[i].icon}"></i>`;
            cell.title = staticCells[i].text;
        } else {
            cell.innerHTML = '<i class="fas fa-plus"></i>';
            cell.title = "أضف رسالة جديدة";
            cell.addEventListener("click", () => {
                getElement("honeycom-form").classList.remove("feature-hidden");
                getElement("honeycom-send-btn").classList.remove("feature-hidden");
            });
        }
        grid.appendChild(cell);
    }
    modal.style.display = "flex";
}

export function closeHoneycom() {
    getElement("honeycom-modal").style.display = "none";
    getElement("honeycom-form").classList.add("feature-hidden");
    getElement("honeycom-send-btn").classList.add("feature-hidden");
    getElement("honeycom-message").value = "";
}

export async function sendHoneycomMessage() {
    const type = getElement("honeycom-type").value;
    const message = getElement("honeycom-message").value.trim();
    const publishOk = getElement("honeycom-publish-ok").checked;

    if (!message) return showNotification("الرجاء كتابة رسالتك أولاً.", "warning");

    const btn = getElement("honeycom-send-btn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جار الإرسال...';
    
    try {
        const response = await fetch("https://formspree.io/f/mldppkgp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, message, publish_permission: publishOk, sent_from: "Beehive App Pro" })
        });
        if (response.ok) {
            showNotification("🍯 تم إيصال رسالتك بنجاح!", "success");
            closeHoneycom();
        } else {
            throw new Error("فشل الإرسال");
        }
    } catch (err) {
        showNotification("حدث خطأ أثناء إرسال الرسالة. حاول مجدداً.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال';
    }
}
