// ==========================================
// إعداد Firebase (Modular SDK v9+) (استبدل بالقيم الخاصة بك)
// ==========================================
import { initializeApp } from 'firebase/app';
import {
    initializeFirestore,
    getFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyAcr5pFbTdOaJtBsGJP4fBVlUHu0JW1iVQ",
    authDomain: "beehivepro-450.firebaseapp.com",
    projectId: "beehivepro-450",
    storageBucket: "beehivepro-450.firebasestorage.app",
    messagingSenderId: "187215961506",
    appId: "1:187215961506:web:4051c7d86a5ce9115766fb",
    measurementId: "G-3DEXZHD6HD"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);

// --- دعم العمل بدون إنترنت (Offline) ---
// في الـ SDK الحديث (v9+) نفعّل الكاش الدائم عبر initializeFirestore
// بدلاً من enablePersistence القديمة. persistentMultipleTabManager يسمح
// بمزامنة الكاش بين عدة تبويبات مفتوحة لنفس الموقع بدون تعارض.
// بعض المتصفحات (وضع التصفح الخاص، أو دعم IndexedDB محدود) قد ترفض
// تفعيل الكاش الدائم؛ في هذه الحالة نرجع تلقائياً لنسخة الذاكرة العادية
// حتى لا يتعطل التطبيق بالكامل.
let db;
try {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
        }),
    });
} catch (err) {
    console.warn('تعذر تفعيل الكاش الدائم لـ Firestore، سيتم استخدام الوضع العادي:', err);
    db = getFirestore(app);
}
export { db };

export const auth = getAuth(app);
