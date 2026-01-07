const bot = require('../services/bot');
const State = require('../core/state');
const Helpers = require('../utils/helpers');
const TeamMaker = require('../utils/teammaker');

module.exports = () => {
    
    // /start o /start 10
    // El regex captura un número opcional después del comando
    bot.onText(/\/start(?: (\d+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const datos = State.get();
        
        // Capturamos el argumento (si existe)
        const nuevoCupo = match[1] ? parseInt(match[1]) : null;

        if (datos.grupoId !== chatId) {
            State.setGrupoId(chatId);
            console.log(`Grupo configurado: ${chatId}`);
        }

        // Si pasaron un número, actualizamos el cupo
        if (nuevoCupo && !isNaN(nuevoCupo) && nuevoCupo > 0) {
            State.setCupoMaximo(nuevoCupo);
            bot.sendMessage(chatId, `✅ Se configuró el partido para **${nuevoCupo} jugadores**.`, {parse_mode: 'Markdown'});
        } else if (nuevoCupo) {
            bot.sendMessage(chatId, "⚠️ Número de jugadores inválido.");
        }

        // Guardamos cambios (grupoId o cupo)
        State.save();

        if (await Helpers.esAdmin(chatId, msg.from.id)) {
            Helpers.enviarMenu(chatId);
        } else {
            bot.sendMessage(chatId, "Solo admins inician 😉");
        }
    });


    // /reset
    bot.onText(/\/reset/, async (msg) => {
        if (await Helpers.esAdmin(msg.chat.id, msg.from.id)) {
            State.resetearCiclo();
            State.save();
            bot.sendMessage(msg.chat.id, "🏁 Ciclo reseteado manualmente.");
        }
    });


    // /force_cierre
    bot.onText(/\/force_cierre/, async (msg) => {
        if (await Helpers.esAdmin(msg.chat.id, msg.from.id)) {
            const datos = State.get();
            
            // COPIAR ACÁ LA LÓGICA QUE ESTÁ DENTRO DEL CRON
            State.setListaCerrada(true);
            const cuposLibres = datos.cupoMaximo - datos.convocados.length;
            if (cuposLibres > 0 && datos.reserva.length > 0) {
                State.moverReservaAConvocados(cuposLibres);
            }
            State.save();            
            bot.sendMessage(msg.chat.id, "🧪 *TEST: CIERRE EJECUTADO*", {parse_mode: 'Markdown'});

        }
    });

    // /vip ID
    bot.onText(/\/vip (.+)/, async (msg, match) => {
        if (await Helpers.esAdmin(msg.chat.id, msg.from.id)) {
            const id = parseInt(match[1]);
            if (!isNaN(id)) {
                if (State.agregarVip(id)) {
                    State.save();
                    bot.sendMessage(msg.chat.id, `✅ ID ${id} agregado a VIP.`);
                } else {
                    bot.sendMessage(msg.chat.id, "⚠️ Ya estaba en la lista.");
                }
            }
        }
    });

    // /agendar Nombre
    bot.onText(/\/agendar (.+)/, async (msg, match) => {
        if (await Helpers.esAdmin(msg.chat.id, msg.from.id)) {
            const nombre = match[1];
            const usuario = { id: 'manual_' + Date.now(), nombre: nombre + " ✏️" };
            const datos = State.get();

            if (datos.convocados.length < datos.cupoMaximo) {
                State.agregarConvocado(usuario);
            } else {
                State.agregarReserva(usuario);
            }
            State.save();
            Helpers.enviarMenu(msg.chat.id);
        }
    });

    bot.onText(/\/sacar (.+)/, async (msg, match) => {
       if (await Helpers.esAdmin(msg.chat.id, msg.from.id)) {
            const nombreBusqueda = match[1].toLowerCase();
            const datos = State.get();
            
            let jugador = datos.convocados.find(j => j.nombre.toLowerCase().includes(nombreBusqueda)) || 
                          datos.reserva.find(j => j.nombre.toLowerCase().includes(nombreBusqueda));

            if (jugador) {
                State.removerJugador(jugador.id);
                if (datos.listaCerrada && datos.reserva.length > 0) {
                     State.moverReservaAConvocados(1);
                }
                State.save();
                bot.sendMessage(msg.chat.id, `👮‍♂️ Admin sacó a *${jugador.nombre}*`, {parse_mode: 'Markdown'});
                Helpers.enviarMenu(msg.chat.id);
            } else {
                bot.sendMessage(msg.chat.id, "No encontrado.");
            }
        }
    });


    // COMANDO: /soy DEF VOL 4
    bot.onText(/\/soy (ARQ|DEF|VOL|DEL) (ARQ|DEF|VOL|DEL) ([1-5])/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const nombre = msg.from.first_name;

        const pos1 = match[1].toUpperCase();
        const pos2 = match[2].toUpperCase();
        const nivel = parseInt(match[3]);

        State.guardarPerfil(userId, nombre, pos1, pos2, nivel);
        State.save();

        const respuesta = `✅ *Ficha Actualizada*\n👤 ${nombre}\n🛡️ Puesto 1: ${pos1}\n⚔️ Puesto 2: ${pos2}\n⭐ Nivel: ${nivel}`;
        bot.sendMessage(chatId, respuesta, { parse_mode: 'Markdown' });
    });
    
    
    // Ayuda para que sepan como usuarlo
    bot.onText(/\/ficha/, (msg) => {
        bot.sendMessage(msg.chat.id, "📝 *CÓMO CARGAR TU FICHA:*\n\nEscribí:\n`/soy POSICION POSICION NIVEL`\n\nEjemplos:\n`/soy DEF VOL 3` (Defensor/Volante, 3 puntos)\n`/soy DEL VOL 5` (Delantero/Volante, Crack)\n\n_Opciones: ARQ, DEF, VOL, DEL. Nivel 1 al 5._", {parse_mode: 'Markdown'});
    });


    // COMANDO: /equipos
    // Genera los equipos manualmente cuando el admin quiera
    bot.onText(/\/equipos/, async (msg) => {
        const chatId = msg.chat.id;
        
        // 1. Solo admins pueden generar equipos (para no spamear)
        if (await Helpers.esAdmin(chatId, msg.from.id)) {
            const datos = State.get();

            // 2. Validar cantidad mínima (podés cambiar el 10)
            if (datos.convocados.length < 2) {
                return bot.sendMessage(chatId, "⚠️ Nooo flaco, te faltan jugadores para armar equipos decentes.");
            }

            // 3. Usar el TeamMaker
            const match = TeamMaker.armarEquipos(datos.convocados);
            
            // 4. Armar el mensaje
            let respuesta = `⚖️ *EQUIPOS CONFIRMADOS* ⚖️\n`;
            respuesta += `_Firmado: La AFA_\n\n`;

            // --- AGREGAMOS EL MENSAJE DE ARQUEROS AQUÍ ---
            if (match.mensaje) {
                respuesta += `${match.mensaje}\n\n`;
            }

            respuesta += `⚪ *EQUIPO A* (Nivel: ${match.nivelA})\n`;
            match.equipoA.forEach(j => respuesta += `• ${j.nombre} (${j.pos1})\n`);

            respuesta += `\n⚫ *EQUIPO B* (Nivel: ${match.nivelB})\n`;
            match.equipoB.forEach(j => respuesta += `• ${j.nombre} (${j.pos1})\n`);

            // 5. Enviar
            bot.sendMessage(chatId, respuesta, { parse_mode: 'Markdown' });

        } else {
            bot.sendMessage(chatId, "🤌 ¿Quién sos vos para armar los equipos? Tomatela de acá.");
        }
    });


    // COMANDO: /help o /ayuda
    bot.onText(/\/help|\/ayuda/, async (msg) => {
        const chatId = msg.chat.id;
        const esAdmin = await Helpers.esAdmin(chatId, msg.from.id);

        let respuesta = `📖 *MANUAL DE REGLAMENTO* 📖\n`;
        respuesta += `_Todo lo que necesitás saber para no quedarte afuera._\n\n`;

        // --- SECCIÓN JUGADORES (Visible para todos) ---
        respuesta += `👤 *PARA LOS JUGADORES*\n`;
        respuesta += `• \`/soy P1 P2 N\` » Cargá tu ficha técnica.\n`;
        respuesta += `   _Ej: /soy DEF VOL 4 (Defensor/Volante, Nivel 4)_\n`;
        respuesta += `• \`/ficha\` » Ver ayuda detallada sobre posiciones.\n`;
        respuesta += `• \`/help\` » Muestra este mensaje.\n\n`;

        // --- SECCIÓN ADMINS (Solo visible si sos Admin) ---
        if (esAdmin) {
            respuesta += `👮‍♂️ *COMISIÓN DIRECTIVA (Solo Admins)*\n`;
            respuesta += `• \`/start [N]\` » Inicia/Configura el partido (Ej: /start 10).\n`;
            respuesta += `• \`/equipos\` » Arma los equipos automáticamente (A vs B).\n`;
            respuesta += `• \`/agendar Nombre\` » Anota a un jugador manualmente.\n`;
            respuesta += `• \`/sacar Nombre\` » Baja a un jugador (sube reserva auto).\n`;
            respuesta += `• \`/vip ID\` » Da prioridad a un usuario para la próxima.\n`;
            respuesta += `• \`/force_cierre\` » Cierra la lista y sube reservas ya.\n`;
            respuesta += `• \`/reset\` » ⚠️ Borra todo y reinicia el ciclo.\n`;
        } else {
            respuesta += `_Si querés gestionar el partido, ganá las elecciones (o pedile admin al dueño del grupo)._`;
        }

        bot.sendMessage(chatId, respuesta, { parse_mode: 'Markdown' });
    });

};