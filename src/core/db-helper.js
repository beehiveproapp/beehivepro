// ==========================================
// DBHelper: وحدة التعامل مع قاعدة البيانات المحلية
// ==========================================
export const DBHelper = (function () {
    const DB_NAME = 'BeehiveDB';
    // تم رفعها من 1 إلى 2 عمداً. كان الكود القديم يُنشئ المخازن فقط إذا كان
    // oldVersion === 0 (قاعدة بيانات جديدة تماماً). لكن أي متصفح كانت عنده
    // نسخة قديمة من 'BeehiveDB' بالإصدار 1 (من نسخة سابقة/تجريبية للتطبيق
    // بمخازن مختلفة أو ناقصة) كان يفتحها مباشرة دون أن يُطلق onupgradeneeded
    // إطلاقاً (لأن الإصدار المطلوب = الإصدار الموجود = 1)، فتبقى المخازن
    // الناقصة (مثل 'settings') غير موجودة للأبد، وأي محاولة لفتح transaction
    // عليها تفشل بخطأ "NotFoundError: Failed to execute 'transaction'". رفع
    // الرقم هنا يضمن أن onupgradeneeded يُطلق مرة واحدة لكل من لديه قاعدة
    // بيانات قديمة، فتُستكمل أي مخازن ناقصة.
    // تم رفعها من 4 إلى 5 عمداً. السبب: onupgradeneeded (بالأسفل) كان يتحقق
    // فقط من "وجود" كل مخزن (objectStoreNames.contains) قبل إنشائه، لكنه لم
    // يتحقق أبداً من تطابق بنيته (keyPath) مع ما يتوقعه الكود الحالي. لأن
    // IndexedDB لا يسمح بتعديل keyPath لمخزن موجود بالفعل، فأي متصفح كان قد
    // أنشأ مخزناً مثل 'hives' بإصدار قديم جداً (أو أثناء تجربة محلية سابقة
    // لنفس الأصل على localhost) بمسار مفتاح مختلف عن 'recordId' الحالي، يبقى
    // عالقاً بذلك المسار القديم للأبد رغم كل ترقيات الإصدار اللاحقة — وأي
    // put() لاحق (مثل مزامنة Firebase) يفشل بخطأ:
    // "DataError: Evaluating the object store's key path did not yield a value"
    // لأن السجل المُرسَل يحمل 'recordId' لا المفتاح القديم الفعلي. رفع الرقم
    // هنا يُطلق onupgradeneeded من جديد لكل من توقف عند الإصدار 4، حيث تكتشف
    // ensureStore() بالأسفل أي تعارض في keyPath وتعيد بناء المخزن المتضرر
    // (مع نقل بياناته القديمة أولاً) بدل الاكتفاء بفحص الوجود فقط.
    const DB_VERSION = 5;
    let dbInstance;
    const STORES = ['settings', 'sites', 'tasks', 'hives'];

    function promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => {
                // نمنع انتشار الخطأ الافتراضي (الذي يطبعه المتصفح تلقائياً في
                // الكونسول ويُلغي المعاملة) لأننا نتعامل معه بأنفسنا عبر reject.
                event.preventDefault();
                reject(request.error);
            };
        });
    }

    // بعض المتصفحات (خصوصاً Safari على الهاتف) تُلغي معاملات IndexedDB أحياناً
    // بشكل عابر (AbortError) دون سبب واضح من كودنا، خاصة مباشرة بعد فتح
    // الاتصال أو عند ضغط الموارد. هذه دالة عامة تُعيد تنفيذ أي عملية IndexedDB
    // (بمعاملة جديدة تماماً في كل محاولة، لأن المعاملة المُلغاة لا يمكن إعادة
    // استخدامها) عدة مرات قبل الاستسلام فعلياً.
    async function withAbortRetry(operationFactory, { retries = 2, delayMs = 80 } = {}) {
        for (let attempt = 0; ; attempt++) {
            try {
                return await operationFactory();
            } catch (error) {
                const isAbort = error?.name === 'AbortError';
                if (!isAbort || attempt >= retries) throw error;
                console.warn(`عملية IndexedDB أُلغيت (AbortError)، إعادة المحاولة ${attempt + 1}/${retries}...`, error);
                await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
            }
        }
    }

    async function init() {
        if (dbInstance) return Promise.resolve(dbInstance);
        console.log(`فتح قاعدة البيانات '${DB_NAME}' بالإصدار ${DB_VERSION}...`);
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const tx = event.target.transaction; // نفس معاملة الترقية؛ تتيح قراءة/نقل بيانات مخازن موجودة مسبقاً
            const oldVersion = event.oldVersion;
            console.log(`ترقية قاعدة البيانات من الإصدار ${oldVersion} إلى ${DB_VERSION}`);

            // تُنشئ المخزن إن كان غائباً تماماً (هذا الجزء لا يعتمد على قيمة
            // oldVersion، ليُصلح تلقائياً أي قاعدة بيانات ناقصة من أي إصدار
            // سابق). أما إن كان المخزن موجوداً بالفعل، فتتحقق من تطابق مسار
            // مفتاحه (keyPath) مع المتوقع: إن تطابق، يكتفى بالتأكد من وجود كل
            // الفهارس المطلوبة (defineIndexes تتحقق بنفسها قبل الإنشاء، فهي
            // آمنة حتى على مخزن حديث الإنشاء أو قديم سليم). أما إن اختلف —
            // مخزن من إصدار قديم جداً أو من تجربة محلية سابقة على نفس الأصل —
            // فهذا تعارض لا يمكن لـ IndexedDB إصلاحه بتعديل بسيط (keyPath غير
            // قابل للتغيير بعد الإنشاء)، فيُعاد بناء المخزن من الصفر مع محاولة
            // نقل كل سجلاته القديمة إليه أولاً بدل فقدانها بصمت.
            function ensureStore(name, keyPath, autoIncrement, defineIndexes) {
                if (!db.objectStoreNames.contains(name)) {
                    const store = db.createObjectStore(name, { keyPath, autoIncrement });
                    defineIndexes?.(store);
                    return;
                }

                const existingStore = tx.objectStore(name);
                if (existingStore.keyPath === keyPath) {
                    defineIndexes?.(existingStore);
                    return;
                }

                console.warn(`المخزن '${name}' موجود بمسار مفتاح قديم ('${existingStore.keyPath}') يختلف عن المتوقع ('${keyPath}')؛ يُعاد بناؤه مع نقل بياناته القديمة...`);
                const oldRecords = [];
                const cursorRequest = existingStore.openCursor();
                cursorRequest.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        // نحتفظ بالمفتاح القديم الفعلي (primaryKey) مع كل سجل،
                        // لاستخدامه كبديل احتياطي إن لم يحمل السجل نفسه قيمة
                        // عند مسار المفتاح الجديد.
                        oldRecords.push({ key: cursor.primaryKey, value: cursor.value });
                        cursor.continue();
                        return;
                    }
                    db.deleteObjectStore(name);
                    const newStore = db.createObjectStore(name, { keyPath, autoIncrement });
                    defineIndexes?.(newStore);
                    for (const { key, value } of oldRecords) {
                        if (value && value[keyPath] === undefined) value[keyPath] = key;
                        newStore.put(value);
                    }
                    console.warn(`تم نقل ${oldRecords.length} سجلاً من '${name}' القديم إلى البنية الجديدة.`);
                };
                cursorRequest.onerror = (e) => {
                    e.preventDefault();
                    console.error(`تعذّرت قراءة بيانات '${name}' القديمة أثناء الترقية؛ سيُعاد إنشاؤه فارغاً بدل تركه معطوباً.`, cursorRequest.error);
                    db.deleteObjectStore(name);
                    const newStore = db.createObjectStore(name, { keyPath, autoIncrement });
                    defineIndexes?.(newStore);
                };
            }

            ensureStore('settings', 'key', false);
            ensureStore('sites', 'id', false);
            ensureStore('tasks', 'id', true, (store) => {
                if (!store.indexNames.contains('siteId')) store.createIndex('siteId', 'siteId', { unique: false });
            });
            ensureStore('hives', 'recordId', true, (store) => {
                if (!store.indexNames.contains('siteId')) store.createIndex('siteId', 'siteId', { unique: false });
                if (!store.indexNames.contains('hiveId')) store.createIndex('hiveId', 'hiveId', { unique: false });
                if (!store.indexNames.contains('siteAndHive')) store.createIndex('siteAndHive', ['siteId', 'hiveId'], { unique: false });
            });

            console.log("تم التأكد من اكتمال بنية قاعدة البيانات (وإصلاح أي مخزن متعارض).");
        };
        // بدون هذا المعالج، إذا كان هناك تبويب/جلسة قديمة لا تزال فاتحة
        // اتصالاً بإصدار أقدم من BeehiveDB، فإن طلب الترقية يُعلَّق بصمت
        // (لا onsuccess ولا onerror يُطلق أبداً) وتبقى الواجهة معلّقة
        // إلى الأبد بانتظار init(). هذا المعالج يكشف الحالة ويُنبّه
        // المستخدم بدل التجمّد الصامت.
        request.onblocked = () => {
            console.warn("ترقية قاعدة البيانات محظورة: يوجد تبويب/نسخة أخرى من التطبيق مفتوحة بإصدار أقدم. أغلق التبويبات الأخرى وأعد تحميل الصفحة.");
        };
        dbInstance = await promisifyRequest(request);
        console.log("تم الاتصال بقاعدة البيانات بنجاح.");

        // معالج onversionchange: يُطلق على أي اتصال "قديم" مفتوح ومنسي (مثلاً
        // تبويب سابق لم يُغلق فعلياً) بمجرد أن يحاول تبويب آخر (نسخة محدّثة
        // من التطبيق) فتح إصدار أحدث من BeehiveDB. بدون هذا المعالج، يبقى
        // هذا الاتصال القديم مفتوحاً ويحظر (onblocked) ترقية التبويب الآخر
        // إلى الأبد بصمت — وهو بالضبط سبب "تجمّد" الأزرار الذي لوحظ. الحل:
        // نغلق اتصالنا نحن فوراً كي لا نحظر أحداً، ونصفّر dbInstance حتى
        // تُعاد تهيئته تلقائياً في أي استدعاء لاحق لأي عملية DBHelper.
        dbInstance.onversionchange = () => {
            console.warn("تم فتح إصدار أحدث من قاعدة البيانات في تبويب/نسخة أخرى. سيتم إغلاق الاتصال الحالي تلقائياً لتفادي حظر الترقية هناك.");
            dbInstance.close();
            dbInstance = null;
        };

        return dbInstance;
    }

    function getTransactionStore(storeName, mode = 'readonly') {
        const transaction = dbInstance.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    // تفرغ عدة مخازن دفعة واحدة ضمن Transaction واحدة فقط (بدل فتح معاملة
    // منفصلة لكل مخزن). هذا يمنع تضارب/إلغاء المعاملات المتتالية السريعة
    // (AbortError) الذي قد يحدث على بعض المتصفحات (خصوصاً متصفحات الهاتف)
    // عند فتح عدة معاملات readwrite متلاحقة على نفس الاتصال، كما يضمن أن
    // المسح إما ينجح بالكامل أو يفشل بالكامل (بدل حالة جزئية غير متسقة)،
    // ويغلق المعاملة بشكل صريح عبر transaction.oncomplete بدل الاعتماد على
    // نجاح كل طلب على حدة.
    function clearStores(storeNames) {
        return new Promise((resolve, reject) => {
            const transaction = dbInstance.transaction(storeNames, 'readwrite');
            storeNames.forEach((name) => {
                const request = transaction.objectStore(name).clear();
                // نمنع الحدث الافتراضي هنا أيضاً؛ الفشل يُعالَج عبر أحداث
                // المعاملة (oncomplete/onerror/onabort) بالأسفل.
                request.onerror = (event) => event.preventDefault();
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => {
                event.preventDefault();
                reject(transaction.error);
            };
            transaction.onabort = (event) => {
                event.preventDefault();
                reject(
                    transaction.error || new DOMException('DBHelper.clearStores transaction aborted', 'AbortError')
                );
            };
        });
    }

    // كل عمليات القراءة/الكتابة أدناه كانت تفترض أن dbInstance موجود مسبقاً
    // (أي أن شيئاً آخر استدعى init() عند إقلاع التطبيق). لكن بعد إضافة
    // onversionchange التي تُغلق الاتصال وتُصفّر dbInstance تلقائياً عند
    // فتح إصدار أحدث في تبويب آخر، أصبح من الممكن أن يُستدعى get/put/...
    // بعد أن أصبح dbInstance = null، وهذا كان سيرمي TypeError بدل إعادة
    // الاتصال من تلقاء نفسه. لذلك نمرّ عبر init() في بداية كل عملية؛ init()
    // نفسها ترجع فوراً إن كان الاتصال قائماً بالفعل (بدون أي كلفة إضافية).
    return {
        init: init,
        STORES: STORES,
        get: (storeName, key) =>
            withAbortRetry(async () => { await init(); return promisifyRequest(getTransactionStore(storeName).get(key)); }),
        getAll: (storeName, indexName, query) =>
            withAbortRetry(async () => {
                await init();
                const store = getTransactionStore(storeName);
                const source = indexName ? store.index(indexName) : store;
                return promisifyRequest(source.getAll(query));
            }),
        put: (storeName, value) =>
            withAbortRetry(async () => { await init(); return promisifyRequest(getTransactionStore(storeName, 'readwrite').put(value)); }),
        add: (storeName, value) =>
            withAbortRetry(async () => { await init(); return promisifyRequest(getTransactionStore(storeName, 'readwrite').add(value)); }),
        delete: (storeName, key) =>
            withAbortRetry(async () => { await init(); return promisifyRequest(getTransactionStore(storeName, 'readwrite').delete(key)); }),
        clear: (storeName) =>
            withAbortRetry(async () => { await init(); return promisifyRequest(getTransactionStore(storeName, 'readwrite').clear()); }),
        clearStores: (storeNames) => withAbortRetry(async () => { await init(); return clearStores(storeNames); }),
        deleteByIndex: (storeName, indexName, query) =>
            withAbortRetry(async () => {
                await init();
                return new Promise((resolve, reject) => {
                    const cursorRequest = getTransactionStore(storeName, 'readwrite').index(indexName).openCursor(query);
                    cursorRequest.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            cursor.delete();
                            cursor.continue();
                        } else {
                            resolve();
                        }
                    };
                    cursorRequest.onerror = (event) => {
                        event.preventDefault();
                        reject(cursorRequest.error);
                    };
                });
            })
    };
})();
