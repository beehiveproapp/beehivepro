// ==========================================
// الأدوات المساعدة
// ==========================================

import { managers, state } from './state.js';

export const getElement = (id) => document.getElementById(id);

// دالة لتبديل رؤية كلمة المرور
export function togglePassword(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}

// دالة لزيادة/إنقاص قيمة حقل رقمي (تُستخدم في أزرار +/- لعدد الإطارات وغيرها)
export function changeValue(id, delta) {
    const el = getElement(id);
    let val = parseInt(el.value || "0", 10);
    let newVal = val + delta;
    if (newVal < 0) newVal = 0;
    if (id === "frames" && newVal > 10) newVal = 10;
    el.value = newVal;
}

// دالة لتأخير التنفيذ (Debounce) لتحسين الأداء عند البحث وتغيير حجم النافذة
export function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export const beehiveManager = {
    get: (id) => managers.get(id),
    getActive: () => managers.get(state.activeSiteId)
};
