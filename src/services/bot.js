const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');

const options = {
    polling: true,
    request: {
        agentOptions: {
            keepAlive: true,
            family: 4 // <--- ESTO SOLUCIONA LA IMAGEN 1
        }
    }
};
const bot = new TelegramBot(config.TELEGRAM_TOKEN, options);

module.exports = bot;