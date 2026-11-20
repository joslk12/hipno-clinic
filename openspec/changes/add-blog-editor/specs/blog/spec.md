# Spec Delta

## Purpose

Permite al dueño administrar y publicar artículos del blog de forma segura, y muestra el blog público como páginas estáticas con metadatos por artículo.

## ADDED Requirements

### Requirement: Acceso administrativo

El área `/admin/blog` SHALL exigir una contraseña. La sesión SHALL usar una cookie HttpOnly, Secure y SameSite=Strict con expiración de 8 horas. Los intentos fallidos SHALL responder `401` y estar limitados. El cierre de sesión SHALL invalidar la cookie. `/admin` MUST NOT indexarse en buscadores.

#### Scenario: Inicio de sesión correcto

- **WHEN** la persona introduce la contraseña correcta
- **THEN** recibe una cookie de sesión y accede al panel de artículos

#### Scenario: Contraseña incorrecta

- **WHEN** la contraseña es incorrecta
- **THEN** recibe `401`, no se crea sesión y ve un mensaje de error

#### Scenario: Sesión expirada

- **WHEN** la cookie expiró o no es válida
- **THEN** la API administrativa responde `401` y la interfaz vuelve al login

#### Scenario: Demasiados intentos

- **WHEN** se superan cinco intentos fallidos en 15 minutos desde la misma IP
- **THEN** recibe `429` y debe esperar antes de reintentar

#### Scenario: Cierre de sesión

- **WHEN** la persona cierra sesión
- **THEN** la cookie se elimina y el panel vuelve al login

#### Scenario: Exclusión de buscadores

- **WHEN** un buscador accede a `/admin`
- **THEN** recibe `noindex, nofollow` y `robots.txt` desautoriza la ruta

### Requirement: Gestión de artículos

El panel SHALL permitir crear, editar, listar, eliminar, guardar como borrador, publicar y despublicar artículos. Cada artículo SHALL tener título, slug, extracto, contenido Markdown, portada opcional y estado. El slug SHALL ser único y generarse desde el título si se omite.

#### Scenario: Crear borrador

- **WHEN** se guarda un artículo como borrador
- **THEN** queda en estado borrador y no aparece en el blog público

#### Scenario: Publicar artículo

- **WHEN** se publica un artículo válido
- **THEN** cambia a publicado, recibe fecha de publicación y se incluye en la API pública

#### Scenario: Editar artículo

- **WHEN** se edita un artículo
- **THEN** se actualizan sus datos y su fecha de modificación

#### Scenario: Slug duplicado

- **WHEN** el slug solicitado ya existe
- **THEN** el sistema genera uno único sin sobrescribir el artículo existente

#### Scenario: Eliminar artículo

- **WHEN** se elimina un artículo
- **THEN** desaparece del panel y del blog público

#### Scenario: Datos inválidos

- **WHEN** faltan campos o no cumplen longitud
- **THEN** recibe `400` con errores por campo y no se guarda nada

### Requirement: Editor Markdown y vista previa

El editor SHALL ofrecer edición en Markdown, barra de herramientas para negritas, cursivas, títulos, listas, enlaces e imágenes, y una vista previa renderizada. La vista previa MUST sanear el HTML antes de mostrarlo.

#### Scenario: Vista previa

- **WHEN** se escribe Markdown y se abre la vista previa
- **THEN** se muestra el contenido formateado

#### Scenario: Barra de herramientas

- **WHEN** se usa un botón de la barra con texto seleccionado
- **THEN** se inserta la sintaxis correspondiente en la posición del cursor

#### Scenario: HTML inseguro en la vista previa

- **WHEN** el contenido incluye scripts o atributos de evento
- **THEN** la vista previa los elimina y no se ejecutan

#### Scenario: Edición en móvil

- **WHEN** se usa el editor en una pantalla pequeña
- **THEN** se puede alternar entre edición y vista previa sin desbordamiento

### Requirement: Imágenes del blog

El panel SHALL permitir subir imágenes JPEG, PNG, WebP o AVIF de hasta 5 MB e insertarlas en el artículo. Las imágenes SHALL servirse desde el mismo sitio con caché. Los archivos inválidos SHALL rechazarse.

#### Scenario: Subida válida

- **WHEN** se sube una imagen permitida y dentro del límite
- **THEN** se guarda, se devuelve su URL y se puede insertar en Markdown

#### Scenario: Archivo inválido

- **WHEN** el archivo supera 5 MB o no es de un tipo permitido
- **THEN** recibe `400` y no se guarda

#### Scenario: Servicio de imagen

- **WHEN** se solicita una imagen guardada
- **THEN** se entrega con su tipo de contenido y caché de larga duración

#### Scenario: Subida sin sesión

- **WHEN** se intenta subir una imagen sin sesión válida
- **THEN** recibe `401` y no se guarda

### Requirement: Sanitización del contenido

Al guardar, el servidor SHALL convertir Markdown a HTML saneado. SHALL permitir texto, encabezados, listas, enlaces `http`/`https`/`mailto`, imágenes `http`/`https`/relativas, código y citas. MUST eliminar scripts, estilos, iframes y atributos de evento.

#### Scenario: Markdown normal

- **WHEN** el contenido usa encabezados, listas y enlaces válidos
- **THEN** se guarda como HTML saneado y se publica tal cual

#### Scenario: Script o iframe

- **WHEN** el contenido incluye etiquetas `script` o `iframe`
- **THEN** se eliminan del HTML guardado

#### Scenario: Enlace peligroso

- **WHEN** un enlace usa `javascript:`
- **THEN** se elimina el atributo o el enlace no se publica como ejecutable

#### Scenario: Enlace externo

- **WHEN** el contenido incluye un enlace `https`
- **THEN** se conserva y se abre de forma segura

### Requirement: Publicación y rebuild

Al publicar, editar o eliminar un artículo publicado, el sistema SHALL disparar el build hook configurado. Si el hook falla o no está configurado, SHALL guardar el cambio y devolver una advertencia. El artículo SHALL aparecer en el blog cuando termine el rebuild.

#### Scenario: Publicar con hook

- **WHEN** se publica un artículo y el hook responde correctamente
- **THEN** el cambio se guarda y se inicia el rebuild

#### Scenario: Hook no configurado

- **WHEN** se publica sin `BLOG_BUILD_HOOK_URL`
- **THEN** el artículo se guarda y la interfaz muestra una advertencia para reconstruir manualmente

#### Scenario: Hook con error

- **WHEN** el hook falla
- **THEN** el artículo se guarda y la interfaz muestra una advertencia sin perder el contenido

#### Scenario: Borrador sin rebuild

- **WHEN** se guarda o edita un borrador
- **THEN** no se dispara el build hook

### Requirement: Blog público

`/blog` SHALL listar los artículos publicados con título, extracto, fecha y portada, del más reciente al más antiguo. `/blog/:slug` SHALL mostrar el artículo completo. Sin artículos, `/blog` SHALL mostrar un estado vacío. Un slug inexistente SHALL mostrar `404`.

#### Scenario: Listado con artículos

- **WHEN** existen artículos publicados
- **THEN** se muestran ordenados por fecha de publicación descendente

#### Scenario: Detalle de artículo

- **WHEN** se visita un slug publicado
- **THEN** se muestra título, fecha, portada y contenido completo

#### Scenario: Blog vacío

- **WHEN** no hay artículos publicados
- **THEN** se muestra un estado vacío

#### Scenario: Slug inexistente

- **WHEN** se visita un slug que no existe
- **THEN** se muestra la página 404

#### Scenario: Borrador oculto

- **WHEN** un artículo está en borrador
- **THEN** no aparece en el listado ni se puede acceder por URL pública

### Requirement: Metadatos y sitemap por artículo

Cada artículo publicado SHALL generar HTML estático con título, descripción, canonical, Open Graph de título, descripción, imagen y URL, y tipo `article`. Su URL SHALL incluirse en el sitemap. `/admin` MUST NOT aparecer en el sitemap y robots MUST desautorizarlo.

#### Scenario: Metadatos del artículo

- **WHEN** se genera el build de un artículo
- **THEN** su HTML contiene metadatos únicos y canonical absoluto

#### Scenario: Imagen para compartir

- **WHEN** el artículo tiene portada
- **THEN** `og:image` es una URL absoluta válida

#### Scenario: Sitemap

- **WHEN** se genera el sitemap
- **THEN** incluye `/blog` y cada artículo publicado

#### Scenario: Administración fuera del sitemap

- **WHEN** se genera el sitemap y robots
- **THEN** no incluyen `/admin` y robots lo desautoriza

### Requirement: API pública del blog

`GET /api/blog/posts` SHALL devolver solo artículos publicados, ordenados por fecha, con `id`, `slug`, `title`, `excerpt`, `contentHtml`, `coverImage`, `publishedAt` y `updatedAt`. MUST NOT exponer borradores, Markdown sin sanear ni datos administrativos.

#### Scenario: Solo publicados

- **WHEN** se consulta la API pública
- **THEN** solo aparecen artículos publicados

#### Scenario: Borradores excluidos

- **WHEN** existen borradores
- **THEN** no aparecen en la respuesta pública

#### Scenario: Sin datos administrativos

- **WHEN** se consulta la API pública
- **THEN** no se exponen estados internos, contraseñas ni tokens

### Requirement: Datos de build

El build SHALL obtener los artículos publicados desde la API pública y generar un archivo de datos usado por las páginas estáticas, el sitemap y las rutas prerenderizadas. Si la API no responde, SHALL conservar los datos existentes y continuar.

#### Scenario: Obtención correcta

- **WHEN** la API responde durante el build
- **THEN** se actualiza el archivo de datos y se generan las rutas de los artículos

#### Scenario: API no disponible

- **WHEN** la API no responde durante el build
- **THEN** se conservan los datos anteriores, se registra una advertencia y el build continúa

#### Scenario: Sin artículos

- **WHEN** no hay artículos publicados
- **THEN** el archivo de datos queda vacío y el blog muestra su estado vacío

#### Scenario: Rutas por artículo

- **WHEN** hay artículos publicados
- **THEN** se prerenderiza una ruta `/blog/<slug>` por cada uno

### Requirement: Despliegue y configuración

El despliegue SHALL documentarse con Netlify CLI o un build conectado al repositorio, incluyendo `BLOG_ADMIN_PASSWORD`, `BLOG_SESSION_SECRET`, `BLOG_BUILD_HOOK_URL` y la URL de API para builds locales. El resto del sitio MUST seguir funcionando si el panel o la API no están disponibles.

#### Scenario: Despliegue por CLI

- **WHEN** se despliega con Netlify CLI
- **THEN** las Functions y el panel administrativo están disponibles

#### Scenario: Variables ausentes

- **WHEN** faltan las variables administrativas
- **THEN** el login responde `503` y el blog público estático sigue funcionando

#### Scenario: URL administrativa

- **WHEN** se revisa la navegación pública
- **THEN** `/admin/blog` no aparece enlazada y está documentada solo para el dueño

#### Scenario: Build local

- **WHEN** se construye localmente sin la API
- **THEN** se usan los datos existentes y el build termina

### Requirement: Accesibilidad

El login, el editor, el listado y el artículo SHALL ser operables por teclado y lectores de pantalla. Los errores y confirmaciones SHALL anunciarse. Las imágenes SHALL tener texto alternativo cuando aporten información.

#### Scenario: Administración por teclado

- **WHEN** se usa el panel solo con teclado
- **THEN** se puede iniciar sesión, editar y publicar

#### Scenario: Anuncio de estados

- **WHEN** aparece un error o una confirmación
- **THEN** se anuncia mediante una región live

#### Scenario: Texto alternativo

- **WHEN** se muestra una imagen informativa
- **THEN** tiene texto alternativo; las decorativas se ocultan a lectores

#### Scenario: Artículo legible

- **WHEN** se navega un artículo con lector de pantalla
- **THEN** la estructura de encabezados y enlaces es comprensible
