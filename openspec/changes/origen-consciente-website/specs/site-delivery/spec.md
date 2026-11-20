# Spec Delta

## Purpose

Asegura que el sitio se publique de forma segura, rápida y estable para todos los visitantes, con acceso directo a cualquier página y compatibilidad con navegadores modernos.

## ADDED Requirements

### Requirement: Acceso seguro por HTTPS
El sitio SHALL servirse exclusivamente por HTTPS con un certificado SSL válido y SHALL redirigir las solicitudes HTTP hacia HTTPS.

#### Scenario: Acceso HTTP redirigido
- **WHEN** un visitante accede al sitio mediante una URL HTTP
- **THEN** el navegador es redirigido a la versión HTTPS equivalente

#### Scenario: Certificado válido
- **WHEN** un visitante abre el sitio
- **THEN** la conexión se establece con un certificado SSL válido sin advertencias de seguridad

### Requirement: Distribución por CDN
El sitio SHALL distribuir sus recursos estáticos a través de una CDN global para reducir la latencia de carga.

#### Scenario: Carga desde una ubicación distante
- **WHEN** un visitante accede al sitio desde una región alejada del origen
- **THEN** los recursos estáticos se entregan desde un nodo cercano de la CDN

### Requirement: Acceso directo a rutas públicas
El sitio SHALL permitir que cualquier ruta pública se abra directamente mediante su URL y que recargar la página mantenga el contenido solicitado.

#### Scenario: Apertura directa de una ruta
- **WHEN** un visitante abre directamente la URL de una sección pública
- **THEN** el sitio carga esa sección sin mostrar un error de página no encontrada

#### Scenario: Recarga de una ruta interna
- **WHEN** un visitante recarga el navegador en una sección del sitio
- **THEN** la sección solicitada se vuelve a mostrar correctamente

### Requirement: Compatibilidad con navegadores y dispositivos
El sitio SHALL funcionar correctamente en las versiones actuales de los navegadores modernos de escritorio y móvil, y SHALL ofrecer una experiencia equivalente en pantallas desde 320px hasta 4K.

#### Scenario: Navegador moderno de escritorio
- **WHEN** el sitio se abre en la versión actual de un navegador moderno de escritorio
- **THEN** la navegación, el formulario y los CTAs funcionan sin errores visibles

#### Scenario: Navegador móvil actual
- **WHEN** el sitio se abre en un navegador móvil actual
- **THEN** la navegación colapsable, el formulario y los enlaces de contacto funcionan correctamente

### Requirement: Manejo de páginas no encontradas
El sitio SHALL mostrar una página de error amigable con un enlace de regreso al inicio cuando se solicite una ruta inexistente.

#### Scenario: Ruta inexistente
- **WHEN** un visitante accede a una URL que no corresponde a ninguna página pública
- **THEN** el sitio muestra una página de error con la marca y un enlace para volver al inicio
