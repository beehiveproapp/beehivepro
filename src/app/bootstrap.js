// ==========================================
// نقطة الدخول الرئيسية
// ==========================================

import { showFirebaseAuthModal } from '../auth/auth-ui.js';
import { DBHelper } from '../core/db-helper.js';
import { getElement } from '../core/utils.js';
import { FirebaseHelper } from '../services/firebase-helper.js';
import { showHiveStrengthPopup } from '../ui/hive-popup.js';
import { showNotification } from '../ui/notifications.js';
import { startTutorial } from '../ui/tutorial.js';
import { initializeApp } from './init.js';

let longPressTimer;

window.onload = async function () {
    try {
        await DBHelper.init();
        await initializeApp();

        // تفعيل الضغط المستمر على جدول الخلايا
        const listContainer = getElement("hives-table-body");
        let touchStartX = 0, touchStartY = 0;
        const cancelLongPress = () => clearTimeout(longPressTimer);

        if (listContainer) {
            listContainer.addEventListener('mousedown', startLongPress);
            
            listContainer.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                startLongPress(e);
            }, {passive: true});

            ['mouseup', 'mouseleave', 'touchend'].forEach(evt => listContainer.addEventListener(evt, cancelLongPress));
            
            // إلغاء الضغط المستمر فقط إذا تحرك الإصبع مسافة ملحوظة (لحل مشكلة حساسية اللمس)
            listContainer.addEventListener('touchmove', (e) => {
                if (Math.abs(e.touches[0].clientX - touchStartX) > 10 || Math.abs(e.touches[0].clientY - touchStartY) > 10) {
                    cancelLongPress();
                }
            }, {passive: true});

            // منع المتصفح من تحديد النص وإظهار قائمة النسخ عند الضغط المستمر
            listContainer.addEventListener('contextmenu', (e) => {
                if (e.target.closest('tr')) e.preventDefault();
            });
        }

        function startLongPress(e) {
            const hiveRow = e.target.closest('tr');
            if (!hiveRow || !listContainer.contains(hiveRow)) return;
            
            const checkbox = hiveRow.querySelector('.hive-select-checkbox');
            if (!checkbox) return;
            const hiveId = parseInt(checkbox.dataset.hiveId);
            
            clearTimeout(longPressTimer);
            // تقليل المدة لـ 500 ملي ثانية لتكون الاستجابة أسرع
            longPressTimer = setTimeout(() => {
                if(window.getSelection) window.getSelection().removeAllRanges(); // إلغاء تظليل النص
                showHiveStrengthPopup(hiveId);
            }, 500); 
        }

        const user = await FirebaseHelper.init();
        
        if (!user && !document.body.classList.contains('local-mode')) {
            showFirebaseAuthModal();
        }
        
        setTimeout(() => {
            if (document.getElementById("firebase-modal").style.display !== "flex") {
                startTutorial();
            } else {
                const observer = new MutationObserver((mutations) => {
                    if (document.getElementById("firebase-modal").style.display === "none") {
                        startTutorial();
                        observer.disconnect();
                    }
                });
                observer.observe(document.getElementById("firebase-modal"), { attributes: true, attributeFilter: ['style'] });
            }
        }, 500);
        
    } catch (e) {
        console.error("Failed to initialize the application:", e);
        showNotification("فشل تهيئة التطبيق، سيتم العمل محلياً", "error");
        getElement("main-app-content").classList.remove("app-hidden");
    }
};
