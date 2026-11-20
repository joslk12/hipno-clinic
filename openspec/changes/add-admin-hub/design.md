# Design

## Context

Ver `proposal.md` para la motivación. Hoy `/admin/blog` y `/admin/resenas` son vistas independientes que comprueban la sesión con `getSession()` de `adminBlog.ts` y muestran `AdminLogin` cuando no hay sesión. `/admin/citas` existe solo en la planificación de `add-appointment-calendar`. El router ya excluye del prerenderizado toda ruta que empiece con `/admin` y `robots.txt` ya desautoriza `/admin`, así que no hace falta tocar esa configuración.

## Goals / Non-Goals

**Goals:**

- Ofrecer `/admin` como entrada única con sesión, login y menú de funciones.
- Reutilizar el mismo componente de menú en todas las vistas administrativas.
- Habilitar automáticamente el enlace de citas cuando su ruta pase a existir.

**Non-Goals:**

- No crear nuevas Functions, campos de sesión ni variables de entorno.
- No mover ni reescribir la lógica de login, logout o verificación ya presente en cada panel.
- No agregar enlaces administrativos a la navegación pública, el sitemap ni las páginas indexables.
- No implementar la funcionalidad de citas; solo reservar su entrada en el menú.

## Decisions

1. **Hub delgado en lugar de layout obligatorio.** `AdminHubView.vue` comprueba la sesión y muestra tarjetas de funciones; cada vista sigue siendo responsable de su propia sesión. Se descartó un `router-view` anidado con guard global porque obligaría a reescribir `AdminBlogView` y `AdminReviewsView` y a cambiar el comportamiento de login que ya cubren sus specs.

2. **Menú presentacional reutilizable.** `AdminNav.vue` recibe la sección activa y una lista de secciones calculada desde el arreglo `routes` del router; solo emite `logout`. Así el mismo componente sirve en el hub y en los paneles sin duplicar llamadas a la API. Alternativa descartada: un store de navegación, innecesario para tres enlaces.

3. **Citas derivada del router, no de un bandero manual.** La disponibilidad se calcula con `routes.some((route) => route.path === '/admin/citas')`. Cuando `add-appointment-calendar` registre la ruta, el enlace deja de estar deshabilitado sin editar este change. Mientras tanto se renderiza como elemento no interactivo con `aria-disabled="true"` y el texto «Próximamente»; se evita un `<button disabled>` porque no transmite por qué está inactivo.

4. **Misma sesión y mismos errores.** El hub usa `getSession`, `login`, `logout` y `AdminBlogApiError` de `adminBlog.ts`: `401` muestra login, otros errores muestran un mensaje sin exponer datos. No se introduce un segundo formulario de acceso.

5. **Metadatos y exclusiones sin cambios.** La nueva vista declara `robots: 'noindex, nofollow'` y `path: '/admin'`, igual que los paneles actuales. La regla `includedRoutes` de `vite.config.ts` ya filtra `/admin*` y `robots.txt` ya contiene `Disallow: /admin`.

## Risks / Trade-offs

- **[Duplicación de comprobación de sesión]** El hub y cada panel llaman a `getSession()` → mitigación: el menú no contiene lógica de sesión; solo emite `logout` y cada panel conserva su manejador actual.
- **[Citas desfasada]** La etiqueta «Próximamente» podría quedar aunque la ruta ya exista → mitigación: disponibilidad derivada de `routes`.
- **[Selectores de tests ambiguos]** El menú agrega enlaces y etiquetas repetidas en vistas que ya tienen encabezados similares → mitigación: usar un `<nav aria-label="Administración">`, `aria-current="page"` y selectores por rol en los tests.
- **[Accesibilidad del enlace deshabilitado]** Un elemento deshabilitado puede omitirse para lectores de pantalla → mitigación: texto visible «Próximamente» y `aria-disabled` en el elemento.

## Migration Plan

1. Implementar el hub, el menú y las pruebas; registrar `/admin` antes del catch-all.
2. Integrar el menú en los paneles existentes y ajustar selectores de pruebas si hace falta.
3. Desplegar con `npm run build` comprobando que no se genera `dist/admin.html`.
4. Al implementar `add-appointment-calendar`, su ruta activa el enlace de citas automáticamente.
5. Reversión: quitar la ruta `/admin` y el componente de menú; los paneles siguen funcionando de forma independiente.
