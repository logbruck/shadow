/* =====================================================================
   Shadow President 1990 - Datos del mundo
   ---------------------------------------------------------------------
   Datos aproximados del mundo en enero de 1990.
   Formato de cada línea:  id|nombre|geo|lon|lat|pop|pib|gobierno|bloque|mil|nucleares|estab|region|tags

     geo    : códigos ISO numéricos del mapa (varios separados por ","). Vacío = país sin forma en el mapa (se dibuja un punto).
     pop    : población en millones
     pib    : PIB en miles de millones de dólares de 1990
     gobierno: DEM=democracia, AUT=autocracia, MIL=dictadura militar, COM=comunismo,
               MON=monarquía, TEO=teocracia, UNI=partido único, APR=apartheid
     bloque : OTAN, PVA (Pacto de Varsovia), OCC (aliado de EEUU fuera de la OTAN),
              SOV (aliado soviético), PNA (no alineado), NEU (neutral)
     mil    : índice de poder militar 0-100
     nucleares: ojivas estimadas
     estab  : estabilidad interna 0-100
     tags   : reb:N (insurgencia activa), petro, nuksec (arsenal secreto), unsc (miembro
              permanente del Consejo de Seguridad), potencia, conflicto
   ===================================================================== */
(function (SP) {
  'use strict';

  SP.BLOC_NAMES = {
    OTAN: 'OTAN',
    PVA: 'Pacto de Varsovia',
    OCC: 'Aliado de EEUU',
    SOV: 'Aliado soviético',
    PNA: 'No alineado',
    NEU: 'Neutral'
  };

  SP.GOV_NAMES = {
    DEM: 'Democracia',
    AUT: 'Autocracia',
    MIL: 'Dictadura militar',
    COM: 'Régimen comunista',
    MON: 'Monarquía',
    TEO: 'Teocracia',
    UNI: 'Partido único',
    APR: 'Régimen de apartheid'
  };

  SP.RAW_COUNTRIES = `
USA|Estados Unidos|840|-77.04|38.90|249.6|5970|DEM|OTAN|100|10500|78|Norteamérica|unsc,potencia
CAN|Canadá|124|-75.70|45.42|27.8|590|DEM|OTAN|38|0|82|Norteamérica|
MEX|México|484|-99.13|19.43|83.9|300|AUT|OCC|25|0|62|Norteamérica|petro
GTM|Guatemala|320|-90.53|14.63|9.0|8|MIL|OCC|6|0|38|Centroamérica|reb:45
BLZ|Belice|084|-88.77|17.25|0.19|0.4|DEM|OCC|1|0|65|Centroamérica|
HND|Honduras|340|-87.21|14.07|5.1|4|DEM|OCC|5|0|52|Centroamérica|
SLV|El Salvador|222|-89.19|13.69|5.3|5|DEM|OCC|7|0|30|Centroamérica|reb:70
NIC|Nicaragua|558|-86.25|12.14|3.8|2|DEM|PNA|8|0|40|Centroamérica|reb:40
CRI|Costa Rica|188|-84.09|9.93|3.0|6|DEM|PNA|0|0|85|Centroamérica|
PAN|Panamá|591|-79.53|8.98|2.4|5|DEM|OCC|4|0|45|Centroamérica|
CUB|Cuba|192|-82.38|23.13|10.6|30|COM|SOV|35|0|60|Caribe|
HTI|Haití|332|-72.34|18.54|7.1|3|MIL|PNA|5|0|25|Caribe|reb:40
DOM|República Dominicana|214|-69.90|18.48|7.1|8.5|AUT|OCC|5|0|52|Caribe|
JAM|Jamaica|388|-76.79|18.01|2.4|4.3|DEM|OCC|3|0|58|Caribe|
TTO|Trinidad y Tobago|780|-61.52|10.66|1.2|5.3|DEM|OCC|3|0|60|Caribe|petro
BRB|Barbados||-59.62|13.10|0.26|1.7|DEM|OCC|1|0|80|Caribe|
BHS|Bahamas|044|-77.34|25.05|0.26|3.0|DEM|OCC|1|0|80|Caribe|
GRD|Granada||-61.75|12.05|0.1|0.2|DEM|OCC|1|0|70|Caribe|
BRA|Brasil|076|-47.93|-15.78|149.0|465|DEM|PNA|50|0|60|Sudamérica|potencia
ARG|Argentina|032|-58.40|-34.60|32.6|142|DEM|PNA|35|0|58|Sudamérica|
CHL|Chile|152|-70.65|-33.46|13.0|33|DEM|OCC|22|0|70|Sudamérica|
PER|Perú|604|-77.03|-12.05|21.8|27|DEM|PNA|20|0|42|Sudamérica|reb:55
COL|Colombia|170|-74.07|4.71|34.0|48|DEM|OCC|22|0|45|Sudamérica|reb:55
VEN|Venezuela|862|-66.90|10.50|19.5|48|DEM|PNA|20|0|62|Sudamérica|petro
ECU|Ecuador|218|-78.50|-0.19|10.3|11|DEM|PNA|10|0|60|Sudamérica|
BOL|Bolivia|068|-68.15|-16.50|7.3|4.8|DEM|PNA|8|0|55|Sudamérica|
PRY|Paraguay|600|-57.58|-25.30|4.2|5.0|MIL|PNA|8|0|52|Sudamérica|
URY|Uruguay|858|-56.19|-34.90|3.1|9.2|DEM|PNA|6|0|72|Sudamérica|
GUY|Guyana|328|-58.15|6.80|0.73|0.4|DEM|PNA|3|0|50|Sudamérica|
SUR|Surinam|740|-55.17|5.85|0.42|0.5|MIL|PNA|3|0|40|Sudamérica|
GBR|Reino Unido|826|-0.13|51.51|57.2|940|DEM|OTAN|62|300|78|Europa|unsc,nuksec
FRA|Francia|250,260|2.35|48.86|56.7|1250|DEM|OTAN|64|500|78|Europa|unsc,nuksec
FRG|Alemania Occidental|276|7.10|50.73|62.1|1500|DEM|OTAN|58|0|80|Europa|potencia
GDR|Alemania Oriental|276|13.40|52.52|16.4|160|COM|PVA|40|0|28|Europa|
ITA|Italia|380|12.50|41.90|57.7|1100|DEM|OTAN|55|0|68|Europa|
ESP|España|724|-3.70|40.42|39.0|520|DEM|OTAN|35|0|72|Europa|
PRT|Portugal|620|-9.14|38.72|9.9|115|DEM|OTAN|20|0|75|Europa|
NLD|Países Bajos|528|4.90|52.37|14.9|280|DEM|OTAN|28|0|84|Europa|
BEL|Bélgica|056|4.35|50.85|9.9|200|DEM|OTAN|22|0|80|Europa|
LUX|Luxemburgo|442|6.13|49.61|0.38|10|DEM|OTAN|2|0|85|Europa|
DNK|Dinamarca|208,304|12.57|55.68|5.1|130|DEM|OTAN|14|0|85|Europa|
NOR|Noruega|578|10.75|59.91|4.2|115|DEM|OTAN|18|0|88|Europa|petro
SWE|Suecia|752|18.07|59.33|8.5|240|DEM|NEU|28|0|86|Europa|
FIN|Finlandia|246|24.94|60.17|5.0|135|DEM|NEU|20|0|84|Europa|
ISL|Islandia|352|-21.94|64.15|0.25|6|DEM|OTAN|1|0|88|Europa|
IRL|Irlanda|372|-6.26|53.35|3.5|45|DEM|NEU|8|0|80|Europa|
AUT|Austria|040|16.37|48.21|7.6|160|DEM|NEU|15|0|84|Europa|
CHE|Suiza|756|7.45|46.95|6.7|230|DEM|NEU|20|0|90|Europa|
GRC|Grecia|300|23.73|37.98|10.1|95|DEM|OTAN|25|0|70|Europa|
TUR|Turquía|792|32.85|39.93|56.0|200|DEM|OTAN|45|0|58|Europa|
MLT|Malta||14.51|35.90|0.36|3|DEM|PNA|1|0|80|Europa|
CYP|Chipre|196|33.36|35.17|0.6|6|DEM|PNA|3|0|70|Europa|
URS|Unión Soviética|643,804,112,498,268,051,031,398,417,762,795,860,428,440,233|37.62|55.75|288.6|800|COM|PVA|98|10500|44|Europa|unsc,potencia
POL|Polonia|616|21.01|52.23|38.1|70|COM|PVA|40|0|45|Europa|
CSK|Checoslovaquia|203,703|14.42|50.09|15.6|60|COM|PVA|35|0|55|Europa|
HUN|Hungría|348|19.04|47.50|10.4|35|COM|PVA|25|0|58|Europa|
ROU|Rumania|642|26.10|44.43|23.2|40|COM|PVA|30|0|42|Europa|
BGR|Bulgaria|100|23.32|42.70|8.9|22|COM|PVA|22|0|50|Europa|
ALB|Albania|008|19.82|41.33|3.2|3|COM|NEU|10|0|35|Europa|
YUG|Yugoslavia|688,191,070,705,499,807|20.46|44.80|23.8|60|COM|PNA|45|0|35|Europa|conflicto
ISR|Israel|376|35.21|31.78|4.6|58|DEM|OCC|45|0|62|Oriente Medio|nuksec
EGY|Egipto|818|31.24|30.04|57.0|45|AUT|PNA|42|0|55|Oriente Medio|
SYR|Siria|760|36.29|33.51|12.6|20|AUT|SOV|30|0|55|Oriente Medio|
LBN|Líbano|422|35.50|33.89|2.8|3|DEM|PNA|10|0|22|Oriente Medio|conflicto
JOR|Jordania|400|35.93|31.95|3.2|5|MON|PNA|12|0|62|Oriente Medio|
IRQ|Irak|368|44.36|33.31|18.1|45|AUT|PNA|55|0|50|Oriente Medio|petro
IRN|Irán|364|51.39|35.69|56.0|90|TEO|PNA|48|0|45|Oriente Medio|petro
SAU|Arabia Saudí|682|46.72|24.63|16.0|115|MON|OCC|35|0|70|Oriente Medio|petro
KWT|Kuwait|414|47.98|29.31|2.1|18|MON|OCC|8|0|75|Oriente Medio|petro
ARE|Emiratos Árabes Unidos|784|54.37|24.47|1.9|33|MON|OCC|10|0|78|Oriente Medio|petro
QAT|Catar|634|51.53|25.29|0.5|7|MON|OCC|5|0|80|Oriente Medio|petro
BHR|Bahréin||50.58|26.23|0.5|4|MON|OCC|3|0|70|Oriente Medio|petro
OMN|Omán|512|58.59|23.59|1.8|10|MON|OCC|8|0|75|Oriente Medio|petro
YEM|Yemen|887|44.21|15.35|12.0|8|AUT|PNA|15|0|40|Oriente Medio|
AFG|Afganistán|004|69.18|34.53|15.5|3|COM|NEU|20|0|22|Asia Central|reb:75
PAK|Pakistán|586|73.06|33.69|115.0|45|DEM|OCC|50|0|45|Asia del Sur|nuksec
IND|India|356|77.21|28.61|873.0|320|DEM|PNA|58|0|55|Asia del Sur|potencia
BGD|Bangladés|050|90.41|23.81|115.0|30|DEM|PNA|20|0|45|Asia del Sur|
LKA|Sri Lanka|144|79.86|6.93|17.0|8|DEM|PNA|16|0|38|Asia del Sur|reb:60
NPL|Nepal|524|85.32|27.71|19.2|4|MON|PNA|5|0|55|Asia del Sur|
BTN|Bután|064|89.62|27.47|0.6|0.3|MON|PNA|2|0|70|Asia del Sur|
MDV|Maldivas||73.51|4.17|0.2|0.2|AUT|PNA|1|0|75|Asia del Sur|
MNG|Mongolia|496|106.92|47.92|2.1|2|COM|SOV|8|0|50|Asia Oriental|
CHN|China|156|116.40|39.90|1141.0|400|COM|NEU|72|300|55|Asia Oriental|unsc,potencia,nuksec
TWN|Taiwán|158|121.56|25.03|20.4|160|DEM|OCC|35|0|75|Asia Oriental|
JPN|Japón|392|139.69|35.69|123.5|3100|DEM|OCC|45|0|85|Asia Oriental|potencia
PRK|Corea del Norte|408|125.75|39.03|21.5|25|COM|SOV|45|0|50|Asia Oriental|
KOR|Corea del Sur|410|126.98|37.57|42.9|280|DEM|OCC|45|0|65|Asia Oriental|
VNM|Vietnam|704|105.83|21.03|66.0|15|COM|SOV|40|0|55|Sudeste Asiático|
LAO|Laos|418|102.60|17.97|4.2|1.0|COM|SOV|8|0|55|Sudeste Asiático|
KHM|Camboya|116|104.92|11.56|8.6|1.5|COM|SOV|10|0|25|Sudeste Asiático|reb:60
THA|Tailandia|764|100.50|13.75|55.0|88|DEM|OCC|28|0|65|Sudeste Asiático|
MMR|Birmania|104|96.16|16.80|41.0|12|MIL|PNA|25|0|28|Sudeste Asiático|reb:55
MYS|Malasia|458|101.69|3.14|17.5|44|DEM|PNA|18|0|68|Sudeste Asiático|
SGP|Singapur||103.82|1.29|3.0|36|DEM|OCC|15|0|85|Sudeste Asiático|
IDN|Indonesia|360,626|106.85|-6.21|181.0|115|AUT|PNA|35|0|50|Sudeste Asiático|reb:35
PHL|Filipinas|608|120.98|14.60|61.0|50|DEM|OCC|22|0|45|Sudeste Asiático|reb:45
BRN|Brunéi|096|114.95|4.90|0.26|2.5|MON|OCC|2|0|80|Sudeste Asiático|petro
AUS|Australia|036|149.13|-35.28|17.0|320|DEM|OCC|32|0|85|Oceanía|
NZL|Nueva Zelanda|554|174.78|-41.29|3.4|45|DEM|OCC|10|0|88|Oceanía|
PNG|Papúa Nueva Guinea|598|147.15|-9.48|3.9|3|DEM|PNA|4|0|45|Oceanía|
FJI|Fiyi|242|178.44|-18.14|0.75|1.4|MIL|PNA|2|0|55|Oceanía|
SLB|Islas Salomón|090|159.95|-9.43|0.35|0.3|DEM|PNA|1|0|55|Oceanía|
VUT|Vanuatu|548|168.32|-17.73|0.16|0.2|DEM|PNA|1|0|60|Oceanía|
WSM|Samoa||-171.75|-13.83|0.17|0.2|DEM|PNA|1|0|65|Oceanía|
TON|Tonga||-175.20|-21.14|0.10|0.1|MON|PNA|1|0|70|Oceanía|
KIR|Kiribati||172.98|1.35|0.07|0.06|DEM|PNA|0|0|60|Oceanía|
NRU|Nauru||166.93|-0.53|0.01|0.05|DEM|PNA|0|0|60|Oceanía|
FSM|Micronesia||158.16|6.92|0.11|0.2|DEM|OCC|1|0|65|Oceanía|
MHL|Islas Marshall||171.38|7.09|0.05|0.1|DEM|OCC|1|0|65|Oceanía|
PLW|Palaos||134.48|7.34|0.02|0.1|DEM|OCC|1|0|65|Oceanía|
LBY|Libia|434|13.19|32.89|4.4|25|AUT|SOV|30|0|45|Norte de África|petro
TUN|Túnez|788|10.17|36.80|8.2|13|AUT|PNA|12|0|60|Norte de África|
DZA|Argelia|012|3.05|36.75|25.0|55|AUT|PNA|35|0|45|Norte de África|petro
MAR|Marruecos|504,732|-6.85|33.97|24.5|28|MON|OCC|25|0|60|Norte de África|
SDN|Sudán|729,728|32.53|15.55|24.0|10|MIL|PNA|20|0|30|Norte de África|reb:70
MRT|Mauritania|478|-15.98|18.09|2.0|1.5|MIL|PNA|5|0|50|África Occidental|
ETH|Etiopía|231,232|38.75|9.03|48.0|8|COM|SOV|25|0|28|Cuerno de África|reb:75
SOM|Somalia|706|45.34|2.04|7.0|1.5|MIL|PNA|10|0|15|Cuerno de África|reb:85
DJI|Yibuti|262|43.15|11.59|0.35|0.4|AUT|OCC|2|0|55|Cuerno de África|
KEN|Kenia|404|36.82|-1.29|23.0|9|AUT|OCC|12|0|55|África Oriental|
TZA|Tanzania|834|39.28|-6.16|25.0|5|UNI|PNA|10|0|58|África Oriental|
UGA|Uganda|800|32.58|0.35|17.0|3|MIL|PNA|8|0|40|África Oriental|reb:50
RWA|Ruanda|646|30.06|-1.94|7.1|2.5|MIL|PNA|6|0|32|África Oriental|reb:40
BDI|Burundi|108|29.36|-3.38|5.4|1.5|MIL|PNA|5|0|38|África Oriental|reb:45
COD|Zaire|180|15.31|-4.32|35.0|9|MIL|OCC|15|0|28|África Central|
COG|Congo|178|15.28|-4.26|2.2|2.5|COM|SOV|5|0|45|África Central|petro
CAF|República Centroafricana|140|18.55|4.36|3.0|1.5|MIL|PNA|3|0|35|África Central|
CMR|Camerún|120|11.50|3.85|11.5|11|AUT|OCC|8|0|55|África Central|petro
TCD|Chad|148|15.05|12.11|5.5|1.5|MIL|OCC|6|0|28|África Central|reb:55
GAB|Gabón|266|9.45|0.39|1.1|3.5|AUT|OCC|3|0|60|África Central|petro
GNQ|Guinea Ecuatorial|226|8.78|3.75|0.35|0.15|MIL|PNA|2|0|45|África Central|petro
NGA|Nigeria|566|7.49|9.06|95.0|30|MIL|PNA|25|0|45|África Occidental|petro
GHA|Ghana|288|-0.19|5.60|15.0|6|MIL|PNA|10|0|50|África Occidental|
CIV|Costa de Marfil|384|-5.55|6.83|12.0|10|AUT|OCC|8|0|50|África Occidental|
SEN|Senegal|686|-17.47|14.72|7.5|6|DEM|OCC|6|0|55|África Occidental|
MLI|Malí|466|-8.00|12.65|8.0|2.5|MIL|PNA|5|0|45|África Occidental|
BFA|Burkina Faso|854|-1.52|12.37|9.0|3|MIL|PNA|5|0|45|África Occidental|
NER|Níger|562|2.11|13.51|7.5|2.5|MIL|PNA|4|0|45|África Occidental|
GIN|Guinea|324|-13.71|9.52|5.5|3|MIL|PNA|4|0|40|África Occidental|
GNB|Guinea-Bisáu|624|-15.18|11.80|1.0|0.3|UNI|PNA|2|0|40|África Occidental|reb:45
SLE|Sierra Leona|694|-13.24|8.48|4.0|1.0|UNI|PNA|3|0|35|África Occidental|reb:45
LBR|Liberia|430|-10.80|6.30|2.5|1.0|DEM|PNA|4|0|12|África Occidental|reb:85
TGO|Togo|768|1.22|6.13|3.5|1.5|MIL|PNA|3|0|45|África Occidental|
BEN|Benín|204|2.43|6.37|4.5|2|COM|SOV|3|0|45|África Occidental|
GMB|Gambia|270|-16.58|13.45|0.9|0.3|DEM|PNA|1|0|55|África Occidental|
CPV|Cabo Verde||-23.51|14.93|0.4|0.3|UNI|PNA|1|0|60|África Occidental|
AGO|Angola|024|13.23|-8.83|10.0|7|COM|SOV|15|0|25|África Austral|petro,reb:75
ZMB|Zambia|894|28.28|-15.42|8.0|3|UNI|PNA|5|0|45|África Austral|
ZWE|Zimbabue|716|31.05|-17.83|10.0|6|DEM|PNA|8|0|48|África Austral|
MWI|Malaui|454|33.79|-13.98|9.0|2|UNI|PNA|4|0|50|África Austral|
MOZ|Mozambique|508|32.58|-25.97|14.0|2|COM|PNA|8|0|22|África Austral|reb:75
BWA|Botsuana|072|25.91|-24.65|1.3|3.5|DEM|PNA|3|0|75|África Austral|
NAM|Namibia|516|17.08|-22.56|1.4|2|DEM|PNA|3|0|58|África Austral|
ZAF|Sudáfrica|710|28.19|-25.75|39.0|115|APR|NEU|32|6|38|África Austral|nuksec,conflicto
LSO|Lesoto|426|27.48|-29.31|1.8|0.6|MON|PNA|2|0|55|África Austral|
SWZ|Suazilandia|748|31.14|-26.32|0.8|0.7|MON|PNA|2|0|60|África Austral|
MDG|Madagascar|450|47.52|-18.88|12.0|3|DEM|PNA|5|0|50|África Oriental|
MUS|Mauricio||57.50|-20.17|1.1|2.5|DEM|PNA|2|0|70|África Oriental|
SYC|Seychelles||55.45|-4.62|0.07|0.35|AUT|PNA|1|0|65|África Oriental|
COM|Comoras||43.26|-11.70|0.5|0.25|MIL|PNA|1|0|50|África Oriental|
`;

  /* Nombre de la capital de cada país. En el mapa se escribe junto al punto
     exacto de la capital (las coordenadas de la tabla de países son las de la
     capital) y solo aparece cuando te acercas lo suficiente. Son las capitales
     de 1990: Bonn, Berlín Oriental, Rangún, Kinshasa (Zaire)... */
  SP.CAPITALS = {
    USA: 'Washington', CAN: 'Ottawa', MEX: 'Ciudad de México', GTM: 'Ciudad de Guatemala',
    BLZ: 'Belmopán', HND: 'Tegucigalpa', SLV: 'San Salvador', NIC: 'Managua',
    CRI: 'San José', PAN: 'Panamá', CUB: 'La Habana', HTI: 'Puerto Príncipe',
    DOM: 'Santo Domingo', JAM: 'Kingston', TTO: 'Puerto España', BRB: 'Bridgetown',
    BHS: 'Nasáu', GRD: "Saint George's", BRA: 'Brasilia', ARG: 'Buenos Aires',
    CHL: 'Santiago', PER: 'Lima', COL: 'Bogotá', VEN: 'Caracas', ECU: 'Quito',
    BOL: 'La Paz', PRY: 'Asunción', URY: 'Montevideo', GUY: 'Georgetown', SUR: 'Paramaribo',
    GBR: 'Londres', FRA: 'París', FRG: 'Bonn', GDR: 'Berlín Oriental', ITA: 'Roma',
    ESP: 'Madrid', PRT: 'Lisboa', NLD: 'Ámsterdam', BEL: 'Bruselas', LUX: 'Luxemburgo',
    DNK: 'Copenhague', NOR: 'Oslo', SWE: 'Estocolmo', FIN: 'Helsinki', ISL: 'Reikiavik',
    IRL: 'Dublín', AUT: 'Viena', CHE: 'Berna', GRC: 'Atenas', TUR: 'Ankara',
    MLT: 'La Valeta', CYP: 'Nicosia', URS: 'Moscú', POL: 'Varsovia', CSK: 'Praga',
    HUN: 'Budapest', ROU: 'Bucarest', BGR: 'Sofía', ALB: 'Tirana', YUG: 'Belgrado',
    ISR: 'Jerusalén', EGY: 'El Cairo', SYR: 'Damasco', LBN: 'Beirut', JOR: 'Amán',
    IRQ: 'Bagdad', IRN: 'Teherán', SAU: 'Riad', KWT: 'Ciudad de Kuwait', ARE: 'Abu Dabi',
    QAT: 'Doha', BHR: 'Manama', OMN: 'Mascate', YEM: 'Saná', AFG: 'Kabul',
    PAK: 'Islamabad', IND: 'Nueva Delhi', BGD: 'Daca', LKA: 'Colombo', NPL: 'Katmandú',
    BTN: 'Timbu', MDV: 'Malé', MNG: 'Ulán Bator', CHN: 'Pekín', TWN: 'Taipéi',
    JPN: 'Tokio', PRK: 'Pionyang', KOR: 'Seúl', VNM: 'Hanói', LAO: 'Vientián',
    KHM: 'Phnom Penh', THA: 'Bangkok', MMR: 'Rangún', MYS: 'Kuala Lumpur', SGP: 'Singapur',
    IDN: 'Yakarta', PHL: 'Manila', BRN: 'Bandar Seri Begawan', AUS: 'Canberra', NZL: 'Wellington',
    PNG: 'Port Moresby', FJI: 'Suva', SLB: 'Honiara', VUT: 'Port Vila', WSM: 'Apia',
    TON: 'Nukualofa', KIR: 'Tarawa', NRU: 'Yaren', FSM: 'Palikir', MHL: 'Majuro', PLW: 'Koror',
    LBY: 'Trípoli', TUN: 'Túnez', DZA: 'Argel', MAR: 'Rabat', SDN: 'Jartum',
    MRT: 'Nuakchot', ETH: 'Adís Abeba', SOM: 'Mogadiscio', DJI: 'Yibuti', KEN: 'Nairobi',
    TZA: 'Dodoma', UGA: 'Kampala', RWA: 'Kigali', BDI: 'Buyumbura', COD: 'Kinshasa',
    COG: 'Brazzaville', CAF: 'Bangui', CMR: 'Yaundé', TCD: 'Yamena', GAB: 'Libreville',
    GNQ: 'Malabo', NGA: 'Lagos', GHA: 'Acra', CIV: 'Yamusukro', SEN: 'Dakar', MLI: 'Bamako',
    BFA: 'Uagadugú', NER: 'Niamey', GIN: 'Conakri', GNB: 'Bisáu', SLE: 'Freetown',
    LBR: 'Monrovia', TGO: 'Lomé', BEN: 'Porto-Novo', GMB: 'Banjul', CPV: 'Praia',
    AGO: 'Luanda', ZMB: 'Lusaka', ZWE: 'Harare', MWI: 'Lilongwe', MOZ: 'Maputo',
    BWA: 'Gaborone', NAM: 'Windhoek', ZAF: 'Pretoria', LSO: 'Maseru', SWZ: 'Mbabane',
    MDG: 'Antananarivo', MUS: 'Port Louis', SYC: 'Victoria', COM: 'Moroni'
  };

  /* Territorios del mapa sin país propio: se asignan a un estado.
     key = id ISO del mapa, value = id del país dueño. */
  SP.MAP_OWNERS = {
    '010': null,        // Antártida
    /* microestados: el mapa de 110m no los trae, pero aquí quedan asignados
       para que aparezcan con su color y se puedan seleccionar */
    '048': 'BHR',       // Bahréin
    '052': 'BRB',       // Barbados
    '132': 'CPV',       // Cabo Verde
    '174': 'COM',       // Comoras
    '296': 'KIR',       // Kiribati
    '308': 'GRD',       // Granada
    /* '462' (Maldivas) se deja fuera a propósito: su forma en el atlas está
       mal cerrada y el mapa la dibujaría tapando el mundo entero. El país
       sigue apareciendo con su punto. */
    '470': 'MLT',       // Malta
    '480': 'MUS',       // Mauricio
    '520': 'NRU',       // Nauru
    '583': 'FSM',       // Micronesia
    '584': 'MHL',       // Islas Marshall
    '585': 'PLW',       // Palaos
    '690': 'SYC',       // Seychelles
    '702': 'SGP',       // Singapur
    '776': 'TON',       // Tonga
    '882': 'WSM',       // Samoa
    '238': 'GBR',       // Malvinas
    '275': 'ISR',       // Cisjordania y Gaza (ocupadas en 1990)
    '304': 'DNK',       // Groenlandia
    '630': 'USA',       // Puerto Rico
    '540': 'FRA',       // Nueva Caledonia
    '732': 'MAR',       // Sáhara Occidental
    '626': 'IDN',       // Timor Oriental (ocupado)
    '232': 'ETH',       // Eritrea
    '728': 'SDN',       // Sur de Sudán
    /* territorios de ultramar: los mapas detallados los dibujan aparte de su
       metrópoli, y sin esto saldrían como manchas oscuras en medio del mar */
    '016': 'USA',       // Samoa Americana
    '316': 'USA',       // Guam
    '580': 'USA',       // Islas Marianas del Norte
    '581': 'USA',       // Islas menores de EE.UU.
    '850': 'USA',       // Islas Vírgenes de EE.UU.
    '060': 'GBR',       // Bermudas
    '086': 'GBR',       // Territorio Británico del Océano Índico
    '092': 'GBR',       // Islas Vírgenes Británicas
    '136': 'GBR',       // Islas Caimán
    '500': 'GBR',       // Montserrat
    '612': 'GBR',       // Islas Pitcairn
    '654': 'GBR',       // Santa Elena
    '660': 'GBR',       // Anguila
    '796': 'GBR',       // Turcas y Caicos
    '831': 'GBR',       // Guernsey
    '832': 'GBR',       // Jersey
    '833': 'GBR',       // Isla de Man
    '344': 'GBR',       // Hong Kong (británico hasta 1997)
    '239': 'GBR',       // Georgia del Sur
    '292': 'GBR',       // Gibraltar
    '666': 'FRA',       // San Pedro y Miquelón
    '876': 'FRA',       // Wallis y Futuna
    '663': 'FRA',       // San Martín
    '652': 'FRA',       // San Bartolomé
    '258': 'FRA',       // Polinesia Francesa
    '533': 'NLD',       // Aruba
    '531': 'NLD',       // Curazao
    '534': 'NLD',       // Sint Maarten
    '234': 'DNK',       // Islas Feroe
    '574': 'AUS',       // Isla Norfolk
    '334': 'AUS',       // Islas Heard y McDonald
    '570': 'NZL',       // Niue
    '184': 'NZL',       // Islas Cook
    '248': 'FIN',       // Åland
    '446': 'PRT'        // Macao (portugués hasta 1999)
  };

  /* Formas del mapa sin código ISO: se identifican por nombre. */
  SP.MAP_OWNERS_BY_NAME = {
    'Kosovo': 'YUG',
    'N. Cyprus': 'CYP',
    'Somaliland': 'SOM',
    'Indian Ocean Ter.': 'GBR',
    'Akrotiri': 'GBR',        // bases británicas en Chipre
    'Dhekelia': 'GBR',
    'Clipperton I.': 'FRA',   // islote francés del Pacífico
    'Coral Sea Is.': 'AUS'
  };

  /* Reparto de un mismo territorio entre dos países (Alemania 1990).
     El mapa moderno trae una sola Alemania; se dibuja partida por el meridiano. */
  SP.GEO_SPLITS = { '276': { lon: 10.8, west: 'FRG', east: 'GDR' } };

  /* Relaciones bilaterales iniciales (0-100). Se definen las parejas importantes;
     el resto se calcula a partir de los bloques. */
  SP.RAW_RELATIONS = `
USA URS -85|USA CUB -80|USA NIC -45|USA PAN -35|USA LBY -70|USA IRN -75|USA IRQ 20|USA PRK -60
USA ISR 80|USA SAU 65|USA JPN 70|USA GBR 85|USA FRG 80|USA KOR 70|USA TWN 75|USA EGY 45
USA PAK 55|USA IND 30|USA CHN -25|USA MEX 55|USA CAN 88|USA PHL 50|USA THA 45|USA AUS 70
USA NZL 50|USA ZAF 20|USA VNM -40|USA MMR -30|USA KHM -30|USA AFG -25|USA YUG 15|USA ALB -40
USA COD 25|USA KEN 40|USA SOM 10|USA SDN -40|USA ETH -20|USA AGO -30|USA MOZ 15|USA LBR 20
URS CHN -45|URS JPN -40|URS ISR -50|URS CUB 85|URS VNM 70|URS IND 45|URS IRQ 30|URS LBY 60
URS SYR 70|URS PRK 60|URS KOR -40|URS AFG -55|URS IRN 20|URS SAU -45|URS PAK -25|URS YUG 15
URS CSK 20|URS POL 10|URS HUN 20|URS BGR 60|URS ROU 25|URS GDR 70|URS FIN 30|URS EGY 10
URS ETH 55|URS AGO 55|URS MOZ 40|URS NIC 45|URS LBR 0|URS KHM 60|URS LAO 70|URS MNG 75
URS BEN 35|URS COG 40|URS SOM 25|URS YEM 40|URS LKA 20|URS TUR -20|URS NOR -15
CHN VNM -55|CHN TWN -70|CHN IND -30|CHN JPN -10|CHN KOR -20|CHN PAK 60|CHN MMR 35|CHN THA 10
CHN PRK 40|CHN MNG 15|CHN LKA 25|CHN BGD 30|CHN NPL 40|CHN KHM -50|CHN AUS 10|CHN USA -25
IND PAK -75|IND BGD -20|IND LKA -25|IND NPL 45|IND BTN 40|IND MMR 20|IND CHN -30|IND MDV 30
ISR EGY 10|ISR SYR -85|ISR JOR -10|ISR LBN -50|ISR IRQ -85|ISR IRN -60|ISR SAU -35|ISR TUR 30
ISR USA 80|ISR ZAF -30|ISR URS -50|ISR IND 10|ISR ETH -20
IRQ IRN -70|IRQ KWT -35|IRQ SAU -20|IRQ SYR -60|IRQ TUR -20|IRQ JOR -15|IRQ ARE -20
IRQ EGY -25|IRQ LBY 10|IRQ USA 20|IRQ URS 30|IRQ FRA 35|IRQ GBR 25
IRN SAU -40|IRN KWT -20|IRN ARE -30|IRN TUR 5|IRN PAK 15|IRN AFG 25|IRN LBY 10|IRN SYR 35
SAU JOR 40|SAU EGY 35|SAU KWT 70|SAU ARE 65|SAU QAT 65|SAU BHR 55|SAU OMN 60|SAU YEM -15
TUR GRC -55|TUR SYR -50|TUR IRQ -20|TUR BGR -30|TUR IRN 5|TUR USA 55|TUR FRG 45
GRC ALB -45|GRC TUR -55|GRC YUG -20|GRC BGR -15|GRC USA 55|GRC FRG 45
YUG ALB -60|YUG ITA 10|YUG AUT 25|YUG HUN 10|YUG GRC -20|YUG URS 15|YUG USA 15|YUG FRG 35
POL FRG 30|POL URS 10|POL CSK 25|POL HUN 20|POL USA 30|POL GBR 25|POL FRA 30
CSK FRG 40|CSK AUT 35|CSK HUN 30|CSK POL 25|CSK USA 25
HUN FRG 40|HUN AUT 45|HUN ITA 35|HUN ROU -30|HUN CSK 30|HUN POL 20|HUN USA 30
ROU FRG 25|ROU HUN -30|ROU URS 25|ROU BGR 30|ROU YUG 15|ROU USA 15
BGR GRC -15|BGR TUR -30|BGR ROU 30|BGR YUG 20|BGR URS 60|BGR GRC -15
ALB ITA 20|ALB GRC -45|ALB YUG -60|ALB URS -10|ALB CHN 25
FRG GDR -50|FRG FRA 80|FRG GBR 70|FRG ITA 70|FRG NLD 80|FRG POL 30|FRG CSK 40|FRG HUN 40
FRG URS 25|FRG USA 80|FRG AUT 55|FRG CHE 55|FRG DNK 75|FRG DZA 20|FRG TUR 45
GDR URS 70|GDR POL 30|GDR CSK 35|GDR HUN 25|GDR AUT 20|GDR FRG -50
PRK KOR -80|PRK JPN -55|PRK CHN 40|PRK URS 60|PRK USA -60
KOR JPN -15|KOR CHN -20|KOR USA 70|KOR URS -40
JPN CHN -10|JPN KOR -15|JPN URS -40|JPN USA 70|JPN AUS 55|JPN TWN 40|JPN IDN 30
VNM KHM -50|VNM CHN -55|VNM LAO 70|VNM THA -30|VNM USA -40|VNM URS 70|VNM PHL -10
THA KHM -30|THA LAO -10|THA MMR -20|THA MYS 30|THA VNM -30|THA USA 45
MMR THA -20|MMR IND 20|MMR BGD -25|MMR CHN 35
MYS SGP 30|MYS IDN -15|MYS PHL -10|MYS THA 30|MYS BRN 30|MYS VNM -10
IDN PNG 15|IDN AUS -10|IDN MYS -15|IDN PHL 10|IDN NLD -15|IDN SGP 25
PHL USA 50|PHL JPN 40|PHL VNM -10|PHL MYS -10
ARG GBR -40|ARG BRA 35|ARG CHL 15|ARG URY 40|ARG PRY 30|ARG USA 30|ARG URS 15|ARG PER 20
BRA ARG 35|BRA URY 40|BRA PRY 30|BRA CHL 25|BRA PER 25|BRA COL 25|BRA VEN 30|BRA USA 40|BRA URS 10
CHL ARG 15|CHL BRA 25|CHL PER 10|CHL USA 45|CHL GBR 35
PER ECU -40|PER CHL 10|PER BOL 20|PER BRA 25|PER USA 30|PER URS 15|PER COL 15
COL VEN -15|COL ECU 30|COL BRA 25|COL PAN 25|COL USA 45|COL CUB -30|COL NIC -25
VEN GUY -40|VEN COL -15|VEN BRA 30|VEN TTO 40|VEN USA 40|VEN CUB -20
ECU PER -40|ECU COL 30
BOL PER 20|BOL CHL 15|BOL BRA 25|BOL USA 20
PRY BRA 30|PRY ARG 30|PRY URY 25
URY ARG 40|URY BRA 40|URY PRY 25
GTM BLZ -40|GTM MEX 30|GTM USA 25|GTM HND 20|GTM SLV 20
HND SLV -20|HND NIC -35|HND GTM 20|HND USA 40|HND CUB -35
SLV NIC -20|SLV CUB -45|SLV USA 45|SLV GTM 20|SLV HND -20
NIC CUB 40|NIC USA -40|NIC URS 40|NIC SLV -20|NIC HND -35|NIC CRI -15
CRI NIC -15|CRI PAN 30|CRI USA 45
PAN CRI 30|PAN USA -25|PAN COL 25|PAN CUB -15
CUB URS 85|CUB NIC 40|CUB AGO 45|CUB ETH 35|CUB VNM 45|CUB MEX 20|CUB CAN 20|CUB ESP 20
HTI DOM -20|HTI USA 10|HTI FRA 20
DOM HTI -20|DOM USA 45
MAR DZA -45|MAR ESP 25|MAR FRA 40|MAR USA 40|MAR MRT 10
DZA FRA 25|DZA LBY 20|DZA TUN 30|DZA URS 35|DZA MAR -45
TUN FRA 40|TUN ITA 35|TUN LBY -25|TUN DZA 30
LBY TCD -50|LBY EGY -30|LBY SDN -25|LBY TUN -25|LBY NGA -15|LBY FRA -40|LBY GBR -50|LBY ITA -20
EGY SDN -30|EGY LBY -30|EGY USA 45|EGY SAU 35|EGY ISR 10|EGY SYR -35|EGY IRQ -25
SDN ETH -40|SDN EGY -30|SDN UGA -25|SDN TCD -30|SDN LBY -25
ETH SDN -40|ETH SOM -60|ETH KEN 20|ETH URS 55|ETH USA -20|ETH CUB 35
SOM ETH -60|SOM KEN -40|SOM ITA 15|SOM USA 10
KEN UGA 10|KEN TZA 25|KEN SOM -40|KEN ETH 20|KEN GBR 40
UGA RWA -30|UGA KEN 10|UGA TZA 20|UGA SDN -25|UGA COD 0|UGA LBY -30
RWA UGA -30|RWA BDI -30|RWA FRA 30|RWA BEL 25
BDI RWA -30|BDI TZA 10
TZA UGA 20|TZA KEN 25|TZA MOZ 15|TZA ZMB 20|TZA URS 10|TZA CHN 35
AGO ZAF -50|AGO CUB 45|AGO URS 55|AGO USA -30|AGO ZAI -30|AGO NAM 10|AGO COD -30
ZAF AGO -50|ZAF CUB -40|ZAF NAM 10|ZAF MOZ -20|ZAF ZWE -20|ZAF USA 20|ZAF GBR 30|ZAF ISR -30|ZAF NGA 15
MOZ ZAF -20|MOZ ZWE 35|MOZ TZA 15|MOZ URS 40|MOZ USA 15|MOZ MWI 10|MOZ PRT 20
ZWE ZAF -20|ZWE MOZ 35|ZWE ZMB 30|ZWE GBR 25|ZWE CHN 30
ZMB ZWE 30|ZMB TZA 20|ZMB ZAI 20|ZMB AGO 10|ZMB MWI 20
MWI MOZ 10|MWI ZMB 20|MWI TZA 15|MWI ZAF 10
COD UGA 0|COD RWA 15|COD AGO -30|COD COG 15|COD USA 25|COD BEL 25|COD FRA 25|COD ZMB 20
COG COD 15|COG GAB 30|COG CMR 30|COG FRA 45|COG URS 40|COG AGO 25
CMR NGA -20|CMR GAB 30|CMR COG 30|CMR TCD -20|CMR FRA 50
TCD LBY -50|TCD SDN -30|TCD CMR -20|TCD NGA 10|TCD FRA 35|TCD USA 10
NGA CMR -20|NGA GHA 25|NGA BEN 25|NGA NER 15|NGA GBR 35|NGA USA 30|NGA LBY -15
GHA CIV 30|GHA TGO 25|GHA NGA 25|GHA BFA 20|GHA GBR 35
CIV BFA 25|CIV GHA 30|CIV MLI 25|CIV GIN 25|CIV FRA 50|CIV LBR 10
SEN MLI 25|SEN MRT -30|SEN GMB 35|SEN GNB 25|SEN FRA 55|SEN USA 25
MLI BFA 30|MLI SEN 25|MLI GIN 25|MLI NER 25|MLI CIV 25|MLI DZA 20|MLI FRA 35
BFA GHA 20|BFA MLI 30|BFA CIV 25|BFA NER 20|BFA TGO 20|BFA FRA 35|BFA LBY 20
NER NGA 15|NER MLI 25|NER DZA 15|NER LBY 20|NER FRA 35|NER TCD 10
GIN SEN 25|GIN MLI 25|GIN CIV 25|GIN LBR 15|GIN FRA 40|GIN SLE 20
SLE LBR 20|SLE GIN 20|SLE GBR 30|SLE NGA 15
LBR GIN 15|LBR SLE 20|LBR CIV 10|LBR USA 20|LBR NGA 15
AFG PAK -30|AFG IRN 25|AFG URS -55|AFG IND 20|AFG USA -25|AFG SAU 25
PAK IND -75|PAK AFG -30|PAK CHN 60|PAK SAU 50|PAK IRN 15|PAK USA 55|PAK BGD 10|PAK GBR 30
BGD IND -20|BGD PAK 10|BGD CHN 30|BGD MMR -25|BGD USA 25
LKA IND -25|LKA PAK 10|LKA CHN 25|LKA USA 25
NPL IND 45|NPL CHN 40|NPL BTN 40|NPL GBR 35
MNG URS 75|MNG CHN 15|MNG JPN 20
YEM SAU -15|YEM URS 40|YEM USA 10|YEM IRQ 10|YEM ETH 0
`;

  /* Conflictos abiertos en enero de 1990 */
  SP.RAW_WARS = `
AFG AFG:rebeldes 75 insurgencia Sur y este del país en manos de la guerrilla muyahidín.
MOZ MOZ:rebeldes 70 insurgencia RENAMO controla buena parte del interior.
AGO AGO:rebeldes 75 insurgencia UNITA sigue combatiendo con apoyo sudafricano.
ETH ETH:rebeldes 75 civil Frentes de Eritrea y Tigray avanzan sobre el gobierno de Mengistu.
SOM SOM:rebeldes 85 civil Los clanes armados han desmembrado el Estado.
SDN SDN:rebeldes 70 civil El Ejército Popular de Liberación del Sudán controla el sur.
LBR LBR:rebeldes 85 civil NPFL de Charles Taylor controla casi todo el país.
KHM KHM:rebeldes 60 civil Los jemeres rojos y la resistencia operan en la frontera.
SLV SLV:rebeldes 70 civil El FMLN mantiene la ofensiva tras la ofensiva de 1989.
NIC NIC:rebeldes 40 insurgencia La Contra se desmoviliza lentamente tras los acuerdos.
PER PER:rebeldes 55 insurgencia Sendero Luminoso actúa en Ayacucho y la selva.
COL COL:rebeldes 55 insurgencia Narcotráfico, FARC y ELN controlan zonas rurales.
PHL PHL:rebeldes 45 insurgencia El NPA comunista y grupos separatistas musulmanes.
LKA LKA:rebeldes 60 civil Los Tigres Tamiles controlan el norte de la isla.
MMR MMR:rebeldes 55 insurgencia Ejércitos étnicos y el partido comunista en la frontera.
IDN IDN:rebeldes 35 insurgencia Aceh y Timor Oriental bajo ocupación militar.
LBN LBN:rebeldes 80 civil Guerra civil abierta entre milicias y ocupación siria.
GTM GTM:rebeldes 45 insurgencia La URNG sigue activa en las montañas.
TCD TCD:rebeldes 55 insurgencia Rebeldes apoyados por Libia en el norte.
SLE SLE:rebeldes 40 insurgencia Tensión en las zonas diamantíferas.
UGA UGA:rebeldes 50 insurgencia El Ejército de Resistencia del Señor y otros grupos.
RWA RWA:rebeldes 40 insurgencia El FPR exiliado presiona desde Uganda.
BDI BDI:rebeldes 45 insurgencia Violencia étnica tras las matanzas de 1988.
YUG YUG:rebeldes 30 — Repúblicas y minorías desafían al gobierno federal.
ZAF ZAF:rebeldes 45 — El ANC y el movimiento antiapartheid desestabilizan el régimen.
`;

  /* Alianzas y tratados al empezar la partida */
  SP.RAW_ALLIANCES = [
    ['OTAN', ['USA', 'CAN', 'GBR', 'FRA', 'FRG', 'ITA', 'ESP', 'PRT', 'NLD', 'BEL', 'LUX', 'DNK', 'NOR', 'ISL', 'GRC', 'TUR']],
    ['Pacto de Varsovia', ['URS', 'POL', 'CSK', 'HUN', 'ROU', 'BGR', 'GDR']],
    ['Consejo de Cooperación del Golfo', ['SAU', 'KWT', 'ARE', 'QAT', 'BHR', 'OMN']],
    ['ANZUS', ['USA', 'AUS', 'NZL']],
    ['Tratado de Río', ['USA', 'MEX', 'BRA', 'ARG', 'CHL', 'COL', 'VEN', 'PER', 'ECU', 'BOL', 'PRY', 'URY', 'PAN', 'CRI', 'HND', 'GTM', 'SLV', 'NIC', 'DOM', 'HTI', 'TTO', 'BHS']],
    ['Comunidad Económica', ['FRG', 'FRA', 'ITA', 'NLD', 'BEL', 'LUX', 'GBR', 'IRL', 'DNK', 'ESP', 'PRT', 'GRC']]
  ];

  /* Relaciones base entre bloques */
  SP.BLOC_BASE = {
    'OTAN|OTAN': 75, 'OTAN|PVA': -70, 'OTAN|OCC': 55, 'OTAN|SOV': -55, 'OTAN|PNA': 5, 'OTAN|NEU': 25,
    'PVA|PVA': 70, 'PVA|OCC': -50, 'PVA|SOV': 65, 'PVA|PNA': -5, 'PVA|NEU': 0,
    'OCC|OCC': 45, 'OCC|SOV': -40, 'OCC|PNA': 15, 'OCC|NEU': 25,
    'SOV|SOV': 65, 'SOV|PNA': 10, 'SOV|NEU': 10,
    'PNA|PNA': 15, 'PNA|NEU': 20,
    'NEU|NEU': 35
  };

  SP.BLOC_COLORS = {
    OTAN: '#3b7dd8',
    PVA: '#c8443c',
    OCC: '#6fa8dc',
    SOV: '#d98880',
    PNA: '#7fb069',
    NEU: '#b8b8a0'
  };

  SP.REGIONS = [
    'Norteamérica', 'Centroamérica', 'Caribe', 'Sudamérica', 'Europa', 'Oriente Medio',
    'Asia Central', 'Asia del Sur', 'Asia Oriental', 'Sudeste Asiático', 'Oceanía',
    'Norte de África', 'África Occidental', 'África Central', 'África Oriental',
    'Cuerno de África', 'África Austral'
  ];
}(window.SP = window.SP || {}));
