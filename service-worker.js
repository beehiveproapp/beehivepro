const CACHE_NAME = 'beehive-pro-v2'; // قمنا بتغيير الإصدار لفرض التحديث
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  // أيقونات التطبيق (تأكد من وجودها)
  './icon-192.png', 
  
  // المكتبات الخارجية
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js'
];

// 1. تثبيت: تخزين الملفات الأساسية
self.addEventListener('install', (event) => {
  self.skipWaiting(); // تفعيل التحديث فوراً دون انتظار إغلاق التطبيق
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. تفعيل: تنظيف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim(); // السيطرة الفورية على الصفحات المفتوحة
});

// 3. الجلب: استراتيجية "الشبكة أولاً مع تحديث الكاش" (Network First, update Cache)
self.addEventListener('fetch', (event) => {
  
  // ⛔ هام جداً: تجاهل طلبات Firebase و API
  // نترك مكتبة Firebase تدير التخزين المؤقت لقاعدة البيانات بنفسها
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('formspree.io')) {
      return; 
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // إذا نجح الاتصال بالنت، نقوم بتحديث الكاش بالنسخة الجديدة
        if (!response || response.status !== 200 || response.type !== 'basic') {
            // للتأكد من أننا نخزن ردود CORS (مثل مكتبات CDN)
            if(response.type !== 'cors') return response;
        }

        // استنساخ الاستجابة لأن المتصفح يقرؤها مرة واحدة فقط
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // إذا فشل النت، نأخذ من الكاش
        return caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }
            // صفحة بديلة في حال عدم وجود الصفحة في الكاش (اختياري)
            // return caches.match('./offline.html');
        });
      })
  );
});