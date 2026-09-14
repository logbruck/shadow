/* =====================================================================
   Shadow President 1990 - Economía de partida
   ---------------------------------------------------------------------
   Cifras aproximadas de 1990. De aquí salen el capital, la productividad,
   la inflación y la deuda con la que arranca cada país.

   Formato de cada línea:
     id|inversión|apertura|industria|deuda|inflación

     inversión : formación bruta de capital, % del PIB
     apertura  : comercio exterior (exportaciones + importaciones), % del PIB
     industria : peso de la industria en el PIB, %  (el resto se reparte
                 entre agricultura y servicios según la región)
     deuda     : deuda pública y exterior, % del PIB
     inflación : inflación anual en 1990, %

   Cualquier columna se puede dejar vacía o con "-" y el país hereda el valor
   de su región (SP.ECON_REGION), que es lo que hace la mayoría de los 161
   países: solo están escritos a mano los que en 1990 tenían una economía
   reseñable. Añadir un país es copiar una línea y rellenarla; el orden de las
   líneas no importa y las que empiezan por # se ignoran.
   ===================================================================== */
(function (SP) {
  'use strict';

  SP.RAW_ECON = `
# id|inversión|apertura|industria|deuda|inflación
USA|21|19|28|42|5.4
CAN|21|49|30|70|4.8
MEX|20|28|28|45|26.7
GTM|14|45|25|45|30
BLZ|18|90|24|45|5
HND|18|55|28|70|23
SLV|15|40|27|55|24
NIC|15|40|28|120|3000
CRI|22|60|28|65|19
PAN|20|60|25|70|3
CUB|25|25|40|60|10
HTI|12|30|25|45|20
DOM|22|50|30|50|50
JAM|25|60|30|90|25
TTO|18|70|45|55|8
BRB|18|60|20|45|3
BHS|22|80|15|30|5
BRA|20|11|34|70|1585
ARG|14|13|31|95|2314
CHL|26|55|33|45|27
PER|18|25|33|60|7500
VEN|22|35|40|60|81
COL|20|30|30|40|29
ECU|22|40|33|70|48
BOL|16|40|30|70|18
URY|18|35|28|55|110
PRY|20|40|25|45|30
GUY|20|70|30|150|25
SUR|18|60|28|60|20
GBR|20|42|25|40|9.5
FRA|22|43|25|40|3.4
FRG|21|45|30|40|2.7
GDR|25|30|45|35|2.5
ITA|22|32|25|95|6.5
ESP|25|32|25|45|6.7
PRT|28|65|35|60|13
NLD|22|100|28|55|2.5
BEL|22|120|30|130|3.4
LUX|25|200|25|15|3.4
DNK|20|60|25|65|2.6
NOR|25|70|30|30|4.1
SWE|22|60|28|45|10.5
FIN|25|45|30|30|6.1
ISL|22|70|25|40|15
IRL|19|100|30|95|3.3
AUT|25|55|30|55|3.3
CHE|25|60|30|30|5.4
GRC|22|45|25|90|20
TUR|25|30|30|45|60
MLT|25|100|30|50|4
CYP|25|80|22|50|6
URS|32|8|45|60|7
POL|25|25|40|70|585
CSK|25|20|45|25|10
HUN|22|35|40|65|29
ROU|25|20|45|20|5
BGR|25|25|45|60|25
YUG|20|30|40|40|600
ALB|25|20|40|25|5
CHN|35|32|41|25|3.1
JPN|32|21|33|65|3.1
KOR|37|55|43|20|8.6
TWN|23|80|40|20|4.1
PRK|30|20|50|30|5
MNG|25|30|35|40|10
VNM|25|40|35|60|60
THA|40|60|37|30|5.9
MYS|35|70|40|45|2.8
SGP|35|300|30|75|3.5
IDN|30|45|40|60|7.8
PHL|22|50|35|60|13
BRN|25|90|50|10|2
IND|24|16|27|60|9
PAK|19|30|25|60|9
BGD|17|20|20|50|10
LKA|22|50|26|70|20
NPL|20|30|20|50|10
IRN|22|30|35|25|17
IRQ|15|40|45|120|40
SAU|22|60|45|40|2
KWT|20|80|50|20|5
ARE|25|90|50|20|5
QAT|25|70|55|25|4
BHR|25|100|45|20|3
OMN|25|60|45|30|5
ISR|24|60|30|100|17
EGY|25|45|33|90|16
LBY|20|50|45|30|10
DZA|25|35|40|60|17
MAR|22|45|30|70|7
TUN|25|55|30|60|7
SDN|15|20|20|100|60
ETH|12|20|15|60|20
SOM|10|25|15|80|50
DJI|15|60|20|70|10
KEN|18|35|20|90|15
TZA|20|30|20|80|25
UGA|15|25|20|60|40
RWA|15|25|18|50|20
BDI|14|30|18|70|15
MDG|14|30|20|90|15
MWI|16|40|22|80|12
MOZ|20|30|25|100|40
ZMB|18|50|35|110|60
ZWE|18|45|35|50|15
COD|10|25|30|100|100
COG|20|55|40|110|10
CMR|18|35|30|60|10
GAB|25|60|45|60|10
TCD|12|30|20|60|10
CAF|12|30|18|60|10
NGA|13|30|35|100|25
GHA|16|40|25|60|30
CIV|18|50|25|80|10
SEN|18|40|25|70|10
MLI|18|35|22|60|5
BFA|18|30|25|45|5
NER|14|30|20|60|5
GIN|16|35|25|70|20
SLE|14|30|22|80|40
LBR|14|50|25|100|30
TGO|18|50|25|60|10
BEN|16|40|25|55|10
MRT|18|50|30|90|10
GMB|18|50|20|70|10
GNB|16|40|20|100|30
CPV|22|60|20|60|8
AGO|20|40|45|90|20
ZAF|18|40|35|35|14
NAM|20|60|35|30|12
BWA|25|70|40|15|10
MUS|25|90|30|40|10
SYC|25|90|25|40|8
COM|15|40|20|60|10
AUS|22|35|28|25|7.3
NZL|20|55|25|55|6
PNG|22|70|35|45|8
FJI|18|80|25|40|8
SLB|15|60|20|40|10
VUT|20|70|20|40|6
WSM|20|50|25|50|8
TON|18|50|20|40|8
KIR|20|60|15|40|5
NRU|25|90|20|30|5
FSM|20|70|20|40|5
MHL|20|70|20|40|5
PLW|20|70|20|40|5
# --- los que faltaban: microestados y economías de guerra ---
GRD|22|95|20|50|5
SYR|18|40|40|130|20
LBN|12|55|22|90|50
JOR|20|75|28|100|16
YEM|14|35|25|90|25
AFG|10|20|15|60|25
BTN|25|35|30|30|8
MDV|22|90|10|40|8
LAO|15|20|20|70|20
KHM|12|25|15|60|30
MMR|16|15|25|80|30
GNQ|20|60|40|110|15
LSO|30|90|25|45|12
SWZ|25|80|30|30|11
`;

  /* Valores por defecto de cada región: [inversión, apertura, industria, deuda, inflación] */
  SP.ECON_REGION = {
    'Norteamérica':     [20, 35, 28, 50, 6],
    'Centroamérica':    [16, 40, 26, 55, 20],
    'Caribe':           [20, 45, 27, 60, 15],
    'Sudamérica':       [19, 30, 31, 55, 40],
    'Europa':           [23, 45, 29, 50, 6],
    'Oriente Medio':    [22, 45, 38, 55, 15],
    'Asia Central':     [25, 25, 40, 35, 10],
    'Asia del Sur':     [21, 25, 26, 55, 10],
    'Asia Oriental':    [30, 35, 37, 30, 8],
    'Sudeste Asiático': [28, 50, 36, 45, 10],
    'Oceanía':          [22, 45, 27, 40, 6],
    'Norte de África':  [23, 40, 35, 60, 12],
    'África Occidental':[16, 35, 25, 75, 20],
    'África Central':   [15, 30, 27, 75, 25],
    'África Oriental':  [17, 30, 22, 75, 25],
    'Cuerno de África': [13, 22, 18, 80, 30],
    'África Austral':   [18, 40, 30, 60, 15],
    'Otros':            [20, 35, 28, 55, 15]
  };

  /* Ajustes por tipo de gobierno: cómo cambia lo anterior según quién manda */
  SP.ECON_GOV = {
    DEM: { inv: 0, open: 0, infl: -2 },
    AUT: { inv: -1, open: -2, infl: 3 },
    MIL: { inv: -2, open: -3, infl: 6 },
    COM: { inv: -2, open: -5, infl: 2 },
    MON: { inv: -1, open: -2, infl: 1 },
    TEO: { inv: -2, open: -4, infl: 8 },
    UNI: { inv: -2, open: -3, infl: 6 },
    APR: { inv: -2, open: -5, infl: 3 }
  };

  /* Paro estructural de algunos países en 1990: el suelo al que tiende su
     economía aunque crezca. Los que no están aquí usan el de su región. */
  SP.ECON_U = {
    ESP: 13, ITA: 9.5, IRL: 12.5, FIN: 9, POL: 9, YUG: 11, DZA: 18, MAR: 15,
    TUN: 15, ZAF: 18, JAM: 15, TTO: 17, PRT: 8, GRC: 9, BEL: 7.5, FRA: 8.5,
    GBR: 7, CAN: 8.5, AUS: 8, NZL: 8, ARG: 9, BRA: 6, CHL: 7, PER: 9,
    MEX: 8, VEN: 10, COL: 11, ECU: 9, URS: 5, ROU: 6, BGR: 7, HUN: 7,
    CSK: 5, GDR: 5, SAU: 11, EGY: 12, IRN: 12, IRQ: 14, ISR: 9, TUR: 12,
    IND: 7, PAK: 8, BGD: 8, CHN: 4, VNM: 6, KOR: 3, TWN: 3, JPN: 3,
    SGP: 3.5, HKG: 3, THA: 4, MYS: 4, IDN: 5, PHL: 9, NGA: 15
  };

  /* Nombre y unidad de cada dato, para paneles y comprobadores */
  SP.ECON_FIELDS = [
    { key: 'inv', label: 'Inversión', unit: '% del PIB', min: 0, max: 60 },
    { key: 'open', label: 'Apertura comercial', unit: '% del PIB', min: 0, max: 400 },
    { key: 'ind', label: 'Industria', unit: '% del PIB', min: 0, max: 80 },
    { key: 'debt', label: 'Deuda pública', unit: '% del PIB', min: 0, max: 400 },
    { key: 'infl', label: 'Inflación', unit: '% anual', min: -20, max: 20000 }
  ];

  SP.ECON_TABLE = null;

  SP.parseEcon = function () {
    const table = {};
    for (const line of SP.RAW_ECON.split('\n')) {
      const s = line.trim();
      if (!s || s[0] === '#') continue;
      const f = s.split('|');
      if (f.length < 2) continue;
      const out = {};
      SP.ECON_FIELDS.forEach((campo, i) => {
        const raw = (f[i + 1] || '').trim();
        if (raw === '' || raw === '-') { out[campo.key] = null; return; }
        const v = parseFloat(raw.replace(',', '.'));
        out[campo.key] = isNaN(v) ? null : v;
      });
      table[f[0].trim().toUpperCase()] = out;
    }
    return table;
  };

  function econTable() {
    if (!SP.ECON_TABLE) SP.ECON_TABLE = SP.parseEcon();
    return SP.ECON_TABLE;
  }

  /* Datos económicos de un país: lo escrito a mano y, si falta, lo de su región
     y su tipo de gobierno. Devuelve siempre los cinco números. */
  SP.econFor = function (id, region, gov) {
    const escrito = econTable()[id] || {};
    const base = SP.ECON_REGION[region] || SP.ECON_REGION['Otros'];
    const adj = SP.ECON_GOV[gov] || {};
    const out = {};
    SP.ECON_FIELDS.forEach((campo, i) => {
      if (escrito[campo.key] !== null && escrito[campo.key] !== undefined) { out[campo.key] = escrito[campo.key]; return; }
      let v = base[i];
      if (campo.key === 'inv') v += (adj.inv || 0);
      if (campo.key === 'open') v += (adj.open || 0);
      if (campo.key === 'infl') v += (adj.infl || 0);
      out[campo.key] = v;
    });
    return out;
  };

  /* Quién tiene datos escritos a mano (para el comprobador y los informes) */
  SP.econHandWritten = function () {
    return Object.keys(econTable());
  };

  /* =====================================================================
     PERFIL SOCIAL Y COMERCIAL DE 1990
     ---------------------------------------------------------------------
     Además de los cinco números de arriba, cada país tiene un perfil que usa
     el mercado de trabajo, el comercio y los eventos:

       id|educación|infraestructura|salud|recurso|socios

         educación      : 0-100 (capital humano)
         infraestructura: 0-100 (carreteras, puertos, electricidad)
         salud          : 0-100 (sanidad y esperanza de vida)
         recurso        : de qué vive su comercio exterior (ver ECON_RECURSOS)
         socios         : sus principales socios comerciales, separados por ","

     Cualquier campo se puede dejar vacío. Lo que no se escriba se deduce del
     país (riqueza, región y gobierno) en SP.econSocial, así que añadir una
     línea es opcional: solo merece la pena para corregir un caso concreto.
     ===================================================================== */

  SP.RAW_PROFILE = `
# id|educ|infra|salud|recurso|socios
USA|88|86|80|servicios|CAN,MEX,JPN,GBR
URS|80|55|62|petroleo|GDR,POL,CSK,CUB
CAN|86|82|84|minerales|USA,JPN,GBR
MEX|58|55|60|petroleo|USA,CAN,JPN
BRA|52|48|52|grano|USA,FRG,JPN,ARG
ARG|62|58|62|grano|BRA,USA,URS
CHL|58|55|60|minerales|USA,JPN,BRA
PER|48|42|45|minerales|USA,JPN,CHN
VEN|58|52|58|petroleo|USA,FRG,JPN
COL|52|45|52|petroleo|USA,FRG,JPN
GBR|84|84|82|servicios|USA,FRG,FRA
FRA|84|86|86|servicios|FRG,ITA,GBR
FRG|86|88|84|industria|FRA,NLD,ITA,USA
GDR|76|68|74|industria|URS,POL,CSK
ITA|76|74|80|industria|FRG,FRA,GBR
ESP|68|68|76|servicios|FRA,FRG,ITA,PRT
PRT|62|62|68|servicios|ESP,FRG,FRA
NLD|84|86|84|servicios|FRG,BEL,GBR
BEL|82|86|84|industria|FRG,FRA,NLD
SWE|86|86|86|industria|FRG,GBR,NOR
CHE|88|88|86|servicios|FRG,FRA,ITA
AUT|82|82|82|industria|FRG,ITA,CHE
NOR|86|84|86|petroleo|GBR,FRG,SWE
DNK|84|86|84|agricultura|FRG,SWE,GBR
FIN|84|82|84|industria|URS,SWE,FRG
POL|68|60|68|industria|URS,GDR,CSK
CSK|72|66|72|industria|URS,POL,GDR
HUN|70|64|70|industria|URS,FRG,AUT
ROU|62|52|62|industria|URS,CHN,FRG
BGR|64|56|64|agricultura|URS,ROU,FRG
YUG|66|58|66|industria|ITA,URS,FRG
CHN|52|38|48|industria|JPN,USA,SGP
JPN|90|90|88|industria|USA,CHN,KOR
KOR|74|68|74|industria|USA,JPN,FRG
TWN|72|70|74|industria|USA,JPN,SGP
PRK|66|50|62|minerales|URS,CHN
IND|42|35|40|agricultura|URS,USA,JPN,GBR
PAK|38|32|36|agricultura|USA,SAU,JPN
BGD|34|26|32|agricultura|USA,JPN,IND
THA|52|45|52|industria|JPN,USA,SGP
MYS|56|52|56|minerales|JPN,USA,SGP
SGP|76|86|80|servicios|USA,MYS,JPN
IDN|46|38|44|petroleo|JPN,USA,SGP
PHL|54|45|54|agricultura|USA,JPN,NLD
VNM|48|35|48|agricultura|URS,JPN,SGP
IRN|46|40|46|petroleo|JPN,FRG,ITA
IRQ|42|40|44|petroleo|FRA,JPN,TUR
SAU|52|55|54|petroleo|USA,JPN,FRG
ISR|74|72|76|industria|USA,FRG,GBR
EGY|42|40|44|petroleo|USA,ITA,FRA
DZA|48|45|50|petroleo|FRA,ITA,ESP
LBY|44|42|46|petroleo|ITA,FRG,FRA
NGA|34|28|28|petroleo|USA,GBR,FRG
ZAF|52|50|52|minerales|GBR,FRG,JPN
KEN|40|34|36|agricultura|GBR,FRG,UGA
ETH|26|22|24|agricultura|URS,SAU,DJI
SDN|28|24|26|agricultura|SAU,EGY,GBR
AGO|34|28|32|petroleo|USA,PRT,FRA
GAB|42|36|42|petroleo|FRA,USA,JPN
CMR|34|28|32|agricultura|FRA,NLD,USA
COD|30|24|28|minerales|BEL,FRA,USA
ZMB|32|28|30|minerales|GBR,ZAF,JPN
ZWE|42|38|42|minerales|ZAF,GBR,FRG
GHA|34|28|32|agricultura|GBR,NLD,USA
CIV|36|30|34|agricultura|FRA,NLD,FRG
SEN|32|28|30|agricultura|FRA,MLI,CIV
TZA|30|24|28|agricultura|GBR,FRG,KEN
UGA|28|24|26|agricultura|KEN,GBR,FRG
MAR|38|34|38|agricultura|FRA,ESP,FRG
TUN|44|40|44|agricultura|FRA,ITA,FRG
AUS|84|82|84|minerales|JPN,USA,GBR
NZL|82|78|82|agricultura|AUS,JPN,GBR
`;

  /* De qué vive el comercio de un país, y qué le hace el precio internacional
     de esa materia prima. `vol` es la volatilidad y `ciclo` cuánto le mueve el
     precio del crudo y de las materias primas. */
  SP.ECON_RECURSOS = {
    petroleo:    { label: 'Petróleo y gas',  vol: 1.6, crudo: 1.0,  grano: 0.0 },
    minerales:   { label: 'Minería',         vol: 1.4, crudo: 0.2,  grano: 0.1 },
    grano:       { label: 'Grano y ganado',  vol: 1.2, crudo: -0.1, grano: 1.0 },
    agricultura: { label: 'Agricultura',     vol: 1.1, crudo: -0.1, grano: 0.8 },
    industria:   { label: 'Industria',       vol: 0.9, crudo: -0.3, grano: 0.0 },
    servicios:   { label: 'Servicios',       vol: 0.7, crudo: -0.2, grano: 0.0 },
    turismo:     { label: 'Turismo',         vol: 1.1, crudo: 0.1,  grano: 0.0 },
    pesca:       { label: 'Pesca',           vol: 1.0, crudo: 0.0,  grano: 0.1 },
    mixto:       { label: 'Economía mixta',  vol: 1.0, crudo: -0.1, grano: 0.2 },
    ninguno:     { label: 'Sin recursos',    vol: 1.0, crudo: -0.1, grano: 0.0 }
  };

  /* Perfil social por defecto de cada región: [educación, infraestructura, salud].
     Luego se ajusta por la riqueza del país y por su tipo de gobierno, y lo
     escrito a mano en SP.RAW_PROFILE manda por encima de todo. */
  SP.ECON_SOCIAL_REGION = {
    'Norteamérica':     [80, 78, 76],
    'Centroamérica':    [46, 42, 48],
    'Caribe':           [52, 48, 54],
    'Sudamérica':       [54, 50, 54],
    'Europa':           [78, 76, 78],
    'Oriente Medio':    [48, 46, 50],
    'Asia Central':     [46, 40, 46],
    'Asia del Sur':     [38, 32, 38],
    'Asia Oriental':    [62, 52, 60],
    'Sudeste Asiático': [50, 44, 50],
    'Oceanía':          [62, 54, 62],
    'Norte de África':  [44, 42, 46],
    'África Occidental':[32, 27, 30],
    'África Central':   [30, 25, 28],
    'África Oriental':  [30, 25, 28],
    'Cuerno de África': [24, 20, 22],
    'África Austral':   [42, 40, 42],
    'Otros':            [40, 35, 40]
  };

  /* Lo que suma o resta cada tipo de gobierno: la democracia invierte en
     gente, las dictaduras en cañones. */
  SP.ECON_SOCIAL_GOV = {
    DEM: { educ: 5, salud: 5 }, AUT: { educ: -4, salud: -3 },
    MIL: { educ: -5, salud: -4 }, COM: { educ: -2, salud: -1 },
    MON: { educ: -1, salud: 0 }, TEO: { educ: -5, salud: -4 },
    UNI: { educ: -4, salud: -3 }, APR: { educ: -9, salud: -8 }
  };

  SP.PROFILE_TABLE = null;

  SP.parseProfile = function () {
    const table = {};
    for (const line of SP.RAW_PROFILE.split('\n')) {
      const s = line.trim();
      if (!s || s[0] === '#') continue;
      const f = s.split('|');
      if (f.length < 2) continue;
      const out = {};
      ['educ', 'infra', 'salud'].forEach((key, i) => {
        const raw = (f[i + 1] || '').trim();
        const v = parseFloat(raw.replace(',', '.'));
        out[key] = isNaN(v) ? null : v;
      });
      const rec = (f[4] || '').trim();
      out.recurso = rec ? rec.toLowerCase() : null;
      const soc = (f[5] || '').trim();
      out.socios = soc ? soc.split(/[,;]/).map(x => x.trim().toUpperCase()).filter(Boolean) : null;
      table[f[0].trim().toUpperCase()] = out;
    }
    return table;
  };

  function profileTable() {
    if (!SP.PROFILE_TABLE) SP.PROFILE_TABLE = SP.parseProfile();
    return SP.PROFILE_TABLE;
  }

  /* El perfil escrito a mano de un país, o null si no tiene. */
  SP.profileWritten = function (id) {
    return profileTable()[id] || null;
  };

  /* Perfil social de un país: educación, infraestructura, salud y recurso.
     Lo que no esté escrito se deduce de su riqueza, su región y su gobierno. */
  SP.econSocial = function (id, region, gov, gpc) {
    const escrito = profileTable()[id] || {};
    const base = SP.ECON_SOCIAL_REGION[region] || SP.ECON_SOCIAL_REGION['Otros'];
    const adj = SP.ECON_SOCIAL_GOV[gov] || {};
    /* riqueza: 0 para un país de 1.000 $ por persona, 1 para uno de 30.000 $ */
    /* util.js se carga después que este archivo, así que se consulta en el
       momento de la llamada, no al definir la función */
    const clamp = SP.util.clamp;
    const riq = clamp((Math.log10(Math.max(200, gpc || 2000)) - 3) / 1.5, 0, 1);
    const out = {};
    ['educ', 'infra', 'salud'].forEach((key, i) => {
      if (escrito[key] !== null && escrito[key] !== undefined) { out[key] = escrito[key]; return; }
      let v = base[i] + (riq - 0.5) * 30 + (adj[key] || 0);
      out[key] = clamp(v, 5, 98);
    });
    out.recurso = escrito.recurso || deducirRecurso(id, region);
    out.socios = escrito.socios || null;
    return out;
  };

  /* Recurso principal cuando no está escrito: un mapa grueso por país, que
     cubre los exportadores conocidos y deja "mixto" para el resto. */
  const RECURSO_PAIS = {
    petroleo: 'SAU IRQ IRN KWT ARE QAT BHR OMN LBY DZA NGA GAB AGO VEN MEX COL ECU ' +
      'NOR GBR IDN BRN TTO ROU URS AZE KAZ TKM SYR YEM GNQ',
    minerales: 'ZAF ZMB ZWE COD CHL PER BOL NAM BWA PNG AUS ZAR MRT NER GIN SLE LBR ' +
      'SUR GUY JAM ZAF TWN PRK',
    grano: 'USA CAN ARG BRA URY PRY AUS FRA UKR KAZ ARG',
    turismo: 'GRD BRB BHS JAM DOM HTI MLT CYP MDV FJI VUT WSM TON CPV MUS SYC',
    agricultura: 'IND BGD PAK LKA NPL MMR KHM LAO VNM THA PHL IDN KEN TZA UGA ETH SDN GHA ' +
      'CIV SEN MLI CMR ZMB MWI MOZ MDG RWA BDI BFA'
  };
  const RECURSO_MAP = (function () {
    const m = {};
    for (const k in RECURSO_PAIS) for (const id of RECURSO_PAIS[k].split(/\s+/)) if (id) m[id] = k;
    return m;
  })();

  function deducirRecurso(id, region) {
    if (RECURSO_MAP[id]) return RECURSO_MAP[id];
    if (region === 'Europa' || region === 'Norteamérica' || region === 'Asia Oriental') return 'industria';
    if (region === 'Caribe' || region === 'Oceanía') return 'turismo';
    if (region === 'África Occidental' || region === 'África Oriental' || region === 'Cuerno de África') return 'agricultura';
    return 'mixto';
  }

  /* Datos de un recurso, con salida segura si el nombre está mal escrito */
  SP.recursoInfo = function (nombre) {
    return SP.ECON_RECURSOS[nombre] || SP.ECON_RECURSOS.ninguno;
  };

  /* =====================================================================
     PERFIL FISCAL DE 1990
     ---------------------------------------------------------------------
     Cuánto recauda y cuánto gasta cada país, en % del PIB.

     Antes TODOS los países arrancaban con el mismo presupuesto (38 % de
     impuestos, 7 % de defensa), así que Vanuatu tenía ejército y Suecia la
     misma presión fiscal que Nigeria. Aquí:

       - SP.FISCAL_BANDS da el punto de partida según la renta: la capacidad
         de recaudar crece con la riqueza. [PIB/cáp. mínimo, impuestos, gasto]
       - SP.FISCAL_PAIS escribe a mano los casos conocidos (el gasto militar
         de la URSS, la presión fiscal escandinava, Italia y su déficit, los
         estados del Golfo que viven del petróleo y no de los impuestos).
       - SP.FISCAL_MIL fija la defensa de los países con ejército reseñable;
         los que no tienen ejército pagan cero.

     SP.fiscalFor(c) devuelve { tax, mil, social, other, intel }, donde
     `social` es sanidad + educación + pensiones + subsidios + empleo y
     `other` es inversión pública y demás gasto no social.
  */

  /* Presión fiscal y gasto público por nivel de renta */
  SP.FISCAL_BANDS = [
    [18000, 40, 41],
    [10000, 37, 40],
    [7000, 33, 36],
    [4500, 28, 31],
    [2500, 23, 26],
    [1200, 18, 22],
    [0, 15, 19]
  ];

  /* Casos escritos a mano: { tax, spend, mil }. Lo que no se ponga aquí sale
     de la banda por renta y de la tabla de defensa. */
  SP.FISCAL_PAIS = {
    /* Norteamérica y Oceanía */
    USA: { tax: 34, spend: 38, mil: 5.5 },
    CAN: { tax: 40, spend: 44, mil: 2.0 },
    AUS: { tax: 34, spend: 35, mil: 2.4 },
    NZL: { tax: 40, spend: 43, mil: 1.8 },
    /* Europa occidental: presión fiscal alta, defensa contenida */
    SWE: { tax: 58, spend: 55, mil: 2.6 }, DNK: { tax: 56, spend: 55, mil: 2.0 },
    NOR: { tax: 50, spend: 48, mil: 3.2 }, FIN: { tax: 43, spend: 44, mil: 2.0 },
    FRG: { tax: 45, spend: 46, mil: 3.0 }, FRA: { tax: 44, spend: 45, mil: 3.5 },
    GBR: { tax: 39, spend: 39, mil: 4.0 }, ITA: { tax: 40, spend: 52, mil: 2.2 },
    GRC: { tax: 33, spend: 47, mil: 5.0 }, PRT: { tax: 33, spend: 37, mil: 2.8 },
    ESP: { tax: 37, spend: 40, mil: 2.0 }, IRL: { tax: 36, spend: 40, mil: 1.3 },
    BEL: { tax: 44, spend: 52, mil: 2.6 }, NLD: { tax: 45, spend: 47, mil: 3.0 },
    AUT: { tax: 43, spend: 45, mil: 1.2 }, CHE: { tax: 33, spend: 33, mil: 1.2 },
    ISL: { tax: 38, spend: 38, mil: 0 },
    /* Europa del Este y la URSS: el Estado era casi toda la economía */
    URS: { tax: 48, spend: 52, mil: 12 },
    POL: { tax: 40, spend: 45, mil: 2.5 }, HUN: { tax: 50, spend: 52, mil: 2.4 },
    CSK: { tax: 48, spend: 50, mil: 4.0 }, GDR: { tax: 52, spend: 55, mil: 6.0 },
    BGR: { tax: 45, spend: 48, mil: 3.0 }, ROU: { tax: 40, spend: 42, mil: 3.0 },
    YUG: { tax: 40, spend: 45, mil: 4.0 },
    /* Asia */
    JPN: { tax: 33, spend: 32, mil: 1.0 },
    CHN: { tax: 16, spend: 20, mil: 3.5 },
    PRK: { tax: 30, spend: 34, mil: 18 },
    KOR: { tax: 22, spend: 22, mil: 3.7 }, TWN: { tax: 25, spend: 26, mil: 5.0 },
    IND: { tax: 19, spend: 26, mil: 3.0 }, PAK: { tax: 17, spend: 24, mil: 6.0 },
    VNM: { tax: 20, spend: 24, mil: 6.0 },
    /* Oriente Medio: viven de la renta del petróleo, no de los impuestos */
    SAU: { tax: 22, spend: 30, mil: 12 }, IRQ: { tax: 30, spend: 40, mil: 15 },
    IRN: { tax: 25, spend: 30, mil: 8 }, KWT: { tax: 30, spend: 38, mil: 10 },
    ARE: { tax: 28, spend: 33, mil: 8 }, OMN: { tax: 30, spend: 36, mil: 12 },
    ISR: { tax: 45, spend: 55, mil: 9.0 },
    /* América Latina */
    BRA: { tax: 24, spend: 30, mil: 1.5 }, ARG: { tax: 21, spend: 26, mil: 1.5 },
    MEX: { tax: 22, spend: 24, mil: 0.8 }, CHL: { tax: 24, spend: 24, mil: 3.0 },
    VEN: { tax: 22, spend: 26, mil: 2.0 },
    /* África */
    ZAF: { tax: 26, spend: 30, mil: 3.5 }, NGA: { tax: 22, spend: 25, mil: 1.5 },
    EGY: { tax: 30, spend: 36, mil: 4.0 }, LBY: { tax: 35, spend: 40, mil: 6.0 }
  };

  /* Países sin ejército en 1990: pagan cero defensa (Costa Rica lo abolió en
     1948 y Panamá lo disolvió en 1990; los microestados del Pacífico y las
     Antillas no tienen fuerzas armadas propias). */
  SP.FISCAL_SIN_EJERCITO = 'VUT WSM TON KIR NRU FSM MHL PLW SLB GRD CRI PAN ISL BRB BHS SYC MLT';

  /* Gasto militar, % del PIB. Solo se escribe lo que se aparta de la media */
  SP.FISCAL_MIL = {
    URS: 12, PRK: 18, ISR: 9, USA: 5.5, GBR: 4, FRA: 3.5, FRG: 3, TUR: 3.5,
    GRC: 5, VNM: 6, PAK: 6, TWN: 5, IND: 3, KOR: 3.7, CHN: 3.5, IRQ: 15,
    IRN: 8, SAU: 12, KWT: 10, ARE: 8, OMN: 12, SYR: 8, JOR: 8, EGY: 4,
    LBY: 6, ZAF: 3.5, CUB: 5, AGO: 5, ETH: 4, YUG: 4, POL: 2.5, HUN: 2.4,
    CSK: 4, GDR: 6, NOR: 3.2, NLD: 3, BEL: 2.6, PRT: 2.8, ITA: 2.2
  };

  /* Gasto militar por defecto cuando no está escrito: poco, y algo más en los
     países militarizados o que compran seguridad con alianzas. */
  SP.FISCAL_MIL_GOV = { MIL: 3.5, AUT: 1.0, UNI: 1.5, TEO: 1.5, COM: 2.5 };
  SP.FISCAL_MIL_BASE = 1.4;

  const SIN_EJERCITO = (function () {
    const m = {};
    for (const id of SP.FISCAL_SIN_EJERCITO.split(/\s+/)) if (id) m[id] = true;
    return m;
  })();

  SP.fiscalFor = function (c) {
    const gpc = SP.gdpPerCap ? SP.gdpPerCap(c) : 2000;
    const esc = SP.FISCAL_PAIS[c.id] || {};

    let tax = esc.tax, spend = esc.spend;
    if (tax === undefined || spend === undefined) {
      let banda = SP.FISCAL_BANDS[SP.FISCAL_BANDS.length - 1];
      for (const b of SP.FISCAL_BANDS) if (gpc >= b[0]) { banda = b; break; }
      if (tax === undefined) tax = banda[1];
      if (spend === undefined) spend = banda[2];
      /* Los estados petroleros recaudan poco por impuestos porque su renta
         viene del crudo (el petróleo entró flojo en 1990, así que sí llevaban
         déficit, pero no uno imposible). */
      if (c.oil && esc.tax === undefined) tax -= 3;
    }
    /* El comunismo recauda y gasta más: el Estado es la economía */
    const comunista = (c.gov === 'COM' || c.gov === 'UNI') && esc.tax === undefined;
    if (comunista) { tax += 13; spend += 13; }
    if (c.gov === 'AUT' && esc.tax === undefined) { tax += 2; spend += 2; }

    /* Defensa */
    let mil = esc.mil;
    if (mil === undefined) mil = SP.FISCAL_MIL[c.id];
    if (mil === undefined) {
      /* util.js se carga después que este archivo, así que se consulta en el
         momento de la llamada, no al definir la función */
      const cl = SP.util.clamp;
      if (SIN_EJERCITO[c.id]) mil = 0;
      else mil = cl(SP.FISCAL_MIL_BASE + (c.open || 30) / 90 + (SP.FISCAL_MIL_GOV[c.gov] || 0), 0.6, 6);
    }

    /* Inteligencia: la pagan sobre todo las potencias */
    let intel = 0.3 + (gpc > 10000 ? 0.4 : 0.15);
    if (c.gov === 'COM' || c.gov === 'UNI' || c.gov === 'AUT') intel += 0.3;
    if (c.id === 'USA' || c.id === 'URS' || c.id === 'GBR' || c.id === 'ISR') intel += 0.5;

    /* Inversión pública y demás gasto no social: más en los países ricos */
    const other = SP.util.clamp(3 + gpc / 3500, 3, 11);

    /* El gasto social es lo que queda hasta el total de la banda */
    const social = Math.max(2, spend - mil - other - intel);

    return { tax: tax, mil: mil, social: social, other: other, intel: intel, spend: spend };
  };

}(window.SP = window.SP || {}));
