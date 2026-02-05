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
  // استثناء طلبات Firebase والمواقع الخارجية الديناميكية من الكاش الصارم
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('googleapis.com')) {
      return; // اترك المتصفح يتعامل معها (فايربيس لديه نظامه الخاص للأوفلاين)
  }

  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});