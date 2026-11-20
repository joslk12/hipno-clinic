# Tasks

## 1. Configuración del proyecto y herramientas

- [x] 1.1 Crear el proyecto base con Vite + Vue 3 + TypeScript y verificar que `npm run dev` levanta la aplicación y `npm run build` compila sin errores.
- [x] 1.2 Instalar y configurar Vue Router, Pinia, Tailwind CSS, `vite-ssg`, `@fontsource`, iconos y utilidades de pruebas; verificar que la instalación y el build inicial terminan correctamente.
- [x] 1.3 Definir los tokens semánticos de color y tipografía para el tema claro (por defecto) y el oscuro en Tailwind y variables CSS globales; verificar que una página de muestra renderiza ambos temas y las fuentes esperadas.
- [x] 1.4 Configurar ESLint, Prettier, Vitest y los scripts de `lint`, `typecheck`, `test` y `build`; verificar que todos los comandos se ejecutan sin errores en el proyecto vacío.
- [x] 1.5 Crear `.env.example` con las variables del endpoint de formulario y de mapas, y documentar su uso; verificar que el build funciona con y sin las variables opcionales.

## 2. Sistema de diseño y estructura global

- [x] 2.1 Implementar los componentes base Button, Card, Badge, Input, Textarea y SectionHeading con estados hover, focus y disabled; verificar con pruebas unitarias que renderizan clases, etiquetas y atributos ARIA esperados.
- [x] 2.2 Integrar los ornamentos, geometría sagrada e iconografía dorada del paquete `design/generated/` en componentes reutilizables; verificar con pruebas de snapshot que los SVG se renderizan con los trazos configurados.
- [x] 2.3 Implementar AppShell con landmarks semánticos, enlace "saltar al contenido" y soporte de `prefers-reduced-motion`; verificar con una prueba de accesibilidad que no hay violaciones críticas.
- [x] 2.4 Construir la barra de navegación sticky/flotante con enlaces, control de tema, CTA "AGENDAR CITA", estado de sección activa y menú móvil colapsable con gestión de foco; verificar con pruebas de apertura, cierre y navegación por teclado.
- [x] 2.5 Implementar el footer global con teléfono, correo, ubicación y lema, incluyendo enlaces de contacto directo; verificar con pruebas que los enlaces generan `wa.me` y `mailto:` correctos.
- [x] 2.6 Configurar las rutas de Inicio, Servicios, Sobre Mí, Blog, Contacto y 404 con carga diferida; verificar que cada ruta abre directamente y que una ruta inexistente muestra la página 404.
- [x] 2.7 Implementar la lógica de tema con `localStorage` (`oc-theme`), `data-theme`, `color-scheme` y aplicación antes del primer renderizado; verificar que el tema claro se aplica por defecto sin preferencia guardada, que el tema elegido persiste tras recargar y que no hay destello de tema incorrecto.
- [x] 2.8 Añadir el control accesible de cambio de tema en la navbar y el menú móvil con estado `aria-pressed` o `role="switch"`; verificar con pruebas de teclado, lector de pantalla y actualización de `theme-color`.

## 3. Contenido y secciones públicas

- [x] 3.1 Centralizar en módulos tipados el contenido de servicios, perfil, pilares y datos de contacto; verificar con pruebas unitarias que cada servicio incluye nombre, descripción, duración, inversión y CTA.
- [x] 3.2 Implementar el hero de inicio con titular, subtítulo, slogan, botones "Descubrir Hipnosis" y "NUESTROS SERVICIOS" y fondo del tema activo con destellos dorados usando los logos y ornamentos de `design/generated/`; verificar con pruebas de componente y revisión visual responsive en ambos temas.
- [x] 3.3 Implementar la vista previa de la especialista y el resumen interactivo de servicios en inicio; verificar que los enlaces llevan a "Sobre Mí" y al detalle del servicio correspondiente.
- [x] 3.4 Construir la sección de servicios con retícula de 3 columnas en escritorio y 1 en móvil, iconos, badges de duración e inversión y CTA por servicio; verificar con pruebas de datos y revisión visual en ambos breakpoints y temas.
- [x] 3.5 Conectar el CTA de cada tarjeta con el store de agendamiento para identificar el servicio seleccionado; verificar con una prueba que el servicio elegido llega al formulario de contacto.
- [x] 3.6 Construir la sección "Sobre Mí" con la fotografía en marco dorado de `design/generated/photos/`, nombre, cargo, historia, filosofía, tres pilares y CTA de contacto; verificar contenido, texto alternativo y composición responsive en ambos temas.
- [x] 3.7 Implementar la vista informativa de Blog próximamente y la página 404 con enlace al inicio; verificar que ambas rutas renderizan y que el enlace de regreso funciona.

## 4. Contacto y agendamiento

- [x] 4.1 Implementar el store `booking` con servicio preseleccionado y estado del formulario; verificar con pruebas unitarias de selección, actualización y reinicio.
- [x] 4.2 Construir el formulario con los campos Nombre Completo, Correo, Teléfono opcional y Mensaje, con validación de obligatorios y formato de correo; verificar con pruebas de envío inválido y válido.
- [x] 4.3 Mostrar errores accesibles asociados a cada campo con `aria-describedby` y anuncios `aria-live`; verificar con una prueba de accesibilidad que los errores se anuncian correctamente.
- [x] 4.4 Integrar el envío con Netlify Forms (`data-netlify`, `form-name`) con estados de carga, éxito, error y reintento, además de honeypot y bloqueo de envíos duplicados; verificar con pruebas de fetch simulado para cada estado.
- [x] 4.5 Implementar la columna de contacto directo con teléfono, WhatsApp, correo, ubicación e iconos dorados; verificar que el mensaje de WhatsApp se codifica con el texto requerido y que el correo abre el destinatario correcto.
- [x] 4.6 Integrar el mapa de Google con carga diferida, tratamiento visual acorde al tema activo y respaldo textual cuando no carga; verificar que el formulario es usable antes de cargar el mapa y que la ubicación textual permanece visible en ambos temas.
- [x] 4.7 Probar el flujo completo servicio → CTA → formulario preseleccionado → envío exitoso con una prueba E2E; verificar que no se pierde el servicio seleccionado ni los datos ingresados al reintentar.

## 5. SEO, metadatos y compartición

- [x] 5.1 Implementar el composable de metadatos por ruta con título, descripción, canonical y Open Graph; verificar con pruebas unitarias que cada ruta define valores únicos y absolutos.
- [x] 5.2 Configurar el prerenderizado de todas las rutas públicas con `vite-ssg`; verificar que el HTML generado contiene título, descripción, canonical y etiquetas OG sin ejecutar JavaScript.
- [x] 5.3 Generar `sitemap.xml` y `robots.txt` en build a partir de las rutas públicas; verificar el contenido de ambos archivos después del build.
- [ ] 5.4 Usar la imagen Open Graph de `public/assets/og/` y verificar con el depurador de Facebook/WhatsApp que la vista previa muestra título, descripción e imagen. (Imagen y etiquetas validadas; depurador pendiente hasta que `origenconsciente.mx` tenga DNS, ver 7.3/7.4.)
- [x] 5.5 Verificar la consistencia de nombre, teléfono, correo y ubicación en todas las páginas; validar con una búsqueda automatizada de los datos en el HTML generado.

## 6. Rendimiento, accesibilidad y entrega

- [ ] 6.1 Integrar las imágenes optimizadas de `src/assets/` en AVIF/WebP con `srcset`, dimensiones explícitas y lazy loading fuera de la primera pantalla; verificar que el build genera variantes y que no hay desplazamientos de layout.
- [x] 6.2 Optimizar la carga de tipografías autoalojadas y diferir mapas y scripts de terceros; verificar con una auditoría de red que no bloquean el renderizado inicial.
- [x] 6.3 Ejecutar una auditoría de accesibilidad automatizada (axe) en todas las rutas y en ambos temas, y corregir violaciones serias; verificar que la auditoría final no reporta violaciones críticas y que el contraste cumple AA.
- [x] 6.4 Revisar la experiencia en viewports de 320px, 768px, 1280px y 4K en navegadores modernos y en ambos temas; verificar que no hay desbordamiento horizontal, contenido recortado ni problemas de contraste.
- [x] 6.5 Configurar el despliegue en Netlify con HTTPS, headers de seguridad y variables de entorno; verificar con un preview que las rutas directas, el formulario y los enlaces de contacto funcionan. (Verificado en producción: HTTP→HTTPS, rutas y 404 con headers CSP/HSTS/XFO/XCTO/Referrer/Permissions/COOP, formulario probado y enlaces wa.me/tel/mailto/Maps.)
- [ ] 6.6 Configurar un presupuesto de rendimiento en CI con Lighthouse para carga menor a 2 s y Core Web Vitals en rango; verificar que el pipeline falla si se superan los umbrales.
- [x] 6.7 Escribir el README con instalación, variables de entorno, edición de contenido, comandos y despliegue; verificar que los comandos documentados funcionan tal como están escritos.

## 7. Verificación de integración y lanzamiento

- [x] 7.1 Ejecutar `lint`, `typecheck`, pruebas unitarias, pruebas E2E y build de producción; verificar que todos finalizan sin errores.
- [ ] 7.2 Recorrer la lista de escenarios de las especificaciones en el preview de producción, en ambos temas, y corregir cualquier incumplimiento; verificar cada escenario manualmente y dejar constancia.
- [ ] 7.3 Realizar el smoke test de lanzamiento: envío real al correo, WhatsApp, mapa, OG, sitemap, robots, 404, HTTPS y persistencia del tema claro/oscuro; verificar que todas las funciones responden en el dominio final.
- [ ] 7.4 Publicar el sitio en el dominio definitivo y verificar el certificado SSL, la redirección HTTP→HTTPS y el acceso desde móvil.

## Workflow follow-up

- Archivar el cambio con `openspec archive origen-consciente-website` cuando la revisión y el lanzamiento estén aprobados.
- Verificar el resultado archivado y que las especificaciones principales reflejen las capacidades implementadas.
