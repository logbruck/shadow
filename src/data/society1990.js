/* =====================================================================
   Shadow President 1990 - Sociedad de partida
   ---------------------------------------------------------------------
   Dos números por país que el motor económico usa todos los días (ver
   src/sim/society.js):

     gini      desigualdad de la renta, 0 (todos iguales) - 100
     informal  % del PIB que se mueve al margen del Estado (economía
               sumergida): no paga impuestos, pero da de comer a quien
               no encuentra trabajo formal.

   Son aproximaciones de 1990, no un dato oficial: el juego redondea a su
   aire. Lo importante es el orden (Brasil y Sudáfrica muy desiguales;
   Suecia y Checoslovaquia, nada) y que se pueda corregir en un minuto.

   Formato de cada línea:   PAIS: [gini, informal]

   Los países que no están escritos heredan los valores de su región
   (SP.SOC_REGION) y su régimen (SP.SOC_GOV). Añadir un país es copiar
   una línea. Comprobar con:  node tools/check-society.js
   ===================================================================== */
(function (SP) {
  'use strict';

  SP.SOC_1990 = {
    /* --- América --- */
    USA: [40, 8], CAN: [36, 9], MEX: [52, 32], BRA: [60, 40], ARG: [45, 25],
    CHL: [55, 22], COL: [55, 35], PER: [50, 40], VEN: [44, 30], BOL: [55, 45],
    ECU: [50, 35], PRY: [50, 40], URY: [42, 20], GTM: [55, 40], HND: [55, 40],
    SLV: [52, 40], NIC: [50, 40], CRI: [45, 25], PAN: [52, 30], CUB: [30, 20],
    HTI: [60, 55], DOM: [50, 35], JAM: [45, 30],

    /* --- Europa --- */
    FRG: [32, 10], GDR: [26, 12], GBR: [36, 10], FRA: [34, 10], ITA: [34, 18],
    ESP: [35, 15], PRT: [36, 15], GRC: [35, 20], NLD: [30, 9], BEL: [28, 9],
    LUX: [28, 8], AUT: [30, 8], CHE: [32, 7], SWE: [25, 6], NOR: [26, 6],
    DNK: [26, 6], FIN: [26, 6], ISL: [27, 6], IRL: [36, 12], TUR: [42, 30],
    POL: [28, 15], HUN: [27, 18], CSK: [26, 10], ROU: [28, 14], BGR: [27, 14],
    URS: [28, 12], YUG: [32, 20], ALB: [30, 25],

    /* --- Oriente Medio y Asia Central --- */
    ISR: [36, 12], IRN: [44, 35], IRQ: [40, 30], SAU: [40, 20], SYR: [42, 30],
    JOR: [40, 25], LBN: [45, 30], KWT: [38, 15], EGY: [40, 40], AFG: [40, 50],

    /* --- Asia --- */
    IND: [32, 30], PAK: [33, 35], BGD: [35, 35], LKA: [40, 30], NPL: [38, 40],
    CHN: [32, 15], JPN: [32, 10], KOR: [32, 20], TWN: [30, 18], PRK: [28, 10],
    IDN: [34, 35], PHL: [45, 30], THA: [45, 30], MYS: [45, 25], VNM: [34, 20],
    MMR: [38, 40], KHM: [42, 45], LAO: [38, 40], SGP: [38, 12], MNG: [30, 15],

    /* --- África --- */
    ZAF: [62, 25], NGA: [50, 55], KEN: [57, 35], ETH: [40, 45], TZA: [42, 45],
    ZWE: [50, 35], GHA: [45, 45], CIV: [45, 40], SEN: [45, 40], CMR: [45, 40],
    MAR: [42, 35], DZA: [38, 30], TUN: [40, 30], LBY: [38, 25], SDN: [42, 45],
    SOM: [45, 55], MOZ: [45, 45], AGO: [45, 45], ZMB: [48, 45], MWI: [48, 45],

    /* --- Oceanía --- */
    AUS: [36, 12], NZL: [34, 10], PNG: [48, 45], FJI: [42, 35]
  };

  /* Valores por defecto de una región sin país escrito: [gini, informal] */
  SP.SOC_REGION = {
    'Norteamérica':      [38, 8],
    'Centroamérica':     [52, 38],
    'Caribe':            [50, 35],
    'Sudamérica':        [50, 33],
    'Europa':            [33, 12],
    'Oriente Medio':     [42, 30],
    'Asia Central':      [34, 22],
    'Asia del Sur':      [34, 32],
    'Asia Oriental':     [34, 16],
    'Sudeste Asiático':  [42, 30],
    'Oceanía':           [38, 15],
    'Norte de África':   [42, 33],
    'África Occidental': [48, 45],
    'África Central':    [48, 48],
    'África Oriental':   [48, 45],
    'Cuerno de África':  [44, 45],
    'África Austral':    [55, 30],
    'Otros':             [45, 35]
  };

  /* Ajuste por tipo de régimen. Una dictadura militar o un apartheid
     reparten mucho peor; los regímenes comunistas, más plano (a cambio de
     menos libertad y menos eficiencia). */
  const SOC_GOV_TABLE = {
    DEM: -4, AUT: 0, MON: 2, MIL: 3, COM: -3, UNI: -3, TEO: 4, APR: 18
  };
  SP.SOC_GOV = SOC_GOV_TABLE;

  /* Gini (0-100) y economía sumergida (% del PIB) de partida de un país. */
  SP.socStart = function (c) {
    const propio = SP.SOC_1990[c.id];
    const reg = SP.SOC_REGION[c.region] || SP.SOC_REGION['Otros'];
    const g = SOC_GOV_TABLE[c.gov] || 0;
    const gini = propio ? propio[0] : reg[0] + g;
    const informal = propio ? propio[1] : reg[1] + g * 0.8;
    return { gini: gini, informal: informal };
  };

  /* Países escritos a mano, para el comprobador. */
  SP.socHandWritten = function () { return Object.keys(SP.SOC_1990); };

}(window.SP = window.SP || {}));
