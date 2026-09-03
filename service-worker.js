// ============================================================
// SERVICE WORKER — Mi RanchApp
// ============================================================
// IMPORTANTE PARA LUIS: cada vez que subas una versión nueva de index.html
// a GitHub, sube también este archivo, pero antes CAMBIA el número de la
// línea de abajo (v1 -> v2 -> v3...). Ese número es lo único que le avisa
// al celular de los productores/veterinarios que hay algo nuevo que bajar —
// si no lo cambias, algunos celulares podrían seguir viendo la copia vieja
// guardada por un tiempo.
const CACHE_NAME = 'ranchapp-v4';

const ARCHIVOS_DEL_CASCARON = [
  './',
  './index.html',
  './manifest.json',
  './icon-logo.jpg',
];

// Al instalarse (la primera vez que alguien abre la app, o cuando cambia el
// número de versión de arriba), guarda una copia de estos archivos.
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ARCHIVOS_DEL_CASCARON))
      .catch((error) => console.warn('No se pudo guardar el cascarón de la app', error))
  );
  self.skipWaiting();
});

// Al activarse, borra copias de versiones viejas (de números anteriores) que
// ya no hagan falta, para no dejar basura ocupando espacio en el celular.
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((nombre) => nombre !== CACHE_NAME).map((nombre) => caches.delete(nombre)))
    )
  );
  self.clients.claim();
});

// Estrategia MIXTA, por tipo de archivo:
// - index.html (y "/"): NETWORK FIRST — siempre intenta traer la versión más
//   nueva del servidor primero. Solo si no hay internet, usa la copia
//   guardada como respaldo. Antes esto era "muestra lo guardado primero" para
//   TODO, lo que significaba que un cambio subido a GitHub tardaba 2
//   recargas en verse (la primera mostraba la copia vieja Y de paso
//   actualizaba el caché; la segunda ya mostraba lo nuevo). Con esto, se ve
//   en la primera.
// - Todo lo demás (ícono, manifest.json): CACHE FIRST — cambian poquísimo,
//   así que se entregan al instante desde lo guardado y se refrescan de
//   fondo por si acaso, sin hacer esperar a la persona.
// - Solo controla peticiones a nuestro propio sitio (GET) — todo lo que sea
//   de Firebase, de las librerías externas (CDN), o de otro origen, se deja
//   pasar tal cual, sin intentar guardarlo aquí.
self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;
  const url = new URL(evento.request.url);
  if (url.origin !== self.location.origin) return;

  const esHTML = evento.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');

  if (esHTML) {
    evento.respondWith(
      fetch(evento.request)
        .then((respuestaDeRed) => {
          if (respuestaDeRed && respuestaDeRed.status === 200) {
            const copia = respuestaDeRed.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(evento.request, copia));
          }
          return respuestaDeRed;
        })
        .catch(() => caches.match(evento.request)) // sin internet: se queda con lo guardado, sin tronar
    );
    return;
  }

  evento.respondWith(
    caches.match(evento.request).then((respuestaGuardada) => {
      const buscarVersionNueva = fetch(evento.request)
        .then((respuestaDeRed) => {
          if (respuestaDeRed && respuestaDeRed.status === 200) {
            const copia = respuestaDeRed.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(evento.request, copia));
          }
          return respuestaDeRed;
        })
        .catch(() => respuestaGuardada);

      return respuestaGuardada || buscarVersionNueva;
    })
  );
});
