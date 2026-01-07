// tests/teammaker.test.js
const TeamMaker = require('../src/utils/teammaker');
const State = require('../src/core/state');

// ==========================================
// 1. DATA MOCK (Simulación de Jugadores con DOBLE POSICIÓN)
// ==========================================
const jugadoresMock = [
    { id: 3,  nombre: 'Nico Cufre',        pos1: 'VOL', pos2: 'DEF', nivel: 4 },
    { id: 4,  nombre: 'Franco',            pos1: 'DEF', pos2: 'DEL', nivel: 2 }, 
    { id: 5,  nombre: 'Andy',              pos1: 'DEF', pos2: 'VOL', nivel: 4 },
    { id: 6,  nombre: 'Sergio',            pos1: 'DEF', pos2: 'VOL', nivel: 4 }, 
    { id: 7,  nombre: 'Lucas',             pos1: 'VOL', pos2: 'DEL', nivel: 4 }, 
    { id: 8,  nombre: 'Pablo (Chile)',     pos1: 'DEF', pos2: 'VOL', nivel: 3 },
    { id: 9,  nombre: 'Seba',              pos1: 'DEF', pos2: 'DEL', nivel: 2 },
    { id: 10, nombre: 'Poroto',            pos1: 'DEF', pos2: 'DEF', nivel: 3 },
    { id: 11, nombre: 'Nahuel',            pos1: 'VOL', pos2: 'DEF', nivel: 4 }, 
    { id: 12, nombre: 'Pablo Fernandez',   pos1: 'VOL', pos2: 'DEF', nivel: 5 },
    { id: 13, nombre: 'Nacho Cucchi',      pos1: 'DEF', pos2: 'VOL', nivel: 5 },
    { id: 14, nombre: 'Hernan',            pos1: 'DEF', pos2: 'VOL', nivel: 3 },
    { id: 15, nombre: 'Rulo',              pos1: 'DEL', pos2: 'DEL', nivel: 2 },
    { id: 16, nombre: 'Santi Rossi',       pos1: 'VOL', pos2: 'DEL', nivel: 5 },
    { id: 17, nombre: 'JuanMa',            pos1: 'VOL', pos2: 'DEF', nivel: 3 },
    { id: 18, nombre: 'Nicole',            pos1: 'DEL', pos2: 'VOL', nivel: 2 },
    { id: 19, nombre: 'Ariel (Pela)',      pos1: 'DEF', pos2: 'VOL', nivel: 4 }, 
    { id: 20, nombre: 'Lobo',              pos1: 'VOL', pos2: 'DEL', nivel: 3 }
];

// ==========================================
// 2. MOCK DE LA BASE DE DATOS (Actualizado)
// ==========================================
State.getPerfil = jest.fn((id) => {
    const jugador = jugadoresMock.find(j => j.id === id);
    if (!jugador) return null;
    
    // AHORA SÍ devolvemos la pos2 real del mock
    return {
        pos1: jugador.pos1,
        pos2: jugador.pos2, 
        nivel: jugador.nivel
    };
});

// ==========================================
// 3. LOS TESTS
// ==========================================

describe('Algoritmo de Armado de Equipos (Grondona Style)', () => {

    test('Debe dividir los equipos en cantidades iguales', () => {
        const resultado = TeamMaker.armarEquipos(jugadoresMock);
        expect(resultado.equipoA.length).toBe(resultado.equipoB.length);
        //expect(resultado.equipoB.length).toBe(12);
    });

    test('No debe perder ningún jugador en el camino', () => {
        const resultado = TeamMaker.armarEquipos(jugadoresMock);
        const total = resultado.equipoA.length + resultado.equipoB.length;
        expect(total).toBe(jugadoresMock.length);
    });

    /*
    test('Si hay arqueros, debe poner un Arquero en cada equipo', () => {
        const jugadoresConArqueros = [
            ...jugadoresMock,
            { id: 21, nombre: 'Arquero 1', pos1: 'ARQ', pos2: 'DEF', nivel: 3 },
            { id: 22, nombre: 'Arquero 2', pos1: 'ARQ', pos2: 'VOL', nivel: 4 }
        ];
        const resultado = TeamMaker.armarEquipos(jugadoresConArqueros);
        const arqA = resultado.equipoA.filter(j => j.pos1 === 'ARQ').length;
        const arqB = resultado.equipoB.filter(j => j.pos1 === 'ARQ').length;
        expect(arqA).toBe(1);
        expect(arqB).toBe(1);
    });
    */

    test('Los niveles promedio deben ser parejos', () => {
        const resultado = TeamMaker.armarEquipos(jugadoresMock);
        const nivelA = parseFloat(resultado.nivelA);
        const nivelB = parseFloat(resultado.nivelB);
        
        console.log(`\n📊 RESULTADO FINAL:`);
        console.log(`Equipo A (Nivel ${nivelA}):`, resultado.equipoA.map(j => j.nombre).join(', '));
        console.log(`Equipo B (Nivel ${nivelB}):`, resultado.equipoB.map(j => j.nombre).join(', '));

        const diferencia = Math.abs(nivelA - nivelB);
        // Tolerancia de 0.5 puntos de diferencia
        expect(diferencia).toBeLessThan(0.6);
    });
});