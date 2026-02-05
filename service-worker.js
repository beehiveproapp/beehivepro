const CACHE_NAME = 'beehive-pro-v5';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './libs/font-awesome/all.min.css',
    './libs/chart.js',
    './libs/firebase/firebase-app-compat.js',
    './libs/firebase/firebase-firestore-compat.js',
    './libs/firebase/firebase-auth-compat.js'
];

// تثبيت عامل الخدمة وتخزين الملفات
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// تفعيل عامل الخدمة وتنظيف الكاش القديم
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// استراتيجية الجلب (Network First, falling back to Cache)
self.addEventListener('fetch', (event) => {
    // استثناء طلبات Firebase والمواقع الخارجية الديناميكية
    if (event.request.url.includes('firestore.googleapis.com') || 
        event.request.url.includes('googleapis.com')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .catch(() => {
                return caches.match(event.request);
            })
    );
});