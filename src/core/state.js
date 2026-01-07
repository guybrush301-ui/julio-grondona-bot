const redis = require('../services/redis');
const config = require('../config');

// Estructura inicial
let datos = {
    jugaronSemanaPasada: [],        // IDs de los que jugaron el ultimo partido
    convocados: [],                 // Lista prioritaria actual
    reserva: [],                    // Lista de espera actual
    listaCerrada: false,            // Se pone true el sábado a las 16:00
    grupoId: null,                  // ID del grupo de Telegram
    cupoMaximo: config.MAX_CUPOS,   // Cupo máximo de jugadores
    perfiles: {}                    // Perfiles de usuarios { id: { nombre, telegramUsername } }
};

const State = {
    get: () => datos,
    
    // Método para guardar en Redis
    save: async () => {
        try {
            await redis.set(config.DB_KEY, datos);
        } catch (error) {
            console.error('Error guardando en Redis:', error);
        }
    },

    // Metódodo para cargar desde Redis
    load: async () => {
        try {
            const datosNube = await redis.get(config.DB_KEY);
            if (datosNube) {
                datos = datosNube;

                // Si la base de datos es vieja y no tiene perfiles, lo creamos vacío
                if (!datos.perfiles) {
                    datos.perfiles = {};
                }

                // Aseguramos que exista la propiedad si cargamos datos viejos
                if (!datos.cupoMaximo) datos.cupoMaximo = config.MAX_CUPOS;
                console.log("✅ Datos cargados correctamente.");

            } else {
                console.log("🆕 Iniciando datos desde cero.");
                if (!datos.perfiles) datos.perfiles = {};
                await State.save();
            }
        } catch (error) {
            console.error("Error cargando Redis:", error);
        }
    },

    // Método para guardar la ficha del jugador
    guardarPerfil: (id, nombre, pos1, pos2, nivel) => {
        datos.perfiles[id] = {
            nombre: nombre, // Guardamos nombre actual por si cambia
            pos1: pos1,     // DEF, VOL, DEL
            pos2: pos2,
            nivel: parseInt(nivel) // 1 a 5
        };
    },

    // Método para obtener la ficha del jugador
    getPerfil: (id) => {
        return datos.perfiles[id] || null;
    },

    // Métodos para modificar el estado (Setters)
    setGrupoId: (id) => { datos.grupoId = id; },
    
    setCupoMaximo: (cantidad) => { datos.cupoMaximo = cantidad; },

    resetearCiclo: () => {
        datos.jugaronSemanaPasada = datos.convocados.map(j => j.id);
        datos.convocados = [];
        datos.reserva = [];
        datos.listaCerrada = false;
    },

    agregarConvocado: (usuario) => datos.convocados.push(usuario),
    
    agregarReserva: (usuario) => datos.reserva.push(usuario),
    
    removerJugador: (id) => {
        datos.convocados = datos.convocados.filter(u => u.id !== id);
        datos.reserva = datos.reserva.filter(u => u.id !== id);
    },

    moverReservaAConvocados: (cantidad) => {
        const pasan = datos.reserva.splice(0, cantidad);
        datos.convocados = datos.convocados.concat(pasan);
        return pasan;
    },

    setListaCerrada: (estado) => { datos.listaCerrada = estado; },
    
    agregarVip: (id) => {
        if (!datos.jugaronSemanaPasada.includes(id)) {
            datos.jugaronSemanaPasada.push(id);
            return true;
        }
        return false;
    }
};

module.exports = State;