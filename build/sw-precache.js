// ==========================================
// إضافة Vite صغيرة: تحديث كاش الـ service worker تلقائياً بعد كل بناء
// ==========================================
// المشكلة: Vite يسمّي ملفات الحزمة بأسماء فيها بصمة (مثل assets/index-a1b2c3.js)
// وتتغير هذه الأسماء مع كل تعديل، فلا يمكن كتابتها يدوياً في service-worker.js.
// الحل: بعد البناء نقرأ قائمة ملفات dist/assets ونضعها في service-worker.js،
// ونولّد رقم إصدار للكاش من هذه القائمة (فيتنظف الكاش القديم تلقائياً عند التحديث).
//
// في service-worker.js (داخل public/) يوجد موضعان يملؤهما هذا الملف:
//   /*__PRECACHE_ASSETS__*/   ← قائمة الملفات
//   __BUILD_ID__             ← رقم إصدار الكاش

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const ASSETS_MARK = '/*__PRECACHE_ASSETS__*/';
const BUILD_ID_MARK = '__BUILD_ID__';

function listFiles(dir) {
    return readdirSync(dir).flatMap((name) => {
        const full = join(dir, name);
        return statSync(full).isDirectory() ? listFiles(full) : [full];
    });
}

export function injectPrecache({ outDir, publicDir, log = console }) {
    const target = join(outDir, 'service-worker.js');
    const source = publicDir ? join(publicDir, 'service-worker.js') : null;

    // الأصل: النسخة التي نسخها Vite من public/ إلى dist/. احتياطاً نقرأ من public/ مباشرة.
    const from = existsSync(target) ? target : (source && existsSync(source) ? source : null);
    if (!from) {
        log.warn('[sw-precache] لم أجد service-worker.js — التطبيق لن يعمل بدون إنترنت!');
        return null;
    }

    let code = readFileSync(from, 'utf8');
    if (!code.includes(ASSETS_MARK) || !code.includes(BUILD_ID_MARK)) {
        log.warn('[sw-precache] علامات الاستبدال غير موجودة في service-worker.js — لم يتم تحديث الكاش.');
        return null;
    }

    const assetsDir = join(outDir, 'assets');
    const assets = existsSync(assetsDir)
        ? listFiles(assetsDir)
            .filter((f) => !f.endsWith('.map'))
            .map((f) => './' + relative(outDir, f).split(sep).join('/'))
            .sort()
        : [];

    const buildId = createHash('sha256').update(assets.join('|')).digest('hex').slice(0, 8);

    code = code
        .replace(ASSETS_MARK, assets.map((a) => `'${a}',`).join('\n  '))
        .replace(BUILD_ID_MARK, buildId);

    writeFileSync(target, code);
    return { assets, buildId };
}

export function swPrecache() {
    let cfg;
    return {
        name: 'beehive-sw-precache',
        apply: 'build',
        configResolved(config) {
            cfg = config;
        },
        closeBundle() {
            const res = injectPrecache({
                outDir: resolve(cfg.root, cfg.build.outDir),
                publicDir: cfg.publicDir || null,
                log: cfg.logger ?? console
            });
            if (res) {
                (cfg.logger ?? console).info(
                    `[sw-precache] تم تسجيل ${res.assets.length} ملف في الكاش (إصدار ${res.buildId})`
                );
            }
        }
    };
}
