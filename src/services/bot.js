const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');

// Creamos la instancia aquí para importarla donde la necesitemos
const bot = new TelegramBot(config.TELEGRAM_TOKEN, { polling: true });

module.exports = bot;