const CACHE_NAME = "cloudgroove-assets-v1";
const AUDIO_CACHE_NAME = "cloudgroove-audio-v1";

// Resolve base scope path dynamically to support subpath hosting (e.g. GitHub Pages)
const baseScope = self.registration.scope;
const base = new URL(baseScope).pathname;

const STATIC_ASSETS = [
  base,
  `${base}index.html`,
  `${base}manifest.json`
];

// インストール時にコアファイルをキャッシュ
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 古いキャッシュをクリーンアップ
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== AUDIO_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// キャッシュ＆フェッチ戦略
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Google Driveの音声ファイル (alt=media付き) を傍受してキャッシュ
  if (
    url.host === "www.googleapis.com" &&
    url.pathname.includes("/files/") &&
    url.searchParams.get("alt") === "media"
  ) {
    e.respondWith(
      caches.open(AUDIO_CACHE_NAME).then((cache) => {
        return cache.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log("[SW] Serving Audio from Cache API:", url.pathname);
            return cachedResponse;
          }
          
          return fetch(e.request).then((networkResponse) => {
            // 200 (OK) もしくは 206 (Partial Content) でキャッシュに保存
            if (networkResponse.status === 200 || networkResponse.status === 206) {
              cache.put(e.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch((err) => {
            console.warn("[SW] Offline, and audio not cached:", err);
          });
        });
      })
    );
    return;
  }

  // それ以外の一般的なアセット（静的ファイル）
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).catch(() => {
        if (e.request.mode === "navigate") {
          return caches.match(`${base}index.html`);
        }
      });
    })
  );
});
