# Achúchame — Squishy de bolsillo

Una **PWA en español**, sin cuentas, anuncios, dependencias ni servicios externos. Está preparada para funcionar sin internet después de la primera visita desde un servidor HTTPS compatible.

## ¿Qué hace?

- Cinco muñequitos blanditos: Mochi, Ranita, Nube, Estrella y Flancito.
- Aprieta y arrastra con el dedo (o ratón) para hundir y estirar la forma: los bordes se deforman y regresan con rebote.
- Usa **dos dedos a la vez** para pellizcar y estirar.
- Estrellitas sorpresa con el botón ✧.
- Sonidos opcionales, generados dentro del navegador (sin archivos externos).
- Vibración opcional en navegadores y dispositivos que lo permitan. **Safari en iPhone no ofrece la API web de vibración**: en iPhone seguirá funcionando sin esa función.
- Respiración guiada opcional y modo noche.
- Recordará tus preferencias en ese navegador mediante almacenamiento local.
- Teclado: enfoca el squishy con Tab y mantén pulsado **Espacio** o **Intro**.

No contabiliza sesiones ni marca rachas: es para relajarse, no para cumplir objetivos.

## Instalar en GitHub Pages, desde Windows y sin Mac

1. Descarga el ZIP y **extrae los archivos**.
2. En GitHub, crea un repositorio nuevo; por ejemplo `achuchame`.
3. Sube los archivos **del interior de la carpeta** (incluido `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest` y la carpeta `assets`) a la raíz del repositorio. No subas solo el ZIP.
4. En GitHub, entra en **Settings > Pages**. En **Build and deployment**, selecciona **Deploy from a branch** y luego **main** y **/(root)**. Guarda los cambios.
5. Cuando GitHub Pages publique la web, tendrá una dirección parecida a `https://USUARIO.github.io/achuchame/`.
6. En iPhone, abre esa dirección en **Safari > Compartir > Añadir a pantalla de inicio > Añadir**.
7. En un PC, abre la web en Chrome o Edge y usa la opción **Instalar aplicación** del navegador.

GitHub Pages sirve la PWA mediante HTTPS, requisito para el funcionamiento sin conexión y la instalación. El archivo `index.html` abierto directamente en el ordenador permite probar algunas funciones, pero **no instalar** la PWA ni usar el service worker.

## Privacidad / uso

La aplicación no recoge ni envía datos. No necesita permisos, micrófono, cámara ni conexión externa. Los ajustes se guardan solo en el dispositivo; borrando los datos del sitio se restablecerán.

## Límites

La respuesta háptica depende del navegador (no disponible en Safari iOS). El audio puede requerir activar antes «Soniditos» tocando el botón. No sustituye ninguna ayuda médica: es simplemente un juguete sensorial.
