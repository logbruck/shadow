/* =====================================================================
   Shadow President 1990 - Ataques aéreos y guerra nuclear (datos)
   ---------------------------------------------------------------------
   Tres tablas de texto, para poder ajustarlas sin saber programar
   (ver docs/ATAQUES.md):

     1. SP.BLANCOS   -> los blancos de infraestructura que se pueden
                        bombardear y qué le hacen al país que los sufre.
     2. SP.STRIKE    -> los números de la campaña aérea y la escalada.
     3. SP.NUCLEAR   -> la doctrina nuclear: daño de una ojiva, quién
                        responde y cuándo el intercambio es el fin del mundo.
   ===================================================================== */
(function (SP) {
  'use strict';

  /* ------------------------------------------------------- 1. los blancos ---

     Cada blanco es un paquete: lo que destruye (`dano`), lo que deja al país
     (`efecto`), lo que enfada al mundo (`escalada`), lo que cuesta (`cash`,
     en múltiplos del coste base) y qué probabilidad tiene de abrir una guerra
     si no estabas ya en una (`guerra`).

     `dano` son puntos de destrucción sobre 100 en cada sector. Un 20 no es un
     20 % de la infraestructura: es un golpe serio y hace falta insistir para
     dejarla inservible.

     `civiles` es la parte del ataque que cae sobre la población: cuanto más
     alta, más condena internacional y más aprobación se pierde si te pillan. */
  SP.BLANCOS = {
    militar: {
      orden: 1, label: 'Instalaciones militares', corto: 'militar',
      que: 'Bases, aeródromos, depósitos y radares. El blanco limpio: poco destrozo civil y mucho daño al que te combate.',
      dano: { militar: 22 }, efecto: {},
      civiles: 0.12, escalada: 3, guerra: 0.14, cash: 1.6
    },
    energia: {
      orden: 2, label: 'Red eléctrica', corto: 'energía',
      que: 'Centrales, subestaciones y tendido. Apaga fábricas y hogares: frena la producción y calienta la calle.',
      dano: { energia: 18 }, efecto: { stability: -2, unemployment: 0.4, rebel: 2 },
      civiles: 0.30, escalada: 3, guerra: 0.05, cash: 1.0
    },
    industria: {
      orden: 3, label: 'Complejo industrial', corto: 'industria',
      que: 'Fábricas, refinerías y puertos. Lo que más duele al PIB y lo que más tarda en levantarse.',
      dano: { industria: 20 }, efecto: { unemployment: 0.6, rebel: 1 },
      civiles: 0.35, escalada: 4, guerra: 0.06, cash: 1.4
    },
    mando: {
      orden: 4, label: 'Mando y comunicaciones', corto: 'mando',
      que: 'Cuarteles generales, radio y televisión. Deja al país sordo y a su gobierno sin control de la calle.',
      dano: { mando: 20, militar: 6 }, efecto: { stability: -5, rebel: 5 },
      civiles: 0.40, escalada: 5, guerra: 0.09, cash: 1.2
    },
    nuclear: {
      orden: 5, label: 'Instalaciones nucleares', corto: 'nuclear', roja: true,
      que: 'Reactores, laboratorios y silos. La línea roja: si el país tiene la bomba, esto es lo más parecido a declararle la guerra total.',
      dano: { energia: 10, industria: 8, mando: 6 }, efecto: { stability: -6, rebel: 4 },
      civiles: 0.60, escalada: 12, guerra: 0.25, cash: 2.2
    }
  };

  SP.BLANCO_LISTA = ['militar', 'energia', 'industria', 'mando', 'nuclear'];

  /* ---------------------------------------------------- 2. la campaña aérea ---

     Un ataque suelto se paga solo; una campaña repite la oleada cada
     `DIAS_OLEADA` días durante `DIAS_CAMPANA` días. `ALCANCE_AIRE` alarga el
     alcance militar (un avión llega más lejos que un soldado): puedes castigar
     a quien no podrías invadir. */
  SP.STRIKE = {
    CP: 14,                 /* capital político por ataque suelto */
    CASH_BASE: 900,         /* millones de dólares base por oleada (× el coste del blanco) */
    MIL_MIN: 12,            /* índice militar mínimo para tener aviación de ataque */
    ALCANCE_AIRE: 1.6,      /* hasta dónde llega un avión frente a un ejército */
    DIAS_OLEADA: 5,         /* días entre oleadas de una campaña */
    DIAS_CAMPANA: 30,       /* duración de una campaña */
    MAX_CAMPANAS: 2,        /* campañas simultáneas del jugador */
    DAÑO_COMPLETO: 100,     /* sector destruido del todo */
    REPARAR: 0.10,          /* % del daño que se repara al día en un país rico */
    REPARAR_POBRE: 0.03,    /* y en uno pobre: levantar un puente cuesta lo que no hay */
    ESCALADA_DECAY: 0.30,   /* puntos de escalada que se enfrían cada día */
    ESCALADA_TENSION: 0.25, /* parte de la tensión mundial que se convierte en escalada */
    GUERRA_ESCALADA: 0.004, /* probabilidad extra de guerra por punto de escalada */
    DEFCON: [
      { n: 5, label: 'Paz', min: 0 },
      { n: 4, label: 'Tensión', min: 22 },
      { n: 3, label: 'Crisis', min: 45 },
      { n: 2, label: 'Guerra inminente', min: 70 },
      { n: 1, label: 'Guerra nuclear inminente', min: 90 }
    ]
  };

  /* ------------------------------------------------------- 3. la doctrina ---

     Una ojiva no es un ataque aéreo grande: es el final de una forma de hacer
     política. Estos números deciden el daño y, sobre todo, quién responde.

     `REPRESALIA` es la probabilidad de que cada actor conteste:
       propia  -> el propio país atacado, si tiene la bomba.
       aliado  -> un aliado suyo con la bomba.
       patron  -> su superpotencia de bloque (EE.UU. con la OTAN, la URSS con
                  el Pacto de Varsovia), aunque no estén formalmente aliados.
     `UMBRAL_MAD` es el número de potencias nucleares que tienen que
     intercambiar golpes para que aquello sea el fin del mundo y no una
     represalia limitada. */
  SP.NUCLEAR = {
    OJIVAS_POR_ATAQUE: 1,
    MUERTOS: [400000, 3200000],   /* por ojiva, según la suerte */
    POB: 0.02,                    /* población perdida por ojiva */
    PIB: 0.18,                    /* PIB que se lleva por delante */
    MIL: 0.45,                    /* ejército que se deshace */
    ESTAB: 40,                    /* estabilidad que se hunde */
    REBEL: 15,
    CONTAGIO: 0.55,               /* PIB que pierden los países vecinos del blanco */
    REPRESALIA: { propia: 1, aliado: 0.85, patron: 0.9 },
    UMBRAL_MAD: 2,                /* potencias nucleares intercambiando para el fin del mundo */
    ESCALADA: 100,
    DERRUMBE_MUNDIAL: 0.22        /* lo que pierde el PIB del resto del mundo en un intercambio total */
  };

  /* Nombres de las superpotencias nucleares, para el relato de la escalada. */
  SP.NUCLEAR_GRANDES = ['USA', 'URS', 'RUS', 'CHN', 'GBR', 'FRA'];

}(window.SP = window.SP || {}));
