# Spec Delta

## Purpose

Define la identidad visual premium de Origen Consciente y garantiza que colores, tipografía, ornamentos y componentes de interfaz se apliquen de forma consistente, accesible y responsiva en todo el sitio.

## ADDED Requirements

### Requirement: Tema oscuro con paleta de marca
El sistema SHALL ofrecer un tema oscuro con Deep Charcoal (#1A1A1A) de fondo, Soft Charcoal (#252525) en superficies, Ivory White (#F9F9F9) en texto principal, Gold Metallic (#D4AF37) y Gold Satin (#C5A059) en acentos, y Muted Gray (#A0A0A0) en texto secundario.

#### Scenario: Aplicación del tema oscuro
- **WHEN** el visitante activa el tema oscuro
- **THEN** el fondo general se muestra en Deep Charcoal y las superficies en Soft Charcoal
- **AND** los títulos principales, bordes ornamentales y vectores se muestran en tonos dorados

#### Scenario: Texto secundario en tema oscuro
- **WHEN** se muestra una fecha, subtítulo secundario o label deshabilitado
- **THEN** el texto utiliza Muted Gray sin confundirse con el texto principal

### Requirement: Tema claro con paleta de marca
El sistema SHALL ofrecer un tema claro con Ivory White (#F9F9F9) de fondo, Warm White (#FFFFFF) o Soft Ivory (#F1EDE4) en superficies, Deep Charcoal (#1A1A1A) en texto principal, Gold Deep (#8A6A1F) en acentos de texto e iconos, Gold Satin (#C5A059) en ornamentos decorativos y Dark Gray (#5F5F5F) en texto secundario. El tema claro SHALL ser el inicial cuando no exista una preferencia guardada.

#### Scenario: Aplicación del tema claro por defecto
- **WHEN** un visitante carga el sitio sin una preferencia de tema guardada
- **THEN** el fondo general se muestra en Ivory White, las superficies en Warm White o Soft Ivory y el texto principal en Deep Charcoal
- **AND** los acentos de texto e iconos mantienen contraste suficiente sobre las superficies claras

#### Scenario: Texto secundario en tema claro
- **WHEN** se muestra una fecha, subtítulo secundario o label deshabilitado en tema claro
- **THEN** el texto utiliza Dark Gray sin confundirse con el texto principal

### Requirement: Cambio, persistencia y aplicación del tema
El sistema SHALL permitir alternar entre tema claro y oscuro sin recargar la página, SHALL guardar la elección en el almacenamiento local del navegador y SHALL aplicarla antes del primer renderizado. El tema activo SHALL exponerse en el elemento raíz mediante el atributo `data-theme` y la propiedad CSS `color-scheme`.

#### Scenario: Cambio manual de tema
- **WHEN** el visitante activa el control de tema
- **THEN** la interfaz cambia al tema opuesto de inmediato sin recargar la página y sin desplazamientos perceptibles

#### Scenario: Persistencia entre visitas
- **WHEN** el visitante elige un tema y vuelve a cargar el sitio o lo visita de nuevo
- **THEN** se aplica el tema guardado antes de que se pinte el contenido

#### Scenario: Prevención de destello de tema
- **WHEN** el visitante carga una página con un tema guardado distinto al predeterminado
- **THEN** no se muestra un destello del tema incorrecto durante la carga inicial

#### Scenario: Actualización de metadatos del navegador
- **WHEN** el tema activo cambia
- **THEN** el metadato `theme-color` y la propiedad `color-scheme` se actualizan para reflejar el tema

### Requirement: Jerarquía tipográfica
El sistema SHALL usar una tipografía serif elegante (Cinzel o Cormorant Garamond) para encabezados y marca, Playfair Display Italic para frases clave, y una sans-serif (Montserrat o Inter) para cuerpo, formularios y botones, respetando pesos 400/500/600.

#### Scenario: Encabezados y marca en serif
- **WHEN** se renderiza la marca o cualquier encabezado H1, H2 o H3
- **THEN** se utiliza la tipografía serif configurada en color dorado, Ivory White en tema oscuro o Deep Charcoal en tema claro

#### Scenario: Frase clave en itálica
- **WHEN** se muestra el slogan "Comprende tu historia, crea nuevas posibilidades."
- **THEN** se renderiza con Playfair Display Italic

#### Scenario: Texto de cuerpo legible
- **WHEN** se muestra un párrafo, descripción, input o botón de interfaz
- **THEN** se utiliza la tipografía sans-serif con un peso entre 400 y 600

### Requirement: Ornamentos, iconografía y badges
El sistema SHALL renderizar filigranas botánicas, geometría sagrada y vectores de iconografía en trazos dorados de 1px a 1.5px, y SHALL mostrar badges de duración e inversión con fondo Gold Satin y texto oscuro o dorado.

#### Scenario: Visualización de ornamentos
- **WHEN** una sección incluye decoración botánica o de geometría sagrada
- **THEN** los trazos se muestran en tono dorado metálico con grosor de 1px a 1.5px

#### Scenario: Badge de duración e inversión
- **WHEN** se muestra un servicio con duración e inversión
- **THEN** el badge presenta ambos datos en tono Gold Satin con texto legible

### Requirement: Componentes de interfaz reutilizables
El sistema SHALL proveer botones, tarjetas, inputs y badges consistentes en color, tipografía, espaciado y estados hover/focus, incluyendo un estado hover con acento dorado.

#### Scenario: Estado hover de botón o tarjeta
- **WHEN** el usuario posiciona el cursor sobre un botón primario o una tarjeta interactiva
- **THEN** el componente muestra una transición visible hacia el acento dorado
- **AND** conserva el contraste y la legibilidad del texto

#### Scenario: Estado focus de campos
- **WHEN** el usuario enfoca un campo de formulario mediante teclado o clic
- **THEN** el campo muestra un borde dorado visible y mantiene su etiqueta asociada

### Requirement: Contraste y accesibilidad visual
El sistema SHALL cumplir una relación de contraste mínima WCAG 2.1 Nivel AA para texto e iconos en ambos temas, y SHALL garantizar que el color no sea el único medio para transmitir información.

#### Scenario: Contraste de texto en tema oscuro
- **WHEN** se muestra texto Ivory White sobre Deep Charcoal o Soft Charcoal
- **THEN** la relación de contraste cumple al menos WCAG 2.1 AA

#### Scenario: Contraste de texto en tema claro
- **WHEN** se muestra texto Deep Charcoal sobre Ivory White, Warm White o Soft Ivory
- **THEN** la relación de contraste cumple al menos WCAG 2.1 AA

#### Scenario: Información sin depender solo del color
- **WHEN** se comunica un estado, badge o error
- **THEN** además del color se incluye texto, icono o patrón que permite interpretarlo

### Requirement: Responsividad del sistema visual
El sistema SHALL adaptar composición, tipografía, espaciado y componentes a anchos de pantalla desde 320px hasta 4K sin pérdida de contenido ni desbordamientos horizontales.

#### Scenario: Pantalla móvil pequeña
- **WHEN** el sitio se visualiza en un viewport de 320px de ancho
- **THEN** el contenido permanece legible y no se produce desplazamiento horizontal

#### Scenario: Pantalla ultrawide
- **WHEN** el sitio se visualiza en una pantalla 4K
- **THEN** el contenido mantiene una medida de lectura cómoda y los componentes no se estiran de forma desproporcionada

#### Scenario: Preferencia de movimiento reducido
- **WHEN** el usuario tiene activada la preferencia de movimiento reducido
- **THEN** las animaciones decorativas se atendúan o desactivan sin ocultar contenido
