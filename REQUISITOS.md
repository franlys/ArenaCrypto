# Requisitos del Proyecto: ArenaCrypto

## 1. Visión General
ArenaCrypto es una plataforma de apuestas online (casa de apuestas) para jugadores de cualquier videojuego y plataforma. El sistema se encarga de emparejar (matchmaking) a jugadores con intereses similares para realizar combates con apuestas en criptomonedas.

## 2. Requisitos Funcionales

### 2.1 Gestión de Usuarios y Fondos
- **Suscripción Premium**: Los usuarios pueden elegir suscribirse para eliminar anuncios.
- **Web3 Wallet Integration**: Conexión con carteras externas (MetaMask) para depósitos y retiros.
- **Sistema de Fondos Internos**: Los depósitos se reflejan en un balance interno en la plataforma (Ledger) para agilizar las apuestas y evitar gas constante.
- **Comisiones**: La plataforma retiene una comisión por cada apuesta realizada.

### 2.2 Matchmaking
- **Selección de Parámetros**: El jugador elige el Juego, Modo de Juego y Cantidad a Apostar.
- **Motor de Matchmaking**: Emparejamiento automático con otro jugador que busque exactamente los mismos parámetros.
- **Confirmación**: Ambos jugadores deben confirmar y pagar la apuesta a "escrow" antes de iniciar.

### 2.3 Ejecución y Comunicación
- **Chat en Vivo**: Se abre un chat privado una vez realizado el match para intercambio de IDs y coordinación.
- **Plataformas Externas**: El combate se realiza fuera de la plataforma (en las consolas/PC de los jugadores).

### 2.4 Resolución de Resultados
- **Envío de Evidencias**: El ganador debe enviar evidencias (capturas/videos) mediante la plataforma.
- **Validación con IA**: Uso de Gemini Vision para analizar las evidencias y determinar el ganador automáticamente.
- **Disputas**: Sistema de revisión manual en caso de que la IA falle o haya desacuerdo.

## 3. Requisitos No Funcionales

### 3.1 Diseño y Estética
- **Aesthetics Premium**: Uso de Vanilla CSS, Framer Motion y una temática eSports intensa (Neón, Dark Mode).
- **Publicidad**: Los usuarios no suscritos verán anuncios en las zonas periféricas de la interfaz, sin interrumpir el centro de la pantalla.

### 3.2 Tecnología
- **Stack**: Node.js/Next.js (App Router).
- **Base de Datos**: Supabase (Real-time y Storage).
- **Blockchain**: Polygon (Stablecoins para evitar volatilidad y altas comisiones).
- **AI**: Gemini 1.5 Flash/Pro optimizado para análisis estructural de evidencias.

## 4. Estructura de Control y Calidad
- **.claude/rules/**: Instrucciones modulares para cada componente.
- **DEVLOG.md**: Registro de actividad diario del proyecto.
- **RECUENTO_MEJORAS.md**: Historial de mejoras implementadas.
- **task.md**: Seguimiento de fases y tareas.
