# Spec Delta

## MODIFIED Requirements

### Requirement: Reglas de disponibilidad recurrente

El panel SHALL permitir crear, editar y eliminar reglas semanales de disponibilidad seleccionando uno o varios días de la semana a la vez, con hora de inicio, duración y servicio opcional. Las reglas SHALL generar horarios reservables solo dentro de un horizonte futuro definido y SHALL interpretarse en la zona horaria `America/Mexico_City`. El calendario público SHALL rotular cada mes con el mes cronológico que corresponde a la cuadrícula mostrada.

#### Scenario: Crear regla semanal

- **WHEN** el terapeuta guarda una regla de lunes 10:00 con duración de 60 minutos
- **THEN** los lunes dentro del horizonte aparecen como horarios reservables a las 10:00

#### Scenario: Regla con varios días

- **WHEN** el terapeuta selecciona lunes, martes y viernes a las 10:00 con duración de 60 minutos y guarda
- **THEN** se crea una regla por cada día seleccionado y los tres días dentro del horizonte aparecen como horarios reservables a las 10:00

#### Scenario: Editar un grupo de días

- **WHEN** el terapeuta edita una de las reglas del grupo y cambia los días seleccionados
- **THEN** se conservan las reglas de los días que siguen seleccionados, se eliminan las de los días quitados y se crean las de los días nuevos, manteniendo hora, duración, servicio y vigencia

#### Scenario: Sin días seleccionados

- **WHEN** el terapeuta guarda sin seleccionar ningún día
- **THEN** se muestra un error en el campo de días y no se crea ni modifica ninguna regla

#### Scenario: Etiqueta del mes

- **WHEN** el calendario muestra la cuadrícula de noviembre de 2026
- **THEN** el encabezado y la descripción accesible indican «noviembre de 2026», no el mes siguiente

### Requirement: Horarios individuales y excepciones

El panel SHALL permitir crear horarios sueltos con fecha, hora y duración, y bloquear o desbloquear horarios generados por reglas desde el calendario mensual. Al seleccionar un día, el panel SHALL mostrar todas sus horas con estado disponible, reservada o bloqueada. Un horario bloqueado MUST NOT aparecer como disponible para reserva.

#### Scenario: Bloquear una hora desde el calendario

- **WHEN** el terapeuta selecciona un día en el calendario del panel y pulsa «BLOQUEAR» en una hora
- **THEN** esa hora deja de aparecer como disponible en el sitio público, aunque no tuviera una fila previa en `schedule_slots`

#### Scenario: Desbloquear una hora

- **WHEN** el terapeuta pulsa «DESBLOQUEAR» en una hora futura bloqueada sin reserva activa
- **THEN** la hora vuelve a aparecer como disponible en el sitio público

#### Scenario: Bloquear horas posteriores a una reserva

- **WHEN** una sesión a las 10:00 puede extenderse y el terapeuta pulsa «BLOQUEAR DESDE AQUÍ» en las 11:00 con límite las 13:00
- **THEN** las horas 11:00, 12:00 y 13:00 quedan bloqueadas, creando horarios manuales para las que aún no existieran, y la cita de las 10:00 conserva su estado

#### Scenario: Límite anterior al inicio

- **WHEN** el límite de bloqueo es anterior o igual a la hora elegida
- **THEN** la operación se rechaza con un mensaje y no se modifica ningún horario

#### Scenario: Fecha pasada

- **WHEN** el terapeuta intenta crear o desbloquear un horario en el pasado
- **THEN** la operación se rechaza con un mensaje explicativo
