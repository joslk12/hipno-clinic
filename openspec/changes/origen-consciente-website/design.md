# Design

## Context

Proyecto greenfield: no existe código ni infraestructura previa (ver `proposal.md`). El sitio debe ser una aplicación Vue 3 + TypeScript + Vite desplegada como sitio estático en Vercel o Netlify, con formulario de contacto, enlaces directos a WhatsApp, mapa y SEO local. La motivación y el alcance funcional están en `proposal.md`; el comportamiento exigido está en `specs/`.

Restricciones que condicionan el diseño:

- Stack definido por el cliente: Vue 3 (Composition API, `<script setup>`), TypeScript, Vite, Pinia y Tailwind CSS.
- Identidad visual con tema claro por defecto y tema oscuro conmutable, acentos dorados y tipografías de Google Fonts.
- Objetivo de carga menor a 2 s y Core Web Vitals en verde.
- Las vistas previas de Open Graph deben funcionar en WhatsApp y Facebook, cuyos rastreadores no ejecutan JavaScript.

## Goals / Non-Goals

**Goals:**

- Aplicación estática prerenderizada, sin servidor propio, fácil de desplegar y mantener.
- Un único sistema de diseño con tokens reutilizables y componentes accesibles.
- Separación clara entre contenido, presentación y estado de la interfaz.
- Ruta de conversión medible: servicio → CTA → contacto/WhatsApp.
- Base extensible para blog, pagos y agendamiento interactivo sin reescribir la arquitectura.

**Non-Goals:**

- Backend propio, base de datos o autenticación en el MVP.
- Pasarela de pagos y calendario de reservas en tiempo real (fases futuras).
- CMS headless; el contenido del MVP vive en el repositorio.
- Blog funcional con artículos; solo se reserva la ruta y la vista informativa.
- Soporte de navegadores heredados (Internet Explorer u otros sin soporte actual).

## Decisions

### Aplicación Vue 3 con Vite y prerenderizado estático

Se usa Vue 3 + TypeScript + Vite con Vue Router en modo history. Para cumplir Open Graph y SEO en rastreadores sin JavaScript, las rutas públicas se prerenderizan en build con `vite-ssg`, generando HTML estático por ruta.

- **Por qué:** mantiene el stack exigido y produce HTML con metadatos en la respuesta inicial, requisito para las tarjetas de WhatsApp/Facebook.
- **Alternativas:** SPA pura (rechazada: los rastreadores sociales no ejecutan JS); Nuxt 3 (rechazada: cambia el stack solicitado y añade complejidad).

### Organización por capas y componentes

Estructura propuesta:

```
src/
  app/            # bootstrap, router, providers
  components/
    ui/           # Button, Card, Badge, Input, SectionHeading
    layout/       # AppShell, Navbar, MobileMenu, Footer
    sections/     # Hero, SpecialistPreview, ServicesSummary, ServiceGrid...
  composables/    # validación de formulario, metadata, WhatsApp
  content/        # datos de servicios, perfil, pilares, contacto
  stores/         # booking/contact y estado de UI
  views/          # Home, Services, About, Blog, Contact, NotFound
  styles/         # tokens, Tailwind, animaciones
  assets/         # imágenes, ornamentos SVG
```

El contenido editable (servicios, precios, perfil, datos de contacto) se centraliza en `content/` para evitar duplicación y facilitar cambios futuros.

- **Por qué:** superficies pequeñas, componentes testeables y una sola fuente de verdad para precios/contacto.
- **Alternativas:** secciones monolíticas por página (rechazada: duplica estilos y datos).

### Paquete de assets de marca generado

Se generó un paquete reutilizable en `design/generated/` a partir de las imágenes de `openspec/design/`: logos (vertical, horizontal, minimalista, símbolo y wordmark) en PNG/WebP/SVG, iconografía (WhatsApp, correo, ubicación, proporción áurea, esquinas y botones), 39 ornamentos numerados, retrato de la especialista, favicons, imagen Open Graph 1200×630, tokens de color/Tailwind y fuentes OFL. Tras la integración, el paquete generado se eliminó para evitar duplicación; los assets en uso viven en `src/assets/` y `public/assets/`.

- **Por qué:** evita re-extraer la identidad visual durante la implementación y garantiza formatos/dimensiones consistentes desde la fase 1.
- **Caveats:** los SVG son trazados automáticos de los mockups; sustituir por el vector original si el cliente lo entrega. El retrato proviene de una maqueta y tiene resolución baja. Los ornamentos numerados requieren selección y renombrado semántico antes de usarse en producción.

### Tokens de diseño y Tailwind CSS

Tailwind se configura con los colores de marca (`charcoal`, `soft-charcoal`, `gold`, `gold-satin`, `ivory`, `muted`) y familias tipográficas. Los valores se exponen como variables CSS semánticas para alternar entre tema oscuro y claro sin reescribir componentes.

- **Por qué:** consistencia visual, menor CSS artesanal y fácil ajuste de marca.
- **Alternativas:** CSS Modules puro (rechazada: más lento de iterar en un sitio pequeño); librería de componentes externa (rechazada: no aporta y aumenta el bundle).

### Tema claro/oscuro conmutable y persistente

Se implementan dos temas mediante variables CSS semánticas aplicadas con `data-theme` en el elemento `<html>`. El tema claro es el predeterminado por decisión del cliente; el visitante puede cambiarlo al tema oscuro desde la navbar o el menú móvil. La elección se guarda en `localStorage` bajo la clave `oc-theme` y se aplica con un script inline en el `<head>` antes del primer renderizado para evitar el destello del tema incorrecto (FOUC). La propiedad `color-scheme` y el metadato `theme-color` se actualizan con el tema activo.

- **Por qué:** cumple el requisito de switch claro/oscuro con tema claro por defecto, evita parpadeos y conserva la preferencia entre visitas.
- **Alternativas:** seguir únicamente `prefers-color-scheme` (rechazada: no ofrece el switch explícito solicitado); persistir en cookie (rechazada: innecesario para una preferencia no sensible); aplicar el tema solo en cliente sin script previo (rechazada: produce FOUC).

### Tipografías autoalojadas y optimizadas

Se autoalojan las fuentes con `@fontsource` (Cinzel o Cormorant Garamond, Playfair Display Italic y Montserrat/Inter) en lugar de cargarlas desde Google Fonts en tiempo de ejecución. Se usan subconjuntos latinos, `font-display: swap` y precarga de la fuente del hero.

- **Por qué:** elimina una conexión de terceros, reduce bloqueo de renderizado y mejora LCP/CLS.
- **Alternativas:** Google Fonts CDN (rechazada por latencia y privacidad); una sola familia (rechazada: no cumple la jerarquía visual solicitada).

### Gestión de estado con Pinia

Se usa un store `booking` para el servicio preseleccionado y el estado del formulario (valores, errores, envío, resultado) y un store `ui` para el menú móvil. El resto del estado es local a cada componente.

- **Por qué:** el CTA de cada tarjeta debe llegar al formulario con el servicio identificado; compartir ese estado entre vistas es más robusto que query params.
- **Alternativas:** estado solo local (rechazada: el CTA cruza vistas); query params únicamente (rechazada: fácil de perder al navegar).

### Formulario con Netlify Forms y validación propia

Se elige Netlify Forms como servicio de envío porque el sitio se hospeda en Netlify: no requiere endpoint ni claves y las respuestas se gestionan desde el panel de Netlify. El formulario se declara con `data-netlify="true"` y `name="contact"` en el HTML prerenderizado, y el envío se hace por `fetch` a `/` con `application/x-www-form-urlencoded` incluyendo `form-name`. La validación se implementa con un composable (campos obligatorios, formato de correo, longitud de mensaje) y mensajes accesibles con `aria-live`.

Se añade un campo honeypot invisible (`bot-field`) y se deshabilita el botón durante el envío para mitigar spam y duplicados.

- **Por qué:** integración nativa con el hosting, sin dependencias ni variables de entorno para el formulario, y control total del UX.
- **Alternativas:** Formspree/EmailJS (válidas, pero requieren endpoint y clave externa); backend propio (fuera de alcance del MVP).

### WhatsApp mediante enlace universal

El CTA construye `https://wa.me/525631270122?text=<mensaje>` con el mensaje codificado, sin librerías. Se reutiliza un composable para generar enlaces desde navbar, tarjetas, contacto y footer.

- **Por qué:** funciona en móvil y escritorio sin SDK ni permisos.
- **Alternativas:** Web Share API (rechazada: no abre WhatsApp de forma directa y depende del navegador).

### Mapa diferido con respaldo textual

Se integra un mapa de Google embebido, cargado de forma diferida solo al acercarse la sección de contacto. Se aplica un tratamiento oscuro con CSS y se mantiene la ubicación textual como respaldo si el iframe falla o el usuario bloquea terceros.

- **Por qué:** evita cargar scripts de Google en la primera pantalla y cumple el modo oscuro sin depender de estilos no soportados en el embed.
- **Alternativas:** Maps JavaScript API con estilo oscuro (requiere API key, billing y más peso); mapa estático (rechazado: pierde interactividad).

### SEO y metadatos por ruta

Cada ruta define título, descripción, canonical y Open Graph mediante un composable de metadata compatible con `vite-ssg`. Se genera `sitemap.xml` y `robots.txt` en build a partir de la lista de rutas públicas. La imagen OG predeterminada se genera una vez con la marca y se reutiliza.

- **Por qué:** garantiza metadatos en el HTML prerenderizado y consistencia entre páginas.
- **Alternativas:** plugin SPA sin prerender (rechazada: OG roto en WhatsApp); gestor externo de SEO (innecesario para el tamaño del sitio).

### Rendimiento y carga

Se aplican presupuesto de rendimiento y estas medidas: rutas con `defineAsyncComponent`/lazy loading, imágenes en AVIF/WebP con `srcset` y dimensiones explícitas, `loading="lazy"` fuera de la primera pantalla, iframe del mapa diferido, CSS crítico mínimo y sin librerías de animación pesadas. El hero usa una imagen optimizada y evita video de fondo.

- **Por qué:** cumplir < 2 s y buenos Core Web Vitals en móvil.
- **Alternativas:** todo en un solo bundle (rechazada: penaliza la primera carga).

### Accesibilidad integrada

Landmarks semánticos (`header`, `nav`, `main`, `footer`), enlace "saltar al contenido", foco visible, `aria-label` en botones e inputs, asociación de errores con `aria-describedby`, menú móvil con gestión de foco y respeto a `prefers-reduced-motion`.

- **Por qué:** cumplir WCAG 2.1 AA y evitar deuda de accesibilidad.
- **Alternativas:** auditoría al final (rechazada: más costosa de corregir).

### Despliegue en Netlify

Build estático en Netlify con HTTPS automático, CDN global y formularios nativos. Las rutas públicas se prerenderizan con `vite-ssg` y se sirven como HTML estático. Variables de entorno para el sitio, el mapa y WhatsApp cuando aplique.

- **Por qué:** cero mantenimiento de servidor, despliegues atómicos y rollback inmediato, además de Netlify Forms sin configuración adicional.
- **Alternativas:** Vercel (válida, pero requeriría un servicio de formularios externo); hosting tradicional (rechazada: más coste operativo); GitHub Pages (rechazada: menor control de headers/CDN y de rutas).

## Risks / Trade-offs

- **Rastreadores sociales sin JS** → prerenderizar todas las rutas públicas y verificar OG con el depurador de Facebook/WhatsApp antes de lanzar.
- **Netlify Forms en plan gratuito con límites o spam** → honeypot, validación en cliente, monitoreo de envíos y plan acorde al volumen; el proveedor es reemplazable.
- **Clave de Google Maps expuesta** → restringir la clave por dominio y cuota; cargar el mapa solo bajo demanda; mantener respaldo textual.
- **Meta de < 2 s difícil con muchas imágenes de marca** → presupuesto de rendimiento, formatos modernos, compresión y auditoría Lighthouse en CI.
- **Tipografías serif múltiples aumentan el peso** → subconjuntos latinos, límite de pesos (400/600) y autoalojamiento.
- **Estilos oscuros no nativos del mapa embebido** → filtro CSS documentado y alternativa de Maps JS si el cliente exige estilo oficial.
- **Destello de tema incorrecto (FOUC)** → aplicar el tema con un script inline antes del primer paint, verificar en el HTML prerenderizado y añadir una prueba de regresión visual.
- **Contenido y fotografías pendientes** → usar placeholders de marca y bloquear la publicación de secciones incompletas hasta recibir material.
- **Dependencia de `vite-ssg`** → aislar la configuración de prerender y validar el build; si se retira, las rutas siguen siendo una SPA funcional.

## Migration Plan

Proyecto nuevo, sin migración de datos. Plan de puesta en marcha:

1. Inicializar repositorio y proyecto Vite + Vue + TS con Tailwind y tokens.
2. Implementar sistema de diseño con temas claro/oscuro, layout global y rutas.
3. Construir secciones con contenido centralizado y estados de interacción.
4. Integrar formulario, WhatsApp, mapa y metadatos SEO.
5. Configurar prerender, sitemap/robots y presupuesto de rendimiento.
6. Desplegar en Netlify con variables de entorno y dominio; verificar HTTPS, rutas directas, OG y formulario en producción.
7. Rollback: usar el despliegue anterior de Netlify (instant rollback) y corregir en una rama nueva.

## Open Questions

- ¿Dominio definitivo y correo de notificación configurado en Netlify Forms?
- ¿Se cuenta con fotografías profesionales de Maricela y logotipo vectorial final?
- ¿Se usará Netlify Forms o un proveedor externo según el volumen de envíos?
- ¿Se requiere clave de Google Maps o basta el embed sin clave para el MVP?
- ¿Se desea analítica (Plausible/GA4) y banner de consentimiento en esta fase?
