# Proposal

## Why

Origen Consciente, la clínica de hipnosis regresiva y regenerativa de Maricela Aguilar Enríquez en Santiago Tolman, carece de un canal digital propio que transmita confianza profesional, explique su oferta de valor y permita agendar consultas de forma directa. Un sitio web premium, rápido y centrado en la conversión permite captar pacientes locales, reducir la fricción de contacto y consolidar la identidad de marca.

## What Changes

- Se crea un sitio web corporativo de una sola aplicación con Vue 3, TypeScript, Vite, Pinia y Tailwind CSS.
- Se implementa un sistema de diseño premium con temas claro y oscuro conmutables (claro por defecto: Ivory / Oro; oscuro: Deep Charcoal / Oro Metálico) y tokens de color, tipografía serif/sans-serif, iconografía dorada, badges y componentes reutilizables.
- Se construye la estructura global de navegación con navbar flotante/sticky, enlaces principales, selector de tema claro/oscuro y CTA persistente de agendamiento.
- Se desarrolla la página de inicio con hero, slogan, CTAs, vista previa de la especialista y resumen de servicios.
- Se desarrolla el catálogo de servicios con tres tarjetas (Hipnosis Regresiva, Hipnosis Regenerativa y Terapia de Sanación Emocional), duración, inversión y CTA.
- Se desarrolla la sección "Sobre Mí" con la historia, filosofía y pilares profesionales de Maricela Aguilar Enríquez.
- Se desarrolla la sección de contacto y agendamiento con formulario validado, envío por Formspree/EmailJS, enlaces directos a WhatsApp, correo y mapa.
- Se incorporan metadatos SEO local, Open Graph, sitemap, robots y requisitos de accesibilidad WCAG 2.1 AA.
- Se establece una arquitectura escalable para futuras integraciones de pagos, blog y agendamiento interactivo.

## Capabilities

### New Capabilities

- `design-system`: Tokens visuales, tipografía, temas claro y oscuro conmutables, persistencia de la preferencia, componentes de UI reutilizables, ornamentos e iconografía, y reglas de contraste/accesibilidad.
- `site-shell`: Estructura global del sitio, navbar sticky/flotante, navegación entre secciones, selector accesible de tema, footer con datos de contacto y lema de marca.
- `home-landing`: Hero principal con titular, slogan y CTAs, vista previa de la especialista y resumen de servicios.
- `service-catalog`: Catálogo de servicios con descripciones, duración, inversión, badges y CTAs de agendamiento.
- `professional-profile`: Perfil profesional de Maricela Aguilar Enríquez, historia, filosofía y pilares de trabajo.
- `contact-booking`: Formulario de contacto validado, envío de mensajes por correo, enlaces directos a WhatsApp y correo, y ubicación con mapa.
- `seo-metadata`: SEO local, meta-tags, Open Graph, sitemap y robots orientados a la captación orgánica.
- `site-performance`: Tiempos de carga, Core Web Vitals y optimización de recursos para una experiencia rápida en móvil y escritorio.
- `site-delivery`: Publicación segura por HTTPS, distribución por CDN, enrutamiento de la aplicación y comportamiento en navegadores compatibles.

### Modified Capabilities

Ninguna. Este es el primer cambio del proyecto y no existen capacidades previas.

## Impact

- **Código nuevo**: aplicación frontend Vue 3 + TypeScript + Vite, componentes, vistas, stores de Pinia y configuración de Tailwind CSS.
- **Dependencias**: Vue 3, Vite, TypeScript, Pinia, Tailwind CSS, Lucide Icons/Heroicons, Formspree o EmailJS.
- **Integraciones externas**: Formspree/EmailJS para correo, API de WhatsApp (`wa.me`), Google Maps en modo oscuro.
- **Infraestructura**: despliegue en Vercel o Netlify con CDN, SSL y dominio propio.
- **No funcional**: rendimiento (< 2 s de carga), responsividad de 320px a 4K, SEO local y accesibilidad WCAG 2.1 AA.
