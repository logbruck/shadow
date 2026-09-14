/* Comprobador del motor político (src/data/politics1990.js y src/sim/politics.js).
   Uso:  node tools/check-politics.js

   La política interior tiene que ser un modelo, no un adorno: cada país con su
   parlamento, cada escaño contado y cada elección decidida por lo que pasa en
   el país. Aquí se comprueba, en orden:

     1. Los partidos de partida de 1990 están bien escritos (familias, regiones
        y tipos de gobierno cubiertos, el que gobierna el primero).
     2. Cada parlamento cuadra: los escaños suman el tamaño de la cámara, nadie
        tiene escaños negativos y siempre hay alguien que gobierna.
     3. El reparto de escaños (restos mayores) nunca pierde ni inventa escaños.
     4. El descontento responde: sube con el paro, la inflación y los escándalos
        y baja con el crecimiento.
     5. Las elecciones castigan al gobierno que lo hace mal y premian al que lo
        hace bien, y el tema dominante decide QUÉ oposición gana.
     6. Perder la mayoría abre una investidura: pactar con un socio, gobernar en
        minoría o dimitir, y cada opción deja las cuentas donde dice.
     7. El presupuesto mueve a la oposición: recortar lo social, subir impuestos
        o tocar la defensa cambia el pulso y las posibilidades electorales.
     8. La moción de censura: sin mayoría ni tensión no hay moción; con las dos
        cosas, sí, y ganarla o perderla hace lo que promete.
     9. Gobernar con mayoría da más capital político que gobernar en minoría.
    10. Las palancas del jugador (pacto, ruptura, discurso, adelanto) respetan
        sus costes, sus requisitos y sus topes.
    11. La partida aguanta once años: los parlamentos siguen cuadrando, los
        gobiernos cambian y nadie se queda sin partido.
    12. Guardar, cargar y migrar una partida vieja reconstruye los parlamentos. */

'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

global.window = {};
for (const f of [
  'src/data/world1990.js', 'src/data/timeline.js', 'src/data/events.js', 'src/data/events-pais.js',
  'src/data/econ1990.js', 'src/data/politics1990.js', 'src/data/society1990.js', 'src/data/transition1990.js', 'src/data/groups1990.js', 'src/data/cabinet1990.js',
  'src/sim/util.js', 'src/sim/state.js', 'src/sim/economy.js', 'src/sim/society.js', 'src/sim/transition.js', 'src/sim/war.js',
  'src/sim/trade.js', 'src/sim/sanctions.js', 'src/sim/diplomacy.js', 'src/sim/politics.js', 'src/sim/groups.js', 'src/sim/cabinet.js',
  'src/sim/ai.js', 'src/sim/actions.js', 'src/sim/engine.js'
]) {
  eval(fs.readFileSync(path.join(root, f), 'utf8'));
}
const SP = global.window.SP;
const P = SP.Politics;

const problemas = [];
function check(cond, msg) { if (!cond) problemas.push(msg); }

SP.util.seed(19900101);

function juego(player) {
  const st = SP.createState({ player: player || 'ESP', difficulty: 'normal' });
  SP.initState(st);
  return st;
}

function dias(st, n) {
  for (let i = 0; i < n && !st.over; i++) {
    SP.tick(st);
    let g = 0;
    while (st.pendingEvents.length && g++ < 20) SP.resolveChoice(st, 0, 0);
  }
}

/* ============================ 1. datos de 1990 ============================ */

const familias = Object.keys(SP.PARTY_FAMS);
check(familias.length >= 8, 'Faltan familias políticas: solo hay ' + familias.length);
for (const f of familias) {
  const fam = SP.PARTY_FAMS[f];
  check(!!fam.label, 'La familia ' + f + ' no tiene etiqueta.');
  check(/^#[0-9a-f]{6}$/i.test(fam.color || ''), 'La familia ' + f + ' no tiene color válido.');
  check(isFinite(fam.pos) && fam.pos >= 0 && fam.pos <= 10, 'La familia ' + f + ' no tiene posición.');
}

const escritos = SP.polHandWritten();
check(escritos.length >= 30, 'Solo hay ' + escritos.length + ' países con partidos escritos a mano.');

/* Todas las regiones y todos los regímenes tienen plantilla */
const regiones = ['Norteamérica', 'Centroamérica', 'Caribe', 'Sudamérica', 'Europa', 'Oriente Medio',
  'Asia Central', 'Asia del Sur', 'Asia Oriental', 'Sudeste Asiático', 'Oceanía', 'Norte de África',
  'África Occidental', 'África Central', 'África Oriental', 'Cuerno de África', 'África Austral', 'Otros'];
for (const r of regiones) {
  check(!!SP.PARTY_REGION[r], 'La región ' + r + ' no tiene plantilla de partidos.');
}
for (const g of ['DEM', 'AUT', 'MIL', 'COM', 'MON', 'TEO', 'UNI', 'APR']) {
  check(!!SP.PARTY_GOV[g], 'El régimen ' + g + ' no tiene plantilla de partidos.');
}

/* Las plantillas solo usan familias conocidas y posiciones válidas */
for (const [nombre, clave] of [['región', SP.PARTY_REGION], ['régimen', SP.PARTY_GOV]]) {
  for (const k in clave) {
    for (const trozo of clave[k].split(';')) {
      const f = trozo.trim().split(':');
      check(!!SP.PARTY_FAMS[f[0]], 'La plantilla de ' + nombre + ' ' + k + ' usa una familia desconocida: ' + f[0]);
      const pos = parseFloat(f[1]);
      check(isFinite(pos) && pos >= 0 && pos <= 10, 'La plantilla de ' + nombre + ' ' + k + ' tiene una posición inválida: ' + trozo);
    }
  }
}

/* ====================== 2. cada parlamento cuadra ====================== */

const st0 = juego('ESP');
let malos = 0, sinParlamento = 0, sinMayoriaDePartida = 0;
for (const id of st0.order) {
  const c = st0.countries[id];
  if (!c.alive) continue;
  if (!c.parties || c.parties.length < 2) { sinParlamento++; continue; }
  let suma = 0;
  for (const q of c.parties) {
    suma += q.seats;
    if (!isFinite(q.seats) || q.seats < 0) malos++;
    if (!SP.PARTY_FAMS[q.fam]) malos++;
    if (!isFinite(q.pos) || q.pos < 0 || q.pos > 10) malos++;
    if (!q.name) malos++;
  }
  if (suma !== c.chamber) malos++;
  if (!c.parties[c.govParty] || !c.parties[c.govParty].gov) malos++;
  if (c.chamber < 5) malos++;
  if (!P.hasMajority(c)) sinMayoriaDePartida++;
}
check(sinParlamento === 0, sinParlamento + ' países se quedan sin parlamento.');
check(malos === 0, malos + ' parlamentos no cuadran (escaños, familias o gobierno).');
check(sinMayoriaDePartida <= 12, sinMayoriaDePartida + ' países empiezan gobernando en minoría: demasiados para un mundo de 1990.');
console.log('Parlamentos montados: ' + st0.order.length + ' países · ' +
  'empiezan en minoría: ' + sinMayoriaDePartida);

/* ====================== 2.b las fechas electorales de verdad ====================== */

{
  const fechas = SP.ELEC_1990 || {};
  const ids = Object.keys(fechas);
  check(ids.length >= 30, 'Solo hay ' + ids.length + ' fechas electorales históricas: el mundo vota en fechas inventadas.');
  const inicio = new Date(SP.START_DATE + 'T00:00:00');
  for (const id of ids) {
    const c = st0.countries[id];
    check(!!c, 'La fecha electoral de ' + id + ' es de un país que no existe.');
    const d = new Date(fechas[id] + 'T00:00:00');
    check(!isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(fechas[id]),
      'La fecha electoral de ' + id + ' no está en formato AAAA-MM-DD: ' + fechas[id]);
    check(d > inicio, 'La fecha electoral de ' + id + ' no es posterior al inicio de la partida.');
  }
  /* Los países que votan reciben su fecha histórica, no un sorteo */
  const conocidos = { ESP: '1993-06-06', USA: '1992-11-03', GBR: '1992-04-09', FRA: '1993-03-21', JPN: '1990-02-18' };
  for (const id in conocidos) {
    const c = st0.countries[id];
    const d = (c && c.election && c.election.next) ? c.election.next : null;
    const iso = d ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0') : null;
    check(iso === conocidos[id], 'La primera cita electoral de ' + id + ' es ' + iso +
      ' y debería ser ' + conocidos[id] + '.');
  }
  /* Un país sin urnas no vota aunque tenga fecha escrita (la usará si se democratiza) */
  check(!st0.countries.POL.election, 'Polonia vota en 1990 pese a ser un régimen comunista.');
  console.log('Fechas históricas: ' + ids.length + ' países · España vota el ' +
    SP.util.fechaCorta(st0.countries.ESP.election.next) + ', EE.UU. el ' +
    SP.util.fechaCorta(st0.countries.USA.election.next) + ' y Japón el ' +
    SP.util.fechaCorta(st0.countries.JPN.election.next));
}

/* ============================ 3. el reparto ============================ */

{
  const votos = [40, 25, 15, 10, 7, 3];
  let sumaOk = true, cambia = false;
  for (const total of [15, 30, 100, 350, 435, 650]) {
    const s = P.repartir(votos, total, 0);
    let t = 0;
    for (const x of s) { t += x; if (x < 0) sumaOk = false; }
    if (t !== total) sumaOk = false;
    cambia = cambia || (s[0] + s[1] !== s[2] + s[3] + s[4] + s[5]);
  }
  check(sumaOk, 'El reparto de escaños no cuadra el total de la cámara.');
  check(cambia, 'El reparto da siempre el mismo resultado: no está contando los votos.');
  /* Con umbral, un partido pequeño se queda fuera */
  const conUmbral = P.repartir([40, 25, 15, 10, 7, 3], 100, 4);
  check(conUmbral[5] === 0, 'El umbral electoral no deja fuera a un partido del 3 %.');
  check(conUmbral[0] > P.repartir([40, 25, 15, 10, 7, 3], 100, 0)[0], 'El umbral no favorece a los grandes.');
}

/* ======================= 4. el descontento responde ======================= */

{
  const st = juego('ESP');
  const c = st.countries.ESP;
  const base = { growth: 0.02, unemployment: 8, inflation: 5, stability: 60, approval: 50, scandals: 0, tension: 20 };
  const poner = (o) => { Object.assign(c, base); c.pol.dis = 40; c.pol.tension = 20; c.pol.scandals = 0; Object.assign(c, o); return P.discontent(st, c); };
  const normal = poner({});
  const paro = poner({ unemployment: 25 });
  const inflacion = poner({ inflation: 200 });
  const recesion = poner({ growth: -0.04 });
  const escandalos = poner({}); c.pol.scandals = 3;
  const conEscandalos = P.discontent(st, c);
  const bueno = poner({ growth: 0.06, unemployment: 4, approval: 70 });
  check(paro > normal + 5, 'El paro no sube el descontento.');
  check(inflacion > normal + 3, 'La inflación no sube el descontento.');
  check(recesion > normal + 5, 'La recesión no sube el descontento.');
  check(conEscandalos > normal + 8, 'Los escándalos no suben el descontento.');
  check(bueno < normal - 8, 'Un país que va bien no baja el descontento.');
  console.log('Descontento: normal ' + normal.toFixed(0) + ' · paro 25 % ' + paro.toFixed(0) +
    ' · recesión ' + recesion.toFixed(0) + ' · escándalos ' + conEscandalos.toFixed(0) + ' · todo bien ' + bueno.toFixed(0));
}

/* ============================ 5. las elecciones ============================ */

function eleccionCon(ajustes) {
  const st = juego('ESP');
  const c = st.countries.ESP;
  /* La campaña lleva azar: se fija la semilla para que dos escenarios con los
     mismos números se diferencien solo en lo que se está probando. */
  SP.util.seed(20260913);
  Object.assign(c, ajustes.ciudad || {});
  if (ajustes.pol) Object.assign(c.pol, ajustes.pol);
  if (ajustes.tema) c.pol.theme = ajustes.tema;
  const antes = c.parties[0].seats;
  const r = P.election(st, c, { preservar: true });
  return { st, c, r, antes, despues: c.parties[0].seats, oposicion: P.largestOpposition(c) };
}

{
  const neutro = eleccionCon({ ciudad: { approval: 50, growth: 0.02, unemployment: 12, inflation: 10, stability: 60 } });
  const malo = eleccionCon({ ciudad: { approval: 25, growth: -0.03, unemployment: 24, inflation: 30, stability: 42 } });
  const good = eleccionCon({ ciudad: { approval: 70, growth: 0.05, unemployment: 6, inflation: 4, stability: 75 } });
  check(malo.despues < neutro.despues, 'Un mal gobierno no pierde escaños.');
  check(good.despues > neutro.despues, 'Un buen gobierno no gana escaños.');
  check(malo.despues < malo.antes, 'Perder apoyo no cuesta escaños.');
  console.log('Gobierno (PSOE, 150 escaños de partida) tras las urnas: mal gobierno ' + malo.despues +
    ' · neutro ' + neutro.despues + ' · buen gobierno ' + good.despues);
}

/* La afinidad con el tema, que es lo que decide de qué lado sopla el viento */
{
  const derecha = { pos: 8 };
  const izquierda = { pos: 2 };
  check(P.afinidad(derecha, 'impuestos') > P.afinidad(derecha, 'recortes'),
    'La derecha no capitaliza mejor la subida de impuestos que los recortes.');
  check(P.afinidad(izquierda, 'recortes') > P.afinidad(izquierda, 'impuestos'),
    'La izquierda no capitaliza mejor los recortes sociales que los impuestos.');
  check(P.afinidad(derecha, 'orden') > P.afinidad(izquierda, 'orden'),
    'Con el tema del orden público la derecha no gana a la izquierda.');
  check(P.afinidad(izquierda, 'economia') >= P.afinidad(derecha, 'economia'),
    'Con el tema del paro la izquierda no parte con ventaja.');
}

/* Y de punta a punta: un parlamento con una izquierda y una derecha del mismo
   tamaño cambia de reparto según el tema que domine el debate. */
function eleccionDeTema(tema) {
  const st = juego('ESP');
  const c = st.countries.ESP;
  SP.util.seed(777);
  c.chamber = 100;
  c.parties = [
    { name: 'Gobierno', fam: 'centro', pos: 5, base: 40, seats: 40, gov: true, fav: 0 },
    { name: 'Izquierda', fam: 'izq', pos: 1.5, base: 28, seats: 28, gov: false, fav: 0 },
    { name: 'Derecha', fam: 'cons', pos: 8, base: 28, seats: 28, gov: false, fav: 0 },
    { name: 'Otros', fam: 'liberal', pos: 5.6, base: 4, seats: 4, gov: false, fav: 0 }
  ];
  c.govParty = 0;
  c.approval = 38; c.growth = 0.01; c.unemployment = 14; c.inflation = 12; c.stability = 55;
  c.pol.theme = tema;
  c.pol.taxMood = tema === 'impuestos' ? 20 : 0;
  c.pol.cutMood = tema === 'recortes' ? 20 : 0;
  P.election(st, c, { preservar: true });
  return {
    izquierda: c.parties.filter(q => q.name === 'Izquierda')[0].seats,
    derecha: c.parties.filter(q => q.name === 'Derecha')[0].seats
  };
}
{
  const imp = eleccionDeTema('impuestos');
  const rec = eleccionDeTema('recortes');
  check(imp.derecha > rec.derecha, 'Con el tema de los impuestos la derecha no saca más escaños que con el de los recortes: ' +
    imp.derecha + ' contra ' + rec.derecha);
  check(rec.izquierda > imp.izquierda, 'Con el tema de los recortes la izquierda no saca más escaños que con el de los impuestos: ' +
    rec.izquierda + ' contra ' + imp.izquierda);
  console.log('Tema dominante (mismo parlamento, mismos números): impuestos -> derecha ' + imp.derecha +
    ', izquierda ' + imp.izquierda + ' | recortes -> izquierda ' + rec.izquierda + ', derecha ' + rec.derecha);
}

/* ========================= 6. la investidura ========================= */

/* Abre unas urnas perdedoras y devuelve el estado y el modal */
function investiduraCon(ajustes) {
  const st = juego('ESP');
  const c = st.countries.ESP;
  Object.assign(c, ajustes.ciudad || {});
  if (ajustes.camara) {
    c.chamber = ajustes.camara.chamber;
    c.parties = ajustes.camara.parties.map(p => Object.assign({}, p));
    c.govParty = 0;
    for (const p of c.parties) p.gov = false;
    c.parties[0].gov = true;
  }
  c.election.next = new Date(st.date.getTime());
  st.day = 500;
  SP.checkElections(st);
  return { st: st, c: c, ev: st.pendingEvents[0] };
}

{
  /* Perder las urnas abre una VOTACIÓN de investidura: cada salida trae sus
     escaños y su probabilidad, y ninguna es imposible. */
  const r = investiduraCon({ ciudad: { approval: 25, growth: -0.02, unemployment: 22, inflation: 25, stability: 45 } });
  check(!!r.ev, 'Perder la mayoría no abre ninguna investidura.');
  if (r.ev) {
    check(r.ev.id.indexOf('investidura') === 0, 'La investidura llega con un identificador raro: ' + r.ev.id);
    check(r.ev.ch.length >= 2, 'La investidura no ofrece salidas.');
    check(r.ev.ch.some(x => /Ceder el gobierno/i.test(x.label)), 'La investidura no deja ceder el gobierno a la oposición.');
    check(r.ev.ch.some(x => x.success > 0 && x.success <= 1), 'Ninguna salida de la investidura se somete a votación.');
    check(r.ev.ch.filter(x => x.success === 0).length === 0, 'La investidura ofrece una salida imposible de ganar.');
    check(r.ev.ch.some(x => /Síes \d+ de \d+/.test(x.detail)), 'Las salidas no dicen con cuántos escaños cuentan.');
    check(r.c.parties[r.c.govParty].name === 'PSOE', 'Al perder las urnas al jugador le han cambiado de partido.');
    check(P.support(r.c) < 50, 'La investidura se abre sin haber perdido la mayoría.');
    console.log('Investidura: ' + r.c.parties[r.c.govParty].name + ' se queda en ' + Math.round(P.support(r.c)) +
      ' % y la cámara ofrece ' + r.ev.ch.length + ' salidas' +
      (r.ev.ch[0].success !== undefined ? ' (la primera, al ' + Math.round(r.ev.ch[0].success * 100) + ' %)' : ''));
  }
}

{
  /* Ceder el gobierno entrega el poder de verdad a la oposición */
  const st = juego('ESP');
  const c = st.countries.ESP;
  c.chamber = 100;
  c.parties = [
    { name: 'Gobierno', fam: 'centro', pos: 5, base: 40, seats: 40, gov: true, fav: 0 },
    { name: 'Grande', fam: 'cons', pos: 7, base: 35, seats: 35, gov: false, fav: 0 },
    { name: 'Peque', fam: 'liberal', pos: 6.5, base: 25, seats: 25, gov: false, fav: 0 }
  ];
  c.govParty = 0;
  c.pol.tension = 60;
  const r = P.fallInvestidura(st, { ceder: true });
  check(!!r && r.handover === true, 'Ceder el gobierno no entrega el poder a la oposición.');
  check(!!st.over && st.over.win === false, 'Ceder el gobierno no termina la partida.');
  check(/oposición/i.test(st.over.title), 'El final al ceder no nombra a la oposición: ' + st.over.title);
}

{
  /* Si la oposición NO puede gobernar, se repiten las elecciones; nunca hay
     un limbo infinito. */
  const st = juego('ESP');
  const c = st.countries.ESP;
  c.chamber = 100;
  c.parties = [
    { name: 'Gobierno', fam: 'centro', pos: 0, base: 30, seats: 30, gov: true, fav: 0 },
    { name: 'Medio', fam: 'liberal', pos: 5, base: 35, seats: 35, gov: false, fav: 0 },
    { name: 'Otro', fam: 'cons', pos: 10, base: 35, seats: 35, gov: false, fav: 0 }
  ];
  c.govParty = 0;
  const alcanza = P.coalitionReach(c, 1);
  check(alcanza <= c.chamber / 2, 'El escenario de prueba no es ingobernable (la oposición alcanza ' + alcanza + ').');
  const r1 = P.fallInvestidura(st, {});
  check(!!r1 && r1.repeat === true, 'Perder con una oposición ingobernable no convoca elecciones repetidas.');
  check(!st.over, 'Se termina la partida en la primera investidura fallida.');
  const dias = (c.election.next - st.date) / 86400000;
  check(dias >= 45 && dias <= 75, 'Las elecciones repetidas se convocan a ' + Math.round(dias) + ' días.');
  P.fallInvestidura(st, {});
  check(!!st.over, 'Tras dos investiduras fallidas el país se queda sin gobierno para siempre.');
  console.log('Investidura fallida: 1ª vez elecciones repetidas a ' + Math.round(dias) +
    ' días · 2ª vez gobierna la oposición (' + st.over.title + ')');
}

{
  /* La votación: aritmética de las dos vueltas y garantías por escaños */
  const st = juego('ESP');
  const c = st.countries.ESP;
  c.chamber = 100;
  c.parties = [
    { name: 'Gobierno', fam: 'centro', pos: 5, base: 40, seats: 40, gov: true, fav: 0 },
    { name: 'Socio', fam: 'socdem', pos: 3, base: 30, seats: 30, gov: false, fav: 0 },
    { name: 'Opo', fam: 'cons', pos: 8, base: 30, seats: 30, gov: false, fav: 0 }
  ];
  c.govParty = 0;
  c.stability = 60; c.pol.scandals = 0; c.pol.tension = 20;
  check(P.investiduraChance(st, c, 70, 0) > 0.85, 'Con mayoría absoluta la investidura no está casi garantizada.');
  const r2 = P.investiduraChance(st, c, 40, 30);
  check(r2 > 0.3 && r2 < 0.9, 'La segunda vuelta con abstenciones no tiene una probabilidad creíble: ' + r2.toFixed(2));
  check(P.investiduraChance(st, c, 40, 0) === 0, 'Se puede gobernar sin los números ni en primera ni en segunda vuelta.');
  const snap = c.parties.map(q => q.name + ':' + q.seats + ':' + q.gov).join('|');
  P.coalitionReach(c, 1);
  check(c.parties.map(q => q.name + ':' + q.seats + ':' + q.gov).join('|') === snap, 'coalitionReach cambia el parlamento.');
  console.log('Votación de investidura: 1ª vuelta 70/100 -> ' + Math.round(P.investiduraChance(st, c, 70, 0) * 100) +
    ' % · 2ª vuelta 40 síes + 30 abstenciones -> ' + Math.round(r2 * 100) + ' % · sin números -> se pierde');
}

{
  /* Superar la investidura abre legislatura nueva: hay que reprogramar las
     urnas, o la misma votación se repetiría cada día. */
  const st = juego('ESP');
  const c = st.countries.ESP;
  c.election.next = new Date(st.date.getTime());
  st.day = 700;
  P.apply(st, { minority: true, investidura: true });
  check(c.election.next > st.date, 'Superar una investidura no reprograma las urnas: se repetiría cada día.');
  let repiten = 0;
  for (let k = 0; k < 5 && !st.over; k++) {
    st.pendingEvents.length = 0;
    SP.tick(st);
    if (st.pendingEvents.length) repiten++;
  }
  check(repiten === 0, 'Tras superar una investidura se vuelve a abrir sola (' + repiten + ' veces en cinco días).');
  console.log('Investidura superada: urnas reprogramadas al ' + SP.util.fechaCorta(c.election.next));
}

{
  /* Un gobierno que arrasa no tiene investidura */
  const st = juego('ESP');
  const c = st.countries.ESP;
  c.approval = 75; c.growth = 0.05; c.unemployment = 6; c.inflation = 4;
  c.election.next = new Date(st.date.getTime());
  st.day = 400;
  SP.checkElections(st);
  check(st.pendingEvents.length === 0, 'Ganar con claridad abre una investidura igualmente.');
  check(P.support(c) > 50, 'Ganar con claridad no deja mayoría.');
}

/* =================== 7. el presupuesto mueve a la oposición =================== */

{
  const st = juego('ESP');
  const c = st.countries.ESP;
  st.pc = 150;
  const tension0 = c.pol.tension;

  SP.setBudgetLine(st, 'salud', -2);
  const cut = c.pol.cutMood || 0;
  const conRecorte = c.pol.tension;
  SP.setBudgetLine(st, 'salud', 2);
  const cut2 = c.pol.cutMood || 0;

  st.pc = 150;
  SP.setTax(st, 5);
  const tax = c.pol.taxMood || 0;
  const driftDer = c.pol.drift.cons || 0;

  st.pc = 150;
  SP.setBudgetLine(st, 'mil', -2);
  const def = c.pol.defMood || 0;
  const driftMili = c.pol.drift.mili || 0;

  check(cut > 0, 'Recortar sanidad no enfada a la izquierda del hemiciclo.');
  check(cut2 < cut, 'Volver a subir sanidad no calma el ánimo.');
  check(conRecorte > tension0, 'Recortar lo social no sube el pulso con la oposición.');
  check(tax > 0, 'Subir impuestos no enfada al contribuyente.');
  check(driftDer > 0, 'Subir impuestos no beneficia a la derecha.');
  check(def > 0, 'Recortar defensa no enfada a los militares.');
  check(driftMili > 0, 'Recortar defensa no beneficia al partido militar.');
  console.log('Reacción al presupuesto: recorte social ' + cut.toFixed(1) + ' · impuestos ' + tax.toFixed(1) +
    ' · defensa ' + def.toFixed(1) + ' (ánimo acumulado, 0-45)');
}

/* ======================== 8. la moción de censura ======================== */

{
  const st = juego('ESP');
  const c = st.countries.ESP;
  check(P.censureRisk(c) === 0, 'Con mayoría y sin tensión ya hay riesgo de censura.');

  /* Oposición con la cámara en contra: el riesgo aparece */
  for (const q of c.parties) q.gov = false;
  c.parties[c.govParty].gov = true;
  c.parties[c.govParty].seats = 40;
  c.approval = 20; c.growth = -0.03; c.stability = 35;
  c.pol.tension = 90; c.pol.dis = 80;
  check(P.censureRisk(c) > 0.4, 'Con la cámara en contra y tensión máxima no hay riesgo de censura.');
  const pr = P.censureChance(st, c);
  check(pr > 0.05 && pr < 0.95, 'La probabilidad de ganar una censura no está entre 0 y 1: ' + pr);

  P.pushCensure(st, c);
  const ev = st.pendingEvents[0];
  check(!!ev && ev.id.indexOf('censure') === 0, 'La moción de censura no llega como decisión.');
  check(ev && ev.ch.length === 3, 'La moción de censura no ofrece tres salidas.');
  check(ev && ev.ch[0].success !== undefined, 'La votación no trae su probabilidad calculada.');
  const tensionAntes = c.pol.tension;
  SP.resolveChoice(st, 0, 1);   /* comprar apoyos */
  check(c.pol.tension < tensionAntes, 'Sorteas la censura y el pulso no baja.');
  check(!st.over, 'Comprar apoyos hace que pierdas el gobierno.');
  console.log('Censura: riesgo ' + P.censureRisk(c).toFixed(2) + ' con tensión 90 · probabilidad de ganarla ' +
    (pr * 100).toFixed(0) + ' % (se resuelve en el parlamento)');
}

{
  /* Perder la censura termina la partida; ganarla no */
  const st = juego('ESP');
  const c = st.countries.ESP;
  P.apply(st, { censure: 'win' });
  check(!st.over, 'Ganar una moción de censura termina la partida.');
  P.apply(st, { censure: 'fall' });
  check(!!st.over && !st.over.win, 'Perder una moción de censura no termina la partida.');
}

/* ==================== 9. la mayoría da capital político ==================== */

function capitalEnMedioAno(escenario) {
  const st = juego('ESP');
  const c = st.countries.ESP;
  escenario(st, c);
  /* Se empieza con el capital a cero para no chocar con el tope de 150 y se
     descartan las decisiones (que reparten capital político a puñados): aquí
     se mide solo lo que da gobernar con más o menos escaños. */
  st.pc = 0;
  for (let i = 0; i < 150 && !st.over; i++) { SP.tick(st); st.pendingEvents.length = 0; }
  return st.pc;
}
{
  const conMayoria = capitalEnMedioAno((st, c) => {
    for (const q of c.parties) q.gov = true;
  });
  const enMinoria = capitalEnMedioAno((st, c) => {
    for (const q of c.parties) q.gov = false;
    c.parties[c.govParty].gov = true;
    c.parties[c.govParty].seats = Math.round(c.chamber * 0.3);
  });
  check(conMayoria > enMinoria + 5, 'Gobernar con mayoría no da más capital político que hacerlo en minoría: ' +
    conMayoria.toFixed(1) + ' contra ' + enMinoria.toFixed(1));
  console.log('Capital político en 150 días (empezando de cero): con mayoría ' + conMayoria.toFixed(1) +
    ' · en minoría ' + enMinoria.toFixed(1));
}

{
  /* El ritmo diario que anuncia la interfaz es el que de verdad se cobra */
  const st = juego('ESP');
  const c = st.countries.ESP;
  const r = SP.pcRate(st);
  const base = 0.30 + (c.approval / 100) * 0.25 + (c.gov === 'DEM' ? 0.05 : 0);
  const esperado = base * (c.stability < 40 ? 0.6 : 1) * (0.75 + P.support(c) / 200);
  check(Math.abs(r.perDay - esperado) < 1e-9, 'SP.pcRate no coincide con la fórmula del capital político.');
  const pc0 = st.pc;
  for (let i = 0; i < 30 && !st.over; i++) { st.pendingEvents.length = 0; SP.tick(st); }
  const real = (st.pc - pc0) / 30;
  check(Math.abs(real - r.perDay) < 0.08, 'El capital político real (' + real.toFixed(2) +
    '/día) no cuadra con el que anuncia SP.pcRate (' + r.perDay.toFixed(2) + '/día).');
  console.log('Capital político: ' + r.perDay.toFixed(2) + ' / día anunciado · ' + real.toFixed(2) +
    ' / día real (30 días) · aprobación ' + Math.round(c.approval) + ' · apoyo ' + Math.round(P.support(c)) + ' %');
}

/* ====================== 10. las palancas del jugador ====================== */

{
  const st = juego('ESP');
  const c = st.countries.ESP;
  st.pc = 150;

  const lejos = c.parties.filter(q => !q.gov).sort((a, b) => b.pos - a.pos)[0];
  const mal = P.offerCoalition(st, c.parties.indexOf(lejos));
  check(!mal.ok, 'Se puede pactar con el partido más lejano sin que se queje.');

  const cerca = P.partners(c)[0];
  check(!!cerca, 'No hay ningún socio natural al empezar la partida.');
  const apoyoAntes = P.support(c);
  const pcAntes = st.pc;
  const bien = P.offerCoalition(st, cerca.index);
  check(bien.ok, 'No se puede pactar con el socio más cercano: ' + bien.msg);
  check(P.support(c) > apoyoAntes, 'Pactar no aumenta el apoyo parlamentario.');
  check(st.pc < pcAntes, 'Pactar no cuesta capital político.');

  const roto = P.breakCoalition(st, cerca.index);
  check(roto.ok, 'No se puede romper el pacto recién firmado: ' + roto.msg);
  check(Math.abs(P.support(c) - apoyoAntes) < 0.001, 'Romper el pacto no devuelve el apoyo a donde estaba.');
  check(!P.breakCoalition(st, c.govParty).ok, 'Se puede echar del gobierno al propio partido.');

  /* Sin capital político, nada */
  st.pc = 0;
  const otra = P.partners(c)[0];
  if (otra) check(!P.offerCoalition(st, otra.index).ok, 'Se puede pactar sin capital político.');

  /* El discurso baja el pulso y tiene un tiempo de espera */
  st.pc = 150;
  c.pol.tension = 60;
  const t0 = c.pol.tension;
  const d1 = P.speech(st);
  check(d1.ok && c.pol.tension < t0, 'El discurso ante la cámara no baja el pulso.');
  const d2 = P.speech(st);
  check(!d2.ok, 'Se puede dar un discurso cada día: falta el tiempo de espera.');

  /* La acción de la pestaña Política no puede cobrar dos veces: el coste lo
     pone el sistema de acciones y el discurso ya no vuelve a pasar por caja. */
  st.pc = 150;
  st.lastSpeech = -9999;
  const pcD = st.pc;
  const actD = SP.runAction(st, 'pol_discurso', null);
  check(actD.ok, 'La acción «Discurso ante la cámara» no se ejecuta: ' + actD.msg);
  check(Math.abs((pcD - st.pc) - 12) < 1e-6, 'El discurso cuesta ' + (pcD - st.pc).toFixed(0) +
    ' de capital político en vez de 12: se cobra dos veces.');

  /* El adelanto electoral fija una fecha cercana */
  const fecha = P.snapPlan(st, 30);
  check(fecha instanceof Date, 'El adelanto electoral no convoca nada.');
  if (fecha) {
    const dias2 = (fecha - st.date) / 86400000;
    check(dias2 >= 25 && dias2 <= 35, 'El adelanto electoral convoca a ' + dias2.toFixed(0) + ' días: no es creíble.');
  }
  console.log('Palancas: pacto ' + cerca.party.name + ' +' +
    (P.supportSeats(c) / c.chamber * 100).toFixed(0) + ' % · discurso −' + (t0 - c.pol.tension).toFixed(0) +
    ' de tensión · adelanto a ' + (fecha ? SP.util.fechaCorta(fecha) : '—'));
}

/* ===================== 11. once años de mundo entero ===================== */

{
  const st = juego('ESP');
  const antes = {};
  for (const id of st.order) if (st.countries[id].alive) antes[id] = P.ruling(st.countries[id]).name;
  dias(st, 4018);
  let roto = 0, cambian = 0, sinGobierno = 0, votado = 0, vivos = 0;
  for (const id of st.order) {
    const c = st.countries[id];
    if (!c.alive) continue;
    vivos++;
    if (!c.parties || !c.parties.length) { roto++; continue; }
    let suma = 0;
    for (const q of c.parties) suma += q.seats;
    if (suma !== c.chamber) roto++;
    if (!c.parties[c.govParty] || !c.parties[c.govParty].gov) sinGobierno++;
    if (antes[id] && P.ruling(c).name !== antes[id]) cambian++;
    if (c.pol && c.pol.lastElection) votado++;
  }
  check(roto === 0, 'Al final de la década hay ' + roto + ' parlamentos descuadrados o sin montar.');
  check(sinGobierno === 0, sinGobierno + ' países acaban sin gobierno tras once años.');
  check(cambian >= 5, 'En once años solo cambia el gobierno en ' + cambian + ' países: la política está muerta.');
  check(votado >= 60, 'Apenas hay elecciones en el mundo: solo ' + votado + ' países han votado en once años.');
  console.log('Once años: ' + vivos + ' países vivos · ' + votado + ' con elecciones celebradas · ' + cambian +
    ' cambian de gobierno (' + Math.round(cambian / Math.max(1, votado) * 100) + ' %) · ' +
    (st.over ? 'final: ' + st.over.title : 'la partida sigue'));
}

/* ============== 12. guardar, cargar y migrar partidas viejas ============== */

{
  const st = juego('ESP');
  const p = st.countries.ESP;
  const antes = p.parties.map(q => q.name + ':' + q.seats).join('|');
  const apoyo = P.support(p);
  const raw = JSON.stringify(st);
  const copia = JSON.parse(raw);
  SP.migrateState(copia);
  const q = copia.countries.ESP;
  check(q.parties.map(x => x.name + ':' + x.seats).join('|') === antes, 'Guardar y cargar cambia los escaños.');
  check(Math.abs(P.support(q) - apoyo) < 0.001, 'Guardar y cargar cambia el apoyo parlamentario.');
  check(!!copia.politics && Array.isArray(copia.politics.hist), 'La partida cargada se queda sin historial político.');

  /* Partida anterior a la política interior: sin partidos ni campos nuevos */
  const viejo = JSON.parse(raw);
  for (const id in viejo.countries) {
    delete viejo.countries[id].parties;
    delete viejo.countries[id].chamber;
    delete viejo.countries[id].chamberName;
    delete viejo.countries[id].pol;
    delete viejo.countries[id].election;
  }
  delete viejo.politics;
  SP.migrateState(viejo);
  const v = viejo.countries.ESP;
  check(!!v.parties && v.parties.length >= 2, 'Una partida vieja se queda sin parlamento al cargarla.');
  let sumaV = 0;
  for (const x of v.parties) sumaV += x.seats;
  check(sumaV === v.chamber, 'El parlamento reconstruido de una partida vieja no cuadra.');
  check(!!v.pol && isFinite(v.pol.tension), 'Una partida vieja se queda sin pulso político.');
  check(!!viejo.politics, 'Una partida vieja se queda sin historial político.');
  console.log('Guardar y cargar: ' + (raw.length / 1024).toFixed(0) + ' KB con los parlamentos dentro · migración de partidas viejas: ' +
    v.parties.length + ' partidos reconstruidos');
}

/* ============================== regímenes sin urnas ============================== */

{
  const st = juego('URS');
  const c = st.countries.URS;
  check(P.kindOf(c) === null, 'La URSS aparece con elecciones libres.');
  check(!c.election, 'La URSS tiene calendario electoral y no debería.');
  const riesgo = P.censureRisk(c);
  check(riesgo === 0, 'En un régimen con el 70 % de la cámara hay riesgo de censura.');
  /* Un régimen bueno no se tambalea: con el país en orden, el pulso se queda
     bajo y no pasa nada. */
  const pulsoTranquilo = c.pol.tension;
  /* Pero uno en crisis (el Este en 1990) sí: el descontento sin urnas se
     convierte en pulso y, antes o después, llega la decisión de abrirse. */
  c.approval = 12; c.unemployment = 20; c.inflation = 80; c.stability = 30;
  let abierto = false, pico = 0;
  for (let i = 0; i < 3000 && !abierto; i++) {
    st.pendingEvents.length = 0;
    P.tick(st);
    pico = Math.max(pico, c.pol.tension);
    if (st.pendingEvents.some(e => e.id.indexOf('apertura') === 0)) abierto = true;
  }
  check(pulsoTranquilo < 50, 'Un régimen con el país en orden arranca ya con el pulso disparado.');
  check(pico > 72, 'Con el país en crisis, el pulso de un régimen sin urnas no sube: se queda en ' + pico.toFixed(0));
  check(abierto, 'Un régimen sin urnas en plena crisis nunca se plantea abrirse.');
  console.log('Régimen sin urnas: censura imposible (correcto) · pulso con el país en orden ' +
    pulsoTranquilo.toFixed(0) + ' y en crisis ' + pico.toFixed(0) + ' (llega la decisión de apertura).');
}

/* ---------------------------------- resumen ----------------------------------------- */

console.log('');
console.log('Comprobando la política interior...');
console.log('');
console.log('Países con partidos escritos a mano: ' + escritos.length + ' · familias políticas: ' + familias.length);
console.log('Ejemplos de parlamentos de 1990:');
for (const id of ['ESP', 'USA', 'URS', 'GBR', 'FRA', 'POL', 'NGA', 'VUT']) {
  const c = st0.countries[id];
  if (!c || !c.parties) continue;
  const lead = P.ruling(c);
  console.log('  ' + (c.name + '                    ').slice(0, 20) +
    (c.chamberName + '                        ').slice(0, 24) +
    String(c.chamber).padStart(4) + ' escaños · ' + (lead ? lead.name : '—') +
    ' · apoyo ' + Math.round(P.support(c)) + ' %' + (P.hasMajority(c) ? '' : ' (minoría)'));
}
console.log('');

if (problemas.length) {
  console.log('PROBLEMAS ENCONTRADOS (' + problemas.length + '):');
  for (const p of problemas) console.log('  - ' + p);
  console.log('');
  process.exit(1);
}

console.log('TODO CORRECTO: el parlamento cuadra, las urnas castigan al que lo hace mal y el presupuesto llega al hemiciclo.');
console.log('');
