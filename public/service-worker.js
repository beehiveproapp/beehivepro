const CACHE_NAME = 'beehive-pro-v4-__BUILD_ID__'; // يُستبدل تلقائياً عند البناء
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  // ملفات الحزمة (assets/*): تُضاف تلقائياً عند البناء.
  // Firebase وChart.js وFont Awesome أصبحت الآن جزءاً من هذه الحزمة (مُدارة عبر npm)
  // بدلاً من روابط CDN خارجية، فلم تعد بحاجة لأن تُذكر هنا يدوياً.
  /*__PRECACHE_ASSETS__*/
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

// مهلة قصوى لمحاولة الاتصال بالشبكة: إذا لم يُجب الخادم (أو أي مورد خارجي)
// خلال هذه المدة، نعتبرها فاشلة فوراً ونذهب للكاش، بدل ترك الطلب معلّقاً إلى
// الأبد (وهو ما كان يجمّد شاشة تحميل التطبيق (Splash) عند فتحه بدون إنترنت).
function fetchWithTimeout(request, ms = 4000) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

// استراتيجية الجلب (Network First, falling back to Cache)
// نحاول الاتصال بالإنترنت أولاً، إذا فشل أو تأخر كثيراً نأخذ من الكاش
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // نتعامل فقط مع طلبات نفس النطاق (ملفات التطبيق). أي طلب لنطاق خارجي
  // (Firebase، أو أي مكتبة/سكربت من CDN) نترك المتصفح يتعامل معه بشكل طبيعي
  // دون تدخل الكاش، حتى لا يتعطل تحميل التطبيق كاملاً بسبب مورد خارجي واحد
  // غير متاح أو بطيء أثناء انقطاع الإنترنت.
  if (new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetchWithTimeout(request)
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        // طلب تنقّل (فتح صفحة) ولا توجد نسخة مطابقة تماماً في الكاش:
        // نعرض واجهة التطبيق الرئيسية المخزّنة بدل ترك المتصفح بلا أي رد.
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }

        return Response.error();
      })
  );
});