import { defineConfig } from 'vite';
import { swPrecache } from './build/sw-precache.js';

export default defineConfig({
    // مسارات نسبية في الملفات الناتجة: يعمل الموقع على أي رابط أو مجلد فرعي
    // (مثل GitHub Pages) بدون تعديل، وينسجم مع "./" المستخدمة في service-worker.js
    base: './',

    plugins: [swPrecache()],

    build: {
        outDir: 'dist',
        // نفس مستوى التوافق الذي كان عليه الكود الأصلي (ES2020) حتى لا يُنتج
        // المضغِّط صياغة أحدث لا تدعمها هواتف قديمة
        target: 'es2020'
    }
});
