/* =====================================================================
   Shadow President 1990 - Grupos de interés
   ---------------------------------------------------------------------
   Detrás del parlamento están los poderes de verdad: sindicatos, patronal,
   iglesia, cuarteles, movimientos regionales y el campo. A cada uno le
   importa una cosa y, si se le agravia, pasa a la acción: huelga, fuga de
   capitales, campaña moral, agitación regional... o un golpe de Estado.

   Aquí solo está la FUERZA de cada grupo en cada país (0-100). Lo que les
   enfada y lo que hacen está en src/sim/groups.js.

   Formato:    PAIS: [sindicatos, patronal, iglesia, militares, regionales, campesinos]

   Los países que no estén escritos heredan los valores de su región
   (SP.GROUPS_REGION) y su régimen (SP.GROUPS_GOV). Añadir un país es copiar
   una línea. Comprobar con:  node tools/check-groups.js
   ===================================================================== */
(function (SP) {
  'use strict';

  /* Orden fijo de los seis grupos (lo usan los datos y el motor) */
  SP.GROUP_IDS = ['sindicatos', 'patronal', 'iglesia', 'militares', 'regionales', 'campesinos'];

  /* Ficha de cada grupo: cómo se llama, dónde vive y qué quiere */
  SP.GROUP_DEFS = {
    sindicatos: { name: 'Sindicatos', donde: 'fábricas y servicios públicos',
      quiere: 'salarios, empleo y que no se toque lo público' },
    patronal: { name: 'Patronal', donde: 'las empresas',
      quiere: 'impuestos bajos, estabilidad y crédito' },
    iglesia: { name: 'Iglesia', donde: 'parroquias y escuelas',
      quiere: 'que no se le mueva el suelo moral ni la enseñanza' },
    militares: { name: 'Cuarteles', donde: 'los cuarteles',
      quiere: 'presupuesto, orden y que no se humille al ejército' },
    regionales: { name: 'Movimientos regionales', donde: 'las regiones con agravio',
      quiere: 'autonomía, su lengua y su trozo del presupuesto' },
    campesinos: { name: 'El campo', donde: 'el medio rural',
      quiere: 'precios, tierra y que no le inunden de producto de fuera' }
  };

  /* --- fuerza por país (los reseñables; el resto, por región) --- */
  SP.GROUPS_1990 = {
    /* Europa occidental */
    ESP: [58, 52, 40, 42, 55, 25], PRT: [55, 50, 45, 45, 20, 30],
    FRA: [60, 60, 35, 45, 30, 35], ITA: [62, 58, 55, 40, 35, 25],
    GBR: [62, 65, 30, 35, 40, 20], FRG: [60, 68, 40, 30, 20, 20],
    GDR: [45, 25, 35, 35, 10, 15], NLD: [55, 60, 35, 25, 15, 25],
    BEL: [58, 58, 40, 25, 30, 20], AUT: [58, 55, 50, 25, 15, 30],
    CHE: [50, 62, 40, 45, 20, 30], SWE: [65, 60, 25, 25, 10, 15],
    NOR: [60, 58, 30, 30, 10, 20], DNK: [58, 55, 30, 25, 10, 25],
    FIN: [55, 55, 35, 35, 10, 25], IRL: [50, 50, 55, 25, 15, 35],
    GRC: [50, 50, 45, 50, 25, 40], TUR: [35, 45, 45, 65, 45, 45],
    ISL: [55, 50, 30, 20, 10, 25], LUX: [50, 55, 40, 20, 10, 15],
    /* Europa del Este */
    POL: [60, 25, 60, 45, 20, 40], HUN: [50, 30, 50, 40, 15, 35],
    CSK: [50, 25, 40, 40, 30, 30], ROU: [40, 20, 60, 50, 40, 50],
    BGR: [40, 22, 45, 45, 30, 40], YUG: [45, 25, 40, 55, 65, 45],
    ALB: [35, 18, 45, 50, 30, 50], URS: [55, 20, 35, 55, 60, 35],
    /* América */
    USA: [40, 72, 45, 50, 15, 15], CAN: [50, 62, 35, 25, 25, 15],
    MEX: [40, 50, 65, 45, 30, 45], BRA: [45, 55, 60, 50, 35, 45],
    ARG: [55, 50, 55, 50, 25, 30], CHL: [40, 55, 55, 60, 20, 30],
    COL: [40, 48, 60, 50, 40, 45], PER: [35, 45, 60, 50, 35, 50],
    VEN: [40, 50, 55, 50, 30, 35], BOL: [40, 40, 60, 45, 45, 55],
    NIC: [40, 35, 55, 50, 35, 45], CUB: [55, 15, 20, 55, 15, 35],
    CRI: [45, 45, 50, 15, 15, 30], PAN: [40, 45, 55, 30, 25, 30],
    HTI: [25, 30, 60, 55, 30, 55], DOM: [35, 40, 60, 45, 25, 40],
    GTM: [30, 35, 60, 60, 50, 50], SLV: [30, 35, 55, 60, 40, 45],
    HND: [30, 35, 55, 55, 35, 50], PRY: [35, 40, 60, 55, 20, 45],
    URY: [50, 50, 45, 35, 15, 35], ECU: [35, 40, 60, 50, 35, 45],
    JAM: [45, 40, 50, 30, 15, 30],
    /* Asia oriental y Oceanía */
    JPN: [50, 70, 25, 35, 10, 25], CHN: [40, 20, 20, 60, 35, 55],
    KOR: [45, 55, 35, 55, 20, 35], TWN: [40, 60, 35, 45, 20, 30],
    PRK: [35, 10, 15, 70, 10, 40], MNG: [45, 20, 35, 45, 15, 45],
    AUS: [55, 60, 30, 30, 10, 25], NZL: [55, 58, 30, 20, 15, 30],
    PNG: [35, 35, 60, 35, 45, 60], FJI: [40, 40, 50, 35, 35, 45],
    /* Sudeste y sur de Asia */
    IND: [45, 50, 45, 50, 55, 60], PAK: [35, 45, 50, 65, 50, 55],
    BGD: [35, 40, 45, 50, 40, 60], LKA: [40, 40, 50, 50, 45, 50],
    NPL: [35, 35, 45, 45, 45, 60], IDN: [35, 50, 45, 60, 50, 50],
    PHL: [40, 45, 60, 50, 45, 50], THA: [35, 50, 50, 55, 30, 50],
    MYS: [35, 50, 45, 45, 35, 45], VNM: [40, 20, 25, 55, 30, 50],
    SGP: [35, 65, 30, 40, 10, 10], MMR: [30, 25, 50, 65, 45, 55],
    KHM: [30, 25, 45, 55, 30, 55], LAO: [35, 18, 30, 50, 30, 55],
    /* Oriente Medio y Norte de África */
    ISR: [55, 55, 50, 55, 20, 25], IRN: [30, 40, 60, 60, 45, 45],
    IRQ: [28, 35, 45, 65, 40, 40], SAU: [20, 50, 65, 50, 20, 25],
    SYR: [30, 40, 45, 65, 35, 45], JOR: [30, 45, 50, 55, 25, 40],
    LBN: [35, 50, 55, 50, 50, 30], KWT: [25, 50, 55, 40, 15, 15],
    EGY: [35, 45, 55, 60, 30, 50], AFG: [25, 25, 50, 60, 60, 60],
    DZA: [35, 40, 45, 60, 45, 45], MAR: [30, 45, 55, 55, 40, 50],
    TUN: [35, 45, 50, 50, 20, 40], LBY: [25, 35, 45, 60, 30, 35],
    SDN: [25, 30, 50, 60, 55, 55],
    /* África subsahariana */
    ZAF: [45, 50, 60, 50, 40, 40], NGA: [35, 40, 55, 55, 50, 55],
    KEN: [30, 40, 55, 50, 45, 55], ETH: [25, 30, 45, 60, 55, 60],
    TZA: [30, 35, 50, 45, 40, 60], ZWE: [30, 35, 50, 55, 35, 55],
    GHA: [35, 40, 55, 50, 40, 55], CIV: [30, 40, 50, 50, 40, 55],
    SEN: [30, 40, 55, 45, 40, 55], CMR: [28, 35, 50, 55, 45, 55],
    SOM: [25, 30, 50, 60, 60, 55], MOZ: [28, 30, 40, 45, 40, 60],
    AGO: [30, 35, 45, 55, 45, 50], ZMB: [30, 35, 50, 45, 35, 55],
    MWI: [28, 32, 50, 45, 30, 60]
  };

  /* Fuerza por defecto de una región sin país escrito */
  SP.GROUPS_REGION = {
    'Norteamérica':      [45, 68, 42, 45, 15, 12],
    'Centroamérica':     [33, 40, 60, 55, 35, 48],
    'Caribe':            [40, 42, 55, 45, 25, 35],
    'Sudamérica':        [42, 50, 60, 52, 30, 35],
    'Europa':            [56, 56, 42, 36, 22, 26],
    'Oriente Medio':     [30, 45, 55, 58, 38, 42],
    'Asia Central':      [42, 30, 35, 48, 35, 45],
    'Asia del Sur':      [40, 45, 48, 52, 45, 56],
    'Asia Oriental':     [42, 55, 30, 48, 20, 35],
    'Sudeste Asiático':  [36, 48, 46, 52, 38, 50],
    'Oceanía':           [48, 55, 34, 30, 20, 30],
    'Norte de África':   [30, 42, 52, 56, 32, 45],
    'África Occidental': [32, 38, 54, 54, 42, 55],
    'África Central':    [28, 34, 55, 56, 45, 56],
    'África Oriental':   [28, 35, 52, 50, 45, 58],
    'Cuerno de África':  [26, 32, 52, 58, 52, 58],
    'África Austral':    [40, 42, 58, 48, 35, 38],
    'Otros':             [38, 45, 50, 50, 32, 42]
  };

  /* Ajuste por régimen: quién manda de verdad cambia de quién es fuerte. */
  const GROUPS_GOV = {
    DEM: [4, 2, 0, -8, 0, 0],
    AUT: [-6, 4, 2, 8, -4, 0],
    MON: [-6, 4, 8, 8, -4, 0],
    MIL: [-14, 2, 0, 20, -6, 2],
    COM: [8, -26, -16, 6, -4, 4],
    UNI: [6, -28, -16, 8, -6, 4],
    TEO: [-14, 2, 26, 8, 0, 0],
    APR: [-10, 0, 6, 6, 2, 0]
  };
  SP.GROUPS_GOV = GROUPS_GOV;

  /* Fuerza de partida de los seis grupos de un país: { id: 0-100 } */
  SP.groupsStart = function (c) {
    const propio = SP.GROUPS_1990[c.id];
    const reg = SP.GROUPS_REGION[c.region] || SP.GROUPS_REGION['Otros'];
    const gov = GROUPS_GOV[c.gov] || [0, 0, 0, 0, 0, 0];
    const out = {};
    for (let i = 0; i < SP.GROUP_IDS.length; i++) {
      const base = propio ? propio[i] : reg[i];
      out[SP.GROUP_IDS[i]] = Math.max(5, Math.min(100, base + gov[i]));
    }
    return out;
  };

  /* Países escritos a mano, para el comprobador. */
  SP.groupsHandWritten = function () { return Object.keys(SP.GROUPS_1990); };

}(window.SP = window.SP || {}));
