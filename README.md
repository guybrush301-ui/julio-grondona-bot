# Julio Grondona Bot ⚽

Un bot de Telegram automatizado para organizar partidos de fútbol semanalmente. Gestiona convocados, reservas y prioridades de manera eficiente, con cierres y aperturas automáticas. Inspirado en la filosofía de Julio Grondona: "Todo pasa".

## Descripción

Este bot permite a un grupo de amigos organizar partidos de fútbol de forma automática. Los usuarios pueden inscribirse mediante botones interactivos, y el bot maneja listas de convocados y reservas basándose en prioridades (quienes jugaron la semana anterior tienen preferencia). Incluye funcionalidades de cron para aperturas, cierres y resets automáticos, además de comandos administrativos para gestión manual.

### Características Principales
- **Gestión de Listas**: Convocados (configurable) y Reserva.
- **Prioridad por Historial**: Quienes jugaron la semana pasada entran directo a convocados.
- **Cierre Automático**: Sábado a las 18:00, completa cupos con reserva.
- **Apertura Automática**: Jueves a las 8:00, abre inscripciones.
- **Reset Automático**: Domingo a las 21:00, guarda historial y limpia listas.
- **Comandos de Admin**: Para gestión manual y configuración.
- **Interfaz Interactiva**: Botones para unirse, darse de baja y actualizar la vista.
- **Persistencia**: Usa Redis (Upstash) para almacenar datos.
- **Servidor Web**: Express para mantener el bot activo (compatible con UptimeRobot).

## Instalación

1. Clona este repositorio:
   ```bash
   git clone https://github.com/tu-usuario/julio-grondona-bot.git
   cd julio-grondona-bot
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno en un archivo `.env`:
   - `TELEGRAM_TOKEN`: Token del bot obtenido de [@BotFather](https://t.me/botfather).
   - `UPSTASH_REDIS_REST_URL`: URL de Redis de Upstash.
   - `UPSTASH_REDIS_REST_TOKEN`: Token de Redis de Upstash.
   - `NODE_ENV`: `production` para modo producción, `development` para desarrollo.
   - `PORT`: Puerto para el servidor web (opcional, por defecto 3000).
   - `DB_KEY`: Clave para la base de datos en Redis (opcional, por defecto `datos_partido_test`).

## Configuración

- **MAX_CUPOS**: Número máximo de jugadores convocados.
- **ARCHIVO_DB**: Clave en Redis para guardar datos.
- Asegúrate de que el bot sea administrador en el grupo de Telegram para usar comandos de admin.

## Uso

1. Ejecuta el bot:
   ```bash
   npm start
   ```
   O para desarrollo con recarga automática:
   ```bash
   npm run dev
   ```

2. En el grupo de Telegram, un admin envía `/start` para configurar el grupo (opcionalmente con un número para cambiar el cupo máximo, ej: `/start 20`).

3. Los usuarios usan los botones interactivos para inscribirse.

### Comandos

#### Para Usuarios
- **Botones Interactivos**:
  - ⚽ JUEGO: Inscribirse al partido.
  - ❌ BAJA: Darse de baja.
  - 🔄 VER LISTA: Refrescar la vista de la lista.

#### Para Admins
- `/start [número]`: Configura el grupo (solo admins). Opcionalmente cambia el cupo máximo.
- `/reset`: Resetea el ciclo manualmente (guarda historial y limpia listas).
- `/vip <ID>`: Agrega un ID de usuario a la lista de prioridad (jugaron semana pasada).
- `/agendar <Nombre>`: Agrega un jugador manualmente a la lista.
- `/sacar <Nombre>`: Elimina un jugador manualmente por nombre.

### Funcionalidades Automáticas
- **Jueves 08:00**: Envía mensaje de apertura y muestra menú.
- **Sábado 18:00**: Cierra listas y completa cupos con reservas.
- **Domingo 21:00**: Resetea ciclo, guardando historial de quienes jugaron.

## Estructura de Archivos
```
julio-grondona-bot/
├── index.js                 # Punto de entrada, configura Express y bot
├── package.json             # Dependencias y scripts
├── datos_partido.json       # Archivo de datos local (usado en desarrollo)
├── TODO.TXT                 # Lista de tareas pendientes
├── src/
│   ├── config.js            # Configuración y variables de entorno
│   ├── core/
│   │   └── state.js         # Gestión del estado y persistencia
│   ├── handlers/
│   │   ├── actions.js       # Manejadores de botones inline
│   │   ├── commands.js      # Manejadores de comandos de texto
│   │   └── cron.js          # Tareas programadas automáticas
│   ├── services/
│   │   ├── bot.js           # Instancia del bot de Telegram
│   │   └── redis.js         # Conexión a Redis
│   └── utils/
│       └── helpers.js       # Funciones auxiliares (menú, admins)
```

## Dependencias
- `@upstash/redis`: Cliente Redis para Upstash.
- `dotenv`: Carga variables de entorno.
- `express`: Servidor web para uptime.
- `node-cron`: Programación de tareas.
- `node-telegram-bot-api`: API de Telegram.

## Próximas Funcionalidades (TODO)
- Agregar posiciones en la cancha para cada jugador (ej: delantero, defensa).
- Sistema de puntuación de 1 a 5 para equilibrar equipos.
- Formación automática de equipos parejos (4-3-2 sin arquero).
- Cada jugador debería tener dos posiciones posibles.

## Contribución
Si quieres contribuir:
1. Abre un issue para discutir cambios.
2. Envía un pull request con tus mejoras.
3. Asegúrate de probar en modo desarrollo antes de enviar.

## Licencia
ISC