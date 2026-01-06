require('dotenv').config();
const express = require('express');
const app = express();

// RUTA DE PRUEBA (Para que UptimeRobot sepa que estamos vivos)
app.get('/', (req, res) => {
    res.send('🤖 Julio Grondona (bot) está funcionando correctamente.');
});

// El puerto lo asigna Render automáticamente en la variable process.env.PORT
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor web escuchando en el puerto ${port}`);
});


const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const fs = require('fs');

// --- CONFIGURACIÓN ---
//const token = '8317594779:AAE3pcpzcIK0BmSHw8R4-JRisplsiJZYNkc'; // <--- PEGA TU TOKEN
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, {polling: true});
const MAX_CUPOS = 18;
const ARCHIVO_DB = 'datos_partido.json';

// --- ESTRUCTURA DE DATOS ---
// Esto es lo que guardaremos en el archivo para no perder memoria
let datos = {
    jugaronSemanaPasada: [], // IDs de los que jugaron el ultimo partido
    convocados: [],          // Lista prioritaria actual
    reserva: [],             // Lista de espera actual
    listaCerrada: false,      // Se pone true el sábado a las 16:00
    grupoId: null // <--- NUEVO: Aquí guardaremos la dirección del grupo
};

// Cargar datos al iniciar si existen
if (fs.existsSync(ARCHIVO_DB)) {
    datos = JSON.parse(fs.readFileSync(ARCHIVO_DB));
} else {
    guardarDatos(); // Crear archivo si no existe
}

function guardarDatos() {
    fs.writeFileSync(ARCHIVO_DB, JSON.stringify(datos, null, 2));
}

// --- COMANDOS ---

// Solo admins inician el bot y configuran el grupo
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    
    // Guardamos el ID del grupo si no lo tenemos o si cambió 
    if (datos.grupoId !== chatId) {
        datos.grupoId = chatId;
        guardarDatos();
        console.log(`Grupo configurado: ${chatId}`);
    }

    if (await esAdmin(chatId, msg.from.id)) {
        enviarMenu(chatId);
    } else {
        bot.sendMessage(chatId, "Solo admins inician, pero ya guardé el ID del grupo 😉");
    }
});

// Comando para resetear el ciclo (solo admins)
bot.onText(/\/reset/, async (msg) => {
    if (await esAdmin(msg.chat.id, msg.from.id)) {
        resetearCiclo(msg.chat.id);
        // Opcional: mostrar menú vacío
        // enviarMenu(msg.chat.id); 
    }
});

// --- CRON JOB: SÁBADO 16:00 HS ---
// '0 16 * * 6' significa: Minuto 0, Hora 16, Cualquier dia, Cualquier mes, Día 6 (Sábado)
cron.schedule('0 16 * * 6', () => {
    // Aquí ocurre la magia: Completar cupos con la reserva
    datos.listaCerrada = true; // Ya no hay distinción, el que entra entra
    
    const cuposLibres = MAX_CUPOS - datos.convocados.length;
    
    if (cuposLibres > 0 && datos.reserva.length > 0) {
        // Movemos gente de reserva a convocados
        const pasanAConvocados = datos.reserva.splice(0, cuposLibres);
        datos.convocados = datos.convocados.concat(pasanAConvocados);
    }

    guardarDatos();
    
    // Avisar al grupo (Necesitamos saber el ID del grupo, el bot enviará esto al último chat donde interactuó o tendrás que poner el ID a mano)
    // Para simplificar, asumimos que el usuario refrescará la lista, pero podríamos guardar el chatId en el JSON también.
    console.log("¡Cierre de listas ejecutado!");
});

// --- CRON: JUEVES 08:00 AM (Apertura Automática) ---
// '0 8 * * 4' = Minuto 0, Hora 8, Jueves (4)
cron.schedule('0 8 * * 4', () => {
    if (datos.grupoId) {
        // Solo enviamos si sabemos a qué grupo (si datos.grupoId tiene valor)
        bot.sendMessage(datos.grupoId, "☀️ *¡BUEN DÍA EQUIPO!* ☀️\nSe abren las inscripciones para el Domingo.", {parse_mode: 'Markdown'});
        enviarMenu(datos.grupoId);
    } else {
        console.log("Jueves 8AM: No tengo un ID de grupo guardado para enviar el mensaje.");
    }
}); 


// --- CRON: DOMINGO 22:00 HS (Cierre y Reset) ---
// '0 22 * * 0' = Minuto 0, Hora 22, Domingo (0)
cron.schedule('0 22 * * 0', () => {
    if (datos.grupoId) {
        resetearCiclo(datos.grupoId);
    }
});

// --- LÓGICA DE BOTONES ---
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const usuario = {
        id: query.from.id,
        nombre: query.from.first_name + " " + (query.from.last_name || "")
    };
    const accion = query.data;

    if (accion === 'jugar') {
        console.log('Presionaron jugar:', usuario);
        const yaEnConvocados = datos.convocados.find(u => u.id === usuario.id);
        const yaEnReserva = datos.reserva.find(u => u.id === usuario.id);

        if (yaEnConvocados || yaEnReserva) {
            return bot.answerCallbackQuery(query.id, { text: '¡Ya estás anotado!', show_alert: true });
        }

        // LÓGICA PRINCIPAL
        if (datos.listaCerrada) {
            // Si es después del sábado 16hs, entra directo si hay lugar
            if (datos.convocados.length < MAX_CUPOS) {
                datos.convocados.push(usuario);
                bot.answerCallbackQuery(query.id, { text: '¡Adentro!' });
            } else {
                datos.reserva.push(usuario); // Va a "Suplentes" (Reserva funciona como suplentes post-cierre)
                bot.answerCallbackQuery(query.id, { text: 'Cupos llenos. Vas a suplentes.' });
            }
        } else {
            // Antes del sábado 16hs: Revisar historial
            console.log(datos.jugaronSemanaPasada.includes(usuario.id))
            if (datos.jugaronSemanaPasada.includes(usuario.id)) {
                // Jugó la semana pasada -> Prioridad Convocado
                if (datos.convocados.length < MAX_CUPOS) {
                    datos.convocados.push(usuario);
                    bot.answerCallbackQuery(query.id, { text: '¡Adentro! (Prioridad por jugar semana pasada)' });
                } else {
                    datos.reserva.push(usuario); // Raro que pase, pero por si acaso
                }
            } else {
                // No jugó -> Va a Reserva
                datos.reserva.push(usuario);
                bot.answerCallbackQuery(query.id, { text: 'Anotado en RESERVA hasta el sábado.' });
            }
        }
        guardarDatos();
        enviarMenu(chatId);
    }

    if (accion === 'baja') {
        // Usamos la función maestra
        ejecutarBaja(usuario, chatId);
        
        // Respondemos al botón para que deje de cargar
        bot.answerCallbackQuery(query.id, { text: 'Te diste de baja.' });
    }

    if (accion === 'refresh') {
        bot.deleteMessage(chatId, query.message.message_id).catch(e=>{});
        enviarMenu(chatId);
    }
});

// --- VISTA DEL MENÚ ---
async function enviarMenu(chatId) {
    let msg = `⚽ *ORGANIZADOR AUTOMÁTICO* ⚽\n`;
    
    if (!datos.listaCerrada) {
        msg += `⚠️ *Fase de Inscripción* (Cierra Sábado 16:00)\n`;
        msg += `_Si jugaste la semana pasada, entras directo a Convocados._\n\n`;
    } else {
        msg += `🔒 *Listas Cerradas* (Orden de llegada)\n\n`;
    }

    // LISTA 1: CONVOCADOS
    msg += `✅ *CONVOCADOS (${datos.convocados.length}/${MAX_CUPOS})*\n`;
    datos.convocados.forEach((u, i) => msg += `${i+1}. ${u.nombre}\n`);

    // LISTA 2: RESERVA / SUPLENTES
    const tituloReserva = datos.listaCerrada ? "⏳ SUPLENTES" : "📝 RESERVA (Esperando al sábado)";
    msg += `\n${tituloReserva}\n`;
    if (datos.reserva.length === 0) msg += "_Nadie aún_";
    datos.reserva.forEach((u, i) => msg += `${i+1}. ${u.nombre}\n`);

    const opts = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '⚽ JUEGO', callback_data: 'jugar' }, { text: '❌ BAJA', callback_data: 'baja' }],
                [{ text: '🔄 Actualizar Vista', callback_data: 'refresh' }]
            ]
        }
    };
    
    // Enviar y borrar el anterior si es posible para no spammear, o enviar nuevo
    bot.sendMessage(chatId, msg, opts);
}

// --- SEGURIDAD ---
async function esAdmin(chatId, userId) {
    try {
        const admins = await bot.getChatAdministrators(chatId);
        return admins.some(a => a.user.id === userId);
    } catch (e) { return false; }
}

// --- COMANDO SECRETO: AGREGAR HISTÓRICO MANUALMENTE ---
// Uso: /vip 123456789
bot.onText(/\/vip (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // El "match[1]" es lo que escribes después del comando (el ID)
    const idParaAgregar = parseInt(match[1]); 

    // Solo admins pueden usar esto
    if (await esAdmin(chatId, userId)) {
        if (!isNaN(idParaAgregar)) {
            // Verificamos si ya está para no repetirlo
            if (!datos.jugaronSemanaPasada.includes(idParaAgregar)) {
                datos.jugaronSemanaPasada.push(idParaAgregar);
                guardarDatos();
                bot.sendMessage(chatId, `✅ ID *${idParaAgregar}* agregado a la lista VIP (Prioridad semana pasada).`, {parse_mode: 'Markdown'});
            } else {
                bot.sendMessage(chatId, `⚠️ El ID ${idParaAgregar} ya estaba en la lista.`);
            }
        } else {
            bot.sendMessage(chatId, "⛔ ID inválido. Debes poner solo números. Ejemplo: /vip 123456789");
        }
    } else {
         bot.sendMessage(chatId, "🕵️‍♂️ Comando desconocido (Shhh, es secreto).");
    }
});

// Ver quiénes tienen prioridad
bot.onText(/\/ver_vips/, async (msg) => {
     if (await esAdmin(msg.chat.id, msg.from.id)) {
         bot.sendMessage(msg.chat.id, `👑 IDs con prioridad: ${JSON.stringify(datos.jugaronSemanaPasada)}`);
     }
});

// --- COMANDO ADMIN: AGENDAR MANUALMENTE ---
// Uso: /agendar Juan Perez
bot.onText(/\/agendar (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const adminId = msg.from.id;
    const nombreJugador = match[1]; // El nombre que escribiste

    if (await esAdmin(chatId, adminId)) {
        // Creamos un jugador "virtual"
        const jugadorVirtual = {
            id: 'manual_' + Date.now(), // ID único inventado
            nombre: nombreJugador + " ✏️" // Le pongo un lapiz para saber que fue manual
        };

        // Lógica de inserción (Copiamos la lógica de prioridades o simple llenado)
        let mensaje = "";
        
        // Si listas cerradas -> Al fondo (Reserva) salvo que haya lugar en convocados
        // Si listas abiertas -> Convocados si hay lugar
        
        if (datos.convocados.length < MAX_CUPOS) {
            datos.convocados.push(jugadorVirtual);
            mensaje = `✅ *${nombreJugador}* agregado manualmente a CONVOCADOS.`;
        } else {
            datos.reserva.push(jugadorVirtual);
            mensaje = `📝 *${nombreJugador}* agregado manualmente a RESERVA.`;
        }

        guardarDatos();
        bot.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' });
        enviarMenu(chatId);

    } else {
        bot.sendMessage(chatId, "⛔ Solo admins pueden agendar manualmente.");
    }
});

// --- COMANDO ADMIN: SACAR MANUALMENTE ---
// Uso: /sacar Juan
bot.onText(/\/sacar (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const adminId = msg.from.id;
    const nombreBusqueda = match[1].toLowerCase();

    if (await esAdmin(chatId, adminId)) {
        // Buscar al jugador en ambas listas por nombre (aproximado)
        // Buscamos primero en convocados, luego reserva
        let jugadorEncontrado = datos.convocados.find(j => j.nombre.toLowerCase().includes(nombreBusqueda));
        if (!jugadorEncontrado) {
            jugadorEncontrado = datos.reserva.find(j => j.nombre.toLowerCase().includes(nombreBusqueda));
        }

        if (jugadorEncontrado) {
            // Ejecutamos la "Función Maestra de Baja"
            ejecutarBaja(jugadorEncontrado, chatId);
            bot.sendMessage(chatId, `👮‍♂️ Admin eliminó a *${jugadorEncontrado.nombre}* de la lista.`, {parse_mode: 'Markdown'});
        } else {
            bot.sendMessage(chatId, `❌ No encontré a nadie con el nombre "${match[1]}". Revisa mayúsculas/acentos.`);
        }
    }
});


// --- FUNCIÓN MAESTRA DE BAJA (REUTILIZABLE) ---
// Esta función maneja la lógica de borrar y reemplazar, venga de botón o comando
function ejecutarBaja(usuario, chatId) {
    let estabaEnConvocados = false;
    
    // 1. Borrar
    if (datos.convocados.some(u => u.id === usuario.id)) {
        estabaEnConvocados = true;
        datos.convocados = datos.convocados.filter(u => u.id !== usuario.id);
    } else {
        datos.reserva = datos.reserva.filter(u => u.id !== usuario.id);
    }

    let mensajeSwap = "";

    // 2. Reemplazo Automático (Si aplica)
    if (datos.listaCerrada && estabaEnConvocados && datos.reserva.length > 0) {
        const suplente = datos.reserva.shift();
        datos.convocados.push(suplente);
        mensajeSwap = `\n🔄 *CAMBIO AUTOMÁTICO:*\nEntra 🏃 *${suplente.nombre}*\nSale 👋 ${usuario.nombre}`;
    }

    guardarDatos();

    // Si hubo reemplazo, avisamos
    if (mensajeSwap) {
        bot.sendMessage(chatId, mensajeSwap, { parse_mode: 'Markdown' });
    }
    
    // Refrescamos menú
    enviarMenu(chatId);
}


// --- FUNCIÓN DE RESETEO COMPLETO DEL CICLO ---
function resetearCiclo(chatId) {
    // 1. Guardar historial
    // Guardamos solo los IDs para la prioridad
    datos.jugaronSemanaPasada = datos.convocados.map(j => j.id);
    
    // 2. Limpiar listas
    datos.convocados = [];
    datos.reserva = [];
    datos.listaCerrada = false;
    
    guardarDatos();
    
    bot.sendMessage(chatId, "🏁 *FIN DEL CICLO*\nEl partido ha finalizado. Las listas se han cerrado y guardado prioridades para la próxima semana.", {parse_mode: 'Markdown'});
}

console.log('🤖 Bot Director Técnico: ACTIVO');