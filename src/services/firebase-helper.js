// ==========================================
// Firebase Helper: إدارة المزامنة السحابية (Modular SDK v9+)
// ==========================================

import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    getDocs,
    onSnapshot,
    query,
    limit,
    serverTimestamp,
} from 'firebase/firestore';
import {
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
} from 'firebase/auth';

import { confirmSignOut, hideFirebaseAuthModal } from '../auth/auth-ui.js';
import { auth, db } from '../config/firebase-config.js';
import { DBHelper } from '../core/db-helper.js';
import { managers, state } from '../core/state.js';
import { beehiveManager, getElement } from '../core/utils.js';
import { BeehiveManager } from '../managers/beehive-manager.js';
import { createSiteButtons, openSite } from '../managers/sites.js';
import { showNotification } from '../ui/notifications.js';

export const FirebaseHelper = {
    isSyncing: false,
    syncInProgress: false,
    currentUser: null,
    unsubscribers: [], 

    clearListeners() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
    },
    
    async init() {
        return new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                this.currentUser = user;
                await this.updateAuthUI(user);
                if (user) {
                    hideFirebaseAuthModal();
                    await this.handleLoginSyncStrategy(user);
                }
                resolve(user);
            });
        });
    },

    // دالة جديدة: رفع عنصر واحد فقط للسحابة (إضافة أو تعديل)
    async saveItem(collectionName, docId, data) {
        if (!this.currentUser) return;
        try {
            const userId = this.currentUser.uid;
            // إضافة طابع زمني ورقم المستخدم
            const dataToUpload = { ...data, lastUpdated: serverTimestamp(), userId: userId };
            
            // التأكد من أن المعرف نصي
            const safeDocId = String(docId);
            
            const docRef = doc(db, "users", userId, collectionName, safeDocId);
            await setDoc(docRef, dataToUpload, { merge: true });
            console.log(`Saved to cloud: ${collectionName}/${safeDocId}`);
        } catch (error) {
            console.error("Cloud Save Error:", error);
            showNotification("فشل الحفظ في السحابة، سيتم المحاولة لاحقاً", "warning");
        }
    },

    // دالة جديدة: حذف عنصر واحد من السحابة
    async deleteItem(collectionName, docId) {
        if (!this.currentUser) return;
        try {
            const userId = this.currentUser.uid;
            const docRef = doc(db, "users", userId, collectionName, String(docId));
            await deleteDoc(docRef);
            console.log(`Deleted from cloud: ${collectionName}/${docId}`);
        } catch (error) {
            console.error("Cloud Delete Error:", error);
        }
    },

    async handleLoginSyncStrategy(user) {
        const userId = user.uid;
        const syncIndicator = getElement("sync-status-indicator");
        syncIndicator.style.display = "block";
        syncIndicator.className = "auth-status signed-in";
        syncIndicator.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري التحقق من بيانات السحابة...`;

        try {
            // هل هذا الحساب هو نفسه آخر حساب تمت مزامنته على هذا الجهاز؟
            // إن كان كذلك فالبيانات المحلية أصلاً مطابقة له، ولا داعي لمسحها
            // وإعادة تنزيلها بالكامل من جديد في كل مرة يسجّل فيها الدخول؛
            // يكفي تفعيل الاستماع اللحظي الذي "يحدّث" فقط ما تغيّر فعلياً.
            const lastSyncedUserSetting = await DBHelper.get("settings", "lastSyncedUserId");
            const isSameAccountAsBefore = lastSyncedUserSetting?.value === userId;

            if (isSameAccountAsBefore) {
                console.log("Same account already synced on this device. Updating instead of re-downloading.");
                syncIndicator.innerHTML = `<i class="fas fa-sync fa-spin"></i> جاري تحديث البيانات...`;
                this.setupRealTimeSync();
            } else {
                const sitesQuery = query(collection(db, "users", userId, "sites"), limit(1));
                const cloudSitesSnapshot = await getDocs(sitesQuery);

                if (!cloudSitesSnapshot.empty) {
                    console.log("Found cloud data for a new/different local account. Downloading...");
                    showNotification("جاري جلب بياناتك من السحابة...", "info");

                    // مسح البيانات المحلية لتجنب التكرار عند الاستيراد من السحابة
                    // (هذا يحدث فقط عند دخول حساب مختلف عن آخر حساب كان مخزّناً
                    // محلياً، أو عند أول دخول لهذا الحساب على هذا الجهاز)
                    await DBHelper.clearStores(["sites", "hives", "tasks", "settings"]);

                    managers.clear();
                    state.sites = [];
                    state.activeSiteId = null;

                    // تفعيل الاستماع للتغييرات (وهو ما سيجلب البيانات فعلياً)
                    this.setupRealTimeSync();

                    syncIndicator.innerHTML = `<i class="fas fa-check-circle"></i> تمت المزامنة`;
                } else {
                    console.log("New user or empty cloud. Uploading local data...");
                    await this.syncLocalToCloud(); // رفع أولي شامل فقط
                    this.setupRealTimeSync();
                }
            }

            // نحفظ هوية الحساب الحالي محلياً، حتى نعرف في المرة القادمة (إن
            // سجّل نفس المستخدم الدخول مجدداً على هذا الجهاز) أن البيانات
            // المحلية مطابقة له فنكتفي بالتحديث بدل إعادة الجلب الكامل.
            await DBHelper.put("settings", { key: "lastSyncedUserId", value: userId });

            setTimeout(() => {
                syncIndicator.innerHTML = `<i class="fas fa-cloud"></i> متصل: ${user.email}`;
            }, 2000);

        } catch (error) {
            console.error("Login Sync Error:", error);
            syncIndicator.innerHTML = `<i class="fas fa-exclamation-triangle"></i> خطأ في الاتصال`;
        }
    },
    
    async updateAuthUI(user) {
        const statusElement = getElement("current-sync-status");
        const syncIndicator = getElement("sync-status-indicator");
        
        if (user) {
            statusElement.innerHTML = `<p>مسجل الدخول: ${user.email}</p>`;
            statusElement.className = "auth-status signed-in";
            
            if(!document.getElementById('logout-btn-settings')) {
                const logoutBtn = document.createElement('button');
                logoutBtn.id = 'logout-btn-settings';
                logoutBtn.style.backgroundColor = 'var(--danger-color)';
                logoutBtn.style.marginTop = '10px';
                logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> تسجيل الخروج';
                logoutBtn.addEventListener("click", confirmSignOut);
                statusElement.appendChild(logoutBtn);
            }
            syncIndicator.style.display = "block";
        } else {
            statusElement.innerHTML = `<p>الحالة: غير مسجل</p>`;
            statusElement.className = "auth-status signed-out";
            syncIndicator.style.display = "none";
        }
    },
    
    // المزامنة الشاملة (تستخدم فقط عند تسجيل الدخول لأول مرة أو الدمج اليدوي)
    async syncLocalToCloud() {
        if (this.syncInProgress || !this.currentUser) return;
        this.syncInProgress = true;
        
        try {
            // رفع المواقع
            const sites = await DBHelper.getAll("sites");
            for (const site of sites) {
                await this.saveItem("sites", site.id, site);
            }
            
            // رفع الخلايا
            const hives = await DBHelper.getAll("hives");
            for (const hive of hives) {
                // نستخدم recordId كمعرف للمستند
                if (hive.recordId) await this.saveItem("hives", hive.recordId, hive);
            }

            // رفع المهام
            const tasks = await DBHelper.getAll("tasks");
            for (const task of tasks) {
                if (task.id) await this.saveItem("tasks", task.id, task);
            }

            // رفع الإعدادات
            const settings = await DBHelper.getAll("settings");
            for (const setting of settings) {
                await this.saveItem("settings", setting.key, setting);
            }
            
        } catch (error) {
            console.error("Full Sync Error:", error);
        } finally {
            this.syncInProgress = false;
        }
    },
    
    setupRealTimeSync() {
        if (!this.currentUser) return;
        const userId = this.currentUser.uid;
        
        this.clearListeners(); // تنظيف قبل البدء

        // الاستماع للمواقع
        const sitesRef = collection(db, "users", userId, "sites");
        const unsubSites = onSnapshot(sitesRef, async (snapshot) => {
            let needsRefresh = false;
            if (snapshot.empty && state.sites.length === 0) return;

            for (const change of snapshot.docChanges()) {
                const siteData = change.doc.data();
                // بعض المستندات القديمة في السحابة لم تكن تخزّن حقل 'id' داخل
                // البيانات نفسها (كان يُعتمد فقط على معرّف المستند في Firestore).
                // لذلك نستخدم معرّف المستند (change.doc.id) كبديل احتياطي هنا،
                // وإلا فشل put لأن مخزن 'sites' ليس له key generator (لا autoIncrement).
                const siteId = siteData.id || change.doc.id;
                if (change.type === "added" || change.type === "modified") {
                    await DBHelper.put("sites", { id: siteId, name: siteData.name, sortState: siteData.sortState });
                    if (!managers.has(siteId)) managers.set(siteId, new BeehiveManager(siteId));
                    needsRefresh = true;
                }
                if (change.type === "removed") {
                    await DBHelper.delete("sites", siteId);
                    managers.delete(siteId);
                    needsRefresh = true;
                }
            }
            if (needsRefresh) {
                state.sites = await DBHelper.getAll("sites");
                await createSiteButtons();
                if (state.sites.length > 0 && !state.sites.find(s => s.id === state.activeSiteId)) openSite(state.sites[0].id);
                else if (state.sites.length > 0 && state.activeSiteId) beehiveManager.getActive().refreshUI();
            }
        });
        this.unsubscribers.push(unsubSites);

        // الاستماع للخلايا
        const hivesRef = collection(db, "users", userId, "hives");
        const unsubHives = onSnapshot(hivesRef, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                const hiveData = change.doc.data();
                // بديل احتياطي: إذا كان المستند قديماً ولا يحتوي حقل recordId
                // داخل بياناته، نستخدم معرّف مستند Firestore نفسه.
                hiveData.recordId = parseInt(hiveData.recordId ?? change.doc.id);

                if (change.type === "added" || change.type === "modified") {
                    if (!isNaN(hiveData.recordId)) await DBHelper.put("hives", hiveData);
                }
                if (change.type === "removed") {
                    const docId = parseInt(change.doc.id); 
                    if(!isNaN(docId)) await DBHelper.delete("hives", docId);
                }
                
                if (beehiveManager.getActive() && hiveData.siteId === state.activeSiteId) {
                    beehiveManager.getActive().refreshUI();
                }
            });
        });
        this.unsubscribers.push(unsubHives);
            
        // الاستماع للمهام
        const tasksRef = collection(db, "users", userId, "tasks");
        const unsubTasks = onSnapshot(tasksRef, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                const taskData = change.doc.data();
                // بديل احتياطي: إذا كان المستند قديماً ولا يحتوي حقل id داخل
                // بياناته، نستخدم معرّف مستند Firestore نفسه.
                taskData.id = parseInt(taskData.id ?? change.doc.id);

                if (change.type === "added" || change.type === "modified") {
                    if (!isNaN(taskData.id)) await DBHelper.put("tasks", taskData);
                }
                if (change.type === "removed") {
                    const docId = parseInt(change.doc.id);
                    if(!isNaN(docId)) await DBHelper.delete("tasks", docId);
                }
                
                if (beehiveManager.getActive()) beehiveManager.getActive().displayTasks();
            });
        });
        this.unsubscribers.push(unsubTasks);
    },

    // دوال المصادقة (بقيت كما هي من ناحية الوظيفة، محدثة للـ Modular API)
    async signInWithGoogle() {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            showNotification("تم تسجيل الدخول بنجاح!", "success");
        } catch (error) {
            console.error("Google sign-in error:", error);
            showNotification("فشل تسجيل الدخول: " + error.message, "error");
        }
    },
    async signInWithEmail(email, password) {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            showNotification("تم تسجيل الدخول بنجاح!", "success");
        } catch (error) {
            console.error("Email sign-in error:", error);
            showNotification("فشل تسجيل الدخول: " + error.message, "error");
        }
    },
    async signUpWithEmail(email, password) {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            showNotification("تم إنشاء الحساب بنجاح!", "success");
        } catch (error) {
            console.error("Sign-up error:", error);
            showNotification("فشل إنشاء الحساب: " + error.message, "error");
        }
    },
    async signOut() {
        try {
            this.clearListeners();
            await firebaseSignOut(auth);

            // مسح الكاش المحلي عند الخروج (تماماً كما يحدث عند الدخول بحساب
            // مختلف)، حتى لا تبقى بيانات هذا الحساب ظاهرة محلياً لأي مستخدم
            // آخر يستخدم نفس الجهاز/المتصفح بعد تسجيل الخروج.
            await DBHelper.clearStores(["sites", "hives", "tasks", "settings"]);
            managers.clear();
            state.sites = [];
            state.activeSiteId = null;

            showNotification("تم تسجيل الخروج ومسح البيانات المحلية", "info");
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error("Sign-out error:", error);
            showNotification("فشل تسجيل الخروج", "error");
        }
    }
};
