# Spec Delta

## Purpose

Permite que el terapeuta publique disponibilidad en un calendario, que las personas reserven de inmediato una fecha y hora sin dobles reservas, y que el terapeuta administre y cancele las citas desde el panel.

## ADDED Requirements

### Requirement: Reglas de disponibilidad recurrente

El panel SHALL permitir crear, editar y eliminar reglas semanales de disponibilidad con día de la semana, hora de inicio, duración y servicio opcional. Las reglas SHALL generar horarios reservables solo dentro de un horizonte futuro definido y SHALL interpretarse en la zona horaria `America/Mexico_City`.

#### Scenario: Crear regla semanal

- **WHEN** el terapeuta guarda una regla de lunes 10:00 con duración de 60 minutos
- **THEN** los lunes dentro del horizonte aparecen como horarios reservables a las 10:00

#### Scenario: Regla con servicio

- **WHEN** la regla se asocia a un servicio con duración de 90 minutos
- **THEN** el horario generado usa esa duración y se ofrece para ese servicio

#### Scenario: Editar o eliminar regla

- **WHEN** el terapeuta edita o elimina una regla
- **THEN** los horarios futuros generados por esa regla se actualizan o desaparecen en consecuencia

#### Scenario: Regla inválida

- **WHEN** la hora, el día o la duración no son válidos, o la regla se solapa con otra del mismo terapeuta
- **THEN** se muestran errores por campo y la regla no se guarda

### Requirement: Horarios individuales y excepciones

El panel SHALL permitir crear horarios sueltos con fecha, hora y duración, y bloquear o desbloquear horarios generados por reglas. Un horario bloqueado MUST NOT aparecer como disponible para reserva.

#### Scenario: Horario individual

- **WHEN** el terapeuta agrega un horario individual para una fecha concreta
- **THEN** ese horario aparece como reservable en el calendario público

#### Scenario: Bloquear un horario

- **WHEN** el terapeuta bloquea un horario generado o individual
- **THEN** el horario desaparece de la disponibilidad pública sin eliminar el registro

#### Scenario: Desbloquear un horario

- **WHEN** el terapeuta desbloquea un horario y está en el futuro
- **THEN** el horario vuelve a aparecer como disponible si no tiene una reserva activa

#### Scenario: Fecha pasada

- **WHEN** el terapeuta intenta crear o desbloquear un horario en el pasado
- **THEN** la operación se rechaza con un mensaje explicativo

### Requirement: Consulta pública de horarios disponibles

El sistema SHALL exponer los horarios disponibles dentro de un rango de fechas, excluyendo horarios pasados, bloqueados y reservados. La respuesta SHALL contener solo identificador de horario, fecha y hora de inicio, duración y servicio, sin datos administrativos ni de otras personas.

#### Scenario: Rango con horarios libres

- **WHEN** una persona consulta la disponibilidad de un rango con horarios libres
- **THEN** ve únicamente los horarios futuros que puede reservar

#### Scenario: Horarios ocupados

- **WHEN** un horario ya tiene una reserva activa o está bloqueado
- **THEN** no aparece en la respuesta

#### Scenario: Sin disponibilidad

- **WHEN** no hay reglas ni horarios individuales vigentes en el rango
- **THEN** la respuesta es una lista vacía y el sitio aplica el formulario de contacto habitual

#### Scenario: Privacidad de la respuesta

- **WHEN** se consulta la disponibilidad pública
- **THEN** la respuesta no incluye nombres, correos, teléfonos ni notas del terapeuta

### Requirement: Reserva inmediata sin dobles reservas

El sistema SHALL permitir reservar un horario disponible enviando nombre, correo y mensaje, y SHALL marcarlo como ocupado como parte de la misma operación. Si dos personas intentan reservar el mismo horario, solo una SHALL tener éxito y la otra SHALL recibir un error con opción de elegir otro horario.

#### Scenario: Reserva exitosa

- **WHEN** una persona envía una reserva para un horario libre con datos válidos
- **THEN** se crea la cita con estado reservada, el horario deja de estar disponible y se muestra una confirmación con fecha y hora

#### Scenario: Doble reserva simultánea

- **WHEN** dos personas envían reservas para el mismo horario al mismo tiempo
- **THEN** solo se crea una cita y la otra recibe un error `409`

#### Scenario: Horario ya ocupado

- **WHEN** se intenta reservar un horario bloqueado o ya reservado
- **THEN** se rechaza con `409` y no se crea la cita

#### Scenario: Datos de contacto inválidos

- **WHEN** faltan datos obligatorios o el correo no es válido
- **THEN** se rechaza con `400`, se muestran errores por campo y el horario sigue disponible

### Requirement: Administración de citas

El panel SHALL listar las citas con fecha, hora, servicio, datos de contacto y estado, y SHALL permitir cancelar una cita. Al cancelar, el horario correspondiente SHALL volver a estar disponible salvo que esté bloqueado explícitamente.

#### Scenario: Listado de citas

- **WHEN** el terapeuta abre la sección de citas
- **THEN** ve las citas ordenadas por fecha y hora, con su estado y datos de contacto

#### Scenario: Cancelar cita

- **WHEN** el terapeuta cancela una cita reservada
- **THEN** su estado cambia a cancelada y el horario vuelve a aparecer como disponible

#### Scenario: Cancelar cita pasada

- **WHEN** el terapeuta intenta cancelar una cita cuya hora ya pasó
- **THEN** la operación se rechaza con un mensaje y la cita conserva su estado

#### Scenario: Cita cancelada

- **WHEN** se consulta un horario cuya cita fue cancelada
- **THEN** el horario puede volver a reservarse si no está bloqueado

### Requirement: Notificación de nuevas citas al terapeuta

Cuando se crea una cita, el sistema SHALL enviar un aviso al terapeuta por correo y WhatsApp usando los proveedores configurados. La notificación SHALL incluir fecha, hora, servicio y datos de contacto de la persona. Si un proveedor no está configurado o falla, la cita MUST NOT depender de él para quedar guardada.

#### Scenario: Proveedores configurados

- **WHEN** se crea una cita y ambos proveedores están configurados
- **THEN** se envía un correo y un mensaje de WhatsApp con los datos de la cita

#### Scenario: Solo un proveedor configurado

- **WHEN** solo está configurado el correo
- **THEN** se envía el correo y la cita queda registrada igualmente

#### Scenario: Fallo de notificación

- **WHEN** un proveedor rechaza el aviso
- **THEN** la cita permanece guardada, el error se registra y el panel puede mostrar que la notificación falló

#### Scenario: Datos sensibles

- **WHEN** se envía la notificación
- **THEN** solo se incluyen los datos necesarios de la cita y no credenciales ni información de otras citas

### Requirement: Autorización del panel de citas

El panel de disponibilidad y citas SHALL estar disponible solo para sesiones administrativas válidas. Las operaciones de crear reglas, bloquear horarios, cancelar citas y consultar datos de contacto MUST NOT estar disponibles para visitantes anónimos.

#### Scenario: Acceso anónimo

- **WHEN** una persona sin sesión abre `/admin/citas`
- **THEN** se le solicita iniciar sesión y no ve disponibilidad ni citas

#### Scenario: Operación sin sesión

- **WHEN** se intenta modificar disponibilidad o cancelar una cita sin sesión válida
- **THEN** la API responde `401` y no modifica datos

#### Scenario: Sesión caducada

- **WHEN** una persona con sesión caducada intenta usar el panel
- **THEN** se le solicita iniciar sesión nuevamente

### Requirement: Fallback sin disponibilidad publicada

Si no existe disponibilidad vigente, o si la consulta de horarios falla, el sitio SHALL mostrar el formulario de contacto actual y SHALL permitir el envío por Netlify Forms. El visitante MUST NOT quedar atrapado en un calendario vacío o en error.

#### Scenario: Sin reglas ni horarios

- **WHEN** no hay disponibilidad configurada
- **THEN** `/contacto` muestra el formulario habitual sin selector de fechas

#### Scenario: Error al consultar horarios

- **WHEN** la API de disponibilidad no responde
- **THEN** se muestra el formulario habitual y el envío sigue funcionando

#### Scenario: Disponibilidad agotada

- **WHEN** todos los horarios del rango están reservados o bloqueados
- **THEN** se ofrece el formulario habitual para que la persona escriba al terapeuta
