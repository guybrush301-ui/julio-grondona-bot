const bot = require('../services/bot');
const State = require('../core/state');
const Helpers = require('../utils/helpers');

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
    // /agendar Nombre (ACTUALIZADO CON CUPO DINÁMICO)
    bot.onText(/\/agendar (.+)/, async (msg, match) => {
        if (await Helpers.esAdmin(msg.chat.id, msg.from.id)) {
            const nombre = match[1];
            const usuario = { id: 'manual_' + Date.now(), nombre: nombre + " ✏️" };
            const datos = State.get();

            // CAMBIO AQUÍ: Usamos datos.cupoMaximo en lugar de config.MAX_CUPOS
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
};