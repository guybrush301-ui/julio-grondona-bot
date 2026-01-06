# Julio Grondona Bot ⚽

Un bot de Telegram automatizado para organizar partidos de fútbol semanalmente. Gestiona convocados, reservas y prioridades de manera eficiente, con cierres y aperturas automáticas. Y por supuesto, con la filosfía de Julito. Todo pasa!

## Descripción

Este bot permite a un grupo de amigos organizar partidos de fútbol de forma automática. Los usuarios pueden inscribirse, y el bot maneja listas de convocados y reservas basándose en prioridades (quienes jugaron la semana anterior tienen preferencia). Incluye funcionalidades de cron para aperturas, cierres y resets automáticos.

### Características Principales
- **Gestión de Listas**: Convocados (máximo 18) y Reserva.
- **Prioridad por Historial**: Quienes jugaron la semana pasada entran directo a convocados.
- **Cierre Automático**: Sábado a las 16:00, completa cupos con reserva.
- **Apertura Automática**: Jueves a las 8:00, abre inscripciones.
- **Reset Automático**: Domingo a las 22:00, guarda historial y limpia listas.
- **Comandos de Admin**: Para gestión manual.
- **Interfaz Interactiva**: Botones para unirse, darse de baja y actualizar.

## Instalación

1. Clona este repositorio:
   ```bash
   git clone https://github.com/tu-usuario/mi-bot-futbol.git
   cd mi-bot-futbol
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura el token del bot en `bot.js`:
   - Obtén un token de [@BotFather](https://t.me/botfather) en Telegram.

## Configuración

- **MAX_CUPOS**: Número máximo de convocados (por defecto 18).
- **ARCHIVO_DB**: Archivo para guardar datos (`datos_partido.json`).
- Asegúrate de que el bot sea administrador en el grupo de Telegram.

## Uso

1. Ejecuta el bot:
   ```bash
   node bot.js
   ```

2. En el grupo de Telegram, un admin envía `/start` para configurar el grupo.

3. Los usuarios usan los botones para inscribirse.

### Comandos

#### Para Usuarios
- **Botones Interactivos**:
  - ⚽ JUEGO: Inscribirse.
  - ❌ BAJA: Darse de baja.
  - 🔄 Actualizar Vista: Refrescar la lista.

#### Para Admins
- `/start`: Configura el grupo (solo admins).
- `/reset`: Resetea el ciclo manualmente.
- `/vip <ID>`: Agrega un ID a la lista de prioridad (jugaron semana pasada).
- `/ver_vips`: Muestra IDs con prioridad.
- `/agendar <Nombre>`: Agrega un jugador manualmente.
- `/sacar <Nombre>`: Elimina un jugador manualmente.

### Funcionalidades Automáticas
- **Jueves 08:00**: Envía mensaje de apertura y muestra menú.
- **Sábado 16:00**: Cierra listas y completa cupos.
- **Domingo 22:00**: Resetea ciclo, guardando historial.

## Estructura de Archivos
- `bot.js`: Código principal del bot.
- `datos_partido.json`: Archivo de datos persistentes.
- `package.json`: Dependencias y configuración.

## Dependencias
- `node-telegram-bot-api`: Para interactuar con Telegram.
- `node-cron`: Para tareas programadas.

## Contribución
Si quieres contribuir, abre un issue o envía un pull request.

## Licencia
ISC