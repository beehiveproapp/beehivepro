// ==========================================
// إدارة البيانات (استيراد / تصدير)
// ==========================================

import { DBHelper } from '../core/db-helper.js';
import { getElement } from '../core/utils.js';
import { hideModal, showModal, showNotification } from '../ui/notifications.js';

export async function exportData() {
    const data = {};
    for (const store of DBHelper.STORES) {
        data[store] = await DBHelper.getAll(store);
    }
    if (Object.values(data).every(arr => arr.length === 0)) {
        showNotification("لا توجد بيانات لتصديرها.", "warning");
    } else {
        showExportModal(JSON.stringify(data, null, 2));
    }
}

function showExportModal(jsonData) {
    showModal({
        title: "تصدير / نسخ احتياطي للبيانات",
        message: "يمكنك مشاركة بياناتك مع تطبيق آخر لحفظها كملف، أو نسخها يدويًا ولصقها في مكان آمن.",
        customHTML: `<textarea readonly style="width: 100%; height: 200px; margin-bottom: 15px; font-family: monospace; direction: ltr; background-color: var(--bg-color); color: var(--text-color);">${jsonData}</textarea>
                     <div id="export-actions" style="display: flex; gap: 10px; justify-content: center;"></div>`,
        showConfirm: false,
        cancelText: "إغلاق"
    });

    const actionsDiv = getElement("export-actions");

    if (navigator.share) {
        const shareBtn = document.createElement("button");
        shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> مشاركة البيانات';
        shareBtn.addEventListener("click", () => {
            navigator.share({
                title: `نسخة احتياطية من بيانات المنحل - ${new Date().toLocaleDateString()}`,
                text: jsonData
            }).then(() => showNotification("تمت المشاركة بنجاح!", "success"))
              .catch(err => console.log("خطأ في المشاركة:", err));
        });
        actionsDiv.appendChild(shareBtn);
    }

    const copyBtn = document.createElement("button");
    copyBtn.innerHTML = '<i class="fas fa-copy"></i> نسخ إلى الحافظة';
    copyBtn.style.backgroundColor = "var(--info-color)";
    copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(jsonData).then(() => {
            showNotification("تم نسخ البيانات إلى الحافظة بنجاح!", "success");
            copyBtn.innerHTML = '<i class="fas fa-check"></i> تم النسخ!';
            setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i> نسخ إلى الحافظة'; }, 2000);
        }).catch(err => showNotification("فشل النسخ!", "error"));
    });
    actionsDiv.appendChild(copyBtn);
}

export function importData() {
    showModal({
        title: "دمج البيانات",
        message: "سيتم دمج البيانات من الملف مع بياناتك الحالية. سيتم تحديث الإعدادات وإضافة سجلات جديدة. هذا الإجراء لا يمكن التراجع عنه.",
        confirmText: "أفهم، متابعة",
        onConfirm: () => {
            hideModal();
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json,text/plain";
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const importedData = JSON.parse(event.target.result);
                        if (!DBHelper.STORES.every(store => Array.isArray(importedData[store]))) {
                            throw new Error("تنسيق الملف غير صالح أو تالف.");
                        }

                        // معالجة تعارض المعرفات (IDs) للمواقع
                        const existingSites = await DBHelper.getAll("sites");
                        const siteMap = new Map(existingSites.map(s => [s.name.toLowerCase(), s.id]));
                        const idMapping = {};

                        if (importedData.sites) {
                            for (const site of importedData.sites) {
                                const siteNameLower = site.name.toLowerCase();
                                if (siteMap.has(siteNameLower)) {
                                    idMapping[site.id] = siteMap.get(siteNameLower);
                                } else {
                                    const newId = "site_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
                                    const newSite = { ...site, id: newId };
                                    await DBHelper.add("sites", newSite);
                                    idMapping[site.id] = newId;
                                }
                            }
                        }

                        const dataStores = ["hives", "tasks"];
                        for (const store of dataStores) {
                            if (importedData[store]) {
                                for (const item of importedData[store]) {
                                    if (item.siteId && idMapping[item.siteId]) {
                                        item.siteId = idMapping[item.siteId];
                                    } else {
                                        continue; // تخطي البيانات اليتيمة
                                    }

                                    // إزالة المعرفات القديمة لإنشاء معرفات جديدة تلقائياً
                                    if (store === "hives" && item.recordId) delete item.recordId;
                                    else if (store === "tasks" && item.id) delete item.id;

                                    await DBHelper.add(store, item);
                                }
                            }
                        }

                        if (importedData.settings) {
                            for (const setting of importedData.settings) {
                                await DBHelper.put("settings", setting);
                            }
                        }

                        showNotification("تم دمج البيانات بنجاح! سيتم إعادة تحميل التطبيق.", "success", 4000);
                        setTimeout(() => window.location.reload(), 4000);
                    } catch (err) {
                        showNotification("فشل دمج البيانات: " + err.message, "error");
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        }
    });
}
