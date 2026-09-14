/* =====================================================================
   Shadow President 1990 - Datos militares
   ---------------------------------------------------------------------
   Tres tablas, todas de texto, para que se puedan corregir sin saber
   programar (ver docs/MILITAR.md):

     1. SP.RAW_BASES   -> el despliegue que el mundo ya tiene el 1/1/1990.
        Formato:  dueño|anfitrión|divisiones|pública
          · `pública` = 1 si el despliegue es conocido (bases grandes,
            tratados públicos) y 0 si es discreto (asesores, escuadrones
            sin cartel). Las secretas solo se ven si has infiltrado al dueño.
          · Las divisiones son «divisiones y equivalentes» (unidad de cuenta
            del juego, ver SP.MIL_DIVISIONES).

     2. SP.MIL_DIVISIONES -> divisiones movilizables de cada país en 1990.
        Lo que no esté aquí sale de una fórmula sobre población e índice
        militar, así que los 161 países siempre tienen ejército.

     3. SP.MIL_PROYECCION -> hasta dónde llega el brazo de cada país, en km,
        medido desde su capital. Lo que no esté aquí sale del índice militar
        y del tamaño de su economía. Con esto, España alcanza Marruecos y
        Francia, y Estados Unidos alcanza cualquier parte del mundo.
   ===================================================================== */
(function (SP) {
  'use strict';

  /* ---------------------------------------------------- 1. bases de 1990 */

  SP.RAW_BASES = `
USA|FRG|9|1
USA|JPN|3|1
USA|KOR|2|1
USA|ITA|1|1
USA|GBR|1|1
USA|TUR|1|1
USA|GRC|1|1
USA|PHL|1|1
USA|PAN|1|1
USA|PRT|1|1
USA|ISL|1|1
USA|HND|1|1
USA|CUB|1|1
USA|EGY|1|0
USA|OMN|1|0
USA|KEN|1|0
URS|GDR|20|1
URS|POL|5|1
URS|CSK|5|1
URS|HUN|4|1
URS|MNG|4|1
URS|VNM|2|1
URS|PRK|2|1
URS|CUB|1|1
URS|SYR|1|1
URS|ETH|1|1
URS|AGO|1|1
URS|MOZ|1|0
URS|YEM|1|0
URS|SOM|1|0
GBR|FRG|4|1
GBR|CYP|1|1
GBR|BLZ|1|1
GBR|BRB|1|0
GBR|FJI|1|0
FRA|FRG|3|1
FRA|DJI|1|1
FRA|GAB|1|1
FRA|SEN|1|1
FRA|CIV|1|0
FRA|TCD|1|0
FRA|CAF|1|0
NLD|FRG|1|1
BEL|FRG|1|1
CAN|FRG|1|1
DNK|FRG|1|1
CUB|AGO|2|1
CUB|ETH|1|1
CUB|COG|1|0
IND|MDV|1|1
`;

  /* ------------------------------------------- 2. divisiones movilizables */

  /* Divisiones y equivalentes. Un país sin cifra aquí sale de la fórmula
     (población e índice militar), así que sigue teniendo su ejército. */
  SP.MIL_DIVISIONES = {
    URS: 200, USA: 167, CHN: 210, IND: 95, PRK: 70, KOR: 45, TWN: 40,
    VNM: 55, TUR: 45, IRN: 40, IRQ: 38, PAK: 35, EGY: 32, SYR: 22, ISR: 18,
    FRG: 30, FRA: 26, GBR: 22, ITA: 26, ESP: 26, POL: 24, CSK: 18, HUN: 10,
    ROU: 20, BGR: 14, YUG: 20, GRC: 20, NLD: 10, BEL: 8, CAN: 8, DNK: 5,
    PRT: 8, SWE: 12, FIN: 9, CHE: 7, AUT: 5, NOR: 6, JPN: 30, THA: 22,
    IDN: 28, MMR: 26, PHL: 14, MYS: 8, AUS: 9, NZL: 3, BRA: 32, ARG: 18,
    MEX: 16, PER: 12, CHL: 12, VEN: 11, COL: 12, CUB: 14, ETH: 28,
    ZAF: 12, NGA: 14, DZA: 16, MAR: 14, LBY: 9, SAU: 12, KWT: 3, OMN: 3,
    MNG: 6, SOM: 8, AGO: 12, MOZ: 10, YEM: 8, AFG: 14
  };

  /* ------------------------------------------------ 3. alcance (en km) */

  /* De la capital propia a la capital del anfitrión. Sin cifra, la fórmula
     da 600 + índice militar × 30 + PIB (miles de millones) × 0,6, con tope
     de 6.000 km: una marina de cabotaje no cruza el Atlántico. */
  SP.MIL_PROYECCION = {
    USA: 14000, URS: 12000, GBR: 11000, FRA: 8000, PRT: 5000, ESP: 4000,
    NLD: 6000, BEL: 4000, DNK: 4000, NOR: 4000, ITA: 4500, GRC: 3500,
    TUR: 3000, CAN: 5000, AUS: 6000, NZL: 4000, CHN: 7000, JPN: 6000,
    KOR: 4000, TWN: 3000, IND: 5000, BRA: 5000, ARG: 4000, CHL: 3500,
    ZAF: 3500, NGA: 2500, EGY: 3500, ISR: 3000, IRN: 2500, SAU: 2500,
    CUB: 3000, VNM: 2000, PRK: 2500, PAK: 2500, THA: 2500, IDN: 4000,
    MYS: 2500, PHL: 3000, MEX: 3000, PER: 2500, VEN: 2500, COL: 2200
  };

  /* ------------------------------------------- 4. niveles de instalación */

  /* `espacio` son divisiones que caben; `instalar` es el coste de montarla
     (millones de dólares, una sola vez); `mantener` es lo que cuesta al año
     CADA división desplegada allí, por encima de lo que ya cuesta en casa
     (lo paga el tesoro a diario, ver SP.tickPlayerBudget). */
  SP.MIL_NIVELES = {
    avanzada: {
      label: 'Puesto de avanzada', corto: 'un puesto de avanzada',
      espacio: 6, instalar: 500, mantener: 2600, publica: false,
      que: 'Escuadrón avanzado o asesores. Discreto y barato, pero cabe poco.'
    },
    base: {
      label: 'Base militar', corto: 'una base militar',
      espacio: 20, instalar: 1400, mantener: 2100, publica: true,
      que: 'Aeródromo y guarnición. Se sabe que está ahí, y eso ya disuade.'
    },
    granBase: {
      label: 'Gran base', corto: 'una gran base',
      espacio: 60, instalar: 3200, mantener: 1700, publica: true,
      que: 'Un despliegue en toda regla: mando, logística y aviación de combate.'
    }
  };

  /* Los tres papeles de una base. */
  SP.MIL_ROLES = {
    defensa: {
      label: 'Defender al anfitrión', corto: 'defensa del anfitrión',
      que: 'Si atacan al anfitrión, tus unidades entran en la guerra sin que tengas que declarar nada.'
    },
    proyeccion: {
      label: 'Proyección', corto: 'proyección',
      que: 'Base escalonada: desde aquí alcanzas más lejos, y sirve para golpear a los vecinos del anfitrión.'
    },
    disuasion: {
      label: 'Disuasión', corto: 'disuasión',
      que: 'Solo estar allí ya cuenta en el equilibrio militar: el enemigo tiene que contar con tus unidades.'
    }
  };

  /* ------------------------------------------------------------- números */

  SP.MIL = {
    CP_INSTALAR: 20,      /* capital político por montar una base */
    CP_REFORZAR: 4,       /* por mandar más unidades */
    CP_RETIRAR: 3,        /* por traer unidades a casa */
    CP_ROL: 3,            /* por cambiar el papel de la base */
    MAX_FRACCION: 0.55,   /* no puedes tener fuera más del 55 % de tu ejército */
    ESCALONADA: 0.7,      /* desde una base propia alcanzas el 70 % de tu alcance */
    MIN_REL_ALIANZA: 30,  /* con relaciones por debajo de esto, el anfitrión te pide que te vayas */
    REL_EXPULSION: -25,   /* por debajo, el anfitrión exige la retirada */
    QUEMA_DIA: 365
  };

}(window.SP = window.SP || {}));
