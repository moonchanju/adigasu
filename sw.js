// 어디가수 서비스 워커 — PWA 설치 가능 + 기본 오프라인 셸
// API 응답(/api/)은 캐시하지 않아 실데이터는 항상 최신으로 유지한다.
const CACHE = 'adigasu-v1';
const SHELL = [
  '/',
  '/어디가수.html',
  '/manifest.json',
  '/images/icon-192.png',
  '/images/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // API와 외부 도메인 요청은 그대로 네트워크로 통과시킨다.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // 페이지 이동: 네트워크 우선, 실패 시 캐시된 앱 셸로 폴백.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/어디가수.html'))
    );
    return;
  }

  // 정적 자원: 캐시 우선, 없으면 네트워크 후 캐시에 저장.
  e.respondWith(
    caches.match(request).then((hit) =>
      hit || fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
    )
  );
});
