const CACHE_NAME = 'beehive-pro-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js'
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
// نحاول الاتصال بالإنترنت أولاً، إذا فشل نأخذ من الكاش
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. استثناء طلبات Firebase Firestore/Auth
  // (Firestore يدير نفسه بنفسه بذكاء، لا تدع Service Worker يتدخل)
  if (requestUrl.origin.includes('firestore.googleapis.com') || 
      requestUrl.origin.includes('identitytoolkit.googleapis.com') ||
      requestUrl.href.includes('firebase')) {
    return; // دع الشبكة أو كاش المتصفح يتعامل معها
  }

  // 2. استراتيجية Stale-While-Revalidate للملفات الثابتة (HTML, CSS, JS)
  // هذا يجعل التطبيق يفتح فوراً بدون نت، ويحدث نفسه إذا وجد نت
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // تحديث الكاش بالنسخة الجديدة في الخلفية
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      }).catch(() => {
          // إذا فشل الاتصال، لا مشكلة، لدينا الكاش
      });

      // إرجاع الكاش فوراً إذا وجد، وإلا ننتظر الشبكة
      return cachedResponse || fetchPromise;
    })
  );
});