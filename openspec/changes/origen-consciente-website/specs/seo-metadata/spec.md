# Spec Delta

## Purpose

Mejora la visibilidad del sitio en búsquedas locales y la presentación de enlaces compartidos, atrayendo visitantes interesados en hipnosis en Santiago Tolman y el Estado de México.

## ADDED Requirements

### Requirement: Metadatos SEO locales
Cada página pública SHALL definir un título y una descripción orientados a búsquedas locales que incluyan términos como "Hipnosis regresiva Estado de México" e "Hipnosis Santiago Tolman" de forma natural.

#### Scenario: Página de inicio indexable
- **WHEN** un motor de búsqueda rastrea la página de inicio
- **THEN** encuentra un título y una meta descripción únicos con la especialidad y la ubicación

#### Scenario: Títulos únicos por página
- **WHEN** un motor de búsqueda rastrea las distintas páginas públicas
- **THEN** cada página presenta un título propio que la distingue de las demás

### Requirement: Etiquetas Open Graph
El sitio SHALL incluir etiquetas Open Graph con título, descripción, tipo, URL e imagen de vista previa para que las tarjetas compartidas en WhatsApp o Facebook se muestren correctamente.

#### Scenario: Vista previa al compartir un enlace
- **WHEN** un usuario comparte una página del sitio por WhatsApp o Facebook
- **THEN** la vista previa muestra el título, la descripción y una imagen representativa de Origen Consciente

#### Scenario: Imagen de vista previa ausente
- **WHEN** una página no define imagen Open Graph propia
- **THEN** se utiliza la imagen de marca predeterminada del sitio

### Requirement: Sitemap y robots
El sitio SHALL publicar un archivo sitemap.xml con las páginas públicas y un archivo robots.txt que permita el rastreo y referencie el sitemap.

#### Scenario: Acceso al sitemap
- **WHEN** un motor de búsqueda solicita sitemap.xml
- **THEN** recibe una lista de las páginas públicas del sitio

#### Scenario: Acceso a robots.txt
- **WHEN** un motor de búsqueda solicita robots.txt
- **THEN** recibe reglas de rastreo que permiten indexar el sitio y apuntan al sitemap

### Requirement: URL canónica
Cada página pública SHALL declarar su URL canónica para evitar contenido duplicado entre variantes de acceso.

#### Scenario: Canonical en página pública
- **WHEN** se renderiza una página pública
- **THEN** la página declara una URL canónica absoluta correspondiente a su contenido

### Requirement: Consistencia de datos de contacto para SEO local
El nombre, teléfono, correo y ubicación mostrados en el sitio SHALL ser consistentes en todas las páginas para reforzar la señal de negocio local.

#### Scenario: Datos de contacto coincidentes
- **WHEN** un motor de búsqueda compara los datos de contacto entre páginas
- **THEN** el teléfono, correo y ubicación coinciden con los datos oficiales de Origen Consciente
