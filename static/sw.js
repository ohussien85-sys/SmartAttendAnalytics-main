self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('smart-attend-cache').then((cache) => {
      return cache.addAll([
        '/login',
        '/static/css/bootstrap.min.css' // أضف المسارات الأساسية التي تريد حفظها
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
self.addEventListener('push', function(event) {
    let data = {};
    if (event.data) {
        data = event.data.json();
    }

    const title = data.title || 'تنبيه محاضرة';
    const options = {
        body: data.body || 'هناك تحديث جديد بخصوص المحاضرة.',
        icon: '/static/logo.png', // استخدام الشعار الموجود في المشروع
        badge: '/static/logo.png'
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// التعامل مع النقر على الإشعار لفتح لوحة الطالب مباشرة
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/student_dashboard')
    );
});
self.addEventListener('push', function(event) {
    let data = { title: 'تنبيه محاضرة', body: 'هناك تحديث جديد.' };
    if (event.data) {
        data = event.data.json();
    }

    const options = {
        body: data.body,
        icon: '/static/logo.png',
        badge: '/static/logo.png'
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/student_dashboard')
    );
});