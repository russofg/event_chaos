# Event Chaos Art Bible (Block 1)

## 1. Creative North Star
Event Chaos debe sentirse como una cabina técnica de alto riesgo: elegante, precisa y con tensión constante. La interfaz no es "HUD genérico", es equipamiento profesional de show en vivo.

- Core fantasy: sobrevivir una producción en vivo bajo presión.
- Tone: premium, táctico, eléctrico, humano.
- Keywords: broadcast control room, neon industrial, live chaos, tactical clarity.

## 2. Visual Pillars

### 2.1 Tactical Readability
Cada estado crítico debe entenderse en menos de 300 ms:
- Prioridad por contraste de tono y forma.
- Grilla y spacing consistentes.
- Jerarquía visual de 3 niveles: crítico, operativo, decorativo.

### 2.2 Cinematic Control Surface
- Paneles con materiales técnicos (glass + metal + glow calibrado).
- Luces de estado y acentos reactivas a escenario/modo.
- Microanimación útil: enfatiza acciones y amenazas, no distrae.

### 2.3 Scenario Signature
Cada escenario tiene personalidad visual propia, sin romper consistencia del sistema UI.

## 3. Typography System

- Display: `Saira Condensed` (títulos y momentos de alto impacto).
- Body: `Space Grotesk` (lectura principal).
- Data/Telemetry: `JetBrains Mono` (números, labels técnicas, timers).

Regla:
- Display solo para titulares/branding.
- Mono para datos operativos y etiquetas cortas.
- Body para contenido descriptivo y navegación.

## 4. Color & Material System

### 4.1 Base Palette
- Shell layers: triple gradiente profundo (`--aaa-bg-0/1/2`).
- Panel material: top/bottom rgb + alpha controlado.
- Accents: toolbar, chips, heading glow por perfil activo.

### 4.2 Threat Adaptation
- A mayor amenaza: más energía en aurora y bordes.
- En pausa: reducción del pulso visual sin perder legibilidad.

## 5. Scenario Profiles (Direction)

- `TUTORIAL`: cyan limpio, didáctico, bajo ruido.
- `NORMAL`: corporate-teal equilibrado.
- `ROCKSTAR`: magenta/blue con energía alta.
- `FESTIVAL`: amber/teal al aire libre, calor + ambiente.
- `EXTREME`: crimson/cyan, presión agresiva.
- `ARENA`: azul eléctrico de estadio.
- `WORLD_TOUR`: índigo premium + cian broadcast.
- `BLACKOUT_PROTOCOL`: rojo industrial + ámbar de emergencia.

## 6. UI Component Rules

- Botones:
  - Base único (`aaa-btn`) con variantes semánticas (`primary`, `success`, `danger`, `neutral`).
  - Estado disabled siempre perceptible y sin ambigüedad.
- Paneles:
  - Misma familia material y borde en todo el juego.
- Overlay stack mobile:
  - Un carril crítico primario activo por vez.

## 7. Motion Rules

- Motion comunica estado, no adorna.
- Threat rail y overlays se amortiguan en pausa.
- Reduced motion debe preservar feedback crítico.

## 8. Audio Direction (alignment block)

Aunque el bloque 1 es visual/UI, la dirección contempla:
- mezcla técnica limpia (no saturación constante),
- capas reactivas por threat,
- identidad sonora por escenario.

## 9. QA Checklist (Art/UI)

- ¿Se distingue el escenario visualmente en <2 segundos?
- ¿Estados críticos se detectan sin leer texto?
- ¿Botones primarios/eligrosos son inequívocos?
- ¿Mobile mantiene legibilidad sin superposición?
- ¿Con reduced motion sigue habiendo feedback claro?

## 10. Done Criteria for Block 1

- Art direction documentada y versionada.
- Theme runtime aplicado por escenario/modo en la UI real.
- UI system base de botones/tokens integrado.
- Tests de regresión para theme/UI logic.
