# Spec Delta

## MODIFIED Requirements

### Requirement: Reglas de disponibilidad recurrente

El panel SHALL permitir configurar la disponibilidad semanal en una cuadrícula días × horas, marcando una o varias celdas y guardando el conjunto en una sola operación. Cada celda representará una regla semanal con hora de inicio, duración y servicio opcional. El panel SHALL ofrecer selección en bloque por fila y por columna, y SHALL aplicar al guardar un diff que elimine, actualice y cree solo las reglas necesarias dentro del scope. Las reglas SHALL generar horarios reservables solo dentro de un horizonte futuro definido y SHALL interpretarse en la zona horaria `America/Mexico_City`. El calendario público SHALL rotular cada mes con el mes cronológico que corresponde a la cuadrícula mostrada.

#### Scenario: Publicar una hora desde la cuadrícula

- **WHEN** el terapeuta marca la celda de lunes 10:00 con duración de 60 minutos y guarda
- **THEN** se crea una regla para el lunes a las 10:00 y ese horario aparece como reservable los lunes dentro del horizonte

#### Scenario: Selección en bloque

- **WHEN** el terapeuta pulsa «Todo» en la columna del martes y «Todos» en la fila de las 14:00
- **THEN** quedan marcadas todas las horas del martes y las 14:00 de todos los días, y un solo guardado crea las reglas correspondientes

#### Scenario: Editar un grupo de reglas

- **WHEN** el terapeuta abre un grupo desde «Reglas publicadas», marca una celda nueva y desmarca otra, y guarda
- **THEN** se conservan las reglas de las celdas que siguen marcadas, se elimina la de la celda desmarcada y se crea la nueva, sin tocar otros grupos

#### Scenario: Guardar sin celdas marcadas

- **WHEN** el terapeuta guarda sin seleccionar ninguna hora
- **THEN** se muestra un error y no se crea ni modifica ninguna regla

#### Scenario: Etiqueta del mes

- **WHEN** el calendario muestra la cuadrícula de noviembre de 2026
- **THEN** el encabezado y la descripción accesible indican «noviembre de 2026», no el mes siguiente

### Requirement: Horario de atención y reglas antiguas

El sistema SHALL aceptar como horas de inicio publicables solo entre las `06:00` y las `22:00`, ambas inclusive. Las reglas o horarios manuales existentes fuera de ese rango MUST NOT generar horarios reservables ni aparecer en la cuadrícula, en «Reglas publicadas» ni en el calendario del panel. El panel SHALL mostrar un aviso con las reglas fuera de rango y permitir eliminarlas explícitamente. El backend SHALL rechazar nuevas reglas y horarios manuales fuera de rango con el mensaje `La hora debe estar entre las 06:00 y las 22:00.`

#### Scenario: Horario fantasma de medianoche

- **WHEN** existe una regla antigua con `startTime = '00:00'`
- **THEN** no aparece ninguna hora de medianoche en el calendario público, en la cuadrícula ni en la tabla de reglas, y el panel ofrece eliminarla

#### Scenario: Limpiar reglas fuera de horario

- **WHEN** el terapeuta pulsa «ELIMINAR REGLAS FUERA DE HORARIO»
- **THEN** se eliminan esas reglas y dejan de mostrar el aviso

#### Scenario: Rechazar una hora fuera de rango

- **WHEN** el terapeuta intenta crear una regla o un horario manual a las 23:30
- **THEN** la petición se rechaza con el mensaje de horario permitido

### Requirement: Horarios individuales y excepciones

El panel SHALL permitir crear horarios sueltos con fecha, hora y duración, y bloquear o desbloquear horarios generados por reglas desde el calendario mensual. Al seleccionar un día, el panel SHALL mostrar todas sus horas con estado disponible, reservada o bloqueada. Un horario bloqueado MUST NOT aparecer como disponible para reserva. La tabla «Horarios individuales» SHALL mostrar solo horarios creados manualmente. El panel SHALL permitir eliminar materializaciones de reglas sin reserva activa.

#### Scenario: Bloquear una hora desde el calendario

- **WHEN** el terapeuta selecciona un día en el calendario del panel y pulsa «BLOQUEAR» en una hora
- **THEN** esa hora deja de aparecer como disponible en el sitio público, aunque no tuviera una fila previa en `schedule_slots`

#### Scenario: Desbloquear una hora

- **WHEN** el terapeuta pulsa «DESBLOQUEAR» en una hora futura bloqueada sin reserva activa
- **THEN** la hora vuelve a aparecer como disponible en el sitio público

#### Scenario: Eliminar una materialización de regla

- **WHEN** el terapeuta elimina un horario generado por una regla que no tiene reserva activa
- **THEN** la fila de `schedule_slots` se elimina y la hora vuelve a derivarse de la regla

#### Scenario: Eliminar una materialización con reserva

- **WHEN** el terapeuta intenta eliminar un horario que tiene una reserva activa
- **THEN** la operación se rechaza con `409` y la reserva se conserva

#### Scenario: Bloquear horas posteriores a una reserva

- **WHEN** una sesión a las 10:00 puede extenderse y el terapeuta pulsa «BLOQUEAR DESDE AQUÍ» en las 11:00 con límite las 13:00
- **THEN** las horas 11:00, 12:00 y 13:00 quedan bloqueadas, creando horarios manuales para las que aún no existieran, y la cita de las 10:00 conserva su estado

#### Scenario: Límite anterior al inicio

- **WHEN** el límite de bloqueo es anterior o igual a la hora elegida
- **THEN** la operación se rechaza con un mensaje y no se modifica ningún horario

#### Scenario: Fecha pasada

- **WHEN** el terapeuta intenta crear o desbloquear un horario en el pasado
- **THEN** la operación se rechaza con un mensaje explicativo

### Requirement: Reglas publicadas agrupadas

La tabla «Reglas publicadas» SHALL mostrar una sola fila por bloque de reglas con igual duración, servicio, vigencia y estado, enumerando en celdas de texto los días y las horas del bloque. No SHALL generar una fila por día y hora.

#### Scenario: Cuarenta reglas en un bloque

- **WHEN** existen 40 reglas entre lunes y viernes con las mismas horas, duración, servicio y vigencia
- **THEN** la tabla muestra una sola fila con los días y horas del bloque y el encabezado indica «40 reglas agrupadas en 1 bloque»

#### Scenario: Editar un bloque

- **WHEN** el terapeuta pulsa «Editar» en un bloque
- **THEN** la cuadrícula se carga con las celdas de ese bloque y el guardado afecta solo a sus reglas
