const bot = require('../services/bot');
const State = require('../core/state');
const Helpers = require('../utils/helpers');
const TeamMaker = require('../utils/teammaker');

module.exports = () => {
    

    // Función auxiliar para determinar el contexto (AGREGAR ESTO AL PRINCIPIO)
    const resolverContexto = (msg) => {
        const datos = State.get();
        const chatIdOrigen = msg.chat.id; // Donde respondes (Privado o Grupo)
        const tipoChat = msg.chat.type;        
        // Si me hablan por privado, el objetivo es el Grupo guardado en State
        // Si me hablan por el grupo, el objetivo es ese mismo grupo
        const chatIdGrupo = (tipoChat === 'private') ? datos.grupoId : chatIdOrigen;
        return { chatIdOrigen, chatIdGrupo };
    };



    // /start o /start 10
    bot.onText(/\/start(?: (\d+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id; // Necesitamos el ID del que mandó el mensaje

        // 🛑 ZONA DE SEGURIDAD 🛑
        // Verificamos ANTES de tocar cualquier variable del Estado.
        if (!await Helpers.esAdmin(chatId, userId)) {
            // Si no es admin, le avisamos y CORTAMOS la ejecución aquí mismo.
            return bot.sendMessage(chatId, "⛔ <b>ACCESO DENEGADO</b>\nSolo la Comisión Directiva (Admins) puede iniciar o configurar el partido.", {parse_mode: 'HTML'});
        }

        // ✅ ZONA VIP (Solo llegamos acá si pasó el if de arriba)
        const datos = State.get();
        
        // 1. Configuración del Grupo
        if (datos.grupoId !== chatId) {
            State.setGrupoId(chatId);
            console.log(`Grupo configurado: ${chatId}`);
        }

        // 2. Configuración del Cupo (si pasaron argumento)
        const nuevoCupo = match[1] ? parseInt(match[1]) : null;

        if (nuevoCupo) {
            if (!isNaN(nuevoCupo) && nuevoCupo > 10) {
                State.setCupoMaximo(nuevoCupo);
                bot.sendMessage(chatId, `✅ Se configuró el partido para **${nuevoCupo} jugadores**.`, {parse_mode: 'Markdown'});
            } else {
                bot.sendMessage(chatId, "⚠️ Número de jugadores inválido (tiene que ser mayor a 10).");
            }
        }

        // 3. Guardar cambios
        State.save();

        // 4. Mostrar Menú
        Helpers.enviarMenu(chatId);
    });

    // /reset
    bot.onText(/\/reset/, async (msg) => {
        if (await Helpers.esAdmin(msg.chat.id, msg.from.id)) {
            State.resetearCiclo();
            State.save();
            bot.sendMessage(msg.chat.id, "🏁 Ciclo reseteado manualmente.");
        }
    });


    // /force_cierre
    bot.onText(/\/force_cierre/, async (msg) => {
        if (await Helpers.esAdmin(msg.chat.id, msg.from.id)) {
            const datos = State.get();
            
            // COPIAR ACÁ LA LÓGICA QUE ESTÁ DENTRO DEL CRON
            State.setListaCerrada(true);
            const cuposLibres = datos.cupoMaximo - datos.convocados.length;
            if (cuposLibres > 0 && datos.reserva.length > 0) {
                State.moverReservaAConvocados(cuposLibres);
            }
            State.save();            
            bot.sendMessage(msg.chat.id, "🧪 *TEST: CIERRE EJECUTADO*", {parse_mode: 'Markdown'});

        }
    });

    // /vip ID
    bot.onText(/\/vip (.+)/, async (msg, match) => {
        if (await Helpers.esAdmin(msg.chat.id, msg.from.id)) {
            const id = parseInt(match[1]);
            if (!isNaN(id)) {
                if (State.agregarVip(id)) {
                    State.save();
                    bot.sendMessage(msg.chat.id, `✅ ID ${id} agregado a VIP.`);
                } else {
                    bot.sendMessage(msg.chat.id, "⚠️ Ya estaba en la lista.");
                }
            }
        }
    });

    // /agendar Nombre
    bot.onText(/\/agendar (.+)/, async (msg, match) => {

        const { chatIdOrigen, chatIdGrupo } = resolverContexto(msg);

        if (await Helpers.esAdmin(chatIdGrupo, msg.from.id)) {
            const nombre = match[1];
            const usuario = { id: 'manual_' + Date.now(), nombre: nombre + " ✏️" };
            const datos = State.get();

            // Usamos datos.cupoMaximo (si hiciste el cambio anterior)
            if (datos.convocados.length < datos.cupoMaximo) {
                State.agregarConvocado(usuario);
            } else {
                State.agregarReserva(usuario);
            }
            State.save();

            // RESPUESTA DISCRETA:
            // 1. Al que ejecutó el comando (Privado o Grupo), le confirmamos
            bot.sendMessage(chatIdOrigen, `✅ Agendado: ${nombre}`);

            // 2. Al Grupo (si el comando vino por privado), le mandamos el menú actualizado
            if (chatIdOrigen !== chatIdGrupo) {
                Helpers.enviarMenu(chatIdGrupo);
            } else {
                // Si fue en el grupo, mandamos el menú ahí mismo
                Helpers.enviarMenu(chatIdGrupo);
            }
        } else {
            bot.sendMessage(chatIdOrigen, "⛔ Que haces papá? Te crees que son Don Julio vo?.");
        }
    });


    // --- COMANDO /sacar (Modificado) ---
    bot.onText(/\/sacar (.+)/, async (msg, match) => {
        const { chatIdOrigen, chatIdGrupo } = resolverContexto(msg);

        if (await Helpers.esAdmin(chatIdGrupo, msg.from.id)) {
            const nombreBusqueda = match[1].toLowerCase();
            const datos = State.get();
            
            let jugador = datos.convocados.find(j => j.nombre.toLowerCase().includes(nombreBusqueda)) || 
                          datos.reserva.find(j => j.nombre.toLowerCase().includes(nombreBusqueda));

            if (jugador) {
                State.removerJugador(jugador.id);
                
                if (datos.listaCerrada && datos.reserva.length > 0) {
                     State.moverReservaAConvocados(1);
                }
                
                State.save();

                // Confirmación al Admin (en privado o donde esté)
                bot.sendMessage(chatIdOrigen, `✅ Sacaste a ${jugador.nombre}`);

                // Aviso público al grupo (opcional, para que sepan que pasó algo)
                if (chatIdOrigen !== chatIdGrupo) {
                    bot.sendMessage(chatIdGrupo, `👮‍♂️ *ADMINISTRACIÓN:*\nHubo una baja administrativa de _${jugador.nombre}_`, {parse_mode: 'Markdown'});
                    Helpers.enviarMenu(chatIdGrupo);
                } else {
                    bot.sendMessage(chatIdGrupo, `👮‍♂️ Admin sacó a *${jugador.nombre}*`, {parse_mode: 'Markdown'});
                    Helpers.enviarMenu(chatIdGrupo);
                }

            } else {
                bot.sendMessage(chatIdOrigen, "No encontrado.");
            }
        }
    });


    // COMANDO: /soy DEF VOL 4
    bot.onText(/\/soy (ARQ|DEF|VOL|DEL) (ARQ|DEF|VOL|DEL) ([1-5])/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const nombre = msg.from.first_name;

        const pos1 = match[1].toUpperCase();
        const pos2 = match[2].toUpperCase();
        const nivel = parseInt(match[3]);

        State.guardarPerfil(userId, nombre, pos1, pos2, nivel);
        State.save();

        const respuesta = `✅ *Ficha Actualizada*\n👤 ${nombre}\n🛡️ Puesto 1: ${pos1}\n⚔️ Puesto 2: ${pos2}\n⭐ Nivel: ${nivel}`;
        bot.sendMessage(chatId, respuesta, { parse_mode: 'Markdown' });
    });
    
    
    // Ayuda para que sepan como usuarlo
    bot.onText(/\/ficha/, (msg) => {
        bot.sendMessage(msg.chat.id, "📝 *CÓMO CARGAR TU FICHA:*\n\nEscribí:\n`/soy POSICION POSICION NIVEL`\n\nEjemplos:\n`/soy DEF VOL 3` (Defensor/Volante, 3 puntos)\n`/soy DEL VOL 5` (Delantero/Volante, Crack)\n\n_Opciones: ARQ, DEF, VOL, DEL. Nivel 1 al 5._", {parse_mode: 'Markdown'});
    });


    // COMANDO: /equipos
    // Genera los equipos manualmente cuando el admin quiera
    bot.onText(/\/equipos/, async (msg) => {
        const chatId = msg.chat.id;
        
        // 1. Solo admins pueden generar equipos (para no spamear)
        if (await Helpers.esAdmin(chatId, msg.from.id)) {
            const datos = State.get();

            // 2. Validar cantidad mínima (podés cambiar el 10)
            if (datos.convocados.length < 2) {
                return bot.sendMessage(chatId, "⚠️ Nooo flaco, te faltan jugadores para armar equipos decentes.");
            }

            // 3. Usar el TeamMaker
            const match = TeamMaker.armarEquipos(datos.convocados);
            
            // 4. Armar el mensaje
            let respuesta = `⚖️ *EQUIPOS CONFIRMADOS* ⚖️\n`;
            respuesta += `_Firmado: La AFA_\n\n`;

            // --- AGREGAMOS EL MENSAJE DE ARQUEROS AQUÍ ---
            if (match.mensaje) {
                respuesta += `${match.mensaje}\n\n`;
            }

            respuesta += `⚪ *EQUIPO A* (Nivel: ${match.nivelA})\n`;
            match.equipoA.forEach(j => respuesta += `• ${j.nombre} (${j.pos1})\n`);

            respuesta += `\n⚫ *EQUIPO B* (Nivel: ${match.nivelB})\n`;
            match.equipoB.forEach(j => respuesta += `• ${j.nombre} (${j.pos1})\n`);

            // 5. Enviar
            bot.sendMessage(chatId, respuesta, { parse_mode: 'Markdown' });

        } else {
            bot.sendMessage(chatId, "🤌 ¿Quién sos vos para armar los equipos? Tomatela de acá.");
        }
    });

    // COMANDO: /help o /ayuda
    bot.onText(/\/help|\/ayuda/, async (msg) => {
        const chatId = msg.chat.id;
        const esAdmin = await Helpers.esAdmin(chatId, msg.from.id);

        let respuesta = `📖 *MANUAL DE REGLAMENTO* 📖\n`;
        respuesta += `_Todo lo que necesitás saber para no quedarte afuera._\n\n`;

        // --- SECCIÓN JUGADORES (Visible para todos) ---
        respuesta += `👤 *PARA LOS JUGADORES*\n`;
        respuesta += `• \`/soy P1 P2 N\` » Cargá tu ficha técnica.\n`;
        respuesta += `   _Ej: /soy DEF VOL 4 (Defensor/Volante, Nivel 4)_\n`;
        respuesta += `• \`/ficha\` » Ver ayuda detallada sobre posiciones.\n`;
        respuesta += `• \`/help\` » Muestra este mensaje.\n\n`;

        // --- SECCIÓN ADMINS (Solo visible si sos Admin) ---
        if (esAdmin) {
            respuesta += `👮‍♂️ *COMISIÓN DIRECTIVA (Solo Admins)*\n`;
            respuesta += `• \`/start [N]\` » Inicia/Configura el partido (Ej: /start 10).\n`;
            respuesta += `• \`/equipos\` » Arma los equipos automáticamente (A vs B).\n`;
            respuesta += `• \`/agendar Nombre\` » Anota a un jugador manualmente.\n`;
            respuesta += `• \`/sacar Nombre\` » Baja a un jugador (sube reserva auto).\n`;
            respuesta += `• \`/vip ID\` » Da prioridad a un usuario para la próxima.\n`;
            respuesta += `• \`/force_cierre\` » Cierra la lista y sube reservas ya.\n`;
            respuesta += `• \`/reset\` » ⚠️ Borra todo y reinicia el ciclo.\n`;
        } else {
            respuesta += `_Si querés gestionar el partido, ganá las elecciones (o pedile admin al dueño del grupo)._`;
        }

        bot.sendMessage(chatId, respuesta, { parse_mode: 'Markdown' });
    });

    // COMANDO: /reglamento o /reglas
    // Muestra la constitución nacional del grupo con la voz del Jefe.
    bot.onText(/\/reglamento|\/reglas/, (msg) => {
        const chatId = msg.chat.id;

        let reglamento = `📜 *BOLETÍN OFICIAL AFA - RESOLUCIÓN N° 10* 📜\n`;
        reglamento += `_Visto y considerando que algunos se hacen los vivos, la Presidencia decreta:_\n\n`;

        // REGLA 1: Convivencia
        reglamento += `1️⃣ *ARTÍCULO 1: La Familia*\n`;
        reglamento += `Acá jugamos porque somos amigos, no para salvarse el año. Queremos ganar, sí, pero el que se zarpa, agrede o se hace el guapo, *queda desafiliado automáticamente*. Sin anestesia.\n\n`;

        // REGLA 2: Horarios
        reglamento += `2️⃣ *ARTÍCULO 2: Ventanilla Administrativa*\n`;
        reglamento += `La organización arranca los *Jueves a las 08:00 AM*. Antes de esa hora no me rompan las pelotas, que la AFA está cerrada.\n\n`;

        // REGLA 3: Prioridad y Sanciones
        reglamento += `3️⃣ *ARTÍCULO 3: Lealtad y Traición*\n`;
        reglamento += `• *El que jugó, tiene prioridad:* Si venís del domingo pasado, tenés tu lugar reservado hasta el *Sábado 18:00 hs*.\n`;
        reglamento += `• *La palabra vale:* Si ponés "JUEGO", es un contrato. Si te bajás después, te comés una *🟨 TARJETA AMARILLA*.\n`;
        reglamento += `• *Reincidencia:* A la segunda amarilla, perdés los fueros. Vas a la lista de espera (Reserva) como cualquier hijo de vecino, aunque hayas jugado el partido anterior.\n\n`;

        // REGLA 4: Lavado de Ropa
        reglamento += `4️⃣ *ARTÍCULO 4: Impuesto a la Ropa Limpia*\n`;
        reglamento += `Como a nadie le gusta lavar, acá decide el azar (o sea, YO). Al final del partido se tira \`/casacas_limpias\`.\n`;
        reglamento += `• Si te toca, te toca. A llorar a la iglesia.\n`;
        reglamento += `• Si te negás a llevarlas: *🟥 ROJA DIRECTA*. Te comés *2 fechas de suspensión* por desacato a la autoridad.\n\n`;

        // Firma
        reglamento += `_Comuníquese, publíquese y archívese._\n`;
        reglamento += `💍 *Julio H. Grondona*`;

        bot.sendMessage(chatId, reglamento, { parse_mode: 'Markdown' });
    });

};