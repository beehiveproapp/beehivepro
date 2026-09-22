// PWA Service Worker Registration
// (لا يُسجَّل أثناء التطوير `npm run dev` حتى لا يتدخل الكاش مع التحديث الفوري)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, (err) => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}
