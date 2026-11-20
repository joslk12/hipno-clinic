# Spec Delta

## Purpose

Permite que el panel administrativo registre clientes reales, les envíe una liga privada para dejar su reseña por correo o WhatsApp, y garantice que solo quien recibe esa invitación pueda publicar una opinión en el sitio.

## ADDED Requirements

### Requirement: Registro de clientes por el administrador

El panel administrativo SHALL permitir registrar, editar y eliminar clientes con nombre, correo electrónico y/o número de WhatsApp. Cada cliente SHALL tener al menos un medio de contacto válido. Los datos de contacto MUST NOT exponerse en las APIs públicas ni en el sitio.

#### Scenario: Alta de cliente válida

- **WHEN** el admin registra un cliente con nombre y al menos un medio de contacto válido
- **THEN** el cliente queda disponible en el panel para recibir una invitación

#### Scenario: Alta sin medio de contacto

- **WHEN** el admin intenta registrar un cliente sin correo ni WhatsApp
- **THEN** se muestran errores por campo y el cliente no se guarda

#### Scenario: Contacto inválido

- **WHEN** el correo o el número de WhatsApp no tienen un formato válido
- **THEN** se rechaza el registro con un error por campo

#### Scenario: Privacidad de los datos

- **WHEN** una persona consulta las APIs públicas del sitio
- **THEN** no puede obtener nombres, correos ni teléfonos de clientes registrados

### Requirement: Generación y envío de la invitación

El panel SHALL permitir enviar una invitación a un cliente registrado por correo electrónico, por WhatsApp o por ambos, según los medios disponibles. La invitación SHALL contener una liga `/resenas?token=<token>` con un token único, impredecible y asociado a ese cliente. Cada envío SHALL registrar la fecha, el canal y el resultado del proveedor.

#### Scenario: Envío por correo

- **WHEN** el admin envía una invitación por correo a un cliente con correo registrado
- **THEN** se envía un mensaje con la liga privada y el registro queda marcado como enviado por correo

#### Scenario: Envío por WhatsApp

- **WHEN** el admin envía una invitación por WhatsApp a un cliente con número registrado
- **THEN** se envía un mensaje con la liga privada y el registro queda marcado como enviado por WhatsApp

#### Scenario: Envío por ambos canales

- **WHEN** el admin elige ambos canales y el cliente tiene ambos medios registrados
- **THEN** se envía la misma liga por correo y WhatsApp y se registran ambos resultados

#### Scenario: Medio no disponible

- **WHEN** el admin intenta enviar por un canal para el que el cliente no tiene datos
- **THEN** no se realiza el envío y se muestra un error que indica el medio faltante

#### Scenario: Falla del proveedor

- **WHEN** el proveedor de correo o WhatsApp rechaza el envío
- **THEN** se muestra el error al admin, el registro no se marca como enviado y se permite reintentar

### Requirement: Ciclo de vida del token de invitación

Cada invitación SHALL tener una fecha de expiración y un estado consultable. El token SHALL poder canjearse una sola vez para crear una reseña; después del canjeo SHALL quedar inactivo. El sistema SHALL permitir reenviar o generar una nueva invitación cuando la anterior haya expirado o se haya canjeado.

#### Scenario: Consulta de estado

- **WHEN** el admin visualiza la lista de invitaciones
- **THEN** ve para cada cliente el último envío, su canal, la fecha y el estado: pendiente, enviada, canjeada o expirada

#### Scenario: Canjeo del token

- **WHEN** una persona envía una reseña con una invitación vigente
- **THEN** se crea la reseña y la invitación pasa a estado canjeada

#### Scenario: Reutilización del token

- **WHEN** se intenta enviar otra reseña con una invitación ya canjeada
- **THEN** la solicitud se rechaza y no se crea una segunda reseña

#### Scenario: Invitación expirada

- **WHEN** se intenta usar una invitación después de su fecha de expiración
- **THEN** la solicitud se rechaza y el admin puede generar una nueva

#### Scenario: Reenvío de invitación

- **WHEN** el admin reenvía una invitación expirada o canjeada
- **THEN** se genera una nueva liga con un token nuevo, la anterior queda inactiva y se envía la nueva por los canales elegidos

### Requirement: Asociación entre invitación y reseña

La reseña creada a partir de una invitación SHALL quedar asociada internamente al cliente invitado para auditoría, sin exponer esa asociación en la API pública. El tipo, contenido y validaciones de la reseña SHALL permanecer iguales a los definidos para las reseñas del sitio.

#### Scenario: Reseña creada desde invitación

- **WHEN** se crea una reseña con un token válido
- **THEN** la reseña se guarda con los mismos campos y validaciones de siempre y queda registrada la invitación utilizada

#### Scenario: Datos privados en la API pública

- **WHEN** se consulta `GET /api/reviews`
- **THEN** la respuesta solo contiene los campos públicos habituales y no incluye el cliente, el token ni los datos de contacto

### Requirement: Autorización del panel de invitaciones

El panel de cliente e invitaciones SHALL estar disponible solo para sesiones administrativas válidas. Las operaciones de registro, envío, reenvío y eliminación MUST NOT estar disponibles para visitantes anónimos.

#### Scenario: Acceso anónimo al panel

- **WHEN** una persona sin sesión administrativa abre `/admin/resenas`
- **THEN** se le solicita iniciar sesión y no puede ver clientes ni invitaciones

#### Scenario: Operación sin sesión

- **WHEN** se intenta registrar, enviar o eliminar datos del panel sin sesión válida
- **THEN** la API responde `401` y no modifica datos

#### Scenario: Sesión caducada

- **WHEN** una persona con sesión caducada intenta usar el panel
- **THEN** se le solicita iniciar sesión nuevamente

### Requirement: Configuración de proveedores de envío

El sistema SHALL permitir envíos de correo y WhatsApp mediante credenciales configuradas fuera del código. Si un proveedor no está configurado, el canal correspondiente SHALL estar deshabilitado y el resto del panel MUST seguir funcionando.

#### Scenario: Proveedor configurado

- **WHEN** las credenciales de un proveedor están configuradas
- **THEN** el admin puede enviar invitaciones por ese canal

#### Scenario: Proveedor sin configurar

- **WHEN** faltan las credenciales de un proveedor
- **THEN** ese canal no está disponible, se explica el motivo al admin y los demás canales siguen funcionando

#### Scenario: Credenciales no expuestas

- **WHEN** se consulta cualquier respuesta del sitio o del panel
- **THEN** no se revelan credenciales, tokens de proveedor ni datos secretos de configuración
