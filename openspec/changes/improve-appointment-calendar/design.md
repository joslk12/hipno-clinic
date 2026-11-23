# Design

## Context

`add-appointment-calendar` ya está desplegado. No se cambia el esquema de Postgres ni el contrato de las APIs públicas: las reglas siguen teniendo un `weekday` escalar y los bloqueos siguen siendo filas `schedule_slots`. El panel sí usa un nuevo contrato de interacción (cuadrícula) sobre los endpoints existentes. El horario fantasma `00:00` no se genera en el código: es una regla real en la base de datos que antes se publicaba porque la validación solo comprobaba el formato `HH:mm`.

## Decisions

### 1. Etiqueta del mes

`formatMonthLabel(year, month)` recibe el mes en 1..12 y lo convierte con `Date.UTC(year, month - 1, 1)`. La cuadrícula ya usaba correctamente el mes 1-based para calcular días, así que no se toca. Se cubre con tests del helper y del caption del calendario público.

### 2. Cuadrícula días × horas con diff

El editor muestra una tabla de 7 días × horas (paso de 30 o 60 minutos) entre `06:00` y `22:00`. Cada celda es un checkbox con `aria-label` «lunes 10:00». Los botones de fila («Todos») y columna («Todo») marcan bloques completos; «LIMPIAR SELECCIÓN» reinicia la selección. El perfil común (duración, servicio, vigencia y estado) se toma del primer grupo cargado o del grupo en edición.

Al guardar se calcula el diff: se eliminan las reglas del scope no seleccionadas, se actualizan las que cambiaron de perfil y se crean las celdas nuevas. El scope es el conjunto completo de reglas publicables salvo cuando se edita un grupo: entonces solo sus reglas. No se añade `weekdays[]` al contrato ni una columna `smallint[]`: evita una migración de datos en producción y mantiene la validación de solapamiento del backend. Si una petición falla, se muestra el error y se recarga el estado real. El guardado notifica `Disponibilidad guardada (N horarios).`

### 3. Rango horario y limpieza de `00:00`

`APPOINTMENTS_FIRST_START = '06:00'` y `APPOINTMENTS_LAST_START = '22:00'` viven en `src/types/appointments.ts`. `isBookableTime()` valida formato y rango; se usa en `validateRuleInput()`, `validateManualSlotInput()` y `buildSlotCatalog()`. Así una regla antigua de `00:00` deja de generar slots públicos aunque siga en la base de datos. El panel muestra un banner con las reglas fuera de rango y un botón «ELIMINAR REGLAS FUERA DE HORARIO» que las borra una por una con `DELETE /api/admin/appointments/rules?id=...`.

`DELETE /api/admin/appointments/slots?slotKey=...` ya no exige `source='manual'`: permite borrar materializaciones de reglas siempre que no tengan reserva activa (la reserva sigue devolviendo `409`). `store.deleteManualSlot()` elimina la fila por `slotKey` sin filtrar por origen. La tabla «Horarios individuales» solo muestra `source === 'manual'`; las materializaciones se gestionan desde el calendario.

### 4. Reglas publicadas agrupadas

`ruleGroups` agrupa por `durationMinutes|serviceId|validFrom|validUntil|active` y muestra en una fila los días y horas del bloque. El encabezado indica «N reglas agrupadas en M bloques». «Editar» carga el grupo en la cuadrícula y limita el diff a sus reglas; «Eliminar» borra el grupo completo.

### 5. Calendario administrativo editable

Las celdas del calendario son botones que seleccionan un día y sincronizan el formulario de horario individual. El panel deriva las horas del día de las reglas vigentes, los `schedule_slots` y las citas reservadas, mostrando `Disponible`, `Reservado` o `Bloqueado`. Cada hora permite alternar el bloqueo con `PATCH /api/admin/appointments/slots?slotKey=...`. «BLOQUEAR DESDE AQUÍ» bloquea desde la hora elegida hasta un límite configurable (por defecto 20:00), acotado al rango `06:00`–`22:00` y usando la duración de esa hora como paso; si la hora intermedia no existe, primero la crea como horario manual. Esto permite cerrar 11:00 en adelante cuando una sesión de 10:00 se extiende.

## Alternatives considered

- Cambiar `AvailabilityRule.weekday` por `weekdays[]` y migrar la columna a `smallint[]`: más atómico, pero rompe el contrato de las Functions y exige migración con datos reales.
- Bloquear automáticamente las horas posteriores al reservar: cambiaría la semántica de la reserva atómica y no refleja que la duración real solo la conoce el terapeuta. Se prefiere el bloqueo manual explícito.
- Borrar `00:00` automáticamente en cada carga: ocultaría un dato del terapeuta sin su consentimiento. Se prefiere ocultarlo del calendario y ofrecer una limpieza explícita.

## Risks

- Operaciones parciales ante fallos de red en el diff, en la limpieza o en rangos largos; mitigado mostrando el error y recargando desde la API.
- Una regla antigua fuera de rango deja de publicarse de inmediato, pero sigue en `availability_rules` hasta que se elimina desde el panel.
- Crear horarios manuales bloqueados incrementa filas en `schedule_slots`; son editables y se pueden eliminar desde el propio panel.
