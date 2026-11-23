# Spec Delta

## Purpose

Centralizar artículos, clientas y citas en Netlify DB (Postgres/Neon) y conservar Netlify Blobs para imágenes y datos operativos no migrados.

## ADDED Requirements

### Requirement: Conexión configurable a Postgres

El sistema SHALL usar `@netlify/neon` con la variable `DATABASE_URL` o `NETLIFY_DATABASE_URL`. Si ninguna está definida, SHALL seguir usando los stores existentes de Netlify Blobs para artículos y clientas, sin fallar el sitio. La credencial MUST NOT guardarse en el repositorio.

#### Scenario: Variable configurada

- **WHEN** `DATABASE_URL` está definida en el entorno de las Functions
- **THEN** los artículos y las clientas se leen y escriben en Postgres

#### Scenario: Variable ausente

- **WHEN** no hay `DATABASE_URL` ni `NETLIFY_DATABASE_URL`
- **THEN** el sitio sigue funcionando con los stores de Blobs actuales

### Requirement: Esquema idempotente

La base de datos SHALL crear las tablas `blog_posts`, `review_clients`, `availability_rules`, `schedule_slots`, `appointments` y `migration_state` de forma idempotente antes de la primera consulta. El índice único parcial de `appointments` SHALL garantizar una sola reserva activa por `slot_key`.

#### Scenario: Arranque en frío

- **WHEN** una Function accede a la base de datos por primera vez
- **THEN** el esquema existe y no se duplica en arranques posteriores

#### Scenario: Reintento tras fallo

- **WHEN** falla la creación del esquema o la conexión
- **THEN** la inicialización se descarta y se reintenta en la siguiente petición

### Requirement: Migración única desde Blobs

El sistema SHALL copiar una sola vez los artículos (`post:`) y las clientas (`client:`) existentes en Netlify Blobs a Postgres, sin sobrescribir registros ya presentes, y SHALL registrar la marca en `migration_state`. Las imágenes (`image:`) MUST NOT migrarse.

#### Scenario: Primer arranque con datos

- **WHEN** hay artículos y clientas en Blobs y la marca no existe
- **THEN** se copian a Postgres y se registra la marca

#### Scenario: Arranques posteriores

- **WHEN** la marca ya existe
- **THEN** no se vuelve a leer ni a copiar desde Blobs

#### Scenario: Blobs no disponible

- **WHEN** la lectura de Blobs falla durante la migración
- **THEN** se omite la migración sin marcar, para reintentarla después
