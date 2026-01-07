const bot = require('../services/bot');
const data = require('../utils/grondona_data');

module.exports = () => {
    
    bot.on('message', (msg) => {
        // Ignoramos comandos (los que empiezan con /)
        if (msg.text && msg.text.startsWith('/')) return;
        
        // Ignoramos mensajes que no sean texto
        if (!msg.text) return;

        const texto = msg.text.toLowerCase();
        
        // Verificamos si alguna palabra prohibida está en el texto
        const activado = data.triggers.some(palabra => texto.includes(palabra));

        if (activado && Math.random() < 1) { // Probabilidad 1 (100%) de activarse
            // Elegimos una frase al azar
            const fraseRandom = data.frases[Math.floor(Math.random() * data.frases.length)];
            
            // Opcional: Responder citando el mensaje original para más impacto
            bot.sendMessage(msg.chat.id, `💍 *DON JULIO DICE:*\n\n_"${fraseRandom}"_`, {
                parse_mode: 'Markdown',
                reply_to_message_id: msg.message_id
            });
        }
    });
};