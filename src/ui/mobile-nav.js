// ==========================================
// التنقل في الموبايل (الشريط السفلي والقائمة الجانبية)
// ==========================================

import { beehiveManager } from '../core/utils.js';

// دالة تبديل التبويبات من الشريط السفلي للموبايل
export function switchMobileTab(tabId, btnElement) {
    // 1. تغيير التبويب في النظام الأساسي
    if (beehiveManager.getActive()) {
        beehiveManager.getActive().showMainTab(tabId);
    }

    // 2. تحديث الشكل النشط للأزرار السفلية
    document.querySelectorAll('.bottom-nav-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    // 3. إغلاق القائمة الجانبية إذا كانت مفتوحة (لتسهيل الرؤية)
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }
}

// دالة فتح/إغلاق القائمة الجانبية من زر "المزيد"
export function toggleMobileSidebar() {
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}
