# Tasks

## 1. Menú administrativo compartido

- [ ] 1.1 Crear `src/components/admin/AdminNav.vue` con `<nav aria-label="Administración">`, enlaces Inicio/Blog/Reseñas/Citas, indicador `aria-current` de sección activa y emisión de `logout`; calcular la disponibilidad de citas desde `routes` con una prop opcional para pruebas; verificar con `npx vitest run src/components/admin/__tests__/admin-nav.spec.ts`, cubriendo enlaces, sección activa, logout y Citas deshabilitada/habilitada.
- [ ] 1.2 Verificar accesibilidad del menú (navegación por teclado, `aria-disabled` y texto «Próximamente» en Citas) con `npx vitest run src/components/admin/__tests__/admin-nav.spec.ts` y `npx playwright test tests/e2e/a11y.spec.ts`.

## 2. Hub en `/admin`

- [ ] 2.1 Crear `src/views/admin/AdminHubView.vue` con metadatos `noindex, nofollow`, verificación de sesión, login con `AdminLogin`, mensaje de error ante fallos no `401`, tarjetas hacia Blog y Reseñas y tarjeta de Citas pendiente; verificar con `npx vitest run src/views/admin/__tests__/admin-hub-view.spec.ts` los casos con sesión, sin sesión y con error.
- [ ] 2.2 Registrar la ruta `/admin` con nombre `admin-hub` antes del catch-all en `src/router/index.ts`; verificar con `npx vitest run src/router` que resuelve la ruta.
- [ ] 2.3 Confirmar que `/admin` no se prerenderiza ni se indexa: verificar con `npm run build` que no existe `dist/admin.html`, que `dist/robots.txt` mantiene `Disallow: /admin` y que `dist/sitemap.xml` no incluye `/admin`.

## 3. Integración en los paneles existentes

- [ ] 3.1 Integrar `AdminNav` en `AdminBlogView.vue` y `AdminReviewsView.vue`, pasando la sección activa y conectando `logout` con sus manejadores actuales; verificar con `npx vitest run src/views/admin/__tests__` que la navegación aparece y el cierre de sesión sigue funcionando.
- [ ] 3.2 Crear `tests/e2e/admin-hub.spec.ts` con mocks de sesión y APIs para login desde `/admin`, navegación a blog y reseñas, vuelta al hub, logout y Citas deshabilitada; verificar con `npx playwright test tests/e2e/admin-hub.spec.ts`.
- [ ] 3.3 Ajustar selectores de `tests/e2e/admin-blog.spec.ts` y `tests/e2e/admin-reviews.spec.ts` si el menú introduce etiquetas ambiguas; verificar con `npx playwright test tests/e2e/admin-blog.spec.ts tests/e2e/admin-reviews.spec.ts`.

## 4. Documentación y verificación final

- [ ] 4.1 Actualizar `README.md` con `/admin` como entrada única, el menú de funciones y el enlace de citas pendiente; verificar que la navegación pública siga sin enlaces administrativos.
- [ ] 4.2 Ejecutar `npx vitest run`, `npm run typecheck`, `npm run lint`, `npm run build` y `npx playwright test`; corregir cualquier fallo.
- [ ] 4.3 Ejecutar `openspec validate add-admin-hub --strict` y confirmar que el cambio es válido.

## Workflow follow-up

- Al implementar `add-appointment-calendar`, comprobar que el enlace «Citas» se habilita solo con registrar `/admin/citas`.
- Archivar el change cuando se cumplan los requisitos de revisión del proyecto.
