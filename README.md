# إدارة المناحل المتقدمة — مشروع Vite

## التشغيل
يتطلب **Node.js 20.19+ أو 22.12+** (متطلب Vite 8).

```bash
npm install          # مرة واحدة: يحمّل Vite
npm run dev          # تطوير محلي مع تحديث فوري  (http://localhost:5173)
npm run build        # ينتج مجلد dist/ = النسخة النهائية المضغوطة
npm run preview      # معاينة dist/ محلياً قبل الرفع
```
لتجربة التطبيق على الجوال أثناء التطوير (نفس شبكة الواي فاي): `npm run dev -- --host`

## النشر
ارفع **محتويات مجلد `dist/` فقط** إلى الاستضافة (وليس المشروع كله). يعمل على أي رابط `https`
أو مجلد فرعي بدون تعديل (`base: './'`).

## ماذا يفعل Vite هنا؟
- يدمج كل ملفات `src/**/*.js` و24 ملف CSS في **ملف JS واحد + ملف CSS واحد** مضغوطين،
  باسم فيه بصمة (`assets/index-xxxx.js`) فيصل التحديث للمستخدمين تلقائياً.
- الـ service worker يُحدَّث تلقائياً بعد كل بناء (قائمة الملفات + رقم إصدار الكاش) عبر
  `build/sw-precache.js`. لا تعدّل علامتي `/*__PRECACHE_ASSETS__*/` و`__BUILD_ID__` في `public/service-worker.js`.
- مكتبات Firebase (Modular v9+) وChart.js وFont Awesome أصبحت جميعها مُدارة عبر npm
  (`package.json` → `dependencies`) ومُستوردة داخل ملفات `src/*.js`، بدل تحميلها من CDN.
  هذا يعني أنها تُضغط مع باقي الكود في `assets/index-xxxx.js` وتُخزَّن تلقائياً في
  كاش الأوفلاين — لا حاجة لذكرها يدوياً في `service-worker.js`.

## البنية
```
├── index.html               ← الصفحة (HTML فقط)
├── vite.config.js
├── package.json
├── build/sw-precache.js     ← إضافة تحدّث كاش الـ service worker
├── public/                  ← تُنسخ إلى dist/ كما هي
│   ├── manifest.json
│   ├── service-worker.js
│   └── icon-192.png / icon-512.png
└── src/
    ├── main.js              ← نقطة الدخول
    ├── css/                 ← main.css يستورد الـ 24 ملفاً بترتيب ثابت
    ├── config/              ← إعداد Firebase
    ├── core/                ← state، الأدوات، قاعدة البيانات المحلية
    ├── services/            ← مزامنة السحابة، استيراد/تصدير
    ├── ui/                  ← الإشعارات، الثيم، السحب، الجولة، النوافذ
    ├── charts/              ← الرسوم والتحليلات
    ├── features/            ← النجوم الفلكية، المستشار الذكي، خلية التواصل
    ├── managers/            ← BeehiveManager وإدارة المواقع
    ├── auth/                ← شاشات تسجيل الدخول
    ├── app/                 ← التهيئة، ربط الأحداث (event-bindings)، bootstrap
    └── pwa/                 ← تسجيل الـ service worker (في النسخة النهائية فقط)
```

## قواعد مهمة عند التعديل
1. **الحالة المشتركة**: وحدات ES لا تسمح لملف بتعديل متغير مستورد. لذلك المتغيرات التي تتغير
   (`sites`, `activeSiteId`, `chartsInitialized`, `globalCharts`, `comparisonCharts`,
   `currentQuickFilter`) موجودة في الكائن `state` داخل `src/core/state.js`
   (مثال: `state.sites`). أما `managers` و`analysisCharts` فتُستورد مباشرة.
2. **أزرار وعناصر HTML**: لا تُستخدم `onclick`/`onchange` مضمّنة في `index.html` أو قوالب
   `innerHTML` إطلاقاً. بدلاً من ذلك يحمل العنصر سمة `data-action="اسم-الإجراء"`، وتُضاف
   الدالة المقابلة إلى جدول `actions` (للنقر) أو `changeActions` (للتغيير) داخل
   `src/app/event-bindings.js`.
3. **ملف جديد**: `export` للدالة، ثم `import` حيث تُستخدم (الترتيب يتحدد تلقائياً بالاعتماديات).
4. **ترتيب CSS**: الترتيب في `src/css/main.css` مهم (ملفات لاحقة تعدّل السابقة). لا تغيّره.
5. لو ظهرت مشكلة في تنسيق النسخة النهائية فقط، جرّب `build.cssMinify: false` في `vite.config.js`
   للتأكد إن كان الضغط هو السبب.
