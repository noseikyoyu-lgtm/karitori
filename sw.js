/* ===== js: pwa/sw.js ===== */
// オフラインで動かすための仕組み（Service Worker）
//
// 【役割】
// 初回に開いたときアプリ一式を端末に取り込み、以後は圏外でも起動できるようにする。
// 圃場は電波が弱いことが多いので、ここが効く。
//
// 【更新のしかた】
// CACHE_NAME は build.mjs が中身のハッシュから作る。アプリを作り直すと名前が変わり、
// 古い取り込みは activate のときに消える。利用者は再読み込みするだけでよい。
// （新しい版が用意できたことは register.js が画面で知らせる）

const CACHE_NAME = 'kariire-1f1489daee6c';
const ASSETS = ["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","icon-180.png","icon-maskable-512.png"];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      // cache: 'reload' を付けて、必ずネットワークから取り直す。
      //
      // 既定では addAll もブラウザのHTTPキャッシュを見に行く。
      // 直前まで開いていた古い index.html がそこに残っていると、
      // 新しい取り込みの中に古い中身が入り、そのまま固定されてしまう。
      // 取り込みの名前は新しいので、誰も食い違いに気づけない。
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      // 新しい版をすぐ使えるようにする。待たせても得がない。
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // 取り込んだものがあればそれを返す。無ければ取りに行く。
  //
  // 中身の更新は「取り込みの名前が変わる」ことで行うので、
  // ここで毎回取りに行く必要はない。圏外でも確実に開くほうを優先する。
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).catch(() => {
      // 圏外で、取り込んでもいないものを求められた場合。
      // 画面の遷移なら、取り込んである入口を返して真っ白を避ける。
      if (e.request.mode === 'navigate') return caches.match('./index.html');
      return new Response('', { status: 504, statusText: 'offline' });
    })),
  );
});