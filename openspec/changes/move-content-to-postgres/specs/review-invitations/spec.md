# Spec Delta

## Purpose

El registro de clientas para invitaciones de reseñas pasa a Postgres, sin modificar el ciclo de vida de las invitaciones ni el flujo manual de WhatsApp.

## ADDED Requirements

### Requirement: Repositorio de clientas en Postgres

El panel SHALL guardar, listar, editar y eliminar clientas en la tabla `review_clients` cuando haya una base de datos configurada. El orden por defecto SHALL ser el más reciente primero y los campos `createdAt` y `updatedAt` SHALL conservarse como fechas ISO.

#### Scenario: Alta de clienta

- **WHEN** el administrador guarda una clienta con nombre, correo y WhatsApp
- **THEN** se inserta en `review_clients` y aparece en el listado del panel

#### Scenario: Edición de clienta

- **WHEN** se edita una clienta migrada desde Blobs
- **THEN** se actualiza la misma fila de Postgres conservando su `id` y `createdAt`

### Requirement: Invitaciones sin migrar

Las invitaciones, su historial y el mensaje manual de WhatsApp SHALL permanecer en el store `review-invitations` de Netlify Blobs. El cambio de repositorio de clientas MUST NOT alterar las ligas existentes ni su estado.

#### Scenario: Ligas existentes

- **WHEN** se abre el panel de reseñas después de la migración
- **THEN** las invitaciones anteriores siguen vigentes y asociadas a su clienta

#### Scenario: Generar mensaje manual

- **WHEN** el administrador genera el mensaje de WhatsApp para una clienta migrada
- **THEN** se produce el mismo texto y la misma liga `wa.me` que antes
