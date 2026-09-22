// ==========================================
// واجهة المستخدم والإشعارات
// ==========================================

import { getElement } from '../core/utils.js';

export function showNotification(text, type = "info", duration = 3000) {
    const container = getElement("notification-container");
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    
    let icon = "fas fa-info-circle";
    if (type === "success") icon = "fas fa-check-circle";
    if (type === "warning") icon = "fas fa-exclamation-triangle";
    if (type === "error") icon = "fas fa-times-circle";

    notification.innerHTML = `<i class="${icon}"></i><span>${text}</span>`;
    container.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = "0";
        notification.style.transform = "translateX(-120%)";
        setTimeout(() => notification.remove(), 500);
    }, duration);
}

export function showModal({ title, message, onConfirm, showConfirm = true, confirmText = "تأكيد", customHTML = "", cancelText = "إلغاء" }) {
    getElement("modal-title").textContent = title;
    getElement("modal-message").textContent = message;
    getElement("modal-custom-content").innerHTML = customHTML;
    
    const modal = getElement("custom-modal");
    modal.style.display = "flex";
    
    const confirmBtn = getElement("modal-confirm-btn");
    const cancelBtn = getElement("modal-cancel-btn");
    const closeBtn = modal.querySelector(".modal-close-btn");

    // استبدال الزر لإزالة المستمعين السابقين
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.textContent = confirmText;
    newConfirmBtn.style.display = showConfirm ? "flex" : "none";
    newConfirmBtn.addEventListener("click", () => { onConfirm(); });

    cancelBtn.textContent = cancelText;
    // cancelBtn و closeBtn هما نفس العنصر في كل استدعاء (لم يُستبدلا كـ newConfirmBtn)،
    // واستخدام نفس مرجع الدالة hideModal يمنع addEventListener من تكرار المستمع.
    cancelBtn.addEventListener("click", hideModal);
    closeBtn.addEventListener("click", hideModal);
}

export function hideModal() {
    getElement("custom-modal").style.display = "none";
}
