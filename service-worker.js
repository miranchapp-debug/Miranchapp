// ============================================================
// SERVICE WORKER — Mi RanchApp
// ============================================================
// IMPORTANTE PARA LUIS: cada vez que subas una versión nueva de index.html
// a GitHub, sube también este archivo, pero antes CAMBIA el número de la
// línea de abajo (v1 -> v2 -> v3...). Ese número es lo único que le avisa
// al celular de los productores/veterinarios que hay algo nuevo que bajar —
// si no lo cambias, algunos celulares podrían seguir viendo la copia vieja
// guardada por un tiempo.
const CACHE_NAME = 'ranchapp-v1';

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

// Estrategia "muestra lo guardado, y de paso revisa si hay algo nuevo":
// - Si ya existe una copia guardada del archivo pedido, se entrega DE
//   INMEDIATO (la app abre al instante, sin esperar internet ni gastar
//   datos).
// - Al mismo tiempo, de fondo, intenta traer la versión más reciente por si
//   cambió — y la deja guardada para la PRÓXIMA vez que se abra.
// - Solo controla peticiones a nuestro propio sitio (GET) — todo lo que sea
//   de Firebase, de las librerías externas (CDN), o de otro origen, se deja
//   pasar tal cual, sin intentar guardarlo aquí.
self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;
  const url = new URL(evento.request.url);
  if (url.origin !== self.location.origin) return;

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
        .catch(() => respuestaGuardada); // sin internet: se queda con lo guardado, sin tronar

      return respuestaGuardada || buscarVersionNueva;
    })
  );
});
