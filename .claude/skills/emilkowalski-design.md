# Skill: emilkowalski-design

**Objetivo**: Animaciones fluidas, micro-interacciones de alta calidad y una experiencia premium inspirada en el trabajo de Emil Kowalski.

## Principio de Propósito
- Las animaciones no son decoración, son comunicación.
- Indican cambios de estado (Match found), navegación (Tab switching) o éxito (Payment confirmed).

## Spring Physics
- Uso de `Framer Motion` con físicas de resorte (`spring`) para movimientos naturales, evitando curvas lineales aburridas.
- Stiff/Damping balanceados para una sensación de respuesta rápida pero suave.

## Estándares para ArenaCrypto
- **Searching State**: Animación pulsante y dinámica mientras se busca un oponente para mantener el "engagement".
- **Match Notification**: Transición suave de entrada (`AnimatePresence`) para el modal de orificio de combate.
- **Layout Animations**: Uso de la prop `layout` de Framer Motion para que los elementos se reorganicen suavemente al filtrar juegos o montos.
