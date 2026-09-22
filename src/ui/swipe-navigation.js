// ==========================================
// دعم إيماءات السحب (Swipe Gestures) للموبايل
// ==========================================

import { beehiveManager } from '../core/utils.js';
import { showFormTab } from './form-quick-actions.js';
import { switchMobileTab } from './mobile-nav.js';

(function initSwipeNavigation() {
    // الترتيب المنطقي للتبويبات كما تظهر في الشريط السفلي
    const tabOrder = ['dashboard-tab', 'hives-tab', 'stars-tab', 'analysis-tab', 'settings-tab'];
    
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    const swipeThreshold = 60; // الحد الأدنى للمسافة لاحتساب السحب (بالبكسل)
    
    const swipeContainer = document.getElementById('standard-view-wrapper');
    if (!swipeContainer) return;

    swipeContainer.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    swipeContainer.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe(e);
    }, { passive: true });

    function handleSwipe(event) {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY)) {
            
            if (event.target.closest('.table-wrapper') || event.target.closest('.main-tabs') || event.target.closest('.hive-list-controls')) {
                return; 
            }

            const activeTab = document.querySelector('.tab-content.active');
            if (!activeTab) return;
            
            let currentIndex = tabOrder.indexOf(activeTab.id);
            if (currentIndex === -1) return;

            let nextIndex = currentIndex;
            let directionClass = ""; 

            // --- المنطق المعكوس هنا ---
            if (deltaX > 0) { 
                // سحب لليمين بإصبعك -> يظهر التبويب التالي (القادم من اليسار)
                nextIndex++; 
                directionClass = "slide-left";
            } else { 
                // سحب لليسار بإصبعك -> يظهر التبويب السابق (القادم من اليمين)
                nextIndex--; 
                directionClass = "slide-right";
            }

            while (nextIndex >= 0 && nextIndex < tabOrder.length) {
                const nextTabId = tabOrder[nextIndex];
                let nextTabBtn = window.innerWidth <= 768 ? 
                    document.querySelector(`.bottom-nav-btn[data-tab="${nextTabId}"]`) : 
                    document.querySelector(`.tab-button[data-tab="${nextTabId}"]`);
                
                if (nextTabBtn && !nextTabBtn.classList.contains('feature-hidden')) {
                    
                    document.querySelectorAll('.tab-content').forEach(tab => {
                        tab.classList.remove('slide-left', 'slide-right');
                    });

                    if (window.innerWidth <= 768) {
                        switchMobileTab(nextTabId, nextTabBtn);
                    } else {
                        if (beehiveManager.getActive()) beehiveManager.getActive().showMainTab(nextTabId);
                    }

                    const targetTabEl = document.getElementById(nextTabId);
                    if (targetTabEl) {
                        void targetTabEl.offsetWidth; 
                        targetTabEl.classList.add(directionClass);
                    }
                    
                    break; 
                }
                // الاستمرار في نفس الاتجاه الجديد عند البحث
                deltaX > 0 ? nextIndex++ : nextIndex--;
            }
        }
    }
})();

// ==========================================
// دعم السحب (Swipe) لتبويبات إدخال بيانات الخلية (الفرعية)
// ==========================================
(function initFormSwipe() {
    // ترتيب التبويبات الفرعية
    const formTabs = ['main-info', 'queen-info', 'storage-info'];
    let startX = 0, startY = 0, endX = 0, endY = 0;
    const threshold = 40; // حساسية السحب (بالبكسل)

    // استهداف حاويات النماذج الثلاثة
    const formSections = ['main-info-form', 'queen-info-form', 'storage-info-form'];

    formSections.forEach(sectionId => {
        const el = document.getElementById(sectionId);
        if (!el) return;

        el.addEventListener('touchstart', e => {
            startX = e.changedTouches[0].screenX;
            startY = e.changedTouches[0].screenY;
        }, { passive: true });

        el.addEventListener('touchend', e => {
            endX = e.changedTouches[0].screenX;
            endY = e.changedTouches[0].screenY;

            const deltaX = endX - startX;
            const deltaY = endY - startY;

            // التحقق من أن السحب أفقي وليس عمودياً (للتمرير)
            if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
                
                // إيقاف الحدث هنا لمنع الشاشة الرئيسية من السحب مع التبويب الفرعي
                e.stopPropagation();

                // معرفة التبويب النشط حالياً
                const activeTabBtn = document.querySelector('.form-tab-button.active');
                if (!activeTabBtn) return;

                // معرفة اسم التبويب الحالي من سمة data-tab
                const currentIdText = activeTabBtn.dataset.tab;
                if (!currentIdText) return;

                let currentIndex = formTabs.indexOf(currentIdText);

                if (currentIndex === -1) return;

                let nextIndex = currentIndex;
                let directionClass = "";

                // منطق الاتجاه المعكوس (RTL)
                if (deltaX > 0) {
                    // السحب لليمين بإصبعك -> الانتقال للتبويب التالي (يأتي من اليسار)
                    nextIndex++;
                    directionClass = "slide-left";
                } else {
                    // السحب لليسار بإصبعك -> الانتقال للتبويب السابق (يأتي من اليمين)
                    nextIndex--;
                    directionClass = "slide-right";
                }

                // إذا كان التبويب المستهدف موجوداً
                if (nextIndex >= 0 && nextIndex < formTabs.length) {
                    const nextTabId = formTabs[nextIndex];
                    const nextBtn = document.querySelector(`.form-tab-button[data-tab="${nextTabId}"]`);

                    if (nextBtn) {
                        // إزالة كلاسات الحركة القديمة
                        document.querySelectorAll('.form-tab-content').forEach(tab => {
                            tab.classList.remove('slide-left', 'slide-right');
                        });

                        // إضافة كلاس الحركة للتبويب المستهدف
                        const targetForm = document.getElementById(`${nextTabId}-form`);
                        if (targetForm) {
                            void targetForm.offsetWidth; // Trigger DOM reflow لإعادة تشغيل الأنيميشن
                            targetForm.classList.add(directionClass);
                        }

                        // تفعيل التبويب
                        showFormTab(nextTabId, nextBtn);
                    }
                }
            }
        });
    });
})();
