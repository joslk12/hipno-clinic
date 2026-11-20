# Spec Delta

## MODIFIED Requirements

### Requirement: Página pública de reseñas

El sitio SHALL exponer `/resenas` con el promedio, el total y el listado de reseñas aprobadas, ordenadas de la más reciente a la más antigua. Si no hay reseñas, SHALL mostrar un estado vacío. El formulario de publicación SHALL mostrarse únicamente cuando la visita provenga de una invitación vigente.

#### Scenario: Página con reseñas aprobadas

- **WHEN** una persona visita `/resenas` y existen reseñas aprobadas
- **THEN** ve el promedio con un decimal, el total y las reseñas con nombre, calificación, fecha y mensaje, de la más reciente a la más antigua

#### Scenario: Página sin reseñas

- **WHEN** no existen reseñas aprobadas
- **THEN** ve un estado vacío y el formulario solo aparece si la visita proviene de una invitación vigente

#### Scenario: Error al cargar

- **WHEN** la consulta de reseñas falla
- **THEN** ve un mensaje de error y un control para reintentar, sin quedarse en estado de carga

### Requirement: Envío y validación del formulario

El formulario SHALL solicitar nombre (2–60 caracteres), calificación entera de 1 a 5, mensaje (10–1000 caracteres) y consentimiento explícito de publicación. SHALL validar en cliente y servidor, mostrar errores por campo y conservar los datos si el envío falla. El envío SHALL incluir el token de la invitación que habilitó el formulario y SHALL rechazarse si la invitación no está vigente.

#### Scenario: Envío válido

- **WHEN** la persona completa los campos, acepta la publicación y envía con una invitación vigente
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

#### Scenario: Envío sin invitación vigente

- **WHEN** se intenta crear una reseña con un token ausente, inválido, expirado o ya canjeado
- **THEN** la solicitud se rechaza con `401` o `403` y no se crea ninguna reseña

## ADDED Requirements

### Requirement: Acceso a la publicación mediante invitación

La publicación de reseñas SHALL estar condicionada a una invitación vigente. Sin invitación, o con una invitación inválida, expirada o ya canjeada, el sistema MUST NOT mostrar el formulario en `/resenas` ni aceptar un envío directo a la API.

#### Scenario: Visita sin invitación

- **WHEN** una persona visita `/resenas` sin parámetro de token
- **THEN** ve el resumen y las reseñas aprobadas, pero no ve el formulario de publicación

#### Scenario: Visita con invitación vigente

- **WHEN** una persona abre `/resenas?token=<token>` con una invitación vigente
- **THEN** ve el formulario de publicación junto al resumen y al listado

#### Scenario: Invitación no vigente

- **WHEN** una persona abre `/resenas?token=<token>` con un token inexistente, expirado o ya canjeado
- **THEN** no ve el formulario, ve un mensaje que explica que la liga ya no es válida y puede solicitar una nueva
