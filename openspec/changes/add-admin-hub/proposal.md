# Proposal

## Why

Hoy el área privada no tiene una entrada única: `/admin/blog` y `/admin/resenas` son rutas aisladas, cada una con su propio acceso, y pronto se sumará `/admin/citas`. El dueño debe recordar cada URL y no puede saltar entre funciones sin volver a escribirla.

## What Changes

- Se agrega `/admin` como entrada única al área administrativa. Comprueba la sesión existente y muestra el login cuando no hay sesión válida.
- Se agrega un menú compartido de administración con enlaces a **Blog** (`/admin/blog`), **Reseñas** (`/admin/resenas`) y **Citas** (`/admin/citas`), además de la acción de cerrar sesión.
- La opción **Citas** se muestra deshabilitada con la etiqueta «Próximamente» mientras el change `add-appointment-calendar` no esté implementado; se habilita al existir la ruta.
- El menú se reutiliza en el hub y en las vistas administrativas, sin introducir un segundo login ni duplicar la lógica de verificación de sesión.
- La navegación pública sigue sin enlazar ninguna ruta `/admin`; robots y sitemap siguen desautorizando el área.
- No se agregan endpoints ni variables de entorno: se reutilizan `/api/admin/session`, `/api/admin/login` y `/api/admin/logout`.

## Capabilities

### New Capabilities

- `admin-navigation`: entrada única al área administrativa y navegación compartida entre las secciones protegidas.

### Modified Capabilities

## Impact

- **Frontend**: nueva vista `src/views/admin/AdminHubView.vue`, nuevo componente `src/components/admin/AdminNav.vue`, registro de `/admin` en `src/router/index.ts`, integración del menú en `AdminBlogView.vue` y `AdminReviewsView.vue`, y la futura vista de citas. Se actualizan pruebas unitarias y E2E, y el README.
- **Backend**: sin cambios; se reutiliza la sesión HMAC de `netlify/lib/blog/auth.ts` y las Functions de sesión ya existentes.
- **Dependencias**: `add-appointment-calendar` define `/admin/citas`; mientras tanto el enlace queda deshabilitado.
- **Seguridad**: misma cookie de sesión, sin enlaces desde la navegación pública y sin exponer datos administrativos en las páginas públicas.
