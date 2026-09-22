// ==========================================
// إدارة المواقع (Sites Management)
// ==========================================

import { DBHelper } from '../core/db-helper.js';
import { managers, state } from '../core/state.js';
import { beehiveManager, getElement } from '../core/utils.js';
import { FirebaseHelper } from '../services/firebase-helper.js';
import { hideModal, showModal, showNotification } from '../ui/notifications.js';
import { BeehiveManager } from './beehive-manager.js';

export async function enableSiteRename(siteId, nameSpan) {
    const oldName = nameSpan.textContent;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "site-name-input";
    input.value = oldName;

    const save = async () => {
        const newName = input.value.trim();
        if (state.sites.some(s => s.id !== siteId && s.name.toLowerCase() === newName.toLowerCase())) {
            showNotification("هذا الاسم مستخدم بالفعل لموقع آخر.", "error");
        } else if (newName && newName !== oldName) {
            const siteData = await DBHelper.get("sites", siteId);
            siteData.name = newName;
            await DBHelper.put("sites", siteData);
            
            // مزامنة مع السحابة إذا كان المستخدم مسجل الدخول
            if (FirebaseHelper.currentUser) {
                FirebaseHelper.syncLocalToCloud();
            }
            
            if (state.activeSiteId === siteId) getElement("active-location-title").textContent = newName;
            showNotification("تم تحديث اسم الموقع.", "success");
        }
        createSiteButtons();
    };

    input.addEventListener("blur", save);
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") input.blur();
        if (e.key === "Escape") { input.value = oldName; input.blur(); }
    });

    nameSpan.style.display = "none";
    nameSpan.parentNode.insertBefore(input, nameSpan.nextSibling);
    input.focus();
}

export async function createSiteButtons() {
    state.sites = await DBHelper.getAll("sites");
    const container = getElement("sites-menu-content");
    container.innerHTML = "";
    
    state.sites.forEach(site => {
        const btn = document.createElement("button");
        btn.className = "site-button";
        btn.addEventListener("click", (e) => {
            if (!e.target.closest(".site-button-controls")) openSite(site.id);
        });
        btn.innerHTML = `
            <i class="fas fa-warehouse"></i> <span class="sidebar-text site-name-span">${site.name}</span>
            <div class="site-button-controls">
                <button class="site-control-btn" title="إعادة تسمية"><i class="fas fa-pencil-alt"></i></button>
                <button class="site-control-btn" title="حذف"><i class="fas fa-trash-alt" style="color:var(--danger-color)"></i></button>
            </div>`;
        const [renameBtn, deleteBtn] = btn.querySelectorAll(".site-control-btn");
        const nameSpan = btn.querySelector(".site-name-span");
        renameBtn.addEventListener("click", () => enableSiteRename(site.id, nameSpan));
        deleteBtn.addEventListener("click", () => deleteSite(site.id, site.name));
        container.appendChild(btn);
    });

    const addBtn = document.createElement("button");
    addBtn.className = "site-button";
    addBtn.style.backgroundColor = "var(--success-color)";
    addBtn.innerHTML = '<i class="fas fa-plus-circle"></i> <span class="sidebar-text">إضافة موقع جديد</span>';
    addBtn.addEventListener("click", addSite);
    container.appendChild(addBtn);
}

export function deleteSite(id, name) {
    showModal({
        title: `تأكيد حذف الموقع: ${name}`,
        message: `للتأكيد، الرجاء كتابة اسم الموقع "${name}" في الحقل أدناه. سيتم حذف جميع بياناته بشكل نهائي.`,
        customHTML: '<input type="text" id="delete-confirm-input" placeholder="اكتب اسم الموقع هنا" style="margin-top:10px;">',
        confirmText: "حذف نهائي",
        onConfirm: async () => {
            if (getElement("delete-confirm-input").value !== name) {
                return showNotification("الاسم الذي أدخلته غير مطابق!", "error");
            }

            // --- التعامل مع السحابة: حذف البيانات المرتبطة أولاً ---
            if (typeof FirebaseHelper !== 'undefined' && FirebaseHelper.currentUser) {
                showNotification("جاري الحذف من السحابة...", "info");
                
                try {
                    // 1. جلب البيانات المرتبطة لحذفها من السحابة
                    const associatedHives = await DBHelper.getAll("hives", "siteId", id);
                    const associatedTasks = await DBHelper.getAll("tasks", "siteId", id);

                    // 2. حذف الخلايا من السحابة
                    for (const hive of associatedHives) {
                        if (hive.recordId) await FirebaseHelper.deleteItem("hives", hive.recordId);
                    }

                    // 3. حذف المهام من السحابة
                    for (const task of associatedTasks) {
                        if (task.id) await FirebaseHelper.deleteItem("tasks", task.id);
                    }

                    // 4. حذف الموقع نفسه من السحابة
                    await FirebaseHelper.deleteItem("sites", id);
                } catch (e) {
                    console.error("خطأ في الحذف السحابي:", e);
                }
            }
            // --- نهاية التعامل مع السحابة ---

            // الحذف المحلي
            await DBHelper.delete("sites", id);
            await DBHelper.deleteByIndex("hives", "siteId", id);
            await DBHelper.deleteByIndex("tasks", "siteId", id);
            managers.delete(id);
            
            showNotification(`تم حذف الموقع "${name}" بشكل نهائي.`, "info");
            hideModal();
            
            state.sites = state.sites.filter(s => s.id !== id);
            if (state.activeSiteId === id) {
                state.sites.length > 0 ? openSite(state.sites[0].id) : addSite();
            }
            createSiteButtons();
        }
    });
}

export async function addSite() {
    const id = "site_" + Date.now();
    let existingSites = await DBHelper.getAll("sites");
    let num = existingSites.length + 1;
    let name = `الموقع ${num}`;
    
    // التأكد من عدم تكرار الاسم
    while (existingSites.some(s => s.name === name)) {
        num++;
        name = `الموقع ${num}`;
    }

    const newSiteData = { id: id, name: name, sortState: { column: 2, direction: "desc" } };

    // 1. الحفظ المحلي
    await DBHelper.add("sites", newSiteData);
    managers.set(id, new BeehiveManager(id));
    
    // 2. الحفظ السحابي المباشر (بدلاً من المزامنة الكاملة)
    if (FirebaseHelper.currentUser) {
        await FirebaseHelper.saveItem("sites", id, newSiteData);
    }
    
    await createSiteButtons();
    openSite(id);
    showNotification("تم إنشاء موقع جديد بنجاح.", "success");
}

export async function openSite(id) {
    if (!managers.has(id)) managers.set(id, new BeehiveManager(id));
    state.activeSiteId = id;
    await DBHelper.put("settings", { key: "activeSiteId", value: id });

    getElement("global-stats-view").style.display = "none";
    getElement("site-comparison-view").style.display = "none";
    getElement("standard-view-wrapper").style.display = "block";

    const siteData = await DBHelper.get("sites", id);
    getElement("active-location-title").textContent = siteData.name;

    document.querySelectorAll(".site-button").forEach(b => b.classList.remove("active"));
    const activeBtn = Array.from(document.querySelectorAll(".site-button")).find(b => b.innerHTML.includes(siteData.name));
    if (activeBtn) activeBtn.classList.add("active");

    const manager = beehiveManager.getActive();
    manager.sortState = siteData.sortState || { column: 2, direction: "desc" };
    manager.refreshUI();
    manager.showMainTab("dashboard-tab");
}
