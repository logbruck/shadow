/* Comprobador de la transición del Este y la corrupción
   (src/data/transition1990.js y src/sim/transition.js).
   Uso:  node tools/check-transition.js

     1. Los datos de 1990 cubren todos los regímenes y están en rango.
     2. Al democratizarse un régimen cerrado arranca la transición.
     3. Al jugador se le pregunta; la IA elige camino sola.
     4. El choque duele antes y limpia después; el gradualismo, al revés.
     5. La corrupción resta productividad y recaudación.
     6. La transición termina (no se queda encendida para siempre).
     7. Once años de simulación sin que nada se rompa. */

'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

global.window = {};
for (const f of [
  'src/data/world1990.js', 'src/data/timeline.js', 'src/data/events.js', 'src/data/events-pais.js',
  'src/data/econ1990.js', 'src/data/politics1990.js', 'src/data/society1990.js', 'src/data/transition1990.js',
  'src/sim/util.js', 'src/sim/state.js', 'src/sim/economy.js', 'src/sim/society.js', 'src/sim/transition.js',
  'src/sim/war.js', 'src/sim/trade.js', 'src/sim/sanctions.js', 'src/sim/diplomacy.js',
  'src/sim/politics.js', 'src/sim/ai.js', 'src/sim/actions.js', 'src/sim/engine.js'
]) {
  eval(fs.readFileSync(path.join(root, f), 'utf8'));
}
const SP = global.window.SP;
const T = SP.Transition;

let problemas = 0;
function check(cond, msg) { if (!cond) { problemas++; console.log('  - ' + msg); } }

SP.util.seed(19900101);

function juego(player) {
  const st = SP.createState({ player: player || 'POL', difficulty: 'normal' });
  SP.initState(st);
  return st;
}

console.log('Comprobando la transición económica del Este...');
console.log('');

/* -------------------------------------------- 1. datos ---------------- */
const ids = SP.alive(juego());
for (const id of SP.transHandWritten()) {
  const v = SP.TRANS_1990[id];
  check(Array.isArray(v) && v.length === 3, 'TRANS_1990[' + id + '] no es [estatizado, apertura, industria].');
  if (Array.isArray(v)) {
    for (let i = 0; i < 3; i++) check(isFinite(v[i]) && v[i] >= 0 && v[i] <= 100, id + ': valor ' + i + ' fuera de rango.');
  }
  check(ids.indexOf(id) >= 0, 'TRANS_1990[' + id + '] no es un país del juego.');
}
for (const g of ['DEM', 'AUT', 'MON', 'MIL', 'COM', 'UNI', 'TEO', 'APR']) {
  check(SP.TRANS_GOV[g] !== undefined, 'Falta el perfil de transición para el régimen ' + g + '.');
}
console.log('Datos: ' + SP.transHandWritten().length + ' países escritos a mano y 8 regímenes por defecto.');

/* -------------------------------------------- 2. la detecta sola ------ */
const st = juego('POL');
const pol = st.countries.POL;
check(pol.gov === 'COM', 'Polonia no empieza con un régimen cerrado (es ' + pol.gov + ').');
T.watch(st);                           /* primer día: fija el régimen de partida */
pol.gov = 'DEM';                       /* se democratiza, como en 1989-90 */
T.watch(st);
check(pol.transition.phase === 'choose', 'Al democratizarse no arranca la transición (fase ' + pol.transition.phase + ').');
const aviso = st.pendingEvents.filter(e => e.id.indexOf('transicion') === 0)[0];
check(!!aviso, 'Al jugador no se le pregunta cómo desmontar la economía.');
check(aviso && aviso.ch.length >= 3, 'La decisión de transición no ofrece las tres salidas.');
console.log('Detección: al democratizarse Polonia llega la decisión «' + (aviso ? aviso.t : '—') + '».');

/* -------------------------------------------- 3. la IA elige ---------- */
const stIA = juego('ESP');
T.watch(stIA);
const ria = stIA.countries.ROU;
ria.transition.phase = 'none';
ria.govPrev = 'COM';
ria.gov = 'DEM';                       /* se democratiza */
ria.isPlayer = false;
T.watch(stIA);
check(['shock', 'gradual'].indexOf(ria.transition.path) >= 0,
  'La IA no elige camino de transición (path ' + ria.transition.path + ').');
check(stIA.pendingEvents.filter(e => e.id.indexOf('transicion') === 0).length === 0,
  'La transición de un país de la IA genera una decisión para el jugador.');
console.log('IA: un régimen cerrado pasa a «' + T.pathName(ria.transition.path) + '» sin molestar al jugador.');

/* -------------------------------------------- 4. choque vs gradualismo */
function camino(path) {
  const s = juego('POL');
  const c = s.countries.POL;
  c.isPlayer = true;
  T.startPath(s, c, path);
  return { s: s, c: c };
}
const ch = camino('shock');
const gr = camino('gradual');
check(ch.c.inflation > gr.c.inflation,
  'El choque no dispara más la inflación que el gradualismo en el primer día.');
check(T.inflationMod(ch.c) > T.inflationMod(gr.c),
  'El choque no añade más inflación que el gradualismo.');
check(T.unemploymentMod(ch.c) > T.unemploymentMod(gr.c),
  'El choque no deja más paro que el gradualismo.');
/* Se les deja años, cada uno por su lado */
for (let i = 0; i < 365 * 6; i++) { T.step(ch.s, ch.c); T.step(gr.s, gr.c); }
check(ch.c.corrupt < gr.c.corrupt,
  'Con el choque la corrupción debería quedar más baja que con el gradualismo (' +
  ch.c.corrupt.toFixed(1) + ' vs ' + gr.c.corrupt.toFixed(1) + ').');
check(ch.c.informal < gr.c.informal,
  'El choque no formaliza más la economía que el gradualismo.');
console.log('Caminos a 6 años: choque corrupción ' + ch.c.corrupt.toFixed(0) + ' · sumergida ' + ch.c.informal.toFixed(0) +
  ' | gradualismo corrupción ' + gr.c.corrupt.toFixed(0) + ' · sumergida ' + gr.c.informal.toFixed(0) + '.');

/* -------------------------------------------- 5. corrupción ------------ */
const bajo = { corrupt: 20 }, alto = { corrupt: 80 };
check(T.collectFactor(alto) < T.collectFactor(bajo), 'Más corrupción no recauda menos.');
check(T.tfpMod(alto) < T.tfpMod(bajo), 'Más corrupción no resta productividad.');
console.log('Corrupción: recauda ' + (T.collectFactor(bajo) * 100).toFixed(0) + ' % con nivel 20 y ' +
  (T.collectFactor(alto) * 100).toFixed(0) + ' % con nivel 80.');

/* -------------------------------------------- 6. termina ------------- */
const fin = camino('shock');
check(fin.c.transition.phase === 'active', 'La transición no empieza activa.');
for (let i = 0; i < 365 * 5 + 5; i++) T.step(fin.s, fin.c);
check(fin.c.transition.phase === 'done', 'La transición no termina nunca (fase ' + fin.c.transition.phase + ').');
console.log('Duración: la terapia de choque se da por completada a los ' + (fin.c.transition.days / 365).toFixed(1) + ' años.');

/* -------------------------------------------- 7. once años ----------- */
const lr = juego('ESP');
for (let i = 0; i < 4015; i++) {
  SP.tick(lr);
  let g = 0;
  while (lr.pendingEvents.length && g++ < 20) SP.resolveChoice(lr, 0, 0);
}
let rotos = 0;
for (const id of SP.alive(lr)) {
  const c = lr.countries[id];
  if (!isFinite(c.corrupt) || c.corrupt < 2 || c.corrupt > 98) rotos++;
  if (!c.transition) rotos++;
}
check(rotos === 0, rotos + ' países acaban con la transición o la corrupción rotas.');
const paises = SP.alive(lr).filter(id => lr.countries[id].transition.phase === 'active').length;
console.log('Once años: ' + paises + ' países siguen en plena transición; nadie con datos rotos.');

/* ------------------------------------------------------------- informe */
console.log('');
if (problemas) {
  console.log('PROBLEMAS ENCONTRADOS (' + problemas + ').');
  console.log('');
  process.exit(1);
}
console.log('TODO CORRECTO: el Este elige camino, el choque limpia y la corrupción pesa.');
console.log('');
