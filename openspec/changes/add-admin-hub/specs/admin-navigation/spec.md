# Spec Delta

## Purpose

Define la entrada única al área administrativa y la navegación compartida entre las secciones protegidas, para que el dueño pueda acceder y moverse entre blog, reseñas y citas con una sola sesión.

## ADDED Requirements

### Requirement: Entrada única al área administrativa

La ruta `/admin` SHALL comprobar la sesión administrativa y mostrar el menú de funciones cuando sea válida. Si no hay sesión o la sesión ha caducado, SHALL mostrar el acceso con la misma contraseña administrativa y MUST NOT revelar datos ni acciones de las secciones protegidas.

#### Scenario: Acceso con sesión válida

- **WHEN** una persona con sesión administrativa válida abre `/admin`
- **THEN** ve el menú con las funciones disponibles sin volver a iniciar sesión

#### Scenario: Acceso sin sesión

- **WHEN** una persona sin sesión abre `/admin`
- **THEN** se le muestra el formulario de acceso y no ve clientes, artículos ni citas

#### Scenario: Error al verificar la sesión

- **WHEN** la verificación de sesión falla por un error distinto de `401`
- **THEN** se muestra un mensaje de error y no se exponen funciones administrativas

### Requirement: Navegación compartida entre secciones

El menú administrativo SHALL estar disponible en `/admin` y en cada sección protegida, con enlaces hacia Blog, Reseñas y Citas, una indicación de la sección activa y la acción de cerrar sesión. La navegación SHALL reutilizar la sesión existente; MUST NOT exigir un segundo inicio de sesión al cambiar de sección.

#### Scenario: Ir del hub a una sección

- **WHEN** el administrador elige «Blog» o «Reseñas» desde `/admin`
- **THEN** navega a `/admin/blog` o `/admin/resenas` sin iniciar sesión de nuevo

#### Scenario: Volver al hub desde una sección

- **WHEN** el administrador elige «Inicio» en el menú desde cualquier sección
- **THEN** vuelve a `/admin` con la sesión todavía válida

#### Scenario: Sección activa

- **WHEN** el administrador abre `/admin/resenas`
- **THEN** el menú marca «Reseñas» como sección activa

#### Scenario: Cerrar sesión desde el menú

- **WHEN** el administrador elige «Cerrar sesión» en el menú
- **THEN** la sesión se invalida y cualquier sección protegida vuelve a pedir acceso

### Requirement: Disponibilidad de la sección de citas

El menú SHALL mostrar «Citas» deshabilitada con la etiqueta «Próximamente» mientras `/admin/citas` no exista. Cuando la ruta esté disponible, el enlace SHALL permitir navegar a ella y la etiqueta MUST NOT mostrarse.

#### Scenario: Citas aún no implementada

- **WHEN** el administrador ve el menú antes de implementar `/admin/citas`
- **THEN** «Citas» aparece deshabilitada, con «Próximamente», y no navega

#### Scenario: Citas implementada

- **WHEN** `/admin/citas` está disponible y el administrador elige «Citas»
- **THEN** navega a esa sección sin iniciar sesión de nuevo

### Requirement: No exposición pública del área administrativa

El hub y el menú administrativo MUST NOT aparecer en la navegación pública ni en el sitemap. `/admin` SHALL estar desautorizado para buscadores de la misma forma que las demás rutas administrativas.

#### Scenario: Navegación pública

- **WHEN** una visitante consulta la navegación del sitio público
- **THEN** no aparece ningún enlace hacia `/admin` ni hacia sus secciones

#### Scenario: Indexación

- **WHEN** un buscador consulta robots o la página `/admin`
- **THEN** el área está desautorizada y la página indicada no debe indexarse
