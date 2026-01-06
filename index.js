// index.js
const express = require('express');
const config = require('./src/config');
const State = require('./src/core/state');
const registerCommands = require('./src/handlers/commands');
const registerActions = require('./src/handlers/actions');
const registerCron = require('./src/handlers/cron');

// 1. Configurar Express (UptimeRobot)
const app = express();
app.get('/', (req, res) => {
    res.send('🤖 JULIO GRONDONA BOT UP & RUNNING');
});

app.listen(config.PORT, () => {
    console.log(`Servidor web escuchando en puerto ${config.PORT}`);
});

// 2. Inicializar Lógica del Bot
async function iniciarBot() {
    // Cargar datos de Redis
    await State.load();

    // Registrar manejadores
    registerCommands();
    registerActions();
    registerCron();

    console.log('🤖 JULIO GRONDONA BOT UP & RUNNING');
}

iniciarBot();