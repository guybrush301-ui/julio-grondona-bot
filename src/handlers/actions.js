const bot = require('../services/bot');
const State = require('../core/state');
const Helpers = require('../utils/helpers');
const config = require('../config');

// LA CLAVE ESTÁ AQUÍ: Debes exportar una función anónima directamente
module.exports = () => {
    
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const usuario = {
            id: query.from.id,
            nombre: query.from.first_name + " " + (query.from.last_name || "")
        };
        const accion = query.data;
        const datos = State.get();

        if (accion === 'jugar') {
            console.log('Presionaron JUEGO:', usuario);
            const yaEsta = datos.convocados.some(u => u.id === usuario.id) || 
                           datos.reserva.some(u => u.id === usuario.id);

            if (yaEsta) return bot.answerCallbackQuery(query.id, { text: '¡Ya estás anotado!', show_alert: true });

            if (datos.listaCerrada) {
                if (datos.convocados.length < datos.cupoMaximo) {
                    State.agregarConvocado(usuario);
                    bot.answerCallbackQuery(query.id, { text: '¡Adentro!' });
                } else {
                    State.agregarReserva(usuario);
                    bot.answerCallbackQuery(query.id, { text: 'A suplentes.' });
                }
            } else {
                // Lógica pre-cierre
                if (datos.jugaronSemanaPasada.includes(usuario.id)) {
                     // Prioridad
                     if (datos.convocados.length < datos.cupoMaximo) {
                         State.agregarConvocado(usuario);
                         bot.answerCallbackQuery(query.id, { text: '¡Adentro! (Prioridad)' });
                     } else {
                         State.agregarReserva(usuario);
                     }
                } else {
                    State.agregarReserva(usuario);
                    bot.answerCallbackQuery(query.id, { text: 'Anotado en Reserva.' });
                }
            }
            State.save();
            Helpers.enviarMenu(chatId);
        }

        if (accion === 'baja') {
            console.log('Presionaron BAJA:', usuario);
            let estabaEnConvocados = datos.convocados.some(u => u.id === usuario.id);
            State.removerJugador(usuario.id);

            let msgExtra = "";
            if (datos.listaCerrada && estabaEnConvocados && datos.reserva.length > 0) {
                const suplentes = State.moverReservaAConvocados(1);
                msgExtra = `\n🔄 Entra: ${suplentes[0].nombre}`;
            }

            State.save();
            bot.answerCallbackQuery(query.id, { text: 'Te diste de baja. Me extraña, araña...' });
            if (msgExtra) bot.sendMessage(chatId, msgExtra);
            Helpers.enviarMenu(chatId);
        }

        if (accion === 'refresh') {
            console.log('Presionaron VER LISTA:', usuario);
            bot.deleteMessage(chatId, query.message.message_id).catch(e=>{});
            Helpers.enviarMenu(chatId);
        }
    });
};