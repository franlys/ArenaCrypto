# Skill: vercel-best-practices

**Objetivo**: Performance extrema, arquitectura limpia y uso eficiente del stack Vercel/Next.js.

## Reglas de React/Next.js
- **Server Components por Defecto**: Mantener los Client Components al mínimo (solo para interactividad).
- **Server Actions**: Usar Server Actions para todas las mutaciones de datos (como realizar apuestas).
- **Suspense**: Implementar `Suspense` con skeletons personalizados para todas las rutas con carga de datos.
- **Next/Image & Next/Font**: Optimización automática mandatory.

## Composición y Calidad
- **Compound Components**: Para componentes complejos como el Match Room.
- **Custom Hooks**: Extraer la lógica de conexión Web3 y estado del Matchmaking a hooks reutilizables.
- **Error Boundaries**: Capturar fallos en la conexión de la cartera o carga de datos sin romper la App.

## Performance Objetivo
- **LCP < 2.0s**: La landing debe ser instantánea.
- **CLS = 0**: Sin saltos de contenido durante la carga de anuncios.
