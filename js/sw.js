// ========================================
// 🔔 SERVICE WORKER - KEYON ACCESS
// Maneja notificaciones push y cache
// ========================================

const CACHE_NAME = 'keyon-v2.1';
const ASSETS_TO_CACHE = [
  '/',
  '/index-tailwind-v2.html',
  '/css/styles.css'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker instalándose...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Cacheando recursos...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activación
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ Limpiando cache antiguo:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ========================
// 🔔 NOTIFICACIONES PUSH
// ========================

self.addEventListener('push', (event) => {
  console.log('📩 Push recibido:', event);
  
  let data = {
    title: 'Keyon Access',
    body: 'Tienes una nueva notificación',
    icon: '/img/icon-192.png',
    badge: '/img/badge-72.png',
    tag: 'keyon-notification',
    data: {}
  };
  
  // Parsear datos del push si vienen
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/img/icon-192.png',
    badge: data.badge || '/img/badge-72.png',
    tag: data.tag || 'keyon-' + Date.now(),
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [
      { action: 'ver', title: '👁️ Ver', icon: '/img/icon-ver.png' },
      { action: 'cerrar', title: '❌ Cerrar', icon: '/img/icon-cerrar.png' }
    ],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Click en notificación:', event.notification.tag);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data || {};
  
  if (action === 'cerrar') {
    return;
  }
  
  // Abrir o enfocar la app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of clientList) {
        if (client.url.includes('keyon') && 'focus' in client) {
          // Navegar a la sección específica si hay datos
          if (data.url) {
            client.navigate(data.url);
          }
          return client.focus();
        }
      }
      // Si no hay ventana, abrir una nueva
      if (clients.openWindow) {
        const url = data.url || '/';
        return clients.openWindow(url);
      }
    })
  );
});

// Cerrar notificación
self.addEventListener('notificationclose', (event) => {
  console.log('🔕 Notificación cerrada:', event.notification.tag);
});

// ========================
// 📡 SYNC EN BACKGROUND
// ========================

self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'sync-registros') {
    event.waitUntil(sincronizarRegistrosPendientes());
  }
});

async function sincronizarRegistrosPendientes() {
  // Aquí se sincronizarían registros offline con Firebase
  console.log('📤 Sincronizando registros pendientes...');
}

// ========================
// 🌐 FETCH (Cache strategy)
// ========================

self.addEventListener('fetch', (event) => {
  // Solo cachear requests GET
  if (event.request.method !== 'GET') return;
  
  // Ignorar requests de Firebase y APIs externas
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // No cachear respuestas no exitosas
        if (!response || response.status !== 200) {
          return response;
        }
        // Clonar y cachear
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});

console.log('🔔 Service Worker cargado - Keyon Access v2.1');
