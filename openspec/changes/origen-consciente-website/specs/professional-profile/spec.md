# Spec Delta

## Purpose

Genera confianza profesional al presentar la trayectoria, filosofía y pilares de trabajo de Maricela Aguilar Enríquez, reforzando la decisión de contacto del visitante.

## ADDED Requirements

### Requirement: Presentación de la especialista
La sección "Sobre Mí" SHALL mostrar el nombre Maricela Aguilar Enríquez y el cargo "Especialista en Hipnosis Regresiva y Regenerativa".

#### Scenario: Nombre y cargo visibles
- **WHEN** el visitante accede a la sección "Sobre Mí"
- **THEN** se muestran el nombre completo y el cargo profesional

### Requirement: Diseño de dos columnas con fotografía
La sección "Sobre Mí" SHALL presentar en escritorio una fotografía a la izquierda con marco dorado metálico y el contenido biográfico a la derecha; en pantallas pequeñas SHALL apilar ambos bloques sin pérdida de contenido.

#### Scenario: Composición en escritorio
- **WHEN** la sección se visualiza en una pantalla de escritorio
- **THEN** la fotografía aparece a la izquierda con marco dorado y el contenido a la derecha

#### Scenario: Composición en móvil
- **WHEN** la sección se visualiza en un dispositivo móvil
- **THEN** la fotografía y el contenido se apilan en orden de lectura comprensible

#### Scenario: Fotografía inaccesible
- **WHEN** la fotografía no carga
- **THEN** se conserva un texto alternativo que describe a la especialista

### Requirement: Historia y filosofía profesional
La sección "Sobre Mí" SHALL incluir un bloque de historia y filosofía que describa el trayecto profesional, las certificaciones y el enfoque de la hipnosis clínica como herramienta de transformación profunda.

#### Scenario: Contenido de trayectoria y certificaciones
- **WHEN** el visitante lee la historia profesional
- **THEN** encuentra información sobre su trayectoria y certificaciones

#### Scenario: Filosofía de transformación
- **WHEN** el visitante lee la filosofía profesional
- **THEN** se comunica la hipnosis clínica como herramienta de transformación profunda

### Requirement: Pilares de trabajo
La sección "Sobre Mí" SHALL presentar los pilares "Empatía y Entorno Seguro", "Enfoque Regenerativo Holístico" y "Resultados Orientados al Bienestar Integral".

#### Scenario: Visualización de los tres pilares
- **WHEN** el visitante revisa los pilares de trabajo
- **THEN** se muestran los tres pilares con su título y descripción

### Requirement: Conexión con el agendamiento
La sección "Sobre Mí" SHALL ofrecer una acción visible para contactar o agendar una sesión.

#### Scenario: Agendar desde el perfil
- **WHEN** el visitante decide contactar después de leer el perfil
- **THEN** activa una acción que lo lleva al flujo de contacto y agendamiento
