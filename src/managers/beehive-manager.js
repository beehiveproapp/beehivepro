// ==========================================
// الصنف الرئيسي: BeehiveManager (محدث للمزامنة الفورية)
// ==========================================

import { populateHiveSelector, updateAnalysisCharts } from '../charts/analysis-tab.js';
import { initializeAnalysisCharts } from '../charts/chart-setup.js';
import { showHiveHistory } from '../charts/stats-views.js';
import { DBHelper } from '../core/db-helper.js';
import { state } from '../core/state.js';
import { beehiveManager, debounce, getElement } from '../core/utils.js';
import { generateSiteRecommendations } from '../features/recommendations.js';
import { updateStarCalculator } from '../features/star-seasons.js';
import { FirebaseHelper } from '../services/firebase-helper.js';
import { updateSelectionUI } from '../ui/floating-actions.js';
import { hideModal, showModal, showNotification } from '../ui/notifications.js';

export function BeehiveManager(siteId) {
    this.siteId = siteId;
    this.sortState = { column: 2, direction: "desc" };

    this.loadHives = async () => {
        const allRecords = await DBHelper.getAll("hives", "siteId", this.siteId);
        const latestMap = new Map();
        allRecords.forEach(record => {
            if (!latestMap.has(record.hiveId) || new Date(record.date) > new Date(latestMap.get(record.hiveId).date)) {
                latestMap.set(record.hiveId, record);
            }
        });
        return Array.from(latestMap.values());
    };

    this.loadHistory = () => DBHelper.getAll("hives", "siteId", this.siteId);
    
    this.loadHistoryForHive = async (hiveId) => {
        const records = await DBHelper.getAll("hives", "siteAndHive", IDBKeyRange.only([this.siteId, parseInt(hiveId)]));
        return records.sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    this.getUniqueHiveIds = async () => {
        const hives = await this.loadHives();
        const ids = new Set(hives.map(h => h.hiveId));
        return Array.from(ids).sort((a, b) => a - b);
    };

    this.loadTasks = () => DBHelper.getAll("tasks", "siteId", this.siteId);

    // --- تعديل: دالة الحفظ مع الرفع المباشر ---
    this.saveHive = async () => {
        const id = parseInt(getElement("hive-id").value);
        const frames = parseInt(getElement("frames").value);
        if (isNaN(id) || isNaN(frames) || frames < 1 || id < 1) return showNotification("الرقم وعدد الإطارات مطلوبان.", "error");

        const record = {
            hiveId: id,
            siteId: this.siteId,
            date: new Date().toISOString(),
            frames: frames,
            queenStatus: getElement("queen-status").value,
            queenYear: getElement("queen-year").value.trim(),
            queenMarked: getElement("queen-marked").value,
            notes: getElement("notes").value.trim(),
            honeyFrames: parseInt(getElement("honey-frames").value) || 0,
            pollenFrames: parseInt(getElement("pollen-frames").value) || 0
        };

        // 1. الحفظ محلياً
        const newRecordId = await DBHelper.add("hives", record);
        record.recordId = newRecordId;
        
        // 2. تحديث الشاشة والإشعار فوراً (قبل السحابة)
        this.refreshUI();
        this.clearInputs();
        showNotification(`تم حفظ فحص الخلية رقم ${id} بنجاح.`, "success");
        
        // 3. الرفع للسحابة في الخلفية
        if (FirebaseHelper.currentUser) {
            FirebaseHelper.saveItem("hives", newRecordId, record).catch(e => console.log("سيتم الرفع لاحقاً"));
        }
    };

    // --- تعديل: دالة الإجراء الجماعي مع الرفع المباشر وتثبيت الشاشة ---
    this.applyBulkAction = async (hiveIds, framesChange, noteText, stockType, stockChange) => {
        const allHives = await this.loadHives();
        const targets = allHives.filter(h => hiveIds.includes(h.hiveId));
        const itemsToSync = [];

        for (const hive of targets) {
            const newRecord = { ...hive };
            delete newRecord.recordId;
            newRecord.date = new Date().toISOString();
            
            if (framesChange !== 0) newRecord.frames = Math.max(1, newRecord.frames + framesChange);
            
            if (stockChange !== 0) {
                if (stockType === 'honey') newRecord.honeyFrames = Math.max(0, (newRecord.honeyFrames || 0) + stockChange);
                else if (stockType === 'pollen') newRecord.pollenFrames = Math.max(0, (newRecord.pollenFrames || 0) + stockChange);
            }

            newRecord.notes = noteText;
            
            const newId = await DBHelper.add("hives", newRecord);
            newRecord.recordId = newId;
            itemsToSync.push(newRecord);
        }
        
        // 🔒 التقاط موضع الشاشة الدقيق قبل التحديث
        const scrollContainer = document.querySelector('.content-area');
        const currentScroll = scrollContainer ? scrollContainer.scrollTop : 0;
        const bodyScroll = document.documentElement.scrollTop || document.body.scrollTop;

        this.refreshUI();

        // 🔒 استعادة موضع الشاشة وتحديث شريط التحديد العائم فوراً
        setTimeout(() => {
            if (scrollContainer) scrollContainer.scrollTop = currentScroll;
            window.scrollTo(0, bodyScroll);
            updateSelectionUI(); // إخفاء الشريط وتصفير العداد
        }, 10);

        if (FirebaseHelper.currentUser) {
            itemsToSync.forEach(item => {
                FirebaseHelper.saveItem("hives", item.recordId, item).catch(e => console.log("sync pending"));
            });
        }
    };

    // --- تعديل: دالة الحذف مع الحذف المباشر من السحابة ---
    this.deleteHive = (id) => {
        showModal({
            title: "تأكيد الحذف",
            message: `هل أنت متأكد من حذف الخلية رقم ${id} وجميع سجلاتها؟`,
            onConfirm: async () => {
                // 1. جلب البيانات محلياً بسرعة (نحتاج المعرفات للحذف السحابي لاحقاً)
                const hivesToDelete = await DBHelper.getAll("hives", "siteAndHive", IDBKeyRange.only([this.siteId, id]));

                // 2. الحذف المحلي فوراً
                await DBHelper.deleteByIndex("hives", "siteAndHive", IDBKeyRange.only([this.siteId, id]));
                
                // 3. تحديث الشاشة وإغلاق النافذة فوراً (سلاسة تامة)
                this.refreshUI();
                showNotification(`تم حذف الخلية رقم ${id}.`, "info");
                hideModal();

                // 4. الحذف من السحابة في الخلفية (بدون await)
                if (FirebaseHelper.currentUser) {
                    // نقوم بإنشاء دالة غير متزامنة لتعمل في الخلفية
                    (async () => {
                        try {
                            for (const h of hivesToDelete) {
                                if (h.recordId) await FirebaseHelper.deleteItem("hives", h.recordId);
                            }
                            console.log("تمت مراجعة الحذف السحابي في الخلفية");
                        } catch (e) {
                            console.log("سيتم الحذف السحابي عند توفر الاتصال");
                        }
                    })();
                }
            }
        });
    };

    this.calculateHealthScore = (hive) => {
        let score = 50 + Math.min(5 * (hive.frames - 1), 40);
        if (hive.queenStatus === "ملكة") score += 30;
        else if (hive.queenStatus === "مكذبة") score -= 50;
        
        if (hive.notes && ["فاروا", "مرض", "ضعيفة", "مشكلة"].some(w => hive.notes.includes(w))) {
            score -= 20;
        }
        return Math.max(0, Math.min(100, Math.round(score)));
    };

    this.getStockStatus = (hive) => {
        const h = hive.honeyFrames || 0;
        const p = hive.pollenFrames || 0;
        if (h < 2 || p < 1) return `<span style="color: var(--deficit-color); font-weight: bold;">⚠️ نقص (${h}/${p})</span>`;
        if (h > 5 || p > 2) return `<span style="color: var(--excess-color); font-weight: bold;">✅ فائض (${h}/${p})</span>`;
        return `متوازن (${h}/${p})`;
    };

    this.displayHives = async () => {
        const tbody = getElement("hives-table-body");
        let hives = await this.loadHives();
        const filterText = getElement("hive-filter-input").value.toLowerCase();
        
        // 1. تطبيق فلتر البحث النصي
        if (filterText) {
            hives = hives.filter(h => String(h.hiveId).includes(filterText) || (h.notes && h.notes.toLowerCase().includes(filterText)));
        }

        // 2. تطبيق الفلتر السريع (تحسين الأداء بتطبيق الفلاتر في خطوة واحدة)
        if (state.currentQuickFilter !== 'all') {
            hives = hives.filter(h => {
                switch (state.currentQuickFilter) {
                    case 'strong': return h.frames >= 7;
                    case 'medium': return h.frames >= 4 && h.frames <= 6;
                    case 'weak': return h.frames < 4;
                    case 'queen-issue': return h.queenStatus !== "ملكة";
                    default: return true;
                }
            });
        }

        // 3. ترتيب الخلايا
        this.sortHives(hives, this.sortState.column, this.sortState.direction);

        // 4. بناء الـ DOM (استخدام DocumentFragment لأداء أفضل)
        const fragment = document.createDocumentFragment();
        hives.forEach(hive => {
            const score = this.calculateHealthScore(hive);
            const hue = score * 0.01 * 120; // 0=red, 120=green
            
            // 🎨 تحديد تصنيف الخلية ولون البطاقة بناءً على عدد الإطارات
            let strengthClass = "";
            if (hive.frames >= 7) strengthClass = "hive-strong";
            else if (hive.frames >= 4) strengthClass = "hive-medium";
            else strengthClass = "hive-weak";

            const row = document.createElement("tr");
            row.className = strengthClass; // 👈 إضافة كلاس اللون للصف/البطاقة
            
            // إضافة سمة (data-label) لكل td لدعم شكل البطاقات في الموبايل
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="hive-select-checkbox" data-hive-id="${hive.hiveId}">
                    <span class="mobile-only-id" style="display:none; font-weight:bold; margin-right:8px; color:var(--header-color);">خلية رقم ${hive.hiveId}</span>
                </td>
                <td data-label="الرقم">${hive.hiveId}</td>
                <td data-label="الإطارات">${hive.frames}</td>
                <td data-label="صحة الخلية"><div class="health-score" style="background-color: hsl(${hue}, 80%, 40%);">${score}%</div></td>
                <td data-label="حالة الملكة">${hive.queenStatus} <span style="font-size:0.8em; opacity:0.8;">(سنة ${hive.queenYear || "?"})</span></td>
                <td data-label="المخزون">${this.getStockStatus(hive)}</td>
                <td data-label="ملاحظات" class="notes-cell" data-hive-number="${hive.hiveId}">
                    <pre style="white-space: pre-wrap; max-height: 60px; overflow-y: auto; font-size: 0.9em; margin:0;">${hive.notes || "لا يوجد"}</pre>
                </td>
                <td data-label="إجراءات" class="actions-cell">
                    <button title="تعديل"><i class="fas fa-pencil-alt"></i></button>
                    <button style="background-color: var(--info-color);" title="عرض السجل"><i class="fas fa-history"></i></button>
                    <button style="background-color: var(--danger-color);" title="حذف"><i class="fas fa-trash-alt"></i></button>
                </td>`;

            const [editBtn, historyBtn, deleteBtn] = row.querySelectorAll(".actions-cell button");
            editBtn.addEventListener("click", () => beehiveManager.getActive().loadHiveForEdit(hive.hiveId));
            historyBtn.addEventListener("click", () => showHiveHistory(hive.hiveId));
            deleteBtn.addEventListener("click", () => beehiveManager.getActive().deleteHive(hive.hiveId));
            
            // إظهار رقم الخلية بجانب الـ Checkbox في وضع الموبايل فقط
            if (window.innerWidth <= 768) {
                row.querySelector('.mobile-only-id').style.display = 'inline';
                row.children[1].style.display = 'none'; // إخفاء عمود الرقم الأصلي لتجنب التكرار
            }
            
            fragment.appendChild(row);
        });
        
        tbody.innerHTML = "";
        tbody.appendChild(fragment);
        getElement("select-all-hives").checked = false;

        // تحديث أيقونات الفرز
        const headers = document.querySelectorAll("th.sortable");
        headers.forEach((th, index) => {
            const oldIcon = th.querySelector('i');
            if (oldIcon) oldIcon.remove();
            const icon = document.createElement('i');
            icon.style.marginRight = "8px";
            if (this.sortState.column === index) {
                icon.className = this.sortState.direction === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
                icon.style.color = "var(--header-alt-color)";
            } else {
                icon.className = "fas fa-sort";
                icon.style.opacity = "0.3";
            }
            th.appendChild(icon);
        });
    };

    this.calculateDashboardStats = async function () {
        const hives = await this.loadHives();
        const total = hives.length;
        if (total === 0) return { total: 0, avgFrames: 0, strongPct: 0, weakPct: 0, queenStatus: { "ملكة": 0, "بدون ملكة": 0, "مكذبة": 0 } };

        const stats = { totalFrames: 0, strongCount: 0, weakCount: 0, queenStatus: { "ملكة": 0, "بدون ملكة": 0, "مكذبة": 0 } };
        hives.forEach(h => {
            stats.totalFrames += h.frames;
            if (h.frames > 6) stats.strongCount++;
            if (h.frames < 4) stats.weakCount++;
            stats.queenStatus[h.queenStatus] = (stats.queenStatus[h.queenStatus] || 0) + 1;
        });

        return {
            total: total,
            avgFrames: (stats.totalFrames / total).toFixed(1),
            strongPct: (stats.strongCount / total * 100).toFixed(0),
            weakPct: (stats.weakCount / total * 100).toFixed(0),
            queenStatus: stats.queenStatus
        };
    };

    this.displayDashboard = async function () {
        const stats = await this.calculateDashboardStats();
        getElement("db-total-hives").textContent = stats.total;
        getElement("db-avg-frames").textContent = stats.avgFrames;
        getElement("db-strong-hives").textContent = stats.strongPct + "%";
        getElement("db-weak-hives").textContent = stats.weakPct + "%";

        const totalQueens = Object.values(stats.queenStatus).reduce((a, b) => a + b, 0);
        if (totalQueens > 0) {
            const getPct = k => (stats.queenStatus[k] || 0) / totalQueens * 100;
            const p1 = getPct("ملكة");
            const p2 = p1 + getPct("بدون ملكة");
            getElement("queen-pie-chart").style.background = `conic-gradient(var(--success-color) 0% ${p1}%, var(--warning-color) ${p1}% ${p2}%, var(--danger-color) ${p2}% 100%)`;
        } else {
            getElement("queen-pie-chart").style.background = "#ccc";
        }
    };

    this.displayTasks = async function () {
        const tasks = await this.loadTasks();
        const list = getElement("todo-list");
        list.innerHTML = tasks.length ? "" : '<li style="text-align: center; color: var(--text-color);">لا توجد مهام.</li>';
        tasks.forEach(task => {
            list.innerHTML += `<li><span>${task.text}</span><button class="delete-task" data-action="delete-task" data-id="${task.id}"><i class="fas fa-times-circle"></i></button></li>`;
        });
    };

    // --- تعديل: إضافة مهمة مع الرفع المباشر ---
    this.addTask = async function () {
        const input = getElement("todo-input");
        const text = input.value.trim();
        if (text) {
            const taskData = { siteId: this.siteId, text: text };
            
            // حفظ محلي
            const newTaskId = await DBHelper.add("tasks", taskData);
            taskData.id = newTaskId;

            // تحديث الواجهة فوراً
            input.value = "";
            this.displayTasks();

            // رفع سحابي في الخلفية
            if (FirebaseHelper.currentUser) {
                FirebaseHelper.saveItem("tasks", newTaskId, taskData).catch(e => console.log("sync pending"));
            }
        }
    };

    // --- تعديل: حذف مهمة مع الحذف المباشر ---
    this.deleteTask = async function (id) {
        // 1. الحذف المحلي فوراً
        await DBHelper.delete("tasks", id);
        
        // 2. تحديث القائمة فوراً
        this.displayTasks();
        
        // 3. الحذف من السحابة في الخلفية
        if (FirebaseHelper.currentUser) {
            FirebaseHelper.deleteItem("tasks", id).catch(e => console.log("تأجل الحذف السحابي"));
        }
    };

    this.clearInputs = () => {
        ["hive-id", "queen-year", "notes"].forEach(id => getElement(id).value = "");
        ["queen-status", "queen-marked"].forEach(id => getElement(id).selectedIndex = 0);
        getElement("frames").value = "5";
        getElement("honey-frames").value = "0";
        getElement("pollen-frames").value = "0";
    };

    this.loadHiveForEdit = async (id) => {
        const hives = await this.loadHives();
        const hive = hives.find(h => h.hiveId === id);
        if (!hive) return;

        // بناء واجهة التعديل السريع داخل النافذة المنبثقة
        const html = `
            <div class="form-grid" style="text-align: right; margin-top: 15px;">
                <div>
                    <label>عدد الإطارات:</label>
                    <div class="input-group">
                        <button type="button" data-action="change-value" data-target="edit-frames" data-delta="-1">-</button>
                        <input type="number" id="edit-frames" min="1" max="10" value="${hive.frames}">
                        <button type="button" data-action="change-value" data-target="edit-frames" data-delta="1">+</button>
                    </div>
                </div>
                <div>
                    <label>حالة الملكة:</label>
                    <select id="edit-queen-status">
                        <option value="ملكة" ${hive.queenStatus === 'ملكة' ? 'selected' : ''}>بها ملكة</option>
                        <option value="بدون ملكة" ${hive.queenStatus === 'بدون ملكة' ? 'selected' : ''}>بدون ملكة</option>
                        <option value="مكذبة" ${hive.queenStatus === 'مكذبة' ? 'selected' : ''}>مكذبة</option>
                    </select>
                </div>
                <div>
                    <label>إطارات عسل مختوم:</label>
                    <div class="input-group">
                        <button type="button" data-action="change-value" data-target="edit-honey" data-delta="-1">-</button>
                        <input type="number" id="edit-honey" min="0" value="${hive.honeyFrames || 0}">
                        <button type="button" data-action="change-value" data-target="edit-honey" data-delta="1">+</button>
                    </div>
                </div>
                <div>
                    <label>إطارات كرس (خبز النحل):</label>
                    <div class="input-group">
                        <button type="button" data-action="change-value" data-target="edit-pollen" data-delta="-1">-</button>
                        <input type="number" id="edit-pollen" min="0" value="${hive.pollenFrames || 0}">
                        <button type="button" data-action="change-value" data-target="edit-pollen" data-delta="1">+</button>
                    </div>
                </div>
                <div style="grid-column: 1 / -1;">
                    <label>إضافة ملاحظة جديدة (اختياري):</label>
                    <textarea id="edit-notes" rows="2" placeholder="تم فحص الخلية..."></textarea>
                </div>
            </div>
        `;

        showModal({
            title: `✏️ تعديل سريع: خلية رقم ${hive.hiveId}`,
            message: "",
            customHTML: html,
            confirmText: "حفظ السجل",
            onConfirm: async () => {
                const frames = parseInt(getElement("edit-frames").value);
                if (isNaN(frames) || frames < 1) return showNotification("عدد الإطارات غير صالح.", "error");

                const record = {
                    hiveId: hive.hiveId,
                    siteId: this.siteId,
                    date: new Date().toISOString(),
                    frames: frames,
                    queenStatus: getElement("edit-queen-status").value,
                    queenYear: hive.queenYear, // الحفاظ على البيانات السابقة
                    queenMarked: hive.queenMarked,
                    notes: getElement("edit-notes").value.trim(),
                    honeyFrames: parseInt(getElement("edit-honey").value) || 0,
                    pollenFrames: parseInt(getElement("edit-pollen").value) || 0
                };

                // 1. الحفظ محلياً
                const newRecordId = await DBHelper.add("hives", record);
                record.recordId = newRecordId;
                
                // 2. إغلاق النافذة
                hideModal();
                
                // 3. التقاط موضع التمرير (Scroll Position) الحالي لمنع الشاشة من القفز
                const scrollContainer = document.querySelector('.content-area');
                const currentScroll = scrollContainer ? scrollContainer.scrollTop : 0;
                const bodyScroll = document.documentElement.scrollTop || document.body.scrollTop;
                
                // 4. تحديث الجدول الصامت
                this.refreshUI();
                
                // 5. تثبيت الشاشة في مكانها فوراً بعد التحديث
                setTimeout(() => {
                    if (scrollContainer) scrollContainer.scrollTop = currentScroll;
                    window.scrollTo(0, bodyScroll);
                }, 10);

                showNotification(`تم حفظ الفحص الجديد للخلية ${hive.hiveId}`, "success");

                // 6. المزامنة في الخلفية
                if (typeof FirebaseHelper !== 'undefined' && FirebaseHelper.currentUser) {
                    FirebaseHelper.saveItem("hives", newRecordId, record).catch(e => console.log("sync pending"));
                }
            }
        });
    };

    this.refreshUI = debounce(async () => {
        this.displayDashboard();
        this.displayHives();
        this.displayTasks();
        
        // قراءة حالة المستشار مباشرة من زر التفعيل في الشاشة لضمان عدم اختفائه
        const recsCheckbox = getElement("recs-feature-checkbox");
        const recsEnabled = recsCheckbox ? recsCheckbox.checked : true;
        
        if (recsEnabled) {
            generateSiteRecommendations(this);
        } else {
            getElement("site-recommendations-list").innerHTML = "";
        }
    }, 150);

    this.showMainTab = async (tabId) => {
        getElement("global-stats-view").style.display = "none";
        getElement("site-comparison-view").style.display = "none";
        getElement("standard-view-wrapper").style.display = "block";

        document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
        document.querySelectorAll(".main-tabs .tab-button").forEach(el => el.classList.remove("active"));
        
        getElement(tabId).classList.add("active");
        document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add("active");

        if (tabId === "analysis-tab") {
            initializeAnalysisCharts();
            await populateHiveSelector();
            updateAnalysisCharts();
        } else if (tabId === "stars-tab") {
            updateStarCalculator();
        }
    };

    this.sortHives = (hives, colIndex, direction) => {
        const key = ["hiveId", "frames", "health", "queenStatus", "stock"][colIndex];
        if (!key) return;

        hives.sort((a, b) => {
            let valA, valB;
            if (key === "health") {
                valA = this.calculateHealthScore(a);
                valB = this.calculateHealthScore(b);
            } else if (key === "stock") {
                valA = (a.honeyFrames || 0) + (a.pollenFrames || 0);
                valB = (b.honeyFrames || 0) + (b.pollenFrames || 0);
            } else {
                valA = a[key];
                valB = b[key];
            }

            if (typeof valA === "number") {
                return direction === "asc" ? valA - valB : valB - valA;
            } else {
                return direction === "asc" ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
            }
        });
    };

    this.sortTable = async (colIndex) => {
        this.sortState.direction = (this.sortState.column === colIndex && this.sortState.direction === "asc") ? "desc" : "asc";
        this.sortState.column = colIndex;
        
        const siteData = await DBHelper.get("sites", this.siteId);
        siteData.sortState = this.sortState;
        await DBHelper.put("sites", siteData);
        
        this.displayHives();
    };
}
