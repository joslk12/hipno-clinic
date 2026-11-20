# Spec Delta

## Purpose

Permite que las clientas publiquen reseñas con calificación y que el sitio muestre prueba social actualizada, con filtros antispam y moderación administrativa.

## ADDED Requirements

### Requirement: Página pública de reseñas

El sitio SHALL exponer `/resenas` con el promedio, el total y el listado de reseñas aprobadas, ordenadas de la más reciente a la más antigua. Si no hay reseñas, SHALL mostrar un estado vacío que invite a dejar la primera.

#### Scenario: Página con reseñas aprobadas

- **WHEN** una persona visita `/resenas` y existen reseñas aprobadas
- **THEN** ve el promedio con un decimal, el total y las reseñas con nombre, calificación, fecha y mensaje, de la más reciente a la más antigua

#### Scenario: Página sin reseñas

- **WHEN** no existen reseñas aprobadas
- **THEN** ve un estado vacío y el formulario sigue disponible

#### Scenario: Error al cargar

- **WHEN** la consulta de reseñas falla
- **THEN** ve un mensaje de error y un control para reintentar, sin quedarse en estado de carga

### Requirement: Envío y validación del formulario

El formulario SHALL solicitar nombre (2–60 caracteres), calificación entera de 1 a 5, mensaje (10–1000 caracteres) y consentimiento explícito de publicación. SHALL validar en cliente y servidor, mostrar errores por campo y conservar los datos si el envío falla.

#### Scenario: Envío válido

- **WHEN** la persona completa los campos, acepta la publicación y envía
- **THEN** se crea la reseña, se muestra una confirmación y, si fue aprobada, aparece al inicio del listado

#### Scenario: Datos inválidos

- **WHEN** el nombre, la calificación o el mensaje no cumplen las reglas, o falta el consentimiento
- **THEN** no se envía la solicitud, se muestran los errores por campo y el foco va al primer campo inválido

#### Scenario: Error de red

- **WHEN** el envío falla por red o servidor
- **THEN** se muestra un mensaje de error y se conservan los valores capturados

#### Scenario: Envío duplicado

- **WHEN** la persona intenta enviar mientras hay una solicitud en curso
- **THEN** solo se procesa una solicitud

### Requirement: Publicación automática y retención de spam

El sistema SHALL publicar automáticamente las reseñas que pasen la validación y no presenten señales de spam. Las reseñas con enlaces, términos bloqueados o patrones sospechosos SHALL guardarse como pendientes y MUST NOT aparecer en la API pública.

#### Scenario: Reseña limpia

- **WHEN** la reseña es válida y no tiene señales de spam
- **THEN** se guarda como aprobada y aparece en la API pública

#### Scenario: Reseña sospechosa

- **WHEN** la reseña contiene enlaces, términos bloqueados o patrones sospechosos
- **THEN** se guarda como pendiente, no aparece en la API pública y la persona ve que se publicará tras revisión

### Requirement: Protección antispam y límite de envíos

El sistema SHALL descartar los envíos con el campo honeypot completado y SHALL limitar a tres reseñas por IP cada 24 horas. Al exceder el límite SHALL responder `429`. La IP MUST almacenarse solo como hash no reversible.

#### Scenario: Honeypot completado

- **WHEN** un envío incluye el campo oculto honeypot
- **THEN** se descarta, no se almacena ni se publica, y la respuesta no revela el filtro

#### Scenario: Dentro del límite

- **WHEN** la IP envía tres reseñas o menos en 24 horas
- **THEN** los envíos se procesan normalmente

#### Scenario: Límite excedido

- **WHEN** la IP intenta una cuarta reseña en 24 horas
- **THEN** recibe `429` y un mensaje para intentar más tarde

#### Scenario: Privacidad de la IP

- **WHEN** se registra el contador de envíos
- **THEN** no se guarda la IP en claro

### Requirement: API pública de reseñas

`GET /api/reviews` SHALL devolver solo reseñas aprobadas, con `id`, `name`, `rating`, `message` y `createdAt`, ordenadas de la más reciente a la más antigua y con un máximo de 50. SHALL incluir un resumen con `average` y `count`. MUST NOT exponer reseñas pendientes ni datos administrativos.

#### Scenario: Respuesta con reseñas

- **WHEN** se consulta `GET /api/reviews` y hay reseñas aprobadas
- **THEN** devuelve el listado aprobado, el resumen y como máximo las 50 más recientes

#### Scenario: Respuesta sin reseñas

- **WHEN** no hay reseñas aprobadas
- **THEN** devuelve un arreglo vacío y un resumen con promedio 0 y total 0

#### Scenario: Error de almacenamiento

- **WHEN** el almacenamiento falla
- **THEN** devuelve `500` con un error JSON, sin datos parciales

### Requirement: Moderación administrativa

El sistema SHALL permitir listar reseñas pendientes, aprobarlas y eliminarlas mediante endpoints autenticados con token administrativo. `GET /api/reviews?status=pending` SHALL devolver las reseñas pendientes para su revisión. Sin token o con token inválido SHALL responder `401` o `403`; si el token no está configurado, `503`. Los cambios SHALL reflejarse en la API pública.

#### Scenario: Listar reseñas pendientes

- **WHEN** se consulta `GET /api/reviews?status=pending` con un token válido
- **THEN** devuelve las reseñas pendientes, sin incluirlas en la API pública

#### Scenario: Aprobar una reseña

- **WHEN** se aprueba una reseña pendiente con un token válido
- **THEN** cambia a aprobada y aparece en la API pública

#### Scenario: Eliminar una reseña

- **WHEN** se elimina una reseña con un token válido
- **THEN** desaparece de la API pública

#### Scenario: Acceso no autorizado

- **WHEN** falta el token o es inválido
- **THEN** responde `401` o `403` y no modifica datos

#### Scenario: Administración no configurada

- **WHEN** el token administrativo no está definido en el entorno
- **THEN** los endpoints administrativos responden `503`

### Requirement: Privacidad y presentación segura

La información pública de una reseña SHALL limitarse a nombre, calificación, mensaje y fecha. El sistema MUST NOT publicar correo, teléfono, IP ni token. El contenido MUST mostrarse como texto plano, nunca como HTML interpretado.

#### Scenario: Datos visibles

- **WHEN** se muestra una reseña
- **THEN** solo se ven nombre, calificación, mensaje y fecha

#### Scenario: Contenido con HTML

- **WHEN** el mensaje contiene etiquetas HTML
- **THEN** se muestran como texto literal, sin ejecutarse

### Requirement: Accesibilidad del formulario y listado

El formulario y el listado SHALL ser operables por teclado y lectores de pantalla. La calificación SHALL usar un grupo de radios con leyenda; las estrellas visuales SHALL ser decorativas y el valor SHALL comunicarse en texto. Errores y confirmaciones SHALL anunciarse con regiones live.

#### Scenario: Operación por teclado

- **WHEN** una persona navega con teclado
- **THEN** puede elegir la calificación y enviar el formulario sin usar el ratón

#### Scenario: Lectura de la calificación

- **WHEN** un lector de pantalla enfoca la calificación
- **THEN** anuncia el grupo, la opción seleccionada y el valor en texto, por ejemplo "4 de 5 estrellas"

#### Scenario: Anuncio de estados

- **WHEN** aparece un error o una confirmación
- **THEN** se anuncia mediante una región live con el rol adecuado

### Requirement: Descubrimiento y metadatos

`/resenas` SHALL estar enlazada desde la navegación principal y el menú móvil, incluida en el sitemap y con título, descripción, canonical y Open Graph únicos.

#### Scenario: Navegación

- **WHEN** una persona usa la navegación de escritorio o móvil
- **THEN** encuentra el enlace "Reseñas" y llega a `/resenas`

#### Scenario: Metadatos y sitemap

- **WHEN** se genera el build
- **THEN** `/resenas` aparece en el sitemap y su HTML tiene metadatos y canonical únicos

### Requirement: Despliegue con Functions

El despliegue SHALL documentarse y configurarse con Netlify CLI para incluir Functions y Blobs, con las variables `REVIEWS_ADMIN_TOKEN` y `REVIEWS_RATE_SALT`. El resto del sitio MUST seguir funcionando como build estático aunque la API no esté disponible.

#### Scenario: Despliegue por CLI

- **WHEN** se despliega con Netlify CLI
- **THEN** `/api/reviews` responde y la página de reseñas puede leer y crear reseñas

#### Scenario: Variables administrativas ausentes

- **WHEN** falta `REVIEWS_ADMIN_TOKEN`
- **THEN** la API pública sigue funcionando y los endpoints administrativos responden `503`

#### Scenario: API no disponible

- **WHEN** el sitio se sirve sin Functions
- **THEN** la página de reseñas muestra un mensaje de no disponibilidad y el resto del sitio funciona
