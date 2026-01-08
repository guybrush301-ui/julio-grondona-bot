const bot = require('../services/bot');
const State = require('../core/state');
const config = require('../config');

const Helpers = {
    esAdmin: async (chatId, userId) => {
        try {
            const admins = await bot.getChatAdministrators(chatId); // Obtener lista de administradores del chat
            return admins.some(a => a.user.id === userId);
        } catch (e) { return false; }
    },

    enviarMenu: async (chatId) => {
        const datos = State.get();
        let msg = `⚽*COMUNICADO AFA*💍\n\n`;        
        if (!datos.listaCerrada) {
            msg += `*Señores, se abren las inscripciones.* Acomódense. Recuerden: _Todo Pasa_, menos las ganas de jugar.\n\n`;
            msg += `⚠️ *Fase de Inscripción con prioridad* cierra próximo sábado a las 18:00)⚠️\n\n`;
            msg += `_Si jugaste la semana pasada, entrás directo a Convocados._\n\n`;
        } else {
            msg += `🔒 *Listas Cerradas* (Orden de llegada)\n\n`;
        }

        msg += `✅ *CONVOCADOS (${datos.convocados.length}/${datos.cupoMaximo})*\n`;
        datos.convocados.forEach((u, i) => msg += `${i+1}. ${u.nombre}\n`);

        const tituloReserva = datos.listaCerrada ? "⏳ *SUPLENTES*" : "📝 RESERVA (Esperando al sábado)";
        msg += `\n${tituloReserva}\n`;
        if (datos.reserva.length === 0) msg += "_Nadie aún_";
        datos.reserva.forEach((u, i) => msg += `${i+1}. ${u.nombre}\n`);

        const opts = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '⚽ JUEGO', callback_data: 'jugar' }, { text: '❌ BAJA', callback_data: 'baja' }],
                    [{ text: '🔄 VER LISTA', callback_data: 'refresh' }]
                ]
            }
        };
        
        // Enviamos mensaje nuevo (o podrías editar si guardaras el message_id)
        bot.sendMessage(chatId, msg, opts);
    }
};

module.exports = Helpers;