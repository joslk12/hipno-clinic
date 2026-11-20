# Spec Delta

## Purpose

Provee la estructura de navegación y el marco global del sitio para que los visitantes accedan a todas las secciones, mantengan el acceso al agendamiento y encuentren los datos de contacto desde cualquier punto del recorrido.

## ADDED Requirements

### Requirement: Barra de navegación persistente
El sitio SHALL mostrar una barra de navegación flotante o sticky con el logo de Origen Consciente a la izquierda, los enlaces Inicio, Servicios, Sobre Mí, Blog y Contacto, un control de cambio de tema y un botón destacado "AGENDAR CITA".

#### Scenario: Visibilidad durante el desplazamiento
- **WHEN** el visitante se desplaza hacia abajo en cualquier página
- **THEN** la barra de navegación permanece visible en la parte superior de la vista

#### Scenario: Acceso a secciones desde la barra
- **WHEN** el visitante activa cualquiera de los enlaces del menú
- **THEN** el sitio navega a la sección o vista correspondiente

#### Scenario: Acceso a agendamiento
- **WHEN** el visitante activa el botón "AGENDAR CITA"
- **THEN** el sitio lleva al inicio del flujo de contacto y agendamiento

### Requirement: Navegación adaptable a móvil
El sistema SHALL transformar la barra de navegación en un menú colapsable en pantallas pequeñas, conservando el acceso a todos los enlaces, al control de cambio de tema y al botón "AGENDAR CITA".

#### Scenario: Apertura del menú móvil
- **WHEN** el visitante en una pantalla pequeña activa el control de menú
- **THEN** se despliega un menú con todos los enlaces, el control de cambio de tema y el botón "AGENDAR CITA"

#### Scenario: Cierre del menú móvil
- **WHEN** el visitante activa un enlace o el control de cierre en el menú móvil
- **THEN** el menú se cierra y muestra el contenido de la sección seleccionada

### Requirement: Control de cambio de tema
El sitio SHALL mostrar un control accesible para alternar entre tema claro y oscuro en la barra de navegación de escritorio y en el menú móvil. El control SHALL anunciar el tema activo y la acción disponible, y SHALL actualizar su estado visual y semántico después de cada cambio.

#### Scenario: Cambio de tema desde la barra de navegación
- **WHEN** el visitante activa el control de tema en la barra de navegación
- **THEN** el sitio cambia al tema opuesto y el control refleja el nuevo estado

#### Scenario: Cambio de tema desde el menú móvil
- **WHEN** el visitante activa el control de tema dentro del menú móvil
- **THEN** el tema cambia de inmediato, el menú permanece abierto y el control refleja el nuevo estado

#### Scenario: Estado accesible del control
- **WHEN** un lector de pantalla enfoca el control de tema
- **THEN** anuncia si el tema activo es claro u oscuro y la acción disponible para cambiarlo

### Requirement: Identificación de la sección activa
El sistema SHALL indicar visualmente la sección activa en la navegación y SHALL exponer el estado a tecnologías de asistencia.

#### Scenario: Sección activa resaltada
- **WHEN** el visitante se encuentra en una sección del sitio
- **THEN** el enlace correspondiente se distingue visualmente de los demás

#### Scenario: Estado anunciado a lectores de pantalla
- **WHEN** un lector de pantalla recorre la navegación
- **THEN** identifica cuál enlace corresponde a la sección activa

### Requirement: Destino de Blog
El sitio SHALL incluir el enlace Blog en la navegación y SHALL dirigirlo a una vista de blog o, durante el MVP, a una vista informativa de contenido próximo.

#### Scenario: Blog no publicado en el MVP
- **WHEN** el visitante activa el enlace Blog durante el MVP
- **THEN** el sitio muestra una vista informativa que indica que el contenido estará disponible próximamente

### Requirement: Footer global con contacto
El sitio SHALL mostrar un footer en todas las páginas con el teléfono +52 56 3127 0122, el correo mariaguienri88@gmail.com, la ubicación Santiago Tolman, Estado de México y el lema "Sana tu mente - Equilibra tus emociones - Transforma tu vida".

#### Scenario: Datos de contacto en el footer
- **WHEN** el visitante llega al final de cualquier página
- **THEN** el footer muestra teléfono, correo, ubicación y lema de marca

#### Scenario: Acciones de contacto desde el footer
- **WHEN** el visitante activa el teléfono o el correo del footer
- **THEN** el sitio inicia la acción de contacto directa correspondiente
