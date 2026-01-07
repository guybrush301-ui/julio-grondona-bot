// src/config.js
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';
console.log(`⚙️ Modo de ejecución: ${isProd ? 'PRODUCCIÓN' : 'DESARROLLO'}`);

module.exports = {
    IS_PROD: isProd,
    PORT: process.env.PORT || 3000,
    REDIS_URL: process.env.UPSTASH_REDIS_REST_URL,
    REDIS_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
    // En DEV usamos 5 para probar rápido, en PROD usamos 18
    MAX_CUPOS: isProd ? 18 : 5, 
    // Claves distintas para no borrar la lista real jugando en local
    DB_KEY: process.env.DB_KEY || 'datos_partido_test'
};