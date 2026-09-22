// ==========================================
// واجهة المستخدم (Tabs, Quick Actions)
// ==========================================

import { DBHelper } from '../core/db-helper.js';
import { beehiveManager, changeValue, getElement } from '../core/utils.js';
import { FirebaseHelper } from '../services/firebase-helper.js';
import { updateSelectionUI } from './floating-actions.js';
import { hideModal, showModal, showNotification } from './notifications.js';

export function showFormTab(tabId, btn) {
    document.querySelectorAll(".form-tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".form-tabs .form-tab-button").forEach(el => el.classList.remove("active"));
    getElement(`${tabId}-form`).classList.add("active");
    btn.classList.add("active");
}

export function toggleQuickActionsMenu() {
    const menu = getElement("quick-actions-menu");
    menu.style.display = (menu.style.display === "block") ? "none" : "block";
}

export function performQuickAction(framesChange, noteText, stockType, stockChange) {
    const selectedHives = Array.from(document.querySelectorAll(".hive-select-checkbox:checked")).map(cb => parseInt(cb.dataset.hiveId));
    const activeManager = beehiveManager.getActive();

    if (selectedHives.length > 0) {
        showModal({
            title: "تطبيق إجراء جماعي",
            message: `سيتم تطبيق هذا الإجراء على ${selectedHives.length} خلية محددة. هل أنت متأكد؟`,
            onConfirm: async () => {
                hideModal();
                await activeManager.applyBulkAction(selectedHives, framesChange, noteText, stockType, stockChange);
                showNotification(`تم تطبيق الإجراء على ${selectedHives.length} خلية.`, "success");
                
                // 🚀 الإصلاح: إزالة علامات التحديد يدوياً وإخفاء الشريط العائم فوراً
                document.querySelectorAll(".hive-select-checkbox").forEach(cb => cb.checked = false);
                const selectAll = document.getElementById("select-all-hives");
                if (selectAll) selectAll.checked = false;
                updateSelectionUI();
            }
        });
    } else {
        // جلب رقم الخلية المكتوب في الاستمارة حالياً
        const currentHiveId = getElement("hive-id").value;
        const notesEl = getElement("notes");
        
        // إذا كان المستخدم قد استدعى خلية في الاستمارة العلوية ولم يحدد في الجدول
        if (currentHiveId) {
            showModal({
                title: "تأكيد الإجراء السريع",
                message: `لم تقم بتحديد أي خلايا بعلامة (صح) من الجدول. هل تريد تطبيق هذا الإجراء وحفظه مباشرة للخلية رقم (${currentHiveId}) المفتوحة في الاستمارة الحالية؟`,
                confirmText: "نعم، تطبيق وحفظ",
                onConfirm: () => {
                    hideModal(); // إخفاء نافذة التأكيد
                    
                    // تطبيق التغييرات على استمارة الإدخال
                    if (framesChange !== 0) changeValue("frames", framesChange);
                    
                    if (stockChange !== 0) {
                        if (stockType === 'honey') changeValue("honey-frames", stockChange);
                        if (stockType === 'pollen') changeValue("pollen-frames", stockChange);
                    }

                    notesEl.value = notesEl.value.trim() ? `${notesEl.value}\n${noteText}` : noteText;
                    
                    // نقوم بحفظ التغييرات تلقائياً كفحص جديد
                    activeManager.saveHive();
                }
            });
        } else {
            // إذا لم يحدد في الجدول ولم يكتب رقم في الاستمارة أساساً
            // نجهز الاستمارة فقط ولا نقوم بالحفظ
            if (framesChange !== 0) changeValue("frames", framesChange);
            
            if (stockChange !== 0) {
                if (stockType === 'honey') changeValue("honey-frames", stockChange);
                if (stockType === 'pollen') changeValue("pollen-frames", stockChange);
            }

            notesEl.value = notesEl.value.trim() ? `${notesEl.value}\n${noteText}` : noteText;
            showNotification("تم تجهيز الإجراء في الاستمارة، يرجى كتابة رقم الخلية ثم الضغط على إضافة سجل.", "info");
        }
    }
    
    const menu = getElement("quick-actions-menu");
    if(menu) menu.style.display = "none";
}

export async function addReviewTask(action, taskFramesChange) {
    const hiveId = getElement("hive-id").value;
    if (!hiveId) {
        return showNotification("الرجاء إدخال رقم الخلية أولاً.", "error");
    }
    const hiveNum = parseInt(hiveId);
    const activeManager = beehiveManager.getActive();
    const taskText = `📍 مراجعة الخلية رقم ${hiveNum}: تحتاج ${action}`;
    
    const taskData = { 
        siteId: activeManager.siteId, 
        text: taskText,
        createdAt: new Date().toISOString()
    };

    try {
        // 1. الحفظ المحلي فوراً
        const id = await DBHelper.add("tasks", taskData);
        taskData.id = id;

        // 2. تحديث الواجهة والإشعار فوراً (الأولوية للمستخدم)
        activeManager.displayTasks();
        showNotification(`تم تسجيل المهمة: الخلية رقم ${hiveNum} تحتاج ${action}.`, "info");

        const notesEl = getElement("notes");
        const additionalNote = `[تم تعليمها للمراجعة: ${action}]`;
        notesEl.value = notesEl.value.trim() ? `${notesEl.value}\n${additionalNote}` : additionalNote;
        
        if (taskFramesChange !== 0) {
            changeValue("frames", taskFramesChange);
        }
        toggleQuickActionsMenu();

        // 3. المزامنة السحابية في الخلفية (بدون await لتعطيل الواجهة)
        if (typeof FirebaseHelper !== 'undefined' && FirebaseHelper.currentUser) {
            FirebaseHelper.saveItem("tasks", id, taskData).catch(e => console.log("تأجل الرفع للسحابة"));
        }
        
    } catch (error) {
        console.error("خطأ:", error);
        showNotification("حدث خطأ في الحفظ", "error");
    }
}
