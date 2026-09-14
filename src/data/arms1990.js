/* =====================================================================
   Shadow President 1990 - Sector de armamento (datos)
   ---------------------------------------------------------------------
   Todas las tablas son de texto para poder corregirlas sin saber programar
   (ver docs/ARMAMENTO.md). El motor está en src/sim/arms.js.

     1. SP.ARMS_CATEGORIAS  -> qué se puede tener y qué hace cada cosa.
        Las tres primeras (caza, bombardero, defensa) son las que ya
        funcionan. Las demás quedan declaradas y listas para ampliarse:
        el motor las cuenta, las guarda y las enseña, pero todavía no
        cambian los combates. Añadir una categoría nueva es añadir una
        línea aquí y una fila en el catálogo.
     2. SP.ARMS_GENERACIONES -> las cuatro generaciones tecnológicas.
     3. SP.ARMS_MODELOS     -> el catálogo: cada avión con su generación,
        su país, su precio unitario y su calidad.
     4. SP.ARMS_PROVEEDORES -> quién vende, a quién se lo vende y con qué
        condiciones (bloques, relaciones mínimas).
     5. SP.RAW_ARSENAL      -> las flotas de 1990 escritas a mano, en el
        mismo formato de líneas que SP.RAW_BASES o SP.RAW_COUNTRIES:
           país|cazas|bombarderos|defensa aérea
        Lo que no esté aquí sale de una fórmula sobre población, PIB e
        índice militar, así que los 161 países empiezan con aviación.
     6. SP.ARMS_TECH        -> generación tecnológica de la aviación de
        cada país en 1990. Lo que no esté aquí sale del PIB por persona.
     7. SP.ARMS             -> los números del sistema (precios, plazos,
        mantenimiento, ritmos de producción e I+D).
   ===================================================================== */
(function (SP) {
  'use strict';

  /* ------------------------------------------------ 1. las categorías ---

     `combate` marca las que ya pesan en los bombardeos y en la defensa.
     Las de `combate: false` son el hueco preparado para las fases
     siguientes del sector de armas (carros, buques, misiles): el juego las
     contabiliza y las enseña, y el día que se les dé efecto solo hay que
     tocarlas aquí y en src/sim/arms.js. */
  SP.ARMS_CATEGORIAS = {
    caza: {
      orden: 1, label: 'Cazas', labelSing: 'caza', unidad: 'cazas',
      combate: true, clave: 'aa',
      que: 'Ganar el aire: escoltan a los bombarderos y se pelean con la aviación enemiga.',
      peso: { aa: 1, ag: 0.45, def: 0 }
    },
    bombardero: {
      orden: 2, label: 'Bombarderos', labelSing: 'bombardero', unidad: 'bombarderos',
      combate: true, clave: 'ag',
      que: 'Castigar tierra: es lo que hace daño de verdad en una campaña aérea.',
      peso: { aa: 0.1, ag: 1.2, def: 0 }
    },
    defensa: {
      orden: 3, label: 'Defensa aérea', labelSing: 'batería antiaérea', unidad: 'baterías',
      combate: true, clave: 'def',
      que: 'Que no te lo hagan a ti: intercepta y encarece cualquier bombardeo sobre tu país.',
      peso: { aa: 0, ag: 0, def: 0.6 }
    },
    /* --- declaradas para ampliar (fase siguiente del sector de armas) --- */
    carro: {
      orden: 4, label: 'Carros de combate', labelSing: 'carro', unidad: 'carros',
      combate: false, clave: 'tierra', futuro: true,
      que: 'Pendiente de enganchar: la potencia terrestre de los frentes de batalla.',
      peso: {}
    },
    buque: {
      orden: 5, label: 'Buques de guerra', labelSing: 'buque', unidad: 'buques',
      combate: false, clave: 'mar', futuro: true,
      que: 'Pendiente de enganchar: proyectar fuerza por mar y bloquear costas.',
      peso: {}
    },
    misil: {
      orden: 6, label: 'Misiles', labelSing: 'misil', unidad: 'misiles',
      combate: false, clave: 'misil', futuro: true,
      que: 'Pendiente de enganchar: golpear lejos sin aviación y sostener la disuasión.',
      peso: {}
    }
  };

  /* Orden de presentación y lista corta de las que ya combaten */
  SP.ARMS_CAT_LISTA = ['caza', 'bombardero', 'defensa', 'carro', 'buque', 'misil'];
  SP.ARMS_CAT_COMBATE = ['caza', 'bombardero', 'defensa'];

  /* -------------------------------------------- 2. las generaciones ---

     Cuanto mejor la generación, más rinde cada aparato y más caro es
     mantenerlo. Un país puede tener aparatos de una generación peor que la
     suya (los compró viejos) y eso se nota. */
  SP.ARMS_GENERACIONES = {
    1: { label: 'Primera generación', corto: '1.ª gen', desde: 1950, poder: 0.55,
         que: 'Reactores de los cincuenta: rápidos y poco más. Baratos y abundantes.' },
    2: { label: 'Segunda generación', corto: '2.ª gen', desde: 1960, poder: 0.78,
         que: 'Supersónicos con radar y misiles. La base de casi todos los ejércitos.' },
    3: { label: 'Tercera generación', corto: '3.ª gen', desde: 1970, poder: 1.0,
         que: 'Multifunción, aviónica decente. El estándar de 1990.' },
    4: { label: 'Cuarta generación', corto: '4.ª gen', desde: 1980, poder: 1.35,
         que: 'Elite: radar de barrido, munición guiada. Solo tres países la fabrican.' }
  };
  SP.ARMS_GEN_MAX = 4;

  /* ------------------------------------------------ 3. el catálogo ---

     `coste` es el precio de compra por aparato, en millones de dólares de
     1990, sin negociar. `poder` multiplica lo que rinde cada aparato dentro
     de su categoría (calidad frente a cantidad). `fab` es quién lo produce:
     quien lo fabrica puede hacerlo en casa (licencia / coproducción) y quien
     no, comprarlo. */
  SP.ARMS_MODELOS = {
    /* --- Estados Unidos --- */
    'f15':  { cat: 'caza', gen: 4, label: 'F-15 Eagle', ano: 1976, coste: 30, poder: 1.25, fab: 'USA' },
    'f16':  { cat: 'caza', gen: 4, label: 'F-16 Falcon', ano: 1979, coste: 19, poder: 1.10, fab: 'USA' },
    'f18':  { cat: 'caza', gen: 4, label: 'F/A-18 Hornet', ano: 1983, coste: 26, poder: 1.20, fab: 'USA' },
    'f4':   { cat: 'caza', gen: 3, label: 'F-4 Phantom', ano: 1960, coste: 6, poder: 0.85, fab: 'USA' },
    'b52':  { cat: 'bombardero', gen: 2, label: 'B-52 Stratofortress', ano: 1955, coste: 40, poder: 1.15, fab: 'USA' },
    'f111': { cat: 'bombardero', gen: 3, label: 'F-111 Aardvark', ano: 1967, coste: 28, poder: 1.05, fab: 'USA' },
    'patriot': { cat: 'defensa', gen: 4, label: 'Patriot', ano: 1984, coste: 55, poder: 1.30, fab: 'USA' },
    'hawk': { cat: 'defensa', gen: 3, label: 'MIM-23 Hawk', ano: 1960, coste: 12, poder: 0.95, fab: 'USA' },

    /* --- Unión Soviética --- */
    'mig29': { cat: 'caza', gen: 4, label: 'MiG-29 Fulcrum', ano: 1983, coste: 16, poder: 1.05, fab: 'URS' },
    'su27':  { cat: 'caza', gen: 4, label: 'Su-27 Flanker', ano: 1985, coste: 22, poder: 1.20, fab: 'URS' },
    'mig23': { cat: 'caza', gen: 3, label: 'MiG-23 Flogger', ano: 1970, coste: 7, poder: 0.90, fab: 'URS' },
    'mig21': { cat: 'caza', gen: 2, label: 'MiG-21 Fishbed', ano: 1959, coste: 3, poder: 0.70, fab: 'URS' },
    'tu95':  { cat: 'bombardero', gen: 2, label: 'Tu-95 Bear', ano: 1956, coste: 32, poder: 1.05, fab: 'URS' },
    'su24':  { cat: 'bombardero', gen: 3, label: 'Su-24 Fencer', ano: 1974, coste: 18, poder: 1.0, fab: 'URS' },
    'sa10':  { cat: 'defensa', gen: 4, label: 'S-300 / SA-10', ano: 1980, coste: 40, poder: 1.25, fab: 'URS' },
    'sa6':   { cat: 'defensa', gen: 3, label: 'S-75 / SA-6', ano: 1967, coste: 8, poder: 0.90, fab: 'URS' },

    /* --- Europa --- */
    'mirage2000': { cat: 'caza', gen: 4, label: 'Mirage 2000', ano: 1984, coste: 24, poder: 1.10, fab: 'FRA' },
    'miragef1':   { cat: 'caza', gen: 3, label: 'Mirage F1', ano: 1973, coste: 10, poder: 0.95, fab: 'FRA' },
    'jaguar':     { cat: 'bombardero', gen: 3, label: 'SEPECAT Jaguar', ano: 1973, coste: 11, poder: 0.90, fab: 'FRA' },
    'tornado':    { cat: 'caza', gen: 4, label: 'Panavia Tornado', ano: 1981, coste: 23, poder: 1.10, fab: 'GBR' },
    'harrier':    { cat: 'caza', gen: 3, label: 'BAE Harrier', ano: 1969, coste: 12, poder: 0.85, fab: 'GBR' },
    'rapier':     { cat: 'defensa', gen: 3, label: 'BAE Rapier', ano: 1971, coste: 10, poder: 0.85, fab: 'GBR' },
    'viggen':     { cat: 'caza', gen: 3, label: 'Saab Viggen', ano: 1971, coste: 11, poder: 0.95, fab: 'SWE' },
    'gripen':     { cat: 'caza', gen: 4, label: 'Saab Gripen', ano: 1988, coste: 20, poder: 1.05, fab: 'SWE' },

    /* --- China y otros fabricantes --- */
    'j7':   { cat: 'caza', gen: 2, label: 'Chengdu J-7', ano: 1966, coste: 3, poder: 0.65, fab: 'CHN' },
    'j8':   { cat: 'caza', gen: 3, label: 'Shenyang J-8', ano: 1979, coste: 6, poder: 0.80, fab: 'CHN' },
    'h6':   { cat: 'bombardero', gen: 2, label: 'Xian H-6', ano: 1968, coste: 14, poder: 0.85, fab: 'CHN' },
    'kfir': { cat: 'caza', gen: 3, label: 'IAI Kfir', ano: 1975, coste: 9, poder: 0.95, fab: 'ISR' },
    'nesher': { cat: 'defensa', gen: 3, label: 'IAI Barak', ano: 1979, coste: 9, poder: 0.90, fab: 'ISR' },
    'amx':  { cat: 'caza', gen: 3, label: 'AMX A-1', ano: 1985, coste: 8, poder: 0.80, fab: 'BRA' },
    'cheetah': { cat: 'caza', gen: 3, label: 'Atlas Cheetah', ano: 1986, coste: 10, poder: 0.90, fab: 'ZAF' }
  };

  /* ---------------------------------------------- 4. los proveedores ---

     `factor` es el recargo sobre el precio del catálogo (quien vende caro
     porque es el único que lo tiene). `blocs` son los bloques a los que
     vende sin problema (un bloque que no esté en la lista puede comprar si
     las relaciones son muy buenas y el vendedor no está en guerra contigo).
     `relMin` son las relaciones mínimas para que te atienda. */
  SP.ARMS_PROVEEDORES = {
    USA: {
      label: 'Estados Unidos', factor: 1.0, blocs: ['OTAN', 'OCC', 'AUT', 'NEU'],
      relMin: 30, categorias: { caza: ['f16', 'f18', 'f15', 'f4'], bombardero: ['f111', 'b52'], defensa: ['patriot', 'hawk'] },
      que: 'El gran vendedor del mundo libre: material excelente, precio alto y condiciones políticas.'
    },
    URS: {
      label: 'Unión Soviética', factor: 0.85, blocs: ['PVA', 'SOV', 'NEU'],
      relMin: 25, categorias: { caza: ['mig29', 'su27', 'mig23', 'mig21'], bombardero: ['su24', 'tu95'], defensa: ['sa10', 'sa6'] },
      que: 'Buen material a buen precio, pero te ata a su bloque y a sus repuestos.'
    },
    FRA: {
      label: 'Francia', factor: 1.15, blocs: ['OTAN', 'OCC', 'AUT', 'PNA', 'NEU'],
      relMin: 40, categorias: { caza: ['mirage2000', 'miragef1'], bombardero: ['jaguar'], defensa: ['hawk'] },
      que: 'Vende a quien le convenga sin mirar el bloque: no es barata, pero no impone condiciones.'
    },
    GBR: {
      label: 'Reino Unido', factor: 1.1, blocs: ['OTAN', 'OCC'],
      relMin: 45, categorias: { caza: ['tornado', 'harrier'], bombardero: ['jaguar'], defensa: ['rapier'] },
      que: 'Poca cantidad y buena calidad. Producir en casa con licencia es lo suyo.'
    },
    CHN: {
      label: 'China', factor: 0.7, blocs: ['NEU', 'PNA', 'SOV'],
      relMin: 20, categorias: { caza: ['j7', 'j8'], bombardero: ['h6'], defensa: ['sa6'] },
      que: 'El más barato: aparatos sencillos, de generaciones viejas, y sin preguntas incómodas.'
    },
    SWE: {
      label: 'Suecia', factor: 1.05, blocs: ['NEU', 'OCC', 'OTAN'],
      relMin: 50, categorias: { caza: ['viggen', 'gripen'], defensa: ['rapier'] },
      que: 'Neutral pero exigente: vende a quien no esté en guerra, con buenas relaciones y dinero por delante.'
    },
    ISR: {
      label: 'Israel', factor: 0.95, blocs: ['OCC', 'OTAN'],
      relMin: 55, categorias: { caza: ['kfir'], defensa: ['nesher'] },
      que: 'Material de combate probado y munición que nadie más vende, pero solo a sus amigos.'
    },
    BRA: {
      label: 'Brasil', factor: 0.9, blocs: ['PNA', 'OCC', 'AUT'],
      relMin: 35, categorias: { caza: ['amx'], defensa: [] },
      que: 'El proveedor regional latinoamericano: barato y sin dependencias de las superpotencias.'
    },
    ZAF: {
      label: 'Sudáfrica', factor: 0.85, blocs: ['NEU', 'PNA'],
      relMin: 30, categorias: { caza: ['cheetah'], defensa: [] },
      que: 'Aislada por el apartheid, vende a quien se atreva a comprarle.'
    }
  };

  /* ------------------------------------------------- 5. flotas de 1990 ---

     Formato:  país|cazas|bombarderos|defensa aérea
     Una línea por país. Los aparatos son unidades, y la generación media la
     pone SP.ARMS_TECH (o el PIB por persona). Cifras redondeadas de 1990:
     valen para jugar, no para un tratado de desarme. */
  SP.RAW_ARSENAL = `
USA|3900|330|1500
URS|4300|480|9000
CHN|3200|500|2600
IND|700|60|500
PRK|700|80|3000
VNM|250|40|500
KOR|400|0|250
TWN|400|30|300
JPN|400|0|350
FRA|600|90|300
GBR|560|100|250
FRG|520|130|400
ITA|380|60|250
ESP|200|30|150
TUR|450|50|300
GRC|300|40|250
SWE|300|0|250
CHE|180|0|150
NLD|180|20|120
BEL|150|20|100
DNK|90|10|70
NOR|90|10|60
PRT|70|10|60
FIN|90|0|80
AUT|60|0|60
IRL|20|0|10
POL|400|60|400
CSK|300|50|300
HUN|130|20|150
ROU|300|40|250
BGR|200|30|200
YUG|300|40|300
CAN|200|30|150
AUS|150|30|100
NZL|30|0|20
ISR|500|30|300
EGY|450|60|400
SYR|400|60|500
IRN|200|40|300
IRQ|400|60|400
SAU|250|40|300
PAK|350|40|400
KWT|60|10|40
ARE|80|10|60
OMN|40|0|30
BRA|250|40|150
ARG|200|30|150
CHL|100|10|80
PER|100|20|80
VEN|100|10|80
COL|80|10|60
ECU|40|0|30
CUB|150|20|200
MEX|100|10|80
ZAF|150|20|100
NGA|90|10|60
ETH|100|20|100
DZA|200|30|200
MAR|100|10|80
LBY|200|30|200
TUN|40|0|30
SDN|40|10|30
IDN|200|30|150
THA|150|20|100
MYS|80|10|60
PHL|80|10|50
SGP|100|0|60
MMR|60|10|40
BGD|60|0|40
LKA|40|0|30
MNG|60|10|50
AFG|100|20|100
`;

  /* ------------------------------------------- 6. tecnología de 1990 ---

     Generación de la aviación de cada país. Sin cifra aquí sale del PIB
     por persona: los ricos vuelan aparatos modernos y los pobres, los que
     les venden. */
  SP.ARMS_TECH = {
    USA: 4, URS: 4, GBR: 4, FRA: 4, FRG: 4, ITA: 4, JPN: 4, SWE: 4, ISR: 4,
    NLD: 4, BEL: 4, DNK: 4, NOR: 4, CAN: 4, CHE: 4, ESP: 3, AUS: 3, KOR: 3,
    TWN: 3, CHN: 3, IND: 3, PAK: 3, EGY: 3, SAU: 3, TUR: 3, GRC: 3, PRT: 3,
    BRA: 3, ARG: 3, CHL: 3, ZAF: 3, IRQ: 3, SYR: 3, IRN: 2, LBY: 2, DZA: 2,
    MAR: 2, PRK: 2, VNM: 2, CUB: 2, POL: 3, CSK: 3, HUN: 3, ROU: 2, BGR: 2,
    YUG: 3, AUT: 3, FIN: 3, MEX: 2, PER: 2, VEN: 2, COL: 2, IDN: 2, THA: 2,
    MYS: 2, PHL: 2, SGP: 3
  };

  /* ---------------------------------------------------- 7. los números ---

     `PILOTOS_PREP` es cuánto de la preparación de la tropa se contagia a
     los pilotos (una tropa movilizada vuela mejor). `MIL_MIN` aquí es el
     mínimo de aviación de ataque para poder bombardear: con menos aviones
     que esto no hay campaña posible. */
  SP.ARMS = {
    /* --- precios y plazos --- */
    ENTREGA_DIAS: 180,          /* lo que tarda un pedido en llegar */
    ENTREGA_DIAS_URGENTE: 90,   /* con recargo, medio año */
    RECARGO_URGENTE: 0.25,      /* +25 % por pedirlo con prisa */
    RECARGO_PROVEEDOR: 1.0,     /* se multiplica por el factor del vendedor */
    MAX_PEDIDOS: 5,             /* pedidos simultáneos de un país */
    MAX_UNIDADES_PEDIDO: 600,   /* tope por pedido, para no comprar un país entero */

    /* --- licencia y coproducción --- */
    LICENCIA_CP: 18,            /* capital político por firmar una licencia */
    LICENCIA_PCT: 0.6,          /* % del precio del aparato por unidad fabricada en casa */
    LICENCIA_MIN_INDUSTRIA: 25, /* hace falta algo de industria aeronáutica */
    LICENCIA_MIN_REL: 55,       /* y relaciones con el dueño del aparato */
    LICENCIA_DIAS: 365,         /* un año para montar la cadena de montaje */

    /* --- industria propia --- */
    IND_CP: 12,                 /* capital político por ampliarla */
    IND_MIN: 0, IND_MAX: 100,
    IND_POR_ANO: 8,             /* puntos de industria que se gana al año invirtiendo */
    IND_REQUIERE_PIB: 40,       /* por debajo de este PIB no hay base industrial */

    /* --- investigación y desarrollo --- */
    ID_CP: 15,                  /* capital político por lanzar un programa */
    ID_DIAS: 1095,              /* tres años hasta tener la generación nueva */
    ID_MIN_PIB: 120,            /* hace falta economía para sostener el programa */
    ID_MIN_INDUSTRIA: 45,       /* y una industria aeronáutica seria */

    /* --- mantenimiento y desgaste --- */
    MANTENER_PCT: 0.055,        /* % del valor del aparato al año (piezas, combustible, horas) */
    MANTENER_SIN_PAGO: 0.0015,  /* lo que se degrada al día el aparato sin dinero */
    BAJA_POR_AVION: 1.6,        /* factor de aviones perdidos por campaña */
    GUERRA_PERDIDA: 0.02,       /* % de la flota que se pierde al mes en guerra */
    PILOTOS_PREP: 0.5,          /* cuánto contagia la preparación de la tropa */
    PILOTOS_MIN: 0.35,          /* sin presupuesto de defensa, los pilotos vuelan al 35 % */

    /* --- umbrales y referencias --- */
    MIL_MIN: 40,                /* aviación de ataque mínima para bombardear */
    REF_ESCUADRON: 24,          /* aviones que forman un escuadrón (referencia de la interfaz) */
    RATIO_MIN: 0.6, RATIO_MAX: 1.7   /* el modificador nunca se sale de aquí */
  };

}(window.SP = window.SP || {}));
