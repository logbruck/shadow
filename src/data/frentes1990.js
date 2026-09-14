/* =====================================================================
   Shadow President 1990 - Batallas y frentes (datos)
   ---------------------------------------------------------------------
   Tres tablas de texto, para poder ajustarlas sin saber programar
   (ver docs/FRENTES.md):

     1. SP.FRENTE_TERRENO      -> qué defiende cada tipo de terreno.
     2. SP.FRENTE_TERRENO_REGION / _PAIS -> qué terreno le toca a cada país.
     3. SP.FRENTE_ORDENES      -> las seis órdenes que se pueden dar.
   Más los números del sistema en SP.FRENTE.
   ===================================================================== */
(function (SP) {
  'use strict';

  /* ------------------------------------------------------- 1. terreno --- */

  /* `defensa` multiplica la potencia del bando que defiende el terreno:
     atacar cuesta más en una montaña que en una llanura. `que` es la frase
     que se enseña al abrir el frente. */
  SP.FRENTE_TERRENO = {
    llanura: { label: 'Llanura', defensa: 1.00, que: 'Terreno abierto: manda quien tenga más tropas y mejores suministros.' },
    urbano: { label: 'Urbano', defensa: 1.35, que: 'Calles y ruinas: cada manzana se defiende casa por casa.' },
    montana: { label: 'Montaña', defensa: 1.45, que: 'Puertos y alturas: cada metro de avance cuesta una vida.' },
    selva: { label: 'Selva', defensa: 1.30, que: 'Vegetación cerrada: la logística se hunde y las emboscadas mandan.' },
    desierto: { label: 'Desierto', defensa: 0.95, que: 'Terreno abierto y seco: guerra de movimiento, sin dónde esconderse.' },
    isla: { label: 'Isla', defensa: 1.25, que: 'Hay que cruzar el agua antes de desembarcar.' },
    frio: { label: 'Frío extremo', defensa: 1.40, que: 'El invierno mata más que el enemigo.' }
  };

  /* Por región, el terreno que se supone al país. */
  SP.FRENTE_TERRENO_REGION = {
    'Norteamérica': 'llanura',
    'Centroamérica': 'selva',
    'Caribe': 'isla',
    'Sudamérica': 'selva',
    'Europa': 'llanura',
    'Oriente Medio': 'desierto',
    'Asia Central': 'montana',
    'Asia del Sur': 'llanura',
    'Asia Oriental': 'llanura',
    'Sudeste Asiático': 'selva',
    'Oceanía': 'isla',
    'Norte de África': 'desierto',
    'África Occidental': 'llanura',
    'Cuerno de África': 'desierto',
    'África Oriental': 'montana',
    'África Central': 'selva',
    'África Austral': 'llanura'
  };

  /* Excepciones escritas a mano: donde la región engañaría. */
  SP.FRENTE_TERRENO_PAIS = {
    AFG: 'montana', NPL: 'montana', BTN: 'montana', CHE: 'montana', AUT: 'montana',
    IRN: 'montana', IRQ: 'llanura', TUR: 'montana', GRC: 'montana', ALB: 'montana',
    YUG: 'montana', PRK: 'montana', KOR: 'montana', TWN: 'isla', JPN: 'isla',
    GBR: 'isla', IRL: 'isla', ISL: 'isla', NZL: 'isla', CUB: 'isla', HTI: 'isla',
    DOM: 'isla', JAM: 'isla', TTO: 'isla', MDV: 'isla', LKA: 'isla', PHL: 'isla',
    IDN: 'isla', CYP: 'isla', MLT: 'isla', SGP: 'isla', FJI: 'isla', PNG: 'selva',
    VNM: 'selva', LAO: 'selva', KHM: 'selva', MMR: 'selva', THA: 'selva',
    MYS: 'selva', BRN: 'selva', BRA: 'selva', COL: 'selva', PER: 'montana',
    ECU: 'montana', BOL: 'montana', CHL: 'montana', ARG: 'llanura', MEX: 'montana',
    NOR: 'frio', SWE: 'frio', FIN: 'frio', CAN: 'frio', RUS: 'frio', URS: 'frio',
    ISR: 'urbano', LBN: 'urbano', KWT: 'desierto', SAU: 'desierto', JOR: 'desierto',
    SYR: 'desierto', EGY: 'desierto', LBY: 'desierto', DZA: 'desierto',
    MAR: 'llanura', ERI: 'desierto', SOM: 'desierto', SDN: 'desierto',
    COD: 'selva', COG: 'selva', ZAR: 'selva', CMR: 'selva', GAB: 'selva',
    AUS: 'llanura', ETH: 'montana', KEN: 'montana', TZA: 'montana', RWA: 'montana',
    UGA: 'montana', YEM: 'desierto', OMN: 'desierto', ARE: 'desierto'
  };

  /* Qué terreno le toca a un país. Nunca devuelve nada vacío. */
  SP.frenteTerreno = function (c) {
    if (!c) return 'llanura';
    if (SP.FRENTE_TERRENO_PAIS[c.id]) return SP.FRENTE_TERRENO_PAIS[c.id];
    return SP.FRENTE_TERRENO_REGION[c.region] || 'llanura';
  };

  SP.frenteTerrenoInfo = function (key) {
    return SP.FRENTE_TERRENO[key] || SP.FRENTE_TERRENO.llanura;
  };

  /* ------------------------------------------------------ 2. las órdenes -- */

  /* Cada orden es un paquete de modificadores para la ronda:
       ataque/defensa   : multiplican la potencia de combate.
       bajasPropias/Rival: multiplican las bajas de cada bando.
       moral/suministro : lo que la orden deja al bando que la da.
       eliminaMoral/Sumi: lo que le quita AL CONTRARIO (bombardeo).
       avance           : cuánto mueve el marcador del frente.
       voluntad         : ganas de avanzar (0 = ninguna; si el que va ganando
                          no quiere avanzar, el frente no se mueve).
       ceder            : terreno que se entrega al enemigo al retirarse (una
                          retirada voluntaria mueve el marcador aunque nadie
                          esté ganando la refriega).
       replegar         : fracción de tus divisiones que se retiran del frente.
       coste            : millones de dólares que cuesta ejecutarla. */
  SP.FRENTE_ORDENES = {
    asalto: {
      label: 'Asalto frontal', corto: 'asalto',
      que: 'Ataque directo con todo. Mueve el frente, pero deja muchas bajas propias.',
      ataque: 1.25, defensa: 0.95, bajasPropias: 1.35, bajasRival: 1.15,
      moral: 0, suministro: -0.02, avance: 1.15, voluntad: 1, coste: 0
    },
    flanqueo: {
      label: 'Flanqueo y envolvimiento', corto: 'flanqueo',
      que: 'Busca el hueco por los lados. Da mucho si tienes superioridad y poco si vas justo.',
      ataque: 1.05, defensa: 0.9, bajasPropias: 0.9, bajasRival: 1.25,
      moral: 2, suministro: -0.01, avance: 1.35, voluntad: 0.9, coste: 0, superioridad: true
    },
    bombardeo: {
      label: 'Bombardeo previo', corto: 'bombardeo',
      que: 'Aplasta sus posiciones antes de avanzar: gasta dinero, les quita moral y suministros y ahorra tus vidas.',
      ataque: 0.8, defensa: 0.85, bajasPropias: 0.6, bajasRival: 1.2,
      moral: 1, suministro: -0.03, avance: 0.7, voluntad: 0.5, coste: 120,
      eliminaMoral: 6, eliminaSuministro: 0.05
    },
    trinchera: {
      label: 'Atrincherarse', corto: 'trinchera',
      que: 'Cavar y aguantar: defiende mucho, no avanza y recupera moral y suministros.',
      ataque: 0.35, defensa: 1.45, bajasPropias: 0.55, bajasRival: 0.7,
      moral: 0, suministro: 0.08, avance: 0.4, voluntad: 0.05, coste: 0
    },
    refuerzos: {
      label: 'Traer refuerzos', corto: 'refuerzos',
      que: 'Metes divisiones nuevas en el frente desde casa y consolidas. Sin ellas, el frente se apaga.',
      ataque: 0.75, defensa: 1.2, bajasPropias: 0.8, bajasRival: 0.85,
      moral: 5, suministro: 0.05, avance: 0.5, voluntad: 0.3, coste: 0, refuerza: 0.25
    },
    repliegue: {
      label: 'Repliegue ordenado', corto: 'repliegue',
      que: 'Sacar a los tuyos del matadero: pierdes terreno y moral, pero salvas las divisiones.',
      ataque: 0.2, defensa: 0.8, bajasPropias: 0.35, bajasRival: 0.8,
      moral: -6, suministro: 0.03, avance: 0.35, voluntad: 0, coste: 0,
      repliegar: 0.5, ceder: 0.12
    }
  };

  /* Orden de presentación en la interfaz. */
  SP.FRENTE_ORDEN_LISTA = ['asalto', 'flanqueo', 'bombardeo', 'trinchera', 'refuerzos', 'repliegue'];

  /* ------------------------------------------------------- 3. los números -- */

  SP.FRENTE = {
    DIAS_RONDA: 5,          /* días de juego entre rondas de un frente */
    MAX_POR_GUERRA: 3,      /* frentes simultáneos en una misma guerra */
    MAX_POR_PAIS: 3,        /* frentes en los que puede estar metido un país */
    MIN_DIV: 2,             /* por debajo de esto, el frente se estabiliza */
    MAX_DIV_FRENTE: 60,     /* divisiones como máximo en un frente */
    MAX_FRACCION: 0.45,     /* y no más de este % del ejército en frentes */
    CP_ABRIR: 15,           /* capital político por abrir un frente */
    BAJAS: 180,             /* bajas base por ronda (se multiplican por lo demás) */
    MOVER: 0.35,            /* cuánto mueve el marcador del frente una ronda con ventaja total */
    ROTURA: 0.12,           /* marcador en el que el frente se rompe */
    UMBRAL: 0.25,           /* ventaja mínima para mover el frente (si no, estancado) */
    VOLUNTAD_MIN: 0.1,      /* por debajo de esto, el que va ganando no empuja: nadie
                               avanza si ambos se atrincheran */
    MAX_RONDAS: 36,         /* sin decisión en estas rondas, el frente se estabiliza */
    EMPUJE: 0.022,          /* lo que cada ronda empuja la guerra abstracta */
    EMPUJE_ROTURA: 0.13,    /* lo que aporta ganar un frente entero */
    CUERPO: 9000,           /* bajas por división perdida (la misma regla que en la guerra abstracta) */
    VIDA_LOG: 60            /* días que un frente cerrado sigue en el historial */
  };

}(window.SP = window.SP || {}));
