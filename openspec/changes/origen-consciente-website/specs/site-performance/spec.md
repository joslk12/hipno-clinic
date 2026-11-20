# Spec Delta

## Purpose

Garantiza que el sitio cargue rápido y se mantenga fluido en dispositivos móviles y de escritorio, sosteniendo la conversión y los objetivos de Core Web Vitals.

## ADDED Requirements

### Requirement: Tiempo de carga inicial
El sitio SHALL cargar su contenido principal en menos de 2 segundos en una conexión móvil razonable, medido sobre el despliegue de producción.

#### Scenario: Carga en producción
- **WHEN** un visitante abre una página pública en el entorno de producción
- **THEN** el contenido principal es visible en menos de 2 segundos

### Requirement: Core Web Vitals en rango aceptable
El sitio SHALL mantener LCP en 2.5 segundos o menos, CLS en 0.1 o menos e INP en 200 milisegundos o menos en las páginas públicas principales.

#### Scenario: Evaluación de LCP
- **WHEN** se mide el LCP de una página pública principal
- **THEN** el valor es menor o igual a 2.5 segundos

#### Scenario: Evaluación de CLS
- **WHEN** se mide el CLS durante la carga y la interacción
- **THEN** el valor es menor o igual a 0.1

#### Scenario: Evaluación de INP
- **WHEN** se mide la capacidad de respuesta a la interacción
- **THEN** el INP es menor o igual a 200 milisegundos

### Requirement: Optimización de imágenes y medios
El sitio SHALL servir imágenes en formatos modernos y tamaños adaptados al viewport, y SHALL cargar de forma diferida las imágenes y medios que no están en la primera pantalla.

#### Scenario: Imagen fuera de pantalla
- **WHEN** una imagen no forma parte de la primera pantalla
- **THEN** su carga se difiere hasta que el visitante se aproxima a ella

#### Scenario: Imagen adaptada al dispositivo
- **WHEN** el sitio muestra una imagen en un viewport móvil
- **THEN** se entrega una versión de tamaño adecuado en lugar de la versión de escritorio completa

### Requirement: Carga eficiente de tipografías
El sitio SHALL cargar las tipografías de marca sin bloquear el renderizado del contenido principal y evitando cambios visibles de texto.

#### Scenario: Renderizado con tipografías de marca
- **WHEN** el visitante carga una página con tipografías personalizadas
- **THEN** el texto principal se renderiza sin bloquearse por la descarga de fuentes
- **AND** se minimiza el desplazamiento de texto al aplicarse las fuentes definitivas

### Requirement: Estabilidad visual durante la carga
El sitio SHALL reservar espacio para imágenes, mapas, tipografías y componentes diferidos para evitar saltos de contenido.

#### Scenario: Carga de un mapa o imagen diferida
- **WHEN** un elemento diferido termina de cargar
- **THEN** el contenido circundante no se desplaza de forma perceptible

### Requirement: Scripts de terceros no bloqueantes
El sitio SHALL cargar de forma diferida o bajo demanda los scripts de terceros, incluidos el mapa y el servicio de formularios, sin bloquear la interacción principal.

#### Scenario: Carga del mapa
- **WHEN** el visitante abre la sección de contacto
- **THEN** el mapa se carga de forma diferida sin impedir el uso del formulario ni del resto del contenido
