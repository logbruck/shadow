/* =====================================================================
   Shadow President 1990 - Transición económica del Este
   ---------------------------------------------------------------------
   Cuando un país sin urnas se democratiza (el bloque del Este en 1990-91),
   su economía deja de ser comunista y tiene que elegir cómo desmontar el
   sistema: terapia de choque o gradualismo. Es lo que aquí se decide.

   Este archivo solo dice POR DÓNDE EMPIEZA cada país: cuánto de su economía
   está en manos del Estado y cuánto hay que desmontar. El motor está en
   src/sim/transition.js.

   Formato de cada línea:   PAIS: [estatizado, apertura, industria]
     estatizado : 0-100, peso del Estado en la economía en 1990
     apertura   : 0-100, cuánto comerciaba ya con Occidente (más fácil)
     industria  : 0-100, cuánto de su aparato industrial es viejo y
                  contaminante (lo que más sufre con el shock)
   Los países que no estén escritos heredan los valores de su región y su
   régimen. Añadir un país es copiar una línea.
   Comprobar con:  node tools/check-transition.js
   ===================================================================== */
(function (SP) {
  'use strict';

  SP.TRANS_1990 = {
    URS: [85, 15, 70], POL: [70, 30, 65], HUN: [60, 40, 55], CSK: [78, 25, 62],
    ROU: [80, 15, 60], BGR: [76, 20, 58], YUG: [65, 35, 55], ALB: [88, 8, 50],
    MNG: [82, 12, 45], CHN: [70, 25, 68], VNM: [80, 20, 40], CUB: [86, 10, 45],
    PRK: [92, 5, 55], LAO: [78, 18, 38], NIC: [55, 20, 30],
    /* economías mixtas con fuerte sector público pero con mercado */
    IND: [45, 30, 40], EGY: [48, 28, 35], DZA: [50, 25, 45], SYR: [55, 20, 40],
    IRQ: [60, 15, 45], LBY: [62, 12, 35], MMR: [58, 15, 30], AGO: [60, 15, 35],
    TZA: [55, 20, 30], MOZ: [58, 18, 30], ETH: [52, 18, 28]
  };

  /* Valores por defecto según el régimen. Un partido único estatiza mucho
     más que una autocracia con mercado. */
  const TRANS_GOV = {
    COM: [80, 15, 60], UNI: [78, 18, 55], MIL: [50, 25, 38], TEO: [55, 22, 35],
    AUT: [46, 30, 38], MON: [42, 32, 36], APR: [48, 28, 40], DEM: [40, 35, 35]
  };
  SP.TRANS_GOV = TRANS_GOV;

  /* Perfil de partida de la transición de un país. */
  SP.transStart = function (c) {
    const propio = SP.TRANS_1990[c.id];
    const gov = TRANS_GOV[c.gov] || [45, 30, 35];
    const t = propio || gov;
    return {
      estatizado: t[0],
      apertura: t[1],
      industria: t[2]
    };
  };

  /* Países escritos a mano, para el comprobador. */
  SP.transHandWritten = function () { return Object.keys(SP.TRANS_1990); };

}(window.SP = window.SP || {}));
