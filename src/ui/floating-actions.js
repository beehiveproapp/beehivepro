// ==========================================
// نظام الإجراءات السريعة العائم (Floating Quick Actions)
// ==========================================

import { DBHelper } from '../core/db-helper.js';
import { beehiveManager } from '../core/utils.js';
import { FirebaseHelper } from '../services/firebase-helper.js';
import { showModal, showNotification } from './notifications.js';

export function updateSelectionUI() {
    const selectedCount = document.querySelectorAll(".hive-select-checkbox:checked").length;
    const bar = document.getElementById("floating-selection-bar");
    if (bar) {
        if (selectedCount > 0) {
            document.getElementById("selection-count-text").textContent = `تم تحديد ${selectedCount} خلايا`;
            bar.classList.add("active");
        } else {
            bar.classList.remove("active");
        }
    }
}

// دالة عامة ومضمونة لإغلاق النافذة المنبثقة
export function closeCustomModal() {
    const modal = document.getElementById("custom-modal");
    if (modal) modal.style.display = "none";
}

export async function addBulkReviewTask(action) {
    const selectedCheckboxes = document.querySelectorAll(".hive-select-checkbox:checked");
    const activeManager = beehiveManager.getActive();
    
    if (selectedCheckboxes.length === 0) return;

    let addedCount = 0;
    for (const cb of selectedCheckboxes) {
        const hiveNum = cb.dataset.hiveId;
        const taskText = `📍 مراجعة الخلية رقم ${hiveNum}: تحتاج ${action}`;
        
        const taskData = { 
            siteId: activeManager.siteId, 
            text: taskText,
            createdAt: new Date().toISOString()
        };

        // الحفظ المحلي
        const id = await DBHelper.add("tasks", taskData);
        taskData.id = id;

        // الحفظ السحابي
        if (typeof FirebaseHelper !== 'undefined' && FirebaseHelper.currentUser) {
            FirebaseHelper.saveItem("tasks", id, taskData).catch(e => console.log("sync pending"));
        }
        addedCount++;
    }

    // تحديث قائمة المهام
    activeManager.displayTasks();
    showNotification(`تم تسجيل ${addedCount} مهام مراجعة (${action}) بنجاح.`, "info");
    
    // إزالة التحديد وإخفاء الشريط بعد الانتهاء
    document.querySelectorAll(".hive-select-checkbox").forEach(cb => cb.checked = false);
    updateSelectionUI();
    
    // إغلاق النافذة تلقائياً وبشكل مضمون بعد اكتمال الحفظ!
    closeCustomModal();
}

export function showQuickActionsModal() {
    const selectedCount = document.querySelectorAll(".hive-select-checkbox:checked").length;
    if (selectedCount === 0) return;

    const html = `
        <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
            <button data-action="quick-action" data-frames="1" data-message="تم إضافة شمع اساس." data-stock-type="frames" data-stock="0" style="background: var(--success-color); padding: 10px; font-size: 0.9em;"><i class="fas fa-plus"></i> شمع اساس</button>
            <button data-action="quick-action" data-frames="1" data-message="تم إضافة إطار ممطوط." data-stock-type="frames" data-stock="0" style="background: var(--success-color); padding: 10px; font-size: 0.9em;"><i class="fas fa-plus"></i> إطار ممطوط</button>
            <button data-action="quick-action" data-frames="1" data-message="تم إضافة إطار عسل." data-stock-type="honey" data-stock="1" style="background: var(--success-color); padding: 10px; font-size: 0.9em;"><i class="fas fa-plus"></i> إطار عسل</button>
            <button data-action="quick-action" data-frames="1" data-message="تم إضافة إطار كرس." data-stock-type="pollen" data-stock="1" style="background: var(--success-color); padding: 10px; font-size: 0.9em;"><i class="fas fa-plus"></i> إطار كرس</button>
            
            <button data-action="quick-action" data-frames="-1" data-message="تم سحب إطار شمع اساس." data-stock-type="frames" data-stock="0" style="background: var(--danger-color); padding: 10px; font-size: 0.9em;"><i class="fas fa-minus"></i> شمع اساس</button>
            <button data-action="quick-action" data-frames="-1" data-message="تم سحب إطار ممطوط." data-stock-type="frames" data-stock="0" style="background: var(--danger-color); padding: 10px; font-size: 0.9em;"><i class="fas fa-minus"></i> إطار ممطوط</button>
            <button data-action="quick-action" data-frames="-1" data-message="تم سحب إطار عسل." data-stock-type="honey" data-stock="-1" style="background: var(--danger-color); padding: 10px; font-size: 0.9em;"><i class="fas fa-minus"></i> إطار عسل</button>
            <button data-action="quick-action" data-frames="-1" data-message="تم سحب إطار كرس." data-stock-type="pollen" data-stock="-1" style="background: var(--danger-color); padding: 10px; font-size: 0.9em;"><i class="fas fa-minus"></i> إطار كرس</button>
            
            <hr style="grid-column: 1 / -1; width: 100%; border-color: var(--border-color); margin: 5px 0;">
            
            <button data-action="add-bulk-review-task" data-label="شمع اساس" style="background: var(--info-color); padding: 10px; font-size: 0.9em; grid-column: 1 / -1;"><i class="fas fa-flag"></i> علم لوضع شمع أساس</button>
            <button data-action="add-bulk-review-task" data-label="تقسيم" style="background: var(--warning-color); color: #333; padding: 10px; font-size: 0.9em; grid-column: 1 / -1;"><i class="fas fa-cut"></i> علم للتقسيم</button>
        </div>
    `;

    showModal({
        title: "⚡ إجراء سريع لـ (" + selectedCount + ") خلايا",
        message: "اختر الإجراء ليتم تطبيقه فوراً:",
        customHTML: html,
        showConfirm: false,
        cancelText: "إلغاء"
    });
}

// مراقبة النقر على أي مكان في الجدول لتحديث الشريط العائم بصمت
document.addEventListener('change', function(e) {
    if (e.target.classList.contains('hive-select-checkbox') || e.target.id === 'select-all-hives') {
        updateSelectionUI();
    }
});
