// ==========================================
// مستمعات الأحداث العامة
// ==========================================

import { hideFirebaseAuthModal } from '../auth/auth-ui.js';
import { getElement } from '../core/utils.js';
import { toggleMobileSidebar } from './mobile-nav.js';

// إغلاق القوائم المنبثقة عند النقر خارجها
window.addEventListener("click", function(event) {
    const menu = getElement("quick-actions-menu");
    const btn = getElement("quick-actions-btn");
    if (menu && btn && menu.style.display === "block" && !menu.contains(event.target) && !btn.contains(event.target)) {
        menu.style.display = "none";
    }
    
    const firebaseModal = getElement("firebase-modal");
    const firebaseBox = getElement("firebase-box");
    if (firebaseModal.style.display === "flex" && !firebaseBox.contains(event.target)) {
        hideFirebaseAuthModal();
    }
});

// إغلاق القائمة الجانبية في الجوال تلقائياً عند الضغط على زر ينقل لصفحة جديدة
window.addEventListener("DOMContentLoaded", () => {
    document.addEventListener('click', function(e) {
        const isMenuButton = e.target.closest('.menu-button') || e.target.closest('.site-button');
        const isDropdownHeader = e.target.closest('.menu-group-header') || e.target.closest('.site-control-btn');
        
        if (isMenuButton && !isDropdownHeader && window.innerWidth <= 768) {
            const sidebar = document.getElementById('main-sidebar');
            if (sidebar.classList.contains('open')) {
                toggleMobileSidebar();
            }
        }
    });
});
