/* ===== TASK MANAGER SERVICE WORKER ===== */

// Cache nevei és verziószám
const CACHE_NAME = 'task-manager-v1.0.0';
const DYNAMIC_CACHE = 'task-manager-dynamic-v1.0.0';

// Statikus fájlok, amiket cache-elni akarunk
const STATIC_FILES = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png'
];

// Külső erőforrások, amiket cache-elünk
const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

/* ===== SERVICE WORKER TELEPÍTÉSE ===== */
self.addEventListener('install', (event) => {
  console.log('Service Worker: Telepítés...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Statikus fájlok cache-elése...');
        // Statikus fájlok cache-elése
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        // Külső erőforrások cache-elése
        return caches.open(DYNAMIC_CACHE);
      })
      .then((cache) => {
        console.log('Service Worker: Külső erőforrások cache-elése...');
        return cache.addAll(EXTERNAL_RESOURCES);
      })
      .then(() => {
        console.log('Service Worker: Telepítés sikeres!');
        // Azonnal aktiválás
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Telepítési hiba:', error);
      })
  );
});

/* ===== SERVICE WORKER AKTIVÁLÁSA ===== */
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Aktiválás...');
  
  event.waitUntil(
    Promise.all([
      // Régi cache-ek törlése
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Régi cache törlése:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Összes kliens átvétele
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker: Aktiválás sikeres!');
    })
  );
});

/* ===== FETCH ESEMÉNYKEZELŐ (CACHE STRATÉGIA) ===== */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Csak GET kéréseket cache-elünk
  if (request.method !== 'GET') {
    return;
  }
  
  // Cache stratégia kiválasztása URL alapján
  if (STATIC_FILES.includes(url.pathname) || url.pathname === '/') {
    // Statikus fájlok: Cache First stratégia
    event.respondWith(cacheFirst(request));
  } else if (url.origin === location.origin) {
    // Saját domain: Network First stratégia
    event.respondWith(networkFirst(request));
  } else {
    // Külső erőforrások: Stale While Revalidate stratégia
    event.respondWith(staleWhileRevalidate(request));
  }
});

/* ===== CACHE STRATÉGIÁK ===== */

// Cache First - először cache-ből, ha nincs, akkor hálózatból
async function cacheFirst(request) {
  try {
    const cacheResponse = await caches.match(request);
    if (cacheResponse) {
      return cacheResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache First hiba:', error);
    return getOfflinePage();
  }
}

// Network First - először hálózatból, ha nincs, akkor cache-ből
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Hálózat nem elérhető, cache-ből szolgálva:', request.url);
    const cacheResponse = await caches.match(request);
    return cacheResponse || getOfflinePage();
  }
}

// Stale While Revalidate - cache-ből szolgál, háttérben frissít
async function staleWhileRevalidate(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cacheResponse = await cache.match(request);
    
    // Háttérben frissítés
    const fetchPromise = fetch(request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }).catch(() => {
      // Hálózati hiba esetén nem csinálunk semmit
    });
    
    // Cache-ből szolgálunk, vagy várunk a hálózatra
    return cacheResponse || fetchPromise;
  } catch (error) {
    console.error('Stale While Revalidate hiba:', error);
    return getOfflinePage();
  }
}

/* ===== OFFLINE OLDAL ===== */
function getOfflinePage() {
  return new Response(
    `
    <!DOCTYPE html>
    <html lang="hu">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - Task Manager</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          margin: 0;
          padding: 20px;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .offline-container {
          max-width: 400px;
          padding: 40px;
          background: rgba(255,255,255,0.1);
          border-radius: 15px;
          backdrop-filter: blur(10px);
        }
        .offline-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }
        h1 {
          margin-bottom: 15px;
          font-size: 1.8rem;
        }
        p {
          margin-bottom: 25px;
          opacity: 0.9;
          line-height: 1.6;
        }
        .retry-btn {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.3s;
        }
        .retry-btn:hover {
          background: #45a049;
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">📴</div>
        <h1>Offline módban vagy</h1>
        <p>Nincs internetkapcsolat, de a Task Manager továbbra is használható offline módban!</p>
        <button class="retry-btn" onclick="window.location.reload()">
          🔄 Újrapróbálás
        </button>
      </div>
    </body>
    </html>
    `,
    {
      headers: {
        'Content-Type': 'text/html',
      },
    }
  );
}

/* ===== HÁTTÉR SZINKRONIZÁLÁS ===== */
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Háttér szinkronizálás:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Itt lehet implementálni a háttérben futó szinkronizálást
    // például felhő alapú backup-ot
    console.log('Háttér szinkronizálás végrehajtva');
  } catch (error) {
    console.error('Háttér szinkronizálási hiba:', error);
  }
}

/* ===== PUSH NOTIFIKÁCIÓK ===== */
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push üzenet érkezett');
  
  let data = {};
  if (event.data) {
    data = event.data.json();
  }
  
  const options = {
    body: data.body || 'Új értesítés a Task Manager-ből',
    icon: './icons/icon-192.png',
    badge: './icons/icon-96.png',
    tag: 'task-manager-notification',
    renotify: true,
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Megnyitás',
        icon: './icons/icon-96.png'
      },
      {
        action: 'close',
        title: 'Bezárás'
      }
    ],
    data: {
      url: data.url || './'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Task Manager',
      options
    )
  );
});

/* ===== NOTIFIKÁCIÓ KATTINTÁS ===== */
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notifikáció kattintás');
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || './')
    );
  }
});

/* ===== PERIODIC BACKGROUND SYNC ===== */
self.addEventListener('periodicsync', (event) => {
  console.log('Service Worker: Periodikus szinkronizálás:', event.tag);
  
  if (event.tag === 'daily-backup') {
    event.waitUntil(performDailyBackup());
  }
});

async function performDailyBackup() {
  try {
    // Napi automatikus backup funkció
    console.log('Napi backup végrehajtva');
  } catch (error) {
    console.error('Napi backup hiba:', error);
  }
}

/* ===== CACHE MÉRET KEZELÉS ===== */
async function cleanOldCaches() {
  const cacheNames = await caches.keys();
  const dynamicCache = await caches.open(DYNAMIC_CACHE);
  const requests = await dynamicCache.keys();
  
  // Ha túl sok cache elem van, töröljük a régieket
  if (requests.length > 50) {
    const oldRequests = requests.slice(0, 10);
    await Promise.all(
      oldRequests.map(request => dynamicCache.delete(request))
    );
    console.log('Service Worker: Régi cache elemek törölve');
  }
}

// Cache tisztítás rendszeres futtatása
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAN_CACHE') {
    event.waitUntil(cleanOldCaches());
  }
});
