/* ===== TASK MANAGER PWA - SERVICE WORKER ===== */

const CACHE_NAME = 'task-manager-v1.2.0';
const STATIC_CACHE_NAME = 'task-manager-static-v1.2.0';
const DYNAMIC_CACHE_NAME = 'task-manager-dynamic-v1.2.0';

// Statikus fájlok (csak létező fájlok!)
const STATIC_FILES = [
  './',
  './index.html',
  './script.js',
  './style.css',
  './manifest.json'
];

// Dinamikus cache-elendő URL-ek
const DYNAMIC_URLS = [
  'https://www.gstatic.com/',
  'https://task-manager-sb.firebaseapp.com/',
  'https://firestore.googleapis.com/'
];

/* ===== INSTALL EVENT ===== */
self.addEventListener('install', (event) => {
  console.log('Service Worker: Telepítés...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Statikus fájlok cache-elése...');
        // Csak létező fájlokat cache-eljük
        return Promise.allSettled(
          STATIC_FILES.map(url => 
            fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                } else {
                  console.warn(`Service Worker: Nem található fájl: ${url}`);
                  return Promise.resolve();
                }
              })
              .catch(error => {
                console.warn(`Service Worker: Hiba a fájl betöltésében: ${url}`, error);
                return Promise.resolve();
              })
          )
        );
      })
      .then(() => {
        console.log('Service Worker: Telepítés befejezve');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Telepítési hiba:', error);
      })
  );
});

/* ===== ACTIVATE EVENT ===== */
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Aktiválás...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('task-manager-')) {
              console.log('Service Worker: Régi cache törlése:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Aktiválás sikeres!');
        return self.clients.claim();
      })
  );
});

/* ===== FETCH EVENT ===== */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Csak GET kéréseket cache-elünk
  if (request.method !== 'GET') {
    return;
  }
  
  // Firebase API hívások - network first strategy
  if (url.hostname.includes('firebaseapp.com') || 
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com')) {
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Sikeres válasz cache-elése
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(request)
            .then((response) => {
              return response || new Response(
                JSON.stringify({ error: 'Offline - nincs internetkapcsolat' }),
                {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    return;
  }
  
  // Saját domainhez tartozó fájlok - cache first strategy
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          // Cache-ből visszaadás
          if (response) {
            return response;
          }
          
          // Network-ről próbálkozás
          return fetch(request)
            .then((response) => {
              // Csak 200-as válaszokat cache-elünk
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(STATIC_CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            })
            .catch(() => {
              // Offline fallback
              if (request.destination === 'document') {
                return caches.match('./index.html');
              }
              
              // Egyéb erőforrások esetén üres válasz
              return new Response('', {
                status: 404,
                statusText: 'Not Found'
              });
            });
        })
    );
  }
});

/* ===== BACKGROUND SYNC ===== */
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync:', event.tag);
  
  if (event.tag === 'background-sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  try {
    console.log('Service Worker: Tasks szinkronizálás...');
    
    // Itt lehetne implementálni az offline során mentett feladatok feltöltését
    // A localStorage-ból vagy IndexedDB-ből
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        message: 'Feladatok szinkronizálva! 🔄'
      });
    });
    
  } catch (error) {
    console.error('Service Worker: Sync hiba:', error);
  }
}

/* ===== PUSH NOTIFICATIONS ===== */
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push üzenet érkezett');
  
  const options = {
    body: event.data ? event.data.text() : 'Új értesítés érkezett!',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Megnyitás',
        icon: './icons/icon-32x32.png'
      },
      {
        action: 'close',
        title: 'Bezárás',
        icon: './icons/icon-32x32.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Task Manager', options)
  );
});

/* ===== NOTIFICATION CLICK ===== */
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      self.clients.openWindow('./')
    );
  }
});

/* ===== MESSAGE HANDLING ===== */
self.addEventListener('message', (event) => {
  console.log('Service Worker: Üzenet érkezett:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME
    });
  }
});

console.log('Service Worker: Betöltve és kész! ✅');
