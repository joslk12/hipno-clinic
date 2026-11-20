# Spec Delta

## Purpose

Expone de forma clara y comparable la oferta de servicios de Origen Consciente, incluyendo descripción, duración, inversión e inicio del agendamiento para cada servicio.

## ADDED Requirements

### Requirement: Catálogo de los tres servicios
La sección de servicios SHALL mostrar las tarjetas de Hipnosis Regresiva, Hipnosis Regenerativa y Terapia de Sanación Emocional, cada una con icono, descripción, badge de duración, inversión y llamada a la acción.

#### Scenario: Visualización de los servicios
- **WHEN** el visitante accede a la sección de servicios
- **THEN** se muestran las tres tarjetas de servicio con toda su información

#### Scenario: Servicios incompletos
- **WHEN** falta la descripción, duración, inversión o llamada a la acción de un servicio
- **THEN** el servicio no se considera listo para publicarse

### Requirement: Datos de Hipnosis Regresiva
El servicio de Hipnosis Regresiva SHALL mostrarse con duración de 90 minutos e inversión de $1,800 MXN.

#### Scenario: Badge de Hipnosis Regresiva
- **WHEN** el visitante revisa la tarjeta de Hipnosis Regresiva
- **THEN** el badge indica 90 min y $1,800 MXN

#### Scenario: Descripción de Hipnosis Regresiva
- **WHEN** el visitante lee la descripción de Hipnosis Regresiva
- **THEN** se explica la exploración guiada del pasado para identificar la raíz de patrones, fobias o bloqueos inconscientes

### Requirement: Datos de Hipnosis Regenerativa
El servicio de Hipnosis Regenerativa SHALL mostrarse con duración de 120 minutos e inversión de $2,200 MXN.

#### Scenario: Badge de Hipnosis Regenerativa
- **WHEN** el visitante revisa la tarjeta de Hipnosis Regenerativa
- **THEN** el badge indica 120 min y $2,200 MXN

#### Scenario: Descripción de Hipnosis Regenerativa
- **WHEN** el visitante lee la descripción de Hipnosis Regenerativa
- **THEN** se explica la restauración de la energía vital, la reconexión psico-emocional y la regeneración de la tranquilidad mental

### Requirement: Datos de Terapia de Sanación Emocional
El servicio de Terapia de Sanación Emocional SHALL mostrarse con duración de 60 minutos e inversión de $1,500 MXN.

#### Scenario: Badge de Terapia de Sanación Emocional
- **WHEN** el visitante revisa la tarjeta de Terapia de Sanación Emocional
- **THEN** el badge indica 60 min y $1,500 MXN

#### Scenario: Descripción de Terapia de Sanación Emocional
- **WHEN** el visitante lee la descripción de Terapia de Sanación Emocional
- **THEN** se explica el acompañamiento para ansiedad, duelo, equilibrio emocional y desarrollo personal

### Requirement: Agendamiento desde una tarjeta de servicio
Cada tarjeta de servicio SHALL incluir un botón "AGENDAR CITA" que lleve al flujo de contacto y agendamiento identificando el servicio seleccionado.

#### Scenario: Agendar un servicio específico
- **WHEN** el visitante activa "AGENDAR CITA" en una tarjeta de servicio
- **THEN** el sitio abre el flujo de contacto y agendamiento con el servicio correspondiente identificado

### Requirement: Retícula responsiva de servicios
La sección de servicios SHALL presentar una retícula de tres columnas en escritorio y una columna en dispositivos móviles.

#### Scenario: Retícula en escritorio
- **WHEN** la sección de servicios se visualiza en una pantalla de escritorio
- **THEN** las tarjetas se distribuyen en tres columnas

#### Scenario: Retícula en móvil
- **WHEN** la sección de servicios se visualiza en un dispositivo móvil
- **THEN** las tarjetas se apilan en una sola columna sin recortar contenido
