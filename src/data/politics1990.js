/* =====================================================================
   Shadow President 1990 - Política de partida
   ---------------------------------------------------------------------
   De aquí salen los partidos con los que empieza cada país: quién gobierna,
   quién está en la oposición y cuántos escaños tiene cada uno.

   Formato de cada línea:

     id|cámara|nombre de la cámara|Partido:posición:apoyo;Partido:posición:apoyo

       cámara  : número de escaños (100 es mayoría absoluta en una cámara
                 de 200: la mayoría es siempre más de la mitad)
       posición: 0 = extrema izquierda, 10 = extrema derecha
       apoyo   : fuerza del partido en 1990, en % de votos (da igual que
                 sumen 96 que 104: se reparten proporcionalmente)

   El primer partido de la línea es el que gobierna en 1990. La mayoría de los
   161 países no están escritos: heredan los partidos de su región y su tipo de
   gobierno (SP.PARTY_REGION y SP.PARTY_GOV), que es lo que hace el generador
   SP.partiesFor. Escribir un país es copiar una línea y rellenarla; el orden no
   importa y las líneas que empiezan por # se ignoran.
   ===================================================================== */
(function (SP) {
  'use strict';

  /* ---------------------------------------------------------------------
     Las familias políticas. Cada una tiene un nombre para la interfaz, un
     color (el mismo que usa la capa «Gobierno» del mapa) y, por si el partido
     no trae posición, dónde cae en el eje izquierda-derecha.
     --------------------------------------------------------------------- */
  SP.PARTY_FAMS = {
    comu:   { label: 'Comunista',       color: '#a51f1f', pos: 1.0 },
    izq:    { label: 'Izquierda',       color: '#c8442e', pos: 1.8 },
    socdem: { label: 'Socialdemócrata', color: '#e0752e', pos: 3.0 },
    verde:  { label: 'Ecologista',      color: '#4f9d5a', pos: 3.5 },
    regio:  { label: 'Regionalista',    color: '#5bb0a5', pos: 5.2 },
    centro: { label: 'Centro',          color: '#c9a227', pos: 5.0 },
    liberal:{ label: 'Liberal',         color: '#4ea1f5', pos: 6.0 },
    demcr:  { label: 'Democristiano',   color: '#7f93a8', pos: 6.4 },
    cons:   { label: 'Conservador',     color: '#3f6fae', pos: 7.4 },
    reli:   { label: 'Religioso',       color: '#a97bd8', pos: 7.4 },
    naci:   { label: 'Nacionalista',    color: '#8a6a2f', pos: 8.2 },
    mili:   { label: 'Militar',         color: '#5c6b7a', pos: 8.8 },
    tecno:  { label: 'Tecnócrata',      color: '#8496a6', pos: 6.0 }
  };

  /* Etiqueta corta de la izquierda-derecha, para la ficha de un partido */
  SP.ideologyLabel = function (pos) {
    if (pos <= 1.5) return 'Extrema izquierda';
    if (pos <= 3.4) return 'Izquierda';
    if (pos <= 4.4) return 'Centro-izquierda';
    if (pos <= 5.6) return 'Centro';
    if (pos <= 6.6) return 'Centro-derecha';
    if (pos <= 8.4) return 'Derecha';
    return 'Extrema derecha';
  };

  /* =====================================================================
     PARTIDOS ESCRITOS A MANO
     ===================================================================== */

  SP.RAW_PARTIDOS = `
# id|cámara|nombre|partidos (el primero gobierna)
USA|435|Congreso|Demócrata:3.5:52;Republicano:7.6:44;Independiente:5:4
CAN|295|Cámara de los Comunes|Progresista Conservador:7.2:43;Liberal:5.2:34;Nuevo Democrático:2.4:13;Reformista:8.2:8;Bloque Quebequés:5.4:2
MEX|500|Cámara de Diputados|PRI:5.4:58;PAN:7.2:19;PRD:3:13;PPS:2:5;PARM:6:5
BRA|503|Cámara de Diputados|PMDB:5.4:27;PFL:7.2:21;PSDB:4.6:20;PT:2:11;PDT:3.4:9;PDS:7.6:12
ARG|254|Cámara de Diputados|Partido Justicialista:4.4:46;Unión Cívica Radical:5.4:34;Frepaso:5:11;Otros:6:9
CHL|120|Cámara de Diputados|Concertación:4:52;Renovación Nacional:7.6:32;Independientes:6:16
VEN|200|Cámara de Diputados|Acción Democrática:3.4:44;Copei:6.6:38;La Causa R:2.6:10;Otros:6:8
COL|199|Cámara de Representantes|Partido Liberal:4.4:52;Partido Conservador:7.6:40;Otros:5:8
PER|180|Cámara de Diputados|Frente Democrático:6.4:38;APRA:3:32;Izquierda Unida:1.4:12;Cambio 90:4:18
GBR|650|Cámara de los Comunes|Conservador:7.4:43;Laborista:3.4:38;Liberal Demócrata:5:15;Nacionalista Escocés:5.6:3;Unionista del Ulster:7.8:1
FRA|577|Asamblea Nacional|Socialista:2.8:37;RPR:7.2:33;UDF:6.2:18;Comunista:1:9;Frente Nacional:9.2:3
FRG|662|Bundestag|CDU/CSU:6.6:44;SPD:3.2:33;Verdes:3.4:8;FDP:6:11;PDS:1:4
GDR|400|Volkskammer|SED-PDS:1:32;CDU:6.6:40;SPD:3.4:20;Alianza 90:3:8
ITA|630|Cámara de Diputados|Democracia Cristiana:6.4:34;PCI:1.2:22;PSI:3.4:14;Lega Nord:7:9;MSI:8.8:6;Democracia Proletaria:1:3
ESP|350|Congreso de los Diputados|PSOE:3:39;PP:7.2:26;Izquierda Unida:1.2:9;CDS:5:8;CiU:5.4:5;PNV:5.4:2;Herri Batasuna:8.2:2
PRT|230|Asamblea de la República|Partido Socialdemócrata:6.8:51;PS:3.4:29;PCP:1:9;CDS:7:6;Otros:5:5
GRC|300|Parlamento|Nueva Democracia:7:46;PASOK:3.4:39;Izquierda:1.6:8;Otros:6:7
NLD|150|Segunda Cámara|Llamada Democristiana:6.4:35;Partido del Trabajo:3.2:32;VVD:6.8:22;D66:5:7;Otros:4:4
BEL|212|Cámara de Representantes|Democristianos:6.4:36;Socialistas:3.2:32;Liberales:6.4:18;Verdes:3.4:8;Vlaams Blok:9:6
SWE|349|Riksdag|Socialdemócrata:3:38;Moderado:7.4:22;Centro:5.6:9;Liberales:6:9;Izquierda:1.8:10;Verdes:3.4:6;Democristianos:7:7
NOR|165|Storting|Partido Laborista:3:34;Conservador:7.2:22;Centro:5.4:10;Progreso:8.4:13;Izquierda Socialista:2:10;Democristianos:6.8:8
DNK|179|Folketing|Socialdemócrata:3:31;Conservador:7:17;Liberales:6.4:20;Socialista Popular:2:9;Progreso:8.6:8;Otros:5:15
FIN|200|Eduskunta|Socialdemócrata:3:22;Centro:5.6:24;Coalición Nacional:7.2:20;Izquierda:1.8:10;Verdes:3.6:7;Suecos:5.4:6
AUT|183|Consejo Nacional|Partido Popular:6.6:42;Socialdemócrata:3.2:43;Liberales:8.6:9;Verdes:3.6:6
CHE|200|Consejo Nacional|Democristiano:6.4:36;Socialdemócrata:3:20;Radical:6.6:22;Unión Democrática:8.6:8;Verdes:3.4:6
IRL|166|Dáil|Fianna Fáil:5.4:44;Fine Gael:6.4:24;Laborista:3.2:9;Progresistas:6.8:10;Otros:4:13
TUR|450|Gran Asamblea Nacional|Partido de la Madre Patria:6.6:36;Partido del Verdadero Camino:7:20;SHP:3.4:20;Refah:8:12;Bienestar:5:12
ISR|120|Knesset|Likud:8:41;Laborista:3.4:39;Religiosos:7.6:12;Meretz:2.4:8
URS|542|Sóviet Supremo|Partido Comunista:1:70;Reformistas:4.4:18;Conservadores:9:12
POL|460|Sejm|Solidaridad:5:38;Comunistas reformados:2:37;Campesinos:4.4:15;Demócratas:6.4:10
CSK|300|Asamblea Federal|Comunistas:1:50;Foro Cívico:4.6:28;Demócratas:7:12;Campesinos:4.6:10
HUN|386|Asamblea Nacional|Foro Democrático:7:38;Socialistas:3:30;Alianza Democrática:4.4:18;Otros:6:14
ROU|396|Parlamento|Frente de Salvación:4.4:55;Liberales:6.6:22;Campesinos:5.4:13;Otros:4:10
BGR|400|Asamblea Nacional|Socialistas:2:45;Unión Democrática:6.6:35;Movimiento de Derechos:5:8;Otros:5:12
YUG|350|Asamblea Federal|Liga Comunista:2:40;Reformistas:5:25;Nacionalistas:8.4:25;Demócratas:5.4:10
CHN|600|Congreso del Pueblo|Partido Comunista:1:86;Reformistas:5:9;Ejército:8.6:5
JPN|512|Dieta|Partido Liberal Democrático:7.4:47;Socialista:2:27;Komeito:5.2:10;Comunista:1:5;Democrático Socialista:4.6:3;Otros:6:8
KOR|299|Asamblea Nacional|Partido Democrático Liberal:6.6:42;Partido Democrático:4.6:26;Partido de la Nueva Corea:8:20;Izquierda:2:6;Otros:5:6
TWN|164|Yuan Legislativo|Kuomintang:7.4:60;Partido Democrático Progresista:4:26;Otros:5:14
IND|545|Lok Sabha|Congreso:4.6:40;BJP:8:20;Janata Dal:5:22;Comunistas:1.4:10;Otros:6:8
PAK|237|Asamblea Nacional|Partido Popular:4.4:44;Liga Musulmana:7.6:34;Movimiento Unido:4:12;Religiosos:8.6:10
BGD|300|Jatiya Sangsad|Liga Awami:3.4:48;Partido Nacionalista:7.4:32;Jamaat:8.6:12;Izquierda:2:8
VNM|496|Asamblea Nacional|Partido Comunista:1:88;Reformistas:4.6:8;Otros:5:4
THA|357|Cámara de Representantes|Chat Thai:6.6:30;Chat Pattana:5.4:22;Demócratas:6.2:24;Nueva Aspiración:5:14;Otros:5:10
IDN|500|Parlamento|Golkar:7.4:66;Partido Democrático:5.4:14;Desarrollo Unido:7:12;Izquierda:2:8
PHL|200|Cámara de Representantes|Lakas:6.6:44;Laban:5.4:26;Nacionalistas:7:18;Izquierda:2:12
IRN|270|Majlis|Clero:8.6:52;Reformistas:4.6:28;Tecnócratas:6:20
IRQ|250|Consejo Nacional|Baaz:8.8:74;Kurdos:4.6:16;Religiosos:7.4:10
SAU|150|Consejo de la Shura|Casa de Saud:8.8:70;Religiosos:9.2:20;Tecnócratas:6:10
SYR|250|Consejo Popular|Baaz:8.8:78;Nacionalistas:7:12;Izquierda:2.4:10
EGY|454|Asamblea Nacional|Partido Nacional Democrático:7:74;Hermanos Musulmanes:8.6:12;Oposición laica:5:14
DZA|295|Asamblea Nacional|FLN:4.4:60;Frente Islámico:9:18;Izquierda:1.8:12;Tecnócratas:6:10
MAR|325|Cámara de Representantes|Independientes del rey:7:38;Istiqlal:6.4:26;Socialista:3.6:18;Justicia y Desarrollo:8.4:12;Otros:5:6
TUN|141|Cámara de Diputados|Agrupación Nacional:7.4:80;Movimiento Democrático:4:20
LBY|200|Congreso General|Revolucionario:8.8:82;Tribus:7:12;Reformistas:5:6
ZAF|178|Parlamento|Partido Nacional:8.4:58;Partido Democrático:4.6:24;Conservador:9.4:18
NGA|300|Asamblea Nacional|Congreso Nacional Republicano:6.4:44;Partido Socialdemócrata:4.6:38;Minorías:5:18
KEN|188|Parlamento|KANU:6.6:74;Oposición demócrata:4:26
ETH|550|Asamblea|Frente Revolucionario:1.4:80;Oposición:5:20
CUB|510|Asamblea Nacional|Partido Comunista:1:90;Disidentes:5:10
AUS|148|Cámara de Representantes|Laborista:3.4:49;Liberal:7.2:41;Nacional:7.4:6;Demócratas:6:4
NZL|97|Parlamento|Laborista:3.4:48;Nacional:7.2:48;Otros:5:4
`;

  /* =====================================================================
     PLANTILLAS PARA LOS DEMÁS PAÍSES
     ---------------------------------------------------------------------
     Cada región tiene un reparto de partidos para las democracias
     (SP.PARTY_REGION) y cada tipo de gobierno uno para los regímenes que no
     eligen su parlamento (SP.PARTY_GOV). El formato es el mismo:
       familia:posición:apoyo
     ===================================================================== */

  SP.PARTY_REGION = {
    'Norteamérica':     'demcr:6.4:30;liberal:6:26;socdem:3:22;izq:1.8:8;naci:8.2:8;verde:3.5:6',
    'Centroamérica':    'demcr:6.4:32;liberal:6:24;socdem:3.2:20;naci:8.2:12;izq:2:7;reli:7.4:5',
    'Caribe':           'socdem:3.2:30;liberal:6:24;demcr:6.4:20;naci:8.2:14;izq:2:12',
    'Sudamérica':       'socdem:3.4:28;cons:7.4:24;liberal:6:16;izq:1.8:12;demcr:6.4:12;naci:8.2:8',
    'Europa':           'socdem:3:28;cons:7.4:27;liberal:6:13;izq:1.8:10;verde:3.5:9;demcr:6.4:8;naci:8.4:5',
    'Oriente Medio':    'reli:7.6:30;naci:8.4:24;tecno:6:18;liberal:6:14;izq:2:8;mili:8.8:6',
    'Asia Central':     'naci:8.2:34;tecno:6:24;izq:2:18;reli:7.4:14;liberal:6:10',
    'Asia del Sur':     'socdem:3.4:30;cons:7.4:24;reli:7.6:20;izq:1.8:16;naci:8.4:10',
    'Asia Oriental':    'cons:7.4:36;liberal:6:20;socdem:3.2:18;izq:1.8:10;reli:7.4:9;verde:3.5:7',
    'Sudeste Asiático': 'tecno:6:28;naci:8.2:24;cons:7.4:18;socdem:3.2:14;reli:7.4:10;izq:2:6',
    'Oceanía':          'socdem:3.2:32;cons:7.4:28;liberal:6:14;naci:8.4:12;verde:3.5:8;izq:2:6',
    'Norte de África':  'naci:8.4:32;reli:8:22;tecno:6:18;socdem:3.2:14;izq:2:8;mili:8.8:6',
    'África Occidental':'socdem:3.4:30;cons:7.4:24;naci:8.2:18;tecno:6:14;izq:2:8;reli:7.4:6',
    'África Central':   'naci:8.2:34;cons:7.4:22;socdem:3.4:18;tecno:6:14;reli:7.4:8;izq:2:4',
    'África Oriental':  'socdem:3.4:30;naci:8.2:26;cons:7.4:18;tecno:6:14;reli:7.4:8;izq:2:4',
    'Cuerno de África': 'naci:8.4:34;reli:7.6:22;socdem:3.4:16;tecno:6:14;izq:2:8;mili:8.8:6',
    'África Austral':   'socdem:3.4:30;cons:7.4:24;naci:8.2:18;liberal:6:12;izq:2:10;reli:7.4:6',
    'Otros':            'socdem:3.2:28;cons:7.4:26;liberal:6:16;izq:2:12;naci:8.2:10;verde:3.5:8'
  };

  /* Regímenes que no reparten el poder en las urnas: cada familia de arriba
     se sustituye por los bloques que de verdad mandan en cada caso. */
  SP.PARTY_GOV = {
    COM:     'comu:1:72;tecno:4.6:18;mili:9:10',
    UNI:     'comu:1:74;tecno:5:16;mili:9:10',
    MIL:     'mili:8.8:58;tecno:6:26;socdem:3.4:16',
    MON:     'cons:7.6:42;tecno:6:26;reli:7.4:18;liberal:5.6:14',
    TEO:     'reli:8.6:54;tecno:6.6:22;cons:7.4:14;liberal:5.6:10',
    APR:     'naci:8.6:56;socdem:3:34;liberal:6:10',
    AUT:     'cons:7.4:50;tecno:6:24;socdem:3.4:16;mili:8.8:10',
    DEM:     'socdem:3.2:28;cons:7.4:26;liberal:6:16;izq:2:12;naci:8.2:10;verde:3.5:8'
  };

  /* Nombres genéricos por familia, para los países sin partidos escritos.
     El sufijo regional da color local sin inventar un partido por país. */
  SP.PARTY_NAMES = {
    comu:  ['Partido Comunista', 'Partido del Trabajo'],
    izq:   ['Izquierda Unida', 'Frente de Izquierda', 'Movimiento de Izquierda'],
    socdem:['Partido Socialdemócrata', 'Partido Laborista', 'Partido Socialista', 'Movimiento Democrático'],
    verde: ['Partido Verde', 'Movimiento Ecologista'],
    regio: ['Partido Regionalista', 'Unión Regional'],
    centro:['Unión de Centro', 'Partido del Centro'],
    liberal:['Partido Liberal', 'Unión Liberal', 'Partido Radical'],
    demcr: ['Democracia Cristiana', 'Partido Popular'],
    cons:  ['Partido Conservador', 'Partido Nacional', 'Unión Conservadora'],
    reli:  ['Movimiento Islámico', 'Partido Confesional', 'Frente Religioso', 'Partido del Pueblo de Dios'],
    naci:  ['Frente Nacional', 'Movimiento Nacionalista', 'Partido de la Patria', 'Unión Nacional'],
    mili:  ['Junta Militar', 'Consejo de las Fuerzas Armadas', 'Alto Mando'],
    tecno: ['Gobierno de los Técnicos', 'Movimiento Tecnócrata', 'Grupo de Reformistas']
  };

  /* =====================================================================
     LECTURA DE LA TABLA
     ===================================================================== */

  SP.POL_TABLE = null;

  function parsePartidos(raw) {
    const out = [];
    for (const trozo of String(raw).split(';')) {
      const s = trozo.trim();
      if (!s) continue;
      const f = s.split(':');
      if (f.length < 2) continue;
      const nombre = f[0].trim();
      if (!nombre) continue;
      const pos = parseFloat(f[1]);
      const base = f.length > 2 ? parseFloat(f[2]) : null;
      out.push({
        name: nombre,
        pos: isNaN(pos) ? null : pos,
        base: (base === null || isNaN(base)) ? null : base,
        fam: null
      });
    }
    return out;
  }

  SP.parsePolitica = function () {
    const table = {};
    for (const line of SP.RAW_PARTIDOS.split('\n')) {
      const s = line.trim();
      if (!s || s[0] === '#') continue;
      const f = s.split('|');
      if (f.length < 4) continue;
      table[f[0].trim().toUpperCase()] = {
        chamber: parseInt(f[1], 10) || 0,
        chamberName: (f[2] || '').trim() || null,
        parties: parsePartidos(f[3])
      };
    }
    return table;
  };

  function polTable() {
    if (!SP.POL_TABLE) SP.POL_TABLE = SP.parsePolitica();
    return SP.POL_TABLE;
  }

  SP.polHandWritten = function () { return Object.keys(polTable()); };

  /* La cámara escrita a mano de un país (tamaño y nombre), o null si usa la
     que le toca por población y región. */
  SP.polDef = function (id) {
    const t = polTable()[id];
    if (!t) return null;
    return { chamber: t.chamber || 0, chamberName: t.chamberName || null };
  };

  /* Nombres de los partidos generados: toma el primero libre de la familia,
     rotando por país para que dos vecinos no tengan el mismo partido. */
  function nombreGenerado(fam, semilla) {
    const lista = SP.PARTY_NAMES[fam] || ['Partido Independiente'];
    return lista[semilla % lista.length];
  }

  /* A qué familia pertenece un partido, deducida de su posición si no se dice.
     Es lo que le da color en la interfaz y en el mapa. */
  SP.famOf = function (pos) {
    if (pos <= 1.4) return 'comu';
    if (pos <= 2.6) return 'izq';
    if (pos <= 4.1) return 'socdem';
    if (pos <= 4.7) return 'centro';
    if (pos <= 6.1) return 'demcr';
    if (pos <= 7.0) return 'liberal';
    if (pos <= 8.0) return 'cons';
    if (pos <= 8.6) return 'naci';
    return 'mili';
  };

  /* Palabra clave del nombre -> familia, para que «Democracia Cristiana» salga
     azul y «Partido Verde» verde aunque la posición se haya escrito a mano. */
  const CLAVES = [
    [/comunista|comunistas|soviet|bolchevique/i, 'comu'],
    [/socialdem|socialista|socialistas|laborista|trabajo|obrero/i, 'socdem'],
    [/verde|ecologista|ecolog/i, 'verde'],
    [/regional|quebequ|escoc|vasco|catal|flamenco|kurd|tamil|sueco/i, 'regio'],
    [/liberal|radical|renovaci/i, 'liberal'],
    [/democristian|demócrata cristian|popular|cristiano demócrat|PDC|CDU|CSU|DC\b/i, 'demcr'],
    [/conservador|conservadora|tory|nacional\b|nacionalista|patria|frente nacional|republican|republicano/i, 'cons'],
    [/islam|islámico|islámica|religios|clero|obispo|rabino|sacerdote|dios|hermanos musulmanes|refah|jamaat|islamista/i, 'reli'],
    [/militar|junta|ejército|ejercito|armadas|general/i, 'mili'],
    [/izquierda|progresista|proletaria|marxista/i, 'izq'],
    [/tecnócrata|tecnocrat|independiente|tecnico|tecnico/i, 'tecno']
  ];

  function famFromName(name, pos) {
    for (const [re, fam] of CLAVES) if (re.test(name)) return fam;
    return SP.famOf(pos);
  }

  /* =====================================================================
     PARTIDOS DE UN PAÍS
     ---------------------------------------------------------------------
     Devuelve la lista de partidos con los que arranca un país en 1990:
       { name, fam, pos, base }
     donde `base` es su apoyo de partida en % de votos (suma 100).
     ===================================================================== */
  SP.partiesFor = function (id, region, gov) {
    const escrito = polTable()[id];
    let crudo;

    if (escrito && escrito.parties.length) {
      crudo = escrito.parties.map(p => ({ name: p.name, pos: p.pos, base: p.base, fam: null }));
    } else {
      /* Los regímenes no democráticos tienen sus bloques propios; las
         democracias, los partidos típicos de su región. */
      const plantilla = (gov && gov !== 'DEM') ? SP.PARTY_GOV[gov] : null;
      const raw = plantilla || SP.PARTY_REGION[region] || SP.PARTY_REGION['Otros'];
      crudo = [];
      let i = 0;
      for (const trozo of raw.split(';')) {
        const f = trozo.trim().split(':');
        if (f.length < 2) continue;
        const fam = f[0].trim();
        const pos = parseFloat(f[1]);
        const base = f.length > 2 ? parseFloat(f[2]) : 1;
        crudo.push({
          name: nombreGenerado(fam, semilla(id) + i),
          pos: isNaN(pos) ? (SP.PARTY_FAMS[fam] || SP.PARTY_FAMS.centro).pos : pos,
          base: isNaN(base) ? 1 : base,
          fam: fam
        });
        i++;
      }
    }

    if (!crudo.length) crudo = [{ name: 'Gobierno', pos: 6, base: 100, fam: 'tecno' }];

    /* posición y familia: lo que no esté escrito se deduce */
    for (const p of crudo) {
      if (p.pos === null || p.pos === undefined) p.pos = 5;
      if (!p.fam) p.fam = famFromName(p.name, p.pos);
    }
    /* apoyo: los que no lo traigan se reparten lo que sobra */
    let declarado = 0, faltan = 0;
    for (const p of crudo) { if (p.base === null) faltan++; else declarado += p.base; }
    if (faltan) {
      const sobra = Math.max(6, 100 - declarado);
      for (const p of crudo) if (p.base === null) p.base = sobra / faltan;
    }
    /* normaliza a 100 */
    let total = 0;
    for (const p of crudo) total += p.base;
    if (total > 0) for (const p of crudo) p.base = p.base / total * 100;
    return crudo;
  };

  /* Semilla estable a partir del código del país: dos países distintos no
     repiten el mismo nombre, pero el mismo país siempre da lo mismo. */
  function semilla(id) {
    let h = 3;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
    return h;
  }

  /* =====================================================================
     CÁMARA
     ===================================================================== */

  /* Nombre de la cámara cuando no está escrito a mano */
  SP.CHAMBER_NAMES = {
    'Europa': 'Parlamento', 'Oceanía': 'Parlamento',
    'Norteamérica': 'Congreso', 'Centroamérica': 'Congreso', 'Caribe': 'Parlamento',
    'Sudamérica': 'Congreso',
    'Oriente Medio': 'Asamblea Nacional', 'Norte de África': 'Asamblea Nacional',
    'África Occidental': 'Asamblea Nacional', 'África Central': 'Asamblea Nacional',
    'África Oriental': 'Asamblea Nacional', 'Cuerno de África': 'Asamblea Nacional',
    'África Austral': 'Asamblea Nacional',
    'Asia Central': 'Sóviet Supremo', 'Asia del Sur': 'Asamblea Nacional',
    'Asia Oriental': 'Asamblea Nacional', 'Sudeste Asiático': 'Asamblea Nacional',
    'Otros': 'Asamblea'
  };

  /* Tamaño de la cámara por población: un país de 300 millones no tiene un
     parlamento de 30 escaños. Se redondea a múltiplos de 5 para que el
     hemiciclo se dibuje bien. */
  SP.chamberSize = function (pop) {
    const p = Math.max(0.05, pop || 1);
    let n;
    if (p < 0.5) n = 30;
    else if (p < 1) n = 40;
    else if (p < 3) n = 65;
    else if (p < 8) n = 100;
    else if (p < 20) n = 150;
    else if (p < 45) n = 250;
    else if (p < 90) n = 300;
    else if (p < 200) n = 400;
    else n = 500;
    return Math.round(n / 5) * 5;
  };

  /* =====================================================================
     LA PRIMERA CITA ELECTORAL DE CADA PAÍS
     ---------------------------------------------------------------------
     Sin esta tabla, cada país sortea su primera cita entre 900 y 1.500 días
     (o 700-1.100 si el régimen es tutelado), así que el mundo vota en fechas
     inventadas. Aquí están las fechas de verdad: la primera elección
     nacional que celebró cada país después del 1 de enero de 1990.

     Formato:  PAIS: 'AAAA-MM-DD'

     Reglas:
       - Solo se usa si el país VOTA. En un régimen sin urnas (comunista,
         militar, teocracia...) la fecha se ignora hasta que el país se
         democratice; entonces sí se respeta, si aún no ha pasado.
       - Si la fecha ya pasó cuando se mira, el país sortea el calendario
         normal: no se viaja al pasado.
       - Después de esa primera cita, se vuelve al mandato normal
         (P.periodFor: 1.400 ± 120 días en democracias, 2.100 ± 200 en
         tutelados).

     Añadir un país es copiar una línea. Si una fecha no es correcta, se
     cambia aquí y ya está; el comprobador avisa de formatos y países.
     ===================================================================== */
  SP.ELEC_1990 = {
    /* Democracias consolidadas */
    USA: '1992-11-03', GBR: '1992-04-09', FRA: '1993-03-21', ESP: '1993-06-06',
    ITA: '1992-04-05', JPN: '1990-02-18', CAN: '1993-10-25', AUS: '1990-03-24',
    NZL: '1990-10-27', SWE: '1991-09-15', NOR: '1993-09-13', DNK: '1990-12-12',
    FIN: '1991-03-17', NLD: '1994-05-03', BEL: '1991-11-24', PRT: '1991-10-06',
    GRC: '1990-04-08', TUR: '1991-10-20', IRL: '1992-11-25', ISR: '1992-06-23',
    /* El resto del mundo que vota */
    IND: '1991-05-20', PAK: '1990-10-24', BGD: '1991-02-27', LKA: '1994-08-16',
    BRA: '1990-10-03', ARG: '1991-10-27', CHL: '1993-12-11', ZWE: '1990-03-28',
    KOR: '1992-03-24', TWN: '1992-12-19', THA: '1992-03-22', MYS: '1990-10-21',
    PHL: '1992-05-11', SGP: '1991-08-31',
    /* Regímenes tutelados: votan, pero la maquinaria del Estado pesa */
    MEX: '1991-08-18', IDN: '1992-06-09', KEN: '1992-12-29', NPL: '1991-05-12',
    /* Países que en 1990 NO votan: la fecha se usará el día que se
       democraticen, si aún no ha pasado. Es su primera elección libre. */
    GDR: '1990-03-18', HUN: '1990-03-25', ROU: '1990-05-20', CSK: '1990-06-08',
    BGR: '1990-06-10', POL: '1991-10-27', ZAF: '1994-04-27'
  };

  /* La fecha histórica de un país, o null si no está escrita. */
  SP.electionDate = function (id) { return SP.ELEC_1990[id] || null; };

}(window.SP = window.SP || {}));
