# Spec Delta

## MODIFIED Requirements

### Requirement: Formulario de contacto

La sección de contacto SHALL incluir los campos Nombre Completo, Correo Electrónico, Teléfono o WhatsApp y Mensaje o Motivo de Consulta, con estilos de borde dorado fino y fondo de superficie del tema activo. Si existen horarios publicados, SHALL mostrar además un calendario con fechas y horas seleccionables; si no los hay, SHALL mostrar solo el formulario habitual.

#### Scenario: Campos visibles del formulario

- **WHEN** el visitante accede a la sección de contacto
- **THEN** se muestran los cuatro campos con sus etiquetas y el botón "ENVIAR MENSAJE"

#### Scenario: Campo opcional identificado

- **WHEN** el visitante revisa el campo Teléfono o WhatsApp
- **THEN** puede identificar que es opcional

#### Scenario: Calendario con horarios publicados

- **WHEN** existen horarios disponibles publicados por el terapeuta
- **THEN** el visitante ve un calendario con fechas y horas seleccionables además de los campos de contacto

#### Scenario: Formulario sin calendario

- **WHEN** no hay horarios publicados o la consulta falla
- **THEN** el visitante ve solo el formulario actual, sin selector de fechas

### Requirement: Envío de la solicitud por correo

El formulario SHALL enviar la solicitud a mariaguienri88@gmail.com mediante el servicio de formularios configurado y SHALL informar al visitante el resultado del envío. Cuando se haya seleccionado un horario, el envío SHALL crear una reserva en su lugar y SHALL mostrar la fecha y hora confirmadas.

#### Scenario: Envío exitoso

- **WHEN** el visitante envía una solicitud válida sin horario seleccionado y el servicio responde correctamente
- **THEN** el sitio muestra una confirmación de envío exitoso

#### Scenario: Fallo del servicio de envío

- **WHEN** el servicio de formularios no responde o devuelve un error
- **THEN** el sitio informa el fallo y ofrece reintentar sin perder los datos ingresados

#### Scenario: Envío en curso

- **WHEN** el visitante ya inició el envío y este aún no finaliza
- **THEN** el botón indica el estado de envío y evita solicitudes duplicadas

#### Scenario: Reserva con horario seleccionado

- **WHEN** el visitante elige un horario disponible y envía sus datos
- **THEN** se crea la cita, se muestra la fecha y hora confirmadas y el horario deja de estar disponible

#### Scenario: Horario ocupado al enviar

- **WHEN** otra persona reservó el horario seleccionado antes de confirmar
- **THEN** se informa que el horario ya no está disponible y se ofrecen otras opciones sin perder los datos capturados
