# Spec Delta

## Purpose

Presenta la propuesta de valor de Origen Consciente en la primera impresión del visitante, comunica la especialidad y el slogan de marca, y dirige la atención hacia los servicios, la especialista y el agendamiento.

## ADDED Requirements

### Requirement: Hero principal de inicio
La página de inicio SHALL mostrar un hero sobre el fondo del tema activo (Deep Charcoal en tema oscuro e Ivory White en tema claro) con iluminación sutil dorada, el titular "ORIGEN CONSCIENTE", el subtítulo "HIPNOSIS REGRESIVA Y REGENERATIVA" y el slogan "Comprende tu historia, crea nuevas posibilidades.".

#### Scenario: Carga inicial del hero
- **WHEN** el visitante abre la página de inicio
- **THEN** el hero muestra el titular, el subtítulo y el slogan con la jerarquía tipográfica definida

#### Scenario: Fondo e iluminación del hero
- **WHEN** se renderiza el hero
- **THEN** el fondo usa el token de fondo del tema activo con destellos dorados sutiles que no reducen la legibilidad del texto

### Requirement: Llamadas a la acción del hero
El hero SHALL incluir los botones "Descubrir Hipnosis" como acción primaria y "NUESTROS SERVICIOS" como acción secundaria, ambos con destino funcional.

#### Scenario: Acción primaria del hero
- **WHEN** el visitante activa "Descubrir Hipnosis"
- **THEN** el sitio lleva a la información de la hipnosis o al catálogo de servicios

#### Scenario: Acción secundaria del hero
- **WHEN** el visitante activa "NUESTROS SERVICIOS"
- **THEN** el sitio lleva a la sección de servicios

### Requirement: Vista previa de la especialista
La página de inicio SHALL presentar un perfil breve de Maricela Aguilar Enríquez como Especialista en Hipnosis Regresiva y Regenerativa, con un enlace a la sección "Sobre Mí".

#### Scenario: Perfil resumido visible
- **WHEN** el visitante revisa la vista previa de la especialista
- **THEN** se muestra su nombre, cargo y una descripción breve

#### Scenario: Enlace a la biografía completa
- **WHEN** el visitante activa el enlace de la vista previa
- **THEN** el sitio navega a la sección "Sobre Mí"

### Requirement: Resumen de servicios en inicio
La página de inicio SHALL mostrar tarjetas de resumen de los servicios principales con interacción hover en oro metálico y acceso al detalle o agendamiento.

#### Scenario: Tarjetas de servicios visibles
- **WHEN** el visitante llega al resumen de servicios en inicio
- **THEN** se muestran las tarjetas de los servicios principales con su nombre y descripción breve

#### Scenario: Interacción con una tarjeta de servicio
- **WHEN** el visitante posiciona el cursor o enfoca una tarjeta
- **THEN** la tarjeta responde visualmente con el acento dorado definido

#### Scenario: Acceso al detalle del servicio
- **WHEN** el visitante activa una tarjeta de resumen
- **THEN** el sitio lo lleva al detalle del servicio o a la sección de servicios

### Requirement: Orientación al agendamiento desde inicio
La página de inicio SHALL ofrecer un camino visible hacia el agendamiento sin requerir el desplazamiento hasta el footer.

#### Scenario: Acceso temprano al agendamiento
- **WHEN** el visitante se encuentra en la página de inicio
- **THEN** existe una acción visible que lo lleva al flujo de contacto y agendamiento

### Requirement: Orden de lectura accesible en inicio
La página de inicio SHALL organizar su contenido en una secuencia de encabezados y regiones comprensible para lectores de pantalla.

#### Scenario: Navegación por encabezados
- **WHEN** un lector de pantalla recorre la página por encabezados
- **THEN** encuentra el hero, la especialista y el resumen de servicios en un orden lógico
