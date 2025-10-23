


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .then(() => console.log('✅ Service Worker Registered (Offline Ready)'))
      .catch(err => console.error('Service Worker Error:', err));
  });
}




