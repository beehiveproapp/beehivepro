// ==========================================
// نقطة دخول Vite — تجمع التنسيقات والوحدات في حزمة واحدة
// ==========================================
// معظم الوحدات تُستورد تلقائياً عبر الاعتماديات بينها؛ هنا نستورد فقط ما يعمل
// "بمجرد تحميله" (تسجيل مستمعات الأحداث، تشغيل التطبيق).

import '@fortawesome/fontawesome-free/css/all.min.css';
import './css/main.css';

// مستمعات الأحداث والتفاعل
import './ui/global-listeners.js';
import './ui/swipe-navigation.js';
import './ui/hive-popup.js';
import './ui/floating-actions.js';

// ربط أحداث النقر والتغيير (data-action)، ثم تشغيل التطبيق
import './app/event-bindings.js';
import './app/bootstrap.js';

// PWA
import './pwa/register-sw.js';
