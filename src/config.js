// src/config.js
require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 3000,
    REDIS_URL: process.env.UPSTASH_REDIS_REST_URL,
    REDIS_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
    MAX_CUPOS: 18,
    DB_KEY: 'datos_partido'
};