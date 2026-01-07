/*
  ┌───────────── Minuto (0 - 59)
  │  ┌────────── Hora (0 - 23)
  │  │ ┌──────── Día del mes (1 - 31)
  │  │ │ ┌────── Mes (1 - 12)
  │  │ │ │ ┌──── Día de la semana (0 - 6) (Donde 0 es Domingo y 6 es Sábado)
  │  │ │ │ │     
  │  │ │ │ │
  0 16 * * 6  -> Cada Sábado a las 16:00 hs
*/

const cron = require('node-cron');
const bot = require('../services/bot');
const State = require('../core/state');
const Helpers = require('../utils/helpers');
const config = require('../config');

// Definimos la zona horaria una sola vez para mantener el código limpio
const TIMEZONE = "America/Argentina/Buenos_Aires";

module.exports = () => {

    // Si NO estamos en producción, no activamos los cronómetros automáticos
    if (!config.IS_PROD) {
        console.log("🚧 MODO DEV: Cron Jobs automáticos DESACTIVADOS para evitar spam.");
        console.log("💡 Tip: Usa comandos manuales o /force_cierre para probar.");
        return;
    }

    // '0 18 * * 6' -> 18:00 hs todos los sábados se hace el cierre de listas y subida de reservas
    cron.schedule('0 18 * * 6', () => {
        const datos = State.get();
        State.setListaCerrada(true);

        const cuposLibres = datos.cupoMaximo - datos.convocados.length;
        if (cuposLibres > 0 && datos.reserva.length > 0) {
            State.moverReservaAConvocados(cuposLibres);
        }
        
        State.save();
        console.log("¡Cierre de listas ejecutado!");
        // Opcional: Avisar si tenemos grupoId
        if(datos.grupoId) {
            bot.sendMessage(datos.grupoId, "🔒 *LISTAS CERRADAS*", {parse_mode: 'Markdown'});
            Helpers.enviarMenu(datos.grupoId);
        } 
    }, {
        timezone: TIMEZONE
    });

    // Jueves 08:00 - Apertura 0 8 * * 4
    cron.schedule('0 8 * * 4', () => {
        const datos = State.get();
        if (datos.grupoId) {
            bot.sendMessage(datos.grupoId, "☀️ *¡BUEN DÍA!* Se abren inscripciones.", {parse_mode: 'Markdown'});
            Helpers.enviarMenu(datos.grupoId);
        }
        console.log("Apertura de inscripciones ejecutada.");
    }, {
        timezone: TIMEZONE
    });

    // Domingo 21:00 - Reset 
    cron.schedule('0 21 * * 0', () => {
        const datos = State.get();
        if (datos.grupoId) {
            State.resetearCiclo();
            State.save();
            bot.sendMessage(datos.grupoId, "💍 *SE CERRÓ LA FECHA* 💍\n\nEl partido terminó. Los puntos quedan en casa. La lista se borró. \n\n_Todo pasa._", {parse_mode: 'Markdown'});
        }
        console.log("Reset de ciclo ejecutado.");
    }, {
        timezone: TIMEZONE
    });
};