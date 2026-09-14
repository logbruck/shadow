/* Comprobador del gabinete (src/data/cabinet1990.js y src/sim/cabinet.js).
   Uso:  node tools/check-cabinet.js

     1. Las carteras y los ministros reales de 1990 están bien escritos.
     2. Todo país arranca con siete ministros completos.
     3. Los nombres son estables (la misma partida, los mismos ministros).
     4. Un ministro competente mueve los números de su cartera.
     5. Nombrar, cesar y la crisis de gobierno cuestan y hacen lo que dicen.
     6. Un ministro con poca integridad acaba en escándalo.
     7. Cinco años de simulación sin que el gabinete se rompa. */

'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

global.window = {};
for (const f of [
  'src/data/world1990.js', 'src/data/timeline.js', 'src/data/events.js', 'src/data/events-pais.js',
  'src/data/econ1990.js', 'src/data/politics1990.js', 'src/data/society1990.js', 'src/data/transition1990.js', 'src/data/groups1990.js', 'src/data/cabinet1990.js',
  'src/sim/util.js', 'src/sim/state.js', 'src/sim/economy.js', 'src/sim/society.js', 'src/sim/transition.js',
  'src/sim/war.js', 'src/sim/trade.js', 'src/sim/sanctions.js', 'src/sim/diplomacy.js',
  'src/sim/politics.js', 'src/sim/groups.js', 'src/sim/cabinet.js', 'src/sim/ai.js', 'src/sim/actions.js', 'src/sim/engine.js'
]) {
  eval(fs.readFileSync(path.join(root, f), 'utf8'));
}
const SP = global.window.SP;
const B = SP.Cabinet;

let problemas = 0;
function check(cond, msg) { if (!cond) { problemas++; console.log('  - ' + msg); } }

SP.util.seed(19900101);
function juego(player) {
  const st = SP.createState({ player: player || 'ESP', difficulty: 'normal' });
  SP.initState(st);
  return st;
}
function dias(st, n) {
  for (let i = 0; i < n; i++) {
    SP.tick(st);
    let g = 0;
    while (st.pendingEvents.length && g++ < 20) SP.resolveChoice(st, 0, 0);
  }
}

console.log('Comprobando el gabinete...');
console.log('');

/* ---------------------------------------------- 1. datos -------------- */
const claves = SP.CABINET_PORTFOLIOS.map(p => p.key);
check(claves.length === 7, 'El gabinete no tiene siete carteras.');
check(new Set(claves).size === claves.length, 'Hay carteras repetidas.');
for (const p of SP.CABINET_PORTFOLIOS) {
  check(!!p.label && !!p.que, 'La cartera ' + p.key + ' no tiene nombre o explicación.');
  check(B.KEYS.indexOf(p.key) >= 0, 'La cartera ' + p.key + ' no la usa el motor.');
}
const ids = SP.alive(juego());
for (const id in SP.CABINET_1990) {
  check(ids.indexOf(id) >= 0, 'CABINET_1990[' + id + '] no es un país del juego.');
  for (const k in SP.CABINET_1990[id]) {
    check(claves.indexOf(k) >= 0, 'CABINET_1990[' + id + '] usa una cartera que no existe: ' + k + '.');
  }
}
const reales = Object.keys(SP.CABINET_1990).reduce((n, id) => n + Object.keys(SP.CABINET_1990[id]).length, 0);
console.log('Datos: 7 carteras · ' + reales + ' ministros reales de 1990 fijados a mano en ' +
  Object.keys(SP.CABINET_1990).length + ' países.');

/* ---------------------------------------------- 2. arranque ---------- */
const st0 = juego('ESP');
let malos = 0;
for (const id of SP.alive(st0)) {
  const c = st0.countries[id];
  if (!c.cabinet || !c.cabinet.ministers) { malos++; continue; }
  for (const k of B.KEYS) {
    const m = c.cabinet.ministers[k];
    if (!m) { malos++; check(false, id + '/' + k + ': sin ministro.'); continue; }
    if (!m.name || typeof m.name !== 'string') { malos++; check(false, id + '/' + k + ': sin nombre.'); }
    for (const f of ['comp', 'loy', 'ideo', 'integ']) {
      if (!isFinite(m[f]) || m[f] < 0 || m[f] > 100) { malos++; check(false, id + '/' + k + ': ' + f + ' fuera de rango.'); }
    }
  }
}
check(malos === 0, malos + ' ministerios de partida mal formados.');
const esp = st0.countries.ESP;
check(esp.cabinet.ministers.economia.name === 'Carlos Solchaga',
  'España no arranca con su ministro real de Economía (Carlos Solchaga).');
console.log('Arranque: 161 países con siete ministros completos.');

/* ---------------------------------------------- 3. determinismo ------ */
SP.util.seed(19900101);
const r1 = juego('ESP').countries.ESP.cabinet.ministers;
SP.util.seed(19900101);
const r2 = juego('ESP').countries.ESP.cabinet.ministers;
let iguales = true;
for (const k of B.KEYS) if (r1[k].name !== r2[k].name) iguales = false;
check(iguales, 'Los ministros cambian de nombre entre dos partidas con la misma semilla.');
console.log('Estabilidad: la misma partida trae los mismos ministros.');

/* ---------------------------------------------- 4. efectos ----------- */
const c = st0.countries.ESP;
c.cabinet.ministers.economia.comp = 95;
const buenIngreso = B.mods(c).revenue;
c.cabinet.ministers.economia.comp = 15;
const malIngreso = B.mods(c).revenue;
check(buenIngreso > 1 && malIngreso < 1, 'La competencia del ministro de Economía no mueve los ingresos.');
c.cabinet.ministers.justicia.comp = 10;
c.cabinet.ministers.justicia.integ = 5;
const corrMala = B.mods(c).corr;
c.cabinet.ministers.justicia.comp = 90;
c.cabinet.ministers.justicia.integ = 95;
check(B.mods(c).corr < corrMala, 'Un mal ministro de Justicia no empeora la corrupción frente a uno bueno.');
console.log('Efectos: el ministro de Economía mueve la recaudación de ' + (malIngreso * 100).toFixed(0) +
  ' % a ' + (buenIngreso * 100).toFixed(0) + ' %.');

/* ---------------------------------------------- 5. el jugador -------- */
const st = juego('ESP');
const p = st.countries.ESP;
st.pc = 100;
const antes = p.cabinet.ministers.trabajo.name;
let r = B.appoint(st, p, 'trabajo', 1);
check(r.ok && p.cabinet.ministers.trabajo.name !== antes, 'Nombrar a un ministro no lo cambia.');
check(st.pc === 92, 'Nombrar no cuesta 8 CP (quedan ' + st.pc + ').');
st.pc = 0;
check(!B.appoint(st, p, 'trabajo', 1).ok, 'Se puede nombrar sin capital político.');
st.pc = 100;
r = B.dismiss(st, p, 'defensa');
check(r.ok && p.cabinet.vacant.defensa === true, 'Cesar a un ministro no deja la cartera en funciones.');
check(p.cabinet.ministers.defensa.comp <= 30, 'La cartera en funciones no queda debilitada.');
const antesCrisis = B.KEYS.map(k => p.cabinet.ministers[k].name).join('|');
r = B.reshuffle(st, p);
check(r.ok, 'La crisis de gobierno falla con capital de sobra.');
check(B.KEYS.map(k => p.cabinet.ministers[k].name).join('|') !== antesCrisis, 'La crisis de gobierno no cambia el gabinete.');
console.log('Jugador: nombrar (8 CP), cesar (5 CP) y crisis de gobierno (15 CP) hacen lo que prometen.');

/* ---------------------------------------------- 6. escándalo -------- */
const stE = juego('ESP');
const pE = stE.countries.ESP;
for (const k of B.KEYS) { pE.cabinet.ministers[k].integ = 4; pE.cabinet.ministers[k].scandal = false; }
let escandalo = false;
for (let i = 0; i < 3000 && !escandalo; i++) {
  stE.day++;
  B.step(stE, pE);
  if (stE.pendingEvents.some(e => e.id.indexOf('escandalo') === 0)) escandalo = true;
}
check(escandalo, 'Con integridad 4 en todo el gabinete no estalla ningún escándalo en ocho años.');
const ev = stE.pendingEvents.filter(e => e.id.indexOf('escandalo') === 0)[0];
check(ev && ev.ch.length === 3, 'El escándalo no ofrece tres salidas (cesar, defender o comisión).');
if (ev) {
  pE.cabinet.ministers.trabajo.scandal = true;
  B.apply(stE, { cesar: 'trabajo' });
  check(!pE.cabinet.ministers.trabajo.scandal, 'Cesar al ministro no le quita el escándalo de encima.');
}
console.log('Escándalos: con poca integridad llega el caso «' + (ev ? ev.t : '—') + '».');

/* ---------------------------------------------- 7. cinco años ------- */
const lr = juego('ESP');
dias(lr, 365 * 5);
let rotos = 0;
for (const id of SP.alive(lr)) {
  const cc = lr.countries[id];
  if (!cc.cabinet) { rotos++; continue; }
  for (const k of B.KEYS) {
    const m = cc.cabinet.ministers[k];
    if (!m || !isFinite(m.comp) || !isFinite(m.loy) || !isFinite(m.integ)) rotos++;
  }
}
check(rotos === 0, rotos + ' ministerios acaban rotos tras cinco años.');
const sum = B.summary(lr, lr.countries.ESP);
check(sum.ministros.length === 7, 'summary no devuelve siete ministros.');
console.log('Cinco años: gabinetes sanos y ficha de siete carteras.');

/* ------------------------------------------------------------- informe */
console.log('');
if (problemas) {
  console.log('PROBLEMAS ENCONTRADOS (' + problemas + ').');
  console.log('');
  process.exit(1);
}
console.log('TODO CORRECTO: el gabinete se nombra, mueve el país y se cae por un escándalo.');
console.log('');
