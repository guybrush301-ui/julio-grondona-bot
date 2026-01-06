const redis = require('../services/redis');
const config = require('../config');

// Estructura inicial
let datos = {
    jugaronSemanaPasada: [],
    convocados: [],
    reserva: [],
    listaCerrada: false,
    grupoId: null,
    cupoMaximo: config.MAX_CUPOS
};

const State = {
    get: () => datos,
    
    // Guardar en Redis
    save: async () => {
        try {
            await redis.set(config.DB_KEY, datos);
        } catch (error) {
            console.error('Error guardando en Redis:', error);
        }
    },

    // Cargar de Redis
    load: async () => {
        try {
            const datosNube = await redis.get(config.DB_KEY);
            if (datosNube) {
                datos = datosNube;
                // Aseguramos que exista la propiedad si cargamos datos viejos
                if (!datos.cupoMaximo) datos.cupoMaximo = config.MAX_CUPOS;
                console.log("✅ Datos cargados correctamente.");
            } else {
                console.log("🆕 Iniciando datos desde cero.");
                await State.save();
            }
        } catch (error) {
            console.error("Error cargando Redis:", error);
        }
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