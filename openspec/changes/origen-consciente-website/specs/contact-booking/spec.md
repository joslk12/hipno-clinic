# Spec Delta

## Purpose

Permite a los visitantes enviar su solicitud de consulta y contactar directamente a Origen Consciente por correo o WhatsApp, reduciendo la fricción para agendar una sesión.

## ADDED Requirements

### Requirement: Formulario de contacto
La sección de contacto SHALL incluir los campos Nombre Completo, Correo Electrónico, Teléfono o WhatsApp y Mensaje o Motivo de Consulta, con estilos de borde dorado fino y fondo de superficie del tema activo.

#### Scenario: Campos visibles del formulario
- **WHEN** el visitante accede a la sección de contacto
- **THEN** se muestran los cuatro campos con sus etiquetas y el botón "ENVIAR MENSAJE"

#### Scenario: Campo opcional identificado
- **WHEN** el visitante revisa el campo Teléfono o WhatsApp
- **THEN** puede identificar que es opcional

### Requirement: Validación de campos obligatorios
El formulario SHALL exigir Nombre Completo, Correo Electrónico y Mensaje o Motivo de Consulta, y SHALL impedir el envío cuando alguno falte o el correo tenga formato inválido.

#### Scenario: Envío con campos obligatorios vacíos
- **WHEN** el visitante intenta enviar el formulario sin completar un campo obligatorio
- **THEN** el envío no se realiza y se muestra un mensaje de error asociado al campo faltante

#### Scenario: Correo con formato inválido
- **WHEN** el visitante introduce un correo con formato inválido
- **THEN** el formulario muestra un error de formato y no envía la solicitud

#### Scenario: Envío con datos válidos
- **WHEN** el visitante completa los campos obligatorios con datos válidos
- **THEN** el formulario permite enviar la solicitud

### Requirement: Envío de la solicitud por correo
El formulario SHALL enviar la solicitud a mariaguienri88@gmail.com mediante el servicio de formularios configurado y SHALL informar al visitante el resultado del envío.

#### Scenario: Envío exitoso
- **WHEN** el visitante envía una solicitud válida y el servicio responde correctamente
- **THEN** el sitio muestra una confirmación de envío exitoso

#### Scenario: Fallo del servicio de envío
- **WHEN** el servicio de formularios no responde o devuelve un error
- **THEN** el sitio informa el fallo y ofrece reintentar sin perder los datos ingresados

#### Scenario: Envío en curso
- **WHEN** el visitante ya inició el envío y este aún no finaliza
- **THEN** el botón indica el estado de envío y evita solicitudes duplicadas

### Requirement: Acceso directo por WhatsApp
El sitio SHALL ofrecer un enlace directo a WhatsApp al número +52 56 3127 0122 con el mensaje predeterminado "Hola Maricela, me gustaría solicitar información para agendar una sesión de hipnosis.".

#### Scenario: Apertura de WhatsApp con mensaje
- **WHEN** el visitante activa el enlace de WhatsApp
- **THEN** se abre WhatsApp dirigido al número +52 56 3127 0122 con el mensaje predeterminado cargado

### Requirement: Acceso directo por correo
El sitio SHALL ofrecer un enlace de correo que abra el cliente de email del visitante con destino a mariaguienri88@gmail.com.

#### Scenario: Apertura del cliente de correo
- **WHEN** el visitante activa el enlace de correo electrónico
- **THEN** se abre su cliente de correo con el destinatario mariaguienri88@gmail.com

### Requirement: Ubicación con mapa
La sección de contacto SHALL mostrar la ubicación Santiago Tolman, Estado de México e integrar un mapa de Google con un tratamiento visual acorde al tema activo.

#### Scenario: Mapa y ubicación visibles
- **WHEN** el visitante revisa la información de contacto directa
- **THEN** se muestra la ubicación Santiago Tolman, Estado de México y un mapa de Google con el tratamiento visual del tema activo

#### Scenario: Mapa no disponible
- **WHEN** el mapa no puede cargarse
- **THEN** la ubicación textual permanece visible como alternativa

### Requirement: Datos de contacto directo visibles
La columna de información de contacto SHALL mostrar teléfono o WhatsApp, correo electrónico y ubicación con iconos vectoriales dorados.

#### Scenario: Información de contacto completa
- **WHEN** el visitante revisa la columna de contacto directo
- **THEN** encuentra teléfono o WhatsApp, correo y ubicación con sus iconos correspondientes
