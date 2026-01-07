// src/utils/teammaker.js
const State = require('../core/state');

const TeamMaker = {
    armarEquipos: (listaJugadores) => {
        // 1. Enriquecer la lista
        const jugadoresFull = listaJugadores.map(jugador => {
            const perfil = State.getPerfil(jugador.id);
            return {
                id: jugador.id,
                nombre: jugador.nombre,
                pos1: perfil ? perfil.pos1 : 'VOL',
                pos2: perfil ? perfil.pos2 : 'DEF',
                nivel: perfil ? perfil.nivel : 3
            };
        });

        // 2. Separación Inicial
        let arqueros = jugadoresFull.filter(j => j.pos1 === 'ARQ');
        let campo = jugadoresFull.filter(j => j.pos1 !== 'ARQ');

        // --- BÚSQUEDA DE VOLUNTARIOS (Solo si faltan) ---
        if (arqueros.length < 2) {
            // Buscamos a los que pusieron 'ARQ' de segunda opción
            const parches = campo.filter(j => j.pos2 === 'ARQ');
            parches.sort((a, b) => b.nivel - a.nivel); // Los mejores primero

            const faltan = 2 - arqueros.length;
            const elegidos = parches.slice(0, faltan);

            if (elegidos.length > 0) {
                arqueros = [...arqueros, ...elegidos];
                const idsElegidos = elegidos.map(j => j.id);
                campo = campo.filter(j => !idsElegidos.includes(j.id));
            }
        }

        // 3. Separar resto por líneas
        let defensores = campo.filter(j => j.pos1 === 'DEF');
        let volantes = campo.filter(j => j.pos1 === 'VOL');
        let delanteros = campo.filter(j => j.pos1 === 'DEL');

        // 4. Ordenar por nivel
        const sortNivel = (a, b) => b.nivel - a.nivel;
        arqueros.sort(sortNivel);
        defensores.sort(sortNivel);
        volantes.sort(sortNivel);
        delanteros.sort(sortNivel);

        // 5. Repartir (Snake Draft)
        let equipoA = [];
        let equipoB = [];

        const repartir = (lista) => {
            lista.forEach((j) => {
                // Equilibrio de cantidad
                if (equipoA.length <= equipoB.length) equipoA.push(j);
                else equipoB.push(j);
            });
        };

        repartir(arqueros);   
        repartir(defensores);
        repartir(volantes);
        repartir(delanteros);

        // 6. Cálculos finales
        const calcularNivel = (equipo) => {
            if (equipo.length === 0) return 0;
            const total = equipo.reduce((sum, j) => sum + j.nivel, 0);
            return (total / equipo.length).toFixed(2);
        };

        // Detectamos si logramos cubrir los arcos o no
        const hayArqueros = arqueros.length >= 2;

        return {
            equipoA,
            equipoB,
            nivelA: calcularNivel(equipoA),
            nivelB: calcularNivel(equipoB),
            mensaje: hayArqueros ? "" : "⚠️ *ATENCIÓN:* No hay arqueros fijos. Se balancearon las líneas para rotar al arco."
        };
    }
};

module.exports = TeamMaker;